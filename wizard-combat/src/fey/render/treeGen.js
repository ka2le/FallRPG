// Adapted from the supplied Feywild prototype: reduced branch/card density for FPS combat.
// Procedural tree / giant flora mesh generation.
// Recursive branching with parallel-transport tubes, leaf-card canopies with
// spherical "canopy" normals for soft volumetric shading, plus low-poly
// impostor-ish LODs built from the same canopy clusters.
import * as THREE from 'three';
import { RNG } from '../core/rng.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

class GeoBuilder {
  constructor(nGroups) {
    this.g = [];
    for (let i = 0; i < nGroups; i++) this.g.push({ pos: [], nor: [], uv: [], leaf: [], idx: [] });
  }
  vert(gi, p, n, u, v, leaf = 0) {
    const g = this.g[gi];
    g.pos.push(p.x, p.y, p.z); g.nor.push(n.x, n.y, n.z); g.uv.push(u, v); g.leaf.push(leaf);
    return g.pos.length / 3 - 1;
  }
  tri(gi, a, b, c) { this.g[gi].idx.push(a, b, c); }

  // points: [{p, r}], radial segments
  tube(gi, pts, radial, uScale = 1, vScale = 0.6, cap = true) {
    if (pts.length < 2) return;
    const T = [], Nn = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)].p, b = pts[Math.min(pts.length - 1, i + 1)].p;
      T.push(b.clone().sub(a).normalize());
    }
    let n0 = Math.abs(T[0].y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
    n0 = n0.sub(T[0].clone().multiplyScalar(n0.dot(T[0]))).normalize();
    Nn.push(n0);
    for (let i = 1; i < pts.length; i++) {
      const prev = Nn[i - 1].clone();
      const n = prev.sub(T[i].clone().multiplyScalar(prev.dot(T[i]))).normalize();
      Nn.push(n);
    }
    const base = this.g[gi].pos.length / 3;
    let len = 0;
    const uRep = Math.max(1, Math.round(2 * Math.PI * pts[0].r * uScale));
    for (let i = 0; i < pts.length; i++) {
      if (i > 0) len += pts[i].p.distanceTo(pts[i - 1].p);
      const B = V().crossVectors(T[i], Nn[i]);
      for (let j = 0; j <= radial; j++) {
        const a = (j / radial) * Math.PI * 2;
        const dir = Nn[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
        const p = pts[i].p.clone().addScaledVector(dir, pts[i].r);
        this.vert(gi, p, dir, (j / radial) * uRep, len * vScale);
      }
    }
    for (let i = 0; i < pts.length - 1; i++) for (let j = 0; j < radial; j++) {
      const a = base + i * (radial + 1) + j, b = a + 1, c = a + radial + 1, d = c + 1;
      this.tri(gi, a, b, c); this.tri(gi, b, d, c);
    }
    if (cap) {
      const last = pts[pts.length - 1];
      const tip = this.vert(gi, last.p.clone().addScaledVector(T[T.length - 1], last.r * 0.8), T[T.length - 1], 0, len * vScale);
      const lb = base + (pts.length - 1) * (radial + 1);
      for (let j = 0; j < radial; j++) this.tri(gi, lb + j, lb + j + 1, tip);
    }
  }

  quad(gi, c, u, v, n, leaf = 1, uv = [0, 0, 1, 1]) {
    const a = this.vert(gi, c.clone().sub(u).sub(v), n, uv[0], uv[1], leaf);
    const b = this.vert(gi, c.clone().add(u).sub(v), n, uv[2], uv[1], leaf);
    const d = this.vert(gi, c.clone().sub(u).add(v), n, uv[0], uv[3], leaf);
    const e = this.vert(gi, c.clone().add(u).add(v), n, uv[2], uv[3], leaf);
    this.tri(gi, a, b, d); this.tri(gi, b, e, d);
  }

  // surface of revolution around +Y; profile [[r,y],...]
  lathe(gi, profile, segs, offset = V(), uRep = 1) {
    const base = this.g[gi].pos.length / 3;
    for (let i = 0; i < profile.length; i++) {
      const [r, y] = profile[i];
      const [r0, y0] = profile[Math.max(0, i - 1)], [r1, y1] = profile[Math.min(profile.length - 1, i + 1)];
      const dr = r1 - r0, dy = y1 - y0;
      for (let j = 0; j <= segs; j++) {
        const a = (j / segs) * Math.PI * 2;
        const c = Math.cos(a), s = Math.sin(a);
        const n = V(dy * c, -dr, dy * s).normalize();
        this.vert(gi, V(r * c, y, r * s).add(offset), n, (j / segs) * uRep, i / (profile.length - 1));
      }
    }
    for (let i = 0; i < profile.length - 1; i++) for (let j = 0; j < segs; j++) {
      const a = base + i * (segs + 1) + j, b = a + 1, c = a + segs + 1, d = c + 1;
      this.tri(gi, a, c, b); this.tri(gi, b, c, d);
    }
  }

  // blob (icosphere-ish) for low LOD canopies / cheap shadow casters
  blob(gi, center, radius, rng, canopyC, squash = 1, detail = 1) {
    const ico = new THREE.IcosahedronGeometry(1, detail);
    const p = ico.attributes.position;
    const base = this.g[gi].pos.length / 3;
    const map = new Map();
    const idx = [];
    for (let i = 0; i < p.count; i++) {
      const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
      let vi = map.get(key);
      if (vi === undefined) {
        const d = V(p.getX(i), p.getY(i), p.getZ(i));
        const k = 1 + (rng.next() - 0.5) * 0.35;
        const pos = center.clone().add(V(d.x * radius * k, d.y * radius * k * squash, d.z * radius * k));
        const n = pos.clone().sub(canopyC).normalize().lerp(d, 0.5).normalize();
        vi = this.vert(gi, pos, n, 0.5 + d.x * 0.5, 0.5 + d.y * 0.5, 1) - base;
        map.set(key, vi);
      }
      idx.push(vi);
    }
    for (let i = 0; i < idx.length; i += 3) this.tri(gi, base + idx[i], base + idx[i + 1], base + idx[i + 2]);
  }

  build() {
    const pos = [], nor = [], uv = [], leaf = [], idx = [];
    const groups = [];
    for (let gi = 0; gi < this.g.length; gi++) {
      const g = this.g[gi];
      const off = pos.length / 3;
      const start = idx.length;
      pos.push(...g.pos); nor.push(...g.nor); uv.push(...g.uv); leaf.push(...g.leaf);
      for (const i of g.idx) idx.push(i + off);
      groups.push([start, idx.length - start, gi]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('aLeaf', new THREE.Float32BufferAttribute(leaf, 1));
    geo.setIndex(idx);
    for (const [s, c, m] of groups) if (c > 0) geo.addGroup(s, c, m);
    geo.computeBoundingSphere();
    return geo;
  }

  copyGroup(source,group){
    // Identical cards, UVs and normals preserve canopy coverage and lighting.
    for(const key of ['pos','nor','uv','leaf','idx'])this.g[group][key]=source.g[group][key].slice();
  }
}

function randUnit(rng) {
  const z = rng.next() * 2 - 1, a = rng.next() * Math.PI * 2, r = Math.sqrt(1 - z * z);
  return V(r * Math.cos(a), z, r * Math.sin(a));
}
function perp(d) {
  const a = Math.abs(d.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
  return V().crossVectors(d, a).normalize();
}

// ------------------------------------------------------------------ broadleaf
const PRESETS = {
  oak: { trunkH: [4.5, 6], trunkR: 0.5, children: [4, 3, 2], depth: 3, angle: [0.7, 1.1], lenRatio: 0.62, firstLen: 5.5, gnarl: 0.28, up: 0.12, leafDepth: 2, leafSize: [1.4, 2.0], leafPer: 3, radial: [9, 6, 4, 3] },
  birch: { trunkH: [9, 12], trunkR: 0.24, children: [8, 3], depth: 2, angle: [0.45, 0.75], lenRatio: 0.4, firstLen: 4.0, gnarl: 0.12, up: 0.35, leafDepth: 1, leafSize: [0.9, 1.3], leafPer: 3, radial: [7, 4, 3], childStart: 0.35 },
  blossom: { trunkH: [2.2, 3.2], trunkR: 0.34, children: [4, 3, 2], depth: 3, angle: [0.85, 1.2], lenRatio: 0.68, firstLen: 4.2, gnarl: 0.35, up: 0.04, leafDepth: 2, leafSize: [1.3, 1.9], leafPer: 3, radial: [8, 5, 4, 3] },
  maple: { trunkH: [3.5, 4.8], trunkR: 0.38, children: [5, 3, 2], depth: 3, angle: [0.6, 0.95], lenRatio: 0.58, firstLen: 4.6, gnarl: 0.2, up: 0.22, leafDepth: 2, leafSize: [1.4, 1.9], leafPer: 3, radial: [8, 5, 4, 3] },
  willow: { trunkH: [3.5, 4.5], trunkR: 0.5, children: [5, 4], depth: 2, angle: [0.7, 1.0], lenRatio: 0.7, firstLen: 5.0, gnarl: 0.2, up: 0.3, leafDepth: 1, leafSize: [1, 1], leafPer: 3, radial: [9, 6, 4], willow: true },
  dead: { trunkH: [3.5, 5.5], trunkR: 0.42, children: [4, 3, 2], depth: 3, angle: [0.6, 1.1], lenRatio: 0.6, firstLen: 4.0, gnarl: 0.45, up: 0.15, leafDepth: 9, leafSize: [0, 0], leafPer: 0, radial: [7, 5, 4, 3] },
};

function genBroadleaf(kind, seed) {
  const P = PRESETS[kind];
  const rng = new RNG(seed);
  const b = new GeoBuilder(2);
  const leaves = []; // {c, n(face), u, v, s}
  const hangs = [];
  const branchPts = [];
  const trunkH = rng.range(P.trunkH[0], P.trunkH[1]);

  const grow = (start, dir, length, radius, depth) => {
    const segs = Math.max(3, Math.round(length / (depth === 0 ? 0.9 : 0.8)));
    const pts = [];
    let p = start.clone(), d = dir.clone();
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const r = radius * (1 - t * 0.72) + 0.012;
      pts.push({ p: p.clone(), r });
      d.addScaledVector(randUnit(rng), P.gnarl * 0.35).addScaledVector(V(0, 1, 0), P.up * 0.25);
      if (depth > 0) d.y -= 0.03 * depth; // gentle droop on thin branches
      d.normalize();
      p.addScaledVector(d, length / segs);
    }
    // flare trunk base
    if (depth === 0) { pts[0].r *= 1.6; if (pts[1]) pts[1].r *= 1.2; }
    b.tube(0, pts, P.radial[Math.min(depth, P.radial.length - 1)], 1.0, 0.5);
    branchPts.push({ pts, depth });
    if (depth < P.depth) {
      const n = P.children[depth] || 0;
      const cs = P.childStart ?? (depth === 0 ? 0.55 : 0.3);
      for (let k = 0; k < n; k++) {
        const t = cs + (1 - cs) * ((k + rng.next() * 0.8) / n);
        const idx = Math.min(pts.length - 1, Math.floor(t * (pts.length - 1)));
        const bp = pts[idx];
        const td = (pts[Math.min(pts.length - 1, idx + 1)].p.clone().sub(pts[Math.max(0, idx - 1)].p)).normalize();
        const az = (k / n) * Math.PI * 2 + rng.next() * 1.2;
        const ang = rng.range(P.angle[0], P.angle[1]);
        const pp = perp(td);
        const q = new THREE.Quaternion().setFromAxisAngle(td, az);
        const side = pp.applyQuaternion(q);
        const cd = td.clone().multiplyScalar(Math.cos(ang)).addScaledVector(side, Math.sin(ang)).normalize();
        const len = (depth === 0 ? P.firstLen * rng.range(0.8, 1.15) : length * P.lenRatio * rng.range(0.75, 1.1)) * (1 - (t - cs) * 0.35);
        grow(bp.p, cd, len, bp.r * 0.72, depth + 1);
      }
    }
    if (depth >= P.leafDepth && P.leafPer > 0) {
      for (let i = 1; i < pts.length; i++) {
        const t = i / (pts.length - 1);
        if (t < 0.25) continue;
        for (let k = 0; k < P.leafPer; k++) {
          const c = pts[i].p.clone().addScaledVector(randUnit(rng), rng.range(0.2, 0.9));
          leaves.push({ c, s: rng.range(P.leafSize[0], P.leafSize[1]) });
        }
      }
      if (P.willow) {
        const tip = pts[pts.length - 1].p;
        for (let k = 0; k < 5; k++) hangs.push({ c: tip.clone().addScaledVector(randUnit(rng), 0.8), len: rng.range(3.0, 5.5) });
        for (let i = 2; i < pts.length; i += 2) hangs.push({ c: pts[i].p.clone(), len: rng.range(2.5, 4.5) });
      }
    }
  };
  grow(V(0, -0.3, 0), V(rng.range(-0.05, 0.05), 1, rng.range(-0.05, 0.05)).normalize(), trunkH, P.trunkR, 0);

  // canopy center
  const cc = V();
  const all = leaves.map((l) => l.c).concat(hangs.map((h) => h.c));
  if (all.length) { for (const c of all) cc.add(c); cc.multiplyScalar(1 / all.length); } else cc.set(0, trunkH, 0);
  for (const l of leaves) {
    const out = l.c.clone().sub(cc).normalize();
    const n = out.clone().lerp(randUnit(rng), 0.6).normalize();
    const u = perp(n).multiplyScalar(l.s * 0.5);
    const v = V().crossVectors(n, u).normalize().multiplyScalar(l.s * 0.5);
    const shadeN = out.clone().lerp(V(0, 1, 0), 0.25).normalize();
    b.quad(1, l.c, u, v, shadeN, 1);
  }
  for (const h of hangs) {
    const out = h.c.clone().sub(cc).setY(0).normalize();
    for (let k = 0; k < 2; k++) {
      const face = out.clone().applyAxisAngle(V(0, 1, 0), k * Math.PI / 2 + rng.next() * 0.5);
      const u = V().crossVectors(face, V(0, 1, 0)).normalize().multiplyScalar(0.6);
      const v = V(0, h.len * 0.5, 0);
      const c = h.c.clone().add(V(0, -h.len * 0.5, 0));
      b.quad(1, c, u, v, out.clone().lerp(V(0, 1, 0), 0.3).normalize(), 1);
    }
  }
  const high = b.build();

  // Distant trees keep their complete canopy; simplify the expensive branch tubes.
  const lo = new GeoBuilder(2);
  // trunk + first-level branches only
  for (const br of branchPts) {
    if (br.depth > 1) continue;
    const pts = br.pts;
    const i = br.depth;
    const simp = pts.filter((_, k) => k % 2 === 0 || k === pts.length - 1);
    lo.tube(0, simp, i === 0 ? 5 : 3, 1.0, 0.5, false);
  }
  lo.copyGroup(b,1);
  const low = lo.build();
  return { high, low, trunkR: P.trunkR, height: trunkH };
}

// ------------------------------------------------------------------ pine
function genPine(seed) {
  const rng = new RNG(seed);
  const b = new GeoBuilder(2);
  const H = rng.range(13, 18);
  const pts = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push({ p: V(Math.sin(t * 3) * 0.08, t * H - 0.3, 0), r: 0.38 * (1 - t * 0.92) + 0.03 }); }
  pts[0].r *= 1.5;
  b.tube(0, pts, 8, 1.0, 0.4);
  const whorls = Math.round(H / 1.05);
  const cards = [];
  for (let w = 0; w < whorls; w++) {
    const t = 0.18 + 0.8 * (w / whorls);
    const y = t * H;
    const len = (1 - t) * 4.2 + 0.5;
    const n = 5 + Math.floor(rng.next() * 3);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + w * 0.7 + rng.next() * 0.4;
      const dir = V(Math.cos(a), -0.18 - rng.next() * 0.15, Math.sin(a)).normalize();
      const start = V(0, y, 0);
      const end = start.clone().addScaledVector(dir, len);
      end.y -= len * 0.12;
      b.tube(0, [{ p: start, r: 0.06 }, { p: end, r: 0.015 }], 3, 1, 0.5, false);
      cards.push({ start, end, dir, len });
    }
  }
  const cc = V(0, H * 0.45, 0);
  for (const c of cards) {
    const mid = c.start.clone().lerp(c.end, 0.55);
    const along = c.end.clone().sub(c.start).normalize();
    const side = V().crossVectors(along, V(0, 1, 0)).normalize();
    const out = mid.clone().sub(cc).normalize();
    const shadeN = out.clone().lerp(V(0, 1, 0), 0.4).normalize();
    // horizontal-ish card
    const w = c.len * 0.55 + 0.4;
    const vA = along.clone().multiplyScalar(c.len * 0.62);
    b.quad(1, mid, side.clone().multiplyScalar(w * 0.5), vA, shadeN, 1, [0, 0, 1, 1]);
    // tilted card
    const up = V().crossVectors(side, along).normalize();
    const s2 = side.clone().multiplyScalar(0.5).addScaledVector(up, 0.85).normalize().multiplyScalar(w * 0.42);
    b.quad(1, mid, s2, vA, shadeN, 1, [0, 0, 1, 1]);
  }
  // crown
  for (let k = 0; k < 3; k++) {
    const a = k * Math.PI / 3;
    b.quad(1, V(0, H - 0.3, 0), V(Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7), V(0, 1.3, 0), V(0, 1, 0), 1);
  }
  const high = b.build();
  const lo = new GeoBuilder(2);
  lo.tube(0, [pts[0], pts[5], pts[10]], 4, 1, 0.4, false);
  lo.copyGroup(b,1);
  return { high, low: lo.build(), trunkR: 0.38, height: H };
}

// ------------------------------------------------------------------ crystal tree
function shard(b, gi, base, dir, len, rad, rng) {
  const side = perp(dir), side2 = V().crossVectors(dir, side);
  const ring = [];
  const segs = 6;
  const mid = base.clone().addScaledVector(dir, len * 0.72);
  for (let j = 0; j < segs; j++) {
    const a = (j / segs) * Math.PI * 2;
    ring.push({ lo: base.clone().addScaledVector(side, Math.cos(a) * rad).addScaledVector(side2, Math.sin(a) * rad), hi: mid.clone().addScaledVector(side, Math.cos(a) * rad).addScaledVector(side2, Math.sin(a) * rad) });
  }
  const tip = base.clone().addScaledVector(dir, len);
  for (let j = 0; j < segs; j++) {
    const r0 = ring[j], r1 = ring[(j + 1) % segs];
    const n = r0.lo.clone().add(r1.lo).multiplyScalar(0.5).sub(base).normalize();
    const a = b.vert(gi, r0.lo, n, 0, 0, 1), c = b.vert(gi, r1.lo, n, 1, 0, 1), d = b.vert(gi, r0.hi, n, 0, 0.7, 1), e = b.vert(gi, r1.hi, n, 1, 0.7, 1);
    b.tri(gi, a, c, d); b.tri(gi, c, e, d);
    const n2 = r0.hi.clone().add(r1.hi).multiplyScalar(0.5).sub(mid).normalize().addScaledVector(dir, 0.6).normalize();
    const f = b.vert(gi, r0.hi, n2, 0, 0.7, 1), g = b.vert(gi, r1.hi, n2, 1, 0.7, 1), h = b.vert(gi, tip, n2, 0.5, 1, 1);
    b.tri(gi, f, g, h);
  }
}

function genCrystalTree(seed) {
  const rng = new RNG(seed);
  const b = new GeoBuilder(2);
  const H = rng.range(6, 9);
  const pts = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push({ p: V(Math.sin(t * 5) * 0.3, t * H - 0.2, Math.cos(t * 4) * 0.2), r: 0.45 * (1 - t * 0.8) }); }
  b.tube(0, pts, 6, 0.5, 0.3);
  for (let k = 0; k < 7; k++) {
    const t = 0.45 + 0.5 * rng.next();
    const p = pts[Math.floor(t * 8)].p;
    const d = randUnit(rng); d.y = Math.abs(d.y) + 0.6; d.normalize();
    const len = rng.range(2, 3.5);
    const end = p.clone().addScaledVector(d, len);
    b.tube(0, [{ p, r: 0.18 }, { p: end, r: 0.05 }], 5, 0.5, 0.3, false);
    for (let s = 0; s < 3; s++) {
      const sd = d.clone().addScaledVector(randUnit(rng), 0.6).normalize();
      shard(b, 1, end.clone().addScaledVector(randUnit(rng), 0.2), sd, rng.range(1.0, 2.4), rng.range(0.12, 0.26), rng);
    }
  }
  for (let s = 0; s < 5; s++) {
    const sd = V(0, 1, 0).addScaledVector(randUnit(rng), 0.5).normalize();
    shard(b, 1, pts[8].p.clone(), sd, rng.range(1.5, 3.2), rng.range(0.15, 0.3), rng);
  }
  const high = b.build();
  const lo = new GeoBuilder(2);
  lo.tube(0, [pts[0], pts[4], pts[8]], 5, 0.5, 0.3, false);
  lo.copyGroup(b,1);
  return { high, low: lo.build(), trunkR: 0.4, height: H };
}

// ------------------------------------------------------------------ giant flower
function genGiantFlower(seed) {
  const rng = new RNG(seed);
  const b = new GeoBuilder(3); // 0 stem, 1 petals, 2 glowing centre
  const H = rng.range(5, 10);
  const bend = V(rng.range(-1, 1), 0, rng.range(-1, 1)).normalize().multiplyScalar(rng.range(0.8, 2.0));
  const pts = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push({ p: V(bend.x * t * t, t * H - 0.2, bend.z * t * t), r: 0.28 * (1 - t * 0.35) }); }
  b.tube(0, pts, 7, 1.0, 0.3);
  // stem leaves (big cards, group petals?) -> put in stem group as leaf quads
  for (let k = 0; k < 3; k++) {
    const t = 0.2 + k * 0.18;
    const p = pts[Math.floor(t * 12)].p;
    const a = rng.next() * Math.PI * 2;
    const dir = V(Math.cos(a), 0.45, Math.sin(a)).normalize();
    const c = p.clone().addScaledVector(dir, 1.2);
    const side = V().crossVectors(dir, V(0, 1, 0)).normalize();
    b.quad(0, c, side.multiplyScalar(0.55), dir.clone().multiplyScalar(1.3), V(0, 1, 0), 1, [0.02, 0.02, 0.1, 0.9]);
  }
  const top = pts[12].p;
  const face = V(bend.x * 0.25, 1, bend.z * 0.25).normalize();
  const fs = perp(face), fs2 = V().crossVectors(face, fs);
  const nPet = 6 + Math.floor(rng.next() * 4);
  const L = rng.range(2.4, 3.6), Wd = L * 0.55;
  for (let layer = 0; layer < 2; layer++) {
    for (let k = 0; k < nPet; k++) {
      const a = (k / nPet) * Math.PI * 2 + layer * Math.PI / nPet;
      const out = fs.clone().multiplyScalar(Math.cos(a)).addScaledVector(fs2, Math.sin(a));
      const side = V().crossVectors(face, out).normalize();
      const len = L * (layer ? 0.7 : 1);
      const lift = layer ? 0.9 : 0.35;
      const rows = 5, cols = 3;
      const base = b.g[1].pos.length / 3;
      for (let i = 0; i <= rows; i++) {
        const t = i / rows;
        const cup = Math.sin(t * Math.PI * 0.85) * lift * len * 0.45 + t * t * lift * len * 0.3;
        for (let j = 0; j <= cols; j++) {
          const s = j / cols - 0.5;
          const w = Wd * (layer ? 0.75 : 1) * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.9 + 0.12);
          const curl = s * s * 0.6;
          const p = top.clone().addScaledVector(out, t * len).addScaledVector(side, s * w).addScaledVector(face, cup + curl);
          const n = face.clone().addScaledVector(out, -0.35 * lift).normalize();
          b.vert(1, p, n, j / cols, t, 1);
        }
      }
      for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
        const a0 = base + i * (cols + 1) + j, b0 = a0 + 1, c0 = a0 + cols + 1, d0 = c0 + 1;
        b.tri(1, a0, c0, b0); b.tri(1, b0, c0, d0);
      }
    }
  }
  // glowing centre: dome + stamens
  const dome = [];
  for (let i = 0; i <= 5; i++) { const t = i / 5; dome.push([Math.cos(t * Math.PI / 2) * 0.75, Math.sin(t * Math.PI / 2) * 0.4]); }
  const g0 = b.g[2].pos.length / 3;
  b.lathe(2, dome, 12);
  // orient lathe to face direction
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), face);
  const gp = b.g[2].pos, gn = b.g[2].nor;
  for (let i = g0; i < gp.length / 3; i++) {
    const p = V(gp[i * 3], gp[i * 3 + 1], gp[i * 3 + 2]).applyQuaternion(q).add(top).addScaledVector(face, 0.15);
    const n = V(gn[i * 3], gn[i * 3 + 1], gn[i * 3 + 2]).applyQuaternion(q);
    gp[i * 3] = p.x; gp[i * 3 + 1] = p.y; gp[i * 3 + 2] = p.z; gn[i * 3] = n.x; gn[i * 3 + 1] = n.y; gn[i * 3 + 2] = n.z;
  }
  for (let k = 0; k < 14; k++) {
    const d = face.clone().addScaledVector(randUnit(rng), 0.5).normalize();
    const s = top.clone().addScaledVector(face, 0.3);
    b.tube(2, [{ p: s, r: 0.04 }, { p: s.clone().addScaledVector(d, rng.range(0.9, 1.5)), r: 0.02 }], 3, 1, 1, false);
  }
  const high = b.build();
  const lo = new GeoBuilder(3);
  lo.tube(0, [pts[0], pts[6], pts[12]], 4, 1, 0.3, false);
  lo.copyGroup(b,1);lo.copyGroup(b,2);
  return { high, low: lo.build(), trunkR: 0.3, height: H };
}

// ------------------------------------------------------------------ giant mushroom
function genGiantMushroom(seed) {
  const rng = new RNG(seed);
  const b = new GeoBuilder(3); // 0 stem, 1 cap, 2 gills (glow)
  const H = rng.range(4, 8), R = rng.range(2.6, 4.5), sr = rng.range(0.45, 0.8);
  const stem = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; stem.push([sr * (1.35 - 0.5 * t + 0.25 * Math.pow(1 - t, 4)), t * H - 0.3]); }
  b.lathe(0, stem, 12);
  const cap = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const a = t * Math.PI * 0.5;
    cap.push([Math.cos(a) * R * (1 + 0.08 * Math.sin(t * 9)), H + Math.sin(a) * R * 0.55 - 0.1]);
  }
  b.lathe(1, cap, 20, V(), 2);
  // underside gills: flat ring with radial pattern using uv
  const gills = [[sr * 0.9, H - 0.2], [R * 0.55, H - 0.35], [R * 0.98, H - 0.15]];
  const g0 = b.g[2].pos.length / 3;
  b.lathe(2, gills, 20, V(), 8);
  // flip normals down for gills
  const gn = b.g[2].nor;
  for (let i = g0; i < gn.length / 3; i++) { gn[i * 3] *= 0.2; gn[i * 3 + 1] = -1; gn[i * 3 + 2] *= 0.2; }
  const high = b.build();
  const lo = new GeoBuilder(3);
  lo.lathe(0, [stem[0], stem[4], stem[8]], 6);
  lo.lathe(1, cap.filter((_,i)=>i%2===0), 12, V(), 2);
  lo.lathe(2, gills, 12, V(), 8);
  const lgn = lo.g[2].nor; for (let i = 0; i < lgn.length / 3; i++) { lgn[i * 3 + 1] = -1; }
  return { high, low: lo.build(), trunkR: sr * 1.2, height: H + R * 0.5, capR: R, capH: H, capDome: R * 0.55 };
}

export function generateTreeKind(kind, seed) {
  switch (kind) {
    case 'pine': return genPine(seed);
    case 'crystal': return genCrystalTree(seed);
    case 'flower': return genGiantFlower(seed);
    case 'mushroom': return genGiantMushroom(seed);
    default: return genBroadleaf(kind, seed);
  }
}

export { GeoBuilder, randUnit, perp, shard };
