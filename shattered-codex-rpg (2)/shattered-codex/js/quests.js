'use strict';
(function () {
  const Q = G.Quests = { state: {} };
  const byId = {}; G.QUESTS.forEach(q => byId[q.id] = q);
  Q.byId = byId;
  // state[id] = { s: 'active' | 'ready' | 'done', prog: n }
  Q.reset = function () { Q.state = {}; };
  Q.st = id => Q.state[id] && Q.state[id].s;
  Q.available = q => !Q.state[q.id] && (q.req || []).every(r => Q.st(r) === 'done');
  Q.turnInNpc = q => q.obj.kind === 'talk' ? q.obj.npc : q.giver;
  Q.markerFor = function (npc) {
    for (const q of G.QUESTS) { const s = Q.st(q.id); if ((s === 'ready' || (s === 'active' && q.obj.kind === 'talk')) && Q.turnInNpc(q) === npc) return '?'; }
    for (const q of G.QUESTS) if (q.giver === npc && Q.available(q)) return '!';
    return null;
  };
  Q.need = q => q.obj.kind === 'kill' || q.obj.kind === 'collect' ? q.obj.count : 1;
  Q.progText = function (q) {
    const s = Q.state[q.id]; if (!s) return '';
    if (s.s === 'ready') return 'Return to ' + npcName(q.giver);
    const o = q.obj;
    if (o.kind === 'kill') return `Slay ${o.mons.map(m => G.MONSTERS[m].n).join(' / ')}: ${s.prog}/${o.count}`;
    if (o.kind === 'collect') return `${o.item}: ${s.prog}/${o.count} (from ${G.MONSTERS[o.mons[0]].n})`;
    if (o.kind === 'boss') { const b = G.BOSSES.find(b => b.id === o.boss); return `Defeat ${b.name} (level ${b.level})`; }
    if (o.kind === 'talk') { const n = G.NPCS.find(n => n.id === o.npc); const v = G.VILLAGES.find(v => v.id === n.village); return `Speak with ${n.name} in ${v.name}`; }
    return '';
  };
  const npcName = id => (G.NPCS.find(n => n.id === id) || {}).name || id;
  Q.npcName = npcName;
  // world location relevant to quest for map markers
  Q.targetPos = function (q) {
    const s = Q.state[q.id]; if (!s) return null;
    const npcPos = id => { const n = G.W.npcs.find(n => n.def.id === id); return n ? { x: n.x, z: n.z } : null; };
    if (s.s === 'ready') return npcPos(q.giver);
    if (q.obj.kind === 'talk') return npcPos(q.obj.npc);
    if (q.obj.kind === 'boss') { const b = G.BOSSES.find(b => b.id === q.obj.boss); return { x: b.x, z: b.z }; }
    return null;
  };
  Q.accept = function (id) {
    Q.state[id] = { s: 'active', prog: 0 };
    const q = byId[id];
    if (q.obj.kind === 'boss' && G.S.bossKilled[q.obj.boss]) { Q.state[id].s = 'ready'; G.UI.msg('You have already slain this foe — return for your reward.', 'quest'); }
    G.UI.msg('Quest accepted: ' + q.title, 'quest');
    G.W.refreshNpcMarkers(); G.UI.dirtyQuests = true;
  };
  Q.complete = function (id) {
    const q = byId[id]; const r = q.reward; const P = G.P;
    Q.state[id] = { s: 'done', prog: Q.need(q) };
    G.UI.toast('Quest complete: ' + q.title, 'quest');
    if (r.gold) { P.gold += r.gold; G.UI.msg('+' + r.gold + ' gold', 'gold'); }
    const items = [];
    if (r.item) items.push(G.Items.random(Math.max(P.level, 2), { rarity: r.item.rarity, slot: r.item.slot, base: r.item.base }));
    if (r.potions) { const t = G.Items.potionTierFor(P.level); items.push(G.Items.potion('hp', t, r.potions)); items.push(G.Items.potion('mp', t, Math.ceil(r.potions / 2))); }
    // remove collected quest items
    if (q.obj.kind === 'collect') P.inv = P.inv.filter(e => !(e.it.quest && e.it.name === q.obj.item));
    items.forEach(it => { if (G.Inv.add(it)) G.UI.msg('Received ' + it.name, it.rarity); else { G.E.dropBag(P.pos.x + 1, P.pos.z + 1, [it], 0); G.UI.msg('Your pack is full — ' + it.name + ' was placed at your feet.', 'warn'); } });
    [r.spell, r.spell2].forEach(sp => { if (sp && !P.spells[sp]) { P.spells[sp] = 1; const e = P.hotbar.indexOf(null); if (e >= 0) P.hotbar[e] = sp; G.UI.msg('New spell: ' + G.SP.defs[sp].n + '! (see Spellbook, B)', 'gold'); } });
    if (r.xp) P.gainXp(r.xp);
    G.W.refreshNpcMarkers(); G.UI.dirtyQuests = true; G.UI.dirtyInv = true;
  };
  Q.onKill = function (m) {
    for (const q of G.QUESTS) {
      const s = Q.state[q.id]; if (!s || s.s !== 'active') continue;
      const o = q.obj;
      if (o.kind === 'kill' && o.mons.includes(m.type) && !m.boss) {
        s.prog++; G.UI.msg(`${q.title}: ${s.prog}/${o.count}`, 'quest');
        if (s.prog >= o.count) { s.s = 'ready'; G.UI.msg(q.title + ' — objective complete! Return to ' + npcName(q.giver) + '.', 'quest'); }
      } else if (o.kind === 'collect' && o.mons.includes(m.type) && Math.random() < (m.elite ? 1 : o.chance)) {
        s.prog++; G.UI.msg(`${o.item}: ${s.prog}/${o.count}`, 'quest');
        const it = G.Items.questItem(o.item); G.Inv.add(it);
        if (s.prog >= o.count) { s.s = 'ready'; G.UI.msg(q.title + ' — objective complete! Return to ' + npcName(q.giver) + '.', 'quest'); }
      } else if (o.kind === 'boss' && m.boss && m.boss.id === o.boss) {
        s.s = 'ready'; G.UI.msg(q.title + ' — objective complete! Return to ' + npcName(q.giver) + '.', 'quest');
      }
      G.UI.dirtyQuests = true;
    }
    G.W.refreshNpcMarkers();
  };
  // dialog options for an NPC
  Q.optionsFor = function (npc) {
    const out = [];
    for (const q of G.QUESTS) {
      const s = Q.st(q.id);
      if (s === 'ready' && q.giver === npc) out.push({ kind: 'turnin', q });
      if (s === 'active' && q.obj.kind === 'talk' && q.obj.npc === npc) out.push({ kind: 'turnin', q });
    }
    for (const q of G.QUESTS) if (q.giver === npc && Q.available(q)) out.push({ kind: 'offer', q });
    for (const q of G.QUESTS) if (q.giver === npc && Q.st(q.id) === 'active' && q.obj.kind !== 'talk') out.push({ kind: 'progress', q });
    return out;
  };
  Q.active = () => G.QUESTS.filter(q => Q.st(q.id) === 'active' || Q.st(q.id) === 'ready');
  Q.GREET = {
    maren: 'Welcome to Brightwater, child. We are simple folk, but we do not forget a kindness.',
    orrin: 'Hm? Ah. A spark of the Art in you. Rare, these days.',
    bram: 'Keep your eyes on the treeline. Things have been getting bolder.',
    tomas: 'Potions, trinkets, the odd wand! Fair prices, mostly.', hilda: 'A wizard in armor? Laugh all you like. Wards stop claws.',
    sylva: 'The forest is sick. You can smell it on the wind.', fenn: 'Mind the walking oaks. They used to be gentle.',
    ivy: 'Herbs, tonics, and a few oddities from the deep wood.', rook: 'Thornwood leather. Won\'t let you down.',
    agatha: 'Sit, sit. The bog keeps its secrets, but not from me.', gil: 'Don\'t swim here. Trust me.',
    mossa: 'Everything you need to survive the mire. Almost everything.', brand: 'Rust never sleeps in a swamp. My steel does.',
    rahim: 'Sunspire\'s libraries are the oldest in the realm. Old enough to remember Malgrath.', tariq: 'The dead in the dunes do not rest well.',
    samira: 'Enchanted wares for discerning wizards. Look, but do not touch the red ones.', zahir: 'Desert-forged. Light, and cool in the heat.',
    brynja: 'Frosthold does not bow. Speak.', olaf: 'Hah! A southerner! Have a drink before you freeze.',
    hakon: 'Rune-carved goods from the far north. Worth every coin.', sigrid: 'Fur and iron. That is how we live up here.',
  };
})();
