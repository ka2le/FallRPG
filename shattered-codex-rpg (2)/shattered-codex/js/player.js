'use strict';
(function () {
  const U = G.U;
  const STAT_KEYS = ['power', 'vitality', 'arcana', 'focus', 'celerity', 'agility'];
  G.STAT_KEYS = STAT_KEYS;
  G.SPELL_PICK_LEVELS = [2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 33, 36, 39];
  G.xpNext = L => Math.round(60 * Math.pow(L, 1.55) + 40);
  G.S = { bossKilled: {}, chests: {}, shrines: {}, kills: 0 };

  const P = G.P = {
    pos: new THREE.Vector3(6, 0, 6), vy: 0, yaw: -Math.PI / 2, pitch: 0, onGround: true, flying: false, swimming: false,
    level: 1, xp: 0, statPts: 0, alloc: {}, bonus: {}, hp: 80, mana: 45, gold: 20,
    spells: { magic_missile: 1, heal: 1 }, hotbar: ['magic_missile', 'heal', null, null, null, null, null, null, null, null],
    buffs: {}, deb: { poison: [], burn: [], slowT: 0, stunT: 0, weakT: 0, stunImm: 0 }, equip: {}, inv: [], lastVillage: 'brightwater', visited: { brightwater: true },
    beacon: null, lastDamageT: -99, lastCombatT: -99, dead: false, D: { specials: {} }, potionCd: { hp: 0, mp: 0 }, pendingPicks: 0, bob: 0, fallStart: null,
  };
  STAT_KEYS.forEach(k => { P.alloc[k] = 0; P.bonus[k] = 0; });

  // ---------------- derived stats ----------------
  P.itemStats = function () {
    const st = {}; const specials = {};
    for (const s in P.equip) { const it = P.equip[s]; if (!it) continue; for (const k in it.stats) st[k] = (st[k] || 0) + it.stats[k]; if (it.special) specials[it.special] = true; }
    return { st, specials };
  };
  P.recalc = function () {
    const { st, specials } = P.itemStats(); const L = P.level; const D = P.D;
    const a = {}; STAT_KEYS.forEach(k => a[k] = P.alloc[k] + P.bonus[k] + (st[k] || 0));
    D.attr = a; D.st = st; D.specials = specials;
    const oldMaxHp = D.maxHp || 1, oldMaxMana = D.maxMana || 1;
    D.maxHp = Math.round((70 + 14 * L + 30 * a.vitality + (st.hp || 0)) * (1 + (st.hpPct || 0) / 100));
    D.hpRegen = 0.4 + 0.02 * L + 0.3 * a.vitality + (st.hpRegen || 0);
    D.maxMana = Math.round(Math.max(10, (40 + 5 * L + 22 * a.arcana + (st.mana || 0)) * (1 + (st.manaPct || 0) / 100)));
    D.manaRegen = Math.max(0, (0.8 + 0.07 * L + 0.55 * a.focus + (st.manaRegen || 0)) * (1 + (st.manaRegenPct || 0) / 100));
    D.spellPower = 0.10 * a.power + (st.spellDmg || 0) / 100;
    D.school = {}; ['fire', 'frost', 'storm', 'arcane', 'nature', 'shadow'].forEach(k => D.school[k] = (st[k] || 0) / 100);
    D.haste = U.clamp(0.05 * a.celerity + (st.haste || 0) / 100, -0.3, 0.6);
    D.moveMul = Math.max(0.5, 1 + 0.035 * a.agility + (st.move || 0) / 100);
    D.move = 9 * D.moveMul;
    D.crit = Math.min(0.75, 0.05 + 0.015 * a.agility + (st.crit || 0) / 100);
    D.critMult = 1.5 + (st.critDmg || 0) / 100;
    D.dodge = Math.min(0.25, 0.008 * a.agility);
    D.armor = Math.max(0, st.armor || 0);
    D.resist = Math.min(0.6, (st.resist || 0) / 100);
    D.manaCost = Math.min(0.5, (st.manaCost || 0) / 100);
    D.cdMul = 1 / (1 + Math.max(0, D.haste) + (specials.hourglass ? 0.25 : 0));
    if (P.hp > 0) { P.hp = Math.min(D.maxHp, P.hp * (D.maxHp / oldMaxHp > 1 && oldMaxHp > 1 ? 1 : 1)); }
    P.hp = Math.min(P.hp, D.maxHp); P.mana = Math.min(P.mana, D.maxMana);
  };
  P.effHaste = () => P.D.haste + (P.buffs.haste ? P.buffs.haste.v : 0);
  P.speed = function () {
    let s = P.D.move * (P.buffs.haste ? 1.2 : 1);
    if (P.deb.slowT > 0) s *= 0.6;
    if (P.swimming) s *= 0.55;
    if (P.flying) s *= 1.35;
    return s;
  };

  // ---------------- XP / leveling ----------------
  P.gainXp = function (n) {
    if (n <= 0) return;
    P.xp += n;
    G.FX.text(new THREE.Vector3(P.pos.x, P.pos.y + 2.4, P.pos.z).addScaledVector(P.forward(), 3), '+' + n + ' xp', 'xp');
    while (P.level < 40 && P.xp >= G.xpNext(P.level)) {
      P.xp -= G.xpNext(P.level); P.level++;
      P.statPts += 1 + (P.level % 5 === 0 ? 1 : 0);
      P.recalc(); P.hp = P.D.maxHp; P.mana = P.D.maxMana;
      G.FX.burst(new THREE.Vector3(P.pos.x, P.pos.y + 1, P.pos.z), 0xffe08a, 80, 8, 1.2, 1.2, -2);
      G.FX.ring(P.pos.x, P.pos.z, 6, 0xffd84a, 1.0);
      G.UI.toast('Level ' + P.level + '!', 'level');
      G.UI.msg('You reached level ' + P.level + '. You have ' + P.statPts + ' attribute point' + (P.statPts > 1 ? 's' : '') + ' to spend (I).', 'gold');
      if (G.SPELL_PICK_LEVELS.includes(P.level)) { P.pendingPicks++; G.UI.msg('✨ You can learn a new spell — press B or tap ✨ Learn spell when you are ready.', 'magic'); }
    }
    G.UI.dirtyInv = true;
  };

  // ---------------- combat ----------------
  P.heal = function (n, quiet) {
    if (P.dead) return;
    const before = P.hp; P.hp = Math.min(P.D.maxHp, P.hp + n);
    if (!quiet && P.hp - before >= 1) G.FX.text(new THREE.Vector3(P.pos.x, P.pos.y + 2, P.pos.z).addScaledVector(P.forward(), 2.5), '+' + Math.round(P.hp - before), 'heal');
  };
  P.takeDamage = function (raw, o) {
    if (P.dead) return;
    o = o || {};
    const D = P.D;
    if (Math.random() < D.dodge) { G.FX.text(new THREE.Vector3(P.pos.x, P.pos.y + 1.8, P.pos.z).addScaledVector(P.forward(), 2), 'Dodge', 'info'); return; }
    let a = raw;
    if (o.src && o.src.fx && o.src.fx.hexT > 0) a *= 0.7;
    const ml = o.src ? o.src.level : P.level;
    if (o.kind === 'magic') a *= 1 - D.resist;
    else if (o.kind !== 'true') a *= 1 - D.armor / (D.armor + 30 + 12 * ml);
    if (P.buffs.stone) a *= 1 - P.buffs.stone.v;
    if (D.specials.malhorn) a *= 1.25;
    if (P.buffs.shield) {
      const ab = Math.min(P.buffs.shield.amt, a); P.buffs.shield.amt -= ab; a -= ab;
      if (ab > 0) G.FX.burst(new THREE.Vector3(P.pos.x, P.pos.y + 1, P.pos.z).addScaledVector(P.forward(), 0.8), 0x77aaff, 6, 3, 0.8, 0.3);
      if (P.buffs.shield.amt <= 0.5) { delete P.buffs.shield; G.UI.msg('Your arcane shield shatters.', 'warn'); }
    }
    P.hp -= a; P.lastDamageT = G.now; P.lastCombatT = G.now;
    if (a >= 1) G.UI.hurt(a / D.maxHp);
    const e = o.eff;
    if (e && o.src) {
      const base = o.src.dmg;
      if (e === 'poison') { P.deb.poison.push({ dps: base * 0.18, t: 4 }); if (P.deb.poison.length > 5) P.deb.poison.shift(); }
      else if (e === 'burn') { P.deb.burn.push({ dps: base * 0.22, t: 3 }); if (P.deb.burn.length > 3) P.deb.burn.shift(); }
      else if (e === 'slow') P.deb.slowT = 2.5;
      else if (e === 'stun' && P.deb.stunImm <= 0) { P.deb.stunT = 0.8; P.deb.stunImm = 4; G.UI.msg('You are stunned!', 'warn'); }
      else if (e === 'weaken') P.deb.weakT = 5;
    }
    if (P.hp <= 0) P.die();
  };
  P.die = function () {
    P.dead = true; P.hp = 0; P.flying = false;
    if (document.pointerLockElement) document.exitPointerLock();
    G.UI.showDeath();
  };
  P.respawn = function () {
    const v = G.VILLAGES.find(v => v.id === P.lastVillage) || G.VILLAGES[0];
    const lost = Math.floor(P.gold * 0.1); P.gold -= lost;
    P.dead = false; P.hp = P.D.maxHp; P.mana = P.D.maxMana; P.buffs = {}; P.deb = { poison: [], burn: [], slowT: 0, stunT: 0, weakT: 0, stunImm: 0 };
    P.teleport(v.x + 5, v.z + 5);
    G.E.monsters.forEach(m => { if (m.state === 'chase') m.state = 'return'; });
    G.UI.msg('You awaken in ' + v.name + '. You lost ' + lost + ' gold.', 'warn');
  };
  P.teleport = function (x, z, y) {
    P.pos.x = x; P.pos.z = z; P.pos.y = y !== undefined ? y : G.W.groundY(x, z); P.vy = 0; P.fallStart = null;
    G.W.collide(P.pos, 0.5);
  };
  P.forward = function (out) { return (out || new THREE.Vector3()).set(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)); };
  P.lookDir = function (out) { const cp = Math.cos(P.pitch); return (out || new THREE.Vector3()).set(-Math.sin(P.yaw) * cp, Math.sin(P.pitch), -Math.cos(P.yaw) * cp); };
  P.eye = function (out) { return (out || new THREE.Vector3()).set(P.pos.x, P.pos.y + (P.swimming ? 1.45 : 1.7), P.pos.z); };
  P.inCombat = () => G.now - P.lastCombatT < 6;

  P.drink = function (kind) {
    if (P.dead) return;
    if (P.potionCd[kind] > 0) return;
    let best = null;
    P.inv.forEach(e => { if (e.it.potion && e.it.potion.kind === kind && (!best || e.it.potion.tier > best.it.potion.tier)) best = e; });
    if (!best) { G.UI.msg('No ' + (kind === 'hp' ? 'healing' : 'mana') + ' potions!', 'warn'); return; }
    G.Inv.use(best.it.uid);
  };

  // ---------------- update ----------------
  const tmpF = new THREE.Vector3(), tmpR = new THREE.Vector3();
  P.update = function (dt) {
    if (P.dead) return;
    const W = G.W, D = P.D, I = G.Input;
    // debuffs
    let dps = 0;
    for (const k of ['poison', 'burn']) for (let i = P.deb[k].length - 1; i >= 0; i--) { const e = P.deb[k][i]; e.t -= dt; dps += e.dps; if (e.t <= 0) P.deb[k].splice(i, 1); }
    if (dps > 0) { P.hp -= dps * dt; P.lastCombatT = G.now; if (P.hp <= 0) { P.die(); return; } }
    for (const k of ['slowT', 'stunT', 'weakT', 'stunImm']) if (P.deb[k] > 0) P.deb[k] -= dt;
    for (const k in P.potionCd) if (P.potionCd[k] > 0) P.potionCd[k] -= dt;
    // buffs
    for (const k in P.buffs) {
      const b = P.buffs[k]; if (b.t === undefined) continue;
      b.t -= dt; if (b.t <= 0) { delete P.buffs[k]; if (k === 'water') G.UI.msg('Water Walking fades.', 'info'); if (k === 'invis') G.UI.msg('You become visible.', 'info'); }
    }
    // regen
    const ooc = G.now - P.lastDamageT > 5;
    P.hp = Math.min(D.maxHp, P.hp + D.hpRegen * (ooc ? 4 : 1) * dt);
    if (!D.specials.bloodpact) P.mana = Math.min(D.maxMana, P.mana + D.manaRegen * (P.inCombat() ? 1 : 1.6) * dt);
    // flying mana drain
    if (P.flying) {
      const drain = 2.2 * (1 + 0.05 * (P.level - 1)) * (D.specials.zephyr ? 0.25 : 1) * dt;
      if (D.specials.bloodpact) P.hp -= drain; else P.mana -= drain;
      if (P.mana <= 0 || P.hp <= 1) { P.mana = Math.max(0, P.mana); P.flying = false; G.UI.msg('Your flight falters — out of mana!', 'warn'); }
    }
    // look
    const sens = G.settings.sens;
    P.yaw -= I.lookDX * sens; P.pitch -= I.lookDY * sens * (G.settings.invertY ? -1 : 1);
    I.lookDX = 0; I.lookDY = 0;
    P.pitch = U.clamp(P.pitch, -1.45, 1.45);
    // movement
    let mx = 0, mz = 0;
    if (!G.UI.isOpen()) {
      if (I.keys.KeyW || I.keys.ArrowUp) mz += 1; if (I.keys.KeyS || I.keys.ArrowDown) mz -= 1;
      if (I.keys.KeyD || I.keys.ArrowRight) mx += 1; if (I.keys.KeyA || I.keys.ArrowLeft) mx -= 1;
      if (I.joy.active) { mx += I.joy.x; mz += I.joy.y; }
    }
    const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
    if (P.deb.stunT > 0) { mx = 0; mz = 0; }
    const spd = P.speed();
    P.forward(tmpF); tmpR.set(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
    const px0 = P.pos.x, pz0 = P.pos.z;
    const groundH = W.heightAt(P.pos.x, P.pos.z);
    if (P.flying) {
      P.lookDir(tmpF);
      P.pos.addScaledVector(tmpF, mz * spd * dt).addScaledVector(tmpR, mx * spd * dt);
      let up = 0; if (I.keys.Space || I.btnUp) up += 1; if (I.keys.KeyC || I.keys.ControlLeft || I.btnDown) up -= 1;
      P.pos.y += up * spd * 0.8 * dt;
      const g = W.groundY(P.pos.x, P.pos.z);
      P.pos.y = U.clamp(P.pos.y, g + 0.2, Math.max(g + 90, 160));
      P.onGround = P.pos.y <= g + 0.21; P.swimming = false; P.vy = 0; P.fallStart = null;
    } else {
      let vx = (tmpF.x * mz + tmpR.x * mx) * spd, vz = (tmpF.z * mz + tmpR.z * mx) * spd;
      // slope resistance
      if (P.onGround && (vx || vz)) {
        const ahead = W.heightAt(P.pos.x + vx * 0.08, P.pos.z + vz * 0.08) - groundH;
        const rise = ahead / (Math.hypot(vx, vz) * 0.08);
        if (rise > 0.9) { const k = U.clamp(1 - (rise - 0.9) * 0.9, 0.15, 1); vx *= k; vz *= k; }
      }
      P.pos.x += vx * dt; P.pos.z += vz * dt;
      const h = W.heightAt(P.pos.x, P.pos.z);
      const waterWalk = !!P.buffs.water;
      const lava = h < -0.3 && W.isLava(P.pos.x, P.pos.z);
      let floor = h;
      P.swimming = false;
      if (h < 0) {
        if (waterWalk) floor = 0;
        else if (h < -1.1) { floor = -1.1; P.swimming = true; }
        else floor = h;
      }
      if (lava && P.pos.y < 0.5) { P.takeDamage(P.D.maxHp * (waterWalk ? 0.06 : 0.14) * dt, { kind: 'true' }); if (Math.random() < dt * 10) G.FX.burst(new THREE.Vector3(P.pos.x, 0.2, P.pos.z), 0xff5a1a, 3, 3, 0.8, 0.5); }
      if (!G.UI.isOpen() && (I.keys.Space || I.btnJump) && (P.onGround || P.swimming) && P.deb.stunT <= 0) { P.vy = P.swimming ? 6 : 8.5; P.onGround = false; I.btnJump = false; }
      P.vy -= 24 * dt;
      P.pos.y += P.vy * dt;
      if (P.pos.y <= floor) {
        P.pos.y = floor; P.vy = 0; P.onGround = true;
      } else if (P.pos.y > floor + 0.35 && P.vy < 0) {
        P.onGround = false;
      } else if (P.onGround && P.pos.y - floor < 0.6 && P.vy <= 0) { P.pos.y = floor; }
    }
    if (!P.flying || P.pos.y - W.groundY(P.pos.x, P.pos.z) < 3) W.collide(P.pos, 0.5);
    const lim = 1060; const r = Math.hypot(P.pos.x, P.pos.z); if (r > lim) { P.pos.x *= lim / r; P.pos.z *= lim / r; }
    const moved = Math.hypot(P.pos.x - px0, P.pos.z - pz0);
    if (P.onGround && !P.flying) P.bob += moved * 1.6;
    // villages
    for (const v of G.VILLAGES) if (U.d2(P.pos.x, P.pos.z, v.x, v.z) < 45) {
      if (!P.visited[v.id]) { P.visited[v.id] = true; G.UI.msg('You discovered ' + v.name + '. Town Portal can now bring you here.', 'gold'); }
      P.lastVillage = v.id;
    }
  };

  // ---------------- inventory ----------------
  const Inv = G.Inv = { W: 10, H: 6 };
  Inv.fits = function (it, x, y, ignoreUid) {
    if (x < 0 || y < 0 || x + it.w > Inv.W || y + it.h > Inv.H) return false;
    for (const e of P.inv) {
      if (e.it.uid === ignoreUid) continue;
      if (x < e.x + e.it.w && x + it.w > e.x && y < e.y + e.it.h && y + it.h > e.y) return false;
    }
    return true;
  };
  Inv.find = function (it) {
    for (let y = 0; y <= Inv.H - it.h; y++) for (let x = 0; x <= Inv.W - it.w; x++) if (Inv.fits(it, x, y)) return { x, y };
    return null;
  };
  Inv.add = function (it, x, y) {
    if (it.potion) {
      const same = P.inv.find(e => e.it.potion && e.it.potion.kind === it.potion.kind && e.it.potion.tier === it.potion.tier);
      if (same) { same.it.stack += it.stack; G.UI.dirtyInv = true; return true; }
    }
    let p = (x !== undefined && Inv.fits(it, x, y)) ? { x, y } : Inv.find(it);
    if (!p) return false;
    P.inv.push({ it, x: p.x, y: p.y }); G.UI.dirtyInv = true; return true;
  };
  Inv.get = uid => P.inv.find(e => e.it.uid === uid);
  Inv.remove = function (uid) { const i = P.inv.findIndex(e => e.it.uid === uid); if (i >= 0) { const e = P.inv.splice(i, 1)[0]; G.UI.dirtyInv = true; return e.it; } return null; };
  Inv.move = function (uid, x, y) {
    const e = Inv.get(uid); if (!e) return false;
    if (!Inv.fits(e.it, x, y, uid)) return false; e.x = x; e.y = y; G.UI.dirtyInv = true; return true;
  };
  Inv.slotFor = function (it, pref) {
    if (it.slot === 'ring') { if (pref === 'ring1' || pref === 'ring2') return pref; return !P.equip.ring1 ? 'ring1' : !P.equip.ring2 ? 'ring2' : 'ring1'; }
    return it.slot;
  };
  Inv.canEquip = function (it, slot) {
    if (!it || !it.slot) return false;
    if (slot && !(it.slot === slot || (it.slot === 'ring' && (slot === 'ring1' || slot === 'ring2')))) return false;
    if (it.req > P.level) { G.UI.msg('You must be level ' + it.req + ' to use ' + it.name + '.', 'warn'); return false; }
    return true;
  };
  // equip an item from inventory (uid) into slot; swapped item returns to inventory
  Inv.equip = function (uid, slotPref) {
    const e = Inv.get(uid); if (!e) return false;
    const it = e.it; const slot = Inv.slotFor(it, slotPref);
    if (!Inv.canEquip(it, slot)) return false;
    const old = P.equip[slot];
    Inv.remove(uid);
    if (old) {
      if (!Inv.add(old, e.x, e.y)) { P.inv.push(e); G.UI.msg('No room to swap items.', 'warn'); return false; }
    }
    P.equip[slot] = it; P.recalc(); G.UI.dirtyInv = true; return true;
  };
  Inv.unequip = function (slot, x, y) {
    const it = P.equip[slot]; if (!it) return false;
    const p = (x !== undefined && Inv.fits(it, x, y)) ? { x, y } : Inv.find(it);
    if (!p) { G.UI.msg('Your pack is full.', 'warn'); return false; }
    delete P.equip[slot]; P.inv.push({ it, x: p.x, y: p.y }); P.recalc(); G.UI.dirtyInv = true; return true;
  };
  Inv.use = function (uid) {
    const e = Inv.get(uid); if (!e) return;
    const it = e.it;
    if (it.potion) {
      const k = it.potion.kind; if (P.potionCd[k] > 0) return;
      if (k === 'hp') { P.heal(it.potion.amt); G.FX.burst(new THREE.Vector3(P.pos.x, P.pos.y + 1, P.pos.z).addScaledVector(P.forward(), 1), 0xff5a5a, 20, 3, 0.7, 0.8, -2); P.deb.poison = []; }
      else { P.mana = Math.min(P.D.maxMana, P.mana + it.potion.amt); G.FX.burst(new THREE.Vector3(P.pos.x, P.pos.y + 1, P.pos.z).addScaledVector(P.forward(), 1), 0x5a8aff, 20, 3, 0.7, 0.8, -2); }
      P.potionCd[k] = 1.5;
      it.stack--; if (it.stack <= 0) Inv.remove(uid);
      G.UI.dirtyInv = true;
    } else if (it.slot) Inv.equip(uid);
  };
  Inv.count = kind => P.inv.reduce((s, e) => s + (e.it.potion && e.it.potion.kind === kind ? e.it.stack : 0), 0);

  // ---------------- input ----------------
  const Input = G.Input = { keys: {}, joy: { active: false, x: 0, y: 0, id: null, ox: 0, oy: 0 }, lookDX: 0, lookDY: 0, held: {}, btnJump: false, btnUp: false, btnDown: false };
  G.settings = { sens: 0.0022, touchSens: 0.0055, invertY: false, viewDist: 1 };
  try { const s = JSON.parse(localStorage.getItem('codex_rpg_settings') || 'null'); if (s) Object.assign(G.settings, s); } catch (e) { }
  G.saveSettings = () => { try { localStorage.setItem('codex_rpg_settings', JSON.stringify(G.settings)); } catch (e) { } };

  Input.init = function (canvas) {
    window.addEventListener('keydown', e => {
      if (!G.started) return;
      if (e.target && (e.target.tagName === 'INPUT')) return;
      const c = e.code;
      if (G.UI.onKey(c, e)) { e.preventDefault(); return; }
      if (G.UI.isOpen()) return;
      Input.keys[c] = true;
      if (c.startsWith('Digit')) { const n = +c.slice(5); const idx = n === 0 ? 9 : n - 1; Input.held['k' + idx] = true; G.SP.castSlot(idx); }
      if (c === 'KeyE') G.UI.interact();
      if (c === 'KeyQ') P.drink('hp');
      if (c === 'KeyR') P.drink('mp');
      if (c === 'Space' || c === 'Tab') e.preventDefault();
    });
    window.addEventListener('keyup', e => {
      Input.keys[e.code] = false;
      if (e.code.startsWith('Digit')) { const n = +e.code.slice(5); Input.held['k' + (n === 0 ? 9 : n - 1)] = false; }
    });
    window.addEventListener('blur', () => { Input.keys = {}; Input.held = {}; });
    canvas.addEventListener('mousedown', e => {
      if (!G.started || G.UI.isOpen() || G.touchMode) return;
      if (!document.pointerLockElement) { canvas.requestPointerLock && canvas.requestPointerLock(); return; }
      if (e.button === 0) { Input.held.k0 = true; G.SP.castSlot(0); }
      if (e.button === 2) { Input.held.k1 = true; G.SP.castSlot(1); }
    });
    window.addEventListener('mouseup', e => { if (e.button === 0) Input.held.k0 = false; if (e.button === 2) Input.held.k1 = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('mousemove', e => {
      if (document.pointerLockElement === canvas) { Input.lookDX += e.movementX; Input.lookDY += e.movementY; }
    });
    document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement) { Input.held = {}; } });

    // touch: left part = joystick, rest = look
    const look = { id: null, x: 0, y: 0 };
    const jb = document.getElementById('joyBase'), jk = document.getElementById('joyKnob');
    const tl = document.getElementById('touchLayer');
    tl.addEventListener('touchstart', e => {
      G.touchMode = true; document.body.classList.add('touch');
      if (!G.started || G.UI.isOpen()) return;
      for (const t of e.changedTouches) {
        if (t.clientX < window.innerWidth * 0.42 && Input.joy.id === null) {
          Input.joy.id = t.identifier; Input.joy.active = true; Input.joy.ox = t.clientX; Input.joy.oy = t.clientY; Input.joy.x = 0; Input.joy.y = 0;
          jb.style.display = 'block'; jb.style.left = t.clientX + 'px'; jb.style.top = t.clientY + 'px'; jk.style.transform = 'translate(-50%,-50%)';
        } else if (look.id === null) { look.id = t.identifier; look.x = t.clientX; look.y = t.clientY; }
      }
      e.preventDefault();
    }, { passive: false });
    tl.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) {
        if (t.identifier === Input.joy.id) {
          let dx = t.clientX - Input.joy.ox, dy = t.clientY - Input.joy.oy; const R = 55; const d = Math.hypot(dx, dy);
          if (d > R) { dx = dx / d * R; dy = dy / d * R; }
          Input.joy.x = dx / R; Input.joy.y = -dy / R;
          const dz = Math.hypot(Input.joy.x, Input.joy.y); if (dz < 0.12) { Input.joy.x = 0; Input.joy.y = 0; }
          jk.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        } else if (t.identifier === look.id) {
          const k = G.settings.touchSens / G.settings.sens;
          Input.lookDX += (t.clientX - look.x) * k; Input.lookDY += (t.clientY - look.y) * k; look.x = t.clientX; look.y = t.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });
    const end = e => {
      for (const t of e.changedTouches) {
        if (t.identifier === Input.joy.id) { Input.joy.id = null; Input.joy.active = false; Input.joy.x = Input.joy.y = 0; jb.style.display = 'none'; }
        if (t.identifier === look.id) look.id = null;
      }
    };
    tl.addEventListener('touchend', end); tl.addEventListener('touchcancel', end);
    if ('ontouchstart' in window && navigator.maxTouchPoints > 0 && !window.matchMedia('(pointer:fine)').matches) { G.touchMode = true; document.body.classList.add('touch'); }
  };

  // ---------------- save/load ----------------
  P.serialize = function () {
    return {
      pos: [P.pos.x, P.pos.y, P.pos.z], yaw: P.yaw, pitch: P.pitch, level: P.level, xp: P.xp, statPts: P.statPts, alloc: P.alloc, bonus: P.bonus,
      hp: P.hp, mana: P.mana, gold: P.gold, spells: P.spells, hotbar: P.hotbar, equip: P.equip, inv: P.inv, lastVillage: P.lastVillage, visited: P.visited,
      beacon: P.beacon, flying: P.flying, pendingPicks: P.pendingPicks, buffs: { water: P.buffs.water }, v: 2,
    };
  };
  P.load = function (d) {
    Object.assign(P, { yaw: d.yaw, pitch: d.pitch || 0, level: d.level, xp: d.xp, statPts: d.statPts, gold: d.gold, spells: d.spells, hotbar: d.hotbar, equip: d.equip || {}, inv: d.inv || [],
      lastVillage: d.lastVillage || 'brightwater', visited: d.visited || { brightwater: true }, beacon: d.beacon || null, pendingPicks: d.pendingPicks || 0 });
    STAT_KEYS.forEach(k => { P.alloc[k] = (d.alloc && d.alloc[k]) || 0; P.bonus[k] = (d.bonus && d.bonus[k]) || 0; });
    P.buffs = {}; if (d.buffs && d.buffs.water) P.buffs.water = d.buffs.water;
    if ((d.v || 1) < 2) { // v1 save: attribute points are now fewer but stronger — refund and rescale
      STAT_KEYS.forEach(k => { P.alloc[k] = 0; P.bonus[k] = Math.round(P.bonus[k] / 3); });
      P.statPts = (P.level - 1) + Math.floor(P.level / 5) + 1;
      const fix = it => { if (!it || !it.stats) return; STAT_KEYS.forEach(k => { if (it.stats[k]) it.stats[k] = Math.max(1, Math.round(it.stats[k] * 0.4)); }); };
      Object.values(P.equip).forEach(fix); P.inv.forEach(e => fix(e.it));
      setTimeout(() => G.UI && G.UI.msg('Attributes were rebalanced: your points have been refunded — spend them in the character screen (I).', 'gold'), 1500);
    }
    P.recalc(); P.hp = Math.min(d.hp || P.D.maxHp, P.D.maxHp); P.mana = Math.min(d.mana || 0, P.D.maxMana);
    P.pos.set(d.pos[0], Math.max(d.pos[1], G.W.groundY(d.pos[0], d.pos[2])), d.pos[2]);
    P.flying = false; P.dead = false;
  };
  P.newGame = function () {
    P.level = 1; P.xp = 0; P.statPts = 1; P.gold = 25; P.spells = { magic_missile: 1, heal: 1 };
    P.hotbar = ['magic_missile', 'heal', null, null, null, null, null, null, null, null];
    P.equip = {}; P.inv = []; P.buffs = {}; P.visited = { brightwater: true }; P.lastVillage = 'brightwater'; P.beacon = null; P.pendingPicks = 0;
    STAT_KEYS.forEach(k => { P.alloc[k] = 0; P.bonus[k] = 0; });
    const I = G.Items;
    P.equip.weapon = I.create('wand', 1, 'common'); P.equip.body = I.create('robe', 1, 'common'); P.equip.boots = I.create('sandals', 1, 'common');
    Inv.add(I.potion('hp', 0, 4)); Inv.add(I.potion('mp', 0, 3));
    P.recalc(); P.hp = P.D.maxHp; P.mana = P.D.maxMana;
    P.yaw = -Math.PI / 2; P.pitch = 0; P.teleport(-19, 1);
  };
})();
