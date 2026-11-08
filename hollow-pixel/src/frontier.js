// Ten times the 6000 × 4200 pre-RPG landscape, measured in playable area.
export const WORLD_SIZE={width:20000,height:12600,baselineArea:6000*4200};
// Keep the first chapter's coordinates (and saves), grow outward around its hearth.
export const WORLD_BOUNDS={minX:-8920,minY:-5445,maxX:11080,maxY:7155};
export const CORE_SIZE={width:7200,height:4800};
const districts=[
  ['longbriar','Longbriar Forest',9000,1800,'spring',7,'Elowen'],
  ['ambermarch','The Amber March',8600,-1800,'autumn',10,'Hesta'],
  ['sunken-cinders','Sunken Cinders',5300,-3800,'ember',14,'Cairn'],
  ['mossway','The Long Mossway',-1500,1000,'spring',5,'Fern'],
  ['redwood','Redwood Pilgrim Trail',-3500,3800,'autumn',7,'Orla'],
  ['bellwood','Bellwood Expanse',-1400,-1800,'spring',9,'Iven'],
  ['ash-corridor','The Ash Corridor',1300,-3600,'ember',12,'Soot'],
  ['rime-forest','The Rime Forest',-4700,-3100,'winter',16,'Edda'],
  ['southern-canopy','The Southern Canopy',-5200,600,'spring',8,'Tansy'],
  ['burial-road','The Long Burial Road',-6900,3600,'autumn',10,'Yarrow'],
  ['winter-pilgrimage','Winter Pilgrimage',-7200,-1700,'winter',12,'Brann'],
  ['ember-deeps','The Ember Deeps',3000,5900,'ember',15,'Cressa'],
  ['lastwood','Lastwood',8800,5500,'winter',18,'Vale'],
];
const threats={spring:['seedling','rootknife','petalmaw'],autumn:['prowler','duskcoil','prowler'],winter:['stormbell','tappinghunter','stormbell'],ember:['wyrm','glassbrood','wyrm']};
// Orient each expedition independently; winding paths join its hunting grounds.
export const FRONTIER_DISTRICTS=districts.map(([id,name,x,y,biome,level,keeper],index)=>{
 const angle=[.15,-.4,.32,-.22,.5,-.3,.25,-.5,.18,-.25,.4,-.12,.3][index];
 const local=(dx,dy)=>({x:x+Math.round(dx*Math.cos(angle)-dy*Math.sin(angle)),y:y+Math.round(dx*Math.sin(angle)+dy*Math.cos(angle))});
 return {
  id,name,x,y,biome,level,keeper,kind:biome==='autumn'?'burial-mounds':'forest-trail',
  local,hub:local(-850,520),
  camps:[
    {id:`${id}-approach`,name:`${name}: the Approach`,...local(-400,-450),level:level-1,types:[threats[biome][0],threats[biome][1],threats[biome][0]]},
    {id:`${id}-heart`,name:`${name}: the Heart`,...local(500,-300),level,types:[threats[biome][1],threats[biome][2],threats[biome][1]]},
    {id:`${id}-warden`,name:`${name}: the Warden`,...local(800,600),level:level+1,types:[threats[biome][2],threats[biome][1],threats[biome][0]],elite:true},
  ],
};});
export function inFrontier(x,y){
  if(x>=0&&y>=0&&x<2400&&y<1800)return false;
  // Scalloped woodland margins hide the original rectangular map boundary.
  const west=80+Math.sin(y*.0021)*65,north=70+Math.sin(x*.0018)*55;
  const east=6900+Math.sin(y*.0017)*170+Math.sin(y*.0043)*70;
  const south=4480+Math.sin(x*.0011)*180+Math.sin(x*.0033)*90;
  return x<west||y<north||x>=east||y>=south;
}
export function frontierAt(x,y){
  let nearest=null,best=Infinity;
  // Broad domains have gently irregular seams, shared by trees and wildlife.
  for(const d of FRONTIER_DISTRICTS)if((x-d.x)**2+(y-d.y)**2<1250**2)return d;
  const wx=x+Math.sin(y*.0013)*430+Math.sin(y*.0031)*160,wy=y+Math.sin(x*.0011)*380+Math.sin(x*.0027)*150;
  for(const d of FRONTIER_DISTRICTS){const distance=(wx-d.x)**2+(wy-d.y)**2;if(distance<best){best=distance;nearest=d;}}
  return nearest;
}
export const FRONTIER_CAMPS=FRONTIER_DISTRICTS.map(d=>({id:`refuge-${d.id}`,name:`${d.name} Refuge`,...d.hub,biome:d.biome,level:d.level,radius:145,keeper:d.keeper}));
export const FRONTIER_PLACES=FRONTIER_DISTRICTS.flatMap(d=>[
  {id:`refuge-${d.id}`,name:`${d.name} Refuge`,...d.hub,biome:d.biome,description:`A sheltered supply stop on the level ${d.level} road. ${d.keeper} keeps the fire and the local bounty board.`},
  {id:`landmark-${d.id}`,name:d.name,x:d.x,y:d.y,biome:d.biome,description:`A long forest expedition: three named hunting grounds, roadside patrols, and an elite warden. Return to ${d.keeper} for the road bounty.`},
]);
export const FRONTIER_LOOPS=FRONTIER_DISTRICTS.map(d=>[
  d.hub,d.local(-700,80),d.camps[0],d.local(40,-710),d.camps[1],
  d.local(960,40),d.camps[2],d.local(100,850),d.hub,
]);
// Connect every refuge to the main road network; loops offer a way home.
const hubs=Object.fromEntries(FRONTIER_DISTRICTS.map(d=>[d.id,d.hub]));
const links=[
  [{x:6910,y:950},hubs.longbriar],
  [{x:260,y:790},{x:-350,y:540},hubs.mossway],
  [{x:1120,y:160},{x:780,y:-420},hubs.bellwood],
  [{x:1030,y:3620},{x:1030,y:3760},{x:300,y:3850},{x:-450,y:3310},hubs.redwood],
  [{x:4330,y:3530},{x:4100,y:4900},hubs['ember-deeps']],
  [hubs.longbriar,hubs.ambermarch,hubs['sunken-cinders'],hubs['ash-corridor'],hubs.bellwood,hubs['rime-forest'],hubs['winter-pilgrimage']],
  [hubs.bellwood,hubs.mossway,hubs['southern-canopy'],hubs['winter-pilgrimage']],
  [hubs.mossway,hubs.redwood,hubs['burial-road'],hubs['southern-canopy']],
  [hubs['ember-deeps'],hubs.lastwood,hubs.longbriar],
];
// Smooth bends break up the old long horizontal/vertical road lattice.
function winding(path,seed){
 const result=[path[0]];
 for(let i=1;i<path.length;i++){
   const a=path[i-1],b=path[i],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),steps=Math.max(2,Math.ceil(length/240));
   for(let n=1;n<=steps;n++){
     const t=n/steps,bend=Math.sin(t*Math.PI)*Math.sin(seed*1.7+i*2.3)*Math.min(230,length*.14)+Math.sin(t*Math.PI*2)*Math.min(75,length*.045);
     result.push(n===steps?b:{x:a.x+dx*t-dy/length*bend,y:a.y+dy*t+dx/length*bend});
   }
 }return result;
}
export const FRONTIER_PATHS=[...links,...FRONTIER_LOOPS].map(winding);

const habitats={spring:['pond-garden','fog-garden','burrow-ridges'],autumn:['burial-mounds','corpse-garden','feeding-terrace'],winter:['frozen-larder','snowbell-garden','cold-garden'],ember:['mineral-pool','vent-nursery','ash-garden']};
export const FRONTIER_HABITATS=FRONTIER_DISTRICTS.flatMap((d,index)=>habitats[d.biome].map((kind,n)=>({
 id:`${d.id}-${kind}`,district:d.id,biome:d.biome,kind,...d.local([-170,630,-560][n],[-20,210,80][n]),radius:145+n*22,
 water:n===0&&d.biome==='spring',lava:n===0&&d.biome==='ember',phase:index*.7+n,
})));
export function frontierHabitatAt(x,y){return FRONTIER_HABITATS.find(s=>Math.hypot(x-s.x,y-s.y)<s.radius);}
export const FRONTIER_REWARDS=Object.fromEntries(FRONTIER_DISTRICTS.map((d,index)=>{
  const slot=['weapon','robe','charm','boots'][index%4],level=d.level;
  const stats=slot==='weapon'?{power:level*.028,damage:Math.ceil(level*.3)}:slot==='robe'?{health:level*6,armor:Math.min(.32,level*.018)}:slot==='charm'?{power:level*.014,mana:level*5,regen:2}: {speed:Math.min(.28,.12+level*.009),health:level*3};
  const description=Object.entries(stats).map(([key,v])=>`${key==='power'||key==='armor'||key==='speed'?Math.round(v*100)+'%':v} ${key}`).join(' · ');
  return [`relic-${d.id}`,{name:`${d.name} ${slot==='weapon'?'heartwood':slot==='robe'?'mantle':slot==='charm'?'keystone':'boots'}`,slot,stats,description}];
}));
export const FRONTIER_HUNTS=FRONTIER_DISTRICTS.map(d=>({
  id:`road-${d.id}`,title:`Open ${d.name}`,giver:d.keeper,level:d.level,
  requires:d.level<8?'briar-road':d.level<12?'redleaf-road':d.level<15?'cinder-road':'crown-road',
  xp:80+d.level*25,coins:40+d.level*12,item:`relic-${d.id}`,camps:d.camps,
  detail:`From ${d.name} Refuge, follow the winding forest loop through the Approach, Heart and Warden. Clear all three camps and return to ${d.keeper}. Rest and resupply at the refuge between expeditions.`,
}));
