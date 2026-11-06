// Ambient GPU particle fields that wrap around the camera (pollen, petals,
// falling leaves, embers, snow, fireflies, glitter) + a CPU particle system for
// spell effects.
import * as THREE from 'three';
import { G, GLSL_UNIFORMS, GLSL_COMMON } from './shaderLib.js';
import { RNG } from '../core/rng.js';

const AMB_VERT = GLSL_UNIFORMS + GLSL_COMMON + /* glsl */`
attribute vec4 aSeed;
uniform float uBox;
uniform float uBoxH;
uniform float uDensity;
varying vec2 vUv;
varying vec4 vCol;
varying float vAtlas;
vec3 srgbV(vec3 c){ return pow(c, vec3(2.2)); }
void main(){
  vec4 r = aSeed;
  vec3 base = r.xyz * uBox;
  float t = uTime;
  vec3 vel = vec3(0.0);
  float size = 0.1; vec3 col = vec3(1.0); float alpha = 1.0; float atlas = 0.0; float rot = r.w * 6.28; float flip = 1.0;
  vec2 wind = uWindDir * (0.6 + uWind * 2.0 + uStorm * 10.0);
  vec3 wob = vec3(sin(t * 0.7 + r.w * 40.0), sin(t * 0.9 + r.x * 30.0), cos(t * 0.6 + r.y * 50.0));
#if TYPE == 0
  // pollen: shimmering violet motes
  vel = vec3(wind.x * 0.8, 0.15 * sin(r.w * 10.0), wind.y * 0.8);
  base += wob * vec3(1.2, 0.6, 1.2);
  size = 0.05 + 0.11 * r.w * r.w;
  if (r.x < 0.12) { size = 0.35 + 0.5 * r.y; atlas = 0.0; }
  float tw = 0.5 + 0.5 * sin(t * (2.0 + r.x * 5.0) + r.y * 60.0);
  col = mix(vec3(0.6, 0.28, 1.2), vec3(1.2, 0.7, 1.6), r.z) * (0.5 + 1.2 * tw * tw);
  atlas = r.x > 0.75 ? 1.0 : 0.0;
  if (r.x < 0.12) col *= 0.08;
#elif TYPE == 1
  // blossom petals
  vel = vec3(wind.x, -0.55 - r.w * 0.4, wind.y);
  base += wob * 0.8;
  size = 0.06 + 0.04 * r.z;
  col = mix(srgbV(vec3(0.93, 0.7, 0.78)), srgbV(vec3(0.97, 0.93, 0.92)), r.x);
  rot += t * (1.5 + r.y * 3.0);
  flip = cos(t * (2.0 + r.x * 3.0) + r.w * 20.0);
  atlas = 3.0;
#elif TYPE == 2
  // autumn leaves
  vel = vec3(wind.x * 1.2, -0.9 - r.w * 0.6, wind.y * 1.2);
  base += wob * vec3(1.5, 0.3, 1.5);
  size = 0.12 + 0.1 * r.z;
  float k = r.x;
  vec3 c = k < 0.25 ? vec3(0.62, 0.16, 0.1) : k < 0.5 ? vec3(0.82, 0.44, 0.14) : k < 0.75 ? vec3(0.86, 0.64, 0.24) : vec3(0.5, 0.14, 0.15);
  col = srgbV(c);
  rot += t * (1.0 + r.y * 2.5);
  flip = cos(t * (1.5 + r.x * 2.5) + r.w * 20.0);
  atlas = floor(r.y * 3.0);
#elif TYPE == 3
  // embers rising from lava
  vel = vec3(wind.x * 0.4, 2.0 + r.w * 3.0, wind.y * 0.4);
  base += wob * 0.6;
  size = 0.03 + 0.05 * r.z;
  float fl = 0.5 + 0.5 * sin(t * 12.0 + r.x * 90.0);
  col = mix(vec3(3.2, 0.8, 0.12), vec3(4.0, 2.0, 0.5), r.y) * (0.4 + fl);
  atlas = 0.0;
#elif TYPE == 4
  // snow
  vel = vec3(wind.x * (0.5 + r.z), -1.1 - r.w * 0.8 - uStorm * 1.5, wind.y * (0.5 + r.z));
  base += wob * 0.4;
  size = 0.025 + 0.035 * r.z + uStorm * 0.03;
  col = vec3(1.0, 1.02, 1.08);
  atlas = r.w > 0.7 ? 2.0 : 0.0;
#elif TYPE == 5
  // fireflies / wisps
  base += vec3(sin(t * 0.3 + r.w * 30.0) * 3.0, sin(t * 0.5 + r.x * 20.0) * 1.0, cos(t * 0.35 + r.y * 25.0) * 3.0);
  vel = vec3(0.0);
  size = 0.05 + 0.05 * r.z;
  float blink = smoothstep(0.3, 1.0, sin(t * (0.8 + r.x) + r.w * 50.0));
  col = mix(vec3(1.6, 1.7, 0.45), vec3(0.35, 1.4, 1.25), step(0.65, r.y)) * blink;
  atlas = 0.0;
#else
  // glitter / fey motes
  base += wob * 1.5;
  vel = vec3(wind.x * 0.2, 0.1, wind.y * 0.2);
  size = 0.03 + 0.03 * r.z;
  float tw2 = pow(max(0.0, sin(t * (1.0 + r.x * 3.0) + r.y * 80.0)), 8.0);
  col = mix(vec3(0.6, 0.9, 1.4), vec3(1.1, 0.9, 1.4), r.w) * tw2 * 1.1;
  atlas = 1.0;
#endif
  vec3 bx = vec3(uBox, uBoxH, uBox);
  base.y *= uBoxH / uBox;
  vec3 origin = cameraPosition - bx * 0.5;
  vec3 p = mod(base + vel * t - origin, bx) + origin;
  // masks
  vec2 uvw = feyUV(p.xz);
  vec4 S = texture(uSeasonTex, uvw);
  vec4 F = texture(uFeatTex, uvw);
  vec4 F2 = texture(uFeat2Tex, uvw);
  vec4 M = texture(uMiscTex, uvw);
  float mask = 0.0;
#if TYPE == 0
  mask = F.r * 1.2;
#elif TYPE == 1
  mask = F2.b + S.x * 0.12 + S.x * M.r * 0.2;
#elif TYPE == 2
  mask = S.z * (0.25 + 0.75 * M.r) + F.a * 0.8;
#elif TYPE == 3
  mask = smoothstep(0.3, 0.9, F.b) * 1.5;
#elif TYPE == 4
  mask = S.w * (0.3 + 0.7 * uStorm) + smoothstep(170.0, 240.0, p.y) * 0.5;
#elif TYPE == 5
  mask = ((S.y * 0.4 + F.g * 0.8 + F2.g * 0.8) * uNight + (S.x + S.z) * uNight * 0.2);
#else
  mask = F2.r * 0.6 + F2.a * 0.2;
#endif
  float gy = feyHeight(p.xz);
  float alive = step(r.w * 0.999, clamp(mask, 0.0, 1.0) * uDensity) * step(gy - 0.2, p.y);
  float dcam = length(p - cameraPosition);
  alpha = alive * (1.0 - smoothstep(uBox * 0.3, uBox * 0.5, dcam)) * smoothstep(0.2, 1.2, dcam);
  vec4 mv = viewMatrix * vec4(p, 1.0);
  vec2 q = position.xy;
  q.x *= flip;
  float cr = cos(rot), sr = sin(rot);
  q = vec2(cr * q.x - sr * q.y, sr * q.x + cr * q.y);
  mv.xy += q * size * (1.0 + uStorm * 0.5 * float(TYPE == 4));
  gl_Position = projectionMatrix * mv;
  if (alpha < 0.001) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  vUv = position.xy + 0.5;
  // lit colour for non-emissive types
#if TYPE == 1 || TYPE == 2 || TYPE == 4
  vec3 amb = mix(uSkyZenith, uSkyHorizon, 0.5);
  col *= amb * 0.9 + uSunColor * 0.35 * max(uLightDir.y, 0.0) + 0.05;
#endif
  vCol = vec4(col, alpha);
  vAtlas = atlas;
}
`;

const AMB_FRAG = /* glsl */`
uniform sampler2D uAtlas;
uniform float uAtlasCells;
varying vec2 vUv;
varying vec4 vCol;
varying float vAtlas;
void main(){
  vec4 t = texture(uAtlas, vec2((vUv.x + vAtlas) / uAtlasCells, vUv.y));
  float a = t.a * vCol.a;
  if (a < 0.01) discard;
#if ADDITIVE
  gl_FragColor = vec4(vCol.rgb * t.rgb * a, 1.0);
#else
  gl_FragColor = vec4(vCol.rgb * t.rgb, a);
#endif
}
`;

const TYPES = {
  pollen: { id: 0, add: true, atlas: 'p', box: 56, h: 22 },
  petals: { id: 1, add: false, atlas: 'l', box: 60, h: 30 },
  leaves: { id: 2, add: false, atlas: 'l', box: 64, h: 34 },
  embers: { id: 3, add: true, atlas: 'p', box: 60, h: 34 },
  snow: { id: 4, add: false, atlas: 'p', box: 46, h: 40 },
  fireflies: { id: 5, add: true, atlas: 'p', box: 70, h: 14 },
  glitter: { id: 6, add: true, atlas: 'p', box: 44, h: 14 },
};

export class AmbientParticles {
  constructor(particleAtlas, leafAtlas, qualityMul = 1) {
    this.group = new THREE.Group();
    const counts = { pollen: 11000, petals: 2500, leaves: 3500, embers: 2200, snow: 16000, fireflies: 1500, glitter: 900 };
    const rng = new RNG(77);
    this.fields = {};
    for (const [name, cfg] of Object.entries(TYPES)) {
      const count = Math.floor(counts[name] * qualityMul);
      const geo = new THREE.InstancedBufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 0], 3));
      geo.setIndex([0, 1, 2, 1, 3, 2]);
      const seeds = new Float32Array(count * 4);
      for (let i = 0; i < count * 4; i++) seeds[i] = rng.next();
      geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
      geo.instanceCount = count;
      const mat = new THREE.ShaderMaterial({
        uniforms: { ...G, uBox: { value: cfg.box }, uBoxH: { value: cfg.h }, uDensity: { value: 1 }, uAtlas: { value: cfg.atlas === 'p' ? particleAtlas : leafAtlas }, uAtlasCells: { value: 4 } },
        vertexShader: AMB_VERT, fragmentShader: AMB_FRAG,
        defines: { TYPE: cfg.id, ADDITIVE: cfg.add ? 1 : 0 },
        transparent: true, depthWrite: false,
        blending: cfg.add ? THREE.AdditiveBlending : THREE.NormalBlending,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = 5;
      this.group.add(mesh);
      this.fields[name] = mesh;
    }
  }
}

// ------------------------------------------------------------------ spell FX
const FX_VERT = /* glsl */`
attribute vec3 iPos;
attribute vec4 iCol;
attribute vec3 iMisc; // size, atlas, rotation
varying vec2 vUv;
varying vec4 vCol;
varying float vAtlas;
void main(){
  vec4 mv = viewMatrix * vec4(iPos, 1.0);
  float c = cos(iMisc.z), s = sin(iMisc.z);
  vec2 q = vec2(c * position.x - s * position.y, s * position.x + c * position.y);
  mv.xy += q * iMisc.x;
  gl_Position = projectionMatrix * mv;
  vUv = position.xy + 0.5;
  vCol = iCol;
  vAtlas = iMisc.y;
}
`;
const FX_FRAG = /* glsl */`
uniform sampler2D uAtlas;
varying vec2 vUv;
varying vec4 vCol;
varying float vAtlas;
void main(){
  vec4 t = texture(uAtlas, vec2((vUv.x + vAtlas) * 0.25, vUv.y));
  float a = t.a * vCol.a;
  if (a < 0.005) discard;
#if ADDITIVE
  gl_FragColor = vec4(vCol.rgb * t.rgb * a, 1.0);
#else
  gl_FragColor = vec4(vCol.rgb * t.rgb, a);
#endif
}
`;

class FxLayer {
  constructor(atlas, additive, cap) {
    this.cap = cap;
    this.n = 0;
    this.p = new Float32Array(cap * 3);
    this.v = new Float32Array(cap * 3);
    this.c = new Float32Array(cap * 4); // rgb + base alpha
    this.m = new Float32Array(cap * 3); // size, atlas, rot
    this.life = new Float32Array(cap * 2); // age, max
    this.phys = new Float32Array(cap * 4); // drag, gravity, grow, spin
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 0], 3));
    geo.setIndex([0, 1, 2, 1, 3, 2]);
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aMisc = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iPos', this.aPos); geo.setAttribute('iCol', this.aCol); geo.setAttribute('iMisc', this.aMisc);
    geo.instanceCount = 0;
    this.geo = geo;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uAtlas: { value: atlas } }, vertexShader: FX_VERT, fragmentShader: FX_FRAG,
      defines: { ADDITIVE: additive ? 1 : 0 }, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 6;
  }
  emit(o) {
    if (this.n >= this.cap) return;
    const i = this.n++;
    this.p.set([o.x, o.y, o.z], i * 3);
    this.v.set([o.vx || 0, o.vy || 0, o.vz || 0], i * 3);
    this.c.set([o.r, o.g, o.b, o.a ?? 1], i * 4);
    this.m.set([o.size || 0.3, o.atlas || 0, o.rot || 0], i * 3);
    this.life.set([0, o.life || 1], i * 2);
    this.phys.set([o.drag || 0, o.gravity || 0, o.grow || 0, o.spin || 0], i * 4);
  }
  update(dt) {
    let w = 0;
    const P = this.p, Vv = this.v, C = this.c, Mm = this.m, L = this.life, Ph = this.phys;
    const ap = this.aPos.array, ac = this.aCol.array, am = this.aMisc.array;
    for (let i = 0; i < this.n; i++) {
      const age = L[i * 2] + dt, max = L[i * 2 + 1];
      if (age >= max) continue;
      const drag = Math.exp(-Ph[i * 4] * dt);
      const vx = Vv[i * 3] * drag, vy = Vv[i * 3 + 1] * drag - Ph[i * 4 + 1] * dt, vz = Vv[i * 3 + 2] * drag;
      const x = P[i * 3] + vx * dt, y = P[i * 3 + 1] + vy * dt, z = P[i * 3 + 2] + vz * dt;
      // compact
      P[w * 3] = x; P[w * 3 + 1] = y; P[w * 3 + 2] = z;
      Vv[w * 3] = vx; Vv[w * 3 + 1] = vy; Vv[w * 3 + 2] = vz;
      C[w * 4] = C[i * 4]; C[w * 4 + 1] = C[i * 4 + 1]; C[w * 4 + 2] = C[i * 4 + 2]; C[w * 4 + 3] = C[i * 4 + 3];
      const size = Mm[i * 3] + Ph[i * 4 + 2] * dt;
      Mm[w * 3] = size; Mm[w * 3 + 1] = Mm[i * 3 + 1]; Mm[w * 3 + 2] = Mm[i * 3 + 2] + Ph[i * 4 + 3] * dt;
      L[w * 2] = age; L[w * 2 + 1] = max;
      Ph[w * 4] = Ph[i * 4]; Ph[w * 4 + 1] = Ph[i * 4 + 1]; Ph[w * 4 + 2] = Ph[i * 4 + 2]; Ph[w * 4 + 3] = Ph[i * 4 + 3];
      const t = age / max;
      const fade = Math.min(1, t * 8) * (1 - t) * (1 - t) * 1.2;
      ap[w * 3] = x; ap[w * 3 + 1] = y; ap[w * 3 + 2] = z;
      ac[w * 4] = C[w * 4]; ac[w * 4 + 1] = C[w * 4 + 1]; ac[w * 4 + 2] = C[w * 4 + 2]; ac[w * 4 + 3] = C[w * 4 + 3] * fade;
      am[w * 3] = size; am[w * 3 + 1] = Mm[w * 3 + 1]; am[w * 3 + 2] = Mm[w * 3 + 2];
      w++;
    }
    this.n = w;
    this.geo.instanceCount = w;
    this.aPos.needsUpdate = true; this.aCol.needsUpdate = true; this.aMisc.needsUpdate = true;
  }
}

export class SpellFX {
  constructor(atlas) {
    this.add = new FxLayer(atlas, true, 6000);
    this.alpha = new FxLayer(atlas, false, 2500);
    this.group = new THREE.Group();
    this.group.add(this.alpha.mesh, this.add.mesh);
  }
  emit(o) { (o.additive === false ? this.alpha : this.add).emit(o); }
  burst(x, y, z, count, fn) { for (let i = 0; i < count; i++) this.emit(fn(i, x, y, z)); }
  update(dt) { this.add.update(dt); this.alpha.update(dt); }
}
