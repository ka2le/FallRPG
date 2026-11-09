import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { GEAR,HUNTS } from '../src/adventure.js';
import { NEW_GEAR,EQUIPMENT_SLOTS,ITEM_TYPES,SLOT_ACCEPTS,EXTRA_REWARDS } from '../src/items.js';
import { ITEM_SPRITES,GEAR_SPRITE_IDS,spriteRect } from '../src/item-sprites.js';
import { ACTIVE_SPELL_IDS,SPELL_BY_ID } from '../src/data.js';
import { deriveStats } from '../src/character.js';
const world=()=>({props:[],interactables:[],ambient:[],rootwallGroups:[],creatures:[0,1].map(i=>({id:`seed-${i}`,type:'seedling',x:1740+i*65,y:855,homeX:1740+i*65,homeY:855,phase:0,level:1}))});
function game(saved){const g=new Game(saved,{world:world()});Object.assign(g.player,{x:1680,y:855});g.autoAttack=false;g.wasSafe=false;g.learned=new Set(ACTIVE_SPELL_IDS);return g;}
function wear(g,...ids){for(const id of ids){g.awardItem(id);assert.ok(g.equip(id));}}
test('eight shared slots for thirteen item types, fifty collectible items and 128 distinct atlas cells agree',()=>{
 assert.equal(EQUIPMENT_SLOTS.length,8);assert.equal(ITEM_TYPES.length,13);for(const t of ITEM_TYPES)assert.ok(Object.values(SLOT_ACCEPTS).some(a=>a.includes(t)),t);assert.equal(Object.keys(GEAR).length,50);assert.equal(Object.keys(ITEM_SPRITES).length,128);assert.equal(GEAR_SPRITE_IDS.length,64);
 const cells=new Set();for(const [id,it] of Object.entries(ITEM_SPRITES)){assert.ok(it.index>=0&&it.index<64);const key=`${it.sheet}:${it.index}`;assert.ok(!cells.has(key),id);cells.add(key);}
 for(const [id,it] of Object.entries(GEAR)){assert.ok(ITEM_SPRITES[id],id);assert.ok(ITEM_TYPES.includes(it.slot));}
 const rewards=Object.values(EXTRA_REWARDS).flat();for(const [id,it] of Object.entries(NEW_GEAR))assert.ok(it.price||rewards.includes(id),id);for(const id of Object.keys(EXTRA_REWARDS))assert.ok(HUNTS.some(h=>h.id===id),id);
 // Native generated sheets need not divide into integer-width cells. Never resample or skip edge pixels on export.
 const rects=Array.from({length:64},(_,i)=>spriteRect(1254,1254,i));assert.equal(rects.reduce((n,r)=>n+r.width*r.height,0),1254*1254);
 for(let row=0;row<8;row++)for(let col=1;col<8;col++)assert.equal(rects[row*8+col-1].x+rects[row*8+col-1].width,rects[row*8+col].x);
});
test('equipment uses shared slots, cannot be duplicated, and survives save/restore and removal',()=>{
 const g=game();wear(g,'watchlens','herbcord','pocketglass','amberloop');assert.equal(g.equipment.offhand,'watchlens');assert.deepEqual(['trinket1','trinket2','trinket3'].map(k=>g.equipment[k]),['herbcord','pocketglass','amberloop']);const stats=deriveStats(g);assert.equal(g.equipment.weapon,'twig');assert.equal(stats.ward,g.spellValues('ward').shield);assert.ok(stats.ward>53,'Power also strengthens shields');assert.equal(stats.tonic,77);assert.equal(stats.cooldown,.06);
 assert.equal(g.equip('eclipseloop'),false);g.awardItem('amberloop');assert.equal(g.inventory.filter(id=>id==='amberloop').length,1);
 const h=game(g.snapshot());assert.deepEqual(h.equipment,g.equipment);assert.deepEqual(deriveStats(h),stats);assert.ok(h.unequip('offhand'));assert.equal(h.stats.wardBonus,0);assert.ok(h.inventory.includes('watchlens'));assert.equal(h.unequip('missing'),false);
});
test('legacy completed bounties grant only their missing bonus items once',()=>{
 const g=game(),saved=g.snapshot();delete saved.equipmentVersion;saved.quests['briar-road']='complete';
 const h=game(saved);assert.ok(h.inventory.includes('duskshroud'));assert.equal(h.inventory.includes('foxidol'),false);
 const j=game(h.snapshot());assert.equal(j.inventory.filter(id=>id==='duskshroud').length,1);assert.equal(j.quests['briar-road'],'complete');
});
test('new bounty turn-ins award their bonus alongside the original item and never pay twice',()=>{
 const g=game();g.quests.herd='complete';g.quests['briar-road']='active';for(const camp of HUNTS[0].camps)g.cleared.add(camp.id);
 assert.ok(g.questAction('briar-road'));assert.ok(g.inventory.includes('briarcoat'));assert.ok(g.inventory.includes('duskshroud'));const coins=g.player.coins;assert.equal(g.questAction('briar-road'),false);assert.equal(g.player.coins,coins);
});
test('ward, tonic and cooldown modifiers affect casts and supplies without changing their costs',()=>{
 const g=game();wear(g,'wardlamp','herbcord','pocketglass','watchlens');g.awardItem('fireflylamp'); // one off-hand item replaces the other
 const mana=g.player.mana;g.cast('2');assert.equal(g.player.shield,53);assert.equal(g.player.mana,mana-SPELL_BY_ID.ward.cost);assert.ok(Math.abs(g.cooldowns.ward-SPELL_BY_ID.ward.cooldown*.94)<1e-9);
 assert.ok(g.equip('fireflylamp'));assert.equal(g.equipment.offhand,'fireflylamp');g.player.hp=1;g.tonic();assert.equal(g.player.hp,86);assert.equal(g.potionCooldown,8);const tonics=g.player.tonics;g.tonic();assert.equal(g.player.tonics,tonics);
 g.player.hp=g.player.maxHp-1;g.potionCooldown=0;g.tonic();assert.equal(g.player.hp,g.player.maxHp);
});
test('Wildbloom range and fox specialization match the character preview',()=>{
 const g=game();wear(g,'frostprism','frostlamp','foxidol');const stats=deriveStats(g);assert.equal(stats.bloom,130); // frostlamp replaced frostprism in the off hand
 g.creatures[1].x=g.player.x+125;g.cast('3');assert.equal(g.creatures[1].hp,0,'extra radius reaches a threat outside the normal 112 units');
 g.player.mana=g.player.maxMana;g.cast('6');assert.equal(g.fox.damage,stats.fox);
});
test('Lance and root specialization affect the real empowered projectile, with coherent tradeoffs',()=>{
 const g=game();const baseline=g.manaRegen;wear(g,'emberorb','thornrelic','briargrips','eclipseloop');const stats=deriveStats(g);assert.equal(g.player.maxHp,108);assert.ok(g.manaRegen<baseline);assert.ok(stats.speed<0);
 g.cast('1');g.shoot();assert.equal(g.projectiles[0].damage,stats.lance);assert.equal(g.boltCooldown,1.1,'equipment never accelerates free spark timing');
 g.boltCooldown=0;g.player.mana=g.player.maxMana;g.cast('5');g.shoot();assert.equal(g.projectiles[1].root,stats.bind);assert.ok(stats.bind>6);
});
test('older one-slot-per-type saves move into the shared slots without duplicates',()=>{
 const g=game(),saved=g.snapshot();saved.inventory=[...saved.inventory,'copperwand','briarcoat','leafcape','watchlens','wardlamp','amberloop','amberfocus','herbcord','reedgrips'];
 saved.equipment={weapon:'copperwand',robe:'briarcoat',cloak:'leafcape',focus:'watchlens',lantern:'wardlamp',ring:'amberloop',charm:'amberfocus',belt:'herbcord',gloves:'reedgrips'};
 const h=game(saved);assert.equal(h.equipment.weapon,'copperwand');assert.equal(h.equipment.robe,'briarcoat');assert.equal(h.equipment.offhand,'watchlens');
 assert.deepEqual(['trinket1','trinket2','trinket3'].map(k=>h.equipment[k]),['amberloop','amberfocus','herbcord']);
 assert.equal(new Set(Object.values(h.equipment)).size,Object.values(h.equipment).length);for(const id of ['leafcape','wardlamp','reedgrips'])assert.ok(h.inventory.includes(id));
 assert.ok(h.equip('reedgrips','trinket2'));assert.equal(h.equipment.trinket2,'reedgrips');assert.ok(h.equip('reedgrips','trinket1'));assert.deepEqual([h.equipment.trinket1,h.equipment.trinket2],['reedgrips','amberloop']);assert.equal(h.equip('reedgrips','head'),false);
});
