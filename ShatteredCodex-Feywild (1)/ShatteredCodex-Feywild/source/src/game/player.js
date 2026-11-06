// First-person wizard controller: walking, sprinting, jumping, swimming,
// flight, ice, bouncy toadstool caps, floating islands, collisions.
import * as THREE from 'three';
import { WTYPE_ICE, WTYPE_LAVA, WTYPE_WATER } from '../world/constants.js';

const EYE = 1.68;

export class Player {
  constructor(query, camera) {
    this.q = query;
    this.camera = camera;
    this.pos = new THREE.Vector3(0, 0, 0);
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.onGround = false;
    this.flying = false;
    this.swimming = false;
    this.inLava = false;
    this.headUnder = false;
    this.haste = 0;        // 0..1 effect strength
    this.hasteTime = 0;
    this.featherTime = 0;
    this.sensitivity = 0.0022;
    this.invertY = false;
    this.bobPhase = 0;
    this.stepAcc = 0;
    this.shake = 0;
    this.fovKick = 0;
    this.landT = 0;
    this.onStep = null;
    this.onBounce = null;
    this.onSplash = null;
    this.surface = 'grass';
    this.eye = new THREE.Vector3();
    // gameplay hooks (set by the Codex layer)
    this.walkSpeed = 5.6;      // m/s before sprint
    this.flySpeed = 24;
    this.hasteBoost = 1.4;     // extra speed at full haste
    this.waterWalk = false;    // walk on water / lava crust
    this.frozen = false;       // stunned: no movement input
    this.lavaBounce = true;
    this.lastImpact = 0;
    this.onLand = null;
  }

  spawn(x, z) {
    this.pos.set(x, this.q.groundAt(x, z) + 0.1, z);
    this.vel.set(0, 0, 0);
  }

  get speed() { return Math.hypot(this.vel.x, this.vel.z); }

  update(dt, input) {
    // look
    this.yaw -= input.mouseDX * this.sensitivity;
    this.pitch -= input.mouseDY * this.sensitivity * (this.invertY ? -1 : 1);
    this.pitch = Math.max(-1.55, Math.min(1.55, this.pitch));

    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const wish = new THREE.Vector3();
    let fwdAmt = 0, sideAmt = 0;
    if (!this.frozen) {
      if (input.down('KeyW') || input.down('ArrowUp')) fwdAmt += 1;
      if (input.down('KeyS') || input.down('ArrowDown')) fwdAmt -= 1;
      if (input.down('KeyD') || input.down('ArrowRight')) sideAmt += 1;
      if (input.down('KeyA') || input.down('ArrowLeft')) sideAmt -= 1;
      if (input.joy && input.joy.active) { fwdAmt += input.joy.y; sideAmt += input.joy.x; }
    }
    wish.addScaledVector(fwd, fwdAmt).addScaledVector(right, sideAmt);
    if (wish.lengthSq() > 1) wish.normalize();
    const sprint = input.down('ShiftLeft') || input.down('ShiftRight');
    const hasteMul = 1 + this.hasteBoost * this.haste;

    if (this.hasteTime > 0) { this.hasteTime -= dt; this.haste = Math.min(1, this.haste + dt * 3); }
    else this.haste = Math.max(0, this.haste - dt * 1.5);
    if (this.featherTime > 0) this.featherTime -= dt;

    const water = this.q.water(this.pos.x, this.pos.z);
    const ground0 = this.q.groundAt(this.pos.x, this.pos.z, this.pos.y);

    if (this.flying) {
      // full 3D flight in look direction
      const look = new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
      const w3 = new THREE.Vector3();
      w3.addScaledVector(look, fwdAmt).addScaledVector(right, sideAmt);
      if (!this.frozen && input.down('Space')) w3.y += 1;
      if (!this.frozen && (input.down('ControlLeft') || input.down('KeyC'))) w3.y -= 1;
      if (w3.lengthSq() > 1) w3.normalize();
      const sp = this.flySpeed * (sprint ? 2.2 : 1) * hasteMul;
      const k = 1 - Math.exp(-dt * 2.5);
      this.vel.lerp(w3.multiplyScalar(sp), k);
      // gentle hover bob
      this.vel.y += Math.sin(performance.now() * 0.002) * 0.05;
    } else {
      this.swimming = false;
      this.inLava = false;
      const walkOn = this.waterWalk && water.type !== WTYPE_ICE && water.h > ground0 && this.pos.y > water.h - 0.35;
      const feetInWater = !walkOn && water.type !== WTYPE_ICE && water.h > ground0 && this.pos.y < water.h - 0.9;
      if (walkOn && water.type === WTYPE_LAVA) this.inLava = true;
      if (feetInWater && water.type === WTYPE_LAVA) {
        // fey lava: burns and bounces you out
        this.inLava = true;
        this.vel.y = 11;
        this.pos.y = Math.max(this.pos.y, water.h - 0.5);
        if (this.onSplash) this.onSplash('lava');
      } else if (feetInWater) {
        this.swimming = true;
      }
      const baseSpeed = this.swimming ? this.walkSpeed * 0.57 : this.walkSpeed;
      const sp = baseSpeed * (sprint ? 1.75 : 1) * hasteMul;
      const target = wish.clone().multiplyScalar(sp);
      const accel = this.onGround ? 14 : (this.swimming ? 5 : 3.5);
      const k = 1 - Math.exp(-dt * accel);
      this.vel.x += (target.x - this.vel.x) * k;
      this.vel.z += (target.z - this.vel.z) * k;
      if (this.swimming) {
        const surf = water.h - 1.45;
        this.vel.y += (surf - this.pos.y) * 6 * dt - this.vel.y * 2.5 * dt;
        if (input.down('Space')) this.vel.y += 12 * dt;
        if (input.down('ControlLeft') || input.down('KeyC')) this.vel.y -= 10 * dt;
        if (input.pressed.has('Space') && this.pos.y > surf - 0.3) this.vel.y = 6;
      } else {
        const g = this.featherTime > 0 ? 5 : 21;
        this.vel.y -= g * dt;
        if (this.featherTime > 0) this.vel.y = Math.max(this.vel.y, -3.5);
        if (this.onGround && !this.frozen && input.pressed.has('Space')) {
          this.vel.y = 7.2 * (1 + 0.35 * this.haste);
          this.onGround = false;
        }
      }
    }

    // integrate horizontally with collision
    const nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.z * dt;
    this.pos.x = nx; this.pos.z = nz;
    this.pos.y += this.vel.y * dt;
    this.collide();
    // world bounds (soft)
    const r = Math.hypot(this.pos.x, this.pos.z);
    if (r > 1500) { this.pos.x *= 1500 / r; this.pos.z *= 1500 / r; }
    if (this.pos.y > 900) { this.pos.y = 900; this.vel.y = Math.min(0, this.vel.y); }

    // ground
    let ground = this.q.groundAt(this.pos.x, this.pos.z, this.pos.y);
    if (this.waterWalk && !this.flying) { const w2 = this.q.water(this.pos.x, this.pos.z); if (w2.h > ground && this.pos.y > w2.h - 0.35) ground = w2.h; }
    const wasOnGround = this.onGround;
    if (this.pos.y <= ground + 0.02) {
      const impact = -this.vel.y;
      this.pos.y = ground;
      const plat = this.platformAt(this.pos.x, this.pos.z, ground);
      if (plat && plat.bouncy && impact > 4 && !this.flying) {
        this.vel.y = Math.min(22, impact * 0.85 + 6);
        this.onGround = false;
        if (this.onBounce) this.onBounce();
      } else {
        if (this.vel.y < 0) this.vel.y = 0;
        this.onGround = !this.flying;
        if (!wasOnGround && impact > 7) { this.landT = Math.min(1, impact / 20); this.shake = Math.max(this.shake, impact / 60); if (this.onLand) this.onLand(impact); }
      }
    } else if (!this.swimming) {
      // stick to ground when walking down slopes
      if (wasOnGround && !this.flying && this.vel.y <= 0 && this.pos.y - ground < 0.6) { this.pos.y = ground; this.onGround = true; }
      else this.onGround = false;
    }
    if (this.swimming) this.onGround = false;

    // water entry splash
    const headY = this.pos.y + EYE;
    const under = water.h > -999 && water.type === WTYPE_WATER && headY < water.h && water.h > this.q.height(this.pos.x, this.pos.z);
    if (under !== this.headUnder && this.onSplash) this.onSplash(under ? 'in' : 'out');
    this.headUnder = under;

    // surface type for footsteps
    this.surface = this.surfaceAt();

    // camera
    const moving = this.onGround && this.speed > 0.5;
    if (moving) {
      const prev = this.bobPhase;
      this.bobPhase += dt * this.speed * 1.55;
      if (Math.floor(prev / Math.PI) !== Math.floor(this.bobPhase / Math.PI) && this.onStep) this.onStep(this.surface);
    } else {
      this.bobPhase += (Math.round(this.bobPhase / Math.PI) * Math.PI - this.bobPhase) * Math.min(1, dt * 6);
    }
    const bob = Math.sin(this.bobPhase * 2) * 0.045 * Math.min(1, this.speed / 5);
    const sway = Math.cos(this.bobPhase) * 0.03 * Math.min(1, this.speed / 5);
    this.landT = Math.max(0, this.landT - dt * 3);
    this.shake = Math.max(0, this.shake - dt * 1.8);
    const sh = this.shake * this.shake;
    this.eye.set(this.pos.x + right.x * sway, this.pos.y + EYE + bob - this.landT * 0.25, this.pos.z + right.z * sway);
    this.camera.position.copy(this.eye);
    this.camera.position.x += (Math.random() - 0.5) * sh * 0.6;
    this.camera.position.y += (Math.random() - 0.5) * sh * 0.6;
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(this.pitch + (Math.random() - 0.5) * sh * 0.05, this.yaw, (Math.random() - 0.5) * sh * 0.03 - (this.flying ? this.vel.dot(right) * 0.004 : 0));
  }

  platformAt(x, z, y) {
    for (const p of this.q.platforms) {
      const dx = x - p.x, dz = z - p.z;
      if (dx * dx + dz * dz < p.r * p.r) { const t = p.getTop(x, z); if (t !== null && Math.abs(t - y) < 0.1) return p; }
    }
    return null;
  }

  collide() {
    const R = 0.42;
    for (let iter = 0; iter < 2; iter++) {
      const list = this.q.nearColliders(this.pos.x, this.pos.z);
      for (const c of list) {
        if (this.pos.y + 1.7 < c.y0 || this.pos.y > c.y1) continue;
        const dx = this.pos.x - c.x, dz = this.pos.z - c.z;
        const d = Math.hypot(dx, dz), m = c.r + R;
        if (d < m && d > 1e-4) {
          const push = m - d;
          this.pos.x += dx / d * push; this.pos.z += dz / d * push;
          const nx = dx / d, nz = dz / d;
          const vn = this.vel.x * nx + this.vel.z * nz;
          if (vn < 0) { this.vel.x -= vn * nx; this.vel.z -= vn * nz; }
        }
      }
    }
  }

  surfaceAt() {
    const f = this.q.feat(this.pos.x, this.pos.z);
    const s = this.q.season(this.pos.x, this.pos.z, [0, 0, 0, 0]);
    const w = this.q.water(this.pos.x, this.pos.z);
    if (w.type === WTYPE_ICE && Math.abs(this.pos.y - w.h) < 0.3) return 'ice';
    if (f.hub > 0.5) return 'stone';
    if (f.leaf > 0.3 || s[2] > 0.6) return 'leaves';
    if (s[3] > 0.55) return 'snow';
    if (f.wet > 0.8) return 'water';
    return 'grass';
  }
}
