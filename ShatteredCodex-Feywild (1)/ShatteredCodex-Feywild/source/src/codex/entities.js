'use strict';
(function () {
  const U = G.U;
  const E = G.E = { monsters: [], projectiles: [], bags: [], allies: [], critters: [], timeSlow: 0 };
  let scene, W, shadowGeo, shadowMat, eliteMat, bossMat;
  const SWIMMERS = { crab: 1, serpent: 1, croc: 1, toad: 1, zombie: 1 };

  E.init = function (sc) {
    scene = sc; W = G.W;
    shadowGeo = new THREE.PlaneGeometry(1, 1); shadowGeo.rotateX(-Math.PI / 2);
    shadowMat = new THREE.MeshBasicMaterial({ map: G.T.glow(), color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false, fog: false });
    eliteMat = new THREE.MeshBasicMaterial({ map: G.T.ring(), color: 0xffc83a, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    bossMat = new THREE.MeshBasicMaterial({ map: G.T.ring(), color: 0xff3a1a, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  };

  E.xpFor = function (m) {
    const base = (10 + 7 * Math.pow(m.level, 1.25)) * m.def.xp * (m.boss ? 10 : m.elite ? 3 : 1);
    return Math.round(base * U.clamp(1 + 0.1 * (m.level - G.P.level), 0.1, 1.5));
  };

  // ---------------- spawning ----------------
  E.spawn = function (typeId, level, x, z, opts) {
    opts = opts || {};
    const d = G.MONSTERS[typeId]; const elite = !!opts.elite, boss = opts.boss || null;
    level = Math.max(1, level);
    let hp = 26 * (1 + 0.30 * (level - 1)) * d.hp, dmg = 4 * (1 + 0.22 * (level - 1)) * d.dmg;
    if (elite) { hp *= 2.8; dmg *= 1.6; } if (boss) { hp *= 12; dmg *= 2.5; }
    const h = 2.4 * d.size * (boss ? (boss.id === 'malgrath' ? 3.2 : 2.6) : elite ? 1.45 : 1);
    const frames = G.Art ? G.Art.monster(typeId, boss && boss.id) : null;
    const mat = new THREE.SpriteMaterial({ map: frames ? frames[0] : G.T.emoji((boss && boss.e) || d.e), transparent: true, alphaTest: 0.12 });
    if (G.feySprite) G.feySprite(mat);
    const sprite = new THREE.Sprite(mat); sprite.scale.set(h, h, 1); scene.add(sprite);
    const lc = document.createElement('canvas'); lc.width = 256; lc.height = 64;
    const tex = new THREE.CanvasTexture(lc);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: true, fog: false, sizeAttenuation: false }));
    let ls = boss ? 1.35 : elite ? 1.15 : 1; ls *= G.labelK || 1; label.scale.set(0.3 * ls, 0.075 * ls, 1); label.renderOrder = 6; scene.add(label);
    const shadow = new THREE.Mesh(shadowGeo, shadowMat); shadow.scale.setScalar(h * 0.7); scene.add(shadow);
    let ring = null;
    if (elite || boss) { ring = new THREE.Mesh(shadowGeo, boss ? bossMat : eliteMat); ring.scale.setScalar(h * 1.1); scene.add(ring); }
    const y0 = W.groundY(x, z);
    const m = {
      id: U.uid(), def: d, type: typeId, name: boss ? boss.name : d.n, level, elite, boss, hp, maxHp: hp, dmg, spd: d.spd * (elite ? 1.05 : 1),
      h, pos: new THREE.Vector3(x, y0 + (d.fly ? 5 : 0), z), home: { x, z }, camp: opts.camp || null, state: 'idle', atkCd: Math.random() * 1.5,
      fx: { burn: [], poison: [], slowT: 0, slowAmt: 0, freezeT: 0, stunT: 0, hexT: 0, fearT: 0, contagion: 0 },
      sprite, frames, fi: 0, label, labelCanvas: lc, tex, shadow, ring, flyH: 4 + Math.random() * 3, bob: Math.random() * 6, wanderT: Math.random() * 4, wx: x, wz: z,
      strafe: Math.random() < .5 ? 1 : -1, flash: 0, lunge: 0, dotAcc: 0, dotTextT: 0, labelDirty: true, labelT: 0, dead: false, deathT: 0,
      specialCd: 6 + Math.random() * 3, summoned: false, lastHitT: -99, fly: !!d.fly,
    };
    m.tex = tex;
    E.monsters.push(m);
    return m;
  };

  function spawnCamp(camp) {
    camp.spawned = true; camp.cleared = false; camp.everSpawned = true; camp.monsters = [];
    if (camp.boss) {
      const b = camp.boss;
      camp.monsters.push(E.spawn(b.mon, b.level, b.x, b.z, { boss: b, camp }));
      for (let i = 0; i < (b.mcount || 0); i++) {
        const a = i / b.mcount * 6.28; camp.monsters.push(E.spawn(b.minions, b.level - 2, b.x + Math.cos(a) * 7, b.z + Math.sin(a) * 7, { camp, elite: i === 0 && b.level > 12 }));
      }
      return;
    }
    for (let i = 0; i < camp.count; i++) {
      const t = camp.types[i % camp.types.length];
      const a = Math.random() * 6.28, r = 2 + Math.random() * 6;
      const lvl = U.clamp(camp.level + U.randi(-1, 1), 1, 36);
      camp.monsters.push(E.spawn(t, lvl, camp.x + Math.cos(a) * r, camp.z + Math.sin(a) * r, { camp, elite: Math.random() < camp.eliteChance }));
    }
  }
  function removeMonster(m) {
    scene.remove(m.sprite); scene.remove(m.label); scene.remove(m.shadow); if (m.ring) scene.remove(m.ring);
    m.sprite.material.dispose(); m.label.material.dispose(); m.tex.dispose();
    m.removed = true;
  }
  function despawnCamp(camp) {
    camp.monsters.forEach(m => { if (!m.removed) removeMonster(m); });
    E.monsters = E.monsters.filter(m => !m.removed);
    camp.monsters = []; camp.spawned = false;
  }
  E.resetAll = function () {
    E.monsters.forEach(m => { if (!m.removed) removeMonster(m); }); E.monsters = [];
    W.camps.forEach(c => { c.spawned = false; c.monsters = []; c.respawnAt = 0; c.cleared = false; });
    E.projectiles.forEach(p => { scene.remove(p.s); p.s.material.dispose(); }); E.projectiles = [];
    E.bags.forEach(b => removeBag(b)); E.bags = [];
    E.allies.forEach(a => { scene.remove(a.sprite); }); E.allies = [];
  };
  let campT = 0;
  function updateCamps() {
    const px = G.P.pos.x, pz = G.P.pos.z, now = G.now;
    for (const c of W.camps) {
      const d = U.d2(px, pz, c.x, c.z);
      if (!c.spawned) {
        if (d < 230 && now >= c.respawnAt && (!c.everSpawned || d > 90 || now > c.respawnAt + 60)) spawnCamp(c);
      } else {
        let alive = 0, busy = false;
        for (const m of c.monsters) if (!m.dead) { alive++; if (m.state !== 'idle') busy = true; }
        if (alive === 0) {
          c.spawned = false; c.cleared = true; c.monsters = [];
          c.respawnAt = now + (c.boss ? 900 : 180 + Math.random() * 60);
        } else if (d > 300 && !busy) despawnCamp(c);
      }
    }
  }

  // ---------------- status effects ----------------
  E.addBurn = function (m, dps, dur) {
    if (m.dead) return;
    if (G.P.D.specials.emberheart) dps *= 1.6;
    m.fx.burn.push({ dps, t: dur }); if (m.fx.burn.length > 3) { m.fx.burn.sort((a, b) => a.dps * a.t - b.dps * b.t); m.fx.burn.shift(); }
    m.labelDirty = true;
  };
  E.addPoison = function (m, dps, dur, max) {
    if (m.dead) return;
    if (G.P.D.specials.plaguesash) dps *= 1.6;
    m.fx.poison.push({ dps, t: dur }); if (m.fx.poison.length > (max || 8)) { m.fx.poison.sort((a, b) => a.t - b.t); m.fx.poison.shift(); }
    m.labelDirty = true;
  };
  const ccRes = m => m.boss ? 0.35 : m.elite ? 0.7 : 1;
  E.slow = function (m, amt, t) { if (m.dead) return; m.fx.slowAmt = Math.max(m.fx.slowT > 0 ? m.fx.slowAmt : 0, amt * (m.boss ? 0.6 : 1)); m.fx.slowT = Math.max(m.fx.slowT, t); m.labelDirty = true; };
  E.freeze = function (m, t) { if (m.dead) return; m.fx.freezeT = Math.max(m.fx.freezeT, t * ccRes(m)); m.labelDirty = true; };
  E.stun = function (m, t) { if (m.dead) return; m.fx.stunT = Math.max(m.fx.stunT, t * ccRes(m)); m.labelDirty = true; };
  E.hex = function (m, t) { if (m.dead) return; m.fx.hexT = Math.max(m.fx.hexT, t); m.labelDirty = true; };
  E.fear = function (m, t) { if (m.dead) return; if (m.boss) { E.slow(m, 0.4, t); return; } m.fx.fearT = Math.max(m.fx.fearT, t * ccRes(m)); m.labelDirty = true; };
  E.center = (m, out) => (out || new THREE.Vector3()).set(m.pos.x, m.pos.y + m.h * 0.47, m.pos.z);
  E.isSlowed = m => m.fx.slowT > 0;
  E.isFrozen = m => m.fx.freezeT > 0;

  function aggroCamp(m) {
    const list = m.camp ? m.camp.monsters : [m];
    for (const o of list) if (!o.dead && o.state === 'idle' && U.d2(o.pos.x, o.pos.z, m.pos.x, m.pos.z) < 30) { o.state = 'chase'; o.atkCd = Math.max(o.atkCd, 0.4 + Math.random() * 0.6); }
    m.state = 'chase';
  }
  E.aggro = aggroCamp;

  const cv = new THREE.Vector3();
  // amount already includes player bonuses. school: fire/frost/storm/arcane/nature/shadow
  E.damage = function (m, amount, school, o) {
    if (!m || m.dead) return 0;
    o = o || {};
    let a = amount;
    if (m.fx.hexT > 0) a *= 1.3;
    if (m.def.armor && school !== 'arcane' && school !== 'shadow') a *= 1 - m.def.armor * 0.5;
    a = Math.max(1, a);
    m.hp -= a; m.labelDirty = true; m.lastHitT = G.now;
    if (!o.dot) { m.flash = 0.12; G.FX.text(E.center(m, cv).setY(m.pos.y + m.h * 0.8), Math.round(a), o.crit ? 'crit' : 'dmg'); }
    else { m.dotAcc += a; }
    if (m.state !== 'chase' && m.state !== 'return') aggroCamp(m);
    if (m.state === 'return' && !m.boss) m.state = 'chase';
    const P = G.P;
    if (P.D.specials.vampsig) P.heal(a * 0.06, true);
    G.P.lastCombatT = G.now;
    if (m.hp <= 0) E.kill(m);
    return a;
  };

  E.kill = function (m) {
    if (m.dead) return;
    m.dead = true; m.hp = 0; m.deathT = 0;
    const P = G.P;
    P.gainXp(E.xpFor(m));
    const loot = G.Items.rollLoot(m);
    if (loot.items.length || loot.gold) E.dropBag(m.pos.x, m.pos.z, loot.items, loot.gold);
    if (P.D.specials.tide) P.mana = Math.min(P.D.maxMana, P.mana + P.D.maxMana * 0.08);
    // spreading poison
    if (m.fx.poison.length && (P.D.specials.plaguesash || m.fx.contagion > 0)) {
      const near = E.nearby(m.pos.x, m.pos.z, 9).filter(o => o !== m).slice(0, 3);
      near.forEach(o => { m.fx.poison.forEach(p => E.addPoison(o, p.dps / (P.D.specials.plaguesash ? 1.6 : 1), Math.max(3, p.t))); if (m.fx.contagion > 0) o.fx.contagion = 8; G.FX.bolt(E.center(m), E.center(o), 0x88dd22, 0.3, 0.3); });
    }
    G.FX.burst(E.center(m, cv), m.boss ? 0xffaa33 : 0xffffff, m.boss ? 60 : 14, m.boss ? 12 : 5, m.boss ? 1.6 : 0.8, 0.7, 2);
    if (m.boss) {
      G.S.bossKilled[m.boss.id] = true;
      G.UI.toast(m.name + ' is slain!', 'boss');
      G.UI.msg('You have slain ' + m.name + '! Its treasure chest is unsealed.', 'gold');
    }
    G.Quests.onKill(m);
    G.S.kills = (G.S.kills || 0) + 1;
  };

  E.nearby = function (x, z, r, filter) {
    const out = [];
    for (const m of E.monsters) { if (m.dead) continue; const d = U.d2(x, z, m.pos.x, m.pos.z); if (d < r + m.h * 0.3 && (!filter || filter(m))) out.push(m); }
    out.sort((a, b) => U.d2(x, z, a.pos.x, a.pos.z) - U.d2(x, z, b.pos.x, b.pos.z));
    return out;
  };
  // monsters within radius in 3D (for flying stuff)
  E.inSphere = function (p, r) {
    const out = [];
    for (const m of E.monsters) { if (m.dead) continue; E.center(m, cv); if (cv.distanceTo(p) < r + m.h * 0.35) out.push(m); }
    return out;
  };

  // ---------------- monster projectiles ----------------
  function fireAt(m, target, speed, spread, dmgMul) {
    const from = E.center(m); const to = target.clone();
    const dir = to.sub(from).normalize();
    if (spread) { dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), spread); }
    dir.x += (Math.random() - .5) * 0.04; dir.y += (Math.random() - .5) * 0.04; dir.normalize();
    const col = m.def.proj || 0xffffff;
    const s = G.FX.glowSprite(col, m.boss ? 2.2 : 1.3); s.position.copy(from);
    E.projectiles.push({ s, pos: from, vel: dir.multiplyScalar(speed), dmg: m.dmg * (dmgMul || 1), eff: m.def.eff, kind: m.def.atk === 'caster' ? 'magic' : 'phys', src: m, life: 3, col });
  }
  function updateProjectiles(dt) {
    const P = G.P; const pc = new THREE.Vector3(P.pos.x, P.pos.y + 1.0, P.pos.z);
    const ts = E.timeSlow > 0 ? 0.35 : 1;
    for (let i = E.projectiles.length - 1; i >= 0; i--) {
      const p = E.projectiles[i]; p.life -= dt;
      p.pos.addScaledVector(p.vel, dt * ts); p.s.position.copy(p.pos);
      if (Math.random() < 0.6) G.FX.trail(p.pos, p.col, 0.7, 0.3);
      let hit = false;
      if (p.pos.distanceTo(pc) < 1.1 && !P.dead) { P.takeDamage(p.dmg, { kind: p.kind, eff: p.eff, src: p.src }); hit = true; }
      else if (p.pos.y < W.groundY(p.pos.x, p.pos.z) - 0.2) hit = true;
      if (hit || p.life <= 0) {
        if (hit) G.FX.burst(p.pos, p.col, 8, 4, 0.7, 0.4);
        scene.remove(p.s); p.s.material.dispose(); E.projectiles.splice(i, 1);
      }
    }
  }

  // ---------------- AI ----------------
  const pc = new THREE.Vector3();
  function tickDots(m, dt) {
    let dps = 0;
    for (let k = m.fx.burn.length - 1; k >= 0; k--) { const e = m.fx.burn[k]; e.t -= dt; dps += e.dps; if (e.t <= 0) { m.fx.burn.splice(k, 1); m.labelDirty = true; } }
    for (let k = m.fx.poison.length - 1; k >= 0; k--) { const e = m.fx.poison[k]; e.t -= dt; dps += e.dps; if (e.t <= 0) { m.fx.poison.splice(k, 1); m.labelDirty = true; } }
    if (dps > 0) {
      E.damage(m, dps * dt, 'nature', { dot: true });
      if (Math.random() < dt * 6) G.FX.trail(E.center(m, cv).add(new THREE.Vector3((Math.random() - .5) * m.h * .5, (Math.random() - .5) * m.h * .5, (Math.random() - .5) * m.h * .5)), m.fx.burn.length ? 0xff6a1a : 0x88dd22, 0.8, 0.6);
    }
    m.dotTextT -= dt;
    if (m.dotTextT <= 0 && m.dotAcc >= 1) { G.FX.text(E.center(m, cv).setY(m.pos.y + m.h * 0.8), Math.round(m.dotAcc), m.fx.burn.length ? 'burn' : 'poison'); m.dotAcc = 0; m.dotTextT = 0.8; }
    if (m.fx.contagion > 0) {
      m.fx.contagion -= dt;
      m.spreadT = (m.spreadT || 2) - dt;
      if (m.spreadT <= 0 && m.fx.poison.length) {
        m.spreadT = 2;
        const o = E.nearby(m.pos.x, m.pos.z, 7).find(o => o !== m && o.fx.poison.length < 3);
        if (o) { const p = m.fx.poison[m.fx.poison.length - 1]; E.addPoison(o, p.dps / (G.P.D.specials.plaguesash ? 1.6 : 1), 6); o.fx.contagion = Math.max(o.fx.contagion, 4); G.FX.bolt(E.center(m), E.center(o), 0x88dd22, 0.3, 0.3); }
      }
    }
    for (const k of ['slowT', 'freezeT', 'stunT', 'hexT', 'fearT']) if (m.fx[k] > 0) { m.fx[k] -= dt; if (m.fx[k] <= 0) { m.fx[k] = 0; m.labelDirty = true; } }
  }

  function bossSpecial(m, dist) {
    const P = G.P;
    if (!m.summoned && m.hp < m.maxHp * 0.5 && m.boss.minions) {
      m.summoned = true;
      for (let i = 0; i < 3; i++) { const a = Math.random() * 6.28; const mm = E.spawn(m.boss.minions, m.level - 2, m.pos.x + Math.cos(a) * 5, m.pos.z + Math.sin(a) * 5, { camp: m.camp }); mm.state = 'chase'; if (m.camp) m.camp.monsters.push(mm); G.FX.burst(E.center(mm), 0xaa66ff, 20, 6, 1, 0.6); }
      G.UI.msg(m.name + ' calls for aid!', 'warn');
    }
    if (m.def.atk === 'melee' || m.boss.id === 'malgrath') {
      // telegraphed ground slam
      const x = m.pos.x, z = m.pos.z, r = 7 + m.h * 0.25;
      G.FX.ring(x, z, r, 0xff2a1a, 1.2, { grow: false, opacity: 0.7, fill: true });
      m.slamT = 1.1; m.slam = { x, z, r };
    }
    if (m.def.atk !== 'melee' || m.boss.id === 'malgrath') {
      const tgt = new THREE.Vector3(P.pos.x, P.pos.y + 1, P.pos.z);
      for (let k = -2; k <= 2; k++) fireAt(m, tgt, 20, k * 0.18, 0.8);
    }
    m.specialCd = 7 + Math.random() * 3;
  }

  function updateMonster(m, dt, list, idx) {
    const P = G.P, fx = m.fx;
    if (m.dead) {
      m.deathT += dt; const f = m.deathT / 0.5;
      m.sprite.material.opacity = 1 - f; m.sprite.scale.set(m.h * (1 + f * .3), m.h * (1 - f * .7), 1);
      m.label.visible = false;
      if (f >= 1) removeMonster(m);
      return;
    }
    tickDots(m, dt); if (m.dead) return;
    const dx = P.pos.x - m.pos.x, dz = P.pos.z - m.pos.z; const dist = Math.sqrt(dx * dx + dz * dz);
    const ground = W.groundY(m.pos.x, m.pos.z);
    const cc = fx.freezeT > 0 || fx.stunT > 0;
    let spd = m.spd * (fx.slowT > 0 ? 1 - fx.slowAmt : 1) * (E.timeSlow > 0 ? 0.4 : 1);
    let mx = 0, mz = 0;
    const inv = P.buffs.invis || P.dead;
    m.atkCd -= dt * (E.timeSlow > 0 ? 0.4 : 1) * (fx.slowT > 0 ? 1 - fx.slowAmt * 0.5 : 1);
    if (m.slamT > 0) {
      m.slamT -= dt;
      if (m.slamT <= 0) {
        G.FX.disc(m.slam.x, m.slam.z, m.slam.r, 0xff6633, 60, 1.4, 0.6, 5);
        if (U.d2(P.pos.x, P.pos.z, m.slam.x, m.slam.z) < m.slam.r && P.pos.y - W.groundY(P.pos.x, P.pos.z) < 3) P.takeDamage(m.dmg * 1.6, { kind: 'phys', src: m });
      }
    }
    if (m.state === 'idle') {
      let ar = 17 + (m.elite ? 3 : 0) + (m.boss ? 10 : 0);
      if (P.level - m.level >= 6) ar = 8;
      if (!inv && dist < ar && Math.abs(P.pos.y - m.pos.y) < 25) aggroCamp(m);
      m.wanderT -= dt;
      if (m.wanderT <= 0) { m.wanderT = 3 + Math.random() * 5; const a = Math.random() * 6.28, r = Math.random() * 9; m.wx = m.home.x + Math.cos(a) * r; m.wz = m.home.z + Math.sin(a) * r; }
      const wx = m.wx - m.pos.x, wz = m.wz - m.pos.z, wd = Math.hypot(wx, wz);
      if (wd > 0.8) { mx = wx / wd * spd * 0.3; mz = wz / wd * spd * 0.3; }
      if (m.hp < m.maxHp && G.now - m.lastHitT > 5) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.1 * dt), m.labelDirty = true;
    } else if (m.state === 'return') {
      const hx = m.home.x - m.pos.x, hz = m.home.z - m.pos.z, hd = Math.hypot(hx, hz);
      if (hd < 3) { m.state = 'idle'; m.hp = m.maxHp; fx.burn.length = 0; fx.poison.length = 0; m.labelDirty = true; }
      else { mx = hx / hd * m.spd * 1.3; mz = hz / hd * m.spd * 1.3; }
      m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.15 * dt); m.labelDirty = true;
    } else if (m.state === 'chase') {
      const homeD = U.d2(m.pos.x, m.pos.z, m.home.x, m.home.z);
      if (inv || homeD > (m.boss ? 55 : 75) || dist > 120) { m.state = 'return'; }
      else if (fx.fearT > 0) { if (dist > 0.1) { mx = -dx / dist * spd; mz = -dz / dist * spd; } }
      else if (!cc) {
        if (m.boss) { m.specialCd -= dt; if (m.specialCd <= 0 && dist < 32) bossSpecial(m, dist); }
        const melee = m.def.atk === 'melee';
        const cy = m.pos.y + m.h * 0.47, py = P.pos.y + 1.0;
        if (melee) {
          const reach = m.def.range + m.h * 0.3;
          if (dist > reach * 0.85) { mx = dx / dist * spd; mz = dz / dist * spd; }
          if (dist < reach && m.atkCd <= 0) {
            const vert = Math.abs(py - cy);
            if (vert < 2.2 + m.h * 0.35) {
              m.atkCd = m.def.rate * (m.boss ? 0.85 : 1); m.lunge = 0.2;
              P.takeDamage(m.dmg, { kind: 'phys', eff: m.def.eff, src: m });
            } else m.atkCd = 0.3;
          }
        } else {
          const R = m.def.range;
          if (dist > R * 0.85) { mx = dx / dist * spd; mz = dz / dist * spd; }
          else if (dist < R * 0.35) { mx = -dx / dist * spd * 0.7; mz = -dz / dist * spd * 0.7; }
          else { mx = -dz / dist * spd * 0.35 * m.strafe; mz = dx / dist * spd * 0.35 * m.strafe; if (Math.random() < dt * 0.3) m.strafe *= -1; }
          if (dist < R && m.atkCd <= 0) {
            m.atkCd = m.def.rate * (0.85 + Math.random() * 0.3); m.lunge = 0.15;
            fireAt(m, pc.set(P.pos.x, P.pos.y + 1.0, P.pos.z), m.def.atk === 'caster' ? 19 : 25);
          }
        }
      }
    }
    if (cc) { mx = 0; mz = 0; }
    // separation
    for (let j = 0; j < list.length; j++) {
      if (j === idx) continue; const o = list[j]; if (o.dead) continue;
      const sx = m.pos.x - o.pos.x, sz = m.pos.z - o.pos.z; const sd = sx * sx + sz * sz; const rr = (m.h + o.h) * 0.3;
      if (sd < rr * rr && sd > 1e-4) { const d = Math.sqrt(sd); mx += sx / d * (rr - d) * 4; mz += sz / d * (rr - d) * 4; }
    }
    m.pos.x += mx * dt; m.pos.z += mz * dt;
    if (!m.fly) W.collide(m.pos, 0.35 * m.def.size);
    const lim = W.HALF - 60; m.pos.x = U.clamp(m.pos.x, -lim, lim); m.pos.z = U.clamp(m.pos.z, -lim, lim);
    const g = W.groundY(m.pos.x, m.pos.z);
    const hRaw = W.heightAt(m.pos.x, m.pos.z);
    if (m.fly) {
      let ty = g + m.flyH;
      if (m.state === 'chase' && !cc) {
        if (m.def.atk === 'melee' && dist < 9) ty = Math.max(g + 0.5, P.pos.y + 1.0 - m.h * 0.47);
        else ty = Math.max(g + m.flyH, P.pos.y + 2);
      }
      if (cc) ty = Math.max(g + 0.3, m.pos.y - dt * 6);
      m.pos.y += (ty - m.pos.y) * Math.min(1, dt * 2.5);
      m.pos.y = Math.max(m.pos.y, g + 0.3);
    } else {
      m.pos.y = W.monsterY(m.pos.x, m.pos.z, SWIMMERS[m.type]);
    }
    // visuals
    m.flash -= dt; m.lunge -= dt;
    const bob = m.fly ? Math.sin(G.now * 3 + m.bob) * 0.3 : (Math.abs(mx) + Math.abs(mz) > 0.5 ? Math.abs(Math.sin(G.now * 9 + m.bob)) * 0.18 : 0);
    const moving = Math.abs(mx) + Math.abs(mz) > 0.5;
    const lk = m.lunge > 0 ? 1 + m.lunge * (m.frames ? 0.5 : 0.8) : 1;
    const breathe = !moving && !m.fly ? 1 + Math.sin(G.now * 2.2 + m.bob) * 0.025 : 1;
    m.sprite.scale.set(m.h * lk / Math.sqrt(breathe), m.h * lk * breathe, 1);
    if (m.frames) {
      const fi = m.atkShow > 0 ? 2 : (moving || m.fly) ? (Math.floor(G.now * (m.fly ? 5 : 7) + m.bob) & 1) : 0;
      if (fi !== m.fi) { m.fi = fi; m.sprite.material.map = m.frames[fi]; }
    }
    m.atkShow = (m.atkShow || 0) - dt; if (m.lunge > 0.1) m.atkShow = 0.35;
    m.sprite.position.set(m.pos.x, m.pos.y + m.h * 0.47 + bob, m.pos.z);
    const col = m.sprite.material.color;
    if (m.flash > 0) col.setRGB(1, 0.35, 0.35);
    else if (fx.freezeT > 0) col.setRGB(0.55, 0.85, 1.2);
    else if (fx.stunT > 0) col.setRGB(1.1, 1.05, 0.5);
    else if (fx.hexT > 0) col.setRGB(0.8, 0.55, 1);
    else if (fx.burn.length) col.setRGB(1, 0.8, 0.6);
    else col.setRGB(1, 1, 1);
    const sy = W.monsterY(m.pos.x, m.pos.z, false) + 0.08;
    m.shadow.position.set(m.pos.x, sy, m.pos.z); m.shadow.material.opacity = 0.5;
    const hs = m.fly ? Math.max(0.3, 1 - (m.pos.y - g) / 14) : 1; m.shadow.scale.setScalar(m.h * 0.7 * hs);
    if (m.ring) { m.ring.position.set(m.pos.x, sy + 0.03, m.pos.z); m.ring.rotation.y += dt; }
    const showLabel = m.boss ? dist < 90 : (G.now - m.lastHitT < 6 || G.UI.curTarget === m || (m.state === 'chase' && dist < 35) || fx.freezeT > 0 || fx.stunT > 0);
    m.label.visible = showLabel;
    if (showLabel) {
      m.label.position.set(m.pos.x, m.pos.y + m.h * 0.98 + 0.45 + bob, m.pos.z);
      m.labelT -= dt;
      if (m.labelDirty && m.labelT <= 0) { G.T.drawMonsterLabel(m.labelCanvas, m); m.labelDirty = false; m.labelT = 0.08; }
    }
  }

  // ---------------- loot bags ----------------
  E.dropBag = function (x, z, items, gold) {
    const best = items.reduce((b, it) => { const r = { unique: 4, rare: 3, magic: 2, common: 1 }[it.rarity] || 0; return Math.max(b, r); }, 0);
    const s = new THREE.Sprite(G.feySprite(new THREE.SpriteMaterial({ map: G.T.emoji(items.length ? '🎁' : '💰'), transparent: true, alphaTest: 0.1 })));
    s.scale.set(1.3, 1.3, 1);
    const y = W.groundY(x, z); s.position.set(x, y + 0.7, z); scene.add(s);
    let beam = null;
    if (best >= 2) {
      const col = best === 4 ? 0xff8a1a : best === 3 ? 0xffd84a : 0x5a8fff;
      beam = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.T.glow(), color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      beam.scale.set(best >= 3 ? 1.8 : 1.2, best >= 3 ? 14 : 5, 1); beam.position.set(x, y + (best >= 3 ? 6 : 2.5), z); scene.add(beam);
    }
    const b = { x, z, y, s, beam, items, gold, t: 0, noticeT: 0 };
    E.bags.push(b); return b;
  };
  function removeBag(b) { scene.remove(b.s); b.s.material.dispose(); if (b.beam) { scene.remove(b.beam); b.beam.material.dispose(); } }
  function updateBags(dt) {
    const P = G.P;
    for (let i = E.bags.length - 1; i >= 0; i--) {
      const b = E.bags[i]; b.t += dt; b.noticeT -= dt;
      b.s.position.y = b.y + 0.7 + Math.sin(G.now * 3 + b.x) * 0.12;
      if (b.beam) b.beam.material.opacity = 0.6 + Math.sin(G.now * 4) * 0.25;
      const d = U.d2(P.pos.x, P.pos.z, b.x, b.z);
      if (d < 2.8 && Math.abs(P.pos.y - b.y) < 4 && !P.dead) {
        if (b.gold) { P.gold += b.gold; G.UI.msg('+' + b.gold + ' gold', 'gold'); G.FX.text(new THREE.Vector3(b.x, b.y + 1.5, b.z), '+' + b.gold + 'g', 'gold'); b.gold = 0; }
        for (let k = b.items.length - 1; k >= 0; k--) {
          const it = b.items[k];
          if (G.Inv.add(it)) { b.items.splice(k, 1); G.UI.msg('Picked up ' + it.name + (it.stack > 1 ? ' ×' + it.stack : ''), it.rarity); }
        }
        if (b.items.length && b.noticeT <= 0) { G.UI.msg('Your pack is full!', 'warn'); b.noticeT = 4; }
        G.UI.dirtyInv = true;
      }
      if ((!b.items.length && !b.gold) || b.t > 300) { removeBag(b); E.bags.splice(i, 1); }
    }
  }

  // ---------------- allies (spirit wolves) ----------------
  E.summonWolf = function (dmg, dur) {
    const P = G.P;
    const wf = G.Art && G.Art.monster('wolf');
    const s = new THREE.Sprite(G.feySprite(new THREE.SpriteMaterial({ map: wf ? wf[0] : G.T.emoji('🐺'), color: 0x9fd8ff, transparent: true, alphaTest: 0.1 })));
    s.scale.set(2.2, 2.2, 1); scene.add(s);
    const a = Math.random() * 6.28; const pos = new THREE.Vector3(P.pos.x + Math.cos(a) * 2, 0, P.pos.z + Math.sin(a) * 2);
    const w = { sprite: s, pos, t: dur, dmg, cd: 0, target: null };
    E.allies.push(w); G.FX.burst(new THREE.Vector3(pos.x, W.groundY(pos.x, pos.z) + 1, pos.z), 0x9fd8ff, 30, 5, 1, 0.8);
  };
  function updateAllies(dt) {
    const P = G.P;
    for (let i = E.allies.length - 1; i >= 0; i--) {
      const w = E.allies[i]; w.t -= dt; w.cd -= dt;
      if (w.t <= 0 || P.dead) { G.FX.burst(new THREE.Vector3(w.pos.x, w.pos.y + 1, w.pos.z), 0x9fd8ff, 20, 4, 1, 0.6); scene.remove(w.sprite); w.sprite.material.dispose(); E.allies.splice(i, 1); continue; }
      if (!w.target || w.target.dead || U.d2(w.target.pos.x, w.target.pos.z, P.pos.x, P.pos.z) > 35) {
        w.target = null;
        const c = E.nearby(w.pos.x, w.pos.z, 25, m => m.state === 'chase' && !m.fly || (m.state === 'chase' && m.pos.y - W.groundY(m.pos.x, m.pos.z) < 4));
        w.target = c[0] || null;
      }
      let tx, tz, spd = 14;
      if (w.target) { tx = w.target.pos.x; tz = w.target.pos.z; }
      else { const a = G.now * 0.5 + i * 2; tx = P.pos.x + Math.cos(a) * 3; tz = P.pos.z + Math.sin(a) * 3; spd = 11; }
      const dx = tx - w.pos.x, dz = tz - w.pos.z, d = Math.hypot(dx, dz);
      const reach = w.target ? 1.6 + w.target.h * 0.3 : 1.5;
      if (d > reach) { w.pos.x += dx / d * Math.min(spd * dt, d - reach); w.pos.z += dz / d * Math.min(spd * dt, d - reach); }
      else if (w.target && w.cd <= 0) { w.cd = 0.9; E.damage(w.target, w.dmg, 'nature'); G.FX.burst(E.center(w.target), 0x9fd8ff, 8, 4, 0.7, 0.3); }
      W.collide(w.pos, 0.4);
      w.pos.y = W.groundY(w.pos.x, w.pos.z);
      w.sprite.position.set(w.pos.x, w.pos.y + 1.05 + Math.abs(Math.sin(G.now * 10 + i)) * 0.15, w.pos.z);
      w.sprite.material.opacity = Math.min(1, w.t) * 0.9;
      if (Math.random() < dt * 8) G.FX.trail(w.sprite.position, 0x9fd8ff, 0.6, 0.5);
    }
  }

  // ---------------- ambient critters ----------------
  const CRIT = { grass: ['🦋', '🐇', '🐦', '🦋'], lakes: ['🦆', '🦢', '🐸', '🦋'], forest: ['🦌', '🐿️', '🦉', '🦔'], swamp: ['🦆', '🐌', '🪰'], desert: ['🦎', '🐪'], mountain: ['🐐', '🦅'], snow: ['🐧', '🦌'], ash: ['🦇'], barrow: ['🐈‍⬛', '🦇'] };
  const FLIERS = { '🦋': 1, '🐦': 1, '🦉': 1, '🦅': 1, '🦇': 1, '🪰': 1 };
  let critT = 0;
  function updateCritters(dt) {
    const P = G.P;
    critT -= dt;
    if (critT <= 0 && E.critters.length < 10) {
      critT = 1.2;
      const a = Math.random() * 6.28, r = 25 + Math.random() * 35; const x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r;
      const h = W.heightAt(x, z);
      if (W.isDry(x, z)) {
        const pool = CRIT[W.biomeAt(x, z)] || CRIT.grass; const e = U.pick(pool);
        const fly = !!FLIERS[e]; const sz = fly ? 0.7 : (e === '🦌' || e === '🐪' ? 1.8 : 0.8);
        const s = new THREE.Sprite(G.feySprite(new THREE.SpriteMaterial({ map: G.T.emoji(e), transparent: true, alphaTest: 0.1 })));
        s.scale.set(sz, sz, 1); scene.add(s);
        E.critters.push({ s, x, z, y: W.groundY(x, z), fly, sz, vx: 0, vz: 0, t: 0, ph: Math.random() * 6, turn: 0 });
      }
    }
    for (let i = E.critters.length - 1; i >= 0; i--) {
      const c = E.critters[i]; c.t += dt; c.turn -= dt;
      const d = U.d2(P.pos.x, P.pos.z, c.x, c.z);
      if (d > 90 || c.t > 90) { scene.remove(c.s); c.s.material.dispose(); E.critters.splice(i, 1); continue; }
      if (d < 7) { const k = (c.fly ? 6 : 8) / Math.max(d, 0.1); c.vx = (c.x - P.pos.x) * k; c.vz = (c.z - P.pos.z) * k; c.turn = 1; }
      else if (c.turn <= 0) { c.turn = 1 + Math.random() * 3; const a = Math.random() * 6.28, s = Math.random() < 0.4 ? 0 : (c.fly ? 3 : 1.5); c.vx = Math.cos(a) * s; c.vz = Math.sin(a) * s; }
      c.x += c.vx * dt; c.z += c.vz * dt;
      const g = W.groundY(c.x, c.z);
      const y = c.fly ? g + 2 + Math.sin(c.t * 2 + c.ph) * 0.8 + (c.s.material.map === G.T.emoji('🦅') ? 12 : 0) : g + c.sz * 0.45 + (Math.hypot(c.vx, c.vz) > 0.5 ? Math.abs(Math.sin(c.t * 10)) * 0.2 : 0);
      c.s.position.set(c.x, y, c.z); 
    }
  }

  E.update = function (dt) {
    campT -= dt; if (campT <= 0) { campT = 0.5; updateCamps(); }
    if (E.timeSlow > 0) E.timeSlow -= dt;
    const list = E.monsters;
    for (let i = 0; i < list.length; i++) updateMonster(list[i], dt, list, i);
    if (list.some(m => m.removed)) E.monsters = list.filter(m => !m.removed);
    updateProjectiles(dt); updateBags(dt); updateAllies(dt); updateCritters(dt);
  };
})();
