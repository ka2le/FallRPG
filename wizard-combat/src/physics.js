import {solidSpan,hullHit,spatialIndex} from './cover-shapes.js';
import {COVER,terrain,SHIELD,SPECIES} from './data.js';
import {WORLD_HALF} from './landscape.js';
import {approachVelocity,strideLength} from './locomotion.js';
const coverQuery=spatialIndex(COVER);
export const nearbyCover=(x,z,radius=0)=>coverQuery(x-radius,z-radius,x+radius,z+radius);
const alongCover=(a,b,pad=0)=>coverQuery(Math.min(a.x,b.x)-pad,Math.min(a.z,b.z)-pad,Math.max(a.x,b.x)+pad,Math.max(a.z,b.z)+pad);
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const subtract=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
export const length=v=>Math.hypot(v.x,v.y,v.z);
export const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
export const normalize=v=>{const d=length(v)||1;return{x:v.x/d,y:v.y/d,z:v.z/d};};
export const pointAt=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
export function sphereHit(a,b,c,r){const d=subtract(b,a),m=subtract(a,c),cc=dot(m,m)-r*r;if(cc<=0)return 0;const aa=dot(d,d),bb=dot(m,d),disc=bb*bb-aa*cc;if(aa<1e-10||disc<0)return null;const t=(-bb-Math.sqrt(disc))/aa;return t>=0&&t<=1?t:null;}
// Volumetric animals use oriented body/head ellipsoids matching their models.
// The original painted creatures retain their established spherical hit region.
export function enemyHit(a,b,e,pad=0){
  const s=SPECIES[e.type],r=s.size*(s.model3d?1.2:.34)+pad;
  // Conservative segment bounds discard distant actors before allocating narrow-phase shapes.
  if(e.x<Math.min(a.x,b.x)-r||e.x>Math.max(a.x,b.x)+r||e.z<Math.min(a.z,b.z)-r||e.z>Math.max(a.z,b.z)+r||e.y<Math.min(a.y,b.y)-r||e.y>Math.max(a.y,b.y)+r)return null;
  if(!s.model3d)return sphereHit(a,b,e,s.size*.34+pad);
  const low=e.type==='rootknife'||e.type==='snowkeel',height=low?.3:.57;
  const boxes=[{x:0,y:height,z:0,rx:low?.3:.43,ry:low?.19:.35,rz:e.type==='rootknife'?.85:.63},{x:0,y:height+.02,z:.66,rx:low?.23:.3,ry:low?.15:.27,rz:.32}];
  if(e.type==='snowkeel')boxes.push({x:0,y:.6,z:-.1,rx:.18,ry:.43,rz:.44});
  const cy=Math.cos(e.heading||0),sy=Math.sin(e.heading||0),size=s.size;
  let first=null;
  for(const box of boxes){const convert=p=>{const dx=p.x-e.x,dz=p.z-e.z;return {x:(cy*dx-sy*dz-box.x*size)/(box.rx*size+pad),y:(p.y-(e.y-size*.5)-box.y*size)/(box.ry*size+pad),z:(sy*dx+cy*dz-box.z*size)/(box.rz*size+pad)};};const t=sphereHit(convert(a),convert(b),{x:0,y:0,z:0},1);if(t!==null&&(first===null||t<first))first=t;}
  return first;
}
export function boxHit(a,b,r,pad=0,flat=false){
  if(r.planes&&!flat)return hullHit(a,b,r,pad);
  let lo=0,hi=1;const bounds={x:[r.x-r.w/2-pad,r.x+r.w/2+pad],y:[r.base,r.top],z:[r.z-r.d/2-pad,r.z+r.d/2+pad]};
  for(const axis of flat?['x','z']:['x','y','z']){const delta=b[axis]-a[axis],[min,max]=bounds[axis];if(Math.abs(delta)<1e-10){if(a[axis]<min||a[axis]>max)return null;}else{const t1=(min-a[axis])/delta,t2=(max-a[axis])/delta;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>hi)return null;}}
  return lo;
}
export function coverHit(a,b,covers=null){let first=null;for(const r of covers||alongCover(a,b)){const t=boxHit(a,b,r);if(t!==null&&(first===null||t<first))first=t;}return first;}
export function terrainHit(a,b){const steps=Math.max(1,Math.ceil(length(subtract(b,a))/.4));for(let i=0;i<=steps;i++){const t=i/steps,p=pointAt(a,b,t);if(p.y<terrain(p.x,p.z)+.02)return t;}return null;}
export function wallHit(a,b){const cover=coverHit(a,b),ground=terrainHit(a,b);return cover===null?ground:ground===null?cover:Math.min(cover,ground);}
export function blocked(a,b){return wallHit(a,b)!==null;}
export function inside(x,z,r,pad=0){return solidSpan(r,x,z,pad)!==null;}
export function floorAt(x,z,ceiling=Infinity,radius=0){let y=terrain(x,z);for(const r of nearbyCover(x,z,radius)){const span=solidSpan(r,x,z,radius);if(span&&span[1]<=ceiling+.05)y=Math.max(y,span[1]);}return y;}
export function clearBody(x,z,feet,radius=.45,height=1.7){return Math.abs(x)<WORLD_HALF-12&&Math.abs(z)<WORLD_HALF-12&&!nearbyCover(x,z,radius).some(r=>{const span=solidSpan(r,x,z,radius);return span&&feet<span[1]-.04&&feet+height>span[0]+.04;});}
export function moveBody(body,dx,dz,radius,feet,height=1.7,step=.28){
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.2));let level=feet;
  for(let i=0;i<count;i++)for(const axis of ['x','z']){
    const x=body.x+(axis==='x'?dx/count:0),z=body.z+(axis==='z'?dz/count:0),ground=floorAt(x,z,level+step,radius),candidate=Math.max(level,ground);
    if(candidate-level<=step+.01&&clearBody(x,z,candidate,radius,height)){body.x=x;body.z=z;level=candidate;}
  }
  return level;
}
// Local corner routing: keep a waypoint until reached, then choose the next visible corner.
export function navigate(e,goal,step,radius,dt=1/30){
  let target=goal;
  if(e.waypoint&&Math.hypot(e.x-e.waypoint.x,e.z-e.waypoint.z)>.45&&Math.hypot(e.goalX-goal.x,e.goalZ-goal.z)<1)target=e.waypoint;
  else{
    e.waypoint=null;e.goalX=goal.x;e.goalZ=goal.z;
    const obstacle=alongCover(e,goal,radius+.12).map(r=>({r,t:boxHit(e,goal,r,radius+.12,true)})).filter(o=>o.t!==null).sort((a,b)=>a.t-b.t)[0];
    if(obstacle){
      const r=obstacle.r,margin=radius+.45,candidates=[];
      for(const sx of [-1,1])for(const sz of [-1,1]){
        const p={x:r.x+sx*(r.w/2+margin),z:r.z+sz*(r.d/2+margin)};
        if(Math.hypot(p.x-e.x,p.z-e.z)<.4||!clearBody(p.x,p.z,terrain(p.x,p.z),radius))continue;
        const blockedPath=alongCover(e,p,radius+.08).some(o=>boxHit(e,p,o,radius+.08,true)!==null);if(blockedPath)continue;
        const score=Math.hypot(p.x-e.x,p.z-e.z)+Math.hypot(p.x-goal.x,p.z-goal.z);
        candidates.push({p,score});
      }
      candidates.sort((a,b)=>a.score-b.score);if(candidates.length){target=candidates[0].p;e.waypoint=target;}
    }
  }
  const d=Math.hypot(target.x-e.x,target.z-e.z);if(d<.05||dt<=0)return;
  const s=SPECIES[e.type],size=s?.size||radius/.23,speed=step/dt;
  // Brake into a waypoint, and let articulated animals turn before accelerating.
  const facing=s?.model3d?Math.max(.15,Math.cos(Math.atan2(target.x-e.x,target.z-e.z)-(e.heading||0))):1;
  const gait=s?.flying?1:1+.055*Math.sin((e.walkDistance||0)/strideLength(size)*Math.PI*4);
  const pace=Math.min(speed,Math.sqrt(2*speed*5*d))*facing*gait;
  const v=approachVelocity(e.navVX||0,e.navVZ||0,(target.x-e.x)/d*pace,(target.z-e.z)/d*pace,Math.max(8,speed*6),dt);
  const ox=e.x,oz=e.z,limit=Math.min(1,d/(Math.hypot(v.x,v.z)*dt||1));
  const feet=terrain(e.x,e.z);moveBody(e,v.x*dt*limit,v.z*dt*limit,radius,feet,Math.max(1.7,size),.3);
  e.navVX=(e.x-ox)/dt;e.navVZ=(e.z-oz)/dt;e.walked=true;
  e.walkDistance=(e.walkDistance||0)+Math.hypot(e.x-ox,e.z-oz);
}

// A forward-facing ellipse, swept against the incoming projectile segment.
export function shieldHit(a,b,p,radius=0){
  const cy=Math.cos(p.yaw),sy=Math.sin(p.yaw),cp=Math.cos(p.pitch),sp=Math.sin(p.pitch);
  const forward={x:-sy*cp,y:sp,z:-cy*cp},right={x:cy,y:0,z:-sy},up={x:sy*sp,y:cp,z:cy*sp};
  const center={x:p.x+forward.x*SHIELD.distance+up.x*SHIELD.offset,y:p.y+forward.y*SHIELD.distance+up.y*SHIELD.offset,z:p.z+forward.z*SHIELD.distance+up.z*SHIELD.offset};
  const start=dot(subtract(a,center),forward),end=dot(subtract(b,center),forward);
  if(start<0||end>0||start-end<1e-8)return null;
  const t=start/(start-end),offset=subtract(pointAt(a,b,t),center);
  return (dot(offset,right)/(SHIELD.width+radius))**2+(dot(offset,up)/(SHIELD.height+radius))**2<=1?t:null;
}
