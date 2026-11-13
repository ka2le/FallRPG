import { SPECIES } from './data.js';
import { canWalk, moveBody } from './world.js';

const CELL=64,DRIFT=36;
function hash(text){let n=2166136261;for(const ch of text)n=Math.imul(n^ch.charCodeAt(0),16777619);return n>>>0;}

// A soft preference, never a collision body. Read one position snapshot and
// apply bounded, damped drift so update order cannot push a crowd into jitter.
export function spreadCombatants(game,dt){
  const p=game.player,actors=[],cells=new Map();
  for(const c of game.creatures){
    const s=SPECIES[c.type];
    if(c.dead||!c.aggro||c.returning||c.root>0||c.stun>0||s.neutral||c.rootwall&&c.rooted||Math.hypot(c.x-p.x,c.y-p.y)>850){c.spreadVX=0;c.spreadVY=0;continue;}
    actors.push({c,x:c.x,y:c.y,spacing:Math.max(28,Math.min(44,s.size*.7)),fx:0,fy:0});
  }
  actors.sort((a,b)=>String(a.c.id).localeCompare(String(b.c.id)));
  for(const [i,a] of actors.entries()){
    a.index=i;const key=`${Math.floor(a.x/CELL)},${Math.floor(a.y/CELL)}`;
    if(!cells.has(key))cells.set(key,[]);cells.get(key).push(a);
  }
  for(const a of actors){
    const bx=Math.floor(a.x/CELL),by=Math.floor(a.y/CELL);
    for(let x=bx-1;x<=bx+1;x++)for(let y=by-1;y<=by+1;y++)for(const b of cells.get(`${x},${y}`)||[]){
      if(b.index<=a.index)continue;
      const dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy),spacing=(a.spacing+b.spacing)/2;
      if(d>=spacing)continue;
      const seed=hash(`${a.c.id}/${b.c.id}`),angle=seed/4294967296*Math.PI*2;
      let nx=d>.001?dx/d:Math.cos(angle),ny=d>.001?dy/d:Math.sin(angle);
      const rx=(a.x+b.x)/2-p.x,ry=(a.y+b.y)/2-p.y,r=Math.hypot(rx,ry)||1,tx=-ry/r,ty=rx/r;
      // Collinear pursuers need a consistent sideways preference to fan out,
      // rather than queue behind each other along the same approach line.
      const alignment=Math.abs(nx*tx+ny*ty),bias=Math.max(0,1-alignment/.35)*.8*(seed%2?1:-1);
      nx+=tx*bias;ny+=ty*bias;
      const strength=1-d/spacing;a.fx+=nx*strength;a.fy+=ny*strength;b.fx-=nx*strength;b.fy-=ny*strength;
    }
  }
  const blend=1-Math.exp(-dt*8);
  for(const a of actors){
    const c=a.c,limit=DRIFT*(c.slow>0?.42:1),length=Math.max(1,Math.hypot(a.fx,a.fy));
    c.spreadVX=(c.spreadVX||0)+(a.fx/length*limit-(c.spreadVX||0))*blend;
    c.spreadVY=(c.spreadVY||0)+(a.fy/length*limit-(c.spreadVY||0))*blend;
    if(Math.hypot(c.spreadVX,c.spreadVY)<.2){c.spreadVX=0;c.spreadVY=0;continue;}
    const dx=a.x-p.x,dy=a.y-p.y,r=Math.hypot(dx,dy),near=r<(SPECIES[c.type].ranged?350:70);
    let goal={x:a.x+c.spreadVX*dt,y:a.y+c.spreadVY*dt};
    if(near&&r>8){
      // Sidestep along the attack ring; never repeatedly push a melee attacker
      // out of range and make its pursuit snap it straight back in.
      const tangent=(-dy*c.spreadVX+dx*c.spreadVY)/r,angle=Math.atan2(dy,dx)+tangent*dt/r;
      goal={x:p.x+Math.cos(angle)*r,y:p.y+Math.sin(angle)*r};
    }
    const radius=c.rootwall?c.solid:5;
    if(!canWalk(game.world,goal.x,goal.y,radius,c))continue;
    moveBody(game.world,c,goal.x-c.x,goal.y-c.y,radius);
    const moved=Math.hypot(c.x-a.x,c.y-a.y);
    if(moved>.02){if(!c.moving){c.walk+=dt*3;if(Math.abs(c.spreadVX)>3)c.face=c.spreadVX>0?1:-1;}c.moving=true;}
  }
}
