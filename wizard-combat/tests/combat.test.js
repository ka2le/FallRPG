import test from 'node:test';
import assert from 'node:assert/strict';
import {Combat} from '../src/combat.js';
import {SPELLS,SPECIES,COVER,ACTIONS,CAMPS,SHIELD,terrain} from '../src/data.js';
import {blocked,clearBody,sphereHit,shieldHit} from '../src/physics.js';
function unlocked(){const g=new Combat();g.known=new Set(Object.keys(ACTIONS));return g;}
function arena(type='spitter',distance=15){const g=unlocked();g.enemies=[];Object.assign(g.player,{x:100,z:100,y:terrain(100,100)+1.7,grounded:true});const e=g.spawn(type,100,100-distance);e.freeze=100;aim(g,e);return{g,e};}
function aim(g,e){const p=g.player;p.yaw=Math.atan2(-(e.x-p.x),-(e.z-p.z));p.pitch=Math.atan2(e.y-p.y,Math.hypot(e.x-p.x,e.z-p.z));}
function advance(g,time,step=1/120){for(let t=0;t<time-1e-8;t+=step)g.update(Math.min(step,time-t));}
function position(g,x,z){Object.assign(g.player,{x,z,y:terrain(x,z)+1.7,vy:0,grounded:true,yaw:0,pitch:0});}

test('fixed kit exposes attack, bind, shield, Q/E/R/F abilities',()=>{assert.deepEqual(Object.keys(ACTIONS).sort(),['attack','bind','blink','companion','drain','frostburst','haste','recall','renew','shield','shockwave']);const {g}=arena();assert.equal(typeof g.bind,'undefined');assert.equal(typeof g.select,'undefined');});
test('attack stays free; E launches a paid area spell without changing left click',()=>{const {g}=arena();g.use('frostburst');assert.equal(g.projectiles[0].spell,ACTIONS.frostburst);assert.equal(g.player.mana,72);assert.equal(g.attackMode,0);assert.equal(g.use('frostburst'),false);g.player.mana=0;assert.ok(g.use('attack'));assert.equal(g.projectiles.at(-1).spell,0);assert.equal(g.player.mana,0);});
test('regular bolts travel in the aimed direction without seeking a moving target',()=>{const {g,e}=arena();g.use('attack');const b=g.projectiles[0],velocity=[b.vx,b.vy,b.vz];e.x+=5;advance(g,.1);assert.deepEqual([b.vx,b.vy,b.vz],velocity);advance(g,.3);assert.equal(e.hp,SPECIES.spitter.hp);});
test('near misses are not converted into aimed hits',()=>{const {g,e}=arena('spitter',25);g.player.yaw+=.075;assert.equal(g.target(),null);g.use('attack');advance(g,.5);assert.equal(e.hp,SPECIES.spitter.hp);});
test('well-aimed attacks hit only after projectile travel',()=>{const {g,e}=arena();g.use('attack');assert.equal(e.hp,SPECIES.spitter.hp);advance(g,.08);assert.equal(e.hp,SPECIES.spitter.hp);advance(g,.2);assert.ok(e.hp<SPECIES.spitter.hp);});
test('Bind has zero damage and a six-second effect; heavies still get a useful hold',()=>{for(const type of ['spitter','titan','wisp']){const {g,e}=arena(type);g.use('bind');advance(g,.4);assert.equal(e.hp,SPECIES[type].hp);assert.ok(e.root>(type==='titan'?3:5.5));assert.equal(g.player.mana,82);}});
test('bound ranged enemies stay in place but can still shoot',()=>{const {g,e}=arena('spitter',18);e.freeze=0;e.root=4;e.aggro=true;e.coverTimer=10;e.aiState='strafe';const x=e.x,z=e.z;advance(g,2);assert.equal(e.x,x);assert.equal(e.z,z);assert.ok(g.events.some(v=>v.type==='shot'));});
test('shockwave reaches all directions, displaces and interrupts, and causes no damage',()=>{const g=unlocked();g.enemies=[];position(g,100,100);for(const [x,z] of [[104,100],[96,100],[100,104],[100,96]]){const e=g.spawn('spitter',x,z);e.windup=1;}const before=g.enemies.map(e=>e.hp);g.use('shockwave');assert.deepEqual(g.enemies.map(e=>e.hp),before);for(const e of g.enemies){assert.ok(Math.hypot(e.x-100,e.z-100)>8);assert.equal(e.windup,0);assert.ok(e.freeze>2);}});
test('shockwave does not reach through a wall',()=>{const g=unlocked();g.enemies=[];const r=COVER[2];position(g,r.x,r.z+5);const e=g.spawn('spitter',r.x,r.z-5);g.use('shockwave');assert.equal(e.freeze,0);});
test('shield absorbs frontal shots without reflecting damage; rear shots still hurt',()=>{for(const front of [true,false]){const {g,e}=arena();g.player.yaw=0;g.player.pitch=0;g.use('shield');const p=g.player;g.projectiles=[{id:1000,team:'enemy',x:p.x,y:p.y-.5,z:p.z+(front?-4:1),vx:0,vy:0,vz:front?30:-30,remaining:30,life:2,age:0,damage:20,radius:.15,color:'#fff',owner:e.id}];advance(g,.15);assert.equal(p.hp,front?100:80);assert.equal(g.projectiles.length,0);assert.equal(e.hp,SPECIES.spitter.hp);if(front)assert.equal(p.wardHits,SHIELD.charges-1);}});
test('beam must hit before it latches or heals',()=>{const {g}=arena();g.player.hp=40;g.player.yaw+=.2;g.use('drain');advance(g,.2);assert.equal(g.beam.target,null);assert.equal(g.player.hp,40);});
test('beam latches after a direct hit, follows its target, and heals actual damage',()=>{const {g,e}=arena('colossus');g.player.hp=40;g.use('drain');advance(g,.2);assert.equal(g.beam.target,e.id);const hp=g.player.hp,enemyHp=e.hp;g.player.yaw+=.8;e.x+=2;advance(g,.2);assert.equal(g.beam.target,e.id);assert.ok(e.hp<enemyHp);assert.ok(g.player.hp>hp);assert.ok(Math.abs(g.player.hp-40-(SPECIES.colossus.hp-e.hp)*.65)<.001);});
test('cover immediately breaks a latched beam without further damage or healing',()=>{const {g,e}=arena();g.player.hp=40;g.use('drain');advance(g,.1);assert.equal(g.beam.target,e.id);const r=COVER[2];Object.assign(g.player,{x:r.x,z:r.z+6,y:r.base+1.7,grounded:false});Object.assign(e,{x:r.x,z:r.z-6,y:r.base+1.7});const hp=g.player.hp,enemyHp=e.hp;g.updateBeam(.01);assert.equal(g.beam.time,0);assert.equal(g.player.hp,hp);assert.equal(e.hp,enemyHp);});
test('beam breaks on range and stops at the end of its channel',()=>{const a=arena('colossus');a.g.use('drain');advance(a.g,.1);a.e.z-=50;a.g.updateBeam(.01);assert.equal(a.g.beam.time,0);const b=arena('colossus');b.g.use('drain');advance(b.g,3.8);assert.ok(b.g.beam.time<=0);});
test('beam healing is capped by the victim remaining health',()=>{const {g,e}=arena();g.player.hp=40;e.hp=.2;g.use('drain');g.updateBeam(.05);assert.ok(g.player.hp<=40.131);assert.equal(e.hp,0);});
test('beam prevents simultaneous regular fire but permits a shield',()=>{const {g}=arena();g.use('drain');assert.equal(g.use('attack'),false);assert.equal(g.use('bind'),false);assert.ok(g.use('shield'));assert.ok(g.beam.time>0);});
test('Q interrupts the channel and pressing R again cancels it',()=>{const a=arena();a.g.use('drain');a.g.use('shockwave');assert.equal(a.g.beam.time,0);const b=arena();b.g.use('drain');b.g.use('drain');assert.equal(b.g.beam.time,0);});
test('jump launches, cannot double-jump, and returns to the ground',()=>{const {g}=arena();const y=g.player.y;assert.ok(g.jump());assert.equal(g.jump(),false);advance(g,.3);assert.ok(g.player.y>y+1.4);advance(g,1);assert.ok(g.player.grounded);assert.ok(Math.abs(g.player.y-y)<.001);});
test('a low ledge blocks walking but can be jumped onto and stood on',()=>{const g=unlocked();g.enemies=[];const r=COVER[0];position(g,r.x,r.z+3);for(let i=0;i<40;i++){g.move(0,-1,1/120);g.update(1/120);}assert.ok(g.player.z>=r.z+r.d/2+.4);position(g,r.x,r.z+3);g.jump();for(let i=0;i<42;i++){g.move(0,-1,1/120);g.update(1/120);}advance(g,.7);assert.ok(g.player.grounded);assert.ok(Math.abs(g.player.y-1.7-r.top)<.02);});
test('walking off a platform falls instead of snapping to ground',()=>{const g=unlocked();g.enemies=[];const r=COVER[0];Object.assign(g.player,{x:r.x,z:r.z,y:r.top+1.7,grounded:true,vy:0,yaw:0});let fell=false;for(let i=0;i<35;i++){g.move(1,0,1/60);g.update(1/60);if(!g.player.grounded)fell=true;}assert.ok(fell);advance(g,.7);assert.ok(g.player.grounded);});
test('blink is short and cannot pass through a wall',()=>{const g=unlocked();g.enemies=[];const r=COVER[2];position(g,r.x,r.z+r.d/2+2);const start=g.player.z;g.use('blink',{x:0,z:-1});assert.ok(start-g.player.z<2);assert.ok(clearBody(g.player.x,g.player.z,g.player.y-1.7,.42));});
test('exactly one monster type is melee and it is faster than sprinting',()=>{const melee=Object.entries(SPECIES).filter(([,s])=>!s.ranged);assert.equal(melee.length,1);assert.equal(melee[0][0],'prowler');assert.ok(melee[0][1].speed>10.4);});
test('ranged enemies seek real cover, hide, peek, burst fire and retreat',()=>{const g=unlocked();g.travel(2);g.player.invuln=999;g.enemies=g.enemies.filter(e=>e.camp===2).slice(0,1);const e=g.enemies[0],states=new Set();let hidden=false,shots=0;for(let t=0;t<15;t+=1/30){g.update(1/30);states.add(e.aiState);if(e.aiState==='hide'&&blocked(g.player,e))hidden=true;shots+=g.events.filter(v=>v.type==='shot').length;g.events=[];}for(const state of ['seek','hide','peek','retreat'])assert.ok(states.has(state),state);assert.ok(hidden);assert.ok(shots>=3);});
test('every ranged archetype can fire a physical straight projectile',()=>{for(const [type,s] of Object.entries(SPECIES)){if(!s.ranged)continue;const {g,e}=arena(type);g.shoot(e);const b=g.projectiles[0],v=[b.vx,b.vy,b.vz];g.player.x+=3;advance(g,.1);assert.deepEqual([b.vx,b.vy,b.vz],v);}});
test('solid cover blocks projectile damage',()=>{const g=unlocked();g.enemies=[];const r=COVER[2];Object.assign(g.player,{x:r.x,z:r.z+7,y:r.base+1.7,grounded:false});const e=g.spawn('spitter',r.x,r.z-7);e.y=r.base+1.7;e.freeze=100;aim(g,e);g.use('attack');advance(g,.3);assert.equal(e.hp,SPECIES.spitter.hp);assert.equal(g.projectiles.length,0);});
test('death restores in place and clears beam and hostile shots',()=>{const {g}=arena();g.use('drain');g.hurtPlayer(200);assert.equal(g.player.hp,100);assert.equal(g.player.x,100);assert.equal(g.deaths,1);assert.equal(g.beam.time,0);g.hurtPlayer(200);assert.equal(g.deaths,1);});
test('swept collision catches a fast shot crossing a body',()=>{assert.equal(sphereHit({x:0,y:1,z:0},{x:0,y:1,z:-10},{x:0,y:1,z:-5},1),.4);});

test('blink covers its full distance across open sloped ground',()=>{const {g}=arena();const z=g.player.z;g.use('blink',{x:0,z:-1});assert.ok(Math.abs(z-g.player.z-7.5)<.01);});

test('ordinary enemies take 2-4 direct fire hits; solo heavies take more',()=>{
  for(const type of Object.keys(SPECIES)){const {g,e}=arena(type);let shots=0;while(e.hp>0&&shots<30){g.applySpell(e,0);shots++;}
    if(['titan','colossus'].includes(type))assert.ok(shots>=8);else assert.ok(shots>=2&&shots<=4,`${type}: ${shots}`);
  }
});
test('group encounters and two solo heavies spawn clear of solid cover and each other',()=>{
  const g=unlocked();assert.ok(CAMPS.filter(c=>c.types.length>=3).length>=12);
  assert.deepEqual(CAMPS.filter(c=>c.types.length===1).flatMap(c=>c.types),['titan','colossus']);
  for(const e of g.enemies){const s=SPECIES[e.type];assert.ok(clearBody(e.x,e.z,terrain(e.x,e.z),s.size*.23,Math.max(1.7,s.size)),e.type);
    for(const other of g.enemies)if(e!==other)assert.ok(Math.hypot(e.x-other.x,e.z-other.z)>(s.size+SPECIES[other.type].size)*.3);
  }
});
test('frost orb explodes on a hit, damages a cluster with falloff and slows survivors',()=>{
  const {g,e}=arena();const near=g.spawn('spitter',e.x+3,e.z),far=g.spawn('spitter',e.x+13,e.z);near.freeze=far.freeze=100;
  g.use('frostburst');advance(g,.6);assert.ok(e.hp<SPECIES.spitter.hp);assert.ok(near.hp<SPECIES.spitter.hp);assert.ok(near.hp>e.hp);assert.equal(far.hp,SPECIES.spitter.hp);assert.ok(near.slow>2);assert.ok(g.events.some(v=>v.type==='explosion'));assert.equal(g.projectiles.length,0);
});
test('frost splash cannot damage or slow enemies through solid cover',()=>{
  const g=unlocked();g.enemies=[];const r=COVER[2],e=g.spawn('spitter',r.x,r.z-4.5);e.y=r.base+1;
  g.explode({spell:5,x:r.x,y:r.base+1,z:r.z+1});assert.equal(e.hp,SPECIES.spitter.hp);assert.equal(e.slow,0);
});
test('shield intercepts ahead of the body, consumes exactly six shots, then breaks',()=>{
  const {g,e}=arena();const p=g.player;p.pitch=p.yaw=0;g.use('shield');
  for(let i=0;i<7;i++){g.projectiles.push({id:1000+i,team:'enemy',x:p.x,y:p.y-.3,z:p.z-4,vx:0,vy:0,vz:30,remaining:30,life:2,age:0,damage:10,radius:.15,color:'#fff',owner:e.id});g.updateProjectiles(.15);}
  const blocks=g.events.filter(v=>v.type==='block');assert.equal(blocks.length,6);assert.ok(blocks.every(v=>Math.abs(v.at.z-(p.z-SHIELD.distance))<.001));assert.equal(blocks.at(-1).broken,true);assert.equal(p.ward,0);assert.equal(p.hp,90);
});
test('shield has finite edges, rejects rear travel, and follows aim pitch',()=>{
  const p={x:0,y:10,z:0,yaw:0,pitch:0};assert.equal(shieldHit({x:3,y:10,z:-4},{x:3,y:10,z:0},p),null);assert.equal(shieldHit({x:0,y:10,z:0},{x:0,y:10,z:-4},p),null);
  p.pitch=Math.PI/4;const c=Math.SQRT1_2;assert.notEqual(shieldHit({x:0,y:10+4*c,z:-4*c},{x:0,y:10,z:0},p),null);
});
test('a wall before the shield consumes a shot without spending shield charge',()=>{
  const {g,e}=arena();const r=COVER[2],p=g.player;Object.assign(p,{x:r.x,z:r.z+5.7,y:r.base+1.7,yaw:0,pitch:0});g.use('shield');
  g.projectiles=[{id:1000,team:'enemy',x:r.x,y:p.y-.3,z:r.z-5,vx:0,vy:0,vz:50,remaining:30,life:2,age:0,damage:20,radius:.15,color:'#fff',owner:e.id}];g.updateProjectiles(.3);assert.equal(p.wardHits,SHIELD.charges);assert.equal(p.hp,100);assert.equal(g.projectiles.length,0);
});
