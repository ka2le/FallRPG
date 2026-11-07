export const MAX_TAP_MS=250;

// The bottom third starts a joystick immediately. Once it has moved, that
// gesture owns movement until every finger is lifted; extra fingers cannot zoom.
export class WorldTouchControls {
  constructor(canvas,{enabled,tap,getZoom,setZoom,startMove=()=>{},now=()=>performance.now()}){
    Object.assign(this,{canvas,enabled,tap,getZoom,setZoom,startMove,now});
    this.points=new Map();this.movement={x:0,y:0};this.mode='idle';this.usedJoystick=false;
    canvas.addEventListener('pointerdown',e=>this.start(e));
    canvas.addEventListener('pointermove',e=>this.move(e));
    for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>this.end(e));
    for(const type of ['blur','resize'])window.addEventListener(type,()=>this.reset());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.reset();});
  }
  stopMovement(){this.movement.x=this.movement.y=0;}
  start(e){
    if(e.pointerType!=='touch'||!this.enabled())return;
    e.preventDefault();this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});this.canvas.setPointerCapture(e.pointerId);
    if(this.points.size===1){
      const rect=this.canvas.getBoundingClientRect();
      this.mode=e.clientY>=rect.top+rect.height*2/3?'joystick':'pending';
      this.origin={id:e.pointerId,x:e.clientX,y:e.clientY,time:this.now(),travel:0};this.usedJoystick=false;
      if(this.mode==='joystick')this.startMove();
    }else if(!this.usedJoystick&&this.mode!=='pinch'&&this.mode!=='blocked'){
      this.stopMovement();this.mode='pinch';
      const ids=[...this.points.keys()].slice(0,2),[a,b]=ids.map(id=>this.points.get(id));
      this.pinch={ids,distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom:this.getZoom()};
    }
  }
  updateMovement(point){
    const dx=point.x-this.origin.x,dy=point.y-this.origin.y,distance=Math.hypot(dx,dy);
    const strength=Math.min(1,Math.max(0,(distance-8)/48));
    this.movement.x=distance?dx/distance*strength:0;this.movement.y=distance?dy/distance*strength:0;
    if(strength>0)this.usedJoystick=true;
  }
  move(e){
    if(!this.points.has(e.pointerId))return;
    if(!this.enabled()){this.reset();return;}
    e.preventDefault();const point={x:e.clientX,y:e.clientY};this.points.set(e.pointerId,point);
    if((this.mode==='pending'||this.mode==='joystick')&&e.pointerId===this.origin.id)this.origin.travel=Math.max(this.origin.travel,Math.hypot(point.x-this.origin.x,point.y-this.origin.y));
    if(this.mode==='joystick'&&e.pointerId===this.origin.id)this.updateMovement(point);
    if(this.mode==='pinch'){
      const [a,b]=this.pinch.ids.map(id=>this.points.get(id));
      this.setZoom(this.pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/this.pinch.distance);
    }
  }
  end(e){
    if(!this.points.has(e.pointerId))return;
    const isOrigin=e.pointerId===this.origin?.id;
    const isTap=e.type==='pointerup'&&isOrigin&&this.points.size===1&&(this.mode==='pending'||this.mode==='joystick')&&!this.usedJoystick&&this.origin.travel<=12&&Math.hypot(e.clientX-this.origin.x,e.clientY-this.origin.y)<=12&&this.now()-this.origin.time<MAX_TAP_MS&&this.enabled();
    this.points.delete(e.pointerId);
    if((this.mode==='pinch'&&this.pinch.ids.includes(e.pointerId))||((this.mode==='joystick'||this.mode==='pending')&&isOrigin)){
      this.stopMovement();this.mode=this.points.size?'blocked':'idle';this.origin=this.pinch=null;
    }
    if(!this.points.size){this.stopMovement();this.mode='idle';this.origin=this.pinch=null;this.usedJoystick=false;}
    if(isTap)this.tap(e.clientX,e.clientY);
  }
  reset(){
    const ids=[...this.points.keys()];this.points.clear();this.stopMovement();this.mode='idle';this.origin=this.pinch=null;this.usedJoystick=false;
    for(const id of ids)if(this.canvas.hasPointerCapture(id))this.canvas.releasePointerCapture(id);
  }
}
