import test from 'node:test';
import assert from 'node:assert/strict';
import { fieldGame, treeGame, advance } from '../scripts/balance-fixtures.mjs';
import { HOME, dist } from '../src/world.js';
import { beginReturn, recoveryPerSecond, GROUP_AGGRO_RADIUS } from '../src/aggro.js';
import { BalanceBot, growBuild, resupply } from '../src/balance-bot.js';

test('one sighting alerts nearby pack members in the same tick, without a chain across the forest',()=>{
  const g=fieldGame([{type:'seedling',x:1700,y:855},{type:'seedling',x:1840,y:855},{type:'seedling',x:2010,y:855},{type:'barkjaw',x:1740,y:850},{type:'prowler',x:1800,y:870}]);
  g.update(.05);assert.ok(g.creatures[0].aggro);assert.ok(g.creatures[1].aggro);assert.equal(g.creatures[2].aggro,false);assert.equal(g.creatures[3].aggro,false);assert.equal(g.creatures[4].aggro,false);
  assert.ok(dist(g.creatures[0],g.creatures[1])<GROUP_AGGRO_RADIUS);
});
test('a one-shot kill still rallies its pack, including different species in the same authored camp',()=>{
  const g=fieldGame([{type:'seedling',x:1700,y:855,camp:'pack'},{type:'rootknife',x:1790,y:855,camp:'pack'},{type:'seedling',x:2050,y:855,camp:'pack'}],{x:1350,y:855});
  g.hurt(g.creatures[0],999);assert.ok(g.creatures[0].dead);assert.ok(g.creatures[1].aggro);assert.equal(g.creatures[2].aggro,false);
});
test('the surviving rear members reach an apprentice walking away, while sprinting can abandon the fight',()=>{
  for(const speed of [80,112]){
    const g=fieldGame([3150,3190,3220].map(x=>({type:'seedling',x,y:3000})),{x:3000,y:3000});g.safeZonesEnabled=false;g.autoAttack=true;advance(g,10,{x:-speed/112,y:0});
    assert.ok(g.creatures[0].dead,'the initial enemy may die before reaching the player');assert.ok(g.creatures.some(c=>!c.dead),'straight retreat cannot freely clear the entire pack');
    if(speed===80)assert.ok(g.events.some(e=>e.type==='player-damage'),'a surviving pack member reaches the walking player, even if travel later regenerates the wound');
  }
});
test('following a retreating animal back into its territory provokes a counterattack',()=>{
  const g=fieldGame([{type:'rootknife',x:3250,y:3000,homeX:3400,homeY:3000}],{x:3150,y:3000}),c=g.creatures[0];c.hp=40;beginReturn(c);g.hurt(c,1);assert.equal(c.returning,false);assert.ok(c.aggro);
});
test('haven entry starts a walking retreat with gradual recovery, and repeated hits never refill health',()=>{
  const g=fieldGame([{type:'seedling',x:1340,y:855,homeX:1510,homeY:855}],{x:1330,y:855}),c=g.creatures[0];
  g.hurt(c,28);const hp=c.hp,start=c.x;Object.assign(g.player,HOME);g.update(.05);assert.ok(c.returning);assert.equal(c.aggro,false);assert.ok(c.hp<=hp+recoveryPerSecond(c)*.05+.001);
  advance(g,1);assert.ok(c.x>start+50,'it walks away from the haven boundary');assert.ok(c.hp<c.maxHp,'recovery is gradual');
  const before=c.hp;g.hurt(c,8);g.update(.05);assert.ok(c.hp<before-7,'another hit cannot trigger a full-health reset');assert.equal(c.aggro,false);
});
test('returning enemies route around scenery, finish returning far from the player and continue recovering',()=>{
  const g=fieldGame([{type:'rootknife',x:1680,y:855,homeX:1820,homeY:855}],{x:3000,y:855}),c=g.creatures[0];g.world.props=[{x:1750,y:855,solid:27}];c.hp=5;beginReturn(c);
  advance(g,5);assert.ok(dist(c,{x:c.homeX,y:c.homeY})<8);assert.equal(c.returning,false);assert.ok(c.hp>5&&c.hp<c.maxHp);advance(g,30);assert.equal(c.hp,c.maxHp);
});
test('saving a wounded retreating enemy does not restore it to full health on reload',()=>{
  const actors=[{type:'rootknife',x:1680,y:855,homeX:1820,homeY:855}],g=fieldGame(actors,{x:3000,y:855}),c=g.creatures[0];c.hp=5;beginReturn(c);g.boltCooldown=.7;
  const saved=g.snapshot(),h=fieldGame(actors,{x:3000,y:855});h.restore(JSON.parse(JSON.stringify(saved)));
  assert.equal(h.creatures[0].hp,5);assert.ok(h.creatures[0].returning);assert.equal(h.boltCooldown,.7);h.update(.05);assert.ok(h.creatures[0].hp>5&&h.creatures[0].hp<6);
});

test('saving preserves the shared territory of reinforcements alerted away from their home',()=>{
  const actors=[{type:'seedling',x:3300,y:3000,homeX:3000,homeY:3000},{type:'seedling',x:3410,y:3000}],g=fieldGame(actors,{x:3450,y:3000});
  g.creatures[0].aggro=true;g.creatures[0].aggroAnchor={x:3000,y:3000};g.hurt(g.creatures[0],1);
  const h=fieldGame(actors,{x:3450,y:3000});h.restore(JSON.parse(JSON.stringify(g.snapshot())));
  assert.ok(h.creatures[1].aggro);assert.deepEqual(h.creatures[1].aggroAnchor,g.creatures[1].aggroAnchor);
});
test('walking past a grove does not automatically shoot or provoke its trees',()=>{
  const {g}=treeGame('scattered');g.target=null;g.autoAttack=true;advance(g,1);assert.ok(g.creatures.every(c=>!c.provoked));assert.equal(g.projectiles.length,0);
});
test('rooted walls regenerate against apprentice basic attacks while stronger magic can cut a gap',()=>{
  const {g,target}=treeGame();g.autoAttack=true;advance(g,45);assert.equal(target.dead,false);assert.ok(target.hp>target.maxHp-20);
  const high=treeGame();high.g.player.level=15;growBuild(high.g,'power');high.g.recalculate();high.g.autoAttack=true;advance(high.g,25);assert.ok(high.target.dead,'power investment can overcome rooted recovery');
});
test('damage provokes a walking grove into approaching and attacking, while rooted trunks keep their slots',()=>{
  const {g,target}=treeGame('scattered'),before=dist(target,g.player);g.hurt(target,1);assert.ok(g.creatures.every(c=>c.provoked));advance(g,3);assert.ok(dist(target,g.player)<before-50);assert.ok(g.player.hp<g.player.maxHp);
  const rooted=treeGame(),positions=rooted.group.members.map(c=>({x:c.x,y:c.y}));rooted.g.hurt(rooted.target,1);advance(rooted.g,2);assert.deepEqual(rooted.group.members.map(c=>({x:c.x,y:c.y})),positions);
});
test('waiting trunks keep rooted recovery during staggered dispersal; released trunks can retaliate',()=>{
  const {g,group}=treeGame();group.phase='dispersing';group.elapsed=0;const waiting=group.members[4],released=group.members[0];waiting.hp-=30;released.hp-=30;
  g.update(.05);assert.ok(waiting.hp>waiting.maxHp-30+.8);assert.ok(released.hp<released.maxHp-30+.5);
});
test('damage spells cannot farm from inside a protected haven',()=>{
  const g=fieldGame([{type:'seedling',x:1325,y:855}],HOME);g.learned.add('nova');g.learned.add('siphon');g.setBinding('8','siphon');assert.equal(g.cast('3'),false);assert.equal(g.cast('8'),false);assert.equal(g.player.mana,100);
});
test('ranged enemies flank obstructing cover instead of standing in range indefinitely',()=>{
  const g=fieldGame([{type:'petalmaw',x:3175,y:3000}],{x:3000,y:3000}),c=g.creatures[0],start={x:c.x,y:c.y};g.world.props=[{x:3085,y:3000,solid:20}];c.aggro=true;
  advance(g,4);assert.ok(dist(c,start)>30);assert.ok(g.player.hp<g.player.maxHp);
});
test('the campaign bot keeps stronger equipment and reserves coins rather than buying endless tonics',()=>{
  const g=fieldGame([],HOME);g.player.level=5;g.player.coins=90;g.player.tonics=0;g.inventory.push('copperwand','briarcoat','amberfocus');g.equip('copperwand');g.quests.herd='complete';g.learned=new Set(['surge','ward','nova']);
  resupply(g,'balanced');assert.equal(g.equipment.weapon,'copperwand');assert.equal(g.equipment.charm,'amberfocus');assert.ok(g.player.tonics<=2);
});

test('the tactical bot closes into its own area spell range against a ranged pack',()=>{
  const g=fieldGame([{type:'petalmaw',x:3150,y:2990},{type:'petalmaw',x:3150,y:3010}],{x:3000,y:3000});g.player.level=5;g.learned.add('nova');g.recalculate();g.player.mana=g.player.maxMana;
  for(const c of g.creatures)c.aggro=true;const bot=new BalanceBot(g),input=bot.decide();assert.ok(input.x>.8,'it approaches rather than orbiting outside the spell radius');
  for(let n=0;n<80;n++)g.update(.05,bot.decide());assert.ok(g.events.some(e=>e.type==='cast'&&e.id==='nova'),'it actually uses the area spell');
});

test('a retreating bot preserves its escape instead of spending all mana on maintenance',()=>{
  const g=fieldGame([{type:'rootknife',x:3100,y:2985},{type:'rootknife',x:3100,y:3015}],{x:3000,y:3000});g.safeZonesEnabled=false;g.player.level=7;g.recalculate();g.player.hp=50;g.player.mana=60;
  for(const id of ['ward','renew','haste'])g.learned.add(id);for(const c of g.creatures)c.aggro=true;
  const bot=new BalanceBot(g),options={goal:{x:2400,y:3000},retreat:true};bot.decide(options);assert.ok(g.player.haste>0);
  for(let n=0;n<200;n++)g.update(.05,bot.decide(options));assert.ok(g.player.hp>0);assert.ok(g.creatures.every(c=>!c.aggro),'it leaves the group territory alive');assert.equal(g.events.some(e=>e.type==='respawn'),false);
});
