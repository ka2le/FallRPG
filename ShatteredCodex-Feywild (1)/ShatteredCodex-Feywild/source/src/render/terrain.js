// Chunked, LOD'd terrain with a procedural, season-aware splat shader.
import * as THREE from 'three';
import { N, CELL, HALF } from '../world/constants.js';
import { feyPatch } from './shaderLib.js';
import { GRASS_GLSL } from './groundCover.js';

const CH = 64; // cells per chunk side

const TERRAIN_FRAG_HEAD = GRASS_GLSL + /* glsl */`
varying vec3 vTerrN;
uniform float uGrassEnd;
uniform sampler2D uDetailTex;
uniform highp sampler2DArray uGAlb;
uniform highp sampler2DArray uGNrm;
vec3 srgb(vec3 c){ return pow(c, vec3(2.2)); }
float lum(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// Tile-less sampling: two hashed offsets blended by a low-frequency index,
// with a height-aware blend so the transition follows the material.
void gSample(float layer, vec2 uv, bool cheap, out vec4 alb, out vec4 nrm){
  vec2 dx = dFdx(uv), dy = dFdy(uv);
  if (cheap) {
    // far away the macro variation hides tiling: one tap instead of two
    alb = textureGrad(uGAlb, vec3(uv, layer), dx, dy);
    nrm = textureGrad(uGNrm, vec3(uv, layer), dx, dy);
    return;
  }
  float k = texture(uNoiseTex, uv * 0.021).r;
  float idx = k * 8.0;
  float i = floor(idx), f = fract(idx);
  vec2 oa = fract(sin(vec2(3.1, 7.7) * (i + 1.3)) * 43.7);
  vec2 ob = fract(sin(vec2(3.1, 7.7) * (i + 2.3)) * 43.7);
  vec4 a1 = textureGrad(uGAlb, vec3(uv + oa, layer), dx, dy);
  vec4 a2 = textureGrad(uGAlb, vec3(uv + ob, layer), dx, dy);
  float b = smoothstep(0.25, 0.75, f + 0.35 * (a2.a - a1.a));
  alb = mix(a1, a2, b);
  nrm = mix(textureGrad(uGNrm, vec3(uv + oa, layer), dx, dy), textureGrad(uGNrm, vec3(uv + ob, layer), dx, dy), b);
}

void gTri(float layer, vec3 p, vec3 n, out vec4 alb, out vec4 nrm, out vec3 wn){
  vec3 bw = pow(abs(n), vec3(5.0)); bw /= (bw.x + bw.y + bw.z);
  vec4 ax = texture(uGAlb, vec3(p.zy, layer)), ay = texture(uGAlb, vec3(p.xz, layer)), az = texture(uGAlb, vec3(p.xy, layer));
  vec4 nx = texture(uGNrm, vec3(p.zy, layer)), ny = texture(uGNrm, vec3(p.xz, layer)), nz = texture(uGNrm, vec3(p.xy, layer));
  alb = ax * bw.x + ay * bw.y + az * bw.z;
  nrm = nx * bw.x + ny * bw.y + nz * bw.z;
  vec2 tx = nx.rg * 2.0 - 1.0, ty = ny.rg * 2.0 - 1.0, tz = nz.rg * 2.0 - 1.0;
  wn = normalize(n + (vec3(0.0, tx.y, tx.x) * bw.x + vec3(ty.x, 0.0, ty.y) * bw.y + vec3(tz.x, tz.y, 0.0) * bw.z) * 1.4);
}
`;

const TERRAIN_FRAG_MAP = /* glsl */`
  vec3 tWN;
  vec3 tEmis = vec3(0.0);
  float tRough = 0.9;
  float tGrass = 0.0;
  vec3 tGrassCol = vec3(0.0);
  {
    vec3 wp = vFeyWorld;
    vec3 gN = normalize(vTerrN);
    vec2 uvw = feyUV(wp.xz);
    vec4 S = texture(uSeasonTex, uvw);
    vec4 F = texture(uFeatTex, uvw);
    vec4 F2 = texture(uFeat2Tex, uvw);
    vec4 M = texture(uMiscTex, uvw);
    float dist = length(wp - cameraPosition);
    float fadeD = 1.0 - smoothstep(70.0, 360.0, dist);
    vec4 nz = texture(uNoiseTex, wp.xz * 0.0035);
    vec4 nz2 = texture(uNoiseTex, wp.xz * 0.019 + 0.5);
    float slope = 1.0 - gN.y;

    // ---------------- material weights
    float W[8];
    float wRock = smoothstep(0.22, 0.40, slope + (nz2.b - 0.5) * 0.14);
    wRock = max(wRock, smoothstep(185.0, 240.0, wp.y + nz.g * 30.0) * 0.8);
    float wet = M.g * (1.0 - S.w * 0.8);
    float snowAmt = clamp(S.w * 1.35 - 0.25 + smoothstep(150.0, 230.0, wp.y + nz.g * 40.0) * 0.95, 0.0, 1.0);
    W[0] = 0.4;                                                                  // turf
    W[1] = M.r * smoothstep(0.3, 0.62, nz2.g * 0.7 + nz.a * 0.5) * (1.0 - S.z * 0.6) * 1.1; // forest floor
    W[2] = smoothstep(0.02, 0.3, F.a) * 1.4 + S.z * (M.r * smoothstep(0.35, 0.7, nz2.g) * 0.9 + 0.35 * smoothstep(0.5, 0.8, nz2.r)); // leaves
    W[3] = wRock * 1.3;                                                          // rock
    W[4] = snowAmt * smoothstep(0.42, 0.8, gN.y + (nz2.r - 0.5) * 0.3) * 1.35; // snow
    W[5] = smoothstep(2.9, 1.3, wp.y + (nz2.a - 0.5) * 1.6) * 1.2;             // sand
    W[6] = smoothstep(0.35, 0.85, M.g) * (1.0 - S.w * 0.7) * 0.9;              // mud
    W[7] = smoothstep(0.1, 0.55, F.b) * 1.5;                                     // basalt
    // travelled roads & village lanes: packed earth with a sandy crown
    float road = smoothstep(0.25, 0.75, M.a + (nz2.g - 0.5) * 0.3);
    W[6] = max(W[6], road * 1.25 * (1.0 - S.w * 0.35));
    W[0] *= 1.0 - road * 0.85; W[1] *= 1.0 - road; W[2] *= 1.0 - road * 0.7;
    float scl[8] = float[8](0.31, 0.33, 0.38, 0.2, 0.17, 0.33, 0.33, 0.25);

    // ---------------- sample & height-blend
    vec4 AL[8]; vec4 NR[8]; vec3 WN[8]; float B[8];
    float bmax = 0.0;
    for (int i = 0; i < 8; i++){
      B[i] = 0.0; AL[i] = vec4(0.0); NR[i] = vec4(0.5, 0.5, 0.8, 1.0); WN[i] = gN;
      if (W[i] < 0.012) continue;
      if (i == 3) {
        gTri(3.0, wp * scl[3], gN, AL[i], NR[i], WN[i]);
        WN[i] = normalize(mix(gN, WN[i], 0.4 + 0.6 * fadeD));
      } else {
        gSample(float(i), wp.xz * scl[i], dist > 240.0, AL[i], NR[i]);
        vec2 t = NR[i].rg * 2.0 - 1.0;
        WN[i] = normalize(gN + vec3(t.x, 0.0, t.y) * (0.35 + 0.9 * fadeD));
      }
      B[i] = min(W[i], 1.2) + AL[i].a * 0.55;
      bmax = max(bmax, B[i]);
    }
    float bsum = 0.0;
    for (int i = 0; i < 8; i++){ B[i] = max(B[i] - bmax + 0.24, 0.0) * step(0.012, W[i]); bsum += B[i]; }

    // ---------------- per-material art direction (grounded base, rich accents)
    // turf: a neutral olive base, tinted by season
    vec3 tSp = vec3(1.02, 1.1, 0.82), tSu = vec3(0.86, 0.98, 0.78), tAu = vec3(1.5, 1.02, 0.55), tWi = vec3(1.08, 1.08, 1.12);
    vec3 turfTint = S.x * tSp + S.y * tSu + S.z * tAu + S.w * tWi;
    turfTint *= mix(vec3(1.0), vec3(1.1, 1.02, 0.8), smoothstep(0.45, 0.8, nz2.a) * 0.6);   // sun-bleached patches
    turfTint *= 0.86 + 0.26 * nz.r;
    vec3 turf = AL[0].rgb * turfTint;
    turf = mix(turf, lum(turf) * vec3(1.05, 0.88, 1.35) * 1.15, F.r * 0.55);     // amethyst drift
    turf = mix(turf, turf * vec3(0.8, 1.15, 0.85), F.g * 0.35);                 // bloomwood: lush
    turf = mix(turf, lum(turf) * vec3(0.7, 1.1, 1.05) * 1.1, F2.g * 0.45);      // glimmercap: teal moss
    turf = mix(turf, lum(turf) * vec3(1.1, 1.05, 1.25) * 1.3, F2.r * 0.5);      // shiverglass frost
    AL[0].rgb = turf;
    // forest floor
    AL[1].rgb *= mix(vec3(1.0), vec3(0.95, 1.08, 0.9), S.x + S.y) * mix(vec3(1.0), vec3(1.25, 1.22, 1.3), S.w * 0.6);
    // rock: cool in winter, warm in autumn
    AL[3].rgb *= mix(vec3(1.0), vec3(1.06, 0.98, 0.9), S.z * 0.6) * mix(vec3(1.0), vec3(0.92, 0.97, 1.08), S.w);
    AL[3].rgb = mix(AL[3].rgb, AL[3].rgb * vec3(0.9, 1.0, 1.15), F2.a * 0.6);
    // macro rock variation: mineral banding & vertical weathering streaks
    float streak = texture(uNoiseTex, vec2(wp.x + wp.z, wp.y * 6.0) * 0.0045).g;
    float band = texture(uNoiseTex, vec2(wp.y * 0.02, (wp.x - wp.z) * 0.001)).r;
    AL[3].rgb *= (0.72 + 0.5 * streak) * mix(vec3(0.92, 0.95, 1.0), vec3(1.1, 1.0, 0.88), band);
    // grove petals scattered on turf
    float petals = F2.b * smoothstep(0.62, 0.7, texture(uNoiseTex, wp.xz * 0.9).a) * (1.0 - W[3]);

    vec3 col = vec3(0.0); vec3 nsum = vec3(0.0); float rough = 0.0, ao = 0.0;
    for (int i = 0; i < 8; i++){
      if (B[i] <= 0.0) continue;
      float b = B[i] / bsum;
      col += AL[i].rgb * b; nsum += WN[i] * b; rough += NR[i].b * b; ao += NR[i].a * b;
    }
    col = mix(col, srgb(vec3(0.96, 0.84, 0.88)), petals * 0.8);
    // roads: warm packed earth with wheel-worn texture, under any snow
    {
      float rb = road * (1.0 - B[4] / max(bsum, 1e-3));
      float det = clamp(lum(col) / 0.16, 0.55, 1.5);
      vec3 roadCol = srgb(vec3(0.46, 0.36, 0.23)) * det * (0.82 + 0.3 * nz2.b) * mix(vec3(1.0), vec3(1.06, 0.98, 0.9), S.z);
      col = mix(col, roadCol, rb * 0.88);
      wet *= 1.0 - rb;
      rough = mix(rough, 0.92, smoothstep(0.0, 0.25, road));
    }
    col *= 1.0 - 0.32 * wet * (1.0 - B[4] / max(bsum, 1e-3));
    rough -= wet * 0.25;
    col *= mix(1.0, ao, 0.85);

    // --- grass carpet: the ground under (and beyond) the blades takes the
    // field-average blade colour from the shared grass model, so the far
    // meadow reads as grass and the blade LOD hand-over is seamless.
    float snowF = B[4] / max(bsum, 1e-3);
    {
      float gClump = texture(uNoiseTex, wp.xz * 0.021).r;
      float gClump2 = texture(uNoiseTex, wp.xz * 0.07 + 0.3).g;
      float gd = clamp(feyGrassDensity(S, F, M, gClump, gClump2), 0.0, 1.0);
      float gh = feyGrassHeight(S, F, F2) * (0.55 + 0.9 * gClump);
      vec4 hwG = feyHeightFull(wp.xz);
      float dry = step(hwG.g, wp.y - 0.05);
      tGrass = gd * smoothstep(0.1, 0.5, gh) * (1.0 - snowF) * (1.0 - road * 0.6) * dry;
      tGrass *= mix(0.3, 0.92, smoothstep(6.0, uGrassEnd, dist));
      // soft mid-frequency variation (mip-filtered, so it never sparkles)
      float gv = texture(uNoiseTex, wp.xz * 0.23 + 0.17).a;
      tGrassCol = feyGrassMean(S, F, F2, gClump) * (0.9 + 0.2 * gv);
      col = mix(col, tGrassCol, tGrass);
      rough = mix(rough, 0.62, tGrass);
    }

    // --- far wildflower specks (jewel accents, kept sparse). When a speck cell
    // shrinks below a few pixels it is replaced by its expected value (average
    // coverage × average colour) instead of point-sampling random cells, which
    // is what produced the shimmering "ants" at mid distance.
    {
      vec2 fc = floor(wp.xz * 1.6);
      vec3 fh = fHash32(fc);
      vec2 lp = fract(wp.xz * 1.6) - 0.5 - (fh.zy - 0.5) * 0.36;
      float fpx = fwidth(wp.x * 1.6) + fwidth(wp.z * 1.6);
      float thr = 0.955 - F.g * 0.15;
      float mask = (S.x + S.y * 0.8 + F.r) * max(B[0] / max(bsum, 1e-3), tGrass) * (1.0 - M.r * 0.7) * (1.0 - road) * (1.0 - snowF);
      float disc = 1.0 - smoothstep(0.22 - fpx, 0.22 + fpx, length(lp));
      vec3 flc = fh.y < 0.2 ? vec3(0.72, 0.13, 0.22) : fh.y < 0.4 ? vec3(0.88, 0.7, 0.23) : fh.y < 0.6 ? vec3(0.48, 0.25, 0.66) : fh.y < 0.8 ? vec3(0.94, 0.92, 0.84) : vec3(0.2, 0.32, 0.72);
      vec3 flMean = vec3(0.644, 0.456, 0.534);
      if (F.r > 0.3) { flc = vec3(0.55, 0.36, 0.8); flMean = flc; }
      float farF = smoothstep(0.35, 0.8, fpx);
      float near = step(thr, fh.x) * disc;
      float avg = (1.0 - thr) * 0.152 * 1.6;
      float fl = mix(near, avg, farF) * mask * smoothstep(18.0, 45.0, dist);
      col = mix(col, srgb(mix(flc, flMean, farF)), fl * 0.7);
    }

    // --- lava fields: glowing fissures
    float lavaW = F.b;
    if (lavaW > 0.01 && W[7] > 0.012){
      float pulse = 0.75 + 0.25 * sin(uTime * 1.6 + nz2.r * 20.0);
      float fine = smoothstep(0.24, 0.08, AL[7].a) * B[7] / max(bsum, 1e-3);
      float crack2 = 1.0 - smoothstep(0.0, 0.05, texture(uDetailTex, wp.xz * 0.018).a + (1.0 - lavaW) * 0.3);
      tEmis += vec3(2.2, 0.5, 0.07) * (fine * 0.8 + crack2 * 1.1) * pulse * smoothstep(0.35, 0.95, lavaW);
    }

    // --- subtle frost glints on snow & crystal ground
    {
      vec2 gc = floor(wp.xz * 7.0);
      vec3 gh = fHash32(gc);
      float tw = pow(max(0.0, sin(uTime * (1.5 + gh.y * 3.0) + gh.z * 50.0 + dot(cameraPosition.xz, vec2(0.7)))), 12.0);
      float gl = step(0.996, gh.x) * tw * (B[4] / max(bsum, 1e-3) * 0.6 + F2.r * 0.8) * (1.0 - smoothstep(10.0, 40.0, dist));
      tEmis += vec3(1.0, 1.1, 1.3) * gl * 0.35;
    }

    // --- caustics under water
    {
      vec4 hw = feyHeightFull(wp.xz);
      float depth = hw.g - wp.y;
      if (depth > 0.0 && hw.b < 0.5){
        vec2 cp = wp.xz * 0.35;
        float c1 = texture(uDetailTex, cp + uTime * vec2(0.03, 0.02)).a;
        float c2 = texture(uDetailTex, cp * 1.3 - uTime * vec2(0.02, 0.035)).a;
        float ca = pow(1.0 - min(c1, c2), 6.0) * 1.6;
        tEmis += uSunColor * ca * 0.04 * exp(-depth * 0.35) * smoothstep(0.0, 0.5, depth) * (1.0 - uNight);
        col *= mix(vec3(1.0), vec3(0.55, 0.72, 0.7), smoothstep(0.0, 3.0, depth));
      }
    }

    diffuseColor.rgb = col;
    tRough = clamp(rough, 0.05, 1.0);
    tWN = normalize(mix(nsum, gN, tGrass));
  }
`;

export class Terrain {
  constructor(W, detailTex, ground) {
    this.W = W;
    this.group = new THREE.Group();
    this.uGrassEnd = { value: 90 };
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.0, envMapIntensity: 0.6 });
    feyPatch(mat, {
      key: 'terrain',
      snow: 0.0,
      uniforms: { uDetailTex: { value: detailTex }, uGAlb: { value: ground.albedo }, uGNrm: { value: ground.normal }, uGrassEnd: this.uGrassEnd },
      vertexHead: 'varying vec3 vTerrN;\n',
      vertexEnd: 'vTerrN = normal;\n',
      fragHead: TERRAIN_FRAG_HEAD,
      fragMap: TERRAIN_FRAG_MAP,
      // the grass carpet gets the same sky/sun fill the blades get
      fragEmissive: 'totalEmissiveRadiance += tEmis + tGrassCol * tGrass * (uSunColor * feySunVis * 0.07 + mix(uSkyZenith, uSkyHorizon, 0.5) * 0.36 * texture(uShadowTex, feyUV(vFeyWorld.xz)).g);',
      aoExtra: 'feyAO *= 1.0 - 0.3 * texture(uMiscTex, feyUV(vFeyWorld.xz)).r;',
      onShader: (s) => {
        s.fragmentShader = s.fragmentShader.replace('#include <normal_fragment_maps>', 'normal = normalize((viewMatrix * vec4(tWN, 0.0)).xyz);')
          .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = tRough;');
      },
    });
    this.material = mat;
    const n = (N - 1) / CH;
    this.lods = [];
    for (let cz = 0; cz < n; cz++) for (let cx = 0; cx < n; cx++) {
      const lod = new THREE.LOD();
      const cxw = (cx * CH + CH / 2) * CELL - HALF, czw = (cz * CH + CH / 2) * CELL - HALF;
      lod.position.set(cxw, 0, czw);
      const levels = [[1, 0], [2, 190], [4, 420], [8, 850]];
      for (const [step, d] of levels) {
        const geo = this.buildChunk(cx, cz, step, cxw, czw);
        const m = new THREE.Mesh(geo, mat);
        m.receiveShadow = true;
        m.castShadow = false;
        m.matrixAutoUpdate = false;
        m.updateMatrix();
        lod.addLevel(m, d);
      }
      lod.updateMatrix();
      lod.matrixAutoUpdate = false;
      this.group.add(lod);
      this.lods.push(lod);
    }
  }

  buildChunk(cx, cz, step, ox, oz) {
    const H = this.W.height;
    const n = CH / step + 1;
    const x0 = cx * CH, z0 = cz * CH;
    const vcount = n * n + 4 * n;
    const pos = new Float32Array(vcount * 3);
    const nor = new Float32Array(vcount * 3);
    const hAt = (gx, gz) => H[Math.min(N - 1, Math.max(0, gz)) * N + Math.min(N - 1, Math.max(0, gx))];
    let v = 0;
    const put = (gx, gz, yOff) => {
      const h = hAt(gx, gz);
      pos[v * 3] = gx * CELL - HALF - ox; pos[v * 3 + 1] = h + yOff; pos[v * 3 + 2] = gz * CELL - HALF - oz;
      const d = Math.max(1, step >> 1);
      const hx = (hAt(gx + d, gz) - hAt(gx - d, gz)) / (2 * d * CELL);
      const hz = (hAt(gx, gz + d) - hAt(gx, gz - d)) / (2 * d * CELL);
      const l = Math.hypot(hx, 1, hz);
      nor[v * 3] = -hx / l; nor[v * 3 + 1] = 1 / l; nor[v * 3 + 2] = -hz / l;
      v++;
    };
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) put(x0 + i * step, z0 + j * step, 0);
    const skirt = -(1.5 + step * 1.5);
    const edgeStart = v;
    for (let i = 0; i < n; i++) put(x0 + i * step, z0, skirt);                 // top
    for (let i = 0; i < n; i++) put(x0 + i * step, z0 + (n - 1) * step, skirt); // bottom
    for (let j = 0; j < n; j++) put(x0, z0 + j * step, skirt);                 // left
    for (let j = 0; j < n; j++) put(x0 + (n - 1) * step, z0 + j * step, skirt); // right
    const idx = [];
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
      // alternate diagonal for better shape
      if ((i + j) & 1) idx.push(a, c, b, b, c, d); else idx.push(a, c, d, a, d, b);
    }
    const T0 = edgeStart, B0 = edgeStart + n, L0 = edgeStart + 2 * n, R0 = edgeStart + 3 * n;
    for (let i = 0; i < n - 1; i++) {
      // top edge (z0): grid row 0
      idx.push(i, i + 1, T0 + i, i + 1, T0 + i + 1, T0 + i);
      // bottom edge: row n-1
      const a = (n - 1) * n + i;
      idx.push(a, B0 + i, a + 1, a + 1, B0 + i, B0 + i + 1);
      // left edge: column 0
      const l = i * n;
      idx.push(l, L0 + i, l + n, l + n, L0 + i, L0 + i + 1);
      // right edge
      const r = i * n + n - 1;
      idx.push(r, r + n, R0 + i, r + n, R0 + i + 1, R0 + i);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    return geo;
  }
}
