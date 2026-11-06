'use strict';
(function () {
  const U = G.U;
  const I = G.Items = {};
  I.SLOTS = ['head', 'amulet', 'weapon', 'body', 'offhand', 'gloves', 'belt', 'ring1', 'ring2', 'boots'];
  I.SLOT_NAMES = { head: 'Head', amulet: 'Amulet', weapon: 'Weapon', body: 'Body', offhand: 'Off-hand', gloves: 'Gloves', belt: 'Belt', ring1: 'Ring', ring2: 'Ring', boots: 'Boots' };

  I.BASES = {
    wand: { n: 'Wand', slot: 'weapon', w: 1, h: 3, e: '🥢', imp: l => ({ spellDmg: 5 + l * .4 }) },
    staff: { n: 'Staff', slot: 'weapon', w: 1, h: 4, e: '🔱', imp: l => ({ spellDmg: 8 + l * .6, mana: 5 + l * 1.5 }) },
    scepter: { n: 'Scepter', slot: 'weapon', w: 1, h: 3, e: '⚜️', imp: l => ({ spellDmg: 5 + l * .35, crit: 2 + l * .08 }) },
    orb: { n: 'Orb', slot: 'offhand', w: 2, h: 2, e: '🔮', imp: l => ({ manaRegen: .3 + l * .05 }) },
    tome: { n: 'Tome', slot: 'offhand', w: 2, h: 2, e: '📘', imp: l => ({ mana: 10 + l * 3 }) },
    ward: { n: 'Ward', slot: 'offhand', w: 2, h: 3, e: '🛡️', imp: l => ({ armor: 8 + l * 3.5, resist: 5 + l * .2 }) },
    hat: { n: 'Wizard Hat', slot: 'head', w: 2, h: 2, e: '🎩', imp: l => ({ mana: 4 + l * 1.5, armor: 2 + l * .6 }) },
    circlet: { n: 'Circlet', slot: 'head', w: 2, h: 2, e: '👑', imp: l => ({ spellDmg: 2 + l * .25 }) },
    helm: { n: 'Helm', slot: 'head', w: 2, h: 2, e: '⛑️', imp: l => ({ armor: 6 + l * 2.5 }) },
    robe: { n: 'Robe', slot: 'body', w: 2, h: 3, e: '👘', imp: l => ({ armor: 4 + l * 1.2, mana: 5 + l * 2 }) },
    coat: { n: 'Leather Coat', slot: 'body', w: 2, h: 3, e: '🧥', imp: l => ({ armor: 8 + l * 2.5, hp: 5 + l * 2 }) },
    mail: { n: 'Chainmail', slot: 'body', w: 2, h: 3, e: '🥋', imp: l => ({ armor: 16 + l * 5, haste: -5 }) },
    gloves: { n: 'Silk Gloves', slot: 'gloves', w: 2, h: 2, e: '🧤', imp: l => ({ haste: 2 + l * .1, armor: 1 + l * .4 }) },
    gauntlets: { n: 'Gauntlets', slot: 'gloves', w: 2, h: 2, e: '🥊', imp: l => ({ armor: 5 + l * 1.8 }) },
    sandals: { n: 'Sandals', slot: 'boots', w: 2, h: 2, e: '👡', imp: l => ({ move: 4 + l * .15, armor: 1 + l * .4 }) },
    boots: { n: 'Boots', slot: 'boots', w: 2, h: 2, e: '👢', imp: l => ({ armor: 5 + l * 1.8, move: 1 }) },
    sash: { n: 'Sash', slot: 'belt', w: 2, h: 1, e: '🎗️', imp: l => ({ manaRegen: .2 + l * .03 }) },
    girdle: { n: 'Girdle', slot: 'belt', w: 2, h: 1, e: '⛓️', imp: l => ({ hp: 8 + l * 2.5 }) },
    ring: { n: 'Ring', slot: 'ring', w: 1, h: 1, e: '💍', imp: () => ({}) },
    amulet: { n: 'Amulet', slot: 'amulet', w: 1, h: 1, e: '📿', imp: () => ({}) },
  };
  const BY_SLOT = {}; for (const k in I.BASES) { const s = I.BASES[k].slot; (BY_SLOT[s] = BY_SLOT[s] || []).push(k); }
  I.BY_SLOT = BY_SLOT;

  // affix: [statKey, prefix name, suffix name, value fn(l)]
  const AFF = {
    hp: ['Stalwart', 'of the Bear', l => 6 + l * 3.2], mana: ['Sage\'s', 'of the Sage', l => 5 + l * 2.4], hpRegen: ['Mending', 'of Mending', l => .2 + l * .08],
    manaRegen: ['Lucid', 'of Clarity', l => .15 + l * .045], spellDmg: ['Potent', 'of Sorcery', l => 3 + l * .55], haste: ['Swift', 'of Haste', l => 2 + l * .22],
    crit: ['Keen', 'of Precision', l => 1 + l * .12], critDmg: ['Cruel', 'of Ruin', l => 8 + l * 1.0], move: ['Fleet', 'of the Wind', l => 2 + l * .2],
    armor: ['Sturdy', 'of Warding', l => 3 + l * 2.2], resist: ['Warded', 'of Resistance', l => 3 + l * .35],
    fire: ['Burning', 'of Embers', l => 6 + l * .9], frost: ['Frozen', 'of Rime', l => 6 + l * .9], storm: ['Charged', 'of Storms', l => 6 + l * .9],
    arcane: ['Arcane', 'of the Arcane', l => 6 + l * .9], nature: ['Venomous', 'of Venom', l => 6 + l * .9], shadow: ['Shadowed', 'of Night', l => 6 + l * .9],
    power: ['Mighty', 'of Power', l => Math.max(1, 0.4 + l * .05)], vitality: ['Hale', 'of Vigor', l => Math.max(1, 0.4 + l * .05)], arcana: ['Mystic', 'of Arcana', l => Math.max(1, 0.4 + l * .05)],
    focus: ['Focused', 'of Focus', l => Math.max(1, 0.4 + l * .05)], celerity: ['Quick', 'of Celerity', l => Math.max(1, 0.4 + l * .05)], agility: ['Nimble', 'of Agility', l => Math.max(1, 0.4 + l * .05)],
    manaCost: ['Thrifty', 'of Thrift', l => 2 + l * .15],
  };
  const SCHOOLS = ['fire', 'frost', 'storm', 'arcane', 'nature', 'shadow'];
  const POOL = {
    weapon: ['spellDmg', 'spellDmg', 'crit', 'critDmg', 'mana', 'haste', 'power', ...SCHOOLS],
    offhand: ['mana', 'manaRegen', 'spellDmg', 'resist', 'arcana', 'focus', 'manaCost', ...SCHOOLS],
    head: ['mana', 'hp', 'armor', 'resist', 'manaRegen', 'spellDmg', 'arcana', 'focus', 'manaCost'],
    body: ['hp', 'hp', 'armor', 'resist', 'mana', 'hpRegen', 'vitality', 'arcana'],
    gloves: ['haste', 'crit', 'armor', 'spellDmg', 'critDmg', 'celerity', 'power'],
    boots: ['move', 'move', 'armor', 'hp', 'resist', 'agility', 'hpRegen'],
    belt: ['hp', 'mana', 'hpRegen', 'manaRegen', 'armor', 'vitality', 'focus'],
    ring: ['spellDmg', 'mana', 'manaRegen', 'crit', 'hp', 'haste', 'resist', 'power', 'arcana', 'focus', 'celerity', 'agility', 'manaCost', ...SCHOOLS],
    amulet: ['spellDmg', 'mana', 'manaRegen', 'crit', 'critDmg', 'hp', 'haste', 'move', 'resist', 'power', 'vitality', 'arcana', 'focus', 'manaCost', ...SCHOOLS],
  };
  const FRACT = { hpRegen: 1, manaRegen: 1 };
  function roundStat(k, v) { return FRACT[k] ? Math.round(v * 10) / 10 : Math.round(v); }

  I.UNIQUES = [
    { id: 'emberheart', n: 'Emberheart Staff', base: 'staff', st: l => ({ fire: 40, spellDmg: 8 + l * .4 }), sp: 'Your burns deal 60% more damage. Firebolt explodes on impact.' },
    { id: 'glass', n: 'Orb of Shattered Glass', base: 'orb', st: l => ({ spellDmg: 45, crit: 8, hpPct: -35 }), sp: 'Huge damage, fragile body.' },
    { id: 'archcrown', n: 'Crown of the Archmage', base: 'circlet', st: l => ({ manaPct: 60, manaRegenPct: -25, arcana: 1 + l * .04 }), sp: 'Spells costing 30 or more mana deal 35% more damage.' },
    { id: 'bloodpact', n: 'Blood Pact Amulet', base: 'amulet', st: l => ({ hpPct: 30, hpRegen: 1 + l * .12 }), sp: 'Spells cost health instead of mana.' },
    { id: 'echo', n: 'Echoing Band', base: 'ring', st: l => ({ spellDmg: 8, haste: 5 }), sp: '20% chance to cast damaging spells twice.' },
    { id: 'zephyr', n: 'Zephyr Treads', base: 'sandals', st: l => ({ move: 25, agility: 2 }), sp: 'Flying costs 75% less mana.' },
    { id: 'vampsig', n: 'Vampiric Signet', base: 'ring', st: l => ({ shadow: 25, hp: 10 + l * 2 }), sp: 'Heal for 6% of all spell damage you deal.' },
    { id: 'hourglass', n: 'Hourglass of Aeons', base: 'amulet', st: l => ({ haste: 30, spellDmg: -15 }), sp: 'Cooldowns recover 25% faster.' },
    { id: 'frostbound', n: 'Frostbound Gauntlets', base: 'gauntlets', st: l => ({ frost: 35 }), sp: 'Frost spells have a 25% chance to freeze targets solid.' },
    { id: 'stormcirclet', n: 'Stormcaller\'s Circlet', base: 'circlet', st: l => ({ storm: 35, crit: 5 }), sp: 'Chain Lightning jumps 3 extra times.' },
    { id: 'unbroken', n: 'Robe of the Unbroken Mind', base: 'robe', st: l => ({ mana: 20 + l * 3, arcana: 1 }), sp: 'Arcane Shield absorbs double. +25% spell damage while shielded.' },
    { id: 'plaguesash', n: 'Plaguebearer\'s Sash', base: 'sash', st: l => ({ nature: 40 }), sp: 'Poisons deal 60% more and spread to nearby enemies on death.' },
    { id: 'missilewand', n: 'Wand of a Thousand Darts', base: 'wand', st: l => ({ arcane: 30, haste: 10 }), sp: 'Magic Missile fires 3 missiles.' },
    { id: 'endless', n: 'Tome of Endless Words', base: 'tome', st: l => ({ manaPct: -40, crit: 6 }), sp: 'Spells that cost no mana deal 90% more damage.' },
    { id: 'tide', n: 'Ring of the Tide', base: 'ring', st: l => ({ manaRegenPct: 50, mana: 10 + l }), sp: 'Restore 8% of max mana on each kill.' },
    { id: 'juggernaut', n: 'Ward of the Juggernaut', base: 'ward', st: l => ({ armor: 60 + l * 6, hpPct: 20, move: -10 }), sp: 'Slow, but nearly unbreakable.' },
    { id: 'malhorn', n: 'Horned Crown of Malgrath', base: 'helm', st: l => ({ spellDmg: 30, fire: 15, shadow: 15 }), sp: 'You take 25% more damage.' },
    { id: 'windrunner', n: 'Windrunner Coat', base: 'coat', st: l => ({ move: 15, haste: 12, agility: 2 }), sp: 'Blink has no cooldown and costs half mana.' },
  ];

  I.STAT_LABEL = {
    hp: 'Health', hpPct: '% Max Health', mana: 'Mana', manaPct: '% Max Mana', hpRegen: 'Health per sec', manaRegen: 'Mana per sec', manaRegenPct: '% Mana Regen',
    spellDmg: '% Spell Damage', haste: '% Cast Speed', move: '% Move Speed', crit: '% Critical Chance', critDmg: '% Critical Damage', armor: 'Armor', resist: '% Magic Resist',
    fire: '% Fire Damage', frost: '% Frost Damage', storm: '% Storm Damage', arcane: '% Arcane Damage', nature: '% Nature Damage', shadow: '% Shadow Damage',
    power: 'Power', vitality: 'Vitality', arcana: 'Arcana', focus: 'Focus', celerity: 'Celerity', agility: 'Agility', manaCost: '% Reduced Mana Cost',
  };
  I.statLine = (k, v) => { const pct = I.STAT_LABEL[k].startsWith('%'); return (v >= 0 ? '+' : '−') + Math.abs(v) + (pct ? '' : ' ') + I.STAT_LABEL[k]; };

  const RARE_A = ['Doom', 'Storm', 'Grim', 'Rune', 'Soul', 'Dusk', 'Star', 'Ember', 'Frost', 'Wraith', 'Dragon', 'Moon', 'Blood', 'Oath', 'Hollow', 'Sun', 'Raven', 'Thorn'];
  const RARE_B = ['Whisper', 'Ward', 'Veil', 'Song', 'Mark', 'Coil', 'Brand', 'Shroud', 'Heart', 'Grasp', 'Weave', 'Sigil', 'Gaze', 'Knot', 'Crest'];

  function addStat(st, k, v) { st[k] = roundStat(k, (st[k] || 0) + v); }
  I.create = function (baseId, ilvl, rarity, opts) {
    opts = opts || {};
    const B = I.BASES[baseId]; const l = Math.max(1, ilvl);
    const it = { uid: U.uid(), base: baseId, slot: B.slot, w: B.w, h: B.h, e: B.e, ilvl: l, rarity, stats: {} };
    const q = opts.quality || (0.85 + Math.random() * 0.3);
    const imp = B.imp(l); for (const k in imp) addStat(it.stats, k, imp[k] * (k === 'haste' && imp[k] < 0 ? 1 : q));
    let name = B.n;
    if (rarity === 'unique') {
      const u = opts.unique || U.pick(I.UNIQUES.filter(u => !opts.slot || I.BASES[u.base].slot === opts.slot)) || U.pick(I.UNIQUES);
      if (u.base !== baseId) return I.create(u.base, ilvl, 'unique', { unique: u });
      const us = u.st(l); for (const k in us) addStat(it.stats, k, us[k]);
      it.special = u.id; it.specialText = u.sp; name = u.n;
    } else if (rarity === 'magic' || rarity === 'rare') {
      const n = rarity === 'magic' ? (Math.random() < 0.5 ? 1 : 2) : 3 + (Math.random() < 0.4 ? 1 : 0);
      const pool = POOL[B.slot].slice(); const chosen = [];
      for (let i = 0; i < n && pool.length; i++) { const k = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; if (chosen.includes(k)) { i--; continue; } chosen.push(k); }
      chosen.forEach(k => addStat(it.stats, k, AFF[k][2](l) * (0.75 + Math.random() * 0.5)));
      if (rarity === 'magic') {
        const pre = chosen[0] ? AFF[chosen[0]][0] + ' ' : ''; const suf = chosen[1] ? ' ' + AFF[chosen[1]][1] : '';
        name = pre + B.n + suf;
      } else name = U.pick(RARE_A) + ' ' + U.pick(RARE_B) + ' ' + B.n;
    }
    for (const k in it.stats) if (it.stats[k] === 0) delete it.stats[k];
    it.name = name;
    it.req = Math.max(1, Math.floor(l * 0.85));
    it.value = I.value(it);
    return it;
  };
  I.value = function (it) {
    if (it.potion) return it.potion.price;
    if (it.quest) return 0;
    const mult = { common: 1, magic: 2.4, rare: 5.5, unique: 14 }[it.rarity] || 1;
    return Math.round(8 * Math.pow(1 + it.ilvl, 1.35) * mult * (1 + Object.keys(it.stats).length * 0.1));
  };
  I.random = function (ilvl, opts) {
    opts = opts || {};
    let baseId = opts.base;
    if (!baseId) {
      const slot = opts.slot || U.pick(['weapon', 'weapon', 'offhand', 'head', 'body', 'gloves', 'boots', 'belt', 'ring', 'ring', 'amulet']);
      baseId = U.pick(BY_SLOT[slot]);
    }
    return I.create(baseId, ilvl, opts.rarity || 'common', opts);
  };
  I.POTION_TIERS = [
    { n: 'Minor', hp: 60, mp: 40, lvl: 1, price: 15 }, { n: '', hp: 160, mp: 90, lvl: 8, price: 45 },
    { n: 'Greater', hp: 360, mp: 180, lvl: 16, price: 110 }, { n: 'Superior', hp: 700, mp: 320, lvl: 24, price: 240 },
  ];
  I.potionTierFor = lvl => { let t = 0; I.POTION_TIERS.forEach((p, i) => { if (lvl >= p.lvl) t = i; }); return t; };
  I.potion = function (kind, tier, n) {
    const P = I.POTION_TIERS[tier];
    return { uid: U.uid(), potion: { kind, tier, amt: kind === 'hp' ? P.hp : P.mp, price: P.price }, name: (P.n ? P.n + ' ' : '') + (kind === 'hp' ? 'Healing Draught' : 'Mana Draught'),
      e: kind === 'hp' ? '🍷' : '🧪', w: 1, h: 1, stack: n || 1, rarity: 'potion', value: P.price };
  };
  I.questItem = function (name) { return { uid: U.uid(), quest: true, name, e: '📜', w: 1, h: 1, rarity: 'quest', value: 0 }; };

  I.rollLoot = function (m) {
    const drops = []; const l = m.level;
    if (m.boss) {
      drops.push(I.random(l + 1, { rarity: 'unique' }));
      drops.push(I.random(l + 1, { rarity: 'rare' }));
      drops.push(I.random(l, { rarity: Math.random() < 0.5 ? 'rare' : 'magic' }));
      drops.push(I.potion(Math.random() < .5 ? 'hp' : 'mp', I.potionTierFor(l), 2));
    } else if (m.elite) {
      const r = Math.random();
      drops.push(I.random(l, { rarity: r < 0.05 ? 'unique' : r < 0.45 ? 'rare' : 'magic' }));
      if (Math.random() < 0.5) drops.push(I.potion(Math.random() < .5 ? 'hp' : 'mp', I.potionTierFor(l)));
    } else {
      if (Math.random() < 0.1) { const r = Math.random(); drops.push(I.random(l, { rarity: r < 0.06 ? 'rare' : r < 0.4 ? 'magic' : 'common' })); }
      if (Math.random() < 0.07) drops.push(I.potion(Math.random() < .5 ? 'hp' : 'mp', I.potionTierFor(l)));
    }
    let gold = 0;
    if (m.boss) gold = l * U.randi(25, 45); else if (m.elite) gold = l * U.randi(6, 12); else if (Math.random() < 0.45) gold = l * U.randi(1, 4) + 1;
    return { items: drops, gold };
  };
  I.chestLoot = function (lvl, boss) {
    const items = []; const n = boss ? 3 : U.randi(1, 3);
    for (let i = 0; i < n; i++) { const r = Math.random(); items.push(I.random(lvl, { rarity: boss ? (r < 0.25 ? 'unique' : 'rare') : (r < 0.12 ? 'rare' : r < 0.6 ? 'magic' : 'common') })); }
    if (Math.random() < 0.6) items.push(I.potion(Math.random() < .5 ? 'hp' : 'mp', I.potionTierFor(lvl), U.randi(1, 3)));
    return { items, gold: lvl * U.randi(8, 20) * (boss ? 4 : 1) };
  };
  I.shopStock = function (type, lvl) {
    const out = [];
    const t = I.potionTierFor(lvl);
    if (type === 'general') {
      for (let k = 0; k <= t; k++) { out.push(I.potion('hp', k, 1)); out.push(I.potion('mp', k, 1)); }
      for (let i = 0; i < 8; i++) out.push(I.random(lvl + U.randi(-1, 1), { slot: U.pick(['weapon', 'offhand', 'ring', 'amulet', 'belt']), rarity: Math.random() < 0.55 ? 'magic' : 'common' }));
    } else if (type === 'armor') {
      for (let i = 0; i < 10; i++) {
        const slot = U.pick(['head', 'body', 'gloves', 'boots', 'offhand', 'belt']);
        const base = slot === 'offhand' ? 'ward' : U.pick(BY_SLOT[slot]);
        out.push(I.create(base, lvl + U.randi(0, 2), Math.random() < 0.35 ? 'magic' : 'common', { quality: 1.25 }));
      }
    } else {
      for (let k = 0; k <= t; k++) { out.push(I.potion('hp', k, 1)); out.push(I.potion('mp', k, 1)); }
      for (let i = 0; i < 9; i++) out.push(I.random(lvl + U.randi(0, 2), { rarity: Math.random() < 0.3 ? 'rare' : 'magic' }));
    }
    out.forEach(it => { it.shopPrice = Math.round(it.value * (it.rarity === 'rare' ? 1.6 : it.potion ? 1 : 1.15)); });
    return out;
  };
  I.sellPrice = it => it.potion ? Math.max(1, Math.floor(it.value * 0.3)) * (it.stack || 1) : Math.floor(it.value * 0.3);

  I.tooltip = function (it, compare) {
    const col = { common: '#e8e2d2', magic: '#7fb2ff', rare: '#f2d45c', unique: '#f59a3c', potion: '#e8e2d2', quest: '#c3a8ff' }[it.rarity];
    let h = `<div class="tt-name" style="color:${col}">${it.name}</div>`;
    if (it.potion) {
      h += `<div class="tt-sub">Consumable</div><div class="tt-line">Restores ${it.potion.amt} ${it.potion.kind === 'hp' ? 'health' : 'mana'}</div><div class="tt-sub">Stack: ${it.stack}. Double-tap or press ${it.potion.kind === 'hp' ? 'Q' : 'R'} to drink.</div>`;
    } else if (it.quest) h += `<div class="tt-sub">Quest item</div>`;
    else {
      const B = I.BASES[it.base];
      h += `<div class="tt-sub">${it.rarity[0].toUpperCase() + it.rarity.slice(1)} ${B.n.toLowerCase()} · item level ${it.ilvl}</div>`;
      for (const k in it.stats) h += `<div class="tt-line${it.stats[k] < 0 ? ' neg' : ''}">${I.statLine(k, it.stats[k])}</div>`;
      if (it.specialText) h += `<div class="tt-special">${it.specialText}</div>`;
      const p = G.Player;
      h += `<div class="tt-req${p && p.level < it.req ? ' neg' : ''}">Requires level ${it.req}</div>`;
      if (compare) {
        const diffs = {}; for (const k in it.stats) diffs[k] = it.stats[k]; for (const k in compare.stats) diffs[k] = roundStat(k, (diffs[k] || 0) - compare.stats[k]);
        let d = ''; for (const k in diffs) if (diffs[k]) d += `<div class="tt-line ${diffs[k] > 0 ? 'pos' : 'neg'}">${I.statLine(k, diffs[k])}</div>`;
        if (d) h += `<div class="tt-cmp">Compared to equipped:</div>` + d;
      }
    }
    if (!it.quest) h += `<div class="tt-val">Sells for ${I.sellPrice(it)} gold</div>`;
    return h;
  };
})();
