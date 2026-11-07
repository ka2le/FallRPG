import {terrain} from './landscape.js';
import {HOLLOW,ECO_TREES,CANOPY_TREES,HABITATS,THAWLINE} from './habitats.js';
import {makeHull} from './cover-shapes.js';

// Convex shell pieces retain their exact world-space vertices for the renderer.
// Empty chambers and broken side doors never acquire a solid enclosing collider.
function shellPiece(points,faces,kind){
  const x=points.reduce((s,p)=>s+p.x,0)/points.length,z=points.reduce((s,p)=>s+p.z,0)/points.length;
  const base=Math.min(...points.map(p=>p.y)),top=Math.max(...points.map(p=>p.y)),center={x,y:(base+top)/2,z},planes=[];
  for(const face of faces){const [a,b,c]=face.map(i=>points[i]),u={x:b.x-a.x,y:b.y-a.y,z:b.z-a.z},v={x:c.x-a.x,y:c.y-a.y,z:c.z-a.z};let nx=u.y*v.z-u.z*v.y,ny=u.z*v.x-u.x*v.z,nz=u.x*v.y-u.y*v.x;const len=Math.hypot(nx,ny,nz);nx/=len;ny/=len;nz/=len;let k=nx*a.x+ny*a.y+nz*a.z;if(nx*center.x+ny*center.y+nz*center.z>k){nx=-nx;ny=-ny;nz=-nz;k=-k;}planes.push({x:nx,y:ny,z:nz,k});}
  return {x,z,base,top,h:top-base,w:Math.max(...points.map(p=>Math.abs(p.x-x)))*2,d:Math.max(...points.map(p=>Math.abs(p.z-z)))*2,planes,points,faces,kind};
}
export function ecologyClearance(x,z,pad=0){
  return HABITATS.some(h=>Math.hypot(x-h.x,z-h.z)<h.r+pad);
}
export function createEcologyCover(){
  const cover=[],h=HOLLOW,y=terrain(h.x,h.z)-.15;
  const faces=[[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]];
  for(const [lo,hi] of [[-22,-7],[-7,7],[7,22]])for(let i=0;i<16;i++){
    if(lo===-7&&(i<3||i>12))continue;
    const a=i/16*Math.PI,b=(i+1)/16*Math.PI,points=[];
    // Each slice remains convex; variation along its length breaks the pipe silhouette.
    for(const z of [lo,hi])for(const [angle,r] of [[a,h.inner],[b,h.inner],[b,h.outer],[a,h.outer]]){const rr=r*(1+.045*Math.sin(z*.23))*(1+.025*Math.sin(angle*7));points.push({x:h.x+Math.cos(angle)*rr,y:y+Math.sin(angle)*rr,z:h.z+z});}
    cover.push(shellPiece(points,faces,'elder-shell'));
  }
  for(const t of ECO_TREES)cover.push(makeHull({x:t.x,z:t.z,base:terrain(t.x,t.z)-.1,width:1.5*t.scale,depth:1.5*t.scale,h:8*t.scale,variant:3,rot:0,kind:'eco-trunk'}));
  for(const t of CANOPY_TREES){
    cover.push(makeHull({x:t.x,z:t.z,base:terrain(t.x,t.z)-.1,width:t.radius*2,depth:t.radius*2,h:t.height,variant:3,rot:0,kind:'canopy-trunk'}));
    for(let i=0;i<4;i++){const a=i*Math.PI/2,x=t.x+Math.cos(a)*3,z=t.z+Math.sin(a)*3;cover.push(makeHull({x,z,base:terrain(x,z)-.1,width:1.5,depth:7,h:2.5,variant:1,rot:Math.PI/2-a,kind:'buttress'}));}
  }
  const n=THAWLINE.nest,base=terrain(n.x,n.z);
  cover.push(makeHull({x:n.x-1.2,z:n.z,base:base+2,width:5.2,depth:4.2,h:.7,variant:3,kind:'snow-roof',rot:0}));
  for(const side of [-1,1])cover.push(makeHull({x:n.x-2.5,z:n.z+side*1.7,base,width:.8,depth:.8,h:2.1,variant:3,kind:'warm-stone',rot:0}));
  return cover;
}
export const TREE_HAZARDS=ECO_TREES.filter(t=>t.kind==='claspwood').map(t=>({id:t.id,x:t.x,z:t.z,r:5*t.scale,kind:'claspwood'}));
export const ELDER_HAZARDS=[-11,0,11].map((z,i)=>({id:`elder-root-${i}`,x:HOLLOW.x,z:HOLLOW.z+z,r:5.6,kind:'elder'}));
export const HAZARDS=[...TREE_HAZARDS,...ELDER_HAZARDS];
