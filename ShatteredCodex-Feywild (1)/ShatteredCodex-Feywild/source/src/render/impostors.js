// Hemi-octahedral tree impostors.
//
// Every tree variant is rendered once at load time from N×N directions spread
// over the upper hemisphere (hemi-octahedral layout) into two texture-array
// atlases: albedo+coverage and normal/material data. Distant trees are then
// drawn as a single instanced draw of camera-facing quads; each quad blends the
// three atlas frames nearest to the actual view direction (with virtual-plane
// reprojection), and is lit per pixel through the regular Feywild material
// (sun, sky, cloud & terrain shadows, snow, fog), so a far tree looks like the
// real tree instead of a blob, costs 2 triangles, and never aliases because the
// atlas is supersampled, dilated and mip-mapped.
//
// The near/far hand-over is a screen-door dither cross-fade computed on the GPU
// from the same distance formula the CPU uses for the full-detail meshes.
import * as THREE from 'three';
import { feyPatch } from './shaderLib.js';

// ------------------------------------------------------------------ direction helpers (JS mirrors GLSL)
export function hemiOctDecode(u, v, out = new THREE.Vector3()) {
  const tx = (u + v) * 0.5, tz = (u - v) * 0.5;
  return out.set(tx, 1 - Math.abs(tx) - Math.abs(tz), tz).normalize();
}

const GLSL_IMP_COMMON = /* glsl */`
vec3 impRotY(vec3 v, float a){ float c = cos(a), s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }
vec2 impHemiEnc(vec3 d){ d /= (abs(d.x) + abs(d.y) + abs(d.z)); return vec2(d.x + d.z, d.x - d.z); }
vec3 impHemiDec(vec2 e){ vec2 t = vec2(e.x + e.y, e.x - e.y) * 0.5; return normalize(vec3(t.x, 1.0 - abs(t.x) - abs(t.y), t.y)); }
vec2 impOctEnc(vec3 n){
  n /= (abs(n.x) + abs(n.y) + abs(n.z));
  vec2 e = n.xz;
  if (n.y < 0.0) e = (1.0 - abs(e.yx)) * vec2(e.x >= 0.0 ? 1.0 : -1.0, e.y >= 0.0 ? 1.0 : -1.0);
  return e * 0.5 + 0.5;
}
vec3 impOctDec(vec2 e){
  e = e * 2.0 - 1.0;
  vec3 n = vec3(e.x, 1.0 - abs(e.x) - abs(e.y), e.y);
  if (n.y < 0.0) n.xz = (1.0 - abs(n.zx)) * vec2(n.x >= 0.0 ? 1.0 : -1.0, n.z >= 0.0 ? 1.0 : -1.0);
  return normalize(n);
}
`;

// ------------------------------------------------------------------ bake shaders
const BAKE_VERT = /* glsl */`
varying vec3 vN; varying vec3 vP; varying vec2 vUv;
void main(){ vN = normal; vP = position; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const BAKE_FRAG = GLSL_IMP_COMMON + /* glsl */`
uniform int uMode;
uniform sampler2D uMap; uniform float uHasMap; uniform vec3 uColor; uniform float uAlphaTest;
uniform float uTint; uniform float uGlow; uniform float uLeafy;
uniform vec3 uCanopyC; uniform float uCanopyR; uniform float uHeight;
varying vec3 vN; varying vec3 vP; varying vec2 vUv;
void main(){
  vec4 tex = uHasMap > 0.5 ? texture2D(uMap, vUv) : vec4(1.0);
  if (tex.a < uAlphaTest) discard;
  if (uMode == 0) {
    vec3 c = uColor * tex.rgb;
    // baked self-occlusion: canopy interior and lower crown are darker, as the
    // shadow-mapped full-detail tree is
    float r = length(vP - uCanopyC) / max(uCanopyR, 1e-3);
    float ao = mix(1.0, clamp(0.42 + 0.62 * r, 0.45, 1.0), uLeafy);
    ao *= mix(0.7, 1.0, clamp(vP.y / max(uHeight, 1e-3) * 1.4, 0.0, 1.0));
    gl_FragColor = vec4(sqrt(max(c * ao, 0.0)), 1.0);
  } else {
    gl_FragColor = vec4(impOctEnc(normalize(vN)), uTint, clamp(uGlow * 0.5, 0.0, 1.0));
  }
}
`;

// 2x supersample resolve + dilation of data into empty texels (per frame).
// Coverage always comes from the albedo pass (uCov.a); the normal pass keeps
// all four data channels, the albedo pass writes coverage into alpha.
const RESOLVE_FRAG = /* glsl */`
uniform sampler2D uSrc;
uniform sampler2D uCov;
uniform float uFramePx;
uniform float uIsData;
uniform vec4 uEmpty;
void main(){
  vec2 op = floor(gl_FragCoord.xy);
  vec2 frame = floor(op / uFramePx);
  vec2 fmin = frame * uFramePx * 2.0, fmax = fmin + uFramePx * 2.0 - 1.0;
  vec2 sp = op * 2.0;
  vec4 acc = vec4(0.0); float aSum = 0.0;
  for (int y = 0; y < 2; y++) for (int x = 0; x < 2; x++) {
    ivec2 q = ivec2(sp) + ivec2(x, y);
    float a = texelFetch(uCov, q, 0).a;
    acc += texelFetch(uSrc, q, 0) * a; aSum += a;
  }
  vec4 col;
  if (aSum > 0.0) col = acc / aSum;
  else {
    vec4 s = vec4(0.0); float w = 0.0;
    for (int r = 1; r <= 6; r++) {
      for (int dy = -r; dy <= r; dy++) for (int dx = -r; dx <= r; dx++) {
        if (max(abs(dx), abs(dy)) != r) continue;
        ivec2 q = ivec2(clamp(sp + vec2(dx, dy) * 2.0, fmin, fmax));
        float a = texelFetch(uCov, q, 0).a;
        s += texelFetch(uSrc, q, 0) * a; w += a;
      }
      if (w > 0.0) break;
    }
    col = w > 0.0 ? s / w : uEmpty;
  }
  gl_FragColor = uIsData > 0.5 ? col : vec4(col.rgb, aSum * 0.25);
}
`;

function makeBakeMaterial(src) {
  const info = src.userData.bake || {};
  const map = src.map || null;
  return new THREE.ShaderMaterial({
    uniforms: {
      uMode: { value: 0 },
      uMap: { value: map }, uHasMap: { value: map ? 1 : 0 },
      uColor: { value: (src.color || new THREE.Color(1, 1, 1)).clone() },
      uAlphaTest: { value: src.alphaTest > 0 ? src.alphaTest : 0.0 },
      uTint: { value: info.tint ? 1 : 0 }, uGlow: { value: info.glow || 0 }, uLeafy: { value: info.leafy ? 1 : 0 },
      uCanopyC: { value: new THREE.Vector3() }, uCanopyR: { value: 1 }, uHeight: { value: 1 },
    },
    vertexShader: BAKE_VERT, fragmentShader: BAKE_FRAG,
    side: THREE.DoubleSide,
  });
}

function canopyOf(geo) {
  // centre / extent of the foliage group (material index 1), else whole mesh
  const pos = geo.attributes.position, idx = geo.index;
  const g = geo.groups.find((x) => x.materialIndex === 1);
  const c = new THREE.Vector3(); let n = 0;
  const v = new THREE.Vector3();
  const each = (fn) => {
    if (g && idx) for (let i = g.start; i < g.start + g.count; i += 3) fn(idx.getX(i));
    else for (let i = 0; i < pos.count; i += 3) fn(i);
  };
  each((k) => { c.x += pos.getX(k); c.y += pos.getY(k); c.z += pos.getZ(k); n++; });
  if (n) c.multiplyScalar(1 / n);
  let r = 0; let m = 0;
  each((k) => { v.set(pos.getX(k), pos.getY(k), pos.getZ(k)); r += v.distanceTo(c); m++; });
  return { c, r: m ? (r / m) * 1.25 : 1 };
}

/**
 * Bake impostor atlases.
 * variants: [{ geo, mats: [Material per group index], height }]
 * returns { albedo, normal (DataArrayTexture-like), bounds: Float32Array(4*L), frames, framePx, targets }
 */
export function bakeImpostors(renderer, variants, { frames = 8, framePx = 128 } = {}) {
  const L = variants.length;
  const size = frames * framePx;
  const ss = 2;
  const prev = {
    rt: renderer.getRenderTarget(), autoClear: renderer.autoClear, clear: renderer.getClearColor(new THREE.Color()), alpha: renderer.getClearAlpha(),
    shadow: renderer.shadowMap.autoUpdate, xr: renderer.xr.enabled,
  };
  renderer.shadowMap.autoUpdate = false;
  const tmpOpts = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false, depthBuffer: true };
  const tmpA = new THREE.WebGLRenderTarget(size * ss, size * ss, tmpOpts);
  const tmpN = new THREE.WebGLRenderTarget(size * ss, size * ss, tmpOpts);
  const outOpts = { depthBuffer: false, generateMipmaps: false, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter };
  const outA = new THREE.WebGLArrayRenderTarget(size, size, L, outOpts);
  const outN = new THREE.WebGLArrayRenderTarget(size, size, L, outOpts);
  for (const t of [outA.texture, outN.texture]) {
    t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false; t.anisotropy = 4; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  }

  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10);
  const quadScene = new THREE.Scene();
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const resolve = new THREE.ShaderMaterial({
    uniforms: { uSrc: { value: null }, uCov: { value: null }, uFramePx: { value: framePx }, uIsData: { value: 0 }, uEmpty: { value: new THREE.Vector4() } },
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: RESOLVE_FRAG, depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), resolve);
  quad.frustumCulled = false;
  quadScene.add(quad);

  const bounds = new Float32Array(L * 4);
  const dir = new THREE.Vector3();
  const bakeMats = new Map();
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0);

  for (let l = 0; l < L; l++) {
    const vt = variants[l];
    const geo = vt.geo;
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    const bs = geo.boundingSphere;
    const R = bs.radius * 1.02;
    const C = bs.center;
    bounds.set([C.x, C.y, C.z, R], l * 4);
    const can = canopyOf(geo);
    const mats = vt.mats.map((m) => {
      if (!bakeMats.has(m)) bakeMats.set(m, makeBakeMaterial(m));
      const b = bakeMats.get(m);
      b.uniforms.uCanopyC.value.copy(can.c); b.uniforms.uCanopyR.value = can.r; b.uniforms.uHeight.value = Math.max(1, vt.height);
      return b;
    });
    const mesh = new THREE.Mesh(geo, mats);
    mesh.frustumCulled = false;
    scene.add(mesh);
    cam.left = -R; cam.right = R; cam.top = R; cam.bottom = -R; cam.near = R * 0.01; cam.far = R * 4; cam.updateProjectionMatrix();

    for (const [rt, mode] of [[tmpA, 0], [tmpN, 1]]) {
      for (const m of mats) m.uniforms.uMode.value = mode;
      rt.scissorTest = false; rt.viewport.set(0, 0, size * ss, size * ss);
      renderer.setRenderTarget(rt);
      renderer.clear(true, true, false);
      rt.scissorTest = true;
      const fp = framePx * ss;
      for (let j = 0; j < frames; j++) for (let i = 0; i < frames; i++) {
        hemiOctDecode(i / (frames - 1) * 2 - 1, j / (frames - 1) * 2 - 1, dir);
        cam.position.copy(C).addScaledVector(dir, R * 2);
        cam.up.set(0, 1, 0);
        cam.lookAt(C);
        cam.updateMatrixWorld();
        rt.viewport.set(i * fp, j * fp, fp, fp);
        rt.scissor.set(i * fp, j * fp, fp, fp);
        renderer.setRenderTarget(rt);
        renderer.render(scene, cam);
      }
      rt.scissorTest = false;
    }
    scene.remove(mesh);

    // resolve into the atlas layers
    const last = l === L - 1;
    for (const [src, dst, empty, isData] of [[tmpA, outA, [0.2, 0.24, 0.14, 0], 0], [tmpN, outN, [0.5, 0.5, 0.0, 0.0], 1]]) {
      resolve.uniforms.uSrc.value = src.texture;
      resolve.uniforms.uCov.value = tmpA.texture;
      resolve.uniforms.uIsData.value = isData;
      resolve.uniforms.uEmpty.value.set(empty[0], empty[1], empty[2], empty[3]);
      if (last) dst.texture.generateMipmaps = true; // build the mip chain once, after the final layer
      renderer.setRenderTarget(dst, l);
      renderer.render(quadScene, quadCam);
    }
  }

  renderer.setRenderTarget(prev.rt);
  renderer.autoClear = prev.autoClear;
  renderer.setClearColor(prev.clear, prev.alpha);
  renderer.shadowMap.autoUpdate = prev.shadow;
  tmpA.dispose(); tmpN.dispose();
  for (const m of bakeMats.values()) m.dispose();
  resolve.dispose(); quad.geometry.dispose();
  return { albedo: outA.texture, normal: outN.texture, bounds, frames, framePx, targets: [outA, outN] };
}

// ------------------------------------------------------------------ runtime
const IMP_VERT_HEAD = GLSL_IMP_COMMON + /* glsl */`
attribute vec4 aI0;   // base x, y, z, scale
attribute vec4 aI1;   // yaw, layer, -, -
attribute vec3 aIC;   // foliage tint
uniform vec4 uImpB[IMP_LAYERS];
uniform float uImpFrames;
uniform float uHiDist, uHiBand, uLoDist;
varying vec4 vImpF01; varying vec2 vImpF2;
varying vec2 vImpUv0; varying vec2 vImpUv1; varying vec2 vImpUv2;
varying vec3 vImpW; varying vec3 vImpCol;
varying float vImpLayer; varying float vImpFade; varying float vImpRot;
vec3 impPos;
vec2 impFrameUV(vec2 f, vec3 P, vec3 V, float r){
  vec3 D = impHemiDec(f / (uImpFrames - 1.0) * 2.0 - 1.0);
  vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), D));
  vec3 up = cross(D, rt);
  // virtual-plane reprojection: slide the billboard point along the view ray onto this frame's plane
  vec3 Q = P - V * (dot(P, D) / max(dot(V, D), 0.25));
  return vec2(dot(Q, rt), dot(Q, up)) / (2.0 * r) + 0.5;
}
`;

const IMP_VERT = /* glsl */`
  {
    float rot = aI1.x;
    int L = int(aI1.y + 0.5);
    vec4 B = uImpB[L];
    float sc = aI0.w;
    vec3 C = aI0.xyz + impRotY(B.xyz * sc, rot);
    float R = B.w * sc;
    float dH = length(aI0.xz - cameraPosition.xz);
    float fade = smoothstep(uHiDist - uHiBand, uHiDist, dH) * (1.0 - smoothstep(uLoDist * 0.9, uLoDist, dH));
    vec3 toC = cameraPosition - C;
    vec3 V = toC / max(length(toC), 1e-3);
    vec3 up0 = abs(V.y) > 0.995 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
    vec3 bR = normalize(cross(up0, V));
    vec3 bU = cross(V, bR);
    vec3 off = (bR * position.x + bU * position.y) * R;
    // a gentle crown sway so far forests are not frozen
    float ph = dot(aI0.xz, vec2(0.13, 0.17));
    float sway = (sin(uTime * 1.3 + ph) * 0.6 + sin(uTime * 2.1 + ph * 1.7) * 0.3) * (0.3 + uWind + uStorm * 1.5);
    off.xz += uWindDir * sway * max(position.y, 0.0) * R * 0.012;
    impPos = fade > 0.002 ? C + off : C;
    // local-space view direction -> the three nearest atlas frames
    vec3 Vl = impRotY(V, -rot);
    vec3 Vh = normalize(vec3(Vl.x, max(Vl.y, 0.0) + 1e-4, Vl.z));
    vec2 g = (impHemiEnc(Vh) * 0.5 + 0.5) * (uImpFrames - 1.0);
    g = clamp(g, vec2(0.0), vec2(uImpFrames - 1.001));
    vec2 base = floor(g), fr = g - base;
    vec2 f0, f1, f2; vec3 w;
    if (fr.x + fr.y > 1.0) { f0 = base + 1.0; f1 = base + vec2(1.0, 0.0); f2 = base + vec2(0.0, 1.0); w = vec3(fr.x + fr.y - 1.0, 1.0 - fr.y, 1.0 - fr.x); }
    else { f0 = base; f1 = base + vec2(1.0, 0.0); f2 = base + vec2(0.0, 1.0); w = vec3(1.0 - fr.x - fr.y, fr.x, fr.y); }
    vec3 Pl = impRotY(off / sc, -rot);
    vImpUv0 = impFrameUV(f0, Pl, Vl, B.w);
    vImpUv1 = impFrameUV(f1, Pl, Vl, B.w);
    vImpUv2 = impFrameUV(f2, Pl, Vl, B.w);
    vImpF01 = vec4(f0, f1); vImpF2 = f2; vImpW = w;
    vImpCol = aIC; vImpLayer = aI1.y; vImpFade = fade; vImpRot = rot;
    objectNormal = V;
  }
`;

const IMP_FRAG_HEAD = GLSL_IMP_COMMON + /* glsl */`
uniform highp sampler2DArray uImpAlb;
uniform highp sampler2DArray uImpNrm;
uniform float uImpFrames, uImpFramePx;
varying vec4 vImpF01; varying vec2 vImpF2;
varying vec2 vImpUv0; varying vec2 vImpUv1; varying vec2 vImpUv2;
varying vec3 vImpW; varying vec3 vImpCol;
varying float vImpLayer; varying float vImpFade; varying float vImpRot;
vec3 impN; float impTint; float impGlow;
`;

const IMP_FRAG_COLOR = /* glsl */`
  {
    float inv = 1.0 / uImpFrames, hp = 0.5 / uImpFramePx;
    vec3 a0 = vec3((vImpF01.xy + clamp(vImpUv0, hp, 1.0 - hp)) * inv, vImpLayer);
    vec3 a1 = vec3((vImpF01.zw + clamp(vImpUv1, hp, 1.0 - hp)) * inv, vImpLayer);
    vec3 a2 = vec3((vImpF2 + clamp(vImpUv2, hp, 1.0 - hp)) * inv, vImpLayer);
    vec4 alb = texture(uImpAlb, a0) * vImpW.x + texture(uImpAlb, a1) * vImpW.y + texture(uImpAlb, a2) * vImpW.z;
    vec4 nr = texture(uImpNrm, a0) * vImpW.x + texture(uImpNrm, a1) * vImpW.y + texture(uImpNrm, a2) * vImpW.z;
    // keep the crown solid in the smaller mips (coverage-preserving alpha)
    vec2 tdx = dFdx(a0.xy * uImpFrames * uImpFramePx), tdy = dFdy(a0.xy * uImpFrames * uImpFramePx);
    float lod = 0.5 * log2(max(max(dot(tdx, tdx), dot(tdy, tdy)), 1e-8));
    alb.a *= 1.0 + max(lod, 0.0) * 0.28;
    impTint = nr.b; impGlow = nr.a * 2.0;
    impN = impOctDec(nr.rg);
    diffuseColor.rgb = alb.rgb * alb.rgb * mix(vec3(1.0), vImpCol, impTint);
    diffuseColor.a = alb.a;
    if (feyBayer(gl_FragCoord.xy) < 1.0 - vImpFade) discard;   // complementary to the full-detail fade-out
  }
`;

export class ImpostorField {
  /**
   * atlas: result of bakeImpostors
   * trees: [{x,y,z,scale,rot,color,layer}]
   */
  constructor(atlas, trees, { hiDist, band, loDist }) {
    const n = Math.max(1, trees.length);
    const L = atlas.bounds.length / 4;
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0], 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
    geo.setIndex([0, 1, 2, 1, 3, 2]);
    const a0 = new Float32Array(n * 4), a1 = new Float32Array(n * 4), ac = new Float32Array(n * 3);
    trees.forEach((t, i) => {
      a0.set([t.x, t.y, t.z, t.scale], i * 4);
      a1.set([t.rot, t.layer, 0, 0], i * 4);
      ac.set(t.color, i * 3);
    });
    geo.setAttribute('aI0', new THREE.InstancedBufferAttribute(a0, 4));
    geo.setAttribute('aI1', new THREE.InstancedBufferAttribute(a1, 4));
    geo.setAttribute('aIC', new THREE.InstancedBufferAttribute(ac, 3));
    geo.instanceCount = trees.length;
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    const bounds = [];
    for (let l = 0; l < L; l++) bounds.push(new THREE.Vector4(atlas.bounds[l * 4], atlas.bounds[l * 4 + 1], atlas.bounds[l * 4 + 2], atlas.bounds[l * 4 + 3]));
    this.uniforms = {
      uImpAlb: { value: atlas.albedo }, uImpNrm: { value: atlas.normal },
      uImpB: { value: bounds }, uImpFrames: { value: atlas.frames }, uImpFramePx: { value: atlas.framePx },
      uHiDist: { value: hiDist }, uHiBand: { value: band }, uLoDist: { value: loDist },
    };
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.82, metalness: 0, envMapIntensity: 0.35, side: THREE.DoubleSide,
      alphaTest: 0.5, alphaToCoverage: true,
    });
    feyPatch(mat, {
      key: 'impostor', snow: 0.75,
      uniforms: this.uniforms,
      vertexHead: `#define IMP_LAYERS ${L}\n` + IMP_VERT_HEAD,
      vertexNormal: IMP_VERT,
      vertexBegin: 'transformed = impPos;',
      fragHead: IMP_FRAG_HEAD,
      fragColor: IMP_FRAG_COLOR,
      fragEmissive: /* glsl */`
        {
          // canopy self-shadowing (what the shadow map gives the full-detail tree):
          // foliage turned away from the light sits in the crown's own shadow
          vec3 impWN = impRotY(impN, vImpRot);
          float selfSh = smoothstep(-0.15, 0.6, dot(impWN, uLightDir));
          feySunVis *= mix(1.0, selfSh, 0.85 * impTint);
          vec3 Vd = normalize(cameraPosition - vFeyWorld);
          float back = pow(max(dot(Vd, -uLightDir), 0.0), 4.0);
          totalEmissiveRadiance += diffuseColor.rgb * uSunColor * feySunVis * (0.06 + 0.6 * back) * impTint;
          totalEmissiveRadiance += diffuseColor.rgb * impGlow * (0.45 + 1.4 * uNight);
        }`,
      aoExtra: 'feyAO *= mix(1.0, 0.75, impTint);',
      onShader: (s) => {
        s.fragmentShader = s.fragmentShader.replace('#include <normal_fragment_begin>',
          '#include <normal_fragment_begin>\n normal = normalize((viewMatrix * vec4(impRotY(impN, vImpRot), 0.0)).xyz);');
      },
    });
    this.material = mat;
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
  }

  set hiDist(v) { this.uniforms.uHiDist.value = v; }
  set loDist(v) { this.uniforms.uLoDist.value = v; }
}
