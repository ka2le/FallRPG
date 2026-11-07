import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {SCENERY} from './data.js';
import {LIFE_RANGE} from './life-layout.js';
import {terrainNormal} from './landscape.js';

// Opaque, low-poly understory and human/ecological traces. One shared mesh per
// species/tile, no per-prop materials, lights, animation mixers, or simulation.
export function lifeGeometry(kind){
  const pieces=[],pose=new THREE.Object3D(),up=new THREE.Vector3(0,1,0);
  const wood='#71604a',bone='#c8bb99',leaf='#728d4b',dark='#403e30',cloth='#a79771';
  function add(geo,color,x=0,y=0,z=0,sx=1,sy=sx,sz=sx,rotation=null){
    pose.position.set(x,y,z);pose.rotation.set(0,0,0);if(rotation)pose.quaternion.copy(rotation);pose.scale.set(sx,sy,sz);pose.updateMatrix();
    const g=geo.index?geo.toNonIndexed():geo.clone();g.applyMatrix4(pose.matrix);
    const c=new THREE.Color(color),a=new Float32Array(g.attributes.position.count*3);
    for(let i=0;i<a.length;i+=3)a.set([c.r,c.g,c.b],i);
    g.setAttribute('color',new THREE.BufferAttribute(a,3));g.deleteAttribute('uv');pieces.push(g);geo.dispose();
  }
  function rod(a,b,r,color=wood){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),dir=bv.sub(av),mid=av.clone().addScaledVector(dir,.5);add(new THREE.CylinderGeometry(.72,1,1,5,1,true),color,mid.x,mid.y,mid.z,r,dir.length(),r,new THREE.Quaternion().setFromUnitVectors(up,dir.normalize()));}
  function leafCard(x,y,z,length,width,angle,color=leaf,lift=.5){
    const p=[0,0,0,-width*.5,length*.45,lift*.5,0,length,lift,width*.5,length*.45,lift*.5];
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();
    add(g,color,x,y,z,1,1,1,new THREE.Quaternion().setFromAxisAngle(up,angle));
  }
  function cap(x,y,z,r,color){rod([x,0,z],[x,y,z],r*.14,bone);add(new THREE.ConeGeometry(r,r*.42,7,1),color,x,y,z);}
  if(kind==='fern'||kind==='bloom'||kind==='frost'||kind==='reed'||kind==='bramble'){
    const fern=kind==='fern',reed=kind==='reed',frost=kind==='frost',thorn=kind==='bramble';
    const color=frost?'#afbcb1':reed?'#899164':thorn?'#60704a':leaf;
    for(let i=0;i<(reed?7:fern?6:5);i++){
      const a=i*2.399,r=.15+(i%3)*.13,x=Math.cos(a)*r,z=Math.sin(a)*r,h=reed?.9+(i%3)*.28:thorn?.8+(i%3)*.17:.45+(i%3)*.15;
      if(reed){leafCard(x,0,z,h,.09,a,color,.2);rod([x,h*.5,z],[x,h+.15,z],.018,color);add(new THREE.CylinderGeometry(.035,.045,.24,5,1,true),'#74604b',x,h,z);}
      else if(fern){
        const end=[Math.cos(a)*1.05,h,Math.sin(a)*1.05];rod([0,0,0],end,.018,color);
        for(let j=1;j<5;j++)for(const side of [-1,1])leafCard(end[0]*j/5,end[1]*j/5,end[2]*j/5,.24*(1-j*.1),.19,a+side*.95,color,.18);
      }else{
        rod([x,0,z],[x*1.8,h,z*1.8],thorn?.035:.02,thorn?wood:color);
        for(let j=0;j<3;j++)leafCard(x*1.3,h*(.25+j*.24),z*1.3,thorn?.29:.38,thorn?.16:.22,a+j*2,color,.2);
        if(thorn)rod([x*1.5,h*.6,z*1.5],[x*2.2,h*.8,z*2.2],.016,bone);
        if(kind==='bloom'&&i%2===0){for(let k=0;k<5;k++)leafCard(x*1.8,h,z*1.8,.17,.14,k*1.256,'#dbc0a9',.2);}
      }
    }
  }else if(kind==='fungus'){
    for(let i=0;i<7;i++){const a=i*2.399,r=.15+(i%3)*.25;cap(Math.cos(a)*r,.16+(i%3)*.16,Math.sin(a)*r,.14+(i%3)*.055,i%2?'#c5a08b':'#b7b894');}
  }else if(kind==='litter'){
    for(let i=0;i<16;i++){const a=i*2.399,r=.2+(i%5)*.19;leafCard(Math.cos(a)*r,.015,Math.sin(a)*r,.06,.24,a,i%3?'#a87a4c':'#c79e63',.33);}
  }else if(kind==='deadwood'){
    rod([-1,.12,-.15],[1,.22,.2],.13);for(let i=0;i<3;i++)rod([-.7+i*.6,.18,0],[-.95+i*.6,.33,(i%2?1:-1)*.65],.045);
  }else if(kind==='bones'){
    rod([0,.22,-1.2],[0,.24,1.2],.075,bone);
    for(let i=0;i<5;i++)for(const side of [-1,1]){
      const z=-.8+i*.38,r=.42+Math.sin(i/5*Math.PI)*.23;
      let prev=[0,.38+r*.3,z];
      for(let j=1;j<=4;j++){const a=j/4*Math.PI*.62,next=[side*Math.sin(a)*r,.12+Math.cos(a)*r,z+.12*j/4];rod(prev,next,.04,bone);prev=next;}
    }
    add(new THREE.DodecahedronGeometry(.26,0),bone,0,.22,1.45,1,.75,1.25);
    for(let i=0;i<4;i++)cap(Math.sin(i*3)*.7,.22,-.7+i*.4,.16,'#a8b493');
  }else if(kind==='waystone'){
    add(new THREE.CylinderGeometry(.18,.3,1.5,5),'#8c9586',0,.57,0);
    rod([0,.7,0],[0,1.9,0],.035,wood);rod([-.3,1.55,0],[.4,1.55,0],.035,wood);
    leafCard(.05,1.15,.02,.36,.2,0,'#c1aa7c',.04);
    for(let i=0;i<3;i++)add(new THREE.DodecahedronGeometry(.19,0),'#828c7b',Math.sin(i*2)*.3,.07,Math.cos(i*2)*.3,1,.5,1);
  }else if(kind==='cache'){
    add(new THREE.BoxGeometry(1.25,.8,.9),wood,0,.22,0);
    for(const z of [-.46,.46])for(const x of [-.45,.45])rod([x,-.15,z],[x,.68,z],.045,bone);
    add(new THREE.BoxGeometry(1.4,.1,1),cloth,0,.68,0);
    for(let i=0;i<3;i++)add(new THREE.LatheGeometry([new THREE.Vector2(.12,0),new THREE.Vector2(.2,.1),new THREE.Vector2(.16,.35),new THREE.Vector2(.08,.4)],7),'#a5896b',-.7+i*.6,.05,.9);
  }else if(kind==='shelter'){
    for(const side of [-1,1]){rod([side*1.65,-.18,.8],[side*1.65,2.65,.8],.13);rod([side*1.65,-.18,-1.1],[side*1.65,1.6,-1.1],.13);rod([side*1.65,2.65,.8],[side*1.65,1.6,-1.1],.08);}
    rod([-1.8,2.65,.8],[1.8,2.65,.8],.09);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-1.95,2.6,1,0,2.38,1.2,1.95,2.6,1,-1.95,1.57,-1.3,0,1.38,-1.5,1.95,1.57,-1.3],3));g.setIndex([0,3,1,1,3,4,1,4,2,2,4,5]);g.computeVertexNormals();add(g,cloth);
    for(let i=0;i<3;i++)add(new THREE.CylinderGeometry(.22,.2,.5,7),'#8e8b61',-.8+i*.7,.25,-.4);
    add(new THREE.BoxGeometry(.7,.12,1.6),'#6d7868',.8,.08,.1);
    for(let i=0;i<7;i++)add(new THREE.DodecahedronGeometry(.15,0),dark,Math.cos(i*.9)*.5,.05,2.4+Math.sin(i*.9)*.5,1,.5,1);
  }
  const geometry=mergeGeometries(pieces);pieces.forEach(p=>p.dispose());geometry.computeBoundingSphere();return geometry;
}

export function buildWorldLife(world){
  const {items,sites}=SCENERY.life,geometry=new Map(),materials=new Map(),batches=new Map(),pose=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),normal=new THREE.Vector3();
  world.lifeTiles=[];
  for(const item of items){const key=[Math.floor(item.x/64),Math.floor(item.z/64),item.kind].join(':');if(!batches.has(key))batches.set(key,[]);batches.get(key).push(item);}
  for(const records of batches.values()){
    const kind=records[0].kind,range=LIFE_RANGE[kind];
    // A stable spatial shuffle makes the low preset reduce coverage evenly.
    records.sort((a,b)=>Math.sin(a.x*12.9+a.z*78.2)-Math.sin(b.x*12.9+b.z*78.2));
    if(!geometry.has(kind))geometry.set(kind,lifeGeometry(kind));
    if(!materials.has(kind)){
      const mat=new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.96});
      mat.onBeforeCompile=shader=>{
        shader.uniforms.lifeRange={value:range};shader.vertexShader='uniform float lifeRange;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
          float lifeD=length(instanceMatrix[3].xz-cameraPosition.xz);
          transformed.y*=1.-smoothstep(lifeRange-24.,lifeRange,lifeD);`);
      };mat.customProgramCacheKey=()=> 'life-'+kind;materials.set(kind,mat);
    }
    const mesh=new THREE.InstancedMesh(geometry.get(kind),materials.get(kind),records.length);
    for(const [i,item] of records.entries()){
      pose.position.set(item.x,item.y-.02,item.z);pose.rotation.set(0,item.rot,0);
      if(!['shelter','cache','waystone'].includes(kind)){const n=terrainNormal(item.x,item.z);normal.set(n.x,n.y,n.z);pose.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(up,normal));}
      pose.scale.setScalar(item.scale);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
      const color=new THREE.Color(['#dce7bb','#a9d2c0','#dfbb91','#bccfd6'][item.court]);mesh.setColorAt(i,color);
    }
    mesh.computeBoundingSphere();world.scene.add(mesh);world.lifeTiles.push({mesh,range,count:records.length,detail:!['shelter','cache','waystone','bones'].includes(kind),center:mesh.boundingSphere.center,radius:mesh.boundingSphere.radius});
  }
  // Small pollinator clouds inhabit flowers/fungal beds. All motion stays on GPU.
  const hosts=items.filter((p,i)=>i%17===0&&['bloom','fungus'].includes(p.kind)),bugGeo=new THREE.BufferGeometry();
  bugGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.09,0,.04,-.06,0,-.04,0,0,0,.09,0,.04,.06,0,-.04],3));bugGeo.computeVertexNormals();
  const bugs=new THREE.InstancedMesh(bugGeo,new THREE.MeshBasicMaterial({color:'#d7c985',side:THREE.DoubleSide}),hosts.length);
  bugs.material.onBeforeCompile=shader=>{shader.uniforms.lifeTime=world.feyClock;shader.vertexShader='uniform float lifeTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    float seed=instanceMatrix[3].x*.73+instanceMatrix[3].z*.31;
    transformed.y+=abs(position.x)*sin(lifeTime*22.+seed)*.8;
    transformed+=vec3(sin(lifeTime*.7+seed)*1.2,.8+sin(lifeTime*1.2+seed)*.35,cos(lifeTime*.53+seed)*1.2);
    transformed*=1.-smoothstep(50.,75.,length(instanceMatrix[3].xz-cameraPosition.xz));`);};
  bugs.material.customProgramCacheKey=()=> 'life-pollinators';
  hosts.forEach((p,i)=>{pose.position.set(p.x,p.y+.3,p.z);pose.rotation.set(0,0,0);pose.scale.setScalar(1);pose.updateMatrix();bugs.setMatrixAt(i,pose.matrix);});bugs.computeBoundingSphere();if(bugs.boundingSphere)bugs.boundingSphere.radius+=2;world.scene.add(bugs);
  world.lifeStats={items:items.length,sites:sites.length,batches:batches.size,pollinators:hosts.length};
}
export function updateWorldLife(world){
  const p=world.game.player;
  for(const tile of world.lifeTiles){tile.mesh.visible=Math.hypot(p.x-tile.center.x,p.z-tile.center.z)<tile.range+tile.radius;tile.mesh.count=tile.detail&&world.treeDetail<40?Math.ceil(tile.count*.55):tile.count;}
}
