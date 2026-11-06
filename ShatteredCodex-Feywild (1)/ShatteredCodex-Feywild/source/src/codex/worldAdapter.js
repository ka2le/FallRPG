// Bridges the Shattered Codex gameplay layer (villages, quests, monsters, loot)
// onto the procedurally generated Feywild. Exposes the G.W API the gameplay
// modules expect (heightAt, groundY, collide, regionAt, zoneLevel, raycast…)
// backed by the Feywild world data, and builds villages, shrines, camps,
// chests, boss lairs, roads and the realm map.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { feyPatch, G as GU } from '../render/shaderLib.js';
import { makeCottageKit } from './cottages.js';
import { RNG } from '../core/rng.js';
import { N, CELL, HALF, WTYPE_LAVA, WTYPE_ICE, WTYPE_WATER, WATER_OCEAN } from '../world/constants.js';

const G = window.G;
const U = () => G.U;

export function setupWorld(Wd, query) {
  const W = G.W = G.W || {};
  const u = U();
  W.HALF = HALF; W.CELL = CELL; W.data = Wd; W.query = query;
  W.boxes = []; W.roads = []; W.npcs = []; W.interactables = []; W.chimneys = [];
  W.chests = []; W.shrines = []; W.camps = []; W.fires = []; W.lairLights = [];
  W.BIOMES = ['grass', 'lakes', 'forest', 'swamp', 'desert', 'mountain', 'snow', 'ash', 'barrow'];

  // ---------- place villages on the generated settlement sites ----------
  for (const v of G.VILLAGES) {
    const st = Wd.sites[v.id];
    if (st) { v.x = st.x; v.z = st.z; }
  }

  // ---------- basic queries ----------
  W.heightAt = (x, z) => query.height(x, z);
  W.waterInfo = (x, z) => {
    const w = query.water(x, z);
    const h = query.height(x, z);
    return { h: w.h, type: w.type, kind: w.kind, present: w.h > h - 0.05 && w.h > -999, depth: w.h - h };
  };
  W.groundY = (x, z) => {
    const h = query.height(x, z);
    const w = query.water(x, z);
    return w.h > h ? w.h : h;
  };
  W.floorAt = (x, z, fromY) => query.groundAt(x, z, fromY);
  W.platformAt = (x, z, y) => {
    for (const p of query.platforms) {
      const dx = x - p.x, dz = z - p.z;
      if (dx * dx + dz * dz < p.r * p.r) { const t = p.getTop(x, z); if (t !== null && Math.abs(t - y) < 0.15) return p; }
    }
    return null;
  };
  W.isDry = (x, z) => {
    const h = query.height(x, z);
    if (h < 1.2) return false;
    const w = query.water(x, z);
    return !(w.h > h - 0.3 && w.h > -999);
  };
  W.lavaAt = (x, z) => { const w = query.water(x, z); return w.type === WTYPE_LAVA && w.h > query.height(x, z) - 0.2; };
  W.isLava = W.lavaAt;
  W.monsterY = (x, z, swimmer) => {
    const h = query.height(x, z);
    const w = query.water(x, z);
    if (w.h > h && w.h > -999) {
      if (w.type === WTYPE_ICE) return w.h;
      if (w.h - h > 1.2) return w.h - 1.2 + (swimmer ? 0.3 : 0);
      return h;
    }
    return h;
  };
  W.normalAt = (x, z, out) => query.normal(x, z, out || new THREE.Vector3());
  W.raycast = function (o, dir, maxD) {
    const t = query.raycast(o.x, o.y, o.z, dir.x, dir.y, dir.z, maxD, true);
    return t > 0 ? new THREE.Vector3(o.x + dir.x * t, o.y + dir.y * t, o.z + dir.z * t) : null;
  };

  // ---------- regions & danger ----------
  const REG = G.REGIONS;
  const RS = 256;
  const regionGrid = new Uint8Array(RS * RS);
  const n2 = new u.Simplex(4242), n3 = new u.Simplex(777);
  for (let j = 0; j < RS; j++) for (let i = 0; i < RS; i++) {
    const x = (i + 0.5) / RS * 2 * HALF - HALF, z = (j + 0.5) / RS * 2 * HALF - HALF;
    const wx = x + u.fbm(n2, x * .0025, z * .0025, 3) * 110, wz = z + u.fbm(n3, x * .0025 + 50, z * .0025, 3) * 110;
    let best = 0, bd = 1e12;
    for (let k = 0; k < REG.length; k++) { const dx = wx - REG[k].x, dz = wz - REG[k].z; const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = k; } }
    regionGrid[j * RS + i] = best;
  }
  W.regionAt = (x, z) => {
    const i = u.clamp(Math.floor((x + HALF) / (2 * HALF) * RS), 0, RS - 1), j = u.clamp(Math.floor((z + HALF) / (2 * HALF) * RS), 0, RS - 1);
    return REG[regionGrid[j * RS + i]];
  };
  W.biomeAt = (x, z) => W.regionAt(x, z).biome;
  W.zoneLevel = function (x, z) {
    const d = Math.sqrt(x * x + z * z);
    let l = 1 + 29 * Math.pow(d / 700, 2);
    if (W.biomeAt(x, z) === 'ash') l += 1.5;
    return u.clamp(Math.round(l), 1, 34);
  };

  // ---------- colliders ----------
  W.addCollider = (x, z, r) => query.addCollider({ x, z, r, y0: -1e4, y1: 1e4, kind: 'codex' });
  W.collide = function (p, pr) {
    for (let iter = 0; iter < 2; iter++) {
      const list = query.nearColliders(p.x, p.z);
      for (const c of list) {
        if (p.y !== undefined && (p.y + 1.7 < c.y0 || p.y > c.y1)) continue;
        const dx = p.x - c.x, dz = p.z - c.z; const rr = c.r + pr; const d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2); p.x = c.x + dx / d * rr; p.z = c.z + dz / d * rr; }
      }
    }
    for (const b of W.boxes) {
      const dx = p.x - b.x, dz = p.z - b.z;
      if (Math.abs(dx) > 25 || Math.abs(dz) > 25) continue;
      const lx = dx * b.c + dz * b.s, lz = -dx * b.s + dz * b.c;
      const hw = b.hw + pr, hd = b.hd + pr;
      if (Math.abs(lx) < hw && Math.abs(lz) < hd) {
        const px = hw - Math.abs(lx), pz = hd - Math.abs(lz);
        let nlx = lx, nlz = lz;
        if (px < pz) nlx = Math.sign(lx || 1) * hw; else nlz = Math.sign(lz || 1) * hd;
        p.x = b.x + nlx * b.c - nlz * b.s; p.z = b.z + nlx * b.s + nlz * b.c;
      }
    }
  };

  // ---------- snap lairs & shrines onto sensible ground ----------
  const snap = (o, minR = 8) => {
    const ok = (x, z) => {
      if (!W.isDry(x, z)) return false;
      const h = query.height(x, z);
      if (h < 3 || h > 170) return false;
      const e = 6;
      const sl = Math.abs(query.height(x + e, z) - query.height(x - e, z)) + Math.abs(query.height(x, z + e) - query.height(x, z - e));
      if (sl > 5) return false;
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; if (!W.isDry(x + Math.cos(a) * minR, z + Math.sin(a) * minR)) return false; }
      return !G.VILLAGES.some((v) => Math.hypot(v.x - x, v.z - z) < 75);
    };
    for (let k = 0; k < 400; k++) {
      const a = k * 2.39996, r = 6 * Math.sqrt(k);
      const x = o.x + Math.cos(a) * r, z = o.z + Math.sin(a) * r;
      if (ok(x, z)) { o.x = x; o.z = z; return; }
    }
  };
  G.BOSSES.forEach((b) => snap(b, b.id === 'malgrath' ? 22 : 12));
  G.SHRINES.forEach((s) => snap(s, 5));

  // ---------- roads between settlements (painted into the terrain) ----------
  const vp = (id) => { const v = G.VILLAGES.find((v) => v.id === id); return [v.x, v.z]; };
  const rp = (id) => { const r = REG.find((r) => r.id === id); return [r.x * 0.9, r.z * 0.9]; };
  const paths = [
    [vp('brightwater'), vp('thornwood')], [vp('brightwater'), rp('lakes'), vp('mirefen')], [vp('thornwood'), vp('sunspire')],
    [vp('brightwater'), rp('crags'), vp('frosthold')], [vp('brightwater'), rp('elder')], [vp('sunspire'), rp('ash')], [vp('mirefen'), rp('blight')],
  ];
  const rr = u.rng(55);
  paths.forEach((path) => {
    for (let s = 0; s < path.length - 1; s++) {
      const [ax, az] = path[s], [bx, bz] = path[s + 1];
      const L = u.d2(ax, az, bx, bz); const n = Math.ceil(L / 20);
      const nx = -(bz - az) / L, nz = (bx - ax) / L; let prev = null; const ph = rr() * 10;
      for (let i = 0; i <= n; i++) {
        const t = i / n; const off = Math.sin(t * Math.PI) * n3.n2(t * 3 + ph, ph) * 55;
        const p = [ax + (bx - ax) * t + nx * off, az + (bz - az) * t + nz * off];
        if (prev) W.roads.push([prev[0], prev[1], p[0], p[1]]);
        prev = p;
      }
    }
  });
  W.roadDist = function (x, z) {
    let best = 1e9;
    for (const s of W.roads) {
      const minx = Math.min(s[0], s[2]) - 8, maxx = Math.max(s[0], s[2]) + 8;
      if (x < minx || x > maxx) continue;
      const minz = Math.min(s[1], s[3]) - 8, maxz = Math.max(s[1], s[3]) + 8;
      if (z < minz || z > maxz) continue;
      const vx = s[2] - s[0], vz = s[3] - s[1]; const l2 = vx * vx + vz * vz;
      const t = u.clamp(((x - s[0]) * vx + (z - s[1]) * vz) / l2, 0, 1);
      const d = u.d2(x, z, s[0] + vx * t, s[1] + vz * t); if (d < best) best = d;
    }
    return best;
  };
  // rasterise into misc.A (road mask), thin the grass on the path
  const M = Wd.misc;
  for (const s of W.roads) {
    const x0 = Math.min(s[0], s[2]) - 6, x1 = Math.max(s[0], s[2]) + 6, z0 = Math.min(s[1], s[3]) - 6, z1 = Math.max(s[1], s[3]) + 6;
    const vx = s[2] - s[0], vz = s[3] - s[1]; const l2 = vx * vx + vz * vz;
    for (let gz = Math.max(0, Math.floor((z0 + HALF) / CELL)); gz <= Math.min(N - 1, Math.ceil((z1 + HALF) / CELL)); gz++) {
      for (let gx = Math.max(0, Math.floor((x0 + HALF) / CELL)); gx <= Math.min(N - 1, Math.ceil((x1 + HALF) / CELL)); gx++) {
        const x = gx * CELL - HALF, z = gz * CELL - HALF;
        const t = u.clamp(((x - s[0]) * vx + (z - s[1]) * vz) / l2, 0, 1);
        const d = u.d2(x, z, s[0] + vx * t, s[1] + vz * t);
        const wob = 0.6 * Math.sin(x * 0.21) + 0.5 * Math.sin(z * 0.17);
        const m = u.smooth(2.0 + wob * 0.5, 0.5, d) * 0.85;
        if (m <= 0) continue;
        const i = gz * N + gx;
        if (Wd.waterKind[i] && Wd.waterH[i] > Wd.height[i] - 0.2) continue;
        M[i * 4 + 3] = Math.max(M[i * 4 + 3], Math.round(255 * m));
        M[i * 4 + 2] = Math.round(M[i * 4 + 2] * (1 - m * 0.6));
      }
    }
  }
  // settlements: trodden ground and no tall grass in the lanes
  for (const v of G.VILLAGES) {
    const r0 = 46;
    for (let gz = Math.floor((v.z - r0 + HALF) / CELL); gz <= Math.ceil((v.z + r0 + HALF) / CELL); gz++) for (let gx = Math.floor((v.x - r0 + HALF) / CELL); gx <= Math.ceil((v.x + r0 + HALF) / CELL); gx++) {
      if (gx < 0 || gz < 0 || gx >= N || gz >= N) continue;
      const x = gx * CELL - HALF, z = gz * CELL - HALF;
      const d = Math.hypot(x - v.x, z - v.z);
      const i = gz * N + gx;
      const lane = u.smooth(2.4, 1.0, Math.abs(d - 18)) * 0.9 + u.smooth(6, 2, d) * 0.8;
      M[i * 4 + 3] = Math.max(M[i * 4 + 3], Math.round(255 * Math.min(1, lane) * 0.85));
      M[i * 4 + 2] = Math.round(M[i * 4 + 2] * (1 - Math.min(1, lane) * 0.7));
    }
  }

  // ---------- time bridging ----------
  W.underwater = false; W.isNight = false; W.dayF = 1;
  W.update = () => {}; W.updateSky = () => {};
  W.refreshNpcMarkers = () => {};
  return W;
}

// -------------------------------------------------------------- scene builders
function stdMat(opts, key, snow = 0.6) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, envMapIntensity: 0.6, ...opts });
  feyPatch(m, { key: 'codex-' + key, snow });
  return m;
}

export function buildScene(scene) {
  const W = G.W, u = U(), T = G.T;
  T.makeBuildingTextures();
  const M = (k, snow) => stdMat({ map: T.buildingTex[k] }, k, snow);
  const mats = { plaster: M('plaster', 0.3), wood: M('wood', 0.3), log: M('log', 0.3), sandstone: M('sandstone', 0.2), stone: M('stone', 0.6), roof: M('roof', 1), thatch: M('thatch', 1), moss: M('moss', 1), snowroof: M('snowroof', 1), darkstone: M('darkstone', 0.2) };
  W.mats = mats;
  const flowerMats = [0xb3203a, 0xe0b43a, 0x7a3fa8].map((c, i) => stdMat({ color: c }, 'flower' + i, 0));
  const door = stdMat({ color: 0x3a2412 }, 'door', 0);
  const gold = stdMat({ color: 0xc9a24a, metalness: 0.8, roughness: 0.35 }, 'gold', 0);
  const kit = makeCottageKit();
  const krng = new RNG(4242);
  const windowMat = kit.windowMat;
  W.windowMat = windowMat; W.houses = [];
  const domeBlue = stdMat({ color: 0x3a78b0, roughness: 0.4, metalness: 0.2 }, 'domeb', 0.5);
  const domeCream = stdMat({ color: 0xe8dcc0, roughness: 0.6 }, 'domec', 0.5);
  const tentMat = stdMat({ color: 0x8a6a4a }, 'tent', 0.8);
  const styles = {
    meadow: { wall: 'plaster', roof: 'roof' }, forest: { wall: 'log', roof: 'moss' }, swamp: { wall: 'wood', roof: 'thatch', stilts: true },
    desert: { wall: 'sandstone', roof: null }, snow: { wall: 'log', roof: 'snowroof' },
  };
  const statics = [];
  const addStatic = (o) => { statics.push(o); scene.add(o); };

  // ---------- villages ----------
  G.VILLAGES.forEach((v, vi) => {
    const st = styles[v.style]; const rr = u.rng(100 + vi);
    v.y = W.heightAt(v.x, v.z);
    const hub = v.id === 'brightwater';
    const n = 8;
    for (let i = 0; i < n; i++) {
      const ang = i / n * Math.PI * 2 + rr() * 0.3 + 0.2; const rad = (hub ? 30 : 26) + rr() * 8;
      const hx = v.x + Math.cos(ang) * rad, hz = v.z + Math.sin(ang) * rad;
      const house = kit.build(krng, v.style);
      const grp = house.group;
      const fp = house.footprint;
      // sit on the lowest corner so the plinth never floats
      let gy = W.heightAt(hx, hz);
      const ext = fp.kind === 'box' ? Math.max(fp.w, fp.d) / 2 : fp.r;
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; gy = Math.min(gy, W.heightAt(hx + Math.cos(a) * ext, hz + Math.sin(a) * ext)); }
      grp.position.set(hx, gy + 0.05, hz);
      const face = Math.atan2(v.x - hx, v.z - hz); grp.rotation.y = face;
      if (house.lamp) kit.lantern(grp, house.lamp);
      addStatic(grp);
      grp.updateMatrixWorld(true);
      if (house.chimney) W.chimneys.push({ grp, lx: house.chimney.x, ly: house.chimney.y, lz: house.chimney.z });
      if (house.lamp) {
        const lp = new THREE.Vector3(house.lamp.x, house.lamp.y, house.lamp.z + 0.12); grp.localToWorld(lp);
        const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow(), color: new THREE.Color(1.6, 1.0, 0.45), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        lamp.position.copy(lp); lamp.scale.set(1.1, 1.1, 1); scene.add(lamp);
        W.fires.push({ sprite: lamp, x: lp.x, y: lp.y, z: lp.z, lamp: true });
      }
      if (fp.kind === 'box') W.boxes.push({ x: hx, z: hz, c: Math.cos(-face), s: Math.sin(-face), hw: fp.w / 2, hd: fp.d / 2 });
      else W.addCollider(hx, hz, fp.r);
      W.houses.push({ x: hx, z: hz, r: ext + 1.5 });
      for (let k = 0; k < 2; k++) if (rr() < 0.5) {
        const ox = (k ? 1 : -1) * (ext + 1.1), oz = ext * 0.6; const px = hx + Math.cos(face) * ox + Math.sin(face) * oz, pz = hz - Math.sin(face) * ox + Math.cos(face) * oz;
        const barrel = rr() < 0.5; const m = new THREE.Mesh(barrel ? new THREE.CylinderGeometry(0.45, 0.4, 1.0, 12) : new THREE.BoxGeometry(0.9, 0.9, 0.9), kit.mats.paleWood);
        m.position.set(px, W.heightAt(px, pz) + 0.48, pz); m.rotation.y = rr() * 3; addStatic(m); W.addCollider(px, pz, 0.6);
      }
    }
    // fence ring with gaps at roads
    for (let k = 0; k < 64; k++) {
      const a = k / 64 * Math.PI * 2; const fx = v.x + Math.cos(a) * 52, fz = v.z + Math.sin(a) * 52;
      if (W.roadDist(fx, fz) < 7 || k % 8 === 0) continue;
      if (!W.isDry(fx, fz)) continue;
      const fy = W.heightAt(fx, fz);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.3, 0.18), mats.wood); post.position.set(fx, fy + 0.6, fz); addStatic(post);
      const a2 = (k + 1) / 64 * Math.PI * 2; const nx = v.x + Math.cos(a2) * 52, nz = v.z + Math.sin(a2) * 52; const len = u.d2(fx, fz, nx, nz);
      if (!W.isDry(nx, nz)) continue;
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.08), mats.wood); rail.position.set((fx + nx) / 2, (fy + W.heightAt(nx, nz)) / 2 + 0.9, (fz + nz) / 2); rail.rotation.y = -Math.atan2(nz - fz, nx - fx); addStatic(rail);
    }
    // central well (Brightwater has the Heartstone instead)
    if (!hub) {
      const well = new THREE.Group(); well.position.set(v.x, v.y, v.z);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 1.2, 16, 1, true), kit.mats.field); ring.position.y = .6; well.add(ring);
      const water = new THREE.Mesh(new THREE.CircleGeometry(2.1, 16), stdMat({ color: 0x1a4a5a, roughness: 0.1 }, 'wellwater', 0)); water.rotation.x = -Math.PI / 2; water.position.y = .9; well.add(water);
      for (const sx of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(.3, 3.2, .3), kit.mats.timber); post.position.set(sx * 2, 1.6, 0); well.add(post); }
      const wr = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.4, 4), v.style === 'desert' ? kit.mats.domeTeal : kit.roofMat.moss); wr.rotation.y = Math.PI / 4; wr.position.y = 3.8; well.add(wr);
      addStatic(well); W.addCollider(v.x, v.z, 2.6);
    }
    // lanterns
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2 + 0.4; const lx = v.x + Math.cos(a) * 16, lz = v.z + Math.sin(a) * 16; const ly = W.heightAt(lx, lz);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.1, .12, 3.2, 6), mats.wood); pole.position.set(lx, ly + 1.6, lz); addStatic(pole);
      const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow(), color: new THREE.Color(1.6, 1.0, 0.45), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      lamp.position.set(lx, ly + 3.3, lz); lamp.scale.set(1.6, 1.6, 1); scene.add(lamp);
      W.fires.push({ sprite: lamp, x: lx, y: ly + 2.4, z: lz, lamp: true });
    }
    // NPCs
    const vnpcs = G.NPCS.filter((n) => n.village === v.id);
    vnpcs.forEach((nd, i) => {
      const a = i / vnpcs.length * Math.PI * 2 + 0.3; const r = hub ? 10 : 9; const nx = v.x + Math.cos(a) * r, nz = v.z + Math.sin(a) * r; const ny = W.heightAt(nx, nz);
      const sp = new THREE.Sprite(G.feySprite(new THREE.SpriteMaterial({ map: G.Art ? G.Art.npc(nd) : T.emoji(nd.e), transparent: true, alphaTest: 0.1 })));
      sp.scale.set(2.9, 2.9, 1); sp.position.set(nx, ny + 1.4, nz); scene.add(sp);
      const label = T.textSprite(nd.name, nd.shop ? '#9fd3ff' : '#f6e7b0', null);
      label.position.set(nx, ny + 3.4, nz); scene.add(label);
      const npc = { def: nd, x: nx, z: nz, y: ny, sprite: sp, label, marker: null, bob: Math.random() * 6 };
      W.npcs.push(npc); W.addCollider(nx, nz, 0.8);
    });
  });
  W.refreshNpcMarkers = function () {
    W.npcs.forEach((n) => {
      const m = G.Quests ? G.Quests.markerFor(n.def.id) : null;
      if (m !== n.marker) { n.marker = m; T.drawText(n.label.userData.canvas, n.def.name, n.def.shop ? '#9fd3ff' : '#f6e7b0', m); n.label.userData.tex.needsUpdate = true; }
    });
  };

  // ---------- chests, shrines, lairs, camps ----------
  const rr = u.rng(909);
  const landPoint = (minD, tries) => {
    for (let t = 0; t < (tries || 60); t++) {
      const a = rr() * Math.PI * 2, r = Math.sqrt(rr()) * 760; const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (!W.isDry(x, z)) continue;
      const h = W.heightAt(x, z); if (h > 175) continue;
      const e = 4; if (Math.abs(W.heightAt(x + e, z) - W.heightAt(x - e, z)) + Math.abs(W.heightAt(x, z + e) - W.heightAt(x, z - e)) > 4) continue;
      if (G.VILLAGES.some((v) => u.d2(x, z, v.x, v.z) < minD)) continue;
      if (W.data.feat[W.query.idx(x, z) * 4 + 3] > 60) continue; // not on top of leaf mountains
      return { x, z, h };
    }
    return null;
  };
  const makeChestMesh = () => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, .8, .95), mats.wood); body.position.y = .4; g.add(body);
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.45, .12, 1.0), gold); band.position.y = .7; g.add(band);
    const lidPivot = new THREE.Group(); lidPivot.position.set(0, .8, -.475); g.add(lidPivot);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.4, .35, .95), mats.wood); lid.position.set(0, .175, .475); lidPivot.add(lid);
    const lock = new THREE.Mesh(new THREE.BoxGeometry(.25, .3, .1), gold); lock.position.set(0, .05, .96); lidPivot.add(lock);
    g.userData.lid = lidPivot;
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  };
  for (let i = 0; i < 90; i++) {
    const p = landPoint(70); if (!p) continue;
    if (W.chests.some((c) => u.d2(c.x, c.z, p.x, p.z) < 50)) continue;
    const mesh = makeChestMesh(); mesh.position.set(p.x, p.h, p.z); mesh.rotation.y = rr() * 6.28; scene.add(mesh);
    W.chests.push({ id: 'c' + W.chests.length, x: p.x, z: p.z, y: p.h, mesh, level: W.zoneLevel(p.x, p.z), opened: false });
  }
  G.BOSSES.forEach((b) => {
    const x = b.x + 6, z = b.z + 4, h = W.heightAt(x, z);
    const mesh = makeChestMesh(); mesh.scale.setScalar(1.3); mesh.position.set(x, h, z); scene.add(mesh);
    W.chests.push({ id: 'cb_' + b.id, x, z, y: h, mesh, level: b.level + 1, opened: false, boss: true });
  });
  G.SHRINES.forEach((s, i) => {
    const h = W.heightAt(s.x, s.z);
    const g = new THREE.Group(); g.position.set(s.x, h, s.z);
    for (let k = 0; k < 4; k++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.35, .45, 4, 8), mats.stone); p.position.set(Math.cos(k * 1.57) * 2.4, 2, Math.sin(k * 1.57) * 2.4); g.add(p); }
    const base = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.5, .4, 12), mats.stone); base.position.y = .2; g.add(base);
    addStatic(g);
    const orb = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow(), color: new THREE.Color(0.6, 1.2, 1.8), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    orb.scale.set(2.5, 2.5, 1); orb.position.set(s.x, h + 2.6, s.z); scene.add(orb);
    W.shrines.push({ id: 's' + i, x: s.x, z: s.z, y: h, stat: s.stat, orb, used: false });
  });
  G.BOSSES.forEach((b) => {
    const big = b.id === 'malgrath';
    const n = big ? 10 : 6, rad = big ? 28 : 13;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2; const px = b.x + Math.cos(a) * rad, pz = b.z + Math.sin(a) * rad;
      const ph = (big ? 12 : 4) + Math.random() * (big ? 10 : 3);
      const p = new THREE.Mesh(big ? new THREE.CylinderGeometry(1.4, 2, ph, 8) : new THREE.BoxGeometry(1, ph, 1), big ? mats.darkstone : mats.stone);
      p.position.set(px, W.heightAt(px, pz) + ph / 2 - .3, pz); p.rotation.y = a; addStatic(p);
      W.addCollider(px, pz, big ? 1.8 : 0.9);
      if (big) { const sp = new THREE.Mesh(new THREE.ConeGeometry(1.5, 4, 8), mats.darkstone); sp.position.set(px, W.heightAt(px, pz) + ph + 1.7, pz); addStatic(sp); }
    }
  });
  const campfire = (x, z) => {
    const y = W.heightAt(x, z);
    for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 1.4, 6), mats.wood); l.rotation.z = Math.PI / 2; l.rotation.y = i * 1.05; l.position.set(x, y + .15, z); addStatic(l); }
    const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow(), color: new THREE.Color(2.2, 0.9, 0.25), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    f.position.set(x, y + .9, z); f.scale.set(2.2, 2.6, 1); scene.add(f);
    const tent = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3, 4), tentMat); tent.position.set(x - 4, W.heightAt(x - 4, z - 3) + 1.4, z - 3); addStatic(tent);
    W.addCollider(x - 4, z - 3, 1.8);
    W.fires.push({ sprite: f, x, y, z });
  };
  for (let i = 0; i < 600 && W.camps.length < 220; i++) {
    const p = landPoint(95); if (!p) continue;
    if (W.camps.some((c) => u.d2(c.x, c.z, p.x, p.z) < 34)) continue;
    if (G.BOSSES.some((b) => u.d2(b.x, b.z, p.x, p.z) < 45)) continue;
    if (G.SHRINES.some((s) => u.d2(s.x, s.z, p.x, p.z) < 20)) continue;
    if (W.roadDist(p.x, p.z) < 10) continue;
    const reg = W.regionAt(p.x, p.z); const lvl = W.zoneLevel(p.x, p.z);
    const pool = reg.mons.filter((m) => G.MONSTERS[m].minLv <= lvl);
    const main = u.pick(pool.length ? pool : reg.mons.slice(0, 2));
    const types = [main]; if (rr() < 0.4) types.push(u.pick(pool.length ? pool : reg.mons));
    const count = 3 + Math.floor(rr() * 3) + (lvl > 15 ? 1 : 0);
    const camp = { id: 'k' + W.camps.length, x: p.x, z: p.z, level: lvl, types, count, eliteChance: 0.12 + lvl * 0.004, monsters: [], spawned: false, respawnAt: 0, region: reg.id };
    W.camps.push(camp);
    if (types.some((t) => ['goblin', 'slinger', 'brigand', 'hexer', 'ogre', 'ogremage', 'skeleton'].includes(t))) campfire(p.x + 3, p.z + 2);
  }
  G.BOSSES.forEach((b) => {
    W.camps.push({ id: 'b_' + b.id, x: b.x, z: b.z, level: b.level, boss: b, types: [b.mon], count: 0, monsters: [], spawned: false, respawnAt: 0 });
  });

  // chimney world positions
  const v3 = new THREE.Vector3();
  W.chimneys = W.chimneys.map((c) => { c.grp.updateMatrixWorld(true); v3.set(c.lx, c.ly, c.lz); c.grp.localToWorld(v3); return { x: v3.x, y: v3.y, z: v3.z }; });
  batchStatic(scene, statics);
  buildMap();

  // clearing list for vegetation
  const clear = [];
  G.VILLAGES.forEach((v) => clear.push([v.x, v.z, 21]));
  W.houses.forEach((h) => clear.push([h.x, h.z, h.r]));
  W.camps.forEach((c) => clear.push([c.x, c.z, c.boss ? (c.boss.id === 'malgrath' ? 26 : 14) : 6]));
  W.shrines.forEach((s) => clear.push([s.x, s.z, 4.5]));
  W.chests.forEach((c) => clear.push([c.x, c.z, 2]));
  W.clearZones = clear;
  W.isCleared = (x, z) => {
    for (const c of clear) { const dx = x - c[0], dz = z - c[1]; if (dx * dx + dz * dz < c[2] * c[2]) return true; }
    return W.roadDist(x, z) < 2.2;
  };

  // ---------- per-frame ----------
  let smokeT = 0;
  W.update = function (dt, cam, now) {
    const px = cam.position.x, pz = cam.position.z;
    for (const n of W.npcs) {
      const d = u.d2(px, pz, n.x, n.z); n.label.visible = d < 60;
      n.sprite.position.y = n.y + 1.4 + Math.sin(now * 2 + n.bob) * 0.06;
    }
    for (const f of W.fires) {
      if (f.lamp) { f.sprite.material.opacity = 0.35 + 0.65 * (1 - W.dayF * 0.8); continue; }
      const k = 1 + Math.sin(now * 13 + f.x) * 0.12 + Math.sin(now * 7.3) * 0.08; f.sprite.scale.set(2.2 * k, 2.8 * k, 1);
      if (G.FX && Math.random() < dt * 8 && u.d2(px, pz, f.x, f.z) < 80) G.FX.spawn(f.x + (Math.random() - .5) * .4, f.y + 0.9, f.z + (Math.random() - .5) * .4, 0, 2 + Math.random(), 0, 0.8, 0.5, 0xffa040, -1, 0.5, -0.4);
    }
    for (const s of W.shrines) { s.orb.position.y = s.y + 2.6 + Math.sin(now * 1.5 + s.x) * 0.3; s.orb.material.color.setRGB(s.used ? 0.3 : 0.6, s.used ? 0.3 : 1.2, s.used ? 0.3 : 1.8); }
    windowMat.emissiveIntensity += ((W.isNight ? 2.6 : 0.35) - windowMat.emissiveIntensity) * Math.min(1, dt * 0.5);
    smokeT -= dt;
    if (smokeT <= 0 && G.FX) {
      smokeT = 0.12;
      for (const c of W.chimneys) { if (u.d2(px, pz, c.x, c.z) < 140) G.FX.smoke(c.x, c.y, c.z); }
    }
  };
}

function batchStatic(scene, list) {
  const byMat = new Map();
  for (const top of list) {
    top.updateMatrixWorld(true);
    top.traverse((o) => {
      if (!o.isMesh) return;
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      const k = o.material.uuid;
      if (!byMat.has(k)) byMat.set(k, { mat: o.material, geos: [] });
      byMat.get(k).geos.push(g);
    });
    scene.remove(top);
  }
  byMat.forEach((e) => {
    const geo = mergeGeometries(e.geos, false);
    if (!geo) return;
    const mesh = new THREE.Mesh(geo, e.mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    scene.add(mesh);
  });
}

// ---------- realm map (north = -z up, east = +x right) ----------
function buildMap() {
  const W = G.W, Wd = W.data, q = W.query;
  const S = 512; const c = document.createElement('canvas'); c.width = c.height = S; const ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  const pal = [[0.42, 0.56, 0.26], [0.26, 0.42, 0.16], [0.62, 0.42, 0.18], [0.84, 0.88, 0.92]];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const wx = -HALF + (x + .5) / S * 2 * HALF, wz = -HALF + (y + .5) / S * 2 * HALF;
    const h = q.height(wx, wz); const i = (y * S + x) * 4;
    const w = q.water(wx, wz);
    let r, g, b;
    if (w.h > h && w.h > -999) {
      const d = Math.min(1, (w.h - h) / 20);
      if (w.type === WTYPE_LAVA) { r = 0.95; g = 0.38; b = 0.08; }
      else if (w.type === WTYPE_ICE) { r = 0.72; g = 0.84; b = 0.92; }
      else if (w.kind === WATER_OCEAN) { r = 0.1 - d * 0.04; g = 0.26 - d * 0.1; b = 0.42 - d * 0.12; }
      else { r = 0.16; g = 0.42; b = 0.52; }
    } else {
      const s = q.season(wx, wz, [0, 0, 0, 0]); const f = q.feat(wx, wz);
      r = 0; g = 0; b = 0;
      for (let k = 0; k < 4; k++) { r += pal[k][0] * s[k]; g += pal[k][1] * s[k]; b += pal[k][2] * s[k]; }
      const forest = f.forest; r *= 1 - forest * 0.35; g *= 1 - forest * 0.25; b *= 1 - forest * 0.35;
      const n = q.normal(wx, wz, new THREE.Vector3());
      const rock = u_sm(0.8, 0.65, n.y);
      r = r * (1 - rock) + 0.5 * rock; g = g * (1 - rock) + 0.48 * rock; b = b * (1 - rock) + 0.46 * rock;
      const snow = u_sm(150, 210, h) * 0.9; r += (0.92 - r) * snow; g += (0.94 - g) * snow; b += (0.97 - b) * snow;
      if (f.leaf > 0.3) { r = 0.78; g = 0.36; b = 0.14; }
      if (f.lava > 0.4) { r = 0.22; g = 0.16; b = 0.15; }
      if (h < 2.4) { r = 0.82; g = 0.74; b = 0.58; }
      const shade = 0.72 + 0.5 * (n.x * -0.5 + n.y * 0.6 + n.z * -0.5);
      r *= shade; g *= shade; b *= shade;
    }
    img.data[i] = Math.min(255, r * 255); img.data[i + 1] = Math.min(255, g * 255); img.data[i + 2] = Math.min(255, b * 255); img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  ctx.strokeStyle = 'rgba(96,70,40,.85)'; ctx.lineWidth = 1.6;
  const m = (v) => (v + HALF) / (2 * HALF) * S;
  W.roads.forEach((s) => { ctx.beginPath(); ctx.moveTo(m(s[0]), m(s[1])); ctx.lineTo(m(s[2]), m(s[3])); ctx.stroke(); });
  W.mapCanvas = c;
}
function u_sm(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
