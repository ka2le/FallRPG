// Sky dome (gradient scattering model, sun, moon, stars, milky way, aurora,
// two cloud layers), time-of-day controller and image-based lighting capture.
import * as THREE from 'three';
import { G, GLSL_UNIFORMS, GLSL_COMMON } from './shaderLib.js';

const SKY_VERT = /* glsl */`
varying vec3 vDir;
void main(){
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}
`;

const SKY_FRAG = GLSL_UNIFORMS + GLSL_COMMON + /* glsl */`
varying vec3 vDir;
uniform float uWithSun;
uniform float uDetail;

vec3 moonDir(){ return normalize(vec3(-uSunDir.x, max(-uSunDir.y, 0.0) * 0.9 + 0.12, -uSunDir.z * 0.6 + 0.25)); }

float n2(vec2 p){ return texture(uNoiseTex, p).r; }

vec3 skyBase(vec3 d){
  float y = d.y;
  float h = max(y, 0.0);
  vec3 col = mix(uSkyHorizon, uSkyZenith, pow(h, 0.48));
  col = mix(col, uFogColor, exp(-h * 14.0) * 0.55);
  float mu = dot(d, uSunDir);
  float m = max(mu, 0.0);
  col += uSunGlow * (0.16 * pow(m, 3.0) + 0.5 * pow(m, 24.0) + 1.1 * pow(m, 300.0)) * (1.0 - 0.6 * uStorm);
  col = mix(col, uGroundColor, smoothstep(0.0, -0.15, y));
  return col;
}

void main(){
  vec3 d = normalize(vDir);
  vec3 col = skyBase(d);
  float mu = dot(d, uSunDir);

  // stars + milky way
  if (uNight > 0.01 && d.y > -0.05){
    vec3 sd = d * 260.0;
    vec3 cell = floor(sd);
    float h = fHash13(cell);
    vec3 f = fract(sd) - 0.5;
    float band = exp(-pow(dot(d, normalize(vec3(0.4, 0.3, 0.86))) * 3.2, 2.0));
    float thr = 0.992 - band * 0.012;
    if (h > thr){
      float tw = 0.6 + 0.4 * sin(uTime * (2.0 + h * 9.0) + h * 100.0);
      vec3 sc = mix(vec3(0.7, 0.8, 1.2), vec3(1.2, 0.9, 0.7), fHash13(cell + 7.0));
      col += sc * smoothstep(0.35, 0.0, length(f)) * tw * uNight * 2.2 * uDetail;
    }
    float mw = texture(uNoiseTex, d.xz * 1.3 + d.y * 0.3).r * texture(uNoiseTex, d.xz * 3.1).g;
    col += vec3(0.35, 0.25, 0.6) * band * mw * uNight * 0.35 * smoothstep(-0.05, 0.2, d.y);
    // moon
    vec3 md = moonDir();
    float mm = dot(d, md);
    vec2 mp = vec2(dot(d, normalize(cross(md, vec3(0.0, 1.0, 0.0)))), d.y - md.y);
    float crater = texture(uNoiseTex, mp * 8.0 + 0.5).b;
    float disk = smoothstep(0.99935, 0.99955, mm);
    col += vec3(1.0, 0.97, 1.08) * disk * (2.5 + crater * 1.5) * uNight;
    col += vec3(0.5, 0.55, 1.0) * pow(max(mm, 0.0), 180.0) * 0.6 * uNight;
    col += vec3(0.3, 0.3, 0.6) * pow(max(mm, 0.0), 12.0) * 0.12 * uNight;
  }

  // aurora (fey curtains) — brightest toward the winter lands
  if (uAurora > 0.01 && d.y > 0.0){
    vec3 acc = vec3(0.0);
    float dith = fHash12(gl_FragCoord.xy);
    for (int i = 0; i < 20; i++){
      float fi = (float(i) + dith) / 20.0;
      float hgt = 0.3 + fi * 0.55;
      vec2 p = d.xz / (d.y + 0.06) * hgt;
      float n = texture(uNoiseTex, p * 0.12 + vec2(uTime * 0.002, 0.0)).r;
      float n2 = texture(uNoiseTex, p * 0.5 + vec2(0.0, uTime * 0.004)).g;
      float x = p.y * 0.4 + (n - 0.5) * 1.8 + sin(p.x * 0.6 + uTime * 0.02) * 0.25;
      float ribbon = exp(-x * x * 10.0) * (0.6 + 0.4 * n2);
      vec3 ac = mix(vec3(0.15, 1.0, 0.55), vec3(0.55, 0.25, 1.0), fi);
      acc += ac * ribbon * (1.0 - fi) * (1.0 - fi);
    }
    float dirW = 0.4 + 0.6 * smoothstep(-0.3, 0.8, dot(normalize(d.xz + 1e-4), normalize(vec2(-1.0, 1.0))));
    col += acc * 0.03 * uAurora * dirW * smoothstep(0.0, 0.25, d.y);
  }

  // sun disk
  if (uWithSun > 0.5){
    float sd = smoothstep(0.99962, 0.99978, mu);
    col += uSunColor * sd * 18.0 * (1.0 - uStorm * 0.9);
  }

  // clouds (two layers)
  if (d.y > 0.0){
    float t = 1.0 / (d.y + 0.035);
    vec2 p = d.xz * t * 1800.0 + cameraPosition.xz;
    float dens = feyCloudDensity(p);
    float dens2 = feyCloudDensity(p + uLightDir.xz * 110.0);
    float lit = 1.0 - dens2 * 0.65;
    vec3 amb = mix(uSkyZenith, uSkyHorizon, 0.5) * 0.9 + vec3(0.02, 0.02, 0.05);
    vec3 sunLit = uSunColor * 0.35 * max(uLightDir.y + 0.2, 0.0);
    vec3 cc = amb + sunLit * lit;
    float silver = pow(max(mu, 0.0), 6.0) * (1.0 - dens) * 2.0;
    cc += uSunGlow * silver;
    cc = mix(cc, vec3(0.5, 0.52, 0.6) * (0.3 + 0.7 * (1.0 - uNight)), uStorm * 0.7);
    float a = dens * smoothstep(0.0, 0.15, d.y);
    // fey tint on cloud undersides
    cc *= mix(vec3(1.0), vec3(1.05, 0.92, 1.12), 0.5);
    col = mix(col, cc, a * 0.92);
    // high cirrus
    vec2 pc = d.xz * t * 0.00004 * 1800.0 + uCloudOffset * 2.0;
    float ci = smoothstep(0.55, 0.9, texture(uNoiseTex, pc * vec2(1.0, 3.0)).g) * smoothstep(0.0, 0.3, d.y);
    col += (uSunGlow * 0.4 + amb * 0.6) * ci * 0.35 * (1.0 - uStorm);
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

function makeSkyMaterial(withSun, detail) {
  return new THREE.ShaderMaterial({
    uniforms: { ...G, uWithSun: { value: withSun ? 1 : 0 }, uDetail: { value: detail } },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: true,
  });
}

// time-of-day palette keyed by sun elevation (linear HDR colors)
const hex = (h, s = 1) => new THREE.Color().setHex(h).multiplyScalar(s);
const KEYS = [
  { e: -0.35, zen: hex(0x05061c, 0.6), hor: hex(0x1a1640, 0.7), glow: hex(0x000000), fog: hex(0x14163a, 0.55), fogSun: hex(0x201a48, 0.6), light: hex(0x7a90ff, 0.32), ground: hex(0x05050c) },
  { e: -0.1, zen: hex(0x10124a, 0.8), hor: hex(0x5a3a78, 0.9), glow: hex(0xa04030, 0.6), fog: hex(0x302a58, 0.7), fogSun: hex(0x804040, 0.9), light: hex(0x7a90ff, 0.12), ground: hex(0x0a0810) },
  { e: 0.0, zen: hex(0x283070, 1.0), hor: hex(0xf09068, 1.2), glow: hex(0xff6a30, 1.6), fog: hex(0x9a8088, 0.8), fogSun: hex(0xff7040, 1.6), light: hex(0xff6a30, 1.2), ground: hex(0x201418) },
  { e: 0.08, zen: hex(0x3a5ab0, 1.1), hor: hex(0xffbc9c, 1.5), glow: hex(0xff9050, 1.6), fog: hex(0xc8b0a4, 1.0), fogSun: hex(0xffa060, 1.8), light: hex(0xffa060, 3.0), ground: hex(0x302420) },
  { e: 0.25, zen: hex(0x3f78e0, 1.2), hor: hex(0xf2d6cc, 1.6), glow: hex(0xffc890, 0.85), fog: hex(0xd6ccd8, 1.15), fogSun: hex(0xffd0a0, 1.5), light: hex(0xffe0b8, 4.2), ground: hex(0x3a3440) },
  { e: 0.65, zen: hex(0x2f6ef0, 1.25), hor: hex(0xc8d6f0, 1.7), glow: hex(0xfff0d8, 0.5), fog: hex(0xc6d0e6, 1.2), fogSun: hex(0xfff0dc, 1.4), light: hex(0xfff4ea, 5.0), ground: hex(0x404050) },
];
function samplePalette(e, out) {
  let a = KEYS[0], b = KEYS[KEYS.length - 1];
  if (e <= KEYS[0].e) { a = b = KEYS[0]; }
  else if (e >= KEYS[KEYS.length - 1].e) { a = b = KEYS[KEYS.length - 1]; }
  else for (let i = 0; i < KEYS.length - 1; i++) if (e >= KEYS[i].e && e <= KEYS[i + 1].e) { a = KEYS[i]; b = KEYS[i + 1]; break; }
  const t = a === b ? 0 : (e - a.e) / (b.e - a.e);
  for (const k of ['zen', 'hor', 'glow', 'fog', 'fogSun', 'light', 'ground']) out[k].copy(a[k]).lerp(b[k], t);
  return out;
}

export class Sky {
  constructor(renderer, scene) {
    this.renderer = renderer;
    this.scene = scene;
    this.timeOfDay = 15.2; // hours
    this.dayLength = 24 * 60; // seconds per full day
    this.timeScale = 1;
    const geo = new THREE.SphereGeometry(5000, 48, 24);
    this.dome = new THREE.Mesh(geo, makeSkyMaterial(true, 1));
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -10;
    scene.add(this.dome);

    this.envScene = new THREE.Scene();
    this.envDome = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), makeSkyMaterial(false, 0));
    this.envScene.add(this.envDome);
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envRT = null;
    this.envTimer = 999;
    this.lastEnvSun = new THREE.Vector3(9, 9, 9);
    this.lastEnvStorm = -1;

    this.sun = new THREE.DirectionalLight(0xffffff, 1);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    scene.add(this.sun);
    scene.add(this.sun.target);
    this.pal = { zen: new THREE.Color(), hor: new THREE.Color(), glow: new THREE.Color(), fog: new THREE.Color(), fogSun: new THREE.Color(), light: new THREE.Color(), ground: new THREE.Color() };
    this.shadowRange = 110;
    this.lightDir = new THREE.Vector3();
  }

  setShadowQuality(size, range) {
    this.shadowRange = range;
    const s = this.sun.shadow;
    s.mapSize.set(size, size);
    s.camera.left = -range; s.camera.right = range; s.camera.top = range; s.camera.bottom = -range;
    s.camera.near = 1; s.camera.far = 900;
    s.camera.updateProjectionMatrix();
    if (s.map) { s.map.dispose(); s.map = null; }
  }

  update(dt, camera, regionTint, storm) {
    this.timeOfDay = (this.timeOfDay + dt * this.timeScale * 24 / this.dayLength) % 24;
    const th = (this.timeOfDay - 6) / 12 * Math.PI;
    const sunDir = G.uSunDir.value.set(Math.cos(th), Math.sin(th) * 0.82, 0.42).normalize();
    const e = sunDir.y;
    const p = samplePalette(e, this.pal);
    const night = THREE.MathUtils.smoothstep(-e, 0.02, 0.25);
    G.uNight.value = night;
    // light: sun by day, moon by night
    let lightCol = p.light.clone();
    let L;
    if (e > -0.03) {
      L = sunDir.clone();
      if (L.y < 0.03) L.y = 0.03;
      L.normalize();
      lightCol.multiplyScalar(THREE.MathUtils.smoothstep(e, -0.03, 0.04));
    } else {
      L = new THREE.Vector3(-sunDir.x, Math.max(-sunDir.y, 0.0) * 0.9 + 0.12, -sunDir.z * 0.6 + 0.25).normalize();
      lightCol.multiplyScalar(THREE.MathUtils.smoothstep(-e, 0.03, 0.12));
    }
    // storms dim direct light
    lightCol.multiplyScalar(1 - 0.75 * storm);
    this.lightDir.copy(L);
    G.uLightDir.value.copy(L);
    G.uSunColor.value.copy(lightCol);
    G.uSkyZenith.value.copy(p.zen);
    G.uSkyHorizon.value.copy(p.hor);
    G.uSunGlow.value.copy(p.glow);
    G.uGroundColor.value.copy(p.ground);
    G.uFogColor.value.copy(p.fog).multiply(regionTint);
    G.uFogSunColor.value.copy(p.fogSun);
    G.uAurora.value = night;

    this.sun.color.copy(lightCol);
    this.sun.intensity = 1.0;
    // shadow camera follows the player, texel-snapped to avoid shimmering
    const target = camera.position;
    const texel = (this.shadowRange * 2) / this.sun.shadow.mapSize.x;
    const lx = new THREE.Vector3().crossVectors(L, new THREE.Vector3(0, 1, 0)).normalize();
    const ly = new THREE.Vector3().crossVectors(lx, L).normalize();
    const px = Math.round(target.dot(lx) / texel) * texel, py = Math.round(target.dot(ly) / texel) * texel, pz = target.dot(L);
    const c = new THREE.Vector3().addScaledVector(lx, px).addScaledVector(ly, py).addScaledVector(L, pz);
    this.sun.target.position.copy(c);
    this.sun.position.copy(c).addScaledVector(L, 450);
    this.sun.target.updateMatrixWorld();

    this.dome.position.copy(camera.position);

    // refresh the environment map
    this.envTimer += dt;
    const stormChanged = Math.abs(storm - this.lastEnvStorm) > 0.08;
    if ((this.envTimer > 2.5 && (this.lastEnvSun.distanceTo(sunDir) > 0.01 || stormChanged)) || !this.envRT) {
      this.envTimer = 0;
      this.lastEnvSun.copy(sunDir);
      this.lastEnvStorm = storm;
      const rt = this.pmrem.fromScene(this.envScene, 0, 0.1, 1000);
      if (this.envRT) this.envRT.dispose();
      this.envRT = rt;
      this.scene.environment = rt.texture;
    }
  }
}
