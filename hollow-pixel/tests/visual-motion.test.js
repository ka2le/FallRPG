import test from 'node:test';
import assert from 'node:assert/strict';
import { Renderer, Y_SCALE } from '../src/render.js';
import { biomeBlend } from '../src/terrain.js';
import { updateAmbient } from '../src/ambient.js';
import { biomeAt, seamX, seasonY, canWalk, dist } from '../src/world.js';

test('world zoom is bounded and keeps the camera and touch coordinate mapping consistent',()=>{
  const canvas={style:{},parentElement:{getBoundingClientRect:()=>({width:391,height:845})}};
  canvas.getBoundingClientRect=()=>({left:0,top:0,width:parseFloat(canvas.style.width),height:parseFloat(canvas.style.height)});
  const renderer=Object.assign(Object.create(Renderer.prototype),{canvas,ctx:{},zoom:2,camera:{x:1080,y:615}});
  for(const zoom of [1.5,2.5,100,.1]){
    renderer.setZoom(zoom);assert.ok(renderer.zoom>=1&&renderer.zoom<=4);assert.deepEqual(renderer.camera,{x:1080,y:615});
    const point={x:1120,y:850},screen=renderer.screen(point.x,point.y),r=canvas.getBoundingClientRect();
    const mapped=renderer.world(screen.x/renderer.width*r.width,screen.y/renderer.height*r.height);
    assert.ok(Math.abs(mapped.x-point.x)<1);assert.ok(Math.abs(mapped.y-point.y)<1);
    assert.equal(renderer.ctx.imageSmoothingEnabled,false);
  }
  const zoom=renderer.zoom;renderer.setZoom(NaN);assert.equal(renderer.zoom,zoom);
});

test('scenery keeps its pixel spacing and ground alignment during vertical and diagonal camera motion',()=>{
  const renderer=Object.assign(Object.create(Renderer.prototype),{width:721,height:451,camera:{x:1080,y:615}});
  const points=[[814.2,510.4],[880.8,575.2],[1090,855]],base=points.map(([x,y])=>renderer.screen(x,y));
  for(let n=0;n<60;n++){
    renderer.camera={x:1080+n*.19,y:615+n*.13};
    const now=points.map(([x,y])=>renderer.screen(x,y));
    for(let i=0;i<points.length;i++){
      assert.equal(now[i].x-now[0].x,base[i].x-base[0].x);
      assert.equal(now[i].y-now[0].y,base[i].y-base[0].y);
      assert.equal(now[i].x+renderer.left,Math.round(points[i][0]));
      assert.equal(now[i].y+renderer.top,Math.round(points[i][1]*Y_SCALE));
    }
  }
});

test('biome feather is narrow, normalized and follows legacy and expanded margins',()=>{
  for(const [x,y] of [[seamX(600),600],[800,seasonY(800)],[3000,2300]]){
    const weights=biomeBlend(x,y);
    assert.ok(Object.keys(weights).length>1,`${x},${y}`);
    assert.equal(Object.values(weights).reduce((a,b)=>a+b,0),1);
  }
  for(const [x,y] of [[800,500],[1800,500],[800,1400],[1800,1400]])assert.deepEqual(biomeBlend(x,y),{[biomeAt(x,y)]:1});
});

test('tiny wildlife commits to a clear destination, signals it, and travels forward without threshold snaps',()=>{
  const a={x:1100,y:855,sprite:51,phase:0,nextMove:0},world={props:[],ambient:[a]},player={x:1070,y:855};
  updateAmbient(world,player,0,.05);
  const destination={...a.destination};assert.ok(destination.x>a.x);assert.ok(canWalk(world,destination.x,destination.y,2));
  const origin={x:a.x,y:a.y};
  for(let n=1;n<=10;n++){
    player.x=n%2?1000:1090;updateAmbient(world,player,n*.05,.05);
    assert.deepEqual(a.destination,destination);assert.equal(a.x,origin.x);assert.equal(a.y,origin.y);
  }
  let previous=0;
  for(let n=11;n<=20;n++){
    updateAmbient(world,player,n*.05,.05);
    const progress=dist(a,origin);assert.ok(progress>=previous);previous=progress;
  }
  assert.equal(a.x,destination.x);assert.equal(a.y,destination.y);assert.equal(a.goal,null);
  updateAmbient(world,player,1.1,.05);assert.equal(a.x,destination.x);
});

test('tiny wildlife refuses destinations through a solid tree',()=>{
  const a={x:1100,y:855,sprite:51,phase:0,nextMove:0},world={props:[{x:1130,y:855,solid:18}],ambient:[a]};
  updateAmbient(world,{x:1070,y:855},0,.05);
  assert.ok(!a.destination||Math.abs(a.destination.y-855)>18);
});

test('successive insect hops follow a route when the player changes sides',()=>{
  const a={x:900,y:600,sprite:51,phase:0,nextMove:0},world={props:[],ambient:[a]},player={x:870,y:600};
  updateAmbient(world,player,0,.05);const first={...a.destination};
  for(let n=1;n<=20;n++)updateAmbient(world,player,n*.05,.05);
  player.x=a.x+30;updateAmbient(world,player,4,.05);
  assert.ok(a.destination.x>first.x,'the next hop continues toward the chosen route');
  assert.equal(a.destination.y,first.y);
});
