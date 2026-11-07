import test from 'node:test';
import assert from 'node:assert/strict';
import {WorldTouchControls,HOLD_MS} from '../src/touch-controls.js';

function setup(){
  globalThis.window=new EventTarget();globalThis.document=new EventTarget();
  const canvas=new EventTarget(),captured=new Set(),timers=new Map(),taps=[];let time=0,nextId=0,zoom=1.5,enabled=true,starts=0;
  Object.assign(canvas,{setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),releasePointerCapture:id=>captured.delete(id)});
  const controls=new WorldTouchControls(canvas,{enabled:()=>enabled,tap:(...point)=>taps.push(point),getZoom:()=>zoom,setZoom:value=>zoom=value,startMove:()=>starts++,now:()=>time,schedule:(fn,delay)=>{timers.set(++nextId,{fn,time:time+delay});return nextId;},cancel:id=>timers.delete(id)});
  const send=(type,id,x,y,pointerType='touch')=>{const event=new Event(type,{cancelable:true});Object.assign(event,{pointerId:id,clientX:x,clientY:y,pointerType});canvas.dispatchEvent(event);};
  const advance=ms=>{time+=ms;for(const [id,timer] of timers)if(timer.time<=time){timers.delete(id);timer.fn();}};
  return {controls,send,advance,taps,captured,timers,get zoom(){return zoom;},get starts(){return starts;},disable:()=>enabled=false};
}

test('quick taps act once on release, while a hold anywhere becomes one analog joystick',()=>{
  for(const [x,y] of [[40,130],[260,450],[80,730]]){
    const s=setup();s.send('pointerdown',1,x,y);s.advance(HOLD_MS-1);assert.deepEqual(s.taps,[]);s.send('pointerup',1,x,y);assert.deepEqual(s.taps,[[x,y]]);
    s.send('pointerdown',2,x,y);s.send('pointermove',2,x+32,y);assert.equal(s.controls.movement.x,0);s.advance(HOLD_MS);
    assert.equal(s.starts,1);assert.equal(s.controls.movement.x,.5);s.send('pointermove',2,x+100,y+100);assert.ok(Math.abs(Math.hypot(...Object.values(s.controls.movement))-1)<1e-9);
    s.send('pointerup',2,x+100,y+100);assert.deepEqual(s.controls.movement,{x:0,y:0});assert.equal(s.taps.length,1);
  }
});

test('a second finger turns pending or active movement into pinch zoom, never a second joystick',()=>{
  for(const held of [false,true]){
    const s=setup();s.send('pointerdown',1,100,300);if(held){s.advance(HOLD_MS);s.send('pointermove',1,150,300);assert.ok(s.controls.movement.x>0);}
    s.send('pointerdown',2,250,300);assert.deepEqual(s.controls.movement,{x:0,y:0});assert.equal(s.timers.size,0);
    s.send('pointermove',2,350,300);assert.ok(s.zoom>1.5);s.send('pointerdown',3,370,400);s.send('pointerup',3,370,400);assert.equal(s.controls.mode,'pinch');
    s.send('pointerup',1,100,300);s.advance(1000);s.send('pointermove',2,300,300);assert.deepEqual(s.controls.movement,{x:0,y:0});
    s.send('pointerup',2,300,300);assert.deepEqual(s.taps,[]);assert.equal(s.controls.mode,'idle');
  }
});

test('cancel, capture loss, resize, blur and pause clear held controls without tapping',()=>{
  for(const action of ['pointercancel','lostpointercapture','resize','blur','pause','hidden']){
    const s=setup();s.send('pointerdown',1,80,300);s.advance(HOLD_MS);s.send('pointermove',1,140,300);
    if(action==='pause'){s.disable();s.send('pointermove',1,150,300);}
    else if(action==='hidden'){document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));}
    else if(['resize','blur'].includes(action))window.dispatchEvent(new Event(action));
    else s.send(action,1,140,300);
    assert.deepEqual(s.controls.movement,{x:0,y:0});s.send('pointerup',1,140,300);s.advance(1000);assert.deepEqual(s.taps,[]);assert.equal(s.timers.size,0);
  }
});

test('a cancelled pending hold, a quick swipe, and mouse input cannot create a tap or stuck joystick',()=>{
  const s=setup();s.send('pointerdown',1,80,300);s.controls.reset();s.advance(HOLD_MS);assert.equal(s.starts,0);assert.equal(s.captured.size,0);
  s.send('pointerdown',2,80,300);s.send('pointermove',2,120,300);s.send('pointermove',2,80,300);s.send('pointerup',2,80,300);assert.deepEqual(s.taps,[]);
  s.send('pointerdown',3,80,300,'mouse');s.advance(HOLD_MS);assert.equal(s.starts,0);
});
