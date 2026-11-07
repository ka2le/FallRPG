import {Noise} from './fey/core/noise.js';
import {erodedOffset} from './erosion.js';
import {HABITATS,SEASON_PATCHES,habitatAt,THAWLINE} from './habitats.js';
export const WORLD_HALF=416;
export const COURTS=[
  {id:'spring',name:'Bloomwood',color:'#bbd995',ground:'#658c57',leaf:'#e9a9c6'},
  {id:'summer',name:'Glimmerfen',color:'#8edfd0',ground:'#4d8872',leaf:'#72bb97'},
  {id:'autumn',name:'Emberfall',color:'#efb36f',ground:'#9b7548',leaf:'#df964d'},
  {id:'winter',name:'Glasswinter',color:'#b6d9f3',ground:'#b7c9d1',leaf:'#9cbfd3'},
];
const noise=new Noise(9471),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const bell=(x,z,cx,cz,sx,sz)=>Math.exp(-(((x-cx)/sx)**2+((z-cz)/sz)**2));
export function seasonWeights(x,z){
  const wx=x+Math.sin(z*.017)*18+noise.noise2(x*.006+7,z*.006)*25;
  const wz=z+Math.sin(x*.015)*14+noise.noise2(x*.007,z*.007+13)*22;
  const east=smooth(-28,28,wx),south=smooth(-32,32,wz);
  const weights=[(1-east)*(1-south),east*(1-south),east*south,(1-east)*south];
  for(const p of SEASON_PATCHES){const d=Math.hypot(x-p.x,z-p.z),edge=p.r+Math.sin(x*.13+z*.09)*1.5,w=1-smooth(edge-5,edge+2,d);if(w<=0)continue;for(let i=0;i<4;i++)weights[i]=weights[i]*(1-w)+(i===p.season?w:0);}
  return weights;
}
export function courtAt(x,z){const weights=seasonWeights(x,z);return weights.indexOf(Math.max(...weights));}
export function pathDistance(x,z){
  const r=Math.hypot(x,z),a=Math.atan2(z,x);let best=Infinity;
  for(const angle of [-Math.PI/2-.2,-Math.PI/4,Math.PI/4,Math.PI*.75]){
    const bend=(Math.sin(r*.021+angle)*.065+Math.sin(r*.047-angle)*.025)*smooth(25,90,r),delta=a-angle-bend;
    best=Math.min(best,Math.abs(Math.sin(delta))*r+(Math.cos(delta)<0?r:0));
  }
  const inner=150+Math.sin(a*3)*16+Math.sin(a*7)*7,outer=275+Math.sin(a*5)*19+Math.sin(a*9+1)*8;
  return Math.min(best,Math.abs(r-inner),Math.abs(r-outer));
}
// Water is shallow enough to cross; its banks and surrounding basins are real terrain.
// The irregular boundary is shared by ground carving, water meshes and scatter exclusion.
export const POOLS=[
  {x:124,z:-108,r:26,y:8,kind:'water',phase:1},
  {x:205,z:-235,r:41,y:14,kind:'water',phase:2},
  {x:265,z:-150,r:22,y:17,kind:'water',phase:4},
  {x:-220,z:175,r:33,y:27,kind:'ice',phase:3},
  {x:310,z:305,r:26,y:45,kind:'lava',phase:5},
];
export function shoreRadius(pool,angle){return pool.r*(1+.11*Math.sin(angle*3+pool.phase)+.055*Math.sin(angle*7-pool.phase));}
export function waterDistance(x,z){let best=Infinity;for(const p of POOLS)best=Math.min(best,Math.hypot(x-p.x,z-p.z)-shoreRadius(p,Math.atan2(z-p.z,x-p.x)));return best;}
export const LANDFORMS=[
  {name:'Petal downs',kind:'hill',x:-90,z:-100,sx:85,sz:56,h:12},
  {name:'Moss shoulders',kind:'hill',x:-265,z:-75,sx:92,sz:70,h:23},
  {name:'Glimmer table',kind:'plateau',x:165,z:-60,sx:55,sz:48,h:34,ramp:2.8},
  {name:'Amber shelf',kind:'plateau',x:190,z:185,sx:80,sz:58,h:42,ramp:-2.1},
  {name:'Ashen rim',kind:'plateau',x:315,z:310,sx:75,sz:69,h:48,ramp:-2.4},
];
export const MOUNTAIN_RANGES=[
  {x:-163,z:-255,sx:110,sz:48,h:62,angle:.65},
  {x:-205,z:-283,sx:50,sz:28,h:32,angle:-.6},
  {x:-295,z:285,sx:112,sz:63,h:108,angle:-.8},
  {x:-251,z:350,sx:80,sz:42,h:64,angle:.55},
  {x:-341,z:244,sx:65,sz:36,h:32,angle:.35},
];
export const PLAINS=[{x:-65,z:85,sx:100,sz:90},{x:85,z:65,sx:85,sz:75},{x:210,z:-205,sx:110,sz:100}];
function mountainField(x,z){
  let h=0,gx=0,gz=0;
  for(const f of MOUNTAIN_RANGES){
    const c=Math.cos(f.angle),s=Math.sin(f.angle),dx=x-f.x,dz=z-f.z,u=dx*c+dz*s,v=-dx*s+dz*c;
    const a=u/(f.sx*f.sx),b=v/(f.sz*f.sz),height=Math.exp(-u*a-v*b)*f.h;
    h+=height;gx-=2*height*(a*c-b*s);gz-=2*height*(a*s+b*c);
  }
  return {h,gx,gz};
}
// Sculpted clearings preserve room to fight at the existing encounter locations.
// These are terrain features, not monster definitions; art/gameplay may evolve independently.
const clearings=[[-8,-44],[-42,-77],[51,-91],[-60,-139],[-119,-91],[111,-162],[-177,-125],[102,130],[-112,126],[195,-109],[-160,-221],[206,164],[-195,232],[-258,-176],[215,-278],[270,252],[-281,242]];
function macroHeight(x,z){
  const r=Math.hypot(x,z),hub=smooth(20,62,r);
  const plain=Math.max(...PLAINS.map(p=>bell(x,z,p.x,p.z,p.sx,p.sz)));
  // Quiet, broad floors and rolling downs between deliberately placed landmarks.
  const rolling=noise.fbm(x*.006,z*.006,2)*(1.5+(1-plain)*3.5);
  let base=5+r*.024+rolling,relief=0;
  for(const f of LANDFORMS){
    if(f.kind==='hill'){relief+=bell(x,z,f.x,f.z,f.sx,f.sz)*f.h;continue;}
    const dx=(x-f.x)/f.sx,dz=(z-f.z)/f.sz,a=Math.atan2(dz,dx);
    const outline=Math.hypot(dx,dz)*(1+.11*Math.sin(a*3+1)+.065*Math.sin(a*7-.4));
    // Broad hand-placed tops, scalloped escarpments, and a gentle approach ramp.
    const bevel=.53+.6*smooth(.35,.95,Math.cos(a-f.ramp));
    // Weathered shoulder and talus apron break up the old stamped table outline.
    relief+=f.h*(.78*(1-smooth(.57,.57+bevel,outline))+.22*(1-smooth(.7,1.65,outline)));
  }
  const mountain=mountainField(x,z),mask=smooth(5,30,mountain.h);
  relief+=mountain.h+erodedOffset(x,z,mountain.h,mountain.gx,mountain.gz,mask);
  base-=bell(x,z,200,-205,105,100)*4;
  return 5+hub*(base-5+relief);
}
const clearingHeights=clearings.map(([x,z])=>{const shore=POOLS.find(p=>Math.hypot(x-p.x,z-p.z)<p.r+28);return shore?shore.y-(shore.kind==='lava'?.2:.55):macroHeight(x,z);});
const habitatHeights=HABITATS.map(h=>h.id==='seam'?45.8:macroHeight(h.x,h.z));
function height(x,z){
  let h=macroHeight(x,z);
  for(let i=0;i<HABITATS.length;i++){
    const site=HABITATS[i],dx=x-site.x,dz=z-site.z,d=Math.hypot(dx,dz),angle=Math.atan2(dz,dx);
    const edge=site.r+36+Math.sin(angle*3+i)*9+Math.sin(angle*5-i)*5;
    const w=1-smooth(site.r*.78,edge,d);if(w>0)h=h*(1-w)+habitatHeights[i]*w;
  }
  for(let i=0;i<clearings.length;i++){
    const [cx,cz]=clearings[i],dx=x-cx,dz=z-cz,angle=Math.atan2(dz,dx),d=Math.hypot(dx,dz);
    const edge=48+Math.sin(angle*3+i)*10+Math.sin(angle*5-i)*5;
    if(d<edge){const w=1-smooth(10,edge,d);h=h*(1-w)+(clearingHeights[i]+noise.noise2(x*.05,z*.05)*.15)*w;}
  }
  // A neighboring clearing's long shoulder must never tilt this clearing's core.
  for(let i=0;i<clearings.length;i++){
    const [cx,cz]=clearings[i],d=Math.hypot(x-cx,z-cz);
    if(d<13){const w=1-smooth(9,13,d);h=h*(1-w)+(clearingHeights[i]+noise.noise2(x*.05,z*.05)*.15)*w;}
  }
  for(let i=0;i<HABITATS.length;i++){
    const site=HABITATS[i],d=Math.hypot(x-site.x,z-site.z),core=site.r*.78;
    if(d<core+8){const w=1-smooth(core,core+8,d);h=h*(1-w)+habitatHeights[i]*w;}
  }
  for(const p of POOLS){const d=Math.hypot(x-p.x,z-p.z)-shoreRadius(p,Math.atan2(z-p.z,x-p.x));if(d<18){const t=smooth(-1.5,18,d),bed=p.y-(p.kind==='lava'?.2:.55);h=bed*(1-t)+h*t;}}
  return h;
}
// Shared cached 2m height field: rendering, movement, navigation and projectile hits.
export const TERRAIN_STEP=2;
const N=WORLD_HALF*2/TERRAIN_STEP+1,heights=new Float32Array(N*N);
for(let z=0;z<N;z++)for(let x=0;x<N;x++)heights[z*N+x]=height(x*TERRAIN_STEP-WORLD_HALF,z*TERRAIN_STEP-WORLD_HALF);
export function terrain(x,z){
  const gx=clamp((x+WORLD_HALF)/TERRAIN_STEP,0,N-1.001),gz=clamp((z+WORLD_HALF)/TERRAIN_STEP,0,N-1.001),ix=Math.floor(gx),iz=Math.floor(gz),fx=gx-ix,fz=gz-iz,o=iz*N+ix;
  // Match PlaneGeometry's two triangles exactly, including on steep cliffs.
  return fx+fz<=1?heights[o]+(heights[o+1]-heights[o])*fx+(heights[o+N]-heights[o])*fz:heights[o+N+1]+(heights[o+N]-heights[o+N+1])*(1-fx)+(heights[o+1]-heights[o+N+1])*(1-fz);
}
export function terrainNormal(x,z){const dx=(terrain(x+1,z)-terrain(x-1,z))/2,dz=(terrain(x,z+1)-terrain(x,z-1))/2,n=Math.hypot(dx,1,dz);return{x:-dx/n,y:1/n,z:-dz/n};}
export function biomeAt(x,z){
  const s=seasonWeights(x,z),h=terrain(x,z),slope=1-terrainNormal(x,z).y,wet=1-smooth(0,18,waterDistance(x,z));
  const patch=noise.noise2(x*.023+30,z*.023);
  const openness=smooth(.4,.9,Math.max(...PLAINS.map(p=>bell(x,z,p.x,p.z,p.sx,p.sz))));
  const forest=smooth(-.12,.35,noise.fbm(x*.012,z*.012,2))*(1-openness*.85);
  const ash=s[2]*smooth(215,350,Math.hypot(x,z));
  const snow=clamp(s[3]*.94+smooth(85,125,h)*.8,0,1);
  const path=(1-smooth(1.1,3.8+noise.noise2(x*.06,z*.06)*1.1,pathDistance(x,z)))*(1-smooth(.22,.5,slope));
  const rock=smooth(.12,.42,slope)*1.5+smooth(72,135,h)*.5;
  // Snow settles on shelves and shoulders; steep faces expose their rock strata.
  const settledSnow=snow*(1-smooth(.12,.5,slope)*.96);
  const weights=[.7*(1-snow)*(1-ash*.7),forest*.8*(1-snow)*(1-s[2]*.6),s[2]*(.55+forest*.6)*(1-ash*.7),rock,settledSnow*1.5,(wet*.8+path*.85)*(1-snow),wet*s[1]*1.2+path*.35,ash*(.5+patch*.3)];
  const habitat=habitatAt(x,z);
  if(habitat?.id==='pasture'){weights[0]+=1.3;weights[1]*=.3;if(x>-82&&x<-51)weights[5]+=(1-smooth(.35,1.4,Math.abs(z+35)))*1.2;}
  if(habitat?.id==='litter'){weights[2]+=1.6;weights[6]+=.3;}
  if(habitat?.id==='canopy'||habitat?.id==='elder'){weights[1]+=1.1;weights[0]*=.5;}
  weights[0]*=1-path*.8;weights[1]*=1-path*.8;weights[2]*=1-path*.85;
  const total=weights.reduce((a,b)=>a+b,0)||1;for(let i=0;i<8;i++)weights[i]/=total;
  const court=s.indexOf(Math.max(...s));let name=COURTS[court].name;
  if(rock>.8)name=court===3?'Frostfang crags':'Highland scree';else if(wet>.4)name=court===3?'Frozen mere':court===2?'Ashen caldera':'Glimmer marsh';else if(ash>.55)name='Cinder barrens';else if(snow>.6)name='Glasswinter slopes';else if(court===0&&forest>.6)name='Elderwood';
  if(habitat)name=habitat.name;
  return{court,seasons:s,weights,forest,openness,wet,snow,ash,rock,path,name,habitat:habitat?.id};
}
// Cheap authoritative habitat fields. Narrow snow routes are physical snow beds in
// ecology scenery, independent of the terrain material's broader blend.
export function environmentAt(x,z){
  const seasons=seasonWeights(x,z),seam=Math.hypot(x-THAWLINE.nest.x,z-THAWLINE.nest.z)<23;
  const snowDepth=seasons[3]>.65?(seam?1.1:.45):0;
  return {seasons,snowDepth,heat:clamp(1-Math.hypot(x-294,z-319)/30,0,1),wetness:seam?.9:0,habitat:habitatAt(x,z)?.id};
}
export function acceptsHabitat(type,x,z){
  const env=environmentAt(x,z);
  if(type==='snowkeel')return env.snowDepth>.7;
  if(type==='ventback')return env.heat>.25&&env.wetness>.5&&environmentAt(x-8,z).snowDepth>.7;
  if(type==='scavenger')return env.habitat==='seam'&&seasonWeights(THAWLINE.cold.x,THAWLINE.cold.z)[3]>.65&&seasonWeights(THAWLINE.warm.x,THAWLINE.warm.z)[3]<.3;
  return true;
}
export function regionAt(x,z){const r=Math.hypot(x,z),habitat=habitatAt(x,z);return r<30?{name:'The Hearth',level:1,color:'#efddb1'}:{...COURTS[courtAt(x,z)],name:biomeAt(x,z).name,level:habitat?.level??(r<80?1:r<130?3:r<190?4:r<250?6:r<310?8:10)};}
