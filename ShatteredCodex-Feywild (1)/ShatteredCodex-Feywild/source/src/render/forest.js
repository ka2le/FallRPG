// Instanced forest.
//  near  : full-detail trees (bark tubes + alpha-to-coverage leaf cards), frustum
//          culled per tree through a spatial grid, dither-faded out at hiDist
//  far   : hemi-octahedral impostors (see impostors.js) — one GPU-driven draw for
//          every tree in the world, dither-faded in exactly where the near trees fade out
//  shadow: full-detail casters for near trees outside the view (their shadows still
//          fall into view) and cheap blob casters out to the edge of the sun's
//          shadow map — neither is ever drawn in the main pass.
import * as THREE from 'three';
import { generateTreeKind } from './treeGen.js';
import { feyPatch, WIND_VERT, G } from './shaderLib.js';
import { bakeImpostors, ImpostorField } from './impostors.js';
import { makeBarkTextures, makeLeafCardTexture, makePetalTexture, makeCapTexture } from './textures.js';

const LEAF_VERT_HEAD = 'attribute float aLeaf;\n#define FEY_LEAF\n';
const BARK_VERT_HEAD = 'attribute float aLeaf;\n';

function leafMaterial(map, key, opts = {}) {
  const m = new THREE.MeshStandardMaterial({
    map, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.8, metalness: 0,
    envMapIntensity: 0.35, alphaToCoverage: true,
  });
  m.userData.bake = { tint: true, glow: opts.glow || 0, leafy: true };
  feyPatch(m, {
    key: 'leaf-' + key, snow: opts.snow ?? 0.75, fade: true,
    vertexHead: LEAF_VERT_HEAD, vertexBegin: WIND_VERT,
    // keep alpha-tested foliage from dissolving in distant mip levels
    fragColor: '{ vec2 dx = dFdx(vMapUv * 512.0), dy = dFdy(vMapUv * 512.0); float lod = 0.5 * log2(max(dot(dx, dx), dot(dy, dy))); diffuseColor.a *= 1.0 + max(lod, 0.0) * 0.3; }',
    fragEmissive: /* glsl */`
      {
        vec3 Vd = normalize(cameraPosition - vFeyWorld);
        float back = pow(max(dot(Vd, -uLightDir), 0.0), 4.0);
        totalEmissiveRadiance += diffuseColor.rgb * uSunColor * feySunVis * (0.06 + 0.6 * back);
        ${opts.glow ? `totalEmissiveRadiance += diffuseColor.rgb * ${opts.glow.toFixed(2)} * (0.4 + 1.6 * uNight);` : ''}
      }`,
    aoExtra: 'feyAO *= 0.75;',
    onShader: (s) => { s.fragmentShader = s.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n normal = normalize(vNormal);'); },
  });
  return m;
}

function barkMaterial(tex, key, extra = {}) {
  const m = new THREE.MeshStandardMaterial({ map: tex.map, normalMap: tex.normal, roughness: 0.92, metalness: 0, envMapIntensity: 0.5, ...extra.params });
  m.normalScale.set(1.2, 1.2);
  m.userData.bake = { tint: false, glow: extra.glow || 0, leafy: false };
  feyPatch(m, {
    key: 'bark-' + key, snow: 0.8, noInstanceColor: true, fade: true,
    vertexHead: BARK_VERT_HEAD, vertexBegin: WIND_VERT,
    fragEmissive: extra.emissive || '',
  });
  return m;
}

function blobMaterial(key) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, envMapIntensity: 0.5 });
  feyPatch(m, {
    key: 'blob-' + key, snow: 0.7,
    vertexHead: LEAF_VERT_HEAD, vertexBegin: WIND_VERT,
    fragColor: 'diffuseColor.rgb *= 0.5 + 0.6 * texture(uNoiseTex, vFeyWorld.xz * 0.35 + vFeyWorld.y * 0.21).a;',
    fragEmissive: `{ vec3 Vd = normalize(cameraPosition - vFeyWorld); totalEmissiveRadiance += diffuseColor.rgb * uSunColor * feySunVis * (0.04 + 0.3 * pow(max(dot(Vd, -uLightDir), 0.0), 4.0)); }`,
  });
  return m;
}

function glowMaterial(key, base, strength, useInstance = true) {
  const m = new THREE.MeshStandardMaterial({ color: base, roughness: 0.25, metalness: 0.0, envMapIntensity: 1.2 });
  m.userData.bake = { tint: useInstance, glow: strength, leafy: false };
  feyPatch(m, {
    key: 'glow-' + key, snow: 0.0, noInstanceColor: !useInstance, fade: true,
    vertexHead: BARK_VERT_HEAD, vertexBegin: WIND_VERT,
    fragEmissive: `totalEmissiveRadiance += diffuseColor.rgb * ${strength.toFixed(2)} * (0.55 + 1.3 * uNight) * (0.85 + 0.15 * sin(uTime * 2.0 + vFeyWorld.x));`,
  });
  return m;
}

const CELL = 32;       // spatial grid cell (m)
const WORLD = 2048;
const GRID = Math.ceil(WORLD / CELL) + 2;

const QUALITY_LOD = {
  low: { hiDist: 45, band: 8, frames: 8, framePx: 64, perVariant: false },
  medium: { hiDist: 60, band: 10, frames: 8, framePx: 96, perVariant: false },
  high: { hiDist: 75, band: 12, frames: 8, framePx: 128, perVariant: false },
  ultra: { hiDist: 100, band: 14, frames: 8, framePx: 128, perVariant: true },
};

function shadowOnly(mesh, camera) {
  // Drawn by the sun's shadow pass but culled from the main view: the shadow
  // frustum contains the camera, the camera's own frustum never contains its apex.
  mesh.frustumCulled = true;
  mesh.intersectsFrustum = (f) => f.containsPoint(camera.position);
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  return mesh;
}

export class Forest {
  constructor(W, query, quality, renderer, camera) {
    this.W = W;
    this.query = query;
    this.group = new THREE.Group();
    const LQ = QUALITY_LOD[quality] || QUALITY_LOD.high;
    this.hiDist = LQ.hiDist;
    this.band = LQ.band;
    this.shadowRadius = 140;
    this._loDist = 2400;

    const tex = {
      oak: makeBarkTextures('oak', 11), birch: makeBarkTextures('birch', 12), cherry: makeBarkTextures('cherry', 13),
      pine: makeBarkTextures('pine', 14), stem: makeBarkTextures('stem', 15), crystal: makeBarkTextures('crystal', 16),
    };
    const leafTex = {
      broad: makeLeafCardTexture('broad', 21), small: makeLeafCardTexture('small', 22), blossom: makeLeafCardTexture('blossom', 23),
      needle: makeLeafCardTexture('needle', 24), willow: makeLeafCardTexture('willow', 25),
    };
    const petal = makePetalTexture();
    const cap = makeCapTexture();
    const M = {
      barkOak: barkMaterial(tex.oak, 'oak'), barkBirch: barkMaterial(tex.birch, 'birch'), barkCherry: barkMaterial(tex.cherry, 'cherry'),
      barkPine: barkMaterial(tex.pine, 'pine'),
      barkDead: barkMaterial(tex.oak, 'dead', { params: { color: 0x3a3230 }, emissive: `{ float c = smoothstep(0.55, 0.8, texture(uNoiseTex, vFeyWorld.xz * 0.9 + vFeyWorld.y * 0.35).b); totalEmissiveRadiance += vec3(1.8, 0.4, 0.06) * c * (0.6 + 0.4 * sin(uTime * 3.0 + vFeyWorld.y)); }` }),
      stem: barkMaterial(tex.stem, 'stem', { params: { side: THREE.DoubleSide } }),
      crystalTrunk: barkMaterial(tex.crystal, 'ctrunk', { glow: 0.25, params: { color: 0x9ab0d8, roughness: 0.3, metalness: 0.2 }, emissive: 'totalEmissiveRadiance += vec3(0.1, 0.25, 0.5) * (0.3 + uNight);' }),
      mushStem: barkMaterial(tex.birch, 'mstem', { glow: 0.08, params: { color: 0xfff4e8 }, emissive: 'totalEmissiveRadiance += vec3(0.05, 0.08, 0.1) * (0.5 + uNight);' }),
      leafBroad: leafMaterial(leafTex.broad, 'broad'), leafSmall: leafMaterial(leafTex.small, 'small'),
      leafBlossom: leafMaterial(leafTex.blossom, 'blossom', { glow: 0.06 }), leafNeedle: leafMaterial(leafTex.needle, 'needle', { snow: 1.0 }),
      leafWillow: leafMaterial(leafTex.willow, 'willow'),
      petal: leafMaterial(petal, 'petal', { glow: 0.12, snow: 0.0 }),
      shard: glowMaterial('shard', 0xffffff, 0.9),
      center: glowMaterial('center', 0xffe8a0, 1.4, false),
      gills: glowMaterial('gills', 0xffffff, 1.1),
      blob: blobMaterial('std'),
    };
    const capMat = new THREE.MeshStandardMaterial({ map: cap, roughness: 0.45, metalness: 0, envMapIntensity: 0.7 });
    capMat.userData.bake = { tint: true, glow: 0.1, leafy: false };
    feyPatch(capMat, { key: 'cap', snow: 0.6, fade: true, vertexHead: BARK_VERT_HEAD, vertexBegin: WIND_VERT, fragEmissive: 'totalEmissiveRadiance += diffuseColor.rgb * 0.08 * (0.3 + uNight);' });
    M.cap = capMat;
    this.materials = M;

    const matSets = {
      oak: [[M.barkOak, M.leafBroad], [M.barkOak, M.blob]],
      maple: [[M.barkOak, M.leafBroad], [M.barkOak, M.blob]],
      willow: [[M.barkOak, M.leafWillow], [M.barkOak, M.blob]],
      birch: [[M.barkBirch, M.leafSmall], [M.barkBirch, M.blob]],
      blossom: [[M.barkCherry, M.leafBlossom], [M.barkCherry, M.blob]],
      pine: [[M.barkPine, M.leafNeedle], [M.barkPine, M.blob]],
      dead: [[M.barkDead, M.leafBroad], [M.barkDead, M.blob]],
      crystal: [[M.crystalTrunk, M.shard], [M.crystalTrunk, M.shard]],
      flower: [[M.stem, M.petal, M.center], [M.stem, M.petal, M.center]],
      mushroom: [[M.mushStem, M.cap, M.gills], [M.mushStem, M.cap, M.gills]],
    };

    // group trees by kind+variant
    const buckets = new Map();
    W.trees.forEach((t, i) => {
      const k = t.kind + ':' + t.variant;
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(i);
    });
    this.entries = [];
    let seed = W.seed * 13 + 1;
    const tmpM = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
    this.treeMat = new Float32Array(W.trees.length * 16);
    this.treeEntry = new Int16Array(W.trees.length);
    const bakeList = [], layerOf = new Map();
    const treeLayer = new Uint16Array(W.trees.length);
    for (const [key, list] of buckets) {
      const [kind, variant] = key.split(':');
      const gen = generateTreeKind(kind, seed++ + Number(variant) * 101);
      const mats = matSets[kind] || matSets.oak;
      const hiCap = Math.max(1, Math.min(list.length, 2500));
      gen.high.setAttribute('instanceFade', new THREE.InstancedBufferAttribute(new Float32Array(hiCap), 1).setUsage(THREE.DynamicDrawUsage));
      const hi = new THREE.InstancedMesh(gen.high, mats[0], hiCap);
      hi.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      hi.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(hiCap * 3), 3);
      hi.instanceColor.setUsage(THREE.DynamicDrawUsage);
      hi.frustumCulled = false; hi.count = 0;
      hi.castShadow = true; hi.receiveShadow = true;
      const shHi = shadowOnly(new THREE.InstancedMesh(gen.high, mats[0], hiCap), camera);
      const shLo = shadowOnly(new THREE.InstancedMesh(gen.low, mats[1], Math.max(1, list.length)), camera);
      for (const m of [shHi, shLo]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.count = 0; }
      this.group.add(hi, shHi, shLo);

      // impostor layer: one per kind (or per variant on ultra)
      const lk = LQ.perVariant ? key : kind;
      if (!layerOf.has(lk)) { layerOf.set(lk, bakeList.length); bakeList.push({ geo: gen.high, mats: mats[0], height: gen.height }); }
      const layer = layerOf.get(lk);

      const ei = this.entries.length;
      for (const ti of list) {
        const t = W.trees[ti];
        e.set(t.tilt, t.rot, t.tilt * 0.5);
        q.setFromEuler(e);
        s.setScalar(t.scale);
        p.set(t.x, t.y, t.z);
        tmpM.compose(p, q, s);
        this.treeMat.set(tmpM.elements, ti * 16);
        t.h = gen.height * t.scale;
        this.treeEntry[ti] = ei;
        treeLayer[ti] = layer;
        query.addCollider({ x: t.x, z: t.z, r: gen.trunkR * t.scale + 0.15, y0: t.y - 1, y1: t.y + gen.height * t.scale * 0.8, kind: 'tree' });
        if (kind === 'mushroom') {
          const R = gen.capR * t.scale, top = t.y + gen.capH * t.scale, dome = gen.capDome * t.scale;
          query.platforms.push({ x: t.x, z: t.z, r: R * 0.95, bouncy: true, getTop: (x, z) => { const d = Math.hypot(x - t.x, z - t.z) / R; return d < 1 ? top + dome * Math.sqrt(Math.max(0, 1 - d * d)) - 0.1 : null; } });
        }
      }
      this.entries.push({ kind, list, hi, shHi, shLo, height: gen.height, nh: 0, ns: 0, nl: 0 });
    }

    // spatial grid of tree indices
    const counts = new Int32Array(GRID * GRID);
    const cellOf = (x, z) => {
      const gx = Math.min(GRID - 1, Math.max(0, Math.floor((x + WORLD / 2) / CELL) + 1));
      const gz = Math.min(GRID - 1, Math.max(0, Math.floor((z + WORLD / 2) / CELL) + 1));
      return gz * GRID + gx;
    };
    for (const t of W.trees) counts[cellOf(t.x, t.z)]++;
    this.cellStart = new Int32Array(GRID * GRID + 1);
    for (let i = 0; i < GRID * GRID; i++) this.cellStart[i + 1] = this.cellStart[i] + counts[i];
    this.cellTrees = new Int32Array(W.trees.length);
    const fill = this.cellStart.slice(0, GRID * GRID);
    W.trees.forEach((t, i) => { this.cellTrees[fill[cellOf(t.x, t.z)]++] = i; });

    // bake & build impostors
    this.atlas = bakeImpostors(renderer, bakeList, { frames: LQ.frames, framePx: LQ.framePx });
    this.impostors = new ImpostorField(this.atlas, W.trees.map((t, i) => ({ x: t.x, y: t.y, z: t.z, scale: t.scale, rot: t.rot, color: t.color, layer: treeLayer[i] })),
      { hiDist: this.hiDist, band: this.band, loDist: this._loDist });
    this.group.add(this.impostors.mesh);

    this.cullCam = new THREE.PerspectiveCamera();
    this.frustum = new THREE.Frustum();
    this.sphere = new THREE.Sphere();
    this._pm = new THREE.Matrix4();
  }

  get loDist() { return this._loDist; }
  set loDist(v) { this._loDist = v; if (this.impostors) this.impostors.loDist = v; }

  update(camera) {
    const cc = this.cullCam;
    camera.updateMatrixWorld();
    cc.copy(camera);
    cc.fov = Math.min(170, camera.fov * 1.12);
    cc.far = this.hiDist + 60;
    cc.updateProjectionMatrix(); cc.updateMatrixWorld();
    this.frustum.setFromProjectionMatrix(this._pm.multiplyMatrices(cc.projectionMatrix, cc.matrixWorldInverse));
    const cx = camera.position.x, cz = camera.position.z;
    const hiD = this.hiDist, hiIn = hiD - this.band, band = this.band;
    const hi2 = hiD * hiD;
    const shR = Math.max(this.shadowRadius, hiD), sh2 = shR * shR;
    const trees = this.W.trees, TM = this.treeMat, TE = this.treeEntry;
    const E = this.entries;
    for (const en of E) { en.nh = 0; en.ns = 0; en.nl = 0; }

    const g0x = Math.max(0, Math.floor((cx - shR + WORLD / 2) / CELL) + 1), g1x = Math.min(GRID - 1, Math.floor((cx + shR + WORLD / 2) / CELL) + 1);
    const g0z = Math.max(0, Math.floor((cz - shR + WORLD / 2) / CELL) + 1), g1z = Math.min(GRID - 1, Math.floor((cz + shR + WORLD / 2) / CELL) + 1);
    const CS = this.cellStart, CT = this.cellTrees;
    const sph = this.sphere, fr = this.frustum;
    for (let gz = g0z; gz <= g1z; gz++) for (let gx = g0x; gx <= g1x; gx++) {
      const c = gz * GRID + gx;
      for (let k = CS[c], ke = CS[c + 1]; k < ke; k++) {
        const ti = CT[k];
        const t = trees[ti];
        const dx = t.x - cx, dz = t.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 > sh2) continue;
        const en = E[TE[ti]];
        if (d2 < hi2) {
          sph.center.set(t.x, t.y + t.h * 0.5, t.z); sph.radius = t.h * 0.7 + 2;
          if (fr.intersectsSphere(sph)) {
            if (en.nh >= en.hi.instanceMatrix.count) continue;
            const d = Math.sqrt(d2);
            let f = 1;
            if (d > hiIn) { const x = (d - hiIn) / band; f = 1 - x * x * (3 - 2 * x); }
            en.hi.instanceMatrix.array.set(TM.subarray(ti * 16, ti * 16 + 16), en.nh * 16);
            const C = en.hi.instanceColor.array; C[en.nh * 3] = t.color[0]; C[en.nh * 3 + 1] = t.color[1]; C[en.nh * 3 + 2] = t.color[2];
            en.hi.geometry.attributes.instanceFade.array[en.nh] = f;
            en.nh++;
          } else if (en.ns < en.shHi.instanceMatrix.count) {
            en.shHi.instanceMatrix.array.set(TM.subarray(ti * 16, ti * 16 + 16), en.ns * 16);
            en.ns++;
          }
        } else {
          en.shLo.instanceMatrix.array.set(TM.subarray(ti * 16, ti * 16 + 16), en.nl * 16);
          en.nl++;
        }
      }
    }
    for (const en of E) {
      const upd = (m, n) => {
        m.count = n;
        m.instanceMatrix.clearUpdateRanges();
        if (n) { m.instanceMatrix.addUpdateRange(0, n * 16); m.instanceMatrix.needsUpdate = true; }
      };
      upd(en.hi, en.nh); upd(en.shHi, en.ns); upd(en.shLo, en.nl);
      if (en.nh) {
        const ic = en.hi.instanceColor; ic.clearUpdateRanges(); ic.addUpdateRange(0, en.nh * 3); ic.needsUpdate = true;
        const fa = en.hi.geometry.attributes.instanceFade; fa.clearUpdateRanges(); fa.addUpdateRange(0, en.nh); fa.needsUpdate = true;
      }
    }
  }
}
