import test from 'node:test';
import assert from 'node:assert/strict';
import {Combat} from '../src/combat.js';
import {TestingMode} from '../src/testing-mode.js';
import {terrain,terrainNormal,biomeAt,POOLS,WORLD_HALF} from '../src/landscape.js';
import {CAMPS,COVER} from '../src/data.js';
import {floorAt,terrainHit} from '../src/physics.js';

test('collision heights follow the exact two triangles rendered in each ground cell',()=>{
  for(const [x,z] of [[-296,284],[204,-234],[306,300]]){
    const a=terrain(x,z),b=terrain(x+2,z),c=terrain(x,z+2),d=terrain(x+2,z+2);
    assert.ok(Math.abs(terrain(x+.5,z+.5)-(a*.5+b*.25+c*.25))<1e-5);
    assert.ok(Math.abs(terrain(x+1.5,z+1.5)-(d*.5+b*.25+c*.25))<1e-5);
  }
});

test('landscape has distinct mountain, wetland and volcanic elevations and materials',()=>{
  assert.ok(terrain(-295,285)-terrain(0,0)>90);
  assert.ok(biomeAt(-295,285).snow>.8);
  assert.ok(biomeAt(310,305).ash>.8);
  assert.ok(biomeAt(205,-235).wet>.9);
  for(let x=-400;x<=400;x+=20)for(let z=-400;z<=400;z+=20){
    const b=biomeAt(x,z),n=terrainNormal(x,z);
    assert.ok(Number.isFinite(terrain(x,z)));
    assert.ok(Math.abs(b.weights.reduce((a,v)=>a+v,0)-1)<1e-6);
    assert.ok(b.weights.every(w=>w>=0&&Number.isFinite(w)));
    assert.ok(Math.abs(Math.hypot(n.x,n.y,n.z)-1)<1e-6);
  }
});
test('encounter clearings preserve a level combat space and pools stay shallow',()=>{
  for(const c of CAMPS){const h=terrain(c.x,c.z);for(const [dx,dz] of [[6,0],[-6,0],[0,6],[0,-6]])assert.ok(Math.abs(terrain(c.x+dx,c.z+dz)-h)<1,`${c.name} combat clearing`);}
  for(const p of POOLS)assert.ok(p.y-terrain(p.x,p.z)>0&&p.y-terrain(p.x,p.z)<.7);
  assert.notEqual(terrainHit({x:-295,z:285,y:terrain(-295,285)+2},{x:-295,z:285,y:terrain(-295,285)-2}),null);
});
test('testing mode is opt-in and sprint is substantially faster',()=>{
  const g=new Combat(),t=new TestingMode(g),start={...g.player};
  assert.equal(t.move(1,0,1,true),false);assert.equal(g.player.x,start.x);
  t.setEnabled(true);for(let i=0;i<10;i++){t.move(1,0,.01,true);g.vertical(.01);}
  assert.ok(g.player.x-start.x>7.5);
  assert.equal(g.save().testing,undefined);
});
test('flight resists gravity, ascends/descends, and accelerates with normalized diagonals',()=>{
  const g=new Combat(),t=new TestingMode(g);t.setEnabled(true);assert.ok(t.toggleFlight());
  const y=g.player.y;t.move(0,0,1,false,1);assert.equal(g.player.y,y+32);g.vertical(1);assert.equal(g.player.y,y+32);
  t.move(0,0,.5,false,-1);assert.ok(Math.abs(g.player.y-y-16)<1e-9);
  const x=g.player.x,z=g.player.z;t.move(1,1,.1,true);assert.ok(Math.abs(Math.hypot(g.player.x-x,g.player.z-z)-14)<1e-6);
  t.move(0,0,100,false,-1);assert.equal(g.player.y,terrain(g.player.x,g.player.z)+1.7);
  t.move(1,0,100,true);assert.ok(g.player.x<=WORLD_HALF-12);
});
test('disabling flight lands on cover safely and restores gravity and ordinary controls',()=>{
  const g=new Combat(),t=new TestingMode(g);t.setEnabled(true);t.toggleFlight();const r=COVER[0];
  Object.assign(g.player,{x:r.x,z:r.z,y:r.top+40});t.setEnabled(false);
  assert.equal(t.flying,false);assert.equal(g.player.y,floorAt(r.x,r.z)+1.7);assert.ok(g.player.grounded);
  assert.equal(t.move(1,0,1),false);assert.equal(t.toggleFlight(),false);
  assert.ok(g.jump());g.vertical(.1);assert.ok(g.player.y>r.top+1.7);
});
