import {foliageMipmaps} from '../../foliage-mips.js';
// Procedurally generated texture assets: tileable noise fields, normal maps,
// bark, leaf clusters, petals, sprites. Everything is generated at runtime so the
// game runs from file:// with no external image loads.
import * as THREE from 'three';
import { RNG } from '../core/rng.js';
import { paintLeaf } from './leafArt.js';

// ------------------------------------------------------------ periodic noise
export class PNoise {
  constructor(seed) {
    const r = new RNG(seed);
    this.g = new Float32Array(512 * 2);
    for (let i = 0; i < 512; i++) { const a = r.next() * Math.PI * 2; this.g[i * 2] = Math.cos(a); this.g[i * 2 + 1] = Math.sin(a); }
    this.p = new Uint16Array(512);
    for (let i = 0; i < 512; i++) this.p[i] = i;
    for (let i = 511; i > 0; i--) { const j = Math.floor(r.next() * (i + 1)); [this.p[i], this.p[j]] = [this.p[j], this.p[i]]; }
  }
  grad(ix, iy, per, x, y) {
    ix = ((ix % per) + per) % per; iy = ((iy % per) + per) % per;
    const h = this.p[(this.p[ix & 511] + iy) & 511];
    return this.g[h * 2] * x + this.g[h * 2 + 1] * y;
  }
  noise(x, y, per) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10), v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
    const a = this.grad(ix, iy, per, fx, fy), b = this.grad(ix + 1, iy, per, fx - 1, fy);
    const c = this.grad(ix, iy + 1, per, fx, fy - 1), d = this.grad(ix + 1, iy + 1, per, fx - 1, fy - 1);
    return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 1.4;
  }
  fbm(u, v, base, oct) { // u,v in [0,1)
    let s = 0, a = 1, n = 0, f = base;
    for (let o = 0; o < oct; o++) { s += a * this.noise(u * f, v * f, f); n += a; a *= 0.5; f *= 2; }
    return s / n;
  }
}

export function worley(u, v, cells, rng, pts) {
  const x = u * cells, y = v * cells;
  const ix = Math.floor(x), iy = Math.floor(y);
  let d1 = 9, d2 = 9;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const cx = ix + dx, cy = iy + dy;
    const wx = ((cx % cells) + cells) % cells, wy = ((cy % cells) + cells) % cells;
    const p = pts[wy * cells + wx];
    const px = cx + p[0], py = cy + p[1];
    const d = Math.hypot(px - x, py - y);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return [d1, d2];
}

export function makeNoiseTexture(size = 256, seed = 7) {
  const pn = new PNoise(seed);
  const rng = new RNG(seed + 1);
  const cells = 8;
  const pts = []; for (let i = 0; i < cells * cells; i++) pts.push([rng.next(), rng.next()]);
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size, o = (y * size + x) * 4;
    data[o] = 255 * clamp01(0.5 + 0.5 * pn.fbm(u, v, 4, 5));
    data[o + 1] = 255 * clamp01(0.5 + 0.5 * pn.fbm(u + 0.37, v + 0.11, 8, 4));
    const w = worley(u, v, cells, rng, pts);
    data[o + 2] = 255 * clamp01(w[0] * 1.2);
    data[o + 3] = 255 * clamp01(0.5 + 0.5 * pn.fbm(u + 0.71, v + 0.53, 16, 3));
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true;
  return t;
}

// Ground detail: RG = normal xy, B = height, A = worley edge (cracks)
export function makeDetailTexture(size = 512, seed = 21) {
  const pn = new PNoise(seed);
  const rng = new RNG(seed);
  const cells = 16;
  const pts = []; for (let i = 0; i < cells * cells; i++) pts.push([rng.next(), rng.next()]);
  const hgt = new Float32Array(size * size);
  const edge = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const w = worley(u, v, cells, rng, pts);
    const e = w[1] - w[0];
    edge[y * size + x] = e;
    hgt[y * size + x] = 0.55 * pn.fbm(u, v, 8, 5) + 0.35 * (1 - Math.min(1, w[0] * 1.3)) + 0.25 * Math.min(1, e * 4);
  }
  const data = new Uint8Array(size * size * 4);
  const s = 2.2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const xl = (x - 1 + size) % size, xr = (x + 1) % size, yu = (y - 1 + size) % size, yd = (y + 1) % size;
    const dx = (hgt[y * size + xr] - hgt[y * size + xl]) * s;
    const dy = (hgt[yd * size + x] - hgt[yu * size + x]) * s;
    const l = Math.hypot(dx, dy, 1);
    const o = (y * size + x) * 4;
    data[o] = 255 * (0.5 - 0.5 * dx / l);
    data[o + 1] = 255 * (0.5 - 0.5 * dy / l);
    data[o + 2] = 255 * clamp01(hgt[y * size + x]);
    data[o + 3] = 255 * clamp01(edge[y * size + x] * 3);
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.anisotropy = 8; t.needsUpdate = true;
  return t;
}

export function makeWaterNormalTexture(size = 256, seed = 99) {
  const pn = new PNoise(seed);
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    // anisotropic-ish ripples
    h[y * size + x] = pn.fbm(u, v, 4, 5) + 0.5 * Math.abs(pn.fbm(u + 0.3, v + 0.8, 8, 3));
  }
  const data = new Uint8Array(size * size * 4);
  const s = 5;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const xl = (x - 1 + size) % size, xr = (x + 1) % size, yu = (y - 1 + size) % size, yd = (y + 1) % size;
    const dx = (h[y * size + xr] - h[y * size + xl]) * s;
    const dy = (h[yd * size + x] - h[yu * size + x]) * s;
    const l = Math.hypot(dx, dy, 1);
    const o = (y * size + x) * 4;
    data[o] = 255 * (0.5 - 0.5 * dx / l); data[o + 1] = 255 * (0.5 - 0.5 * dy / l); data[o + 2] = 255 * (1 / l); data[o + 3] = 255 * clamp01(0.5 + h[y * size + x] * 0.5);
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

// ------------------------------------------------------------ canvas helpers
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function canvasTex(c, srgb = true, repeat = false) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
function foliageTex(c){
  const texture=canvasTex(c),pixels=c.getContext('2d').getImageData(0,0,c.width,c.height);
  texture.mipmaps=foliageMipmaps(pixels.data,c.width,c.height).map(level=>{
    const image=canvas(level.width,level.height);
    image.getContext('2d').putImageData(new ImageData(level.data,level.width,level.height),0,0);
    return image;
  });
  texture.generateMipmaps=false;texture.needsUpdate=true;return texture;
}
function hsl(h, s, l, a = 1) { return `hsla(${h},${s}%,${l}%,${a})`; }

function drawLeafShape(ctx, kind, len, wid) {
  ctx.beginPath();
  if (kind === 'maple') {
    const pts = 5;
    for (let i = 0; i <= pts * 2; i++) {
      const a = -Math.PI / 2 + (i / (pts * 2)) * Math.PI * 2;
      const r = (i % 2 === 0 ? len : len * 0.45) * (i === 0 || i === pts * 2 ? 1 : 0.85 + 0.15 * Math.cos(a * 3));
      const x = Math.cos(a) * r * 0.9, y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  } else if (kind === 'needle') {
    ctx.rect(-wid * 0.5, -len, wid, len);
  } else {
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(wid, -len * 0.25, wid * 0.8, -len * 0.8, 0, -len);
    ctx.bezierCurveTo(-wid * 0.8, -len * 0.8, -wid, -len * 0.25, 0, 0);
  }
  ctx.closePath();
}

// Leaf cluster card texture: near-white, finely detailed leaves on twigs so
// per-instance colour can tint them (keeps value variation, veins and depth).
export function makeLeafCardTexture(kind, seed = 3) {
  const S = 512;
  const c = canvas(S, S), ctx = c.getContext('2d');
  const r = new RNG(seed);
  const rnd = () => r.next();
  ctx.clearRect(0, 0, S, S);
  const light = (l) => { const v = 190 + l * 65; return [v * (0.97 + rnd() * 0.05), v, v * (0.9 + rnd() * 0.06)]; };
  if (kind === 'needle') {
    // a drooping fir spray: central twig with dense needle rows and side shoots
    const twig = (x0, y0, ang, len, w) => {
      ctx.save(); ctx.translate(x0, y0); ctx.rotate(ang);
      ctx.strokeStyle = 'rgb(120,96,78)'; ctx.lineWidth = w; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.05, len * 0.5, 0, len); ctx.stroke();
      for (let i = 0; i < len / 2.2; i++) {
        const t = i / (len / 2.2), y = t * len;
        const nl = (1 - t * 0.55) * (14 + rnd() * 6) * (S / 512);
        for (const sd of [-1, 1]) {
          const l = 150 + rnd() * 100;
          ctx.strokeStyle = `rgb(${l * 0.92},${l},${l * 0.9})`;
          ctx.lineWidth = 2.1 * (S / 512);
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(sd * nl * (0.8 + rnd() * 0.2), y + nl * 0.55); ctx.stroke();
        }
      }
      ctx.restore();
    };
    twig(S / 2, S * 0.03, 0, S * 0.92, 6);
    for (let k = 0; k < 7; k++) {
      const t = 0.12 + k * 0.11, sd = k % 2 ? 1 : -1;
      twig(S / 2 + sd * 4, S * (0.03 + t * 0.9), -sd * (0.7 + rnd() * 0.3), S * (0.34 - t * 0.2), 3);
    }
    return foliageTex(c);
  }
  // ---- delicate foliage: many small, soft, overlapping leaves with gaps between them.
  // No outlines or painted veins: each leaf is a soft gradient (light heart, deeper rim),
  // so a crown reads as depth and dappled light rather than as cut-out paper.
  const softLeaf = (x, y, ang, len, wid, l, warm) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const v = 150 + l * 105;
    const g = ctx.createRadialGradient(len * 0.45, -wid * 0.15, 0, len * 0.45, 0, len * 0.62);
    g.addColorStop(0, `rgba(${v * (1.0 + warm * 0.05) | 0},${v | 0},${v * (0.9 - warm * 0.06) | 0},1)`);
    g.addColorStop(0.7, `rgba(${v * 0.86 | 0},${v * 0.88 | 0},${v * 0.8 | 0},1)`);
    g.addColorStop(1, `rgba(${v * 0.7 | 0},${v * 0.74 | 0},${v * 0.64 | 0},0.92)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(len * 0.25, -wid * 1.05, len * 0.72, -wid * 0.95, len, 0);
    ctx.bezierCurveTo(len * 0.72, wid * 0.95, len * 0.25, wid * 1.05, 0, 0);
    ctx.fill();
    // a whisper of a midrib, lighter than the blade
    ctx.strokeStyle = `rgba(255,255,240,${0.12 + l * 0.08})`; ctx.lineWidth = Math.max(0.6, wid * 0.08);
    ctx.beginPath(); ctx.moveTo(len * 0.05, 0); ctx.quadraticCurveTo(len * 0.5, -wid * 0.08, len * 0.9, 0); ctx.stroke();
    ctx.restore();
  };
  const twig = (x0, y0, x1, y1, w) => {
    ctx.strokeStyle = 'rgba(120,104,86,0.9)'; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2 + (rnd() - 0.5) * 14, (y0 + y1) / 2 + (rnd() - 0.5) * 14, x1, y1); ctx.stroke();
  };
  if (kind === 'willow') {
    for (let st = 0; st < 16; st++) {
      let x = S * (0.06 + 0.88 * rnd());
      ctx.strokeStyle = 'rgba(150,140,110,0.8)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + 8, S * 0.3, x - 8, S * 0.7, x + 4, S); ctx.stroke();
      for (let y = 4; y < S; y += 7 + rnd() * 4) {
        x += (rnd() - 0.5) * 1.5;
        const sd = rnd() < 0.5 ? -1 : 1;
        softLeaf(x, y, Math.PI / 2 + sd * (0.35 + rnd() * 0.3), 18 + rnd() * 10, 2.6 + rnd() * 1.2, rnd() * 0.9, rnd());
      }
    }
    return foliageTex(c);
  }
  if (kind === 'blossom') {
    // airy sprays of small five-petal blossoms, a few young leaves between them
    for (let sp = 0; sp < 7; sp++) {
      const cx = S * (0.18 + 0.64 * rnd()), cy = S * (0.18 + 0.64 * rnd());
      for (let b = 0; b < 5; b++) { const a = rnd() * 6.28, L = S * (0.1 + rnd() * 0.12); twig(cx, cy, cx + Math.cos(a) * L, cy + Math.sin(a) * L, 1.8); }
      const n = 16 + Math.floor(rnd() * 10);
      for (let k = 0; k < n; k++) {
        const a = rnd() * 6.28, d = Math.sqrt(rnd()) * S * 0.2;
        const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
        if (rnd() < 0.25) { softLeaf(x, y, rnd() * 6.28, S * 0.04, S * 0.013, 0.2 + rnd() * 0.4, 0.3); continue; }
        const r0 = S * (0.012 + rnd() * 0.01), l = rnd();
        ctx.save(); ctx.translate(x, y); ctx.rotate(rnd() * 6.28);
        for (let p = 0; p < 5; p++) {
          ctx.rotate(Math.PI * 2 / 5);
          const v = 215 + l * 40;
          const g = ctx.createRadialGradient(0, r0 * 1.1, 0, 0, r0 * 1.1, r0 * 1.2);
          g.addColorStop(0, `rgb(${v | 0},${v * 0.97 | 0},${v * 0.98 | 0})`); g.addColorStop(1, `rgba(${v * 0.85 | 0},${v * 0.8 | 0},${v * 0.84 | 0},0.9)`);
          ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, r0 * 1.1, r0 * 0.75, r0 * 1.1, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = 'rgba(240,210,140,0.9)'; ctx.beginPath(); ctx.arc(0, 0, r0 * 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
    return foliageTex(c);
  }
  // broad / small: several leafy sprays, back leaves deeper, front leaves lighter
  const small = kind === 'small';
  const sprays = small ? 9 : 7;
  for (let sp = 0; sp < sprays; sp++) {
    const cx = S * (0.2 + 0.6 * rnd()), cy = S * (0.2 + 0.6 * rnd());
    const nb = 4 + Math.floor(rnd() * 3);
    const tips = [];
    for (let b = 0; b < nb; b++) {
      const a = (b / nb) * Math.PI * 2 + rnd() * 0.8, L = S * (0.1 + rnd() * 0.1);
      const ex = cx + Math.cos(a) * L, ey = cy + Math.sin(a) * L;
      twig(cx, cy, ex, ey, small ? 1.4 : 2);
      tips.push([cx, cy, ex, ey, a]);
    }
    const nLeaves = small ? 34 : 24;
    for (let k = 0; k < nLeaves; k++) {
      const [x0, y0, x1, y1, a] = tips[Math.floor(rnd() * tips.length)];
      const t = 0.25 + rnd() * 0.85;
      const x = x0 + (x1 - x0) * t + (rnd() - 0.5) * 8, y = y0 + (y1 - y0) * t + (rnd() - 0.5) * 8;
      const len = S * (small ? 0.028 + rnd() * 0.014 : 0.042 + rnd() * 0.022);
      const wid = len * (small ? 0.42 : 0.36 + rnd() * 0.12);
      const l = Math.min(1, k / nLeaves * 0.7 + rnd() * 0.45); // later = in front = lighter
      softLeaf(x, y, a + (rnd() - 0.5) * 2.2, len, wid, l, rnd());
    }
  }
  return foliageTex(c);
}

// single leaf sprite atlas (falling leaves / ground litter): maple, oak, birch, petal
export function makeSingleLeafTexture() {
  const S = 128; const c = canvas(S * 4, S), ctx = c.getContext('2d');
  const r = new RNG(77); const rnd = () => r.next();
  const kinds = ['maple', 'oak', 'birch', 'petal'];
  kinds.forEach((k, i) => {
    ctx.save(); ctx.translate(i * S + S / 2, S * (k === 'maple' ? 0.78 : 0.9));
    const len = k === 'maple' ? S * 0.5 : S * 0.8;
    paintLeaf(ctx, k, len, { base: [235, 232, 222], tip: [250, 246, 236], vein: [200, 190, 170], mottle: 0.5, curl: 0.6, stem: k !== 'petal', blemish: k === 'petal' ? 0 : 0.3 }, rnd);
    ctx.restore();
  });
  return canvasTex(c);
}

// flower head atlas (4 kinds): daisy, star, cup, spike
export function makeFlowerTexture() {
  const S = 128; const c = canvas(S * 4, S), ctx = c.getContext('2d');
  const r = new RNG(5);
  // daisy
  ctx.save(); ctx.translate(S / 2, S / 2);
  for (let p = 0; p < 14; p++) { ctx.rotate(Math.PI * 2 / 14); ctx.fillStyle = hsl(0, 0, 88 + r.next() * 12); ctx.beginPath(); ctx.ellipse(0, -S * 0.26, S * 0.07, S * 0.22, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#ffd64a'; ctx.beginPath(); ctx.arc(0, 0, S * 0.11, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  // star (5 wide petals)
  ctx.save(); ctx.translate(S * 1.5, S / 2);
  for (let p = 0; p < 5; p++) { ctx.rotate(Math.PI * 2 / 5); const g = ctx.createLinearGradient(0, 0, 0, -S * 0.45); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d8d8d8'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -S * 0.24, S * 0.16, S * 0.24, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#fff4b0'; ctx.beginPath(); ctx.arc(0, 0, S * 0.07, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  // cup (tulip side-ish from above: layered)
  ctx.save(); ctx.translate(S * 2.5, S / 2);
  for (let ring = 0; ring < 3; ring++) for (let p = 0; p < 6; p++) {
    ctx.save(); ctx.rotate(p * Math.PI / 3 + ring * 0.5);
    ctx.fillStyle = hsl(0, 0, 70 + ring * 12);
    ctx.beginPath(); ctx.ellipse(0, -S * (0.2 - ring * 0.05), S * (0.15 - ring * 0.03), S * (0.24 - ring * 0.06), 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  ctx.restore();
  // spike (lavender, drawn vertical)
  ctx.save(); ctx.translate(S * 3.5, S);
  for (let i = 0; i < 40; i++) {
    const t = i / 40; const y = -t * S * 0.95; const w = (1 - t) * S * 0.12 + 4;
    ctx.fillStyle = hsl(0, 0, 70 + r.next() * 30);
    ctx.beginPath(); ctx.arc((r.next() - 0.5) * w, y, 4 + (1 - t) * 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  return canvasTex(c);
}

// soft round sprite + star spark + snowflake atlas (for particles)
export function makeParticleAtlas() {
  const S = 128; const c = canvas(S * 4, S), ctx = c.getContext('2d');
  // 0: soft glow
  let g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  // 1: star spark
  ctx.save(); ctx.translate(S * 1.5, S / 2);
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, S * 0.18); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, S * 0.18, 0, Math.PI * 2); ctx.fill();
  for (let k = 0; k < 4; k++) {
    ctx.rotate(Math.PI / 4 * (k === 2 ? 1 : 2));
    const lg = ctx.createLinearGradient(0, 0, 0, S * 0.5);
    lg.addColorStop(0, 'rgba(255,255,255,0.9)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(0, S * (k % 2 ? 0.3 : 0.5)); ctx.lineTo(3, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(0, -S * (k % 2 ? 0.3 : 0.5)); ctx.lineTo(3, 0); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // 2: snowflake
  ctx.save(); ctx.translate(S * 2.5, S / 2); ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (let k = 0; k < 6; k++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -S * 0.42); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -S * 0.22); ctx.lineTo(S * 0.1, -S * 0.32); ctx.moveTo(0, -S * 0.22); ctx.lineTo(-S * 0.1, -S * 0.32); ctx.stroke();
  }
  ctx.restore();
  // 3: smoke puff (noisy)
  const r = new RNG(9);
  ctx.save(); ctx.translate(S * 3.5, S / 2);
  for (let k = 0; k < 26; k++) {
    const a = r.next() * 6.28, d = r.next() * S * 0.22;
    g = ctx.createRadialGradient(Math.cos(a) * d, Math.sin(a) * d, 0, Math.cos(a) * d, Math.sin(a) * d, S * 0.22);
    g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(-S / 2, -S / 2, S, S);
  }
  ctx.restore();
  return canvasTex(c, false);
}

// Bark texture with normal (albedo canvas + normal data)
export function makeBarkTextures(kind, seed = 11) {
  const W = 256, Hh = 512;
  const pn = new PNoise(seed);
  const r = new RNG(seed);
  const hgt = new Float32Array(W * Hh);
  const col = new Uint8ClampedArray(W * Hh * 4);
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / Hh;
    let h, cr, cg, cb;
    if (kind === 'birch') {
      const band = pn.fbm(u * 0.3, v, 16, 3);
      const mark = band > 0.32 ? 1 : 0;
      const fine = pn.fbm(u, v, 32, 3);
      h = 0.5 + 0.2 * fine - 0.3 * mark;
      const l = 0.86 + 0.08 * fine - 0.72 * mark;
      cr = l * 1.0; cg = l * 0.98; cb = l * 0.94;
    } else if (kind === 'cherry') {
      const lent = Math.abs(pn.fbm(u, v * 4, 8, 3)) < 0.05 ? 1 : 0;
      const fine = pn.fbm(u, v, 16, 4);
      h = 0.5 + 0.3 * fine - 0.3 * lent;
      const l = 0.35 + 0.12 * fine;
      cr = l * 0.95 - lent * 0.1; cg = l * 0.62; cb = l * 0.58;
    } else if (kind === 'pine') {
      const plates = pn.fbm(u * 2, v, 4, 3);
      const edge = Math.abs(pn.noise(u * 6, v * 3, 6));
      h = 0.4 + 0.6 * Math.min(1, edge * 3) * (0.8 + 0.2 * plates);
      const l = 0.28 + 0.25 * h;
      cr = l * 1.25; cg = l * 0.8; cb = l * 0.6;
    } else if (kind === 'crystal') {
      h = 0.5 + 0.5 * pn.fbm(u, v, 8, 3);
      cr = 0.8; cg = 0.9; cb = 1.0;
    } else if (kind === 'stem') {
      const fib = pn.fbm(u * 8, v * 0.5, 8, 3);
      h = 0.5 + 0.4 * fib;
      const l = 0.45 + 0.2 * fib;
      cr = l * 0.55; cg = l * 1.0; cb = l * 0.4;
    } else { // oak / generic furrowed bark
      const ridges = Math.abs(pn.noise(u * 8 + pn.fbm(u, v, 4, 2) * 1.2, v * 2, 8));
      const fine = pn.fbm(u, v, 32, 3);
      h = Math.min(1, ridges * 2.2) * 0.8 + 0.2 * fine;
      const l = 0.18 + 0.28 * h + 0.06 * fine;
      cr = l * 1.05; cg = l * 0.85; cb = l * 0.68;
      // moss
      const moss = Math.max(0, pn.fbm(u + 0.3, v + 0.2, 4, 3) - 0.1) * 2.2 * (1 - h);
      cr = cr * (1 - moss) + 0.22 * moss; cg = cg * (1 - moss) + 0.42 * moss; cb = cb * (1 - moss) + 0.12 * moss;
    }
    hgt[y * W + x] = h;
    const o = (y * W + x) * 4;
    col[o] = 255 * clamp01(cr); col[o + 1] = 255 * clamp01(cg); col[o + 2] = 255 * clamp01(cb); col[o + 3] = 255;
  }
  const c = canvas(W, Hh);
  c.getContext('2d').putImageData(new ImageData(col, W, Hh), 0, 0);
  const map = canvasTex(c, true, true);
  const nd = new Uint8Array(W * Hh * 4);
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const xl = (x - 1 + W) % W, xr = (x + 1) % W, yu = (y - 1 + Hh) % Hh, yd = (y + 1) % Hh;
    const dx = (hgt[y * W + xr] - hgt[y * W + xl]) * 3, dy = (hgt[yd * W + x] - hgt[yu * W + x]) * 3;
    const l = Math.hypot(dx, dy, 1), o = (y * W + x) * 4;
    nd[o] = 255 * (0.5 - 0.5 * dx / l); nd[o + 1] = 255 * (0.5 + 0.5 * dy / l); nd[o + 2] = 255 / l; nd[o + 3] = 255;
  }
  const normal = new THREE.DataTexture(nd, W, Hh, THREE.RGBAFormat);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  normal.minFilter = THREE.LinearMipmapLinearFilter; normal.magFilter = THREE.LinearFilter; normal.generateMipmaps = true; normal.needsUpdate = true;
  return { map, normal };
}

// Rock albedo (tileable, used triplanar on props)
export function makeRockTexture(seed = 17) {
  const S = 256;
  const pn = new PNoise(seed);
  const col = new Uint8ClampedArray(S * S * 4);
  const hgt = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S;
    const f = pn.fbm(u, v, 4, 6);
    const cr = Math.abs(pn.noise(u * 8, v * 8, 8));
    const h = 0.5 + 0.5 * f - (cr < 0.04 ? 0.3 : 0);
    hgt[y * S + x] = h;
    const l = 0.38 + 0.25 * f - (cr < 0.04 ? 0.15 : 0);
    const o = (y * S + x) * 4;
    col[o] = 255 * clamp01(l * 1.02); col[o + 1] = 255 * clamp01(l * 0.98); col[o + 2] = 255 * clamp01(l * 0.95); col[o + 3] = 255;
  }
  const c = canvas(S, S);
  c.getContext('2d').putImageData(new ImageData(col, S, S), 0, 0);
  const map = canvasTex(c, true, true);
  const nd = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const xl = (x - 1 + S) % S, xr = (x + 1) % S, yu = (y - 1 + S) % S, yd = (y + 1) % S;
    const dx = (hgt[y * S + xr] - hgt[y * S + xl]) * 4, dy = (hgt[yd * S + x] - hgt[yu * S + x]) * 4;
    const l = Math.hypot(dx, dy, 1), o = (y * S + x) * 4;
    nd[o] = 255 * (0.5 - 0.5 * dx / l); nd[o + 1] = 255 * (0.5 + 0.5 * dy / l); nd[o + 2] = 255 / l; nd[o + 3] = 255;
  }
  const normal = new THREE.DataTexture(nd, S, S, THREE.RGBAFormat);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  normal.minFilter = THREE.LinearMipmapLinearFilter; normal.magFilter = THREE.LinearFilter; normal.generateMipmaps = true; normal.needsUpdate = true;
  return { map, normal };
}

// Mushroom cap spots / petal veins (grayscale)
export function makeCapTexture(seed = 4) {
  const S = 256; const c = canvas(S, S), ctx = c.getContext('2d');
  const r = new RNG(seed);
  ctx.fillStyle = '#d8d8d8'; ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 26; i++) {
    const x = r.next() * S, y = r.next() * S * 0.8, rad = 6 + r.next() * 16;
    ctx.fillStyle = 'rgba(255,255,250,0.97)'; ctx.beginPath(); ctx.ellipse(x, y, rad, rad * 0.8, 0, 0, Math.PI * 2); ctx.fill();
  }
  const g = ctx.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, 'rgba(255,255,255,0.0)'); g.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  return canvasTex(c, true, true);
}

export function makePetalTexture() {
  const W = 128, Hh = 256; const c = canvas(W, Hh), ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, Hh, 0, 0);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#f2f2f2'); g.addColorStop(1, '#ffffff');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(W / 2, Hh);
  ctx.bezierCurveTo(W * 1.05, Hh * 0.7, W * 0.95, Hh * 0.1, W / 2, 0);
  ctx.bezierCurveTo(W * 0.05, Hh * 0.1, -W * 0.05, Hh * 0.7, W / 2, Hh);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2;
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(W / 2, Hh); ctx.quadraticCurveTo(W / 2 + i * 12, Hh * 0.5, W / 2 + i * 9, Hh * 0.08); ctx.stroke(); }
  return canvasTex(c);
}
