import {Noise} from './fey/core/noise.js';
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
  return [(1-east)*(1-south),east*(1-south),east*south,(1-east)*south];
}
export function courtAt(x,z){const weights=seasonWeights(x,z);return weights.indexOf(Math.max(...weights));}
export function pathDistance(x,z){
  const r=Math.hypot(x,z),a=Math.atan2(z,x);let best=Infinity;
  for(const angle of [-Math.PI/2-.2,-Math.PI/4,Math.PI/4,Math.PI*.75]){
    const bend=Math.sin(r*.021+angle)*.045*smooth(25,90,r),delta=a-angle-bend;
    best=Math.min(best,Math.abs(Math.sin(delta))*r+(Math.cos(delta)<0?r:0));
  }
  const inner=150+Math.sin(a*3)*9+Math.sin(a*7)*3,outer=275+Math.sin(a*5)*13;
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
  {name:'Petal ridge',x:-90,z:-100,sx:55,sz:40,h:24},
  {name:'The elder spine',x:-155,z:-250,sx:68,sz:57,h:72},
  {name:'Moss shoulders',x:-265,z:-75,sx:65,sz:60,h:40},
  {name:'Glimmer bluff',x:165,z:-60,sx:50,sz:52,h:42},
  {name:'Amber heights',x:190,z:185,sx:73,sz:50,h:54},
  {name:'Ashen rim',x:315,z:310,sx:66,sz:65,h:62},
  {name:'Glasswinter crown',x:-295,z:285,sx:68,sz:69,h:126},
  {name:'Frostfang',x:-240,z:365,sx:42,sz:48,h:72},
];
// Sculpted clearings preserve room to fight at the existing encounter locations.
// These are terrain features, not monster definitions; art/gameplay may evolve independently.
const clearings=[[-8,-44],[-42,-77],[51,-91],[-60,-139],[-119,-91],[111,-162],[-177,-125],[102,130],[-112,126],[195,-109],[-160,-221],[206,164],[-195,232],[-258,-176],[215,-278],[270,252],[-281,242]];
function macroHeight(x,z){
  const r=Math.hypot(x,z),hub=smooth(20,62,r),[spring,summer,autumn,winter]=seasonWeights(x,z);
  const warp=noise.noise2(x*.008+13,z*.008-5)*15;
  const rolling=noise.fbm((x+warp)*.009,(z-warp)*.009,4);
  let hills=0;for(const f of LANDFORMS)hills+=bell(x,z,f.x,f.z,f.sx,f.sz)*f.h;
  const crags=noise.ridged(x*.016,z*.016,3)*noise.noise2(x*.006+70,z*.006)*13;
  const ridge=hills+crags*(.3+winter*.8+autumn*.25);
  const pass=smooth(3,22,pathDistance(x,z));
  const base=5+r*.042+rolling*(8+spring*7+autumn*5+winter*10);
  let h=5+hub*((base-5)+ridge*(.55+.45*pass)+noise.noise2(x*.045,z*.045)*1.1);
  // A broad wetland hollow, instead of four identical circular puddles on a plane.
  h-=summer*bell(x,z,200,-205,105,100)*9*hub;
  h+=Math.max(0,r-365)*.23*hub;
  return h;
}
const clearingHeights=clearings.map(([x,z])=>macroHeight(x,z));
function height(x,z){
  let h=macroHeight(x,z);
  for(let i=0;i<clearings.length;i++){const [cx,cz]=clearings[i],d=Math.hypot(x-cx,z-cz);if(d<29){const w=1-smooth(13,29,d);h=h*(1-w)+(clearingHeights[i]+noise.noise2(x*.05,z*.05)*.15)*w;}}
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
  const forest=smooth(-.12,.35,noise.fbm(x*.012,z*.012,2));
  const ash=s[2]*smooth(215,350,Math.hypot(x,z));
  const snow=clamp(s[3]*.94+smooth(85,125,h)*.8,0,1);
  const path=1-smooth(1.5,4.5,pathDistance(x,z));
  const rock=smooth(.12,.42,slope)*1.5+smooth(72,135,h)*.5;
  const weights=[.7*(1-snow)*(1-ash*.7),forest*.8*(1-snow)*(1-s[2]*.6),s[2]*(.55+forest*.6)*(1-ash*.7),rock,snow*1.5,(wet*.8+path*.85)*(1-snow),wet*s[1]*1.2+path*.35,ash*(.5+patch*.3)];
  weights[0]*=1-path*.8;weights[1]*=1-path*.8;weights[2]*=1-path*.85;
  const total=weights.reduce((a,b)=>a+b,0)||1;for(let i=0;i<8;i++)weights[i]/=total;
  const court=s.indexOf(Math.max(...s));let name=COURTS[court].name;
  if(rock>.8)name=court===3?'Frostfang crags':'Highland scree';else if(wet>.4)name=court===3?'Frozen mere':court===2?'Ashen caldera':'Glimmer marsh';else if(ash>.55)name='Cinder barrens';else if(snow>.6)name='Glasswinter slopes';else if(court===0&&forest>.6)name='Elderwood';
  return{court,seasons:s,weights,forest,wet,snow,ash,rock,path,name};
}
export function regionAt(x,z){const r=Math.hypot(x,z);return r<30?{name:'The Hearth',level:1,color:'#efddb1'}:{...COURTS[courtAt(x,z)],name:biomeAt(x,z).name,level:r<80?1:r<130?3:r<190?4:r<250?6:r<310?8:10};}
