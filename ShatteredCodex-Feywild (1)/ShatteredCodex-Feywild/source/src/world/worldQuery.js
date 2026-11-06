// Runtime sampling helpers over the generated world data
import { N, CELL, HALF, COARSE, COARSE_CELL, WATER_NONE, WTYPE_ICE, WTYPE_LAVA } from './constants.js';
import { T } from './wfc.js';
import { clamp, lerp } from '../core/rng.js';

export class WorldQuery {
  constructor(W) {
    this.W = W;
    this.colliders = [];     // {x,z,r,top,bottom}
    this.platforms = [];     // {x,z,r, getTop:()=>y}
    this.grid = new Map();   // spatial hash of colliders
    this.gridSize = 16;
  }

  idx(x, z) {
    const ix = clamp(Math.round((x + HALF) / CELL), 0, N - 1), iz = clamp(Math.round((z + HALF) / CELL), 0, N - 1);
    return iz * N + ix;
  }

  height(x, z) {
    const H = this.W.height;
    const gx = (x + HALF) / CELL, gz = (z + HALF) / CELL;
    if (gx < 0 || gz < 0 || gx > N - 1 || gz > N - 1) return -30;
    const ix = Math.min(N - 2, Math.floor(gx)), iz = Math.min(N - 2, Math.floor(gz));
    const fx = gx - ix, fz = gz - iz;
    const i = iz * N + ix;
    return lerp(lerp(H[i], H[i + 1], fx), lerp(H[i + N], H[i + N + 1], fx), fz);
  }

  normal(x, z, out) {
    const e = 1.0;
    const hx = this.height(x + e, z) - this.height(x - e, z);
    const hz = this.height(x, z + e) - this.height(x, z - e);
    const l = Math.hypot(hx, 2 * e, hz);
    out.x = -hx / l; out.y = 2 * e / l; out.z = -hz / l;
    return out;
  }

  // water surface height (or -1000), and type
  water(x, z) {
    const gx = (x + HALF) / CELL, gz = (z + HALF) / CELL;
    if (gx < 0 || gz < 0 || gx > N - 1 || gz > N - 1) return { h: 0, type: 0, kind: 1 };
    const W = this.W;
    // pick max water surface over the 4 surrounding samples for robustness
    const ix = Math.min(N - 2, Math.floor(gx)), iz = Math.min(N - 2, Math.floor(gz));
    let best = -1000, type = 0, kind = 0;
    for (const j of [iz * N + ix, iz * N + ix + 1, (iz + 1) * N + ix, (iz + 1) * N + ix + 1]) {
      if (W.waterKind[j] !== WATER_NONE && W.waterH[j] > best) { best = W.waterH[j]; type = W.waterType[j]; kind = W.waterKind[j]; }
    }
    return { h: best, type, kind };
  }

  season(x, z, out) {
    const i = this.idx(x, z) * 4, S = this.W.season;
    out[0] = S[i]; out[1] = S[i + 1]; out[2] = S[i + 2]; out[3] = S[i + 3];
    return out;
  }

  feat(x, z) {
    const o = this.idx(x, z) * 4, F = this.W.feat, F2 = this.W.feat2, M = this.W.misc;
    return {
      pollen: F[o] / 255, bloom: F[o + 1] / 255, lava: F[o + 2] / 255, leaf: F[o + 3] / 255,
      crystal: F2[o] / 255, mushroom: F2[o + 1] / 255, grove: F2[o + 2] / 255, glacier: F2[o + 3] / 255,
      forest: M[o] / 255, wet: M[o + 1] / 255, grass: M[o + 2] / 255, hub: M[o + 3] / 255,
    };
  }

  tileAt(x, z) {
    const cx = clamp(Math.floor((x + HALF) / COARSE_CELL), 0, COARSE - 1), cz = clamp(Math.floor((z + HALF) / COARSE_CELL), 0, COARSE - 1);
    return this.W.tiles[cz * COARSE + cx];
  }

  regionName(x, z) {
    const s = this.season(x, z, [0, 0, 0, 0]);
    const f = this.feat(x, z);
    if (Math.hypot(x, z) < 70) return { name: 'The Crossing of Seasons', sub: 'where the four courts meet' };
    const w = this.water(x, z);
    if (this.height(x, z) < -2 && w.kind === 1) return { name: 'The Moonglass Sea', sub: 'endless and humming' };
    let si = 0; for (let k = 1; k < 4; k++) if (s[k] > s[si]) si = k;
    if (f.pollen > 0.4) return { name: 'The Amethyst Drift', sub: 'spring · pollen of dreaming' };
    if (f.grove > 0.4) return { name: 'Blushpetal Grove', sub: 'spring · eternal blossom' };
    if (f.bloom > 0.4) return { name: 'The Bloomwood', sub: 'summer · a forest of flowers' };
    if (f.mushroom > 0.4) return { name: 'Glimmercap Hollow', sub: 'summer · the singing caps' };
    if (f.lava > 0.3) return { name: 'Cinder Mere', sub: 'autumn · the burning pools' };
    if (f.leaf > 0.3) return { name: 'The Tumblemounds', sub: 'autumn · hills of fallen leaves' };
    if (f.crystal > 0.4) return { name: 'Shiverglass Fields', sub: 'winter · frozen starlight' };
    if (f.glacier > 0.4) return { name: 'The Frostfang Peaks', sub: 'winter · where storms are born' };
    const t = this.tileAt(x, z);
    const names = [
      { base: 'Verdant Thaw', forest: 'Dewlight Woods', mount: 'Mistcrown Heights', lake: 'Mirrormere' },
      { base: 'Sunhallow Reach', forest: 'Goldleaf Wildwood', mount: 'Highsun Tors', lake: 'Glitterwater' },
      { base: 'Emberfall Wilds', forest: 'The Russet Wood', mount: 'Ashen Ridges', lake: 'Copperpool' },
      { base: 'Rimefrost Expanse', forest: 'Whisperpine Taiga', mount: 'Palecrag Summits', lake: 'The Stillglass' },
    ][si];
    const sub = ['spring', 'summer', 'autumn', 'winter'][si];
    if (t === T.FOREST) return { name: names.forest, sub };
    if (t === T.MOUNTAIN) return { name: names.mount, sub };
    if (t === T.LAKE) return { name: names.lake, sub };
    return { name: names.base, sub };
  }

  // ---- colliders
  addCollider(c) {
    this.colliders.push(c);
    const g = this.gridSize;
    const x0 = Math.floor((c.x - c.r) / g), x1 = Math.floor((c.x + c.r) / g);
    const z0 = Math.floor((c.z - c.r) / g), z1 = Math.floor((c.z + c.r) / g);
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const k = x * 73856093 ^ z * 19349663;
      let a = this.grid.get(k); if (!a) { a = []; this.grid.set(k, a); }
      a.push(c);
    }
  }
  nearColliders(x, z) {
    const g = this.gridSize;
    const k = Math.floor(x / g) * 73856093 ^ Math.floor(z / g) * 19349663;
    return this.grid.get(k) || [];
  }

  // Ground height under a point including ice sheets and floating platforms (for walking)
  groundAt(x, z, fromY = Infinity) {
    let g = this.height(x, z);
    const w = this.water(x, z);
    if (w.h > g && w.type === WTYPE_ICE) g = w.h;
    for (const p of this.platforms) {
      const dx = x - p.x, dz = z - p.z;
      if (dx * dx + dz * dz < p.r * p.r) {
        const top = p.getTop(x, z);
        if (top !== null && top <= fromY + 0.6 && top > g) g = top;
      }
    }
    return g;
  }

  // raymarch against terrain; returns distance or -1
  raycast(ox, oy, oz, dx, dy, dz, maxDist, solidWater = false) {
    let t = 0.5, prev = t;
    const step0 = 1.0;
    while (t < maxDist) {
      const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t;
      let g = this.height(x, z);
      if (solidWater) { const w = this.water(x, z); if (w.h > g) g = w.h; }
      if (y < g) {
        // refine
        let a = prev, b = t;
        for (let k = 0; k < 10; k++) {
          const m = (a + b) * 0.5;
          const xm = ox + dx * m, ym = oy + dy * m, zm = oz + dz * m;
          let gm = this.height(xm, zm);
          if (solidWater) { const w = this.water(xm, zm); if (w.h > gm) gm = w.h; }
          if (ym < gm) b = m; else a = m;
        }
        return b;
      }
      prev = t;
      t += Math.max(step0, (y - g) * 0.4);
    }
    return -1;
  }

  isLava(x, z, y) {
    const w = this.water(x, z);
    return w.type === WTYPE_LAVA && y < w.h + 0.5;
  }
}
