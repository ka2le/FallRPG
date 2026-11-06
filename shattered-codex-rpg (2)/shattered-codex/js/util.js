'use strict';
window.G = window.G || {};
(function () {
  const U = G.U = {};
  U.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  U.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.smooth = (a, b, x) => { const t = U.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  U.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  U.chance = p => Math.random() < p;
  U.d2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); };
  U.fmt = n => n >= 10000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n));
  U.uid = (() => { let i = 1; return () => 'u' + (Date.now() % 1e7) + '_' + (i++); })();

  U.Simplex = function (seed) {
    const r = U.rng(seed); const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    const perm = new Uint8Array(512), pm12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; pm12[i] = perm[i] % 12; }
    const grad = [1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 1, 0, -1, 0, 0, 1, 0, -1, 0, 1, 0, -1];
    const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
    this.n2 = function (xin, yin) {
      let n0 = 0, n1 = 0, n2 = 0;
      const s = (xin + yin) * F2; const i = Math.floor(xin + s), j = Math.floor(yin + s);
      const t = (i + j) * G2; const x0 = xin - (i - t), y0 = yin - (j - t);
      let i1, j1; if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
      const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
      const ii = i & 255, jj = j & 255;
      let t0 = 0.5 - x0 * x0 - y0 * y0;
      if (t0 > 0) { const gi = pm12[ii + perm[jj]] * 2; t0 *= t0; n0 = t0 * t0 * (grad[gi] * x0 + grad[gi + 1] * y0); }
      let t1 = 0.5 - x1 * x1 - y1 * y1;
      if (t1 > 0) { const gi = pm12[ii + i1 + perm[jj + j1]] * 2; t1 *= t1; n1 = t1 * t1 * (grad[gi] * x1 + grad[gi + 1] * y1); }
      let t2 = 0.5 - x2 * x2 - y2 * y2;
      if (t2 > 0) { const gi = pm12[ii + 1 + perm[jj + 1]] * 2; t2 *= t2; n2 = t2 * t2 * (grad[gi] * x2 + grad[gi + 1] * y2); }
      return 70 * (n0 + n1 + n2);
    };
  };
  U.fbm = function (n, x, z, oct) {
    let a = 1, f = 1, s = 0, t = 0;
    for (let i = 0; i < oct; i++) { s += a * n.n2(x * f, z * f); t += a; a *= 0.5; f *= 2.03; }
    return s / t;
  };
  U.ridged = function (n, x, z, oct) {
    let a = 1, f = 1, s = 0, t = 0;
    for (let i = 0; i < oct; i++) { let v = 1 - Math.abs(n.n2(x * f, z * f)); v *= v; s += a * v; t += a; a *= 0.5; f *= 2.1; }
    return s / t;
  };

  // Merge several (transformed) geometries into one, baking a flat color per part.
  U.mergeColored = function (parts) {
    let total = 0;
    const gs = parts.map(p => {
      const g = p.geo.index ? p.geo.toNonIndexed() : p.geo;
      g.computeVertexNormals();
      total += g.attributes.position.count;
      return g;
    });
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3);
    let o = 0;
    gs.forEach((g, i) => {
      const c = new THREE.Color(parts[i].color);
      const n = g.attributes.position.count;
      pos.set(g.attributes.position.array, o * 3);
      nor.set(g.attributes.normal.array, o * 3);
      for (let k = 0; k < n; k++) { col[(o + k) * 3] = c.r; col[(o + k) * 3 + 1] = c.g; col[(o + k) * 3 + 2] = c.b; }
      o += n;
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.computeBoundingSphere();
    return out;
  };
})();
