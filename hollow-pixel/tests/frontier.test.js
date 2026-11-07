import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { WIDTH, HEIGHT, HOME, MIN_X, MIN_Y, MAX_X, MAX_Y, canWalk, biomeAt, inVillage, dist, propsNear, waterAt, lavaAt } from '../src/world.js';
import { SPECIES } from '../src/data.js';
import { GEAR } from '../src/adventure.js';
import { WORLD_SIZE, CORE_SIZE, FRONTIER_DISTRICTS, FRONTIER_CAMPS, FRONTIER_PATHS, FRONTIER_PLACES, FRONTIER_HUNTS, FRONTIER_HABITATS, inFrontier } from '../src/frontier.js';

const game=new Game(),world=game.world;
test('the playable landscape is ten times the pre-update world, with at least the same scenery density',()=>{
  assert.equal(WIDTH*HEIGHT/WORLD_SIZE.baselineArea,10);
  const props=world.props.filter(p=>!p.removed),core=props.filter(p=>!inFrontier(p.x,p.y)),outer=props.length-core.length;
  const coreArea=CORE_SIZE.width*CORE_SIZE.height,outerArea=WIDTH*HEIGHT-coreArea;
  assert.ok(outer/outerArea>=core.length/coreArea*.9,`${outer} frontier props / ${outerArea} units`);
  assert.ok(props.length>45000);assert.ok(game.creatures.length>3500);
  const remote=FRONTIER_DISTRICTS.at(-1);assert.ok(propsNear(world,remote.x,remote.y,600).length<props.length/50,'local queries stay small on the larger world');
});
test('the hearth is central and all four directions have dense, varied wilderness',()=>{
  assert.equal((HOME.x-MIN_X)/WIDTH,.5);assert.equal((HOME.y-MIN_Y)/HEIGHT,.5);
  for(const [west,north] of [[true,true],[false,true],[true,false],[false,false]]){
    const districts=FRONTIER_DISTRICTS.filter(d=>(d.x<HOME.x)===west&&(d.y<HOME.y)===north);
    assert.ok(districts.length>=2);
    for(const d of districts){assert.ok(propsNear(world,d.x,d.y,500).filter(p=>!p.removed).length>100);assert.ok(d.x>MIN_X&&d.x<MAX_X&&d.y>MIN_Y&&d.y<MAX_Y);}
  }
  assert.ok(new Set(world.creatures.filter(c=>c.frontier&&SPECIES[c.type].neutral).map(c=>c.type)).size>=14);
});
test('every outer district has inhabited resource pockets, with water and lava matching collision',()=>{
  for(const site of FRONTIER_HABITATS){
    assert.ok(world.props.filter(p=>p.site===site.id&&!p.removed).length>=4,site.id);
    assert.equal(world.creatures.filter(c=>c.site===site.id).length,3,site.id);
    if(!site.water&&!site.lava)continue;
    const query=site.water?waterAt:lavaAt;let found=false;
    for(let dx=-80;dx<=80;dx+=20)for(let dy=-80;dy<=80;dy+=20)if(query(site.x+dx,site.y+dy)){found=true;assert.equal(canWalk(world,site.x+dx,site.y+dy),false);}
    assert.ok(found,`${site.id} terrain`);
  }
});
test('negative-coordinate travel routes around cover and survives saving; old frontier saves return safely',()=>{
  const g=new Game();g.world.props=[{x:-960,y:-1000,solid:14}];g.world.rootwallLive=false;g.creatures=[];Object.assign(g.player,{x:-1000,y:-1000});
  g.navigateTo(-920,-1000);assert.ok(g.route.length>1);
  for(let n=0;n<200;n++)g.update(.05);assert.ok(dist(g.player,{x:-920,y:-1000})<5);
  const refuge=FRONTIER_CAMPS.find(c=>c.x<0&&c.y<0);Object.assign(g.player,{x:refuge.x,y:refuge.y});
  const saved=g.snapshot(),restored=new Game(saved);assert.equal(restored.player.x,refuge.x);assert.equal(restored.player.y,refuge.y);
  delete saved.worldLayout;saved.player.x=17500;saved.player.y=10300;saved.player.coins=127;saved.rootwalls={bad:true};
  const migrated=new Game(saved);assert.equal(migrated.player.x,HOME.x);assert.equal(migrated.player.y,HOME.y);assert.equal(migrated.player.coins,127);
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
