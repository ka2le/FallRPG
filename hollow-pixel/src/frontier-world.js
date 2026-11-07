import { FRONTIER_DISTRICTS, FRONTIER_CAMPS, inFrontier } from './frontier.js';
import { TREE_FAMILIES, SEASONAL_TREES, DECORATION_POOLS, WILDS_ASSETS } from './environment-catalog.js';

export function populateFrontier(world,add,api){
  const {WIDTH,HEIGHT,random,noise,biomeAt,pathDistance,canWalk,propsNear,inVillage}=api;
  const rng=random(611021),pick=list=>list[Math.floor(rng()*list.length)];
  const put=(asset,x,y,extra={})=>add(0,x,y,asset.size,{...asset,...extra});
  // Fixed-sized cells keep the forest and ground layers just as dense when
  // the land area grows. No giant empty border and no enlarged sprite spacing.
  for(let cy=80;cy<HEIGHT-80;cy+=84)for(let cx=80;cx<WIDTH-80;cx+=84){
    if(!inFrontier(cx,cy))continue;
    const x=cx+(rng()-.5)*55,y=cy+(rng()-.5)*55,b=biomeAt(x,y),pd=pathDistance(x,y);
    if(!inFrontier(x,y)||inVillage({x,y})||FRONTIER_DISTRICTS.some(d=>Math.hypot(d.x-x,d.y-y)<65)||!canWalk(world,x,y,4))continue;
    const cover=noise(x+174,y-31,250);
    if(pd>38&&cover>.22&&rng()<.88&&!propsNear(world,x,y,36).some(p=>p.solid&&Math.hypot(p.x-x,p.y-y)<33)){
      const family=pick(SEASONAL_TREES[b]),asset=pick(TREE_FAMILIES[family]);
      put(asset,x,y,{family,size:Math.round(asset.size*(.85+rng()*.35)),flip:rng()<.5});
    }
    const dx=x+27,dy=y+30;
    if(pathDistance(dx,dy)>27&&rng()<.87&&canWalk(world,dx,dy,3)){
      const asset=pick(DECORATION_POOLS[b]);put(asset,dx,dy,{vegetation:!asset.solid,resource:asset.name,flip:rng()<.5});
    }
    if((cx+cy)%7===0&&rng()<.25&&canWalk(world,x+35,y-20,2))world.ambient.push({x:x+35,y:y-20,sprite:b==='winter'?50:b==='ember'?54:pick([48,49,51,52,53]),phase:rng()*6.28});
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
  const neutral={spring:['barkjaw','barkjaw'],autumn:['mantleback','mantleback'],winter:['antler','snowkeel'],ember:['ventback','ventback']};
  const threats={spring:['seedling','rootknife','petalmaw'],autumn:['prowler','duskcoil'],winter:['stormbell','tappinghunter'],ember:['wyrm','glassbrood']};
  for(let cy=210;cy<HEIGHT-100;cy+=350)for(let cx=210;cx<WIDTH-100;cx+=350){
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
