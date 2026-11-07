import * as THREE from 'three';
import {HABITATS,HOLLOW,ECO_TREES,CANOPY_TREES,THAWLINE} from './habitats.js';
import {terrain,environmentAt} from './landscape.js';
import {SCENERY,seeded} from './data.js';
import {hullGeometry} from './cover-shapes.js';
import {makeBarkTextures,makeLeafCardTexture} from './fey/render/textures.js';

export function buildEcology(world){
  const rng=seeded(5821),scene=world.scene,pose=new THREE.Object3D(),up=new THREE.Vector3(0,1,0);
  const mat=(color,more={})=>new THREE.MeshStandardMaterial({color,roughness:.9,...more});
  const barkMaps=makeBarkTextures('oak',213),bark=mat('#c4b197',{map:barkMaps.map,normalMap:barkMaps.normal,normalScale:new THREE.Vector2(.35,.35),emissive:'#74654b',emissiveIntensity:.09});
  const deadBark=mat('#c6b69b',{map:barkMaps.map,normalMap:barkMaps.normal,normalScale:new THREE.Vector2(.35,.35),side:THREE.DoubleSide,emissive:'#786446',emissiveIntensity:.16});
  const leafMap=makeLeafCardTexture('broad',514);
  const foliage=mat('#b1cb8c',{map:leafMap,side:THREE.DoubleSide,alphaTest:.4,emissive:'#435e32',emissiveIntensity:.25});
  foliage.onBeforeCompile=shader=>{shader.uniforms.ecoTime=world.ecoClockUniform;shader.vertexShader='uniform float ecoTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nvec3 ecoBase = (instanceMatrix * vec4(position,1.)).xyz;\ntransformed.x += sin(ecoTime*1.4+ecoBase.x*.25+ecoBase.z*.13)*.045*position.y;\n#endif');};
  const gold=mat('#ead698',{emissive:'#b29b45',emissiveIntensity:.2});
  const moss=mat('#7b9751'),dark=mat('#28372e'),snow=mat('#deedef'),basalt=mat('#45514c');
  const sap=mat('#e9a548',{emissive:'#bb6a18',emissiveIntensity:.45});
  const mushroom=mat('#bca2aa',{emissive:'#594b70',emissiveIntensity:.15});
  const orchid=mat('#d0e3b1',{emissive:'#a4d58e',emissiveIntensity:.55,side:THREE.DoubleSide});
  const sphere=new THREE.SphereGeometry(1,10,7),cylinder=new THREE.CylinderGeometry(.75,1,1,8),cone=new THREE.ConeGeometry(1,1,7),card=new THREE.PlaneGeometry(1,1),torus=new THREE.TorusGeometry(1,.12,6,12);
  const sites=HABITATS.map(site=>({site,group:new THREE.Group(),batches:new Map()}));
  const siteFor=(x,z)=>sites.reduce((a,b)=>Math.hypot(a.site.x-x,a.site.z-z)<Math.hypot(b.site.x-x,b.site.z-z)?a:b);
  function put(geo,material,x,y,z,sx=1,sy=sx,sz=sx,rotation=null,color=null){
    const tile=siteFor(x,z),key=geo.uuid+material.uuid;if(!tile.batches.has(key))tile.batches.set(key,{geo,material,items:[]});
    pose.position.set(x,y,z);pose.rotation.set(0,0,0);pose.quaternion.identity();if(rotation)pose.quaternion.copy(rotation);pose.scale.set(sx,sy,sz);pose.updateMatrix();tile.batches.get(key).items.push({matrix:pose.matrix.clone(),color});
  }
  function rod(a,b,r,material=bark){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av),mid=av.add(bv).multiplyScalar(.5);put(cylinder,material,mid.x,mid.y,mid.z,r,d.length(),r,new THREE.Quaternion().setFromUnitVectors(up,d.normalize()));}
  const rotation=(x,y,z)=>new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z));
  function leaves(x,y,z,r,color='#90b476',count=40){for(let i=0;i<count;i++){const a=rng()*Math.PI*2,rr=Math.sqrt(rng())*r,scale=Math.max(1,r/3.2);put(card,foliage,x+Math.cos(a)*rr,y+(rng()-.5)*r*.7,z+Math.sin(a)*rr,(1.5+rng()*1.5)*scale,(1.1+rng())*scale,1,rotation((rng()-.5)*1.8,rng()*6.28,(rng()-.5)*1.2),color);}}
  // The elder is exactly the segmented collider shell, including inner faces.
  const shellPositions=[],shellUV=[],hullCache=new Map();
  for(const r of SCENERY.ecology){
    if(r.kind==='elder-shell'){
      for(const face of r.faces)for(const i of face){const p=r.points[i];shellPositions.push(p.x,p.y,p.z);shellUV.push((p.x+p.y)*.16,p.z*.12);}
      continue;
    }
    let geo=hullCache.get(r.variant);if(!geo){
    const {vertices,faces}=hullGeometry(r.variant),positions=[],uv=[];
    for(const face of faces)for(const i of face){const [x,y,z]=vertices[i];positions.push(x,y,z);uv.push(x+z,y*3);}
    geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();hullCache.set(r.variant,geo);}
    put(geo,r.kind==='snow-roof'?snow:r.kind==='warm-stone'?basalt:bark,r.x,r.base,r.z,r.width/2,r.h,r.depth/2,rotation(0,r.rot||0,0));
  }
  const shellGeo=new THREE.BufferGeometry();shellGeo.setAttribute('position',new THREE.Float32BufferAttribute(shellPositions,3));shellGeo.setAttribute('uv',new THREE.Float32BufferAttribute(shellUV,2));shellGeo.computeVertexNormals();
  const shellColors=[],shellTint=new THREE.Color(),shellFloor=terrain(HOLLOW.x,HOLLOW.z);
  for(let i=0;i<shellPositions.length;i+=3){const x=shellPositions[i]-HOLLOW.x,y=shellPositions[i+1]-shellFloor,z=shellPositions[i+2]-HOLLOW.z,a=Math.atan2(y,x);
    const mossy=y>6&&Math.sin(z*.37+a*4)+Math.sin(z*.81-a*3)>.25;
    shellTint.set(mossy?'#68734b':'#b9a17a').multiplyScalar(.76+.12*Math.sin(a*19+z*.28)+.1*Math.sin(z*.6));shellColors.push(shellTint.r,shellTint.g,shellTint.b);
  }
  shellGeo.setAttribute('color',new THREE.Float32BufferAttribute(shellColors,3));
  const shellMaterial=deadBark.clone();shellMaterial.color.set('#ffffff');shellMaterial.vertexColors=true;
  const shell=new THREE.Mesh(shellGeo,shellMaterial);siteFor(HOLLOW.x,HOLLOW.z).group.add(shell);
  const hy=terrain(HOLLOW.x,HOLLOW.z);
  const bone=mat('#c6bca4'),ringWood=mat('#a38e6d'),vein=mat('#a5c7a0',{emissive:'#82b988',emissiveIntensity:.6});
  // Splintered rims and moss break the manufactured tunnel outline. These small
  // surface pieces stay outside the chamber and leave both entrances unobstructed.
  for(const end of [-1,1])for(let i=0;i<18;i++){
    const a=.16+i/18*2.82,r=9.2*(1+.04*Math.sin(i*3)),x=HOLLOW.x+Math.cos(a)*r,y=hy+Math.sin(a)*r,z=HOLLOW.z+end*21.7;
    rod([x,y,z-end*1.5],[x+Math.cos(a)*.35,y+Math.sin(a)*.45,z+end*(.5+rng()*2.6)],.1+rng()*.15,deadBark);
    if(i%3===0)leaves(x,y+.1,z-end*2,1.2,'#89985f',9);
  }
  for(let i=0;i<18;i++){
    const side=i%2?1:-1,z=HOLLOW.z-20+i*2.3,x=HOLLOW.x+side*9.2;
    const ex=x+side*(2+rng()*3),ez=z+(rng()-.5)*4;
    rod([x,hy+.35,z],[ex,terrain(ex,ez)+.06,ez],.09,deadBark);
    leaves(ex,terrain(ex,ez)+.2,ez,1,'#819059',8);
  }
  // Broken bark fins, exposed growth rings, shelf fungi and old prey bones.
  for(let i=0;i<42;i++){
    const a=.12+rng()*2.9,z=HOLLOW.z+(rng()-.5)*43,x=HOLLOW.x+Math.cos(a)*9.35,y=hy+Math.sin(a)*9.35;
    rod([x,y,z],[x+Math.cos(a)*(.5+rng()*2),y+Math.sin(a)*(1+rng()*2),z-1],.22,deadBark);
    if(i%3===0)put(sphere,mushroom,x,y-.15,z,.8,.13,.6);
  }
  for(const end of [-22.05,22.05])for(const radius of [7.7,8.25,8.8,9.2])for(let i=0;i<28;i++){
    if((i+Math.round(radius*10))%7===0)continue;
    const a=i/28*Math.PI,b=(i+1)/28*Math.PI,ra=radius*(1+.045*Math.sin(end*.23))*(1+.025*Math.sin(a*7)),rb=radius*(1+.045*Math.sin(end*.23))*(1+.025*Math.sin(b*7));rod([HOLLOW.x+Math.cos(a)*ra,hy+Math.sin(a)*ra,HOLLOW.z+end],[HOLLOW.x+Math.cos(b)*rb,hy+Math.sin(b)*rb,HOLLOW.z+end],.03,ringWood);
  }
  for(let i=0;i<7;i++){
    const z=HOLLOW.z-17+i*5,side=i%2?1:-1,x=HOLLOW.x+side*6.5;
    rod([x,hy+6.4,z],[x+side*5,hy+10+i%3,z+2],.7,deadBark);
    rod([x+side*5,hy+10+i%3,z+2],[x+side*7,hy+11+i%3,z+1],.35,deadBark);
    leaves(x,hy+8,z,2.3,'#8a9c68',12);
    for(let j=0;j<5;j++){const zz=z+j*.7;rod([HOLLOW.x+side*7.1,hy+1.6+j*.3,zz],[HOLLOW.x+side*6.9,hy+1.9+j*.3,zz+.6],.026,vein);}
  }
  for(let i=0;i<12;i++){
    const x=HOLLOW.x+(rng()-.5)*9,z=HOLLOW.z+(rng()-.5)*35,y=terrain(x,z)+.15;
    rod([x,y,z],[x+.6+rng(),y+.15,z+.3],.055,bone);
  }
  const rib=new THREE.TorusGeometry(1,.065,5,12,Math.PI*1.65);
  for(let i=0;i<3;i++){
    const x=HOLLOW.x+(i%2?3.8:-3.5),z=HOLLOW.z-14+i*12,y=terrain(x,z)+.16;
    rod([x,y+.3,z-1],[x,y+.3,z+1.3],.065,bone);
    for(let j=0;j<5;j++){const r=.35+Math.sin(j/5*Math.PI)*.25;put(rib,bone,x,y+.15,z-.8+j*.35,r,r*.85,r,rotation(0,0,-Math.PI*.32));}
    put(sphere,bone,x,y+.18,z+1.5,.3,.26,.45);
    for(const side of [-1,1]){put(sphere,dark,x+side*.21,y+.29,z+1.65,.11,.09,.13);rod([x+side*.23,y+.27,z+1.3],[x+side*.5,y+.6,z+.9],.055,bone);}
  }
  // Distinct ecological trees: pendent food, pressure roots, sap wounds, nest mouths.
  world.giftFoods=[];
  for(const t of ECO_TREES){
    const y=terrain(t.x,t.z),s=t.scale,foodMatrices=[];
    for(let i=0;i<7;i++){
      const a=i/7*6.28,ex=t.x+Math.cos(a)*4*s,ez=t.z+Math.sin(a)*4*s,ey=y+(7+rng()*3)*s;
      rod([t.x,y+4*s,t.z],[ex,ey,ez],.23*s);
      if(t.kind==='giftwillow'){
        leaves(ex,ey,ez,2.8*s,'#a4bd72',35);
        for(let j=0;j<4;j++){const xx=ex+(rng()-.5)*2,zz=ez+(rng()-.5)*2,bottom=ey-(3+rng()*2)*s;rod([xx,ey,zz],[xx+.2,bottom,zz],.035*s,moss);pose.position.set(xx+.2,bottom,zz);pose.rotation.set(0,0,0);pose.scale.set(.22*s,.44*s,.22*s);pose.updateMatrix();foodMatrices.push(pose.matrix.clone());for(let k=0;k<3;k++)put(card,foliage,xx,ey-k*s,zz,.7*s,1.2*s,1,rotation(0,a,0),'#b2c982');}
      }else if(t.kind==='claspwood'){
        rod([ex,ey,ez],[ex+Math.cos(a)*1.8*s,ey+2*s,ez+Math.sin(a)*1.8*s],.09*s);
        leaves(ex,ey,ez,1.6*s,'#748657',18);
        put(cone,bark,ex,terrain(ex,ez)+.5,ez,.24,1.3,.24);
      }else{leaves(ex,ey,ez,2.4*s,t.kind==='sourheart'?'#c0a16d':'#6eaa89',32);}
    }
    if(t.kind==='sourheart')for(let i=0;i<6;i++){const a=i*2.4;put(sphere,sap,t.x+Math.cos(a)*.7*s,y+(1+i*.63)*s,t.z+Math.sin(a)*.7*s,.14*s,.55*s,.12*s);}
    if(t.kind==='hollowhost')for(let i=0;i<8;i++){const a=i*2.4;put(sphere,dark,t.x+Math.cos(a)*.72*s,y+(1+i*.65)*s,t.z+Math.sin(a)*.72*s,.24*s,.3*s,.24*s);}
    // Broad, pale feeding scars at mouth height on every food tree.
    if(t.kind==='giftwillow')for(let j=0;j<4;j++)put(sphere,gold,t.x+.1, y+1.3*s+j*.14,t.z+.72*s,.35*s,.055,.045);
    if(foodMatrices.length){const mesh=new THREE.InstancedMesh(sphere,gold,foodMatrices.length);foodMatrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.computeBoundingSphere();siteFor(t.x,t.z).group.add(mesh);world.giftFoods.push({id:t.id,mesh,matrices:foodMatrices,previous:-1});}
  }
  // The canopy has monumental trunks, walkable buttresses and a broad high roof.
  world.antTrails=[];
  for(const [n,t] of CANOPY_TREES.entries()){
    const y=terrain(t.x,t.z);let supportedTip;
    for(let i=0;i<8;i++){
      const a=i/8*6.28+n*.5,reach=9+rng()*7,ex=t.x+Math.cos(a)*reach,ez=t.z+Math.sin(a)*reach,ey=y+t.height-4+rng()*8;
      rod([t.x,y+t.height*.64,t.z],[ex,ey,ez],.8);
      if(i===0)supportedTip=[ex,ey+.65,ez];
      rod([ex,ey,ez],[ex+Math.cos(a)*4,ey+5,ez+Math.sin(a)*4],.3);
      leaves(ex,ey+2,ez,7.5,i%2?'#72965b':'#91ae65',150);
    }
    const route=[[t.x+8,y+.2,t.z+4],[t.x+t.radius+.1,y+1.1,t.z],[t.x+t.radius+.1,y+t.height*.64,t.z],supportedTip];
    const lengths=route.slice(1).map((b,i)=>Math.hypot(...b.map((v,k)=>v-route[i][k])));
    const directions=route.slice(1).map((b,i)=>new THREE.Vector3(...b).sub(new THREE.Vector3(...route[i])).normalize());
    world.antTrails.push({route,lengths,directions,total:lengths.reduce((a,b)=>a+b,0),seed:n});
    for(let k=0;k<route.length-1;k++)rod(route[k],route[k+1],.065,dark);
    for(let i=0;i<28;i++){const a=i/28*6.28;put(sphere,dark,t.x+Math.cos(a)*(t.radius+.1),y+t.height*.64+Math.sin(i*3)*.3,t.z+Math.sin(a)*(t.radius+.1),.12,.2,.1);}
    put(sphere,bark,t.x+8,y+.3,t.z+4,1.8,.9,1.4);
  }
  // Leaf-turning mounds, fungal shelves, winter food and lantern orchids.
  for(const site of HABITATS){
    for(let i=0;i<100;i++){
      const a=rng()*6.28,r=Math.sqrt(rng())*(site.r-3),x=site.x+Math.cos(a)*r,z=site.z+Math.sin(a)*r,y=terrain(x,z);
      if(Math.abs(x-site.x)<2.5&&z>site.z)continue;
      if(site.id==='elder'&&Math.abs(x-HOLLOW.x)<10)continue;
      if(site.id==='seam'){
        if(environmentAt(x,z).snowDepth>.7){
          put(sphere,snow,x,y-.12,z,1.3+rng()*2,.4+rng()*.6,1+rng()*2);
          if(i%3===0){put(sphere,dark,x,y+.05,z,1.1,.06,.8);put(sphere,moss,x,y+.12,z,.7,.09,.5);}
        }else if(i%3===0){put(hullCache.get(1),basalt,x,y-.12,z,.6+rng()*.4,.6+rng()*.8,.6,rotation(0,rng()*6.28,0));}
      }else if(site.id==='canopy'){
        for(let j=0;j<7;j++){const a=j/7*6.28;put(card,foliage,x+Math.cos(a)*.5,y+.4,z+Math.sin(a)*.5,.7,1.6,1,rotation(-.65,a,0),'#8da568');}
      }else if(site.id==='litter'){
        put(sphere,i%2?moss:bark,x,y-.04,z,1+rng(),.2+rng()*.3,1+rng());
        for(let k=0;k<3;k++){rod([x+k*.35,y,z],[x+k*.35,y+.5+k*.15,z],.04,gold);put(sphere,mushroom,x+k*.35,y+.55+k*.15,z,.3,.1,.28);}
      }else if(site.id==='orchids'||site.id==='pasture'){
        if(site.id==='pasture'&&r<14)continue;
        const height=.65+rng()*.9;rod([x,y,z],[x,y+height,z],.035,moss);
        for(let j=0;j<5;j++){const q=j*Math.PI*2/5;put(sphere,orchid,x+Math.cos(q)*.23,y+height+Math.sin(q)*.1,z+Math.sin(q)*.23,.12,.035,.34,rotation(.35,q,.15),i%3?'#d5dec3':'#c8acd7');}
        put(sphere,gold,x,y+height-.06,z,.095,.13,.095);
        for(const side of [-1,1])put(card,foliage,x+side*.19,y+height*.4,z,.3,.7,1,rotation(.4,side*.7,side*.65),'#7f9d6a');
      }
    }
  }
  const ny=terrain(THAWLINE.nest.x,THAWLINE.nest.z);
  // Warm nesting ledge with a snow roof; enough space to read the clutch underneath.
  put(sphere,basalt,THAWLINE.nest.x,ny+.1,THAWLINE.nest.z,3,.4,2.2);
  for(let i=0;i<5;i++)put(sphere,sap,THAWLINE.nest.x+Math.sin(i*2.4),ny+.65,THAWLINE.nest.z+Math.cos(i*2.4),.3,.48,.3);
  for(const [key,material] of [['cold',mushroom],['warm',sap]]){
    const p=THAWLINE[key];for(let i=0;i<6;i++)put(sphere,material,p.x+Math.cos(i)*.6,terrain(p.x,p.z)+.16,p.z+Math.sin(i)*.6,.3,.2,.25);
  }
  // Finish static batching per habitat: one draw per shared geometry/material.
  for(const tile of sites){for(const {geo,material,items} of tile.batches.values()){
    const m=new THREE.InstancedMesh(geo,material,items.length);items.forEach((v,i)=>{m.setMatrixAt(i,v.matrix);if(v.color)m.setColorAt(i,new THREE.Color(v.color));});m.computeBoundingSphere();tile.group.add(m);
  }scene.add(tile.group);}
  world.ecologySites=sites;
  // Each root attack is a legible ring of inward-reaching limbs. Its radius and
  // animation come from the same hazard state that determines actual damage.
  world.livingRoots=[];
  for(const h of world.game.ecology.hazards){
    const material=mat('#b5a084',{map:barkMaps.map,emissive:'#d0a259',emissiveIntensity:0});
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-h.r*.5,0),new THREE.Vector3(h.r*.09,-h.r*.17,.04),new THREE.Vector3(-h.r*.06,h.r*.22,0),new THREE.Vector3(0,h.r*.5,0)]),geometry=new THREE.TubeGeometry(curve,14,.19,6,false);
    const positions=geometry.attributes.position;
    for(let ring=0;ring<=14;ring++){
      const center=curve.getPointAt(ring/14),taper=1-ring/14*.9;
      for(let j=0;j<=6;j++){const k=ring*7+j;positions.setXYZ(k,center.x+(positions.getX(k)-center.x)*taper,center.y+(positions.getY(k)-center.y)*taper,center.z+(positions.getZ(k)-center.z)*taper);}
    }
    geometry.computeVertexNormals();
    const group=new THREE.InstancedMesh(geometry,material,8);group.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.frustumCulled=false;
    scene.add(group);world.livingRoots.push({id:h.id,group,material,ground:terrain(h.x,h.z)});
  }
  const antMat=mat('#392b23'),ants=new THREE.InstancedMesh(sphere,antMat,world.antTrails.length*180);ants.instanceMatrix.setUsage(THREE.DynamicDrawUsage);ants.frustumCulled=false;scene.add(ants);world.canopyAnts=ants;
  // Winged pollinators and decomposer spores are bounded points, not combat packs.
  const motes=[],moteColors=[];
  for(const site of HABITATS)for(let i=0;i<48;i++){motes.push(site.x+(rng()-.5)*site.r*1.6,terrain(site.x,site.z)+.6+rng()*6,site.z+(rng()-.5)*site.r*1.6);const c=new THREE.Color(site.color);moteColors.push(c.r,c.g,c.b);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(motes,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(moteColors,3));
  const motesMat=new THREE.PointsMaterial({map:world.glow,size:.16,vertexColors:true,transparent:true,opacity:.65,depthWrite:false});
  world.ecoClockUniform={value:0};
  motesMat.onBeforeCompile=shader=>{shader.uniforms.ecoTime=world.ecoClockUniform;shader.vertexShader='uniform float ecoTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += vec3(sin(ecoTime*.7+position.x)*.7,sin(ecoTime+position.z)*.35,cos(ecoTime*.6+position.x)*.6);');};
  world.ecoMotes=new THREE.Points(geo,motesMat);geo.computeBoundingSphere();geo.boundingSphere.radius+=1;scene.add(world.ecoMotes);
  world.treeDefenders=[];
  for(const tree of ECO_TREES.filter(t=>['hollowhost','sourheart'].includes(t.kind))){
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(64*3),3));
    const m=new THREE.Points(geo,new THREE.PointsMaterial({color:tree.kind==='hollowhost'?'#e3bc62':'#ccb86b',size:tree.kind==='hollowhost'?.09:.2,transparent:true,opacity:.7,depthWrite:false}));m.position.set(tree.x,terrain(tree.x,tree.z),tree.z);geo.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,2.5,0),6);scene.add(m);world.treeDefenders.push({id:tree.id,mesh:m});
  }
  // Local steam wisps rise only at the maintained snow/heat interface.
  world.steam=[];
  for(let i=0;i<14;i++){const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:world.glow,color:'#d6e8e0',transparent:true,opacity:.1,depthWrite:false}));scene.add(sprite);world.steam.push(sprite);sprite.userData.ground=terrain(279+Math.sin(i*3)*2,308+i*1.7);}
  world.ecoRenderClock=0;world.ecoEffectTime=-1;world.ecoPose=new THREE.Object3D();world.ecoDirection=new THREE.Vector3();world.ecoUp=new THREE.Vector3(0,1,0);world.ecoScale=new THREE.Vector3();world.ecoMatrix=new THREE.Matrix4();
}

export function updateEcologyVisuals(world,dt){
  // Simulation clock freezes with the game. Scratch objects and route data are reused.
  const state=world.game.ecology,time=state.clock,p=world.game.player,pose=world.ecoPose;
  world.ecoClockUniform.value=time;
  if(world.ecoState!==state){world.ecoState=state;world.ecoTrees=new Map(state.trees.map(t=>[t.id,t]));world.ecoHazards=new Map(state.hazards.map(h=>[h.id,h]));world.ecoEffectTime=-1;}
  for(const tile of world.ecologySites)tile.group.visible=Math.hypot(tile.site.x-p.x,tile.site.z-p.z)<world.viewDistance+tile.site.r;
  for(const v of world.livingRoots){
    const h=world.ecoHazards.get(v.id);if(!h)continue;
    v.group.visible=Math.hypot(h.x-p.x,h.z-p.z)<100;if(!v.group.visible)continue;
    v.material.emissiveIntensity=h.state==='warning'?.25+Math.sin(time*12)*.16:h.state==='strike'?.6:0;
    for(let i=0;i<8;i++){
      const a=i/8*Math.PI*2,reach=h.r*(.8-h.phase*.3);
      pose.position.set(h.x+Math.cos(a)*reach,v.ground+.12+h.phase*.8,h.z+Math.sin(a)*reach);
      pose.quaternion.setFromUnitVectors(world.ecoUp,world.ecoDirection.set(Math.cos(a),h.phase*.2,Math.sin(a)).normalize());
      pose.scale.setScalar(1);pose.updateMatrix();v.group.setMatrixAt(i,pose.matrix);
    }
    v.group.instanceMatrix.needsUpdate=true;
  }
  // Tiny insects, food and wisps need only 20 updates/sec; their clocks stay exact.
  if(time-world.ecoEffectTime<.05&&time>=world.ecoEffectTime)return;world.ecoEffectTime=time;
  for(const food of world.giftFoods){
    const amount=world.ecoTrees.get(food.id).food;if(Math.abs(amount-food.previous)<.025)continue;food.previous=amount;
    world.ecoScale.setScalar(.1+amount*.9);
    food.matrices.forEach((m,i)=>food.mesh.setMatrixAt(i,world.ecoMatrix.copy(m).scale(world.ecoScale)));food.mesh.instanceMatrix.needsUpdate=true;
  }
  for(const v of world.treeDefenders){
    const tree=world.ecoTrees.get(v.id),active=tree.defense>0;
    v.mesh.visible=(active||tree.kind==='hollowhost')&&Math.hypot(tree.x-p.x,tree.z-p.z)<75;if(!v.mesh.visible)continue;
    const points=v.mesh.geometry.attributes.position,range=active?(tree.kind==='hollowhost'?4.8:2.2):.9;
    for(let i=0;i<points.count;i++){const a=i*2.4+time*(active?3:1),r=range*(.25+(i%7)/9);points.setXYZ(i,Math.sin(a)*r,1+Math.sin(time*2+i)*.6+(i%5)*.7,Math.cos(a)*r);}points.needsUpdate=true;
  }
  let count=0;
  for(const trail of world.antTrails){
    const distance=Math.hypot(trail.route[0][0]-p.x,trail.route[0][2]-p.z);if(distance>100)continue;
    const {lengths,total,route,directions}=trail,number=distance>55||world.treeDetail<40?72:144;
    for(let i=0;i<number;i++){
      let d=(i/number*total+time*1.4)%total,j=0;while(d>lengths[j]&&j<lengths.length-1)d-=lengths[j++];const a=route[j],b=route[j+1],u=d/lengths[j];
      pose.position.set(a[0]+(b[0]-a[0])*u+Math.sin(i*4)*.09,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u+Math.cos(i*4)*.12);
      pose.quaternion.setFromUnitVectors(world.ecoUp,directions[j]);pose.scale.set(.055,.12,.075);pose.updateMatrix();world.canopyAnts.setMatrixAt(count++,pose.matrix);
    }
  }
  world.canopyAnts.count=count;world.canopyAnts.visible=count>0;world.canopyAnts.instanceMatrix.needsUpdate=true;
  world.steam.forEach((s,i)=>{const phase=(time*.13+i/14)%1,x=279+Math.sin(i*3)*2,z=308+i*1.7;s.visible=Math.hypot(x-p.x,z-p.z)<100;if(!s.visible)return;s.position.set(x,s.userData.ground+phase*8,z);s.scale.set(2+phase*4,1+phase*6,1);s.material.opacity=Math.sin(phase*Math.PI)*.09;});
}
