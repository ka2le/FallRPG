import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { WIDTH, HEIGHT, canWalk, biomeAt, inVillage, dist, propsNear } from '../src/world.js';
import { SPECIES } from '../src/data.js';
import { GEAR } from '../src/adventure.js';
import { WORLD_SIZE, CORE_SIZE, FRONTIER_DISTRICTS, FRONTIER_CAMPS, FRONTIER_PATHS, FRONTIER_PLACES, FRONTIER_HUNTS, inFrontier } from '../src/frontier.js';

const game=new Game(),world=game.world;
test('the playable landscape is ten times the pre-update world, with at least the same scenery density',()=>{
  assert.equal(WIDTH*HEIGHT/WORLD_SIZE.baselineArea,10);
  const props=world.props.filter(p=>!p.removed),core=props.filter(p=>!inFrontier(p.x,p.y)),outer=props.length-core.length;
  const coreArea=CORE_SIZE.width*CORE_SIZE.height,outerArea=WIDTH*HEIGHT-coreArea;
  assert.ok(outer/outerArea>=core.length/coreArea*.9,`${outer} frontier props / ${outerArea} units`);
  assert.ok(props.length>45000);assert.ok(game.creatures.length>3500);
  assert.ok(propsNear(world,17500,10300,600).length<props.length/50,'local queries stay small on the larger world');
});
test('every frontier has its own forest, creatures, nine bounty enemies and an elite',()=>{
  for(const d of FRONTIER_DISTRICTS){
    const scenery=propsNear(world,d.x,d.y,650).filter(p=>!p.removed);assert.ok(scenery.length>100,d.id);
    for(const camp of d.camps){const creatures=game.creatures.filter(c=>c.camp===camp.id);assert.equal(creatures.length,3,camp.id);for(const c of creatures){assert.equal(c.level,camp.level);assert.equal(biomeAt(c.x,c.y),SPECIES[c.type].habitat);assert.ok(canWalk(world,c.x,c.y,8));}}
    assert.ok(game.creatures.some(c=>c.camp===d.camps[2].id&&c.elite));
    assert.ok(game.creatures.some(c=>c.frontier&&SPECIES[c.type].neutral&&dist(c,d)<1400),`${d.id} wildlife`);
  }
});
test('static long roads stay walkable beneath temporary living walls',()=>{
  const staticTerrain={...world,rootwallLive:false};
  for(const [index,path] of FRONTIER_PATHS.entries())for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],length=dist(a,b);for(let n=0;n<=length;n+=10){const x=a.x+(b.x-a.x)*n/length,y=a.y+(b.y-a.y)*n/length;assert.ok(canWalk(staticTerrain,x,y,8),`road ${index}: ${Math.round(x)},${Math.round(y)}`);}
  }
  const length=FRONTIER_PATHS.reduce((sum,path)=>sum+path.slice(1).reduce((total,p,i)=>total+dist(p,path[i]),0),0);
  assert.ok(length>100000,'roads are long expeditions, not clustered encounter rooms');
});
test('remote refuges provide real safety, supplies and quest givers in their stated habitats',()=>{
  for(const camp of FRONTIER_CAMPS){
    assert.ok(inVillage(camp));assert.equal(biomeAt(camp.x,camp.y),camp.biome);
    for(const kind of ['npc','market','hearth'])assert.ok(world.interactables.some(i=>i.kind===kind&&dist(i,camp)<150),`${camp.id}: ${kind}`);
    assert.ok(world.interactables.some(i=>i.name===camp.keeper&&i.kind==='npc'));
  }
  for(const p of FRONTIER_PLACES){assert.ok(canWalk(world,p.x,p.y));assert.equal(biomeAt(p.x,p.y),p.biome);}
});
test('a frontier expedition unlocks through the main journey and preserves its unique reward on reload',()=>{
  const g=new Game(),hunt=FRONTIER_HUNTS.find(h=>h.id==='road-mossway');
  assert.equal(g.questAction(hunt.id),false);g.quests['briar-road']='complete';g.refreshHunts();assert.ok(g.questAction(hunt.id));
  assert.equal(g.questAction(hunt.id),false);for(const c of g.creatures.filter(c=>hunt.camps.some(a=>a.id===c.camp)))g.hurt(c,999999);
  assert.ok(g.questAction(hunt.id));assert.equal(g.questAction(hunt.id),false);assert.ok(g.inventory.includes(hunt.item));assert.ok(GEAR[hunt.item]);g.equip(hunt.item);
  const restored=new Game(g.snapshot());assert.equal(restored.quests[hunt.id],'complete');assert.deepEqual(restored.snapshot(),g.snapshot());
});
