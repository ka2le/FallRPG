import { FRONTIER_DISTRICTS, FRONTIER_LOOPS } from './frontier.js';

export const ROOTWALL={count:6,spacing:36,radius:16,hold:60,releaseEvery:5,gatherSpeed:22,scatterSpeed:15,heal:18,healPerLevel:.6,combatLeash:500};
export const ROOTWALL_SITES=[
  {id:'briar-march',name:'The Briar March',a:{x:1000,y:95},b:{x:1030,y:95},level:2},
  {id:'scaffold-march',name:'The Scaffold March',a:{x:3970,y:563},b:{x:4150,y:478},level:6},
  ...FRONTIER_DISTRICTS.flatMap((d,index)=>d.biome!=='spring'?[]:[2,4,6].map((segment,n)=>{
    const path=FRONTIER_LOOPS[index],a=path[segment-1],b=path[segment];
    return {id:`${d.id}-march-${n}`,name:`${d.name} March ${n+1}`,a:{x:a.x+(b.x-a.x)*.3,y:a.y+(b.y-a.y)*.3},b:{x:a.x+(b.x-a.x)*.7,y:a.y+(b.y-a.y)*.7},level:d.level};
  })),
];

export function plantRootwalls(world,api){
  const {canWalk,biomeAt,inVillage,propsNear,segmentDistance}=api;
  world.rootwallGroups=[];
  for(const [index,site] of ROOTWALL_SITES.entries()){
    const length=Math.hypot(site.b.x-site.a.x,site.b.y-site.a.y),along={x:(site.b.x-site.a.x)/length,y:(site.b.y-site.a.y)/length},across={x:-along.y,y:along.x};
    const walls=[site.a,site.b].map(center=>Array.from({length:ROOTWALL.count},(_,i)=>({x:center.x+across.x*(i-2.5)*ROOTWALL.spacing,y:center.y+across.y*(i-2.5)*ROOTWALL.spacing})));
    const scatter=walls.map(row=>row.map((p,i)=>[0,1].map(j=>({x:p.x+along.x*(i%2?1:-1)*(150+i%3*24+j*38),y:p.y+along.y*(i%2?1:-1)*(150+i%3*24+j*38)}))));
    // Narrow walking lanes preserve the surrounding forest while allowing every
    // member to travel physically between its wall slot and scattered perches.
    const lanes=[];
    for(let i=0;i<ROOTWALL.count;i++)for(let s=0;s<2;s++){
      lanes.push([walls[s][i],scatter[s][i][0]],[scatter[s][i][0],scatter[s][i][1]],[walls[s][i],scatter[1-s][i][0]]);
    }
    const points=[...walls.flat(),...scatter.flat(2)];
    if(points.some(p=>biomeAt(p.x,p.y)!=='spring'||inVillage(p)))continue;
    const removed=[];
    for(const p of propsNear(world,(site.a.x+site.b.x)/2,(site.a.y+site.b.y)/2,550)){
      if(p.removed||!p.solid||p.label||p.building||p.blockage)continue;
      if(lanes.some(([a,b])=>segmentDistance(p.x,p.y,a,b)<p.solid+ROOTWALL.radius+7)){p.removed=true;removed.push(p);}
    }
    if(points.some(p=>!canWalk(world,p.x,p.y,ROOTWALL.radius))||lanes.some(([a,b])=>{
      const d=Math.hypot(b.x-a.x,b.y-a.y);for(let n=0;n<=d;n+=8)if(!canWalk(world,a.x+(b.x-a.x)*n/d,a.y+(b.y-a.y)*n/d,ROOTWALL.radius))return true;return false;
    })){for(const p of removed)p.removed=false;continue;}
    const phase=['scattered','gathering','holding','dispersing'][index%4],ids=[];
    for(let i=0;i<ROOTWALL.count;i++){
      const p=(phase==='holding'||phase==='dispersing')?walls[0][i]:scatter[0][i][0],id=`rootwall-${site.id}-${i}`;ids.push(id);
      world.creatures.push({id,type:'wallroot',...p,homeX:p.x,homeY:p.y,level:site.level,phase:i*1.4,rootwall:site.id,rootIndex:i,clasp:true,solid:ROOTWALL.radius,visual:{atlas:'groves',sprite:8+i%4}});
    }
    world.rootwallGroups.push({...site,walls,scatter,ids,phase,site:0,elapsed:phase==='holding'?12+index*7%42:phase==='scattered'?index*3%20:0,scatterDuration:42+index*11%37});
  }
  const trunks=world.creatures.filter(c=>c.rootwall);
  for(const c of world.creatures){
    if(c.rootwall||!trunks.some(t=>Math.hypot(t.x-c.x,t.y-c.y)<ROOTWALL.radius+8))continue;
    const biome=biomeAt(c.x,c.y);
    for(let n=0;n<100;n++){
      const angle=n*2.4,r=28+Math.floor(n/8)*8,x=c.x+Math.cos(angle)*r,y=c.y+Math.sin(angle)*r;
      if(!canWalk(world,x,y,8)||biomeAt(x,y)!==biome||inVillage({x,y})||trunks.some(t=>Math.hypot(t.x-x,t.y-y)<ROOTWALL.radius+10))continue;
      c.x=c.homeX=x;c.y=c.homeY=y;break;
    }
  }
}
