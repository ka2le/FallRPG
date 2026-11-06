'use strict';
(function () {
  const U = G.U;
  const W = G.W = {};
  W.HALF = 1100; W.SEG = 448; W.CELL = 2 * W.HALF / W.SEG;
  const V = W.SEG + 1; W.V = V;
  const N1 = new U.Simplex(1337), N2 = new U.Simplex(4242), N3 = new U.Simplex(777), N4 = new U.Simplex(99), N5 = new U.Simplex(2024), N6 = new U.Simplex(31337);
  const REG = G.REGIONS, NR = REG.length;
  const BIOMES = ['grass', 'lakes', 'forest', 'swamp', 'desert', 'mountain', 'snow', 'ash', 'barrow'];
  W.BIOMES = BIOMES;
  const BI = {}; BIOMES.forEach((b, i) => BI[b] = i);
  REG.forEach(r => r.bi = BI[r.biome]);
  const ws = new Float32Array(NR), bw = new Float32Array(BIOMES.length);
  let domRegion = 0;

  function regionWeights(x, z) {
    const wx = x + U.fbm(N2, x * .0025, z * .0025, 3) * 120, wz = z + U.fbm(N3, x * .0025 + 50, z * .0025, 3) * 120;
    let dmin = 1e9;
    for (let i = 0; i < NR; i++) { const dx = wx - REG[i].x, dz = wz - REG[i].z; const d = Math.sqrt(dx * dx + dz * dz); ws[i] = d; if (d < dmin) { dmin = d; domRegion = i; } }
    let sum = 0;
    for (let i = 0; i < NR; i++) { const w = Math.exp(-(ws[i] - dmin) / 38); ws[i] = w > 0.02 ? w : 0; sum += ws[i]; }
    bw.fill(0);
    for (let i = 0; i < NR; i++) { ws[i] /= sum; bw[REG[i].bi] += ws[i]; }
    return domRegion;
  }
  W.regionWeightsRaw = regionWeights;

  // ---- cellular noise ----
  let WID = 0;
  function hash2(i, j, s) { let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(s + 7, 2246822519); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function worley(x, z, s) {
    const ix = Math.floor(x), iz = Math.floor(z); let f1 = 9;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const cx = ix + a, cz = iz + b; const px = cx + 0.15 + hash2(cx, cz, s) * 0.7, pz = cz + 0.15 + hash2(cx, cz, s + 17) * 0.7;
      const d = Math.hypot(px - x, pz - z); if (d < f1) { f1 = d; WID = hash2(cx, cz, s + 31); }
    }
    return f1;
  }
  const terrace = (h, step, sharp) => { const q = h / step, f = q - Math.floor(q); return (Math.floor(q) + U.smooth(0.5 - sharp, 0.5 + sharp, f)) * step; };

  function biomeH(b, x, z) {
    switch (b) {
      case 0: { // meadows: rolling hills + mossy outcrops
        let h = 5 + U.fbm(N1, x * .004, z * .004, 4) * 10 + U.fbm(N4, x * .02, z * .02, 2) * 1.4;
        const o = U.fbm(N6, x * .006, z * .006, 2);
        if (o > 0.25) h += U.smooth(0.25, 0.5, o) * Math.pow(U.ridged(N5, x * .02, z * .02, 3), 2) * 10;
        return h;
      }
      case 1: { // lake basins
        let h = 4 + U.fbm(N1, x * .004, z * .004, 4) * 11 + U.fbm(N4, x * .02, z * .02, 2) * 1.2;
        const l = U.fbm(N6, x * .0055 + 3, z * .0055, 3);
        if (l > 0.1) h -= U.smooth(0.1, 0.38, l) * 20;
        return h;
      }
      case 2: { // forest hills with ravines
        let h = 8 + U.fbm(N1, x * .006, z * .006, 4) * 15;
        h -= Math.pow(1 - Math.abs(U.fbm(N5, x * .007, z * .007, 2)), 8) * 7;
        return h;
      }
      case 3: return 0.7 + U.fbm(N1, x * .011, z * .011, 3) * 2.6 + U.fbm(N4, x * .04, z * .04, 2) * 0.8;
      case 4: { // dunes + terraced mesas
        let h = 6 + U.fbm(N4, x * .003, z * .003, 2) * 8;
        const dn = x * .018 + z * .01 + U.fbm(N1, x * .005, z * .005, 2) * 5; const s = dn - Math.floor(dn);
        const du = s < 0.72 ? U.smooth(0, 0.72, s) : 1 - U.smooth(0.72, 1, s); h += du * du * 4.5;
        const m = U.fbm(N6, x * .0045, z * .0045, 3);
        if (m > 0.16) {
          const t = U.smooth(0.16, 0.26, m);
          const top = 22 + U.fbm(N5, x * .01, z * .01, 2) * 5;
          const mh = terrace(U.lerp(h, top, t), 5.5, 0.18);
          h = U.lerp(h, mh, Math.min(1, t * 1.6));
        }
        return h;
      }
      case 5: { // mountains: ridged + strata
        const r = U.ridged(N1, x * .0042, z * .0042, 6);
        let h = 6 + r * r * 125 - 16 + U.fbm(N4, x * .02, z * .02, 2) * 3;
        if (h > 12) h = U.lerp(h, terrace(h, 7, 0.3), 0.3);
        return h;
      }
      case 6: { const r = U.ridged(N2, x * .0036, z * .0036, 6); return 14 + Math.pow(r, 2.2) * 155 - 22; }
      case 7: { // volcanic: cones with lava-filled craters, lava channels
        let h = 3 + U.ridged(N3, x * .006, z * .006, 4) * 24 - 8 + U.fbm(N4, x * .02, z * .02, 2) * 4;
        const f = worley(x * .0042, z * .0042, 77); const big = 0.6 + WID * 0.7;
        const cone = Math.max(0, 1 - f / 0.5); h += Math.pow(cone, 1.7) * 58 * big;
        if (f < 0.11) { const c = 1 - f / 0.11; h -= Math.pow(c, 0.6) * (58 * big + 10) * U.smooth(0, 0.35, c); }
        const lc = Math.abs(U.fbm(N5, x * .004, z * .004, 2));
        if (lc < 0.04) h = U.lerp(h, -1.6, U.smooth(0.04, 0.014, lc));
        return h;
      }
      case 8: { // barrow downs: rolling with burial mounds
        let h = 7 + U.fbm(N1, x * .006, z * .006, 4) * 10;
        const f = worley(x * .022, z * .022, 91);
        if (WID < 0.55) { const m = Math.max(0, 1 - f / 0.34); h += (Math.sqrt(m) * 0.55 + m * 0.45) * 7.5; }
        return h;
      }
    }
    return 0;
  }
  function baseHeight(x, z) {
    regionWeights(x, z);
    const wx = x + U.fbm(N2, x * .0035 + 7, z * .0035, 2) * 22, wz = z + U.fbm(N3, x * .0035, z * .0035 + 7, 2) * 22;
    let h = 0;
    for (let b = 0; b < bw.length; b++) if (bw[b] > 0) h += bw[b] * biomeH(b, wx, wz);
    const allowed = bw[0] + bw[1] + bw[2] + bw[3] + bw[8];
    if (allowed > 0.05) {
      const rv = Math.abs(U.fbm(N5, x * .0018, z * .0018, 2) + N4.n2(x * .01, z * .01) * 0.04);
      if (rv < 0.04) { const t = U.smooth(0.04, 0.012, rv) * allowed; h = h + (Math.min(h, -2.4) - h) * t; }
    }
    const d = Math.sqrt(x * x + z * z);
    const edge = 1000 + U.fbm(N2, x * .0015 + 9, z * .0015, 3) * 70;
    if (d > edge - 110) { const t = U.smooth(edge - 110, edge + 30, d); h = U.lerp(h, -24, t); }
    return h;
  }

  // ---------- hydraulic erosion ----------
  function erode(H, drops, seed) {
    const rr = U.rng(seed);
    const inertia = .08, capF = 5, minCap = .002, erodeS = .35, depS = .3, evap = .025, grav = 6, life = 34, R = 2, K = 100;
    const bo = [], bwt = []; let wsum = 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const d = Math.hypot(dx, dy); if (d <= R) { const w = 1 - d / (R + 0.5); bo.push(dx + dy * V); bwt.push(w); wsum += w; } }
    for (let k = 0; k < bwt.length; k++) bwt[k] /= wsum;
    const h = new Float32Array(H.length); for (let i = 0; i < h.length; i++) h[i] = H[i] / K;
    const flow = new Float32Array(H.length);
    const lo = R + 1, hi = V - R - 2;
    for (let n = 0; n < drops; n++) {
      let px = lo + rr() * (hi - lo), pz = lo + rr() * (hi - lo), dx = 0, dz = 0, sp = 1, wat = 1, sed = 0;
      for (let l = 0; l < life; l++) {
        const ix = px | 0, iz = pz | 0, ox = px - ix, oz = pz - iz, idx = iz * V + ix;
        const h00 = h[idx], h10 = h[idx + 1], h01 = h[idx + V], h11 = h[idx + V + 1];
        const gx = (h10 - h00) * (1 - oz) + (h11 - h01) * oz, gz = (h01 - h00) * (1 - ox) + (h11 - h10) * ox;
        const hh = h00 * (1 - ox) * (1 - oz) + h10 * ox * (1 - oz) + h01 * (1 - ox) * oz + h11 * ox * oz;
        if (hh < 0.004) { // reached the sea / a lake: drop sediment and stop
          h[idx] += sed * 0.5; break;
        }
        dx = dx * inertia - gx * (1 - inertia); dz = dz * inertia - gz * (1 - inertia);
        const len = Math.hypot(dx, dz); if (len < 1e-7) break;
        dx /= len; dz /= len; px += dx; pz += dz;
        if (px < lo || px >= hi || pz < lo || pz >= hi) break;
        const jx = px | 0, jz = pz | 0, qx = px - jx, qz = pz - jz, j = jz * V + jx;
        const nh = h[j] * (1 - qx) * (1 - qz) + h[j + 1] * qx * (1 - qz) + h[j + V] * (1 - qx) * qz + h[j + V + 1] * qx * qz;
        const dh = nh - hh;
        const cap = Math.max(-dh * sp * wat * capF, minCap);
        if (sed > cap || dh > 0) {
          const dep = dh > 0 ? Math.min(dh, sed) : (sed - cap) * depS; sed -= dep;
          h[idx] += dep * (1 - ox) * (1 - oz); h[idx + 1] += dep * ox * (1 - oz); h[idx + V] += dep * (1 - ox) * oz; h[idx + V + 1] += dep * ox * oz;
        } else {
          const er = Math.min((cap - sed) * erodeS, -dh);
          for (let k = 0; k < bo.length; k++) h[idx + bo[k]] -= er * bwt[k];
          sed += er;
        }
        flow[idx] += wat;
        sp = Math.sqrt(Math.max(0, sp * sp - dh * grav)); wat *= 1 - evap;
      }
    }
    for (let i = 0; i < h.length; i++) H[i] = h[i] * K;
    return flow;
  }

  // ---------- queries ----------
  W.heightAt = function (x, z) {
    const gx = (x + W.HALF) / W.CELL, gz = (z + W.HALF) / W.CELL;
    let ix = Math.floor(gx), iz = Math.floor(gz);
    if (ix < 0 || iz < 0 || ix >= W.SEG || iz >= W.SEG) return -24;
    const fx = gx - ix, fz = gz - iz; const H = W.H;
    const h00 = H[iz * V + ix], h10 = H[iz * V + ix + 1], h01 = H[(iz + 1) * V + ix], h11 = H[(iz + 1) * V + ix + 1];
    if (fx + fz <= 1) return h00 + (h10 - h00) * fx + (h01 - h00) * fz;
    return h11 + (h01 - h11) * (1 - fx) + (h10 - h11) * (1 - fz);
  };
  W.normalAt = function (x, z, out) {
    const e = W.CELL;
    const hl = W.heightAt(x - e, z), hr = W.heightAt(x + e, z), hd = W.heightAt(x, z - e), hu = W.heightAt(x, z + e);
    return (out || new THREE.Vector3()).set(hl - hr, 2 * e, hd - hu).normalize();
  };
  W.gridIndex = function (x, z) {
    const ix = U.clamp(Math.round((x + W.HALF) / W.CELL), 0, W.SEG), iz = U.clamp(Math.round((z + W.HALF) / W.CELL), 0, W.SEG);
    return iz * V + ix;
  };
  W.regionAt = (x, z) => REG[W.DR[W.gridIndex(x, z)]];
  W.biomeAt = (x, z) => BIOMES[W.DB[W.gridIndex(x, z)]];
  W.zoneLevel = function (x, z) {
    const d = Math.sqrt(x * x + z * z);
    let l = 1 + 29 * Math.pow(d / 820, 2);
    if (W.biomeAt(x, z) === 'ash') l += 1.5;
    return U.clamp(Math.round(l), 1, 34);
  };
  W.isLava = function (x, z) { return W.biomeAt(x, z) === 'ash' || W.lavaAt(x, z); };
  W.raycast = function (o, dir, maxD) {
    let prev = 0; const step = 1.5;
    for (let t = step; t <= maxD; t += step) {
      const x = o.x + dir.x * t, y = o.y + dir.y * t, z = o.z + dir.z * t;
      const g = Math.max(W.heightAt(x, z), 0);
      if (y <= g) {
        let a = prev, b = t;
        for (let k = 0; k < 8; k++) { const m = (a + b) / 2; const yy = o.y + dir.y * m; if (yy <= Math.max(W.heightAt(o.x + dir.x * m, o.z + dir.z * m), 0)) b = m; else a = m; }
        return new THREE.Vector3(o.x + dir.x * b, o.y + dir.y * b, o.z + dir.z * b);
      }
      prev = t;
    }
    return null;
  };
  W.groundY = (x, z) => Math.max(W.heightAt(x, z), 0);

  // ---------- colliders ----------
  const colGrid = new Map(); const CG = 12;
  W.addCollider = function (x, z, r) {
    const k = Math.floor(x / CG) + ',' + Math.floor(z / CG);
    if (!colGrid.has(k)) colGrid.set(k, []);
    colGrid.get(k).push([x, z, r]);
  };
  W.boxes = [];
  W.collide = function (p, pr) {
    const cx = Math.floor(p.x / CG), cz = Math.floor(p.z / CG);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const arr = colGrid.get((cx + i) + ',' + (cz + j)); if (!arr) continue;
      for (const c of arr) {
        const dx = p.x - c[0], dz = p.z - c[1]; const rr = c[2] + pr; const d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2); p.x = c[0] + dx / d * rr; p.z = c[1] + dz / d * rr; }
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

  // ---------- roads ----------
  W.roads = [];
  W.buildRoads = function () {
    const vp = id => { const v = G.VILLAGES.find(v => v.id === id); return [v.x, v.z]; };
    const rp = id => { const r = REG.find(r => r.id === id); return [r.x, r.z]; };
    const paths = [
      [vp('brightwater'), vp('thornwood')], [vp('brightwater'), rp('lakes'), vp('sunspire')], [vp('thornwood'), vp('mirefen')],
      [vp('thornwood'), rp('crags'), vp('frosthold')], [vp('brightwater'), rp('elder')], [vp('sunspire'), rp('ash')], [vp('mirefen'), rp('blight')],
    ];
    const rr = U.rng(55);
    paths.forEach(path => {
      for (let s = 0; s < path.length - 1; s++) {
        const [ax, az] = path[s], [bx, bz] = path[s + 1];
        const L = U.d2(ax, az, bx, bz); const n = Math.ceil(L / 25);
        const nx = -(bz - az) / L, nz = (bx - ax) / L; let prev = null; const ph = rr() * 10;
        for (let i = 0; i <= n; i++) {
          const t = i / n; const off = Math.sin(t * Math.PI) * N3.n2(t * 3 + ph, ph) * 60;
          const p = [ax + (bx - ax) * t + nx * off, az + (bz - az) * t + nz * off];
          if (prev) W.roads.push([prev[0], prev[1], p[0], p[1]]);
          prev = p;
        }
      }
    });
  };
  function roadDist(x, z) {
    let best = 1e9;
    for (const s of W.roads) {
      const minx = Math.min(s[0], s[2]) - 8, maxx = Math.max(s[0], s[2]) + 8;
      if (x < minx || x > maxx) continue;
      const minz = Math.min(s[1], s[3]) - 8, maxz = Math.max(s[1], s[3]) + 8;
      if (z < minz || z > maxz) continue;
      const vx = s[2] - s[0], vz = s[3] - s[1]; const l2 = vx * vx + vz * vz;
      const t = U.clamp(((x - s[0]) * vx + (z - s[1]) * vz) / l2, 0, 1);
      const d = U.d2(x, z, s[0] + vx * t, s[1] + vz * t); if (d < best) best = d;
    }
    return best;
  }
  W.roadDist = roadDist;

  // ---------- terrain build ----------
  // splat layers: 0 grass,1 forest floor,2 sand,3 rock,4 snow,5 mud,6 ash,7 dirt
  const SPLAT_BIOME = [
    [.85, 0, 0, 0, 0, 0, 0, .15], [.72, .1, 0, 0, 0, 0, 0, .18], [.25, .75, 0, 0, 0, 0, 0, 0], [0, .25, 0, 0, 0, .75, 0, 0],
    [0, 0, .92, .03, 0, 0, 0, .05], [.2, 0, 0, .55, 0, 0, 0, .25], [0, 0, 0, .25, .75, 0, 0, 0], [0, 0, 0, .15, 0, 0, .85, 0], [.1, .3, 0, .2, 0, 0, 0, .4],
  ];
  const TEX_AVG = [[0.34, 0.54, 0.2], [0.24, 0.3, 0.13], [0.8, 0.7, 0.5], [0.45, 0.44, 0.41], [0.92, 0.94, 0.97], [0.26, 0.24, 0.15], [0.2, 0.17, 0.16], [0.46, 0.36, 0.26]];
  W.flats = [];

  function buildHeights(progress) {
    const H = W.H = new Float32Array(V * V); W.DR = new Uint8Array(V * V); W.DB = new Uint8Array(V * V);
    const BW = W.BW = new Float32Array(V * V * 9);
    for (let iz = 0; iz < V; iz++) for (let ix = 0; ix < V; ix++) {
      const x = -W.HALF + ix * W.CELL, z = -W.HALF + iz * W.CELL; const i = iz * V + ix;
      H[i] = baseHeight(x, z);
      W.DR[i] = domRegion;
      let best = 0; for (let b = 0; b < 9; b++) { BW[i * 9 + b] = bw[b]; if (bw[b] > bw[best]) best = b; }
      W.DB[i] = best;
    }
    progress && progress('Carving valleys');
    const flow = erode(H, G.mobile ? 70000 : 110000, 8080);
    // light smoothing of erosion noise
    const S = new Float32Array(H);
    for (let iz = 1; iz < V - 1; iz++) for (let ix = 1; ix < V - 1; ix++) {
      const i = iz * V + ix; S[i] = H[i] * 0.6 + (H[i - 1] + H[i + 1] + H[i - V] + H[i + V]) * 0.1;
    }
    H.set(S);
    W.flow = flow;
    // flats (villages, lairs, shrines) after erosion
    const hAt = (x, z) => H[W.gridIndex(x, z)];
    G.VILLAGES.forEach(v => W.flats.push({ x: v.x, z: v.z, r0: 46, r1: 82, h: Math.max(hAt(v.x, v.z), 3) }));
    G.BOSSES.forEach(b => W.flats.push({ x: b.x, z: b.z, r0: b.id === 'malgrath' ? 34 : 16, r1: b.id === 'malgrath' ? 60 : 34, h: Math.max(hAt(b.x, b.z), 2.4) }));
    G.SHRINES.forEach(s => W.flats.push({ x: s.x, z: s.z, r0: 5, r1: 12, h: Math.max(hAt(s.x, s.z), 1.6) }));
    for (const f of W.flats) {
      const r = Math.ceil(f.r1 / W.CELL) + 1; const cx = Math.round((f.x + W.HALF) / W.CELL), cz = Math.round((f.z + W.HALF) / W.CELL);
      for (let iz = cz - r; iz <= cz + r; iz++) for (let ix = cx - r; ix <= cx + r; ix++) {
        if (ix < 0 || iz < 0 || ix >= V || iz >= V) continue;
        const x = -W.HALF + ix * W.CELL, z = -W.HALF + iz * W.CELL; const d = U.d2(x, z, f.x, f.z);
        if (d < f.r1) { const t = U.smooth(f.r1, f.r0, d); const i = iz * V + ix; H[i] = U.lerp(H[i], f.h, t); flow[i] *= 1 - t; }
      }
    }
  }

  function buildTerrain(scene, progress) {
    buildHeights(progress);
    progress && progress('Painting the land');
    const H = W.H, BW = W.BW, flow = W.flow;
    const pos = new Float32Array(V * V * 3), nor = new Float32Array(V * V * 3), sa = new Float32Array(V * V * 4), sb = new Float32Array(V * V * 4), aux = new Float32Array(V * V * 2);
    W.mapCol = new Float32Array(V * V * 3);
    W.splat = new Float32Array(V * V * 8);
    const gmask = new Uint8Array(V * V * 4);
    const sp = new Float32Array(8);
    const N = (ix, iz) => H[U.clamp(iz, 0, W.SEG) * V + U.clamp(ix, 0, W.SEG)];
    for (let iz = 0; iz < V; iz++) for (let ix = 0; ix < V; ix++) {
      const i = iz * V + ix; const x = -W.HALF + ix * W.CELL, z = -W.HALF + iz * W.CELL; const h = H[i];
      pos[i * 3] = x; pos[i * 3 + 1] = h; pos[i * 3 + 2] = z;
      const hl = N(ix - 1, iz), hr = N(ix + 1, iz), hd = N(ix, iz - 1), hu = N(ix, iz + 1);
      let nx = hl - hr, ny = 2 * W.CELL, nz = hd - hu; const nl = Math.sqrt(nx * nx + ny * ny + nz * nz); nx /= nl; ny /= nl; nz /= nl;
      nor[i * 3] = nx; nor[i * 3 + 1] = ny; nor[i * 3 + 2] = nz;
      // curvature-based occlusion (valleys darker, ridges lighter)
      const ring = (N(ix - 2, iz) + N(ix + 2, iz) + N(ix, iz - 2) + N(ix, iz + 2) + N(ix - 2, iz - 2) + N(ix + 2, iz + 2) + N(ix - 2, iz + 2) + N(ix + 2, iz - 2)) / 8;
      const lap = ring - h;
      const ao = U.clamp(1 - lap * 0.09, 0.5, 1.12);
      const fl = U.clamp(Math.log(1 + flow[i]) / 4.5, 0, 1);
      aux[i * 2] = ao; aux[i * 2 + 1] = fl;
      sp.fill(0);
      for (let b = 0; b < 9; b++) { const w = BW[i * 9 + b]; if (w > 0) for (let k = 0; k < 8; k++) sp[k] += w * SPLAT_BIOME[b][k]; }
      const pn = N4.n2(x * .02, z * .02);
      if (pn > 0.45) { const t = (pn - 0.45) * 1.2; const g = sp[0] * t; sp[0] -= g; sp[7] += g * 0.6; sp[1] += g * 0.4; }
      // erosion gullies expose dirt/gravel
      const desert = BW[i * 9 + 4], snowB = BW[i * 9 + 6], ashB = BW[i * 9 + 7];
      if (fl > 0.25 && h > 1) { const t = U.smooth(0.25, 0.8, fl) * 0.55 * (1 - desert) * (1 - snowB); for (let k = 0; k < 8; k++) sp[k] *= (1 - t); sp[ashB > 0.5 ? 6 : 7] += t * 0.6; sp[3] += t * 0.4; }
      const slope = 1 - ny;
      const rock = U.smooth(0.2, 0.4, slope); for (let k = 0; k < 8; k++) sp[k] *= (1 - rock); sp[ashB > 0.5 ? 6 : 3] += rock * (ashB > 0.5 ? 0.35 : 1); if (ashB > 0.5) sp[3] += rock * 0.65;
      const snowy = U.smooth(58, 82, h) * Math.max(0, 1 - desert - ashB) * (1 - rock * 0.6); if (snowy > 0) { for (let k = 0; k < 8; k++) sp[k] *= (1 - snowy); sp[4] += snowy; }
      const swampish = BW[i * 9 + 3] + ashB;
      if (h < 1.8 && swampish < 0.5) { const t = U.smooth(1.8, 0.5, h) * (1 - swampish); for (let k = 0; k < 8; k++) sp[k] *= (1 - t); sp[2] += t; }
      let road = 0;
      if (W.roads.length) { const rd = roadDist(x, z); if (rd < 4.5 && h > 0.2) { road = U.smooth(4.5, 2, rd) * 0.9; for (let k = 0; k < 8; k++) sp[k] *= (1 - road); sp[7] += road; } }
      for (const v of G.VILLAGES) { const d = U.d2(x, z, v.x, v.z); if (d < 17) { const t = U.smooth(17, 10, d) * 0.85; for (let k = 0; k < 8; k++) sp[k] *= (1 - t); sp[7] += t; } }
      let s = 0; for (let k = 0; k < 8; k++) s += sp[k];
      for (let k = 0; k < 8; k++) W.splat[i * 8 + k] = sp[k] / s;
      for (let k = 0; k < 4; k++) { sa[i * 4 + k] = sp[k] / s; sb[i * 4 + k] = sp[k + 4] / s; }
      let r = 0, g = 0, bb = 0; for (let k = 0; k < 8; k++) { const w = sp[k] / s; r += TEX_AVG[k][0] * w; g += TEX_AVG[k][1] * w; bb += TEX_AVG[k][2] * w; }
      const shade = (0.75 + 0.35 * (nx * 0.5 + ny * 0.7 - nz * 0.3)) * (0.85 + 0.15 * ao);
      W.mapCol[i * 3] = r * shade; W.mapCol[i * 3 + 1] = g * shade; W.mapCol[i * 3 + 2] = bb * shade;
      // grass mask: density, dryness, flower chance
      const gdens = U.clamp((sp[0] * 1.15 + sp[1] * 0.55 + sp[5] * 0.45) / s - road * 1.5, 0, 1) * (h > 0.25 ? 1 : 0) * (1 - rock);
      const dry = U.clamp(desert * 1.6 + BW[i * 9 + 8] * 0.45 + BW[i * 9 + 5] * 0.3, 0, 1);
      gmask[i * 4] = gdens * 255; gmask[i * 4 + 1] = dry * 255; gmask[i * 4 + 2] = (BW[i * 9 + 3] + BW[i * 9 + 1] * 0.3) * 255; gmask[i * 4 + 3] = U.clamp(BW[i * 9] * 1.2 - 0.2 + BW[i * 9 + 1] * 0.3, 0, 1) * 255;
    }
    const idx = new Uint32Array(W.SEG * W.SEG * 6); let o = 0;
    for (let iz = 0; iz < W.SEG; iz++) for (let ix = 0; ix < W.SEG; ix++) {
      const a = iz * V + ix, b = (iz + 1) * V + ix, c = iz * V + ix + 1, d = (iz + 1) * V + ix + 1;
      idx[o++] = a; idx[o++] = b; idx[o++] = c; idx[o++] = b; idx[o++] = d; idx[o++] = c;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('splatA', new THREE.BufferAttribute(sa, 4));
    geo.setAttribute('splatB', new THREE.BufferAttribute(sb, 4));
    geo.setAttribute('aux', new THREE.BufferAttribute(aux, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeBoundingSphere();
    W.normals = nor;
    // textures shared with grass / water
    const hd = new Uint16Array(V * V); for (let i = 0; i < V * V; i++) hd[i] = THREE.DataUtils.toHalfFloat(H[i]);
    const ht = new THREE.DataTexture(hd, V, V, THREE.RedFormat, THREE.HalfFloatType); ht.magFilter = ht.minFilter = THREE.LinearFilter; ht.needsUpdate = true;
    W.hmapTex = ht;
    const gt = new THREE.DataTexture(gmask, V, V, THREE.RGBAFormat); gt.magFilter = gt.minFilter = THREE.LinearFilter; gt.needsUpdate = true;
    W.gmaskTex = gt;

    const tex = G.T.terrainTextures();
    const uni = {
      sunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3) }, sunCol: { value: new THREE.Color(1, 1, 1) }, ambCol: { value: new THREE.Color(.4, .4, .45) },
      fogColor: { value: new THREE.Color(0.7, 0.8, 0.9) }, fogNear: { value: 150 }, fogFar: { value: 560 }, time: { value: 0 }, underwater: { value: 0 },
    };
    tex.forEach((t, i) => uni['t' + i] = { value: t });
    W.terrainUniforms = uni;
    const mat = new THREE.ShaderMaterial({
      uniforms: uni, defines: G.mobile ? { LOWQ: 1 } : {},
      vertexShader: `attribute vec4 splatA; attribute vec4 splatB; attribute vec2 aux; varying vec4 vA; varying vec4 vB; varying vec2 vX; varying vec3 vN; varying vec3 vW; varying float vDepth;
        void main(){ vA=splatA; vB=splatB; vX=aux; vN=normal; vec4 wp=modelMatrix*vec4(position,1.0); vW=wp.xyz; vec4 mv=viewMatrix*wp; vDepth=-mv.z; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D t0,t1,t2,t3,t4,t5,t6,t7; uniform vec3 sunDir,sunCol,ambCol,fogColor; uniform float fogNear,fogFar,time,underwater;
        varying vec4 vA; varying vec4 vB; varying vec2 vX; varying vec3 vN; varying vec3 vW; varying float vDepth;
        vec3 tri(sampler2D t, vec3 p, vec3 w){ if(w.y>0.92) return texture2D(t,p.xz*0.07).rgb; return texture2D(t,p.zy*0.07).rgb*w.x + texture2D(t,p.xz*0.07).rgb*w.y + texture2D(t,p.xy*0.07).rgb*w.z; }
        vec3 samp(sampler2D t, vec2 uv, float far){ vec3 a=texture2D(t,uv).rgb;
        #ifndef LOWQ
        if(far>0.01){ vec3 b=texture2D(t,uv*0.23+vec2(0.37,0.11)).rgb; a=mix(a,b,far*0.55);}
        #endif
        return a; }
        void main(){ vec3 n=normalize(vN); vec2 uv=vW.xz*0.09; vec3 c=vec3(0.0);
          float far=smoothstep(25.0,140.0,vDepth);
          vec3 tw=pow(abs(n),vec3(4.0)); tw/=(tw.x+tw.y+tw.z);
          if(vA.x>0.01) c+=samp(t0,uv,far)*vA.x; if(vA.y>0.01) c+=samp(t1,uv,far)*vA.y;
          if(vA.z>0.01) c+=samp(t2,uv,far)*vA.z; if(vA.w>0.01) c+=tri(t3,vW,tw)*vA.w;
          if(vB.x>0.01) c+=samp(t4,uv,far)*vB.x; if(vB.y>0.01) c+=samp(t5,uv,far)*vB.y;
          if(vB.z>0.01) c+=tri(t6,vW,tw)*vB.z; if(vB.w>0.01) c+=samp(t7,uv,far)*vB.w;
          float macro=texture2D(t3,vW.xz*0.0043).r; c*=0.82+macro*0.4;
          float ao=mix(vX.x,1.0,vA.z*0.65); float fl=vX.y*(1.0-vA.z);
          c*=mix(1.0,0.78,fl*(1.0-vB.x));
          float dif=max(dot(n,sunDir),0.0);
          float sky=0.55+0.45*n.y;
          vec3 col=c*(ambCol*sky*1.15*ao+sunCol*dif*mix(0.75,1.0,ao));
          if(vW.y<0.2){ float d=clamp(-vW.y/7.0,0.0,1.0); col=mix(col,col*vec3(0.45,0.66,0.72),smoothstep(0.2,-0.6,vW.y));
            float cs=sin(vW.x*0.9+time*1.7+sin(vW.z*0.7+time))*sin(vW.z*0.8-time*1.3+sin(vW.x*0.6)); col+=vec3(0.5,0.7,0.75)*pow(max(cs,0.0),6.0)*0.35*(1.0-d)*sunCol; col*=1.0-d*0.55; }
          float f=smoothstep(fogNear,fogFar,vDepth); gl_FragColor=vec4(mix(col,fogColor,f),1.0); }`,
    });
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false;
    scene.add(mesh); W.terrain = mesh;
  }

  // ---------- water ----------
  function buildWater(scene) {
    const S = 256; const data = new Uint8Array(S * S * 4);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const wx = -W.HALF + (x + .5) / S * 2 * W.HALF, wz = -W.HALF + (y + .5) / S * 2 * W.HALF;
      regionWeights(wx, wz); const i = (y * S + x) * 4; const ef = U.smooth(985, 930, Math.sqrt(wx * wx + wz * wz));
      data[i] = Math.min(255, bw[7] * 300 * ef); data[i + 1] = Math.min(255, (bw[3] + bw[8] * 0.5) * 255 * ef); data[i + 2] = 0; data[i + 3] = 255;
    }
    const mt = new THREE.DataTexture(data, S, S, THREE.RGBAFormat); mt.magFilter = THREE.LinearFilter; mt.minFilter = THREE.LinearFilter; mt.needsUpdate = true;
    const T = W.terrainUniforms;
    const uni = { time: T.time, mask: { value: mt }, hmap: { value: W.hmapTex }, sunDir: T.sunDir, sunCol: T.sunCol, ambCol: T.ambCol,
      fogColor: T.fogColor, fogNear: T.fogNear, fogFar: T.fogFar, skyCol: { value: new THREE.Color(0.6, 0.75, 0.9) }, camPos: { value: new THREE.Vector3() }, noiseTex: { value: G.T.waterNoise() } };
    W.waterUniforms = uni;
    const geo = new THREE.PlaneGeometry(2 * W.HALF + 1600, 2 * W.HALF + 1600, 1, 1); geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      uniforms: uni, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: `varying vec3 vW; varying float vDepth; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vW=wp.xyz; vec4 mv=viewMatrix*wp; vDepth=-mv.z; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform float time; uniform sampler2D mask,hmap,noiseTex; uniform vec3 sunDir,sunCol,ambCol,fogColor,skyCol,camPos; uniform float fogNear,fogFar; varying vec3 vW; varying float vDepth;
        void main(){ vec2 p=vW.xz; float t=time; vec4 m=texture2D(mask,(p+1100.0)/2200.0);
          vec2 huv=((p+1100.0)/${W.CELL.toFixed(6)}+0.5)/${V}.0; float th=texture2D(hmap,huv).r;
          bool inside=abs(p.x)<1099.0&&abs(p.y)<1099.0; float depth=inside? -th : 30.0;
          vec2 n1=texture2D(noiseTex,p*0.018+vec2(t*0.012,t*0.008)).rg-0.5; vec2 n2=texture2D(noiseTex,p*0.043-vec2(t*0.02,-t*0.013)).rg-0.5; vec2 n3=texture2D(noiseTex,p*0.11+vec2(-t*0.03,t*0.025)).rg-0.5;
          vec3 n=normalize(vec3((n1.x+n2.x*0.7+n3.x*0.35)*0.55,1.0,(n1.y+n2.y*0.7+n3.y*0.35)*0.55));
          vec3 v=normalize(camPos-vW);
          if(!gl_FrontFacing){ // seen from below
            vec3 uc=vec3(0.08,0.3,0.36)*(ambCol*1.4+sunCol*0.6); float sn=pow(max(dot(-v,sunDir),0.0),30.0);
            uc+=sunCol*sn*0.5+vec3(0.3,0.5,0.55)*pow(max(n1.x+n2.y+0.6,0.0),3.0)*0.12;
            gl_FragColor=vec4(uc,0.94); return; }
          float fres=0.04+0.96*pow(1.0-max(dot(n,v),0.0),5.0);
          float dd=smoothstep(0.0,7.0,depth);
          vec3 shallow=vec3(0.16,0.55,0.55), deep=vec3(0.03,0.16,0.3);
          vec3 col=mix(shallow,deep,dd)*(ambCol*1.25+sunCol*0.45);
          vec3 refl=mix(skyCol,skyCol*1.15+0.05,0.5);
          col=mix(col,refl,fres*0.8);
          vec3 h=normalize(sunDir+v); col+=sunCol*pow(max(dot(n,h),0.0),220.0)*1.4;
          float foamL=1.0-smoothstep(0.0,0.9,depth);
          float fn=texture2D(noiseTex,p*0.08+vec2(t*0.04,0.0)).b;
          float foam=foamL*smoothstep(0.35,0.75,fn+0.35*sin(depth*9.0-t*2.2));
          col=mix(col,vec3(0.92,0.96,0.97)*(ambCol+sunCol*0.8),foam*0.75);
          float alpha=mix(0.28,0.93,smoothstep(0.0,3.5,depth))+foam*0.4;
          float sw=m.g; col=mix(col,vec3(0.14,0.17,0.07)*(ambCol*1.3+sunCol*0.6)+fres*0.08,sw*0.8); alpha=max(alpha,sw*0.8);
          float lv=smoothstep(0.35,0.6,m.r);
          float ln=texture2D(noiseTex,p*0.03+vec2(t*0.01,t*0.006)).r; float ln2=texture2D(noiseTex,p*0.09-vec2(t*0.015,0.0)).g;
          vec3 lava=mix(vec3(0.55,0.08,0.02),vec3(1.0,0.62,0.12),smoothstep(0.3,0.8,ln*0.7+ln2*0.5));
          lava+=vec3(1.0,0.85,0.4)*pow(ln2,6.0)*1.5;
          col=mix(col,lava,lv); alpha=mix(alpha,1.0,lv);
          if(!inside) alpha=0.97;
          float f=smoothstep(fogNear,fogFar,vDepth); gl_FragColor=vec4(mix(col,fogColor,f),clamp(alpha,0.0,1.0)); }`,
    });
    const mesh = new THREE.Mesh(geo, mat); mesh.position.y = 0; mesh.renderOrder = 2; mesh.frustumCulled = false;
    scene.add(mesh); W.water = mesh;
    W.lavaMask = data;
  }
  W.lavaAt = function (x, z) {
    const S = 256; const px = Math.floor((x + W.HALF) / (2 * W.HALF) * S), py = Math.floor((z + W.HALF) / (2 * W.HALF) * S);
    if (px < 0 || py < 0 || px >= S || py >= S) return false;
    return W.lavaMask[(py * S + px) * 4] > 130;
  };

  // ---------- sky with clouds ----------
  function buildSky(scene) {
    const uni = { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, sunCol: { value: new THREE.Color(1, .95, .8) }, night: { value: 0 }, realSun: { value: new THREE.Vector3(0, 1, 0) }, time: W.terrainUniforms.time };
    W.skyUniforms = uni;
    const mat = new THREE.ShaderMaterial({
      uniforms: uni, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir=position; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 top,horizon,sunCol,realSun; uniform float night,time; varying vec3 vDir;
        float hsh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hsh(i),hsh(i+vec2(1,0)),f.x),mix(hsh(i+vec2(0,1)),hsh(i+vec2(1,1)),f.x),f.y); }
        float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return s; }
        void main(){ vec3 d=normalize(vDir); float h=d.y;
          vec3 col=mix(horizon,top,smoothstep(0.0,0.45,max(h,0.0)));
          if(h<0.0) col=mix(horizon,horizon*0.7,smoothstep(0.0,-0.3,h));
          float s=max(dot(d,realSun),0.0); col+=sunCol*(pow(s,700.0)*2.5+pow(s,10.0)*0.22)*(1.0-night);
          float mo=max(dot(d,-realSun),0.0); col+=vec3(0.85,0.9,1.0)*pow(mo,1500.0)*1.6*night;
          vec3 q=floor(d*260.0); float st=fract(sin(dot(q,vec3(12.9898,78.233,37.719)))*43758.5453);
          col+=vec3(step(0.9982,st))*night*smoothstep(0.0,0.25,h)*0.9;
          if(h>0.0){
            vec2 uv=d.xz/(h+0.18)*1.4+vec2(time*0.006,time*0.002);
            float c=fbm(uv*1.3); float c2=fbm(uv*2.6+3.0);
            float cov=smoothstep(0.48,0.78,c*0.8+c2*0.3)*smoothstep(0.0,0.18,h);
            float lit=0.65+0.55*smoothstep(0.3,0.9,fbm(uv*1.3+realSun.xz*0.25)-c*0.3);
            vec3 cc=mix(vec3(0.62,0.66,0.74),vec3(1.0),lit)*mix(vec3(0.12,0.14,0.2),vec3(1.0),1.0-night);
            cc=mix(cc,sunCol*1.1,pow(s,6.0)*0.5*(1.0-night));
            col=mix(col,cc,cov*0.88);
          }
          gl_FragColor=vec4(col,1.0); }`,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), mat);
    sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky); W.sky = sky;
  }

  W.time = 0.12; W.DAY_LEN = 1080;
  const cA = new THREE.Color(), cB = new THREE.Color();
  W.updateSky = function (dt, cam) {
    W.time = (W.time + dt / W.DAY_LEN) % 1;
    const ang = W.time * Math.PI * 2;
    const sun = new THREE.Vector3(Math.cos(ang) * 0.6, Math.sin(ang), Math.cos(ang) * 0.5 + 0.25).normalize();
    const elev = sun.y;
    const day = U.smooth(-0.12, 0.25, elev); const tw = U.clamp(1 - Math.abs(elev) * 3.5, 0, 1);
    const top = cA.setRGB(U.lerp(0.03, 0.22, day), U.lerp(0.05, 0.45, day), U.lerp(0.14, 0.82, day));
    W.skyUniforms.top.value.copy(top);
    const hor = cB.setRGB(U.lerp(0.09, 0.7, day), U.lerp(0.12, 0.8, day), U.lerp(0.22, 0.9, day));
    hor.lerp(new THREE.Color(0.95, 0.55, 0.3), tw * 0.55);
    W.skyUniforms.horizon.value.copy(hor);
    W.skyUniforms.night.value = 1 - day;
    W.skyUniforms.realSun.value.copy(sun);
    const light = elev > -0.05 ? sun : sun.clone().negate();
    W.terrainUniforms.sunDir.value.copy(light);
    const sc = W.terrainUniforms.sunCol.value;
    sc.setRGB(U.lerp(0.2, 1.05, day), U.lerp(0.24, 0.97, day), U.lerp(0.38, 0.86, day));
    sc.lerp(new THREE.Color(1.0, 0.6, 0.35), tw * 0.4 * day);
    W.skyUniforms.sunCol.value.copy(sc);
    W.terrainUniforms.ambCol.value.setRGB(U.lerp(0.2, 0.42, day), U.lerp(0.23, 0.45, day), U.lerp(0.34, 0.52, day));
    if (!W.underwater) W.terrainUniforms.fogColor.value.copy(hor);
    W.waterUniforms.skyCol.value.copy(hor).lerp(top, 0.4);
    if (W.scene.fog && !W.underwater) W.scene.fog.color.copy(hor);
    W.sunLight.position.copy(light).multiplyScalar(100);
    W.sunLight.color.copy(sc); W.sunLight.intensity = 1.0;
    W.hemi.color.copy(W.terrainUniforms.ambCol.value).multiplyScalar(1.6);
    W.hemi.groundColor.setRGB(0.25, 0.22, 0.18).multiplyScalar(0.5 + day * 0.5);
    W.hemi.intensity = 1.0;
    W.sky.position.copy(cam.position);
    W.isNight = day < 0.35; W.dayF = day;
    W.windowMat && (W.windowMat.color.setRGB(1, 0.85, 0.5).multiplyScalar(W.isNight ? 1.3 : 0.55));
  };

  W.initTerrain = function (scene, progress) {
    W.scene = scene;
    W.buildRoads();
    progress && progress('Raising mountains');
    buildTerrain(scene, progress);
    buildWater(scene);
    buildSky(scene);
    W.sunLight = new THREE.DirectionalLight(0xffffff, 1.0); scene.add(W.sunLight);
    W.hemi = new THREE.HemisphereLight(0xbfd4ff, 0x4a3a2a, 1.0); scene.add(W.hemi);
  };
})();
