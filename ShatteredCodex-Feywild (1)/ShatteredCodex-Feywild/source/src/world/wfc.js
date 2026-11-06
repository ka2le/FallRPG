// Wave Function Collapse (simple tiled model) used to lay out the macro-structure
// of the world: which 64m cells are meadow, forest, hills, mountains, lakes and
// the season-specific "wonders" (pollen drifts, bloomwoods, lava meres, ...).
import { RNG } from '../core/rng.js';

export const T = {
  OCEAN: 0, BEACH: 1, MEADOW: 2, FOREST: 3, HILLS: 4, MOUNTAIN: 5, LAKE: 6, WONDER_A: 7, WONDER_B: 8,
};
export const TILE_COUNT = 9;
export const TILE_NAMES = ['ocean', 'beach', 'meadow', 'forest', 'hills', 'mountain', 'lake', 'wonderA', 'wonderB'];

// symmetric adjacency
const ADJ = {
  [T.OCEAN]: [T.OCEAN, T.BEACH],
  [T.BEACH]: [T.OCEAN, T.BEACH, T.MEADOW, T.FOREST, T.HILLS, T.WONDER_A],
  [T.MEADOW]: [T.BEACH, T.MEADOW, T.FOREST, T.HILLS, T.LAKE, T.WONDER_A, T.WONDER_B],
  [T.FOREST]: [T.BEACH, T.MEADOW, T.FOREST, T.HILLS, T.LAKE, T.WONDER_A, T.WONDER_B],
  [T.HILLS]: [T.BEACH, T.MEADOW, T.FOREST, T.HILLS, T.MOUNTAIN, T.WONDER_A, T.WONDER_B],
  [T.MOUNTAIN]: [T.HILLS, T.MOUNTAIN, T.WONDER_B],
  [T.LAKE]: [T.MEADOW, T.FOREST, T.LAKE, T.WONDER_A],
  [T.WONDER_A]: [T.BEACH, T.MEADOW, T.FOREST, T.HILLS, T.LAKE, T.WONDER_A],
  [T.WONDER_B]: [T.MEADOW, T.FOREST, T.HILLS, T.MOUNTAIN, T.WONDER_B],
};
const COMPAT = new Uint16Array(TILE_COUNT);
for (let t = 0; t < TILE_COUNT; t++) { let m = 0; for (const o of ADJ[t]) m |= 1 << o; COMPAT[t] = m; }
const ALL = (1 << TILE_COUNT) - 1;

function popcount(m) { let c = 0; while (m) { m &= m - 1; c++; } return c; }

/**
 * @param {number} W grid width
 * @param {number} H grid height
 * @param {(x:number,y:number)=>{allowed:number, weights:number[]}} cellInfo
 */
export function runWFC(W, H, seed, cellInfo, preset = []) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const res = tryWFC(W, H, seed + attempt * 7919, cellInfo, preset);
    if (res) return res;
  }
  // Fallback: greedy per-cell choice (no constraints) — should basically never happen
  const rng = new RNG(seed);
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const info = cellInfo(x, y);
    const w = info.weights.map((v, i) => (info.allowed & (1 << i)) ? v : 0);
    out[y * W + x] = rng.weighted(w);
  }
  return out;
}

function tryWFC(W, H, seed, cellInfo, preset) {
  const rng = new RNG(seed);
  const N = W * H;
  const wave = new Uint16Array(N);
  const weights = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const info = cellInfo(x, y);
    wave[y * W + x] = info.allowed & ALL;
    weights.push(info.weights);
  }
  const stack = [];
  const propagate = () => {
    while (stack.length) {
      const i = stack.pop();
      const x = i % W, y = (i / W) | 0;
      // mask of all tiles compatible with any possibility of i
      let sup = 0; const m = wave[i];
      for (let t = 0; t < TILE_COUNT; t++) if (m & (1 << t)) sup |= COMPAT[t];
      const nb = [];
      if (x > 0) nb.push(i - 1); if (x < W - 1) nb.push(i + 1);
      if (y > 0) nb.push(i - W); if (y < H - 1) nb.push(i + W);
      for (const j of nb) {
        const nm = wave[j] & sup;
        if (nm !== wave[j]) {
          if (nm === 0) return false;
          wave[j] = nm; stack.push(j);
        }
      }
    }
    return true;
  };
  // initial propagation for all constrained cells
  for (let i = 0; i < N; i++) stack.push(i);
  if (!propagate()) return null;
  for (const p of preset) {
    const i = p.y * W + p.x;
    if (!(wave[i] & (1 << p.t))) continue;
    wave[i] = 1 << p.t; stack.push(i);
    if (!propagate()) return null;
  }

  while (true) {
    // find the lowest-entropy undecided cell
    let best = -1, bestE = Infinity;
    for (let i = 0; i < N; i++) {
      const m = wave[i];
      if (popcount(m) <= 1) continue;
      let sw = 0, swl = 0;
      const w = weights[i];
      for (let t = 0; t < TILE_COUNT; t++) if (m & (1 << t)) { const v = w[t] + 1e-4; sw += v; swl += v * Math.log(v); }
      const e = Math.log(sw) - swl / sw + rng.next() * 1e-3;
      if (e < bestE) { bestE = e; best = i; }
    }
    if (best < 0) break;
    const m = wave[best], w = weights[best];
    const ws = [];
    for (let t = 0; t < TILE_COUNT; t++) ws.push((m & (1 << t)) ? w[t] + 1e-4 : 0);
    const pick = rng.weighted(ws);
    wave[best] = 1 << pick;
    stack.push(best);
    if (!propagate()) return null;
  }
  const out = new Uint8Array(N);
  for (let i = 0; i < N; i++) { const m = wave[i]; let t = 0; while (!(m & (1 << t)) && t < 15) t++; out[i] = t; }
  return out;
}
