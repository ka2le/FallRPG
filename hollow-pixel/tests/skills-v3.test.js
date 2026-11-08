import test from 'node:test';
import assert from 'node:assert/strict';
import { fieldGame, advance } from '../scripts/balance-fixtures.mjs';
import { ATTRIBUTES, pointsAtLevel, PROGRESSION_VERSION } from '../src/progression.js';
import { ACTIVE_SPELL_IDS } from '../src/data.js';

test('two points per level fund stats, spell unlocks and a single focus upgrade from one budget',()=>{
  const g=fieldGame([]);g.player.level=3;g.player.coins=0;g.recalculate();assert.deepEqual(Object.keys(ATTRIBUTES),['power','mana']);assert.equal(pointsAtLevel(3),4);
  assert.ok(g.learn('surge'));assert.ok(g.learn('ward'));assert.ok(g.upgradeSpell('ward'));assert.ok(g.spendPoint('mana'));
  assert.equal(g.unspentPoints,0);assert.equal(g.player.coins,0);assert.equal(g.upgradeSpell('ward'),false);assert.equal(g.spendPoint('power'),false);assert.equal(g.learn('nova'),false);
  assert.equal(g.player.maxMana,108);assert.equal(g.manaRegen,4.65);
});

test('unlocking or focusing a spell does not refill mana or remove its casting cost',()=>{
  const g=fieldGame([{type:'seedling',x:3150,y:3000}],{x:3000,y:3000});g.player.level=2;g.recalculate();g.player.mana=50;
  assert.ok(g.learn('surge'));assert.ok(g.upgradeSpell('surge'));assert.equal(g.player.mana,50);g.cast('1');assert.ok(g.shoot());
  assert.equal(g.player.mana,12);assert.equal(g.projectiles[0].damage,g.spellValues('surge').damage);assert.ok(g.projectiles[0].slow>1);
});

test('Power helps every spell while one focused spell receives a larger individual benefit',()=>{
  const g=fieldGame([]);g.player.level=5;g.learned=new Set(['surge','nova']);g.recalculate();const lance=g.spellValues('surge').damage,nova=g.spellValues('nova').damage;
  g.spendPoint('power');const allLance=g.spellValues('surge').damage,allNova=g.spellValues('nova').damage;
  assert.ok(allLance>lance&&allNova>nova);g.upgradeSpell('surge');assert.ok(Math.abs(g.spellValues('surge').damage/allLance-1.5)<1e-8);assert.equal(g.spellValues('nova').damage,allNova);
});

test('every learned spell has one legal saved focus upgrade, with no repeat purchases',()=>{
  const g=fieldGame([]);g.player.level=11;g.recalculate();for(const id of ACTIVE_SPELL_IDS)assert.ok(g.learn(id),id);
  for(const id of ACTIVE_SPELL_IDS){assert.ok(g.upgradeSpell(id),id);assert.equal(g.upgradeSpell(id),false,id);}
  assert.equal(g.unspentPoints,6);const h=new g.constructor(g.snapshot(),{world:g.world});assert.deepEqual(h.snapshot(),{...g.snapshot(),autoAttack:true});assert.equal(h.spellUpgrades.size,7);
  assert.ok(h.spellValues('ward').shield>70);assert.ok(h.spellValues('nova').radius>135);assert.ok(h.spellValues('haste').hasteSpeed>2);assert.ok(h.spellValues('renew').healing>75);
});

test('default mana and slow health regeneration work in combat and outside it, without exceeding caps',()=>{
  const g=fieldGame([{type:'seedling',x:3150,y:3000}],{x:3000,y:3000}),c=g.creatures[0];c.aggro=true;c.root=100;c.attack=100;g.player.hp=60;g.player.mana=0;
  advance(g,1);assert.ok(Math.abs(g.player.hp-60.5)<1e-7);assert.ok(Math.abs(g.player.mana-4)<1e-7);
  g.creatures=[];advance(g,1);assert.ok(Math.abs(g.player.hp-61.7)<1e-7);assert.ok(Math.abs(g.player.mana-10)<1e-7);
  advance(g,120);assert.equal(g.player.hp,g.player.maxHp);assert.equal(g.player.mana,g.player.maxMana);
});

test('older journeys keep earned spells and gear while old split-stat points are refunded into the new budget',()=>{
  const g=fieldGame([]);g.player.level=5;g.player.coins=77;g.inventory.push('copperwand');g.equip('copperwand');g.learned=new Set(['surge','ward']);g.cleared.add('briar-turn');
  const save=g.snapshot();save.rpgVersion=2;save.attributes={power:5,capacity:4,recovery:3};const h=new g.constructor(save,{world:g.world});
  assert.deepEqual(h.attributes,{power:0,mana:0});assert.equal(h.unspentPoints,6);assert.equal(h.learned.size,2);assert.equal(h.equipment.weapon,'copperwand');assert.equal(h.player.coins,77);assert.ok(h.cleared.has('briar-turn'));assert.equal(h.snapshot().rpgVersion,PROGRESSION_VERSION);
});
