import test from 'node:test';
import assert from 'node:assert/strict';
import {COVER,SCENERY,WILDS,CAMPS,terrain,SPECIES} from '../src/data.js';
import {solidSpan,hullGeometry,makeHull,hullHit} from '../src/cover-shapes.js';
import {nearbyCover,coverHit,clearBody,floorAt} from '../src/physics.js';
import {Combat} from '../src/combat.js';

test('rock render vertices lie on the same convex solid used for collision',()=>{
  for(let variant=0;variant<4;variant++){
    const r=makeHull({x:0,z:0,base:0,width:2,depth:2,h:1,variant,rot:0});
    for(const [x,y,z] of hullGeometry(variant).vertices){
      assert.ok(r.planes.every(p=>p.x*x+p.y*y+p.z*z<=p.k+1e-6));
      assert.ok(r.planes.some(p=>Math.abs(p.x*x+p.y*y+p.z*z-p.k)<1e-6));
    }
    assert.notEqual(hullHit({x:0,y:.5,z:3},{x:0,y:.5,z:-3},r),null);
    assert.equal(hullHit({x:r.w/2-.001,y:.99,z:3},{x:r.w/2-.001,y:.99,z:-3},r),null,'empty bevel corners are not invisible walls');
  }
});
test('shared scenery contains solid trunks, fallen logs and substantially different rock sizes',()=>{
  assert.ok(SCENERY.trees.length>3000);assert.ok(SCENERY.rocks.length>800);
  assert.ok(SCENERY.rocks.some(r=>r.kind==='log'));
  assert.ok(SCENERY.rocks.some(r=>r.width>10));assert.ok(SCENERY.rocks.some(r=>r.width<2));
  for(const tree of SCENERY.trees.filter((_,i)=>i%101===0)){
    const r=tree.collider,y=r.base+r.h*.4;
    assert.equal(clearBody(r.x,r.z,terrain(r.x,r.z)),false);
    assert.notEqual(coverHit({x:r.x-2,y,z:r.z},{x:r.x+2,y,z:r.z}),null);
    assert.ok(nearbyCover(r.x,r.z).some(c=>c.kind==='trunk'));
  }
});
test('rock top supports the player and bevels use their actual surface height',()=>{
  const r=COVER[0],center=solidSpan(r,r.x,r.z),edge=solidSpan(r,r.x+r.w*.46,r.z);
  assert.ok(Math.abs(center[1]-r.top)<1e-6);assert.ok(edge[1]<r.top);
  assert.ok(Math.abs(floorAt(r.x,r.z)-r.top)<1e-6);
  assert.equal(clearBody(r.x,r.z,r.base),false);assert.ok(clearBody(r.x,r.z,r.top+.1));
});
test('spatial lookup agrees with a full collision scan and stays local',()=>{
  for(const r of COVER.filter((_,i)=>i%29===0)){
    const a={x:r.x-8,y:r.base+r.h*.5,z:r.z+3},b={x:r.x+8,y:a.y,z:r.z-3};
    assert.equal(coverHit(a,b),coverHit(a,b,COVER));
  }
  assert.ok(nearbyCover(0,0,20).length<COVER.length/20);
});
test('wilderness packs cover every court and distance band, without crowding the Hearth',()=>{
  assert.ok(WILDS.length>=100);assert.ok(WILDS.every(g=>Math.hypot(g.x,g.z)>=68));
  for(const sx of [-1,1])for(const sz of [-1,1])assert.ok(WILDS.filter(g=>Math.sign(g.x)===sx&&Math.sign(g.z)===sz).length>15);
  for(const [min,max] of [[68,150],[150,250],[250,500]])assert.ok(WILDS.filter(g=>Math.hypot(g.x,g.z)>=min&&Math.hypot(g.x,g.z)<max).length>=5);
  assert.ok(WILDS.some(g=>g.types.length>=7));assert.ok(WILDS.some(g=>g.types.includes('healer')));
  assert.ok(WILDS.every(g=>CAMPS.every(c=>Math.hypot(c.x-g.x,c.z-g.z)>=38)));
});
test('wilderness enemies spawn clear, roam, and grant XP without named-camp loot',()=>{
  const g=new Combat(),wild=g.enemies.filter(e=>e.wild!==undefined);assert.equal(wild.length,WILDS.reduce((n,c)=>n+c.types.length,0));
  assert.ok(wild.every(e=>clearBody(e.x,e.z,terrain(e.x,e.z),SPECIES[e.type].size*.23,Math.max(1.7,SPECIES[e.type].size))));
  const e=wild.find(e=>e.type==='seedling');Object.assign(g.player,{x:e.x+45,z:e.z,y:terrain(e.x+45,e.z)+1.7,invuln:999});
  g.enemies=[e];const x=e.x,z=e.z;for(let i=0;i<120;i++)g.update(1/60);
  assert.ok(Math.hypot(e.x-x,e.z-z)>.2);assert.equal(e.aiState,'roam');
  const xp=g.xp,inventory=[...g.inventory];g.hurtEnemy(e,9999);assert.ok(g.xp>xp);assert.equal(g.cleared.size,0);assert.deepEqual(g.inventory,inventory);
  Object.assign(g.player,{x:e.x,z:e.z});e.dead=.01;g.updateEnemies(.1);assert.equal(e.hp,0,'no respawn beneath player');
  g.player.x+=120;g.updateEnemies(.1);assert.equal(e.hp,e.maxHp);
});
