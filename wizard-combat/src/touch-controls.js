// Invisible, floating joystick. A finger keeps its role until it is lifted,
// so crossing the screen split never switches movement into camera control.
export class TouchControls {
  constructor(canvas,{enabled,look}){
    this.canvas=canvas;this.enabled=enabled;this.look=look;
    this.movement={x:0,z:0};this.moveTouch=null;this.lookTouch=null;
    canvas.addEventListener('pointerdown',e=>this.start(e));
    canvas.addEventListener('pointermove',e=>this.move(e));
    for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>this.end(e.pointerId));
    window.addEventListener('resize',()=>this.reset());
  }
  start(e){
    if(e.pointerType!=='touch'||!this.enabled())return;
    e.preventDefault();
    const rect=this.canvas.getBoundingClientRect(),role=e.clientY>=rect.top+rect.height*2/3?'moveTouch':'lookTouch';
    if(this[role])return;
    this[role]={id:e.pointerId,x:e.clientX,y:e.clientY};
    this.canvas.setPointerCapture(e.pointerId);
  }
  move(e){
    if(e.pointerType!=='touch')return;
    if(!this.enabled()){this.reset();return;}
    if(this.moveTouch?.id===e.pointerId){
      e.preventDefault();
      const dx=e.clientX-this.moveTouch.x,dz=e.clientY-this.moveTouch.y,distance=Math.hypot(dx,dz);
      const strength=Math.min(1,Math.max(0,(distance-8)/48));
      this.movement.x=distance?dx/distance*strength:0;
      this.movement.z=distance?dz/distance*strength:0;
    }else if(this.lookTouch?.id===e.pointerId){
      e.preventDefault();this.look(e.clientX-this.lookTouch.x,e.clientY-this.lookTouch.y);
      this.lookTouch.x=e.clientX;this.lookTouch.y=e.clientY;
    }
  }
  end(id){
    if(this.moveTouch?.id===id){this.moveTouch=null;this.movement.x=this.movement.z=0;}
    if(this.lookTouch?.id===id)this.lookTouch=null;
  }
  reset(){
    const touches=[this.moveTouch,this.lookTouch];
    this.moveTouch=this.lookTouch=null;this.movement.x=this.movement.z=0;
    for(const touch of touches)if(touch&&this.canvas.hasPointerCapture(touch.id))this.canvas.releasePointerCapture(touch.id);
  }
}
