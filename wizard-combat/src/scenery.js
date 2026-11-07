import {terrain,terrainNormal,biomeAt,courtAt,pathDistance,waterDistance,regionAt} from './landscape.js';
import {makeHull,spatialIndex} from './cover-shapes.js';
import {createEcologyCover,ecologyClearance} from './ecology-layout.js';
import {generateWorldLife} from './life-layout.js';
const seeded=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
export function generateScenery(camps){
  const rng=seeded(8174),rocks=[],trees=[];
  const addRock=(x,z,width,depth,h,variant,rot=0,kind='rock')=>{
    const center=terrain(x,z),base=Math.min(center,...[0,1,2,3].map(i=>{const a=rot+i*Math.PI/2;return terrain(x+Math.cos(a)*width*.4,z+Math.sin(a)*depth*.4);}))-.18;
    rocks.push(makeHull({x,z,width,depth,h:h+center-base-.18,variant,rot,kind,base,tint:.8+rng()*.35}));
  };
  // A few low stepping stones and tall boulders near the Hearth establish cover immediately.
  addRock(-7,-6,6,3,1.1,3);addRock(-9,-10,5,4,2.4,0);addRock(8,-13,3.5,7,3.8,3);
  // Encounter cover varies in orientation, scale, count and spacing rather than repeating a room.
  for(const [i,c] of camps.entries())for(let j=0;j<4+i%5;j++){
    const a=rng()*Math.PI*2,r=9+rng()*14,x=c.x+Math.cos(a)*r,z=c.z+Math.sin(a)*r;
      if(waterDistance(x,z)<1||ecologyClearance(x,z,4))continue;
    const large=j<2,h=large?3.4+rng()*3.8:.8+rng()*1.3;
    addRock(x,z,large?4+rng()*5:2+rng()*4,large?3+rng()*4:2+rng()*3,h,j%4,rng()*Math.PI);
  }
  // Loose outcrops form broken silhouettes, with open approaches between clusters.
  for(let i=0;i<230;i++){
    const cx=(rng()-.5)*770,cz=(rng()-.5)*770;
    for(let j=0;j<3+Math.floor(rng()*5);j++){
      const x=cx+(rng()-.5)*23,z=cz+(rng()-.5)*23,large=rng()<.23,width=large?5+rng()*7:1.2+rng()*3.5,depth=width*(.5+rng()*.6);
      if(Math.hypot(x,z)<25||ecologyClearance(x,z,5)||camps.some(c=>Math.hypot(c.x-x,c.z-z)<8)||pathDistance(x,z)<3+width*.5||waterDistance(x,z)<1||terrainNormal(x,z).y<.55)continue;
      addRock(x,z,width,depth,large?3+rng()*6:.5+rng()*2.3,Math.floor(rng()*3),rng()*Math.PI);
    }
  }
  const rockQuery=spatialIndex(rocks);
  const trunk={oak:[.46,4],blossom:[.3,2.3],willow:[.43,3.5],maple:[.33,3.2],pine:[.3,7],crystal:[.28,4],mushroom:[.62,4.5]};
  const treeCells=new Map();
  for(let i=0;i<7100;i++){
    const x=(rng()-.5)*785,z=(rng()-.5)*785,b=biomeAt(x,z);
    if(Math.hypot(x,z)<28||ecologyClearance(x,z,3)||pathDistance(x,z)<5.5||waterDistance(x,z)<1||terrainNormal(x,z).y<.68||camps.some(c=>Math.hypot(c.x-x,c.z-z)<6)||rockQuery(x-2,z-2,x+2,z+2).some(r=>Math.abs(x-r.x)<r.w/2+1.5&&Math.abs(z-r.z)<r.d/2+1.5))continue;
    if(b.ash>.6&&rng()<.8||b.rock>.7&&rng()<.7)continue;
    if(b.openness>.1&&rng()<b.openness*.91)continue;
    const gx=Math.floor(x/4),gz=Math.floor(z/4);let near=false;for(let a=gx-1;a<=gx+1;a++)for(let d=gz-1;d<=gz+1;d++)for(const t of treeCells.get(a+','+d)||[])if(Math.hypot(t.x-x,t.z-z)<3.3)near=true;if(near)continue;
    const c=b.court,kind=c===0?(rng()<.55?'blossom':'oak'):c===1?(rng()<.35?'mushroom':'willow'):c===2?(rng()<.8?'maple':'oak'):(rng()<.2?'crystal':'pine');
    const scale=(.8+rng()*.9)*(b.forest>.6?1.25:1),rot=rng()*Math.PI*2,[radius,h]=trunk[kind];
    const t={x,z,y:terrain(x,z),kind,scale,rot,tint:.8+rng()*.3};trees.push(t);const key=gx+','+gz;if(!treeCells.has(key))treeCells.set(key,[]);treeCells.get(key).push(t);
    t.collider=makeHull({x,z,base:t.y-.1,width:radius*2*scale,depth:radius*2*scale,h:h*scale,variant:3,rot,kind:'trunk'});
  }
  // Fallen timber makes low cover and a stepping surface in the wooded courts.
  for(const t of trees.filter((t,i)=>i%32===0&&['oak','maple','willow'].includes(t.kind))){const x=t.x+4,z=t.z+4;if(pathDistance(x,z)>7&&waterDistance(x,z)>3&&!camps.some(c=>Math.hypot(c.x-x,c.z-z)<7))addRock(x,z,1.5,6+rng()*4,1.2,3,t.rot,'log');}
  const ecology=createEcologyCover(),life=generateWorldLife(camps,trees,rocks);
  const cover=[...rocks,...trees.map(t=>t.collider),...ecology,...life.cover].map((r,id)=>({...r,id}));
  return {cover,rocks:cover.filter(r=>r.kind==='rock'||r.kind==='log'),trees,ecology,life};
}
export function generateWilds(camps,cover){
  const rng=seeded(9163),query=spatialIndex(cover),groups=[];
  const families=[['seedling','spitter','healer'],['wisp','spitter','healer'],['ash','spitter','prowler'],['ice','wisp','spitter']];
  // Jittered cells cover the entire map; spacing keeps packs distinct rather than one endless aggro chain.
  for(let gx=-6;gx<=6;gx++)for(let gz=-6;gz<=6;gz++){
    let x,z,valid=false;
    for(let attempt=0;attempt<12;attempt++){
      x=gx*58+(rng()-.5)*30;z=gz*58+(rng()-.5)*30;
      if(Math.hypot(x,z)<68||ecologyClearance(x,z,12)||camps.some(c=>Math.hypot(c.x-x,c.z-z)<38)||groups.some(c=>Math.hypot(c.x-x,c.z-z)<38)||waterDistance(x,z)<3||terrainNormal(x,z).y<.8||query(x-4,z-4,x+4,z+4).some(r=>Math.abs(x-r.x)<r.w/2+3&&Math.abs(z-r.z)<r.d/2+3))continue;
      valid=true;break;
    }
    if(!valid)continue;
    const court=courtAt(x,z),level=regionAt(x,z).level,roll=rng();let types;
    if(level<3)types=Array(2+Math.floor(rng()*2)).fill('seedling');
    else if(roll<.16&&level>=4)types=Array(5+Math.floor(rng()*4)).fill('swarm');
    else if(roll>.92&&level>=6)types=['titan',families[court][0]];
    else if(roll<.3)types=['prowler','prowler'];
    else{types=Array(2+Math.floor(rng()*3)).fill(families[court][0]);if(level>=4&&rng()<.4)types.push(families[court][2]);}
    groups.push({x,z,level,types,id:groups.length,roam:5+rng()*4});
  }
  return groups;
}
