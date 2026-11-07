import { BIOMES, PLACES } from './data.js';
import { MIN_X, MIN_Y, MAX_X, MAX_Y, HOME, random, hash, noise, biomeAt, terrainAt, pathDistance, riverX, waterAt, BRIDGES } from './world.js';
import { inFrontier } from './frontier.js';
const Y_SCALE=.72;
const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const mix=(a,b,t)=>{const ca=a.match(/\w\w/g).map(v=>parseInt(v,16)),cb=b.match(/\w\w/g).map(v=>parseInt(v,16));return '#'+ca.map((c,i)=>Math.round(c+(cb[i]-c)*t).toString(16).padStart(2,'0')).join('');};

// A 36-world-unit feather keeps the seasonal domains distinct. Sample the
// authoritative biome query so curved expansion borders receive the same blend.
export function biomeBlend(x,y){
  const center=biomeAt(x,y),radius=18;
  if([[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]].every(([dx,dy])=>biomeAt(x+dx*radius,y+dy*radius)===center))return {[center]:1};
  const weights={},kernel=[1,4,6,4,1];
  for(let iy=0;iy<5;iy++)for(let ix=0;ix<5;ix++){
    const b=biomeAt(x+(ix-2)*9,y+(iy-2)*9);weights[b]=(weights[b]||0)+kernel[ix]*kernel[iy]/256;
  }
  return weights;
}
const groundPalettes=Object.fromEntries(Object.entries(BIOMES).map(([id,b])=>[id,b.ground]));
const pathPalettes={spring:['#ab986b','#b5a273','#bba87a','#a28d61'],autumn:['#ab986b','#b5a273','#bba87a','#a28d61'],winter:['#a7b8b5','#b2c2bd','#c0cec5'],ember:['#827260','#8f7d65','#96836b']};
const waterPalettes={spring:['#2a5b5a','#326967','#3d7770'],autumn:['#2a5b5a','#326967','#3d7770'],winter:['#7da5b1','#8ab3bc','#9abec3'],ember:['#2a5b5a','#326967','#3d7770']};
function blendedColor(weights,palettes,t){
  const rgb=[0,0,0];
  for(const [id,weight] of Object.entries(weights)){
    const palette=palettes[id],color=palette[Math.min(palette.length-1,Math.floor(t*palette.length))];
    if(weight===1)return color;
    color.match(/\w\w/g).forEach((v,i)=>rgb[i]+=parseInt(v,16)*weight);
  }
  return '#'+rgb.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
}

// Cache only nearby terrain. The expanded map never allocates a world-sized bitmap.
export class TerrainCache{
  constructor(){this.tileSize=384;this.limit=48;this.tiles=new Map();this.bakedCount=0;}
  get(tx,ty){const key=`${tx}:${ty}`;let tile=this.tiles.get(key);if(tile)this.tiles.delete(key);else {tile=this.bakeTile(tx,ty);this.bakedCount++;}this.tiles.set(key,tile);while(this.tiles.size>this.limit)this.tiles.delete(this.tiles.keys().next().value);return tile;}
  draw(c,left,top,width,height){const size=this.tileSize;for(let y=Math.max(Math.floor(MIN_Y*Y_SCALE/size),Math.floor(top/size));y<=Math.min(Math.ceil(MAX_Y*Y_SCALE/size)-1,Math.floor((top+height)/size));y++)for(let x=Math.max(Math.floor(MIN_X/size),Math.floor(left/size));x<=Math.min(Math.ceil(MAX_X/size)-1,Math.floor((left+width)/size));x++)c.drawImage(this.get(x,y),Math.round(x*size-left),Math.round(y*size-top));}
  ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(Math.round(x),Math.round(y),rx,ry,0,0,Math.PI*2);c.fill();}
  bakeTile(tx,ty){
    const size=this.tileSize,x0=tx*size,y0=ty*size/Y_SCALE,x1=x0+size,y1=y0+size/Y_SCALE;
    const canvas=makeCanvas(size,size),c=canvas.getContext('2d'),r=random((7391^Math.imul(tx,73471)^Math.imul(ty,19391))>>>0);c.translate(-x0,-ty*size);
    for(let y=Math.floor(y0/6)*6;y<y1;y+=6)for(let x=Math.floor(x0/6)*6;x<x1;x+=6){
      const t=terrainAt(x,y),weights=biomeBlend(x,y),n=noise(x,y,95)*.7+noise(x+333,y,32)*.3;let col=blendedColor(weights,groundPalettes,n);
      if(t.microhabitat==='burrow-ridges')col=mix(col,'#a19478',.2);
      if(t.microhabitat==='burial-mounds')col=mix(col,'#6c684b',.15);
      if(t.microhabitat==='fog-garden')col=mix(col,'#658573',.18);
      if(t.wet>.67)col=mix(col,t.biome==='spring'?'#314e40':t.biome==='autumn'?'#534837':t.biome==='winter'?'#8caeb8':'#3b4144',.55);
      if(t.path<15+noise(x,y,40)*7)col=blendedColor(weights,pathPalettes,hash(x,y));
      else if(t.path<24)col=mix(col,t.biome==='winter'?'#b8c8c3':'#a29465',.45);
      const riverD=inFrontier(x,y)?Infinity:Math.abs(x-riverX(y));
      if(riverD<41&&!t.bridge)col=t.biome==='winter'?'#d4ded2':'#7d8f69';
      if(t.water)col=blendedColor(weights,waterPalettes,n);
      if(t.lava)col=['#bc643f','#de8250','#ecaa60'][Math.floor(n*3)];
      c.fillStyle=col;c.fillRect(x,Math.floor(y*Y_SCALE),6,Math.ceil(6*Y_SCALE)+1);
    }
    // Fine broken clusters keep broad ground patches readable at a pixel scale.
    for(let i=0;i<size*size/Y_SCALE*.014;i++){
      const x=x0+r()*size,y=y0+r()*size/Y_SCALE,b=biomeAt(x,y),sy=Math.floor(y*Y_SCALE),path=pathDistance(x,y),wet=waterAt(x,y);
      if(wet){if(r()<.24){c.fillStyle=b==='winter'?'#c7dedc':'#669b86';c.globalAlpha=.35;c.fillRect(x,sy,3+r()*8,1);}continue;}
      c.globalAlpha=.24+r()*.24;
      if(path<20){c.fillStyle=b==='winter'?'#7e9b9e':'#665d45';c.fillRect(Math.floor(x),sy,1+r()*3,1);}
      else {c.fillStyle=({spring:r()<.5?'#a3b971':'#244735',autumn:r()<.5?'#edb56b':'#594a36',winter:r()<.5?'#ffffff':'#81a0a9',ember:r()<.5?'#b18a63':'#2b3739'})[b];const size=r()<.9?1:2;c.fillRect(Math.floor(x),sy,size,size);if(r()<.23){c.fillRect(x-1,sy-2,1,2);c.fillRect(x+2,sy-3,1,3);}}
    }c.globalAlpha=1;
    for(let i=0;i<size*size/Y_SCALE*.00067;i++){
      const x=x0+r()*size,y=y0+r()*size/Y_SCALE,b=biomeAt(x,y);if(pathDistance(x,y)<28||waterAt(x,y))continue;
      const patch=noise(x+44,y+10,55);if(patch<.6)continue;const sy=y*Y_SCALE;
      if(b==='spring'||b==='autumn'){c.fillStyle=b==='spring'?'#315139':'#695339';c.fillRect(x,sy-3,1,4);c.fillStyle=b==='spring'?(r()<.6?'#e5b5b1':'#dfd7a0'):(r()<.6?'#dba067':'#dac58b');c.fillRect(x-1,sy-4,3,2);if(r()<.3)c.fillRect(x+2,sy-2,2,2);}
      if(b==='winter'){c.fillStyle='#e3ece5';c.fillRect(x-2,sy,5,1);c.fillRect(x,sy-1,1,3);}
      if(b==='ember'){c.fillStyle='#d99c67';c.globalAlpha=.5;c.fillRect(x,sy,2,1);c.globalAlpha=1;}
    }
    // Village paving, vegetable beds, fence rails, bridges, foot-worn stone circles.
    this.ellipse(c,HOME.x,HOME.y*Y_SCALE,85,46,'#9c9470');
    const villageRandom=random(412);
    for(let i=0;i<340;i++){const x=HOME.x+(villageRandom()-.5)*164,y=HOME.y*Y_SCALE+(villageRandom()-.5)*86;if(Math.hypot((x-HOME.x)/85,(y-HOME.y*Y_SCALE)/46)<1){c.fillStyle=['#aea280','#b9af8a','#8c8868','#a59b7a'][i%4];c.fillRect(x|0,y|0,3+r()*6,2+r()*3);}}
    for(const bridge of BRIDGES){const bx=bridge.x,sy=bridge.y*Y_SCALE,w=bridge.width,h=bridge.depth*Y_SCALE;c.fillStyle='#4e4935';c.fillRect(bx-w/2,sy-h/2,w,h);for(let i=0;i<w/8;i++){c.fillStyle=i%2?'#b39a6a':'#a58b60';c.fillRect(bx-w/2+2+i*8,sy-h/2+2,6,h-4);}c.fillStyle='#6e5b3d';c.fillRect(bx-w/2-2,sy-h/2-2,w+4,3);c.fillRect(bx-w/2-2,sy+h/2-1,w+4,3);}

    for(let row=0;row<4;row++)for(let col=0;col<8;col++){const x=1240+col*9,y=757+row*8;c.fillStyle='#4b4733';c.fillRect(x,y*Y_SCALE,7,4);c.fillStyle=col%3?'#9eb676':'#d79b6c';c.fillRect(x+2,y*Y_SCALE-3,3,4);}
    for(const place of PLACES.filter(p=>p.id!=='village')){c.strokeStyle='#b7aa79';c.globalAlpha=.25;c.beginPath();c.ellipse(place.x,place.y*Y_SCALE,38,19,0,0,Math.PI*2);c.stroke();c.globalAlpha=1;}
    return canvas;
  }
}
