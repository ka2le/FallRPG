import { PLACES, SPECIES } from './data.js';
import { EXPANSION_PATHS, EXPANSION_PLACES, CAMP_SITES, REGION_SITES, WATER_PATCHES, LAVA_PATCHES } from './regions.js';
import { TREE_FAMILIES, SEASONAL_TREES, DECORATION_POOLS, WILDS_ASSETS } from './environment-catalog.js';
import { MORE_SPECIES, CREATURE_VARIANTS } from './expansion-monsters.js';
import { ADVENTURE_PATHS, ENCOUNTERS } from './adventure.js';
import { WORLD_SIZE, WORLD_BOUNDS, CORE_SIZE, FRONTIER_CAMPS, FRONTIER_PATHS, frontierAt, frontierHabitatAt, inFrontier } from './frontier.js';
import { populateFrontier } from './frontier-world.js';
import { plantRootwalls } from './rootwall-layout.js';

export const WIDTH=WORLD_SIZE.width, HEIGHT=WORLD_SIZE.height;
export const {minX:MIN_X,minY:MIN_Y,maxX:MAX_X,maxY:MAX_Y}=WORLD_BOUNDS;
const LEGACY_WIDTH=2400,LEGACY_HEIGHT=1800;
export const HOME={x:1080,y:855};
export const inVillage=point=>Math.hypot((point.x-HOME.x)/1.15,point.y-HOME.y)<210||CAMP_SITES.some(c=>Math.hypot(point.x-c.x,point.y-c.y)<c.radius)||FRONTIER_CAMPS.some(c=>Math.hypot(point.x-c.x,point.y-c.y)<c.radius);
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function random(seed=9281){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function hash(x,y){let n=Math.imul(x,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;}
export function noise(x,y,scale=90){const a=x/scale,b=y/scale,ix=Math.floor(a),iy=Math.floor(b);let u=a-ix,v=b-iy;u=u*u*(3-2*u);v=v*v*(3-2*v);return (hash(ix,iy)*(1-u)+hash(ix+1,iy)*u)*(1-v)+(hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u)*v;}
export const seamX=y=>1260+Math.sin(y*.005)*85;
export const seasonY=x=>1030+Math.sin(x*.004)*80;
export const riverX=y=>620+Math.sin(y*.006)*88+Math.sin(y*.013)*25;
const inside=(x,y,cx,cy,rx,ry)=>((x-cx)/rx)**2+((y-cy)/ry)**2<1;
export function biomeAt(x,y){
  if(inFrontier(x,y))return frontierAt(x,y).biome;
  if(x>6000)return 'ember';
  let biome=y<seasonY(x)?(x<seamX(y)?'spring':'autumn'):(x<seamX(y)?'winter':'ember');
  if(x<LEGACY_WIDTH&&y<LEGACY_HEIGHT)return biome;
  // Permanent domains have irregular, stable margins. Their resources cross the seam.
  if(inside(x,y,4200,820,1400,1090))biome='spring';
  if(inside(x,y,3000,3300,1700,1000))biome='autumn';
  if(inside(x,y,1000,3650,1100,700))biome='spring';
  if(inside(x,y,5500,1650,600,1400)||inside(x,y,4900,3900,1300,1050))biome='winter';
  return biome;
}
const LEGACY_PATHS=[
  [{x:260,y:790},{x:580,y:850},{x:880,y:850},HOME,{x:1460,y:870},{x:2020,y:820}],
  [HOME,{x:980,y:690},{x:810,y:565},{x:770,y:340}],
  [HOME,{x:1210,y:1040},{x:1280,y:1220},{x:1275,y:1370},{x:1610,y:1430},{x:1845,y:1320}],
  [{x:1210,y:1040},{x:980,y:1170},{x:710,y:1405},{x:420,y:1460}],
  [{x:1460,y:870},{x:1570,y:640},{x:1810,y:415}],
  [{x:580,y:850},{x:460,y:650},{x:465,y:390}],
];
export const PATHS=[...LEGACY_PATHS,...EXPANSION_PATHS,...ADVENTURE_PATHS,...FRONTIER_PATHS];
export function segmentDistance(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy),0,1);return Math.hypot(x-a.x-dx*t,y-a.y-dy*t);}
const pathIndexes=new WeakMap(),PATH_CELL=256;
function distanceToPaths(x,y,paths){
  let index=pathIndexes.get(paths);
  if(!index){index=new Map();for(const path of paths)for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i];
    for(let gx=Math.floor((Math.min(a.x,b.x)-PATH_CELL)/PATH_CELL);gx<=Math.floor((Math.max(a.x,b.x)+PATH_CELL)/PATH_CELL);gx++)for(let gy=Math.floor((Math.min(a.y,b.y)-PATH_CELL)/PATH_CELL);gy<=Math.floor((Math.max(a.y,b.y)+PATH_CELL)/PATH_CELL);gy++){
      const key=`${gx},${gy}`;if(!index.has(key))index.set(key,[]);index.get(key).push([a,b]);
    }
  }pathIndexes.set(paths,index);}
  let d=PATH_CELL;for(const [a,b] of index.get(`${Math.floor(x/PATH_CELL)},${Math.floor(y/PATH_CELL)}`)||[])d=Math.min(d,segmentDistance(x,y,a,b));return d;
}
export function pathDistance(x,y){return distanceToPaths(x,y,PATHS);}
const legacyPathDistance=(x,y)=>distanceToPaths(x,y,LEGACY_PATHS);
export const BRIDGES=[850,1420,2830,3150,3700].map((y,i)=>({x:riverX(y),y,width:i<2?120:128,depth:i===0?50:48}));
export function bridgeAt(x,y){return BRIDGES.some(b=>Math.abs(x-b.x)<b.width/2&&Math.abs(y-b.y)<b.depth/2);}
export function waterAt(x,y){
  if(bridgeAt(x,y))return false;
  if(inFrontier(x,y)){const s=frontierHabitatAt(x,y);return !!s?.water&&Math.hypot((x-s.x)/.85,y-s.y)<s.radius*(.56+noise(x,y,45)*.18)&&pathDistance(x,y)>34;}
  return (Math.abs(x-riverX(y))<23+noise(x,y,110)*9||Math.hypot((x-370)*.9,(y-340)*1.2)<102||Math.hypot((x-1710)*1.1,(y-700)*.8)<76||WATER_PATCHES.some(p=>inside(x,y,p.x,p.y,p.rx,p.ry)))&&distanceToPaths(x,y,FRONTIER_PATHS)>34;
}
export function lavaAt(x,y){
  if(inFrontier(x,y)){const s=frontierHabitatAt(x,y);return !!s?.lava&&Math.hypot(x-s.x,(y-s.y)*1.3)<s.radius*(.52+noise(x,y,40)*.2)&&pathDistance(x,y)>34;}
  return biomeAt(x,y)==='ember'&&((Math.hypot((x-2060)*.8,(y-1510)*1.1)<110+noise(x,y,60)*30)||(x>2130&&x<LEGACY_WIDTH&&y>1080&&y<1130+Math.sin(x*.018)*26)||LAVA_PATCHES.some(p=>inside(x,y,p.x,p.y,p.rx,p.ry)))&&distanceToPaths(x,y,FRONTIER_PATHS)>34;
}
export function regionAt(x,y){if(inFrontier(x,y))return frontierHabitatAt(x,y)||frontierAt(x,y);return REGION_SITES.find(s=>Math.hypot(x-s.x,y-s.y)<s.radius);}
export function terrainAt(x,y){const biome=biomeAt(x,y),path=pathDistance(x,y),site=regionAt(x,y);return {biome,path,water:waterAt(x,y),lava:lavaAt(x,y),bridge:bridgeAt(x,y),wet:noise(x+490,y-93,130),height:noise(x,y,250),microhabitat:site?.kind||null,region:site?.id||null};}

export function createWorld(){
  const rand=random(),props=[],creatures=[],interactables=[];
  const add=(sprite,x,y,size=90,extra={})=>{const p={id:`prop-${props.length}`,sprite,x,y,size,phase:rand()*6.28,...extra};props.push(p);return p;};
  add(5,1000,760,177,{solid:40,label:'The Wayfarer’s Rest',building:true});
  add(4,1195,715,132,{solid:32,label:'Mara’s cottage',building:true});
  add(6,1190,900,108,{solid:23,label:'Market',building:true});
  add(4,935,1005,120,{solid:29,building:true});
  add(4,1360,835,113,{solid:28,building:true});
  add(7,1080,965,88,{solid:18,label:'Hearthstone'});
  add(15,1080,795,48);
  add(0,815,510,126,{solid:16,tree:true,label:'Giftwillow'});
  add(0,880,575,112,{solid:15,tree:true,label:'Giftwillow'});
  add(8,750,680,116,{solid:19,tree:true,clasp:true});
  add(9,1810,415,218,{solid:40,tree:true,label:'The Hollow Elder'});
  add(7,710,1405,95,{solid:20,label:'Snowbell shrine'});
  add(11,1845,1280,112,{solid:27});
  add(7,1930,1370,85,{solid:18,label:'Cinderwatch shrine'});
  add(13,1275,1370,78,{solid:25,blockage:true,label:'Tangled crossing'});
  for(let n=0;n<540;n++){
    const x=65+rand()*(LEGACY_WIDTH-130),y=90+rand()*(LEGACY_HEIGHT-160),b=biomeAt(x,y);
    if(legacyPathDistance(x,y)<36||waterAt(x,y)||lavaAt(x,y)||dist({x,y},HOME)<235||props.some(p=>dist(p,{x,y})<48))continue;
    const tree=rand()<.73;
    let sprite=tree?({spring:rand()<.38?1:rand()<.16?8:0,autumn:2,winter:3,ember:rand()<.35?9:11})[b]:({spring:rand()<.5?14:10,autumn:rand()<.45?10:13,winter:12,ember:11})[b];
    add(sprite,x,y,tree?(b==='ember'?65:86)+rand()*49:32+rand()*29,{tree,solid:tree?12:7,clasp:sprite===8});
  }
  // Additional tree strategies and low habitat layers share the same depth sorting.
  for(const p of props){if(!p.tree||p.clasp||p.label)continue;const b=biomeAt(p.x,p.y),variant=hash(Math.floor(p.x),Math.floor(p.y));
    if(b==='spring'&&variant<.27){p.atlas='details';p.sprite=variant<.14?1:2;}
    if(b==='autumn'&&variant<.28){p.atlas='details';p.sprite=0;}
  }
  add(12,1105,1045,57,{atlas:'details',solid:13,label:'The old well'});
  add(13,1280,880,47,{atlas:'details',solid:11});
  add(14,1450,805,43,{atlas:'details',solid:9,label:'A courier’s camp'});
  const villageVariants=props.filter(p=>p.building&&p.sprite===4);
  if(villageVariants[1])villageVariants[1].art=48;
  if(villageVariants[2])villageVariants[2].art=49;
  for(const [art,x,y,size,solid] of [[50,1410,750,72,20],[51,1340,790,31,8],[52,1268,910,23,5],[53,971,771,22,5],[54,1240,802,24,0],[55,1490,870,22,4],[57,1460,695,22,0]])add(0,x,y,size,{art,solid});
  for(let n=0;n<390;n++){
    const x=60+rand()*(LEGACY_WIDTH-120),y=90+rand()*(LEGACY_HEIGHT-180),b=biomeAt(x,y),pd=legacyPathDistance(x,y);
    if(pd<29||waterAt(x,y)||lavaAt(x,y)||dist({x,y},HOME)<90||props.some(p=>p.building&&dist(p,{x,y})<48))continue;
    let sprite=({spring:rand()<.3?3:rand()<.4?4:rand()<.5?5:11,autumn:rand()<.4?6:rand()<.6?7:9,winter:8,ember:9})[b],size=13+rand()*16;
    if(Math.abs(x-riverX(y))<55&&b!=='winter'){sprite=10;size=27+rand()*12;}
    if(noise(x,y,250)>.64&&pd>70&&n%6===0&&b!=='winter'){sprite=15;size=45+rand()*28;}
    add(sprite,x,y,size,{atlas:'details',solid:sprite===15?size*.5:0,vegetation:sprite!==15});
  }
  for(const prop of props){
    if(prop.building)prop.size=Math.round(prop.size*.76);
    else if(prop.tree)prop.size=Math.round(prop.size*.79);
    if(prop.atlas==='details'&&prop.sprite===15&&prop.phase>3)prop.art=prop.phase>4.5?56:58;
    if(prop.atlas==='details'&&prop.sprite===10&&prop.phase>3)prop.art=60;
    if(prop.atlas==='details'&&prop.sprite===7&&prop.phase>3.5)prop.art=61;
    if(prop.atlas==='details'&&prop.sprite===9&&biomeAt(prop.x,prop.y)==='ember'&&prop.phase>3)prop.art=62;
    if(!prop.atlas&&prop.sprite===12&&prop.phase>4.5)prop.art=59;
  }
  for(let i=0;i<12;i++){const y=300+i*105,x=riverX(y)+Math.sin(i*3)*15;if(waterAt(x,y)&&biomeAt(x,y)!=='winter')add(0,x,y,8+rand()*5,{art:63});}
  // Authored habitat communities; ordinary creatures remain neutral.
  const spawn=(type,x,y,extra={})=>creatures.push({id:`creature-${creatures.length}`,type,x,y,homeX:x,homeY:y,phase:rand()*6.28,...extra});
  spawn('barkjaw',826,565,{pair:1});spawn('barkjaw',1035,610,{pair:1,separated:true});
  spawn('barkjaw',450,590,{pair:2});spawn('barkjaw',490,630,{pair:2});
  spawn('rootknife',675,555);spawn('rootknife',415,470);
  [[945,553],[963,600],[1010,568]].forEach(([x,y])=>spawn('seedling',x,y,{quest:'herd'}));
  spawn('petalmaw',430,255);spawn('petalmaw',880,335);spawn('seedling',330,720);
  spawn('mantleback',1550,720);spawn('mantleback',1710,380);spawn('mantleback',2050,660);
  spawn('prowler',1610,565);spawn('prowler',1940,490);spawn('prowler',2080,910);
  spawn('antler',1050,1330);spawn('antler',920,1560);
  spawn('snowkeel',715,1310);spawn('snowkeel',1000,1450);spawn('snowkeel',440,1580);
  spawn('stormbell',760,1515);spawn('stormbell',1080,1160);
  spawn('ventback',1450,1320,{nest:true});spawn('ventback',1840,1240,{nest:true});
  spawn('scavenger',1230,1330,{cold:1,warm:1});spawn('scavenger',1270,1450,{cold:.6,warm:.4});
  spawn('wyrm',1625,1510);spawn('wyrm',1950,1190);spawn('wyrm',2150,1370);
  interactables.push(
    {id:'rowan',kind:'npc',name:'Rowan',role:'HERD KEEPER',sprite:14,x:1038,y:814,size:34},
    {id:'mara',kind:'npc',name:'Mara',role:'BOUNDARY GARDENER',sprite:13,x:1140,y:790,size:34},
    {id:'hearth',kind:'hearth',name:'Hearthstone',x:1080,y:978},
    {id:'market',kind:'market',name:'Willowmere market',x:1190,y:930},
    {id:'innkeeper',kind:'npc',name:'Toma',sprite:36,x:970,y:805,size:32},
    {id:'pip',kind:'npc',name:'Pip',sprite:38,x:1290,y:855,homeX:1290,homeY:855,size:27,roaming:true,walk:0},
    {id:'crossing',kind:'crossing',name:'Tangled crossing',x:1275,y:1385},
    {id:'elder',kind:'elder',name:'The Hollow Elder',x:1810,y:440},
    {id:'snow-shrine',kind:'hearth',name:'Snowbell shrine',x:710,y:1420},
    {id:'ember-shrine',kind:'hearth',name:'Cinderwatch shrine',x:1930,y:1390},
    {id:'waypost',kind:'sign',name:'Willowmere waypost',x:1080,y:813},
  );
  // Small harvests reward wandering without making the wildlife into loot crates.
  for(let i=0;i<32;i++){
    const x=200+rand()*2000,y=200+rand()*1400;
    if(dist(HOME,{x,y})>180&&!waterAt(x,y)&&!lavaAt(x,y)&&!interactables.some(p=>dist(p,{x,y})<48)&&!props.some(p=>p.solid&&dist(p,{x,y})<p.solid+10))interactables.push({id:`herb-${i}`,kind:'herb',name:biomeAt(x,y)==='winter'?'Snowbell sprig':'Lantern orchid',x,y});
  }
  // Reserve a little physical space for authored creatures and interactions.
  for(const prop of props)if(prop.solid&&!prop.building&&!prop.blockage&&!prop.label&&Number(prop.id.split('-')[1])>=15){
    if([...creatures,...interactables].some(a=>Math.hypot(a.x-prop.x,(a.y-prop.y)*1.4)<prop.solid+12))prop.removed=true;
  }
  const ambient=[];
  for(let n=0;n<50;n++){const x=120+rand()*2160,y=160+rand()*1480;if(waterAt(x,y)||lavaAt(x,y))continue;const b=biomeAt(x,y),sprite=b==='winter'?(rand()<.5?50:55):b==='ember'?54:b==='spring'?[48,49,51,52,53][n%5]:[48,51,54][n%3];ambient.push({x,y,sprite,phase:rand()*6.28});}
  const world={props,creatures,interactables,ambient,places:PLACES};
  expandWorld(world,add);
  populateFrontier(world,add,{MIN_X,MIN_Y,MAX_X,MAX_Y,random,noise,biomeAt,pathDistance,canWalk,propsNear,inVillage});
  addAdventure(world,add);
  plantRootwalls(world,{canWalk,biomeAt,inVillage,propsNear,segmentDistance});
  return world;
}

function addAdventure(world,add){
  // Open a continuous winding footpath, leaving dense forest on both sides.
  for(const p of world.props)if(p.solid&&!p.label&&!p.building&&!p.blockage&&pathDistance(p.x,p.y)<p.solid+22)p.removed=true;
  for(const camp of ENCOUNTERS){
    for(const p of propsNear(world,camp.x,camp.y,75))if(p.solid&&!p.label&&!p.building&&!p.blockage&&dist(p,camp)<62)p.removed=true;
    add(0,camp.x+42,camp.y+38,28,{atlas:'wilds',art:48,solid:0});
    world.interactables.push({id:`sign-${camp.id}`,kind:'lore',name:`${camp.name} · Level ${camp.level}`,x:camp.x+42,y:camp.y+38,text:`${camp.name}. Level ${camp.level}${camp.elite?' — elite guardian':''}. Clear this hunting ground for the ${HUNT_TITLE(camp.hunt)} bounty. Return to safety to restock between fights.`});
    camp.types.forEach((type,n)=>{
      for(let attempt=0;attempt<80;attempt++){
        const angle=n*2.4+attempt*.9,r=attempt===0?20:20+attempt*.7,x=camp.x+Math.cos(angle)*r,y=camp.y+Math.sin(angle)*r;
        if(!canWalk(world,x,y,8)||biomeAt(x,y)!==SPECIES[type].habitat||inVillage({x,y})||world.creatures.some(c=>dist(c,{x,y})<22))continue;
        world.creatures.push({id:`encounter-${camp.id}-${n}`,type,x,y,homeX:x,homeY:y,phase:n*2,camp:camp.id,level:camp.level,elite:camp.elite&&n===0,name:camp.elite&&n===0?camp.name:undefined});break;
      }
    });
  }
  // Roadside packs make expeditions a series of fights rather than empty transit.
  const rand=random(77013);
  for(const [route,path] of [...EXPANSION_PATHS,...ADVENTURE_PATHS,...FRONTIER_PATHS].entries())for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],length=dist(a,b);
    for(let step=160;step<length;step+=240){
      const t=step/length,x=a.x+(b.x-a.x)*t+18,y=a.y+(b.y-a.y)*t+18;
      if(inVillage({x,y})||ENCOUNTERS.some(c=>dist(c,{x,y})<175)||world.creatures.some(c=>!SPECIES[c.type].neutral&&dist(c,{x,y})<130))continue;
      const type={spring:'seedling',autumn:'prowler',winter:'stormbell',ember:'wyrm'}[biomeAt(x,y)];
      for(let n=0;n<2;n++){const px=x+n*27,py=y+(rand()-.5)*24;if(!canWalk(world,px,py,5)||biomeAt(px,py)!==SPECIES[type].habitat)continue;world.creatures.push({id:`patrol-${route}-${i}-${step}-${n}`,type,x:px,y:py,homeX:px,homeY:py,phase:rand()*6.28,patrol:true});}
    }
  }
}
const HUNT_TITLE=id=>id.split('-').join(' ');

function expandWorld(world,add){
  const rand=random(612708),pick=list=>list[Math.floor(rand()*list.length)],{props,creatures,interactables,ambient}=world;
  const free=(x,y,r=8)=>canWalk(world,x,y,r);
  const put=(asset,x,y,extra={})=>add(0,x,y,asset.size,{...asset,...extra});
  const scenery=(name,x,y,extra={})=>put(WILDS_ASSETS[name],x,y,{resource:name,...extra});
  const tree=(family,x,y,extra={})=>{const asset=pick(TREE_FAMILIES[family]),scale=.88+rand()*.24;return put(asset,x,y,{family,size:Math.round(asset.size*scale),flip:rand()<.5,...extra});};
  // Keep the established map and save IDs; enrich its trees with drawn age variants.
  for(const prop of props){
    if(!prop.tree||prop.label||prop.removed||hash(prop.x|0,prop.y|0)<.28)continue;
    let family=prop.atlas==='details'?{0:'sourheart',1:'hollowhost',2:'bellroot'}[prop.sprite]:{0:'giftwillow',1:'blossom',2:'amberoak',3:'snowfir',8:'claspwood',9:'emberdead'}[prop.sprite];
    if(!family)continue;const options=TREE_FAMILIES[family],asset=options[Math.floor(hash(prop.y|0,prop.x|0)*options.length)];
    Object.assign(prop,asset,{family,flip:hash(prop.x|0,19)>.5,size:Math.round(asset.size*.88)});
  }
  // Local groves alternate with open browsing ground and wet pockets.
  for(let n=0;n<6900;n++){
    const x=65+rand()*(CORE_SIZE.width-130),y=90+rand()*(CORE_SIZE.height-180);
    if(inFrontier(x,y))continue;
    if(x<LEGACY_WIDTH&&y<LEGACY_HEIGHT)continue;
    const site=regionAt(x,y),b=biomeAt(x,y),density=noise(x+174,y-31,250),pd=pathDistance(x,y);
    if(pd<35||waterAt(x,y)||lavaAt(x,y)||CAMP_SITES.some(c=>dist(c,{x,y})<125)||EXPANSION_PLACES.some(p=>dist(p,{x,y})<55))continue;
    if(density<.29||rand()>(.52+density*.48)||propsNear(world,x,y,40).some(p=>dist(p,{x,y})<35))continue;
    const families=site?.biome===b?site.families:SEASONAL_TREES[b];tree(pick(families),x,y);
  }
  // A separate low layer follows habitat resources, with clear patches between clumps.
  for(let n=0;n<5900;n++){
    const x=60+rand()*(CORE_SIZE.width-120),y=90+rand()*(CORE_SIZE.height-180);if(x<LEGACY_WIDTH&&y<LEGACY_HEIGHT)continue;
    if(inFrontier(x,y))continue;
    const b=biomeAt(x,y),pd=pathDistance(x,y);if(pd<26||waterAt(x,y)||lavaAt(x,y)||CAMP_SITES.some(c=>dist(c,{x,y})<110)||noise(x,y,65)<.39)continue;
    const pool=DECORATION_POOLS[b],asset=pick(pool);if(propsNear(world,x,y,24).some(p=>p.solid&&dist(p,{x,y})<p.solid+8))continue;
    put(asset,x,y,{resource:asset.name,vegetation:!asset.solid,size:Math.round(asset.size*(.8+rand()*.45)),flip:rand()<.5});
  }
  // Evidence is concentrated into readable resource patches rather than sprayed evenly.
  for(const site of REGION_SITES){
    for(let cluster=0;cluster<4;cluster++){
      const angle=cluster*Math.PI/2+.25,cx=site.x+Math.cos(angle)*site.radius*.45,cy=site.y+Math.sin(angle)*site.radius*.4;
      for(let n=0;n<6;n++){
        const x=cx+(rand()-.5)*115,y=cy+(rand()-.5)*90;if(pathDistance(x,y)<29||waterAt(x,y)||lavaAt(x,y)||biomeAt(x,y)!==site.biome)continue;
        const resource=site.evidence[(cluster+n)%site.evidence.length];if(propsNear(world,x,y,18).some(p=>p.solid&&dist(p,{x,y})<p.solid+10))continue;
        scenery(resource,x,y,{site:site.id});
      }
    }
    const place=EXPANSION_PLACES.find(p=>p.id===site.id);
    scenery('trailmarker',site.x+27,site.y-18,{solid:0});
    interactables.push({id:`lore-${site.id}`,kind:'lore',name:place.name,x:site.x+21,y:site.y+2,text:place.description});
  }
  // Ponds have mineral lips and the same reeds carried in Cuphorns' horns.
  for(const pool of WATER_PATCHES){
    const b=biomeAt(pool.x,pool.y);for(let n=0;n<7;n++){
      const a=n*Math.PI*2/7,x=pool.x+Math.cos(a)*(pool.rx+12),y=pool.y+Math.sin(a)*(pool.ry+12);
      if(pathDistance(x,y)<25||!free(x,y,2))continue;
      scenery(b==='winter'?'mineralfungus':n%3?'reedpatch':'mineralbowl',x,y);
    }
  }
  const campPeople={redleaf:['Neris','Seed couriers take the eastern road. The Cuphorns carry pond plants farther than any cart.'],snowwatch:['Orren','The broad-backed swimmers keep tunnels beneath the snow. Follow the resonators south; keep clear of the tapping.'],floodblossom:['Sela','Every roof here began as a seed carried out of the northern groves. Leave a few flowers for the couriers with wings.'],'pilgrim-hearth':['Tal','West is the old burial road. South lies deep snow. Rest here before you choose.']};
  for(const camp of CAMP_SITES){
    const {x,y}=camp;
    scenery(camp.biome==='winter'?'couriercanopy':'willowshelter',x-67,y-45,{building:true,label:camp.name});
    if(camp.id==='floodblossom'||camp.id==='redleaf')scenery('herbalistshack',x+80,y-57,{building:true});
    scenery('stonecamp',x+3,y+30);scenery('woodpile',x-34,y+26);scenery('restbench',x+42,y+10);scenery('lanternpost',x-30,y-10);scenery('seedbaskets',x+61,y-7);scenery('waterskins',x-47,y+13);
    scenery('shrine',x+15,y+83,{label:`${camp.name} hearth`});
    const [name,dialogue]=campPeople[camp.id];interactables.push({id:`npc-${camp.id}`,kind:'npc',name,dialogue,sprite:camp.biome==='winter'?37:36,size:33,x:x-15,y:y-25});
    interactables.push({id:`hearth-${camp.id}`,kind:'hearth',name:`${camp.name} hearth`,x:x+15,y:y+101});
    interactables.push({id:`market-${camp.id}`,kind:'market',name:`${camp.name} supplies`,x:x+64,y:y+12});
  }
  function spawnAt(type,x,y,extra={}){
    const def=MORE_SPECIES[type]||SPECIES[type];if(!def)return false;
    if(!free(x,y,8)||inVillage({x,y})||def.habitat!=='seam'&&biomeAt(x,y)!==def.habitat||creatures.some(c=>dist(c,{x,y})<30))return false;
    const visual=CREATURE_VARIANTS[type]?.[0];creatures.push({id:`creature-${creatures.length}`,type,x,y,homeX:x,homeY:y,phase:rand()*6.28,...(visual?{visual:{atlas:visual.atlas,sprite:visual.sprite}}:{}),...(type==='ventback'?{nest:true}:{}),...extra});return true;
  }
  function community(type,site,count){
    for(let n=0;n<count;n++)for(let attempt=0;attempt<70;attempt++){
      const a=rand()*Math.PI*2,r=55+rand()*site.radius*.8,x=site.x+Math.cos(a)*r,y=site.y+Math.sin(a)*r;
      if(spawnAt(type,x,y,{site:site.id,resourceSite:{x:site.x,y:site.y}}))break;
    }
  }
  for(const site of REGION_SITES){for(const type of site.species)community(type,site,3);for(const type of site.threats)community(type,site,type==='broodling'?1:2);}
  // Familiar species have regional drawings and useful companions along the long roads.
  community('barkjaw',{id:'east-grazers',x:3940,y:870,radius:290},5);
  community('rootknife',{id:'east-grazers',x:3970,y:960,radius:230},2);
  community('mantleback',{id:'redleaf-woods',x:2820,y:600,radius:270},5);
  community('scavenger',{id:'cold-border',x:5020,y:2560,radius:80},4);
  for(const c of creatures)if(c.type==='scavenger'&&c.visual){c.cold=.8;c.warm=.8;c.crossing={x:5020,y:2560};}
  for(const place of EXPANSION_PLACES){
    for(let n=0;n<4;n++){
      const x=place.x+(rand()-.5)*420,y=place.y+(rand()-.5)*360;if(!free(x,y,3)||inVillage({x,y}))continue;
      interactables.push({id:`herb-${place.id}-${n}`,kind:'herb',name:biomeAt(x,y)==='winter'?'Snowbell sprig':'Lantern orchid',x,y});
    }
  }
  for(let n=0;n<230;n++){
    const x=100+rand()*(CORE_SIZE.width-200),y=120+rand()*(CORE_SIZE.height-240);if(x<LEGACY_WIDTH&&y<LEGACY_HEIGHT||!free(x,y,2))continue;
    const b=biomeAt(x,y),sprite=b==='winter'?pick([50,55]):b==='ember'?54:pick([48,49,51,52,53]);ambient.push({x,y,sprite,phase:rand()*6.28});
  }
  // The continuation of a maintained road cannot be blocked by a random tree.
  for(const p of props)if(!p.label&&!p.building&&!p.blockage&&p.solid&&distanceToPaths(p.x,p.y,EXPANSION_PATHS)<p.solid+12)p.removed=true;
}

const spatialCache=new WeakMap(),CELL=160;
function sceneryIndex(world){
  let index=spatialCache.get(world);
  if(!index||index.props!==world.props||world.props.length<index.length){index={props:world.props,length:0,buckets:new Map(),maxSolid:0};spatialCache.set(world,index);}
  // World generation appends props; test arenas may replace the entire array.
  for(let i=index.length;i<world.props.length;i++){
    const p=world.props[i],key=`${Math.floor(p.x/CELL)},${Math.floor(p.y/CELL)}`;
    if(!index.buckets.has(key))index.buckets.set(key,[]);index.buckets.get(key).push(p);index.maxSolid=Math.max(index.maxSolid,p.solid||0);
  }
  index.length=world.props.length;return index;
}
export function propsNear(world,x,y,r=80){
  const index=sceneryIndex(world),out=[];
  for(let cx=Math.floor((x-r)/CELL);cx<=Math.floor((x+r)/CELL);cx++)for(let cy=Math.floor((y-r)/CELL);cy<=Math.floor((y+r)/CELL);cy++){
    const list=index.buckets.get(`${cx},${cy}`);if(list)for(const p of list)if(Math.abs(p.x-x)<=r&&Math.abs(p.y-y)<=r)out.push(p);
  }
  return out;
}
export function movingCoverNear(world,x,y,r=80){
  if(!world.rootwallLive||world.rootwallActors?.()!==world.rootwallSource)return [];
  const out=[];
  for(const g of world.rootwallGroups||[]){
    if(Math.min(Math.hypot(x-g.a.x,y-g.a.y),Math.hypot(x-g.b.x,y-g.b.y))>r+500)continue;
    for(const c of g.members)if(!c.dead&&world.rootwallActive.has(c)&&Math.abs(c.x-x)<=r+c.solid&&Math.abs(c.y-y)<=r+c.solid)out.push(c);
  }
  return out;
}
export function canWalk(world,x,y,r=8,ignore=null){
  if(x<MIN_X+30||y<MIN_Y+40||x>MAX_X-30||y>MAX_Y-30||waterAt(x,y)||lavaAt(x,y))return false;
  for(const p of propsNear(world,x,y,sceneryIndex(world).maxSolid+r)){if(!p.solid||p.removed)continue;if(Math.hypot((x-p.x),(y-p.y)*1.4)<p.solid+r)return false;}
  for(const c of movingCoverNear(world,x,y,r+20))if(c!==ignore&&Math.hypot(x-c.x,y-c.y)<c.solid+r-.001)return false;
  for(const wall of world.barriers||[])if(wall.life>0&&segmentDistance(x,y,wall.a,wall.b)<r+6)return false;
  return true;
}
export function moveBody(world,body,dx,dy,r=8){
  // Substeps keep high-speed movement and Mothstep from tunneling through roots.
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/4));
  for(let i=0;i<steps;i++){if(canWalk(world,body.x+dx/steps,body.y,r,body))body.x+=dx/steps;if(canWalk(world,body.x,body.y+dy/steps,r,body))body.y+=dy/steps;}
}
export function lineClear(world,a,b,margin=8,ignore=null){
  const d=dist(a,b),radius=Math.max(Math.abs(b.x-a.x),Math.abs(b.y-a.y))/2+sceneryIndex(world).maxSolid,candidates=propsNear(world,(a.x+b.x)/2,(a.y+b.y)/2,radius).filter(p=>p.solid&&!p.removed);
  const moving=movingCoverNear(world,(a.x+b.x)/2,(a.y+b.y)/2,radius).filter(c=>c!==a&&c!==b&&c!==ignore);
  for(let i=0;i<=d;i+=4){const t=d?i/d:0,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;if(i>=margin&&i<=d-margin&&(candidates.some(p=>Math.hypot(x-p.x,(y-p.y)*1.4)<p.solid)||moving.some(c=>Math.hypot(x-c.x,y-c.y)<c.solid)))return false;if((world.barriers||[]).some(w=>w.life>0&&segmentDistance(x,y,w.a,w.b)<7))return false;}return true;
}
