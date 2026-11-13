import { HOME, MIN_X, MIN_Y, MAX_X, MAX_Y, canWalk, dist, hash, biomeAt, pathDistance, PATHS } from './world.js';
import { FRONTIER_CAMPS } from './frontier.js';
import { findRoute } from './navigation.js';

// About 10 world units per metre at the character's scale: twenty metres west.
export const FIRST_ROBOT_SPOT={x:HOME.x-200,y:HOME.y};
export const ROBOT_RADIUS=6;
export const ROBOT_STYLES=[
  {name:'Tinker',body:'#cfc09f',shade:'#94825f',head:'#e0d4b8',band:'#5f8f88',hat:true},
  {name:'Pip',body:'#e8e2d1',shade:'#bcb39d',head:'#efe9d9',band:'#d9a43a',slim:true},
  {name:'Clunk',body:'#c9b99b',shade:'#8c7b5f',head:'#d3c5a8',band:'#b8452d',wide:true},
  {name:'Rivet',body:'#bbb4a2',shade:'#7d7668',head:'#c7c0ae',band:'#6f7d3c',patch:true},
  {name:'Juniper',body:'#f0e5cc',shade:'#c4b08e',head:'#f4ebd7',band:'#7a4d6e'},
  {name:'Moss',body:'#e2dac4',shade:'#b2a78c',head:'#e6dfcb',band:'#6f8a3a',sprout:true},
];

export function robotRouteClear(world,a,b){
  const steps=Math.max(1,Math.ceil(dist(a,b)/4));
  for(let n=0;n<=steps;n++)if(!canWalk(world,a.x+(b.x-a.x)*n/steps,a.y+(b.y-a.y)*n/steps,ROBOT_RADIUS))return false;
  return true;
}

function leafPatch(world,bin,seed){
  const dock={x:bin.x,y:bin.y+30},leaves=[];
  if(!canWalk(world,dock.x,dock.y,12))return [];
  for(let n=0;n<210&&leaves.length<40;n++){
    const angle=hash(seed,n)*Math.PI*2,radius=36+hash(n,seed+73)*125;
    const point={x:Math.round(dock.x+Math.cos(angle)*radius),y:Math.round(dock.y+Math.sin(angle)*radius)};
    if(dist(point,bin)<34||!robotRouteClear(world,dock,point)||leaves.some(l=>dist(l,point)<9))continue;
    leaves.push({...point,id:`leaf-${seed}-${n}`,color:n%5,flip:n%2,readyAt:0,claimedBy:null});
  }
  return leaves;
}

export function attachRobots(world){
  if(world.robotColonies)return;
  world.robotColonies=[];world.robots=[];
  const candidates=[FIRST_ROBOT_SPOT,...FRONTIER_CAMPS.map(c=>({x:c.x+190,y:c.y+70}))];
  for(const path of PATHS)for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],length=dist(a,b);
    for(let step=450;step<length;step+=1100){const t=step/length;candidates.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t+45});}
  }
  // Also inhabit spaces between roads throughout the full expanded map.
  for(let x=MIN_X+650;x<MAX_X-400;x+=1800)for(let y=MIN_Y+650;y<MAX_Y-400;y+=1600)candidates.push({x,y});
  for(const candidate of candidates){
    if(world.robotColonies.some(c=>dist(c,candidate)<620))continue;
    let chosen=null;
    for(let attempt=0;attempt<45;attempt++){
      const radius=attempt?20+attempt*4:0,angle=attempt*2.39996;
      const bin={x:Math.round(candidate.x+Math.cos(angle)*radius),y:Math.round(candidate.y+Math.sin(angle)*radius)};
      if(pathDistance(bin.x,bin.y)<32||!canWalk(world,bin.x,bin.y,27)||world.interactables.some(i=>dist(i,bin)<65)||world.creatures.some(c=>dist(c,bin)<45))continue;
      const leaves=leafPatch(world,bin,world.robotColonies.length+31);
      if(leaves.length>=18){chosen={...bin,leaves};break;}
    }
    if(!chosen)continue;
    const index=world.robotColonies.length,count=3+index%4;
    const colony={...chosen,id:`robot-grove-${index}`,biome:biomeAt(chosen.x,chosen.y),dock:{x:chosen.x,y:chosen.y+30},robots:[],fill:.24,pulse:0};
    world.robotColonies.push(colony);
    world.props.push({id:`${colony.id}-bin`,x:colony.x,y:colony.y,solid:17,size:40,robotBin:colony});
    colony.leaves=colony.leaves.filter(l=>robotRouteClear(world,colony.dock,l));
    for(let n=0;n<count;n++){
      const start=colony.leaves[n*2]||colony.dock,style=(index+n)%ROBOT_STYLES.length;
      const r={id:`${colony.id}-worker-${n}`,colonyId:colony.id,x:start.x,y:start.y,style,name:ROBOT_STYLES[style].name,face:n%2?1:-1,state:'seeking',cargo:0,phase:n*1.3,walk:0,moving:false,timer:n*.25,route:[],target:null,retry:0,speed:32+n*2};
      colony.robots.push(r);world.robots.push(r);
    }
  }
}

function release(r){if(r.target?.claimedBy===r.id)r.target.claimedBy=null;r.target=null;}
function routeTo(world,r,destination,dock){
  if(robotRouteClear(world,r,destination))return [{...destination}];
  if(robotRouteClear(world,r,dock)&&robotRouteClear(world,dock,destination))return [{...dock},{...destination}];
  return findRoute(world,r,destination,{radius:ROBOT_RADIUS,budget:350})||[];
}
function returnToBin(world,r,colony){
  release(r);r.state='returning';
  const slot=colony.robots.indexOf(r),dock={x:colony.x+(slot-(colony.robots.length-1)/2)*11,y:colony.y+29+slot%2*8};
  r.destination=robotRouteClear(world,colony.dock,dock)?dock:colony.dock;
  r.route=routeTo(world,r,r.destination,colony.dock);r.retry=1;
}

export function updateRobots(world,player,time,dt){
  for(const colony of world.robotColonies||[]){
    if(Math.abs(colony.x-player.x)>1050||Math.abs(colony.y-player.y)>1050)continue;
    colony.pulse=Math.max(0,colony.pulse-dt);
    for(const r of colony.robots){
      r.moving=false;r.timer=Math.max(0,r.timer-dt);r.retry=Math.max(0,r.retry-dt);
      if(r.state==='picking'){
        if(r.timer>0)continue;
        if(r.target?.claimedBy===r.id&&r.target.readyAt<=time){r.target.readyAt=time+18+hash(r.x|0,r.y|0)*12;r.cargo++;}
        release(r);r.state='seeking';
        if(r.cargo>=3)returnToBin(world,r,colony);
        continue;
      }
      if(r.state==='depositing'){
        if(r.timer>0)continue;
        // Only the visible mound saturates. Deposits never check a capacity.
        colony.fill=Math.min(.88,colony.fill+r.cargo*.016);colony.pulse=1;
        r.cargo=0;r.state='seeking';r.timer=.35;continue;
      }
      if(r.state==='seeking'){
        if(r.timer>0)continue;
        const available=colony.leaves.filter(l=>l.readyAt<=time&&!l.claimedBy).sort((a,b)=>dist(r,a)-dist(r,b));
        for(const leaf of available){
          const route=routeTo(world,r,leaf,colony.dock);if(!route.length)continue;
          r.target=leaf;leaf.claimedBy=r.id;r.destination=leaf;r.route=route;r.state='gathering';break;
        }
        if(r.state==='seeking'){if(r.cargo)returnToBin(world,r,colony);else r.timer=1;}
      }
      if(r.state!=='gathering'&&r.state!=='returning')continue;
      if(!r.route.length){
        if(dist(r,r.destination)<2){
          r.state=r.state==='returning'?'depositing':'picking';r.timer=r.state==='depositing'?1.1:.65;
        }else if(!r.retry){r.route=routeTo(world,r,r.destination,colony.dock);r.retry=1;if(!r.route.length&&r.state==='gathering'){release(r);r.state='seeking';r.timer=1;}}
        continue;
      }
      const point=r.route[0],distance=dist(r,point),step=Math.min(distance,r.speed*dt);
      if(distance<.1){r.route.shift();continue;}
      const next={x:r.x+(point.x-r.x)/distance*step,y:r.y+(point.y-r.y)/distance*step};
      if(!robotRouteClear(world,r,next)){r.route=[];r.retry=.8;continue;}
      if(Math.abs(next.x-r.x)>.02)r.face=next.x>=r.x?1:-1;
      r.x=next.x;r.y=next.y;r.walk+=step;r.moving=true;
      if(step===distance)r.route.shift();
    }
  }
}
