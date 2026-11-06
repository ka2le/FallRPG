// Spellcasting: a small, extensible spell framework + the first five spells.
// Each spell: { id, name, key, color, icon, cooldown, description, press(), release(), update(dt), active? }
import * as THREE from 'three';
import { feyPatch } from '../render/shaderLib.js';
import { WTYPE_WATER, WTYPE_LAVA } from '../world/constants.js';

const rnd = (a, b) => a + Math.random() * (b - a);
function randDir() { const z = rnd(-1, 1), a = rnd(0, Math.PI * 2), r = Math.sqrt(1 - z * z); return new THREE.Vector3(r * Math.cos(a), z, r * Math.sin(a)); }

// ------------------------------------------------------------------ light pool
class LightPool {
  constructor(scene, n = 4) {
    this.lights = [];
    for (let i = 0; i < n; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 0, 2);
      l.userData.busy = false;
      scene.add(l);
      this.lights.push(l);
    }
  }
  get() { const l = this.lights.find((x) => !x.userData.busy); if (l) l.userData.busy = true; return l || null; }
  free(l) { if (!l) return; l.userData.busy = false; l.intensity = 0; }
}

// ------------------------------------------------------------------ staff
function makeStaff() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.75, metalness: 0 });
  feyPatch(wood, { key: 'staffwood', snow: 0 });
  const shaftPts = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; shaftPts.push(new THREE.Vector3(Math.sin(t * 7) * 0.012, t * 1.25 - 0.9, Math.cos(t * 5) * 0.012)); }
  const shaft = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(shaftPts), 24, 0.022, 7), wood);
  g.add(shaft);
  // twisted head claws
  for (let k = 0; k < 3; k++) {
    const a = k / 3 * Math.PI * 2;
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const r = 0.02 + Math.sin(t * Math.PI) * 0.07;
      pts.push(new THREE.Vector3(Math.cos(a + t * 1.5) * r, 0.33 + t * 0.2, Math.sin(a + t * 1.5) * r));
    }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.011, 5), wood));
  }
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.008, 6, 14), new THREE.MeshStandardMaterial({ color: 0xd8b060, metalness: 1, roughness: 0.3 }));
  band.rotation.x = Math.PI / 2; band.position.y = 0.3;
  g.add(band);
  const crystalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2, roughness: 0.1, metalness: 0 });
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), crystalMat);
  crystal.scale.set(1, 1.7, 1);
  crystal.position.y = 0.44;
  g.add(crystal);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.position.y = 0.44;
  g.add(halo);
  g.userData = { crystal, crystalMat, halo };
  g.traverse((o) => { o.frustumCulled = false; o.castShadow = false; });
  return g;
}

// ------------------------------------------------------------------ system
export class SpellSystem {
  constructor(ctx) {
    this.ctx = ctx;
    this.lights = new LightPool(ctx.scene, 4);
    ctx.lights = this.lights;
    this.staff = makeStaff();
    ctx.camera.add(this.staff);
    this.staffBase = new THREE.Vector3(0.36, -0.44, -0.78);
    this.staff.scale.setScalar(0.85);
    this.staff.position.copy(this.staffBase);
    this.staff.rotation.set(0.12, 0.25, -0.18);
    this.recoil = 0;
    this.swayX = 0; this.swayY = 0;
    this.spells = [new Fireball(ctx, this), new Teleport(ctx, this), new Flight(ctx, this), new Haste(ctx, this), new WispLight(ctx, this)];
    this.selected = 0;
    this.crystalColor = new THREE.Color();
    this.tip = new THREE.Vector3();
  }

  select(i) {
    if (i < 0 || i >= this.spells.length || i === this.selected) return;
    const cur = this.spells[this.selected];
    if (cur.aiming) cur.cancel();
    this.selected = i;
    this.ctx.hud.selectSpell(i);
  }

  tipWorld() {
    this.staff.userData.crystal.getWorldPosition(this.tip);
    return this.tip;
  }

  update(dt, input) {
    for (let i = 0; i < this.spells.length; i++) if (input.pressed.has('Digit' + (i + 1))) this.select(i);
    if (input.wheel) this.select((this.selected + (input.wheel > 0 ? 1 : -1) + this.spells.length) % this.spells.length);
    const sp = this.spells[this.selected];
    if (input.btnPressed.has(0)) sp.press();
    if (input.btnReleased.has(0)) sp.release();
    // quick-cast hotkeys
    if (input.pressed.has('KeyF')) this.spells[2].press();
    if (input.pressed.has('KeyQ')) this.spells[3].press();
    if (input.pressed.has('KeyR')) this.spells[4].press();
    for (const s of this.spells) { s.cd = Math.max(0, s.cd - dt); s.update(dt); }

    // staff animation
    const p = this.ctx.player;
    this.recoil = Math.max(0, this.recoil - dt * 4);
    this.swayX += (-input.mouseDX * 0.0006 - this.swayX) * Math.min(1, dt * 8);
    this.swayY += (input.mouseDY * 0.0006 - this.swayY) * Math.min(1, dt * 8);
    const bob = p.onGround ? Math.sin(p.bobPhase * 2) * 0.012 * Math.min(1, p.speed / 5) : 0;
    const bobX = p.onGround ? Math.cos(p.bobPhase) * 0.01 * Math.min(1, p.speed / 5) : 0;
    const r = this.recoil;
    this.staff.position.set(this.staffBase.x + this.swayX + bobX, this.staffBase.y + this.swayY + bob + r * 0.06, this.staffBase.z - r * 0.12);
    this.staff.rotation.set(0.12 - r * 0.5, 0.25, -0.18 + this.swayX * 2);
    // crystal colour follows selected spell
    this.crystalColor.lerp(sp.color, Math.min(1, dt * 6));
    const cm = this.staff.userData.crystalMat;
    cm.color.copy(this.crystalColor);
    cm.emissive.copy(this.crystalColor);
    const pulse = 0.3 + 0.12 * Math.sin(performance.now() * 0.004) + r * 1.4 + (sp.aiming ? 0.5 : 0);
    cm.emissiveIntensity = pulse;
    this.staff.userData.halo.material.color.copy(this.crystalColor);
    this.staff.userData.crystal.rotation.y += dt * 1.5;
    // ambient sparkle from the crystal
    if (Math.random() < dt * 2.5) {
      const t = this.tipWorld();
      const c = this.crystalColor;
      this.ctx.fx.emit({ x: t.x, y: t.y, z: t.z, vx: rnd(-0.2, 0.2), vy: rnd(0.1, 0.5), vz: rnd(-0.2, 0.2), r: c.r * 1.2, g: c.g * 1.2, b: c.b * 1.2, size: 0.02, life: 0.7, atlas: 0, drag: 1 });
    }
  }
}

class Spell {
  constructor(ctx, sys) { this.ctx = ctx; this.sys = sys; this.cd = 0; this.aiming = false; this.active = false; }
  press() {}
  release() {}
  cancel() { this.aiming = false; }
  update() {}
  ready() { if (this.cd > 0) { this.ctx.audio.fizzle(); return false; } return true; }
  lookDir() { const d = new THREE.Vector3(); this.ctx.camera.getWorldDirection(d); return d; }
}

// ------------------------------------------------------------------ fireball
class Fireball extends Spell {
  constructor(ctx, sys) {
    super(ctx, sys);
    this.id = 'fireball'; this.name = 'Fireball'; this.color = new THREE.Color(1.0, 0.45, 0.1); this.cooldown = 0.45;
    this.desc = 'Hurl a roaring ball of fey-fire. Detonates on impact.';
    this.projectiles = [];
    this.coreGeo = new THREE.IcosahedronGeometry(0.28, 2);
    this.coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 3, 0.9) });
    this.rings = [];
    this.ringGeo = new THREE.RingGeometry(0.8, 1.0, 48);
    this.ringGeo.rotateX(-Math.PI / 2);
  }
  press() {
    if (!this.ready()) return;
    this.cd = this.cooldown;
    const origin = this.sys.tipWorld().clone();
    const dir = this.lookDir();
    // aim from the eye so it goes where the crosshair is
    const eye = this.ctx.camera.position;
    const hitT = this.ctx.query.raycast(eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, 400, true);
    const target = hitT > 0 ? eye.clone().addScaledVector(dir, hitT) : eye.clone().addScaledVector(dir, 400);
    const vdir = target.sub(origin).normalize();
    const mesh = new THREE.Mesh(this.coreGeo, this.coreMat);
    mesh.position.copy(origin);
    this.ctx.scene.add(mesh);
    const light = this.ctx.lights.get();
    if (light) { light.color.setRGB(1, 0.5, 0.15); light.intensity = 120; light.position.copy(origin); }
    this.projectiles.push({ pos: origin, vel: vdir.multiplyScalar(52).add(this.ctx.player.vel.clone().multiplyScalar(0.5)), life: 6, mesh, light });
    this.sys.recoil = 1;
    this.ctx.audio.fireCast();
    for (let i = 0; i < 25; i++) {
      const d = randDir().multiplyScalar(rnd(1, 4));
      this.ctx.fx.emit({ x: origin.x, y: origin.y, z: origin.z, vx: d.x, vy: d.y, vz: d.z, r: 6, g: 2, b: 0.4, size: 0.2, grow: 0.8, life: 0.35, atlas: 0, drag: 4 });
    }
  }
  update(dt) {
    const q = this.ctx.query, fx = this.ctx.fx;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      let hit = null;
      const steps = 4;
      for (let s = 0; s < steps && !hit; s++) {
        p.vel.y -= 1.5 * dt / steps;
        p.pos.addScaledVector(p.vel, dt / steps);
        const g = q.height(p.pos.x, p.pos.z);
        const w = q.water(p.pos.x, p.pos.z);
        if (p.pos.y < g) hit = { type: 'ground' };
        else if (w.h > g && p.pos.y < w.h) hit = { type: w.type === WTYPE_WATER ? 'water' : 'ground' };
        else {
          for (const c of q.nearColliders(p.pos.x, p.pos.z)) {
            if (p.pos.y < c.y0 || p.pos.y > c.y1) continue;
            if (Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < c.r + 0.3) { hit = { type: 'object' }; break; }
          }
          if (!hit) for (const pl of q.platforms) {
            const dx = p.pos.x - pl.x, dz = p.pos.z - pl.z;
            if (dx * dx + dz * dz < pl.r * pl.r) { const t = pl.getTop(p.pos.x, p.pos.z); if (t !== null && p.pos.y < t && p.pos.y > t - 8) { hit = { type: 'object' }; break; } }
          }
        }
      }
      p.mesh.position.copy(p.pos);
      p.mesh.rotation.x += dt * 5; p.mesh.rotation.y += dt * 7;
      const sc = 1 + 0.15 * Math.sin(performance.now() * 0.03);
      p.mesh.scale.setScalar(sc);
      if (p.light) { p.light.position.copy(p.pos); p.light.intensity = 90 + Math.random() * 30; }
      // trail
      const n = 5;
      for (let k = 0; k < n; k++) {
        const o = randDir().multiplyScalar(0.15);
        fx.emit({ x: p.pos.x + o.x, y: p.pos.y + o.y, z: p.pos.z + o.z, vx: o.x * 4 - p.vel.x * 0.05, vy: o.y * 4 + 0.5, vz: o.z * 4 - p.vel.z * 0.05, r: rnd(2.6, 4.5), g: rnd(0.8, 1.5), b: 0.2, size: rnd(0.3, 0.5), grow: -0.4, life: rnd(0.2, 0.4), atlas: 0, drag: 2 });
      }
      if (Math.random() < 0.7) fx.emit({ x: p.pos.x, y: p.pos.y, z: p.pos.z, vx: rnd(-1, 1), vy: rnd(-1, 1), vz: rnd(-1, 1), r: 8, g: 4, b: 1, size: 0.08, life: rnd(0.4, 0.9), atlas: 1, gravity: 3, drag: 1 });
      if (Math.random() < 0.5) fx.emit({ additive: false, x: p.pos.x, y: p.pos.y, z: p.pos.z, vx: 0, vy: 0.8, vz: 0, r: 0.12, g: 0.1, b: 0.1, a: 0.35, size: 0.5, grow: 1.5, life: 1.4, atlas: 3, drag: 1, spin: rnd(-1, 1) });
      if (hit || p.life <= 0) {
        this.explode(p.pos, hit ? hit.type : 'air');
        this.ctx.scene.remove(p.mesh);
        this.ctx.lights.free(p.light);
        this.projectiles.splice(i, 1);
      }
    }
    // flashes & shockwave rings
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.t += dt;
      const k = r.t / r.dur;
      if (r.light) r.light.intensity = r.i0 * Math.pow(1 - Math.min(1, k), 2);
      if (r.mesh) { r.mesh.scale.setScalar(1 + k * 14); r.mesh.material.opacity = (1 - k) * 0.8; }
      if (k >= 1) {
        if (r.mesh) { this.ctx.scene.remove(r.mesh); r.mesh.material.dispose(); }
        this.ctx.lights.free(r.light);
        this.rings.splice(i, 1);
      }
    }
  }
  explode(pos, type) {
    const fx = this.ctx.fx;
    const dist = this.ctx.camera.position.distanceTo(pos);
    if (type === 'water') {
      this.ctx.audio.sizzle();
      for (let i = 0; i < 70; i++) {
        const d = randDir(); d.y = Math.abs(d.y) * 2;
        fx.emit({ additive: false, x: pos.x, y: pos.y, z: pos.z, vx: d.x * 3, vy: d.y * 4, vz: d.z * 3, r: 0.9, g: 0.95, b: 1, a: 0.5, size: 0.6, grow: 3, life: rnd(1.2, 2.2), atlas: 3, drag: 1.5, spin: rnd(-1, 1) });
        if (i < 40) fx.emit({ x: pos.x, y: pos.y, z: pos.z, vx: d.x * 5, vy: d.y * 6, vz: d.z * 5, r: 1.5, g: 1.8, b: 2.2, size: 0.1, life: 0.8, gravity: 9, atlas: 0 });
      }
      return;
    }
    this.ctx.audio.explosion(dist);
    this.ctx.player.shake = Math.max(this.ctx.player.shake, Math.max(0, 1.1 - dist / 60));
    // knockback (rocket-jump!)
    const pp = this.ctx.player.pos.clone().add(new THREE.Vector3(0, 1, 0));
    const pd = pp.distanceTo(pos);
    if (pd < 7) {
      const push = pp.sub(pos).normalize().multiplyScalar((7 - pd) * 3.2);
      this.ctx.player.vel.add(push);
      this.ctx.player.onGround = false;
    }
    for (let i = 0; i < 140; i++) {
      const d = randDir().multiplyScalar(rnd(4, 17));
      d.y = Math.abs(d.y) * 0.8 + 1;
      fx.emit({ x: pos.x, y: pos.y + 0.3, z: pos.z, vx: d.x, vy: d.y, vz: d.z, r: rnd(3, 6), g: rnd(1.0, 2.2), b: rnd(0.2, 0.45), size: rnd(0.6, 1.3), grow: 2.2, life: rnd(0.45, 1.0), atlas: 0, drag: 3.5 });
    }
    for (let i = 0; i < 60; i++) {
      const d = randDir().multiplyScalar(rnd(10, 30)); d.y = Math.abs(d.y) + 3;
      fx.emit({ x: pos.x, y: pos.y + 0.3, z: pos.z, vx: d.x, vy: d.y, vz: d.z, r: 6, g: 3, b: 0.7, size: rnd(0.06, 0.12), life: rnd(0.7, 1.6), atlas: 0, gravity: 14, drag: 1.2 });
    }
    for (let i = 0; i < 45; i++) {
      const d = randDir().multiplyScalar(rnd(1, 5)); d.y = Math.abs(d.y) + 1.5;
      fx.emit({ additive: false, x: pos.x, y: pos.y + 0.5, z: pos.z, vx: d.x, vy: d.y, vz: d.z, r: 0.1, g: 0.08, b: 0.08, a: 0.55, size: rnd(1, 2), grow: 2.5, life: rnd(2, 3.5), atlas: 3, drag: 1.2, spin: rnd(-0.6, 0.6) });
    }
    // fey sparkles
    for (let i = 0; i < 12; i++) {
      const d = randDir().multiplyScalar(rnd(2, 8));
      fx.emit({ x: pos.x, y: pos.y + 1, z: pos.z, vx: d.x, vy: d.y + 2, vz: d.z, r: 3, g: 1.2, b: 3.5, size: 0.12, life: rnd(1, 2), atlas: 1, drag: 1.5, gravity: -0.5 });
    }
    const light = this.ctx.lights.get();
    if (light) { light.color.setRGB(1, 0.55, 0.2); light.position.copy(pos).y += 1.5; }
    const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 1.8, 0.6), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(this.ringGeo, ringMat);
    ring.position.copy(pos).y += 0.3;
    this.ctx.scene.add(ring);
    this.rings.push({ t: 0, dur: 0.6, light, i0: 1400, mesh: ring });
  }
}

// ------------------------------------------------------------------ teleport
const RUNE_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const RUNE_FRAG = /* glsl */`
uniform float uTime; uniform vec3 uColor; uniform float uValid;
varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p), a = atan(p.y, p.x);
  float ring1 = smoothstep(0.03, 0.0, abs(r - 0.92)) + smoothstep(0.02, 0.0, abs(r - 0.62));
  float ra = a + uTime * 0.8;
  float seg = floor((ra / 6.2831 + 0.5) * 24.0);
  float glyph = step(0.4, h(vec2(seg, 1.0))) * step(0.68, r) * step(r, 0.86);
  float fa = fract((ra / 6.2831 + 0.5) * 24.0);
  glyph *= step(0.2, fa) * step(fa, 0.8) * step(0.5, h(vec2(seg, floor(r * 30.0))));
  float star = smoothstep(0.03, 0.0, abs(sin(a * 3.0 - uTime * 1.3) * 0.5 * r - 0.0) - 0.0) * step(r, 0.6);
  float inner = smoothstep(0.6, 0.0, r) * 0.3;
  float v = ring1 + glyph * 0.9 + star * 0.5 + inner;
  vec3 col = mix(vec3(3.0, 0.4, 0.3), uColor, uValid);
  gl_FragColor = vec4(col * v * (0.8 + 0.2 * sin(uTime * 6.0)), v * step(r, 1.0));
}`;

class Teleport extends Spell {
  constructor(ctx, sys) {
    super(ctx, sys);
    this.id = 'teleport'; this.name = 'Fey Step'; this.color = new THREE.Color(0.6, 0.35, 1.0); this.cooldown = 1.0;
    this.desc = 'Hold to aim, release to step through the Feywild to the marked spot.';
    this.range = 160;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(1.8, 0.9, 3.5) }, uValid: { value: 1 } },
      vertexShader: RUNE_VERT, fragmentShader: RUNE_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.marker = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), mat);
    this.marker.visible = false;
    this.marker.renderOrder = 7;
    const beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 0.6, 2.4), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const beamGeo = new THREE.CylinderGeometry(0.6, 1.2, 14, 24, 1, true);
    beamGeo.translate(0, 7, 0);
    this.beam = new THREE.Mesh(beamGeo, beamMat);
    this.beam.visible = false;
    ctx.scene.add(this.marker, this.beam);
    this.target = new THREE.Vector3();
    this.valid = false;
    this.warp = 0;
  }
  press() {
    if (!this.ready()) return;
    this.aiming = true;
    this.ctx.audio.teleportCharge();
  }
  cancel() { this.aiming = false; this.marker.visible = this.beam.visible = false; }
  release() {
    if (!this.aiming) return;
    this.aiming = false;
    this.marker.visible = this.beam.visible = false;
    if (!this.valid) { this.ctx.audio.fizzle(); return; }
    this.cd = this.cooldown;
    const pl = this.ctx.player;
    const from = pl.pos.clone();
    this.burst(from.clone().add(new THREE.Vector3(0, 1, 0)), true);
    pl.pos.copy(this.target).y += 0.05;
    pl.vel.set(0, pl.flying ? 0 : 0, 0);
    this.burst(this.target.clone().add(new THREE.Vector3(0, 1, 0)), false);
    this.warp = 1;
    this.ctx.post.u.uFlash.value = 0.35;
    this.ctx.post.u.uFlashColor.value.setRGB(0.85, 0.7, 1.0);
    this.ctx.audio.teleport();
    this.sys.recoil = 1;
  }
  burst(p, implode) {
    const fx = this.ctx.fx;
    for (let i = 0; i < 55; i++) {
      const d = randDir();
      const sp = rnd(2, 7);
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
  update(dt) {
    this.marker.material.uniforms.uTime.value += dt;
    this.warp = Math.max(0, this.warp - dt * 2.2);
    this.ctx.post.u.uWarp.value = Math.sin(this.warp * Math.PI) * 0.9;
    if (!this.aiming) return;
    const cam = this.ctx.camera, q = this.ctx.query;
    const dir = this.lookDir();
    const t = q.raycast(cam.position.x, cam.position.y, cam.position.z, dir.x, dir.y, dir.z, this.range, true);
    this.valid = false;
    if (t > 0) {
      this.target.copy(cam.position).addScaledVector(dir, t);
      const w = q.water(this.target.x, this.target.z);
      this.valid = !(w.type === WTYPE_LAVA && w.h > q.height(this.target.x, this.target.z));
      const ground = q.groundAt(this.target.x, this.target.z, this.target.y + 1);
      this.target.y = Math.max(this.target.y, ground);
    } else if (this.ctx.player.flying) {
      this.target.copy(cam.position).addScaledVector(dir, 70);
      this.valid = true;
    } else {
      this.target.copy(cam.position).addScaledVector(dir, this.range);
    }
    const n = q.normal(this.target.x, this.target.z, new THREE.Vector3());
    this.marker.visible = true; this.beam.visible = this.valid;
    this.marker.position.copy(this.target).addScaledVector(n, 0.15);
    this.marker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    this.marker.material.uniforms.uValid.value = this.valid ? 1 : 0;
    this.beam.position.copy(this.target);
    this.beam.rotation.y += dt;
    if (Math.random() < dt * 10 && this.valid) {
      const a = Math.random() * Math.PI * 2;
      this.ctx.fx.emit({ x: this.target.x + Math.cos(a) * 1.4, y: this.target.y + 0.1, z: this.target.z + Math.sin(a) * 1.4, vx: 0, vy: rnd(1, 4), vz: 0, r: 1.5, g: 0.8, b: 3, size: 0.1, life: 1, atlas: 1 });
    }
  }
}

// ------------------------------------------------------------------ flight
class Flight extends Spell {
  constructor(ctx, sys) {
    super(ctx, sys);
    this.id = 'fly'; this.name = 'Wings of the Wind'; this.color = new THREE.Color(0.4, 1.0, 0.85); this.cooldown = 0.5;
    this.desc = 'Toggle flight. WASD flies where you look, Space rises, Ctrl/C sinks, Shift to soar faster.';
    this.fly = 0;
  }
  press() {
    if (!this.ready()) return;
    this.cd = this.cooldown;
    const pl = this.ctx.player;
    pl.flying = !pl.flying;
    this.active = pl.flying;
    if (pl.flying) { pl.vel.y = Math.max(pl.vel.y, 6); pl.onGround = false; }
    else pl.featherTime = 4;
    this.ctx.audio.fly(pl.flying);
    this.sys.recoil = 0.6;
    const p = pl.pos;
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2, r = rnd(0.5, 2.5);
      this.ctx.fx.emit({ x: p.x + Math.cos(a) * r, y: p.y + 0.1, z: p.z + Math.sin(a) * r, vx: Math.cos(a) * 4, vy: rnd(1, 5), vz: Math.sin(a) * 4, r: 0.5, g: 1.3, b: 1.1, size: rnd(0.06, 0.14), life: rnd(0.6, 1.0), atlas: 0, drag: 2.5 });
    }
  }
  update(dt) {
    const pl = this.ctx.player;
    this.active = pl.flying;
    const sp = pl.vel.length();
    this.fly += ((pl.flying ? Math.min(1, sp / 40) : 0) - this.fly) * Math.min(1, dt * 3);
    this.ctx.post.u.uFly.value = this.fly;
    if (pl.flying && Math.random() < dt * (2 + sp * 0.25)) {
      const cam = this.ctx.camera;
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
      const side = Math.random() < 0.5 ? -1 : 1;
      const o = cam.position.clone().addScaledVector(right, side * rnd(0.8, 1.6)).add(new THREE.Vector3(0, -rnd(0.4, 1.2), 0));
      o.addScaledVector(pl.vel, 0.05);
      this.ctx.fx.emit({ x: o.x, y: o.y, z: o.z, vx: -pl.vel.x * 0.1 + rnd(-0.3, 0.3), vy: rnd(-0.3, 0.3), vz: -pl.vel.z * 0.1 + rnd(-0.3, 0.3), r: 0.35, g: 0.9, b: 0.85, size: rnd(0.03, 0.07), life: rnd(0.6, 1.2), atlas: 0, drag: 0.8 });
    }
  }
}

// ------------------------------------------------------------------ haste
class Haste extends Spell {
  constructor(ctx, sys) {
    super(ctx, sys);
    this.id = 'haste'; this.name = 'Quicksilver Haste'; this.color = new THREE.Color(1.0, 0.85, 0.2); this.cooldown = 2;
    this.desc = 'For 12 seconds, move faster, leap higher and fly swifter.';
    this.duration = 12;
    this.h = 0;
  }
  press() {
    if (!this.ready()) return;
    this.cd = this.cooldown;
    this.ctx.player.hasteTime = this.duration;
    this.ctx.audio.haste();
    this.ctx.post.u.uFlash.value = 0.08;
    this.ctx.post.u.uFlashColor.value.setRGB(1.0, 0.92, 0.7);
    this.sys.recoil = 0.7;
    const p = this.ctx.player.pos;
    for (let i = 0; i < 28; i++) {
      const a = i / 28 * Math.PI * 2;
      this.ctx.fx.emit({ x: p.x + Math.cos(a) * 0.7, y: p.y + 0.15, z: p.z + Math.sin(a) * 0.7, vx: Math.cos(a) * 2.2, vy: rnd(0.3, 0.9), vz: Math.sin(a) * 2.2, r: 1.3, g: 1.05, b: 0.45, size: 0.05, life: rnd(0.5, 0.9), atlas: 0, drag: 3 });
    }
  }
  update(dt) {
    const pl = this.ctx.player;
    this.active = pl.hasteTime > 0;
    this.ctx.post.u.uHaste.value = pl.haste;
    if (pl.haste > 0.1 && pl.onGround && pl.speed > 3 && Math.random() < dt * 5) {
      const t = performance.now() * 0.008;
      const a = t + Math.random() * 0.3;
      const p = pl.pos;
      this.ctx.fx.emit({ x: p.x + rnd(-0.3, 0.3), y: p.y + 0.05, z: p.z + rnd(-0.3, 0.3), vx: rnd(-0.4, 0.4), vy: rnd(0.2, 0.6), vz: rnd(-0.4, 0.4), r: 0.9, g: 0.75, b: 0.35, size: rnd(0.03, 0.06), life: 0.6, atlas: 0, drag: 2 });
    }
  }
}

// ------------------------------------------------------------------ wisp light
class WispLight extends Spell {
  constructor(ctx, sys) {
    super(ctx, sys);
    this.id = 'light'; this.name = 'Will-o\'-Wisp'; this.color = new THREE.Color(0.75, 0.85, 1.0); this.cooldown = 0.4;
    this.desc = 'Summon a lantern-wisp that follows you and lights the night.';
    this.orb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 6.5, 9) }));
    this.orb.visible = false;
    ctx.scene.add(this.orb);
    this.pos = new THREE.Vector3();
    this.light = null;
    this.on = false;
  }
  press() {
    if (!this.ready()) return;
    this.cd = this.cooldown;
    this.on = !this.on;
    this.active = this.on;
    this.ctx.audio.light(this.on);
    if (this.on) {
      this.light = this.ctx.lights.get();
      if (this.light) { this.light.color.setRGB(0.85, 0.85, 1.0); }
      this.pos.copy(this.sys.tipWorld());
      this.orb.visible = true;
    } else {
      this.ctx.lights.free(this.light); this.light = null;
      this.orb.visible = false;
      const p = this.pos;
      for (let i = 0; i < 40; i++) { const d = randDir().multiplyScalar(rnd(1, 3)); this.ctx.fx.emit({ x: p.x, y: p.y, z: p.z, vx: d.x, vy: d.y, vz: d.z, r: 2, g: 2.2, b: 3, size: 0.08, life: 0.8, atlas: 1, drag: 2 }); }
    }
    this.sys.recoil = 0.5;
  }
  update(dt) {
    if (!this.on) return;
    const cam = this.ctx.camera;
    const t = performance.now() * 0.001;
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    const target = cam.position.clone().addScaledVector(right, -0.9).add(new THREE.Vector3(0, 0.55 + Math.sin(t * 1.7) * 0.15, 0));
    const back = new THREE.Vector3(0, 0, 1).applyQuaternion(cam.quaternion); back.y = 0;
    target.addScaledVector(back, 0.4);
    this.pos.lerp(target, 1 - Math.exp(-dt * 5));
    if (this.pos.distanceTo(target) > 20) this.pos.copy(target);
    this.orb.position.copy(this.pos);
    if (this.light) { this.light.position.copy(this.pos); this.light.intensity = 38 + Math.sin(t * 7) * 3; }
    if (Math.random() < dt * 6) this.ctx.fx.emit({ x: this.pos.x, y: this.pos.y, z: this.pos.z, vx: rnd(-0.3, 0.3), vy: rnd(-0.1, 0.4), vz: rnd(-0.3, 0.3), r: 1.4, g: 1.6, b: 2.4, size: rnd(0.04, 0.1), life: rnd(0.5, 1.2), atlas: 1, drag: 1 });
  }
}
