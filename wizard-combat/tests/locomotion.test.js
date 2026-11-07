import test from 'node:test';
import assert from 'node:assert/strict';
import {Combat} from '../src/combat.js';
import {navigate} from '../src/physics.js';
import {terrain} from '../src/landscape.js';

test('walking accelerates briefly and releases with less than a third metre of drift',()=>{
  const g=new Combat(),p=g.player;g.enemies=[];
  g.move(1,0,1/60);assert.ok(p.vx>0&&p.vx<3);
  for(let i=0;i<20;i++)g.move(1,0,1/60);
  assert.ok(p.vx>7.4);const x=p.x;
  for(let i=0;i<12;i++)g.move(0,0,1/60);
  assert.equal(p.vx,0);assert.equal(p.vz,0);assert.equal(p.moving,false);
  assert.ok(p.x-x<.3);
});

test('stride follows actual displacement, and diagonal movement has no speed bonus',()=>{
  const run=(x,z,hz)=>{const g=new Combat(),p=g.player;g.enemies=[];let distance=0;
    for(let i=0;i<hz*.4;i++){const ox=p.x,oz=p.z;g.move(x,z,1/hz);distance+=Math.hypot(p.x-ox,p.z-oz);}
    assert.ok(Math.abs(p.stride-distance*Math.PI*2/3.4)<1e-6);return distance;
  };
  assert.ok(Math.abs(run(1,0,60)-run(1,1,60))<.001);
  assert.ok(Math.abs(run(1,0,30)-run(1,0,120))<.001);
});

test('creature navigation accelerates and brakes at its goal without overshooting',()=>{
  const e={type:'seedling',x:0,z:8,y:terrain(0,8)},goal={x:6,z:8};
  navigate(e,goal,4/30,.25,1/30);assert.ok(e.x>0&&e.x<4/30);
  for(let i=0;i<100;i++)navigate(e,goal,4/30,.25,1/30);
  assert.ok(Math.hypot(e.x-goal.x,e.z-goal.z)<.06);
  assert.ok(e.x<=goal.x+.001);assert.ok(e.walkDistance>5.9);
});
