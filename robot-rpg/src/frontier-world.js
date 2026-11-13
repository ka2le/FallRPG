import { FRONTIER_DISTRICTS, FRONTIER_CAMPS, FRONTIER_HABITATS, inFrontier } from './frontier.js';
import { TREE_FAMILIES, WILDS_ASSETS } from './environment-catalog.js';
import { FRONTIER_LANDSCAPES, frontierLandscapeAt } from './frontier-landscape.js';

const landscapeResources={
  'deep-grove':['hollowrootarch','resinroots','fernclump','fallenwillow','nectarstump','anthill'],
  'flower-meadow':['crownbloom','lanternorchids','crownbloom','fernclump','browsedbranch','pebbleheap'],
  'reed-marsh':['reedpatch','pondplants','reedpatch','fernclump','mossrock','fallenwillow','lanternorchids','pondplants','mineralbowl'],
  'stone-rise':['limestoneledge','splitrock','brokensteps','pebbleheap','mossrock','fernclump'],
  'amber-grove':['amberlog','shelffungi','sourheartsap','leafbank','purplefungi','browsedbranch'],
  'fern-glade':['leafbank','purplefungi','memoryfungus','fernclump','pebbleheap','shelffungi'],
  'mire-garden':['sinkingroots','reedpatch','purplefungi','pondplants','amberlog','leafbank'],
  'burial-mounds':['burialmound','tombstone','oldbonearch','memoryfungus','leafbank','sinkingroots'],
  'fir-thicket':['frozensmallcache','snowrock','snowkeeltunnel','snowbell','whitebraidpatch','mineralfungus'],
  'snowfield':['snowbell','whitebraidpatch','snowkeeltunnel','snowbell','pebbleheap','mineralfungus'],
  'ice-pools':['iceledge','mineralfungus','snowbell','snowrock','whitebraidpatch','frozensmallcache'],
  'frost-ridge':['snowrock','iceledge','frozenlargecache','pebbleheap','mineralfungus','snowbell'],
  'charred-grove':['charredlog','amberfungus','broodeggs','mossyplate','basaltledge','warmnest'],
  'ash-meadow':['warmnest','amberfungus','mossyplate','pebbleheap','meltwaterbowl','charredlog'],
  'meltwater-garden':['meltwaterbowl','reedpatch','pondplants','reedpatch','amberfungus','mossyplate','mineralbowl'],
  'basalt-rise':['basaltledge','mineralspires','pebbleheap','mossyplate','charredlog','basaltledge','amberfungus','ventchimney'],
};

export function populateFrontier(world,add,api){
  const {MIN_X,MIN_Y,MAX_X,MAX_Y,random,noise,biomeAt,pathDistance,canWalk,propsNear,inVillage}=api;
  const rng=random(611021),pick=list=>list[Math.floor(rng()*list.length)];
  const put=(asset,x,y,extra={})=>{
    const solid=extra.solid??asset.solid;
    if(solid&&world.creatures.some(c=>Math.hypot(c.x-x,(c.y-y)*1.4)<solid+12))return null;
    return add(0,x,y,asset.size,{...asset,...extra});
  };
  // Jittered groves, open browsing pockets and a separate low layer. The sampling
  // grid is invisible: trees bunch around resources instead of occupying one slot.
  for(let cy=MIN_Y+80;cy<MAX_Y-80;cy+=72)for(let cx=MIN_X+80;cx<MAX_X-80;cx+=72){
    if(!inFrontier(cx,cy))continue;
    const x=cx+(rng()-.5)*90,y=cy+(rng()-.5)*90,b=biomeAt(x,y),pd=pathDistance(x,y);
    if(!inFrontier(x,y)||inVillage({x,y})||FRONTIER_DISTRICTS.some(d=>Math.hypot(d.x-x,d.y-y)<65)||!canWalk(world,x,y,4))continue;
    const land=frontierLandscapeAt(x,y),cover=noise(x+174,y-31,270)*.7+noise(x-91,y+77,85)*.3;
    if(pd>38&&cover>.27&&rng()<.9*land.cover&&!propsNear(world,x,y,36).some(p=>p.solid&&Math.hypot(p.x-x,p.y-y)<33)){
      const family=pick(land.families),asset=pick(TREE_FAMILIES[family]);
      put(asset,x,y,{family,size:Math.round(asset.size*(.85+rng()*.35)),flip:rng()<.5});
      if(cover>.58&&land.cover>.8){const gx=x+35,gy=y-26;if(biomeAt(gx,gy)===b&&pathDistance(gx,gy)>42&&canWalk(world,gx,gy,12))put(pick(TREE_FAMILIES[family]),gx,gy,{family,flip:rng()<.5});}
    }
    const dx=x+27,dy=y+30;
    if(pathDistance(dx,dy)>27&&rng()<.35+noise(x+91,y-54,110)*.65&&canWalk(world,dx,dy,3)){
      const name=pick(landscapeResources[land.kind]),asset=WILDS_ASSETS[name];put(asset,dx,dy,{vegetation:!asset.solid,resource:name,flip:rng()<.5});
      // Open land replaces canopy with flowers, reeds and feeding evidence.
      if(land.cover<.55&&noise(x+44,y,90)>.6){const lx=x-23,ly=y+10,name=pick(landscapeResources[land.kind]),asset=WILDS_ASSETS[name];if(!asset.solid&&pathDistance(lx,ly)>27&&canWalk(world,lx,ly,3))put(asset,lx,ly,{vegetation:true,resource:name,flip:rng()<.5});}
    }
    if(rng()<.045&&canWalk(world,x+35,y-20,2))world.ambient.push({x:x+35,y:y-20,sprite:b==='winter'?50:b==='ember'?54:pick([48,49,51,52,53]),phase:rng()*6.28});
  }
  // Ecological landmarks give every expedition something to discover between
  // fights: tended ponds, fog webs, feeding terraces, caches and warm nurseries.
  const evidence={
    'pond-garden':['reedpatch','mineralbowl','pondplants'], 'fog-garden':['fogwebframe','dewcatchergarden','lanternorchids'],
    'burrow-ridges':['limestoneledge','hollowrootarch','fernclump'], 'burial-mounds':['burialmound','tombstone','memoryfungus'],
    'corpse-garden':['corpseribs','shelffungi','oldbonearch'], 'feeding-terrace':['leafbank','amberlog','sinkingroots'],
    'frozen-larder':['frozenlargecache','frozensmallcache','iceledge'], 'snowbell-garden':['snowbell','snowkeeltunnel','whitebraidpatch'],
    'cold-garden':['mineralfungus','snowrock','whitebraidpatch'], 'mineral-pool':['mineralspires','meltwaterbowl','basaltledge'],
    'vent-nursery':['ventchimney','warmnest','broodeggs'], 'ash-garden':['charredlog','amberfungus','mossyplate'],
  };
  const residents={spring:['cuphorn','sapdrinker','ridgeback'],autumn:['burialstag','corpseborer','uphillcarrier'],winter:['cachefinder','snowgrazer','coldgarden'],ember:['ventback','ventback','ventback']};
  for(const site of FRONTIER_HABITATS){
    for(let n=0;n<24;n++){
      const angle=n*2.4+site.phase,r=site.radius*(.5+rng()*.65),x=site.x+Math.cos(angle)*r,y=site.y+Math.sin(angle)*r*.8;
      if(biomeAt(x,y)!==site.biome||pathDistance(x,y)<32||inVillage({x,y})||FRONTIER_DISTRICTS.some(d=>Math.hypot(d.x-x,d.y-y)<65)||!canWalk(world,x,y,12))continue;
      const name=pick(evidence[site.kind]);put(WILDS_ASSETS[name],x,y,{site:site.id,resource:name,flip:rng()<.5});
    }
    for(let n=0;n<3;n++)for(let attempt=0;attempt<40;attempt++){
      const angle=rng()*Math.PI*2,r=site.radius*(.8+rng()*.6),x=site.x+Math.cos(angle)*r,y=site.y+Math.sin(angle)*r;
      if(biomeAt(x,y)!==site.biome||inVillage({x,y})||!canWalk(world,x,y,8)||world.creatures.some(c=>Math.hypot(c.x-x,c.y-y)<24))continue;
      const type=residents[site.biome][n];world.creatures.push({id:`habitat-${site.id}-${n}`,type,x,y,homeX:x,homeY:y,phase:rng()*6.28,frontier:true,site:site.id,...(type==='ventback'?{nest:true}:{})});break;
    }
  }
  // Refuges remain small islands of safety separated by real travel distances.
  for(const camp of FRONTIER_CAMPS){
    const {x,y}=camp;
    const building=(asset,offset,extra={})=>{for(let n=0;n<120;n++){
      const angle=offset+n*2.4,r=n<72?125:190,bx=x+Math.cos(angle)*r,by=y+Math.sin(angle)*r;
      if(pathDistance(bx,by)<asset.solid+30||!canWalk(world,bx,by,asset.solid+12))continue;
      return put(asset,bx,by,{building:true,...extra});
    }};
    building(WILDS_ASSETS.willowshelter,2,{label:camp.name});
    building(WILDS_ASSETS.herbalistshack,0);
    put(WILDS_ASSETS.stonecamp,x,y+24);put(WILDS_ASSETS.woodpile,x-38,y+22);
    put(WILDS_ASSETS.shrine,x+20,y+70,{solid:0,label:`${camp.name} hearth`});
    put(WILDS_ASSETS.lanternpost,x+52,y-40,{solid:0});
    world.interactables.push(
      {id:`npc-${camp.id}`,kind:'npc',name:camp.keeper,dialogue:`You have reached ${camp.name}. This is a level ${camp.level} expedition. The forest road circles through three hunting grounds. Rest here and carry enough tonics; patrols gather along the trail. I pay the local road bounty.`,sprite:camp.biome==='winter'?37:36,size:33,x:x-15,y:y-25},
      {id:`hearth-${camp.id}`,kind:'hearth',name:`${camp.name} hearth`,x:x+20,y:y+92},
      {id:`market-${camp.id}`,kind:'market',name:`${camp.name} supplies`,x:x+70,y:y-20},
    );
  }
  const neutral={spring:['barkjaw','cuphorn','alarmcaller','sapdrinker','ridgeback'],autumn:['mantleback','burialstag','corpseborer','uphillcarrier','scentthief'],winter:['antler','snowkeel','snowgrazer','cachefinder','coldgarden'],ember:['ventback','ventback']};
  const threats={spring:['seedling','rootknife','petalmaw','grovefang','veilspinner'],autumn:['prowler','duskcoil','broodling'],winter:['stormbell','tappinghunter'],ember:['wyrm','glassbrood']};
  // Give the spaces between named destinations their own readable resource
  // clusters and residents, rather than reserving all activity for district hubs.
  for(const site of FRONTIER_LANDSCAPES){
    if(!inFrontier(site.x,site.y)||site.x<MIN_X+180||site.x>MAX_X-180||site.y<MIN_Y+180||site.y>MAX_Y-180)continue;
    const land=frontierLandscapeAt(site.x,site.y);if(land.authored||land.id!==site.id)continue;
    for(let n=0;n<16;n++){
      const angle=n*2.4+site.phase,r=site.water||site.lava?site.radius*(1.2+rng()*.45):35+rng()*125,x=site.x+Math.cos(angle)*r,y=site.y+Math.sin(angle)*r;
      if(biomeAt(x,y)!==site.biome||inVillage({x,y})||pathDistance(x,y)<34||!canWalk(world,x,y,14))continue;
      const name=pick(landscapeResources[site.kind]);put(WILDS_ASSETS[name],x,y,{landscape:site.id,resource:name,flip:rng()<.5});
    }
    for(let n=0;n<2;n++)for(let attempt=0;attempt<30;attempt++){
      const angle=rng()*Math.PI*2,r=site.radius+30+rng()*90,x=site.x+Math.cos(angle)*r,y=site.y+Math.sin(angle)*r;
      if(biomeAt(x,y)!==site.biome||inVillage({x,y})||!canWalk(world,x,y,8)||world.creatures.some(c=>Math.hypot(c.x-x,c.y-y)<24))continue;
      const type=pick(neutral[site.biome]);world.creatures.push({id:`${site.id}-resident-${n}`,type,x,y,homeX:x,homeY:y,phase:rng()*6.28,frontier:true,landscape:site.id,...(type==='ventback'?{nest:true}:{})});break;
    }
  }
  for(let cy=MIN_Y+210;cy<MAX_Y-100;cy+=350)for(let cx=MIN_X+210;cx<MAX_X-100;cx+=350){
    if(!inFrontier(cx,cy)||rng()>.8)continue;
    const b=biomeAt(cx,cy),peaceful=rng()<.46,type=pick((peaceful?neutral:threats)[b]);
    for(let n=0;n<3;n++){
      const x=cx+(rng()-.5)*100,y=cy+(rng()-.5)*90;
      if(!inFrontier(x,y)||biomeAt(x,y)!==b||inVillage({x,y})||pathDistance(x,y)<55||!canWalk(world,x,y,8))continue;
      world.creatures.push({id:`frontier-${cx}-${cy}-${n}`,type,x,y,homeX:x,homeY:y,phase:rng()*6.28,...(type==='ventback'?{nest:true}:{}),frontier:true});
    }
    if(canWalk(world,cx+55,cy+35,3)&&!inVillage({x:cx+55,y:cy+35}))world.interactables.push({id:`sprig-${cx}-${cy}`,kind:'herb',name:b==='winter'?'Snowbell sprig':'Lantern orchid',x:cx+55,y:cy+35});
  }
}
