'use strict';
// Spell & combat effects for the Codex gameplay, drawn with the Feywild's
// particle system (G.fey.fx), light pool (G.fey.lights) and rune-ring shader.
(function () {
  const U = G.U;
  const FX = G.FX = {};
  let scene;
  const rings = [], beams = [], texts = [], glows = [], heads = [];
  const tmpC = new THREE.Color(), tmpHSL = { h: 0, s: 0, l: 0 };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const emit = (o) => G.fey.fx.emit(o);

  // colour helpers: codex hex -> linear rgb, plus a "fire" test for the Feywild fire recipes
  function lin(hex, k) { tmpC.set(hex); return [tmpC.r * k, tmpC.g * k, tmpC.b * k]; }
  function isFire(hex) { tmpC.set(hex); tmpC.getHSL(tmpHSL); return tmpHSL.h < 0.12 && tmpHSL.s > 0.6 && tmpC.r > 0.35; }

  FX.init = function (sc) { scene = sc; };
  FX.resize = function () {};

  // ---------------- particles ----------------
  FX.spawn = function (x, y, z, vx, vy, vz, life, size, color, grav, drag, grow) {
    const [r, g, b] = lin(color, 1.9);
    const big = size >= 0.9;
    emit({ x, y, z, vx, vy, vz, r, g, b, size: size * 0.42, grow: (grow || 0) * 0.42, life, atlas: big || Math.random() < 0.6 ? 0 : 1, drag: drag || 0, gravity: grav || 0 });
    if (Math.random() < 0.18) emit({ x, y, z, vx: vx * 1.2, vy: vy * 1.2, vz: vz * 1.2, r: r * 2, g: g * 2, b: b * 2, size: 0.1, life: life * 1.2, atlas: 1, drag: (drag || 0) + 0.5, gravity: (grav || 0) * 0.5 });
  };
  FX.burst = function (pos, color, n, speed, size, life, grav, up) {
    const fire = isFire(color);
    n = Math.max(3, Math.ceil(n * 0.7));
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, e = Math.random() * 2 - 1, s = speed * (0.3 + Math.random() * 0.7); const c = Math.sqrt(1 - e * e);
      FX.spawn(pos.x, pos.y, pos.z, Math.cos(a) * c * s, e * s + (up || 0), Math.sin(a) * c * s, life * (0.6 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.8), color, grav, 1.5);
    }
    if (fire && n > 12) for (let k = 0; k < n / 4; k++) emit({ additive: false, x: pos.x, y: pos.y, z: pos.z, vx: rnd(-1, 1), vy: rnd(0.5, 2), vz: rnd(-1, 1), r: 0.12, g: 0.1, b: 0.1, a: 0.4, size: rnd(0.5, 1.1), grow: 1.4, life: rnd(1.2, 2.2), atlas: 3, drag: 1.2, spin: rnd(-1, 1) });
  };
  FX.disc = function (x, z, r, color, n, size, life, rise) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r; const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      FX.spawn(px, G.W.groundY(px, pz) + 0.3, pz, 0, (rise || 1) * (0.5 + Math.random()), 0, life * (0.6 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.8), color, 0, 0.5);
    }
  };
  FX.trail = function (pos, color, size, life) {
    size = size || 0.6;
    if (isFire(color)) {
      // Feywild fire trail: hot flame puffs, the odd ember, a wisp of smoke
      const o = { x: rnd(-0.12, 0.12), y: rnd(-0.12, 0.12), z: rnd(-0.12, 0.12) };
      emit({ x: pos.x + o.x, y: pos.y + o.y, z: pos.z + o.z, vx: o.x * 4, vy: o.y * 4 + 0.5, vz: o.z * 4, r: rnd(2.6, 4.2), g: rnd(0.8, 1.4), b: 0.2, size: size * rnd(0.45, 0.7), grow: -0.4, life: rnd(0.2, 0.4), atlas: 0, drag: 2 });
      if (Math.random() < 0.35) emit({ x: pos.x, y: pos.y, z: pos.z, vx: rnd(-1, 1), vy: rnd(-1, 1), vz: rnd(-1, 1), r: 7, g: 3.5, b: 0.9, size: 0.07, life: rnd(0.4, 0.9), atlas: 1, gravity: 3, drag: 1 });
      if (Math.random() < 0.2) emit({ additive: false, x: pos.x, y: pos.y, z: pos.z, vx: 0, vy: 0.8, vz: 0, r: 0.12, g: 0.1, b: 0.1, a: 0.3, size: size * 0.6, grow: 1.4, life: 1.2, atlas: 3, drag: 1, spin: rnd(-1, 1) });
      return;
    }
    const [r, g, b] = lin(color, 2.0);
    emit({ x: pos.x + rnd(-0.1, 0.1), y: pos.y + rnd(-0.1, 0.1), z: pos.z + rnd(-0.1, 0.1), vx: 0, vy: 0.3, vz: 0, r, g, b, size: size * 0.4, grow: -0.3, life: life || 0.35, atlas: 0 });
    if (Math.random() < 0.3) emit({ x: pos.x, y: pos.y, z: pos.z, vx: rnd(-0.6, 0.6), vy: rnd(-0.6, 0.6), vz: rnd(-0.6, 0.6), r: r * 2, g: g * 2, b: b * 2, size: 0.06, life: rnd(0.4, 0.8), atlas: 1, drag: 1.5 });
  };
  // soft (alpha-blended) smoke & dust
  FX.soft = function (x, y, z, vx, vy, vz, life, size, grow, shade) {
    const l = (G.lightLevel || 1) * shade;
    emit({ additive: false, x, y, z, vx, vy, vz, r: l, g: l, b: l * 1.03, a: 0.4, size: size * 1.6, grow: grow * 1.6, life, atlas: 3, drag: 0.15, spin: rnd(-0.3, 0.3) });
  };
  FX.smoke = function (x, y, z) { FX.soft(x + (Math.random() - .5) * .3, y, z + (Math.random() - .5) * .3, 0.35 + Math.random() * 0.3, 1.1 + Math.random() * 0.5, 0.15, 5 + Math.random() * 2, 0.9, 0.55, 0.55 + Math.random() * 0.2); };
  FX.dust = function (x, y, z, sh) { FX.soft(x, y, z, (Math.random() - .5) * 1.5, 0.4 + Math.random() * 0.5, (Math.random() - .5) * 1.5, 0.9, 0.7, 1.4, sh || 0.6); };

  // ---------------- rune rings ----------------
  const RING_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const RING_FRAG = `
    uniform float uTime; uniform vec3 uColor; uniform float uOpacity; uniform float uFill; uniform float uGlyph; uniform float uWidth;
    varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 p = vUv * 2.0 - 1.0;
      float r = length(p), a = atan(p.y, p.x);
      float w = uWidth;
      float ring = smoothstep(w, 0.0, abs(r - 0.94)) + 0.5 * smoothstep(w * 0.6, 0.0, abs(r - 0.8)) * uGlyph;
      float ra = a + uTime * 0.6;
      float seg = floor((ra / 6.2831 + 0.5) * 36.0);
      float fa = fract((ra / 6.2831 + 0.5) * 36.0);
      float glyph = uGlyph * step(0.45, h(vec2(seg, 3.0))) * step(0.83, r) * step(r, 0.91) * step(0.2, fa) * step(fa, 0.8);
      float fill = uFill * smoothstep(1.0, 0.2, r) * 0.35;
      float v = (ring + glyph * 0.8 + fill) * step(r, 1.0);
      gl_FragColor = vec4(uColor * v * uOpacity, v * uOpacity);
    }`;
  const ringGeo = new THREE.PlaneGeometry(2, 2); ringGeo.rotateX(-Math.PI / 2);
  FX.ring = function (x, z, radius, color, dur, opts) {
    opts = opts || {};
    const col = new THREE.Color(color); col.multiplyScalar(opts.persist ? 1.6 : 2.4);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: Math.random() * 10 }, uColor: { value: col }, uOpacity: { value: opts.opacity || 1 }, uFill: { value: opts.fill ? 1 : opts.persist ? 0.5 : 0 }, uGlyph: { value: opts.persist || opts.fill ? 1 : 0 }, uWidth: { value: opts.persist ? 0.035 : 0.06 } },
      vertexShader: RING_VERT, fragmentShader: RING_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    });
    const m = new THREE.Mesh(ringGeo, mat);
    let y = opts.y;
    if (y === undefined) { let s = 0; for (let k = 0; k < 5; k++) { const a = k * 1.2566, rr = k ? radius * 0.7 : 0; s += G.W.groundY(x + Math.cos(a) * rr, z + Math.sin(a) * rr); } y = s / 5; }
    m.position.set(x, y + 0.3, z); m.renderOrder = 4; scene.add(m);
    const r = { m, t: 0, dur, radius, grow: opts.grow !== false, persist: !!opts.persist, op: opts.opacity || 1 };
    rings.push(r); m.scale.setScalar(r.grow ? radius * 0.2 : radius);
    return r;
  };
  FX.removeRing = function (r) { r.t = r.dur = 0; r.dead = true; };

  // ---------------- lightning ----------------
  FX.bolt = function (a, b, color, dur, jag) {
    const pts = []; const n = 12; jag = jag === undefined ? 0.9 : jag;
    for (let i = 0; i <= n; i++) {
      const t = i / n; const off = (i === 0 || i === n) ? 0 : jag;
      pts.push(new THREE.Vector3(U.lerp(a.x, b.x, t) + (Math.random() - .5) * off * 2, U.lerp(a.y, b.y, t) + (Math.random() - .5) * off * 2, U.lerp(a.z, b.z, t) + (Math.random() - .5) * off * 2));
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(color).multiplyScalar(5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const line = new THREE.Line(g, mat); line.frustumCulled = false; scene.add(line);
    beams.push({ line, t: 0, dur: dur || 0.25 });
    const [r, gg, bb] = lin(color, 3);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[i + 1];
      for (let k = 0; k < 3; k++) {
        const f = Math.random();
        emit({ x: U.lerp(p.x, q.x, f), y: U.lerp(p.y, q.y, f), z: U.lerp(p.z, q.z, f), vx: rnd(-0.3, 0.3), vy: rnd(-0.3, 0.3), vz: rnd(-0.3, 0.3), r, g: gg, b: bb, size: rnd(0.12, 0.3), life: rnd(0.12, 0.25), atlas: k ? 0 : 1 });
      }
    }
    const l = G.fey.lights.get();
    if (l) { l.color.set(color); l.position.lerpVectors(a, b, 0.5); glows.push({ light: l, t: 0, dur: dur || 0.25, i0: 120 }); }
  };

  // ---------------- projectile heads ----------------
  const coreGeo = new THREE.IcosahedronGeometry(1, 2);
  const haloCache = {};
  function haloMat(color) {
    if (!haloCache[color]) haloCache[color] = new THREE.SpriteMaterial({ map: G.T.glow(), color: new THREE.Color(color).multiplyScalar(1.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.45 });
    return haloCache[color];
  }
  FX.glowSprite = function (color, size, additive) {
    const fire = isFire(color);
    const c = new THREE.Color(color);
    const mat = new THREE.MeshBasicMaterial({ color: fire ? new THREE.Color(7, 3, 0.9) : c.clone().multiplyScalar(5) });
    const s = new THREE.Mesh(coreGeo, mat);
    s.scale.setScalar(Math.max(0.08, size * 0.11));
    const halo = new THREE.Sprite(haloMat(color));
    halo.scale.setScalar(size * 0.9 / Math.max(0.08, size * 0.11));
    s.add(halo);
    s.renderOrder = 5;
    scene.add(s);
    let light = null;
    if (size >= 1.2 && (light = G.fey.lights.get())) { light.color.copy(c); light.intensity = 40 + size * 25; }
    heads.push({ s, light, i0: 40 + size * 25, size });
    return s;
  };
  FX.flash = function (pos, color, size, dur) {
    const l = G.fey.lights.get();
    if (l) { l.color.set(color); l.position.copy(pos).y += 1; glows.push({ light: l, t: 0, dur: Math.max(0.4, (dur || 0.25) * 2), i0: 80 * size }); }
    if (size >= 5) FX.explosion(pos, color, size / 10);
  };
  // the Feywild fireball explosion, tinted by school and scaled by radius
  FX.explosion = function (pos, color, k) {
    const fire = isFire(color);
    const [cr, cg, cb] = lin(color, 1);
    const pal = () => fire ? [rnd(3, 6), rnd(1.0, 2.2), rnd(0.2, 0.45)] : [cr * rnd(3, 5) + 0.3, cg * rnd(3, 5) + 0.3, cb * rnd(3, 5) + 0.3];
    const n = Math.min(1.6, Math.max(0.35, k));
    for (let i = 0; i < 110 * n; i++) {
      const d = new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(4, 15) * n);
      d.y = Math.abs(d.y) * 0.8 + 1;
      const c = pal();
      emit({ x: pos.x, y: pos.y + 0.3, z: pos.z, vx: d.x, vy: d.y, vz: d.z, r: c[0], g: c[1], b: c[2], size: rnd(0.5, 1.2) * Math.sqrt(n), grow: 2.2, life: rnd(0.45, 1.0), atlas: 0, drag: 3.5 });
    }
    for (let i = 0; i < 45 * n; i++) {
      const d = new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(10, 26) * n); d.y = Math.abs(d.y) + 3;
      const c = pal();
      emit({ x: pos.x, y: pos.y + 0.3, z: pos.z, vx: d.x, vy: d.y, vz: d.z, r: c[0] * 1.3, g: c[1] * 1.3, b: c[2] * 1.3, size: rnd(0.06, 0.12), life: rnd(0.7, 1.6), atlas: fire ? 0 : 1, gravity: 14, drag: 1.2 });
    }
    for (let i = 0; i < 35 * n; i++) {
      const d = new THREE.Vector3(rnd(-1, 1), rnd(0, 1), rnd(-1, 1)).multiplyScalar(rnd(1, 5)); d.y += 1.5;
      const sh = fire ? 0.1 : 0.2;
      emit({ additive: false, x: pos.x, y: pos.y + 0.5, z: pos.z, vx: d.x, vy: d.y, vz: d.z, r: sh, g: sh * 0.85, b: sh * 0.85, a: fire ? 0.55 : 0.3, size: rnd(1, 2) * Math.sqrt(n), grow: 2.5, life: rnd(1.8, 3.2), atlas: 3, drag: 1.2, spin: rnd(-0.6, 0.6) });
    }
    if (G.fey.onExplosion) G.fey.onExplosion(pos, k);
  };

  // ---------------- floating combat text (DOM) ----------------
  let floatRoot = null;
  FX.text = function (pos, str, cls) {
    if (!floatRoot) floatRoot = document.getElementById('floaters');
    if (!floatRoot) return;
    if (texts.length > 60) { const o = texts.shift(); o.el.remove(); }
    const el = document.createElement('div'); el.className = 'ft ' + (cls || ''); el.textContent = str;
    floatRoot.appendChild(el);
    texts.push({ el, p: new THREE.Vector3(pos.x + (Math.random() - .5) * 0.8, pos.y, pos.z + (Math.random() - .5) * 0.8), t: 0, dur: cls === 'crit' ? 1.3 : 1.0 });
  };

  const v3 = new THREE.Vector3();
  FX.update = function (dt, cam) {
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]; r.t += dt;
      const u = r.m.material.uniforms;
      u.uTime.value += dt;
      if (r.dead || (!r.persist && r.t >= r.dur)) { scene.remove(r.m); r.m.material.dispose(); rings.splice(i, 1); continue; }
      if (!r.persist) {
        const f = r.t / r.dur;
        if (r.grow) r.m.scale.setScalar(r.radius * (0.2 + 0.8 * Math.min(1, f * 1.6)));
        u.uOpacity.value = r.op * (1 - f * f);
      } else u.uOpacity.value = r.op * (0.8 + Math.sin(r.t * 4) * 0.2) * Math.min(1, r.t * 4);
    }
    for (let i = beams.length - 1; i >= 0; i--) {
      const b = beams[i]; b.t += dt;
      if (b.t >= b.dur) { scene.remove(b.line); b.line.geometry.dispose(); b.line.material.dispose(); beams.splice(i, 1); continue; }
      b.line.material.opacity = 1 - b.t / b.dur;
    }
    for (let i = glows.length - 1; i >= 0; i--) {
      const g = glows[i]; g.t += dt;
      const f = g.t / g.dur;
      if (f >= 1) { G.fey.lights.free(g.light); glows.splice(i, 1); continue; }
      g.light.intensity = g.i0 * (1 - f) * (1 - f);
    }
    const tt = performance.now() * 0.001;
    for (let i = heads.length - 1; i >= 0; i--) {
      const h = heads[i];
      if (!h.s.parent) { G.fey.lights.free(h.light); heads.splice(i, 1); continue; }
      h.s.rotation.x += dt * 5; h.s.rotation.y += dt * 7;
      const base = Math.max(0.08, h.size * 0.11);
      h.s.scale.setScalar(base * (1 + 0.15 * Math.sin(tt * 30 + i)));
      if (h.light) { h.light.position.copy(h.s.position); h.light.intensity = h.i0 * (0.85 + Math.random() * 0.3); }
    }
    // floating text
    const W = window.innerWidth, H = window.innerHeight;
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i]; t.t += dt;
      if (t.t >= t.dur) { t.el.remove(); texts.splice(i, 1); continue; }
      t.p.y += dt * 1.6;
      v3.copy(t.p).project(cam);
      if (v3.z > 1 || v3.z < -1) { t.el.style.display = 'none'; continue; }
      t.el.style.display = '';
      const f = t.t / t.dur;
      t.el.style.transform = `translate(${((v3.x + 1) / 2 * W).toFixed(1)}px, ${((1 - v3.y) / 2 * H).toFixed(1)}px) translate(-50%,-50%) scale(${f < 0.15 ? 0.6 + f / 0.15 * 0.6 : 1.2 - Math.min(0.2, f)})`;
      t.el.style.opacity = f > 0.7 ? (1 - f) / 0.3 : 1;
    }
  };
  FX.clearTexts = function () { texts.forEach(t => t.el.remove()); texts.length = 0; };
})();
