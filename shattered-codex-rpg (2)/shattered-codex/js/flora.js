'use strict';
(function () {
  const U = G.U;
  const F = G.Flora = {};
  const V3 = THREE.Vector3;
  const windU = { value: 0 };
  F.windTime = windU;

  // ---------- geometry builder ----------
  function GB() { this.p = []; this.n = []; this.uv = []; this.c = []; this.i = []; }
  GB.prototype.vert = function (p, n, u, v, c) { this.p.push(p.x, p.y, p.z); this.n.push(n.x, n.y, n.z); this.uv.push(u, v); this.c.push(c.r, c.g, c.b); return this.p.length / 3 - 1; };
  // tube along polyline points with radii
  GB.prototype.tube = function (pts, rad, radial, col, uvScale, cap) {
    const base = this.p.length / 3; const tmp = new V3(), nrm = new V3(), bin = new V3();
    let prevN = null; let vAcc = 0;
    for (let k = 0; k < pts.length; k++) {
      const t = k < pts.length - 1 ? tmp.copy(pts[k + 1]).sub(pts[k]) : tmp.copy(pts[k]).sub(pts[k - 1]);
      if (k > 0) vAcc += pts[k].distanceTo(pts[k - 1]);
      t.normalize();
      if (!prevN) { nrm.set(0, 1, 0); if (Math.abs(t.y) > 0.9) nrm.set(1, 0, 0); nrm.cross(t).normalize(); prevN = nrm.clone(); }
      else { nrm.copy(prevN); nrm.sub(t.clone().multiplyScalar(nrm.dot(t))).normalize(); prevN.copy(nrm); }
      bin.copy(t).cross(nrm).normalize();
      for (let j = 0; j <= radial; j++) {
        const a = j / radial * Math.PI * 2; const ca = Math.cos(a), sa = Math.sin(a);
        const dir = new V3().copy(nrm).multiplyScalar(ca).addScaledVector(bin, sa);
        const cc = typeof col === 'function' ? col(k / (pts.length - 1)) : col;
        this.vert(new V3().copy(pts[k]).addScaledVector(dir, rad[k]), dir, j / radial * (uvScale || 1), vAcc * 0.25, cc);
      }
    }
    for (let k = 0; k < pts.length - 1; k++) for (let j = 0; j < radial; j++) {
      const a = base + k * (radial + 1) + j, b = a + radial + 1;
      this.i.push(a, b, a + 1, b, b + 1, a + 1);
    }
    if (cap) { const tip = pts[pts.length - 1]; const last = base + (pts.length - 1) * (radial + 1); const cc = typeof col === 'function' ? col(1) : col; const ti = this.vert(tip.clone().addScaledVector(tmp, rad[rad.length - 1] * 0.8), tmp.clone(), 0.5, 0, cc); for (let j = 0; j < radial; j++) this.i.push(last + j, last + j + 1, ti); }
  };
  // quad card. c = center, ax = half-width vector, ay = half-height vector, rect = [u0,v0,u1,v1], normal n
  GB.prototype.card = function (c, ax, ay, rect, n, col, bendY) {
    const b = this.p.length / 3;
    const [u0, v0, u1, v1] = rect;
    const P = (sx, sy) => new V3().copy(c).addScaledVector(ax, sx).addScaledVector(ay, sy).add(new V3(0, bendY && sy > 0 ? -bendY : 0, 0));
    this.vert(P(-1, -1), n, u0, v0, col); this.vert(P(1, -1), n, u1, v0, col); this.vert(P(1, 1), n, u1, v1, col); this.vert(P(-1, 1), n, u0, v1, col);
    this.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  // multi-segment drooping strip card (fronds, willow strands)
  GB.prototype.strip = function (pts, side, rect, col, normalFn) {
    const b = this.p.length / 3; const [u0, v0, u1, v1] = rect; const n = pts.length;
    for (let k = 0; k < n; k++) {
      const t = k / (n - 1); const nn = normalFn ? normalFn(pts[k]) : new V3(0, 1, 0);
      this.vert(new V3().copy(pts[k]).addScaledVector(side, -1), nn, u0, v0 + (v1 - v0) * t, col);
      this.vert(new V3().copy(pts[k]).addScaledVector(side, 1), nn, u1, v0 + (v1 - v0) * t, col);
    }
    for (let k = 0; k < n - 1; k++) { const a = b + k * 2; this.i.push(a, a + 1, a + 3, a, a + 3, a + 2); }
  };
  GB.prototype.build = function () {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.i); g.computeBoundingSphere();
    return g;
  };
  const Q = { broad: [0.01, 0.51, 0.49, 0.99], needle: [0.51, 0.51, 0.99, 0.99], frond: [0.01, 0.01, 0.49, 0.49], willow: [0.51, 0.01, 0.99, 0.49] };
  const C = (h) => new THREE.Color(h);
  const jit = (c, r, amt) => new THREE.Color(c.r * (1 - amt / 2 + r() * amt), c.g * (1 - amt / 2 + r() * amt), c.b * (1 - amt / 2 + r() * amt));

  function bend(r, start, dir, len, segs, wob, trop) {
    const pts = [start.clone()]; const d = dir.clone().normalize(); const p = start.clone(); const step = len / segs;
    for (let k = 0; k < segs; k++) {
      d.x += (r() - .5) * wob; d.z += (r() - .5) * wob; d.y += (r() - .5) * wob * 0.5 + (trop || 0); d.normalize();
      p.addScaledVector(d, step); pts.push(p.clone());
    }
    return pts;
  }
  function clusterCards(lb, r, pos, size, crown, rect, n) {
    for (let k = 0; k < (n || 3); k++) {
      const ax = new V3(r() - .5, (r() - .5) * 0.6, r() - .5).normalize().multiplyScalar(size * (0.8 + r() * 0.4));
      const ay = new V3().crossVectors(ax, new V3(r() - .5, r() - .5, r() - .5).normalize()).normalize().multiplyScalar(size * (0.8 + r() * 0.4));
      const c = pos.clone().add(new V3((r() - .5) * size * 0.6, (r() - .5) * size * 0.5, (r() - .5) * size * 0.6));
      const nn = c.clone().sub(crown).normalize(); nn.y = nn.y * 0.7 + 0.4; nn.normalize();
      const lum = 0.78 + r() * 0.35; const shade = 0.75 + 0.35 * U.clamp((c.y - crown.y) / (size * 2) + 0.5, 0, 1);
      lb.card(c, ax, ay, rect, nn, new THREE.Color(lum * shade, lum * shade * (0.95 + r() * 0.1), lum * shade * (0.9 + r() * 0.1)));
    }
  }

  // ---------- species generators: return { bark, leaf } geometries ----------
  function broadleaf(seed, o) {
    const r = U.rng(seed); const bb = new GB(), lb = new GB();
    const barkC = C(o.bark); const H = o.height * (0.85 + r() * 0.3);
    const tips = [];
    function grow(start, dir, len, rad, depth) {
      const segs = depth === 0 ? 5 : 3;
      const pts = bend(r, start, dir, len, segs, depth === 0 ? 0.18 : 0.45, depth === 0 ? 0.05 : (o.droop ? -0.08 : 0.06));
      const radii = pts.map((_, k) => rad * (1 - k / segs * 0.45));
      bb.tube(pts, radii, depth === 0 ? 7 : depth === 1 ? 5 : 4, (t) => jit(barkC, r, 0.1), 1);
      if (depth >= o.depth) { tips.push(pts[pts.length - 1]); if (depth > 1) tips.push(pts[Math.floor(pts.length / 2)]); return; }
      const nk = depth === 0 ? o.branches : 2 + (r() < 0.5 ? 1 : 0);
      for (let k = 0; k < nk; k++) {
        const t = depth === 0 ? U.lerp(o.firstBranch, 0.95, k / nk) : 0.45 + r() * 0.5;
        const at = pts[Math.min(pts.length - 1, Math.round(t * segs))];
        const a = k / nk * Math.PI * 2 + r() * 1.2; const spread = o.spread * (0.7 + r() * 0.6);
        const nd = new V3(Math.cos(a) * Math.sin(spread), Math.cos(spread), Math.sin(a) * Math.sin(spread));
        nd.lerp(dir, 0.25).normalize();
        grow(at, nd, len * (depth === 0 ? o.branchLen : 0.62) * (0.8 + r() * 0.4), rad * (depth === 0 ? 0.55 : 0.6), depth + 1);
      }
    }
    grow(new V3(0, -0.4, 0), new V3(0, 1, 0), H * o.trunkFrac + 0.4, o.trunkR, 0);
    const crown = new V3(); tips.forEach(t => crown.add(t)); crown.divideScalar(tips.length); crown.y -= o.leafSize * 0.3;
    tips.forEach(t => clusterCards(lb, r, t, o.leafSize, crown, Q.broad, o.cards || 3));
    // a few inner fill clusters for density
    for (let k = 0; k < (o.fill || 4); k++) { const t = tips[Math.floor(r() * tips.length)]; clusterCards(lb, r, t.clone().lerp(crown, 0.45), o.leafSize * 1.2, crown, Q.broad, 2); }
    return { bark: bb.build(), leaf: lb.build(), crownR: o.leafSize * 2.2 };
  }
  function conifer(seed, o) {
    const r = U.rng(seed); const bb = new GB(), lb = new GB();
    const H = o.height * (0.85 + r() * 0.3); const barkC = C(o.bark);
    const trunk = bend(r, new V3(0, -0.4, 0), new V3(0, 1, 0), H + 0.4, 6, 0.05, 0);
    bb.tube(trunk, trunk.map((_, k) => o.trunkR * (1 - k / 6 * 0.85)), 6, barkC, 1, true);
    const whorls = o.whorls;
    const snowC = new THREE.Color(1.25, 1.25, 1.28);
    for (let w = 0; w < whorls; w++) {
      const t = U.lerp(0.3, 0.97, w / (whorls - 1)); const y = H * t; const len = o.width * Math.pow(1 - t, 0.85) + 0.6;
      const nb = w > whorls - 3 ? 3 : 5 + Math.floor(r() * 2);
      for (let k = 0; k < nb; k++) {
        const a = k / nb * Math.PI * 2 + w * 0.9 + r() * 0.5;
        const dir = new V3(Math.cos(a), -0.25 - r() * 0.2 + t * 0.25, Math.sin(a)).normalize();
        const start = new V3(0, y, 0); const end = start.clone().addScaledVector(dir, len);
        if (len > 1.2) bb.tube([start, end], [o.trunkR * 0.25 * (1 - t), 0.03], 3, barkC);
        // needle cards: one flat along the branch, one tilted
        const mid = start.clone().lerp(end, 0.55);
        const along = end.clone().sub(start).multiplyScalar(0.62);
        const side = new V3(-dir.z, 0, dir.x).multiplyScalar(len * 0.42 + 0.35);
        const nn = dir.clone(); nn.y = 0.8; nn.normalize();
        const lum = 0.8 + r() * 0.3; let col = new THREE.Color(lum, lum, lum);
        if (o.snow && r() < 0.8) col = snowC;
        lb.card(mid, side, along, Q.needle, nn, col);
        lb.card(mid.clone().add(new V3(0, 0.12, 0)), new V3(0, len * 0.25 + 0.2, 0).add(side.clone().multiplyScalar(0.25)), along, Q.needle, nn, col);
      }
    }
    // top spike
    const top = new V3(0, H * 0.97, 0);
    for (let k = 0; k < 2; k++) { const a = k * Math.PI / 2; lb.card(top.clone().add(new V3(0, 0.6, 0)), new V3(Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55), new V3(0, 1.1, 0), Q.needle, new V3(0, 1, 0), o.snow ? snowC : new THREE.Color(1, 1, 1)); }
    return { bark: bb.build(), leaf: lb.build(), crownR: o.width * 0.8 };
  }
  function willow(seed) {
    const r = U.rng(seed); const bb = new GB(), lb = new GB(); const barkC = C(0x6a5a44);
    const trunk = bend(r, new V3(0, -0.4, 0), new V3(0, 1, 0), 3.4, 4, 0.2, 0);
    bb.tube(trunk, trunk.map((_, k) => 0.5 * (1 - k * 0.12)), 7, barkC);
    const top = trunk[trunk.length - 1]; const crown = top.clone().add(new V3(0, 1.2, 0));
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * Math.PI * 2 + r(); const dir = new V3(Math.cos(a) * 0.8, 0.9, Math.sin(a) * 0.8);
      const pts = bend(r, top, dir, 3.6, 4, 0.3, -0.12);
      bb.tube(pts, pts.map((_, i) => 0.22 * (1 - i * 0.2) + 0.03), 4, barkC);
      // strands hanging from the arch
      for (let s = 1; s < pts.length; s++) {
        const p = pts[s]; const L = 2.6 + r() * 2.4;
        for (let q = 0; q < 2; q++) {
          const a2 = r() * Math.PI; const side = new V3(Math.cos(a2) * 0.7, 0, Math.sin(a2) * 0.7);
          const strand = [p.clone(), p.clone().add(new V3((r() - .5) * .3, -L * 0.5, (r() - .5) * .3)), p.clone().add(new V3((r() - .5) * .5, -L, (r() - .5) * .5))];
          const lum = 0.8 + r() * 0.3;
          lb.strip(strand, side, Q.willow, new THREE.Color(lum, lum, lum), (pp) => pp.clone().sub(crown).setY(0.4).normalize());
        }
      }
      clusterCards(lb, r, pts[pts.length - 1], 1.4, crown, Q.broad, 2);
    }
    return { bark: bb.build(), leaf: lb.build(), crownR: 4 };
  }
  function palm(seed) {
    const r = U.rng(seed); const bb = new GB(), lb = new GB();
    const lean = new V3(r() - .5, 3, r() - .5).normalize();
    const pts = []; const H = 6.5 + r() * 2;
    for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push(new V3(lean.x * H * t * t * 0.9, t * H - 0.3, lean.z * H * t * t * 0.9)); }
    bb.tube(pts, pts.map((_, k) => 0.34 - k * 0.018), 7, (t) => (Math.floor(t * 16) % 2 ? C(0x8a6c48) : C(0x6e5438)), 1, true);
    const top = pts[pts.length - 1];
    const n = 9;
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2 + r() * 0.3; const out = new V3(Math.cos(a), 0, Math.sin(a));
      const L = 4 + r() * 1.4; const fr = [];
      for (let s = 0; s <= 5; s++) { const t = s / 5; fr.push(top.clone().addScaledVector(out, L * t).add(new V3(0, Math.sin(t * 2.2) * 1.1 - t * t * 2.4, 0))); }
      const side = new V3(-out.z, 0.15, out.x).multiplyScalar(1.05);
      const lum = 0.85 + r() * 0.25;
      lb.strip(fr, side, [Q.frond[0], Q.frond[1], Q.frond[2], Q.frond[3]], new THREE.Color(lum, lum, lum * 0.95), () => new V3(0, 1, 0));
    }
    return { bark: bb.build(), leaf: lb.build(), crownR: 4 };
  }
  function deadTree(seed, o) {
    const g = broadleaf(seed, Object.assign({ bark: 0x5a524a, height: 6.5, trunkFrac: 0.45, trunkR: 0.38, branches: 4, firstBranch: 0.45, spread: 0.9, branchLen: 0.75, depth: 2, leafSize: 0.01, cards: 0, fill: 0 }, o || {}));
    g.leaf = null; return g;
  }
  function bush(seed, o) {
    const r = U.rng(seed); const bb = new GB(), lb = new GB(); const crown = new V3(0, 0.7, 0);
    for (let k = 0; k < 5; k++) { const a = r() * 6.28; const d = new V3(Math.cos(a) * 0.6, 1, Math.sin(a) * 0.6); const pts = bend(r, new V3(0, -0.2, 0), d, 1.2, 2, 0.4, 0); bb.tube(pts, [0.08, 0.06, 0.03], 3, C(0x5a4632)); clusterCards(lb, r, pts[2], 0.85, crown, Q.broad, 3); }
    if (o && o.berries) for (let k = 0; k < 14; k++) { const p = new V3((r() - .5) * 1.8, 0.4 + r() * 1.0, (r() - .5) * 1.8); const s = 0.09; lb.card(p, new V3(s, 0, 0), new V3(0, s, 0), [0.25, 0.75, 0.26, 0.76], p.clone().sub(crown).normalize(), C(o.berries)); }
    return { bark: bb.build(), leaf: lb.build(), crownR: 1.4 };
  }
  function fern(seed) {
    const r = U.rng(seed); const lb = new GB();
    for (let k = 0; k < 9; k++) {
      const a = k / 9 * Math.PI * 2 + r() * 0.4; const out = new V3(Math.cos(a), 0, Math.sin(a)); const L = 1.1 + r() * 0.6; const fr = [];
      for (let s = 0; s <= 3; s++) { const t = s / 3; fr.push(out.clone().multiplyScalar(L * t).add(new V3(0, Math.sin(t * 2.4) * 0.7 - t * t * 0.3, 0))); }
      lb.strip(fr, new V3(-out.z, 0, out.x).multiplyScalar(0.32), Q.frond, new THREE.Color(0.85 + r() * .2, 1, 0.85), () => new V3(0, 1, 0));
    }
    return { bark: null, leaf: lb.build(), crownR: 0.9 };
  }
  // solid (non-foliage) meshes with vertex colors
  function rockGeo(seed, o) {
    const r = U.rng(seed); const n = new U.Simplex(seed);
    const g = new THREE.IcosahedronGeometry(1, 3); const p = g.attributes.position; const cols = [];
    const base = C(o.color), moss = C(o.moss || o.color), hot = o.hot ? C(0xff5a10) : null;
    const sq = new V3(1 + r() * 0.5, 0.55 + r() * 0.4, 1 + r() * 0.3);
    for (let i = 0; i < p.count; i++) {
      const v = new V3(p.getX(i), p.getY(i), p.getZ(i));
      const d = 1 + n.n2(v.x * 1.7 + v.z * 0.4, v.y * 1.7 + v.z * 1.3) * 0.28 + n.n2(v.x * 4, v.z * 4 + v.y) * 0.07;
      v.multiplyScalar(d).multiply(sq);
      // flatten into facets
      v.x = Math.round(v.x * 5) / 5 * 0.4 + v.x * 0.6; v.z = Math.round(v.z * 5) / 5 * 0.4 + v.z * 0.6;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    const nrm = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const up = nrm.getY(i); const c = base.clone().multiplyScalar(0.8 + r() * 0.3);
      if (o.moss && up > 0.55) c.lerp(moss, U.smooth(0.55, 0.85, up) * 0.8);
      if (hot && p.getY(i) < -0.1 && r() < 0.35) c.lerp(hot, 0.7);
      cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.translate(0, sq.y * 0.35, 0);
    return g;
  }
  function cactusGeo(seed) {
    const r = U.rng(seed); const bb = new GB(); const col = (t) => new THREE.Color(0.28, 0.52 + 0.08 * Math.sin(t * 40), 0.26);
    const H = 3.8 + r() * 1.6; const trunk = [new V3(0, -0.3, 0), new V3(0, H * 0.5, 0), new V3(0, H, 0)];
    bb.tube(trunk, [0.46, 0.44, 0.4], 10, C(0x4a8a40), 1, true);
    for (let k = 0; k < 2; k++) {
      const s = k ? 1 : -1; const y = H * (0.35 + r() * 0.25); const x = 0.4 * s;
      const arm = [new V3(0, y, 0), new V3(x + 0.7 * s, y + 0.1, 0), new V3(x + 0.95 * s, y + 0.5, 0), new V3(x + 0.95 * s, y + 1.4 + r() * 0.6, 0)];
      bb.tube(arm, [0.3, 0.28, 0.28, 0.26], 8, C(0x4f9446), 1, true);
    }
    const g = bb.build(); return g;
  }
  function mushroomGeo(seed, cap) {
    const bb = new GB(); const r = U.rng(seed);
    const stem = [new V3(0, -0.2, 0), new V3(0.1, 1.2, 0), new V3(0, 2.3, 0.05)];
    bb.tube(stem, [0.45, 0.33, 0.3], 8, C(0xe0d6bc));
    const g1 = bb.build();
    const capG = new THREE.SphereGeometry(1.6, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2); capG.scale(1, 0.62, 1); capG.translate(0, 2.2, 0);
    const pc = capG.attributes.position; const cols = []; const cc = C(cap), dot = C(0xf6efe0);
    for (let i = 0; i < pc.count; i++) { const x = pc.getX(i), z = pc.getZ(i), y = pc.getY(i); const sp = Math.sin(x * 4.1) * Math.sin(z * 3.7) * Math.sin(y * 5) > 0.35; const c = sp ? dot : cc.clone().multiplyScalar(0.85 + r() * 0.2); cols.push(c.r, c.g, c.b); }
    capG.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    capG.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pc.count * 2), 2));
    return mergeGeos([g1, capG]);
  }
  function mergeGeos(list) {
    let n = 0, ni = 0; list.forEach(g => { n += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; });
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), UV = new Float32Array(n * 2), Cc = new Float32Array(n * 3), I = new Uint32Array(ni);
    let o = 0, oi = 0;
    list.forEach(g => {
      const c = g.attributes.position.count;
      P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) UV.set(g.attributes.uv.array, o * 2);
      if (g.attributes.color) Cc.set(g.attributes.color.array, o * 3); else Cc.fill(1, o * 3, (o + c) * 3);
      if (g.index) { for (let k = 0; k < g.index.count; k++) I[oi++] = g.index.array[k] + o; } else for (let k = 0; k < c; k++) I[oi++] = o + k;
      o += c;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); g.setAttribute('color', new THREE.BufferAttribute(Cc, 3)); g.setIndex(new THREE.BufferAttribute(I, 1));
    g.computeBoundingSphere(); return g;
  }
  F.mergeGeos = mergeGeos;
  function simpleGeo(parts) { return U.mergeColored(parts); }
  const at = (g, x, y, z) => { g.translate(x, y, z); return g; };
  // low-detail far versions
  function farBroad(h, col, trunkCol) { const r = U.rng(h * 100 | 0); const parts = [{ geo: at(new THREE.CylinderGeometry(.25, .4, h * 0.5, 5), 0, h * 0.25, 0), color: trunkCol || 0x5e4128 }];
    for (let k = 0; k < 3; k++) { const s = h * 0.24 * (0.8 + r() * 0.4); const g = new THREE.IcosahedronGeometry(s, 0); parts.push({ geo: at(g, (r() - .5) * h * 0.25, h * 0.68 + (r() - .5) * h * 0.15, (r() - .5) * h * 0.25), color: col }); }
    return simpleGeo(parts); }
  function farCone(h, w, col, snow) { return simpleGeo([{ geo: at(new THREE.CylinderGeometry(.2, .35, h * 0.3, 4, 1, true), 0, h * 0.15, 0), color: 0x4a3322 }, { geo: at(new THREE.ConeGeometry(w, h * 0.55, 6, 1, true), 0, h * 0.45, 0), color: col }, { geo: at(new THREE.ConeGeometry(w * 0.65, h * 0.4, 6, 1, true), 0, h * 0.78, 0), color: snow ? 0xe8eef4 : col }]); }

  // ---------- species catalogue ----------
  const OAK = (seed, h) => broadleaf(seed, { bark: 0x6b5a48, height: h, trunkFrac: 0.42, trunkR: 0.42, branches: 5, firstBranch: 0.55, spread: 0.85, branchLen: 0.8, depth: 2, leafSize: 1.35, cards: 3, fill: 6 });
  const BIRCH = (seed) => broadleaf(seed, { bark: 0xf2efe8, height: 9, trunkFrac: 0.55, trunkR: 0.24, branches: 5, firstBranch: 0.5, spread: 0.55, branchLen: 0.55, depth: 2, leafSize: 1.0, cards: 3, fill: 4 });
  const SPECIES = F.SPECIES = {};
  let barkMat, leafMat, solidMat, rockMat, farMat;
  function defSpecies() {
    const add = (name, variants, opts) => { SPECIES[name] = Object.assign({ name, variants }, opts); };
    add('oak', [OAK(11, 8.5), OAK(12, 9.5), OAK(13, 7.5)], { far: () => farBroad(8.5, 0x4d7a30), collide: 0.7, bark: 'bark', tint: 0x6fa24a });
    add('birch', [BIRCH(21), BIRCH(22)], { far: () => farBroad(9, 0x7fae4e, 0xe6e2da), collide: 0.45, bark: 'birch', tint: 0x9cc25a });
    add('pine', [conifer(31, { height: 11, width: 3.4, trunkR: 0.4, whorls: 9, bark: 0x5a4432 }), conifer(32, { height: 13, width: 3.8, trunkR: 0.45, whorls: 10, bark: 0x5a4432 }), conifer(33, { height: 9, width: 3.0, trunkR: 0.35, whorls: 8, bark: 0x5a4432 })], { far: () => farCone(11, 3, 0x2f5a2c), collide: 0.6, bark: 'bark', tint: 0x4f8a48 });
    add('snowpine', [conifer(41, { height: 11, width: 3.4, trunkR: 0.4, whorls: 9, bark: 0x4a3a2a, snow: true }), conifer(42, { height: 13, width: 3.6, trunkR: 0.42, whorls: 10, bark: 0x4a3a2a, snow: true })], { far: () => farCone(11, 3, 0x33523e, true), collide: 0.6, bark: 'bark', tint: 0x4a7a58 });
    add('willow', [willow(51), willow(52)], { far: () => farBroad(7, 0x6f8a3a), collide: 0.6, bark: 'bark', tint: 0x8aa84a });
    add('dead', [deadTree(61), deadTree(62, { branches: 3, height: 5 })], { far: () => simpleGeo([{ geo: at(new THREE.CylinderGeometry(.2, .4, 5, 5), 0, 2.5, 0), color: 0x4a4038 }]), collide: 0.5, bark: 'bark' });
    add('palm', [palm(71), palm(72)], { far: () => simpleGeo([{ geo: at(new THREE.CylinderGeometry(.22, .34, 6.5, 5), 0, 3.2, 0), color: 0x7a5a36 }, { geo: at(new THREE.ConeGeometry(3.4, 1.4, 8), 0, 6.3, 0), color: 0x4a8a34 }]), collide: 0.45, bark: 'bark', tint: 0x7cb04a });
    add('bush', [bush(81), bush(82, { berries: 0xd02a3a }), bush(83, { berries: 0xf2e0ff })], { far: () => simpleGeo([{ geo: at(new THREE.IcosahedronGeometry(1.1, 1), 0, 0.7, 0), color: 0x4a7a30 }]), collide: 0, bark: 'bark', tint: 0x6a9a44, farDist: 150 });
    add('fern', [fern(91), fern(92)], { far: null, collide: 0, tint: 0x6aa04a, farDist: 0, nearDist: 70 });
    add('cactus', [{ solid: cactusGeo(101) }, { solid: cactusGeo(102) }], { collide: 0.55 });
    add('mushroom', [{ solid: mushroomGeo(111, 0xb03226) }, { solid: mushroomGeo(112, 0x7a4ab0) }], { collide: 0.5 });
    add('rock', [{ rock: rockGeo(121, { color: 0x86827a, moss: 0x5a7a3a }) }, { rock: rockGeo(122, { color: 0x7a766e, moss: 0x5f7f3e }) }, { rock: rockGeo(123, { color: 0x8e887e }) }], { collide: 1.1, farDist: 420 });
    add('sandrock', [{ rock: rockGeo(131, { color: 0xb88e5e }) }, { rock: rockGeo(132, { color: 0xa87e52 }) }], { collide: 1.1, farDist: 420 });
    add('snowrock', [{ rock: rockGeo(141, { color: 0x7c7e84, moss: 0xf0f4f8 }) }], { collide: 1.1, farDist: 420 });
    add('darkrock', [{ rock: rockGeo(151, { color: 0x302824, hot: true }) }, { rock: rockGeo(152, { color: 0x2a2320, hot: true }) }], { collide: 1.1, farDist: 420 });
    const tomb = simpleGeo([{ geo: at(new THREE.BoxGeometry(.9, 1.1, .25), 0, .45, 0), color: 0x7a7670 }, { geo: at(new THREE.CylinderGeometry(.45, .45, .25, 10, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), 0, 1.0, 0), color: 0x7a7670 }]);
    const cross = simpleGeo([{ geo: at(new THREE.BoxGeometry(.18, 1.5, .18), 0, .7, 0), color: 0x6e6a64 }, { geo: at(new THREE.BoxGeometry(.8, .18, .18), 0, 1.05, 0), color: 0x6e6a64 }]);
    add('tomb', [{ solid: tomb }, { solid: cross }], { collide: 0.3, farDist: 200 });
    const crystal = simpleGeo([{ geo: at(new THREE.ConeGeometry(.5, 2.8, 5), 0, 1.3, 0), color: 0xff7a2a }, { geo: at(new THREE.ConeGeometry(.35, 1.8, 5).rotateZ(-0.3), .5, .8, .2), color: 0xffb050 }, { geo: at(new THREE.ConeGeometry(.3, 1.4, 5).rotateZ(0.4), -.4, .6, -.2), color: 0xff5a10 }]);
    add('crystal', [{ glow: crystal }], { collide: 0.5, farDist: 300 });
    const reeds = simpleGeo([0, 1, 2, 3, 4, 5, 6].map(i => { const c = new THREE.CylinderGeometry(.03, .05, 1.8 + (i % 3) * .4, 3); c.rotateZ((i - 3) * 0.05); c.translate(Math.cos(i * 1.3) * .35, .9, Math.sin(i * 1.3) * .35); return { geo: c, color: 0x6f7f3a }; }).concat([{ geo: at(new THREE.CylinderGeometry(.07, .07, .4, 5), .35, 2.0, 0), color: 0x5a3a1a }, { geo: at(new THREE.CylinderGeometry(.07, .07, .4, 5), -.3, 1.8, .2), color: 0x5a3a1a }]));
    add('reed', [{ solid: reeds }], { collide: 0, farDist: 120 });
    // far LOD geometries
    for (const k in SPECIES) { const s = SPECIES[k]; s.farGeo = s.far ? s.far() : null; s.farDist = s.farDist !== undefined ? s.farDist : 560; s.nearDist = s.nearDist || null; }
  }

  // wind vertex patch
  function windPatch(mat, amt, flutter) {
    mat.onBeforeCompile = sh => {
      sh.uniforms.uWind = windU;
      sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
        vec4 iw = instanceMatrix * vec4(0.0,0.0,0.0,1.0);
        #else
        vec4 iw = vec4(0.0);
        #endif
        float ph = iw.x*0.07 + iw.z*0.05; float hy = max(position.y,0.0);
        float sw = (sin(uWind*1.3+ph)*0.6 + sin(uWind*2.3+ph*1.7)*0.3) * ${amt.toFixed(4)} * hy * hy;
        transformed.x += sw; transformed.z += sw*0.6*cos(uWind*0.7+ph);
        ${flutter ? `transformed += normal * sin(uWind*7.0 + position.x*2.3 + position.z*1.9 + position.y) * ${flutter.toFixed(3)} * min(hy,4.0);` : ''}`);
    };
    mat.customProgramCacheKey = () => 'wind' + amt + '_' + (flutter || 0);
  }

  // ---------- placement & LOD ----------
  const trees = { n: 0, x: null, y: null, z: null, s: null, r: null, sp: null, va: null, tint: null };
  let list = [];
  const CELLSZ = 64; const cells = new Map();
  let defined = false;
  function ensure() { if (!defined) { defined = true; defSpecies(); } }
  F.add = function (species, x, y, z, s, rot, tint, sy) {
    ensure();
    const sp = SPECIES[species]; if (!sp) { console.warn('unknown species', species); return; }
    list.push([species, x, y, z, s, rot, tint, sy || 1]);
  };
  // remove large vegetation from an area (camps, lairs, shrines) before building
  F.clearAround = function (x, z, r) {
    const r2 = r * r;
    list = list.filter(t => { const dx = t[1] - x, dz = t[3] - z; if (dx * dx + dz * dz > r2) return true; return t[0] === 'fern' || t[0] === 'reed'; });
  };
  const groups = []; // {species, variant, near:{bark,leaf,solid}, far, idx[]}
  let shadowIM;
  function buildMeshes(scene) {
    barkMat = new THREE.MeshLambertMaterial({ map: G.T.bark(), vertexColors: true }); windPatch(barkMat, 0.0022);
    const birchMat = new THREE.MeshLambertMaterial({ map: G.T.birchBark(), vertexColors: true }); windPatch(birchMat, 0.0022);
    leafMat = new THREE.MeshLambertMaterial({ map: G.T.leafAtlas(), vertexColors: true, alphaTest: 0.42, side: THREE.DoubleSide }); windPatch(leafMat, 0.0024, 0.035);
    solidMat = new THREE.MeshLambertMaterial({ vertexColors: true }); windPatch(solidMat, 0.0012);
    rockMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    farMat = new THREE.MeshLambertMaterial({ vertexColors: true }); windPatch(farMat, 0.0015);
    // assign instances to species/variants
    const byKey = {};
    list.forEach((t, i) => { const sp = SPECIES[t[0]]; const v = (Math.abs(Math.floor(t[1] * 13.7 + t[3] * 7.1)) % sp.variants.length); const k = t[0] + '|' + v; (byKey[k] = byKey[k] || []).push(i); });
    const n = list.length;
    trees.n = n; trees.mat = new Float32Array(n * 16); trees.tint = new Float32Array(n * 3); trees.bark = new Float32Array(n * 3); trees.x = new Float32Array(n); trees.z = new Float32Array(n); trees.s = new Float32Array(n); trees.g = new Int32Array(n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V3(), ps = new V3(), up = new V3(0, 1, 0), c = new THREE.Color();
    list.forEach((t, i) => {
      q.setFromAxisAngle(up, t[5]); sc.set(t[4], t[4] * t[7], t[4]); ps.set(t[1], t[2], t[3]); m4.compose(ps, q, sc); m4.toArray(trees.mat, i * 16);
      c.set(t[6] !== null && t[6] !== undefined ? t[6] : (SPECIES[t[0]].tint || 0xffffff)); trees.tint[i * 3] = c.r; trees.tint[i * 3 + 1] = c.g; trees.tint[i * 3 + 2] = c.b;
      const b = 0.85 + ((i * 2654435761) % 1000) / 1000 * 0.3; trees.bark[i * 3] = b; trees.bark[i * 3 + 1] = b; trees.bark[i * 3 + 2] = b;
      trees.x[i] = t[1]; trees.z[i] = t[3]; trees.s[i] = t[4];
      const k = Math.floor((t[1] + 1100) / CELLSZ) + ',' + Math.floor((t[3] + 1100) / CELLSZ); if (!cells.has(k)) cells.set(k, []); cells.get(k).push(i);
    });
    for (const key in byKey) {
      const [name, vi] = key.split('|'); const sp = SPECIES[name]; const v = sp.variants[+vi]; const idx = byKey[key]; const cap = idx.length;
      const g = { sp, idx, near: [], far: null, nearList: new Int32Array(cap), farList: new Int32Array(cap) };
      idx.forEach(i => trees.g[i] = groups.length);
      const mk = (geo, mat, colors) => { const im = new THREE.InstancedMesh(geo, mat, cap); im.count = 0; im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3); im.userData.colors = colors; scene.add(im); return im; };
      if (v.bark) g.near.push(mk(v.bark, sp.bark === 'birch' ? birchMat : barkMat, 'bark'));
      if (v.leaf) g.near.push(mk(v.leaf, leafMat, 'tint'));
      if (v.solid) g.near.push(mk(v.solid, solidMat, 'bark'));
      if (v.rock) g.near.push(mk(v.rock, rockMat, 'bark'));
      if (v.glow) g.near.push(mk(v.glow, glowMat, 'bark'));
      if (sp.farGeo) g.far = mk(sp.farGeo, farMat, sp.tint ? 'tint' : 'bark');
      g.crownR = v.crownR || 1;
      groups.push(g);
    }
    // blob shadows under near trees
    const sg = new THREE.PlaneGeometry(1, 1); sg.rotateX(-Math.PI / 2);
    const sm = new THREE.MeshBasicMaterial({ map: G.T.glow(), color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2 });
    shadowIM = new THREE.InstancedMesh(sg, sm, 6000); shadowIM.count = 0; shadowIM.frustumCulled = false; shadowIM.renderOrder = 1; scene.add(shadowIM);
  }

  let lastX = 1e9, lastZ = 1e9, lodT = 0;
  F.nearR = 125; F.farR = 560;
  function refresh(px, pz) {
    lastX = px; lastZ = pz;
    for (const g of groups) { g.nn = 0; g.nf = 0; }
    const R = F.farR, R2 = R * R;
    const c0x = Math.floor((px - R + 1100) / CELLSZ), c1x = Math.floor((px + R + 1100) / CELLSZ), c0z = Math.floor((pz - R + 1100) / CELLSZ), c1z = Math.floor((pz + R + 1100) / CELLSZ);
    let ns = 0; const sa = shadowIM.instanceMatrix.array; const m = new THREE.Matrix4();
    for (let cz = c0z; cz <= c1z; cz++) for (let cx = c0x; cx <= c1x; cx++) {
      const arr = cells.get(cx + ',' + cz); if (!arr) continue;
      for (const i of arr) {
        const dx = trees.x[i] - px, dz = trees.z[i] - pz; const d2 = dx * dx + dz * dz; if (d2 > R2) continue;
        const g = groups[trees.g[i]]; const sp = g.sp;
        const nearR = sp.nearDist || F.nearR;
        if (d2 < nearR * nearR) {
          g.nearList[g.nn++] = i;
          if (ns < 6000 && g.crownR > 1.2 && d2 < 90 * 90) { const s = g.crownR * 1.5 * trees.s[i]; const o = ns * 16; sa.fill(0, o, o + 16); sa[o] = s; sa[o + 5] = 1; sa[o + 10] = s; sa[o + 12] = trees.x[i]; sa[o + 13] = trees.mat[i * 16 + 13] + 0.12; sa[o + 14] = trees.z[i]; sa[o + 15] = 1; ns++; }
        } else if (g.far && d2 < sp.farDist * sp.farDist) g.farList[g.nf++] = i;
      }
    }
    shadowIM.count = ns; shadowIM.instanceMatrix.needsUpdate = true;
    for (const g of groups) {
      for (const im of g.near) fill(im, g.nearList, g.nn);
      if (g.far) fill(g.far, g.farList, g.nf);
    }
  }
  function fill(im, lst, n) {
    const ma = im.instanceMatrix.array, ca = im.instanceColor.array; const src = im.userData.colors === 'tint' ? trees.tint : trees.bark;
    for (let k = 0; k < n; k++) { const i = lst[k]; ma.set(trees.mat.subarray(i * 16, i * 16 + 16), k * 16); ca[k * 3] = src[i * 3]; ca[k * 3 + 1] = src[i * 3 + 1]; ca[k * 3 + 2] = src[i * 3 + 2]; }
    im.count = n; im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
  }

  // ---------- grass ----------
  let grass = null;
  function buildGrass(scene) {
    const low = G.mobile;
    const PATCH = low ? 56 : 84, COUNT = low ? 18000 : 52000;
    const bladeSegs = low ? 2 : 3;
    const base = new THREE.InstancedBufferGeometry();
    const pos = [], idx = [];
    for (let s = 0; s <= bladeSegs; s++) { const t = s / bladeSegs; const w = (1 - t * 0.85) * 0.5; pos.push(-w, t, 0, w, t, 0); }
    for (let s = 0; s < bladeSegs; s++) { const a = s * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
    base.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); base.setIndex(idx);
    const off = new Float32Array(COUNT * 2), prm = new Float32Array(COUNT * 4); const r = U.rng(4545);
    for (let i = 0; i < COUNT; i++) { off[i * 2] = r() * PATCH; off[i * 2 + 1] = r() * PATCH; prm[i * 4] = 0.28 + r() * 0.42; prm[i * 4 + 1] = 0.05 + r() * 0.05; prm[i * 4 + 2] = r() * 6.283; prm[i * 4 + 3] = r(); }
    base.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 2)); base.setAttribute('aPrm', new THREE.InstancedBufferAttribute(prm, 4));
    base.instanceCount = COUNT;
    const T = G.W.terrainUniforms;
    const uni = { uCam: { value: new THREE.Vector2() }, uPatch: { value: PATCH }, hmap: { value: G.W.hmapTex }, gmask: { value: G.W.gmaskTex }, uTime: windU,
      sunDir: T.sunDir, sunCol: T.sunCol, ambCol: T.ambCol, fogColor: T.fogColor, fogNear: T.fogNear, fogFar: T.fogFar, uPlayer: { value: new V3() } };
    const mat = new THREE.ShaderMaterial({
      uniforms: uni, side: THREE.DoubleSide,
      vertexShader: `attribute vec2 aOff; attribute vec4 aPrm; uniform vec2 uCam; uniform float uPatch,uTime; uniform sampler2D hmap,gmask; uniform vec3 uPlayer;
        varying vec3 vCol; varying float vDepth; varying float vT; varying float vFlower;
        float h1(float n){ return fract(sin(n)*43758.5453); }
        void main(){
          vec2 p = uCam + mod(aOff - uCam + uPatch*0.5, uPatch) - uPatch*0.5;
          float dist = distance(p, uCam);
          float fade = 1.0 - smoothstep(uPatch*0.32, uPatch*0.5, dist);
          vec2 huv = ((p + 1100.0)/${G.W.CELL.toFixed(6)} + 0.5)/${G.W.V}.0;
          float gh = texture2D(hmap, huv).r; vec4 m = texture2D(gmask, huv);
          float dens = m.r;
          float keep = step(aPrm.w, dens*1.15) * step(0.25, gh);
          float hgt = aPrm.x * (0.5 + dens*0.6) * fade * keep * (1.0 + m.b*0.8);
          float fl = step(0.965 + (1.0-m.a)*0.05, h1(aPrm.w*91.7));
          vFlower = fl*step(0.02,m.a);
          float ang = aPrm.z; float c = cos(ang), s = sin(ang);
          vec3 lp = position; float t = lp.y; vT = t;
          float w = aPrm.y * (1.0 + fl*0.8);
          vec3 v = vec3(lp.x*w*c, t*hgt, lp.x*w*s);
          float ph = p.x*0.13 + p.y*0.11;
          float wind = sin(uTime*1.8 + ph) * 0.5 + sin(uTime*3.1 + ph*1.7)*0.25 + 0.35;
          vec2 bendDir = vec2(0.8,0.5)*wind + vec2(cos(ang*3.0),sin(ang*3.0))*0.25;
          vec2 away = p - uPlayer.xz; float pd = length(away); float push = (1.0 - smoothstep(0.4, 1.6, pd)) * step(abs(uPlayer.y - gh), 2.0);
          bendDir += normalize(away + 0.0001) * push * 1.6;
          v.xz += bendDir * t*t * hgt * 0.45; v.y *= 1.0 - push*0.35;
          vec3 wp = vec3(p.x + v.x, gh + v.y - 0.02, p.y + v.z);
          vec3 lush = mix(vec3(0.2,0.36,0.1), vec3(0.28,0.46,0.14), h1(aPrm.w*13.1));
          vec3 dryc = vec3(0.58,0.52,0.26);
          vec3 swampc = vec3(0.3,0.36,0.14);
          vec3 base = mix(mix(lush, dryc, m.g), swampc, m.b*0.7);
          vCol = mix(base*0.4, base*1.05, t);
          vec3 fc = h1(aPrm.w*7.3) < 0.33 ? vec3(1.0,0.85,0.25) : (h1(aPrm.w*7.3) < 0.66 ? vec3(0.95,0.95,1.0) : vec3(0.75,0.45,1.0));
          if (fl > 0.5 && m.a > 0.02 && t > 0.9) vCol = fc;
          vec4 mv = viewMatrix * vec4(wp,1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 sunDir,sunCol,ambCol,fogColor; uniform float fogNear,fogFar; varying vec3 vCol; varying float vDepth; varying float vT; varying float vFlower;
        void main(){ vec3 col = vCol*(ambCol*1.1 + sunCol*(0.55+0.45*vT)*max(sunDir.y,0.15)*1.1);
          float f=smoothstep(fogNear,fogFar,vDepth); gl_FragColor=vec4(mix(col,fogColor,f),1.0); }`,
    });
    const mesh = new THREE.Mesh(base, mat); mesh.frustumCulled = false; mesh.renderOrder = 0;
    scene.add(mesh);
    grass = { mesh, uni };
  }

  F.build = function (scene) {
    ensure();
    for (const t of list) { const sp = SPECIES[t[0]]; if (sp.collide) G.W.addCollider(t[1], t[3], sp.collide * t[4]); }
    buildMeshes(scene); buildGrass(scene);
  };
  F.update = function (dt, cam, now) {
    windU.value = now;
    if (grass) { grass.uni.uCam.value.set(cam.position.x, cam.position.z); if (G.P) grass.uni.uPlayer.value.copy(G.P.pos); }
    const px = cam.position.x, pz = cam.position.z; const t = performance.now();
    const moved = Math.max(Math.abs(px - lastX), Math.abs(pz - lastZ));
    if ((moved > 6 && t - lodT > 250) || moved > 40) { lodT = t; refresh(px, pz); }
  };
  F.setView = function (k) { F.nearR = (G.mobile ? 80 : 125) * Math.min(1.3, k); F.farR = 560 * k; lastX = 1e9; if (grass) grass.mesh.visible = k >= 0.8; };
})();
