import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, WIDTH, HEIGHT, HOME, biomeAt, canWalk, lineClear, inVillage, BRIDGES, waterAt, terrainAt, propsNear } from '../src/world.js';
import { EXPANSION_PATHS, EXPANSION_PLACES, REGION_SITES, CAMP_SITES } from '../src/regions.js';
import { MORE_SPECIES } from '../src/expansion-monsters.js';
import { SPECIES } from '../src/data.js';

const world=createWorld();
test('expanded world has more than five times the area with every new species represented',()=>{
  assert.ok(WIDTH*HEIGHT/(2400*1800)>5.5);assert.equal(EXPANSION_PLACES.length,18);
  assert.ok(world.props.filter(p=>!p.removed).length>4000);assert.ok(world.creatures.length>170);
  for(const type of Object.keys(MORE_SPECIES))assert.ok(world.creatures.some(c=>c.type===type),type);
  assert.equal(new Set(world.creatures.map(c=>c.type)).size,36);
  assert.equal(world.creatures[0].id,'creature-0');assert.equal(world.creatures[0].type,'barkjaw');assert.equal(world.creatures[0].x,826);
  assert.deepEqual(HOME,{x:1080,y:855});
});
test('every new road segment remains clear for walking, including bridge approaches',()=>{
  for(const [routeIndex,path] of EXPANSION_PATHS.entries())for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],d=Math.hypot(b.x-a.x,b.y-a.y);
    for(let n=0;n<=d;n+=10){const x=a.x+(b.x-a.x)*n/d,y=a.y+(b.y-a.y)*n/d;assert.ok(canWalk(world,x,y,8),`route${routeIndex} at ${Math.round(x)},${Math.round(y)}`);}
  }
  for(const bridge of BRIDGES){assert.equal(waterAt(bridge.x,bridge.y),false);assert.ok(canWalk(world,bridge.x,bridge.y,8));}
});
test('all eighteen new landmarks are reachable on foot from Willowmere',()=>{
  const size=20,cols=WIDTH/size,rows=HEIGHT/size,seen=new Uint8Array(cols*rows),walk=new Int8Array(cols*rows).fill(-1),qx=[Math.round(HOME.x/size)],qy=[Math.round(HOME.y/size)];
  const open=(x,y)=>{if(x<1||y<2||x>=cols-1||y>=rows-1)return false;const k=y*cols+x;return walk[k]===-1?(walk[k]=canWalk(world,x*size,y*size,8)?1:0):walk[k];};
  seen[qy[0]*cols+qx[0]]=1;
  for(let i=0;i<qx.length;i++){
    const x=qx[i],y=qy[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy,k=ny*cols+nx;if(!seen[k]&&open(nx,ny)&&canWalk(world,(x+nx)*size/2,(y+ny)*size/2,8)){seen[k]=1;qx.push(nx);qy.push(ny);}
    }
  }
  for(const p of EXPANSION_PLACES)assert.ok(seen[Math.round(p.y/size)*cols+Math.round(p.x/size)],p.id);
});
test('landmarks and animals belong to their stated habitats and spawn on usable ground',()=>{
  for(const place of EXPANSION_PLACES){assert.equal(biomeAt(place.x,place.y),place.biome,place.id);assert.ok(canWalk(world,place.x,place.y),place.id);}
  for(const c of world.creatures){assert.ok(canWalk(world,c.x,c.y,5),c.id);const habitat=SPECIES[c.type].habitat;if(habitat!=='seam')assert.equal(biomeAt(c.x,c.y),habitat,c.type);}
  for(const site of REGION_SITES){assert.equal(terrainAt(site.x,site.y).microhabitat,site.kind);assert.ok(world.props.some(p=>p.site===site.id&&site.evidence.includes(p.resource)),site.id);}
});
test('new camps offer safety, rest and local conversations without hiding objectives in HUD',()=>{
  for(const camp of CAMP_SITES){assert.ok(inVillage(camp));assert.ok(world.interactables.some(i=>i.id===`hearth-${camp.id}`&&i.kind==='hearth'));assert.ok(world.interactables.some(i=>i.id===`npc-${camp.id}`&&i.dialogue));}
  assert.equal(world.interactables.filter(i=>i.kind==='lore').length,REGION_SITES.length);
});
test('drawn tree variants and creature variants are distributed among habitats',()=>{
  const groves=world.props.filter(p=>p.atlas==='groves'&&!p.removed);assert.ok(new Set(groves.map(p=>p.art)).size>55);
  for(const family of ['giftwillow','claspwood','sourheart','amberoak','snowfir','frostwood'])assert.ok(new Set(groves.filter(p=>p.family===family).map(p=>p.art)).size>=4,family);
  assert.equal(new Set(world.creatures.filter(c=>c.visual).map(c=>c.visual.sprite)).size,8);
});
test('spatial collision queries reflect replaced arrays, additions and removed scenery',()=>{
  const arena={props:[{x:1100,y:855,solid:12}]};assert.equal(canWalk(arena,1100,855),false);
  assert.equal(lineClear(arena,{x:1080,y:855},{x:1140,y:855}),false);
  arena.props=[];assert.equal(canWalk(arena,1100,855),true);
  arena.props.push({x:1120,y:855,solid:10});assert.equal(canWalk(arena,1120,855),false);
  arena.props[0].removed=true;assert.equal(canWalk(arena,1120,855),true);
  assert.ok(propsNear(world,HOME.x,HOME.y,300).length<world.props.length/8);
});
