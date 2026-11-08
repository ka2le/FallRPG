import { canWalk, dist, biomeAt, MIN_X, MIN_Y, MAX_X, MAX_Y } from './world.js';

export function findRoute(world,origin,destination,{radius=9,budget=7000,ignore=null,habitat=null}={}){
  if(!canWalk(world,destination.x,destination.y,radius,ignore))return null;
  const cell=20,start={x:0,y:0},goal={x:Math.round((destination.x-origin.x)/cell),y:Math.round((destination.y-origin.y)/cell)};
  const point=n=>({x:origin.x+n.x*cell,y:origin.y+n.y*cell});
  const walkable=(a,b)=>{const steps=Math.ceil(dist(a,b)/4);for(let i=1;i<=steps;i++){const x=a.x+(b.x-a.x)*i/steps,y=a.y+(b.y-a.y)*i/steps;if(habitat&&biomeAt(x,y)!==habitat||!canWalk(world,x,y,radius,ignore))return false;}return true;};
  const key=n=>`${n.x},${n.y}`,open=[{...start,g:0,f:0}],cost=new Map([[key(start),0]]),from=new Map(),closed=new Set();let found=null;
  for(let count=0;open.length&&count<budget;count++){
    open.sort((a,b)=>a.f-b.f);const cur=open.shift(),ck=key(cur);if(closed.has(ck))continue;closed.add(ck);
    if(Math.abs(cur.x-goal.x)<=1&&Math.abs(cur.y-goal.y)<=1&&walkable(point(cur),destination)){found=cur;break;}
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
      const n={x:cur.x+dx,y:cur.y+dy},nk=key(n),g=cur.g+Math.hypot(dx,dy),next=point(n);
      if(closed.has(nk)||next.x<MIN_X+30||next.y<MIN_Y+40||next.x>MAX_X-30||next.y>MAX_Y-30||!walkable(point(cur),next))continue;
      if(g<(cost.get(nk)??Infinity)){cost.set(nk,g);from.set(nk,cur);open.push({...n,g,f:g+Math.hypot(n.x-goal.x,n.y-goal.y)});}
    }
  }
  if(!found)return null;
  const path=[{...destination}];let n=found;while(key(n)!==key(start)){path.push(point(n));n=from.get(key(n));if(!n)break;}
  return path.reverse();
}
