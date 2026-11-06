// Rocks, boulders, crystal clusters, glowing toadstools, ice fangs, the hub's
// standing stones & pylons, and floating islands.
import * as THREE from 'three';
import { Noise } from '../core/noise.js';
import { RNG } from '../core/rng.js';
import { feyPatch, G, GLSL_UNIFORMS, GLSL_COMMON } from './shaderLib.js';
import { GeoBuilder, randUnit, perp, shard } from './treeGen.js';
import { makeRockTexture } from './textures.js';

function rockGeometry(seed, detail = 2, flatten = 0.7) {
  const n = new Noise(seed);
  const g = new THREE.IcosahedronGeometry(1, detail);
  const merged = mergeVerts(g);
  const p = merged.attributes.position;
  const rng = new RNG(seed);
  const sx = rng.range(0.8, 1.3), sz = rng.range(0.8, 1.3);
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
    const d = 1 + 0.28 * n.fbm3(v.x * 1.3, v.y * 1.3, v.z * 1.3, 4) + 0.12 * Math.abs(n.noise3(v.x * 4, v.y * 4, v.z * 4));
    // planar cuts for a chipped look
    v.multiplyScalar(d);
    v.y = v.y > 0 ? v.y * flatten : v.y * 0.5;
    if (v.y > 0.45) v.y = 0.45 + (v.y - 0.45) * 0.3;
    p.setXYZ(i, v.x * sx, v.y, v.z * sz);
  }
  merged.computeVertexNormals();
  merged.computeBoundingSphere();
  return merged;
}

function mergeVerts(g) {
  const p = g.attributes.position;
  const map = new Map(), pos = [], idx = [];
  for (let i = 0; i < p.count; i++) {
    const k = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
    let v = map.get(k);
    if (v === undefined) { v = pos.length / 3; pos.push(p.getX(i), p.getY(i), p.getZ(i)); map.set(k, v); }
    idx.push(v);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setIndex(idx);
  return out;
}

function crystalClusterGeometry(seed) {
  const rng = new RNG(seed);
  const b = new GeoBuilder(1);
  const n = 4 + Math.floor(rng.next() * 5);
  for (let k = 0; k < n; k++) {
    const d = k === 0 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 1, 0).addScaledVector(randUnit(rng), 0.75).normalize();
    if (d.y < 0.2) d.y = 0.2;
    d.normalize();
    const len = k === 0 ? rng.range(1.6, 2.4) : rng.range(0.6, 1.6);
    shard(b, 0, new THREE.Vector3(rng.range(-0.25, 0.25), -0.3, rng.range(-0.25, 0.25)), d, len, len * rng.range(0.12, 0.2), rng);
  }
  return b.build();
}

function toadstoolGeometry(seed) {
  const rng = new RNG(seed);
  const b = new GeoBuilder(2);
  const h = rng.range(0.25, 0.5), r = rng.range(0.14, 0.3);
  b.lathe(0, [[0.05, -0.05], [0.045, h * 0.5], [0.04, h]], 6);
  b.lathe(1, [[r, h - 0.02], [r * 0.75, h + r * 0.45], [0.01, h + r * 0.6]], 10);
  // a few neighbours
  for (let k = 0; k < 2; k++) {
    const o = new THREE.Vector3(rng.range(-0.35, 0.35), 0, rng.range(-0.35, 0.35));
    const hh = h * rng.range(0.4, 0.8), rr = r * rng.range(0.5, 0.8);
    b.lathe(0, [[0.035, -0.05], [0.03, hh]], 5, o);
    b.lathe(1, [[rr, hh - 0.02], [rr * 0.7, hh + rr * 0.45], [0.01, hh + rr * 0.6]], 8, o);
  }
  return b.build();
}

function iceFangGeometry(seed) {
  const rng = new RNG(seed);
  const b = new GeoBuilder(1);
  shard(b, 0, new THREE.Vector3(0, -1, 0), new THREE.Vector3(rng.range(-0.2, 0.2), 1, rng.range(-0.2, 0.2)).normalize(), rng.range(5, 7), 0.9, rng);
  for (let k = 0; k < 3; k++) shard(b, 0, new THREE.Vector3(rng.range(-0.8, 0.8), -0.5, rng.range(-0.8, 0.8)), new THREE.Vector3(0, 1, 0).addScaledVector(randUnit(rng), 0.5).normalize(), rng.range(1.5, 3.5), 0.35, rng);
  return b.build();
}

function standingStoneGeometry(seed) {
  const n = new Noise(seed);
  const g = new THREE.BoxGeometry(1.6, 5.5, 0.9, 4, 10, 3);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = (y + 2.75) / 5.5;
    const k = 1 - 0.25 * t;
    const d = 0.12 * n.fbm3(x * 1.5, y * 0.8, z * 1.5, 3);
    p.setXYZ(i, x * k + d, y + 2.75 + (t > 0.95 ? n.noise3(x * 3, 0, z * 3) * 0.3 : 0), z * k + d);
  }
  g.computeVertexNormals();
  return g;
}

function islandGeometry(isl) {
  const n = new Noise(isl.seed);
  const R = isl.r;
  const depth = R * 1.6;
  const prof = [];
  // from bottom tip up to rim, then top dome
  for (let i = 0; i <= 12; i++) { const t = i / 12; prof.push([R * Math.pow(t, 0.7) * (1 + 0.05 * Math.sin(t * 13)), -depth * (1 - t)]); }
  const segs = 40;
  const pos = [], col = [], idx = [];
  const rows = prof.length + 6;
  const rock = new THREE.Color(0x5e5a5c), rock2 = new THREE.Color(0x7a7068), grass = new THREE.Color(0x5f7a38), dirt = new THREE.Color(0x4e3c2c);
  const topProf = [];
  for (let i = 1; i <= 6; i++) { const t = 1 - i / 6; topProf.push([R * t, 0.6 * (1 - t * t)]); }
  const all = prof.concat(topProf);
  for (let i = 0; i < all.length; i++) {
    for (let j = 0; j <= segs; j++) {
      const a = j / segs * Math.PI * 2;
      let [r, y] = all[i];
      const isTop = i >= prof.length;
      const nn = n.fbm(Math.cos(a) * 2 + i * 0.3, Math.sin(a) * 2 + y * 0.1, 3);
      if (!isTop) r *= 1 + 0.35 * nn * (1 - i / prof.length * 0.5);
      if (!isTop) y += nn * R * 0.12 * (1 - i / prof.length);
      if (j === segs) { pos.push(pos[(i * (segs + 1)) * 3], pos[(i * (segs + 1)) * 3 + 1], pos[(i * (segs + 1)) * 3 + 2]); }
      else pos.push(Math.cos(a) * r, y, Math.sin(a) * r);
      let c;
      if (isTop) c = grass.clone().multiplyScalar(0.85 + 0.3 * nn);
      else if (i >= prof.length - 2) c = dirt.clone().lerp(grass, i === prof.length - 1 ? 0.7 : 0.1);
      else c = rock.clone().lerp(rock2, 0.5 + nn);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < all.length - 1; i++) for (let j = 0; j < segs; j++) {
    const a = i * (segs + 1) + j, b = a + 1, c = a + segs + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

class ScatterSet {
  constructor(geo, mat, items, maxDist, shadowDist) {
    this.items = items;
    this.maxDist = maxDist; this.shadowDist = shadowDist;
    this.mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length));
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, items.length) * 3), 3);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = shadowDist > 0;
    this.mesh.receiveShadow = true;
    this.mesh.count = 0;
    this.mats = new Float32Array(items.length * 16);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
    items.forEach((it, i) => {
      e.set(it.tilt[0], it.rot, it.tilt[1]); q.setFromEuler(e);
      s.set(it.scale * (it.sx || 1), it.scale * (it.sy || 1), it.scale * (it.sz || 1));
      p.set(it.x, it.y, it.z);
      m.compose(p, q, s);
      this.mats.set(m.elements, i * 16);
    });
  }
  update(camera, frustum) {
    const cx = camera.position.x, cz = camera.position.z;
    const md2 = this.maxDist * this.maxDist;
    const A = this.mesh.instanceMatrix.array, C = this.mesh.instanceColor.array;
    const sph = new THREE.Sphere();
    let n = 0;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      const dx = it.x - cx, dz = it.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 > md2 * (0.4 + it.scale * 0.25)) continue;
      if (d2 > 3600) { sph.center.set(it.x, it.y, it.z); sph.radius = it.scale * 6 + 2; if (!frustum.intersectsSphere(sph)) continue; }
      A.set(this.mats.subarray(i * 16, i * 16 + 16), n * 16);
      const c = it.color || [1, 1, 1];
      C[n * 3] = c[0]; C[n * 3 + 1] = c[1]; C[n * 3 + 2] = c[2];
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
  }
}

export class Props {
  constructor(W, query, ground) {
    this.group = new THREE.Group();
    this.sets = [];
    const rockTex = makeRockTexture(17);
    const TRI = /* glsl */`
      {
        vec3 wn = normalize(vFeyN);
        vec3 bw = pow(abs(wn), vec3(4.0)); bw /= bw.x + bw.y + bw.z;
        vec3 tp = vFeyWorld * 0.35;
        vec3 c = texture(uGAlb, vec3(tp.zy, 3.0)).rgb * bw.x + texture(uGAlb, vec3(tp.xz, 3.0)).rgb * bw.y + texture(uGAlb, vec3(tp.xy, 3.0)).rgb * bw.z;
        diffuseColor.rgb *= c * 2.1;
        vec4 S = feySeason(vFeyWorld.xz);
        float moss = smoothstep(0.45, 0.85, wn.y + texture(uNoiseTex, vFeyWorld.xz * 0.2).g * 0.4 - 0.2) * (S.x * 0.9 + S.y * 0.8 + S.z * 0.4);
        vec3 mossC = mix(vec3(0.1, 0.16, 0.05), vec3(0.3, 0.18, 0.06), S.z);
        diffuseColor.rgb = mix(diffuseColor.rgb, mossC, moss * 0.8);
      }`;
    const rockMat = new THREE.MeshStandardMaterial({ color: 0xc8c2bc, roughness: 0.88, metalness: 0, normalMap: rockTex.normal, envMapIntensity: 0.6 });
    feyPatch(rockMat, {
      key: 'rock', snow: 1.0, uniforms: { uRockMap: { value: rockTex.map }, uGAlb: { value: ground.albedo } },
      vertexHead: 'varying vec3 vFeyN;\n', vertexEnd: '#ifdef USE_INSTANCING\n vFeyN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);\n#else\n vFeyN = normalize(mat3(modelMatrix) * objectNormal);\n#endif\n',
      fragHead: 'varying vec3 vFeyN;\nuniform sampler2D uRockMap;\nuniform highp sampler2DArray uGAlb;\n', fragColor: TRI,
    });
    const basaltMat = new THREE.MeshStandardMaterial({ color: 0x2a2426, roughness: 0.8, metalness: 0, envMapIntensity: 0.5 });
    feyPatch(basaltMat, {
      key: 'basalt', snow: 0.0,
      fragEmissive: `{ float c = texture(uNoiseTex, vFeyWorld.xz * 0.25 + vFeyWorld.y * 0.3).b; totalEmissiveRadiance += vec3(2.4, 0.55, 0.06) * smoothstep(0.64, 0.75, c) * (0.7 + 0.3 * sin(uTime * 2.0 + vFeyWorld.x)); }`,
    });
    const crystalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.12, metalness: 0.1, envMapIntensity: 1.6, transparent: false });
    feyPatch(crystalMat, {
      key: 'crystal', snow: 0.0,
      fragEmissive: /* glsl */`{
        vec3 Vd = normalize(cameraPosition - vFeyWorld);
        float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.0);
        float pulse = 0.75 + 0.25 * sin(uTime * 1.5 + vFeyWorld.x * 0.3 + vFeyWorld.z * 0.2);
        totalEmissiveRadiance += diffuseColor.rgb * (0.18 + rim * 1.0) * pulse * (0.5 + 1.3 * uNight);
      }`,
    });
    const toadMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0 });
    feyPatch(toadMat, { key: 'toad', snow: 0.4, fragEmissive: 'totalEmissiveRadiance += diffuseColor.rgb * smoothstep(0.1, 0.3, vFeyWorld.y - feyHeight(vFeyWorld.xz)) * (0.25 + 2.8 * uNight);' });
    const iceMat = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, roughness: 0.08, metalness: 0.05, envMapIntensity: 2.0 });
    feyPatch(iceMat, { key: 'ice', snow: 0.3, fragEmissive: `{ float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 3.0); totalEmissiveRadiance += vec3(0.2, 0.55, 1.0) * (0.12 + rim * 0.9) * (0.6 + uNight); }` });

    const byKind = {};
    for (const p of W.props) { (byKind[p.kind] ||= []).push(p); }
    const addVariants = (kind, geos, mat, maxDist, shadowDist) => {
      const items = byKind[kind] || [];
      if (!items.length) return;
      const per = geos.map(() => []);
      items.forEach((it, i) => per[i % geos.length].push(it));
      geos.forEach((g, k) => {
        if (!per[k].length) return;
        const set = new ScatterSet(g, mat, per[k], maxDist, shadowDist);
        this.sets.push(set); this.group.add(set.mesh);
      });
    };
    addVariants('rock', [rockGeometry(1), rockGeometry(2, 2, 0.9), rockGeometry(3, 2, 0.55), rockGeometry(4, 3, 0.75)], rockMat, 420, 1);
    addVariants('basalt', [rockGeometry(5, 2, 1.2), rockGeometry(6, 2, 0.8)], basaltMat, 500, 1);
    addVariants('crystal', [crystalClusterGeometry(7), crystalClusterGeometry(8), crystalClusterGeometry(9)], crystalMat, 500, 1);
    addVariants('toadstool', [toadstoolGeometry(10), toadstoolGeometry(11)], toadMat, 140, 0);
    addVariants('icefang', [iceFangGeometry(12), iceFangGeometry(13)], iceMat, 900, 1);

    for (const it of W.props) {
      if (it.kind === 'rock' || it.kind === 'basalt') {
        it.y -= it.scale * 0.25;
        if (it.scale > 1.2) query.addCollider({ x: it.x, z: it.z, r: it.scale * 0.9, y0: it.y - 1, y1: it.y + it.scale * 0.5, kind: 'rock' });
      }
      if (it.kind === 'crystal' && it.scale > 1.5) query.addCollider({ x: it.x, z: it.z, r: it.scale * 0.35, y0: it.y - 1, y1: it.y + it.scale * 2, kind: 'rock' });
      if (it.kind === 'icefang') query.addCollider({ x: it.x, z: it.z, r: it.scale * 0.35, y0: it.y - 1, y1: it.y + it.scale * 6, kind: 'rock' });
    }
    // rebuild matrices after y adjustments
    for (const s of this.sets) {
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
      s.items.forEach((it, i) => { e.set(it.tilt[0], it.rot, it.tilt[1]); q.setFromEuler(e); sc.setScalar(it.scale); p.set(it.x, it.y, it.z); m.compose(p, q, sc); s.mats.set(m.elements, i * 16); });
    }

    // --- hub: standing stones with glowing runes
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd8d0c8, roughness: 0.9, normalMap: rockTex.normal });
    feyPatch(stoneMat, {
      key: 'stone', snow: 0.5, uniforms: { uRockMap: { value: rockTex.map }, uGAlb: { value: ground.albedo } },
      vertexHead: 'varying vec3 vFeyN;\nvarying vec3 vLocal;\n', vertexEnd: 'vFeyN = normalize(mat3(modelMatrix) * objectNormal); vLocal = position;\n',
      fragHead: 'varying vec3 vFeyN;\nvarying vec3 vLocal;\nuniform sampler2D uRockMap;\nuniform highp sampler2DArray uGAlb;\n', fragColor: TRI,
      fragEmissive: /* glsl */`{
        vec2 rc = floor(vec2(vLocal.x * 5.0, vLocal.y * 3.0));
        float rune = step(0.55, fHash12(rc)) * step(abs(vLocal.z), 0.5) * step(abs(vLocal.x), 0.55) * step(0.8, vLocal.y) * step(vLocal.y, 4.6);
        vec2 f = fract(vec2(vLocal.x * 5.0, vLocal.y * 3.0));
        float strokes = max(step(abs(f.x - 0.5), 0.08) , step(abs(f.y - fHash12(rc + 1.0)), 0.07) * step(0.2, f.x) * step(f.x, 0.8));
        float pulse = 0.6 + 0.4 * sin(uTime * 1.3 + vLocal.y * 2.0 + vFeyWorld.x);
        totalEmissiveRadiance += vec3(0.5, 1.4, 2.2) * rune * strokes * pulse * 1.5;
      }`,
    });
    const stoneGeo = standingStoneGeometry(33);
    for (const it of W.props.filter((p) => p.kind === 'stone')) {
      const m = new THREE.Mesh(stoneGeo, stoneMat);
      m.position.set(it.x, it.y, it.z); m.rotation.set(0, it.rot + Math.PI / 2, (Math.random() - 0.5) * 0.06); m.scale.setScalar(it.scale);
      m.castShadow = true; m.receiveShadow = true;
      this.group.add(m);
      query.addCollider({ x: it.x, z: it.z, r: 1.0 * it.scale, y0: it.y - 1, y1: it.y + 6, kind: 'stone' });
    }
    // season pylons
    const pylGeo = crystalClusterGeometry(44);
    for (const it of W.props.filter((p) => p.kind === 'pylon')) {
      const mat = crystalMat.clone();
      mat.color.setRGB(it.color[0], it.color[1], it.color[2]);
      mat.onBeforeCompile = crystalMat.onBeforeCompile; mat.customProgramCacheKey = crystalMat.customProgramCacheKey;
      const m = new THREE.Mesh(pylGeo, mat);
      m.position.set(it.x, it.y, it.z); m.scale.setScalar(1.6);
      m.castShadow = true;
      this.group.add(m);
      const base = new THREE.Mesh(rockGeometry(50, 2, 0.4), rockMat);
      base.position.set(it.x, it.y - 0.3, it.z); base.scale.set(1.8, 1.2, 1.8);
      this.group.add(base);
      query.addCollider({ x: it.x, z: it.z, r: 1.6, y0: it.y - 1, y1: it.y + 4, kind: 'stone' });
    }
    // heart stone: floating crystal at the centre
    const heartMat = crystalMat.clone();
    heartMat.color.set(0xf0d0ff);
    heartMat.onBeforeCompile = crystalMat.onBeforeCompile; heartMat.customProgramCacheKey = crystalMat.customProgramCacheKey;
    const hb = new GeoBuilder(1);
    shard(hb, 0, new THREE.Vector3(0, -1.6, 0), new THREE.Vector3(0, 1, 0), 3.2, 0.8, new RNG(1));
    shard(hb, 0, new THREE.Vector3(0, 0.0, 0), new THREE.Vector3(0, -1, 0), 1.8, 0.8, new RNG(2));
    this.heart = new THREE.Mesh(hb.build(), heartMat);
    this.heart.position.set(0, W.hubHeight + 4.5, 0);
    this.group.add(this.heart);
    this.hubY = W.hubHeight;

    // --- floating islands
    const islMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, normalMap: rockTex.normal });
    feyPatch(islMat, {
      key: 'island', snow: 1.0,
      fragColor: `diffuseColor.rgb *= 0.8 + 0.4 * texture(uNoiseTex, vFeyWorld.xz * 0.15 + vFeyWorld.y * 0.1).a;`,
    });
    this.islands = [];
    this.fallMat = new THREE.ShaderMaterial({
      uniforms: { ...G },
      vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: GLSL_UNIFORMS + GLSL_COMMON + `varying vec2 vUv; varying vec3 vW;
        void main(){
          float x = vUv.x, y = 1.0 - vUv.y;
          float edge = smoothstep(0.0, 0.25, x) * smoothstep(1.0, 0.75, x);
          float s1 = texture(uNoiseTex, vec2(x * 1.7, y * 0.9 - uTime * 0.55)).g;
          float s2 = texture(uNoiseTex, vec2(x * 3.1 + 0.3, y * 1.6 - uTime * 0.9)).a;
          float streak = smoothstep(0.35, 0.8, s1 * 0.6 + s2 * 0.6);
          float a = edge * (0.25 + 0.75 * streak) * smoothstep(1.0, 0.55, y) * smoothstep(0.0, 0.03, y);
          a *= 1.0 - smoothstep(0.5, 1.0, y) * 0.6;
          vec3 amb = mix(uSkyZenith, uSkyHorizon, 0.5);
          vec3 col = vec3(0.8, 0.95, 1.05) * (amb * 1.2 + uSunColor * 0.25) + vec3(0.2, 0.5, 0.8) * uNight * 0.3;
          col = feyApplyFog(col, vW);
          gl_FragColor = vec4(col, a * 0.85);
        }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    for (const isl of W.islands) {
      const m = new THREE.Mesh(islandGeometry(isl), islMat);
      m.position.set(isl.x, isl.y, isl.z);
      m.castShadow = true; m.receiveShadow = true;
      this.group.add(m);
      this.islands.push(m);
      const R = isl.r;
      query.platforms.push({ x: isl.x, z: isl.z, r: R * 0.98, getTop: (x, z) => { const d = Math.hypot(x - isl.x, z - isl.z) / R; return d < 1 ? isl.y + 0.6 * (1 - d * d) : null; } });
      // a ribbon waterfall spilling off the rim
      const a = (isl.seed % 628) / 100;
      const fall = Math.max(10, Math.min(95, isl.y - Math.max(0, query.height(isl.x, isl.z)) - 2));
      const wf = new THREE.Mesh(new THREE.PlaneGeometry(3.2, fall, 1, 8), this.fallMat);
      wf.position.set(isl.x + Math.cos(a) * (R * 0.98), isl.y - fall / 2 + 0.3, isl.z + Math.sin(a) * (R * 0.98));
      wf.rotation.y = -a + Math.PI / 2;
      wf.renderOrder = 4;
      this.group.add(wf);
    }
    // rune circle at the crossing
    const runeMat = new THREE.ShaderMaterial({
      uniforms: { uTime: G.uTime, uNight: G.uNight },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float uTime; uniform float uNight; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){
          vec2 p = vUv * 2.0 - 1.0; float r = length(p); float a = atan(p.y, p.x);
          float rings = smoothstep(0.012, 0.0, abs(r - 0.95)) + smoothstep(0.008, 0.0, abs(r - 0.82)) + smoothstep(0.01, 0.0, abs(r - 0.4));
          float ra = a - uTime * 0.05;
          float seg = floor((ra / 6.2831 + 0.5) * 48.0);
          float fa = fract((ra / 6.2831 + 0.5) * 48.0);
          float glyph = step(0.84, r) * step(r, 0.93) * step(0.25, fa) * step(fa, 0.75) * step(0.35, h(vec2(seg, floor(r * 40.0))));
          float spokes = smoothstep(0.01, 0.0, abs(sin(a * 2.0 + uTime * 0.02)) * r) * step(0.4, r) * step(r, 0.82) * 0.5;
          float v = rings + glyph + spokes;
          float pulse = 0.6 + 0.4 * sin(uTime * 0.8 - r * 6.0);
          vec3 col = mix(vec3(0.6, 0.9, 1.6), vec3(1.4, 0.8, 1.8), 0.5 + 0.5 * sin(a + uTime * 0.2));
          gl_FragColor = vec4(col * v * pulse * (0.35 + 1.2 * uNight), v * step(r, 1.0));
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      polygonOffset: true, polygonOffsetFactor: -4,
    });
    const rune = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), runeMat);
    rune.rotation.x = -Math.PI / 2;
    rune.position.set(0, W.hubHeight + 0.35, 0);
    rune.renderOrder = 3;
    this.group.add(rune);

    this.cullCam = new THREE.PerspectiveCamera();
    this.frustum = new THREE.Frustum();
    this.lastPos = new THREE.Vector3(1e9, 0, 0); this.lastDir = new THREE.Vector3();
  }

  update(camera, time, force = false) {
    this.heart.rotation.y = time * 0.4;
    this.heart.position.y = this.hubY + 4.5 + Math.sin(time * 0.8) * 0.35;
    const dir = camera.getWorldDirection(new THREE.Vector3());
    if (!force && camera.position.distanceTo(this.lastPos) < 3 && dir.dot(this.lastDir) > 0.995) return;
    this.lastPos.copy(camera.position); this.lastDir.copy(dir);
    const cc = this.cullCam; cc.copy(camera); cc.fov = Math.min(170, camera.fov * 1.45); cc.far = 1000;
    cc.updateProjectionMatrix(); cc.updateMatrixWorld();
    this.frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cc.projectionMatrix, cc.matrixWorldInverse));
    for (const s of this.sets) s.update(camera, this.frustum);
  }
}
