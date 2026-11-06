// Convex rock profiles shared by rendering and collision. Unit Y runs from 0 to 1.
export const ROCK_PROFILES=[
  [[0,.68],[.24,1],[.72,.94],[1,.62]],
  [[0,.82],[.2,1],[.58,.9],[1,.38]],
  [[0,.72],[.32,1],[.82,.78],[1,.45]],
  [[0,.8],[.18,1],[.82,1],[1,.8]],
];
export function hullGeometry(variant=0){
  const profile=ROCK_PROFILES[variant%4],vertices=[],faces=[],sides=8;
  for(const [y,r] of profile)for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2+Math.PI/8,jitter=variant===3?1:1+.07*Math.sin(a*3+variant*2);vertices.push([Math.cos(a)*r*jitter+(variant===3?0:(y-.5)*.19),y,Math.sin(a)*r*jitter+(variant===3?0:(y-.5)*.12)]);}
  for(let j=0;j<profile.length-1;j++)for(let i=0;i<sides;i++){const a=j*sides+i,b=j*sides+(i+1)%sides;faces.push([a,a+sides,b+sides],[a,b+sides,b]);}
  for(let i=1;i<sides-1;i++){faces.push([0,i,i+1]);const k=(profile.length-1)*sides;faces.push([k,k+i+1,k+i]);}
  return {vertices,faces};
}
export function makeHull(record){
  const {vertices,faces}=hullGeometry(record.variant),c=Math.cos(record.rot||0),s=Math.sin(record.rot||0),rx=record.width/2,rz=record.depth/2;
  const points=vertices.map(([x,y,z])=>({x:record.x+c*x*rx+s*z*rz,y:record.base+y*record.h,z:record.z-s*x*rx+c*z*rz})),planes=[];
  const center={x:record.x,y:record.base+record.h*.5,z:record.z};
  for(const face of faces){const [a,b,d]=face.map(i=>points[i]),u={x:b.x-a.x,y:b.y-a.y,z:b.z-a.z},v={x:d.x-a.x,y:d.y-a.y,z:d.z-a.z};let x=u.y*v.z-u.z*v.y,y=u.z*v.x-u.x*v.z,z=u.x*v.y-u.y*v.x,n=Math.hypot(x,y,z);x/=n;y/=n;z/=n;let k=x*a.x+y*a.y+z*a.z;if(x*center.x+y*center.y+z*center.z>k){x=-x;y=-y;z=-z;k=-k;}if(!planes.some(p=>Math.abs(p.x-x)+Math.abs(p.y-y)+Math.abs(p.z-z)+Math.abs(p.k-k)<1e-6))planes.push({x,y,z,k});}
  const w=2*Math.max(...points.map(p=>Math.abs(p.x-record.x))),d=2*Math.max(...points.map(p=>Math.abs(p.z-record.z)));
  return {...record,w,d,top:record.base+record.h,planes};
}
// Vertical intersection of a convex solid, expanded horizontally for a moving body.
export function solidSpan(r,x,z,pad=0){
  if(Math.abs(x-r.x)>r.w/2+pad||Math.abs(z-r.z)>r.d/2+pad)return null;
  if(!r.planes)return [r.base,r.top];
  let lo=-Infinity,hi=Infinity;
  for(const p of r.planes){const k=p.k+pad*Math.hypot(p.x,p.z)-p.x*x-p.z*z;if(Math.abs(p.y)<1e-8){if(k< -1e-7)return null;}else if(p.y>0)hi=Math.min(hi,k/p.y);else lo=Math.max(lo,k/p.y);if(lo>hi+1e-7)return null;}
  return [lo,hi];
}
export function hullHit(a,b,r,pad=0){
  let lo=0,hi=1;
  for(const p of r.planes){const q=p.k+pad*Math.hypot(p.x,p.z)-p.x*a.x-p.y*a.y-p.z*a.z,d=p.x*(b.x-a.x)+p.y*(b.y-a.y)+p.z*(b.z-a.z);if(Math.abs(d)<1e-9){if(q<0)return null;}else if(d>0)hi=Math.min(hi,q/d);else lo=Math.max(lo,q/d);if(lo>hi)return null;}
  return lo;
}
export function spatialIndex(records,size=24){
  const cells=new Map();
  for(const r of records)for(let x=Math.floor((r.x-r.w/2)/size);x<=Math.floor((r.x+r.w/2)/size);x++)for(let z=Math.floor((r.z-r.d/2)/size);z<=Math.floor((r.z+r.d/2)/size);z++){const key=x+','+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(r);}
  return (minX,minZ,maxX=minX,maxZ=minZ)=>{const found=new Set();for(let x=Math.floor(minX/size);x<=Math.floor(maxX/size);x++)for(let z=Math.floor(minZ/size);z<=Math.floor(maxZ/size);z++)for(const r of cells.get(x+','+z)||[])found.add(r);return [...found];};
}
