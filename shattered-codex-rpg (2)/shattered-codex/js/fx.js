'use strict';
(function () {
  const U = G.U;
  const FX = G.FX = {};
  const MAXP = 2400;
  let scene, pts, geo, uni;
  const P = { x: new Float32Array(MAXP), y: new Float32Array(MAXP), z: new Float32Array(MAXP), vx: new Float32Array(MAXP), vy: new Float32Array(MAXP), vz: new Float32Array(MAXP),
    life: new Float32Array(MAXP), max: new Float32Array(MAXP), size: new Float32Array(MAXP), grav: new Float32Array(MAXP), drag: new Float32Array(MAXP),
    r: new Float32Array(MAXP), g: new Float32Array(MAXP), b: new Float32Array(MAXP), grow: new Float32Array(MAXP) };
  let head = 0;
  const rings = [], beams = [], texts = [], glows = [];
  const tmpC = new THREE.Color();

  FX.init = function (sc) {
    scene = sc;
    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXP * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAXP * 3), 3));
    geo.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(MAXP), 1));
    geo.setAttribute('psize', new THREE.BufferAttribute(new Float32Array(MAXP), 1));
    uni = { map: { value: G.T.glow() }, scale: { value: 400 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: uni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec3 color; attribute float alpha; attribute float psize; uniform float scale; varying vec3 vC; varying float vA;
        void main(){ vC=color; vA=alpha; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=min(256.0, psize*scale/max(0.5,-mv.z)); gl_Position=projectionMatrix*mv; if(alpha<=0.0) gl_PointSize=0.0; }`,
      fragmentShader: `uniform sampler2D map; varying vec3 vC; varying float vA; void main(){ vec4 t=texture2D(map,gl_PointCoord); gl_FragColor=vec4(vC*t.rgb*vA, t.a*vA); }`,
    });
    pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 5;
    scene.add(pts);
    // soft (normal-blended) pool for smoke & dust
    sgeo = new THREE.BufferGeometry();
    sgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXS * 3), 3));
    sgeo.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(MAXS), 1));
    sgeo.setAttribute('psize', new THREE.BufferAttribute(new Float32Array(MAXS), 1));
    sgeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAXS * 3), 3));
    const smat = new THREE.ShaderMaterial({
      uniforms: uni, transparent: true, depthWrite: false,
      vertexShader: mat.vertexShader,
      fragmentShader: `uniform sampler2D map; varying vec3 vC; varying float vA; void main(){ vec4 t=texture2D(map,gl_PointCoord); float a=t.a*vA*0.55; if(a<0.01) discard; gl_FragColor=vec4(vC, a); }`,
    });
    const sp = new THREE.Points(sgeo, smat); sp.frustumCulled = false; sp.renderOrder = 4; scene.add(sp);
  };
  const MAXS = 500; let sgeo; let shead = 0;
  const S = { x: new Float32Array(MAXS), y: new Float32Array(MAXS), z: new Float32Array(MAXS), vx: new Float32Array(MAXS), vy: new Float32Array(MAXS), vz: new Float32Array(MAXS), life: new Float32Array(MAXS), max: new Float32Array(MAXS), size: new Float32Array(MAXS), grow: new Float32Array(MAXS), c: new Float32Array(MAXS) };
  FX.soft = function (x, y, z, vx, vy, vz, life, size, grow, shade) {
    const i = shead; shead = (shead + 1) % MAXS;
    S.x[i] = x; S.y[i] = y; S.z[i] = z; S.vx[i] = vx; S.vy[i] = vy; S.vz[i] = vz; S.life[i] = life; S.max[i] = life; S.size[i] = size; S.grow[i] = grow; S.c[i] = shade;
  };
  FX.smoke = function (x, y, z) { FX.soft(x + (Math.random() - .5) * .3, y, z + (Math.random() - .5) * .3, 0.35 + Math.random() * 0.3, 1.1 + Math.random() * 0.5, 0.15, 5 + Math.random() * 2, 0.9, 0.55, 0.55 + Math.random() * 0.2); };
  FX.dust = function (x, y, z, sh) { FX.soft(x, y, z, (Math.random() - .5) * 1.5, 0.4 + Math.random() * 0.5, (Math.random() - .5) * 1.5, 0.9, 0.7, 1.4, sh || 0.6); };
  FX.resize = function (h, fov) { if (uni) uni.scale.value = h / (2 * Math.tan(fov * Math.PI / 360)); };

  FX.spawn = function (x, y, z, vx, vy, vz, life, size, color, grav, drag, grow) {
    const i = head; head = (head + 1) % MAXP;
    P.x[i] = x; P.y[i] = y; P.z[i] = z; P.vx[i] = vx; P.vy[i] = vy; P.vz[i] = vz;
    P.life[i] = life; P.max[i] = life; P.size[i] = size; P.grav[i] = grav || 0; P.drag[i] = drag || 0; P.grow[i] = grow || 0;
    tmpC.set(color); P.r[i] = tmpC.r; P.g[i] = tmpC.g; P.b[i] = tmpC.b;
  };
  // burst of particles in a sphere
  FX.burst = function (pos, color, n, speed, size, life, grav, up) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, e = Math.random() * 2 - 1, s = speed * (0.3 + Math.random() * 0.7); const c = Math.sqrt(1 - e * e);
      FX.spawn(pos.x, pos.y, pos.z, Math.cos(a) * c * s, e * s + (up || 0), Math.sin(a) * c * s, life * (0.6 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.8), color, grav, 1.5);
    }
  };
  // flat disc of particles on ground
  FX.disc = function (x, z, r, color, n, size, life, rise) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r; const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      FX.spawn(px, G.W.groundY(px, pz) + 0.3, pz, 0, (rise || 1) * (0.5 + Math.random()), 0, life * (0.6 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.8), color, 0, 0.5);
    }
  };
  FX.trail = function (pos, color, size, life) { FX.spawn(pos.x + (Math.random() - .5) * .2, pos.y + (Math.random() - .5) * .2, pos.z + (Math.random() - .5) * .2, 0, 0.3, 0, life || 0.35, size || 0.6, color, 0, 0, -0.5); };

  const ringGeo = new THREE.PlaneGeometry(2, 2); ringGeo.rotateX(-Math.PI / 2);
  FX.ring = function (x, z, radius, color, dur, opts) {
    opts = opts || {};
    const mat = new THREE.MeshBasicMaterial({ map: opts.fill ? G.T.glow() : G.T.ring(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: opts.opacity || 1, fog: false });
    const m = new THREE.Mesh(ringGeo, mat);
    const y = (opts.y !== undefined ? opts.y : G.W.groundY(x, z)) + 0.35;
    m.position.set(x, y, z); m.renderOrder = 4; scene.add(m);
    const r = { m, t: 0, dur, radius, grow: opts.grow !== false, persist: !!opts.persist, op: opts.opacity || 1 };
    rings.push(r); m.scale.setScalar(r.grow ? radius * 0.2 : radius);
    return r;
  };
  FX.removeRing = function (r) { r.t = r.dur = 0; r.dead = true; };

  const lineMatCache = {};
  FX.bolt = function (a, b, color, dur, jag) {
    const pts = []; const n = 10; jag = jag === undefined ? 0.9 : jag;
    for (let i = 0; i <= n; i++) {
      const t = i / n; const off = (i === 0 || i === n) ? 0 : jag;
      pts.push(new THREE.Vector3(U.lerp(a.x, b.x, t) + (Math.random() - .5) * off * 2, U.lerp(a.y, b.y, t) + (Math.random() - .5) * off * 2, U.lerp(a.z, b.z, t) + (Math.random() - .5) * off * 2));
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const line = new THREE.Line(g, mat); line.frustumCulled = false; scene.add(line);
    beams.push({ line, t: 0, dur: dur || 0.25 });
    pts.forEach((p, i) => { if (i % 2 === 0) FX.spawn(p.x, p.y, p.z, 0, 0, 0, 0.25, 1.4, color, 0, 0); });
  };

  // stand-alone glow sprite (e.g. projectile heads, loot beams)
  FX.glowSprite = function (color, size, additive) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.T.glow(), color, transparent: true, depthWrite: false, blending: additive === false ? THREE.NormalBlending : THREE.AdditiveBlending, fog: false }));
    s.scale.set(size, size, 1); scene.add(s); return s;
  };
  FX.flash = function (pos, color, size, dur) {
    const s = FX.glowSprite(color, size); s.position.copy(pos); glows.push({ s, t: 0, dur: dur || 0.25, size });
  };

  // DOM floating text
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
    const pa = geo.attributes.position.array, ca = geo.attributes.color.array, aa = geo.attributes.alpha.array, sa = geo.attributes.psize.array;
    for (let i = 0; i < MAXP; i++) {
      if (P.life[i] <= 0) { if (aa[i] !== 0) aa[i] = 0; continue; }
      P.life[i] -= dt;
      const dr = 1 - Math.min(1, P.drag[i] * dt);
      P.vx[i] *= dr; P.vy[i] = P.vy[i] * dr - P.grav[i] * dt; P.vz[i] *= dr;
      P.x[i] += P.vx[i] * dt; P.y[i] += P.vy[i] * dt; P.z[i] += P.vz[i] * dt;
      P.size[i] = Math.max(0.02, P.size[i] + P.grow[i] * dt);
      const f = Math.max(0, P.life[i] / P.max[i]);
      pa[i * 3] = P.x[i]; pa[i * 3 + 1] = P.y[i]; pa[i * 3 + 2] = P.z[i];
      ca[i * 3] = P.r[i]; ca[i * 3 + 1] = P.g[i]; ca[i * 3 + 2] = P.b[i];
      aa[i] = f < 0.3 ? f / 0.3 : 1; sa[i] = P.size[i];
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.attributes.alpha.needsUpdate = true; geo.attributes.psize.needsUpdate = true;
    { const pa = sgeo.attributes.position.array, aa = sgeo.attributes.alpha.array, sa = sgeo.attributes.psize.array, ca = sgeo.attributes.color.array; const day = G.W.dayF !== undefined ? 0.35 + G.W.dayF * 0.65 : 1;
      for (let i = 0; i < MAXS; i++) {
        if (S.life[i] <= 0) { aa[i] = 0; continue; }
        S.life[i] -= dt; S.x[i] += S.vx[i] * dt; S.y[i] += S.vy[i] * dt; S.z[i] += S.vz[i] * dt; S.vy[i] *= 1 - 0.15 * dt; S.size[i] += S.grow[i] * dt;
        const f = Math.max(0, S.life[i] / S.max[i]); const age = 1 - f;
        pa[i * 3] = S.x[i]; pa[i * 3 + 1] = S.y[i]; pa[i * 3 + 2] = S.z[i]; aa[i] = Math.min(1, age * 5) * f; sa[i] = S.size[i];
        const c = S.c[i] * day; ca[i * 3] = c; ca[i * 3 + 1] = c; ca[i * 3 + 2] = c * 1.03;
      }
      sgeo.attributes.position.needsUpdate = true; sgeo.attributes.alpha.needsUpdate = true; sgeo.attributes.psize.needsUpdate = true; sgeo.attributes.color.needsUpdate = true; }

    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]; r.t += dt;
      if (r.dead || (!r.persist && r.t >= r.dur)) { scene.remove(r.m); r.m.material.dispose(); rings.splice(i, 1); continue; }
      if (!r.persist) {
        const f = r.t / r.dur;
        if (r.grow) r.m.scale.setScalar(r.radius * (0.2 + 0.8 * Math.min(1, f * 1.6)));
        r.m.material.opacity = r.op * (1 - f * f);
      } else r.m.material.opacity = r.op * (0.75 + Math.sin(r.t * 4) * 0.25);
    }
    for (let i = beams.length - 1; i >= 0; i--) {
      const b = beams[i]; b.t += dt;
      if (b.t >= b.dur) { scene.remove(b.line); b.line.geometry.dispose(); b.line.material.dispose(); beams.splice(i, 1); continue; }
      b.line.material.opacity = 1 - b.t / b.dur;
    }
    for (let i = glows.length - 1; i >= 0; i--) {
      const g = glows[i]; g.t += dt;
      if (g.t >= g.dur) { scene.remove(g.s); g.s.material.dispose(); glows.splice(i, 1); continue; }
      const f = g.t / g.dur; g.s.scale.setScalar(g.size * (1 + f * 0.6)); g.s.material.opacity = 1 - f;
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
