// Leaf illustration toolkit: botanically-inspired leaf silhouettes (maple, oak,
// elm, birch, beech, willow, petal) with gradients, veins, serration shading,
// blemishes and curl highlights. Used for ground litter, tree cards and sprites.

function outlineMaple(len, rnd) {
  // lobe tips: [angle offset from up (rad), length factor]
  const lobes = [[0, 1], [0.95, 0.86], [-0.95, 0.86], [1.85, 0.52], [-1.85, 0.52]].sort((a, b) => a[0] - b[0]);
  const pts = [];
  const add = (ang, r) => pts.push([Math.sin(ang) * r, -Math.cos(ang) * r]);
  add(-2.45, len * 0.12);
  for (let i = 0; i < lobes.length; i++) {
    const [a, f] = lobes[i];
    const prev = i > 0 ? lobes[i - 1][0] : -2.4;
    const sinus = (prev + a) / 2;
    add(sinus, len * (i === 0 ? 0.2 : 0.34 + rnd() * 0.05));
    // serrated flanks toward the tip
    for (let k = 1; k <= 3; k++) {
      const t = k / 4;
      const ang = sinus + (a - sinus) * t;
      const r = len * f * (0.45 + 0.55 * t);
      add(ang - 0.05, r * (k % 2 ? 1.0 : 0.9));
    }
    add(a, len * f);
    const next = i < lobes.length - 1 ? lobes[i + 1][0] : 2.4;
    const s2 = (a + next) / 2;
    for (let k = 3; k >= 1; k--) {
      const t = k / 4;
      const ang = s2 + (a - s2) * t;
      const r = len * f * (0.45 + 0.55 * t);
      add(ang + 0.05, r * (k % 2 ? 1.0 : 0.9));
    }
  }
  add(2.45, len * 0.12);
  return pts;
}

function outlineProfile(len, widthFn, serr, rnd) {
  const n = 28, left = [], right = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let w = widthFn(t);
    if (serr > 0) w *= 1 - serr * ((i % 2) ? 1 : 0);
    const y = -t * len;
    left.push([-w, y]);
    right.push([w * (1 + (rnd() - 0.5) * 0.04), y]);
  }
  return left.concat(right.reverse());
}

export function leafOutline(kind, len, rnd = Math.random) {
  switch (kind) {
    case 'maple': return outlineMaple(len, rnd);
    case 'oak': return outlineProfile(len, (t) => len * 0.34 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.8) * (0.55 + 0.45 * Math.abs(Math.sin(t * Math.PI * 3.5 + 0.3))), 0, rnd);
    case 'elm': return outlineProfile(len, (t) => len * 0.3 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.85)), 0.9), 0.07, rnd);
    case 'birch': return outlineProfile(len, (t) => len * 0.34 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.7)), 1.1), 0.09, rnd);
    case 'beech': return outlineProfile(len, (t) => len * 0.3 * Math.pow(Math.sin(Math.PI * t), 0.75), 0.02, rnd);
    case 'willow': return outlineProfile(len, (t) => len * 0.11 * Math.pow(Math.sin(Math.PI * t), 0.7), 0.0, rnd);
    case 'petal': return outlineProfile(len, (t) => len * 0.36 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.05)), 0.6) * (t > 0.9 ? 0.85 : 1), 0, rnd);
    default: return outlineProfile(len, (t) => len * 0.3 * Math.sin(Math.PI * t), 0, rnd);
  }
}

export function tracePath(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i], q = pts[i - 1];
    ctx.quadraticCurveTo(q[0], q[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  ctx.closePath();
}

const clamp = (x) => Math.max(0, Math.min(255, Math.round(x)));
export function rgb(c, k = 1, a = 1) { return `rgba(${clamp(c[0] * k)},${clamp(c[1] * k)},${clamp(c[2] * k)},${a})`; }
export function mixC(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

/**
 * Paint a leaf with base at (0,0) pointing up (-y). colors are [r,g,b] 0..255.
 * opts: { base, tip, vein, blemish (0..1), curl (0..1), shadow (bool), stem (bool), edge }
 */
export function paintLeaf(ctx, kind, len, opts, rnd = Math.random) {
  const pts = opts.pts || leafOutline(kind, len, rnd);
  const base = opts.base, tip = opts.tip || opts.base;
  ctx.save();
  if (opts.shadow) {
    ctx.shadowColor = 'rgba(10,6,2,0.55)';
    ctx.shadowBlur = len * 0.18;
    ctx.shadowOffsetX = len * 0.05; ctx.shadowOffsetY = len * 0.07;
  }
  tracePath(ctx, pts);
  const g = ctx.createLinearGradient(0, 0, 0, -len);
  g.addColorStop(0, rgb(base, 0.92));
  g.addColorStop(0.55, rgb(mixC(base, tip, 0.5)));
  g.addColorStop(1, rgb(tip, 1.04));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.clip();
  // mottling
  const mottle = opts.mottle ?? 0.5;
  for (let i = 0; i < 6 * mottle; i++) {
    const x = (rnd() - 0.5) * len * 0.7, y = -rnd() * len;
    const r = len * (0.1 + rnd() * 0.25);
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    const c = rnd() < 0.5 ? mixC(base, tip, rnd()) : (opts.mottleColor || tip);
    rg.addColorStop(0, rgb(c, 0.9 + rnd() * 0.25, 0.45));
    rg.addColorStop(1, rgb(c, 1, 0));
    ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // edge darkening
  ctx.lineWidth = Math.max(1, len * 0.07);
  ctx.strokeStyle = rgb(opts.edge || base, 0.6, 0.35);
  tracePath(ctx, pts); ctx.stroke();
  // veins
  const vein = opts.vein || mixC(base, [255, 240, 200], 0.35);
  ctx.strokeStyle = rgb(vein, 1, 0.55);
  ctx.lineCap = 'round';
  if (kind === 'maple') {
    for (const [a, f] of [[0, 1], [0.95, 0.86], [-0.95, 0.86], [1.85, 0.52], [-1.85, 0.52]]) {
      ctx.lineWidth = Math.max(0.6, len * 0.028);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(a) * len * f * 0.92, -Math.cos(a) * len * f * 0.92); ctx.stroke();
      ctx.lineWidth = Math.max(0.4, len * 0.012);
      for (let k = 1; k < 4; k++) {
        const t = k / 4, px = Math.sin(a) * len * f * t, py = -Math.cos(a) * len * f * t;
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.sin(a + s * 0.8) * len * 0.12, py - Math.cos(a + s * 0.8) * len * 0.12); ctx.stroke(); }
      }
    }
  } else if (kind !== 'petal') {
    ctx.lineWidth = Math.max(0.6, len * 0.03);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.02, -len * 0.5, 0, -len * 0.96); ctx.stroke();
    ctx.lineWidth = Math.max(0.4, len * 0.012);
    const nv = kind === 'willow' ? 6 : 8;
    for (let k = 1; k <= nv; k++) {
      const t = k / (nv + 1), y = -t * len;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(0, y);
        ctx.quadraticCurveTo(s * len * 0.12, y - len * 0.06, s * len * 0.26 * Math.sin(Math.PI * t), y - len * 0.13);
        ctx.stroke();
      }
    }
  } else {
    ctx.lineWidth = Math.max(0.4, len * 0.012);
    for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(k * len * 0.05, -len * 0.5, k * len * 0.06, -len * 0.92); ctx.stroke(); }
  }
  // blemishes (autumn decay)
  const bl = opts.blemish || 0;
  for (let i = 0; i < bl * 10; i++) {
    const x = (rnd() - 0.5) * len * 0.6, y = -rnd() * len;
    const r = len * (0.02 + rnd() * 0.06);
    ctx.fillStyle = rgb(mixC(base, [40, 25, 10], 0.7), 1, 0.45 + rnd() * 0.3);
    ctx.beginPath(); ctx.ellipse(x, y, r, r * (0.6 + rnd() * 0.5), rnd() * 3, 0, Math.PI * 2); ctx.fill();
  }
  // curl highlight on one half
  if (opts.curl) {
    const hg = ctx.createLinearGradient(-len * 0.3, 0, len * 0.3, 0);
    hg.addColorStop(0, 'rgba(255,250,235,0)');
    hg.addColorStop(0.7, `rgba(255,248,230,${0.18 * opts.curl})`);
    hg.addColorStop(1, `rgba(0,0,0,${0.25 * opts.curl})`);
    ctx.fillStyle = hg; ctx.fillRect(-len, -len * 1.1, len * 2, len * 1.2);
  }
  ctx.restore();
  if (opts.stem) {
    ctx.save();
    ctx.strokeStyle = rgb(mixC(base, [90, 60, 30], 0.5), 0.8);
    ctx.lineWidth = Math.max(0.8, len * 0.035); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.04, len * 0.12, len * 0.02, len * 0.24); ctx.stroke();
    ctx.restore();
  }
  return pts;
}

// Fill the leaf silhouette only (for height maps)
export function fillLeafShape(ctx, kind, len, style, rnd = Math.random) {
  const pts = leafOutline(kind, len, rnd);
  tracePath(ctx, pts);
  ctx.fillStyle = style;
  ctx.fill();
}
