// First-person wizard's staff: sways with movement and mouse, recoils and flares
// in the colour of the school of the last spell cast.
import * as THREE from 'three';
import { feyPatch } from '../render/shaderLib.js';

export class Staff {
  constructor(camera) {
    const g = this.group = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.75, metalness: 0 });
    feyPatch(wood, { key: 'staffwood', snow: 0 });
    const shaftPts = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10; shaftPts.push(new THREE.Vector3(Math.sin(t * 7) * 0.012, t * 1.25 - 0.9, Math.cos(t * 5) * 0.012)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(shaftPts), 24, 0.022, 7), wood));
    for (let k = 0; k < 3; k++) {
      const a = k / 3 * Math.PI * 2; const pts = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8; const r = 0.02 + Math.sin(t * Math.PI) * 0.07; pts.push(new THREE.Vector3(Math.cos(a + t * 1.5) * r, 0.33 + t * 0.2, Math.sin(a + t * 1.5) * r)); }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.011, 5), wood));
    }
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.008, 6, 14), new THREE.MeshStandardMaterial({ color: 0xd8b060, metalness: 1, roughness: 0.3 }));
    band.rotation.x = Math.PI / 2; band.position.y = 0.3; g.add(band);
    this.crystalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.4, roughness: 0.1, metalness: 0 });
    this.crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), this.crystalMat);
    this.crystal.scale.set(1, 1.7, 1); this.crystal.position.y = 0.44; g.add(this.crystal);
    g.traverse((o) => { o.frustumCulled = false; o.castShadow = false; });
    g.scale.setScalar(0.85);
    this.base = new THREE.Vector3(0.36, -0.44, -0.78);
    camera.add(g);
    this.recoil = 0; this.swayX = 0; this.swayY = 0; this.phase = 0;
    this.color = new THREE.Color(0.75, 0.6, 1.0);
    this.target = this.color.clone();
    this.tip = new THREE.Vector3();
  }
  cast(hex) { this.recoil = 1; this.target.setHex(hex); }
  tipWorld() { this.crystal.getWorldPosition(this.tip); return this.tip; }
  update(dt, P, lookDX, lookDY, visible) {
    this.group.visible = visible;
    this.recoil = Math.max(0, this.recoil - dt * 4);
    this.swayX += (-lookDX * 0.0006 - this.swayX) * Math.min(1, dt * 8);
    this.swayY += (lookDY * 0.0006 - this.swayY) * Math.min(1, dt * 8);
    const moving = P.onGround && !P.flying;
    const bob = moving ? Math.sin(P.bob * 2) * 0.012 : Math.sin(performance.now() * 0.0015) * 0.004;
    const bobX = moving ? Math.cos(P.bob) * 0.01 : 0;
    const r = this.recoil;
    this.group.position.set(this.base.x + this.swayX + bobX, this.base.y + this.swayY + bob + r * 0.05 - (P.flying ? 0.05 : 0), this.base.z - r * 0.1);
    this.group.rotation.set(0.12 - r * 0.45 + (P.flying ? 0.25 : 0), 0.25, -0.18 + this.swayX * 2);
    this.color.lerp(this.target, Math.min(1, dt * 5));
    this.crystalMat.color.copy(this.color); this.crystalMat.emissive.copy(this.color);
    this.crystalMat.emissiveIntensity = 0.3 + 0.1 * Math.sin(performance.now() * 0.004) + r * 1.4;
    this.crystal.rotation.y += dt * 1.5;
  }
}
