// Ten times the 6000 × 4200 pre-RPG landscape, measured in playable area.
export const WORLD_SIZE={width:20000,height:12600,baselineArea:6000*4200};
export const CORE_SIZE={width:7200,height:4800};
const districts=[
  ['longbriar','Longbriar Forest',9000,1800,'spring',7,'Elowen'],
  ['ambermarch','The Amber March',13000,1800,'autumn',10,'Hesta'],
  ['sunken-cinders','Sunken Cinders',17500,1800,'ember',14,'Cairn'],
  ['mossway','The Long Mossway',1800,6500,'spring',5,'Fern'],
  ['redwood','Redwood Pilgrim Trail',4800,6500,'autumn',7,'Orla'],
  ['bellwood','Bellwood Expanse',9000,5800,'spring',9,'Iven'],
  ['ash-corridor','The Ash Corridor',13000,5800,'ember',12,'Soot'],
  ['rime-forest','The Rime Forest',17500,5800,'winter',16,'Edda'],
  ['southern-canopy','The Southern Canopy',1800,10500,'spring',8,'Tansy'],
  ['burial-road','The Long Burial Road',4800,10500,'autumn',10,'Yarrow'],
  ['winter-pilgrimage','Winter Pilgrimage',9000,10300,'winter',12,'Brann'],
  ['ember-deeps','The Ember Deeps',13000,10300,'ember',15,'Cressa'],
  ['lastwood','Lastwood',17500,10300,'winter',18,'Vale'],
];
const threats={spring:['seedling','rootknife','petalmaw'],autumn:['prowler','duskcoil','prowler'],winter:['stormbell','tappinghunter','stormbell'],ember:['wyrm','glassbrood','wyrm']};
export const FRONTIER_DISTRICTS=districts.map(([id,name,x,y,biome,level,keeper])=>({
  id,name,x,y,biome,level,keeper,kind:biome==='autumn'?'burial-mounds':'forest-trail',
  hub:{x:x-1000,y:y+650},
  camps:[
    {id:`${id}-approach`,name:`${name}: the Approach`,x:x-400,y:y-450,level:level-1,types:[threats[biome][0],threats[biome][1],threats[biome][0]]},
    {id:`${id}-heart`,name:`${name}: the Heart`,x:x+500,y:y-300,level,types:[threats[biome][1],threats[biome][2],threats[biome][1]]},
    {id:`${id}-warden`,name:`${name}: the Warden`,x:x+800,y:y+600,level:level+1,types:[threats[biome][2],threats[biome][1],threats[biome][0]],elite:true},
  ],
}));
export const inFrontier=(x,y)=>x>=CORE_SIZE.width||y>=CORE_SIZE.height;
export function frontierAt(x,y){
  let nearest=null,best=Infinity;
  // Broad domains have gently irregular seams, shared by trees and wildlife.
  const wx=x+Math.sin(y*.0013)*100,wy=y+Math.sin(x*.0011)*90;
  for(const d of FRONTIER_DISTRICTS){const distance=(wx-d.x)**2+(wy-d.y)**2;if(distance<best){best=distance;nearest=d;}}
  return nearest;
}
export const FRONTIER_CAMPS=FRONTIER_DISTRICTS.map(d=>({id:`refuge-${d.id}`,name:`${d.name} Refuge`,...d.hub,biome:d.biome,level:d.level,radius:145,keeper:d.keeper}));
export const FRONTIER_PLACES=FRONTIER_DISTRICTS.flatMap(d=>[
  {id:`refuge-${d.id}`,name:`${d.name} Refuge`,...d.hub,biome:d.biome,description:`A sheltered supply stop on the level ${d.level} road. ${d.keeper} keeps the fire and the local bounty board.`},
  {id:`landmark-${d.id}`,name:d.name,x:d.x,y:d.y,biome:d.biome,description:`A long forest expedition: three named hunting grounds, roadside patrols, and an elite warden. Return to ${d.keeper} for the road bounty.`},
]);
export const FRONTIER_LOOPS=FRONTIER_DISTRICTS.map(d=>[
  d.hub,{x:d.x-650,y:d.y+150},d.camps[0],{x:d.x+150,y:d.y-650},d.camps[1],
  {x:d.x+1000,y:d.y+150},d.camps[2],{x:d.x+200,y:d.y+900},d.hub,
]);
// Connect every refuge to the main road network; loops offer a way home.
const hubs=Object.fromEntries(FRONTIER_DISTRICTS.map(d=>[d.id,d.hub]));
const links=[
  [{x:6910,y:950},hubs.longbriar],
  [{x:1030,y:3620},{x:1500,y:4300},hubs.mossway],
  [{x:4330,y:3530},{x:4800,y:4300},hubs.redwood],
  [hubs.longbriar,hubs.ambermarch,hubs['sunken-cinders']],
  [hubs.mossway,hubs.redwood,hubs.bellwood,hubs['ash-corridor'],hubs['rime-forest']],
  [hubs['southern-canopy'],hubs['burial-road'],hubs['winter-pilgrimage'],hubs['ember-deeps'],hubs.lastwood],
  [hubs.longbriar,hubs.bellwood,hubs['winter-pilgrimage']],
  [hubs.ambermarch,hubs['ash-corridor'],hubs['ember-deeps']],
  [hubs['sunken-cinders'],hubs['rime-forest'],hubs.lastwood],
  [hubs.mossway,hubs['southern-canopy']],
  [hubs.redwood,hubs['burial-road']],
];
export const FRONTIER_PATHS=[...links,...FRONTIER_LOOPS];
export const FRONTIER_REWARDS=Object.fromEntries(FRONTIER_DISTRICTS.map((d,index)=>{
  const slot=['weapon','robe','charm','boots'][index%4],level=d.level;
  const stats=slot==='weapon'?{power:level*.1,damage:level+2}:slot==='robe'?{health:level*8,armor:Math.min(.4,level*.022)}:slot==='charm'?{power:level*.045,mana:level*5,regen:2}: {speed:Math.min(.4,.15+level*.012),health:level*3};
  const description=Object.entries(stats).map(([key,v])=>`${key==='power'||key==='armor'||key==='speed'?Math.round(v*100)+'%':v} ${key}`).join(' · ');
  return [`relic-${d.id}`,{name:`${d.name} ${slot==='weapon'?'heartwood':slot==='robe'?'mantle':slot==='charm'?'keystone':'boots'}`,slot,stats,description}];
}));
export const FRONTIER_HUNTS=FRONTIER_DISTRICTS.map(d=>({
  id:`road-${d.id}`,title:`Open ${d.name}`,giver:d.keeper,level:d.level,
  requires:d.level<8?'briar-road':d.level<12?'redleaf-road':d.level<15?'cinder-road':'crown-road',
  xp:80+d.level*25,coins:40+d.level*12,item:`relic-${d.id}`,camps:d.camps,
  detail:`From ${d.name} Refuge, follow the winding forest loop through the Approach, Heart and Warden. Clear all three camps and return to ${d.keeper}. Rest and resupply at the refuge between expeditions.`,
}));
