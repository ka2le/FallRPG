'use strict';
(function () {
  const U = G.U;
  const W = G.W;
  const BIOMES = W.BIOMES;

  let FLOWER_MATS = null;
  // ---------- vegetation placement ----------
  function placeVegetation() {
    const F = G.Flora; const rr = U.rng(4321); const STEP = 5.2;
    const N1 = new U.Simplex(1337), N7 = new U.Simplex(606);
    const nearVillage = (x, z, r) => G.VILLAGES.some(v => U.d2(x, z, v.x, v.z) < r) || G.BOSSES.some(b => U.d2(x, z, b.x, b.z) < 14);
    const autumn = [0xd8862a, 0xc85a22, 0xe0b040, 0xb8402a, 0x9aa040];
    for (let z = -W.HALF + 10; z < W.HALF - 10; z += STEP) for (let x = -W.HALF + 10; x < W.HALF - 10; x += STEP) {
      const px = x + (rr() - .5) * STEP * 0.9, pz = z + (rr() - .5) * STEP * 0.9;
      const h = W.heightAt(px, pz); if (h < -0.4) continue;
      const gi = W.gridIndex(px, pz); const b = BIOMES[W.DB[gi]]; const reg = G.REGIONS[W.DR[gi]].id;
      const r = rr(); const s = 0.75 + rr() * 0.6; const rot = rr() * 6.28;
      const ny = W.normals[gi * 3 + 1]; const slope = 1 - ny;
      if (nearVillage(px, pz, 50)) { if (r < 0.025 && h > 0.5 && !nearVillage(px, pz, 44)) F.add('bush', px, h, pz, s, rot, null); continue; }
      if (W.roads.length && r < 0.75 && W.roadDist(px, pz) < 5) continue;
      const fn = N1.n2(px * .012, pz * .012);
      if (h < 0.3) { if (b === 'swamp' || b === 'lakes' || b === 'grass') { if (r < 0.28 && h > -1.2) F.add('reed', px, h, pz, s, rot, null); } continue; }
      if (slope > 0.32) { if (r < (b === 'mountain' || b === 'snow' ? 0.1 : 0.06)) F.add(b === 'ash' ? 'darkrock' : b === 'desert' ? 'sandrock' : b === 'snow' ? 'snowrock' : 'rock', px, h - .4, pz, s * (1.4 + rr() * 1.8), rot, null, 0.8); continue; }
      const tintJ = (c, a) => { const col = new THREE.Color(c); const k = 1 - a / 2 + rr() * a; return col.multiplyScalar(k).getHex(); };
      switch (b) {
        case 'forest': {
          const dens = 0.44 + fn * 0.3;
          const aut = reg === 'elder' && rr() < 0.7;
          if (r < dens) { const k = rr(); if (k < 0.45) F.add('pine', px, h, pz, s * 1.1, rot, tintJ(0x4f8a48, 0.25)); else F.add('oak', px, h, pz, s * 1.05, rot, aut ? U.pick(autumn) : tintJ(0x5f9a40, 0.3)); }
          else if (r < dens + 0.06) F.add('bush', px, h, pz, s, rot, aut ? U.pick(autumn) : null);
          else if (r < dens + 0.2) F.add('fern', px, h, pz, s, rot, tintJ(0x6aa04a, 0.3));
          else if (r < dens + 0.215) F.add('mushroom', px, h, pz, s * 0.4, rot, null);
          else if (r < dens + 0.23) F.add('rock', px, h - .3, pz, s * 0.9, rot, null, 0.8);
          break;
        }
        case 'grass': case 'lakes': {
          const grove = fn > 0.35 ? 0.22 : 0;
          const bir = N7.n2(px * .01, pz * .01) > 0.3;
          if (r < 0.028 + grove) F.add(bir ? 'birch' : (rr() < 0.85 ? 'oak' : 'pine'), px, h, pz, s, rot, bir ? tintJ(0x9cc25a, 0.25) : tintJ(0x6fa24a, 0.3));
          else if (r < 0.055 + grove) F.add('bush', px, h, pz, s, rot, null);
          else if (r < 0.068 + grove) F.add('rock', px, h - .3, pz, s * 0.8, rot, null, 0.7);
          else if (b === 'lakes' && h < 3 && r < 0.09) F.add('willow', px, h, pz, s, rot, tintJ(0x8aa84a, 0.2));
          break;
        }
        case 'swamp':
          if (r < 0.1) F.add(rr() < 0.55 ? 'willow' : 'dead', px, h, pz, s, rot, tintJ(0x7a8a3a, 0.3));
          else if (r < 0.13) F.add('mushroom', px, h, pz, s * (0.5 + rr() * 0.6), rot, null);
          else if (r < 0.3) F.add('reed', px, h, pz, s, rot, null);
          else if (r < 0.36) F.add('fern', px, h, pz, s, rot, 0x7a8a40);
          break;
        case 'desert':
          if (h < 3.5 && r < 0.12) F.add('palm', px, h, pz, s, rot, null);
          else if (r < 0.016) F.add('cactus', px, h, pz, s, rot, null);
          else if (r < 0.03) F.add('sandrock', px, h - .3, pz, s * (0.8 + rr()), rot, null, 0.7);
          break;
        case 'mountain':
          if (h < 55 && r < 0.07 + Math.max(0, fn) * 0.15) F.add('pine', px, h, pz, s, rot, tintJ(0x4a7a44, 0.3));
          else if (r < 0.13) F.add('rock', px, h - .3, pz, s * (1 + rr() * 1.2), rot, null, 0.85);
          break;
        case 'snow':
          if (h < 85 && r < 0.09 + Math.max(0, fn) * 0.15) F.add('snowpine', px, h, pz, s * 1.1, rot, null);
          else if (r < 0.13) F.add('snowrock', px, h - .3, pz, s * (1 + rr()), rot, null, 0.85);
          break;
        case 'ash':
          if (r < 0.03) F.add('dead', px, h, pz, s, rot, null);
          else if (r < 0.09) F.add('darkrock', px, h - .3, pz, s * (1 + rr()), rot, null, 0.9);
          else if (r < 0.105) F.add('crystal', px, h, pz, s, rot, null);
          break;
        case 'barrow':
          if (r < 0.045) F.add('dead', px, h, pz, s, rot, null);
          else if (r < 0.08) F.add('tomb', px, h, pz, s, rot, null);
          else if (r < 0.1) F.add('rock', px, h - .3, pz, s, rot, null, 0.8);
          else if (r < 0.14) F.add('bush', px, h, pz, s * 0.8, rot, 0x6a7a4a);
          break;
      }
    }
  }

  // ---------- villages ----------
  W.npcs = []; W.interactables = []; W.chimneys = [];
  function buildVillages(scene) {
    FLOWER_MATS = [0xe04a6a, 0xf2d04a, 0xb86af0].map(c => new THREE.MeshLambertMaterial({ color: c }));
    const T = G.T.buildingTex;
    const M = k => new THREE.MeshLambertMaterial({ map: T[k] });
    const mats = { plaster: M('plaster'), wood: M('wood'), log: M('log'), sandstone: M('sandstone'), stone: M('stone'), roof: M('roof'), thatch: M('thatch'), moss: M('moss'), snowroof: M('snowroof'), darkstone: M('darkstone') };
    W.mats = mats;
    const door = new THREE.MeshLambertMaterial({ color: 0x3a2412 });
    W.windowMat = new THREE.MeshBasicMaterial({ color: 0xffd98a });
    const styles = {
      meadow: { wall: 'plaster', roof: 'roof' }, forest: { wall: 'log', roof: 'moss' }, swamp: { wall: 'wood', roof: 'thatch', stilts: true },
      desert: { wall: 'sandstone', roof: null }, snow: { wall: 'log', roof: 'snowroof' },
    };
    G.VILLAGES.forEach((v, vi) => {
      const st = styles[v.style]; const rr = U.rng(100 + vi);
      v.y = W.heightAt(v.x, v.z);
      const n = 8;
      for (let i = 0; i < n; i++) {
        const ang = i / n * Math.PI * 2 + rr() * 0.3; const rad = 27 + rr() * 9;
        const hx = v.x + Math.cos(ang) * rad, hz = v.z + Math.sin(ang) * rad;
        const w = 7 + rr() * 3, d = 6 + rr() * 2, h = 4.2 + rr() * 1.5;
        const gy = W.heightAt(hx, hz) - 0.3;
        const grp = new THREE.Group(); grp.position.set(hx, gy, hz);
        const face = Math.atan2(v.x - hx, v.z - hz); grp.rotation.y = face;
        const lift = st.stilts ? 1.6 : 0;
        const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats[st.wall]); walls.position.y = h / 2 + lift; grp.add(walls);
        if (st.stilts) for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.2, .25, 2.4, 5), mats.wood); p.position.set(sx * (w / 2 - .4), .9, sz * (d / 2 - .4)); grp.add(p); }
        if (st.roof) {
          const rh = 2.8 + rr() * 1.2; const roof = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), mats[st.roof]);
          roof.rotation.y = Math.PI / 4; roof.scale.set((w + 1.4) / Math.SQRT2, rh, (d + 1.4) / Math.SQRT2); roof.position.y = h + rh / 2 + lift; grp.add(roof);
        } else {
          const slab = new THREE.Mesh(new THREE.BoxGeometry(w + .6, .5, d + .6), mats.sandstone); slab.position.y = h + .25; grp.add(slab);
          if (rr() < 0.6) { const dome = new THREE.Mesh(new THREE.SphereGeometry(Math.min(w, d) * 0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: rr() < .5 ? 0x3a78b0 : 0xe8dcc0 })); dome.position.y = h + .5; grp.add(dome); }
        }
        const dr = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.5), door); dr.position.set(0, 1.25 + lift, d / 2 + 0.02); grp.add(dr);
        for (const sx of [-1, 1]) { const win = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), W.windowMat); win.position.set(sx * w * 0.28, h * 0.6 + lift, d / 2 + 0.02); grp.add(win); }
        if (st.roof && rr() < 0.8) { const ch = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.6, 0.8), mats.stone); ch.position.set(w * 0.25, h + lift + 1.6, -d * 0.15); grp.add(ch); W.chimneys.push({ grp, lx: w * 0.25, ly: h + lift + 3.0, lz: -d * 0.15 }); }
        // planks / beams accents
        const beam = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.3, 0.3), mats.wood); beam.position.set(0, h + lift, d / 2 + 0.1); grp.add(beam);
        const step = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 1.0), mats.stone); step.position.set(0, 0.2 + lift, d / 2 + 0.5); grp.add(step);
        // flower box under windows
        if (rr() < 0.7) for (const sx of [-1, 1]) { const fb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.35), mats.wood); fb.position.set(sx * w * 0.28, h * 0.6 + lift - 0.65, d / 2 + 0.2); grp.add(fb);
          const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), FLOWER_MATS[Math.floor(rr() * 3)]); fl.scale.set(2, 0.8, 0.9); fl.position.set(sx * w * 0.28, h * 0.6 + lift - 0.4, d / 2 + 0.22); grp.add(fl); }
        scene.add(grp);
        W.boxes.push({ x: hx, z: hz, c: Math.cos(-face), s: Math.sin(-face), hw: w / 2, hd: d / 2 });
        // props: barrels and crates near the door
        for (let k = 0; k < 2; k++) if (rr() < 0.6) {
          const ox = (k ? 1 : -1) * (w / 2 + 0.9), oz = d / 2 - 0.5; const px = hx + Math.cos(face) * ox + Math.sin(face) * oz, pz = hz - Math.sin(face) * ox + Math.cos(face) * oz;
          const barrel = rr() < 0.5; const m = new THREE.Mesh(barrel ? new THREE.CylinderGeometry(0.45, 0.4, 1.0, 10) : new THREE.BoxGeometry(0.9, 0.9, 0.9), mats.wood);
          m.position.set(px, W.heightAt(px, pz) + 0.48, pz); m.rotation.y = rr() * 3; scene.add(m); W.addCollider(px, pz, 0.6);
        }
      }
      // fence posts ring with gaps at roads
      for (let k = 0; k < 64; k++) {
        const a = k / 64 * Math.PI * 2; const fx = v.x + Math.cos(a) * 52, fz = v.z + Math.sin(a) * 52;
        if (W.roadDist(fx, fz) < 7 || k % 8 === 0) continue;
        const fy = W.heightAt(fx, fz); if (fy < 0.3) continue;
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.3, 0.18), mats.wood); post.position.set(fx, fy + 0.6, fz); scene.add(post);
        const a2 = (k + 1) / 64 * Math.PI * 2; const nx = v.x + Math.cos(a2) * 52, nz = v.z + Math.sin(a2) * 52; const len = U.d2(fx, fz, nx, nz);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.08), mats.wood); rail.position.set((fx + nx) / 2, (fy + W.heightAt(nx, nz)) / 2 + 0.9, (fz + nz) / 2); rail.rotation.y = -Math.atan2(nz - fz, nx - fx); scene.add(rail);
      }
      // central well / fountain
      const well = new THREE.Group(); well.position.set(v.x, v.y, v.z);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 1.2, 12, 1, true), mats.stone); ring.position.y = .6; well.add(ring);
      const water = new THREE.Mesh(new THREE.CircleGeometry(2.1, 12), new THREE.MeshBasicMaterial({ color: 0x2a6f8f })); water.rotation.x = -Math.PI / 2; water.position.y = .9; well.add(water);
      for (const sx of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(.3, 3.2, .3), mats.wood); post.position.set(sx * 2, 1.6, 0); well.add(post); }
      const wr = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.4, 4), mats[st.roof || 'wood']); wr.rotation.y = Math.PI / 4; wr.position.y = 3.8; well.add(wr);
      scene.add(well); W.addCollider(v.x, v.z, 2.6);
      // lanterns
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * Math.PI * 2 + 0.4; const lx = v.x + Math.cos(a) * 16, lz = v.z + Math.sin(a) * 16; const ly = W.heightAt(lx, lz);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(.1, .12, 3.2, 5), mats.wood); pole.position.set(lx, ly + 1.6, lz); scene.add(pole);
        const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.T.glow(), color: 0xffc46a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        lamp.position.set(lx, ly + 3.3, lz); lamp.scale.set(2.2, 2.2, 1); scene.add(lamp);
      }
      // NPCs
      const vnpcs = G.NPCS.filter(n => n.village === v.id);
      vnpcs.forEach((nd, i) => {
        const a = i / vnpcs.length * Math.PI * 2 + 0.3; const nx = v.x + Math.cos(a) * 9, nz = v.z + Math.sin(a) * 9; const ny = W.heightAt(nx, nz);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.Art ? G.Art.npc(nd) : G.T.emoji(nd.e), transparent: true, alphaTest: 0.1 }));
        sp.scale.set(2.9, 2.9, 1); sp.position.set(nx, ny + 1.4, nz); scene.add(sp);
        const label = G.T.textSprite(nd.name, nd.shop ? '#9fd3ff' : '#f6e7b0', null);
        label.position.set(nx, ny + 3.4, nz); scene.add(label);
        const npc = { def: nd, x: nx, z: nz, y: ny, sprite: sp, label, marker: null, bob: Math.random() * 6 };
        W.npcs.push(npc); W.addCollider(nx, nz, 0.8);
      });
    });
  }
  W.refreshNpcMarkers = function () {
    W.npcs.forEach(n => {
      const m = G.Quests ? G.Quests.markerFor(n.def.id) : null;
      if (m !== n.marker) { n.marker = m; G.T.drawText(n.label.userData.canvas, n.def.name, n.def.shop ? '#9fd3ff' : '#f6e7b0', m); n.label.userData.tex.needsUpdate = true; }
    });
  };

  // ---------- chests, shrines, camps ----------
  W.chests = []; W.shrines = []; W.camps = []; W.fires = [];
  function landPoint(rr, minD, tries) {
    for (let t = 0; t < (tries || 40); t++) {
      const a = rr() * Math.PI * 2, r = Math.sqrt(rr()) * 900; const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const h = W.heightAt(x, z); if (h < 0.6) continue;
      if (G.VILLAGES.some(v => U.d2(x, z, v.x, v.z) < minD)) continue;
      return { x, z, h };
    }
    return null;
  }
  function makeChestMesh() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, .8, .95), W.mats.wood); body.position.y = .4; g.add(body);
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.45, .12, 1.0), new THREE.MeshLambertMaterial({ color: 0xc9a24a })); band.position.y = .7; g.add(band);
    const lidPivot = new THREE.Group(); lidPivot.position.set(0, .8, -.475); g.add(lidPivot);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.4, .35, .95), W.mats.wood); lid.position.set(0, .175, .475); lidPivot.add(lid);
    const lock = new THREE.Mesh(new THREE.BoxGeometry(.25, .3, .1), new THREE.MeshLambertMaterial({ color: 0xe0c060 })); lock.position.set(0, .05, .96); lidPivot.add(lock);
    g.userData.lid = lidPivot;
    return g;
  }
  function buildPOIs(scene) {
    const rr = U.rng(909);
    // chests
    for (let i = 0; i < 90; i++) {
      const p = landPoint(rr, 70); if (!p) continue;
      if (W.chests.some(c => U.d2(c.x, c.z, p.x, p.z) < 50)) continue;
      const mesh = makeChestMesh(); mesh.position.set(p.x, p.h, p.z); mesh.rotation.y = rr() * 6.28; scene.add(mesh);
      W.chests.push({ id: 'c' + W.chests.length, x: p.x, z: p.z, y: p.h, mesh, level: W.zoneLevel(p.x, p.z), opened: false });
    }
    G.BOSSES.forEach(b => {
      const x = b.x + 6, z = b.z + 4, h = W.heightAt(x, z);
      const mesh = makeChestMesh(); mesh.scale.setScalar(1.3); mesh.position.set(x, h, z); scene.add(mesh);
      W.chests.push({ id: 'cb_' + b.id, x, z, y: h, mesh, level: b.level + 1, opened: false, boss: true });
    });
    // shrines
    G.SHRINES.forEach((s, i) => {
      const h = W.heightAt(s.x, s.z);
      const g = new THREE.Group(); g.position.set(s.x, h, s.z);
      for (let k = 0; k < 4; k++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.35, .45, 4, 6), W.mats.stone); p.position.set(Math.cos(k * 1.57) * 2.4, 2, Math.sin(k * 1.57) * 2.4); g.add(p); }
      const base = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.5, .4, 8), W.mats.stone); base.position.y = .2; g.add(base);
      const orb = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.T.glow(), color: 0x7fd4ff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      orb.scale.set(2.5, 2.5, 1); orb.position.y = 2.6; g.add(orb);
      scene.add(g);
      W.shrines.push({ id: 's' + i, x: s.x, z: s.z, y: h, stat: s.stat, orb, used: false });
    });
    // boss lairs: ruined pillars
    G.BOSSES.forEach(b => {
      const h = W.heightAt(b.x, b.z); const big = b.id === 'malgrath';
      const n = big ? 10 : 6, rad = big ? 28 : 13;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2; const px = b.x + Math.cos(a) * rad, pz = b.z + Math.sin(a) * rad;
        const ph = (big ? 12 : 4) + Math.random() * (big ? 10 : 3);
        const p = new THREE.Mesh(big ? new THREE.CylinderGeometry(1.4, 2, ph, 6) : new THREE.BoxGeometry(1, ph, 1), big ? W.mats.darkstone : W.mats.stone);
        p.position.set(px, W.heightAt(px, pz) + ph / 2 - .3, pz); p.rotation.y = a; scene.add(p);
        W.addCollider(px, pz, big ? 1.8 : 0.9);
        if (big) { const sp = new THREE.Mesh(new THREE.ConeGeometry(1.5, 4, 6), W.mats.darkstone); sp.position.set(px, W.heightAt(px, pz) + ph + 1.7, pz); scene.add(sp); }
      }
    });
    // camps
    for (let i = 0; i < 520 && W.camps.length < 230; i++) {
      const p = landPoint(rr, 95); if (!p) continue;
      if (W.camps.some(c => U.d2(c.x, c.z, p.x, p.z) < 34)) continue;
      if (G.BOSSES.some(b => U.d2(b.x, b.z, p.x, p.z) < 45)) continue;
      if (G.SHRINES.some(s => U.d2(s.x, s.z, p.x, p.z) < 20)) continue;
      const reg = W.regionAt(p.x, p.z); const lvl = W.zoneLevel(p.x, p.z);
      const pool = reg.mons.filter(m => G.MONSTERS[m].minLv <= lvl);
      const main = U.pick(pool.length ? pool : reg.mons.slice(0, 2));
      const types = [main]; if (rr() < 0.4) types.push(U.pick(pool));
      const count = 3 + Math.floor(rr() * 3) + (lvl > 15 ? 1 : 0);
      const camp = { id: 'k' + W.camps.length, x: p.x, z: p.z, level: lvl, types, count, eliteChance: 0.12 + lvl * 0.004, monsters: [], spawned: false, respawnAt: 0, region: reg.id };
      W.camps.push(camp);
      if (types.some(t => ['goblin', 'slinger', 'brigand', 'hexer', 'ogre', 'ogremage', 'skeleton'].includes(t))) addCampfire(scene, p.x + 3, p.z + 2);
    }
    G.BOSSES.forEach(b => {
      W.camps.push({ id: 'b_' + b.id, x: b.x, z: b.z, level: b.level, boss: b, types: [b.mon], count: 0, monsters: [], spawned: false, respawnAt: 0 });
    });
  }
  function addCampfire(scene, x, z) {
    const y = W.heightAt(x, z);
    for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 1.4, 5), W.mats.wood); l.rotation.z = Math.PI / 2; l.rotation.y = i * 1.05; l.position.set(x, y + .15, z); scene.add(l); }
    const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.T.glow(), color: 0xff8a2a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    f.position.set(x, y + .9, z); f.scale.set(2.2, 2.6, 1); scene.add(f);
    const tent = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3, 4), new THREE.MeshLambertMaterial({ color: 0x8a6a4a })); tent.position.set(x - 4, W.heightAt(x - 4, z - 3) + 1.4, z - 3); scene.add(tent);
    W.addCollider(x - 4, z - 3, 1.8);
    W.fires.push({ sprite: f, x, y, z });
  }

  // ---------- minimap canvas ----------
  function buildMap() {
    const S = 512; const c = document.createElement('canvas'); c.width = c.height = S; const ctx = c.getContext('2d');
    const img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const wx = -W.HALF + (x + .5) / S * 2 * W.HALF, wz = -W.HALF + (y + .5) / S * 2 * W.HALF;
      const h = W.heightAt(wx, wz); const gi = W.gridIndex(wx, wz); const i = (y * S + x) * 4;
      let r, g, b;
      if (h < 0) {
        const lava = W.lavaAt(wx, wz); const d = U.clamp(-h / 20, 0, 1);
        if (lava) { r = 0.9; g = 0.35; b = 0.05; } else { r = 0.12 - d * 0.06; g = 0.35 - d * 0.15; b = 0.55 - d * 0.15; }
      } else { r = W.mapCol[gi * 3]; g = W.mapCol[gi * 3 + 1]; b = W.mapCol[gi * 3 + 2]; }
      img.data[i] = U.clamp(r * 255, 0, 255); img.data[i + 1] = U.clamp(g * 255, 0, 255); img.data[i + 2] = U.clamp(b * 255, 0, 255); img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    // roads
    ctx.strokeStyle = 'rgba(120,90,55,.8)'; ctx.lineWidth = 1.5;
    W.roads.forEach(s => { ctx.beginPath(); ctx.moveTo((s[0] + W.HALF) / (2 * W.HALF) * S, (s[1] + W.HALF) / (2 * W.HALF) * S); ctx.lineTo((s[2] + W.HALF) / (2 * W.HALF) * S, (s[3] + W.HALF) / (2 * W.HALF) * S); ctx.stroke(); });
    W.mapCanvas = c;
  }

  W.init = function (scene, progress) {
    W.initTerrain(scene, progress);
    G.T.makeBuildingTextures();
    progress && progress('Building villages');
    const from = scene.children.length;
    buildVillages(scene);
    const v = new THREE.Vector3();
    W.chimneys = W.chimneys.map(c => { c.grp.updateMatrixWorld(true); v.set(c.lx, c.ly, c.lz); c.grp.localToWorld(v); return { x: v.x, y: v.y, z: v.z }; });
    batchStatic(scene, from);
    progress && progress('Growing forests');
    placeVegetation();
    buildPOIs(scene);
    for (const c of W.camps) G.Flora.clearAround(c.x, c.z, c.boss ? 26 : 16);
    for (const s of W.shrines) G.Flora.clearAround(s.x, s.z, 7);
    for (const c of W.chests) G.Flora.clearAround(c.x, c.z, 3);
    G.Flora.build(scene);
    buildMap();
  };

  // merge static village meshes per material to keep draw calls low
  function batchStatic(scene, from) {
    const added = scene.children.slice(from); const byMat = new Map(); const kill = [];
    for (const top of added) {
      if (top.isSprite || top.userData.dyn) continue;
      top.updateMatrixWorld(true);
      let ok = true; const ms = [];
      top.traverse(o => { if (o.isSprite || o.isPoints || o.isLine || o.isLight || o.isInstancedMesh) ok = false; else if (o.isMesh) { if (Array.isArray(o.material)) ok = false; ms.push(o); } });
      if (!ok || !ms.length) continue;
      for (const m of ms) { const g = m.geometry.index ? m.geometry.clone() : m.geometry.clone(); g.applyMatrix4(m.matrixWorld); const k = m.material.uuid; if (!byMat.has(k)) byMat.set(k, { mat: m.material, geos: [] }); byMat.get(k).geos.push(g); }
      kill.push(top);
    }
    kill.forEach(o => scene.remove(o));
    byMat.forEach(e => { const mesh = new THREE.Mesh(G.Flora.mergeGeos(e.geos), e.mat); mesh.matrixAutoUpdate = false; scene.add(mesh); });
    W.batchInfo = { merged: kill.length, meshes: byMat.size };
  }

  let smokeT = 0;
  W.update = function (dt, cam, now) {
    W.terrainUniforms.time.value = now;
    W.waterUniforms.camPos.value.copy(cam.position);
    W.sky.position.copy(cam.position);
    G.Flora.update(dt, cam, now);
    const px = cam.position.x, pz = cam.position.z;
    for (const n of W.npcs) {
      const d = U.d2(px, pz, n.x, n.z); n.label.visible = d < 60;
      n.sprite.position.y = n.y + 1.4 + Math.sin(now * 2 + n.bob) * 0.06;
    }
    for (const f of W.fires) { const k = 1 + Math.sin(now * 13 + f.x) * 0.12 + Math.sin(now * 7.3) * 0.08; f.sprite.scale.set(2.2 * k, 2.8 * k, 1); if (G.FX && Math.random() < dt * 8 && U.d2(px, pz, f.x, f.z) < 80) G.FX.spawn(f.x + (Math.random() - .5) * .4, f.y + 0.9, f.z + (Math.random() - .5) * .4, 0, 2 + Math.random(), 0, 0.8, 0.5, 0xffa040, -1, 0.5, -0.4); }
    for (const s of W.shrines) { s.orb.position.y = 2.6 + Math.sin(now * 1.5 + s.x) * 0.3; s.orb.material.color.setHex(s.used ? 0x555555 : 0x7fd4ff); }
    smokeT -= dt;
    if (smokeT <= 0 && G.FX) {
      smokeT = 0.12;
      for (const c of W.chimneys) { if (U.d2(px, pz, c.x, c.z) < 140) G.FX.smoke(c.x, c.y, c.z); }
    }
  };
})();
