// Fey cottages: storybook houses with sagging fish-scale roofs, half-timbered
// lime-plaster walls, fieldstone plinths, arched doors, glowing windows, flower
// boxes and witch-hat towers. Each village gets its own seasonal palette.
import * as THREE from 'three';
import { feyPatch } from '../render/shaderLib.js';
import { RNG } from '../core/rng.js';

// ------------------------------------------------------------------ textures
function canvas(S) { const c = document.createElement('canvas'); c.width = c.height = S; return c; }
function wrapDraw(S, fn) { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) fn(ox, oy); }

// height canvas -> tangent-space normal map
function normalFromHeight(hc, strength) {
  const S = hc.width, src = hc.getContext('2d').getImageData(0, 0, S, S).data;
  const out = new Uint8Array(S * S * 4);
  const h = (x, y) => src[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (h(x + 1, y) - h(x - 1, y)) * strength, dy = (h(x, y + 1) - h(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * S + x) * 4;
    out[i] = (-dx / l * 0.5 + 0.5) * 255; out[i + 1] = (dy / l * 0.5 + 0.5) * 255; out[i + 2] = (1 / l * 0.5 + 0.5) * 255; out[i + 3] = 255;
  }
  const t = new THREE.DataTexture(out, S, S, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}
function mapTex(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}
function noiseFill(ctx, S, r, n, cols, rad) {
  for (let i = 0; i < n; i++) {
    const x = r.next() * S, y = r.next() * S, s = rad * (0.4 + r.next());
    ctx.fillStyle = cols[Math.floor(r.next() * cols.length)];
    wrapDraw(S, (ox, oy) => { ctx.beginPath(); ctx.ellipse(x + ox, y + oy, s, s * (0.5 + r.next() * 0.5), r.next() * 3, 0, Math.PI * 2); ctx.fill(); });
  }
}

function plasterTex(seed, base) {
  const S = 256, r = new RNG(seed), c = canvas(S), g = c.getContext('2d'), hc = canvas(S), hg = hc.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  noiseFill(g, S, r, 260, ['rgba(255,250,235,.08)', 'rgba(120,100,70,.05)', 'rgba(170,150,120,.06)'], 14);
  noiseFill(g, S, r, 900, ['rgba(90,70,50,.035)', 'rgba(255,255,255,.04)'], 2.5);
  hg.fillStyle = '#808080'; hg.fillRect(0, 0, S, S);
  noiseFill(hg, S, r, 700, ['rgba(255,255,255,.08)', 'rgba(0,0,0,.08)'], 5);
  return { map: mapTex(c), normalMap: normalFromHeight(hc, 2.2) };
}
function timberTex(seed, base) {
  const S = 256, r = new RNG(seed), c = canvas(S), g = c.getContext('2d'), hc = canvas(S), hg = hc.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, S, S); hg.fillStyle = '#808080'; hg.fillRect(0, 0, S, S);
  for (let i = 0; i < 140; i++) {
    const x = r.next() * S, w = 0.6 + r.next() * 2.2, l = r.next() * 0.5;
    g.strokeStyle = `rgba(${20 + l * 60},${12 + l * 40},${6 + l * 20},${0.25 + r.next() * 0.35})`; g.lineWidth = w;
    hg.strokeStyle = `rgba(0,0,0,${0.2 + r.next() * 0.3})`; hg.lineWidth = w;
    const ph = r.next() * 6;
    for (const ctx of [g, hg]) { ctx.beginPath(); for (let y = 0; y <= S; y += 8) { const xx = x + Math.sin(y * 0.03 + ph) * 3; if (y === 0) ctx.moveTo(xx, y); else ctx.lineTo(xx, y); } ctx.stroke(); }
  }
  return { map: mapTex(c), normalMap: normalFromHeight(hc, 2.5) };
}
function stoneTex(seed, tones) {
  const S = 256, r = new RNG(seed), c = canvas(S), g = c.getContext('2d'), hc = canvas(S), hg = hc.getContext('2d');
  g.fillStyle = '#3a3530'; g.fillRect(0, 0, S, S); hg.fillStyle = '#202020'; hg.fillRect(0, 0, S, S);
  // courses of rounded fieldstones
  let y = 0;
  while (y < S) {
    const rh = 22 + r.next() * 16; let x = r.next() * 20;
    while (x < S + 20) {
      const w = 24 + r.next() * 30, cx = x + w / 2, cy = y + rh / 2;
      const t = tones[Math.floor(r.next() * tones.length)], k = 0.85 + r.next() * 0.3;
      const col = `rgb(${t[0] * k | 0},${t[1] * k | 0},${t[2] * k | 0})`;
      wrapDraw(S, (ox, oy) => {
        const gr = g.createRadialGradient(cx + ox - w * 0.15, cy + oy - rh * 0.2, 1, cx + ox, cy + oy, w * 0.6);
        gr.addColorStop(0, col); gr.addColorStop(1, `rgb(${t[0] * k * 0.7 | 0},${t[1] * k * 0.7 | 0},${t[2] * k * 0.7 | 0})`);
        g.fillStyle = gr; g.beginPath(); g.ellipse(cx + ox, cy + oy, w / 2 - 1.5, rh / 2 - 1.5, (r.next() - 0.5) * 0.2, 0, Math.PI * 2); g.fill();
        const hr = hg.createRadialGradient(cx + ox, cy + oy, 1, cx + ox, cy + oy, w * 0.55);
        hr.addColorStop(0, '#f0f0f0'); hr.addColorStop(1, '#505050');
        hg.fillStyle = hr; hg.beginPath(); hg.ellipse(cx + ox, cy + oy, w / 2 - 1.5, rh / 2 - 1.5, 0, 0, Math.PI * 2); hg.fill();
      });
      x += w;
    }
    y += rh;
  }
  noiseFill(g, S, r, 300, ['rgba(80,110,50,.10)', 'rgba(0,0,0,.08)', 'rgba(255,255,255,.05)'], 6);
  return { map: mapTex(c), normalMap: normalFromHeight(hc, 4) };
}
// fish-scale shingles
function shingleTex(seed, base) {
  const S = 256, r = new RNG(seed), c = canvas(S), g = c.getContext('2d'), hc = canvas(S), hg = hc.getContext('2d');
  const [br, bg, bb] = base;
  g.fillStyle = `rgb(${br * 0.4 | 0},${bg * 0.4 | 0},${bb * 0.4 | 0})`; g.fillRect(0, 0, S, S);
  hg.fillStyle = '#000'; hg.fillRect(0, 0, S, S);
  const cols = 8, rows = 12, cw = S / cols, rh = S / rows;
  for (let row = -1; row <= rows; row++) {
    for (let col = -1; col <= cols; col++) {
      const cx = (col + (row % 2 ? 0.5 : 0)) * cw + cw / 2, cy = row * rh;
      const k = 0.78 + r.next() * 0.4, moss = r.next() < 0.12;
      const cr = moss ? 90 : br * k, cg = moss ? 110 : bg * k, cb = moss ? 60 : bb * k;
      wrapDraw(S, (ox, oy) => {
        const gr = g.createLinearGradient(0, cy + oy, 0, cy + oy + rh * 1.6);
        gr.addColorStop(0, `rgb(${cr * 0.75 | 0},${cg * 0.75 | 0},${cb * 0.75 | 0})`); gr.addColorStop(0.8, `rgb(${cr | 0},${cg | 0},${cb | 0})`); gr.addColorStop(1, `rgb(${cr * 0.55 | 0},${cg * 0.55 | 0},${cb * 0.55 | 0})`);
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(cx - cw / 2 + ox, cy + oy); g.lineTo(cx - cw / 2 + ox, cy + rh * 0.9 + oy); g.arc(cx + ox, cy + rh * 0.9 + oy, cw / 2, Math.PI, 0, true); g.lineTo(cx + cw / 2 + ox, cy + oy); g.closePath(); g.fill();
        const hr = hg.createLinearGradient(0, cy + oy, 0, cy + oy + rh * 1.5);
        hr.addColorStop(0, '#303030'); hr.addColorStop(1, '#f0f0f0');
        hg.fillStyle = hr;
        hg.beginPath(); hg.moveTo(cx - cw / 2 + ox, cy + oy); hg.lineTo(cx - cw / 2 + ox, cy + rh * 0.9 + oy); hg.arc(cx + ox, cy + rh * 0.9 + oy, cw / 2, Math.PI, 0, true); hg.lineTo(cx + cw / 2 + ox, cy + oy); hg.closePath(); hg.fill();
      });
    }
  }
  return { map: mapTex(c), normalMap: normalFromHeight(hc, 3) };
}
function thatchTex(seed) {
  const S = 256, r = new RNG(seed), c = canvas(S), g = c.getContext('2d'), hc = canvas(S), hg = hc.getContext('2d');
  g.fillStyle = '#7a6232'; g.fillRect(0, 0, S, S); hg.fillStyle = '#606060'; hg.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) {
    const x = r.next() * S, y = r.next() * S, l = 10 + r.next() * 18, k = r.next();
    g.strokeStyle = `rgba(${150 + k * 90 | 0},${115 + k * 80 | 0},${50 + k * 50 | 0},${0.35 + r.next() * 0.4})`; g.lineWidth = 0.8 + r.next();
    hg.strokeStyle = `rgba(255,255,255,${0.1 + r.next() * 0.2})`; hg.lineWidth = 1;
    const a = Math.PI / 2 + (r.next() - 0.5) * 0.25;
    wrapDraw(S, (ox, oy) => { for (const ctx of [g, hg]) { ctx.beginPath(); ctx.moveTo(x + ox, y + oy); ctx.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); ctx.stroke(); } });
  }
  for (let row = 0; row < S; row += 32) { g.fillStyle = 'rgba(40,28,10,.25)'; g.fillRect(0, row, S, 3); }
  return { map: mapTex(c), normalMap: normalFromHeight(hc, 2) };
}

// ------------------------------------------------------------------ geometry helpers
function uvScale(geo, su, sv) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return geo; }
function boxUV(w, h, d, k) {
  // box with world-scaled uvs so textures keep their size
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv, n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const su = ax > 0.5 ? d : w, sv = ay > 0.5 ? d : h;
    uv.setXY(i, uv.getX(i) * su * k, uv.getY(i) * sv * k);
  }
  return g;
}
// one side of a storybook roof: sagging ridge, flared eaves
function roofPanel(L, slope, rise, side, sag) {
  const g = new THREE.PlaneGeometry(L, 1, 18, 8);
  const p = g.attributes.position, uv = g.attributes.uv;
  const run = Math.sqrt(Math.max(0.01, slope * slope - rise * rise));
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), t = p.getY(i) + 0.5; // t: 1 at ridge, 0 at eave
    const e = 1 - t;
    const s = Math.sin(Math.PI * (x / L + 0.5));
    const y = rise * t - sag * s * (0.35 + 0.65 * t) + 0.35 * Math.pow(Math.max(0, e - 0.72) / 0.28, 2);
    const z = side * run * e;
    p.setXYZ(i, x, y, z);
    uv.setXY(i, (x / L + 0.5) * L * 0.42, e * slope * 0.42);
  }
  g.computeVertexNormals();
  return g;
}
function gableGeo(w2, rise, halfRun) {
  const e = rise * (1 - w2 / halfRun);
  const s = new THREE.Shape(); s.moveTo(-w2, 0); s.lineTo(w2, 0); s.lineTo(w2, e); s.lineTo(0, rise); s.lineTo(-w2, e); s.closePath();
  const g = new THREE.ShapeGeometry(s);
  const uv = g.attributes.uv, p = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) * 0.3, p.getY(i) * 0.3);
  return g;
}
function archDoorGeo(w, h) {
  const s = new THREE.Shape(); const r = w / 2;
  s.moveTo(-r, 0); s.lineTo(-r, h - r); s.absarc(0, h - r, r, Math.PI, 0, true); s.lineTo(r, 0); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.04, bevelSegments: 1, curveSegments: 10 });
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.5, uv.getY(i) * 0.5);
  return g;
}
function witchHatGeo(r, h, bend, seed) {
  const g = new THREE.ConeGeometry(r, h, 22, 10, true);
  const p = g.attributes.position, uv = g.attributes.uv;
  const rr = new RNG(seed), dir = rr.next() * Math.PI * 2;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), t = (y + h / 2) / h;
    const flare = 1 + 0.18 * Math.pow(1 - t, 3);
    const b = bend * t * t;
    p.setXYZ(i, p.getX(i) * flare + Math.cos(dir) * b, y, p.getZ(i) * flare + Math.sin(dir) * b);
    uv.setXY(i, uv.getX(i) * r * 2.6, (1 - t) * h * 0.42);
  }
  g.computeVertexNormals();
  return g;
}
function onionDomeGeo(r) {
  const pts = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16; const rad = r * (Math.sin(t * Math.PI * 0.9) * (1.15 - t * 0.5)) * (1 - Math.pow(t, 6)); pts.push(new THREE.Vector2(Math.max(0.01, rad), t * r * 1.9)); }
  return new THREE.LatheGeometry(pts, 24);
}

// ------------------------------------------------------------------ kit
export function makeCottageKit() {
  const M = (opts, key, snow) => { const m = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, envMapIntensity: 0.6, ...opts }); feyPatch(m, { key: 'cot-' + key, snow }); return m; };
  const plasterCream = plasterTex(1, '#cfc1a3'), plasterRose = plasterTex(2, '#d2b5a4'), plasterSage = plasterTex(3, '#c2c4a4'), plasterSand = plasterTex(4, '#c8a676');
  const oak = timberTex(5, '#4a3020'), pale = timberTex(6, '#7a5a3a');
  const field = stoneTex(7, [[150, 140, 125], [120, 115, 110], [165, 150, 130], [110, 105, 100]]);
  const warm = stoneTex(8, [[170, 140, 105], [150, 120, 90], [185, 160, 120]]);
  const cold = stoneTex(9, [[130, 135, 145], [110, 115, 125], [150, 150, 160]]);
  const sh = {
    slate: shingleTex(10, [78, 92, 124]), plum: shingleTex(11, [112, 70, 100]), moss: shingleTex(12, [82, 108, 62]),
    russet: shingleTex(13, [150, 78, 44]), teal: shingleTex(14, [54, 104, 104]), ember: shingleTex(15, [128, 54, 44]),
  };
  const thatch = thatchTex(16);
  const mats = {
    plaster: [M({ ...plasterCream }, 'pl0', 0.25), M({ ...plasterRose }, 'pl1', 0.25), M({ ...plasterSage }, 'pl2', 0.25)],
    sandPlaster: M({ ...plasterSand }, 'pls', 0.15),
    timber: M({ ...oak, roughness: 0.8 }, 'oak', 0.4), paleWood: M({ ...pale, roughness: 0.8 }, 'pale', 0.4),
    field: M({ ...field, roughness: 0.9 }, 'field', 0.6), warm: M({ ...warm, roughness: 0.9 }, 'warm', 0.4), cold: M({ ...cold, roughness: 0.9 }, 'cold', 0.8),
    thatch: M({ ...thatch, roughness: 0.95, side: THREE.DoubleSide }, 'thatch', 1),
    door: M({ ...oak, color: 0x9a7a6a }, 'door', 0),
    gold: M({ color: 0xd9b45a, metalness: 0.9, roughness: 0.3 }, 'gold', 0),
    iron: M({ color: 0x2a2624, metalness: 0.6, roughness: 0.5 }, 'iron', 0.2),
    flowers: [0xa31d3a, 0xe0b43a, 0x7a3fa8, 0xf0ece0, 0xd86a9a].map((c, i) => M({ color: c, roughness: 0.6 }, 'fl' + i, 0)),
    leaf: M({ color: 0x3e5a2a, roughness: 0.8 }, 'leafy', 0.5),
    domeBlue: M({ color: 0x3a5a90, roughness: 0.35, metalness: 0.3 }, 'domeb', 0.3), domeTeal: M({ color: 0x2a8a88, roughness: 0.35, metalness: 0.3 }, 'domet', 0.3),
  };
  const roofMat = {};
  for (const k in sh) roofMat[k] = M({ ...sh[k], roughness: 0.75, side: THREE.DoubleSide }, 'sh-' + k, 1);
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x1a1410, emissive: new THREE.Color(1.0, 0.62, 0.28), emissiveIntensity: 0.25, roughness: 0.15, metalness: 0 });
  feyPatch(windowMat, { key: 'cot-window', snow: 0 });

  const STYLES = {
    // Brightwater: all four courts meet, the most storybook of all
    meadow: { walls: () => mats.plaster, frame: mats.timber, plinth: mats.field, roofs: ['slate', 'plum', 'teal', 'moss'], tower: 0.35 },
    forest: { walls: () => [mats.plaster[0], mats.plaster[1]], frame: mats.timber, plinth: mats.warm, roofs: ['russet', 'ember', 'moss'], tower: 0.3, thatch: 0.25 },
    swamp: { walls: () => [mats.plaster[2]], frame: mats.paleWood, plinth: mats.field, roofs: ['moss', 'teal'], thatch: 0.7, stilts: true, tower: 0.15 },
    desert: { walls: () => [mats.sandPlaster], frame: mats.paleWood, plinth: mats.warm, desert: true },
    snow: { walls: () => [mats.plaster[0], mats.plaster[2]], frame: mats.timber, plinth: mats.cold, roofs: ['slate', 'teal', 'plum'], tower: 0.3, steep: true },
  };

  function flowerBox(grp, x, y, z, r, len) {
    const box = new THREE.Mesh(boxUV(len, 0.28, 0.32, 1), mats.paleWood); box.position.set(x, y, z); grp.add(box);
    const n = Math.round(len * 5);
    for (let i = 0; i < n; i++) {
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09 + r.next() * 0.05, 0), mats.flowers[Math.floor(r.next() * mats.flowers.length)]);
      f.position.set(x - len / 2 + 0.08 + (i + r.next() * 0.5) / n * (len - 0.16), y + 0.2 + r.next() * 0.12, z + (r.next() - 0.3) * 0.18); grp.add(f);
      if (r.next() < 0.6) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), mats.leaf); l.scale.set(1.2, 0.6, 1); l.position.set(f.position.x + 0.05, y + 0.16, z + 0.1); grp.add(l); }
    }
  }
  function window2(grp, x, y, z, rotY, r, frame, box) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY;
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.15), windowMat); pane.position.z = 0.02; g.add(pane);
    for (const [w, h, px, py] of [[1.15, 0.12, 0, 0.62], [1.15, 0.14, 0, -0.62], [0.12, 1.3, -0.52, 0], [0.12, 1.3, 0.52, 0], [0.06, 1.15, 0, 0], [0.95, 0.06, 0, 0.1]]) {
      const b = new THREE.Mesh(boxUV(w, h, 0.1, 1), frame); b.position.set(px, py, 0.05); g.add(b);
    }
    if (r.next() < 0.7) for (const s of [-1, 1]) {
      const sh = new THREE.Mesh(boxUV(0.5, 1.2, 0.06, 1), frame); sh.position.set(s * 0.82, 0, 0.18); sh.rotation.y = s * -0.5; g.add(sh);
    }
    if (box) flowerBox(g, 0, -0.78, 0.2, r, 1.2);
    grp.add(g);
  }

  // returns { group, footprint: { kind: 'box'|'round', w, d, r }, chimney: {x,y,z} | null, lamp: {x,y,z} }
  function build(r, styleName) {
    const st = STYLES[styleName] || STYLES.meadow;
    const grp = new THREE.Group();
    const wallMats = st.walls();
    const wall = wallMats[Math.floor(r.next() * wallMats.length)];
    const lift = st.stilts ? 1.5 : 0;
    const out = { group: grp, chimney: null, lamp: null };

    if (st.desert) {
      const w = 6.5 + r.next() * 2.5, d = 5.5 + r.next() * 2, h = 4 + r.next() * 1.4;
      const body = new THREE.Mesh(boxUV(w, h, d, 0.35), wall); body.position.y = h / 2; grp.add(body);
      const pl = new THREE.Mesh(boxUV(w + 0.5, 1.4, d + 0.5, 0.3), st.plinth); pl.position.y = -0.35; grp.add(pl);
      const cap = new THREE.Mesh(boxUV(w + 0.4, 0.35, d + 0.4, 0.35), wall); cap.position.y = h + 0.17; grp.add(cap);
      for (let k = 0; k < 8; k++) { const m = new THREE.Mesh(boxUV(0.45, 0.45, 0.45, 0.35), wall); const t = k / 8; m.position.set((t < 0.5 ? -1 : 1) * (w / 2), h + 0.55, (t * 4 % 2 - 0.5) * d * 0.9); grp.add(m); }
      if (r.next() < 0.75) {
        const dr = Math.min(w, d) * 0.3;
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(dr * 0.95, dr * 0.95, 0.9, 20), wall); drum.position.y = h + 0.8; grp.add(drum);
        const dome = new THREE.Mesh(onionDomeGeo(dr), r.next() < 0.5 ? mats.domeBlue : mats.domeTeal); dome.position.y = h + 1.2; grp.add(dome);
        const fin = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.9, 8), mats.gold); fin.position.y = h + 1.2 + dr * 1.9 + 0.35; grp.add(fin);
      }
      const door = new THREE.Mesh(archDoorGeo(1.4, 2.6), mats.door); door.position.set(0, 0.35, d / 2 - 0.02); grp.add(door);
      for (const s of [-1, 1]) window2(grp, s * w * 0.3, h * 0.6, d / 2 + 0.01, 0, r, st.frame, false);
      out.footprint = { kind: 'box', w, d };
      out.lamp = { x: 1.2, y: 2.6, z: d / 2 + 0.35 };
      return out;
    }

    if (r.next() < (st.tower || 0)) {
      // witch-hat tower cottage
      const R = 3.0 + r.next() * 0.8, h = 4.6 + r.next() * 1.6;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.04, h, 22, 1), wall);
      uvScale(body.geometry, R * 2.2, h * 0.35); body.position.y = h / 2 + lift; grp.add(body);
      const pl = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.1, R * 1.16, 1.5, 22, 1), st.plinth); uvScale(pl.geometry, R * 2, 0.5); pl.position.y = -0.3 + lift; grp.add(pl);
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; const b = new THREE.Mesh(boxUV(0.22, h, 0.22, 1), st.frame); b.position.set(Math.cos(a) * R * 1.01, h / 2 + lift, Math.sin(a) * R * 1.01); grp.add(b); }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 1.02, 0.12, 6, 28), st.frame); ring.rotation.x = Math.PI / 2; ring.position.y = h + lift; grp.add(ring);
      const rk = st.roofs[Math.floor(r.next() * st.roofs.length)];
      const hat = new THREE.Mesh(witchHatGeo(R * 1.38, R * 2.4 * (st.steep ? 1.25 : 1), 0.9 + r.next() * 0.9, Math.floor(r.next() * 999)), roofMat[rk]);
      hat.position.y = h + lift + R * 1.2 * (st.steep ? 1.25 : 1); grp.add(hat);
      const door = new THREE.Mesh(archDoorGeo(1.3, 2.4), mats.door); door.position.set(0, lift + 0.42, R - 0.05); grp.add(door);
      for (const a of [0.9, -0.9, 2.4]) window2(grp, Math.sin(a) * (R + 0.02), h * 0.62 + lift, Math.cos(a) * (R + 0.02), a, r, st.frame, r.next() < 0.5);
      const dormer = h * 0.62 + lift;
      out.footprint = { kind: 'round', r: R * 1.1 };
      out.lamp = { x: 1.1, y: 2.5 + lift, z: R + 0.3 };
      if (r.next() < 0.6) { out.chimney = { x: -R * 0.55, y: h + lift + 2.6, z: -R * 0.3 }; addChimney(grp, -R * 0.55, h + lift + 0.4, -R * 0.3, r, st.plinth, 2.6); }
      void dormer;
      return out;
    }

    // gabled cottage
    const w = 7 + r.next() * 3, d = 5.6 + r.next() * 1.8, h = 3.6 + r.next() * 1.2;
    const body = new THREE.Mesh(boxUV(w, h, d, 0.33), wall); body.position.y = h / 2 + lift; grp.add(body);
    const pl = new THREE.Mesh(boxUV(w + 0.35, 1.6, d + 0.35, 0.3), st.plinth); pl.position.y = -0.35 + lift; grp.add(pl);
    // half-timbering
    const F = st.frame, T = 0.2;
    const beam = (bw, bh, bd, x, y, z, rz) => { const b = new THREE.Mesh(boxUV(bw, bh, bd, 1), F); b.position.set(x, y + lift, z); if (rz) b.rotation.z = rz; grp.add(b); };
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) beam(T, h, T, sx * w / 2, h / 2, sz * d / 2);
    for (const sz of [-1, 1]) { beam(w + T, T, T, 0, h, sz * d / 2); beam(w + T, T, T, 0, 0.4, sz * d / 2); beam(w, T * 0.8, T * 0.8, 0, h * 0.52, sz * (d / 2 + 0.02)); }
    for (const sx of [-1, 1]) { beam(T, T, d + T, sx * w / 2, h, 0); }
    for (const sz of [-1, 1]) for (const fx of [-0.25, 0.25]) beam(T * 0.8, h, T * 0.8, fx * w, h / 2, sz * (d / 2 + 0.02));
    for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
      const len = Math.hypot(w * 0.25, h * 0.48); const b = new THREE.Mesh(boxUV(len, T * 0.7, T * 0.7, 1), F);
      b.position.set(sx * w * 0.375, h * 0.26 + lift, sz * (d / 2 + 0.03)); b.rotation.z = sx * Math.atan2(h * 0.48, w * 0.25); grp.add(b);
    }
    // roof
    const useThatch = r.next() < (st.thatch || 0);
    const rk = st.roofs[Math.floor(r.next() * st.roofs.length)];
    const rm = useThatch ? mats.thatch : roofMat[rk];
    const rise = (d / 2 + 0.8) * (st.steep ? 1.25 : 0.9) + r.next() * 0.6;
    const halfRun = d / 2 + 0.85;
    const slope = Math.hypot(halfRun, rise);
    const L = w + 1.3, sag = 0.18 + r.next() * 0.22;
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(roofPanel(L, slope, rise, side, sag), rm);
      p.position.y = h + lift + 0.05 - 0.15; grp.add(p);
    }
    const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, L + 0.1, 8), useThatch ? mats.thatch : F); ridge.rotation.z = Math.PI / 2; ridge.position.y = h + lift + rise - sag * 0.6 - 0.1; grp.add(ridge);
    for (const sx of [-1, 1]) {
      const gab = new THREE.Mesh(gableGeo(d / 2, rise - 0.12, halfRun), wall); gab.position.set(sx * (w / 2 + 0.005), h + lift - 0.1, 0); gab.rotation.y = sx * Math.PI / 2; grp.add(gab);
      // round gable window
      const ow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 18), windowMat); ow.position.set(sx * (w / 2 + 0.03), h + lift + rise * 0.42, 0); ow.rotation.y = sx * Math.PI / 2; grp.add(ow);
      const or = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.08, 6, 18), F); or.position.copy(ow.position); or.rotation.y = sx * Math.PI / 2; grp.add(or);
    }
    // door, windows
    const door = new THREE.Mesh(archDoorGeo(1.35, 2.45), mats.door); door.position.set(r.next() < 0.5 ? -w * 0.12 : w * 0.12, lift + 0.42, d / 2 - 0.04); grp.add(door);
    const step = new THREE.Mesh(boxUV(2, 0.3, 0.9, 0.3), st.plinth); step.position.set(door.position.x, 0.28 + lift, d / 2 + 0.55); grp.add(step);
    if (st.stilts) {
      for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 3.2, 7), mats.paleWood); p.position.set(sx * (w / 2 - 0.4), 0.2, sz * (d / 2 - 0.4)); grp.add(p); }
      const stair = new THREE.Mesh(boxUV(1.4, 0.2, 2.6, 0.5), mats.paleWood); stair.position.set(door.position.x, lift * 0.5, d / 2 + 1.3); stair.rotation.x = 0.55; grp.add(stair);
    }
    const winX = door.position.x < 0 ? [w * 0.28] : [-w * 0.28];
    if (w > 8) winX.push(door.position.x < 0 ? -w * 0.36 : w * 0.36);
    for (const x of winX) window2(grp, x, h * 0.6 + lift, d / 2 + 0.02, 0, r, F, r.next() < 0.75);
    for (const x of [-w * 0.25, w * 0.25]) if (r.next() < 0.6) window2(grp, x, h * 0.6 + lift, -d / 2 - 0.02, Math.PI, r, F, false);
    // chimney through the roof
    if (r.next() < 0.8) {
      const cx = (r.next() < 0.5 ? -1 : 1) * w * 0.3, cz = -d * 0.18;
      addChimney(grp, cx, h + lift + 0.2, cz, r, st.plinth, rise + 1.4);
      out.chimney = { x: cx, y: h + lift + rise + 1.8, z: cz };
    }
    out.footprint = { kind: 'box', w: w + 0.4, d: d + 0.4 };
    out.lamp = { x: door.position.x + 1.05, y: 2.4 + lift, z: d / 2 + 0.3 };
    return out;
  }

  function addChimney(grp, x, y, z, r, mat, height) {
    let yy = y, lean = (r.next() - 0.5) * 0.06, ox = 0;
    const n = 4;
    for (let i = 0; i < n; i++) {
      const hh = height / n, s = 0.9 - i * 0.04;
      const b = new THREE.Mesh(boxUV(s, hh, s, 0.6), mat); b.position.set(x + ox, yy + hh / 2, z); b.rotation.y = (r.next() - 0.5) * 0.2; grp.add(b);
      yy += hh; ox += lean * hh;
    }
    const cap = new THREE.Mesh(boxUV(1.1, 0.16, 1.1, 0.6), mat); cap.position.set(x + ox, yy + 0.08, z); grp.add(cap);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.4, 8), mats.iron); pot.position.set(x + ox, yy + 0.35, z); grp.add(pot);
  }

  // hanging lantern bracket by the door
  function lantern(grp, p) {
    const arm = new THREE.Mesh(boxUV(0.08, 0.08, 0.5, 1), mats.iron); arm.position.set(p.x, p.y + 0.35, p.z - 0.1); grp.add(arm);
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.34, 6), mats.iron); cage.position.set(p.x, p.y, p.z + 0.12); grp.add(cage);
    const glass = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), windowMat); glass.position.set(p.x, p.y, p.z + 0.12); grp.add(glass);
  }

  return { build, lantern, mats, windowMat, roofMat };
}
