import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { updateRootwalls } from '../src/rootwalls.js';
import { ROOTWALL } from '../src/rootwall-layout.js';
import { canWalk,moveBody,lineClear,dist } from '../src/world.js';
import { SPECIES } from '../src/data.js';
import { creatureAppearance } from '../src/sprites.js';

function grove(){
  const g=new Game(),group=g.world.rootwallGroups[0];
  g.autoAttack=false;g.world.props=[];g.world.interactables=[];g.world.ambient=[];
  g.world.rootwallGroups=[group];g.creatures=group.members;updateRootwalls(g,0);
  return {g,group};
}
function step(g,seconds){for(let n=0;n<Math.round(seconds/.05);n++){g.time+=.05;updateRootwalls(g,.05);}}
function wall(g,group,site=0){group.site=site;group.phase='holding';group.elapsed=0;for(const c of group.members)Object.assign(c,group.walls[site][c.rootIndex]);}
function direction(group){const d=dist(group.a,group.b);return {x:(group.b.x-group.a.x)/d,y:(group.b.y-group.a.y)/d};}

test('Marching Claspwoods use full tree silhouettes and spawn in independent six-tree groves',()=>{
  const g=new Game();assert.equal(g.world.rootwallGroups.length,14);assert.equal(new Set(g.world.rootwallGroups.map(g=>g.phase)).size,4);
  for(const group of g.world.rootwallGroups){assert.equal(group.members.length,6);for(const c of group.members){assert.equal(c.type,'wallroot');assert.ok(canWalk(g.world,c.x,c.y,16,c));assert.equal(creatureAppearance(SPECIES.wallroot,c).atlas,'groves');assert.ok(creatureAppearance(SPECIES.wallroot,c).frame>=8&&creatureAppearance(SPECIES.wallroot,c).frame<=11);}}
});
test('groves physically gather, hold for a full minute, then release one tree every five seconds',()=>{
  const {g,group}=grove();group.phase='gathering';group.elapsed=0;
  for(let i=0;i<600&&group.phase!=='holding';i++)step(g,.05);
  assert.equal(group.phase,'holding');assert.ok(group.members.every(c=>dist(c,group.walls[0][c.rootIndex])<1.1));
  const positions=group.members.map(c=>({x:c.x,y:c.y}));step(g,59.9);assert.equal(group.phase,'holding');assert.deepEqual(group.members.map(c=>({x:c.x,y:c.y})),positions);
  step(g,.2);assert.equal(group.phase,'dispersing');step(g,.1);assert.ok(dist(group.members[0],positions[0])>0);assert.ok(group.members.slice(1).every((c,i)=>dist(c,positions[i+1])===0));
  step(g,4.5);assert.equal(dist(group.members[1],positions[1]),0);step(g,.5);assert.ok(dist(group.members[1],positions[1])>0);
  step(g,55);assert.equal(group.site,1);assert.equal(group.phase,'scattered');assert.ok(group.members.every(c=>dist(c,group.walls[0][c.rootIndex])>25),'the old wall has vacated its slots');
});
test('living trunks stop walking and shots, while attacking a front trunk and cutting a gap work',()=>{
  const {g,group}=grove();wall(g,group);const axis=direction(group),c=group.members[2],start={x:c.x-axis.x*70,y:c.y-axis.y*70},end={x:c.x+axis.x*70,y:c.y+axis.y*70};
  assert.equal(lineClear(g.world,start,end),false);assert.equal(lineClear(g.world,start,c),true);
  const body={...start};moveBody(g.world,body,axis.x*140,axis.y*140);assert.ok((body.x-c.x)*axis.x+(body.y-c.y)*axis.y<0);
  Object.assign(g.player,start);g.target=c.id;assert.ok(g.shoot());for(let n=0;n<12;n++)g.update(.05);assert.ok(c.hp<c.maxHp,'projectiles can damage the actual trunk they target');
  g.hurt(c,99999);assert.ok(canWalk(g.world,c.x,c.y,8));assert.equal(lineClear(g.world,start,end),true);const through={...start};moveBody(g.world,through,axis.x*140,axis.y*140);assert.ok(dist(through,end)<2);
});
test('binding an assembling tree delays the completed wall rather than teleporting it into place',()=>{
  const {g,group}=grove(),c=group.members[0],before={x:c.x,y:c.y};group.phase='gathering';group.elapsed=0;c.root=100;
  step(g,35);assert.equal(group.phase,'gathering');assert.deepEqual({x:c.x,y:c.y},before);c.root=0;step(g,20);assert.equal(group.phase,'holding');
});
test('a killed tree cancels its warned strike and leaves the group with a permanent opening',()=>{
  const {g,group}=grove();wall(g,group);const c=group.members[2],axis=direction(group);Object.assign(g.player,{x:c.x-axis.x*33,y:c.y-axis.y*33});
  assert.ok(g.triggerTree(c));g.hurt(c,99999);const hp=g.player.hp;for(let i=0;i<40;i++)g.update(.05);
  assert.equal(g.player.hp,hp);assert.equal(g.treeAttacks.has(c),false);assert.ok(canWalk(g.world,c.x,c.y,8));
});
test('every grove completes repeated staggered cycles without getting stuck on scenery',()=>{
  const g=new Game(),seen=new Map(g.world.rootwallGroups.map(group=>[group.id,new Set([group.phase])]));
  for(let i=0;i<4500;i++){g.time+=.1;updateRootwalls(g,.1);for(const group of g.world.rootwallGroups)seen.get(group.id).add(group.phase);}
  for(const [id,phases] of seen)assert.equal(phases.size,4,id);
  assert.ok(new Set(g.world.rootwallGroups.map(g=>g.phase)).size>=2,'groves do not all pulse together');
});
test('save reload preserves wall timing, migration, killed trunks and a player standing in an opened gap',()=>{
  const g=new Game(),group=g.world.rootwallGroups.find(g=>g.phase==='holding'),c=group.members[2];g.hurt(c,99999);Object.assign(g.player,{x:c.x,y:c.y});group.elapsed=37.5;
  const saved=g.snapshot(),h=new Game(JSON.parse(JSON.stringify(saved)));assert.deepEqual(h.snapshot(),saved);assert.equal(h.player.x,c.x);assert.equal(h.player.y,c.y);
  assert.ok(h.creatures.find(a=>a.id===c.id).dead);assert.equal(h.world.rootwallGroups.find(a=>a.id===group.id).elapsed,37.5);
  const old={...saved};delete old.rootwalls;const migrated=new Game(old);assert.equal(migrated.world.rootwallGroups.length,14);
});
