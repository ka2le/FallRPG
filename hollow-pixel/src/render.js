import { TerrainCache } from './terrain.js';
import { cellBounds, characterFrame, environmentFrame, creatureAppearance } from './sprites.js';
import { BIOMES, SPECIES, PLACES, SPELL_BY_ID } from './data.js';
import { ENCOUNTERS } from './adventure.js';
import { questList, questMarkers, currentStep, knownQuests } from './quests.js';
import { landscapeGroundColor } from './frontier-landscape.js';
import { WIDTH, HEIGHT, MIN_X, MIN_Y, MAX_X, MAX_Y, HOME, hash, biomeAt, terrainAt, seamX, waterAt, dist, clamp, PATHS, propsNear } from './world.js';

export const Y_SCALE=.72;
const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const loadImage=src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error(`Could not load ${src}`));i.src=src;});
export class Renderer{
  constructor(canvas,game){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.game=game;this.camera={x:HOME.x,y:HOME.y*Y_SCALE};this.zoom=globalThis.matchMedia?.('(pointer:coarse)').matches?1.5:2;this.sprites={};this.rasters=new Map();this.frame=0;this.hover=null;this.wind=0;this.resize();}
  async init(){
    const [environment,creatures,groves,wilds,wildlife]=await Promise.all([loadImage(new URL('../public/assets/world-v2.png',import.meta.url).href),loadImage(new URL('../public/assets/characters-v2.png',import.meta.url).href),loadImage(new URL('../public/assets/groves-expansion.png',import.meta.url).href),loadImage(new URL('../public/assets/wilds-expansion.png',import.meta.url).href),loadImage(new URL('../public/assets/wildlife-expansion.png',import.meta.url).href)]);
    this.atlases={environment,creatures,groves,wilds,wildlife};
    this.atlases.forge=await loadImage(new URL('../public/assets/forge-v1.png',import.meta.url).href);
    for(const [name,img] of Object.entries(this.atlases)){
      const canvas=makeCanvas(img.width,img.height),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
      const pixels=ctx.getImageData(0,0,img.width,img.height).data;
      this.sprites[name]=Array.from({length:name==='forge'?8:64},(_,index)=>cellBounds(pixels,img.width,img.height,index,name==='forge'?4:8,name==='forge'?2:8));
      if(name==='forge')for(let row=0;row<2;row++){
        const cw=img.width/4,ch=img.height/2,cells=this.sprites[name].slice(row*4,row*4+4);
        const left=Math.min(...cells.map((s,i)=>s.x-i*cw)),top=Math.min(...cells.map(s=>s.y-row*ch)),right=Math.max(...cells.map((s,i)=>s.x+s.w-i*cw)),bottom=Math.max(...cells.map(s=>s.y+s.h-row*ch));
        for(let col=0;col<4;col++)this.sprites[name][row*4+col]={x:col*cw+left,y:row*ch+top,w:right-left,h:bottom-top};
      }
    }
    this.atlases.details=environment;this.sprites.details=this.sprites.environment.slice(16,32);
    this.ground=new TerrainCache();this.mini=this.bakeMap();
  }
  resize(){
    const rect=(this.canvas.parentElement||this.canvas).getBoundingClientRect();
    this.width=Math.ceil(rect.width/this.zoom);this.height=Math.ceil(rect.height/this.zoom);this.canvas.width=this.width;this.canvas.height=this.height;
    // Let the stage clip a spare pixel at odd window sizes instead of stretching
    // rows to a fractional CSS scale as the scenery scrolls.
    this.canvas.style.width=`${this.width*this.zoom}px`;this.canvas.style.height=`${this.height*this.zoom}px`;this.ctx.imageSmoothingEnabled=false;
  }
  setZoom(zoom){if(!Number.isFinite(zoom))return;const next=clamp(zoom,1,4);if(Math.abs(next-this.zoom)<.001)return;this.zoom=next;this.resize();}
  thumbnail(index,atlas='creatures'){const frame=atlas==='creatures'?characterFrame(index):index,s=this.sprites[atlas]?.[frame],canvas=makeCanvas(80,80),c=canvas.getContext('2d');if(!s)return canvas.toDataURL();c.imageSmoothingEnabled=false;const ratio=Math.min(68/s.w,68/s.h),w=s.w*ratio,h=s.h*ratio;c.drawImage(this.atlases[atlas],s.x,s.y,s.w,s.h,(80-w)/2,76-h,w,h);return canvas.toDataURL();}
  drawAim(){const g=this.game;if(!g.aiming)return;const spell=SPELL_BY_ID[g.aiming.id],point=g.pointer,c=this.ctx,s=this.screen(point.x,point.y),valid=g.placementValid(spell,point);c.save();c.strokeStyle=valid?spell.color:'#df806c';c.fillStyle=valid?spell.color+'25':'#df806c25';c.lineWidth=1;
    if(spell.aim==='wall'){const wall=g.wallAt(point),a=this.screen(wall.a.x,wall.a.y),b=this.screen(wall.b.x,wall.b.y);c.lineWidth=8;c.globalAlpha=.3;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.lineWidth=1;c.globalAlpha=1;c.stroke();for(let i=0;i<7;i++){const t=i/6;c.fillRect(a.x+(b.x-a.x)*t-1,a.y+(b.y-a.y)*t-3,3,6);}}
    else {const radius=spell.radius||24;c.beginPath();c.ellipse(s.x,s.y,radius,radius*Y_SCALE,0,0,Math.PI*2);c.fill();c.setLineDash([3,2]);c.stroke();}
    c.setLineDash([]);c.globalAlpha=.25;const p=this.screen(g.player.x,g.player.y);c.beginPath();c.ellipse(p.x,p.y,spell.range,spell.range*Y_SCALE,0,0,Math.PI*2);c.stroke();c.restore();
  }
  // Quantize the world before subtracting one shared camera origin. Rounding
  // each object's camera-relative position makes neighbouring trees jitter.
  get left(){return Math.round(this.camera.x-this.width/2);}
  get top(){return Math.round(this.camera.y-this.height/2);}
  screen(x,y){return{x:Math.round(x)-this.left,y:Math.round(y*Y_SCALE)-this.top};}
  world(clientX,clientY){const r=this.canvas.getBoundingClientRect();return{x:(clientX-r.left)*this.width/r.width+this.left,y:((clientY-r.top)*this.height/r.height+this.top)/Y_SCALE};}
  bakeMap(){
    const w=600,h=Math.round(w*HEIGHT/WIDTH),map=makeCanvas(w,h),c=map.getContext('2d');
    for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2){const t=terrainAt(MIN_X+x/w*WIDTH,MIN_Y+y/h*HEIGHT);c.fillStyle=t.water?'#477c7a':t.lava?'#cb8759':landscapeGroundColor(({spring:'#5b7954',autumn:'#987349',winter:'#bacdcc',ember:'#68605a'})[t.biome],t.microhabitat);c.fillRect(x,y,2,2);}
    for(const p of this.game.world.props)if(p.tree&&!p.removed){c.fillStyle='#253d31';c.globalAlpha=.18;c.fillRect((p.x-MIN_X)/WIDTH*w,(p.y-MIN_Y)/HEIGHT*h,1,1);}c.globalAlpha=1;
    c.strokeStyle='#d1bc87';c.lineWidth=.8;for(const path of PATHS){c.beginPath();path.forEach((p,i)=>i?c.lineTo((p.x-MIN_X)/WIDTH*w,(p.y-MIN_Y)/HEIGHT*h):c.moveTo((p.x-MIN_X)/WIDTH*w,(p.y-MIN_Y)/HEIGHT*h));c.stroke();}
    return map;
  }
  ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(Math.round(x),Math.round(y),rx,ry,0,0,Math.PI*2);c.fill();}
  sprite(atlas,index,x,y,size,{face=1,alpha=1,sway=0,bob=0,squash=0,flash=false,stride=0}={}){
    const c=this.ctx,s=this.sprites[atlas]?.[index];if(!s||size<=0)return;const h=Math.max(1,Math.round(size)),w=Math.max(1,Math.round(h*s.w/s.h));
    c.save();c.globalAlpha=alpha;c.translate(Math.round(x),Math.round(y-bob));c.scale(face*(1+squash),1-squash);if(flash)c.filter='brightness(1.7)';
    if(sway){
      // Sample the detailed source once at its final pixel size. Rotate that
      // stable silhouette around its roots, rather than resampling source rows
      // through a changing shear on every frame.
      const key=`${atlas}:${index}:${w}:${h}`;let raster=this.rasters.get(key);
      if(!raster){
        const base=makeCanvas(w,h),rc=base.getContext('2d'),pad=Math.ceil(h*.04)+2;
        rc.imageSmoothingEnabled=false;rc.drawImage(this.atlases[atlas],s.x,s.y,s.w,s.h,0,0,w,h);
        raster={base,pad,pose:makeCanvas(w+pad*2,h+pad*2)};this.rasters.set(key,raster);if(this.rasters.size>512)this.rasters.delete(this.rasters.keys().next().value);
      }
      // Pose in local coordinates too: browser rotation rasterization can vary
      // slightly with screen position, even for integer camera translations.
      if(raster.sway!==sway){
        const rc=raster.pose.getContext('2d');rc.clearRect(0,0,raster.pose.width,raster.pose.height);rc.save();rc.translate(raster.pad+Math.floor(w/2),raster.pad+h);rc.rotate(-sway);rc.imageSmoothingEnabled=true;rc.drawImage(raster.base,-Math.floor(w/2),-h);rc.restore();raster.sway=sway;
      }
      c.drawImage(raster.pose,-Math.floor(w/2)-raster.pad,-h-raster.pad);
    }else c.drawImage(this.atlases[atlas],s.x,s.y,s.w,s.h,-Math.floor(w/2),-h,w,h);
    c.restore();
  }
  visible(x,y,margin=160){const p=this.screen(x,y);return p.x>-margin&&p.x<this.width+margin&&p.y>-margin&&p.y<this.height+margin;}
  text(text,x,y,color='#eae0bd',size=7,align='center'){const c=this.ctx;c.font=`${size}px Verdana, sans-serif`;c.textAlign=align;c.textBaseline='middle';c.lineWidth=2.5;c.strokeStyle='#182c26';c.strokeText(text,Math.round(x),Math.round(y));c.fillStyle=color;c.fillText(text,Math.round(x),Math.round(y));}
  draw(dt){
    if(!this.ground)return;const g=this.game,c=this.ctx,p=g.player;this.frame++;this.wind=Math.sin(g.time*.8);
    // A small dead zone gives walking a steady, room-like feel.
    const k=1-Math.exp(-dt*18),tx=clamp(this.camera.x,p.x-44,p.x+44),ty=clamp(this.camera.y,p.y*Y_SCALE-32,p.y*Y_SCALE+24);
    this.camera.x+=(tx-this.camera.x)*k;this.camera.y+=(ty-this.camera.y)*k;
    this.camera.x=clamp(this.camera.x,MIN_X+this.width/2,MAX_X-this.width/2);this.camera.y=clamp(this.camera.y,MIN_Y*Y_SCALE+this.height/2,MAX_Y*Y_SCALE-this.height/2);
    c.fillStyle='#324d3c';c.fillRect(0,0,this.width,this.height);c.imageSmoothingEnabled=false;
    this.ground.draw(c,this.left,this.top,this.width,this.height);
    this.drawWater();this.drawTrails();this.drawAim();this.drawLivingHedges();
    const queue=[];this.nearProps=propsNear(g.world,this.camera.x,this.camera.y/Y_SCALE,Math.max(this.width,this.height/Y_SCALE)/2+240);
    for(const prop of this.nearProps)if(!prop.removed&&this.visible(prop.x,prop.y))queue.push({y:prop.y,kind:'prop',v:prop});
    for(const i of g.world.interactables)if(!i.collected&&this.visible(i.x,i.y)&&(i.kind==='npc'||i.kind==='herb'))queue.push({y:i.y,kind:i.kind,v:i});
    for(const i of g.world.interactables)if(i.kind==='forge'&&this.visible(i.x,i.y))queue.push({y:i.y+8,kind:'smith',v:i});
    for(const creature of g.creatures)if(this.visible(creature.x,creature.y)&&(!creature.dead||g.time-creature.deadAt<1))queue.push({y:creature.y,kind:'creature',v:creature});
    for(const a of g.world.ambient)if(this.visible(a.x,a.y,40))queue.push({y:a.y,kind:'ambient',v:a});
    for(const wall of g.world.barriers){for(let n=0;n<=8;n++){const x=wall.a.x+(wall.b.x-wall.a.x)*n/8,y=wall.a.y+(wall.b.y-wall.a.y)*n/8;queue.push({y,kind:'wall',v:{x,y,life:wall.life}});}}
    queue.push({y:p.y,kind:'player',v:p});if(g.fox)queue.push({y:g.fox.y,kind:'fox',v:g.fox});
    // Low fence silhouettes and moving workshop smoke make the settlement inhabited.
    this.drawVillage();
    queue.sort((a,b)=>a.y-b.y);
    for(const entry of queue){const v=entry.v,s=this.screen(v.x,v.y);
      if(entry.kind==='prop'){
        c.globalAlpha=v.vegetation?.10:.18;this.ellipse(c,s.x+8,s.y-1,v.size*.27,v.size*.10,'#122d26');c.globalAlpha=1;
        const behind=Math.abs(v.x-p.x)<v.size*.36&&p.y<v.y&&p.y>v.y-v.size/Y_SCALE;
        this.sprite(['groves','wilds','forge'].includes(v.atlas)?v.atlas:'environment',v.forge?Math.floor(g.time*3)%4:environmentFrame(v),s.x,s.y,v.size,{face:v.flip?-1:1,sway:v.tree||v.vegetation?Math.sin(g.time*.7+v.phase)*.012:0,alpha:behind?.42:1});
        if(v.tree&&v.sprite===0&&!v.atlas){for(let n=0;n<3;n++){const a=g.time*.8+n*2+v.phase;c.globalAlpha=.45+Math.sin(a)*.2;this.ellipse(c,s.x+Math.sin(n*3+v.phase)*v.size*.25,s.y-v.size*.45+Math.sin(a)*2,1.5,2,'#e7cb79');}c.globalAlpha=1;}
        if(v.clasp&&v.lastSnap&&g.time-v.lastSnap<.7){c.strokeStyle='#c4c387';c.lineWidth=2;for(let a=0;a<5;a++){c.beginPath();c.moveTo(s.x,s.y-10);c.quadraticCurveTo(s.x+Math.cos(a*1.25)*20,s.y-15,s.x+Math.cos(a*1.25)*40,s.y+Math.sin(a*1.25)*12);c.stroke();}}
      }
      if(entry.kind==='npc'){
        this.ellipse(c,s.x,s.y,8,3,'#354f3c');this.sprite('creatures',characterFrame(v.sprite,v),s.x,s.y,v.size||32,{face:v.face||1});
        if(g.nearby?.id===v.id)this.text(v.name,s.x,s.y-40,'#f0d89e',7);
        const mark=this.quests().givers.get(v.id);if(mark){const first=v.id==='rowan'&&g.quests.herd==='offered';if(mark==='!')this.questRing(s.x,s.y,first);this.questBadge(s.x,s.y-(first?56:50),mark,first);}
      }
      if(entry.kind==='smith'){
        this.ellipse(c,s.x-42,s.y+10,15,5,'#354238');this.sprite('forge',4+[0,1,0,2,3,0][Math.floor(g.time*3)%6],s.x-42,s.y+10,57);
        if(g.nearby?.id===v.id||this.hoverSpot===v.id)this.text('Cinder · The Forge',s.x-16,s.y-69,'#ffc795',7);
      }
      if(entry.kind==='herb'){
        this.sprite('details',biomeAt(v.x,v.y)==='winter'?8:4,s.x,s.y,21,{sway:Math.sin(g.time+v.x)*.025});if(Math.sin(g.time*2+v.x)>.7){c.fillStyle='#fae8aa';c.fillRect(s.x+3,s.y-22,1,3);}
      }
      if(entry.kind==='creature')this.drawCreature(v,s);
      if(entry.kind==='ambient')this.drawAmbient(v,s);
      if(entry.kind==='player'){
        c.globalAlpha=.3;this.ellipse(c,s.x,s.y+1,10,4,'#132b24');c.globalAlpha=1;
        if(p.shield>0){c.strokeStyle='#e5ca7d';c.globalAlpha=.65;this.ellipse(c,s.x,s.y-22,21,29,'#cfb66722');c.beginPath();c.ellipse(s.x,s.y-22,21,29,0,0,Math.PI*2);c.stroke();c.globalAlpha=1;}
        this.sprite('creatures',characterFrame(12,{moving:p.moving,walk:p.walk,direction:p.direction}),s.x,s.y,34,{bob:p.moving?Math.abs(Math.sin(p.walk*Math.PI))*.5:0,flash:p.invulnerable>0&&Math.sin(g.time*20)>0});
        if(p.renew>0)for(let i=0;i<3;i++){c.fillStyle='#c1e39a';c.fillRect(s.x+Math.sin(g.time*2+i*2)*15,s.y-((g.time*20+i*12)%45),2,2);}
        const t=g.targetCreature;if(g.autoAttack&&t&&p.attack>.65){const ts=this.screen(t.x,t.y);c.strokeStyle='#e5ce8b';c.lineWidth=2;c.beginPath();c.moveTo(s.x+p.face*12,s.y-22);c.lineTo(ts.x,ts.y-18);c.stroke();}

      }
      if(entry.kind==='fox'){this.sprite('creatures',characterFrame(15,v),s.x,s.y,24,{face:v.face});}
      if(entry.kind==='wall'){this.sprite('environment',25,s.x,s.y,28*Math.min(1,(7-v.life)*5),{alpha:Math.min(1,v.life*2)});}
    }
    for(const shot of g.projectiles){const s=this.screen(shot.x,shot.y+16);c.globalAlpha=.2;this.ellipse(c,s.x,s.y-16,8,6,shot.color);c.globalAlpha=1;this.ellipse(c,s.x,s.y-16,3,2,shot.color);c.fillStyle='#fff1c6';c.fillRect(s.x-1,s.y-17,2,2);}
    this.drawEffects();this.drawAtmosphere();
    for(const f of g.floaters){const s=this.screen(f.x,f.y);c.globalAlpha=Math.min(1,(f.life-f.age)*2);this.text(f.text,s.x,s.y-f.age*17,f.color,9);c.globalAlpha=1;}
    this.drawInteractions();
    if(this.hover){const h=g.creatures.find(c=>c.id===this.hover&&!c.dead);if(h&&h.id!==g.target){const s=this.screen(h.x,h.y);this.text(SPECIES[h.type].name,s.x,s.y-SPECIES[h.type].size-9,'#e8ddbb',7);}}
    // The quiet edge vignette is deliberately light enough to preserve terrain color.
    const vignette=c.createRadialGradient(this.width/2,this.height/2,this.height*.35,this.width/2,this.height/2,this.width*.72);vignette.addColorStop(0,'#11272200');vignette.addColorStop(1,'#10241f69');c.fillStyle=vignette;c.fillRect(0,0,this.width,this.height);
  }
  drawCreature(v,s){const c=this.ctx,g=this.game,def=SPECIES[v.type],selected=g.target===v.id;
    if(def.rootwall){this.drawMarchingTree(v,s);return;}
    c.globalAlpha=v.dead?Math.max(0,1-(g.time-v.deadAt)):.3;this.ellipse(c,s.x,s.y,def.size*.30,def.size*.10,'#183c2e');c.globalAlpha=1;
    if(selected){c.strokeStyle=def.neutral&&!v.aggro?'#e7d396':'#f3b099';c.lineWidth=1;c.setLineDash([3,2]);c.beginPath();c.ellipse(s.x,s.y,def.size*.36,def.size*.14,0,0,Math.PI*2);c.stroke();c.setLineDash([]);}
    const swim=v.type==='snowkeel'&&!v.aggro,bob=v.moving?Math.abs(Math.sin(v.walk))*1.5:Math.sin(g.time*1.6+v.phase)*.7;
    if(swim){c.globalAlpha=.6;this.ellipse(c,s.x,s.y-4,25,8,'#e3ece3');c.globalAlpha=1;}
    const appearance=creatureAppearance(def,v);
    this.sprite(appearance.atlas,appearance.frame,s.x,s.y+(swim?6:0),def.size,{face:v.face,bob:v.type==='stormbell'?5+Math.sin(g.time*2+v.phase)*2:0,alpha:v.dead?Math.max(0,1-(g.time-v.deadAt)):(swim?.8:1),flash:v.flash>0});
    if(!v.dead&&this.quests().mobs.has(v.id))this.questPip(s.x,s.y-def.size-(v.calling?14:3));
    if(v.calling)this.text('♪',s.x,s.y-def.size-7,'#e6d291',8);
    if(v.feeding&&def.atlas==='wildlife'){for(let n=0;n<3;n++){const t=(g.time*.4+n*.33)%1;c.globalAlpha=(1-t)*.4;c.fillStyle=def.habitat==='winter'?'#e4f2df':'#cbd39d';c.fillRect(s.x+v.face*(def.size*.25)+Math.sin(n*3+t)*6,s.y-7-t*12,1,2);}c.globalAlpha=1;}
    if(v.type==='barkjaw'&&v.state==='feeding'){c.strokeStyle='#c6cba0';c.lineWidth=1;for(let i=0;i<3;i++){c.beginPath();c.moveTo(s.x+v.face*17,s.y-12);c.lineTo(s.x+v.face*(23+Math.sin(g.time*5+i)*4),s.y-7+i*4);c.stroke();}}
    if(v.type==='ventback'){for(let i=0;i<3;i++){const t=(g.time*.4+i*.33)%1;c.globalAlpha=(1-t)*.4;this.ellipse(c,s.x-12+i*7+Math.sin(t*4)*4,s.y-def.size*.7-t*22,3+t*5,2+t*3,'#d2cebc');}c.globalAlpha=1;for(let i=0;i<3;i++)this.ellipse(c,s.x+22+i*4,s.y+3+i%2*3,3,4,'#d4b887');}
    if(v.type==='scavenger'){this.ellipse(c,s.x+v.face*10,s.y-10,2,2,v.cold>.4?'#ade1e4':'#697b80');this.ellipse(c,s.x+v.face*16,s.y-10,2,2,v.warm>.4?'#f5bb77':'#826b55');}
    if(v.root>0){c.strokeStyle='#a8c781';c.lineWidth=1.5;for(let i=0;i<3;i++){c.beginPath();c.ellipse(s.x,s.y-i*6,def.size*.28-i*2,5,0,0,Math.PI*2);c.stroke();}}
    if(v.stun>0){this.text('✦  ✦',s.x,s.y-def.size-4,'#ded1ed',8);}
    if(v.aggro||selected||this.hover===v.id){c.fillStyle='#182923';c.fillRect(s.x-14,s.y-def.size-5,28,3);c.fillStyle='#c98d77';c.fillRect(s.x-13,s.y-def.size-4,26*v.hp/v.maxHp,1);}
    if(!def.neutral&&(v.aggro||selected||this.hover===v.id||v.elite))this.text(`${v.elite?'◆ ':''}${v.name||def.name} · ${v.level||1}`,s.x,s.y-def.size-11,v.level>g.player.level+1?'#f4a191':'#eee0b6',6);
  }
  drawLivingHedges(){
    const c=this.ctx;
    for(const group of this.game.world.rootwallGroups||[]){
      const members=(group.members||[]).filter(v=>!v.dead).sort((a,b)=>a.rootIndex-b.rootIndex);
      for(let i=1;i<members.length;i++){
        const a=members[i-1],b=members[i];if(dist(a,b)>44||!this.visible(a.x,a.y))continue;
        const start=this.screen(a.x,a.y),end=this.screen(b.x,b.y);
        c.strokeStyle='#665635';c.lineWidth=3;c.beginPath();c.moveTo(start.x,start.y+2);c.quadraticCurveTo((start.x+end.x)/2,(start.y+end.y)/2-7,end.x,end.y+2);c.stroke();
        c.strokeStyle='#b6be79';c.lineWidth=1;c.beginPath();c.moveTo(start.x,start.y);c.lineTo(end.x,end.y);c.stroke();
      }
    }
  }
  drawMarchingTree(v,s){
    const c=this.ctx,g=this.game,def=SPECIES[v.type],selected=g.target===v.id,alive=v.dead?Math.max(0,1-(g.time-v.deadAt)):1;
    const behind=Math.abs(v.x-g.player.x)<30&&g.player.y<v.y&&g.player.y>v.y-def.size/Y_SCALE;
    c.globalAlpha=alive*.25;this.ellipse(c,s.x,s.y,24,8,'#183c2e');c.globalAlpha=alive;
    for(let i=0;i<6;i++){
      const side=i<3?-1:1,n=i%3,step=v.moving?Math.sin(v.walk*3+n*2)*5:0;
      c.strokeStyle=i%2?'#9c8854':'#665135';c.lineWidth=2;c.beginPath();c.moveTo(s.x+side*4,s.y-6);c.lineTo(s.x+side*(12+n*2),s.y-4+step);c.lineTo(s.x+side*(21+n*3),s.y+5-step*.4);c.stroke();
    }
    c.globalAlpha=1;const art=creatureAppearance(def,v);
    this.sprite(art.atlas,art.frame,s.x,s.y,def.size,{alpha:alive*(behind?.45:1),bob:v.moving?Math.abs(Math.sin(v.walk*2))*1.5:0,sway:Math.sin(g.time*.7+v.phase)*.01,flash:v.flash>0});
    if(v.root>0){c.strokeStyle='#c6dc8b';c.lineWidth=1.5;c.beginPath();c.ellipse(s.x,s.y-3,22,7,0,0,Math.PI*2);c.stroke();}
    if(v.stun>0)this.text('✦  ✦',s.x,s.y-def.size-7,'#ded1ed',8);
    if(selected||v.aggro||this.hover===v.id){
      c.fillStyle='#182923';c.fillRect(s.x-17,s.y-def.size-5,34,3);c.fillStyle='#c98d77';c.fillRect(s.x-16,s.y-def.size-4,32*v.hp/v.maxHp,1);
      this.text(`${def.name} · ${v.level}`,s.x,s.y-def.size-13,v.level>g.player.level+1?'#f4a191':'#eee0b6',6);
      if(selected)this.text(v.state,s.x,s.y+15,'#d6cc9e',6);
    }
  }
  drawWater(){const c=this.ctx,g=this.game,left=this.camera.x-this.width/2,top=(this.camera.y-this.height/2)/Y_SCALE;
    for(let y=Math.floor(top/45)*45;y<top+this.height/Y_SCALE;y+=45)for(let x=Math.floor(left/40)*40;x<left+this.width;x+=40){const wx=x+hash(x,y)*28,wy=y+hash(y,x)*30;if(!waterAt(wx,wy))continue;const s=this.screen(wx,wy),phase=g.time*1.2+hash(x,y)*9;c.globalAlpha=.15+Math.sin(phase)*.09;c.fillStyle=biomeAt(wx,wy)==='winter'?'#d9ebde':'#a1c5ad';c.fillRect(s.x+Math.sin(phase)*3,s.y,5+hash(y,x)*8,1);}c.globalAlpha=1;
  }
  drawTrails(){const c=this.ctx,g=this.game;for(const creature of g.creatures){if(creature.type!=='snowkeel'||creature.dead||!this.visible(creature.x,creature.y))continue;const s=this.screen(creature.x,creature.y);for(let i=1;i<7;i++){c.globalAlpha=.28-i*.03;this.ellipse(c,s.x-creature.face*i*6,s.y+2,5,2,'#f2f2dc');}c.globalAlpha=1;}
    // Worker traffic on the spring roots is animated independently from the tree.
    for(const t of (this.nearProps||[]).filter(p=>(p.clasp||p.insects||(p.atlas==='details'&&p.sprite===1))&&this.visible(p.x,p.y))){const s=this.screen(t.x,t.y);for(let i=0;i<12;i++){const a=(g.time*.2+i/12)%1;c.fillStyle='#ced6a4';c.fillRect(s.x-30+a*60,s.y+Math.sin(a*7)*3,1,1);}}
  }
  drawVillage(){const c=this.ctx,g=this.game;
    for(const [x,y,len] of [[900,650,105],[920,690,70],[1210,800,100],[850,1018,100]]){const s=this.screen(x,y);c.fillStyle='#645c3d';c.fillRect(s.x,s.y-7,len,2);c.fillStyle='#b19d6b';for(let i=0;i<len;i+=15)c.fillRect(s.x+i,s.y-11,2,14);}
    for(const home of (this.nearProps||[]).filter(p=>p.building&&p.sprite!==6&&this.visible(p.x,p.y))){const s=this.screen(home.x,home.y);for(let i=0;i<5;i++){const t=(g.time*.13+i*.2)%1;c.globalAlpha=(1-t)*.28;this.ellipse(c,s.x+home.size*.24+Math.sin(t*5)*8,s.y-home.size*.9-t*40,3+t*8,3+t*5,'#d2d2b7');}c.globalAlpha=1;}
  }
  // Markets show a coin sign and label as you approach, and anything
  // you can use shows a clear key prompt with its action once you are close enough.
  marketTop(m){
    if(!m._top){const stall=(this.game.world.props||[]).filter(p=>!p.tree&&Math.abs(p.x-m.x)<45&&p.y<=m.y+6&&m.y-p.y<70).sort((a,b)=>(b.size||0)-(a.size||0))[0];m._top=stall?{x:stall.x,y:stall.y,h:stall.size||60}:{x:m.x,y:m.y,h:44};}
    return m._top;
  }
  drawInteractions(){
    const g=this.game,p=g.player,c=this.ctx,t=g.time;
    for(const m of g.world.interactables){
      if(m.kind!=='market'||!this.visible(m.x,m.y,120))continue;
      const top=this.marketTop(m),base=this.screen(top.x,top.y),d=dist(m,p),here=g.nearby?.id===m.id,hover=this.hoverSpot===m.id,near=d<100;
      // The sign only appears as you approach (or point at the stall), so it never clutters the town.
      if(!near&&!here&&!hover)continue;
      // Ground glow under the stall when you can trade (or point at it).
      if(here||hover){const k=.5+.5*Math.sin(t*4),rx=top.h*.62+k*3;c.save();c.globalAlpha=.3+.25*k;c.strokeStyle='#ffd76a';c.lineWidth=1.5;c.beginPath();c.ellipse(base.x,base.y-2,rx,rx*.42,0,0,Math.PI*2);c.stroke();c.globalAlpha=.1;c.fillStyle='#ffd76a';c.fill();c.restore();}
      const y=base.y-top.h-14+Math.sin(t*2.6+m.x)*1.6;
      this.coinSign(base.x,y,here||hover?1.15:.95,here||hover);
      if(here)this.prompt(base.x,y-17,'Trade');
      else if(near||hover)this.text(m.name.replace(/^Willowmere /,'').replace(/^\w/,ch=>ch.toUpperCase()),base.x,y-16,'#f6dc94',7);
    }
    const n=g.nearby;if(!n||n.kind==='market')return;
    const verb={npc:'Talk',market:'Trade',forge:'Forge',herb:'Gather',lore:'Read',sign:'Map',hearth:'Rest',crossing:'Clear',elder:'Look'}[n.kind]||'Use';
    const s=this.screen(n.x,n.y);this.prompt(s.x,s.y+13,verb);
  }
  coinSign(x,y,k,lit){
    const c=this.ctx,r=8*k;c.save();
    const glow=c.createRadialGradient(x,y,1,x,y,r*2.4);glow.addColorStop(0,lit?'#ffe58acc':'#ffd76a77');glow.addColorStop(1,'#ffd76a00');c.fillStyle=glow;c.beginPath();c.arc(x,y,r*2.4,0,Math.PI*2);c.fill();
    // A hanging signboard: dark plate, gold rim, a stack of amber coins.
    c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle='#1b3027';c.fill();c.lineWidth=1.6*k;c.strokeStyle=lit?'#ffe78f':'#e8c060';c.stroke();
    for(let i=0;i<3;i++){const cy=y+2.6*k-i*2.4*k;c.beginPath();c.ellipse(x,cy,4.4*k,1.8*k,0,0,Math.PI*2);c.fillStyle=i===2?'#ffe08a':'#d9a640';c.fill();c.lineWidth=.8;c.strokeStyle='#5d3f10';c.stroke();}
    c.restore();
  }
  prompt(x,y,verb){
    const c=this.ctx,touch=this.zoom<2,key=touch?'Tap':'Space';c.save();c.font='bold 7px Verdana, sans-serif';
    const kw=Math.max(9,c.measureText(key).width+5);c.font='7px Verdana, sans-serif';const vw=c.measureText(verb).width,w=kw+vw+9,h=11,l=Math.round(x-w/2),tp=Math.round(y-h/2);
    c.globalAlpha=.92;c.fillStyle='#15271f';c.fillRect(l,tp,w,h);c.globalAlpha=1;c.strokeStyle='#c9a95e';c.lineWidth=1;c.strokeRect(l+.5,tp+.5,w-1,h-1);
    c.fillStyle='#f3d27a';c.fillRect(l+2,tp+2,kw,h-4);c.fillStyle='#2a1d08';c.font='bold 7px Verdana, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(key,l+2+kw/2,tp+h/2+.5);
    c.fillStyle='#f4e6bd';c.font='7px Verdana, sans-serif';c.textAlign='left';c.fillText(verb,l+kw+5,tp+h/2+.5);c.restore();
  }
  // Quest markers are computed once per game moment and shared by every NPC and creature drawn.
  quests(){const g=this.game;if(this._questAt!==g.time||!this._quests){this._questAt=g.time;this._quests=questMarkers(g);}return this._quests;}
  questBadge(x,y,mark,big){
    const c=this.ctx,s=big?1.5:1.12,cy=y+Math.sin(this.game.time*3.2)*2*s,w=7*s,h=9*s;c.save();
    const gr=c.createRadialGradient(x,cy,1,x,cy,17*s);gr.addColorStop(0,mark==='?'?'#fff3b8b0':'#ffd76aa0');gr.addColorStop(1,'#ffd76a00');c.fillStyle=gr;c.beginPath();c.arc(x,cy,17*s,0,Math.PI*2);c.fill();
    c.beginPath();c.moveTo(x,cy-h);c.lineTo(x+w,cy-h*.35);c.lineTo(x+w*.72,cy+h*.6);c.lineTo(x,cy+h);c.lineTo(x-w*.72,cy+h*.6);c.lineTo(x-w,cy-h*.35);c.closePath();
    c.fillStyle=mark==='?'?'#ffe78f':'#f3c24f';c.strokeStyle='#2a1d08';c.lineWidth=1.6;c.fill();c.stroke();
    c.font=`bold ${Math.round(11*s)}px Georgia, serif`;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#2a1d08';c.fillText(mark,x,cy+.5*s);c.restore();
  }
  questRing(x,y,big){const c=this.ctx,t=(this.game.time*.7)%1;c.save();c.globalAlpha=(1-t)*(big?.9:.55);c.strokeStyle='#f3c24f';c.lineWidth=big?2:1.5;c.beginPath();c.ellipse(x,y,(big?14:10)+t*(big?22:12),((big?14:10)+t*(big?22:12))*Y_SCALE,0,0,Math.PI*2);c.stroke();c.restore();}
  questPip(x,y){const c=this.ctx,b=Math.sin(this.game.time*4+x)*1.2;c.fillStyle='#f6d36a';c.strokeStyle='#2a1d08';c.lineWidth=1;c.beginPath();c.moveTo(x-3.5,y-6+b);c.lineTo(x+3.5,y-6+b);c.lineTo(x,y+b);c.closePath();c.fill();c.stroke();}
  drawEffects(){const c=this.ctx;for(const e of this.game.effects){const s=this.screen(e.x,e.y),t=e.age/e.life;c.save();c.globalAlpha=1-t;c.strokeStyle=e.color;c.fillStyle=e.color;c.lineWidth=1.5;
    if(['ring','bloom','warning','destination'].includes(e.type)){const r=e.type==='warning'?e.radius*(1-t*.25):(e.radius||25)*(e.type==='destination'?1:Math.sqrt(t));c.beginPath();c.ellipse(s.x,s.y,r,r*Y_SCALE,0,0,Math.PI*2);c.stroke();if(e.type==='bloom'){for(let a=0;a<10;a++){const angle=a*Math.PI/5+t;c.fillRect(s.x+Math.cos(angle)*r,s.y+Math.sin(angle)*r*Y_SCALE-5,2,4);}}}
    if(e.type==='roots'){for(let i=0;i<6;i++){const a=i*Math.PI/3+t;c.beginPath();c.moveTo(s.x+Math.cos(a)*25,s.y+Math.sin(a)*12);c.quadraticCurveTo(s.x+Math.cos(a)*15,s.y-25,s.x,s.y-9);c.stroke();}}
    if(e.type==='beam'){const to=this.screen(e.tx,e.ty);c.beginPath();c.moveTo(s.x,s.y);c.quadraticCurveTo((s.x+to.x)/2,s.y-35,to.x,to.y);c.stroke();}
    if(e.type==='float'){c.globalAlpha=t<.12?t/.12:Math.max(0,1-(t-.45)/.55);this.text(e.text,s.x,s.y-36-t*24,e.color,12);}
    if(['hit','leaves','slash'].includes(e.type)){for(let i=0;i<7;i++){const a=i*2.399;c.fillRect(s.x+Math.cos(a)*t*28,s.y+Math.sin(a)*t*20,2,2);}}
    c.restore();}}
  drawAmbient(a,s){const g=this.game,moth=a.sprite===52||a.sprite===53,t=g.time+a.phase*5;
    const hop=a.goal?Math.sin(a.travel*Math.PI)*(moth?4:7):0;
    this.sprite('creatures',a.sprite+(Math.floor(t*(moth?5:2))%2?8:0),s.x,s.y-(moth?12:0)-hop,moth?7:a.sprite<50?10:15,{face:a.face||1});
  }
  drawAtmosphere(){const c=this.ctx,g=this.game,b=biomeAt(g.player.x,g.player.y);
    for(let i=0;i<32;i++){
      const x=((hash(i,7)*this.width+g.time*(b==='winter'?8:3))%this.width),y=((hash(i,19)*this.height+g.time*(b==='winter'?9:2))%this.height),phase=Math.sin(g.time*1.4+i*3);
      c.globalAlpha=(b==='winter'?.55:.22)+phase*.12;c.fillStyle=({spring:i%3?'#e2d7a2':'#f3c7cd',autumn:'#e8b77b',winter:'#f6f3dc',ember:'#efb175'})[b];c.fillRect(x|0,y|0,b==='autumn'?2:1,b==='autumn'?2:1);
    }c.globalAlpha=1;
    // Moths gather around lantern orchids and warm-cold interfaces.
    for(const v of g.world.interactables.filter(i=>i.kind==='herb'&&!i.collected&&this.visible(i.x,i.y))){const s=this.screen(v.x,v.y),a=g.time*1.7+v.x;c.fillStyle='#e5dbab';c.fillRect(s.x+Math.sin(a)*12,s.y-12+Math.cos(a*.8)*5,Math.sin(a*9)>0?3:1,1);}
    if(Math.abs(g.player.x-seamX(g.player.y))<250&&g.player.y>1100){for(let i=0;i<12;i++){const wy=1150+i*47,wx=seamX(wy),s=this.screen(wx,wy),t=(g.time*.15+i*.15)%1;c.globalAlpha=(1-t)*.16;this.ellipse(c,s.x+Math.sin(t*6+i)*12,s.y-t*40,15+t*20,5+t*7,'#e4deca');}c.globalAlpha=1;}
  }
  drawMinimap(canvas,large=false){
    if(!this.mini)return;
    const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,g=this.game,labelBoxes=[];
    const view=large?(this.mapView||{zoom:1,x:MIN_X+WIDTH/2,y:MIN_Y+HEIGHT/2}):{zoom:1,x:MIN_X+WIDTH/2,y:MIN_Y+HEIGHT/2};
    const zoom=clamp(view.zoom,1,16),cx=clamp(view.x,MIN_X+WIDTH/zoom/2,MAX_X-WIDTH/zoom/2),cy=clamp(view.y,MIN_Y+HEIGHT/zoom/2,MAX_Y-HEIGHT/zoom/2);
    if(large)this.mapView={zoom,x:cx,y:cy};
    const point=(x,y)=>({x:(x-cx)/WIDTH*w*zoom+w/2,y:(y-cy)/HEIGHT*h*zoom+h/2});
    const visible=p=>p.x>=-10&&p.x<=w+10&&p.y>=-10&&p.y<=h+10;
    c.imageSmoothingEnabled=false;c.clearRect(0,0,w,h);
    c.drawImage(this.mini,((cx-MIN_X)/WIDTH-.5/zoom)*this.mini.width,((cy-MIN_Y)/HEIGHT-.5/zoom)*this.mini.height,this.mini.width/zoom,this.mini.height/zoom,0,0,w,h);
    if(large)for(const camp of ENCOUNTERS){
      const p=point(camp.x,camp.y),done=g.cleared.has(camp.id);if(!visible(p))continue;
      c.fillStyle=done?'#9fc58d':camp.level>g.player.level+1?'#d88c75':'#e5c584';c.beginPath();c.arc(p.x,p.y,camp.elite?5:3,0,Math.PI*2);c.fill();
      c.font='9px Verdana';c.textAlign='center';c.fillText(zoom>=4?`${done?'✓':camp.level} ${camp.name}`:done?'✓':String(camp.level),p.x,p.y-8);
    }
    if(large&&zoom>=2)for(const group of g.world.rootwallGroups||[]){
      if(!group.members.some(c=>!c.dead))continue;
      const site=group.site?group.b:group.a,p=point(site.x,site.y);if(!visible(p))continue;
      c.strokeStyle=group.phase==='holding'?'#d4aa73':'#a8c68c';c.lineWidth=2;c.strokeRect(p.x-5,p.y-3,10,6);
      if(zoom>=4){c.font='10px Georgia';c.textAlign='center';c.fillStyle='#e5d3a6';c.fillText(`${group.name} · ${group.phase}`,p.x,p.y+16);}
    }
    for(const place of PLACES){
      const p=point(place.x,place.y);if(!visible(p))continue;
      c.fillStyle=g.visited.has(place.id)?'#f5ddb0':'#414c3c';c.strokeStyle='#e7d2a0';c.lineWidth=1;c.beginPath();c.moveTo(p.x,p.y-3);c.lineTo(p.x+3,p.y);c.lineTo(p.x,p.y+3);c.lineTo(p.x-3,p.y);c.closePath();c.fill();c.stroke();
      if(large){
        c.font='11px Georgia';c.textAlign='center';const tw=c.measureText(place.name).width+8,lx=clamp(p.x,tw/2+2,w-tw/2-2);
        for(const dy of [17,-10,30]){const box={x:lx-tw/2,y:p.y+dy-11,w:tw,h:14};
          if(box.y<0||box.y+box.h>h-25||labelBoxes.some(b=>box.x<b.x+b.w&&box.x+box.w>b.x&&box.y<b.y+b.h&&box.y+box.h>b.y))continue;
          labelBoxes.push(box);c.lineWidth=3;c.strokeStyle='#23392ec9';c.strokeText(place.name,lx,p.y+dy);c.fillStyle=g.visited.has(place.id)?'#fff0bf':'#d3dcc0';c.fillText(place.name,lx,p.y+dy);break;
        }
      }
    }
    // Markets: a small amber coin wherever you can buy tonics and gear.
    if(large&&zoom>=2)for(const forge of g.world.interactables.filter(i=>i.kind==='forge')){
      const p=point(forge.x,forge.y);if(!visible(p))continue;c.fillStyle='#d8a5ef';c.strokeStyle='#30243a';c.lineWidth=1.5;c.beginPath();c.moveTo(p.x,p.y-6);c.lineTo(p.x+5,p.y);c.lineTo(p.x,p.y+6);c.lineTo(p.x-5,p.y);c.closePath();c.fill();c.stroke();
      if(zoom>=8){c.font='10px Georgia';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#23392ec9';c.strokeText('The Forge',p.x,p.y+18);c.fillStyle='#efcaef';c.fillText('The Forge',p.x,p.y+18);}
    }
    if(large&&zoom>=2)for(const m of g.world.interactables){if(m.kind!=='market')continue;const p=point(m.x,m.y);if(!visible(p))continue;
      c.beginPath();c.arc(p.x,p.y,4.5,0,Math.PI*2);c.fillStyle='#e8b64c';c.strokeStyle='#2a1d08';c.lineWidth=1.5;c.fill();c.stroke();c.fillStyle='#fff0b8';c.fillRect(Math.round(p.x)-1,Math.round(p.y)-2,2,3);
      if(zoom>=8){c.font='10px Georgia';c.textAlign='center';c.textBaseline='alphabetic';c.lineWidth=3;c.strokeStyle='#23392ec9';c.strokeText('Market',p.x,p.y+15);c.fillStyle='#f6dc94';c.fillText('Market',p.x,p.y+15);}}
    if(large){
      // Quest layer: givers ('!' new, '?' hand in) and the tracked quest's route and current goal.
      const list=questList(g),marks=questMarkers(g,list),focus=list.find(q=>q.id===this.questFocus)||null,pulse=(performance.now()/1000)%1;
      const diamond=(x,y,r,fill,glyph)=>{c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r*.8,y);c.lineTo(x,y+r);c.lineTo(x-r*.8,y);c.closePath();c.fillStyle=fill;c.strokeStyle='#2a1d08';c.lineWidth=1.5;c.fill();c.stroke();if(glyph){c.font=`bold ${Math.round(r*1.15)}px Georgia`;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#2a1d08';c.fillText(glyph,x,y+1);c.textBaseline='alphabetic';}};
      if(focus&&focus.state!=='complete'){
        const pts=focus.steps.filter(st=>st.target&&!st.done).map(st=>({...point(st.target.x,st.target.y),st}));
        c.save();c.setLineDash([4,4]);c.strokeStyle='#f3c24fcc';c.lineWidth=2;c.beginPath();const pp=point(g.player.x,g.player.y);c.moveTo(pp.x,pp.y);for(const q of pts)c.lineTo(q.x,q.y);c.stroke();c.restore();
        focus.steps.forEach((st,i)=>{if(!st.target||!st.camp)return;const q=point(st.target.x,st.target.y);if(!visible(q))return;c.beginPath();c.arc(q.x,q.y,7,0,Math.PI*2);c.fillStyle=st.done?'#7fbf6a':'#f3c24f';c.strokeStyle='#2a1d08';c.lineWidth=1.5;c.fill();c.stroke();c.font='bold 9px Verdana';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#2a1d08';c.fillText(st.done?'✓':String(i+1),q.x,q.y+.5);c.textBaseline='alphabetic';});
        const cur=currentStep(focus);
        if(cur?.target){const q=point(cur.target.x,cur.target.y);if(visible(q)){c.save();c.globalAlpha=1-pulse;c.strokeStyle='#ffe58a';c.lineWidth=2.5;c.beginPath();c.arc(q.x,q.y,9+pulse*16,0,Math.PI*2);c.stroke();c.restore();diamond(q.x,q.y,8,'#ffe58a','★');
          const label=cur.targetLabel||focus.title;c.font='bold 11px Georgia';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#23392ee6';c.strokeText(label,q.x,q.y-14);c.fillStyle='#ffe9a6';c.fillText(label,q.x,q.y-14);}}
      }
      const knownOffers=new Set(knownQuests(g,list).filter(q=>q.state==='offered').map(q=>q.giverId));
      for(const [id,mark] of marks.givers){if(mark==='!'&&!knownOffers.has(id))continue;const npc=g.world.interactables.find(i=>i.id===id);if(!npc)continue;const q=point(npc.x,npc.y);if(!visible(q))continue;diamond(q.x,q.y-6,7,mark==='?'?'#ffe78f':'#f3c24f',mark);}
    }
    const p=point(g.player.x,g.player.y);c.fillStyle='#fff3cc';c.strokeStyle='#243d30';c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,large?5:3,0,Math.PI*2);c.fill();c.stroke();
    if(large){c.font='11px Verdana';c.textAlign='left';c.fillStyle='#f1ddac';c.strokeStyle='#23392e';c.lineWidth=3;const caption=`! new quest · ? hand in · ★ current goal · camp level / ✓ cleared · red: dangerous`;c.strokeText(caption,12,h-12);c.fillText(caption,12,h-12);}
    else{c.strokeStyle='#e8d4a780';c.strokeRect((this.camera.x-this.width/2-MIN_X)/WIDTH*w,(this.camera.y-this.height/2-MIN_Y*Y_SCALE)/(HEIGHT*Y_SCALE)*h,this.width/WIDTH*w,this.height/(HEIGHT*Y_SCALE)*h);}
  }
  hitCreature(point){return this.game.creatures.filter(c=>!c.dead&&Math.abs(c.x-point.x)<SPECIES[c.type].size*.45&&point.y*Y_SCALE>c.y*Y_SCALE-SPECIES[c.type].size&&point.y<c.y+12).sort((a,b)=>b.y-a.y)[0];}
  // Market stalls are big: the whole stall (and its sign) is clickable, not just a point at its foot.
  hitInteractable(point){return this.game.world.interactables.filter(i=>{
    if(i.collected)return false;
    if(i.kind==='market')return Math.abs(point.x-i.x)<52&&point.y>i.y-130&&point.y<i.y+22;
    // The shrine's upper silhouette is east of its interaction point. Keep its
    // hit area off the neighboring market canopy; the smith occupies the left
    // side only close to ground level.
    if(i.kind==='forge')return point.y>i.y-180&&point.y<i.y+25&&(point.y<i.y-60?Math.abs(point.x-i.x-13)<56:point.x>i.x-66&&point.x<i.x+70);
    return Math.abs(point.x-i.x)<22&&point.y>i.y-60&&point.y<i.y+18;
  }).sort((a,b)=>b.y-a.y)[0];}
}
