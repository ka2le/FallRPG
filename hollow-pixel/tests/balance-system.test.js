import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { ACTIVE_SPELL_IDS, DEFAULT_BINDINGS, SPELL_BY_ID } from '../src/data.js';
import { LESSONS } from '../src/adventure.js';
import { enemyPressure } from '../src/combat-tuning.js';
import { SPECIES } from '../src/data.js';
import { HOME } from '../src/world.js';

const world=()=>({props:[],interactables:[],ambient:[],rootwallGroups:[],creatures:[0,1].map(i=>({id:`seed-${i}`,type:'seedling',x:1740+i*30,y:855,homeX:1740+i*30,homeY:855,phase:0,level:1}))});
function game(){const g=new Game(null,{world:world()});Object.assign(g.player,{x:1680,y:855});g.autoAttack=false;g.wasSafe=false;g.learned=new Set(ACTIVE_SPELL_IDS);return g;}
const advance=(g,t,input={})=>{for(let n=0;n<Math.round(t/.05);n++)g.update(.05,input);};

test('numbered spells and optional bindings share the single basic attack',()=>{
  const g=game();assert.deepEqual(g.bindings,DEFAULT_BINDINGS);assert.equal(g.bindings['1'],'surge');assert.equal(g.bindings['6'],'fox');assert.equal(g.bindings['7'],'renew');assert.equal(g.bindings['9'],'');
  assert.equal(g.learn('frost',true),false);assert.equal(LESSONS.bramble,undefined);assert.ok(SPELL_BY_ID.bramble.aim);assert.ok(SPELL_BY_ID.wave.aim);
  assert.ok(g.beginCast('1'));assert.equal(g.aiming,null);assert.equal(g.player.mana,100);assert.equal(g.empowered,'surge');
  assert.ok(g.beginCast('q'));assert.equal(g.empowered,null);assert.ok(g.beginCast('1'));assert.ok(g.shoot());assert.equal(g.player.mana,62);assert.equal(g.projectiles[0].damage,g.basicDamage*4);assert.equal(g.empowered,null);
  assert.equal(g.cast('q'),false,'aliases cannot bypass the shared recovery');
});
test('a heavy shot waits for a valid target, and lack of mana falls back to the free basic spark',()=>{
  const g=game();g.beginCast('1');g.world.props=[{x:1710,y:855,solid:15}];assert.equal(g.shoot(),false);assert.equal(g.player.mana,100);assert.equal(g.cooldowns.surge,undefined);
  g.world.props=[];g.player.mana=10;assert.ok(g.shoot());assert.equal(g.projectiles[0].damage,14);assert.equal(g.player.mana,10);g.cancelCast();assert.equal(g.empowered,null);
});
test('Briarbind spreads from the impact, respects cover and never attacks neutral wildlife',()=>{
  const g=game();const neutral={...g.creatures[0],id:'neutral',type:'barkjaw',x:1780};g.creatures.push(neutral);g.beginCast('5');assert.equal(g.creatures[0].root,0);g.shoot();advance(g,.3);
  assert.ok(g.creatures.slice(0,2).every(c=>c.root>4));assert.equal(neutral.root,0);assert.equal(neutral.hp,40);assert.equal(g.creatures[1].hp,40,'spreading vines do not multiply the basic attack damage');
});
test('Wildbloom is centered on the caster and shields refresh without stacking',()=>{
  const g=game();g.creatures[1].x=1900;assert.ok(g.cast('3'));assert.equal(g.creatures[0].hp,0);assert.equal(g.creatures[1].hp,40);assert.equal(g.player.mana,52);
  assert.ok(g.cast('2'));assert.equal(g.player.shield,45);g.damagePlayer(30);assert.equal(g.player.shield,15);advance(g,1.6);g.player.mana=100;g.cast('2');assert.equal(g.player.shield,45);
});
test('Windrun changes actual movement speed for a finite duration without crossing scenery',()=>{
  const g=game();g.creatures=[];g.cast('4');const x=g.player.x;g.update(.05,{right:true,run:true});assert.ok(Math.abs(g.player.x-x-9.8)<1e-8);
  g.world.props=[{x:g.player.x+22,y:855,solid:10}];advance(g,.5,{right:true,run:true});assert.ok(g.player.x<g.world.props[0].x-18);advance(g,4);assert.equal(g.player.haste,0);
});
test('growth offers durable distinct builds, modest free level scaling and no free combat mana refill',()=>{
  const g=game();g.learned.clear();g.player.mana=3;g.reward(140);assert.equal(g.player.level,2);assert.equal(g.player.mana,3);assert.equal(g.unspentPoints,2);
  g.spendPoint('power');g.spendPoint('mana');assert.equal(g.player.maxMana,108);assert.ok(Math.abs(g.manaRegen-4.65)<1e-8);assert.ok(g.spellPower>1.03);assert.equal(g.unspentPoints,0);assert.equal(g.spendPoint('power'),false);
  g.player.level=4;g.recalculate();assert.ok(g.basicDamage<16,'three free levels never double basic damage');
});
test('power extends control, shield and companion durations while healing stays bounded',()=>{
  const g=game();g.player.level=11;while(g.unspentPoints)g.spendPoint('power');g.player.mana=1000;g.cast('2');assert.ok(g.player.ward>10);g.player.mana=1000;g.cast('6');assert.ok(g.fox.time>25);
  const fox=g.fox;g.cooldowns.fox=0;g.cast('6');assert.notEqual(g.fox,fox,'summoning replaces the one existing companion');g.player.hp=1;g.player.mana=1000;g.cast('7');g.creatures=[];advance(g,6.1);assert.ok(g.player.hp>49);assert.ok(g.player.hp<=g.player.maxHp);
});
test('a late Mana specialist can sustain automatic heavy shots; an apprentice cannot',()=>{
  function stream(level){const g=game();g.learned.clear();g.player.level=level;g.learn('surge');while(g.unspentPoints)g.spendPoint('mana');g.recalculate();g.player.mana=g.player.maxMana;g.creatures=g.creatures.slice(0,1);Object.assign(g.creatures[0],{hp:1e8,maxHp:1e8,root:1e8,attack:1e8,aggro:true});g.autoAttack=true;g.autoSurge=true;let heavy=0,basic=0;for(let n=0;n<2400;n++){g.update(.05);for(const e of g.events.splice(0))if(e.type==='cast'){if(e.id==='surge')heavy++;if(e.id==='bolt')basic++;}}return {heavy,basic};}
  const early=stream(2),late=stream(30);assert.ok(early.basic>early.heavy*3);assert.ok(late.heavy>late.basic*10);
});
test('respawns need elapsed time AND a haven visit, and never appear near the player',()=>{
  const g=game(),c=g.creatures[0];g.hurt(c,100);g.time=301;g.update(.05);assert.ok(c.dead,'timer alone is insufficient');
  Object.assign(g.player,HOME);g.update(.05);assert.equal(c.dead,false,'elapsed timer plus returning home allows a distant respawn');
  Object.assign(g.player,{x:1680,y:855});g.update(.05);g.hurt(c,100);Object.assign(g.player,HOME);g.update(.05);assert.ok(c.dead,'a quick base visit does not reset the timer');
  Object.assign(g.player,{x:1680,y:855});g.time+=301;g.update(.05);assert.ok(c.dead,'even a haven-authorized respawn waits while nearby');Object.assign(g.player,HOME);g.update(.05);assert.equal(c.dead,false);
});
test('save reload preserves respawn timers and growth without permanently re-clearing bounty camps',()=>{
  const g=game(),c=g.creatures[0];g.player.level=4;g.spendPoint('capacity');g.spendPoint('power');g.cleared.add('briar-turn');g.hurt(c,100);g.time=150;g.autoSurge=true;const snapshot=g.snapshot(),restored=new Game(snapshot,{world:world()});assert.deepEqual(restored.snapshot(),{...snapshot,autoAttack:true});
  assert.equal(restored.creatures[1].dead,false);restored.time=302;restored.update(.05);assert.ok(restored.creatures[0].dead,'reloading away from home does not authorize a return');Object.assign(restored.player,HOME);restored.update(.05);assert.equal(restored.creatures[0].dead,false);assert.ok(restored.cleared.has('briar-turn'));
});
test('legacy saves migrate into the new spell path and leave all earned growth available',()=>{
  const g=new Game({version:1,rpgVersion:1,player:{level:9},learned:['bind','ward','frost','blink','fox'],stances:['siphon'],quests:{herd:'complete'},bindings:{q:'bramble'}},{world:world()});
  assert.deepEqual([...g.learned],['surge','ward','nova','haste','fox']);assert.equal(g.unspentPoints,11);assert.equal(g.bindings.q,'surge');assert.deepEqual([...g.stances],['ember']);assert.equal(g.stance,'ember');
});
test('a safe haven is outside an adjacent hunting ground, and malformed growth saves stay bounded',()=>{
  const g=game(),c=g.creatures[0];Object.assign(c,{x:945,y:553,homeX:945,homeY:553});g.quests.herd='complete';g.hurt(c,100);g.time=301;Object.assign(g.player,HOME);g.update(.05);assert.equal(c.dead,false,'the nearby pasture can repopulate while the player is safely home');
  const h=new Game({version:1,rpgVersion:2,attributes:null,player:{level:3}},{world:world()});assert.equal(h.unspentPoints,4);assert.deepEqual(h.attributes,{power:0,mana:0});
});
test('routes validate shoreline crossings between nodes and finish at their actual waypoints',()=>{
  const g=game();g.creatures=[];Object.assign(g.player,{x:1020,y:1511.8564185909447});g.navigateTo(1020,1480);assert.ok(g.route.length>0);
  for(let n=0;n<1000&&g.route.length;n++)g.update(.05,{run:true});assert.ok(Math.hypot(g.player.x-1020,g.player.y-1480)<1);
});
test('territorial enemies drop pursuit; rare dedicated hunters retain it',()=>{
  const g=game(),c=g.creatures[0];c.x=c.homeX+600;c.aggro=true;g.update(.05);assert.equal(c.aggro,false);assert.equal(c.returning,true);
  c.type='stalker';c.aggro=true;c.returning=false;g.update(.05);assert.equal(c.aggro,true);assert.equal(enemyPressure(c,SPECIES.stalker,1).homeLeash,Infinity);
});
