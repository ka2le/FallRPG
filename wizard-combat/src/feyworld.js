import {hullGeometry} from './cover-shapes.js';
import {buildGround} from './ground.js';
import {forestMaterial,treeGeometry,forestRange,TREE_BLEND,TREE_CULL_MARGIN} from './forest-lod.js';
import {buildEcology,updateEcologyVisuals} from './ecology-render.js';
import {buildWorldLife,updateWorldLife} from './life-render.js';
import * as THREE from 'three';
import {generateTreeKind} from './fey/render/treeGen.js';
import {makeBarkTextures,makeLeafCardTexture,makeCapTexture,makeRockTexture,makeFlowerTexture} from './fey/render/textures.js';
import {CAMPS,SCENERY,seeded,terrain} from './data.js';
import {WORLD_HALF,COURTS,courtAt,pathDistance,POOLS,shoreRadius,waterDistance,biomeAt,terrainNormal} from './landscape.js';

// Feywild's procedural flora, rebuilt as a bounded, instanced FPS scene.
// No impostor bake, world erosion job, reflection pass, post stack or per-tree update.
export function buildFeyWorld(world){
  const {scene}=world,rng=seeded(1841),clock={value:0};world.feyClock=clock;
  scene.fog=new THREE.FogExp2('#9bacae',.0032);world.renderer.setClearColor('#9bacae');
  const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.92,...extra});
  const mesh=(geo,mat,x,y,z)=>world.mesh(geo,mat,x,y,z);
  buildGround(world);
  const sky=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{time:clock},vertexShader:'varying vec3 v;void main(){v=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}',fragmentShader:`varying vec3 v;uniform float time;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
    void main(){vec3 d=normalize(v);float h=max(d.y,0.);vec3 col=mix(vec3(.64,.71,.69),vec3(.19,.30,.43),pow(h,.5));vec2 p=d.xz/(h+.18)*2.5+time*.002;float cloud=noise(p)*.6+noise(p*2.)*.27+noise(p*4.)*.13;col=mix(col,vec3(.86,.79,.78),smoothstep(.5,.78,cloud)*smoothstep(0.,.22,h)*.65);col+=vec3(.22,.16,.08)*pow(max(0.,dot(d,normalize(vec3(-.5,.5,-.8)))),20.);gl_FragColor=vec4(col,1.);}`});
  world.feySky=mesh(new THREE.SphereGeometry(650,24,16),sky,0,0,0);
  // Rock meshes and collision hulls use the same bevelled profiles. Spatial tiles cull whole outcrops.
  const rock=makeRockTexture(31),stone=material('#c8c8b7',{map:rock.map,normalMap:rock.normal,normalScale:new THREE.Vector2(.18,.18)});
  const timber=makeBarkTextures('oak',63),logMat=material('#aa967c',{map:timber.map,normalMap:timber.normal});
  const rockGeometries=Array.from({length:4},(_,variant)=>{
    const {vertices,faces}=hullGeometry(variant),positions=[],uv=[],colors=[];
    for(const face of faces)for(const i of face){const [x,y,z]=vertices[i];positions.push(x,y,z);uv.push(x*.6+z*.4,y*.7+z*.3);const shade=.8+y*.35;colors.push(shade,shade*(y>.7?1.04:1),shade*.96);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
  });
  const rockMat=material('#ffffff',{map:rock.map,normalMap:rock.normal,normalScale:new THREE.Vector2(.18,.18),vertexColors:true});
  const batches=new Map(),pose=new THREE.Object3D();
  for(const r of SCENERY.rocks){const key=[Math.floor(r.x/96),Math.floor(r.z/96),r.variant,r.kind].join(':');if(!batches.has(key))batches.set(key,[]);batches.get(key).push(r);}
  for(const records of batches.values()){
    const first=records[0],m=new THREE.InstancedMesh(rockGeometries[first.variant],first.kind==='log'?logMat:rockMat,records.length);
    for(const [i,r] of records.entries()){pose.position.set(r.x,r.base,r.z);pose.rotation.set(0,r.rot,0);pose.scale.set(r.width/2,r.h,r.depth/2);pose.updateMatrix();m.setMatrixAt(i,pose.matrix);const court=courtAt(r.x,r.z);m.setColorAt(i,new THREE.Color(r.kind==='log'?'#aa9474':court===3?'#b6c4d0':court===2?'#a69a87':'#9aa78a').multiplyScalar(r.tint));}
    m.computeBoundingSphere();scene.add(m);
  }
  // Irregular basin outlines match the height field; no opaque circles crossing hills.
  world.waterSurfaces=[];
  for(const p of POOLS){
    const positions=[0,0,0],indices=[],segments=80;
    for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,r=shoreRadius(p,a);positions.push(Math.cos(a)*r,0,Math.sin(a)*r);if(i<segments)indices.push(0,i+2,i+1);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
    const mat=new THREE.MeshStandardMaterial({color:p.kind==='ice'?'#bad5df':p.kind==='lava'?'#dc642b':'#5b9e9e',roughness:p.kind==='water'?.26:.45,metalness:.18,transparent:p.kind==='water',opacity:p.kind==='water'?.76:1,emissive:p.kind==='lava'?'#e54b14':'#000000',emissiveIntensity:p.kind==='lava'?.7:0,side:THREE.DoubleSide});
    mat.onBeforeCompile=shader=>{shader.uniforms.poolTime=clock;shader.vertexShader='varying vec3 vPool;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPool=(modelMatrix*vec4(position,1.)).xyz;');shader.fragmentShader='uniform float poolTime;varying vec3 vPool;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float ripple=sin(vPool.x*.85+sin(vPool.z*.5)+poolTime*.7)*sin(vPool.z*1.1-poolTime*.5);
      diffuseColor.rgb*=.92+ripple*.08;`);};
    mat.customProgramCacheKey=()=> 'fey-pool-ripple';world.waterSurfaces.push(mesh(geo,mat,p.x,p.y,p.z));
  }
  const wind=(m,leaf=false)=>{m.onBeforeCompile=s=>{s.uniforms.feyTime=clock;s.vertexShader='uniform float feyTime;\n'+(leaf?'attribute float aLeaf;\n':'')+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\n#ifdef USE_INSTANCING\ntransformed.x+=sin(feyTime*1.4+instanceMatrix[3].x*.19+position.y)*${leaf?'aLeaf*.09':'min(position.y,1.)*.12'};\n#endif`);};m.customProgramCacheKey=()=>leaf?'fey-leaf-wind':'fey-grass-wind';return m;};
  const bark=makeBarkTextures('oak',11),birch=makeBarkTextures('birch',12),leafMaps={broad:makeLeafCardTexture('broad',21),blossom:makeLeafCardTexture('blossom',23),needle:makeLeafCardTexture('needle',24)};
  const barkMat=material('#b6a394',{map:bark.map,normalMap:bark.normal}),birchMat=material('#ddd4cd',{map:birch.map,normalMap:birch.normal});
  const leafMat=(map,color)=>wind(material(color,{map,alphaTest:.42,side:THREE.DoubleSide,alphaToCoverage:true}),true);
  const palettes={blossom:'#e6afcb',oak:'#90b76a',willow:'#72b899',maple:'#e0a359',pine:'#94b3ac',crystal:'#a7cce9',mushroom:'#a8c8e1'};
  const kinds=Object.keys(palettes),records=new Map(kinds.map(k=>[k,[]]));
  for(const t of SCENERY.trees)records.get(t.kind).push({...t,color:new THREE.Color(palettes[t.kind]).multiplyScalar(t.tint)});
  world.forest=[];const dummy=new THREE.Object3D(),color=new THREE.Color();
  world.forestUniforms={treeDetail:{value:55},treeRange:{value:forestRange(220)}};
  const forestFrustum=new THREE.Frustum(),forestMatrix=new THREE.Matrix4(),treeSphere=new THREE.Sphere();
  for(const [kind,trees] of records){
    const gen=generateTreeKind(kind,31+kinds.indexOf(kind)*17);let highMats,lowMats;
    if(kind==='mushroom'){highMats=[birchMat,material('#ffffff',{map:makeCapTexture(4)}),material('#bddfe6',{emissive:'#517d83',emissiveIntensity:.4})];lowMats=highMats;}
    else if(kind==='crystal'){highMats=[material('#9da8bf',{metalness:.15}),material('#ffffff',{emissive:'#548cb0',emissiveIntensity:.3,metalness:.25,roughness:.3})];lowMats=highMats;}
    else{highMats=[kind==='pine'?birchMat:barkMat,leafMat(leafMaps[kind==='blossom'?'blossom':kind==='pine'?'needle':'broad'],'#ffffff')];lowMats=highMats;}
    const canopyMats=highMats.map(m=>forestMaterial(m,world.forestUniforms));
    lowMats=lowMats.map(m=>forestMaterial(m,world.forestUniforms,false));
    highMats=highMats.map(m=>forestMaterial(m,world.forestUniforms,true));
    const hi=new THREE.InstancedMesh(treeGeometry(gen.high,false),highMats,trees.length),lo=new THREE.InstancedMesh(treeGeometry(gen.low,false),lowMats,trees.length),canopy=new THREE.InstancedMesh(treeGeometry(gen.high,true),canopyMats,trees.length);
    for(const t of trees){dummy.position.set(t.x,t.y,t.z);dummy.rotation.set(0,t.rot,0);dummy.scale.setScalar(t.scale);dummy.updateMatrix();t.bounds=gen.high.boundingSphere.clone().applyMatrix4(dummy.matrix);}
    for(const m of [hi,lo,canopy]){m.frustumCulled=false;m.count=0;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(m);}world.forest.push({trees,hi,lo,canopy});
  }
  world.updateForest=()=>{
    const p=world.game.player,range=forestRange(world.viewDistance);
    world.forestOrigin={x:p.x,z:p.z,yaw:p.yaw,pitch:p.pitch};
    forestFrustum.setFromProjectionMatrix(forestMatrix.multiplyMatrices(world.camera.projectionMatrix,world.camera.matrixWorldInverse));
    for(const batch of world.forest){
      let nh=0,nl=0,nc=0;
      for(const t of batch.trees){
        const d=Math.hypot(t.x-p.x,t.z-p.z);if(d>range+TREE_CULL_MARGIN)continue;
        treeSphere.copy(t.bounds);treeSphere.radius+=8+d*.2;if(!forestFrustum.intersectsSphere(treeSphere))continue;
        dummy.position.set(t.x,t.y,t.z);dummy.rotation.set(0,t.rot,0);dummy.scale.setScalar(t.scale);dummy.updateMatrix();
        batch.canopy.setMatrixAt(nc,dummy.matrix);batch.canopy.setColorAt(nc++,t.color);
        if(d<world.treeDetail+TREE_BLEND+TREE_CULL_MARGIN){batch.hi.setMatrixAt(nh,dummy.matrix);batch.hi.setColorAt(nh++,t.color);}
        if(d>world.treeDetail-TREE_BLEND-TREE_CULL_MARGIN){batch.lo.setMatrixAt(nl,dummy.matrix);batch.lo.setColorAt(nl++,t.color);}
      }
      batch.hi.count=nh;batch.lo.count=nl;batch.canopy.count=nc;
      for(const m of [batch.hi,batch.lo,batch.canopy]){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
    }
  };
  world.treeDetail=55;world.viewDistance=220;world.updateForest();world.forestTimer=0;
  // Instanced grass and flowers in independently culled tiles.
  const blade=new THREE.BufferGeometry();blade.setAttribute('position',new THREE.Float32BufferAttribute([-.035,0,0,.035,0,0,.04,.34,0,0,0,-.035,0,0,.035,-.03,.27,.02,-.05,0,-.03,.01,0,.03,-.06,.23,0],3));blade.computeVertexNormals();
  const grassMat=wind(material('#98af79',{side:THREE.DoubleSide})),flowerMat=material('#ffffff',{map:makeFlowerTexture(),transparent:false,alphaTest:.35,side:THREE.DoubleSide});world.groundTiles=[];
  for(let tz=-6;tz<6;tz++)for(let tx=-6;tx<6;tx++){
    const x=(tx+.5)*64,z=(tz+.5)*64,grass=new THREE.InstancedMesh(blade,grassMat,1500),flowers=new THREE.InstancedMesh(new THREE.PlaneGeometry(.4,.5),flowerMat,20);let ng=0,nf=0;
    for(let i=0;i<1500;i++){const gx=x+(rng()-.5)*64,gz=z+(rng()-.5)*64;const biome=biomeAt(gx,gz);if(biome.path>.5||waterDistance(gx,gz)<1||biome.rock>.65||biome.ash>.6||biome.snow>.8)continue;
      dummy.position.set(gx,terrain(gx,gz),gz);dummy.rotation.set(0,rng()*6.28,0);dummy.scale.setScalar(.7+rng()*.9);dummy.updateMatrix();grass.setMatrixAt(ng,dummy.matrix);grass.setColorAt(ng++,color.set(courtAt(gx,gz)===3?'#d6e0de':courtAt(gx,gz)===2?'#bc9d65':'#94b975'));
      if(i%73===0&&nf<20){dummy.position.y+=.24;dummy.updateMatrix();flowers.setMatrixAt(nf,dummy.matrix);flowers.setColorAt(nf++,color.set(['#e9b4dd','#b8dcca','#f5cc84','#c9d9f8'][courtAt(gx,gz)]));}
    }grass.count=ng;flowers.count=nf;grass.computeBoundingSphere();flowers.computeBoundingSphere();scene.add(grass,flowers);world.groundTiles.push({x,z,grass,flowers});
  }
  // The Hearth is a landmark, not a town: a small ring of runestones around a blue flame.
  const hearthMat=material('#82cbd7',{emissive:'#62c8e5',emissiveIntensity:1.3});world.hearth=mesh(new THREE.OctahedronGeometry(.7),hearthMat,0,terrain(0,0)+2,0);
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2,x=Math.sin(a)*4,z=Math.cos(a)*4;mesh(new THREE.DodecahedronGeometry(.65,0),stone,x,terrain(x,z)+.4,z);}
  world.landmarks=[];for(const [i,c] of CAMPS.entries()){const ring=mesh(new THREE.TorusGeometry(1.1,.07,5,32),material('#b6dcc9',{emissive:'#6bb6b4',emissiveIntensity:.5}),c.x,terrain(c.x,c.z)+.14,c.z);ring.rotation.x=Math.PI/2;world.landmarks.push({mesh:ring,camp:i});}
  const motesGeo=new THREE.BufferGeometry(),points=[];for(let i=0;i<160;i++)points.push((rng()-.5)*80,rng()*8,(rng()-.5)*80);motesGeo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));world.motes=new THREE.Points(motesGeo,new THREE.PointsMaterial({color:'#c5e9d4',size:.08,transparent:true,opacity:.6,depthWrite:false}));scene.add(world.motes);
  buildEcology(world);
  buildWorldLife(world);
}
export function updateFeyWorld(world,dt){
  const p=world.game.player;world.feyClock.value+=dt;world.feySky.position.copy(world.camera.position);world.hearth.rotation.y+=dt*.4;world.hearth.position.y=terrain(0,0)+2+Math.sin(world.feyClock.value)*.15;
  world.forestUniforms.treeDetail.value=world.treeDetail;world.forestUniforms.treeRange.value=forestRange(world.viewDistance);
  if(Math.hypot(p.x-world.forestOrigin.x,p.z-world.forestOrigin.z)>TREE_CULL_MARGIN*.5||Math.abs(p.yaw-world.forestOrigin.yaw)>.08||Math.abs(p.pitch-world.forestOrigin.pitch)>.08)world.forestTimer=0;
  world.forestTimer-=dt;if(world.forestTimer<=0){world.updateForest();world.forestTimer=.35;for(const tile of world.groundTiles){const near=Math.hypot(tile.x-p.x,tile.z-p.z)<world.viewDistance*.65;tile.grass.visible=tile.flowers.visible=near;}for(const l of world.landmarks)l.mesh.material.color.set(world.game.cleared.has(l.camp)?'#d6b477':'#b6dcc9');}
  world.motes.position.set(p.x,terrain(p.x,p.z),p.z);world.motes.rotation.y+=dt*.01;
  updateEcologyVisuals(world,dt);
  world.lifeTimer=(world.lifeTimer||0)-dt;if(world.lifeTimer<=0){updateWorldLife(world);world.lifeTimer=.35;}
}

