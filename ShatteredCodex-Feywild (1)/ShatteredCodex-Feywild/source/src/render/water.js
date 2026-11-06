// Rivers, lakes, lava meres, frozen lakes and the surrounding sea.
// Water surfaces follow the hydrology solver's per-sample water level; river
// normals are advected along the solved flow field (two-phase flow mapping).
import * as THREE from 'three';
import { N, CELL, HALF, WATER_LAKE, WATER_RIVER, WTYPE_LAVA } from '../world/constants.js';
import { G, GLSL_UNIFORMS, GLSL_COMMON } from './shaderLib.js';

const CH = 64;

const VERT = GLSL_UNIFORMS + GLSL_COMMON + /* glsl */`
attribute vec2 aFlow;
attribute vec2 aType;
uniform float uIsOcean;
varying vec3 vWP;
varying vec2 vFlow;
varying vec2 vType;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  if (uIsOcean > 0.5) {
    // gentle swell away from the shore
    float d = feyHeight(wp.xz);
    float k = smoothstep(-2.0, -12.0, d);
    wp.y += (sin(wp.x * 0.05 + uTime * 0.9) * 0.35 + sin(wp.z * 0.07 - uTime * 1.1) * 0.25) * k;
  }
  vWP = wp.xyz;
  vFlow = aFlow;
  vType = aType;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const FRAG = GLSL_UNIFORMS + GLSL_COMMON + /* glsl */`
uniform sampler2D uWaterNormal;
uniform sampler2D uDetailTex;
uniform float uIsOcean;
varying vec3 vWP;
varying vec2 vFlow;
varying vec2 vType;
vec3 srgb(vec3 c){ return pow(c, vec3(2.2)); }
vec2 wn(vec2 uv){ return texture(uWaterNormal, uv).rg * 2.0 - 1.0; }

void main(){
  vec3 wp = vWP;
  float terr = feyHeight(wp.xz);
  float depth = max(wp.y - terr, 0.0);
  vec3 toCam = cameraPosition - wp;
  float dist = length(toCam);
  vec3 V = toCam / dist;
  vec2 suv = feyUV(wp.xz);
  float sunVis = texture(uShadowTex, suv).r * feyCloudShadow(wp);
  if (uIsOcean > 0.5 && (suv.x < 0.0 || suv.y < 0.0 || suv.x > 1.0 || suv.y > 1.0)) sunVis = feyCloudShadow(wp);
  vec3 L = uLightDir;
  vec3 amb = mix(uSkyZenith, uSkyHorizon, 0.5);
  vec3 col; float alpha;
  if (vType.y > 0.5) {
    // ---------------- ICE
    vec4 nz = texture(uNoiseTex, wp.xz * 0.03);
    float cr = texture(uNoiseTex, wp.xz * 0.06 + 0.3).b;
    float cr2 = texture(uNoiseTex, wp.xz * 0.21).b;
    float cracks = smoothstep(0.5, 0.62, cr) * 0.8 + smoothstep(0.55, 0.64, cr2) * 0.5;
    vec2 nn = wn(wp.xz * 0.02) * 0.15;
    vec3 N = normalize(vec3(nn.x, 1.0, nn.y));
    float fres = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
    vec3 R = reflect(-V, N);
    vec3 refl = feySkyApprox(R);
    vec3 base = mix(srgb(vec3(0.35, 0.62, 0.82)), srgb(vec3(0.82, 0.93, 1.0)), nz.r * 0.7 + cracks * 0.5);
    float snow = smoothstep(0.55, 0.75, nz.g + nz.a * 0.3);
    base = mix(base, vec3(0.92, 0.95, 1.0), snow);
    float ndl = max(dot(N, L), 0.0);
    col = base * (uSunColor * ndl * sunVis * 0.32 + amb * 0.9);
    col = mix(col, refl, fres * (1.0 - snow) * 0.8);
    col += uSunColor * pow(max(dot(R, L), 0.0), 400.0) * 6.0 * sunVis * (1.0 - snow);
    // frozen-in fey light
    float gl = pow(texture(uNoiseTex, wp.xz * 0.013 + 0.7).b, 3.0);
    col += vec3(0.2, 0.7, 1.2) * gl * 0.25 * (0.5 + uNight);
    alpha = 0.96;
  } else if (vType.x > 0.5) {
    // ---------------- LAVA: cooling crust plates split by glowing fissures,
    // with slow molten channels welling up between them
    vec2 drift = vec2(uTime * 0.006, uTime * 0.004);
    vec2 wq = wp.xz + (vec2(texture(uNoiseTex, wp.xz * 0.004 + drift).r, texture(uNoiseTex, wp.xz * 0.004 - drift + 0.5).g) - 0.5) * 30.0;
    float edgeA = texture(uDetailTex, wq * 0.035 + drift).a;          // plate boundaries (large)
    float edgeB = texture(uDetailTex, wq * 0.11 - drift * 1.3 + 0.3).a;  // secondary fractures
    float molten = smoothstep(0.52, 0.72, texture(uNoiseTex, wq * 0.006 + drift * 0.6).r + 0.15 * texture(uNoiseTex, wq * 0.03).g);
    float crack = 1.0 - smoothstep(0.0, 0.09, edgeA);
    float crack2 = (1.0 - smoothstep(0.0, 0.05, edgeB)) * 0.6;
    float heat = clamp(max(max(crack, crack2), molten), 0.0, 1.0);
    float pulse = 0.82 + 0.18 * sin(uTime * 1.4 + wq.x * 0.05 + wq.y * 0.07);
    float plateShade = 0.55 + 0.45 * texture(uNoiseTex, wq * 0.09).a;
    vec3 crustC = srgb(vec3(0.075, 0.06, 0.06)) * plateShade;
    vec3 crustLit = crustC * (amb * 0.9 + uSunColor * max(L.y, 0.0) * 0.25);
    // crust glows faintly from beneath near the cracks
    crustLit += vec3(0.35, 0.06, 0.01) * smoothstep(0.3, 0.0, edgeA) * 0.5;
    vec3 hot = mix(vec3(1.9, 0.38, 0.04), vec3(3.4, 1.35, 0.25), smoothstep(0.6, 1.0, heat) * molten + crack * 0.25);
    col = mix(crustLit, hot * pulse, heat);
    col += vec3(1.4, 0.32, 0.05) * smoothstep(1.2, 0.0, depth) * pulse;
    alpha = 1.0;
  } else {
    // ---------------- WATER
    vec2 flow = vFlow;
    float spd = length(flow);
    float t = uTime * 0.22;
    float ph0 = fract(t), ph1 = fract(t + 0.5);
    float mixF = abs(ph0 * 2.0 - 1.0);
    vec2 uv = wp.xz * 0.11;
    vec2 f0 = wn(uv - flow * ph0 * 0.45) , f1 = wn(uv - flow * ph1 * 0.45 + 0.5);
    vec2 nFlow = mix(f0, f1, mixF) * (0.6 + 0.2 * min(spd, 3.0));
    vec2 wd = uWindDir * (0.6 + uWind);
    vec2 s0 = wn(wp.xz * 0.045 + wd * uTime * 0.012);
    vec2 s1 = wn(wp.xz * 0.13 - wd.yx * uTime * 0.02 + 0.3);
    vec2 s2 = wn(wp.xz * 0.4 + wd * uTime * 0.05);
    vec2 nStill = s0 * 0.5 + s1 * 0.35 + s2 * 0.25 * (1.0 - smoothstep(10.0, 60.0, dist));
    if (uIsOcean > 0.5) nStill = nStill * 1.3 + wn(wp.xz * 0.012 + uTime * 0.004) * 0.6;
    vec2 n2 = mix(nStill, nFlow, smoothstep(0.05, 0.6, spd));
    float strength = mix(0.35, 0.12, smoothstep(20.0, 400.0, dist)) * (1.0 + uStorm);
    vec3 N = normalize(vec3(n2.x * strength, 1.0, n2.y * strength));
    float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
    vec3 R = reflect(-V, N);
    R.y = abs(R.y);
    vec3 refl = feySkyApprox(R);
    // fey water: luminous turquoise shallows, deep sapphire
    vec3 shallow = srgb(vec3(0.16, 0.5, 0.46));
    vec3 deepC = srgb(vec3(0.02, 0.08, 0.13));
    vec4 S = feySeason(wp.xz);
    shallow = mix(shallow, srgb(vec3(0.34, 0.36, 0.62)), S.x * 0.2);
    shallow = mix(shallow, srgb(vec3(0.42, 0.46, 0.26)), S.z * 0.3);
    float dk = 1.0 - exp(-depth * 0.22);
    vec3 body = mix(shallow, deepC, dk);
    float ndl = max(L.y, 0.0);
    vec3 lit = body * (uSunColor * ndl * sunVis * 0.18 + amb * 0.7);
    // subsurface glow in wave crests facing the sun
    lit += shallow * uSunColor * pow(max(dot(V, -L), 0.0), 4.0) * 0.08 * sunVis;
    col = mix(lit, refl, fres);
    vec3 H = normalize(L + V);
    col += uSunColor * (pow(max(dot(N, H), 0.0), 900.0) * 14.0 + pow(max(dot(N, H), 0.0), 90.0) * 0.25) * sunVis;
    // foam: shoreline & rapids
    float fn = texture(uNoiseTex, wp.xz * 0.3 - flow * uTime * 0.15).a;
    float foam = smoothstep(0.3, 0.0, depth) * smoothstep(0.4, 0.75, fn + 0.3 * sin(uTime * 1.5 + depth * 8.0)) * 0.7;
    foam += smoothstep(2.2, 5.0, spd) * smoothstep(0.4, 0.75, fn);
    foam = clamp(foam, 0.0, 1.0);
    col = mix(col, vec3(0.9, 0.95, 1.0) * (amb + uSunColor * 0.25 * sunVis), foam * 0.85);
    // fey sparkles on the surface
    vec2 gc = floor(wp.xz * 2.0);
    float sp = step(0.998, fHash12(gc)) * pow(max(0.0, sin(uTime * 3.0 + fHash12(gc + 3.0) * 60.0)), 20.0);
    col += vec3(0.5, 0.6, 0.7) * sp * (1.0 - smoothstep(10.0, 60.0, dist)) * (0.3 + 0.7 * sunVis);
    alpha = clamp(1.0 - exp(-depth * 1.1), 0.0, 1.0);
    alpha = clamp(max(alpha, fres * smoothstep(0.0, 0.3, depth)) + foam * 0.8, 0.0, 1.0);
    if (uIsOcean > 0.5 && terr < -35.0) alpha = 1.0;
  }
  col = feyApplyFog(col, wp);
  gl_FragColor = vec4(col, alpha);
}
`;

export class Water {
  constructor(W, waterNormalTex, detailTex) {
    this.group = new THREE.Group();
    this.material = new THREE.ShaderMaterial({
      uniforms: { ...G, uWaterNormal: { value: waterNormalTex }, uDetailTex: { value: detailTex }, uIsOcean: { value: 0 } },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: true,
    });
    this.oceanMaterial = this.material.clone();
    this.oceanMaterial.uniforms = { ...G, uWaterNormal: { value: waterNormalTex }, uDetailTex: { value: detailTex }, uIsOcean: { value: 1 } };

    // dilated water level for mesh vertices
    const NN = N * N;
    const lvl = new Float32Array(NN).fill(-1000);
    const typ = new Uint8Array(NN);
    const flow = new Float32Array(NN * 2);
    for (let i = 0; i < NN; i++) {
      const k = W.waterKind[i];
      if (k === WATER_LAKE || k === WATER_RIVER) { lvl[i] = W.waterH[i]; typ[i] = W.waterType[i]; flow[i * 2] = W.flow[i * 2]; flow[i * 2 + 1] = W.flow[i * 2 + 1]; }
    }
    for (let pass = 0; pass < 2; pass++) {
      const src = lvl.slice(), srcT = typ.slice(), srcF = flow.slice();
      for (let z = 1; z < N - 1; z++) for (let x = 1; x < N - 1; x++) {
        const i = z * N + x;
        if (src[i] > -999) continue;
        let best = -1000, bj = -1;
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
          const j = i + dz * N + dx;
          if (src[j] > best) { best = src[j]; bj = j; }
        }
        if (bj >= 0 && best > -999) { lvl[i] = best; typ[i] = srcT[bj]; flow[i * 2] = srcF[bj * 2]; flow[i * 2 + 1] = srcF[bj * 2 + 1]; }
      }
    }
    const n = (N - 1) / CH;
    for (let cz = 0; cz < n; cz++) for (let cx = 0; cx < n; cx++) {
      const geo = this.buildChunk(cx, cz, lvl, typ, flow, W);
      if (!geo) continue;
      const m = new THREE.Mesh(geo, this.material);
      m.renderOrder = 1;
      this.group.add(m);
    }
    // ocean
    const og = new THREE.CircleGeometry(9000, 96, 0, Math.PI * 2);
    // add density near center: use ring geometry combination
    og.rotateX(-Math.PI / 2);
    const cnt = og.attributes.position.count;
    og.setAttribute('aFlow', new THREE.BufferAttribute(new Float32Array(cnt * 2), 2));
    og.setAttribute('aType', new THREE.BufferAttribute(new Float32Array(cnt * 2), 2));
    this.ocean = new THREE.Mesh(og, this.oceanMaterial);
    this.ocean.frustumCulled = false;
    this.ocean.renderOrder = 0;
    this.group.add(this.ocean);
    // denser inner ocean ring so swell reads near the coast
    const inner = new THREE.PlaneGeometry(2600, 2600, 260, 260);
    inner.rotateX(-Math.PI / 2);
    const ic = inner.attributes.position.count;
    inner.setAttribute('aFlow', new THREE.BufferAttribute(new Float32Array(ic * 2), 2));
    inner.setAttribute('aType', new THREE.BufferAttribute(new Float32Array(ic * 2), 2));
    // push the far disc slightly below where the inner plane exists
    const op = og.attributes.position;
    for (let i = 0; i < op.count; i++) { const x = op.getX(i), z = op.getZ(i); if (Math.abs(x) < 1290 && Math.abs(z) < 1290) op.setY(i, -0.6); }
    this.innerOcean = new THREE.Mesh(inner, this.oceanMaterial);
    this.innerOcean.renderOrder = 0;
    this.innerOcean.frustumCulled = false;
    this.group.add(this.innerOcean);
  }

  buildChunk(cx, cz, lvl, typ, flow, W) {
    const pos = [], fl = [], ty = [], idx = [];
    const vmap = new Map();
    const x0 = cx * CH, z0 = cz * CH;
    const vert = (gx, gz) => {
      const i = gz * N + gx;
      let v = vmap.get(i);
      if (v !== undefined) return v;
      v = pos.length / 3;
      pos.push(gx * CELL - HALF, lvl[i], gz * CELL - HALF);
      fl.push(flow[i * 2], flow[i * 2 + 1]);
      ty.push(typ[i] === 1 ? 1 : 0, typ[i] === 2 ? 1 : 0);
      vmap.set(i, v);
      return v;
    };
    for (let j = 0; j < CH; j++) for (let i = 0; i < CH; i++) {
      const gx = x0 + i, gz = z0 + j;
      if (gx >= N - 1 || gz >= N - 1) continue;
      const a = gz * N + gx, b = a + 1, c = a + N, d = c + 1;
      if (lvl[a] < -999 || lvl[b] < -999 || lvl[c] < -999 || lvl[d] < -999) continue;
      // skip quads fully buried under terrain
      const H = W.height;
      const maxL = Math.max(lvl[a], lvl[b], lvl[c], lvl[d]);
      if (H[a] > maxL + 0.5 && H[b] > maxL + 0.5 && H[c] > maxL + 0.5 && H[d] > maxL + 0.5) continue;
      const va = vert(gx, gz), vb = vert(gx + 1, gz), vc = vert(gx, gz + 1), vd = vert(gx + 1, gz + 1);
      idx.push(va, vc, vb, vb, vc, vd);
    }
    if (!idx.length) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aFlow', new THREE.Float32BufferAttribute(fl, 2));
    geo.setAttribute('aType', new THREE.Float32BufferAttribute(ty, 2));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    return geo;
  }

  update(camera) {
    // the sea is static around the island; nothing to do per frame
  }
}
