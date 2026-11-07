import {terrain,terrainNormal,biomeAt,pathDistance,waterDistance,courtAt} from './landscape.js';
import {HABITATS} from './habitats.js';
import {Noise} from './fey/core/noise.js';
import {makeHull,spatialIndex,solidSpan} from './cover-shapes.js';

const noise=new Noise(6319);
const random=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
export const LIFE_RANGE={fern:115,bramble:145,reed:150,bloom:115,fungus:130,litter:100,frost:125,deadwood:165,bones:190,cache:210,waystone:230,shelter:260};
// Static evidence of the lore's food cycles and travel routes. No extra AI actors.
export function generateWorldLife(camps,trees,rocks){
  const rng=random(40513),items=[],cover=[],sites=[],query=spatialIndex([...rocks,...trees.map(t=>t.collider)]);
  const occupied=(x,z,r=1)=>query(x-r,z-r,x+r,z+r).some(o=>Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r);
  const habitatCore=(x,z,pad=0)=>HABITATS.some(h=>Math.hypot(x-h.x,z-h.z)<h.r*.65+pad);
  function put(kind,x,z,scale=1,rot=rng()*Math.PI*2,site=null){
    const item={kind,x,z,y:terrain(x,z),scale,rot,court:courtAt(x,z),site,range:LIFE_RANGE[kind]};items.push(item);return item;
  }
  function solid(item,lx,lz,width,depth,height,variant=3){
    const c=Math.cos(item.rot),s=Math.sin(item.rot),x=item.x+(lx*c+lz*s)*item.scale,z=item.z+(-lx*s+lz*c)*item.scale;
    cover.push(makeHull({x,z,base:item.y-.18,width:width*item.scale,depth:depth*item.scale,h:height*item.scale+.18,variant,rot:item.rot,kind:'life-'+item.kind}));
  }
  // Continuous understory follows moist hollows, tree shelter and grazing fronts.
  // Clusters overlap; no circular plots or new flattening stamps are introduced.
  for(let z=-388;z<388;z+=8.5)for(let x=-388;x<388;x+=8.5){
    const px=x+rng()*8.5,pz=z+rng()*8.5,r=Math.hypot(px,pz),path=pathDistance(px,pz);
    if(r<27||path<1.7||habitatCore(px,pz)||occupied(px,pz,.8)||terrainNormal(px,pz).y<.76||waterDistance(px,pz)<.7)continue;
    const b=biomeAt(px,pz),patch=noise.noise2(px*.045,pz*.045);
    if(rng()>.38+patch*.28+b.forest*.24)continue;
    let kind=b.snow>.65?'frost':b.wet>.2?'reed':b.ash>.6?(rng()<.6?'deadwood':'fungus'):b.court===2?(rng()<.5?'litter':'fungus'):b.court===0?(rng()<.55?'fern':'bloom'):'fern';
    if(b.forest>.35&&path>6&&rng()<.22)kind='bramble';
    const count=2+Math.floor(rng()*3);
    for(let i=0;i<count;i++){
      const xx=px+(rng()-.5)*5,zz=pz+(rng()-.5)*5;
      if(pathDistance(xx,zz)<1.5||waterDistance(xx,zz)<.5||occupied(xx,zz,.45)||terrainNormal(xx,zz).y<.75)continue;
      put(kind,xx,zz,.65+rng()*1.1);
    }
  }
  // Feeding/decay traces belong to an actual tree or fallen log, not arbitrary disks.
  for(let i=0;i<trees.length;i+=7){const t=trees[i],a=rng()*6.28;
    for(let j=0;j<3;j++){const x=t.x+Math.cos(a+j*.5)*(1.2+j*.5),z=t.z+Math.sin(a+j*.5)*(1.2+j*.5);if(waterDistance(x,z)<.4||occupied(x,z,.25))continue;put(t.kind==='pine'?'frost':j===0?'fungus':t.kind==='maple'?'litter':'fern',x,z,.7+rng()*.6);}
  }
  for(const log of rocks.filter(r=>r.kind==='log'))for(let j=0;j<4;j++){
    const x=log.x+(rng()-.5)*log.w,z=log.z+(rng()-.5)*log.d;
    const span=solidSpan(log,x,z);if(!span)continue;
    const p=put('fungus',x,z,.55+rng()*.6);p.y=span[1]-.03;
  }
  // Small roadside shelters and seed stores: people maintain the same routes as herds.
  for(let attempt=0;attempt<5000&&sites.length<14;attempt++){
    const x=(rng()-.5)*680,z=(rng()-.5)*680,d=pathDistance(x,z);
    if(Math.hypot(x,z)<45||d<12||d>18||habitatCore(x,z,6)||waterDistance(x,z)<12||terrainNormal(x,z).y<.97||occupied(x,z,5)||camps.some(c=>Math.hypot(x-c.x,z-c.z)<28)||sites.some(p=>Math.hypot(x-p.x,z-p.z)<65))continue;
    const court=courtAt(x,z);if(sites.filter(p=>p.court===court).length>=4)continue;
    if(sites.length%3===2&&biomeAt(x,z).seasons.slice().sort((a,b)=>b-a)[1]<.12)continue;
    const y=terrain(x,z);if([[3,3],[-3,3],[3,-3],[-3,-3]].some(([dx,dz])=>Math.abs(terrain(x+dx,z+dz)-y)>.7))continue;
    const id=sites.length,site={x,z,id,court,kind:id%3===0?'corpse garden':id%3===1?'seed courier stop':'boundary store'};sites.push(site);
    const rot=rng()*6.28;
    if(site.kind==='seed courier stop'){
      const shelter=put('shelter',x,z,1,rot,id);
      for(const side of [-1,1]){solid(shelter,side*1.65,.8,.26,.26,2.65);solid(shelter,side*1.65,-1.1,.26,.26,1.6);}
    }else if(site.kind==='corpse garden')put('bones',x,z,1.1+rng()*.5,rot,id);
    else {const cache=put('cache',x,z,1,rot,id);solid(cache,0,0,1.25,.9,.8);}
    for(let i=0;i<13;i++){
      const a=rng()*6.28,r=2+rng()*5,xx=x+Math.cos(a)*r,zz=z+Math.sin(a)*r;
      if(occupied(xx,zz,.5)||pathDistance(xx,zz)<1.7||waterDistance(xx,zz)<1)continue;
      put(site.kind==='corpse garden'?(i<3?'bones':'fungus'):i%4===0?'litter':site.court===3?'frost':'bloom',xx,zz,.45+rng()*.8,rng()*6.28,id);
    }
    const marker=put('waystone',x+Math.cos(rot)*3.8,z-Math.sin(rot)*3.8,.8,rot,id);solid(marker,0,0,.6,.6,1.5,1);
  }
  // Smaller remains and seasonal resource patches continue well between the stops.
  for(let i=0;i<180;i++){
    const x=(rng()-.5)*720,z=(rng()-.5)*720;
    if(Math.hypot(x,z)<36||pathDistance(x,z)<3||habitatCore(x,z,3)||occupied(x,z,2)||waterDistance(x,z)<2||terrainNormal(x,z).y<.94)continue;
    put(i%5===0?'bones':'deadwood',x,z,.5+rng()*.75);
    for(let j=0;j<5;j++){const xx=x+(rng()-.5)*4,zz=z+(rng()-.5)*4;if(!occupied(xx,zz,.4)&&pathDistance(xx,zz)>1.5&&waterDistance(xx,zz)>.5)put('fungus',xx,zz,.5+rng()*.6);}
  }
  return {items,cover,sites};
}
