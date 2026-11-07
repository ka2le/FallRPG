import { biomeAt, canWalk, dist, hash, lineClear } from './world.js';

function clearRoute(world,a,b){
  if(!lineClear(world,a,b,0))return false;
  const length=dist(a,b);
  for(let step=4;step<length;step+=4)if(!canWalk(world,a.x+(b.x-a.x)*step/length,a.y+(b.y-a.y)*step/length,2))return false;
  return true;
}

// Keep a chosen destination through the approach, windup and hop. Proximity
// triggers a journey once; crossing a distance threshold never changes position.
export function updateAmbient(world,player,time,dt){
  for(const a of world.ambient){
    a.homeX??=a.x;a.homeY??=a.y;a.trip??=0;a.nextMove??=time+1+a.phase;
    const flying=a.sprite===52||a.sprite===53;
    if(a.goal){
      a.travel=Math.min(1,(a.travel||0)+dt/(flying?.65:.22));
      const t=a.travel,tween=t*t*(3-2*t);
      a.x=a.fromX+(a.goal.x-a.fromX)*tween;a.y=a.fromY+(a.goal.y-a.fromY)*tween;
      if(t===1){a.goal=null;a.travel=0;a.nextMove=time+2+a.phase*.4;}
      continue;
    }
    if(a.destination){
      a.windup-=dt;
      if(a.windup<=0){a.goal=a.destination;a.destination=null;a.fromX=a.x;a.fromY=a.y;a.travel=0;}
      continue;
    }
    if(time<a.nextMove)continue;
    const fleeing=dist(a,player)<72,home={x:a.homeX,y:a.homeY},returning=dist(a,home)>105;
    // Several hops share a heading. Reconsider the route only at a rest, rather
    // than reversing each time the player crosses the proximity threshold.
    if(!(a.hopsLeft>0)){
      a.heading=fleeing?Math.atan2(a.y-player.y,a.x-player.x):returning?Math.atan2(home.y-a.y,home.x-a.x):(a.heading??a.phase)+.6;
      a.hopsLeft=fleeing?2:3;
    }
    a.trip++;
    let chosen=false;
    for(const turn of [0,.6,-.6,1.2,-1.2]){
      const angle=a.heading+turn,length=(fleeing?48:30)+hash(a.trip,Math.floor(a.homeX))*18;
      const goal={x:a.x+Math.cos(angle)*length,y:a.y+Math.sin(angle)*length};
      if(dist(goal,home)>165||biomeAt(goal.x,goal.y)!==biomeAt(home.x,home.y)||!canWalk(world,goal.x,goal.y,2)||!clearRoute(world,a,goal))continue;
      a.destination=goal;a.windup=.55;a.face=goal.x>=a.x?1:-1;a.heading=angle;a.hopsLeft--;chosen=true;break;
    }
    if(!chosen)a.hopsLeft=0;
    a.nextMove=time+1.5;
  }
}
