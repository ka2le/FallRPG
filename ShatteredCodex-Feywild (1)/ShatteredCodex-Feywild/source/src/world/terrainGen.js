// Procedural Feywild world generation
// Pipeline: season field -> WFC macro layout -> layered noise heightfield ->
// hydraulic droplet erosion + thermal relaxation -> wonder features (lava meres,
// leaf mountains, glacier fangs) -> priority-flood hydrology (lakes, drainage,
// flow accumulation, carved rivers) -> material masks -> vegetation / prop scatter.
import { Noise } from '../core/noise.js';
import { RNG, clamp, lerp, smoothstep, hash2i } from '../core/rng.js';
import { runWFC, T, TILE_COUNT } from './wfc.js';
import {
  N, CELL, HALF, COARSE, COARSE_CELL, SEASON_ANGLES,
  WATER_NONE, WATER_OCEAN, WATER_LAKE, WATER_RIVER, WTYPE_WATER, WTYPE_LAVA, WTYPE_ICE,
} from './constants.js';

const tick = () => new Promise((r) => setTimeout(r, 0));

export async function generateWorld(seed, opts, progress) {
  const q = opts.quality || 'high';
  const noise = new Noise(seed);
  const noiseB = new Noise(seed * 3 + 11);
  const rng = new RNG(seed ^ 0x9e3779b9);
  const NN = N * N;
  const W = {
    seed, N, CELL, HALF,
    height: new Float32Array(NN),
    season: new Float32Array(NN * 4),
    feat: new Uint8Array(NN * 4),   // R pollen, G bloomwood, B lava, A leafpile
    feat2: new Uint8Array(NN * 4),  // R crystal, G mushroom, B blossom grove, A glacier
    misc: new Uint8Array(NN * 4),   // R forest, G wetness, B grass density, A hub
    waterH: new Float32Array(NN).fill(-1000),
    waterKind: new Uint8Array(NN),
    waterType: new Uint8Array(NN),
    flow: new Float32Array(NN * 2),
    tiles: null,
    trees: [], props: [], islands: [], lavaPools: [], leafPiles: [],
  };

  // ---------------------------------------------------------------- seasons
  progress('Weaving the four seasons', 0.02);
  await tick();
  const seasonAt = (x, z, out) => {
    const r = Math.hypot(x, z);
    let th = Math.atan2(z, x) + 0.45 * noise.fbm(x * 0.0022 + 11.3, z * 0.0022 - 7.7, 3);
    const blend = 0.11 + 0.6 * Math.max(0, 1 - r / 160);
    let s = 0;
    for (let k = 0; k < 4; k++) {
      let d = Math.abs(th - SEASON_ANGLES[k]);
      d = d % (Math.PI * 2); if (d > Math.PI) d = Math.PI * 2 - d;
      const w = smoothstep(Math.PI / 4 + blend, Math.PI / 4 - blend, d);
      out[k] = w; s += w;
    }
    const hubMix = smoothstep(95, 25, r) * 0.85;
    const HUB_W = [0.36, 0.36, 0.2, 0.08];
    for (let k = 0; k < 4; k++) out[k] = (out[k] / (s || 1)) * (1 - hubMix) + HUB_W[k] * hubMix;
    return out;
  };
  const tmp4 = [0, 0, 0, 0];
  for (let iz = 0; iz < N; iz++) {
    const z = iz * CELL - HALF;
    for (let ix = 0; ix < N; ix++) {
      const x = ix * CELL - HALF;
      seasonAt(x, z, tmp4);
      const o = (iz * N + ix) * 4;
      W.season[o] = tmp4[0]; W.season[o + 1] = tmp4[1]; W.season[o + 2] = tmp4[2]; W.season[o + 3] = tmp4[3];
    }
    if (iz % 128 === 0) { progress('Weaving the four seasons', 0.02 + 0.05 * iz / N); await tick(); }
  }

  const islandAt = (x, z) => {
    const rn = Math.hypot(x, z) / HALF + 0.09 * noise.fbm(x / 300 + 40, z / 300 - 40, 4);
    return 1 - smoothstep(0.70, 0.87, rn);
  };

  // ---------------------------------------------------------------- WFC layout
  progress('Collapsing the wave function of the land', 0.08);
  await tick();
  const G = COARSE;
  const cellSeason = [];
  const cellIsland = new Float32Array(G * G);
  for (let cz = 0; cz < G; cz++) for (let cx = 0; cx < G; cx++) {
    const x = (cx + 0.5) * COARSE_CELL - HALF, z = (cz + 0.5) * COARSE_CELL - HALF;
    cellSeason.push(seasonAt(x, z, [0, 0, 0, 0]));
    cellIsland[cz * G + cx] = islandAt(x, z);
  }
  const hubCell = (cx, cz) => Math.abs(cx - 15.5) < 1.6 && Math.abs(cz - 15.5) < 1.6;
  const B = (...ts) => ts.reduce((m, t) => m | (1 << t), 0);
  const cellInfo = (cx, cz) => {
    const isl = cellIsland[cz * G + cx];
    const s = cellSeason[cz * G + cx];
    let allowed;
    if (hubCell(cx, cz)) allowed = B(T.MEADOW);
    else if (isl < 0.12) allowed = B(T.OCEAN);
    else if (isl < 0.42) allowed = B(T.OCEAN, T.BEACH);
    else if (isl < 0.62) allowed = B(T.BEACH, T.MEADOW, T.FOREST, T.HILLS, T.WONDER_A);
    else allowed = B(T.MEADOW, T.FOREST, T.HILLS, T.MOUNTAIN, T.LAKE, T.WONDER_A, T.WONDER_B);
    const w = new Array(TILE_COUNT).fill(0);
    w[T.OCEAN] = 1; w[T.BEACH] = 1;
    w[T.MEADOW] = 3.5 * s[0] + 3 * s[1] + 2 * s[2] + 2.2 * s[3];
    w[T.FOREST] = 2.6 * s[0] + 3.6 * s[1] + 3.6 * s[2] + 3.0 * s[3];
    w[T.HILLS] = 2;
    w[T.MOUNTAIN] = 1.1 + 1.2 * s[3];
    w[T.LAKE] = 0.7;
    w[T.WONDER_A] = 0.9;
    w[T.WONDER_B] = 0.8;
    return { allowed, weights: w };
  };
  // guarantee every season gets its wonders
  const preset = [];
  const taken = [];
  const farFromTaken = (cx, cz) => taken.every(([a, b]) => Math.abs(a - cx) + Math.abs(b - cz) > 3);
  for (let season = 0; season < 4; season++) {
    const cands = [];
    for (let cz = 2; cz < G - 2; cz++) for (let cx = 2; cx < G - 2; cx++) {
      const s = cellSeason[cz * G + cx];
      const r = Math.hypot(cx - 15.5, cz - 15.5);
      if (s[season] > 0.85 && cellIsland[cz * G + cx] > 0.85 && r > 3.5) cands.push([cx, cz]);
    }
    for (const t of [T.WONDER_A, T.WONDER_B, T.WONDER_A, T.WONDER_B, T.WONDER_A]) {
      for (let k = 0; k < 40 && cands.length; k++) {
        const c = cands[Math.floor(rng.next() * cands.length)];
        if (farFromTaken(c[0], c[1])) { taken.push(c); preset.push({ x: c[0], y: c[1], t }); break; }
      }
    }
  }
  const tiles = runWFC(G, G, seed, cellInfo, preset);
  W.tiles = tiles;
  W.cellSeason = cellSeason;

  // coarse one-hot fields, blurred
  const fields = [];
  for (let t = 0; t < TILE_COUNT; t++) {
    const f = new Float32Array(G * G);
    for (let i = 0; i < G * G; i++) f[i] = tiles[i] === t ? 1 : 0;
    const g = new Float32Array(G * G);
    for (let cz = 0; cz < G; cz++) for (let cx = 0; cx < G; cx++) {
      let s = 0, ws = 0;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const x = clamp(cx + dx, 0, G - 1), z = clamp(cz + dz, 0, G - 1);
        const w = (dx === 0 ? 2 : 1) * (dz === 0 ? 2 : 1);
        s += f[z * G + x] * w; ws += w;
      }
      g[cz * G + cx] = 0.45 * f[cz * G + cx] + 0.55 * s / ws;
    }
    fields.push(g);
  }
  const coarse = (field, x, z) => {
    const gx = clamp((x + HALF) / COARSE_CELL - 0.5, 0, G - 1.001);
    const gz = clamp((z + HALF) / COARSE_CELL - 0.5, 0, G - 1.001);
    const ix = Math.floor(gx), iz = Math.floor(gz);
    let fx = gx - ix, fz = gz - iz;
    fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz);
    const i = iz * G + ix;
    const a = field[i], b = field[i + 1], c = field[i + G], d = field[i + G + 1];
    return lerp(lerp(a, b, fx), lerp(c, d, fx), fz);
  };
  W.coarse = coarse; W.fields = fields;

  // ---------------------------------------------------------------- heightfield
  progress('Raising hills and mountains', 0.12);
  await tick();
  const H = W.height;
  const maskA = new Float32Array(NN), maskB = new Float32Array(NN), maskForest = new Float32Array(NN);
  for (let iz = 0; iz < N; iz++) {
    const z = iz * CELL - HALF;
    for (let ix = 0; ix < N; ix++) {
      const x = ix * CELL - HALF;
      const i = iz * N + ix, o = i * 4;
      const sp = W.season[o], su = W.season[o + 1], au = W.season[o + 2], wi = W.season[o + 3];
      const wx = x + 45 * noise.fbm(x / 420 + 3.1, z / 420 + 1.7, 3);
      const wz = z + 45 * noise.fbm(x / 420 - 8.3, z / 420 + 5.2, 3);
      const mMe = coarse(fields[T.MEADOW], wx, wz);
      const mF = coarse(fields[T.FOREST], wx, wz);
      const mH = coarse(fields[T.HILLS], wx, wz);
      const mM = coarse(fields[T.MOUNTAIN], wx, wz);
      const mL = coarse(fields[T.LAKE], wx, wz);
      const mA = coarse(fields[T.WONDER_A], wx, wz);
      const mB = coarse(fields[T.WONDER_B], wx, wz);
      const mBe = coarse(fields[T.BEACH], wx, wz);
      maskA[i] = mA; maskB[i] = mB; maskForest[i] = mF;

      let h = 7 + 5 * noise.fbm(wx / 320, wz / 320, 4) + 3.2 * noise.fbm(wx / 85, wz / 85, 3) * (0.4 + 0.6 * mMe);
      h += mH * (13 + 22 * (0.5 + 0.5 * noise.fbm(wx / 190, wz / 190, 5)));
      const r = noise.ridged(wx / 430 + 5, wz / 430 - 3, 7);
      h += mM * (32 + 185 * Math.pow(r, 1.35)) * (1 + 0.35 * wi);
      h += mF * 4.5 * noise.fbm(wx / 150, wz / 150, 3);
      h -= mL * 15;
      // wonders
      h += mA * sp * (2.5 + 3 * noise.fbm(wx / 70, wz / 70, 2));
      h += mB * sp * (8 + 12 * (0.5 + 0.5 * noise.fbm(wx / 110, wz / 110, 4)));
      h += mB * su * 5 * noise.fbm(wx / 90, wz / 90, 3);
      h += mA * wi * 3 * Math.abs(noise.fbm(wx / 60, wz / 60, 3));
      if (wi > 0.01) {
        const g = noiseB.ridged(wx / 240, wz / 240, 6);
        h += mB * wi * (40 + 240 * g * g);
      }
      // beach flattening and ocean shelf
      h = lerp(h, 1.4 + 1.6 * noise.fbm(x / 60, z / 60, 2), clamp(mBe * 0.8, 0, 1));
      const isl = islandAt(x, z);
      h = lerp(-26 + 8 * noise.fbm(x / 200, z / 200, 3), h, smoothstep(0, 1, isl));
      H[i] = h;
    }
    if (iz % 64 === 0) { progress('Raising hills and mountains', 0.12 + 0.13 * iz / N); await tick(); }
  }

  // ---------------------------------------------------------------- erosion
  const drops = { low: 140000, medium: 260000, high: 380000, ultra: 520000 }[q] || 380000;
  await erode(H, N, drops, rng, (p) => progress('Carving valleys with a million raindrops', 0.26 + 0.24 * p));
  progress('Settling the slopes', 0.5);
  await tick();
  thermal(H, N, 4, 1.9);

  // ---------------------------------------------------------------- wonders
  progress('Kindling lava meres and heaping leaf mountains', 0.52);
  await tick();
  const sample = (arr, x, z) => {
    const gx = clamp((x + HALF) / CELL, 0, N - 1.001), gz = clamp((z + HALF) / CELL, 0, N - 1.001);
    const ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz;
    const i = iz * N + ix;
    return lerp(lerp(arr[i], arr[i + 1], fx), lerp(arr[i + N], arr[i + N + 1], fx), fz);
  };
  const lavaMask = new Float32Array(NN);
  const leafMask = new Float32Array(NN);
  const glacierMask = new Float32Array(NN);

  const stampLava = (cx, cz, R, depth) => {
    const rim = sample(H, cx, cz) + 1.5;
    const ext = R * 1.6;
    const i0 = Math.floor((cx - ext + HALF) / CELL), i1 = Math.ceil((cx + ext + HALF) / CELL);
    const j0 = Math.floor((cz - ext + HALF) / CELL), j1 = Math.ceil((cz + ext + HALF) / CELL);
    for (let jz = Math.max(1, j0); jz <= Math.min(N - 2, j1); jz++) for (let ix = Math.max(1, i0); ix <= Math.min(N - 2, i1); ix++) {
      const x = ix * CELL - HALF, z = jz * CELL - HALF;
      const wob = 1 + 0.18 * noise.noise2(x / 25, z / 25);
      const d = Math.hypot(x - cx, z - cz) / (R * wob);
      const i = jz * N + ix;
      if (d < 1) {
        const target = rim - depth * Math.pow(1 - d * d, 0.6);
        H[i] = Math.min(H[i], target);
      } else if (d < 1.45) {
        const t = (d - 1) / 0.45;
        const rimH = rim + 2.5 * Math.sin(Math.PI * t) * (1 - t) + 0.8 * noise.noise2(x / 6, z / 6);
        H[i] = lerp(Math.max(H[i], rimH), H[i], smoothstep(0.4, 1, t));
      }
      lavaMask[i] = Math.max(lavaMask[i], smoothstep(1.7, 0.95, d));
    }
    W.lavaPools.push({ x: cx, z: cz, r: R });
  };
  const stampLeafPile = (cx, cz, R, Hh) => {
    const base = sample(H, cx, cz);
    const ext = R * 1.15;
    const i0 = Math.floor((cx - ext + HALF) / CELL), i1 = Math.ceil((cx + ext + HALF) / CELL);
    const j0 = Math.floor((cz - ext + HALF) / CELL), j1 = Math.ceil((cz + ext + HALF) / CELL);
    for (let jz = Math.max(1, j0); jz <= Math.min(N - 2, j1); jz++) for (let ix = Math.max(1, i0); ix <= Math.min(N - 2, i1); ix++) {
      const x = ix * CELL - HALF, z = jz * CELL - HALF;
      const ang = Math.atan2(z - cz, x - cx);
      const wob = 1 + 0.12 * Math.sin(ang * 3 + cx) + 0.08 * Math.sin(ang * 5 + cz);
      const d = Math.hypot(x - cx, z - cz) / (R * wob);
      if (d >= 1) continue;
      const i = jz * N + ix;
      const t = 1 - d * d;
      const lumps = 1 + 0.1 * noise.fbm(x / 18, z / 18, 3) + 0.04 * noise.noise2(x / 5, z / 5);
      const dome = base + Hh * Math.pow(t, 1.25) * lumps;
      if (dome > H[i]) {
        const k = smoothstep(0, 0.12, t);
        H[i] = lerp(H[i], dome, k);
        leafMask[i] = Math.max(leafMask[i], smoothstep(0.0, 0.35, (dome - base) / Hh + 0.02) * k);
      }
    }
    W.leafPiles.push({ x: cx, z: cz, r: R, h: Hh });
  };
  for (let cz = 0; cz < G; cz++) for (let cx = 0; cx < G; cx++) {
    const t = tiles[cz * G + cx];
    const s = cellSeason[cz * G + cx];
    const x = (cx + 0.5) * COARSE_CELL - HALF, z = (cz + 0.5) * COARSE_CELL - HALF;
    if (t === T.WONDER_A && s[2] > 0.5) {
      stampLava(x + rng.range(-10, 10), z + rng.range(-10, 10), rng.range(30, 44), rng.range(8, 12));
      if (rng.chance(0.7)) stampLava(x + rng.range(-30, 30), z + rng.range(-30, 30), rng.range(10, 18), 5);
    }
    if (t === T.WONDER_B && s[2] > 0.5) {
      stampLeafPile(x + rng.range(-12, 12), z + rng.range(-12, 12), rng.range(55, 85), rng.range(38, 70));
    }
  }
  // sprinkle smaller leaf piles through autumn woods
  for (let k = 0; k < 60; k++) {
    const x = rng.range(-800, 800), z = rng.range(-800, 800);
    const i = Math.floor((z + HALF) / CELL) * N + Math.floor((x + HALF) / CELL);
    if (W.season[i * 4 + 2] > 0.75 && H[i] > 3 && H[i] < 60 && islandAt(x, z) > 0.9) stampLeafPile(x, z, rng.range(9, 22), rng.range(4, 11));
  }

  // hub plateau: the Crossing of Seasons
  const H0 = H.slice();
  const flattenHub = (target, outer) => {
    W.hubHeight = target;
    for (let jz = 0; jz < N; jz++) for (let ix = 0; ix < N; ix++) {
      const x = ix * CELL - HALF, z = jz * CELL - HALF;
      const r = Math.hypot(x, z);
      if (r > outer) continue;
      const i = jz * N + ix;
      const k = smoothstep(outer, 42, r);
      H[i] = lerp(H0[i], target + 0.3 * noise.noise2(x / 9, z / 9), k);
    }
  };
  {
    let avg = 0, cnt = 0;
    for (let z = -40; z <= 40; z += 4) for (let x = -40; x <= 40; x += 4) { avg += sample(H, x, z); cnt++; }
    let ringMin = Infinity;
    for (let a = 0; a < 64; a++) { const an = a / 64 * Math.PI * 2; ringMin = Math.min(ringMin, sample(H, Math.cos(an) * 105, Math.sin(an) * 105)); }
    flattenHub(Math.max(avg / cnt + 2.5, ringMin + 4, 6), 95);
  }

  // ---------------------------------------------------------------- settlement sites
  W.sites = {};
  const flattenAt = (cx, cz, target, inner, outer) => {
    const i0 = Math.max(1, Math.floor((cx - outer + HALF) / CELL)), i1 = Math.min(N - 2, Math.ceil((cx + outer + HALF) / CELL));
    const j0 = Math.max(1, Math.floor((cz - outer + HALF) / CELL)), j1 = Math.min(N - 2, Math.ceil((cz + outer + HALF) / CELL));
    for (let jz = j0; jz <= j1; jz++) for (let ix = i0; ix <= i1; ix++) {
      const x = ix * CELL - HALF, z = jz * CELL - HALF;
      const r = Math.hypot(x - cx, z - cz);
      if (r > outer) continue;
      const i = jz * N + ix;
      const k = smoothstep(outer, inner, r);
      H[i] = lerp(H[i], target + 0.25 * noise.noise2(x / 9, z / 9), k);
      lavaMask[i] *= 1 - k; leafMask[i] *= 1 - k;
    }
  };
  for (const st of (opts.sites || [])) {
    if (st.hub) { W.sites[st.id] = { x: 0, z: 0, hub: true }; continue; }
    let best = null, bestC = 1e9;
    for (let k = 0; k < 220; k++) {
      const a = k * 2.39996, rr = 9 * Math.sqrt(k);
      const x = st.x + Math.cos(a) * rr, z = st.z + Math.sin(a) * rr;
      if (islandAt(x, z) < 0.97) continue;
      const h0 = sample(H, x, z);
      if (h0 < 5 || h0 > 120) continue;
      let mn = 1e9, mx = -1e9, bad = 0;
      for (let q = 0; q < 16; q++) {
        const qa = q / 16 * Math.PI * 2;
        for (const qr of [20, 45]) {
          const h = sample(H, x + Math.cos(qa) * qr, z + Math.sin(qa) * qr);
          mn = Math.min(mn, h); mx = Math.max(mx, h);
          bad += sample(lavaMask, x + Math.cos(qa) * qr, z + Math.sin(qa) * qr) + sample(leafMask, x + Math.cos(qa) * qr, z + Math.sin(qa) * qr);
        }
      }
      const cost = (mx - mn) + bad * 60 + rr * 0.08;
      if (cost < bestC) { bestC = cost; best = { x, z }; }
    }
    if (!best) best = { x: st.x * 0.8, z: st.z * 0.8 };
    let avg = 0, cnt = 0, ringMin = Infinity;
    for (let q = 0; q < 24; q++) {
      const qa = q / 24 * Math.PI * 2;
      avg += sample(H, best.x + Math.cos(qa) * 25, best.z + Math.sin(qa) * 25); cnt++;
      ringMin = Math.min(ringMin, sample(H, best.x + Math.cos(qa) * 95, best.z + Math.sin(qa) * 95));
    }
    const target = Math.max(avg / cnt + 1.0, ringMin + 3, 5);
    flattenAt(best.x, best.z, target, 50, 88);
    W.sites[st.id] = { x: best.x, z: best.z };
  }

  // ---------------------------------------------------------------- hydrology
  progress('Letting the rivers find the sea', 0.58);
  await tick();
  let hyd = hydrology(H, N);
  {
    // if a settlement sits in a basin, lift it into an island in the lake
    let redo = false;
    const c = ((N - 1) / 2) * N + (N - 1) / 2;
    if (hyd.filled[c] > H[c] + 0.1) { flattenHub(hyd.filled[c] + 2.2, 75); redo = true; }
    for (const id in W.sites) {
      const st = W.sites[id]; if (st.hub) continue;
      const i = Math.round((st.z + HALF) / CELL) * N + Math.round((st.x + HALF) / CELL);
      if (hyd.filled[i] > H[i] + 0.1) { flattenAt(st.x, st.z, hyd.filled[i] + 2.2, 50, 80); redo = true; }
    }
    if (redo) { await tick(); hyd = hydrology(H, N); }
  }
  await tick();
  const { filled, parent, order, acc } = hyd;
  const Hc = H.slice();
  const bestD = new Float32Array(NN).fill(1e9);
  const riverCells = [];
  const RIVER_T = 1400;
  for (let i = 0; i < NN; i++) {
    if (acc[i] > RIVER_T && filled[i] > 0.4 && filled[i] - H[i] < 0.4) riverCells.push(i);
  }
  riverCells.sort((a, b) => acc[a] - acc[b]);
  for (const c of riverCells) {
    const cx = c % N, cz = (c / N) | 0;
    const a = acc[c];
    const R = (2.5 + 0.085 * Math.sqrt(a)) * 0.5;
    const depth = 0.8 + 0.011 * Math.sqrt(a);
    const bank = 3 + 0.6 * R;
    const Wc = filled[c] - 0.3;
    const p = parent[c];
    let fx = 0, fz = 0;
    if (p >= 0) {
      const px = p % N, pz = (p / N) | 0;
      const dl = Math.hypot(px - cx, pz - cz);
      const drop = Math.max(0, filled[c] - filled[p]);
      const speed = clamp(0.7 + 6 * drop / (dl * CELL), 0.5, 7);
      fx = (px - cx) / dl * speed; fz = (pz - cz) / dl * speed;
    }
    const rc = Math.ceil((R + bank) / CELL);
    for (let dz = -rc; dz <= rc; dz++) for (let dx = -rc; dx <= rc; dx++) {
      const x = cx + dx, z = cz + dz;
      if (x < 1 || z < 1 || x >= N - 1 || z >= N - 1) continue;
      const d = Math.hypot(dx, dz) * CELL;
      if (d > R + bank) continue;
      const j = z * N + x;
      if (d <= R) {
        const bed = Wc - depth * Math.sqrt(Math.max(0, 1 - (d / R) * (d / R))) - 0.05;
        if (bed < Hc[j]) Hc[j] = bed;
        if (d < bestD[j]) {
          bestD[j] = d; W.waterH[j] = Wc; W.waterKind[j] = WATER_RIVER;
          W.flow[j * 2] = fx; W.flow[j * 2 + 1] = fz;
        }
      } else {
        const t = (d - R) / bank;
        const bankH = lerp(Wc + 0.25, Hc[j], smoothstep(0, 1, t));
        if (bankH < Hc[j]) Hc[j] = bankH;
      }
    }
  }
  // Lakes & ocean
  for (let i = 0; i < NN; i++) {
    if (H[i] < 0 && filled[i] <= 0.05) { W.waterKind[i] = WATER_OCEAN; W.waterH[i] = 0; continue; }
    if (filled[i] - H[i] > 0.25 && filled[i] > 0.2) {
      W.waterKind[i] = WATER_LAKE; W.waterH[i] = filled[i];
      W.flow[i * 2] = 0; W.flow[i * 2 + 1] = 0;
    }
  }
  H.set(Hc);
  // make sure river beds are under water where kind is set
  for (let i = 0; i < NN; i++) if (W.waterKind[i] === WATER_RIVER && H[i] > W.waterH[i] - 0.05) H[i] = W.waterH[i] - 0.05;
  // smooth flow field a bit
  blurFlow(W.flow, W.waterKind, N, 2);

  // water type (liquid, lava, ice)
  for (let i = 0; i < NN; i++) {
    if (!W.waterKind[i]) continue;
    if (lavaMask[i] > 0.35 && W.waterKind[i] !== WATER_OCEAN) W.waterType[i] = WTYPE_LAVA;
    else if (W.season[i * 4 + 3] > 0.62 && W.waterKind[i] !== WATER_OCEAN) W.waterType[i] = WTYPE_ICE;
    else W.waterType[i] = WTYPE_WATER;
  }
  // lava pools that did not fill (spilled): force a lava surface at bowl bottom
  for (const p of W.lavaPools) {
    const ix = Math.round((p.x + HALF) / CELL), iz = Math.round((p.z + HALF) / CELL);
    const i = iz * N + ix;
    if (W.waterKind[i] === WATER_NONE) {
      const lvl = H[i] + 2.5;
      const rc = Math.ceil(p.r / CELL);
      for (let dz = -rc; dz <= rc; dz++) for (let dx = -rc; dx <= rc; dx++) {
        const j = (iz + dz) * N + ix + dx;
        if (Math.hypot(dx, dz) * CELL < p.r && H[j] < lvl) { W.waterKind[j] = WATER_LAKE; W.waterH[j] = lvl; W.waterType[j] = WTYPE_LAVA; }
      }
    }
  }

  // ---------------------------------------------------------------- masks
  progress('Painting the land with fey colour', 0.66);
  await tick();
  // wetness: distance to water within ~8 cells
  const wet = new Float32Array(NN);
  {
    const dist = new Float32Array(NN).fill(99);
    for (let i = 0; i < NN; i++) if (W.waterKind[i] && W.waterType[i] === WTYPE_WATER && W.waterKind[i] !== WATER_OCEAN) dist[i] = 0;
    for (let pass = 0; pass < 2; pass++) {
      for (let z = 1; z < N - 1; z++) for (let x = 1; x < N - 1; x++) {
        const i = z * N + x;
        dist[i] = Math.min(dist[i], dist[i - 1] + 1, dist[i - N] + 1, dist[i - N - 1] + 1.414, dist[i - N + 1] + 1.414);
      }
      for (let z = N - 2; z > 0; z--) for (let x = N - 2; x > 0; x--) {
        const i = z * N + x;
        dist[i] = Math.min(dist[i], dist[i + 1] + 1, dist[i + N] + 1, dist[i + N + 1] + 1.414, dist[i + N - 1] + 1.414);
      }
    }
    for (let i = 0; i < NN; i++) wet[i] = smoothstep(7, 0, dist[i]);
  }
  W.wetness = wet;
  for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) {
    const i = iz * N + ix, o = i * 4;
    const x = ix * CELL - HALF, z = iz * CELL - HALF;
    const sp = W.season[o], su = W.season[o + 1], au = W.season[o + 2], wi = W.season[o + 3];
    const mA = maskA[i], mB = maskB[i];
    const nA = clamp(smoothstep(0.25, 0.7, mA + 0.15 * noise.noise2(x / 40, z / 40)), 0, 1);
    const nB = clamp(smoothstep(0.25, 0.7, mB + 0.15 * noise.noise2(x / 40 + 9, z / 40)), 0, 1);
    W.feat[o] = 255 * nA * smoothstep(0.35, 0.8, sp);
    W.feat[o + 1] = 255 * nA * smoothstep(0.35, 0.8, su);
    W.feat[o + 2] = 255 * lavaMask[i];
    W.feat[o + 3] = 255 * leafMask[i];
    W.feat2[o] = 255 * nA * smoothstep(0.35, 0.8, wi);
    W.feat2[o + 1] = 255 * nB * smoothstep(0.35, 0.8, su);
    W.feat2[o + 2] = 255 * nB * smoothstep(0.35, 0.8, sp);
    glacierMask[i] = nB * smoothstep(0.35, 0.8, wi);
    W.feat2[o + 3] = 255 * glacierMask[i];

    // slope
    const hx = (H[iz * N + Math.min(N - 1, ix + 1)] - H[iz * N + Math.max(0, ix - 1)]) / (2 * CELL);
    const hz = (H[Math.min(N - 1, iz + 1) * N + ix] - H[Math.max(0, iz - 1) * N + ix]) / (2 * CELL);
    const ny = 1 / Math.sqrt(1 + hx * hx + hz * hz);
    const h = H[i];
    let grass = smoothstep(0.72, 0.86, ny);
    grass *= smoothstep(0.8, 2.6, h); // no grass on beaches
    if (W.waterKind[i] && W.waterH[i] > h - 0.1) grass = 0;
    grass *= 1 - smoothstep(0.1, 0.5, leafMask[i]);
    grass *= 1 - smoothstep(0.2, 0.75, lavaMask[i]);
    grass *= 1 - glacierMask[i] * smoothstep(40, 90, h);
    const snowLine = 150 + 60 * noise.noise2(x / 150, z / 150) - wi * 60;
    grass *= 1 - smoothstep(snowLine, snowLine + 40, h);
    grass *= 0.75 + 0.25 * (0.5 + 0.5 * noise.noise2(x / 23, z / 23));
    const forest = clamp(maskForest[i] + 0.8 * (W.feat[o + 1] / 255) + 0.7 * (W.feat2[o + 1] / 255) + 0.7 * (W.feat2[o + 2] / 255), 0, 1);
    W.misc[o] = 255 * forest;
    W.misc[o + 1] = 255 * wet[i];
    W.misc[o + 2] = 255 * clamp(grass, 0, 1);
    W.misc[o + 3] = 0; // road mask (painted later by the gameplay layer)
  }
  W.lavaMask = lavaMask; W.leafMask = leafMask; W.glacierMask = glacierMask;

  // ---------------------------------------------------------------- scatter
  progress('Planting the fey forests', 0.72);
  await tick();
  scatterTrees(W, noise, rng);
  progress('Scattering stones, crystals and toadstools', 0.78);
  await tick();
  scatterProps(W, noise, rng);
  return W;
}

// -------------------------------------------------------------------- erosion
async function erode(H, N, numDroplets, rng, progress) {
  const HS = 40; // height scale into erosion units
  const map = new Float32Array(H.length);
  for (let i = 0; i < H.length; i++) map[i] = H[i] / HS;
  const inertia = 0.05, capFactor = 4, minCap = 0.01, depositSpeed = 0.3, erodeSpeed = 0.3;
  const evap = 0.015, gravity = 4, maxLife = 45, radius = 3;
  // brush
  const bOff = [], bW = [];
  let wsum = 0;
  for (let y = -radius; y <= radius; y++) for (let x = -radius; x <= radius; x++) {
    const d = Math.hypot(x, y);
    if (d <= radius) { const w = 1 - d / radius; bOff.push([x, y]); bW.push(w); wsum += w; }
  }
  for (let k = 0; k < bW.length; k++) bW[k] /= wsum;
  const nb = bOff.length;
  const bdx = new Int32Array(nb), bdy = new Int32Array(nb), bw = new Float32Array(bW);
  for (let k = 0; k < nb; k++) { bdx[k] = bOff[k][0]; bdy[k] = bOff[k][1]; }

  const batch = 20000;
  for (let d0 = 0; d0 < numDroplets; d0 += batch) {
    const dEnd = Math.min(numDroplets, d0 + batch);
    for (let d = d0; d < dEnd; d++) {
      let posX = 0, posY = 0;
      for (let tries = 0; tries < 6; tries++) {
        posX = rng.next() * (N - 2) + 0.5; posY = rng.next() * (N - 2) + 0.5;
        if (map[Math.floor(posY) * N + Math.floor(posX)] > 0.05) break;
      }
      let dirX = 0, dirY = 0, speed = 1, water = 1, sediment = 0;
      for (let life = 0; life < maxLife; life++) {
        const nodeX = posX | 0, nodeY = posY | 0;
        const idx = nodeY * N + nodeX;
        const cx = posX - nodeX, cy = posY - nodeY;
        const hNW = map[idx], hNE = map[idx + 1], hSW = map[idx + N], hSE = map[idx + N + 1];
        const gx = (hNE - hNW) * (1 - cy) + (hSE - hSW) * cy;
        const gy = (hSW - hNW) * (1 - cx) + (hSE - hNE) * cx;
        const height = hNW * (1 - cx) * (1 - cy) + hNE * cx * (1 - cy) + hSW * (1 - cx) * cy + hSE * cx * cy;
        dirX = dirX * inertia - gx * (1 - inertia);
        dirY = dirY * inertia - gy * (1 - inertia);
        const len = Math.sqrt(dirX * dirX + dirY * dirY);
        if (len < 1e-8) { const a = rng.next() * 6.283; dirX = Math.cos(a); dirY = Math.sin(a); }
        else { dirX /= len; dirY /= len; }
        posX += dirX; posY += dirY;
        if (posX < 1 || posY < 1 || posX >= N - 2 || posY >= N - 2) break;
        const nX = posX | 0, nY = posY | 0, ncx = posX - nX, ncy = posY - nY;
        const ni = nY * N + nX;
        const newH = map[ni] * (1 - ncx) * (1 - ncy) + map[ni + 1] * ncx * (1 - ncy) + map[ni + N] * (1 - ncx) * ncy + map[ni + N + 1] * ncx * ncy;
        const dH = newH - height;
        const cap = Math.max(-dH * speed * water * capFactor, minCap);
        if (sediment > cap || dH > 0) {
          const amt = dH > 0 ? Math.min(dH, sediment) : (sediment - cap) * depositSpeed;
          sediment -= amt;
          map[idx] += amt * (1 - cx) * (1 - cy);
          map[idx + 1] += amt * cx * (1 - cy);
          map[idx + N] += amt * (1 - cx) * cy;
          map[idx + N + 1] += amt * cx * cy;
        } else {
          const amt = Math.min((cap - sediment) * erodeSpeed, -dH);
          for (let k = 0; k < nb; k++) {
            const bx = nodeX + bdx[k], by = nodeY + bdy[k];
            if (bx < 0 || by < 0 || bx >= N || by >= N) continue;
            const j = by * N + bx;
            const e = amt * bw[k];
            map[j] -= e; sediment += e;
          }
        }
        speed = Math.sqrt(Math.max(0, speed * speed - dH * gravity));
        water *= 1 - evap;
      }
    }
    progress(dEnd / numDroplets);
    await tick();
  }
  for (let i = 0; i < H.length; i++) H[i] = map[i] * HS;
}

function thermal(H, N, iters, talus) {
  const d = new Float32Array(H.length);
  for (let it = 0; it < iters; it++) {
    d.fill(0);
    for (let z = 1; z < N - 1; z++) for (let x = 1; x < N - 1; x++) {
      const i = z * N + x;
      const h = H[i];
      const nbs = [i - 1, i + 1, i - N, i + N];
      for (const j of nbs) {
        const diff = h - H[j];
        if (diff > talus) { const m = (diff - talus) * 0.12; d[i] -= m; d[j] += m; }
      }
    }
    for (let i = 0; i < H.length; i++) H[i] += d[i];
  }
}

// ------------------------------------------------------------------ hydrology
class MinHeap {
  constructor(cap, keys) { this.a = new Int32Array(cap); this.n = 0; this.k = keys; }
  push(i) {
    const a = this.a, k = this.k; let c = this.n++; a[c] = i;
    while (c > 0) { const p = (c - 1) >> 1; if (k[a[p]] <= k[a[c]]) break; const t = a[p]; a[p] = a[c]; a[c] = t; c = p; }
  }
  pop() {
    const a = this.a, k = this.k; const top = a[0]; const last = a[--this.n];
    if (this.n > 0) {
      a[0] = last; let c = 0; const n = this.n;
      while (true) {
        const l = c * 2 + 1, r = l + 1; let m = c;
        if (l < n && k[a[l]] < k[a[m]]) m = l;
        if (r < n && k[a[r]] < k[a[m]]) m = r;
        if (m === c) break;
        const t = a[m]; a[m] = a[c]; a[c] = t; c = m;
      }
    }
    return top;
  }
}

function hydrology(H, N) {
  const NN = N * N;
  const filled = H.slice();
  const closed = new Uint8Array(NN);
  const parent = new Int32Array(NN).fill(-1);
  const order = new Int32Array(NN);
  let on = 0;
  const heap = new MinHeap(NN, filled);
  for (let i = 0; i < N; i++) {
    for (const j of [i, (N - 1) * N + i, i * N, i * N + N - 1]) if (!closed[j]) { closed[j] = 1; heap.push(j); }
  }
  const dx = [-1, 1, 0, 0, -1, 1, -1, 1], dz = [0, 0, -1, 1, -1, -1, 1, 1];
  while (heap.n > 0) {
    const c = heap.pop();
    order[on++] = c;
    const cx = c % N, cz = (c / N) | 0;
    for (let k = 0; k < 8; k++) {
      const x = cx + dx[k], z = cz + dz[k];
      if (x < 0 || z < 0 || x >= N || z >= N) continue;
      const j = z * N + x;
      if (closed[j]) continue;
      closed[j] = 1;
      if (filled[j] < filled[c]) filled[j] = filled[c];
      parent[j] = c;
      heap.push(j);
    }
  }
  const acc = new Float32Array(NN).fill(1);
  for (let k = on - 1; k >= 0; k--) {
    const i = order[k];
    const p = parent[i];
    if (p >= 0) acc[p] += acc[i];
  }
  return { filled, parent, order, acc };
}

function blurFlow(flow, kind, N, passes) {
  const tmp = new Float32Array(flow.length);
  for (let p = 0; p < passes; p++) {
    tmp.set(flow);
    for (let z = 1; z < N - 1; z++) for (let x = 1; x < N - 1; x++) {
      const i = z * N + x;
      if (kind[i] !== WATER_RIVER) continue;
      let sx = 0, sz = 0, c = 0;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const j = i + dz * N + dx;
        if (kind[j] === WATER_RIVER) { sx += tmp[j * 2]; sz += tmp[j * 2 + 1]; c++; }
      }
      flow[i * 2] = sx / c; flow[i * 2 + 1] = sz / c;
    }
  }
}

// --------------------------------------------------------------- vegetation
const PALETTES = {
  oak: [[0x8aa84e, 0x7d9c46, 0x96b058], [0x4f6e2c, 0x5a7a32, 0x46652a, 0x62823a], [0xb8541e, 0x9c3a1c, 0xc98a2e, 0x8a4a22, 0xd0a040], [0xd6dee4, 0xc8d2da]],
  birch: [[0xa6c068, 0x98b85c], [0x6e9444, 0x7aa04c], [0xd8b040, 0xc89a30, 0xe0c060], [0xd8e2ea, 0xc6d4e0, 0xe6ecf0]],
  blossom: [[0xe8a7b8, 0xf2c6d2, 0xf6ece8, 0xd88ea6], [0xe8a0b8, 0xf0c8d4], [0xd88a6a, 0xe0a488], [0xeceaf2, 0xd8dcea]],
  maple: [[0x94b058, 0x86a650], [0x5a7e34, 0x668a3a], [0xb0281c, 0xc8481a, 0xd8781e, 0x8c1c20, 0xd8a030, 0xa83848], [0xdce4ea]],
  pine: [[0x3e5e3a, 0x46663e], [0x344f33, 0x3a5636], [0x3a5232, 0x4a5a2e], [0x2e4a40, 0x33504a, 0x385250]],
  willow: [[0x98b468, 0xa8c078], [0x6a8c48, 0x789a54], [0xc8a848, 0xb8903a], [0xd0dce6]],
  flower: [[0xb3203a, 0xe0b43a, 0x3a4fb5, 0xe0674a, 0x2f8f9a, 0x7a3fa8, 0xd84a6a]],
  mushroom: [[0xb82a30, 0x6e3aa8, 0x2a9a94, 0xd0602a, 0xc04a90]],
  crystal: [[0x7ad0e8, 0x9a8ae0, 0x5aa0e0, 0xb8e0f0]],
  dead: [[0x302420]],
};
const hexToRGB = (h) => [Math.pow(((h >> 16) & 255) / 255, 2.2), Math.pow(((h >> 8) & 255) / 255, 2.2), Math.pow((h & 255) / 255, 2.2)];

function heightAtW(W, x, z) {
  const gx = clamp((x + HALF) / CELL, 0, N - 1.001), gz = clamp((z + HALF) / CELL, 0, N - 1.001);
  const ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz;
  const i = iz * N + ix, H = W.height;
  return lerp(lerp(H[i], H[i + 1], fx), lerp(H[i + N], H[i + N + 1], fx), fz);
}

function scatterTrees(W, noise, rng) {
  const spacing = 4.6;
  const n = Math.floor(2 * HALF / spacing);
  const pick = (weights) => rng.weighted(weights);
  for (let gz = 0; gz < n; gz++) for (let gx = 0; gx < n; gx++) {
    const x = -HALF + (gx + 0.15 + 0.7 * rng.next()) * spacing;
    const z = -HALF + (gz + 0.15 + 0.7 * rng.next()) * spacing;
    const ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL);
    if (ix < 2 || iz < 2 || ix > N - 3 || iz > N - 3) continue;
    const i = iz * N + ix, o = i * 4;
    const h = W.height[i];
    if (h < 2.2) continue;
    if (W.waterKind[i] && W.waterH[i] > h - 0.3) continue;
    const hub = W.misc[o + 3] / 255;
    if (Math.hypot(x, z) < 70) continue;
    const hx = (W.height[i + 1] - W.height[i - 1]) / (2 * CELL), hz = (W.height[i + N] - W.height[i - N]) / (2 * CELL);
    const ny = 1 / Math.sqrt(1 + hx * hx + hz * hz);
    if (ny < 0.8) continue;
    const s = [W.season[o], W.season[o + 1], W.season[o + 2], W.season[o + 3]];
    const forest = W.misc[o] / 255;
    const wet = W.misc[o + 1] / 255;
    const pollen = W.feat[o] / 255, bloom = W.feat[o + 1] / 255, lava = W.feat[o + 2] / 255, leaf = W.feat[o + 3] / 255;
    const crystal = W.feat2[o] / 255, mush = W.feat2[o + 1] / 255, grove = W.feat2[o + 2] / 255, glacier = W.feat2[o + 3] / 255;
    if (leaf > 0.25) continue;
    const clump = 0.5 + 0.5 * noise.fbm(x / 60, z / 60, 3);
    let p = 0.01 + 0.42 * forest * (0.35 + 0.95 * clump) + 0.03 * wet;
    p *= 1 - 0.85 * smoothstep(120, 190, h);
    p *= 1 - 0.7 * pollen;
    if (lava > 0.05) p = lava < 0.75 ? 0.12 : 0;
    p *= 1 - 0.6 * glacier;
    if (rng.next() > p) continue;

    let kind;
    const r = rng.next();
    if (lava > 0.05) kind = 'dead';
    else if (bloom > 0.4 && r < 0.72) kind = 'flower';
    else if (mush > 0.4 && r < 0.6) kind = 'mushroom';
    else if (crystal > 0.4 && r < 0.55) kind = 'crystal';
    else if (grove > 0.4 && r < 0.9) kind = 'blossom';
    else if (pollen > 0.3 && r < 0.8) kind = 'blossom';
    else if (wet > 0.45 && s[3] < 0.5 && r < 0.55) kind = 'willow';
    else if (h > 130) kind = 'pine';
    else {
      const tbl = {
        oak: [0.2, 0.62, 0.18, 0.0], birch: [0.35, 0.18, 0.14, 0.2], blossom: [0.45, 0.02, 0, 0],
        maple: [0, 0.03, 0.68, 0], pine: [0, 0.15, 0.0, 0.8],
      };
      const kinds = Object.keys(tbl);
      const ws = kinds.map((k) => tbl[k][0] * s[0] + tbl[k][1] * s[1] + tbl[k][2] * s[2] + tbl[k][3] * s[3]);
      kind = kinds[pick(ws)];
    }
    const season = pick(s.map((v) => v * v));
    const pal = PALETTES[kind];
    const palS = pal[Math.min(season, pal.length - 1)];
    let hex = palS[Math.floor(rng.next() * palS.length)];
    if (kind === 'blossom' && pollen > 0.3) hex = [0xc0a8e0, 0xb096d8, 0xd6c4ea][Math.floor(rng.next() * 3)];
    const col = hexToRGB(hex);
    const v = 0.85 + 0.3 * rng.next();
    let scale = 0.75 + 0.6 * rng.next() * rng.next() + 0.25 * clump;
    if (kind === 'flower') scale = 0.7 + 0.8 * rng.next();
    if (kind === 'mushroom') scale = 0.6 + 1.0 * rng.next();
    W.trees.push({
      kind, variant: rng.next() < 0.5 ? 0 : 1, x, z, y: heightAtW(W, x, z) - 0.15,
      rot: rng.next() * Math.PI * 2, scale, color: [col[0] * v, col[1] * v, col[2] * v],
      tilt: (rng.next() - 0.5) * 0.08,
    });
  }
}

function scatterProps(W, noise, rng) {
  const add = (kind, x, z, scale, extra = {}) => {
    const y = heightAtW(W, x, z);
    W.props.push({ kind, x, y, z, scale, rot: rng.next() * Math.PI * 2, tilt: [(rng.next() - 0.5) * 0.3, (rng.next() - 0.5) * 0.3], variant: Math.floor(rng.next() * 4), ...extra });
  };
  const infoAt = (x, z) => {
    const ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL);
    if (ix < 2 || iz < 2 || ix > N - 3 || iz > N - 3) return null;
    const i = iz * N + ix, o = i * 4;
    const hx = (W.height[i + 1] - W.height[i - 1]) / (2 * CELL), hz = (W.height[i + N] - W.height[i - N]) / (2 * CELL);
    return {
      i, o, h: W.height[i], ny: 1 / Math.sqrt(1 + hx * hx + hz * hz),
      water: W.waterKind[i] && W.waterH[i] > W.height[i] - 0.2,
      s: [W.season[o], W.season[o + 1], W.season[o + 2], W.season[o + 3]],
    };
  };
  // rocks & boulders
  for (let k = 0; k < 9000; k++) {
    const x = rng.range(-HALF + 20, HALF - 20), z = rng.range(-HALF + 20, HALF - 20);
    const inf = infoAt(x, z);
    if (!inf || inf.h < 0.5 || Math.hypot(x, z) < 60) continue;
    const steep = 1 - inf.ny;
    const p = 0.12 + 1.8 * steep + (W.misc[inf.o + 1] / 255) * 0.5 + (W.feat[inf.o + 2] / 255) * 0.8;
    if (rng.next() > p) continue;
    if (W.feat[inf.o + 3] > 60) continue;
    const big = rng.next() < 0.08;
    const lava = W.feat[inf.o + 2] > 60;
    add(lava ? 'basalt' : 'rock', x, z, big ? rng.range(3, 7) : rng.range(0.4, 2.2) * (0.6 + rng.next()));
  }
  // crystals
  for (let k = 0; k < 7000; k++) {
    const x = rng.range(-HALF + 20, HALF - 20), z = rng.range(-HALF + 20, HALF - 20);
    const inf = infoAt(x, z);
    if (!inf || inf.water || inf.h < 1 || Math.hypot(x, z) < 70) continue;
    const cf = W.feat2[inf.o] / 255, pol = W.feat[inf.o] / 255, gl = W.feat2[inf.o + 3] / 255;
    const p = 0.004 + 0.5 * cf + 0.08 * pol + 0.12 * gl + 0.02 * (inf.h > 120 ? 1 : 0);
    if (rng.next() > p) continue;
    const s = inf.s;
    let col;
    if (cf > 0.3 || s[3] > 0.6) col = rng.pick([0x5ad8ff, 0x7ab0ff, 0xa0e8ff, 0x8a7aff]);
    else if (s[0] > 0.5) col = rng.pick([0xc070ff, 0xe070ff, 0xa060ff]);
    else if (s[1] > 0.5) col = rng.pick([0x40ffb0, 0xffd040, 0x60e0ff]);
    else col = rng.pick([0xff7030, 0xffb030, 0xff4060]);
    add('crystal', x, z, (cf > 0.3 ? rng.range(0.8, 3.2) : rng.range(0.5, 1.6)), { color: hexToRGB(col) });
  }
  // small glowing toadstools
  for (let k = 0; k < 16000; k++) {
    const x = rng.range(-HALF + 20, HALF - 20), z = rng.range(-HALF + 20, HALF - 20);
    const inf = infoAt(x, z);
    if (!inf || inf.water || inf.h < 2 || inf.ny < 0.85) continue;
    const forest = W.misc[inf.o] / 255, mush = W.feat2[inf.o + 1] / 255;
    const p = 0.08 * forest * (1 - inf.s[3]) + 0.6 * mush;
    if (rng.next() > p) continue;
    add('toadstool', x, z, rng.range(0.5, 1.4), { color: hexToRGB(rng.pick([0x3ab8c8, 0xc84aa0, 0x8ac050, 0xe09040, 0x8a60d0])) });
  }
  // ice fangs in glaciers
  for (let k = 0; k < 4000; k++) {
    const x = rng.range(-HALF + 20, HALF - 20), z = rng.range(-HALF + 20, HALF - 20);
    const inf = infoAt(x, z);
    if (!inf || inf.water) continue;
    const gl = W.feat2[inf.o + 3] / 255;
    if (rng.next() > gl * 0.6 + (inf.s[3] > 0.8 ? 0.01 : 0)) continue;
    add('icefang', x, z, rng.range(2, 9));
  }
  // hub standing stones
  const hubH = W.hubHeight;
  for (let k = 0; k < 13; k++) {
    const a = k / 13 * Math.PI * 2;
    const R = 26;
    W.props.push({ kind: 'stone', x: Math.cos(a) * R, z: Math.sin(a) * R, y: hubH - 0.4, scale: 1 + 0.25 * rng.next(), rot: -a, tilt: [0, 0], variant: k % 3 });
  }
  // season pylons: tall crystals marking each season direction
  const pyl = [0xd080ff, 0x60ffb0, 0xff8030, 0x70d0ff];
  for (let k = 0; k < 4; k++) {
    const a = SEASON_ANGLES[k];
    W.props.push({ kind: 'pylon', x: Math.cos(a) * 21, z: Math.sin(a) * 21, y: hubH - 0.2, scale: 1, rot: a, tilt: [0, 0], variant: 0, color: hexToRGB(pyl[k]) });
  }
  // floating islands
  const tries = [[-0.7, -0.5], [-0.45, -0.75], [0.5, -0.6], [0.7, -0.35], [0.55, 0.55], [0.35, 0.72], [-0.6, 0.5], [-0.35, 0.3], [0.15, -0.35], [-0.2, -0.25]];
  for (const [u, v] of tries) {
    const x = u * 700 + rng.range(-60, 60), z = v * 700 + rng.range(-60, 60);
    const g = heightAtW(W, x, z);
    const isl = { x, z, y: Math.max(g, 0) + rng.range(70, 150), r: rng.range(14, 30), seed: Math.floor(rng.next() * 1e6), phase: rng.next() * 6.28 };
    W.islands.push(isl);
    const inf = infoAt(x, z);
    const s = inf ? inf.s : [0.25, 0.25, 0.25, 0.25];
    let si = 0; for (let k = 1; k < 4; k++) if (s[k] > s[si]) si = k;
    const kinds = [['blossom', 'birch'], ['oak', 'flower'], ['maple', 'mushroom'], ['pine', 'crystal']][si];
    const nT = 1 + Math.floor(rng.next() * 3);
    for (let k = 0; k < nT; k++) {
      const a = rng.next() * Math.PI * 2, d = rng.next() * isl.r * 0.5;
      const kind = kinds[Math.floor(rng.next() * kinds.length)];
      const pal = PALETTES[kind]; const palS = pal[Math.min(si, pal.length - 1)];
      const col = hexToRGB(palS[Math.floor(rng.next() * palS.length)]);
      W.trees.push({ kind, variant: rng.next() < 0.5 ? 0 : 1, x: x + Math.cos(a) * d, z: z + Math.sin(a) * d, y: isl.y + 0.4, rot: rng.next() * 6.28, scale: rng.range(0.7, 1.1), color: col, tilt: 0 });
    }
  }
}
