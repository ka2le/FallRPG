// GPU-placed ground cover: grass blades, wildflowers and leaf/petal litter.
// Instances are not stored anywhere: every blade maps to a world-space cell,
// and a stable hash of that cell decides jitter, rotation, height, lean, hue,
// species... so every blade is different yet the field is perfectly stable as
// you walk. Density comes from the world masks.
//
// Distance handling (the part that keeps it fast and alias-free):
//  * Tiles: blades are drawn in instanced tiles of T×T cells; the CPU frustum-
//    culls tiles each frame so nothing behind or beside the camera is processed.
//  * Rings: each layer is a set of concentric LOD rings with coarser spacing and
//    fewer blade segments further out, cross-faded stochastically so the
//    expected coverage is continuous across ring borders.
//  * Pixel-coverage conservation: a blade is never allowed to become thinner
//    than ~1 pixel. When it would, it is widened and the blade population is
//    thinned by the same ratio, so the field keeps its average colour and
//    density instead of turning into sub-pixel "marching ants".
//  * Colour convergence: with distance, per-blade random variation fades toward
//    the field's mean colour and normals relax to the ground normal. The
//    terrain shader paints exactly that mean colour (GRASS_GLSL below) so the
//    hand-over from blades to ground is invisible.
import * as THREE from 'three';
import { feyPatch } from './shaderLib.js';

// Shared grass density / colour model — used by the blades AND the terrain.
export const GRASS_GLSL = /* glsl */`
vec3 fgSrgb(vec3 c){ return pow(c, vec3(2.2)); }
float feyGrassDensity(vec4 S, vec4 F, vec4 M, float clump, float clump2){
  float dens = M.b * (1.0 - M.r * 0.45 * clump2) * (0.55 + 0.6 * clump);
  dens *= mix(1.0, 0.45, S.w);
  return max(dens, M.b * (F.r + F.g) * 0.9);
}
float feyGrassHeight(vec4 S, vec4 F, vec4 F2){
  float sH = S.x * 0.75 + S.y * 1.15 + S.z * 0.95 + S.w * 0.4;
  return sH * (1.0 + F.r * 0.6 + F.g * 0.35 + F2.g * 0.2);
}
void feyGrassColors(vec4 S, vec4 F, vec4 F2, float hx, float hy, out vec3 baseC, out vec3 tipC){
  baseC = S.x * fgSrgb(vec3(0.26, 0.38, 0.14)) + S.y * fgSrgb(vec3(0.17, 0.28, 0.09)) + S.z * fgSrgb(vec3(0.36, 0.28, 0.12)) + S.w * fgSrgb(vec3(0.5, 0.53, 0.52));
  tipC = S.x * fgSrgb(vec3(0.56, 0.66, 0.30)) + S.y * fgSrgb(vec3(0.42, 0.52, 0.21)) + S.z * fgSrgb(mix(vec3(0.78, 0.6, 0.28), vec3(0.62, 0.34, 0.16), hx)) + S.w * fgSrgb(vec3(0.82, 0.86, 0.88));
  tipC *= mix(vec3(1.0), mix(vec3(1.06, 1.04, 0.86), vec3(0.9, 1.0, 1.04), hy), 0.6);
  tipC = mix(tipC, fgSrgb(vec3(0.66, 0.54, 0.82)), F.r * 0.8);
  baseC = mix(baseC, fgSrgb(vec3(0.36, 0.28, 0.46)), F.r * 0.7);
  tipC = mix(tipC, fgSrgb(vec3(0.3, 0.62, 0.56)), F2.g * 0.4);
  tipC = mix(tipC, fgSrgb(vec3(0.9, 0.72, 0.78)), F2.b * 0.35);
  tipC = mix(tipC, fgSrgb(vec3(0.72, 0.8, 0.9)), F2.r * 0.6);
}
// field-average blade colour (what a patch of grass reads as from afar)
vec3 feyGrassMean(vec4 S, vec4 F, vec4 F2, float clump){
  vec3 b, t; feyGrassColors(S, F, F2, 0.5, 0.5, b, t);
  t = mix(t, fgSrgb(vec3(0.74, 0.66, 0.44)), 0.09 * (1.0 - S.w));
  return mix(b, t, 0.55) * mix(0.9, 1.1, clump);
}
`;

const PLACE_HEAD = GRASS_GLSL + /* glsl */`
uniform float uSpacing;
uniform float uR0, uR1, uBandIn, uBandOut;
uniform float uWidthMul;
uniform float uDensityMul;
uniform float uPixelK;
attribute float aPart;
attribute vec2 aCell;
attribute vec2 aTile;
varying vec3 vGColor;
varying float vGTip;
varying float vGGlow;
varying vec2 vGUv;
varying float vGAtlas;
vec3 gPos;
vec3 gNrm;
vec3 srgbV(vec3 c){ return pow(c, vec3(2.2)); }
`;

// Shared placement preamble: computes cell, hashes, masks, ground height
const PLACE_COMMON = /* glsl */`
  vec2 cell = aTile + aCell;
  vec3 hh = fHash32(cell);
  vec3 hh2 = fHash32(cell + 71.3);
  vec2 wxz = (cell + hh.xy) * uSpacing;
  float dCam = length(wxz - cameraPosition.xz);
  // ring membership: complementary stochastic cross-fades at both ring borders
  float keep = 1.0 - smoothstep(uR1 - uBandOut, uR1, dCam);
  if (uR0 > 0.0) keep *= smoothstep(uR0 - uBandIn, uR0, dCam);
  vec4 S = vec4(0.0), F = vec4(0.0), F2 = vec4(0.0), M = vec4(0.0), HW = vec4(0.0, -1000.0, 0.0, 0.0);
  float clump = 0.5, clump2 = 0.5;
  if (keep > 0.0) {
    vec2 uvw = feyUV(wxz);
    S = texture(uSeasonTex, uvw);
    F = texture(uFeatTex, uvw);
    F2 = texture(uFeat2Tex, uvw);
    M = texture(uMiscTex, uvw);
    HW = feyHeightFull(wxz);
    clump = texture(uNoiseTex, wxz * 0.021).r;
    clump2 = texture(uNoiseTex, wxz * 0.07 + 0.3).g;
  }
  float gy = HW.r;
  // world size of one screen pixel at this blade, and a 0..1 "far" factor
  float d3 = length(vec3(wxz.x, gy + 0.3, wxz.y) - cameraPosition);
  float pixW = uPixelK * d3;
  float farT = smoothstep(10.0, 55.0, d3);
  vec2 windN = vec2(texture(uNoiseTex, wxz * 0.008 + uWindDir * uTime * 0.035).r, texture(uNoiseTex, wxz * 0.011 - uWindDir.yx * uTime * 0.02).g);
  float gust = smoothstep(0.35, 0.75, windN.x);
  vec2 windV = uWindDir * ((uWind * 0.35 + gust * (0.4 + uWind) + uStorm * 1.4) * (0.8 + 0.4 * windN.y))
             + vec2(sin(uTime * 2.3 + wxz.x * 0.7), cos(uTime * 1.9 + wxz.y * 0.6)) * 0.06;
  vec2 away = wxz - uPlayerPos.xz;
  float pd = length(away);
  float trample = smoothstep(1.7, 0.25, pd) * step(abs(uPlayerPos.y - 1.6 - gy), 2.2);
  vec2 awayN = away / max(pd, 1e-3);
`;

const GRASS_PLACE = /* glsl */`
  {
    ${PLACE_COMMON}
    float dens = feyGrassDensity(S, F, M, clump, clump2) * uDensityMul;
    // never thinner than ~1px: widen, and thin the population by the same ratio
    float bw = (0.045 + 0.04 * hh2.y) * uWidthMul;
    float minW = pixW * 1.1;
    float cov = bw / max(bw, minW);
    bw = max(bw, minW);
    float alive = step(hh.z, dens * keep * cov) * step(HW.g, gy - 0.05);
    if (HW.a > 0.5 && HW.g > gy - 0.1) alive = 0.0;
    // height by season + wonders
    float sH = feyGrassHeight(S, F, F2);
    float bh = (0.28 + 0.62 * hh2.x * hh2.x) * sH * (0.55 + 0.9 * clump) * alive;
    float ang = hh.z * 37.0 + hh2.z * 6.2831;
    vec2 fdir = vec2(cos(ang), sin(ang));
    vec2 side = vec2(-fdir.y, fdir.x);
    float t = position.y;
    vec2 lean = fdir * (hh2.z - 0.5) * 0.7 + windV * 0.8 + awayN * trample * 1.6;
    float ll = min(length(lean), 1.4);
    float bend = t * t;
    gPos.xz = wxz + side * position.x * bw * (1.0 - t * 0.9) + lean * bend * bh * 0.85;
    gPos.y = gy + t * bh * (1.0 - 0.28 * ll * t) - 0.02;
    vec3 bn = normalize(vec3(fdir.x, 0.0, fdir.y) + vec3(side.x, 0.0, side.y) * position.x * 1.8 + vec3(lean.x, 0.0, lean.y) * 0.3);
    gNrm = normalize(mix(bn, vec3(0.0, 1.0, 0.0), mix(0.78, 0.96, farT)));
    // colour (per-blade variation converges on the field mean with distance)
    float hx = mix(hh.x, 0.5, farT), hy = mix(hh.y, 0.5, farT);
    vec3 baseC, tipC;
    feyGrassColors(S, F, F2, hx, hy, baseC, tipC);
    float dry = step(0.88, hh2.y) * (1.0 - S.w);
    tipC = mix(tipC, srgbV(vec3(0.74, 0.66, 0.44)), mix(dry * 0.75, 0.09 * (1.0 - S.w), farT));
    float v = mix(0.8 + 0.4 * hh.x, 1.0, farT);
    vGColor = mix(baseC, tipC, mix(smoothstep(0.0, 1.0, t), 0.55, farT * 0.6)) * v * mix(0.9, 1.1, clump);
    vGTip = t;
    vGGlow = F2.r * 0.25 * step(0.96, hh2.x) * t * t;
    vGUv = vec2(position.x + 0.5, t);
    vGAtlas = 0.0;
    objectNormal = gNrm;
  }
`;

const FLOWER_PLACE = /* glsl */`
  {
    ${PLACE_COMMON}
    float flw = (S.x * 0.35 + S.y * 0.28 + S.z * 0.05 + S.w * 0.06) + F.r * 0.9 + F.g * 1.2 + F2.b * 0.3 + F2.g * 0.2;
    flw *= smoothstep(0.35, 0.7, clump2 + F.g * 0.4 + F.r * 0.5);
    float dens = M.b * flw * uDensityMul;
    float headS0 = (0.12 + 0.12 * hh.x) * (1.0 + F.g * 0.9);
    float minS = pixW * 1.6;
    float cov = headS0 / max(headS0, minS); cov *= cov;
    float alive = step(hh.z, dens * keep * cov);
    if (HW.a > 0.5 && HW.g > gy - 0.1) alive = 0.0;
    // species
    float atlas = 0.0;
    float r = hh2.x;
    if (F.r > 0.35) atlas = 3.0;
    else if (S.x > 0.5) atlas = r < 0.6 ? 0.0 : 1.0;
    else if (S.y > 0.5) atlas = r < 0.5 ? 1.0 : 2.0;
    else if (S.z > 0.5) atlas = 2.0;
    else atlas = 1.0;
    if (F.g > 0.3) atlas = floor(r * 3.0);
    float stemH = (0.25 + 0.45 * hh2.y) * (1.0 + F.g * 1.0 + F.r * 0.3) * alive;
    if (atlas > 2.5) stemH *= 0.5;
    float headS = max(headS0, minS) * alive;
    if (atlas > 2.5) headS *= 2.2;
    float ang = hh2.z * 6.2831;
    vec2 fdir = vec2(cos(ang), sin(ang));
    vec2 side = vec2(-fdir.y, fdir.x);
    vec2 lean = windV * 0.5 + awayN * trample * 1.2 + fdir * 0.1;
    vec3 top = vec3(wxz + lean * stemH * 0.6, gy + stemH);
    top = vec3(top.x, top.z, top.y);
    if (aPart < 0.5) {
      float t = position.y;
      gPos.xz = wxz + side * position.x * 0.018 + lean * t * t * stemH * 0.6;
      gPos.y = gy + t * stemH;
      gNrm = normalize(vec3(fdir.x, 0.8, fdir.y));
      vGColor = srgbV(vec3(0.2, 0.45, 0.12)) * (0.7 + 0.3 * t);
      vGUv = vec2(0.0);
      vGAtlas = -1.0;
      vGGlow = 0.0;
    } else {
      // head quad in a tilted plane
      float tilt = atlas > 2.5 ? 1.45 : 0.35 + 0.5 * hh.y;
      vec3 up = vec3(0.0, 1.0, 0.0);
      vec3 f3 = vec3(fdir.x, 0.0, fdir.y);
      vec3 s3 = vec3(side.x, 0.0, side.y);
      vec3 pn = normalize(up * cos(tilt) + f3 * sin(tilt));
      vec3 pu = normalize(cross(s3, pn));
      vec2 q = position.xz;
      vec3 off = s3 * q.x * headS + pu * q.y * headS;
      if (atlas > 2.5) off = s3 * q.x * headS * 0.45 + up * (q.y + 0.5) * headS;
      gPos = top + off;
      gNrm = normalize(pn + up * 0.5);
      // palettes
      vec3 c;
      float k = hh.x;
      if (atlas > 2.5) c = mix(vec3(0.5, 0.36, 0.76), vec3(0.68, 0.52, 0.88), k);
      else if (F.g > 0.3) c = k < 0.2 ? vec3(0.75, 0.12, 0.25) : k < 0.4 ? vec3(0.92, 0.72, 0.2) : k < 0.6 ? vec3(0.24, 0.33, 0.8) : k < 0.8 ? vec3(0.92, 0.42, 0.26) : vec3(0.22, 0.6, 0.66);
      else if (S.x > 0.5) c = k < 0.35 ? vec3(0.94, 0.7, 0.78) : k < 0.6 ? vec3(0.96, 0.94, 0.86) : k < 0.8 ? vec3(0.95, 0.8, 0.3) : vec3(0.5, 0.62, 0.9);
      else if (S.y > 0.5) c = k < 0.3 ? vec3(0.82, 0.2, 0.14) : k < 0.55 ? vec3(0.93, 0.66, 0.16) : k < 0.8 ? vec3(0.52, 0.26, 0.66) : vec3(0.9, 0.5, 0.62);
      else if (S.z > 0.5) c = k < 0.5 ? vec3(0.5, 0.34, 0.72) : vec3(0.88, 0.52, 0.16);
      else c = vec3(0.82, 0.88, 0.96);
      vGColor = srgbV(c);
      vGUv = vec2(q.x + 0.5, q.y + 0.5);
      vGAtlas = atlas;
      vGGlow = (F.g * 0.35 + S.w * 0.4 + F.r * 0.15) * step(0.7, hh2.y);
    }
    vGTip = 1.0;
    objectNormal = gNrm;
  }
`;

const LITTER_PLACE = /* glsl */`
  {
    ${PLACE_COMMON}
    float dens = (S.z * (0.35 + 0.65 * M.r) * 0.9 + F.a * 1.2 + F2.b * 0.9 + S.x * M.r * 0.15) * uDensityMul;
    dens *= smoothstep(0.2, 0.55, clump2 + F.a + F2.b * 0.5);
    float isPetal = step(0.5, F2.b + S.x * 0.6) * step(S.z, 0.5);
    float sz0 = mix(0.14 + 0.1 * hh.x, 0.07, isPetal);
    float minS = pixW * 1.5;
    float cov = sz0 / max(sz0, minS); cov *= cov;
    float alive = step(hh.z, dens * keep * cov) * step(0.3, M.b + F.a);
    if (HW.a > 0.5 && HW.g > gy - 0.1) alive = 0.0;
    float sz = max(sz0, minS) * alive;
    float ang = hh2.z * 6.2831;
    vec2 fdir = vec2(cos(ang), sin(ang));
    vec2 side = vec2(-fdir.y, fdir.x);
    vec2 q = position.xz;
    float curl = (q.x * q.x) * 0.3 * sz;
    gPos.xz = wxz + (side * q.x + fdir * q.y) * sz + awayN * trample * 0.3;
    gPos.y = gy + 0.03 + curl + hh2.x * 0.03;
    gNrm = vec3(0.0, 1.0, 0.0);
    float k = hh.x;
    vec3 c = k < 0.2 ? vec3(0.56, 0.13, 0.1) : k < 0.45 ? vec3(0.8, 0.42, 0.13) : k < 0.7 ? vec3(0.85, 0.62, 0.22) : k < 0.85 ? vec3(0.45, 0.12, 0.14) : vec3(0.42, 0.28, 0.14);
    if (isPetal > 0.5) c = mix(vec3(0.92, 0.7, 0.78), vec3(0.97, 0.93, 0.92), k);
    // per-leaf hue noise converges on the litter's mean colour with distance
    vec3 cMean = isPetal > 0.5 ? vec3(0.945, 0.815, 0.85) : vec3(0.66, 0.38, 0.15);
    c = mix(c, cMean, farT * 0.85);
    vGColor = srgbV(c) * mix(0.75 + 0.3 * hh2.y, 0.9, farT);
    vGUv = vec2(q.x + 0.5, q.y + 0.5);
    vGAtlas = isPetal > 0.5 ? 3.0 : floor(hh2.y * 3.0);
    vGGlow = 0.0;
    vGTip = 1.0;
    objectNormal = gNrm;
  }
`;

const FRAG_HEAD = /* glsl */`
varying vec3 vGColor;
varying float vGTip;
varying float vGGlow;
varying vec2 vGUv;
varying float vGAtlas;
uniform sampler2D uAtlas;
uniform float uLayer;
`;

// ------------------------------------------------------------------ patch geometry
// Single-item templates (position / normal / aPart / index), replicated T×T
// times into one patch with a per-vertex local cell id (aCell).
function bladeTemplate(segments) {
  const pos = [], idx = [];
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    pos.push(-0.5, t, 0, 0.5, t, 0);
  }
  pos.push(0, 1, 0);
  for (let i = 0; i < segments - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const a = (segments - 1) * 2;
  idx.push(a, a + 1, segments * 2);
  const n = pos.length / 3;
  return { pos, nor: new Array(n * 3).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), part: new Array(n).fill(0), idx };
}

function flowerTemplate() {
  const pos = [], part = [], idx = [];
  for (let i = 0; i <= 3; i++) { const t = i / 3; pos.push(-0.5, t, 0, 0.5, t, 0); part.push(0, 0); }
  for (let i = 0; i < 3; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const b = pos.length / 3;
  pos.push(-0.5, 0, -0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, 0.5); part.push(1, 1, 1, 1);
  idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
  return { pos, nor: new Array(pos.length).fill(0), part, idx };
}

function quadTemplate() {
  return { pos: [-0.5, 0, -0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, 0.5], nor: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], part: [1, 1, 1, 1], idx: [0, 2, 1, 1, 2, 3] };
}

function patchGeometry(tpl, T) {
  const nv = tpl.pos.length / 3, ni = tpl.idx.length;
  const total = T * T;
  const pos = new Float32Array(total * nv * 3), nor = new Float32Array(total * nv * 3);
  const part = new Float32Array(total * nv), cell = new Float32Array(total * nv * 2);
  const idx = new (total * nv > 65535 ? Uint32Array : Uint16Array)(total * ni);
  let v = 0, k = 0;
  for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) {
    const base = v;
    for (let q = 0; q < nv; q++, v++) {
      pos.set(tpl.pos.slice(q * 3, q * 3 + 3), v * 3);
      nor.set(tpl.nor.slice(q * 3, q * 3 + 3), v * 3);
      part[v] = tpl.part[q];
      cell[v * 2] = i; cell[v * 2 + 1] = j;
    }
    for (let q = 0; q < ni; q++) idx[k++] = base + tpl.idx[q];
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('aPart', new THREE.BufferAttribute(part, 1));
  g.setAttribute('aCell', new THREE.BufferAttribute(cell, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

// one pixel's world size per metre of distance — shared by every layer
export const coverPixel = { uPixelK: { value: 0.0014 } };
export function setCoverViewport(camera, heightPx) {
  coverPixel.uPixelK.value = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5) / Math.max(1, heightPx);
}

class CoverRing {
  constructor(type, ring, opts, material) {
    this.type = type;
    this.spacing = ring.spacing;
    this.r0 = ring.r0; this.r1 = ring.r1;
    this.T = ring.tile || opts.tile || (type === 'flower' ? 8 : type === 'litter' ? 12 : 16);
    const tpl = type === 'grass' ? bladeTemplate(ring.segments || 4) : type === 'flower' ? flowerTemplate() : quadTemplate();
    const geo = patchGeometry(tpl, this.T);
    this.tileW = this.T * this.spacing;
    const side = Math.ceil((2 * this.r1) / this.tileW) + 2;
    this.maxTiles = side * side;
    this.tiles = new THREE.InstancedBufferAttribute(new Float32Array(this.maxTiles * 2), 2);
    this.tiles.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aTile', this.tiles);
    geo.instanceCount = 0;
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    this.uniforms = {
      uSpacing: { value: this.spacing },
      uR0: { value: this.r0 }, uR1: { value: this.r1 },
      uBandIn: { value: ring.bandIn || 0 }, uBandOut: { value: ring.bandOut || this.r1 * 0.25 },
      uWidthMul: { value: ring.widthMul || 1 },
      uDensityMul: { value: opts.densityMul || 1 },
    };
    const mat = material.clone();
    mat.onBeforeCompile = material.onBeforeCompile;
    mat.customProgramCacheKey = material.customProgramCacheKey;
    mat.userData.ringUniforms = this.uniforms;
    this.material = mat;
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;
    this.geo = geo;
  }

  update(camera, frustum, query, box) {
    const cx = camera.position.x, cz = camera.position.z;
    const W = this.tileW, T = this.T, s = this.spacing;
    const rOut = this.r1, rIn = Math.max(0, this.r0 - this.uniforms.uBandIn.value);
    const tx0 = Math.floor((cx - rOut) / W), tx1 = Math.floor((cx + rOut) / W);
    const tz0 = Math.floor((cz - rOut) / W), tz1 = Math.floor((cz + rOut) / W);
    const A = this.tiles.array;
    let n = 0;
    for (let tz = tz0; tz <= tz1; tz++) for (let tx = tx0; tx <= tx1; tx++) {
      const x0 = tx * W, z0 = tz * W, x1 = x0 + W, z1 = z0 + W;
      // nearest / farthest horizontal distance to the tile
      const nx = Math.max(x0 - cx, 0, cx - x1), nz = Math.max(z0 - cz, 0, cz - z1);
      if (nx * nx + nz * nz > rOut * rOut) continue;
      const fx = Math.max(Math.abs(x0 - cx), Math.abs(x1 - cx)), fz = Math.max(Math.abs(z0 - cz), Math.abs(z1 - cz));
      if (fx * fx + fz * fz < rIn * rIn) continue;
      const h0 = query.height(x0, z0), h1 = query.height(x1, z0), h2 = query.height(x0, z1), h3 = query.height(x1, z1), h4 = query.height(x0 + W * 0.5, z0 + W * 0.5);
      box.min.set(x0 - 1, Math.min(h0, h1, h2, h3, h4) - 1.5, z0 - 1);
      box.max.set(x1 + 1, Math.max(h0, h1, h2, h3, h4) + 2.5, z1 + 1);
      if (!frustum.intersectsBox(box)) continue;
      if (n >= this.maxTiles) break;
      A[n * 2] = tx * T; A[n * 2 + 1] = tz * T;
      n++;
    }
    this.geo.instanceCount = n;
    this.tiles.clearUpdateRanges();
    if (n) { this.tiles.addUpdateRange(0, n * 2); this.tiles.needsUpdate = true; }
    this.mesh.visible = n > 0;
  }
}

export class GroundCover {
  constructor(opts) {
    // opts: {type:'grass'|'flower'|'litter', rings:[{spacing, r0, r1, segments, widthMul, bandIn, bandOut}], densityMul, atlas, query}
    this.opts = opts;
    this.query = opts.query;
    const type = opts.type;
    const shared = {
      uAtlas: { value: opts.atlas || null },
      uLayer: { value: type === 'grass' ? 0 : type === 'flower' ? 1 : 2 },
      uPixelK: coverPixel.uPixelK,
    };
    const mat = new THREE.MeshStandardMaterial({ roughness: type === 'grass' ? 0.55 : 0.6, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.3 });
    const place = type === 'grass' ? GRASS_PLACE : type === 'flower' ? FLOWER_PLACE : LITTER_PLACE;
    const atlasCode = type === 'grass' ? '' : /* glsl */`
      if (vGAtlas >= 0.0) {
        vec4 at = texture(uAtlas, vec2((vGUv.x + vGAtlas) * 0.25, vGUv.y));
        if (at.a < 0.5) discard;
        diffuseColor.rgb *= at.rgb;
      }`;
    // one material template; each ring gets a clone with its own uniform set
    feyPatch(mat, {
      key: 'ground-' + type,
      snow: 0.0,
      uniforms: shared,
      vertexHead: PLACE_HEAD,
      vertexNormal: place,
      vertexBegin: 'transformed = gPos;',
      fragHead: FRAG_HEAD,
      fragColor: `diffuseColor.rgb = vGColor; ${atlasCode}`,
      fragEmissive: /* glsl */`
        {
          vec3 Vd = normalize(cameraPosition - vFeyWorld);
          float back = pow(max(dot(Vd, -uLightDir), 0.0), 3.0);
          totalEmissiveRadiance += vGColor * (uSunColor * feySunVis * (0.07 + 0.35 * back) * vGTip * ${type === 'litter' ? '0.3' : '1.0'} + mix(uSkyZenith, uSkyHorizon, 0.5) * 0.4 * texture(uShadowTex, feyUV(vFeyWorld.xz)).g * mix(0.6, 1.0, vGTip));
          totalEmissiveRadiance += vGColor * vGGlow * (0.15 + 1.2 * uNight);
        }`,
      aoExtra: 'feyAO *= mix(0.6, 1.0, vGTip);',
      onShader: (s) => {
        s.fragmentShader = s.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n normal = normalize(vNormal);');
        if (globalThis.__DBG_GRASS) s.fragmentShader = s.fragmentShader.replace(/}\s*$/, globalThis.__DBG_GRASS + '\n}');
      },
    });
    // feyPatch assigns uniforms from opts.uniforms; add per-ring ones at compile time
    const baseCompile = mat.onBeforeCompile;
    mat.onBeforeCompile = function (shader, renderer) {
      baseCompile(shader, renderer);
      Object.assign(shader.uniforms, this.userData.ringUniforms || {});
    };
    this.rings = (opts.rings || []).map((r) => new CoverRing(type, r, opts, mat));
    this.mesh = new THREE.Group();
    for (const r of this.rings) this.mesh.add(r.mesh);
    this.outer = this.rings.reduce((m, r) => Math.max(m, r.r1), 0);
    this.frustum = new THREE.Frustum();
    this.box = new THREE.Box3();
    this._m = new THREE.Matrix4();
  }

  update(camera) {
    camera.updateMatrixWorld();
    this._m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this._m);
    for (const r of this.rings) r.update(camera, this.frustum, this.query, this.box);
  }
}
