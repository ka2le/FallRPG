import {WORLD_HALF,terrain} from './landscape.js';
import {floorAt,moveBody} from './physics.js';

// Session-only traversal tools. Normal combat movement stays in Combat.move.
export class TestingMode{
  constructor(game){this.game=game;this.enabled=false;this.flying=false;game.testing=this;}
  setEnabled(enabled){if(!enabled&&this.flying)this.land();if(!enabled)this.game.player.vx=this.game.player.vz=0;this.enabled=!!enabled;}
  land(){const p=this.game.player;this.flying=false;p.y=floorAt(p.x,p.z)+1.7;p.vx=p.vz=p.vy=0;p.grounded=true;}
  toggleFlight(){if(!this.enabled)return false;if(this.flying)this.land();else{this.flying=true;this.game.player.vy=0;this.game.player.grounded=false;}return this.flying;}
  move(dx,dz,dt,sprint=false,vertical=0){
    if(!this.enabled)return false;
    const p=this.game.player,oldX=p.x,oldZ=p.z,c=Math.cos(p.yaw),s=Math.sin(p.yaw);
    if(this.flying){
      const pitch=Math.cos(p.pitch),x=dx*c+dz*s*pitch,z=-dx*s+dz*c*pitch,y=vertical-dz*Math.sin(p.pitch),length=Math.max(1,Math.hypot(x,y,z)),step=(sprint?140:32)*dt/length;
      p.x=Math.max(-WORLD_HALF+12,Math.min(WORLD_HALF-12,p.x+x*step));p.z=Math.max(-WORLD_HALF+12,Math.min(WORLD_HALF-12,p.z+z*step));
      p.y=Math.max(terrain(p.x,p.z)+1.7,Math.min(320,p.y+y*step));p.vy=0;p.grounded=false;
    }else{
      const length=Math.max(1,Math.hypot(dx,dz)),step=(sprint?80:18)*dt/length;
      const level=moveBody(p,(dx*c+dz*s)*step,(-dx*s+dz*c)*step,.42,p.y-1.7,1.7,p.grounded?.28:0);
      if(level>p.y-1.7)p.y=level+1.7;
    }
    p.vx=(p.x-oldX)/(dt||1);p.vz=(p.z-oldZ)/(dt||1);p.moving=Math.hypot(p.vx,p.vz)>.1;
    return true;
  }
}
