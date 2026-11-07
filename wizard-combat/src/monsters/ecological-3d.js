import {strideLength} from '../locomotion.js';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ECO_SPECIES} from '../ecology-species.js';

// Real, articulated volume for the ecological animals. Existing painted rigs keep
// their own renderer; these models turn toward their activity, never the camera.
export function createCreature3D(type){
  const s=ECO_SPECIES[type],root=new THREE.Group(),body=new THREE.Group(),legs=[],jaws=[],hooks=[],garden=[],pouches=[];
  root.add(body);body.name='articulated';root.scale.setScalar(s.size);root.position.y=-s.size*.5;
  const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.85,...extra});
  const hide=material(type==='rootknife'?'#514b35':type==='ventback'?'#514d49':type==='snowkeel'?'#8aaeb5':type==='scavenger'?'#817967':'#867650');
  const armor=material(type==='snowkeel'?'#c7e7e4':type==='ventback'?'#343e3c':'#485448');
  const horn=material(type==='snowkeel'?'#d8e9ea':'#d9c5a0'),dark=material('#202a25'),moss=material(type==='snowkeel'?'#d8e7e9':type==='ventback'?'#484c43':'#7d9e51');
  const glow=material(type==='ventback'?'#ef9e54':'#d3d98b',{emissive:type==='ventback'?'#d85f23':'#a7bb5c',emissiveIntensity:.65});
  const sphere=new THREE.SphereGeometry(1,12,8),limbGeo=new THREE.CylinderGeometry(1,1,1,7);
  function mesh(geo,mat,x,y,z,sx=1,sy=sx,sz=sx,parent=body){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
  const ell=(mat,x,y,z,sx,sy,sz,parent)=>mesh(sphere,mat,x,y,z,sx,sy,sz,parent);
  function bone(a,b,r,mat=hide,parent=body){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av),m=new THREE.Mesh(limbGeo,mat);m.position.copy(av.add(bv).multiplyScalar(.5));m.scale.set(r,delta.length(),r*.8);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());parent.add(m);return m;}
  const low=type==='rootknife'||type==='snowkeel',height=low?.3:.57;
  const torso=ell(hide,0,height,0,low?.3:.43,low?.19:.35,type==='rootknife'?.85:.63);
  for(const side of [-1,1])for(const front of [-1,1]){
    const joint=new THREE.Group();joint.position.set(side*(low?.26:.31),height-.1,front*.42);body.add(joint);legs.push(joint);joint.userData.side=side;joint.userData.front=front;
    bone([0,0,0],[side*.15,-height*.55,.05],low?.065:.09,hide,joint);
    bone([side*.15,-height*.55,.05],[side*.18,-height+.12,.14],low?.045:.065,horn,joint);
    ell(armor,side*.18,-height+.1,.16,low?.16:.13,.08,.17,joint);
    for(let claw=-1;claw<=1;claw++)bone([side*.18+claw*.055,-height+.09,.23],[side*.18+claw*.06,-height+.075,.33],.018,horn,joint);
  }
  const head=new THREE.Group();head.position.set(0,height+.02,.58);body.add(head);
  ell(hide,0,0,.08,low?.23:.3,low?.15:.27,.32,head);
  for(const side of [-1,1])ell(glow,side*.2,.08,.29,.045,.032,.055,head);
  if(type==='barkjaw'){
    for(let i=0;i<5;i++)ell(armor,0,.7,-.43+i*.22,.46,.2,.15);
    ell(dark,0,-.06,.36,.19,.18,.05,head);
    for(let i=0;i<6;i++){
      const a=i/6*Math.PI*2,j=new THREE.Group();j.position.set(Math.cos(a)*.19,Math.sin(a)*.17,.3);head.add(j);jaws.push(j);
      bone([0,0,0],[Math.cos(a)*.22,Math.sin(a)*.18,.19],.045,horn,j);
      bone([Math.cos(a)*.22,Math.sin(a)*.18,.19],[Math.cos(a)*.07,Math.sin(a)*.07,.44],.026,horn,j);
    }
    for(const side of [-1,1])bone([side*.25,height+.3,.42],[side*.44,height+.44,.25],.07,horn);
    // Seed catches remain visibly tucked into the grazer's shaggy plates.
    for(let i=0;i<7;i++)ell(moss,Math.sin(i*5)*.38,.78,-.5+i*.13,.07,.035,.13);
  }else if(type==='rootknife'){
    for(const side of [-1,1]){
      const hook=new THREE.Group();hook.position.set(side*.2,.3,.4);body.add(hook);hooks.push(hook);
      bone([0,0,0],[side*.38,-.14,.37],.07,armor,hook);
      bone([side*.38,-.14,.37],[side*.16,-.21,.64],.035,horn,hook);
      bone([side*.16,-.21,.64],[side*.08,-.14,.57],.018,horn,hook);
    }
    for(let i=0;i<6;i++){const m=mesh(new THREE.ConeGeometry(.12,.36,5),moss,Math.sin(i*2)*.15,.49,-.5+i*.19);m.rotation.x=-.7;}
    bone([0,.27,-.65],[.15,.13,-1.18],.08,hide);
  }else if(type==='ventback'){
    for(let i=0;i<5;i++){
      const z=-.46+i*.21;ell(armor,0,.73,z,.42,.17,.15);
      const vent=mesh(new THREE.CylinderGeometry(.105,.14,.35,9,1,true),hide,0,.96,z);
      vent.rotation.x=-.2;ell(glow,0,.94,z,.073,.04,.073);
      mesh(new THREE.TorusGeometry(.106,.023,5,10),horn,0,1.13,z).rotation.x=Math.PI/2;
    }
  }else if(type==='snowkeel'){
    const outline=new THREE.Shape();outline.moveTo(-.5,.28);outline.quadraticCurveTo(-.1,.55,.1,1.02);outline.quadraticCurveTo(.25,1.12,.2,.8);outline.quadraticCurveTo(.16,.43,.5,.28);outline.closePath();
    const fin=mesh(new THREE.ExtrudeGeometry(outline,{depth:.065,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.025,bevelThickness:.02,curveSegments:6}),armor,-.03,0,-.1);fin.rotation.y=Math.PI/2;
    for(const side of [-1,1])bone([side*.07,.35,-.4],[side*.035,.96,-.2],.012,horn);
    ell(glow,0,.35,.6,.12,.06,.1,head);
    const snow=material('#e2eef0',{roughness:1});
    for(let i=0;i<6;i++)ell(snow,Math.sin(i*4)*.3,.12,-.7+i*.25,.31,.09,.26);
  }else if(type==='mantleback'){
    ell(moss,0,.83,-.08,.48,.18,.58);
    const cap=material('#d69e70');
    for(let i=0;i<9;i++){
      const x=Math.sin(i*7)*.3,z=Math.cos(i*4)*.42,y=.93+(i%3)*.04;
      const stalk=new THREE.Group();stalk.position.set(x,y-.1,z);body.add(stalk);garden.push(stalk);
      bone([0,0,0],[0,.25,0],.025,horn,stalk);
      ell(i%2?cap:glow,0,.26,0,.12,.06,.11,stalk);
      ell(dark,0,.235,0,.1,.012,.09,stalk);
    }
    ell(dark,0,-.08,.34,.2,.08,.045,head);
  }else{
    const cold=material('#8ebfc0'),warm=material('#cd9d65');
    for(const [side,mat] of [[-1,cold],[1,warm]]){const pouch=new THREE.Group();pouch.position.set(side*.27,.45,0);body.add(pouch);pouches.push(pouch);ell(mat,0,0,0,.18,.25,.4,pouch);}
    ell(horn,0,-.04,.37,.15,.11,.26,head);
    for(let i=0;i<6;i++)ell(horn,0,.87,-.46+i*.16,.07,.12,.06);
    bone([0,.5,-.55],[.2,.4,-1],.055,hide);
  }
  // Small forms read as bark, shag and layered shell instead of smooth balloons.
  const seed=type.length*1.71;
  for(let i=0;i<26;i++){
    const a=i*2.399+seed,z=-.5+(i%9)*.12,x=Math.sin(a)*(low?.27:.4);
    const y=height+Math.abs(Math.cos(a))*(low?.17:.3);
    const flake=ell(i%4===0?moss:armor,x,y,z,.035+(i%3)*.012,.018,.08);
    flake.rotation.z=-Math.sin(a)*.6;
  }
  for(const side of [-1,1]){
    // Brow ridges shade inset eyes; jaw lines and nostrils survive at gameplay scale.
    bone([side*.12,.115,.25],[side*.25,.105,.31],.035,armor,head);
    ell(dark,side*.09,-.015,.385,.022,.025,.018,head);
    bone([side*.09,-.12,.33],[side*.23,-.09,.22],.018,dark,head);
    if(type==='barkjaw'||type==='mantleback')for(let i=0;i<8;i++){
      const z=-.5+i*.14;
      bone([side*.38,.65,z],[side*(.47+(i%3)*.025),.33,z-.08],.025,i%3?hide:moss);
    }
  }
  const tail=new THREE.Group();tail.position.set(0,height-.03,-.57);body.add(tail);
  bone([0,0,0],[.07,-.08,-.3],.055,hide,tail);
  bone([.07,-.08,-.3],[0,-.13,-.55],.025,horn,tail);

  // Bake rigid primitives with vertex colors. Joints remain separate, so added
  // surface detail costs vertices rather than another draw call per small part.
  const surface=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92});
  const luminous=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.7,emissive:glow.emissive,emissiveIntensity:.55});
  const oldGeometry=new Set(),oldMaterials=new Set();
  function bake(group){
    for(const child of [...group.children])if(child.isGroup)bake(child);
    for(const lit of [false,true]){
      const pieces=[];
      for(const m of [...group.children])if(m.isMesh&&(m.material===glow)===lit){
        m.updateMatrix();const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();
        g.applyMatrix4(m.matrix);g.deleteAttribute('uv');
        const colors=new Float32Array(g.attributes.position.count*3),c=m.material.color;
        for(let i=0;i<colors.length;i+=3){const shade=.92+.08*Math.sin(i*1.73);colors[i]=c.r*shade;colors[i+1]=c.g*shade;colors[i+2]=c.b*shade;}
        g.setAttribute('color',new THREE.BufferAttribute(colors,3));pieces.push(g);
        oldGeometry.add(m.geometry);oldMaterials.add(m.material);group.remove(m);
      }
      if(pieces.length){const geometry=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());group.add(new THREE.Mesh(geometry,lit?luminous:surface));}
    }
  }
  bake(body);oldGeometry.forEach(g=>g.dispose());oldMaterials.forEach(m=>m.dispose());
  root.updateMatrixWorld(true);
  const distantParts=[];
  body.traverse(m=>{if(m.isMesh){const g=m.geometry.clone();g.applyMatrix4(m.matrixWorld);
    let joint=m.parent;while(joint&&joint!==body&&!legs.includes(joint))joint=joint.parent;
    const legIndex=legs.indexOf(joint),gait=new Float32Array(g.attributes.position.count*2);
    for(let i=0;i<gait.length;i+=2){gait[i]=legIndex<0?0:1;gait[i+1]=legIndex===0||legIndex===3?0:.5;}
    g.setAttribute('gaitLeg',new THREE.BufferAttribute(gait,2));distantParts.push(g);}});
  // matrixWorld includes the species scale; remove it for the root-local LOD.
  const inverse=root.matrixWorld.clone().invert();
  const distantGeo=mergeGeometries(distantParts);distantGeo.applyMatrix4(inverse);distantParts.forEach(g=>g.dispose());
  const distantMaterial=surface.clone(),gaitUniforms={gaitPhase:{value:0},gaitMove:{value:0},gaitStride:{value:strideLength(s.size)/s.size}};
  distantMaterial.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,gaitUniforms);
    shader.vertexShader='attribute vec2 gaitLeg;uniform float gaitPhase;uniform float gaitMove;uniform float gaitStride;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float cycle=fract(gaitPhase/6.2831853+gaitLeg.y),stance=.62,reach=gaitStride*stance*.5;
      float foot=cycle<stance?reach*(1.-2.*cycle/stance):-reach*cos((cycle-stance)/(1.-stance)*3.14159265);
      transformed.z+=foot*gaitLeg.x*gaitMove;
      transformed.y+=(cycle<stance?0.:sin((cycle-stance)/(1.-stance)*3.14159265)*.13)*gaitLeg.x*gaitMove;`);
  };
  distantMaterial.customProgramCacheKey=()=> 'creature-distant-stride';
  const distant=new THREE.Mesh(distantGeo,distantMaterial);distant.name='distant';distant.visible=false;root.add(distant);
  let lastX=null,lastZ=null,phase=0,velocity=0,death=0,attack=0,wasWinding=false,far=false;
  function update(e,dt,distance=0){
    dt=Math.min(.1,Math.max(0,dt));const alive=e.hp>0;
    death=alive?0:Math.min(1.3,death+dt);root.visible=death<1.3;
    if(!root.visible)return;
    far=distance>(far?62:74);body.visible=!far;distant.visible=far;
    root.rotation.y=e.heading||0;root.scale.setScalar(s.size*(1-Math.max(0,death-.65)/.65*.8));
    root.position.y=-s.size*.5-death*s.size*.12;
    const delta=lastX===null?0:Math.hypot(e.x-lastX,e.z-lastZ);lastX=e.x;lastZ=e.z;
    const moving=alive&&e.freeze<=0&&e.root<=0;
    velocity+=(Math.min(s.speed*1.5,dt?delta/dt:0)-velocity)*(1-Math.exp(-10*dt));
    const stride=strideLength(s.size),move=moving?Math.min(1,velocity/.8):0;
    phase+=moving&&delta<3?delta/stride*Math.PI*2:0;
    gaitUniforms.gaitPhase.value=phase;gaitUniforms.gaitMove.value=move;
    if(far){distant.position.y=Math.abs(Math.sin(phase))*move*.035;distant.rotation.z=Math.sin(phase)*move*.025;distantMaterial.emissive.set(e.freeze>0?'#487d9d':e.flash>0?'#9f3c22':'#000000');distantMaterial.emissiveIntensity=e.freeze>0?.35:e.flash>0?.5:0;return;}
    const time=e.ecoClock||0,winding=e.windup>0||e.huntWindup>0;
    if(wasWinding&&!winding&&alive&&e.freeze<=0)attack=.32;wasWinding=winding;attack=Math.max(0,attack-dt);
    const strike=Math.sin(attack/.32*Math.PI),feed=['feed','forage','turn litter','cold meal','warm meal'].includes(e.routine)&&move<.3;
    body.scale.y=1+Math.sin(time*1.7)*.009;
    body.position.set(0,Math.abs(Math.sin(phase))*move*.035-death*.12, strike*.14);
    body.rotation.set(death*.32,0,(Math.sin(phase)*move*.025)+(e.flash>0?Math.sin(time*43)*.06:0)+death*.8);
    for(let i=0;i<legs.length;i++){
      const leg=legs[i],cycle=((phase/(Math.PI*2)+(i===0||i===3?0:.5))%1+1)%1;
      // The stance foot travels backwards at ground speed, then lifts on recovery.
      const stance=.62,swing=cycle<stance?0:Math.sin((cycle-stance)/(1-stance)*Math.PI);
      const reach=stride/s.size*stance*.5;
      const footZ=cycle<stance?reach*(1-2*cycle/stance):-reach*Math.cos((cycle-stance)/(1-stance)*Math.PI);
      if(leg.userData.restZ===undefined)leg.userData.restZ=leg.position.z;
      leg.position.z=leg.userData.restZ+footZ*move;
      leg.rotation.x=-footZ*.45*move;
      leg.rotation.z=leg.userData.side*(winding?.12:0);
      leg.position.y=height-.1+swing*.13*move;
    }
    head.rotation.x=feed?.26+Math.sin(time*3.8)*.08:winding?-.23:strike*.45;
    head.rotation.y=e.routine==='lookout'?Math.sin(time*.75)*.6:e.routine==='warn'?Math.sin(time*6)*.12:Math.sin(time*.5)*.035;
    jaws.forEach((j,i)=>{j.rotation.x=Math.sin(time*4+i)*.22*(feed?1:winding?.8:.1);j.scale.z=feed?1+Math.sin(time*6)*.17:1;});
    hooks.forEach((hook,i)=>{hook.rotation.x=winding?-.65:strike*.9;hook.rotation.y=(i?1:-1)*(winding?.3:Math.sin(phase)*move*.09);});
    garden.forEach((stalk,i)=>stalk.rotation.z=Math.sin(time*1.9+i)*(.025+move*.07));
    pouches.forEach((pouch,i)=>{const reserve=i?e.reserveWarm:e.reserveCold;pouch.scale.setScalar(.7+(Number.isFinite(reserve)?reserve:1)*.3);});
    if(type==='snowkeel')body.rotation.y=Math.sin(phase*.7)*.07*move;
    if(type==='ventback'&&e.routine==='warn')body.scale.y+=.035+Math.sin(time*8)*.015;
    tail.rotation.y=Math.sin(phase*.7+time*.4)*(.08+move*.2);
    surface.emissive.set(e.freeze>0?'#487d9d':e.flash>0?'#9f3c22':'#000000');
    surface.emissiveIntensity=e.freeze>0?.35:e.flash>0?.5:0;
    luminous.emissiveIntensity=winding?1.3:.5+Math.sin(time*(type==='ventback'?2.3:1.4))*.15;
  }
  return {root,update};
}
