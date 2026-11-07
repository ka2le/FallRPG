// Authored communities share these coordinates across terrain, ecology, and rendering.
// Seasons are fixed in space; geology is independent of the seasonal court.
export const HABITATS = [
  {id:'pasture',name:'The Giving Grove',x:-66,z:-34,r:28,level:2,color:'#d9dda0',types:['barkjaw','rootknife'],detail:'Paired Barkjaws keep the Giftwillows open. Watch the lookout before approaching the feeding animal.'},
  {id:'elder',name:'The Hungry Shelter',x:-107,z:-187,r:33,level:5,color:'#d5ac79',types:['rootknife'],detail:'An immense fallen Hollow Elder. Both ends and the broken side chambers are open; glowing roots warn before a strike.'},
  {id:'canopy',name:'The Living Rafters',x:-247,z:-264,r:35,level:7,color:'#b3d89c',types:['barkjaw'],detail:'Streams of Canopy Ants climb the ancient buttresses and reinforce the branching joints.'},
  {id:'seam',name:'The Thawline',x:258,z:319,r:36,level:8,color:'#b8e3e0',types:['snowkeel','ventback','scavenger'],detail:'Permanent winter meets hot basalt. Snowkeels follow buried fungus; Ventbacks guard warm, snow-roofed clutches. Scavengers need food on both sides.'},
  {id:'litter',name:'The Turning Orchard',x:127,z:239,r:29,level:6,color:'#e7b87b',types:['mantleback'],detail:'Mantlebacks turn the warm leaf beds. Their backs carry the fungi that digest their next meal.'},
  {id:'orchids',name:'Lanternwater Gardens',x:152,z:-42,r:24,level:4,color:'#a8e4bd',types:['barkjaw'],detail:'Luminous nectar chambers and giant water-loving Giftwillows shelter a quiet grazing refuge.'},
];
export const habitatById=id=>HABITATS.find(h=>h.id===id);
export function habitatAt(x,z){return HABITATS.find(h=>Math.hypot(x-h.x,z-h.z)<h.r)||null;}
export const SEASON_PATCHES=[
  {x:250,z:323,r:31,season:3},
  {x:153,z:-42,r:25,season:0},
  {x:-322,z:-105,r:23,season:2},
  {x:-178,z:74,r:21,season:0},
];
export const ECO_TREES=[
  {id:'gift-a',kind:'giftwillow',x:-75,z:-40,scale:1},
  {id:'gift-b',kind:'giftwillow',x:-57,z:-45,scale:.85},
  {id:'clasp-a',kind:'claspwood',x:-88,z:-27,scale:1},
  {id:'sour-a',kind:'sourheart',x:-50,z:-25,scale:.9},
  {id:'host-a',kind:'hollowhost',x:-72,z:-15,scale:.8},
  {id:'gift-c',kind:'giftwillow',x:148,z:-47,scale:1.5},
  {id:'gift-d',kind:'giftwillow',x:163,z:-33,scale:1.1},
  {id:'clasp-b',kind:'claspwood',x:-127,z:-168,scale:1.3},
  {id:'sour-b',kind:'sourheart',x:113,z:233,scale:1.3},
  {id:'host-b',kind:'hollowhost',x:142,z:247,scale:1.2},
];
export const HOLLOW={...habitatById('elder'),length:44,inner:7.5,outer:9.3};
export const CANOPY_TREES=[[-264,-276],[-234,-280],[-263,-250],[-231,-248]].map(([x,z],i)=>({x,z,height:48+i*5,radius:2.2+i*.2}));
export const THAWLINE={cold:{x:263,z:319},warm:{x:283,z:319},nest:{x:277,z:319}};
