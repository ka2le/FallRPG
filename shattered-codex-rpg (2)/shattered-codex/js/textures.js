'use strict';
(function () {
  const U = G.U;
  const T = G.T = {};
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Segoe UI Symbol",sans-serif';
  T.EMOJI_FONT = EMOJI_FONT;

  // Periodic (tileable) value-noise fbm
  function pnoise(S, periods, seed) {
    const r = U.rng(seed); const out = new Float32Array(S * S); let tw = 0;
    periods.forEach((p, oi) => {
      const w = 1 / (oi + 1); tw += w;
      const g = new Float32Array(p * p); for (let i = 0; i < g.length; i++) g[i] = r();
      for (let y = 0; y < S; y++) {
        const fy = y / S * p, iy = Math.floor(fy), ty = fy - iy, sy = ty * ty * (3 - 2 * ty);
        const y0 = iy % p, y1 = (iy + 1) % p;
        for (let x = 0; x < S; x++) {
          const fx = x / S * p, ix = Math.floor(fx), tx = fx - ix, sx = tx * tx * (3 - 2 * tx);
          const x0 = ix % p, x1 = (ix + 1) % p;
          const a = g[y0 * p + x0], b = g[y0 * p + x1], c = g[y1 * p + x0], d = g[y1 * p + x1];
          out[y * S + x] += w * ((a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy);
        }
      }
    });
    for (let i = 0; i < out.length; i++) out[i] /= tw;
    return out;
  }
  function hex(h) { return [(h >> 16) & 255, (h >> 8) & 255, h & 255]; }
  function wrapDraw(S, x, y, fn) { for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) fn(x + ox * S, y + oy * S); }

  function baseTex(S, a, b, seed, contrast, post) {
    const c = document.createElement('canvas'); c.width = c.height = S;
    const ctx = c.getContext('2d'); const img = ctx.createImageData(S, S);
    const n1 = pnoise(S, [4, 8, 16, 32], seed), n2 = pnoise(S, [32, 64, 128], seed + 7);
    const A = hex(a), B = hex(b);
    for (let i = 0; i < S * S; i++) {
      let t = U.clamp((n1[i] - 0.5) * contrast + 0.5, 0, 1);
      const d = 0.82 + n2[i] * 0.36;
      img.data[i * 4] = (A[0] + (B[0] - A[0]) * t) * d;
      img.data[i * 4 + 1] = (A[1] + (B[1] - A[1]) * t) * d;
      img.data[i * 4 + 2] = (A[2] + (B[2] - A[2]) * t) * d;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    if (post) post(ctx, S, U.rng(seed + 99));
    return c;
  }
  function toTex(c, rep) {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (rep) t.repeat.set(rep[0], rep[1]);
    t.anisotropy = 8;
    return t;
  }
  function strokes(ctx, S, r, n, colors, len, width, angJit) {
    for (let i = 0; i < n; i++) {
      const x = r() * S, y = r() * S, l = len * (0.5 + r()), a = -Math.PI / 2 + (r() - 0.5) * angJit;
      ctx.strokeStyle = colors[Math.floor(r() * colors.length)]; ctx.lineWidth = width * (0.6 + r() * 0.8);
      wrapDraw(S, x, y, (px, py) => { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); ctx.stroke(); });
    }
  }
  function blobs(ctx, S, r, n, colors, rad) {
    for (let i = 0; i < n; i++) {
      const x = r() * S, y = r() * S, rr = rad * (0.4 + r());
      ctx.fillStyle = colors[Math.floor(r() * colors.length)];
      wrapDraw(S, x, y, (px, py) => { ctx.beginPath(); ctx.ellipse(px, py, rr, rr * (0.6 + r() * 0.5), r() * 3, 0, Math.PI * 2); ctx.fill(); });
    }
  }

  T.terrainTextures = function () {
    const S = 256;
    const list = [
      baseTex(S, 0x3f7a2c, 0x6f9e3a, 11, 1.6, (ctx, S, r) => { strokes(ctx, S, r, 900, ['rgba(40,90,25,.55)', 'rgba(120,170,60,.5)', 'rgba(90,140,40,.6)'], 7, 1.4, 0.9); blobs(ctx, S, r, 12, ['rgba(230,220,90,.5)', 'rgba(240,240,240,.45)'], 1.6); }),
      baseTex(S, 0x2f4a1e, 0x4a5a26, 12, 1.7, (ctx, S, r) => { blobs(ctx, S, r, 160, ['rgba(90,60,25,.45)', 'rgba(120,90,30,.4)', 'rgba(40,70,20,.5)'], 4); strokes(ctx, S, r, 300, ['rgba(30,60,20,.6)'], 6, 1.2, 1.2); }),
      baseTex(S, 0xcdb27a, 0xe6d3a0, 13, 1.2, (ctx, S, r) => { ctx.strokeStyle = 'rgba(160,130,80,.25)'; ctx.lineWidth = 2; for (let y = 0; y < S; y += 16) { ctx.beginPath(); for (let x = 0; x <= S; x += 8) ctx.lineTo(x, y + Math.sin(x / S * Math.PI * 4) * 4); ctx.stroke(); } blobs(ctx, S, r, 400, ['rgba(120,100,70,.35)', 'rgba(250,240,210,.4)'], 0.8); }),
      baseTex(S, 0x5d5a55, 0x8d8a82, 14, 2.0, (ctx, S, r) => { ctx.strokeStyle = 'rgba(30,28,25,.55)'; for (let i = 0; i < 26; i++) { let x = r() * S, y = r() * S; ctx.lineWidth = 0.8 + r() * 1.5; wrapDraw(S, x, y, (px, py) => { ctx.beginPath(); ctx.moveTo(px, py); let cx = px, cy = py; for (let k = 0; k < 6; k++) { cx += (r() - 0.5) * 30; cy += (r() - 0.3) * 20; ctx.lineTo(cx, cy); } ctx.stroke(); }); } blobs(ctx, S, r, 60, ['rgba(150,145,135,.35)', 'rgba(60,70,50,.3)'], 5); }),
      baseTex(S, 0xdfe7f0, 0xffffff, 15, 1.3, (ctx, S, r) => { blobs(ctx, S, r, 200, ['rgba(180,200,225,.35)', 'rgba(255,255,255,.6)'], 3); }),
      baseTex(S, 0x3a3222, 0x55502e, 16, 1.8, (ctx, S, r) => { blobs(ctx, S, r, 60, ['rgba(25,30,20,.55)', 'rgba(70,85,40,.45)', 'rgba(90,110,70,.25)'], 9); }),
      baseTex(S, 0x221f1e, 0x4a4340, 17, 1.9, (ctx, S, r) => { blobs(ctx, S, r, 140, ['rgba(255,110,20,.55)', 'rgba(255,60,10,.45)', 'rgba(20,18,18,.6)'], 1.3); }),
      baseTex(S, 0x6b5238, 0x8a6f4c, 18, 1.5, (ctx, S, r) => { blobs(ctx, S, r, 220, ['rgba(150,130,110,.6)', 'rgba(60,45,30,.5)', 'rgba(110,100,90,.55)'], 2.2); }),
    ];
    return list.map(c => toTex(c));
  };

  // tileable RGB noise for water normals / lava
  T.waterNoise = (function () {
    let tex = null;
    return function () {
      if (tex) return tex;
      const S = 256; const a = pnoise(S, [4, 8, 16, 32], 501), b = pnoise(S, [4, 8, 16, 32], 502), c = pnoise(S, [8, 16, 32, 64], 503);
      const d = new Uint8Array(S * S * 4);
      for (let i = 0; i < S * S; i++) { d[i * 4] = a[i] * 255; d[i * 4 + 1] = b[i] * 255; d[i * 4 + 2] = c[i] * 255; d[i * 4 + 3] = 255; }
      tex = new THREE.DataTexture(d, S, S, THREE.RGBAFormat); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.needsUpdate = true;
      return tex;
    };
  })();
  // bark: vertical fibrous grooves (grayscale, tinted by vertex color)
  T.bark = function () {
    const c = baseTex(128, 0xb8b0a8, 0xe8e2da, 61, 1.4, (ctx, S, r) => {
      for (let i = 0; i < 70; i++) { const x = r() * S, w = 1 + r() * 3; ctx.fillStyle = `rgba(40,30,25,${0.25 + r() * 0.4})`; wrapDraw(S, x, 0, (px) => { ctx.beginPath(); ctx.moveTo(px, 0); for (let y = 0; y <= S; y += 8) ctx.lineTo(px + Math.sin(y * 0.1 + i) * 2, y); ctx.lineTo(px + w, S); ctx.lineTo(px + w, 0); ctx.fill(); }); }
      for (let i = 0; i < 25; i++) { ctx.fillStyle = 'rgba(30,22,18,.35)'; const x = r() * S, y = r() * S; ctx.fillRect(x, y, 6 + r() * 10, 1.5); }
    });
    const t = toTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  };
  T.birchBark = function () {
    const c = baseTex(128, 0xe8e6e0, 0xffffff, 62, 1.1, (ctx, S, r) => {
      for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(30,28,26,${0.5 + r() * 0.4})`; const x = r() * S, y = r() * S; ctx.fillRect(x, y, 5 + r() * 18, 1.5 + r() * 2.5); }
    });
    const t = toTex(c); return t;
  };
  // leaf atlas 512x512: [0] broadleaf cluster, [1] needle spray, [2] palm frond, [3] willow strands. Grayscale-ish; tinted by instance colour.
  T.leafAtlas = function () {
    const S = 512, H = 256; const c = document.createElement('canvas'); c.width = c.height = S; const ctx = c.getContext('2d');
    const r = U.rng(777);
    const leaf = (x, y, len, wid, ang, lum) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      const g = ctx.createLinearGradient(0, -wid, 0, wid); const L = Math.round(lum);
      g.addColorStop(0, `rgb(${L * .82 | 0},${L | 0},${L * .7 | 0})`); g.addColorStop(1, `rgb(${L * .62 | 0},${L * .78 | 0},${L * .52 | 0})`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -wid, len, 0); ctx.quadraticCurveTo(len * 0.5, wid, 0, 0); ctx.fill();
      ctx.strokeStyle = `rgba(40,50,25,.35)`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(len * 0.9, 0); ctx.stroke();
      ctx.restore();
    };
    // 0: broadleaf cluster (round, dense center, ragged edge)
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, H, H); ctx.clip();
    for (let i = 0; i < 260; i++) {
      const a = r() * Math.PI * 2, d = Math.pow(r(), 0.7) * 96; const x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d * 0.95;
      leaf(x, y, 16 + r() * 16, 5 + r() * 5, a + (r() - .5) * 1.2, 150 + r() * 105 - d * 0.4);
    }
    ctx.restore();
    // 1: needle spray (twig along vertical axis, needles pointing up/out)
    ctx.save(); ctx.translate(H, 0); ctx.beginPath(); ctx.rect(0, 0, H, H); ctx.clip();
    ctx.strokeStyle = 'rgb(90,70,50)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(128, 250); ctx.lineTo(128, 10); ctx.stroke();
    for (let k = 0; k < 7; k++) { const y0 = 230 - k * 30; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(128, y0); ctx.lineTo(128 + (k % 2 ? 1 : -1) * (70 - k * 6), y0 - 40); ctx.stroke(); }
    for (let i = 0; i < 1400; i++) {
      const t = r(); const y = 250 - t * 240; const side = r() < .5 ? -1 : 1; const spread = (1 - t * 0.55) * 100 * Math.sqrt(r());
      const x = 128 + side * spread; const L = 120 + r() * 110; const len = 10 + r() * 12; const ang = -Math.PI / 2 + side * (0.4 + r() * 0.7);
      ctx.strokeStyle = `rgb(${L * .7 | 0},${L | 0},${L * .75 | 0})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); ctx.stroke();
    }
    ctx.restore();
    // 2: palm frond (rib from bottom to top, leaflets drooping both sides)
    ctx.save(); ctx.translate(0, H); ctx.beginPath(); ctx.rect(0, 0, H, H); ctx.clip();
    ctx.strokeStyle = 'rgb(150,150,90)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(128, 254); ctx.lineTo(128, 4); ctx.stroke();
    for (let y = 245; y > 8; y -= 4) {
      const t = (254 - y) / 250; const len = Math.sin(Math.min(1, t * 1.15) * Math.PI) * 110 + 8;
      for (const sd of [-1, 1]) leaf(128, y, len, 3.2, sd < 0 ? Math.PI - 0.5 - t * 0.3 : 0.5 + t * 0.3, 170 + r() * 70);
    }
    ctx.restore();
    // 3: willow strands
    ctx.save(); ctx.translate(H, H); ctx.beginPath(); ctx.rect(0, 0, H, H); ctx.clip();
    for (let k = 0; k < 11; k++) {
      const x0 = 14 + k * 22 + r() * 8; ctx.strokeStyle = 'rgba(110,100,60,.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.quadraticCurveTo(x0 + 6, 128, x0 - 2 + r() * 6, 250); ctx.stroke();
      for (let y = 4; y < 250; y += 5) { const xx = x0 + Math.sin(y * 0.02) * 3; leaf(xx, y, 9 + r() * 8, 2.8, Math.PI / 2 + (r() < .5 ? -1 : 1) * (0.3 + r() * 0.5), 150 + r() * 100); }
    }
    ctx.restore();
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; t.generateMipmaps = true; return t;
  };

  T.buildingTex = {};
  T.makeBuildingTextures = function () {
    const S = 128;
    T.buildingTex.plaster = toTex(baseTex(S, 0xe9e0cc, 0xf6efdf, 21, 1.2, (ctx, S) => {
      ctx.fillStyle = '#5a3a1e'; ctx.fillRect(0, 0, S, 10); ctx.fillRect(0, S - 10, S, 10); ctx.fillRect(0, 0, 10, S); ctx.fillRect(S / 2 - 5, 0, 10, S);
      ctx.save(); ctx.translate(10, 10); ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(S / 2 - 15, S - 20); ctx.stroke(); ctx.restore();
    }));
    T.buildingTex.wood = toTex(baseTex(S, 0x6b4a2b, 0x8a6238, 22, 1.4, (ctx, S) => { ctx.strokeStyle = 'rgba(40,25,10,.8)'; ctx.lineWidth = 2; for (let y = 0; y < S; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke(); } }));
    T.buildingTex.log = toTex(baseTex(S, 0x5a3c22, 0x7a5532, 23, 1.4, (ctx, S) => { for (let y = 0; y < S; y += 21) { const g = ctx.createLinearGradient(0, y, 0, y + 21); g.addColorStop(0, 'rgba(0,0,0,.45)'); g.addColorStop(.5, 'rgba(255,220,170,.08)'); g.addColorStop(1, 'rgba(0,0,0,.45)'); ctx.fillStyle = g; ctx.fillRect(0, y, S, 21); } }));
    T.buildingTex.sandstone = toTex(baseTex(S, 0xc9a56c, 0xe0c48e, 24, 1.2, (ctx, S) => { ctx.strokeStyle = 'rgba(120,90,50,.45)'; ctx.lineWidth = 2; for (let y = 0; y < S; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke(); for (let x = (y / 32 % 2) * 32; x < S; x += 64) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 32); ctx.stroke(); } } }));
    T.buildingTex.stone = toTex(baseTex(S, 0x55524f, 0x77736d, 25, 1.6, (ctx, S) => { ctx.strokeStyle = 'rgba(20,20,20,.6)'; ctx.lineWidth = 3; for (let y = 0; y < S; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke(); for (let x = (y / 24 % 2) * 20; x < S; x += 40) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 24); ctx.stroke(); } } }));
    T.buildingTex.darkstone = toTex(baseTex(S, 0x221c1c, 0x3d2f2c, 26, 1.6, (ctx, S) => { ctx.strokeStyle = 'rgba(255,80,20,.45)'; ctx.lineWidth = 2; for (let y = 0; y < S; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke(); } }));
    T.buildingTex.roof = toTex(baseTex(S, 0x8e2f22, 0xb04632, 27, 1.3, (ctx, S) => { ctx.strokeStyle = 'rgba(50,10,5,.6)'; ctx.lineWidth = 3; for (let y = 0; y < S; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke(); } }));
    T.buildingTex.thatch = toTex(baseTex(S, 0x9b8045, 0xc2a25c, 28, 1.5, (ctx, S, r) => strokes(ctx, S, r, 500, ['rgba(90,70,30,.6)', 'rgba(220,190,110,.5)'], 14, 1.2, 0.3)));
    T.buildingTex.moss = toTex(baseTex(S, 0x3d5a2a, 0x5d7a36, 29, 1.6, (ctx, S, r) => blobs(ctx, S, r, 40, ['rgba(30,45,20,.5)'], 6)));
    T.buildingTex.snowroof = toTex(baseTex(S, 0xdfe6ee, 0xffffff, 30, 1.2, null));
  };

  // radial glow for particles / projectiles
  T.glow = (function () {
    let tex = null;
    return function () {
      if (tex) return tex;
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const ctx = c.getContext('2d'); const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.8)'); g.addColorStop(0.6, 'rgba(255,255,255,.2)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
      tex = new THREE.CanvasTexture(c); return tex;
    };
  })();
  T.ring = (function () {
    let tex = null;
    return function () {
      if (tex) return tex;
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const ctx = c.getContext('2d'); const g = ctx.createRadialGradient(64, 64, 40, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
      tex = new THREE.CanvasTexture(c); return tex;
    };
  })();

  const emojiCache = {};
  T.emoji = function (e) {
    if (emojiCache[e]) return emojiCache[e];
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '100px ' + EMOJI_FONT;
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    ctx.fillText(e, 64, 70);
    const t = new THREE.CanvasTexture(c);
    emojiCache[e] = t; return t;
  };

  // Label + HP bar canvas for monsters
  T.drawMonsterLabel = function (canvas, m) {
    const ctx = canvas.getContext('2d'); const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.font = 'bold 22px "Palatino Linotype","Book Antiqua",Palatino,Georgia,serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const col = m.boss ? '#ff6a4a' : m.elite ? '#f2d45c' : '#f1ead8';
    const name = (m.elite && !m.boss ? 'Elite ' : '') + m.name;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.85)';
    const txt = name + '  ' + m.level;
    ctx.strokeText(txt, W / 2, 16); ctx.fillStyle = col; ctx.fillText(txt, W / 2, 16);
    const bx = 28, by = 34, bw = W - 56, bh = 14;
    ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
    const f = Math.max(0, m.hp / m.maxHp);
    ctx.fillStyle = f > .5 ? '#3fae4a' : f > .25 ? '#d6a21e' : '#c8321f';
    ctx.fillRect(bx, by, bw * f, bh);
    // status pips
    let sx = bx; const pips = [];
    if (m.fx.burn.length) pips.push('#ff7a1a'); if (m.fx.poison.length) pips.push('#7ccf2a');
    if (m.fx.slowT > 0) pips.push('#8fd0ff'); if (m.fx.freezeT > 0) pips.push('#e6f7ff');
    if (m.fx.stunT > 0) pips.push('#ffe45c'); if (m.fx.hexT > 0) pips.push('#b26bff'); if (m.fx.fearT > 0) pips.push('#ffffff');
    pips.forEach(c => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(sx + 6, by + bh + 10, 5, 0, 7); ctx.fill(); sx += 14; });
    if (m.tex) m.tex.needsUpdate = true;
  };

  T.drawText = function (c, text, color, marker) {
    const ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 40px "Palatino Linotype","Book Antiqua",Palatino,Georgia,serif';
    ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.strokeText(text, 256, 100);
    ctx.fillStyle = color || '#fff'; ctx.fillText(text, 256, 100);
    if (marker) { ctx.font = 'bold 64px Georgia,serif'; ctx.lineWidth = 9; ctx.strokeText(marker, 256, 40); ctx.fillStyle = marker === '?' ? '#ffd84a' : '#ffe98a'; ctx.fillText(marker, 256, 40); }
  };
  T.textSprite = function (text, color, marker) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    T.drawText(c, text, color, marker);
    const t = new THREE.CanvasTexture(c);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
    s.scale.set(6, 1.5, 1);
    s.userData.canvas = c; s.userData.tex = t;
    return s;
  };
})();
