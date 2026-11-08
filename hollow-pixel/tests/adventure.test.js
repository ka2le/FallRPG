import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { HUNTS, ENCOUNTERS, ADVENTURE_PATHS, GEAR } from '../src/adventure.js';
import { canWalk, dist, HOME } from '../src/world.js';

function pasture(g){g.questAction('herd');for(const c of g.creatures.filter(c=>c.quest==='herd'))g.hurt(c,999);assert.ok(g.questAction('herd'));}
test('a fresh apprentice earns two skill points and a wand, then chooses the first spell',()=>{
  const g=new Game();assert.deepEqual([...g.stances],['ember']);assert.equal(g.learned.size,0);assert.equal(g.cast('f'),false);assert.equal(g.beginCast('q'),false);assert.equal(g.setStance('siphon'),false);assert.equal(g.learn('ward'),false);
  pasture(g);assert.equal(g.player.level,2);assert.equal(g.learned.size,0);assert.equal(g.unspentPoints,2);assert.ok(g.learn('surge'));assert.equal(g.unspentPoints,1);assert.equal(g.bindings.q,'surge');assert.ok(g.inventory.includes('reedstaff'));const before=g.spellPower;assert.ok(g.equip('reedstaff'));assert.ok(g.spellPower>before+.09);assert.equal(g.quests['briar-road'],'offered');assert.equal(g.questAction('herd'),false);
});
test('lessons require a level, prerequisite and skill point; learning works away from town without coins',()=>{
  const g=new Game();pasture(g);g.player.coins=0;Object.assign(g.player,{x:800,y:430});assert.equal(g.learn('ward'),false);assert.ok(g.learn('surge'));assert.equal(g.learn('ward'),false);g.player.level=3;g.recalculate();assert.equal(g.learn('siphon'),false);assert.ok(g.learn('ward'));assert.equal(g.player.coins,0);assert.equal(g.unspentPoints,2);assert.equal(g.learn('ward'),false);const h=new Game(g.snapshot());assert.deepEqual(h.snapshot(),g.snapshot());assert.ok(h.learned.has('ward'));
});
test('bounties require every camp and pay equipment and gold exactly once',()=>{
  const g=new Game();pasture(g);assert.ok(g.questAction('briar-road'));assert.equal(g.questAction('briar-road'),false);
  for(const camp of HUNTS[0].camps)for(const c of g.creatures.filter(c=>c.camp===camp.id))g.hurt(c,99999);
  assert.ok(g.huntReady('briar-road'));assert.ok(g.questAction('briar-road'));assert.ok(g.inventory.includes('briarcoat'));assert.equal(g.questAction('briar-road'),false);assert.equal(g.quests['redleaf-road'],'offered');g.equip('briarcoat');assert.ok(g.player.maxHp>=154);const h=new Game(g.snapshot());assert.deepEqual(h.snapshot(),g.snapshot());
});
test('equipment changes actual spell damage, protection and movement; buying is bounded',()=>{
  const g=new Game();pasture(g);g.player.coins=500;assert.ok(g.buyGear('wayboots'));assert.equal(g.buyGear('wayboots'),false);g.equip('wayboots');assert.equal(g.gear.speed,.16);assert.equal(g.equip('crownstaff'),false);g.inventory.push('briarcoat');g.equip('briarcoat');g.safeZonesEnabled=false;const hp=g.player.hp;g.damagePlayer(100);assert.equal(hp-g.player.hp,88);
  g.world.props=[];g.world.interactables=[];g.creatures=[];g.autoAttack=false;g.player.hp=40;g.update(.05);assert.ok(Math.abs(g.player.hp-40.06)<1e-8,'walking restores health slowly rather than erasing expedition attrition');g.tonic();const left=g.player.tonics;g.player.hp=40;g.tonic();assert.equal(g.player.tonics,left,'tonics have a shared recovery time');
});
test('all authored camps spawn in full, follow clear paths and have fixed threatening levels',()=>{
  const g=new Game();for(const camp of ENCOUNTERS){const enemies=g.creatures.filter(c=>c.camp===camp.id);assert.equal(enemies.length,camp.types.length,camp.id);assert.ok(enemies.every(c=>c.level===camp.level));assert.ok(enemies.every(c=>canWalk(g.world,c.x,c.y,8)));}
  const staticTerrain={...g.world,rootwallLive:false};
  for(const path of ADVENTURE_PATHS)for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],d=dist(a,b);for(let n=0;n<=d;n+=8)assert.ok(canWalk(staticTerrain,a.x+(b.x-a.x)*n/d,a.y+(b.y-a.y)*n/d,8),`${a.x},${a.y} → ${b.x},${b.y} at ${n}`);}
  const early=g.creatures.find(c=>c.quest==='herd'),late=g.creatures.find(c=>c.camp==='last-lantern'&&c.elite);assert.ok(late.damage>early.damage*5);assert.ok(late.maxHp>early.maxHp*5);g.player.level=12;g.recalculate();assert.equal(late.level,12);assert.equal(early.level,1,'monsters do not scale to the player');
});
test('an entire bounty chain has reachable rewards without requiring repeated turn-ins',()=>{
  const g=new Game();pasture(g);for(const h of HUNTS.filter(h=>!h.id.startsWith('road-'))){assert.ok(g.questAction(h.id),h.id);for(const c of g.creatures.filter(c=>h.camps.some(camp=>camp.id===c.camp)))g.hurt(c,99999);assert.ok(g.questAction(h.id));g.equip(h.item);}
  assert.ok(g.player.level>=11);assert.equal(g.equipment.weapon,'crownstaff');assert.ok(g.spellPower>1.5);assert.equal(g.inventory.filter(id=>id==='crownstaff').length,1);assert.ok(GEAR.crownstaff.stats.damage>GEAR.reedstaff.stats.damage);
});
