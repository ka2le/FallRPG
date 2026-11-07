export const HOLD_MS=250;

// Touch roles stay fixed until every finger is lifted. A pinch consumes the
// whole gesture, so lifting one finger cannot turn it into a tap or a joystick.
export class WorldTouchControls {
  constructor(canvas,{enabled,tap,getZoom,setZoom,startMove=()=>{},schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id),now=()=>performance.now()}){
    Object.assign(this,{canvas,enabled,tap,getZoom,setZoom,startMove,schedule,cancel,now});
    this.points=new Map();this.movement={x:0,y:0};this.mode='idle';
    canvas.addEventListener('pointerdown',e=>this.start(e));
    canvas.addEventListener('pointermove',e=>this.move(e));
    for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>this.end(e));
    for(const type of ['blur','resize'])window.addEventListener(type,()=>this.reset());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.reset();});
  }
  clearHold(){if(this.timer!==undefined)this.cancel(this.timer);this.timer=undefined;}
  stopMovement(){this.movement.x=this.movement.y=0;}
  start(e){
    if(e.pointerType!=='touch'||!this.enabled())return;
    e.preventDefault();this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});this.canvas.setPointerCapture(e.pointerId);
    if(this.points.size===1){
      this.mode='pending';this.origin={id:e.pointerId,x:e.clientX,y:e.clientY,time:this.now(),travel:0};
      this.timer=this.schedule(()=>{
        this.timer=undefined;
        if(!this.enabled()){this.reset();return;}
        if(this.mode!=='pending'||this.points.size!==1)return;
        this.mode='joystick';this.startMove();this.updateMovement(this.points.get(this.origin.id));
      },HOLD_MS);
    }else if(this.mode!=='pinch'&&this.mode!=='blocked'){
      this.clearHold();this.stopMovement();this.mode='pinch';
      const ids=[...this.points.keys()].slice(0,2),[a,b]=ids.map(id=>this.points.get(id));
      this.pinch={ids,distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom:this.getZoom()};
    }
  }
  updateMovement(point){
    const dx=point.x-this.origin.x,dy=point.y-this.origin.y,distance=Math.hypot(dx,dy);
    const strength=Math.min(1,Math.max(0,(distance-8)/48));
    this.movement.x=distance?dx/distance*strength:0;this.movement.y=distance?dy/distance*strength:0;
  }
  move(e){
    if(!this.points.has(e.pointerId))return;
    if(!this.enabled()){this.reset();return;}
    e.preventDefault();const point={x:e.clientX,y:e.clientY};this.points.set(e.pointerId,point);
    if(this.mode==='pending')this.origin.travel=Math.max(this.origin.travel,Math.hypot(point.x-this.origin.x,point.y-this.origin.y));
    if(this.mode==='joystick'&&e.pointerId===this.origin.id)this.updateMovement(point);
    if(this.mode==='pinch'){
      const [a,b]=this.pinch.ids.map(id=>this.points.get(id));
      this.setZoom(this.pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/this.pinch.distance);
    }
  }
  end(e){
    if(!this.points.has(e.pointerId))return;
    const isTap=e.type==='pointerup'&&this.mode==='pending'&&this.origin.travel<=12&&Math.hypot(e.clientX-this.origin.x,e.clientY-this.origin.y)<=12&&this.now()-this.origin.time<HOLD_MS&&this.enabled();
    this.points.delete(e.pointerId);
    if(this.mode==='pinch'&&!this.pinch.ids.includes(e.pointerId))return;
    this.clearHold();this.stopMovement();this.mode=this.points.size?'blocked':'idle';this.pinch=null;
    if(isTap)this.tap(e.clientX,e.clientY);
  }
  reset(){
    const ids=[...this.points.keys()];this.points.clear();this.clearHold();this.stopMovement();this.mode='idle';this.origin=this.pinch=null;
    for(const id of ids)if(this.canvas.hasPointerCapture(id))this.canvas.releasePointerCapture(id);
  }
}
