'use strict';
(function () {
  const A = G.Art = {};
  const SZ = 256;
  // ---------- colour helpers ----------
  const rgb = h => { if (typeof h === 'string') h = parseInt(h.slice(1), 16); return [(h >> 16) & 255, (h >> 8) & 255, h & 255]; };
  const css = (c, a) => a === undefined ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const mix = (a, b, t) => { a = rgb(a); b = rgb(b); return css([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); };
  const lt = (c, t) => mix(c, '#ffffff', t), dk = (c, t) => mix(c, '#000000', t);
  const PI = Math.PI;

  // ---------- drawing primitives ----------
  let X = null; // current ctx
  function ell(x, y, rx, ry, rot) { X.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, PI * 2); }
  function shade(col, hx, hy, r, spec) {
    const g = X.createRadialGradient(hx, hy, r * 0.05, hx, hy, r);
    g.addColorStop(0, lt(col, spec || 0.32)); g.addColorStop(0.5, col); g.addColorStop(1, dk(col, 0.5)); return g;
  }
  function blobE(x, y, rx, ry, col, rot, spec) { X.fillStyle = shade(col, x - rx * 0.35, y - ry * 0.45, Math.max(rx, ry) * 1.35, spec); X.beginPath(); ell(x, y, rx, ry, rot); X.fill(); }
  function path(d, fill) { const p = new Path2D(d); X.fillStyle = fill; X.fill(p); return p; }
  // tapered limb between two points
  function limb(x1, y1, x2, y2, w1, w2, col) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1; const nx = -dy / L, ny = dx / L;
    const g = X.createLinearGradient(x1 + nx * w1, y1 + ny * w1, x1 - nx * w1, y1 - ny * w1);
    g.addColorStop(0, lt(col, 0.25)); g.addColorStop(0.5, col); g.addColorStop(1, dk(col, 0.45));
    X.fillStyle = g; X.beginPath();
    X.moveTo(x1 + nx * w1, y1 + ny * w1); X.lineTo(x2 + nx * w2, y2 + ny * w2); X.arc(x2, y2, w2, Math.atan2(ny, nx), Math.atan2(ny, nx) + PI, false);
    X.lineTo(x1 - nx * w1, y1 - ny * w1); X.arc(x1, y1, w1, Math.atan2(-ny, -nx), Math.atan2(-ny, -nx) + PI, false); X.fill();
  }
  function eye(x, y, r, iris, o) {
    o = o || {};
    X.save();
    if (o.glow) { X.shadowColor = iris; X.shadowBlur = r * 2.2; }
    if (o.sclera !== false && !o.glow) { X.fillStyle = '#f4f0e6'; X.beginPath(); ell(x, y, r, r * (o.squint || 0.9)); X.fill(); }
    X.fillStyle = iris; X.beginPath(); ell(x, y + r * 0.05, r * (o.sclera === false || o.glow ? 1 : 0.62), r * (o.sclera === false || o.glow ? (o.squint || 0.9) : 0.62)); X.fill();
    X.restore();
    X.fillStyle = '#120a08'; X.beginPath();
    if (o.slit) ell(x, y + r * 0.05, r * 0.16, r * 0.55); else ell(x, y + r * 0.08, r * 0.3, r * 0.32);
    X.fill();
    X.fillStyle = 'rgba(255,255,255,.9)'; X.beginPath(); ell(x - r * 0.25, y - r * 0.28, r * 0.2, r * 0.18); X.fill();
    if (o.brow) { X.strokeStyle = o.brow; X.lineWidth = r * 0.45; X.lineCap = 'round'; X.beginPath(); const s = o.side || 1; X.moveTo(x - r * 1.1 * s, y - r * 1.2); X.lineTo(x + r * 0.9 * s, y - r * 0.75); X.stroke(); }
  }
  function teeth(x, y, w, n, h, col) {
    X.fillStyle = col || '#f6f0de';
    for (let i = 0; i < n; i++) { const tx = x - w / 2 + (i + 0.5) * w / n; X.beginPath(); X.moveTo(tx - w / n * 0.45, y); X.lineTo(tx, y + h); X.lineTo(tx + w / n * 0.45, y); X.fill(); }
  }
  function mouth(x, y, w, open, fang) {
    X.fillStyle = '#3a0c0c'; X.beginPath(); ell(x, y, w, Math.max(2, open)); X.fill();
    X.fillStyle = '#b8323a'; X.beginPath(); ell(x, y + open * 0.4, w * 0.6, open * 0.4); X.fill();
    teeth(x, y - open + 1, w * 1.6, 6, open * 0.55); if (fang) { teeth(x - w * 0.55, y - open, w * 0.35, 1, open * 1.1); teeth(x + w * 0.55, y - open, w * 0.35, 1, open * 1.1); }
  }
  function strokeLines(col, w, fn) { X.strokeStyle = col; X.lineWidth = w; X.lineCap = 'round'; X.lineJoin = 'round'; X.beginPath(); fn(); X.stroke(); }
  function furTufts(cx, cy, rx, ry, col, n, len) { X.strokeStyle = col; X.lineWidth = 2.2; X.lineCap = 'round'; for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2; const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry; X.beginPath(); X.moveTo(x, y); X.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len + 2); X.stroke(); } }
  function glowDot(x, y, r, col, a) { const g = X.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, css(rgb(col), a || 0.9)); g.addColorStop(1, css(rgb(col), 0)); X.fillStyle = g; X.beginPath(); ell(x, y, r, r); X.fill(); }

  // =====================================================================
  // ARCHETYPE PAINTERS. f: 0 = stride A, 1 = stride B, 2 = attack
  // =====================================================================
  const P = {};

  // ---------- quadruped beast, 3/4 front view ----------
  P.quad = function (o, f) {
    const s = o.scale || 1; const ph = f === 1 ? 1 : -1; const atk = f === 2;
    const body = o.body, dark = dk(body, 0.3), belly = o.belly || lt(body, 0.25);
    const by = 150 + (o.low ? 18 : 0), bw = 72 * (o.bw || 1) * s, bh = 46 * (o.bh || 1) * s;
    const legL = (o.legs || 1) * (o.low ? 26 : 70);
    // tail
    if (o.tail !== false) { const tc = o.tailCol || body; X.save(); X.globalAlpha = 1; strokeLines(dk(tc, 0.15), o.tailW || 10, () => { X.moveTo(128 + bw * 0.7, by - 10); X.quadraticCurveTo(128 + bw * 1.15, by - 50 + ph * 6, 128 + bw * 0.95 + (o.tailLen || 0), by - 78 - (o.tailLen || 0) * 0.5); }); if (o.tailTip) { X.fillStyle = o.tailTip; X.beginPath(); ell(128 + bw * 0.95 + (o.tailLen || 0), by - 80 - (o.tailLen || 0) * 0.5, 9, 12); X.fill(); } X.restore(); }
    // hind legs
    for (const sd of [-1, 1]) { const x = 128 + sd * bw * 0.72; const off = sd * ph * 5; limb(x, by + 5, x + sd * 4, by + legL * 0.9 + off, 15 * s, 11 * s, dark); X.fillStyle = dk(body, 0.55); X.beginPath(); ell(x + sd * 4, by + legL * 0.9 + off + 4, 13 * s, 7); X.fill(); }
    // body
    blobE(128, by, bw, bh, body);
    X.fillStyle = belly; X.globalAlpha = 0.55; X.beginPath(); ell(128, by + bh * 0.45, bw * 0.55, bh * 0.45); X.fill(); X.globalAlpha = 1;
    if (o.stripes) { X.strokeStyle = o.stripes; X.lineWidth = 6; for (let i = -2; i <= 2; i++) { X.beginPath(); X.moveTo(128 + i * 22 - 8, by - bh * 0.9); X.quadraticCurveTo(128 + i * 22 + 6, by - bh * 0.3, 128 + i * 22, by + bh * 0.1); X.stroke(); } }
    if (o.shag) { furTufts(128, by + bh * 0.6, bw * 0.95, bh * 0.4, dk(body, 0.35), 28, 12); }
    if (o.spikes) { X.fillStyle = o.spikes; for (let i = -3; i <= 3; i++) { const x = 128 + i * 16; X.beginPath(); X.moveTo(x - 8, by - bh * 0.85); X.lineTo(x, by - bh * 0.85 - 20 + Math.abs(i) * 3); X.lineTo(x + 8, by - bh * 0.85); X.fill(); } }
    if (o.scales) { X.strokeStyle = dk(body, 0.35); X.lineWidth = 2; for (let yy = -2; yy <= 1; yy++) for (let xx = -4; xx <= 4; xx++) { X.beginPath(); X.arc(128 + xx * 16 + (yy % 2) * 8, by + yy * 14, 8, 0, PI); X.stroke(); } }
    // front legs
    for (const sd of [-1, 1]) { const x = 128 + sd * bw * 0.32; const off = -sd * ph * 6; const top = by + 8; limb(x, top, x + sd * 2, top + legL + off, 17 * s, 13 * s, body); X.fillStyle = o.hoof ? '#2a2018' : dk(body, 0.35); X.beginPath(); ell(x + sd * 2, top + legL + off + 5, 15 * s, 8); X.fill(); if (!o.hoof) { X.strokeStyle = dk(body, 0.6); X.lineWidth = 1.5; for (let k = -1; k <= 1; k++) { X.beginPath(); X.moveTo(x + sd * 2 + k * 5, top + legL + off + 1); X.lineTo(x + sd * 2 + k * 5, top + legL + off + 9); X.stroke(); } } }
    // head
    const hy = (o.low ? by - 20 : by - 44) + (atk ? 16 : 0) + (f === 1 ? 2 : 0), hs = (o.head || 1) * s * (atk ? 1.08 : 1);
    P.quadHead(o, 128, hy, hs, atk);
  };
  P.quadHead = function (o, x, y, s, atk) {
    const body = o.headCol || o.body; const muz = o.muzzle || lt(body, 0.3);
    const t = o.kind;
    // ears (behind head)
    if (o.ears === 'point') for (const sd of [-1, 1]) { X.fillStyle = shade(body, x + sd * 30 * s, y - 40 * s, 30 * s); X.beginPath(); X.moveTo(x + sd * 14 * s, y - 22 * s); X.lineTo(x + sd * 34 * s, y - 58 * s); X.lineTo(x + sd * 38 * s, y - 14 * s); X.fill(); X.fillStyle = o.earIn || '#d89a8a'; X.beginPath(); X.moveTo(x + sd * 21 * s, y - 22 * s); X.lineTo(x + sd * 33 * s, y - 48 * s); X.lineTo(x + sd * 34 * s, y - 20 * s); X.fill(); if (o.earTip) { X.fillStyle = o.earTip; X.beginPath(); X.moveTo(x + sd * 30 * s, y - 50 * s); X.lineTo(x + sd * 34 * s, y - 58 * s); X.lineTo(x + sd * 37 * s, y - 46 * s); X.fill(); } }
    if (o.ears === 'round') for (const sd of [-1, 1]) { blobE(x + sd * 30 * s, y - 28 * s, 14 * s, 13 * s, body); X.fillStyle = o.earIn || dk(body, 0.3); X.beginPath(); ell(x + sd * 30 * s, y - 27 * s, 7 * s, 7 * s); X.fill(); }
    if (o.ears === 'big') for (const sd of [-1, 1]) { blobE(x + sd * 42 * s, y + 4 * s, 30 * s, 40 * s, dk(body, 0.05), sd * 0.2); X.fillStyle = o.earIn || dk(body, 0.25); X.beginPath(); ell(x + sd * 44 * s, y + 6 * s, 20 * s, 29 * s, sd * 0.2); X.fill(); }
    if (o.ears === 'rat') for (const sd of [-1, 1]) { blobE(x + sd * 30 * s, y - 24 * s, 17 * s, 17 * s, body); X.fillStyle = '#e8a0a8'; X.beginPath(); ell(x + sd * 30 * s, y - 23 * s, 11 * s, 11 * s); X.fill(); }
    if (o.horns === 'ram') for (const sd of [-1, 1]) { X.strokeStyle = '#d8c8a0'; X.lineWidth = 11 * s; X.lineCap = 'round'; X.beginPath(); X.arc(x + sd * 32 * s, y - 6 * s, 20 * s, sd > 0 ? -PI * 0.9 : -PI * 0.1, sd > 0 ? PI * 0.6 : PI * 0.4 + PI, sd < 0); X.stroke(); X.strokeStyle = 'rgba(90,70,40,.5)'; X.lineWidth = 2; for (let k = 0; k < 5; k++) { const a = -PI * 0.7 + k * 0.4; X.beginPath(); X.moveTo(x + sd * (32 + Math.cos(a) * 14) * s, y + (-6 + Math.sin(a) * 14) * s); X.lineTo(x + sd * (32 + Math.cos(a) * 26) * s, y + (-6 + Math.sin(a) * 26) * s); X.stroke(); } }
    if (o.horns === 'short') for (const sd of [-1, 1]) path(`M${x + sd * 18 * s} ${y - 26 * s} Q${x + sd * 30 * s} ${y - 52 * s} ${x + sd * 20 * s} ${y - 62 * s} Q${x + sd * 16 * s} ${y - 44 * s} ${x + sd * 8 * s} ${y - 30 * s} Z`, '#e0d6c0');
    // mane
    if (o.mane) { furTufts(x, y + 4 * s, 38 * s, 34 * s, o.mane, 26, 14 * s); X.fillStyle = shade(o.mane, x - 10, y - 20, 50 * s); X.beginPath(); ell(x, y + 4 * s, 42 * s, 38 * s); X.fill(); }
    // skull
    blobE(x, y, (o.headW || 36) * s, (o.headH || 32) * s, body);
    if (o.cheeks) { X.fillStyle = o.cheeks; for (const sd of [-1, 1]) { X.beginPath(); ell(x + sd * 20 * s, y + 12 * s, 16 * s, 12 * s); X.fill(); } }
    // snout
    const sn = o.snout || 1;
    if (t === 'boar') {
      blobE(x, y + 20 * s, 22 * s, 17 * s, lt(body, 0.1));
      blobE(x, y + 26 * s, 16 * s, 11 * s, '#d88a8a', 0, 0.2);
      X.fillStyle = '#4a2020'; for (const sd of [-1, 1]) { X.beginPath(); ell(x + sd * 6 * s, y + 26 * s, 3.5 * s, 5 * s); X.fill(); }
    } else if (t === 'rat') {
      blobE(x, y + 22 * s, 16 * s, 22 * s, muz);
      X.fillStyle = '#e88a98'; X.beginPath(); ell(x, y + 40 * s, 7 * s, 5 * s); X.fill();
      strokeLines('rgba(240,230,210,.8)', 1.2, () => { for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { X.moveTo(x + sd * 8 * s, y + 36 * s); X.lineTo(x + sd * 34 * s, y + (30 + k * 6) * s); } });
    } else if (t === 'trunk') {
      blobE(x, y + 18 * s, 20 * s, 16 * s, muz);
      limb(x, y + 22 * s, x + 6 * s, y + 68 * s, 12 * s, 7 * s, body);
      strokeLines(dk(body, 0.4), 1.5, () => { for (let k = 0; k < 6; k++) { X.moveTo(x - 9 * s, y + (30 + k * 7) * s); X.lineTo(x + 11 * s, y + (31 + k * 7) * s); } });
    } else {
      blobE(x, y + 18 * s * sn, 21 * s * (o.muzW || 1), 17 * s * sn, muz);
      X.fillStyle = '#1e1414'; X.beginPath(); ell(x, y + (10 + 12 * sn) * s, 8 * s, 5.5 * s); X.fill();
      X.fillStyle = 'rgba(255,255,255,.4)'; X.beginPath(); ell(x - 2 * s, y + (8 + 12 * sn) * s, 3 * s, 1.6 * s); X.fill();
    }
    // mouth
    const my = y + (t === 'rat' ? 46 : t === 'boar' ? 38 : 30 + 8 * sn) * s;
    if (atk && t !== 'trunk') mouth(x, my, 13 * s, 8 * s, true);
    else if (t !== 'trunk') strokeLines('#2a1a14', 2, () => { X.moveTo(x - 10 * s, my - 2); X.quadraticCurveTo(x, my + 3, x + 10 * s, my - 2); });
    if (o.tusks) for (const sd of [-1, 1]) path(`M${x + sd * 10 * s} ${y + 30 * s} Q${x + sd * (o.tusks === 'big' ? 46 : 24) * s} ${y + (o.tusks === 'big' ? 64 : 36) * s} ${x + sd * (o.tusks === 'big' ? 30 : 20) * s} ${y + (o.tusks === 'big' ? 18 : 10) * s} Q${x + sd * (o.tusks === 'big' ? 34 : 18) * s} ${y + (o.tusks === 'big' ? 46 : 28) * s} ${x + sd * 6 * s} ${y + 34 * s} Z`, '#f2ead6');
    // eyes
    const ey = y - (t === 'trunk' ? 4 : 6) * s, ex = (o.eyeX || 15) * s;
    for (const sd of [-1, 1]) eye(x + sd * ex, ey, (o.eyeR || 6.5) * s, o.eyeCol || '#f2c040', { sclera: false, glow: o.glowEyes, slit: o.slit, brow: atk ? dk(body, 0.5) : null, side: sd });
    if (o.beard) path(`M${x - 10 * s} ${my} L${x} ${my + 26 * s} L${x + 10 * s} ${my} Z`, o.beard);
    if (o.frost) { X.fillStyle = 'rgba(220,240,255,.7)'; for (let k = 0; k < 6; k++) { const a = -PI * 0.9 + k * 0.35; X.beginPath(); X.moveTo(x + Math.cos(a) * 30 * s, y + Math.sin(a) * 26 * s); X.lineTo(x + Math.cos(a) * 44 * s, y + Math.sin(a) * 40 * s); X.lineTo(x + Math.cos(a + 0.12) * 30 * s, y + Math.sin(a + 0.12) * 26 * s); X.fill(); } }
  };

  // ---------- humanoid, front view ----------
  P.humanoid = function (o, f) {
    const ph = f === 1 ? 1 : -1, atk = f === 2;
    const s = o.scale || 1; const bulk = o.bulk || 1;
    const skin = o.skin || '#e0b090', cloth = o.cloth || '#6a4a8a', cloth2 = o.cloth2 || dk(cloth, 0.25);
    const cx = 128, feet = 244, hip = feet - 58 * s * (o.legLen || 1), sh = hip - 62 * s, headY = sh - (o.headOff || 30) * s;
    const tw = 34 * s * bulk; // half torso width at shoulders
    // wings / cape behind
    if (o.wings) P.wings(o.wings, cx, sh + 10, 1.0 * s, f, o.wingCol || dk(skin, 0.2));
    if (o.cape) { X.fillStyle = shade(o.cape, cx - 20, sh, 110); X.beginPath(); X.moveTo(cx - tw - 6, sh - 4); X.quadraticCurveTo(cx - tw - 34, feet - 30, cx - tw - 20 + ph * 4, feet - 6); X.lineTo(cx + tw + 20 - ph * 4, feet - 6); X.quadraticCurveTo(cx + tw + 34, feet - 30, cx + tw + 6, sh - 4); X.fill(); X.fillStyle = o.capeIn || '#6a0a1a'; X.beginPath(); X.moveTo(cx - tw, sh); X.quadraticCurveTo(cx - tw - 18, feet - 40, cx - tw - 8, feet - 12); X.lineTo(cx + tw + 8, feet - 12); X.quadraticCurveTo(cx + tw + 18, feet - 40, cx + tw, sh); X.fill(); }
    if (o.tail) strokeLines(o.tail, 6, () => { X.moveTo(cx + 10, hip); X.quadraticCurveTo(cx + 70, hip + 10, cx + 60, hip - 40 + ph * 6); }), path(`M${cx + 52} ${hip - 44 + ph * 6} l14 -4 l-4 14 z`, o.tail);
    // legs
    if (o.noLegs) { // smoky tail (djinn / wraiths)
      const g = X.createLinearGradient(0, hip - 20, 0, feet); g.addColorStop(0, o.smoke || cloth); g.addColorStop(1, css(rgb(o.smoke || cloth), 0));
      X.fillStyle = g; X.beginPath(); X.moveTo(cx - tw * 0.9, hip - 20); X.bezierCurveTo(cx - tw, feet - 50, cx - 10 + ph * 10, feet - 30, cx + 6 + ph * 14, feet - 4); X.bezierCurveTo(cx + 10, feet - 40, cx + tw * 1.1, feet - 60, cx + tw * 0.9, hip - 20); X.fill();
    } else if (o.robe) {
      X.fillStyle = shade(cloth, cx - 20, hip - 20, 100); X.beginPath(); X.moveTo(cx - tw * 0.8, hip - 20); X.lineTo(cx - tw * 1.2 - ph * 3, feet - 4); X.quadraticCurveTo(cx, feet + 4, cx + tw * 1.2 - ph * 3, feet - 4); X.lineTo(cx + tw * 0.8, hip - 20); X.fill();
      X.fillStyle = dk(cloth, 0.4); for (const sd of [-1, 1]) { X.beginPath(); ell(cx + sd * 12 + ph * sd * 3, feet - 2, 11, 6); X.fill(); }
      if (o.robeTrim) { X.fillStyle = o.robeTrim; X.fillRect(cx - tw * 1.2, feet - 12, tw * 2.4, 5); X.fillRect(cx - 3, hip - 10, 6, feet - hip); }
    } else {
      for (const sd of [-1, 1]) { const x = cx + sd * 14 * s * bulk; const off = sd * ph * 5; limb(x, hip, x + sd * 3, feet - 8 + off, 12 * s * bulk, 9 * s, o.pants || dk(cloth, 0.35)); X.fillStyle = o.boots || '#3a2a1e'; X.beginPath(); ell(x + sd * 4, feet - 4 + off, 13 * s, 7 * s); X.fill(); }
    }
    // torso
    const tg = shade(cloth, cx - 12, sh + 16, 90);
    X.fillStyle = tg; X.beginPath(); X.moveTo(cx - tw, sh); X.quadraticCurveTo(cx - tw * 1.1, hip - 10, cx - tw * 0.72, hip + 4); X.lineTo(cx + tw * 0.72, hip + 4); X.quadraticCurveTo(cx + tw * 1.1, hip - 10, cx + tw, sh); X.quadraticCurveTo(cx, sh - 10, cx - tw, sh); X.fill();
    if (o.belly) { blobE(cx, hip - 20 * s, tw * 0.75, 26 * s, o.belly); }
    if (o.ribs) { strokeLines('#e8e0cc', 4, () => { for (let k = 0; k < 4; k++) { const y = sh + 12 + k * 11; X.moveTo(cx - 4, y); X.quadraticCurveTo(cx - tw * 0.8, y - 4, cx - tw * 0.7, y + 8); X.moveTo(cx + 4, y); X.quadraticCurveTo(cx + tw * 0.8, y - 4, cx + tw * 0.7, y + 8); } X.moveTo(cx, sh + 4); X.lineTo(cx, hip); }); }
    if (o.bandage) { X.strokeStyle = 'rgba(120,100,70,.55)'; X.lineWidth = 2; for (let k = 0; k < 8; k++) { X.beginPath(); X.moveTo(cx - tw, sh + 6 + k * 8); X.lineTo(cx + tw, sh + 2 + k * 8 + (k % 2) * 6); X.stroke(); } }
    if (o.belt) { X.fillStyle = o.belt; X.fillRect(cx - tw * 0.78, hip - 12, tw * 1.56, 8); X.fillStyle = '#d8b050'; X.fillRect(cx - 5, hip - 13, 10, 10); }
    if (o.armor) { X.fillStyle = shade(o.armor, cx - 10, sh + 10, 70); X.beginPath(); X.moveTo(cx - tw * 0.9, sh + 2); X.lineTo(cx + tw * 0.9, sh + 2); X.lineTo(cx + tw * 0.7, sh + 50 * s); X.lineTo(cx, sh + 58 * s); X.lineTo(cx - tw * 0.7, sh + 50 * s); X.fill(); for (const sd of [-1, 1]) blobE(cx + sd * tw, sh + 4, 15 * s, 11 * s, o.armor); }
    if (o.fur) furTufts(cx, sh + 30, tw * 0.9, 30, dk(cloth, 0.3), 30, 10);
    // arms
    const armCol = o.sleeve || cloth, hand = o.hand || skin;
    const weapSide = -1;
    for (const sd of [-1, 1]) {
      const x0 = cx + sd * tw * 0.95, y0 = sh + 6;
      let x1, y1;
      if (sd === weapSide && atk) { x1 = x0 + sd * 10; y1 = y0 - 46 * s; }
      else if (o.armsUp) { x1 = x0 + sd * 34 * s; y1 = y0 - 20 * s + (sd * ph * 4); }
      else { x1 = x0 + sd * (14 + (o.bulk || 1) * 6) * s; y1 = y0 + 52 * s * (o.armLen || 1) + ph * sd * 3; }
      limb(x0, y0, x1, y1, 11 * s * bulk, 8 * s * bulk, armCol);
      if (o.claws) { X.strokeStyle = '#efe6d0'; X.lineWidth = 2.5; for (let k = -1; k <= 1; k++) { X.beginPath(); X.moveTo(x1 + k * 4, y1 + 4); X.lineTo(x1 + k * 6 + sd * 2, y1 + 16); X.stroke(); } }
      blobE(x1, y1 + 3, 8.5 * s * bulk, 8.5 * s * bulk, hand);
      if (sd === weapSide && o.weapon) P.weapon(o.weapon, x1, y1 + 2, atk, o);
      if (sd !== weapSide && o.offhand) P.weapon(o.offhand, x1, y1 + 2, false, o);
    }
    // head
    P.head(o, cx, headY, s, atk);
  };
  P.weapon = function (w, x, y, atk, o) {
    X.save(); X.translate(x, y); X.rotate(atk ? -0.5 : 0.25);
    if (w === 'club') { limb(0, 10, 0, -52, 5, 11, '#7a5230'); X.fillStyle = '#5a3a20'; for (let k = 0; k < 4; k++) { X.beginPath(); ell(-6 + k * 4, -40 + k * 6, 3, 3); X.fill(); } }
    if (w === 'sword') { X.fillStyle = '#5a3a20'; X.fillRect(-3, -2, 6, 16); X.fillStyle = '#c8a040'; X.fillRect(-12, -6, 24, 5); const g = X.createLinearGradient(-5, 0, 5, 0); g.addColorStop(0, '#f4f6fa'); g.addColorStop(1, '#8a92a0'); X.fillStyle = g; X.beginPath(); X.moveTo(-5, -6); X.lineTo(-4, -70); X.lineTo(0, -80); X.lineTo(4, -70); X.lineTo(5, -6); X.fill(); }
    if (w === 'dagger') { X.fillStyle = '#4a3020'; X.fillRect(-2.5, -2, 5, 12); X.fillStyle = '#dde2ea'; X.beginPath(); X.moveTo(-4, -2); X.lineTo(0, -34); X.lineTo(4, -2); X.fill(); }
    if (w === 'staff') { limb(0, 40, 0, -80, 3.5, 3, '#6a4a2a'); glowDot(0, -88, 22, o.orb || '#9a6aff', 0.95); X.fillStyle = lt(o.orb || '#9a6aff', 0.5); X.beginPath(); ell(0, -88, 8, 8); X.fill(); }
    if (w === 'scythe') { limb(0, 40, 0, -80, 3.5, 3, '#3a2a2a'); X.fillStyle = '#c8ccd4'; X.beginPath(); X.moveTo(0, -80); X.quadraticCurveTo(50, -90, 60, -50); X.quadraticCurveTo(40, -74, 0, -70); X.fill(); }
    if (w === 'sling') { strokeLines('#6a4a2a', 2, () => { X.moveTo(0, 0); X.lineTo(-14, -30); X.moveTo(0, 0); X.lineTo(10, -30); }); X.fillStyle = '#8a8a80'; X.beginPath(); ell(-2, -32, 7, 7); X.fill(); }
    if (w === 'orb') { glowDot(0, -6, 24, o.orb || '#ff6a2a', 0.95); X.fillStyle = lt(o.orb || '#ff6a2a', 0.5); X.beginPath(); ell(0, -6, 8, 8); X.fill(); }
    if (w === 'lamp') { X.fillStyle = '#d8a83a'; X.beginPath(); X.moveTo(-18, 0); X.quadraticCurveTo(0, 14, 18, 0); X.lineTo(26, -6); X.lineTo(12, -4); X.quadraticCurveTo(0, -12, -16, -4); X.fill(); glowDot(26, -8, 12, '#ffcf6a'); }
    if (w === 'shield') { X.fillStyle = shade('#7a5a30', -6, -10, 34); X.beginPath(); ell(0, -8, 20, 24); X.fill(); X.fillStyle = '#c8a040'; X.beginPath(); ell(0, -8, 6, 6); X.fill(); }
    X.restore();
  };
  P.head = function (o, x, y, s, atk) {
    const skin = o.skin || '#e0b090'; const hr = (o.headR || 27) * s;
    const t = o.headType || 'human';
    // back hair / hood back
    if (o.hood) { X.fillStyle = shade(o.hood, x - 10, y - 20, hr * 2); X.beginPath(); X.moveTo(x - hr * 1.3, y + hr * 1.1); X.quadraticCurveTo(x - hr * 1.4, y - hr * 1.3, x, y - hr * 1.55); X.quadraticCurveTo(x + hr * 1.4, y - hr * 1.3, x + hr * 1.3, y + hr * 1.1); X.fill(); }
    if (o.hair) { X.fillStyle = shade(o.hair, x - 10, y - 20, hr * 1.8); X.beginPath(); ell(x, y - hr * 0.1, hr * 1.12, hr * 1.1); X.fill(); if (o.longHair) { X.beginPath(); X.moveTo(x - hr * 1.1, y); X.lineTo(x - hr * 1.15, y + hr * 1.6); X.lineTo(x + hr * 1.15, y + hr * 1.6); X.lineTo(x + hr * 1.1, y); X.fill(); } }
    // ears
    if (o.ears === 'goblin') for (const sd of [-1, 1]) path(`M${x + sd * hr * 0.8} ${y - hr * 0.1} L${x + sd * hr * 2.1} ${y - hr * 0.55} L${x + sd * hr * 0.9} ${y + hr * 0.4} Z`, dk(skin, 0.05));
    if (o.ears === 'elf') for (const sd of [-1, 1]) path(`M${x + sd * hr * 0.85} ${y - hr * 0.05} L${x + sd * hr * 1.45} ${y - hr * 0.7} L${x + sd * hr * 0.95} ${y + hr * 0.35} Z`, dk(skin, 0.05));
    // face
    if (o.hatOnly) { /* no face */ } else if (t === 'skull') {
      blobE(x, y - hr * 0.1, hr * 0.95, hr * 0.9, '#e8e0cc');
      blobE(x, y + hr * 0.55, hr * 0.62, hr * 0.38, '#dcd2bc');
      X.fillStyle = '#1a1210'; for (const sd of [-1, 1]) { X.beginPath(); ell(x + sd * hr * 0.36, y - hr * 0.08, hr * 0.26, hr * 0.3); X.fill(); }
      X.beginPath(); X.moveTo(x, y + hr * 0.18); X.lineTo(x - hr * 0.1, y + hr * 0.36); X.lineTo(x + hr * 0.1, y + hr * 0.36); X.fill();
      strokeLines('#1a1210', 1.5, () => { for (let k = -3; k <= 3; k++) { X.moveTo(x + k * hr * 0.14, y + hr * 0.45); X.lineTo(x + k * hr * 0.14, y + hr * (atk ? 0.9 : 0.72)); } });
      if (o.eyeGlow) for (const sd of [-1, 1]) glowDot(x + sd * hr * 0.36, y - hr * 0.05, hr * 0.35, o.eyeGlow);
    } else {
      blobE(x, y, hr * (o.headW || 1), hr, skin);
      if (o.mask) { X.fillStyle = o.mask; X.beginPath(); X.rect(x - hr, y - hr * 0.15, hr * 2, hr * 0.5); X.fill(); }
      if (o.bandage) { X.strokeStyle = 'rgba(110,90,60,.55)'; X.lineWidth = 2.5; for (let k = 0; k < 6; k++) { X.beginPath(); X.moveTo(x - hr, y - hr * 0.8 + k * hr * 0.32); X.lineTo(x + hr, y - hr * 0.7 + k * hr * 0.32 + (k % 2) * 4); X.stroke(); } }
      if (o.cheeks) { X.fillStyle = 'rgba(230,110,110,.35)'; for (const sd of [-1, 1]) { X.beginPath(); ell(x + sd * hr * 0.55, y + hr * 0.3, hr * 0.22, hr * 0.14); X.fill(); } }
      const er = hr * (o.eyeScale || 0.24);
      for (const sd of [-1, 1]) eye(x + sd * hr * 0.38, y - hr * 0.02, er, o.eyeCol || '#3a2a1a', { glow: o.eyeGlow ? true : false, sclera: o.eyeGlow ? false : true, brow: o.brow || (atk ? '#2a1a10' : null), side: sd, squint: o.squint });
      if (o.eyeGlow) for (const sd of [-1, 1]) glowDot(x + sd * hr * 0.38, y, er * 2.2, o.eyeGlow, 0.5);
      // nose
      if (t !== 'ghost') { X.fillStyle = dk(skin, 0.2); X.beginPath(); if (o.bigNose) ell(x, y + hr * 0.3, hr * 0.2, hr * 0.26); else ell(x, y + hr * 0.25, hr * 0.1, hr * 0.12); X.fill(); }
      // mouth
      const my = y + hr * 0.58;
      if (atk || o.grin) { mouth(x, my, hr * 0.36, hr * (atk ? 0.2 : 0.12), o.fangs); }
      else if (o.fangs) { strokeLines('#3a1a14', 2, () => { X.moveTo(x - hr * 0.3, my); X.lineTo(x + hr * 0.3, my); }); teeth(x - hr * 0.2, my, hr * 0.12, 1, hr * 0.2); teeth(x + hr * 0.2, my, hr * 0.12, 1, hr * 0.2); }
      else strokeLines('#4a2a20', 2, () => { X.moveTo(x - hr * 0.25, my); X.quadraticCurveTo(x, my + (o.smile ? hr * 0.18 : hr * 0.02), x + hr * 0.25, my); });
      if (o.tusks) for (const sd of [-1, 1]) path(`M${x + sd * hr * 0.3} ${my} L${x + sd * hr * 0.42} ${my - hr * 0.45} L${x + sd * hr * 0.18} ${my} Z`, '#f2ead6');
      if (o.beard) { X.fillStyle = shade(o.beard, x - 6, my, hr * 1.4); X.beginPath(); X.moveTo(x - hr * 0.8, y + hr * 0.2); X.quadraticCurveTo(x - hr * 0.7, y + hr * 1.5, x, y + hr * (o.beardLen || 1.7)); X.quadraticCurveTo(x + hr * 0.7, y + hr * 1.5, x + hr * 0.8, y + hr * 0.2); X.quadraticCurveTo(x, y + hr * 0.75, x - hr * 0.8, y + hr * 0.2); X.fill(); strokeLines('#4a2a20', 2, () => { X.moveTo(x - hr * 0.22, my - 2); X.lineTo(x + hr * 0.22, my - 2); }); }
    }
    // headwear
    const hw = o.hat;
    if (hw === 'wizard') { X.fillStyle = shade(o.hatCol || '#3a4a9a', x - 10, y - hr * 1.6, hr * 2.2); X.beginPath(); X.moveTo(x - hr * 1.45, y - hr * 0.55); X.quadraticCurveTo(x, y - hr * 0.95, x + hr * 1.45, y - hr * 0.55); X.lineTo(x + hr * 0.4, y - hr * 0.8); X.quadraticCurveTo(x + hr * 0.2, y - hr * 2.2, x + hr * 0.9, y - hr * 2.9); X.quadraticCurveTo(x - hr * 0.3, y - hr * 2.3, x - hr * 0.55, y - hr * 0.8); X.fill(); X.fillStyle = '#e8c860'; X.beginPath(); X.moveTo(x - hr * 0.1, y - hr * 1.5); X.lineTo(x + hr * 0.05, y - hr * 1.3); X.lineTo(x - hr * 0.2, y - hr * 1.2); X.fill(); }
    if (hw === 'hood') { X.fillStyle = shade(o.hood || '#4a3a2a', x - 10, y - hr, hr * 2.2); X.beginPath(); X.moveTo(x - hr * 1.2, y + hr * 0.4); X.quadraticCurveTo(x - hr * 1.3, y - hr * 1.4, x, y - hr * 1.3); X.quadraticCurveTo(x + hr * 1.3, y - hr * 1.4, x + hr * 1.2, y + hr * 0.4); X.quadraticCurveTo(x + hr * 0.9, y - hr * 0.9, x, y - hr * 0.95); X.quadraticCurveTo(x - hr * 0.9, y - hr * 0.9, x - hr * 1.2, y + hr * 0.4); X.fill(); }
    if (hw === 'helm') { X.fillStyle = shade(o.hatCol || '#9aa0aa', x - 10, y - hr, hr * 2); X.beginPath(); X.arc(x, y - hr * 0.1, hr * 1.08, PI, 0); X.lineTo(x + hr * 1.08, y + hr * 0.1); X.lineTo(x - hr * 1.08, y + hr * 0.1); X.fill(); X.fillRect(x - hr * 0.12, y - hr * 0.2, hr * 0.24, hr * 0.7); if (o.plume) { X.fillStyle = o.plume; X.beginPath(); ell(x, y - hr * 1.3, hr * 0.25, hr * 0.5); X.fill(); } }
    if (hw === 'horns' || o.horns) for (const sd of [-1, 1]) path(`M${x + sd * hr * 0.45} ${y - hr * 0.7} Q${x + sd * hr * 1.5} ${y - hr * 1.1} ${x + sd * hr * 1.35} ${y - hr * 2.1} Q${x + sd * hr * 1.0} ${y - hr * 1.3} ${x + sd * hr * 0.2} ${y - hr * 0.9} Z`, o.hornCol || '#2a2020');
    if (hw === 'turban') { blobE(x, y - hr * 0.75, hr * 1.1, hr * 0.62, o.hatCol || '#e8e0d0'); strokeLines(dk(o.hatCol || '#e8e0d0', 0.25), 2, () => { for (let k = 0; k < 3; k++) { X.moveTo(x - hr, y - hr * (0.4 + k * 0.28)); X.quadraticCurveTo(x, y - hr * (0.9 + k * 0.25), x + hr, y - hr * (0.6 + k * 0.28)); } }); X.fillStyle = '#d02a4a'; X.beginPath(); ell(x, y - hr * 0.8, hr * 0.16, hr * 0.2); X.fill(); }
    if (hw === 'crown') { X.fillStyle = shade('#e8c050', x - 6, y - hr * 1.2, hr * 1.5); X.beginPath(); X.moveTo(x - hr * 0.8, y - hr * 0.7); for (let k = 0; k <= 4; k++) { X.lineTo(x - hr * 0.8 + k * hr * 0.4, y - hr * (k % 2 ? 1.05 : 1.45)); } X.lineTo(x + hr * 0.8, y - hr * 0.7); X.fill(); X.fillStyle = '#e03050'; X.beginPath(); ell(x, y - hr * 0.9, hr * 0.12, hr * 0.12); X.fill(); }
    if (hw === 'cap') { blobE(x, y - hr * 0.72, hr * 1.02, hr * 0.5, o.hatCol || '#6a3a2a'); }
    if (hw === 'bandana') { X.fillStyle = o.hatCol || '#a02a2a'; X.beginPath(); X.arc(x, y - hr * 0.2, hr * 1.02, PI * 1.05, -PI * 0.05); X.lineTo(x + hr * 1.4, y - hr * 0.1); X.lineTo(x + hr * 0.95, y - hr * 0.35); X.fill(); }
    if (hw === 'icecrown') { X.fillStyle = 'rgba(200,240,255,.9)'; for (let k = -2; k <= 2; k++) { X.beginPath(); X.moveTo(x + k * hr * 0.35 - 6, y - hr * 0.75); X.lineTo(x + k * hr * 0.4, y - hr * (1.5 + (2 - Math.abs(k)) * 0.35)); X.lineTo(x + k * hr * 0.35 + 6, y - hr * 0.75); X.fill(); } }
  };
  P.wings = function (type, x, y, s, f, col) {
    const up = f === 1 ? -1 : f === 2 ? -0.3 : 0.6;
    for (const sd of [-1, 1]) {
      X.save(); X.translate(x, y); X.scale(sd, 1); X.rotate(-0.25 + up * 0.35);
      if (type === 'bat') {
        X.fillStyle = shade(col, 30, -20, 120); X.beginPath(); X.moveTo(0, 0); X.lineTo(40 * s, -40 * s); X.lineTo(110 * s, -30 * s); X.quadraticCurveTo(100 * s, 0, 105 * s, 30 * s); X.quadraticCurveTo(85 * s, 18 * s, 72 * s, 38 * s); X.quadraticCurveTo(58 * s, 20 * s, 42 * s, 40 * s); X.quadraticCurveTo(28 * s, 18 * s, 10 * s, 26 * s); X.fill();
        strokeLines(dk(col, 0.45), 3, () => { X.moveTo(0, 0); X.lineTo(40 * s, -40 * s); X.lineTo(110 * s, -30 * s); X.moveTo(40 * s, -40 * s); X.lineTo(105 * s, 30 * s); X.moveTo(40 * s, -40 * s); X.lineTo(72 * s, 38 * s); X.moveTo(40 * s, -40 * s); X.lineTo(42 * s, 40 * s); });
      } else if (type === 'feather') {
        for (let k = 0; k < 7; k++) { const a = -0.35 + k * 0.13; const L = (60 + k * 10) * s; X.fillStyle = shade(k % 2 ? col : lt(col, 0.1), L * 0.4, -10, L); X.save(); X.rotate(a); X.beginPath(); ell(L * 0.55, 6, L * 0.55, 11 * s); X.fill(); X.restore(); }
        X.fillStyle = shade(lt(col, 0.1), 20, -10, 60); X.beginPath(); ell(28 * s, 2, 34 * s, 22 * s, -0.2); X.fill();
      } else if (type === 'insect') {
        X.fillStyle = 'rgba(220,240,255,.55)'; X.strokeStyle = 'rgba(80,90,110,.6)'; X.lineWidth = 1.5;
        X.beginPath(); ell(48 * s, -26 * s, 50 * s, 20 * s, -0.4); X.fill(); X.stroke(); X.beginPath(); ell(40 * s, 6 * s, 36 * s, 14 * s, 0.2); X.fill(); X.stroke();
      } else if (type === 'fairy') {
        X.fillStyle = 'rgba(200,255,230,.45)'; X.beginPath(); ell(30 * s, -18 * s, 32 * s, 16 * s, -0.5); X.fill(); X.beginPath(); ell(26 * s, 10 * s, 22 * s, 10 * s, 0.4); X.fill();
      }
      X.restore();
    }
  };

  // ---------- arthropods ----------
  P.spider = function (o, f) {
    const ph = f === 1 ? 1 : -1, atk = f === 2; const body = o.body || '#3a2a3a';
    const cy = 170;
    // legs (4 per side)
    for (const sd of [-1, 1]) for (let k = 0; k < 4; k++) {
      const a = (-0.6 + k * 0.42); const kx = 128 + sd * (46 + k * 6), ky = cy - 36 + k * 8 + (k % 2 ? ph : -ph) * 5;
      const fx = 128 + sd * (86 + (k === 0 || k === 3 ? 10 : 22)), fy = 236 - (k === 0 ? 22 : 0) + (k % 2 ? -ph : ph) * 4;
      limb(128 + sd * 20, cy + k * 3, kx, ky - 20, 6, 5, dk(body, 0.2)); limb(kx, ky - 20, fx, fy, 5, 2.5, dk(body, 0.3));
    }
    blobE(128, cy - 34, 52, 44, body); // abdomen (behind, higher)
    if (o.mark) { X.fillStyle = o.mark; X.beginPath(); X.moveTo(128, cy - 62); X.lineTo(142, cy - 42); X.lineTo(128, cy - 20); X.lineTo(114, cy - 42); X.fill(); }
    if (o.hairy) furTufts(128, cy - 34, 50, 42, dk(body, 0.4), 30, 7);
    blobE(128, cy + 10, 34, 28, lt(body, 0.08)); // cephalothorax
    // eyes cluster
    const ec = o.eyeCol || '#ff3030';
    [[-12, 0, 6], [12, 0, 6], [-22, -6, 4], [22, -6, 4], [-6, -10, 3.5], [6, -10, 3.5]].forEach(e => eye(128 + e[0], cy + 4 + e[1], e[2], ec, { glow: true }));
    // fangs
    for (const sd of [-1, 1]) path(`M${128 + sd * 8} ${cy + 24} Q${128 + sd * 14} ${cy + 40 + (atk ? 10 : 0)} ${128 + sd * 4} ${cy + 46 + (atk ? 12 : 0)} Q${128 + sd * 6} ${cy + 34} ${128 + sd * 2} ${cy + 26} Z`, '#1a1010');
  };
  P.scorpion = function (o, f) {
    const ph = f === 1 ? 1 : -1, atk = f === 2; const body = o.body || '#8a5a2a';
    const cy = 180;
    for (const sd of [-1, 1]) for (let k = 0; k < 4; k++) { const fx = 128 + sd * (70 + k * 10), fy = 238 + (k % 2 ? ph : -ph) * 3; limb(128 + sd * 30, cy + k * 5, 128 + sd * (56 + k * 8), cy - 10 + k * 6, 5, 4, dk(body, 0.25)); limb(128 + sd * (56 + k * 8), cy - 10 + k * 6, fx, fy, 4, 2, dk(body, 0.35)); }
    // tail: segmented arc curling over the body
    const tipY = atk ? 78 : 58;
    const bz = (t, a, b, c, d) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;
    const px0 = 128, py0 = cy - 6, px1 = 190, py1 = cy - 40, px2 = 188, py2 = tipY - 30, px3 = 142, py3 = tipY + 8;
    for (let k = 0; k <= 9; k++) { const t = k / 9; const x = bz(t, px0, px1, px2, px3), y = bz(t, py0, py1, py2, py3); blobE(x, y, 17 - k * 0.8, 15 - k * 0.8, k % 2 ? body : dk(body, 0.08)); }
    path(`M${px3 + 4} ${py3 - 6} Q${px3 - 20} ${py3 + 2} ${px3 - 18} ${py3 + 30} Q${px3 - 6} ${py3 + 14} ${px3 + 10} ${py3 + 8} Z`, o.sting || '#3a1a10');
    glowDot(px3 - 18, py3 + 30, 9, '#b0ff40', 0.6);
    // body
    blobE(128, cy, 48, 34, body);
    strokeLines(dk(body, 0.4), 2, () => { for (let k = 0; k < 4; k++) { X.moveTo(92, cy - 16 + k * 10); X.quadraticCurveTo(128, cy - 24 + k * 10, 164, cy - 16 + k * 10); } });
    // pincers
    for (const sd of [-1, 1]) {
      const ex = 128 + sd * (atk ? 62 : 72), ey = cy + (atk ? 30 : 10);
      limb(128 + sd * 30, cy + 10, 128 + sd * 56, cy + 20, 9, 8, body); limb(128 + sd * 56, cy + 20, ex, ey, 8, 7, body);
      blobE(ex, ey + 10, 20, 14, lt(body, 0.05));
      X.fillStyle = dk(body, 0.2); X.beginPath(); X.moveTo(ex - 14, ey + 18); X.lineTo(ex - sd * 2, ey + (atk ? 26 : 40)); X.lineTo(ex + 14, ey + 18); X.fill();
    }
    for (const sd of [-1, 1]) eye(128 + sd * 9, cy + 16, 4.5, o.eyeCol || '#1a1a1a', { sclera: false });
  };
  P.crab = function (o, f) {
    const ph = f === 1 ? 1 : -1, atk = f === 2; const body = o.body || '#c84a2a'; const cy = 186;
    for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { const kx = 128 + sd * (60 + k * 10), ky = cy - 8 + k * 6; limb(128 + sd * 40, cy + k * 6, kx, ky, 6, 5, dk(body, 0.2)); limb(kx, ky, 128 + sd * (70 + k * 14), 238 + (k % 2 ? ph : -ph) * 3, 5, 2.5, dk(body, 0.3)); }
    for (const sd of [-1, 1]) { const cx2 = 128 + sd * 70, cyy = atk ? 106 : 132; limb(128 + sd * 40, cy - 10, cx2, cyy + 20, 9, 9, body); blobE(cx2, cyy, 26, 22, body); X.fillStyle = dk(body, 0.25); X.beginPath(); X.moveTo(cx2 - sd * 4, cyy - 6); X.lineTo(cx2 + sd * 26, cyy - (atk ? 34 : 22)); X.lineTo(cx2 + sd * 10, cyy - 2); X.fill(); }
    blobE(128, cy, 58, 36, body);
    X.fillStyle = lt(body, 0.2); for (let k = 0; k < 5; k++) { X.beginPath(); ell(100 + k * 14, cy - 18 + (k % 2) * 6, 4, 3); X.fill(); }
    for (const sd of [-1, 1]) { limb(128 + sd * 12, cy - 22, 128 + sd * 16, cy - 44, 3, 3, body); eye(128 + sd * 16, cy - 48, 6, '#101010', { sclera: true }); }
    if (atk) mouth(128, cy + 10, 12, 5); else strokeLines('#4a1a10', 2, () => { X.moveTo(116, cy + 10); X.quadraticCurveTo(128, cy + 16, 140, cy + 10); });
  };
  P.insect = function (o, f) { // bees, mosquitos
    const body = o.body || '#e8b020'; const mos = o.mos;
    P.wings('insect', 128, 128, 1, f === 2 ? 1 : f, '#fff');
    if (mos) for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) strokeLines('#2a2a2a', 2, () => { X.moveTo(128 + sd * 8, 150); X.lineTo(128 + sd * (30 + k * 16), 176); X.lineTo(128 + sd * (40 + k * 20), 238); });
    else for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) strokeLines('#1a1a1a', 3, () => { X.moveTo(128 + sd * 10, 150 + k * 6); X.lineTo(128 + sd * (28 + k * 6), 170 + k * 8); X.lineTo(128 + sd * (32 + k * 8), 190 + k * 8); });
    // abdomen
    const ay = mos ? 176 : 184;
    blobE(128, ay, mos ? 16 : 30, mos ? 36 : 38, body);
    if (!mos) { X.fillStyle = '#1a1410'; for (let k = 0; k < 3; k++) { X.beginPath(); ell(128, ay - 18 + k * 16, 29 - Math.abs(k - 1) * 4, 5); X.fill(); } path(`M122 ${ay + 34} L128 ${ay + 58} L134 ${ay + 34} Z`, '#1a1410'); }
    else { X.fillStyle = 'rgba(200,30,40,.7)'; X.beginPath(); ell(128, ay + 6, 11, 22); X.fill(); }
    blobE(128, 146, mos ? 16 : 22, mos ? 15 : 18, mos ? dk(body, 0.2) : '#3a2a14');
    if (!mos) furTufts(128, 146, 20, 16, '#e8b020', 18, 5);
    blobE(128, 118, mos ? 15 : 19, mos ? 14 : 17, mos ? body : '#2a2014');
    for (const sd of [-1, 1]) { eye(128 + sd * 11, 114, mos ? 7 : 8, mos ? '#c02020' : '#301818', { sclera: false, glow: mos }); strokeLines('#1a1a1a', 2, () => { X.moveTo(128 + sd * 6, 104); X.quadraticCurveTo(128 + sd * 16, 84, 128 + sd * 22, 80); }); }
    if (mos) strokeLines('#2a1a1a', 2.5, () => { X.moveTo(128, 128); X.lineTo(128, f === 2 ? 176 : 160); });
  };
  P.bird = function (o, f) { // feathered or bat
    const body = o.body || '#6a5a4a'; const bat = o.bat;
    P.wings(bat ? 'bat' : 'feather', 128, 128, o.wingS || 1, f, bat ? (o.wingCol || dk(body, 0.1)) : (o.wingCol || body));
    // talons
    if (!bat) for (const sd of [-1, 1]) { limb(128 + sd * 10, 170, 128 + sd * 14, 206, 5, 4, '#c8a040'); strokeLines('#2a2010', 2.5, () => { for (let k = -1; k <= 1; k++) { X.moveTo(128 + sd * 14, 206); X.lineTo(128 + sd * 14 + k * 7, 216); } }); }
    blobE(128, 150, bat ? 26 : 30, bat ? 30 : 38, body);
    X.fillStyle = o.chest || lt(body, 0.25); X.globalAlpha = 0.7; X.beginPath(); ell(128, 158, bat ? 14 : 18, bat ? 18 : 26); X.fill(); X.globalAlpha = 1;
    if (o.bolts) { strokeLines('#fff8a0', 2.5, () => { X.moveTo(92, 110); X.lineTo(80, 128); X.lineTo(90, 130); X.lineTo(76, 152); X.moveTo(164, 110); X.lineTo(176, 128); X.lineTo(166, 130); X.lineTo(180, 152); }); glowDot(128, 118, 40, '#fff27a', 0.35); }
    // head
    const hy = f === 2 ? 118 : 108;
    if (bat) { for (const sd of [-1, 1]) path(`M${128 + sd * 6} ${hy - 10} L${128 + sd * 22} ${hy - 44} L${128 + sd * 24} ${hy - 6} Z`, body); }
    if (o.bald) { blobE(128, hy + 14, 22, 12, '#f2ece0'); }
    blobE(128, hy, bat ? 20 : 20, bat ? 18 : 19, o.headCol || body);
    if (o.crest) path(`M118 ${hy - 14} Q128 ${hy - 50} 148 ${hy - 40} Q136 ${hy - 30} 138 ${hy - 14} Z`, o.crest);
    for (const sd of [-1, 1]) eye(128 + sd * 9, hy - 2, bat ? 5 : 5.5, o.eyeCol || (bat ? '#ff4040' : '#f2b020'), { sclera: false, glow: bat || o.glowEyes });
    if (bat) { if (f === 2) mouth(128, hy + 12, 8, 5, true); else { teeth(122, hy + 10, 4, 1, 6); teeth(134, hy + 10, 4, 1, 6); } X.fillStyle = dk(body, 0.3); X.beginPath(); ell(128, hy + 4, 4, 3); X.fill(); }
    else { const beak = o.beak || '#e8b040'; path(`M118 ${hy + 4} Q128 ${hy + (f === 2 ? 26 : 30)} 138 ${hy + 4} Q128 ${hy + 10} 118 ${hy + 4} Z`, beak); path(`M128 ${hy + 4} Q134 ${hy + 16} 130 ${hy + 30} Q128 ${hy + 18} 124 ${hy + 10} Z`, dk(beak, 0.2)); }
  };
  P.dragon = function (o, f) {
    const body = o.body || '#5a8ab0'; const belly = o.belly || '#d8e8f0'; const atk = f === 2;
    P.wings('bat', 128, 118, 1.15, f, o.wingCol || dk(body, 0.15));
    // tail
    strokeLines(dk(body, 0.2), 14, () => { X.moveTo(150, 200); X.quadraticCurveTo(210, 230, 222, 180); }); path('M218 176 l18 -6 l-8 18 z', dk(body, 0.3));
    for (const sd of [-1, 1]) { limb(128 + sd * 26, 190, 128 + sd * 30, 236, 12, 9, dk(body, 0.1)); strokeLines('#1a1a1a', 3, () => { for (let k = -1; k <= 1; k++) { X.moveTo(128 + sd * 30, 238); X.lineTo(128 + sd * 30 + k * 7, 246); } }); }
    blobE(128, 176, 42, 46, body);
    X.fillStyle = belly; X.beginPath(); ell(128, 184, 22, 36); X.fill();
    strokeLines(dk(belly, 0.25), 1.5, () => { for (let k = 0; k < 6; k++) { X.moveTo(110, 156 + k * 10); X.lineTo(146, 156 + k * 10); } });
    // neck + head
    const hy = atk ? 102 : 86;
    limb(128, 150, 128, hy + 14, 16, 12, body);
    X.fillStyle = dk(body, 0.25); for (let k = 0; k < 4; k++) { X.beginPath(); X.moveTo(120, 150 - k * 14); X.lineTo(128, 140 - k * 14 - 10); X.lineTo(136, 150 - k * 14); X.fill(); }
    for (const sd of [-1, 1]) path(`M${128 + sd * 12} ${hy - 12} Q${128 + sd * 34} ${hy - 30} ${128 + sd * 40} ${hy - 54} Q${128 + sd * 26} ${hy - 32} ${128 + sd * 4} ${hy - 18} Z`, o.horn || '#e8e0d0');
    blobE(128, hy, 26, 22, body);
    blobE(128, hy + 20, 18, 14, lt(body, 0.1));
    for (const sd of [-1, 1]) eye(128 + sd * 12, hy - 4, 6.5, o.eyeCol || '#ffd040', { sclera: false, glow: true, slit: true });
    X.fillStyle = '#1a1010'; for (const sd of [-1, 1]) { X.beginPath(); ell(128 + sd * 6, hy + 24, 2.5, 2); X.fill(); }
    if (atk) { mouth(128, hy + 32, 14, 8, true); glowDot(128, hy + 40, 26, o.breath || '#ff7a20', 0.8); } else { strokeLines('#1a1010', 2, () => { X.moveTo(116, hy + 30); X.lineTo(140, hy + 30); }); teeth(120, hy + 30, 6, 1, 6); teeth(136, hy + 30, 6, 1, 6); }
  };
  P.rex = function (o, f) {
    const ph = f === 1 ? 1 : -1, atk = f === 2; const body = o.body || '#a8804a';
    strokeLines(dk(body, 0.15), 18, () => { X.moveTo(140, 186); X.quadraticCurveTo(210, 200, 236, 150); });
    for (const sd of [-1, 1]) { limb(128 + sd * 30, 170, 128 + sd * 36, 236 + sd * ph * 4, 20, 13, dk(body, 0.08)); strokeLines('#2a2010', 3, () => { for (let k = -1; k <= 1; k++) { X.moveTo(128 + sd * 36, 238); X.lineTo(128 + sd * 36 + k * 8, 248); } }); }
    blobE(128, 160, 50, 52, body);
    X.fillStyle = lt(body, 0.3); X.beginPath(); ell(128, 172, 28, 38); X.fill();
    if (o.stripes) { X.strokeStyle = o.stripes; X.lineWidth = 5; for (let k = 0; k < 4; k++) { X.beginPath(); X.moveTo(84, 130 + k * 16); X.lineTo(100, 136 + k * 16); X.moveTo(172, 130 + k * 16); X.lineTo(156, 136 + k * 16); X.stroke(); } }
    for (const sd of [-1, 1]) limb(128 + sd * 34, 140, 128 + sd * 42, 162, 5, 4, body);
    const hy = atk ? 104 : 90;
    blobE(128, hy, 40, 30, body);
    if (atk) { X.fillStyle = '#3a0c0c'; X.beginPath(); X.moveTo(96, hy + 8); X.lineTo(160, hy + 8); X.lineTo(150, hy + 44); X.lineTo(106, hy + 44); X.fill(); teeth(128, hy + 8, 60, 9, 12); X.save(); X.translate(0, 0); X.fillStyle = '#f2ead6'; for (let k = 0; k < 7; k++) { const tx = 108 + k * 7; X.beginPath(); X.moveTo(tx, hy + 44); X.lineTo(tx + 3.5, hy + 34); X.lineTo(tx + 7, hy + 44); X.fill(); } X.restore(); blobE(128, hy + 50, 30, 10, body); }
    else { blobE(128, hy + 20, 34, 14, lt(body, 0.05)); strokeLines('#2a1a10', 2.5, () => { X.moveTo(98, hy + 16); X.quadraticCurveTo(128, hy + 24, 158, hy + 16); }); teeth(128, hy + 17, 52, 8, 7); }
    for (const sd of [-1, 1]) eye(128 + sd * 22, hy - 10, 6, o.eyeCol || '#f2c020', { sclera: false, slit: true, brow: dk(body, 0.5), side: sd });
  };
  P.serpent = function (o, f) {
    const body = o.body || '#4a8a3a', belly = o.belly || '#d8d08a'; const atk = f === 2; const ph = f === 1 ? 1 : -1;
    // coils
    blobE(128, 222, 70, 22, dk(body, 0.08)); blobE(122 + ph * 3, 204, 56, 20, body); blobE(132 - ph * 3, 188, 42, 18, lt(body, 0.05));
    X.strokeStyle = dk(body, 0.35); X.lineWidth = 1.5; for (let k = 0; k < 12; k++) { X.beginPath(); X.arc(80 + k * 9, 222 - (k % 3) * 2, 6, 0, PI); X.stroke(); }
    // neck rising
    const hy = atk ? 104 : 88; const nx = 128 + (atk ? 0 : ph * 6);
    X.lineCap = 'round'; X.strokeStyle = body; X.lineWidth = 24; X.beginPath(); X.moveTo(132, 190); X.bezierCurveTo(160, 160, 100, 140, nx, hy + 20); X.stroke();
    X.strokeStyle = belly; X.lineWidth = 10; X.beginPath(); X.moveTo(130, 186); X.bezierCurveTo(156, 160, 102, 142, nx, hy + 24); X.stroke();
    if (o.hood) { X.fillStyle = shade(body, nx - 10, hy + 10, 60); X.beginPath(); ell(nx, hy + 18, 38, 34); X.fill(); X.fillStyle = belly; X.beginPath(); ell(nx, hy + 22, 18, 24); X.fill(); X.strokeStyle = dk(body, 0.4); X.lineWidth = 3; for (const sd of [-1, 1]) { X.beginPath(); ell(nx + sd * 22, hy + 12, 8, 6); X.stroke(); } }
    blobE(nx, hy, 24, 18, body);
    for (const sd of [-1, 1]) eye(nx + sd * 11, hy - 4, 5.5, o.eyeCol || '#f0d020', { sclera: false, slit: true, glow: o.glowEyes });
    if (atk) { mouth(nx, hy + 14, 12, 8, true); } else strokeLines('#1a1010', 2, () => { X.moveTo(nx - 12, hy + 10); X.lineTo(nx + 12, hy + 10); });
    strokeLines('#d82040', 2.5, () => { X.moveTo(nx, hy + 14); X.lineTo(nx, hy + (atk ? 34 : 28)); X.lineTo(nx - 5, hy + (atk ? 40 : 33)); X.moveTo(nx, hy + (atk ? 34 : 28)); X.lineTo(nx + 5, hy + (atk ? 40 : 33)); });
    if (o.pattern) { X.fillStyle = o.pattern; for (let k = 0; k < 6; k++) { X.beginPath(); ell(90 + k * 16, 204 + (k % 2) * 4, 5, 4); X.fill(); } }
  };
  P.worm = function (o, f) {
    const body = o.body || '#c89a8a'; const atk = f === 2; const ph = f === 1 ? 1 : -1;
    for (let k = 0; k < 7; k++) { const y = 236 - k * 22, x = 128 + Math.sin(k * 0.8 + ph * 0.4) * 10; blobE(x, y, 36 - k * 1.5, 16, k % 2 ? body : lt(body, 0.05)); }
    const hy = 236 - 7 * 22 + (atk ? 4 : 0), hx = 128 + Math.sin(7 * 0.8 + ph * 0.4) * 10;
    blobE(hx, hy, 34, 26, lt(body, 0.1));
    X.fillStyle = '#2a0a0a'; X.beginPath(); ell(hx, hy + 2, atk ? 26 : 20, atk ? 20 : 14); X.fill();
    X.fillStyle = '#f2e8d6'; for (let k = 0; k < 12; k++) { const a = k / 12 * PI * 2; const r1 = atk ? 24 : 18; X.beginPath(); X.moveTo(hx + Math.cos(a) * r1, hy + 2 + Math.sin(a) * r1 * 0.75); X.lineTo(hx + Math.cos(a) * r1 * 0.6, hy + 2 + Math.sin(a) * r1 * 0.45); X.lineTo(hx + Math.cos(a + 0.25) * r1, hy + 2 + Math.sin(a + 0.25) * r1 * 0.75); X.fill(); }
  };
  P.toad = function (o, f) {
    const body = o.body || '#6a9a3a'; const atk = f === 2; const ph = f === 1 ? 1 : -1;
    for (const sd of [-1, 1]) { blobE(128 + sd * 62, 214, 30, 24, dk(body, 0.1)); strokeLines(dk(body, 0.3), 5, () => { for (let k = -1; k <= 1; k++) { X.moveTo(128 + sd * 70, 230); X.lineTo(128 + sd * (78 + k * 6), 242); } }); }
    blobE(128, 190 + ph * 2, 78, 54, body);
    X.fillStyle = lt(body, 0.35); X.beginPath(); ell(128, 212, 50, 28); X.fill();
    X.fillStyle = dk(body, 0.3); [[96, 160, 8], [150, 170, 10], [120, 150, 6], [168, 192, 7], [84, 190, 6]].forEach(q => { X.beginPath(); ell(q[0], q[1], q[2], q[2] * 0.8); X.fill(); });
    for (const sd of [-1, 1]) { blobE(128 + sd * 34, 138, 22, 22, body); eye(128 + sd * 34, 136, 14, o.eyeCol || '#e8c030', { sclera: false, squint: 0.8 }); }
    if (atk) { mouth(128, 192, 44, 14); strokeLines('#e05070', 8, () => { X.moveTo(128, 192); X.quadraticCurveTo(128, 230, 128, 250); }); }
    else strokeLines('#1a2a0a', 3.5, () => { X.moveTo(74, 184); X.quadraticCurveTo(128, 206, 182, 184); });
  };
  P.ghost = function (o, f) {
    const col = o.body || '#dfe8f2'; const ph = f === 1 ? 1 : -1; const atk = f === 2;
    X.save(); X.globalAlpha = 0.9;
    glowDot(128, 140, 110, o.aura || col, 0.3);
    const g = X.createLinearGradient(0, 60, 0, 240); g.addColorStop(0, lt(col, 0.3)); g.addColorStop(0.6, col); g.addColorStop(1, css(rgb(col), 0));
    X.fillStyle = g; X.beginPath(); X.moveTo(70, 130);
    X.quadraticCurveTo(70, 50, 128, 50); X.quadraticCurveTo(186, 50, 186, 130);
    X.lineTo(190 + ph * 6, 220); for (let k = 0; k < 5; k++) { const x = 190 - (k + 1) * 24; X.quadraticCurveTo(x + 12 + ph * 4, 200 + (k % 2) * 20, x + ph * 3, 236 - (k % 2) * 14); }
    X.closePath(); X.fill();
    // arms
    for (const sd of [-1, 1]) { X.fillStyle = col; X.beginPath(); X.moveTo(128 + sd * 50, 120); X.quadraticCurveTo(128 + sd * (atk ? 96 : 84), atk ? 90 : 140, 128 + sd * (atk ? 104 : 88), atk ? 72 : 166); X.quadraticCurveTo(128 + sd * 70, 150, 128 + sd * 50, 150); X.fill(); }
    X.restore();
    if (o.hat) P.head({ hat: o.hat, hatOnly: true }, 128, 100, 1.4, atk);
    X.fillStyle = '#10141e'; for (const sd of [-1, 1]) { X.beginPath(); ell(128 + sd * 20, 100, 11, atk ? 16 : 13, sd * 0.2); X.fill(); glowDot(128 + sd * 20, 102, 12, o.eyeCol || '#80d0ff', 0.9); }
    X.fillStyle = '#10141e'; X.beginPath(); ell(128, 138, atk ? 14 : 9, atk ? 16 : 7); X.fill();
  };
  P.flame = function (o, f) {
    const ph = f === 1 ? 1 : -1; const atk = f === 2; const hot = o.hot || '#ffe070', mid = o.body || '#ff7a20', dark = o.dark || '#c02a10';
    glowDot(128, 150, 120, mid, 0.45);
    const tongue = (w, h, col, off) => { X.fillStyle = col; X.beginPath(); X.moveTo(128 - w, 240); X.bezierCurveTo(128 - w * 1.2, 180, 128 - w * 0.2 + off, 150, 128 + off * 1.4, 240 - h); X.bezierCurveTo(128 + w * 0.4 + off, 160, 128 + w * 1.2, 180, 128 + w, 240); X.fill(); };
    tongue(80, 200 + ph * 8, dark, ph * 10); tongue(64, 180 - ph * 8, mid, -ph * 8); tongue(44, 140 + ph * 6, hot, ph * 4);
    for (const sd of [-1, 1]) { X.fillStyle = mid; X.beginPath(); X.moveTo(128 + sd * 40, 160); X.quadraticCurveTo(128 + sd * (atk ? 96 : 76), atk ? 110 : 150, 128 + sd * (atk ? 104 : 84), atk ? 90 : 180); X.quadraticCurveTo(128 + sd * 60, 180, 128 + sd * 36, 190); X.fill(); }
    X.fillStyle = '#3a0a00'; for (const sd of [-1, 1]) { X.beginPath(); X.moveTo(128 + sd * 8, 150); X.lineTo(128 + sd * 30, 140); X.lineTo(128 + sd * 22, 158); X.fill(); }
    glowDot(128 - 18, 150, 8, '#ffffff', 0.9); glowDot(128 + 18, 150, 8, '#ffffff', 0.9);
    if (atk) { X.fillStyle = '#3a0a00'; X.beginPath(); ell(128, 180, 14, 12); X.fill(); }
  };
  P.eyeball = function (o, f) {
    const atk = f === 2; const ph = f === 1 ? 1 : -1; const body = o.body || '#b0506a';
    for (let k = 0; k < 7; k++) { const a = -PI * 0.95 + k * 0.32; const bx = 128 + Math.cos(a) * 64, by = 124 + Math.sin(a) * 64; const ex = 128 + Math.cos(a + ph * 0.1) * 104, ey = 124 + Math.sin(a + ph * 0.1) * 98; X.strokeStyle = body; X.lineWidth = 7; X.lineCap = 'round'; X.beginPath(); X.moveTo(bx, by); X.quadraticCurveTo((bx + ex) / 2 + ph * 10, (by + ey) / 2 - 10, ex, ey); X.stroke(); blobE(ex, ey, 10, 10, '#f4ece0'); X.fillStyle = '#c02060'; X.beginPath(); ell(ex, ey, 5, 5); X.fill(); X.fillStyle = '#000'; X.beginPath(); ell(ex, ey, 2.2, 2.2); X.fill(); }
    for (let k = 0; k < 4; k++) { strokeLines(dk(body, 0.2), 8, () => { X.moveTo(110 + k * 12, 190); X.bezierCurveTo(100 + k * 14 + ph * 10, 214, 116 + k * 10 - ph * 10, 226, 104 + k * 16, 244); }); }
    blobE(128, 136, 66, 64, body);
    blobE(128, 132, 50, 46, '#f6efe4', 0, 0.15);
    X.save(); X.shadowColor = '#ff2a8a'; X.shadowBlur = 20; X.fillStyle = shade('#e0206a', 118, 124, 30); X.beginPath(); ell(128 + (atk ? 0 : ph * 5), 134, 26, 26); X.fill(); X.restore();
    X.fillStyle = '#080404'; X.beginPath(); ell(128 + (atk ? 0 : ph * 5), 134, atk ? 7 : 11, 20); X.fill();
    X.fillStyle = 'rgba(255,255,255,.85)'; X.beginPath(); ell(114, 120, 7, 5); X.fill();
    strokeLines('rgba(200,40,60,.5)', 1.5, () => { for (let k = 0; k < 6; k++) { const a = k * 1.1; X.moveTo(128 + Math.cos(a) * 48, 132 + Math.sin(a) * 44); X.lineTo(128 + Math.cos(a + 0.2) * 32, 132 + Math.sin(a + 0.25) * 30); } });
    X.fillStyle = dk(body, 0.2); X.beginPath(); X.moveTo(62, 136); X.quadraticCurveTo(128, atk ? 60 : 78, 194, 136); X.quadraticCurveTo(128, atk ? 70 : 88, 62, 136); X.fill();
  };
  P.golem = function (o, f) {
    const rock = o.body || '#7a7470'; const rune = o.rune || '#6ae0ff'; const atk = f === 2; const ph = f === 1 ? 1 : -1;
    const chunk = (x, y, w, h, c) => { X.fillStyle = shade(c, x - w * 0.3, y - h * 0.4, Math.max(w, h) * 1.3); X.beginPath(); X.moveTo(x - w, y - h * 0.6); X.lineTo(x - w * 0.5, y - h); X.lineTo(x + w * 0.6, y - h * 0.9); X.lineTo(x + w, y - h * 0.2); X.lineTo(x + w * 0.8, y + h * 0.8); X.lineTo(x - w * 0.3, y + h); X.lineTo(x - w * 0.95, y + h * 0.5); X.fill(); };
    for (const sd of [-1, 1]) { chunk(128 + sd * 30, 212 + sd * ph * 3, 22, 26, dk(rock, 0.15)); }
    chunk(128, 150, 62, 52, rock);
    if (o.moss) { X.fillStyle = o.moss; X.beginPath(); ell(110, 108, 34, 10); X.fill(); X.beginPath(); ell(150, 112, 20, 8); X.fill(); }
    strokeLines(rune, 3, () => { X.moveTo(110, 140); X.lineTo(122, 156); X.lineTo(114, 170); X.moveTo(146, 136); X.lineTo(138, 152); X.lineTo(150, 166); X.moveTo(128, 180); X.lineTo(128, 196); });
    glowDot(128, 158, 24, rune, 0.5);
    for (const sd of [-1, 1]) { const ax = 128 + sd * 74, ay = atk ? 90 : 150; chunk(128 + sd * 64, 118, 22, 20, rock); chunk(ax, ay + 20, 20, 24, dk(rock, 0.05)); chunk(ax + sd * 2, ay + (atk ? -10 : 56), 24, 22, lt(rock, 0.05)); }
    chunk(128, 88, 28, 24, lt(rock, 0.05));
    for (const sd of [-1, 1]) { X.save(); X.shadowColor = rune; X.shadowBlur = 12; X.fillStyle = rune; X.beginPath(); X.moveTo(128 + sd * 16, 84); X.lineTo(128 + sd * 4, 88); X.lineTo(128 + sd * 16, 92); X.fill(); X.restore(); }
  };
  P.treant = function (o, f) {
    const bark = o.body || '#6a4a2e'; const leaf = o.leaf || '#4a8a2e'; const atk = f === 2; const ph = f === 1 ? 1 : -1;
    // roots
    for (let k = -2; k <= 2; k++) strokeLines(dk(bark, 0.2), 9, () => { X.moveTo(128 + k * 12, 200); X.quadraticCurveTo(128 + k * 26, 228 + (k % 2 ? ph : -ph) * 4, 128 + k * 36, 244); });
    // crown behind
    [[80, 64, 40], [128, 44, 48], [176, 64, 40], [104, 92, 36], [152, 92, 36]].forEach(q => blobE(q[0], q[1], q[2], q[2] * 0.85, leaf));
    X.fillStyle = lt(leaf, 0.25); for (let k = 0; k < 18; k++) { const x = 70 + (k * 37) % 120, y = 30 + (k * 23) % 80; X.beginPath(); ell(x, y, 5, 3, k); X.fill(); }
    // branch arms
    for (const sd of [-1, 1]) { const ex = 128 + sd * (atk ? 70 : 82), ey = atk ? 70 : 150; limb(128 + sd * 30, 118, 128 + sd * 60, 126, 12, 9, bark); limb(128 + sd * 60, 126, ex, ey, 9, 5, bark); strokeLines(bark, 3, () => { X.moveTo(ex, ey); X.lineTo(ex + sd * 12, ey - 10); X.moveTo(ex, ey); X.lineTo(ex + sd * 4, ey + 14); X.moveTo(ex, ey); X.lineTo(ex + sd * 14, ey + 6); }); blobE(ex + sd * 8, ey - 8, 14, 10, leaf); }
    // trunk
    X.fillStyle = shade(bark, 110, 130, 110); X.beginPath(); X.moveTo(92, 104); X.quadraticCurveTo(86, 170, 96, 214); X.lineTo(160, 214); X.quadraticCurveTo(170, 170, 164, 104); X.fill();
    strokeLines(dk(bark, 0.35), 2.5, () => { for (let k = 0; k < 6; k++) { X.moveTo(98 + k * 12, 110); X.quadraticCurveTo(96 + k * 12 + (k % 2 ? 6 : -6), 160, 100 + k * 11, 210); } });
    X.fillStyle = '#1a0e06'; for (const sd of [-1, 1]) { X.beginPath(); ell(128 + sd * 14, 140, 9, 7, sd * 0.3); X.fill(); }
    glowDot(114, 141, 7, '#c8ff6a', 0.9); glowDot(142, 141, 7, '#c8ff6a', 0.9);
    X.fillStyle = '#1a0e06'; X.beginPath(); ell(128, 170, atk ? 14 : 12, atk ? 12 : 5); X.fill();
  };
  P.mushroomMan = function (o, f) {
    const cap = o.body || '#c8a030'; const stem = '#efe2c4'; const atk = f === 2; const ph = f === 1 ? 1 : -1;
    for (const sd of [-1, 1]) blobE(128 + sd * 20, 232 + sd * ph * 2, 16, 10, dk(stem, 0.2));
    blobE(128, 190, 38, 46, stem);
    for (const sd of [-1, 1]) limb(128 + sd * 34, 180, 128 + sd * (atk ? 56 : 50), atk ? 150 : 206, 8, 7, stem);
    for (const sd of [-1, 1]) eye(128 + sd * 14, 184, 7, '#2a1a10', { sclera: true });
    if (atk) mouth(128, 206, 10, 6); else strokeLines('#4a2a10', 2, () => { X.moveTo(120, 206); X.quadraticCurveTo(128, 210, 136, 206); });
    X.fillStyle = shade(cap, 100, 110, 110); X.beginPath(); X.moveTo(50, 160); X.quadraticCurveTo(60, 60, 128, 58); X.quadraticCurveTo(196, 60, 206, 160); X.quadraticCurveTo(128, 140, 50, 160); X.fill();
    X.fillStyle = 'rgba(255,248,220,.9)'; [[94, 104, 12], [140, 86, 10], [172, 124, 9], [118, 132, 8], [70, 138, 7], [162, 146, 7]].forEach(q => { X.beginPath(); ell(q[0], q[1], q[2], q[2] * 0.8); X.fill(); });
    glowDot(80, 70, 10, '#e8f070', 0.6); glowDot(180, 60, 8, '#e8f070', 0.6); glowDot(128, 36, 7, '#e8f070', 0.6);
  };
  P.cloud = function (o, f) {
    const col = o.body || '#6a8a3a'; const ph = f === 1 ? 1 : -1; const atk = f === 2;
    glowDot(128, 140, 120, col, 0.35);
    [[80, 150, 44], [176, 150, 44], [128, 110, 56], [104, 176, 40], [152, 176, 40], [128, 160, 50]].forEach((q, i) => blobE(q[0] + (i % 2 ? ph : -ph) * 4, q[1], q[2], q[2] * 0.85, i % 2 ? col : lt(col, 0.1), 0, 0.2));
    X.fillStyle = 'rgba(20,24,10,.85)'; for (const sd of [-1, 1]) { X.beginPath(); ell(128 + sd * 20, 130, 13, atk ? 16 : 12); X.fill(); glowDot(128 + sd * 20, 132, 8, '#d0ff60', 0.8); }
    X.beginPath(); X.moveTo(110, 162); for (let k = 0; k < 6; k++) X.lineTo(110 + k * 7 + 3.5, k % 2 ? 162 : 172 + (atk ? 6 : 0)); X.lineTo(152, 162); X.fill();
    for (let k = 0; k < 10; k++) glowDot(60 + (k * 53) % 140, 200 + (k * 17) % 40, 5, '#b8ff40', 0.7);
  };
  P.wisp = function (o, f) {
    const col = o.body || '#9affd8'; const ph = f === 1 ? 1 : -1;
    P.wings('fairy', 128, 130, 1.4, f, col);
    glowDot(128, 130, 90, col, 0.5); glowDot(128, 130, 44, '#ffffff', 0.9);
    for (let k = 0; k < 8; k++) { const a = k * 0.8 + ph * 0.3; glowDot(128 + Math.cos(a) * 70, 130 + Math.sin(a) * 60, 6, col, 0.9); }
    X.fillStyle = 'rgba(20,60,50,.8)'; for (const sd of [-1, 1]) { X.beginPath(); ell(128 + sd * 11, 126, 5, 7); X.fill(); }
  };

  // ---------- post: outline + drop glow ----------
  function outline(src, col, w) {
    const c = document.createElement('canvas'); c.width = c.height = SZ; const ctx = c.getContext('2d');
    for (let a = 0; a < 12; a++) { const dx = Math.cos(a / 12 * PI * 2) * w, dy = Math.sin(a / 12 * PI * 2) * w; ctx.drawImage(src, dx, dy); }
    ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = col; ctx.fillRect(0, 0, SZ, SZ);
    ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(src, 0, 0);
    return c;
  }
  function paint(archetype, opts, f) {
    const c = document.createElement('canvas'); c.width = c.height = SZ; X = c.getContext('2d');
    X.lineCap = 'round'; X.lineJoin = 'round';
    if (opts.flip) { X.translate(SZ, 0); X.scale(-1, 1); }
    // leave 6px margin for outline
    X.translate(128, 128); X.scale(0.95, 0.95); X.translate(-128, -128);
    P[archetype](opts, f);
    return outline(c, opts.outline || 'rgba(18,10,8,0.92)', 3.2);
  }
  A.paint = paint;

  // =====================================================================
  // MONSTER CATALOGUE
  // =====================================================================
  const M = {
    rat: ['quad', { kind: 'rat', body: '#7a6a5e', ears: 'rat', head: 0.85, legs: 0.6, bw: 0.8, bh: 0.8, tailCol: '#e0a0a8', tailW: 5, tailLen: 20, eyeCol: '#e02020', glowEyes: true, eyeR: 5 }],
    wolf: ['quad', { kind: 'wolf', body: '#8a8a90', ears: 'point', muzzle: '#d8d8dc', snout: 1.1, belly: '#d8d8dc', eyeCol: '#f2c020', mane: '#6e6e76', cheeks: '#c8c8cc' }],
    boar: ['quad', { kind: 'boar', body: '#6a4a38', ears: 'point', earIn: '#8a5a48', tusks: true, spikes: '#3a2418', hoof: true, eyeCol: '#e02a1a', glowEyes: true, eyeR: 5, bw: 1.1, headW: 40 }],
    goblin: ['humanoid', { skin: '#6aa04a', cloth: '#7a5a3a', pants: '#4a3a2a', ears: 'goblin', bigNose: true, eyeCol: '#e8d020', grin: true, weapon: 'club', headR: 30, scale: 0.9, belt: '#3a2618', eyeGlow: null }],
    slinger: ['humanoid', { skin: '#7ab050', cloth: '#5a6a3a', pants: '#3a3a2a', ears: 'goblin', bigNose: true, eyeCol: '#e8d020', weapon: 'sling', headR: 29, scale: 0.88, hat: 'bandana', hatCol: '#9a2a2a' }],
    bee: ['insect', { body: '#f0b820' }],
    spider: ['spider', { body: '#3e2a3a', mark: '#c02030', hairy: true }],
    bear: ['quad', { kind: 'bear', body: '#6a4a30', ears: 'round', muzzle: '#b08a60', snout: 0.8, eyeCol: '#1a1010', eyeR: 5, bw: 1.15, bh: 1.2, head: 1.15, headW: 40, tail: false, shag: true }],
    fox: ['quad', { kind: 'wolf', body: '#d8702a', ears: 'point', earTip: '#2a1a14', muzzle: '#f4ece0', cheeks: '#f4ece0', belly: '#f4ece0', snout: 1.1, eyeCol: '#f2d040', slit: true, tailCol: '#d8702a', tailTip: '#f4ece0', tailW: 16, bw: 0.85 }],
    oakling: ['treant', { body: '#6a4a2e', leaf: '#4a8a2e' }],
    wisp: ['wisp', { body: '#9affd8' }],
    crab: ['crab', { body: '#d0562e' }],
    serpent: ['serpent', { body: '#3a7a8a', belly: '#c8e0c8', eyeCol: '#f0e040', pattern: '#1a4a5a' }],
    brigand: ['humanoid', { skin: '#d8a880', cloth: '#5a3a2a', pants: '#3a2a20', hat: 'hood', hood: '#3a3a2a', mask: 'rgba(40,30,20,.85)', weapon: 'sword', offhand: 'dagger', eyeCol: '#2a1a10', belt: '#2a1a10' }],
    hexer: ['humanoid', { skin: '#d8b090', cloth: '#4a2a5a', robe: true, robeTrim: '#b890e0', hat: 'hood', hood: '#3a1a4a', weapon: 'staff', orb: '#b060ff', eyeGlow: '#d080ff' }],
    bat: ['bird', { bat: true, body: '#4a3a3a', wingCol: '#3a2a2a', wingS: 0.85 }],
    toad: ['toad', { body: '#7aa03a', eyeCol: '#f0c030' }],
    croc: ['quad', { kind: 'wolf', body: '#4a6a3a', low: true, legs: 1, bw: 1.3, bh: 0.7, head: 1.2, headW: 44, headH: 26, snout: 1.4, muzW: 1.3, muzzle: '#5a7a44', ears: 'none', eyeCol: '#e0c020', slit: true, scales: true, spikes: '#2a4a2a', tailW: 16, belly: '#c8c89a' }],
    zombie: ['humanoid', { skin: '#8aa088', cloth: '#4a5a6a', pants: '#3a3a3a', armsUp: true, eyeGlow: '#e8ff60', hair: '#3a3a2a', grin: false, headR: 26, bandage: false }],
    mosquito: ['insect', { body: '#5a4a3a', mos: true }],
    sporeling: ['mushroomMan', { body: '#c89a30' }],
    scorpion: ['scorpion', { body: '#a86a2a' }],
    skeleton: ['humanoid', { headType: 'skull', skin: '#e8e0cc', cloth: '#6a6258', ribs: true, pants: '#dcd2bc', sleeve: '#dcd2bc', hand: '#e8e0cc', boots: '#cfc5ae', weapon: 'sword', offhand: 'shield', eyeGlow: '#60d0ff', armor: null }],
    cobra: ['serpent', { body: '#b8903a', belly: '#f0e0a0', hood: true, eyeCol: '#ff4020', pattern: '#5a3a14' }],
    djinn: ['humanoid', { skin: '#4a8ae0', cloth: '#d8a830', noLegs: true, smoke: '#4a8ae0', hat: 'turban', hatCol: '#f0e8d8', beard: '#1a2a6a', beardLen: 1.4, weapon: 'lamp', eyeGlow: '#ffe070', armor: null, bulk: 1.15, belt: '#a02a4a' }],
    vulture: ['bird', { body: '#4a3a30', headCol: '#d8a0a0', bald: true, beak: '#d8c890', chest: '#6a5a4a' }],
    mummy: ['humanoid', { skin: '#c8b890', cloth: '#b8a880', pants: '#b0a078', sleeve: '#b8a880', bandage: true, armsUp: true, eyeGlow: '#40ff90', hand: '#b8a880' }],
    golem: ['golem', { body: '#7a7470', rune: '#6ae0ff', moss: '#5a7a3a' }],
    ogre: ['humanoid', { skin: '#a8a060', cloth: '#6a4a2a', bulk: 1.45, belly: '#b8b070', tusks: true, bigNose: true, headR: 28, weapon: 'club', eyeCol: '#2a1a0a', pants: '#4a3420', brow: '#3a2a10', scale: 1.02 }],
    direwolf: ['quad', { kind: 'wolf', body: '#4a4a52', ears: 'point', muzzle: '#8a8a90', snout: 1.15, mane: '#2a2a32', eyeCol: '#ff4020', glowEyes: true, spikes: '#2a2a32', bw: 1.1 }],
    roc: ['bird', { body: '#8a5a2a', headCol: '#a86a30', beak: '#e0b040', chest: '#d8b070', crest: '#c03020', wingS: 1.1 }],
    goat: ['quad', { kind: 'wolf', body: '#e0d8c8', ears: 'point', horns: 'ram', muzzle: '#f0e8dc', snout: 1.2, hoof: true, beard: '#d8d0c0', eyeCol: '#d0a020', slit: true, tail: false, shag: true }],
    mammoth: ['quad', { kind: 'trunk', body: '#6a4a34', ears: 'big', tusks: 'big', shag: true, bw: 1.2, bh: 1.3, head: 1.2, headW: 40, eyeCol: '#1a1010', eyeR: 5, hoof: true, frost: true, tail: false }],
    icewraith: ['ghost', { body: '#a8e0ff', eyeCol: '#e0f8ff', hat: 'icecrown', aura: '#6ac8ff' }],
    frostwolf: ['quad', { kind: 'wolf', body: '#d8e8f4', ears: 'point', muzzle: '#ffffff', snout: 1.1, mane: '#a8c8e0', eyeCol: '#40c0ff', glowEyes: true, frost: true, belly: '#ffffff' }],
    yeti: ['humanoid', { skin: '#a8c0d8', cloth: '#eef4fa', sleeve: '#eef4fa', pants: '#e0eaf2', fur: true, bulk: 1.4, headR: 28, hair: '#f0f6fc', tusks: true, eyeCol: '#2a4a8a', hand: '#a8c0d8', boots: '#d8e2ea', claws: true }],
    drake: ['dragon', { body: '#6a9ac8', belly: '#e0f0fa', horn: '#f0f4f8', eyeCol: '#80e0ff', breath: '#a0e8ff' }],
    thunderbird: ['bird', { body: '#3a4a8a', headCol: '#4a5aa0', beak: '#f0d040', chest: '#f0e070', crest: '#fff27a', bolts: true, glowEyes: true, eyeCol: '#fff27a', wingS: 1.05 }],
    ogremage: ['humanoid', { skin: '#7a90c8', cloth: '#3a2a6a', robe: true, robeTrim: '#e0c050', bulk: 1.35, tusks: true, bigNose: true, headR: 28, weapon: 'staff', orb: '#5a8aff', hat: 'wizard', hatCol: '#2a2a6a' }],
    ghoul: ['humanoid', { skin: '#8a9a7a', cloth: '#4a4a3a', pants: '#3a3a2a', claws: true, fangs: true, eyeGlow: '#ff3030', armLen: 1.25, headR: 25, hair: null }],
    plague: ['cloud', { body: '#7a9a2a' }],
    worm: ['worm', { body: '#c88a7a' }],
    vampbat: ['bird', { bat: true, body: '#5a1a2a', wingCol: '#4a0a1a', eyeCol: '#ff2040' }],
    vampire: ['humanoid', { skin: '#e8e0e8', cloth: '#2a1a2a', cape: '#1a0a14', capeIn: '#8a0a1a', hair: '#1a1014', fangs: true, eyeGlow: '#ff2040', pants: '#1a1418', offhand: 'orb', orb: '#c0102a' }],
    imp: ['humanoid', { skin: '#d8402a', cloth: '#d8402a', sleeve: '#d8402a', pants: '#b8301a', hand: '#d8402a', boots: '#3a1010', horns: true, hornCol: '#3a1a14', wings: 'bat', wingCol: '#8a2014', tail: '#b8301a', grin: true, fangs: true, eyeGlow: '#ffe040', ears: 'elf', scale: 0.85, headR: 30, weapon: 'orb', orb: '#ff6a10' }],
    demon: ['humanoid', { skin: '#a82a1a', cloth: '#a82a1a', sleeve: '#a82a1a', pants: '#6a1a10', hand: '#a82a1a', boots: '#2a0a08', horns: true, hornCol: '#e8d8c0', wings: 'bat', wingCol: '#5a1008', tail: '#6a1a10', bulk: 1.35, fangs: true, eyeGlow: '#ffb020', claws: true, belly: '#c83a24', weapon: 'scythe', headR: 27 }],
    fireelem: ['flame', { body: '#ff7a20' }],
    watcher: ['eyeball', { body: '#a8506a' }],
    hellwyrm: ['dragon', { body: '#8a1a14', belly: '#e8a040', horn: '#2a1a14', eyeCol: '#ffd040', breath: '#ff6a10' }],
    deathstalker: ['scorpion', { body: '#2a1e1e', sting: '#c02010', eyeCol: '#ff3020' }],
    skelmage: ['humanoid', { headType: 'skull', skin: '#e8e0cc', cloth: '#2a3a4a', robe: true, robeTrim: '#60ffc0', hat: 'hood', hood: '#1a2a3a', hand: '#e8e0cc', weapon: 'staff', orb: '#60ffc0', eyeGlow: '#60ffc0' }],
    rex: ['rex', { body: '#b8884a', stripes: '#6a4a24' }],
    ghost: ['ghost', { body: '#d0dce8', eyeCol: '#a0f0ff' }],
  };
  // bosses get unique looks
  const BOSS = {
    grukk: ['humanoid', { skin: '#5a9040', cloth: '#6a2a1a', pants: '#3a2a1a', ears: 'goblin', bigNose: true, eyeCol: '#ff4020', grin: true, weapon: 'club', headR: 30, hat: 'crown', bulk: 1.25, armor: '#8a8070', belt: '#2a1a0a' }],
    malgrath: ['humanoid', { skin: '#6a0a1a', cloth: '#3a0808', sleeve: '#6a0a1a', pants: '#2a0606', hand: '#6a0a1a', boots: '#100404', horns: true, hornCol: '#1a1010', wings: 'bat', wingCol: '#2a0406', tail: '#3a0808', bulk: 1.4, fangs: true, eyeGlow: '#ff3a10', claws: true, cape: '#1a0404', capeIn: '#8a1a0a', weapon: 'scythe', hat: 'crown', headR: 28, armor: '#2a2224' }],
    vorn: ['humanoid', { headType: 'skull', skin: '#e8e0cc', cloth: '#1a2a24', robe: true, robeTrim: '#8affd0', hat: 'crown', hand: '#e8e0cc', weapon: 'staff', orb: '#8affd0', eyeGlow: '#8affd0', cape: '#0a1410', capeIn: '#1a4a3a' }],
    titan: ['flame', { body: '#ff5a10', hot: '#fff0a0', dark: '#8a1a04' }],
    plaguemother: ['cloud', { body: '#5a8a1a' }],
    stormcaller: ['bird', { body: '#2a2a6a', headCol: '#3a3a8a', beak: '#fff27a', chest: '#fff8b0', crest: '#ffffff', bolts: true, glowEyes: true, eyeCol: '#ffffff', wingS: 1.15 }],
    iskarr: ['dragon', { body: '#b8e0f8', belly: '#ffffff', horn: '#60b0e0', eyeCol: '#20a0ff', breath: '#c0f0ff' }],
    sekhet: ['scorpion', { body: '#d8a040', sting: '#40ff80', eyeCol: '#40ff80' }],
    bogking: ['quad', { kind: 'wolf', body: '#3a5a2a', low: true, bw: 1.3, bh: 0.75, head: 1.25, headW: 46, headH: 28, snout: 1.4, muzW: 1.3, muzzle: '#4a6a34', ears: 'none', eyeCol: '#ff4020', glowEyes: true, slit: true, scales: true, spikes: '#1a2a14', tailW: 18, belly: '#a8a878', horns: 'short' }],
    grizzle: ['quad', { kind: 'bear', body: '#5a3a24', ears: 'round', muzzle: '#9a7a54', snout: 0.8, eyeCol: '#ff3020', glowEyes: true, eyeR: 5, bw: 1.2, bh: 1.25, head: 1.2, headW: 42, tail: false, shag: true, mane: '#3a2414' }],
    nessa: ['serpent', { body: '#2a5a8a', belly: '#b8e0e8', eyeCol: '#80ffff', glowEyes: true, pattern: '#0a2a4a', hood: true }],
    vexa: ['spider', { body: '#2a1a2a', mark: '#ff2a60', hairy: true, eyeCol: '#ff60a0' }],
    grax: ['golem', { body: '#5a5a62', rune: '#ffb040', moss: null }],
  };
  A.hasArt = id => !!M[id];
  const cache = {};
  function makeFrames(key, spec) {
    if (cache[key]) return cache[key];
    const frames = [0, 1, 2].map(f => { const t = new THREE.CanvasTexture(paint(spec[0], spec[1], f)); t.anisotropy = 4; return t; });
    cache[key] = frames; return frames;
  }
  A.monster = function (typeId, bossId) {
    if (bossId && BOSS[bossId]) return makeFrames('b_' + bossId, BOSS[bossId]);
    if (M[typeId]) return makeFrames(typeId, M[typeId]);
    return null;
  };

  // ---------- NPCs ----------
  const NPC = {
    maren: { skin: '#e8c0a0', cloth: '#6a3a5a', robe: true, robeTrim: '#e8c878', hair: '#e8e8e8', longHair: true, smile: true, offhand: 'staff', orb: '#ffe8a0' },
    orrin: { skin: '#e0b898', cloth: '#4a5a8a', robe: true, robeTrim: '#d8c070', hat: 'wizard', hatCol: '#3a4a8a', beard: '#e8e8e8', weapon: 'staff', orb: '#8ab0ff' },
    bram: { skin: '#c8905e', cloth: '#5a6a2a', pants: '#4a3a2a', hat: 'cap', hatCol: '#6a4a2a', beard: '#6a3a1a', beardLen: 1.2, weapon: 'dagger', belt: '#3a2618' },
    tomas: { skin: '#e0a880', cloth: '#8a5a2a', pants: '#4a3a2a', beard: '#8a5a2a', belly: '#9a6a3a', smile: true, belt: '#3a2618', bulk: 1.2 },
    hilda: { skin: '#e8b898', cloth: '#6a6a70', armor: '#a8aab0', hair: '#d8a040', longHair: true, weapon: 'sword', offhand: 'shield' },
    sylva: { skin: '#e8c8a0', cloth: '#3a6a3a', pants: '#2a4a2a', hat: 'hood', hood: '#2a5a2a', ears: 'elf', eyeCol: '#2a8a4a', weapon: 'dagger' },
    fenn: { skin: '#d8a078', cloth: '#7a6a4a', pants: '#4a3a2a', hair: '#6a4a2a', beard: '#6a4a2a', beardLen: 1.1, weapon: 'club' },
    ivy: { skin: '#f0c8a8', cloth: '#5a8a4a', robe: true, robeTrim: '#e8d0f0', hair: '#8a3a1a', longHair: true, smile: true },
    rook: { skin: '#c8905e', cloth: '#5a4a3a', armor: '#7a6a5a', hair: '#2a1a14', weapon: 'sword' },
    agatha: { skin: '#b8c0a0', cloth: '#3a3a2a', robe: true, robeTrim: '#8aa060', hat: 'wizard', hatCol: '#2a2a1a', bigNose: true, grin: true, hair: '#a0a8a0', longHair: true, offhand: 'orb', orb: '#80ff80' },
    gil: { skin: '#d8a888', cloth: '#5a5a3a', pants: '#3a3a2a', hat: 'cap', hatCol: '#4a4a3a', beard: '#b8b8b0', beardLen: 1.1 },
    mossa: { skin: '#e0b090', cloth: '#6a7a3a', robe: true, robeTrim: '#c8a040', hair: '#3a2a1a', longHair: true, smile: true },
    brand: { skin: '#c89070', cloth: '#4a3a2a', armor: '#5a5a5a', bulk: 1.3, beard: '#2a1a14', weapon: 'club' },
    rahim: { skin: '#b07850', cloth: '#e8e0d0', robe: true, robeTrim: '#d8a030', hat: 'turban', hatCol: '#3a5aa0', beard: '#2a1a14', beardLen: 1.3, offhand: 'staff', orb: '#ffd060' },
    tariq: { skin: '#a87048', cloth: '#8a6a4a', robe: true, robeTrim: '#4a3a2a', hat: 'turban', hatCol: '#e0d8c8', beard: '#4a3a2a', weapon: 'staff', orb: '#ffe0a0' },
    samira: { skin: '#c89068', cloth: '#8a2a6a', robe: true, robeTrim: '#f0c040', hair: '#1a1014', longHair: true, smile: true, offhand: 'orb', orb: '#ff80e0' },
    zahir: { skin: '#a87048', cloth: '#c8b080', armor: '#d8b060', hat: 'turban', hatCol: '#e8e0d0', weapon: 'sword' },
    brynja: { skin: '#f0d0b8', cloth: '#3a4a6a', armor: '#b8c0c8', hat: 'crown', hair: '#f0d890', longHair: true, weapon: 'sword', cape: '#8a1a1a' },
    olaf: { skin: '#e8b898', cloth: '#6a4a2a', fur: true, bulk: 1.35, hat: 'helm', hatCol: '#9a9aa0', beard: '#d86a2a', beardLen: 1.9, weapon: 'club' },
    hakon: { skin: '#e8c0a0', cloth: '#3a5a7a', robe: true, robeTrim: '#e8e8f0', hair: '#e0d8c0', beard: '#e0d8c0', offhand: 'orb', orb: '#80d0ff' },
    sigrid: { skin: '#f0c8b0', cloth: '#4a4a5a', armor: '#9aa0a8', hat: 'helm', hatCol: '#9aa0a8', plume: '#c02020', hair: '#e8c080', weapon: 'sword', offhand: 'shield' },
  };
  A.npc = function (def) {
    const key = 'npc_' + def.id; if (cache[key]) return cache[key];
    const o = Object.assign({ headR: 28 }, NPC[def.id] || { skin: '#e0b090', cloth: '#6a5a4a' });
    const t = new THREE.CanvasTexture(paint('humanoid', o, 0)); t.anisotropy = 4; cache[key] = t; return t;
  };
  // debug: contact sheet of all creatures
  A.sheet = function () {
    const ids = Object.keys(M).concat(Object.keys(BOSS).map(b => 'boss:' + b)).concat(G.NPCS.map(n => 'npc:' + n.id));
    const cols = 10, S = 128; const c = document.createElement('canvas'); c.width = cols * S; c.height = Math.ceil(ids.length / cols) * S * 1.15;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#5a7a4a'; ctx.fillRect(0, 0, c.width, c.height); ctx.font = '11px sans-serif'; ctx.fillStyle = '#fff';
    ids.forEach((id, i) => {
      let img;
      if (id.startsWith('boss:')) img = paint(BOSS[id.slice(5)][0], BOSS[id.slice(5)][1], i % 3 === 2 ? 2 : 0);
      else if (id.startsWith('npc:')) img = paint('humanoid', Object.assign({ headR: 28 }, NPC[id.slice(4)]), 0);
      else img = paint(M[id][0], M[id][1], 0);
      const x = (i % cols) * S, y = Math.floor(i / cols) * S * 1.15; ctx.drawImage(img, x, y, S, S); ctx.fillText(id, x + 4, y + S + 10);
    });
    return c.toDataURL();
  };
})();
