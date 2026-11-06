// Adapted from the supplied Feywild prototype. Bounded 256px layers for the combat world.
// High-resolution procedural ground material set, generated at load time.
// Eight tileable layers (turf, forest floor, autumn leaf litter, rock, snow,
// sand & pebbles, riverbank mud, basalt), each with albedo + height and a
// packed normal / roughness / cavity-AO map. Packed into two texture arrays so
// the terrain shader can height-blend any combination with 2 samplers.
import * as THREE from 'three';
import { RNG } from '../core/rng.js';
import { PNoise } from './textures.js';
import { paintLeaf, leafOutline, tracePath, rgb, mixC } from './leafArt.js';

export const GL = { TURF: 0, FOREST: 1, LEAVES: 2, ROCK: 3, SNOW: 4, SAND: 5, MUD: 6, BASALT: 7 };
const NLAYERS = 8;

const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const c01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

function mkCanvas(S) { const c = document.createElement('canvas'); c.width = S; c.height = S; return c; }

function wrap(S, x, y, r, fn) {
  for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
    const X = x + ox, Y = y + oy;
    if (X < -r || X > S + r || Y < -r || Y > S + r) continue;
    fn(X, Y);
  }
}

// periodic worley returning d1, d2 and cell hash
function worleyP(u, v, cells, seed) {
  const x = u * cells, y = v * cells;
  const ix = Math.floor(x), iy = Math.floor(y);
  let d1 = 9, d2 = 9, id = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const cx = ix + dx, cy = iy + dy;
    const wx = ((cx % cells) + cells) % cells, wy = ((cy % cells) + cells) % cells;
    let h = Math.imul(wx * 73856093 ^ wy * 19349663 ^ seed * 83492791, 2654435761) >>> 0;
    const hx = (h & 0xffff) / 65536; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    const hy = (h & 0xffff) / 65536; h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
    const px = cx + hx, py = cy + hy;
    const d = Math.hypot(px - x, py - y);
    if (d < d1) { d2 = d1; d1 = d; id = (h & 0xffffff) / 16777216; } else if (d < d2) d2 = d;
  }
  return [d1, d2, id];
}

function blotches(ctx, S, rng, n, rMin, rMax, colorFn) {
  for (let i = 0; i < n; i++) {
    const x = rng.next() * S, y = rng.next() * S, r = rng.range(rMin, rMax) * S;
    const c = colorFn(rng);
    wrap(S, x, y, r, (X, Y) => {
      const g = ctx.createRadialGradient(X, Y, 0, X, Y, r);
      g.addColorStop(0, c); g.addColorStop(1, c.replace(/[\d.]+\)$/, '0)'));
      ctx.fillStyle = g; ctx.fillRect(X - r, Y - r, r * 2, r * 2);
    });
  }
}

// ------------------------------------------------------------------ layers
function layerTurf(S, rng, pn) {
  const c = mkCanvas(S), ctx = c.getContext('2d');
  const hc = mkCanvas(S), hx = hc.getContext('2d');
  ctx.fillStyle = 'rgb(74,62,44)'; ctx.fillRect(0, 0, S, S);
  hx.fillStyle = 'rgb(40,40,40)'; hx.fillRect(0, 0, S, S);
  blotches(ctx, S, rng, 90, 0.03, 0.09, (r) => (r.next() < 0.5 ? 'rgba(52,44,30,0.5)' : 'rgba(92,84,54,0.45)'));
  blotches(ctx, S, rng, 60, 0.04, 0.1, () => 'rgba(62,78,36,0.55)');
  const k = S / 1024;
  const N = Math.round(30000 * Math.max(.3, S / 1024));
  ctx.lineCap = 'round'; hx.lineCap = 'round';
  for (let i = 0; i < N; i++) {
    const x = rng.next() * S, y = rng.next() * S;
    const a = rng.next() * Math.PI * 2;
    const len = rng.range(7, 24) * k;
    const bend = rng.range(-0.4, 0.4);
    const dry = rng.next() < 0.1;
    const h = dry ? rng.range(40, 52) : rng.range(66, 98);
    const s = dry ? rng.range(26, 38) : rng.range(20, 38);
    const l = dry ? rng.range(46, 60) : rng.range(20, 40) + (i / N) * 10;
    const w = rng.range(1.1, 2.4) * k;
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    const mx = x + Math.cos(a + bend) * len * 0.6, my = y + Math.sin(a + bend) * len * 0.6;
    const hv = Math.round(70 + 170 * (i / N));
    wrap(S, x, y, len, (X, Y) => {
      const dx = X - x, dy = Y - y;
      ctx.strokeStyle = `hsl(${h},${s}%,${l}%)`; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(X, Y); ctx.quadraticCurveTo(mx + dx, my + dy, ex + dx, ey + dy); ctx.stroke();
      hx.strokeStyle = `rgb(${hv},${hv},${hv})`; hx.lineWidth = w;
      hx.beginPath(); hx.moveTo(X, Y); hx.quadraticCurveTo(mx + dx, my + dy, ex + dx, ey + dy); hx.stroke();
    });
  }
  // clover clusters
  for (let i = 0; i < 160; i++) {
    const x = rng.next() * S, y = rng.next() * S, r = rng.range(3, 6) * k;
    const jit = [rng.next(), rng.next(), rng.next()], hue = rng.range(88, 104), lig = rng.range(22, 30);
    wrap(S, x, y, r * 3, (X, Y) => {
      for (let j = 0; j < 3; j++) {
        const a = j * 2.094 + jit[j] * 0.3;
        const px = X + Math.cos(a) * r, py = Y + Math.sin(a) * r;
        ctx.fillStyle = `hsl(${hue},30%,${lig}%)`;
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
        hx.fillStyle = 'rgb(235,235,235)'; hx.beginPath(); hx.arc(px, py, r, 0, Math.PI * 2); hx.fill();
      }
    });
  }
  return finishCanvas(S, c, hc, () => 0.82, 2.2);
}

function layerForest(S, rng, pn) {
  const c = mkCanvas(S), ctx = c.getContext('2d');
  const hc = mkCanvas(S), hx = hc.getContext('2d');
  ctx.fillStyle = 'rgb(56,42,30)'; ctx.fillRect(0, 0, S, S);
  hx.fillStyle = 'rgb(60,60,60)'; hx.fillRect(0, 0, S, S);
  blotches(ctx, S, rng, 110, 0.02, 0.07, (r) => (r.next() < 0.5 ? 'rgba(36,26,18,0.55)' : 'rgba(84,66,44,0.4)'));
  const k = S / 1024;
  // pine needles
  ctx.lineCap = 'round';
  for (let i = 0; i < 2600; i++) {
    const x = rng.next() * S, y = rng.next() * S, a = rng.next() * 6.283, len = rng.range(10, 24) * k;
    const col = `hsl(${rng.range(20, 34)},${rng.range(30, 50)}%,${rng.range(24, 42)}%)`;
    wrap(S, x, y, len, (X, Y) => {
      ctx.strokeStyle = col; ctx.lineWidth = 1.2 * k + 0.3;
      ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + Math.cos(a) * len, Y + Math.sin(a) * len); ctx.stroke();
      hx.strokeStyle = 'rgb(150,150,150)'; hx.lineWidth = 1.2 * k + 0.3;
      hx.beginPath(); hx.moveTo(X, Y); hx.lineTo(X + Math.cos(a) * len, Y + Math.sin(a) * len); hx.stroke();
    });
  }
  // old leaves
  const kinds = ['beech', 'elm', 'birch', 'oak'];
  for (let i = 0; i < 300; i++) {
    const x = rng.next() * S, y = rng.next() * S, a = rng.next() * 6.283, len = rng.range(16, 34) * k;
    const kind = kinds[Math.floor(rng.next() * kinds.length)];
    const base = [rng.range(96, 150), rng.range(70, 104), rng.range(40, 62)];
    const tip = mixC(base, [60, 40, 24], rng.next() * 0.5);
    const seed = rng.next() * 1e9;
    wrap(S, x, y, len, (X, Y) => {
      const lr = new RNG(seed);
      ctx.save(); ctx.translate(X, Y); ctx.rotate(a);
      const pts = paintLeaf(ctx, kind, len, { base, tip, blemish: 0.8, curl: 0.5, shadow: true, mottle: 0.8, stem: true }, () => lr.next());
      ctx.restore();
      hx.save(); hx.translate(X, Y); hx.rotate(a); tracePath(hx, pts); hx.fillStyle = `rgb(${120 + i % 60},${120 + i % 60},${120 + i % 60})`; hx.fill(); hx.restore();
    });
  }
  // twigs
  for (let i = 0; i < 45; i++) {
    let x = rng.next() * S, y = rng.next() * S, a = rng.next() * 6.283;
    const segs = 4 + Math.floor(rng.next() * 5), w = rng.range(2.2, 4.5) * k;
    const pts = [[x, y]];
    for (let j = 0; j < segs; j++) { a += rng.range(-0.4, 0.4); x += Math.cos(a) * 12 * k; y += Math.sin(a) * 12 * k; pts.push([x, y]); }
    const x0 = pts[0][0], y0 = pts[0][1];
    const tcol = `rgb(${rng.range(70, 95)},${rng.range(52, 66)},${rng.range(36, 46)})`;
    wrap(S, x0, y0, segs * 12 * k, (X, Y) => {
      const dx = X - x0, dy = Y - y0;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 3 * k; ctx.shadowOffsetY = 2 * k;
      ctx.strokeStyle = tcol; ctx.lineWidth = w; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(pts[0][0] + dx, pts[0][1] + dy); for (const p of pts) ctx.lineTo(p[0] + dx, p[1] + dy); ctx.stroke(); ctx.restore();
      hx.strokeStyle = 'rgb(230,230,230)'; hx.lineWidth = w; hx.beginPath(); hx.moveTo(pts[0][0] + dx, pts[0][1] + dy); for (const p of pts) hx.lineTo(p[0] + dx, p[1] + dy); hx.stroke();
    });
  }
  const img = ctx.getImageData(0, 0, S, S).data;
  const himg = hx.getImageData(0, 0, S, S).data;
  // moss patches (per pixel)
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S, o = (y * S + x) * 4;
    const m = pn.fbm(u, v, 4, 4) + 0.35 * pn.fbm(u + 0.3, v, 32, 3);
    const moss = sm(0.12, 0.3, m) * 0.85;
    if (moss > 0) {
      const sp = 0.75 + 0.5 * (pn.noise(u * 180, v * 180, 180) * 0.5 + 0.5);
      img[o] = img[o] * (1 - moss) + 52 * sp * moss;
      img[o + 1] = img[o + 1] * (1 - moss) + 62 * sp * moss;
      img[o + 2] = img[o + 2] * (1 - moss) + 30 * sp * moss;
      himg[o] = himg[o] * (1 - moss * 0.6) + (190 + 40 * sp) * moss * 0.6;
    }
  }
  return finishData(S, img, himg, (i) => 0.86, 2.6);
}

const AUTUMN = [
  [[142, 31, 26], 1.0], [[180, 72, 31], 1.3], [[204, 106, 31], 1.3], [[217, 146, 46], 1.2], [[214, 176, 74], 0.9],
  [[185, 140, 58], 0.8], [[107, 69, 35], 0.9], [[155, 123, 86], 0.7], [[169, 160, 67], 0.35], [[111, 122, 53], 0.2], [[120, 30, 40], 0.4],
];
function pickW(rng, arr) { let s = 0; for (const a of arr) s += a[1]; let t = rng.next() * s; for (const a of arr) { t -= a[1]; if (t <= 0) return a[0]; } return arr[0][0]; }

function layerLeaves(S, rng, pn) {
  const c = mkCanvas(S), ctx = c.getContext('2d');
  const hc = mkCanvas(S), hx = hc.getContext('2d');
  ctx.fillStyle = 'rgb(46,30,18)'; ctx.fillRect(0, 0, S, S);
  hx.fillStyle = 'rgb(20,20,20)'; hx.fillRect(0, 0, S, S);
  const k = S / 1024;
  const kinds = [['maple', 0.38], ['oak', 0.22], ['elm', 0.14], ['birch', 0.12], ['beech', 0.14]];
  const N = Math.round(2600 * Math.max(.45, S / 1024));
  for (let i = 0; i < N; i++) {
    const x = rng.next() * S, y = rng.next() * S, a = rng.next() * 6.283;
    const kind = pickW(rng, kinds);
    const len = rng.range(26, 54) * k * (kind === 'maple' ? 0.9 : 1);
    const base = pickW(rng, AUTUMN);
    const tip = mixC(base, pickW(rng, AUTUMN), rng.range(0.2, 0.6));
    const age = i / N;
    const seed = rng.next() * 1e9;
    const blem = rng.range(0.1, 0.7), curl = rng.range(0.2, 1);
    const hv = Math.round(60 + 150 * age);
    wrap(S, x, y, len * 1.2, (X, Y) => {
      const lr = new RNG(seed);
      ctx.save(); ctx.translate(X, Y); ctx.rotate(a);
      const pts = paintLeaf(ctx, kind, len, { base, tip, blemish: blem, curl, shadow: true, stem: true, mottle: 0.7 }, () => lr.next());
      ctx.restore();
      hx.save(); hx.translate(X, Y); hx.rotate(a);
      tracePath(hx, pts);
      const g = hx.createRadialGradient(0, -len * 0.45, 0, 0, -len * 0.45, len * 0.6);
      g.addColorStop(0, `rgb(${hv + 30},${hv + 30},${hv + 30})`); g.addColorStop(1, `rgb(${hv},${hv},${hv})`);
      hx.fillStyle = g; hx.fill(); hx.restore();
    });
  }
  return finishCanvas(S, c, hc, () => 0.62, 3.2);
}

function layerRock(S, rng, pn, pn2) {
  const img = new Uint8ClampedArray(S * S * 4), h = new Float32Array(S * S), rough = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S, i = y * S + x;
    const warp = pn.fbm(u, v, 4, 3);
    const strata = Math.sin((v * 14 + warp * 2.2) * Math.PI * 2) * 0.5 + 0.5;
    const f = pn.fbm(u + 0.2, v + 0.7, 8, 6);
    const [d1, d2] = worleyP(u + warp * 0.08, v, 6, 3);
    const facet = sm(0.0, 0.25, d2 - d1);
    const crack = (1 - sm(0.0, 0.022, Math.abs(pn2.fbm(u + 0.1, v, 4, 5)))) * sm(-0.2, 0.2, pn.fbm(u, v + 0.5, 2, 2));
    const crack2 = 1 - sm(0.0, 0.012, Math.abs(pn2.fbm(u * 1.0 + 0.7, v * 1.0 + 0.2, 8, 4)));
    const grain = pn2.noise(u * 200, v * 200, 200) + 0.6 * pn2.fbm(u, v, 32, 3);
    let hh = 0.5 + 0.32 * f + 0.14 * strata + 0.1 * facet - 0.3 * crack - 0.1 * crack2 + 0.02 * grain;
    const tone = pn2.fbm(u, v, 4, 3);
    let r = 122 + 26 * f + 12 * strata + 14 * tone + 6 * grain, g = 116 + 22 * f + 9 * strata + 8 * tone + 6 * grain, b = 108 + 18 * f + 6 * strata + 6 * grain;
    const dk = 1 - 0.5 * crack - 0.25 * crack2 - 0.08 * (1 - facet);
    r *= dk; g *= dk; b *= dk;
    // lichen
    const li = pn2.fbm(u + 0.5, v + 0.1, 16, 3);
    if (li > 0.4) {
      const t = sm(0.4, 0.47, li) * 0.8;
      const lc = pn2.noise(u * 40, v * 40, 40) > 0 ? [150, 150, 112] : [176, 140, 76];
      r = r * (1 - t * 0.7) + lc[0] * t * 0.7; g = g * (1 - t * 0.7) + lc[1] * t * 0.7; b = b * (1 - t * 0.7) + lc[2] * t * 0.7;
      hh += 0.03 * t;
    }
    h[i] = hh; rough[i] = 0.78 + 0.1 * crack;
    const o = i * 4; img[o] = r; img[o + 1] = g; img[o + 2] = b;
  }
  return finishData(S, img, null, (i) => rough[i], 4.5, h);
}

function layerSnow(S, rng, pn) {
  const img = new Uint8ClampedArray(S * S * 4), h = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S, i = y * S + x;
    const f = pn.fbm(u, v, 3, 5);
    const rip = Math.sin((u * 0.3 + v + 0.08 * pn.fbm(u, v, 4, 2)) * Math.PI * 2 * 16) * 0.5 + 0.5;
    const ripM = sm(-0.1, 0.3, pn.fbm(u + 0.4, v, 2, 2));
    const grain = pn.noise(u * 256, v * 256, 256);
    const hh = 0.5 + 0.35 * f + 0.07 * rip * ripM + 0.02 * grain;
    h[i] = hh;
    const t = c01((hh - 0.25) * 1.6);
    const o = i * 4;
    img[o] = 198 + 50 * t; img[o + 1] = 212 + 38 * t; img[o + 2] = 232 + 22 * t;
  }
  return finishData(S, img, null, () => 0.6, 1.6, h);
}

function layerSand(S, rng, pn) {
  const img = new Uint8ClampedArray(S * S * 4), h = new Float32Array(S * S), rough = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S, i = y * S + x;
    const rip = Math.sin((v + 0.06 * pn.fbm(u, v, 4, 3)) * Math.PI * 2 * 22) * 0.5 + 0.5;
    const grain = pn.noise(u * 300, v * 300, 300) * 0.5 + 0.5;
    const f = pn.fbm(u, v, 4, 4);
    let hh = 0.35 + 0.18 * rip * sm(-0.2, 0.3, f) + 0.06 * grain + 0.1 * f;
    let r = 188 + 18 * f - 16 * (1 - rip) + 14 * (grain - 0.5), g = 170 + 14 * f - 14 * (1 - rip) + 12 * (grain - 0.5), b = 138 + 8 * f - 10 * (1 - rip) + 10 * (grain - 0.5);
    let ro = 0.9;
    const [d1, , id] = worleyP(u * 1.3, v, 20, 11);
    const pr = 0.1 + 0.14 * id;
    if (id > 0.86 && d1 < pr) {
      const t = Math.sqrt(1 - (d1 / pr) * (d1 / pr));
      hh = Math.max(hh, 0.45 + 0.5 * t);
      const pc = id < 0.85 ? [128, 122, 114] : id < 0.92 ? [150, 134, 110] : [96, 92, 90];
      const sh = 0.7 + 0.35 * t;
      r = pc[0] * sh; g = pc[1] * sh; b = pc[2] * sh; ro = 0.55;
    }
    h[i] = hh; rough[i] = ro;
    const o = i * 4; img[o] = r; img[o + 1] = g; img[o + 2] = b;
  }
  return finishData(S, img, null, (i) => rough[i], 2.2, h);
}

function layerMud(S, rng, pn) {
  const img = new Uint8ClampedArray(S * S * 4), h = new Float32Array(S * S), rough = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S, i = y * S + x;
    const f = pn.fbm(u, v, 4, 5);
    const fine = pn.fbm(u + 0.3, v + 0.3, 32, 3);
    let hh = 0.5 + 0.3 * f + 0.08 * fine;
    let r = 86 + 22 * f + 10 * fine, g = 70 + 18 * f + 8 * fine, b = 52 + 12 * f;
    let ro = 0.6 - 0.2 * f;
    if (hh < 0.4) { const t = sm(0.4, 0.33, hh); hh = hh * (1 - t) + 0.36 * t; r *= 1 - 0.45 * t; g *= 1 - 0.42 * t; b *= 1 - 0.38 * t; ro = ro * (1 - t) + 0.08 * t; }
    const [d1, , id] = worleyP(u, v, 30, 17);
    if (id > 0.86 && d1 < 0.22) { const t = Math.sqrt(1 - (d1 / 0.22) ** 2); hh = Math.max(hh, 0.5 + 0.4 * t); r = 84 + 26 * t; g = 78 + 24 * t; b = 70 + 20 * t; ro = 0.45; }
    h[i] = hh; rough[i] = ro;
    const o = i * 4; img[o] = r; img[o + 1] = g; img[o + 2] = b;
  }
  return finishData(S, img, null, (i) => rough[i], 2.4, h);
}

function layerBasalt(S, rng, pn) {
  const img = new Uint8ClampedArray(S * S * 4), h = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S, i = y * S + x;
    const w = pn.fbm(u, v, 4, 2) * 0.04;
    const [d1, d2, id] = worleyP(u + w, v - w, 7, 23);
    const edge = d2 - d1;
    const crack = 1 - sm(0.0, 0.05, edge);
    const f = pn.fbm(u, v, 16, 4);
    const [v1] = worleyP(u, v, 60, 29);
    const vesicle = sm(0.18, 0.08, v1);
    let hh = 0.62 + 0.12 * f + 0.1 * sm(0, 0.4, edge) - 0.55 * crack - 0.08 * vesicle + 0.05 * id;
    const base = 34 + 14 * f + 10 * id;
    let r = base * 1.08, g = base, b = base * 1.02;
    // ash in cracks
    r = r * (1 - crack) + 78 * crack; g = g * (1 - crack) + 70 * crack; b = b * (1 - crack) + 66 * crack;
    h[i] = c01(hh);
    const o = i * 4; img[o] = r; img[o + 1] = g; img[o + 2] = b;
  }
  return finishData(S, img, null, () => 0.82, 4.0, h);
}

// ------------------------------------------------------------------ packing
function finishCanvas(S, c, hc, roughFn, strength) {
  const img = c.getContext('2d').getImageData(0, 0, S, S).data;
  const himg = hc.getContext('2d').getImageData(0, 0, S, S).data;
  return finishData(S, img, himg, roughFn, strength);
}

function finishData(S, img, himg, roughFn, strength, hArr) {
  const n = S * S;
  const h = hArr || new Float32Array(n);
  if (!hArr) for (let i = 0; i < n; i++) h[i] = himg[i * 4] / 255;
  // soften height a touch
  const hb = boxBlur(h, S, 1);
  const cav = boxBlur(h, S, Math.max(3, Math.round(S / 160)));
  const alb = new Uint8Array(n * 4), nrm = new Uint8Array(n * 4);
  const k = strength * S / 1024;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x;
    const xl = y * S + ((x - 1 + S) % S), xr = y * S + ((x + 1) % S);
    const yu = ((y - 1 + S) % S) * S + x, yd = ((y + 1) % S) * S + x;
    const dx = (hb[xr] - hb[xl]) * k, dy = (hb[yd] - hb[yu]) * k;
    const l = Math.hypot(dx, dy, 1);
    nrm[i * 4] = 255 * (0.5 - 0.5 * dx / l);
    nrm[i * 4 + 1] = 255 * (0.5 - 0.5 * dy / l);
    nrm[i * 4 + 2] = 255 * c01(roughFn(i));
    nrm[i * 4 + 3] = 255 * c01(1 - Math.max(0, cav[i] - h[i]) * 3.2);
    alb[i * 4] = img[i * 4]; alb[i * 4 + 1] = img[i * 4 + 1]; alb[i * 4 + 2] = img[i * 4 + 2];
    alb[i * 4 + 3] = 255 * c01(h[i]);
  }
  return { alb, nrm };
}

function boxBlur(src, S, r) {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  const w = 2 * r + 1;
  for (let y = 0; y < S; y++) {
    let acc = 0;
    for (let k = -r; k <= r; k++) acc += src[y * S + ((k + S) % S)];
    for (let x = 0; x < S; x++) {
      tmp[y * S + x] = acc / w;
      acc += src[y * S + ((x + r + 1) % S)] - src[y * S + ((x - r + S) % S)];
    }
  }
  for (let x = 0; x < S; x++) {
    let acc = 0;
    for (let k = -r; k <= r; k++) acc += tmp[((k + S) % S) * S + x];
    for (let y = 0; y < S; y++) {
      out[y * S + x] = acc / w;
      acc += tmp[((y + r + 1) % S) * S + x] - tmp[((y - r + S) % S) * S + x];
    }
  }
  return out;
}

export async function makeGroundTextures(size, progress) {
  const S = size;
  const rng = new RNG(4242);
  const pn = new PNoise(101), pn2 = new PNoise(202);
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const steps = [
    ['meadow turf', () => layerTurf(S, rng, pn)],
    ['forest floor', () => layerForest(S, rng, pn2)],
    ['fallen leaves', () => layerLeaves(S, rng, pn)],
    ['stone', () => layerRock(S, rng, pn, pn2)],
    ['snow', () => layerSnow(S, rng, pn2)],
    ['sand and pebbles', () => layerSand(S, rng, pn)],
    ['riverbank mud', () => layerMud(S, rng, pn2)],
    ['basalt', () => layerBasalt(S, rng, pn)],
  ];
  const albAll = new Uint8Array(S * S * 4 * NLAYERS), nrmAll = new Uint8Array(S * S * 4 * NLAYERS);
  for (let l = 0; l < steps.length; l++) {
    progress && progress(steps[l][0], l / steps.length);
    await tick();
    const { alb, nrm } = steps[l][1]();
    albAll.set(alb, l * S * S * 4);
    nrmAll.set(nrm, l * S * S * 4);
  }
  const mk = (data, srgb) => {
    const t = new THREE.DataArrayTexture(data, S, S, NLAYERS);
    t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = true; t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  };
  return { albedo: mk(albAll, true), normal: mk(nrmAll, false), size: S };
}
