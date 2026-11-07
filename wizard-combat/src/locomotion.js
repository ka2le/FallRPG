// Bounded acceleration with stronger braking: weight without a long glide.
export function approachVelocity(vx,vz,tx,tz,acceleration,dt){
  const dx=tx-vx,dz=tz-vz,d=Math.hypot(dx,dz),step=Math.max(0,dt)*acceleration;
  if(d<=step)return {x:tx,z:tz};
  return {x:vx+dx/d*step,z:vz+dz/d*step};
}

export function strideLength(size){return Math.max(.65,size*.85);}
