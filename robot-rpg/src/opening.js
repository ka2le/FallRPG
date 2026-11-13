// Fixed encounter locations, shared by the world, map, saves and playtests.
export const OPENING_LAYOUT_VERSION=2;
export const PASTURE={x:970,y:245,approach:{x:970,y:425},townExit:{x:970,y:620}};
export const PASTURE_SEEDLINGS=[{x:945,y:228},{x:963,y:275},{x:1010,y:243}];
export const BRIAR_CAMPS={turn:{x:1040,y:-100},hollow:{x:1200,y:-400},den:{x:1600,y:-300}};
export const inOpeningRunway=p=>Math.abs(p.x-PASTURE.x)<140&&p.y>PASTURE.y-60&&p.y<650;
export function inBriarRoad(p){
  const camps=Object.values(BRIAR_CAMPS);if(camps.some(c=>Math.hypot(p.x-c.x,p.y-c.y)<450))return true;
  const path=[PASTURE,...camps];for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));
    if(Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t)<160)return true;
  }
  return false;
}
