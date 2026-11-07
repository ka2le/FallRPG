import {buildFeyWorld,updateFeyWorld} from './feyworld.js';
import * as THREE from 'three';
import {CAMPS,COVER,SPECIES,SPELLS,SHIELD,terrain,seeded} from './data.js';
import {MONSTER_ART} from './monsters/index.js';
import {createRig,poseRig,setLod,STATE} from './monsters/rig.js';
import {createCreature3D} from './monsters/ecological-3d.js';

function texture(draw,w=256,h=256){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const HIT=new THREE.Color(2.3,2.2,2),STUN=new THREE.Color(.78,.92,1.18),DRAIN=new THREE.Color(1.12,.84,1.22),ROOT=new THREE.Color(.86,1.06,.78),SLOW=new THREE.Color(.82,.96,1.16),PLAIN=new THREE.Color(1,1,1);
const glowTexture=()=>texture((c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'#fff');g.addColorStop(.15,'#fff');g.addColorStop(.4,'#ffffff88');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(0,0,w,h);},64,64);

export class World {
  constructor(canvas,game){this.game=game;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setClearColor('#394e50');this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;this.scene=new THREE.Scene();this.scene.fog=new THREE.FogExp2('#71827c',.006);this.camera=new THREE.PerspectiveCamera(76,1,.08,450);this.camera.rotation.order='YXZ';this.scene.add(this.camera);this.scene.add(new THREE.HemisphereLight('#d7e9ed','#4b534d',2));const sun=new THREE.DirectionalLight('#ffe4cd',2.1);sun.position.set(-50,90,-70);this.scene.add(sun);this.glow=glowTexture();this.enemies=new Map();this.enemyMaps=new Map();this.bullets=new Map();this.effects=[];this.castKick=0;buildFeyWorld(this);this.buildWand();this.buildShield();this.buildBeam();this.resize();window.addEventListener('resize',()=>this.resize());}
  resize(){this.renderer.setSize(innerWidth,innerHeight);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();}
  mat(color,extra={}){return new THREE.MeshStandardMaterial({color,flatShading:true,roughness:1,...extra});}
  mesh(geo,mat,x,y,z,parent=this.scene){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m;}
  buildWand(){this.wand=new THREE.Group();this.camera.add(this.wand);this.wand.position.set(.43,-.42,-.72);this.wand.rotation.set(-.23,0,-.32);const wood=this.mat('#302d32'),gold=this.mat('#b6a16e',{metalness:.65,roughness:.3});this.mesh(new THREE.CylinderGeometry(.022,.035,.9,8),wood,0,-.3,0,this.wand);for(let i=0;i<3;i++)this.mesh(new THREE.TorusGeometry(.038,.009,6,12),gold,0,-.35+i*.045,0,this.wand).rotation.x=Math.PI/2;this.mesh(new THREE.CylinderGeometry(.05,.025,.14,6),gold,0,.17,0,this.wand);this.crystal=this.mesh(new THREE.OctahedronGeometry(.075,0),new THREE.MeshStandardMaterial({color:'#ff9a51',emissive:'#ff9a51',emissiveIntensity:1.2,metalness:.2,roughness:.25}),0,.3,0,this.wand);this.crystal.scale.y=1.7;this.wandGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glow,color:'#ff9a51',transparent:true,opacity:.6,depthWrite:false}));this.wandGlow.scale.set(.4,.4,1);this.wandGlow.position.set(0,.3,0);this.wand.add(this.wandGlow);}
  buildShield(){
    this.ward=new THREE.Group();this.ward.position.set(0,SHIELD.offset,-SHIELD.distance);this.camera.add(this.ward);this.shieldFlash=0;
    const map=texture((c,w,h)=>{
      c.translate(w/2,h/2);c.scale(w/2,h/2);
      const fill=c.createRadialGradient(0,0,.15,0,0,1);fill.addColorStop(0,'#83daff02');fill.addColorStop(.7,'#7bd8ff0c');fill.addColorStop(.94,'#69bcff33');fill.addColorStop(1,'#a5eaff00');c.fillStyle=fill;c.beginPath();c.arc(0,0,1,0,Math.PI*2);c.fill();
      c.save();c.beginPath();c.arc(0,0,.96,0,Math.PI*2);c.clip();c.strokeStyle='#a8eaff26';c.lineWidth=.0025;
      for(let row=-8;row<=8;row++)for(let col=-8;col<=8;col++){const x=col*.18+(row%2)*.09,y=row*.156;c.beginPath();for(let k=0;k<6;k++){const a=k*Math.PI/3+Math.PI/6;c.lineTo(x+Math.cos(a)*.104,y+Math.sin(a)*.104);}c.closePath();c.stroke();}c.restore();
      for(const r of [.965,.91]){c.strokeStyle=r>.95?'#b9f3ffcc':'#8edbff66';c.lineWidth=r>.95?.008:.003;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.stroke();}
      c.strokeStyle='#d9faffbb';c.lineWidth=.007;for(let i=0;i<12;i++){const a=i*Math.PI/6;c.beginPath();c.moveTo(Math.cos(a)*.87,Math.sin(a)*.87);c.lineTo(Math.cos(a)*.9,Math.sin(a)*.9);c.stroke();}
    },512,512);
    this.shieldSurface=this.mesh(new THREE.PlaneGeometry(SHIELD.width*2,SHIELD.height*2),new THREE.MeshBasicMaterial({map,color:'#b2e8ff',transparent:true,opacity:.8,depthWrite:false,side:THREE.DoubleSide}),0,0,0,this.ward);
    this.shieldCharges=[];
    for(let i=0;i<SHIELD.charges;i++){const arc=this.mesh(new THREE.RingGeometry(.982,1,64,1,i*Math.PI/3+.09,Math.PI/3-.18),new THREE.MeshBasicMaterial({color:'#b9f3ff',transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide}),0,0,.004,this.ward);arc.scale.set(SHIELD.width,SHIELD.height,1);this.shieldCharges.push(arc);}
  }
  updateShield(dt){
    const p=this.game.player;this.shieldFlash=Math.max(0,this.shieldFlash-dt*3);
    this.ward.visible=p.ward>0||this.shieldFlash>0;
    const fade=p.ward>0?Math.min(1,p.ward*3):this.shieldFlash;
    this.shieldSurface.material.opacity=fade*(.65+this.shieldFlash*.35);
    this.shieldSurface.material.color.set(this.shieldFlash>.2?'#ffffff':'#a1dfff');
    this.shieldCharges.forEach((arc,i)=>{arc.material.opacity=fade*(i<p.wardHits?.8+Math.sin(this.game.time*3)*.12:.08);});
  }

  buildBeam(){
    const geo=new THREE.CylinderGeometry(1,1,1,8,1,true);
    this.beamOuter=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:'#ba80ec',transparent:true,opacity:.3,depthWrite:false}));
    this.beamCore=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:'#f1d9ff',transparent:true,opacity:.9,depthWrite:false}));
    this.scene.add(this.beamOuter,this.beamCore);
    this.beamTip=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glow,color:'#d6a2ff',transparent:true,depthWrite:false}));this.beamTip.scale.setScalar(.7);this.scene.add(this.beamTip);
  }
  updateBeamVisual(){
    const beam=this.game.beam,active=beam.time>0&&beam.end;
    this.beamOuter.visible=this.beamCore.visible=this.beamTip.visible=!!active;if(!active)return;
    const start=new THREE.Vector3(.38,-.14,-.7).applyMatrix4(this.camera.matrixWorld),end=new THREE.Vector3(beam.end.x,beam.end.y,beam.end.z),dir=end.clone().sub(start),len=dir.length();
    const mid=start.clone().add(end).multiplyScalar(.5),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());
    const pulse=1+Math.sin(this.game.time*35)*.12;
    for(const [mesh,width] of [[this.beamOuter,.07],[this.beamCore,.018]]){mesh.position.copy(mid);mesh.quaternion.copy(q);mesh.scale.set(width*pulse,len,width*pulse);}
    this.beamTip.position.copy(end);this.beamTip.scale.setScalar(beam.target!==null?.9:.35);
  }
  enemyVisual(e){
    const s=SPECIES[e.type],art=MONSTER_ART[e.type],group=new THREE.Group();
    const shadow=this.mesh(new THREE.CircleGeometry(s.size*.36,20),new THREE.MeshBasicMaterial({color:'#101f1d',opacity:.25,transparent:true,depthWrite:false}),0,0,0,group);shadow.rotation.x=-Math.PI/2;shadow.renderOrder=-1;
    this.scene.add(group);
    if(s.model3d){const model=createCreature3D(e.type);group.add(model.root);return {group,shadow,model};}
    if(art){
      // Painted rig: billboard turns to the camera, `facing` flips side-view art toward its travel direction.
      const rig=createRig(art,s.size),facing=new THREE.Object3D();facing.add(rig.root,rig.lod);group.add(facing);
      return {group,shadow,rig,facing,flip:1,state:STATE(),seed:(e.id*.6180339)%1*20,lastX:e.x,lastZ:e.z,speed:0,attack:0,hurt:0,prevWindup:0,deadT:0};
    }
    let map=this.enemyMaps.get(e.type);if(!map){map=texture((c,w,h)=>{c.textAlign='center';c.textBaseline='middle';c.font='190px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';c.fillText(s.emoji,w/2,h/2+6);});this.enemyMaps.set(e.type,map);}
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,transparent:true,depthWrite:false}));sprite.scale.set(s.size,s.size,1);group.add(sprite);
    return {group,sprite,shadow};
  }
  updateRig(v,e,dt,p){
    const def=SPECIES[e.type],art=v.rig.def,st=v.state,cam=this.camera.position,dx=e.x-v.lastX,dz=e.z-v.lastZ,moved=Math.hypot(dx,dz);
    v.lastX=e.x;v.lastZ=e.z;
    const yaw=Math.atan2(cam.x-e.x,cam.z-e.z);v.facing.rotation.y=yaw;
    const alive=e.hp>0;v.deadT=alive?0:v.deadT+dt;
    const speed=dt>0&&moved<3?moved/dt:0;v.speed+=(speed-v.speed)*(1-Math.exp(-10*dt));
    if(moved<3)st.phase+=moved*(art.stride||3);
    // Melee strikes happen when the wind-up runs out; ranged shots arrive as events.
    if(v.prevWindup>0&&e.windup<=0&&alive)v.attack=1;v.prevWindup=e.windup;
    v.attack=Math.max(0,v.attack-dt*3.2);v.hurt=Math.max(0,v.hurt-dt*4.5);
    st.t=this.game.time+v.seed;st.seed=v.seed;st.move=alive?Math.min(1,v.speed/(def.speed*.75)):0;
    st.windup=e.windup>0?Math.min(1,st.windup+dt*5):Math.max(0,st.windup-dt*7);
    st.attack=v.attack;st.hurt=v.hurt;st.stun=alive&&e.freeze>0?1:0;st.root=e.root>0?1:0;st.slow=e.slow>0?1:0;st.dead=alive?0:Math.min(1,v.deadT/.85);
    // Species states: heal pulse, broken ice shell, quenched lanterns, a flyer knocked to the ground.
    v.heal=Math.max(0,(v.heal||0)-dt*.9);st.heal=v.heal>0?Math.sin((1-v.heal)*Math.PI):0;const settle=1-Math.exp(-6*dt);
    st.thaw+=((e.shell?0:1)-st.thaw)*settle;st.quench+=((e.quench>0?1:0)-st.quench)*settle;st.grounded+=((def.flying&&e.ground>0?1:0)-st.grounded)*settle;
    const right={x:Math.cos(yaw),z:-Math.sin(yaw)};
    st.dodge=e.dodgeTime>0&&def.dodge?Math.sign(e.dodgeX*right.x+e.dodgeZ*right.z)*Math.sin((1-e.dodgeTime/def.dodge.duration)*Math.PI):0;
    if(art.side){const lateral=(dx*right.x+dz*right.z)/(dt||1);if(Math.abs(lateral)>1.2)v.flip=lateral>0?-1:1;}
    const fx=v.facing.scale.x+((art.side?v.flip:1)-v.facing.scale.x)*(1-Math.exp(-14*dt));v.facing.scale.x=Math.abs(fx)<.08?Math.sign(fx||1)*.08:fx;
    const tint=e.flash>0||v.hurt>.75?HIT:e.freeze>0?STUN:this.game.beam.time>0&&this.game.beam.target===e.id?DRAIN:e.root>0?ROOT:e.slow>0?SLOW:PLAIN;
    const dist=Math.hypot(e.x-p.x,e.z-p.z);setLod(v.rig,dist>(v.rig.far?36:40)&&alive);
    poseRig(v.rig,st,tint,alive?1:Math.max(0,1-Math.max(0,v.deadT-.45)/.5));
    v.group.renderOrder=-1-Math.round(dist*8);
    v.shadow.material.opacity=.25*(alive?1:Math.max(0,1-v.deadT));
  }
  updateCompanion(){
    const c=this.game.companion;
    if(!this.fox){const map=texture((ctx,w,h)=>{ctx.font='190px "Segoe UI Emoji"';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🦊',w/2,h/2);});this.fox=new THREE.Sprite(new THREE.SpriteMaterial({map,color:'#a9ede2',transparent:true,opacity:.8,depthWrite:false}));this.fox.scale.set(1.1,1.1,1);this.scene.add(this.fox);}
    this.fox.visible=c.time>0;this.fox.position.set(c.x,c.y+Math.sin(this.game.time*4)*.12,c.z);
  }
  particle(at,color,size=.25,life=.4,velocity={x:0,y:0,z:0}){if(this.effects.length>=280)return;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glow,color,transparent:true,depthWrite:false}));sprite.position.set(at.x,at.y,at.z);sprite.scale.setScalar(size);this.scene.add(sprite);this.effects.push({object:sprite,life,maxLife:life,velocity});}
  events(events){
    for(const ev of events){
      if(ev.type==='cast'){
        this.castKick=SPELLS[ev.spell].cost?1:.45;this.lastSpell=ev.spell;if(ev.spell===3)this.shieldFlash=.8;
        const at=new THREE.Vector3(.43,-.1,-.85).applyMatrix4(this.camera.matrixWorld);
        this.particle(at,SPELLS[ev.spell].color,.4,.12);
      }
      if(ev.type==='burst'){
        const ring=this.mesh(new THREE.RingGeometry(.8,1,40),new THREE.MeshBasicMaterial({color:ev.color,side:THREE.DoubleSide,transparent:true,opacity:.6,depthWrite:false}),ev.at.x,terrain(ev.at.x,ev.at.z)+.15,ev.at.z);ring.rotation.x=-Math.PI/2;
        this.effects.push({object:ring,life:.4,maxLife:.4,expand:ev.radius});
      }
      if(ev.type==='fox-shot'){for(let i=0;i<10;i++){const f=i/10;this.particle({x:ev.from.x+(ev.at.x-ev.from.x)*f,y:ev.from.y+(ev.at.y-ev.from.y)*f,z:ev.from.z+(ev.at.z-ev.from.z)*f},'#a6e9dd',.16,.2);}}
      if(ev.type==='block'){
        this.shieldFlash=1;
        const ring=this.mesh(new THREE.RingGeometry(.82,1,48),new THREE.MeshBasicMaterial({color:'#dcf8ff',side:THREE.DoubleSide,transparent:true,opacity:1,depthWrite:false}),ev.at.x,ev.at.y,ev.at.z);
        ring.rotation.order='YXZ';ring.rotation.set(ev.pitch,ev.yaw,0);this.effects.push({object:ring,life:.42,maxLife:.42,expand:ev.broken?1.3:.85});
        this.particle(ev.at,'#edfcff',1,.15);
        for(let i=0;i<10;i++)this.particle(ev.at,'#91dbff',.14,.25+Math.random()*.2,{x:(Math.random()-.5)*5,y:(Math.random()-.5)*5,z:(Math.random()-.5)*2});
      }
      if(ev.type==='explosion'){
        const orb=this.mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshBasicMaterial({color:ev.color,wireframe:true,transparent:true,opacity:.4,depthWrite:false}),ev.at.x,ev.at.y,ev.at.z);
        this.effects.push({object:orb,life:.4,maxLife:.4,expand:ev.radius});
        this.particle(ev.at,'#d8f7ff',2,.25);
        for(let i=0;i<24;i++){const dir=new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize().multiplyScalar(9);this.particle(ev.at,ev.color,.25,.5,dir);}
      }
      if(ev.type==='shot'||ev.type==='hit'){const v=this.enemies.get(ev.enemy);if(v?.rig){if(ev.type==='shot')v.attack=1;else v.hurt=1;}}
      if(ev.type==='heal'){const v=this.enemies.get(ev.enemy);if(v?.rig)v.heal=1;}
      if(ev.type==='impact')for(let i=0;i<5;i++)this.particle(ev.at,ev.color,.45,.25+Math.random()*.15,{x:(Math.random()-.5)*3,y:Math.random()*2,z:(Math.random()-.5)*3});
      if(ev.type==='kill'){
        const e=this.game.enemies.find(e=>e.id===ev.enemy);if(!e)continue;
        for(let i=0;i<12;i++)this.particle(e,SPECIES[e.type].color,.5,.6,{x:(Math.random()-.5)*5,y:Math.random()*4,z:(Math.random()-.5)*5});
      }
    }
  }
  projectPoint(x,y,z){const v=new THREE.Vector3(x,y,z).project(this.camera);return {x:(v.x*.5+.5)*innerWidth,y:(-v.y*.5+.5)*innerHeight,visible:v.z<1&&v.z>0&&Math.abs(v.x)<1.1&&Math.abs(v.y)<1.1};}
  project(e){const v=new THREE.Vector3(e.x,e.y+SPECIES[e.type].size*.5+.5,e.z).project(this.camera);return {x:(v.x*.5+.5)*innerWidth,y:(-v.y*.5+.5)*innerHeight,visible:v.z<1&&v.z>0&&Math.abs(v.x)<1.05&&Math.abs(v.y)<1.05};}
  update(dt){const p=this.game.player,t=this.game.time;
    const speed=Math.hypot(p.vx,p.vz),stride=p.stride||0;
    this.walkBlend=((this.walkBlend||0)+(Math.min(1,speed/7.5)*(p.grounded?1:0)-(this.walkBlend||0))*(1-Math.exp(-22*dt)));
    if(this.eyeHeight===undefined||!p.grounded||Math.abs(this.eyeHeight-p.y)>.7)this.eyeHeight=p.y;
    else this.eyeHeight+=(p.y-this.eyeHeight)*(1-Math.exp(-24*dt));
    const bob=Math.cos(stride*2)*.038*this.walkBlend,sway=Math.sin(stride)*.018*this.walkBlend;
    this.camera.position.set(p.x+Math.cos(p.yaw)*sway,this.eyeHeight+bob,p.z-Math.sin(p.yaw)*sway);
    this.camera.rotation.set(p.pitch,p.yaw,Math.sin(stride)*.0025*this.walkBlend);this.camera.updateMatrixWorld();const s=SPELLS[this.castKick>0?(this.lastSpell??this.game.selected):this.game.selected];this.castKick=Math.max(0,this.castKick-dt*5);this.wand.rotation.x=-.23-this.castKick*.25;this.wand.position.y=-.42+Math.cos(stride*2)*.027*this.walkBlend-this.castKick*.03;this.wand.position.x=.43+Math.sin(stride)*.025*this.walkBlend;this.crystal.material.color.set(s.color);this.crystal.material.emissive.set(s.color);this.crystal.rotation.y=t*.4;this.wandGlow.material.color.set(s.color);this.updateShield(dt);updateFeyWorld(this,dt);this.updateCompanion();
    const ids=new Set(this.game.enemies.map(e=>e.id));for(const [id,v] of this.enemies){if(!ids.has(id)){this.disposeGroup(v.group);this.enemies.delete(id);}}
    for(const e of this.game.enemies){
      let v=this.enemies.get(e.id);const near=Math.hypot(e.x-p.x,e.z-p.z)<130;
      // Visuals are created lazily; painted rigs stay visible briefly to play their death.
      if(!v){if(!near||e.hp<=0)continue;v=this.enemyVisual(e);this.enemies.set(e.id,v);}
      if(v.model){v.group.visible=near;if(near){v.group.position.set(e.x,e.y,e.z);v.model.update(e,dt,Math.hypot(e.x-p.x,e.z-p.z));v.shadow.visible=v.model.root.visible;v.shadow.position.y=terrain(e.x,e.z)-e.y+.07;}continue;}
      if(v.rig){v.group.visible=near&&(e.hp>0||v.deadT<1.1);if(e.hp<=0&&!v.group.visible){v.deadT+=dt;continue;}if(!near)continue;v.group.position.set(e.x,e.y,e.z);this.updateRig(v,e,dt,p);v.shadow.position.y=terrain(e.x,e.z)-e.y+.07;continue;}
      v.group.visible=e.hp>0&&near;if(!v.group.visible)continue;
      const def=SPECIES[e.type];v.group.position.set(e.x,e.y,e.z);
      v.sprite.material.color.set(e.flash>0?'#ffffff':e.freeze>0?'#91d9ef':this.game.beam.time>0&&this.game.beam.target===e.id?'#cfa3dc':e.windup>0?'#ff9b76':e.root>0?'#b5d984':'#ffffff');
      const scale=def.size*(e.windup>0?1.06:1);v.sprite.scale.set(scale,scale,1);
      v.sprite.material.rotation=e.dodgeTime>0?e.dodgeX*.18:0;
      v.shadow.position.y=terrain(e.x,e.z)-e.y+.07;
    }
    const live=new Set();
    for(const b of this.game.projectiles){
      live.add(b.id);let mesh=this.bullets.get(b.id);
      if(!mesh){mesh=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glow,color:b.color,transparent:true,depthWrite:false}));this.scene.add(mesh);this.bullets.set(b.id,mesh);mesh.userData.trail=0;}
      mesh.scale.setScalar(b.team==='enemy'?(b.damage>=40?1.25:.85):(b.spell===5?.85:b.spell===1?.42:.3));
      mesh.position.set(b.x,b.y,b.z);mesh.material.color.set(b.color);mesh.userData.trail+=dt;
      if(mesh.userData.trail>.035){this.particle(b,b.color,b.team==='enemy'?.38:.23,.18);mesh.userData.trail=0;}
    }
    for(const [id,m] of this.bullets)if(!live.has(id)){this.scene.remove(m);m.material.dispose();this.bullets.delete(id);}
    for(const fx of this.effects){fx.life-=dt;fx.object.material.opacity=Math.max(0,fx.life/fx.maxLife)*.75;if(fx.velocity){fx.object.position.x+=fx.velocity.x*dt;fx.object.position.y+=fx.velocity.y*dt;fx.object.position.z+=fx.velocity.z*dt;}if(fx.expand)fx.object.scale.setScalar((1-fx.life/fx.maxLife)*fx.expand);if(fx.life<=0){this.scene.remove(fx.object);fx.object.geometry?.dispose();fx.object.material.dispose();}}this.effects=this.effects.filter(f=>f.life>0);this.updateBeamVisual();this.renderer.render(this.scene,this.camera);
  }
  disposeGroup(group){group.traverse(o=>{o.geometry?.dispose();if(o.material){o.material.dispose();}});this.scene.remove(group);}
}
