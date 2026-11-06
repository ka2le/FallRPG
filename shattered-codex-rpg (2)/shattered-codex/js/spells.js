'use strict';
(function () {
  const U = G.U;
  const S = G.SP = { gcd: 0, gcdMax: 1, cds: {}, cdMax: {}, projs: [], zones: [], timers: [], msgT: 0, queued: null };
  let scene;
  const V = () => new THREE.Vector3();
  const P = () => G.P;
  const SCH_COL = { fire: 0xff7a1a, frost: 0x8fd8ff, storm: 0xfff27a, arcane: 0xb88aff, nature: 0x8fe03a, shadow: 0xa04aff, holy: 0xffe8a0 };
  S.SCH_COL = SCH_COL;

  // ---------------- helpers ----------------
  S.lvlMul = () => 1 + 0.13 * (G.P.level - 1);
  S.rankMul = r => 1 + 0.25 * (r - 1);
  S.dmgMul = function (school, cost) {
    const p = G.P, D = p.D;
    let m = S.lvlMul() * (1 + D.spellPower + (D.school[school] || 0));
    if (p.buffs.apower) m *= 1 + p.buffs.apower.v;
    if (p.buffs.soul) m *= 1 + 0.08 * p.buffs.soul.n;
    if (D.specials.unbroken && p.buffs.shield) m *= 1.25;
    if (p.deb.weakT > 0) m *= 0.75;
    if (cost !== undefined) { if (D.specials.archcrown && cost >= 30) m *= 1.35; if (D.specials.endless && cost === 0) m *= 1.9; }
    return m;
  };
  // roll damage with crit
  S.roll = function (base, school, rank, cost) {
    let a = base * S.rankMul(rank) * S.dmgMul(school, cost);
    const crit = Math.random() < G.P.D.crit;
    if (crit) a *= G.P.D.critMult;
    return { a, crit };
  };
  S.hit = function (m, base, school, rank, cost, extra) {
    const r = S.roll(base * (extra || 1), school, rank, cost);
    const dealt = G.E.damage(m, r.a, school, { crit: r.crit });
    if (G.P.D.specials.frostbound && school === 'frost' && Math.random() < 0.25) G.E.freeze(m, 2);
    return dealt;
  };
  S.costOf = function (id) {
    const d = S.defs[id], p = G.P; const r = p.spells[id] || 1;
    if (!d.mana) return 0;
    let c = d.mana * (1 + 0.05 * (p.level - 1)) * (1 + (d.maxRank > 1 ? 0.1 * (r - 1) : 0)) * (1 - p.D.manaCost);
    if (p.buffs.apower && d.dmg) c *= 1.5;
    if (id === 'blink' && p.D.specials.windrunner) c *= 0.5;
    return Math.round(c);
  };
  S.baseCost = id => Math.round((S.defs[id].mana || 0) * (1 + 0.05 * (G.P.level - 1)));

  const cam = () => G.camera;
  S.aimDir = () => { const d = V(); cam().getWorldDirection(d); return d; };
  S.origin = () => { const o = cam().position.clone(); const d = S.aimDir(); o.addScaledVector(d, 0.9); o.y -= 0.35; return o; };
  // find monster nearest to crosshair within cone
  S.aimTarget = function (deg, range) {
    const o = cam().position, d = S.aimDir(); const cos = Math.cos((deg || 8) * Math.PI / 180);
    let best = null, bestS = -1; const c = V();
    for (const m of G.E.monsters) {
      if (m.dead) continue;
      G.E.center(m, c); const to = c.sub(o); const dist = to.length(); if (dist > (range || 60)) continue;
      to.divideScalar(dist); const dot = to.dot(d);
      const allow = Math.max(cos - (m.h * 0.35) / Math.max(dist, 1), 0.5);
      if (dot > allow) { const sc = dot - dist * 0.0006; if (sc > bestS) { bestS = sc; best = m; } }
    }
    return best;
  };
  S.groundPoint = function (range) {
    const o = cam().position, d = S.aimDir();
    const t = S.aimTarget(6, range); if (t) return V().set(t.pos.x, G.W.groundY(t.pos.x, t.pos.z), t.pos.z);
    const hit = G.W.raycast(o, d, range || 50);
    if (hit) return hit;
    const f = V().set(d.x, 0, d.z).normalize().multiplyScalar(Math.min(range || 50, 30)).add(o);
    f.y = G.W.groundY(f.x, f.z); return f;
  };
  S.msg = function (t) { if (S.msgT <= 0) { G.UI.msg(t, 'warn'); S.msgT = 1.2; } };
  S.after = (t, fn) => S.timers.push({ t, fn });

  // ---------------- projectiles ----------------
  S.proj = function (o) {
    const s = G.FX.glowSprite(o.color, o.size || 1.2);
    s.position.copy(o.pos);
    const p = Object.assign({ s, vel: o.dir.clone().multiplyScalar(o.speed || 45), life: o.life || 2.2, hitR: 0.6 }, o);
    p.pos = o.pos.clone();
    S.projs.push(p); return p;
  };
  function updateProjs(dt) {
    const c = V();
    for (let i = S.projs.length - 1; i >= 0; i--) {
      const p = S.projs[i]; p.life -= dt;
      if (p.homing && !p.homing.dead) {
        G.E.center(p.homing, c); const want = c.sub(p.pos).normalize().multiplyScalar(p.vel.length());
        p.vel.lerp(want, Math.min(1, dt * (p.turn || 4)));
      }
      p.pos.addScaledVector(p.vel, dt); p.s.position.copy(p.pos);
      for (let k = 0; k < (p.trailN || 2); k++) G.FX.trail(p.pos, p.trail || p.color, (p.size || 1.2) * 0.6, 0.35);
      let hitM = null;
      for (const m of G.E.monsters) {
        if (m.dead || (p.hitList && p.hitList.includes(m))) continue;
        G.E.center(m, c); if (c.distanceTo(p.pos) < m.h * 0.42 + p.hitR) { hitM = m; break; }
      }
      const gh = G.W.groundY(p.pos.x, p.pos.z);
      const hitGround = p.pos.y < gh;
      if (hitM || hitGround || p.life <= 0) {
        if (hitM && p.onHit) p.onHit(hitM, p);
        if ((hitM || hitGround) && p.onBoom) p.onBoom(p.pos.clone(), hitM);
        if (hitM && p.pierce && p.pierce > 0) { p.pierce--; (p.hitList = p.hitList || []).push(hitM); continue; }
        G.FX.burst(p.pos, p.color, 10, 4, 0.8, 0.35);
        G.FX.scene; S.removeProj(i);
      }
    }
  }
  S.removeProj = function (i) { const p = S.projs[i]; p.s.parent && p.s.parent.remove(p.s); p.s.material.dispose(); S.projs.splice(i, 1); };

  // ---------------- zones (persistent AoE) ----------------
  S.zone = function (o) {
    o.t = 0; o.tickT = 0; o.ring = G.FX.ring(o.x, o.z, o.r, o.color, o.dur, { grow: false, persist: true, opacity: 0.55 });
    S.zones.push(o); return o;
  };
  function updateZones(dt) {
    for (let i = S.zones.length - 1; i >= 0; i--) {
      const z = S.zones[i]; z.t += dt; z.tickT -= dt;
      if (z.fxFn) z.fxFn(z, dt);
      if (z.tickT <= 0) { z.tickT = z.tick; const ms = G.E.nearby(z.x, z.z, z.r, m => Math.abs(m.pos.y - G.W.groundY(m.pos.x, m.pos.z)) < (z.height || 8)); ms.forEach(m => z.onTick(m, z)); }
      if (z.t >= z.dur) { G.FX.removeRing(z.ring); S.zones.splice(i, 1); }
    }
  }

  function explode(pos, r, base, school, rank, cost, col, onEach) {
    G.FX.burst(pos, col, 45, r * 2.2, 1.6, 0.6, 1);
    G.FX.ring(pos.x, pos.z, r, col, 0.5);
    G.FX.flash(pos, col, r * 2.2, 0.3);
    G.E.inSphere(pos, r).forEach(m => { S.hit(m, base, school, rank, cost); if (onEach) onEach(m); });
  }
  function nova(r, col, n) {
    const p = G.P; G.FX.ring(p.pos.x, p.pos.z, r, col, 0.6);
    for (let k = 0; k < (n || 60); k++) { const a = Math.random() * 6.28; const s = r * 2.2 * (0.7 + Math.random() * 0.3); G.FX.spawn(p.pos.x, p.pos.y + 0.8, p.pos.z, Math.cos(a) * s, Math.random() * 2, Math.sin(a) * s, 0.45, 1.3, col, 0, 1.2); }
  }
  const pc = () => V().set(G.P.pos.x, G.P.pos.y + 1, G.P.pos.z);
  const fmt = n => Math.round(n);
  // expected damage for tooltips
  const X = (base, school, r, cost) => fmt(base * S.rankMul(r) * S.dmgMul(school, cost));

  // ---------------- spell definitions ----------------
  // lv: min level to be offered at level-up; quest: learned only via quest; mana: base cost; cd seconds; rec: recovery (global lockout)
  const D = S.defs = {
    magic_missile: { n: 'Magic Missile', e: '✨', school: 'arcane', mana: 0, rec: 0.45, dmg: true, lv: 1,
      desc: r => `Fire a seeking bolt of force for ${X(10, 'arcane', r, 0)} arcane damage. Costs no mana.`,
      cast(r) {
        const t = S.aimTarget(9, 70); const o = S.origin(); const n = G.P.D.specials.missilewand ? 3 : 1;
        for (let k = 0; k < n; k++) {
          const dir = t ? G.E.center(t).sub(o).normalize() : S.aimDir();
          if (k) dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), (k === 1 ? 1 : -1) * 0.12);
          S.proj({ pos: o, dir, speed: 48, color: 0xc9a6ff, size: 0.9, homing: t, turn: 7, onHit: m => S.hit(m, 10, 'arcane', r, 0) });
        }
      } },
    heal: { n: 'Heal', e: '💚', school: 'holy', mana: 14, cd: 8, rec: 0.6, lv: 1,
      desc: r => `Restore ${fmt((30 + 9 * G.P.level) * S.rankMul(r) * (1 + G.P.D.spellPower * 0.5))} health and cure poison.`,
      cast(r) { const p = G.P; p.heal((30 + 9 * p.level) * S.rankMul(r) * (1 + p.D.spellPower * 0.5)); p.deb.poison = []; G.FX.burst(pc(), 0x9dff9d, 40, 3, 1, 1, -3); G.FX.ring(p.pos.x, p.pos.z, 3, 0x9dff9d, 0.8); } },
    firebolt: { n: 'Firebolt', e: '🔥', school: 'fire', mana: 6, rec: 0.65, dmg: true, lv: 2,
      desc: r => `Hurl a bolt of flame dealing ${X(16, 'fire', r)} fire damage and setting the target ablaze for ${X(10, 'fire', r)} more over 4s.`,
      cast(r, cost) {
        const t = S.aimTarget(8, 70); const o = S.origin(); const dir = t ? G.E.center(t).sub(o).normalize() : S.aimDir();
        const ember = G.P.D.specials.emberheart;
        S.proj({ pos: o, dir, speed: 42, color: 0xff7a1a, size: 1.3, trailN: 3, onHit: m => { S.hit(m, 16, 'fire', r, cost); G.E.addBurn(m, 2.5 * S.rankMul(r) * S.dmgMul('fire'), 4); },
          onBoom: ember ? (pos, hm) => explode(pos, 4, 8, 'fire', r, cost, 0xff7a1a, m => m !== hm && G.E.addBurn(m, 1.5 * S.rankMul(r) * S.dmgMul('fire'), 3)) : null });
      } },
    frost_shard: { n: 'Frost Shard', e: '❄️', school: 'frost', mana: 5, rec: 0.55, dmg: true, lv: 2,
      desc: r => `A shard of ice dealing ${X(13, 'frost', r)} frost damage and slowing the target by ${40 + r * 4}% for 3s.`,
      cast(r, cost) {
        const t = S.aimTarget(8, 70); const o = S.origin(); const dir = t ? G.E.center(t).sub(o).normalize() : S.aimDir();
        S.proj({ pos: o, dir, speed: 50, color: 0x9fe4ff, size: 1.0, onHit: m => { S.hit(m, 13, 'frost', r, cost); G.E.slow(m, 0.4 + r * 0.04, 3); } });
      } },
    drain_life: { n: 'Drain Life', e: '🩸', school: 'shadow', mana: 8, rec: 0.7, dmg: true, lv: 2, target: true,
      desc: r => `Rip the life from a target: ${X(14, 'shadow', r)} shadow damage, healing you for 60% of it.`,
      cast(r, cost) {
        const t = S.aimTarget(14, 40); if (!t) { S.msg('No target in sight.'); return false; }
        const dealt = S.hit(t, 14, 'shadow', r, cost); G.P.heal(dealt * 0.6);
        G.FX.bolt(G.E.center(t), S.origin(), 0xd0203a, 0.35, 0.4);
        for (let k = 0; k < 12; k++) { const a = G.E.center(t); const b = pc(); const f = Math.random(); G.FX.spawn(U.lerp(a.x, b.x, f), U.lerp(a.y, b.y, f), U.lerp(a.z, b.z, f), (b.x - a.x) * 0.8, (b.y - a.y) * 0.8, (b.z - a.z) * 0.8, 0.4, 0.9, 0xff3050, 0, 0); }
      } },
    stone_skin: { n: 'Stone Skin', e: '🪨', school: 'nature', mana: 16, cd: 30, rec: 0.5, lv: 2,
      desc: r => `Your skin hardens: take ${30 + r * 4}% less damage for 20s.`,
      cast(r) { G.P.buffs.stone = { t: 20, max: 20, v: 0.3 + r * 0.04 }; G.FX.burst(pc(), 0xb0a080, 40, 4, 1, 0.8); } },
    hex: { n: 'Hex', e: '🔯', school: 'shadow', mana: 8, rec: 0.5, lv: 2, target: true,
      desc: r => `Curse a target for ${8 + r * 2}s: it takes 30% more damage from all sources and deals 30% less.`,
      cast(r) {
        const t = S.aimTarget(14, 45); if (!t) { S.msg('No target in sight.'); return false; }
        G.E.hex(t, 8 + r * 2); G.FX.burst(G.E.center(t), 0xa04aff, 30, 3, 1, 0.8); G.E.aggro(t);
      } },
    chain_lightning: { n: 'Chain Lightning', e: '⚡', school: 'storm', mana: 14, rec: 0.9, dmg: true, lv: 4, target: true,
      desc: r => `Lightning strikes a target for ${X(20, 'storm', r)} storm damage, then arcs to ${3 + Math.floor(r / 2)} more enemies (losing 12% per jump).`,
      cast(r, cost) {
        let t = S.aimTarget(14, 45); if (!t) { S.msg('No target in sight.'); return false; }
        let from = S.origin(); const hit = []; let mult = 1;
        const jumps = 1 + 3 + Math.floor(r / 2) + (G.P.D.specials.stormcirclet ? 3 : 0);
        for (let j = 0; j < jumps && t; j++) {
          const c = G.E.center(t); G.FX.bolt(from, c, 0xfff27a, 0.28); G.FX.bolt(from, c, 0x9fd8ff, 0.2, 0.5);
          S.hit(t, 20 * mult, 'storm', r, cost); hit.push(t); mult *= 0.88; from = c;
          const cur = t; t = G.E.nearby(cur.pos.x, cur.pos.z, 13).find(m => !hit.includes(m)) || null;
        }
      } },
    toxic_cloud: { n: 'Toxic Cloud', e: '☁️', school: 'nature', mana: 16, cd: 8, rec: 0.8, dmg: true, lv: 4,
      desc: r => `Conjure a poison cloud (radius 6) for 8s. Enemies inside gain a stacking poison each second: ${X(4, 'nature', r)} damage/s per stack, up to 8 stacks.`,
      cast(r, cost) {
        const g = S.groundPoint(50); const dps = 4 * S.rankMul(r) * S.dmgMul('nature', cost);
        S.zone({ x: g.x, z: g.z, r: 6, dur: 8, tick: 1, color: 0x7fcf2a, onTick: m => G.E.addPoison(m, dps, 5),
          fxFn: (z, dt) => { for (let k = 0; k < 3; k++) G.FX.disc(z.x, z.z, z.r, Math.random() < .5 ? 0x5a9a1a : 0x9adf3a, 1, 3.5, 1.4, 0.8); } });
      } },
    fireball: { n: 'Fireball', e: '☄️', school: 'fire', mana: 18, rec: 1.0, dmg: true, lv: 5,
      desc: r => `A roaring ball of fire exploding for ${X(26, 'fire', r)} fire damage in a 5m radius and igniting everything for ${X(10, 'fire', r)} over 4s.`,
      cast(r, cost) {
        const t = S.aimTarget(7, 80); const o = S.origin(); const dir = t ? G.E.center(t).sub(o).normalize() : S.aimDir();
        S.proj({ pos: o, dir, speed: 34, color: 0xff6a10, size: 2.0, trailN: 4, onBoom: pos => explode(pos, 5, 26, 'fire', r, cost, 0xff7a1a, m => G.E.addBurn(m, 2.5 * S.rankMul(r) * S.dmgMul('fire'), 4)) });
      } },
    frost_nova: { n: 'Frost Nova', e: '💠', school: 'frost', mana: 16, cd: 14, rec: 0.6, dmg: true, lv: 5,
      desc: r => `Blast of cold around you (9m): ${X(12, 'frost', r)} frost damage and freezes enemies solid for ${(2.5 + r * 0.25).toFixed(1)}s.`,
      cast(r, cost) {
        nova(9, 0xbfefff, 90);
        G.E.nearby(G.P.pos.x, G.P.pos.z, 9).forEach(m => { S.hit(m, 12, 'frost', r, cost); G.E.freeze(m, 2.5 + r * 0.25); });
      } },
    arcane_shield: { n: 'Arcane Shield', e: '🛡️', school: 'arcane', mana: 20, cd: 20, rec: 0.5, lv: 6,
      desc: r => `A barrier absorbing damage equal to ${35 + r * 5}% of your max mana (${fmt(G.P.D.maxMana * (0.35 + r * 0.05) * (G.P.D.specials.unbroken ? 2 : 1))}) for 20s. Scales with max mana.`,
      cast(r) { const amt = G.P.D.maxMana * (0.35 + r * 0.05) * (G.P.D.specials.unbroken ? 2 : 1); G.P.buffs.shield = { t: 20, max: 20, amt, cap: amt }; G.FX.burst(pc(), 0x77aaff, 50, 4, 1.2, 0.8); } },
    haste: { n: 'Haste', e: '💨', school: 'arcane', mana: 18, cd: 45, rec: 0.3, lv: 8,
      desc: r => `For ${12 + r * 2}s: +${20 + r * 5}% cast speed and +20% movement speed.`,
      cast(r) { const d = 12 + r * 2; G.P.buffs.haste = { t: d, max: d, v: 0.2 + r * 0.05 }; G.FX.burst(pc(), 0xfff7a0, 40, 5, 1, 0.6); } },
    ice_lance: { n: 'Ice Lance', e: '🧊', school: 'frost', mana: 7, rec: 0.65, dmg: true, lv: 8,
      desc: r => `A spear of ice: ${X(18, 'frost', r)} frost damage. Deals triple damage to frozen targets and double to slowed ones.`,
      cast(r, cost) {
        const t = S.aimTarget(8, 70); const o = S.origin(); const dir = t ? G.E.center(t).sub(o).normalize() : S.aimDir();
        S.proj({ pos: o, dir, speed: 58, color: 0xd8f6ff, size: 1.1, trailN: 3, onHit: m => {
          const k = G.E.isFrozen(m) ? 3 : G.E.isSlowed(m) ? 2 : 1;
          if (k > 1) G.FX.burst(G.E.center(m), 0xffffff, 20, 6, 1, 0.4);
          S.hit(m, 18, 'frost', r, cost, k);
        } });
      } },
    combust: { n: 'Combust', e: '💥', school: 'fire', mana: 12, cd: 6, rec: 0.6, dmg: true, lv: 8,
      desc: r => `Detonate all burns on enemies within 30m: they instantly take ${150 + r * 20}% of the remaining burn damage, and flames splash 3m around each.`,
      cast(r, cost) {
        const ms = G.E.nearby(G.P.pos.x, G.P.pos.z, 30, m => m.fx.burn.length > 0);
        if (!ms.length) { S.msg('No burning enemies nearby.'); return false; }
        ms.forEach(m => {
          const rem = m.fx.burn.reduce((s, b) => s + b.dps * b.t, 0); m.fx.burn.length = 0;
          const c = G.E.center(m); G.FX.burst(c, 0xffa020, 40, 8, 1.4, 0.5); G.FX.flash(c, 0xff8a1a, 6, 0.3);
          const amt = rem * (1.5 + r * 0.2) * (G.P.D.specials.archcrown && cost >= 30 ? 1.35 : 1);
          G.E.damage(m, amt, 'fire', { crit: true });
          G.E.nearby(m.pos.x, m.pos.z, 3).forEach(o => { if (o !== m) G.E.damage(o, amt * 0.4, 'fire'); });
        });
      } },
    spirit_wolf: { n: 'Spirit Wolves', e: '🐺', school: 'nature', mana: 28, cd: 30, rec: 0.8, lv: 8,
      desc: r => `Summon ${1 + (r >= 3) + (r >= 5)} spectral wolf${r >= 3 ? 's' : ''} for 30s. Each bites for ${X(9, 'nature', r)} damage.`,
      cast(r) { const n = 1 + (r >= 3) + (r >= 5); for (let k = 0; k < n; k++) G.E.summonWolf(9 * S.rankMul(r) * S.dmgMul('nature'), 30); } },
    contagion: { n: 'Contagion', e: '🦠', school: 'nature', mana: 12, rec: 0.8, dmg: true, lv: 8, target: true,
      desc: r => `Infect a target with 4 stacks of plague (${X(3, 'nature', r)} damage/s each, 8s). Every 2s the plague jumps to a nearby enemy, and it spreads when the host dies.`,
      cast(r, cost) {
        const t = S.aimTarget(14, 45); if (!t) { S.msg('No target in sight.'); return false; }
        const dps = 3 * S.rankMul(r) * S.dmgMul('nature', cost);
        for (let k = 0; k < 4; k++) G.E.addPoison(t, dps, 8); t.fx.contagion = 8 + r; G.E.aggro(t);
        G.FX.bolt(S.origin(), G.E.center(t), 0x88dd22, 0.35, 0.3); G.FX.burst(G.E.center(t), 0x88dd22, 30, 3, 1, 0.8);
      } },
    arcane_barrage: { n: 'Arcane Barrage', e: '🌌', school: 'arcane', mana: 22, cd: 4, rec: 0.7, dmg: true, lv: 12,
      desc: r => `Unleash ${5 + Math.floor(r / 2)} seeking missiles at enemies in front of you, ${X(12, 'arcane', r)} arcane damage each.`,
      cast(r, cost) {
        const n = 5 + Math.floor(r / 2); const o0 = S.origin(); const d0 = S.aimDir();
        const cands = G.E.monsters.filter(m => !m.dead && G.E.center(m).sub(o0).normalize().dot(d0) > 0.6 && G.E.center(m).distanceTo(o0) < 50);
        for (let k = 0; k < n; k++) S.after(k * 0.08, () => {
          const t = cands.length ? cands[k % cands.length] : null; const o = S.origin();
          const dir = S.aimDir().add(new THREE.Vector3((Math.random() - .5) * .6, Math.random() * .4, (Math.random() - .5) * .6)).normalize();
          S.proj({ pos: o, dir, speed: 38, color: 0xd09aff, size: 0.9, homing: t && !t.dead ? t : null, turn: 6, onHit: m => S.hit(m, 12, 'arcane', r, cost) });
        });
      } },
    dragons_breath: { n: 'Dragon\'s Breath', e: '🐉', school: 'fire', mana: 26, cd: 7, rec: 0.9, dmg: true, lv: 12,
      desc: r => `Exhale a cone of dragonfire (12m): ${X(38, 'fire', r)} fire damage and ${X(12, 'fire', r)} burn over 4s to everything in front of you.`,
      cast(r, cost) {
        const o = S.origin(), d = S.aimDir();
        for (let k = 0; k < 120; k++) { const v = d.clone().add(new THREE.Vector3((Math.random() - .5) * .9, (Math.random() - .5) * .5, (Math.random() - .5) * .9)).normalize().multiplyScalar(18 + Math.random() * 10); G.FX.spawn(o.x, o.y, o.z, v.x, v.y, v.z, 0.5 + Math.random() * 0.2, 1.6, Math.random() < .5 ? 0xff5a10 : 0xffc040, -2, 1.5, 3); }
        const c = V();
        G.E.monsters.forEach(m => {
          if (m.dead) return; G.E.center(m, c); const to = c.sub(o); const dist = to.length(); if (dist > 12 + m.h * 0.3) return;
          if (to.normalize().dot(d) > 0.72 || dist < 2.5) { S.hit(m, 38, 'fire', r, cost); G.E.addBurn(m, 3 * S.rankMul(r) * S.dmgMul('fire'), 4); }
        });
      } },
    soul_harvest: { n: 'Soul Harvest', e: '💀', school: 'shadow', mana: 18, cd: 12, rec: 0.7, dmg: true, lv: 12,
      desc: r => `Tear at the souls of all enemies within 12m for ${X(16, 'shadow', r)} shadow damage. Gain +8% spell damage per enemy hit (max 5) for ${12 + r * 2}s and heal 3% health per enemy.`,
      cast(r, cost) {
        const ms = G.E.nearby(G.P.pos.x, G.P.pos.z, 12); nova(12, 0x9a3aff, 70);
        ms.forEach(m => { S.hit(m, 16, 'shadow', r, cost); G.FX.bolt(G.E.center(m), pc(), 0xb05aff, 0.3, 0.3); });
        if (ms.length) { const n = Math.min(5, ms.length); G.P.buffs.soul = { t: 12 + r * 2, max: 12 + r * 2, n }; G.P.heal(G.P.D.maxHp * 0.03 * n); }
      } },
    thunderstrike: { n: 'Thunderstrike', e: '🌩️', school: 'storm', mana: 28, cd: 6, rec: 0.8, dmg: true, lv: 12,
      desc: r => `Call lightning onto the target area (4.5m): ${X(48, 'storm', r)} storm damage and stuns for ${(1.5 + r * 0.1).toFixed(1)}s.`,
      cast(r, cost) {
        const g = S.groundPoint(60); const top = g.clone(); top.y += 45;
        G.FX.ring(g.x, g.z, 4.5, 0xfff27a, 0.25, { grow: false, fill: true, opacity: 0.4 });
        S.after(0.15, () => {
          for (let k = 0; k < 3; k++) G.FX.bolt(top.clone().add(new THREE.Vector3((Math.random() - .5) * 6, 0, (Math.random() - .5) * 6)), g, k ? 0x9fd8ff : 0xfff8b0, 0.35, 2.5);
          G.FX.flash(g.clone().setY(g.y + 1), 0xfff8c0, 14, 0.35); G.FX.burst(g.clone().setY(g.y + 0.5), 0xfff27a, 50, 10, 1.2, 0.5); G.FX.ring(g.x, g.z, 4.5, 0xfff27a, 0.5);
          G.E.nearby(g.x, g.z, 4.5).forEach(m => { S.hit(m, 48, 'storm', r, cost); G.E.stun(m, 1.5 + r * 0.1); });
          G.UI.shake(0.25);
        });
      } },
    terror: { n: 'Terror', e: '😱', school: 'shadow', mana: 14, cd: 20, rec: 0.5, lv: 12,
      desc: r => `A wave of dread (12m): enemies flee in panic for ${(3.5 + r * 0.5).toFixed(1)}s. Bosses are only slowed.`,
      cast(r) { nova(12, 0x6a2aaa, 60); G.E.nearby(G.P.pos.x, G.P.pos.z, 12).forEach(m => { G.E.fear(m, 3.5 + r * 0.5); G.E.aggro(m); }); } },
    blizzard: { n: 'Blizzard', e: '🌨️', school: 'frost', mana: 40, cd: 10, rec: 1.0, dmg: true, lv: 16,
      desc: r => `A howling storm of ice (8m radius) for 6s: ${X(12, 'frost', r, 40)} frost damage every 0.5s and slows by 50%.`,
      cast(r, cost) {
        const g = S.groundPoint(55);
        S.zone({ x: g.x, z: g.z, r: 8, dur: 6, tick: 0.5, color: 0xbfefff, height: 20, onTick: m => { S.hit(m, 12, 'frost', r, cost); G.E.slow(m, 0.5, 1); },
          fxFn: (z) => { for (let k = 0; k < 8; k++) { const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * z.r; const x = z.x + Math.cos(a) * d, zz = z.z + Math.sin(a) * d; G.FX.spawn(x, G.W.groundY(x, zz) + 10 + Math.random() * 4, zz, 3, -14, 1, 0.9, 0.7, 0xeaf8ff, 0, 0); } } });
      } },
    arcane_power: { n: 'Arcane Power', e: '🔆', school: 'arcane', mana: 12, cd: 45, rec: 0.3, lv: 16,
      desc: r => `Overcharge your magic for 12s: +${40 + r * 5}% spell damage, but damaging spells cost 50% more mana.`,
      cast(r) { G.P.buffs.apower = { t: 12, max: 12, v: 0.4 + r * 0.05 }; G.FX.burst(pc(), 0xe0a0ff, 60, 6, 1.2, 0.8); } },
    slow_time: { n: 'Slow Time', e: '⏳', school: 'arcane', mana: 34, cd: 45, rec: 0.5, lv: 16,
      desc: r => `Bend time for ${7 + r}s: all enemies near you move and attack 60% slower, and hostile projectiles crawl.`,
      cast(r) { G.E.timeSlow = 7 + r; G.P.buffs.slowtime = { t: 7 + r, max: 7 + r }; nova(25, 0xffe0a0, 80); G.UI.msg('Time slows around you...', 'info'); } },

    // ---- quest spells ----
    blink: { n: 'Blink', e: '🌀', school: 'arcane', mana: 10, cd: 5, rec: 0.2, quest: true,
      desc: () => `Teleport up to 16m in the direction you are looking (moving direction if walking backwards).`,
      cast() {
        const p = G.P; const from = pc();
        const d = p.flying ? p.lookDir() : p.forward();
        const I = G.Input; if (!p.flying && (I.keys.KeyS || I.joy.y < -0.5)) d.negate();
        let best = 0;
        for (let s = 1; s <= 16; s += 0.5) {
          const x = p.pos.x + d.x * s, z = p.pos.z + d.z * s; const h = G.W.groundY(x, z);
          const y = p.flying ? p.pos.y + d.y * s : h;
          if (!p.flying && h - p.pos.y > 6) break; if (p.flying && y < h) break;
          best = s;
        }
        p.pos.x += d.x * best; p.pos.z += d.z * best; p.pos.y = p.flying ? Math.max(p.pos.y + d.y * best, G.W.groundY(p.pos.x, p.pos.z) + 0.3) : G.W.groundY(p.pos.x, p.pos.z); p.vy = 0;
        G.W.collide(p.pos, 0.5);
        G.FX.burst(from, 0xa070ff, 40, 5, 1, 0.6); G.FX.burst(pc(), 0xa070ff, 40, 5, 1, 0.6);
        if (p.D.specials.windrunner) S.after(0, () => { S.cds.blink = 0; });
      } },
    town_portal: { n: 'Town Portal', e: '🏘️', school: 'arcane', mana: 30, cd: 30, rec: 0.5, quest: true,
      desc: () => `Open a portal to any village you have visited. Cannot be cast while in combat.`,
      cast() { if (G.P.inCombat()) { S.msg('You cannot focus the portal while in combat.'); return false; } G.UI.openPortal(); return 'defer'; } },
    water_walk: { n: 'Water Walking', e: '🌊', school: 'nature', mana: 20, cd: 5, rec: 0.5, quest: true,
      desc: () => `Walk on water (and hover over lava) for 3 minutes.`,
      cast() { G.P.buffs.water = { t: 180, max: 180 }; G.FX.burst(pc(), 0x5ac8ff, 40, 3, 1, 0.8); } },
    invisibility: { n: 'Invisibility', e: '👻', school: 'shadow', mana: 30, cd: 60, rec: 0.3, quest: true,
      desc: () => `Become unseen for 25s. Monsters lose track of you. Casting a damaging spell breaks the effect.`,
      cast() { G.P.buffs.invis = { t: 25, max: 25 }; G.E.monsters.forEach(m => { if (m.state === 'chase') m.state = 'return'; }); G.FX.burst(pc(), 0xdddddd, 40, 3, 1, 0.8); } },
    fly: { n: 'Fly', e: '🪽', school: 'storm', mana: 12, cd: 1, rec: 0.3, quest: true,
      desc: () => `Toggle flight. Drains mana every second while airborne. Move where you look; Space / C to rise and descend.`,
      cast() { const p = G.P; p.flying = !p.flying; if (p.flying) { p.pos.y += 1.5; G.UI.msg('You take to the skies!', 'info'); } G.FX.burst(pc(), 0xe0f0ff, 30, 4, 1, 0.6); return p.flying ? true : 'free'; } },
    beacon_mark: { n: 'Beacon: Mark', e: '📍', school: 'arcane', mana: 10, cd: 3, rec: 0.5, quest: true,
      desc: () => `Mark your current location for Beacon: Recall.`,
      cast() { const p = G.P; p.beacon = { x: p.pos.x, y: p.pos.y, z: p.pos.z }; G.FX.ring(p.pos.x, p.pos.z, 3, 0x7fd4ff, 1.2); G.UI.msg('Beacon set.', 'info'); } },
    beacon_recall: { n: 'Beacon: Recall', e: '🔭', school: 'arcane', mana: 25, cd: 30, rec: 0.5, quest: true,
      desc: () => `Return instantly to your marked beacon.`,
      cast() { const p = G.P; if (!p.beacon) { S.msg('No beacon marked.'); return false; } G.FX.burst(pc(), 0x7fd4ff, 40, 5, 1, 0.6); p.teleport(p.beacon.x, p.beacon.z, Math.max(p.beacon.y, G.W.groundY(p.beacon.x, p.beacon.z))); G.FX.burst(pc(), 0x7fd4ff, 40, 5, 1, 0.6); } },
    meteor: { n: 'Meteor', e: '🌠', school: 'fire', mana: 70, cd: 14, rec: 1.2, dmg: true, quest: true, maxRank: 5,
      desc: r => `Call down a meteor on the target area (7m): ${X(130, 'fire', r, 70)} fire damage plus a burn of ${X(30, 'fire', r)} over 5s. Needs a deep mana pool.`,
      cast(r, cost) {
        const g = S.groundPoint(70);
        G.FX.ring(g.x, g.z, 7, 0xff4a1a, 1.0, { grow: false, fill: true, opacity: 0.5 });
        const start = g.clone().add(new THREE.Vector3(-18, 50, -10)); const s = G.FX.glowSprite(0xff7a2a, 5);
        const tm = { t: 0 };
        S.timers.push({ t: 0, every: true, fn: (dt) => {
          tm.t += dt; const f = Math.min(1, tm.t / 0.9); s.position.lerpVectors(start, g, f);
          for (let k = 0; k < 5; k++) G.FX.trail(s.position, Math.random() < .5 ? 0xff5a10 : 0xffd060, 2.5, 0.7);
          if (f >= 1) {
            s.parent.remove(s); s.material.dispose();
            explode(g.clone().setY(g.y + 1), 7, 130, 'fire', r, cost, 0xff6a10, m => G.E.addBurn(m, 6 * S.rankMul(r) * S.dmgMul('fire'), 5));
            G.FX.disc(g.x, g.z, 7, 0xff8a2a, 80, 2, 1.2, 4); G.UI.shake(0.5);
            return true;
          }
        } });
      } },
    starfall: { n: 'Starfall', e: '🌟', school: 'arcane', mana: 90, cd: 20, rec: 1.2, dmg: true, quest: true, maxRank: 5,
      desc: r => `The Codex's final word. 12 stars rain on the target area over 2.5s, each dealing ${X(38, 'arcane', r, 90)} arcane damage in 3.5m.`,
      cast(r, cost) {
        const g = S.groundPoint(70);
        for (let k = 0; k < 12; k++) S.after(k * 0.2, () => {
          const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * 9; const x = g.x + Math.cos(a) * d, z = g.z + Math.sin(a) * d; const y = G.W.groundY(x, z);
          G.FX.bolt(new THREE.Vector3(x + 4, y + 40, z), new THREE.Vector3(x, y, z), 0xe8d0ff, 0.3, 0.2);
          explode(new THREE.Vector3(x, y + 0.8, z), 3.5, 38, 'arcane', r, cost, 0xd8b0ff);
        });
      } },
  };
  for (const k in D) { D[k].id = k; D[k].maxRank = D[k].maxRank || (D[k].quest ? 1 : 5); D[k].cd = D[k].cd || 0; }

  // ---------------- casting ----------------
  S.castSlot = function (i) { const id = G.P.hotbar[i]; if (id) S.cast(id); };
  S.cast = function (id) {
    const p = G.P; const d = D[id];
    if (!d || !p.spells[id] || p.dead || G.UI.isOpen()) return false;
    if (p.deb.stunT > 0) { S.msg('You are stunned!'); return false; }
    if (S.gcd > 0) { if (S.gcd < 0.2) S.queued = id; return false; }
    if (S.cds[id] > 0) { S.msg(d.n + ' is not ready yet.'); return false; }
    const r = p.spells[id]; const cost = S.costOf(id);
    const blood = p.D.specials.bloodpact;
    if (!(id === 'fly' && p.flying)) {
      if (blood) { if (p.hp <= cost + 1) { S.msg('Not enough health!'); return false; } }
      else if (p.mana < cost) { S.msg('Not enough mana!'); G.UI.flashMana(); return false; }
    }
    const res = d.cast(r, cost);
    if (res === false || res === 'defer') return false;
    if (res !== 'free') { if (blood) p.hp -= cost; else p.mana -= cost; }
    S.gcdMax = d.rec / (1 + Math.max(-0.3, p.effHaste())); S.gcd = S.gcdMax;
    if (d.cd) { S.cdMax[id] = d.cd * p.D.cdMul * (p.buffs.haste ? 1 / (1 + p.buffs.haste.v * 0.5) : 1); S.cds[id] = S.cdMax[id]; }
    if (id === 'blink' && p.D.specials.windrunner) S.cds.blink = 0;
    if (d.dmg) { p.lastCombatT = G.now; if (p.buffs.invis) { delete p.buffs.invis; G.UI.msg('You are revealed!', 'warn'); } }
    if (d.dmg && p.D.specials.echo && Math.random() < 0.2) S.after(0.18, () => { d.cast(r, cost); G.FX.text(pc().addScaledVector(p.forward(), 2).setY(p.pos.y + 2.2), 'Echo!', 'info'); });
    G.UI.castFlash(id);
    return true;
  };
  S.payPortal = function (vid) {
    const p = G.P, v = G.VILLAGES.find(v => v.id === vid); const cost = S.costOf('town_portal');
    if (p.D.specials.bloodpact ? p.hp <= cost + 1 : p.mana < cost) { S.msg('Not enough mana!'); return; }
    if (p.D.specials.bloodpact) p.hp -= cost; else p.mana -= cost;
    S.cdMax.town_portal = D.town_portal.cd * p.D.cdMul; S.cds.town_portal = S.cdMax.town_portal;
    G.FX.burst(pc(), 0x7fd4ff, 60, 5, 1.2, 0.8);
    p.flying = false; p.teleport(v.x + 6, v.z + 6); p.lastVillage = vid;
    G.FX.burst(pc(), 0x7fd4ff, 60, 5, 1.2, 0.8);
    G.UI.msg('The portal delivers you to ' + v.name + '.', 'info');
  };

  // spells offered at level-up
  S.offerFor = function (L) {
    const p = G.P;
    const news = Object.values(D).filter(d => !d.quest && !p.spells[d.id] && d.lv <= L);
    const ups = Object.values(D).filter(d => p.spells[d.id] && p.spells[d.id] < d.maxRank && (!d.quest || d.maxRank > 1));
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    shuffle(news); shuffle(ups);
    // prefer spells of the newest tier
    news.sort((a, b) => b.lv - a.lv + (Math.random() - 0.5) * 6);
    const out = [];
    const nNew = Math.min(news.length, ups.length ? 2 : 3);
    for (let i = 0; i < nNew; i++) out.push(news[i].id);
    for (let i = 0; out.length < 3 && i < ups.length; i++) out.push(ups[i].id);
    for (let i = nNew; out.length < 3 && i < news.length; i++) out.push(news[i].id);
    return out;
  };
  S.learn = function (id) {
    const p = G.P;
    if (p.spells[id]) p.spells[id] = Math.min(D[id].maxRank, p.spells[id] + 1);
    else { p.spells[id] = 1; const e = p.hotbar.indexOf(null); if (e >= 0) p.hotbar[e] = id; }
    G.UI.msg((p.spells[id] > 1 ? D[id].n + ' improved to rank ' + p.spells[id] : 'You learned ' + D[id].n) + '!', 'gold');
  };

  S.init = function (sc) { scene = sc; };
  S.reset = function () {
    S.projs.forEach(p => { p.s.parent && p.s.parent.remove(p.s); }); S.projs = [];
    S.zones.forEach(z => G.FX.removeRing(z.ring)); S.zones = []; S.timers = []; S.cds = {}; S.gcd = 0;
  };
  S.update = function (dt) {
    S.msgT -= dt;
    if (S.gcd > 0) S.gcd -= dt;
    for (const k in S.cds) if (S.cds[k] > 0) S.cds[k] -= dt;
    for (let i = S.timers.length - 1; i >= 0; i--) {
      const t = S.timers[i];
      if (t.every) { if (t.fn(dt)) S.timers.splice(i, 1); continue; }
      t.t -= dt; if (t.t <= 0) { S.timers.splice(i, 1); t.fn(); }
    }
    updateProjs(dt); updateZones(dt);
    if (S.gcd <= 0) {
      if (S.queued) { const q = S.queued; S.queued = null; S.cast(q); }
      else if (!G.UI.isOpen()) { const H = G.Input.held; for (let i = 0; i < 10; i++) if (H['k' + i] && G.P.hotbar[i]) { const d = D[G.P.hotbar[i]]; if (d && (d.dmg || i < 2) && !(S.cds[d.id] > 0)) { S.castSlot(i); break; } } }
    }
  };
})();
