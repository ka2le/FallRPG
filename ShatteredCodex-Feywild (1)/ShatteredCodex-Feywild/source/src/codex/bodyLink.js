// Links the Codex hero (stats, buffs, spells) to the Feywild body (movement,
// flight, swimming, camera feel) and adds the Feywild spell presentation:
// fey-step teleports, flight wind, haste shimmer, the lantern-wisp, explosions,
// the staff's sparkle, and the compass / clock / region banner HUD.
import * as THREE from 'three';

const rnd = (a, b) => a + Math.random() * (b - a);
function randDir() { const z = rnd(-1, 1), a = rnd(0, Math.PI * 2), r = Math.sqrt(1 - z * z); return new THREE.Vector3(r * Math.cos(a), z, r * Math.sin(a)); }

export function setupBody(CG, body, P, query, camera, audio, fx, post, lights, staff) {
  const safe = (fn) => { try { fn(); } catch (e) { /* audio is optional */ } };

  // ------------------------------------------------ the hero's body is the Feywild body
  body.pos.copy(P.pos);
  P.pos = body.pos;
  const def = (k, get, set) => Object.defineProperty(P, k, { get, set: set || (() => {}), configurable: true, enumerable: true });
  def('flying', () => body.flying, (v) => {
    v = !!v;
    if (v === body.flying) return;
    body.flying = v;
    if (v) { body.vel.y = Math.max(body.vel.y, 6); body.onGround = false; } else body.featherTime = 4;
  });
  def('onGround', () => body.onGround, (v) => { body.onGround = v; });
  def('swimming', () => body.swimming);
  def('inLava', () => body.inLava);
  def('vy', () => body.vel.y, (v) => { body.vel.y = v; });
  def('yaw', () => body.yaw, (v) => { body.yaw = v; });
  def('pitch', () => body.pitch, (v) => { body.pitch = v; });
  def('bob', () => body.bobPhase * 2, () => {});
  P.teleport = function (x, z, y) {
    body.pos.set(x, y !== undefined ? y : CG.W.groundY(x, z), z);
    body.vel.set(0, 0, 0);
    CG.W.collide(body.pos, 0.5);
  };
  P.eye = (out) => (out || new THREE.Vector3()).copy(camera.position);

  // ------------------------------------------------ per-frame body step (called from P.update)
  const I = CG.Input;
  let prevKeys = {};
  const pressed = new Set();
  const inp = {
    mouseDX: 0, mouseDY: 0, pressed, joy: I.joy,
    down: (c) => !!I.keys[c] || (c === 'Space' && (I.btnUp || I.btnJump)) || (c === 'KeyC' && I.btnDown),
  };
  CG.bodyUpdate = function (dt) {
    const open = CG.UI.isOpen();
    pressed.clear();
    for (const k in I.keys) if (I.keys[k] && !prevKeys[k]) pressed.add(k);
    if (I.btnJump) { pressed.add('Space'); I.btnJump = false; }
    prevKeys = Object.assign({}, I.keys);
    inp.mouseDX = open ? 0 : I.lookDX; inp.mouseDY = open ? 0 : I.lookDY;
    I.lookDX = 0; I.lookDY = 0;
    body.sensitivity = CG.settings.sens; body.invertY = !!CG.settings.invertY;
    const D = P.D;
    const slow = P.deb.slowT > 0 ? 0.6 : 1;
    body.walkSpeed = 6.4 * D.moveMul * slow;
    body.flySpeed = 22 * D.moveMul * slow;
    body.frozen = open || P.deb.stunT > 0 || P.dead;
    body.waterWalk = !!P.buffs.water;
    const hb = P.buffs.haste;
    body.hasteTime = hb ? hb.t : 0;
    body.hasteBoost = 0.45;
    body.update(dt, open ? NULL : inp);
    CG.W.collide(body.pos, 0.45);
    // fey lava: it bounces you out, but it still bites
    if (body.inLava && !P.dead) {
      if (body.waterWalk) P.takeDamage(P.D.maxHp * 0.03 * dt, { kind: 'true' });
      else if (CG.now - lavaT > 0.4) {
        lavaT = CG.now;
        P.takeDamage(P.D.maxHp * 0.08, { kind: 'true' });
        P.deb.burn.push({ dps: P.D.maxHp * 0.04, t: 2.5 }); if (P.deb.burn.length > 3) P.deb.burn.shift();
        CG.UI.msg('The lava sears you!', 'warn');
      }
    }
  };
  let lavaT = -9;
  const NULL = { mouseDX: 0, mouseDY: 0, down: () => false, pressed: new Set(), joy: null };

  body.onStep = (s) => safe(() => audio.footstep(s));
  body.onBounce = () => {
    safe(() => audio.bounce());
    const p = body.pos;
    for (let i = 0; i < 30; i++) { const a = Math.random() * 6.28; fx.emit({ x: p.x, y: p.y + 0.1, z: p.z, vx: Math.cos(a) * 3, vy: 2 + Math.random() * 3, vz: Math.sin(a) * 3, r: 1, g: 2.5, b: 2.5, size: 0.1, life: 0.9, atlas: 1, drag: 2 }); }
  };
  body.onSplash = (k) => safe(() => { if (k === 'in') audio.splash(1); if (k === 'lava') audio.sizzle(); });

  // ------------------------------------------------ Fey Step (blink, recall, portal)
  let warp = 0;
  function burst(p, implode) {
    for (let i = 0; i < 55; i++) {
      const d = randDir(), sp = rnd(2, 7);
      const pos = implode ? p.clone().addScaledVector(d, sp * 0.5) : p;
      const v = implode ? d.clone().multiplyScalar(-sp) : d.clone().multiplyScalar(sp);
      const c = Math.random() < 0.5 ? [2.2, 1.0, 4.0] : [0.8, 2.6, 3.2];
      fx.emit({ x: pos.x, y: pos.y, z: pos.z, vx: v.x, vy: v.y + 1, vz: v.z, r: c[0], g: c[1], b: c[2], size: rnd(0.06, 0.2), life: rnd(0.5, 1.2), atlas: 1, drag: 2.5 });
    }
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      fx.emit({ x: p.x + Math.cos(a) * 0.8, y: p.y - 0.9, z: p.z + Math.sin(a) * 0.8, vx: Math.cos(a) * 3, vy: rnd(2, 6), vz: Math.sin(a) * 3, r: 1.6, g: 0.8, b: 3.2, size: 0.4, grow: 1.2, life: 0.9, atlas: 0, drag: 2 });
    }
  }
  CG.fey.teleportFX = (from, to) => {
    burst(from.clone().add(new THREE.Vector3(0, 1, 0)), true);
    burst(to.clone().add(new THREE.Vector3(0, 1, 0)), false);
    warp = 1;
    post.u.uFlash.value = 0.3; post.u.uFlashColor.value.setRGB(0.85, 0.7, 1.0);
    body.vel.set(0, body.flying ? 0 : Math.min(0, body.vel.y), 0);
  };

  // ------------------------------------------------ Wings of the Wind
  let flyK = 0;
  CG.fey.flyFX = () => {
    const p = body.pos;
    staff.cast(0x66ffdd);
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2, r = rnd(0.5, 2.5);
      fx.emit({ x: p.x + Math.cos(a) * r, y: p.y + 0.1, z: p.z + Math.sin(a) * r, vx: Math.cos(a) * 4, vy: rnd(1, 5), vz: Math.sin(a) * 4, r: 0.5, g: 1.3, b: 1.1, size: rnd(0.06, 0.14), life: rnd(0.6, 1.0), atlas: 0, drag: 2.5 });
    }
  };
  // ------------------------------------------------ Quicksilver Haste
  CG.fey.hasteFX = () => {
    const p = body.pos;
    post.u.uFlash.value = 0.08; post.u.uFlashColor.value.setRGB(1.0, 0.92, 0.7);
    for (let i = 0; i < 28; i++) {
      const a = i / 28 * Math.PI * 2;
      fx.emit({ x: p.x + Math.cos(a) * 0.7, y: p.y + 0.15, z: p.z + Math.sin(a) * 0.7, vx: Math.cos(a) * 2.2, vy: rnd(0.3, 0.9), vz: Math.sin(a) * 2.2, r: 1.3, g: 1.05, b: 0.45, size: 0.05, life: rnd(0.5, 0.9), atlas: 0, drag: 3 });
    }
  };

  // ------------------------------------------------ Will-o'-Wisp
  const wisp = { on: false, pos: new THREE.Vector3(), light: null };
  wisp.orb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 6.5, 9) }));
  wisp.orb.visible = false;
  CG.scene.add(wisp.orb);
  CG.fey.toggleWisp = () => {
    wisp.on = !wisp.on;
    safe(() => audio.light(wisp.on));
    if (wisp.on) {
      wisp.light = lights.get();
      if (wisp.light) wisp.light.color.setRGB(0.85, 0.85, 1.0);
      wisp.pos.copy(staff.tipWorld());
      wisp.orb.visible = true;
    } else {
      lights.free(wisp.light); wisp.light = null; wisp.orb.visible = false;
      const p = wisp.pos;
      for (let i = 0; i < 40; i++) { const d = randDir().multiplyScalar(rnd(1, 3)); fx.emit({ x: p.x, y: p.y, z: p.z, vx: d.x, vy: d.y, vz: d.z, r: 2, g: 2.2, b: 3, size: 0.08, life: 0.8, atlas: 1, drag: 2 }); }
    }
  };

  // ------------------------------------------------ explosions shake the world
  CG.fey.onExplosion = (pos, k) => {
    const dist = camera.position.distanceTo(pos);
    safe(() => audio.explosion(dist));
    body.shake = Math.max(body.shake, Math.max(0, (0.6 + k * 0.5) - dist / 60));
    const pp = body.pos.clone().add(new THREE.Vector3(0, 1, 0));
    const pd = pp.distanceTo(pos);
    const R = 3 + k * 4;
    if (pd < R && pd > 0.01) { body.vel.add(pp.sub(pos).normalize().multiplyScalar((R - pd) * 2.2)); body.onGround = false; }
  };

  // ------------------------------------------------ per-frame presentation
  const right = new THREE.Vector3();
  CG.feyTick = function (dt, paused) {
    if (paused) return;
    // flight: motion blur, wind streaks past the camera
    const sp = body.vel.length();
    flyK += ((body.flying ? Math.min(1, sp / 40) : 0) - flyK) * Math.min(1, dt * 3);
    post.u.uFly.value = flyK;
    if (body.flying && Math.random() < dt * (2 + sp * 0.25)) {
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      const side = Math.random() < 0.5 ? -1 : 1;
      const o = camera.position.clone().addScaledVector(right, side * rnd(0.8, 1.6)).add(new THREE.Vector3(0, -rnd(0.4, 1.2), 0));
      o.addScaledVector(body.vel, 0.05);
      fx.emit({ x: o.x, y: o.y, z: o.z, vx: -body.vel.x * 0.1 + rnd(-0.3, 0.3), vy: rnd(-0.3, 0.3), vz: -body.vel.z * 0.1 + rnd(-0.3, 0.3), r: 0.35, g: 0.9, b: 0.85, size: rnd(0.03, 0.07), life: rnd(0.6, 1.2), atlas: 0, drag: 0.8 });
    }
    // haste: quicksilver footfalls
    if (body.haste > 0.1 && body.onGround && body.speed > 3 && Math.random() < dt * 5) {
      const p = body.pos;
      fx.emit({ x: p.x + rnd(-0.3, 0.3), y: p.y + 0.05, z: p.z + rnd(-0.3, 0.3), vx: rnd(-0.4, 0.4), vy: rnd(0.2, 0.6), vz: rnd(-0.4, 0.4), r: 0.9, g: 0.75, b: 0.35, size: rnd(0.03, 0.06), life: 0.6, atlas: 0, drag: 2 });
    }
    // fey-step warp
    warp = Math.max(0, warp - dt * 2.2);
    post.u.uWarp.value = Math.sin(warp * Math.PI) * 0.9;
    // wisp
    if (wisp.on) {
      const t = performance.now() * 0.001;
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      const target = camera.position.clone().addScaledVector(right, -0.9).add(new THREE.Vector3(0, 0.55 + Math.sin(t * 1.7) * 0.15, 0));
      const back = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion); back.y = 0;
      target.addScaledVector(back, 0.4);
      wisp.pos.lerp(target, 1 - Math.exp(-dt * 5));
      if (wisp.pos.distanceTo(target) > 20) wisp.pos.copy(target);
      wisp.orb.position.copy(wisp.pos);
      if (wisp.light) { wisp.light.position.copy(wisp.pos); wisp.light.intensity = 38 + Math.sin(t * 7) * 3; }
      if (Math.random() < dt * 6) fx.emit({ x: wisp.pos.x, y: wisp.pos.y, z: wisp.pos.z, vx: rnd(-0.3, 0.3), vy: rnd(-0.1, 0.4), vz: rnd(-0.3, 0.3), r: 1.4, g: 1.6, b: 2.4, size: rnd(0.04, 0.1), life: rnd(0.5, 1.2), atlas: 1, drag: 1 });
    }
    // the staff crystal breathes a little light
    if (Math.random() < dt * 2.5 && !P.dead) {
      const t = staff.tipWorld(), c = staff.color;
      fx.emit({ x: t.x, y: t.y, z: t.z, vx: rnd(-0.2, 0.2), vy: rnd(0.1, 0.5), vz: rnd(-0.2, 0.2), r: c.r * 1.2, g: c.g * 1.2, b: c.b * 1.2, size: 0.02, life: 0.7, atlas: 0, drag: 1 });
    }
  };

  // ------------------------------------------------ Feywild HUD: compass, clock, region banner
  const $ = (id) => document.getElementById(id);
  const compass = $('compass'), clock = $('feyClock'), banner = $('region');
  const bName = banner.querySelector('.name'), bSub = banner.querySelector('.sub');
  CG.fey.banner = (name, sub, col) => {
    bName.textContent = name; bSub.textContent = sub; bSub.style.color = col || '';
    banner.classList.remove('show'); void banner.offsetWidth; banner.classList.add('show');
  };
  let hudT = 0;
  const sn = ['Spring', 'Summer', 'Autumn', 'Winter'];
  CG.feyHud = function (dt, S) {
    const deg = ((-body.yaw * 180 / Math.PI) % 360 + 360) % 360;
    compass.style.backgroundPosition = `${-deg * 2 + 180}px 0`;
    hudT -= dt; if (hudT > 0) return; hudT = 0.5;
    const t = CG.fey.sky.timeOfDay;
    const hh = Math.floor(t), mm = Math.floor((t - hh) * 60);
    const phase = t < 5 ? 'Deep Night' : t < 7 ? 'Dawn' : t < 11 ? 'Morning' : t < 14 ? 'Midday' : t < 17.5 ? 'Afternoon' : t < 19.5 ? 'Golden Hour' : t < 21 ? 'Dusk' : 'Night';
    let si = 0; for (let k = 1; k < 4; k++) if (S[k] > S[si]) si = k;
    clock.innerHTML = `<span class="t">${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}</span><span class="p">${phase} · Court of ${sn[si]}</span>`;
  };
}
