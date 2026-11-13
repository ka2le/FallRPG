import test from 'node:test';
import assert from 'node:assert/strict';
import {WorldTouchControls,MAX_TAP_MS} from '../src/touch-controls.js';

function setup(){
  globalThis.window=new EventTarget();globalThis.document=new EventTarget();
  const canvas=new EventTarget(),captured=new Set(),taps=[];let time=0,zoom=1.5,enabled=true,starts=0;
  Object.assign(canvas,{getBoundingClientRect:()=>({top:0,height:900}),setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),releasePointerCapture:id=>captured.delete(id)});
  const controls=new WorldTouchControls(canvas,{enabled:()=>enabled,tap:(...point)=>taps.push(point),getZoom:()=>zoom,setZoom:value=>zoom=value,startMove:()=>starts++,now:()=>time});
  const send=(type,id,x,y,pointerType='touch')=>{const event=new Event(type,{cancelable:true});Object.assign(event,{pointerId:id,clientX:x,clientY:y,pointerType});canvas.dispatchEvent(event);};
  return {controls,send,taps,captured,advance:ms=>time+=ms,get zoom(){return zoom;},get starts(){return starts;},disable:()=>enabled=false};
}

test('the bottom-third joystick responds immediately without waiting, and remains analog and bounded',()=>{
  for(const [x,y] of [[40,600],[260,700],[80,830]]){
    const s=setup();s.send('pointerdown',1,x,y);assert.equal(s.starts,1);
    s.send('pointermove',1,x+32,y);assert.equal(s.controls.movement.x,.5);
    s.send('pointermove',1,x+100,y-100);assert.ok(Math.abs(Math.hypot(...Object.values(s.controls.movement))-1)<1e-9);
    s.send('pointerup',1,x+100,y-100);assert.deepEqual(s.controls.movement,{x:0,y:0});assert.deepEqual(s.taps,[]);
  }
});

test('upper-screen drags never move, and short taps still interact in either region',()=>{
  for(const y of [120,599,700]){
    const s=setup();s.send('pointerdown',1,80,y);s.send('pointerup',1,80,y);assert.deepEqual(s.taps,[[80,y]]);
    if(y<600){s.send('pointerdown',2,80,y);s.advance(1000);s.send('pointermove',2,130,750);assert.equal(s.starts,0);assert.deepEqual(s.controls.movement,{x:0,y:0});s.send('pointerup',2,130,750);assert.equal(s.taps.length,1);}
  }
  const s=setup();s.send('pointerdown',1,80,700);s.advance(MAX_TAP_MS);s.send('pointerup',1,80,700);assert.deepEqual(s.taps,[]);
});

test('extra fingers cannot zoom, steal or stop a joystick that has moved',()=>{
  const s=setup();s.send('pointerdown',1,80,700);s.send('pointermove',1,136,700);
  s.send('pointerdown',2,250,300);s.send('pointermove',2,350,300);assert.equal(s.zoom,1.5);assert.equal(s.controls.movement.x,1);
  s.send('pointerup',2,350,300);assert.equal(s.controls.movement.x,1);
  // Returning to the centre must not unlock pinch zoom within this gesture.
  s.send('pointermove',1,80,700);s.send('pointerdown',3,250,300);s.send('pointermove',3,350,300);assert.equal(s.zoom,1.5);
  s.send('pointerup',1,80,700);s.send('pointermove',3,300,300);assert.deepEqual(s.controls.movement,{x:0,y:0});assert.equal(s.zoom,1.5);
  s.send('pointerdown',4,50,650);s.send('pointermove',4,100,650);assert.equal(s.zoom,1.5);assert.deepEqual(s.controls.movement,{x:0,y:0});
  s.send('pointerup',3,300,300);s.send('pointerup',4,100,650);assert.deepEqual(s.taps,[]);assert.equal(s.controls.mode,'idle');
  s.send('pointerdown',5,80,300);s.send('pointerdown',6,250,300);s.send('pointermove',6,350,300);assert.ok(s.zoom>1.5);
});

test('fresh pinches can start in either region before joystick movement, and never turn into a tap or joystick',()=>{
  for(const y of [300,700]){
    const s=setup();s.send('pointerdown',1,100,y);s.send('pointermove',1,104,y);s.send('pointerdown',2,250,300);
    assert.equal(s.controls.mode,'pinch');s.send('pointermove',2,350,300);assert.ok(s.zoom>1.5);
    s.send('pointerdown',3,370,400);s.send('pointerup',3,370,400);assert.equal(s.controls.mode,'pinch');
    s.send('pointerup',1,104,y);s.send('pointermove',2,300,700);assert.deepEqual(s.controls.movement,{x:0,y:0});
    s.send('pointerup',2,300,700);assert.deepEqual(s.taps,[]);assert.equal(s.controls.mode,'idle');
  }
});

test('cancel, capture loss, resize, blur, visibility changes and pause clear movement and its gesture lock',()=>{
  for(const action of ['pointercancel','lostpointercapture','resize','blur','pause','hidden']){
    const s=setup();s.send('pointerdown',1,80,700);s.send('pointermove',1,140,700);
    if(action==='pause'){s.disable();s.send('pointermove',1,150,700);}
    else if(action==='hidden'){document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));}
    else if(['resize','blur'].includes(action))window.dispatchEvent(new Event(action));
    else s.send(action,1,140,700);
    assert.deepEqual(s.controls.movement,{x:0,y:0});s.send('pointerup',1,140,700);assert.deepEqual(s.taps,[]);assert.equal(s.controls.usedJoystick,false);
  }
  const s=setup();s.send('pointerdown',1,80,700);s.controls.reset();assert.equal(s.captured.size,0);
  s.send('pointerdown',2,80,700,'mouse');assert.equal(s.starts,1);
});
