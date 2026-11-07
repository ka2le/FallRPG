import { ROOTWALL } from './rootwall-layout.js';
import { canWalk, dist } from './world.js';

export function attachRootwalls(game){
  const actors=new Map(game.creatures.map(c=>[c.id,c]));
  game.world.rootwallGroups=(game.world.rootwallGroups||[]).map(g=>({...g,members:g.ids.map(id=>actors.get(id)).filter(Boolean),moveClock:0}));
  game.world.rootwallLive=true;
  game.world.rootwallSource=game.creatures;game.world.rootwallActive=new Set(game.creatures);game.world.rootwallActors=()=>game.creatures;
}
function changePhase(game,g,phase){
  g.phase=phase;g.elapsed=0;
  if(dist(game.player,g.a)<550||dist(game.player,g.b)<550){
    const text={gathering:'Marching Claspwoods are gathering across the trail.',holding:'The living wall has rooted. It will hold for about a minute.',dispersing:'The living wall loosens, one tree at a time.'}[phase];
    if(text)game.toast(text);
  }
}
export function updateRootwalls(game,dt){
  if(game.world.rootwallSource!==game.creatures){game.world.rootwallSource=game.creatures;game.world.rootwallActive=new Set(game.creatures);}
  const actors=game.world.rootwallActive;
  for(const g of game.world.rootwallGroups||[]){
    const live=g.members.filter(c=>!c.dead&&actors.has(c));g.elapsed+=dt;g.moveClock+=dt;
    if(!live.length)continue;
    const next=1-g.site,near=Math.min(dist(game.player,g.a),dist(game.player,g.b))<1000;
    const step=near?dt:g.moveClock>=.5?g.moveClock:0;
    if(step)g.moveClock=0;
    for(const [rank,c] of live.entries()){
      c.aggro=dist(c,game.player)<80;c.state=`${g.phase} with the grove`;c.moving=false;
      if(dist(c,game.player)<40)game.triggerTree(c);
      const i=c.rootIndex;
      let goal=null;
      if(g.phase==='scattered')goal=g.scatter[g.site][i][Math.floor((g.elapsed+i*1.7)/12)%2];
      if(g.phase==='gathering'&&g.elapsed>=rank*1.2)goal=g.walls[g.site][i];
      if(g.phase==='dispersing'&&g.elapsed>=rank*ROOTWALL.releaseEvery)goal=g.scatter[next][i][0];
      if(!goal||!step||c.root>0||c.stun>0||game.treeAttacks.has(c)||dist(c,goal)<1)continue;
      const speed=(g.phase==='gathering'?ROOTWALL.gatherSpeed:ROOTWALL.scatterSpeed)*(c.slow>0?.42:1),d=dist(c,goal),travel=Math.min(d,speed*step);
      const x=c.x+(goal.x-c.x)/d*travel,y=c.y+(goal.y-c.y)/d*travel;
      // Do not slide a trunk through the player while the wall is knitting.
      if(Math.hypot(x-game.player.x,y-game.player.y)<ROOTWALL.radius+9)continue;
      const ox=c.x,oy=c.y;
      game.walkCreature(c,goal,travel/speed,speed);
      c.moving=Math.hypot(c.x-ox,c.y-oy)>.001;
    }
    if(g.phase==='scattered'&&g.elapsed>=g.scatterDuration)changePhase(game,g,'gathering');
    else if(g.phase==='gathering'&&live.every(c=>dist(c,g.walls[g.site][c.rootIndex])<1.1))changePhase(game,g,'holding');
    else if(g.phase==='holding'&&g.elapsed>=ROOTWALL.hold)changePhase(game,g,'dispersing');
    else if(g.phase==='dispersing'&&g.elapsed>=(live.length-1)*ROOTWALL.releaseEvery&&live.every(c=>dist(c,g.scatter[next][c.rootIndex][0])<1.1)){
      g.site=next;changePhase(game,g,'scattered');
    }
  }
}
export function saveRootwalls(game){return (game.world.rootwallGroups||[]).map(g=>({id:g.id,phase:g.phase,site:g.site,elapsed:g.elapsed,members:g.members.map(c=>({id:c.id,x:c.x,y:c.y}))}));}
export function restoreRootwalls(game,data){
  if(!Array.isArray(data))return;
  const dynamic=game.world.rootwallLive;game.world.rootwallLive=false;
  try{
  for(const saved of data){
    const g=game.world.rootwallGroups.find(g=>g.id===saved?.id);
    if(!g||!['scattered','gathering','holding','dispersing'].includes(saved.phase)||![0,1].includes(saved.site))continue;
    g.phase=saved.phase;g.site=saved.site;g.elapsed=Number.isFinite(saved.elapsed)?Math.max(0,Math.min(600,saved.elapsed)):0;
    for(const p of Array.isArray(saved.members)?saved.members:[]){
      const c=g.members.find(c=>c.id===p?.id);
      if(!c||!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.min(dist(p,g.a),dist(p,g.b))>500)continue;
      if(canWalk(game.world,p.x,p.y,ROOTWALL.radius,c)){c.x=p.x;c.y=p.y;}
    }
  }
  }finally{game.world.rootwallLive=dynamic;}
}
