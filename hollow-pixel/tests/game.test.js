import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { SPECIES, SPELL_BY_ID } from '../src/data.js';
import { createWorld, biomeAt, waterAt, canWalk, moveBody, HOME, seamX } from '../src/world.js';

function battle(){const g=new Game();Object.assign(g.bindings,{q:'bramble',e:'frost',f:'ward',r:'wave'});g.learned=new Set(['bramble','bind','frost','ward','wave','siphon','renew','blink','fox']);g.stances=new Set(['ember','frost','siphon']);g.safeZonesEnabled=false;g.autoAttack=false;g.world.props=[];g.player.x=1080;g.player.y=855;g.creatures=g.creatures.filter(c=>c.type==='seedling').slice(0,2);g.creatures.forEach((c,i)=>Object.assign(c,{x:1120+i*20,y:855,homeX:1120+i*20,homeY:855}));g.target=g.creatures[0].id;return g;}
const advance=(g,seconds)=>{for(let i=0;i<seconds/.05;i++)g.update(.05);};

test('world and habitat placement are deterministic',()=>{const a=createWorld(),b=createWorld();assert.deepEqual(a,b);assert.ok(a.props.length>300);for(const c of a.creatures)if(['snowkeel','mantleback','ventback'].includes(c.type))assert.equal(biomeAt(c.x,c.y),SPECIES[c.type].habitat,c.type);assert.ok(canWalk(a,HOME.x,HOME.y));});
test('water and tree trunks block movement, including high-speed Mothstep',()=>{const g=new Game(),wall={x:1105,y:855,solid:12};g.world.props=[wall];const p={x:1080,y:855};moveBody(g.world,p,100,0);assert.ok(p.x<wall.x-12);g.setBinding('q','blink');g.player.dx=1;g.player.dy=0;g.cast('q');assert.ok(g.player.x<wall.x-12);assert.equal(waterAt(620+Math.sin(850*.006)*88+Math.sin(850*.013)*25,850),false,'bridge is walkable');});
test('Briarbind arms a spreading root and only spends mana when the basic shot fires',()=>{const g=battle();g.setBinding('q','bind');assert.equal(g.cast('q'),true);assert.equal(g.player.mana,100);assert.equal(g.creatures[0].root,0);assert.ok(g.shoot());assert.equal(g.player.mana,58);advance(g,.25);assert.ok(g.creatures.every(c=>c.root>4));assert.equal(g.cast('q'),false);});
test('reassigning a spell does not reset its cooldown',()=>{const g=battle();g.setBinding('q','ward');g.cast('q');g.setBinding('r','ward');assert.equal(g.cast('r'),false);assert.ok(g.cooldowns.ward>0);assert.equal(g.setBinding('x','ward'),false);assert.equal(g.setBinding('q','missing'),false);});
test('Frostbloom damages multiple threats and slows them',()=>{const g=battle();g.creatures.forEach(c=>c.hp=100);assert.equal(g.cast('e',{x:1130,y:855}),true);for(const c of g.creatures){assert.equal(c.hp,72);assert.equal(c.slow,5);}assert.equal(g.player.mana,74);});
test('Willow Ward absorbs damage, expires, and does not create health',()=>{const g=battle();g.cast('f');g.damagePlayer(30);assert.equal(g.player.hp,120);assert.equal(g.player.shield,15);g.damagePlayer(25);assert.equal(g.player.hp,110);assert.equal(g.player.shield,0);g.creatures=[];advance(g,8);assert.equal(g.player.ward,0);});

test('fractional shield absorption and attacks show whole combat amounts without changing damage',()=>{
  const g=battle();g.player.shield=12.35;g.damagePlayer(20);
  assert.equal(g.player.shield,0);assert.ok(Math.abs(g.player.hp-112.35)<1e-9);
  assert.deepEqual(g.floaters.map(f=>f.text),['−12 WARD','−8']);
  const target=g.creatures[0],before=target.hp;g.hurt(target,6.35);
  assert.ok(Math.abs(target.hp-(before-6.35))<1e-9);assert.equal(g.floaters.at(-1).text,'6');
  g.player.hp=20;g.gear.tonic=.4;g.tonic();
  assert.ok(Math.abs(g.player.hp-85.4)<1e-9);assert.equal(g.floaters.at(-1).text,'+65');
});
test('Hollow Bell interrupts windups and stuns threats in its radius',()=>{const g=battle();g.creatures.forEach(c=>c.windup=.4);assert.equal(g.cast('r',{x:1130,y:855}),true);for(const c of g.creatures){assert.equal(c.stun,2);assert.equal(c.windup,0);}});
test('neutral animals are not damaged or targeted by area magic',()=>{const g=battle();const neutral={...g.creatures[0],id:'neutral',type:'barkjaw',hp:100,aggro:false,x:1125};g.creatures.push(neutral);g.cast('e',{x:1130,y:855});assert.equal(neutral.hp,100);assert.equal(neutral.aggro,false);g.target='neutral';g.creatures=[neutral];assert.equal(g.shoot(),false);});
test('queued attacks wait behind cover or without targets without spending mana',()=>{const g=battle();g.setBinding('q','bind');g.world.props=[{x:1100,y:855,solid:12}];assert.ok(g.cast('q'));assert.equal(g.shoot(),false);assert.equal(g.player.mana,100);assert.equal(g.cooldowns.bind,undefined);g.world.props=[];g.creatures[0].x=1600;g.creatures[1].x=1630;assert.equal(g.shoot(),false);assert.equal(g.empowered,'bind');});
test('healing is bounded and tonics are consumed only when useful',()=>{const g=battle();g.tonic();assert.equal(g.player.tonics,3);g.player.hp=70;g.tonic();assert.equal(g.player.hp,120);assert.equal(g.player.tonics,2);g.player.hp=60;g.creatures=[];g.setBinding('q','renew');g.cast('q');advance(g,6);assert.ok(Math.abs(g.player.hp-115.2)<.1);});
test('Siphon restores health and fox attacks only engaged threats',()=>{const g=battle(),before=g.creatures[0].hp;g.player.hp=60;g.setBinding('q','siphon');g.cast('q');assert.equal(g.player.hp,82);assert.equal(before-g.creatures[0].hp,27);g.creatures[0].aggro=false;g.creatures[0].x=1280;g.creatures[1].x=1290;g.setBinding('r','fox');g.cast('r');assert.ok(g.fox);const hp=g.creatures[0].hp;advance(g,.5);assert.ok(g.creatures[0].hp>=hp,'the companion does not damage unengaged wildlife; passive recovery may raise health');});
test('quest rewards can only be claimed once and require completion',()=>{const g=new Game();assert.equal(g.questAction('herd'),true);assert.equal(g.questAction('herd'),false);g.creatures.filter(c=>c.quest==='herd').forEach(c=>g.hurt(c,999));assert.equal(g.herdCleared,true);assert.equal(g.questAction('herd'),true);assert.equal(g.player.tonics,5);const xp=g.player.xp;assert.equal(g.questAction('herd'),false);assert.equal(g.player.xp,xp);});
test('observations require proximity and award a single discovery',()=>{const g=new Game(),c=g.creatures.find(c=>c.type==='barkjaw');g.observe(c);assert.equal(g.observed.size,0);g.player.x=c.x+40;g.player.y=c.y;g.observe(c);const xp=g.player.xp;assert.ok(g.observed.has('barkjaw'));g.observe(c);assert.equal(g.player.xp,xp);});
test('the crossing removes its obstruction and restores both food reserves',()=>{const g=new Game();g.nearby=g.world.interactables.find(i=>i.kind==='crossing');g.interact();assert.ok(g.crossingOpen);assert.ok(g.world.props.find(p=>p.blockage).removed);const c=g.creatures.find(c=>c.type==='scavenger');Object.assign(c,{x:seamX(1370)-60,y:1370,cold:.1,warm:1});g.ecology(c,.05);assert.equal(c.cold,1);assert.equal(c.state,'feeding');});
test('Snowkeels refuse to walk onto warm ground',()=>{const g=new Game();g.world.props=[];const c=g.creatures.find(c=>c.type==='snowkeel');c.x=seamX(1400)-.1;c.y=1400;const before=c.x;g.walkCreature(c,{x:c.x+100,y:c.y},1,50);assert.equal(c.x,before);});
test('clearing the pasture releases the separated feeding partner',()=>{const g=new Game();const c=g.creatures.find(c=>c.separated);g.ecology(c,.05);assert.equal(c.state,'waiting at the thorns');g.creatures.filter(a=>a.quest==='herd').forEach(a=>a.dead=true);g.ecology(c,.05);assert.equal(c.state,'returning to partner');advance(g,14);assert.equal(c.separated,false);});
test('authored animals start outside solid scenery',()=>{const g=new Game();for(const c of g.creatures)assert.ok(canWalk(g.world,c.x,c.y,5,c),c.type);});
test('death returns player home and preserves earned discoveries',()=>{const g=battle();g.observed.add('barkjaw');g.player.hp=1;g.damagePlayer(100);assert.equal(g.player.x,HOME.x);assert.equal(g.player.y,HOME.y);assert.equal(g.player.hp,120);assert.ok(g.observed.has('barkjaw'));assert.ok(g.player.invulnerable>0);});
test('save round-trip preserves bindings, quests, restored crossings and defeated threats',()=>{const g=new Game();g.setBinding('e','fox');g.observed.add('barkjaw');g.quests.herd='complete';g.refreshHunts();g.quests.seam='offered';g.nearby=g.world.interactables.find(i=>i.kind==='crossing');g.interact();g.hurt(g.creatures.find(c=>c.quest==='herd'),999);g.player.tonics=7;const restored=new Game(g.snapshot());assert.deepEqual(restored.snapshot(),g.snapshot());assert.ok(restored.world.props.find(p=>p.blockage).removed);});
test('malformed saves cannot inject invalid positions, spells or quest states',()=>{const g=new Game({version:1,player:{x:Infinity,y:-100,hp:-1,level:999},bindings:{q:'bogus'},quests:{herd:'garbage'},observed:'not an array'});assert.equal(g.player.x,HOME.x);assert.equal(g.player.hp,1);assert.equal(g.player.level,50);assert.equal(g.bindings.q,'surge');assert.equal(g.quests.herd,'offered');assert.equal(g.observed.size,0);});
test('a paused game freezes cooldowns and combat',()=>{const g=battle();g.setBinding('q','bind');g.cast('q');const time=g.time,cd=g.cooldowns.bind;g.paused=true;advance(g,3);assert.equal(g.time,time);assert.equal(g.cooldowns.bind,cd);assert.equal(g.cast('f'),false);});
test('keyboard movement is normalized and updates facing',()=>{const g=battle(),x=g.player.x;g.update(.05,{right:true,up:true});assert.ok(Math.abs(Math.hypot(g.player.x-x,g.player.y-855)-4)<.01);assert.equal(g.player.direction,'up');});

test('joystick runs by default, scales speed, caps diagonals and preserves keyboard walking',()=>{
  const g=battle();g.creatures=[];const x=g.player.x,y=g.player.y;
  g.update(.05,{x:.5,y:0});assert.ok(Math.abs(g.player.x-x-2.8)<.01);
  const a={...g.player};g.update(.05,{x:1,y:1});assert.ok(Math.abs(Math.hypot(g.player.x-a.x,g.player.y-a.y)-5.6)<.01);
  const b={...g.player};g.update(.05,{left:true,x:1,y:1});assert.ok(Math.abs(g.player.x-b.x+4)<.01);assert.equal(g.player.y,b.y);
  const running={...g.player};g.update(.05,{left:true,run:true});assert.ok(Math.abs(g.player.x-running.x+5.6)<.01);
  g.update(.05);assert.equal(g.player.moving,false);assert.ok(g.player.y>y);
});

test('selecting another creature switches the next automatic shot to that target',()=>{
  const g=battle();g.autoAttack=true;g.chooseTarget(g.creatures[0].id);g.shoot(true);assert.equal(g.projectiles.at(-1).target,g.creatures[0].id);
  g.chooseTarget(g.creatures[1].id);g.boltCooldown=0;g.shoot(true);assert.equal(g.projectiles.at(-1).target,g.creatures[1].id);assert.equal(g.autoAttack,true);
});

test('click navigation walks around solid scenery and preserves automatic casting',()=>{
  const g=battle();g.creatures=[];g.autoAttack=true;g.world.props=[{x:1120,y:855,solid:14}];
  g.navigateTo(1160,855);assert.ok(g.route.length>1);assert.equal(g.autoAttack,true);
  for(let n=0;n<200;n++){g.update(.05);assert.ok(canWalk(g.world,g.player.x,g.player.y,9),'routing respects the scenery collision footprint');}
  assert.ok(Math.hypot(g.player.x-1160,g.player.y-855)<5);assert.equal(g.destination,null);
  g.autoAttack=false;g.navigateTo(1080,855);assert.equal(g.autoAttack,false);
});

test('blocked destinations do not start walking and keyboard input cancels a route',()=>{
  const g=battle();g.world.props=[{x:1120,y:855,solid:14}];g.navigateTo(1120,855);
  assert.equal(g.destination,null);assert.deepEqual(g.route,[]);
  g.navigateTo(1160,855);assert.ok(g.route.length);g.update(.05,{left:true});
  assert.equal(g.destination,null);assert.deepEqual(g.route,[]);
});
