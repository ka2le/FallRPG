import test from 'node:test';
import assert from 'node:assert/strict';
import {Combat} from '../src/combat.js';
import {HABITATS,HOLLOW,THAWLINE} from '../src/habitats.js';
import {terrain,environmentAt,acceptsHabitat,seasonWeights} from '../src/landscape.js';
import {SCENERY,SPECIES} from '../src/data.js';
import {clearBody,coverHit,moveBody,floorAt,enemyHit} from '../src/physics.js';
import {updateEcology,updateEcologicalCreature,grazerProtected,strikeEcology} from '../src/ecology.js';
import {createCreature3D} from '../src/monsters/ecological-3d.js';
import {QUESTS} from '../src/journey.js';

test('the permanent thermal seam supports both dietary inputs and rejects invalid habitats',()=>{
  assert.ok(environmentAt(THAWLINE.cold.x,THAWLINE.cold.z).snowDepth>.7);
  assert.equal(environmentAt(THAWLINE.warm.x,THAWLINE.warm.z).snowDepth,0);
  for(const type of ['ventback','scavenger'])assert.ok(acceptsHabitat(type,THAWLINE.nest.x,THAWLINE.nest.z));
  assert.equal(acceptsHabitat('snowkeel',THAWLINE.warm.x,THAWLINE.warm.z),false);
  for(const type of ['snowkeel','ventback','scavenger'])assert.equal(acceptsHabitat(type,100,100),false);
  const before=seasonWeights(250,323);new Combat();assert.deepEqual(seasonWeights(250,323),before);
});

test('ecological additions coexist with all ten original species and spawn clear',()=>{
  const g=new Combat();
  for(const type of ['seedling','prowler','spitter','swarm','wisp','ash','healer','ice','titan','colossus'])assert.ok(g.enemies.some(e=>e.type===type));
  for(const type of Object.keys(SPECIES).filter(t=>SPECIES[t].model3d)){
    const residents=g.enemies.filter(e=>e.type===type);assert.ok(residents.length,type);
    for(const e of residents)assert.ok(clearBody(e.x,e.z,terrain(e.x,e.z),SPECIES[type].size*.23,SPECIES[type].size),type);
  }
});

test('Hollow Elder render pieces are convex solids and leave both axial and side exits open',()=>{
  const h=HOLLOW,y=terrain(h.x,h.z);
  for(const part of SCENERY.ecology.filter(r=>r.kind==='elder-shell'))for(const p of part.points)assert.ok(part.planes.every(n=>n.x*p.x+n.y*p.y+n.z*p.z<=n.k+1e-5));
  assert.equal(coverHit({x:h.x,y:y+1.5,z:h.z+24},{x:h.x,y:y+1.5,z:h.z-24}),null);
  assert.equal(coverHit({x:h.x-12,y:y+1.5,z:h.z},{x:h.x+12,y:y+1.5,z:h.z}),null);
  assert.notEqual(coverHit({x:h.x,y:y+2,z:h.z+14},{x:h.x+12,y:y+2,z:h.z+14}),null);
  const body={x:h.x,z:h.z+24};for(let i=0;i<240;i++)moveBody(body,0,-.2,.42,y,1.7,.28);
  assert.ok(body.z<h.z-23,'walk all the way through the hollow shell');
});

test('tree pressure warns before damaging player and existing wildlife, then recovers',()=>{
  const g=new Combat(),h=g.ecology.hazards.find(h=>h.kind==='elder');g.ecology.hazards=[h];g.enemies=[];
  Object.assign(g.player,{x:h.x,z:h.z,y:terrain(h.x,h.z)+1.7});const e=g.spawn('seedling',h.x+1,h.z);e.hp=10;
  updateEcology(g,.1);assert.equal(h.state,'warning');assert.equal(g.player.hp,100);assert.equal(e.hp,10);
  for(let i=0;i<50;i++)updateEcology(g,1/30);
  assert.equal(e.hp,0);assert.equal(g.kills,0);assert.equal(g.xp,0);assert.ok(g.player.hp<100);
  for(let i=0;i<20;i++)updateEcology(g,1/30);assert.equal(h.state,'recover');const hp=g.player.hp;
  for(let i=0;i<100;i++)updateEcology(g,1/30);assert.equal(g.player.hp,hp);
});

test('Shockwave interrupts awakened roots and permits an escape window',()=>{
  const g=new Combat(),h=g.ecology.hazards.find(h=>h.kind==='elder');g.ecology.hazards=[h];g.enemies=[];
  Object.assign(g.player,{x:h.x,z:h.z,y:terrain(h.x,h.z)+1.7});updateEcology(g,.1);g.known.add('shockwave');g.use('shockwave');
  assert.equal(h.state,'recover');assert.ok(h.timer>=9);updateEcology(g,1);assert.equal(g.player.hp,100);
});

test('lookout partners deter Rootknives while isolated feeders attract them',()=>{
  const g=new Combat(),pair=g.enemies.filter(e=>e.type==='barkjaw'&&e.eco==='pasture').slice(0,2),hunter=g.enemies.find(e=>e.type==='rootknife'&&e.eco==='pasture');
  g.enemies=[...pair,hunter];g.player.x=0;g.player.z=0;pair[0].routine='feed';pair[1].routine='lookout';
  assert.ok(grazerProtected(g,pair[0]));updateEcologicalCreature(g,hunter,.1);assert.equal(hunter.routine,'ambush');
  pair[1].hp=0;assert.equal(grazerProtected(g,pair[0]),false);updateEcologicalCreature(g,hunter,.1);assert.equal(hunter.routine,'stalk');
});

test('paired grazers alternate roles and remain peaceful near the player',()=>{
  const g=new Combat(),pair=g.enemies.filter(e=>e.type==='barkjaw'&&e.eco==='pasture').slice(0,2);
  Object.assign(g.player,{x:-65,z:-34,y:terrain(-65,-34)+1.7});
  Object.assign(pair[0],{x:-75,z:-35.6});Object.assign(pair[1],{x:-71.2,z:-35.6});
  for(const e of pair)updateEcologicalCreature(g,e,.1);assert.equal(pair[0].routine,'feed');assert.equal(pair[1].routine,'lookout');assert.ok(pair.every(e=>!e.aggro));
  g.ecology.clock=10;for(const e of pair)updateEcologicalCreature(g,e,.1);assert.equal(pair[0].routine,'lookout');assert.equal(pair[1].routine,'feed');
});

test('Boundary Scavenger actually reaches and consumes both seasonal foods',()=>{
  const g=new Combat(),e=g.enemies.find(e=>e.type==='scavenger'),visited=new Set();
  for(let i=0;i<1200;i++){g.time+=.1;updateEcologicalCreature(g,e,.1);if(e.meal>1)visited.add(e.routine);}
  assert.ok(visited.has('warm meal'));assert.ok(visited.has('cold meal'));assert.ok(e.reserveCold>0&&e.reserveWarm>0);
});

test('a provoked Snowkeel cannot chase a player across exposed basalt',()=>{
  const g=new Combat(),e=g.enemies.find(e=>e.type==='snowkeel');Object.assign(g.player,{x:295,z:319,y:terrain(295,319)+1.7});
  for(let i=0;i<600;i++){g.time+=1/30;e.lastDamage=g.time;updateEcologicalCreature(g,e,1/30);assert.ok(acceptsHabitat('snowkeel',e.x,e.z));}
});

test('habitat discoveries and nonviolent quest rewards survive saves, including older saves',()=>{
  const g=new Combat();for(const h of HABITATS){Object.assign(g.player,{x:h.x,z:h.z});g.explore();}
  assert.equal(g.questProgress(QUESTS.find(q=>q.id==='living-world')),6);assert.ok(g.claimQuest('living-world'));assert.equal(g.kills,0);
  const copy=new Combat();assert.ok(copy.restore(JSON.parse(JSON.stringify(g.save()))));assert.deepEqual([...copy.habitats],[...g.habitats]);assert.equal(copy.claimQuest('living-world'),false);
  assert.ok(copy.restore({version:2}));assert.equal(copy.habitats.size,0);
});

test('new articulated 3D creatures animate with finite transforms in gameplay states',()=>{
  const g=new Combat();for(const e of g.enemies.filter(e=>e.eco)){
    const model=createCreature3D(e.type);for(const state of [{},{routine:'feed'},{windup:.5},{freeze:2},{hp:0}]){
      model.update({...e,...state},1/60);model.root.updateMatrixWorld(true);model.root.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite),e.type));
    }
  }
});

test('wounding defensive trees produces distinct timed sap and insect responses',()=>{
  const g=new Combat();g.enemies=[];
  for(const kind of ['sourheart','hollowhost']){
    const t=g.ecology.trees.find(t=>t.kind===kind);Object.assign(g.player,{x:t.x+2,z:t.z,y:terrain(t.x,t.z)+1.7,hp:100});
    strikeEcology(g,{x:t.x,z:t.z,y:terrain(t.x,t.z)+2},0);assert.equal(t.defense,10);assert.ok(g.events.some(e=>e.type==='ecology-cue'));
    updateEcology(g,1.1);assert.ok(g.player.hp<100);
    g.player.x=t.x+12;const hp=g.player.hp;updateEcology(g,1.1);assert.equal(g.player.hp,hp,'withdrawing avoids the defense');
  }
});

test('inside-shell saves resolve to the chamber floor instead of the roof',()=>{
  const g=new Combat();Object.assign(g.player,{x:HOLLOW.x,z:HOLLOW.z+10,y:terrain(HOLLOW.x,HOLLOW.z+10)+1.7});
  const copy=new Combat();copy.restore(JSON.parse(JSON.stringify(g.save())));const p=copy.player;
  assert.ok(floorAt(p.x,p.z)>p.y+3,'there is a real roof overhead');
  assert.ok(Math.abs(floorAt(p.x,p.z,p.y-1.4)+1.7-p.y)<1e-6);
});

test('volumetric hit regions follow both the body and its orientation',()=>{
  const e={type:'rootknife',x:0,z:0,y:.95,heading:0};
  assert.notEqual(enemyHit({x:-3,y:.57,z:1.25},{x:3,y:.57,z:1.25},e),null,'extended head is targetable');
  assert.equal(enemyHit({x:-3,y:3,z:0},{x:3,y:3,z:0},e),null,'empty air above a low hunter is not targetable');
  e.heading=Math.PI/2;assert.notEqual(enemyHit({x:1.25,y:.57,z:-3},{x:1.25,y:.57,z:3},e),null,'head hit region turns with model');
});


test('ecological melee warns, locks its facing and can be sidestepped',()=>{
  const g=new Combat(),e=g.enemies.find(e=>e.type==='rootknife'&&e.eco==='elder');
  g.enemies=[e];Object.assign(e,{x:HOLLOW.x,z:HOLLOW.z+17,heading:0,attackTimer:0});
  Object.assign(g.player,{x:e.x,z:e.z+2,y:terrain(e.x,e.z)+1.7});
  updateEcologicalCreature(g,e,1/30);assert.equal(e.routine,'warn');assert.equal(e.windup,0);
  for(let i=0;i<35;i++)updateEcologicalCreature(g,e,1/30);
  assert.ok(e.windup>0);const direction=e.heading,hp=g.player.hp;
  g.player.x=e.x+2;g.player.z=e.z;
  for(let i=0;i<25;i++)updateEcologicalCreature(g,e,1/30);
  assert.equal(g.player.hp,hp,'sidestepping a committed strike avoids damage');
  assert.ok(e.attackTimer>1,'a missed attack still spends its recovery');
  assert.ok(Math.abs(direction)<.1);
});

test('death clears pressure and allows escape in place without immediate re-engagement',()=>{
  const g=new Combat(),h=g.ecology.hazards.find(h=>h.kind==='elder');
  Object.assign(g.player,{x:h.x,z:h.z,y:terrain(h.x,h.z)+1.7,hp:1});
  const e=g.enemies.find(e=>e.type==='rootknife'&&e.eco==='elder');
  Object.assign(e,{x:h.x+1,z:h.z,aggro:true,windup:.1,huntWindup:.2});
  h.state='warning';h.timer=.01;
  g.hurtPlayer(20);assert.equal(g.deaths,1);assert.equal(g.player.hp,g.player.maxHp);
  assert.equal(h.state,'recover');assert.ok(h.timer>=9);assert.equal(e.windup,0);
  for(let i=0;i<100;i++)g.update(.033);
  assert.equal(g.deaths,1);assert.equal(g.player.hp,g.player.maxHp);assert.equal(e.aggro,false);
  assert.equal(g.player.slow,0);assert.ok(g.player.recovery>2);
});

test('peaceful residents do not join unrelated combat',()=>{
  const g=new Combat(),grazer=g.enemies.find(e=>e.type==='barkjaw');
  g.enemies=[grazer];const enemy=g.spawn('seedling',grazer.x+2,grazer.z);
  g.hurtEnemy(enemy,1);assert.equal(grazer.aggro,false);
  g.hurtEnemy(grazer,1);assert.equal(grazer.aggro,true,'direct harm still provokes defense');
});

test('Barkjaws approach food before feeding and flee after a successful ambush',()=>{
  const g=new Combat(),prey=g.enemies.find(e=>e.type==='barkjaw'),hunter=g.enemies.find(e=>e.type==='rootknife'&&e.eco==='pasture');
  g.enemies=[prey,hunter];Object.assign(g.player,{x:0,z:0});
  Object.assign(prey,{x:-75,z:-30});updateEcologicalCreature(g,prey,.1);assert.equal(prey.routine,'graze');
  Object.assign(prey,{x:-75,z:-35.6});updateEcologicalCreature(g,prey,.1);assert.equal(prey.routine,'feed');
  Object.assign(hunter,{x:prey.x+2,z:prey.z,preyId:prey.id,huntWindup:.05});
  const hp=prey.hp;updateEcologicalCreature(g,hunter,.1);
  assert.ok(prey.hp<hp);assert.ok(prey.panic>0);assert.ok(hunter.meal>=9);assert.equal(g.kills,0);
  updateEcologicalCreature(g,prey,.1);assert.equal(prey.routine,'flee');
});

test('roots ignore overhead travelers and interruptions above the hollow roof',()=>{
  const g=new Combat(),h=g.ecology.hazards.find(h=>h.kind==='elder');g.enemies=[];g.ecology.hazards=[h];
  Object.assign(g.player,{x:h.x,z:h.z,y:terrain(h.x,h.z)+13});
  updateEcology(g,.1);assert.equal(h.state,'rest');h.state='warning';h.timer=1;
  strikeEcology(g,g.player,1);assert.equal(h.state,'warning');
});

test('creature LOD batches distant detail and death animation completes',()=>{
  const g=new Combat();
  for(const type of Object.keys(SPECIES).filter(t=>SPECIES[t].model3d)){
    const e=g.enemies.find(e=>e.type===type),model=createCreature3D(type);
    const draws=()=>{let n=0;model.root.traverseVisible(o=>{if(o.isMesh)n++;});return n;};
    model.update(e,1/60,10);assert.ok(draws()<=24,`${type} near draw budget: ${draws()}`);
    model.update(e,1/60,80);assert.equal(draws(),1);
    model.update(e,1/60,10);assert.ok(draws()>1);
    const dead={...e,hp:0};model.update(dead,.1,10);assert.equal(model.root.visible,true);
    for(let i=0;i<14;i++)model.update(dead,.1,10);assert.equal(model.root.visible,false);
    model.update(e,1/60,10);assert.equal(model.root.visible,true);assert.equal(model.root.scale.x,SPECIES[type].size);
  }
});


test('Claspwood roots reach around their solid trunk and punish remaining in the warning',()=>{
  const g=new Combat(),h=g.ecology.hazards.find(h=>h.kind==='claspwood');g.enemies=[];g.ecology.hazards=[h];
  Object.assign(g.player,{x:h.x+3,z:h.z,y:terrain(h.x+3,h.z)+1.7});
  updateEcology(g,.1);assert.equal(h.state,'warning');
  for(let i=0;i<48;i++)updateEcology(g,1/30);
  assert.equal(g.player.hp,88);assert.equal(h.hits,1);
});
