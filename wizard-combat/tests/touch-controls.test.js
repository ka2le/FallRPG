import test from 'node:test';
import assert from 'node:assert/strict';
import {TouchControls} from '../src/touch-controls.js';

function setup(){
  const resize=new EventTarget();globalThis.window=resize;
  const canvas=new EventTarget(),captured=new Set(),looks=[];let playing=true;
  Object.assign(canvas,{getBoundingClientRect:()=>({top:0,height:900}),setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),releasePointerCapture:id=>captured.delete(id)});
  const input=new TouchControls(canvas,{enabled:()=>playing,look:(...delta)=>looks.push(delta)});
  const send=(type,id,x,y,pointerType='touch')=>{const e=new Event(type,{cancelable:true});Object.assign(e,{pointerId:id,clientX:x,clientY:y,pointerType});canvas.dispatchEvent(e);return e;};
  return {input,send,looks,resize,captured,pause:()=>playing=false};
}

test('bottom-third joystick is analog, bounded, and anchored wherever a touch begins',()=>{
  for(const origin of [60,450,840]){
    const {input,send}=setup();send('pointerdown',1,origin,750);
    send('pointermove',1,origin+4,750);assert.deepEqual(input.movement,{x:0,z:0});
    send('pointermove',1,origin+32,750);assert.equal(input.movement.x,.5);
    send('pointermove',1,origin+200,550);assert.ok(Math.abs(Math.hypot(input.movement.x,input.movement.z)-1)<1e-10);
    assert.ok(input.movement.z<0);send('pointerup',1,origin,750);assert.deepEqual(input.movement,{x:0,z:0});
  }
});

test('two fingers move and look independently, keeping their roles across the split',()=>{
  const {input,send,looks}=setup();send('pointerdown',1,100,750);send('pointermove',1,100,690);
  send('pointerdown',2,400,300);send('pointermove',2,430,330);send('pointermove',2,440,650);
  assert.deepEqual(looks,[[30,30],[10,320]]);assert.equal(input.movement.z,-1);
  send('pointerup',2,440,650);assert.equal(input.movement.z,-1);
  send('pointercancel',1,100,690);assert.deepEqual(input.movement,{x:0,z:0});
});

test('extra fingers cannot steal a joystick and mouse input is ignored',()=>{
  const {input,send,looks}=setup();send('pointerdown',1,100,750);send('pointerdown',2,600,750);send('pointermove',2,650,700);
  assert.deepEqual(input.movement,{x:0,z:0});send('pointerdown',3,400,300,'mouse');send('pointermove',3,500,350,'mouse');assert.deepEqual(looks,[]);
  send('lostpointercapture',1,100,750);assert.equal(input.moveTouch,null);
});

test('pause and orientation changes clear gestures and release capture',()=>{
  const {input,send,resize,captured,pause}=setup();send('pointerdown',1,100,750);send('pointermove',1,160,750);send('pointerdown',2,400,300);
  resize.dispatchEvent(new Event('resize'));assert.deepEqual(input.movement,{x:0,z:0});assert.equal(captured.size,0);
  send('pointerdown',1,100,750);send('pointermove',1,160,750);pause();send('pointermove',1,180,750);
  assert.deepEqual(input.movement,{x:0,z:0});assert.equal(captured.size,0);send('pointerdown',2,400,300);assert.equal(input.lookTouch,null);
});
