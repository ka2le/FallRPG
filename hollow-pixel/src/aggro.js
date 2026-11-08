import { SPECIES } from './data.js';
import { enemyPressure } from './combat-tuning.js';
import { dist } from './world.js';

export const GROUP_AGGRO_RADIUS=180;
export const recoveryPerSecond=c=>Math.max(2,c.maxHp*.035);
export function beginReturn(c){
  c.aggro=false;c.provoked=false;c.returning=true;c.windup=0;c.pursuitTime=0;
  c.returnRoute=[];c.nextReturnPath=0;
  c.aggroAnchor=null;
}
function alert(game,c,anchor){
  if(!c.aggro){c.pursuitTime=enemyPressure(c,SPECIES[c.type],game.player.level).rushDuration;c.aggroAnchor=anchor;if(SPECIES[c.type].ranged&&c.level<=6)c.attack=Math.min(c.attack,.15);}
  c.aggro=true;
  if(SPECIES[c.type].rootwall)c.provoked=true;
}
function canRejoin(game,c){
  if(!c.returning)return true;
  const home={x:c.homeX,y:c.homeY},leash=enemyPressure(c,SPECIES[c.type],game.player.level).homeLeash;
  // Hysteresis: first withdraw well inside the territory. Following a retreat
  // home and shooting it cannot turn the entire return journey into a free kill.
  return dist(c,home)<leash*.6&&dist(game.player,home)<leash*.85;
}
export function engageGroup(game,source){
  if(source.dead||game.isSafe||!canRejoin(game,source))return false;
  source.returning=false;
  // A direct alert has one bounded radius. Allies never relay it onwards;
  // a chain of animals across the map cannot become one giant encounter.
  const allies=[],radius=source.quest==='herd'?120:GROUP_AGGRO_RADIUS;
  for(const ally of game.creatures){
    if(ally===source||ally.dead||!canRejoin(game,ally)||SPECIES[ally.type].neutral||dist(source,ally)>radius)continue;
    const family=source.rootwall||ally.rootwall?source.rootwall&&source.rootwall===ally.rootwall:
      source.type===ally.type||source.camp&&source.camp===ally.camp||source.quest&&source.quest===ally.quest;
    if(!family)continue;
    const pressure=enemyPressure(ally,SPECIES[ally.type],game.player.level);
    if(dist(ally,game.player)>pressure.leash||dist(ally,{x:ally.homeX,y:ally.homeY})>pressure.homeLeash)continue;
    allies.push(ally);
  }
  // Share the front of the pack's territory, rather than abandoning rear
  // members before they can catch up. This is fixed at initial engagement.
  const front=[source,...allies].reduce((best,c)=>dist({x:c.homeX,y:c.homeY},game.player)<dist({x:best.homeX,y:best.homeY},game.player)?c:best);
  const anchor=source.aggroAnchor||{x:front.homeX,y:front.homeY};
  alert(game,source,anchor);for(const ally of allies){ally.returning=false;alert(game,ally,anchor);}
  return true;
}
