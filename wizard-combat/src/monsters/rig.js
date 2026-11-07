// Paper-doll rigs: one SVG drawing split into parts, each part on its own pivot.
// The same definition drives the in-world billboard (textured planes) and live SVG
// portraits (bestiary, target frame), so art and animation are authored once.
//
// Definition format (see seedling.js for a fully commented example):
//   view   [w,h] SVG units; ground = y of the feet line; height = metres the view spans
//   defs   shared <defs> markup (gradients, filters)
//   parts  back-to-front list of {id, parent?, pivot:[x,y], svg, glow?, pad?}
//   animate(pose, state) sets pose[id] = {x,y,r,sx,sy,o} offsets from the rest drawing
import * as THREE from 'three';

const NS='http://www.w3.org/2000/svg',DEG=Math.PI/180;
export const STATE=()=>({t:0,move:0,phase:0,windup:0,attack:0,hurt:0,stun:0,root:0,slow:0,dodge:0,dead:0,seed:0,heal:0,thaw:0,quench:0,grounded:0});
export function restPose(def){const pose={};for(const p of def.parts)pose[p.id]={x:0,y:0,r:0,sx:1,sy:1,o:1};return pose;}
export function resetPose(pose){for(const k in pose){const q=pose[k];q.x=q.y=q.r=0;q.sx=q.sy=q.o=1;}return pose;}
export function evaluate(def,state,pose=restPose(def)){resetPose(pose);def.animate(pose,state);return pose;}

// Mirror helper for symmetric parts: right side = left side flipped around x=cx.
export const mirror=(svg,cx=256)=>`<g transform="translate(${cx*2} 0) scale(-1 1)">${svg}</g>`;
// Small easing helpers shared by species animations.
export const ease={
  out:t=>1-(1-t)*(1-t),in:t=>t*t,inOut:t=>t<.5?2*t*t:1-2*(1-t)*(1-t),
  pulse:(t,a=.5)=>t<=0?0:t<a?t/a:Math.max(0,1-(t-a)/(1-a)),
  blink:(t,every=3.7,len=.13)=>{const k=t%every;return k<len?Math.sin(k/len*Math.PI):0;},
};

const chainOf=(def,part)=>{const chain=[];let p=part;while(p){chain.unshift(p);p=p.parent?def.byId[p.parent]:null;}return chain;};
function index(def){if(!def.byId){def.byId={};for(const p of def.parts)def.byId[p.id]=p;}return def;}
const transform=(p,q)=>`translate(${p.pivot[0]+q.x} ${p.pivot[1]+q.y}) rotate(${q.r}) scale(${q.sx} ${q.sy}) translate(${-p.pivot[0]} ${-p.pivot[1]})`;

// ---------- SVG (DOM) ----------
export function svgMarkup(def,pose=restPose(def),attrs=''){
  index(def);let body='';
  for(const p of def.parts){if(!p.svg)continue;const chain=chainOf(def,p);
    body+=chain.map(a=>`<g transform="${transform(a,pose[a.id])}"${a===p&&pose[p.id].o!==1?` opacity="${pose[p.id].o}"`:''}>`).join('')+p.svg+'</g>'.repeat(chain.length);}
  return `<svg xmlns="${NS}" viewBox="0 0 ${def.view[0]} ${def.view[1]}" ${attrs}><defs>${def.defs}</defs>${body}</svg>`;
}
// Live SVG: build once, then update transforms per frame. Returns {svg, update(state)}.
export function mountSvg(def,host,attrs='class="monster-art"'){
  index(def);host.innerHTML=svgMarkup(def,restPose(def),attrs);const svg=host.querySelector('svg'),groups=[];
  let n=0;const top=[...svg.children].filter(c=>c.tagName==='g');
  for(const p of def.parts){if(!p.svg)continue;const chain=chainOf(def,p);let g=top[n++];for(const a of chain){groups.push([g,a,a===p]);if(a!==p)g=g.firstElementChild;}}
  const pose=restPose(def);
  return {svg,pose,update(state){evaluate(def,state,pose);for(const [g,a,own] of groups){const q=pose[a.id];g.setAttribute('transform',transform(a,q));if(own)g.setAttribute('opacity',q.o);}}};
}

// ---------- Textures (rasterised once per species, shared by every instance) ----------
const prepared=new WeakMap();
export function prepare(def,res=2){
  index(def);if(prepared.has(def))return prepared.get(def);
  const host=document.createElementNS(NS,'svg');host.setAttribute('style','position:absolute;left:-9999px;top:0;width:10px;height:10px;visibility:hidden');
  host.innerHTML=`<defs>${def.defs}</defs>`+def.parts.map(p=>`<g>${p.svg||''}</g>`).join('');document.body.append(host);
  const groups=[...host.children].filter(c=>c.tagName==='g'),out={};
  def.parts.forEach((p,i)=>{
    if(!p.svg){out[p.id]=null;return;}
    const b=groups[i].getBBox(),pad=p.pad??6,box=[b.x-pad,b.y-pad,b.width+pad*2,b.height+pad*2];
    const scale=Math.min(res,1024/Math.max(box[2],box[3])),w=Math.max(2,Math.ceil(box[2]*scale)),h=Math.max(2,Math.ceil(box[3]*scale));
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.premultiplyAlpha=true;tex.anisotropy=4;
    const img=new Image(),src=`<svg xmlns="${NS}" width="${w}" height="${h}" viewBox="${box.join(' ')}"><defs>${def.defs}</defs>${p.svg}</svg>`;
    img.onload=()=>{canvas.getContext('2d').drawImage(img,0,0,w,h);tex.needsUpdate=true;};img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(src);
    out[p.id]={tex,box};
  });
  host.remove();prepared.set(def,out);return out;
}

// Whole creature in its rest pose as one texture: the cheap far-distance stand-in.
const fullTextures=new WeakMap();
function fullTexture(def,px=320){if(fullTextures.has(def))return fullTextures.get(def);const canvas=document.createElement('canvas');canvas.width=canvas.height=px;
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.premultiplyAlpha=true;const img=new Image();
  img.onload=()=>{canvas.getContext('2d').drawImage(img,0,0,px,px);tex.needsUpdate=true;};img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svgMarkup(def,restPose(def),`width="${px}" height="${px}"`));
  fullTextures.set(def,tex);return tex;}

// ---------- Three.js rig ----------
// Every part is a textured plane. Pivots are plain Object3Ds (a THREE.Group would reset the
// render group). The owning THREE.Group's renderOrder sorts whole monsters by distance and
// each plane's renderOrder keeps the painter's order inside one monster.
const premultiplied={blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor};
const additive={blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor};
export function createRig(def,size){
  index(def);const tex=prepare(def),root=new THREE.Object3D(),k=size*(def.scale||1)/def.view[1];
  root.scale.set(k,k,k);root.position.y=-size/2;
  const nodes={},parts=[],cx=def.view[0]/2;
  // Two passes: draw order (list order) is independent of the parent hierarchy.
  for(const p of def.parts)nodes[p.id]={node:new THREE.Object3D()};
  def.parts.forEach((p,order)=>{
    const node=nodes[p.id].node,pp=p.parent?def.byId[p.parent].pivot:[cx,def.ground];
    const rest={x:p.pivot[0]-pp[0],y:pp[1]-p.pivot[1]};node.position.set(rest.x,rest.y,0);(p.parent?nodes[p.parent].node:root).add(node);
    let mesh=null;const t=tex[p.id];
    if(t){const [bx,by,bw,bh]=t.box;
      const mat=new THREE.MeshBasicMaterial({map:t.tex,transparent:true,depthWrite:!p.glow,alphaTest:p.glow?0:.04,side:THREE.DoubleSide,...(p.glow?additive:premultiplied)});
      mesh=new THREE.Mesh(new THREE.PlaneGeometry(bw,bh),mat);mesh.position.set(bx+bw/2-p.pivot[0],p.pivot[1]-(by+bh/2),order*.35);mesh.renderOrder=order;node.add(mesh);}
    Object.assign(nodes[p.id],{rest,mesh,glow:!!p.glow});parts.push(nodes[p.id]);
  });
  // Far LOD: one plane with the rest pose, swapped in by setLod().
  const [vw,vh]=def.view,lod=new THREE.Mesh(new THREE.PlaneGeometry(vw*k,vh*k),new THREE.MeshBasicMaterial({map:fullTexture(def),transparent:true,depthWrite:true,alphaTest:.04,side:THREE.DoubleSide,...premultiplied}));
  lod.position.y=-size/2+(def.ground-vh/2)*k;lod.visible=false;
  return {def,root,lod,far:false,nodes,parts,pose:restPose(def),size};
}
const tmp=new THREE.Color();
// tint: THREE.Color multiplier (may exceed 1 for hit flashes); alpha: whole-monster fade.
export function setLod(rig,far){if(rig.far===far)return;rig.far=far;rig.root.visible=!far;rig.lod.visible=far;}
export function poseRig(rig,state,tint,alpha=1){
  if(rig.far){tmp.copy(tint).multiplyScalar(alpha);rig.lod.material.color.copy(tmp);rig.lod.material.opacity=alpha;return;}
  const {def,nodes,pose}=rig;evaluate(def,state,pose);
  for(const p of def.parts){const n=nodes[p.id],q=pose[p.id];
    n.node.position.set(n.rest.x+q.x,n.rest.y-q.y,0);n.node.rotation.z=-q.r*DEG;n.node.scale.set(q.sx,q.sy,1);
    if(n.mesh){const o=Math.max(0,Math.min(1,q.o*alpha));n.mesh.visible=o>.01;
      // Premultiplied blending: fade colour together with alpha.
      tmp.copy(n.glow?WHITE:tint).multiplyScalar(o);n.mesh.material.color.copy(tmp);n.mesh.material.opacity=o;}
  }
}
const WHITE=new THREE.Color(1,1,1);
export function disposeRig(rig){for(const n of rig.parts)if(n.mesh){n.mesh.geometry.dispose();n.mesh.material.dispose();}rig.lod.geometry.dispose();rig.lod.material.dispose();}
