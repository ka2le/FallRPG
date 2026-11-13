import { SPECIES } from './data.js';
import { canWalk, dist } from './world.js';

// Game time, not wall time: pausing/closing the game never repopulates a camp.
export const RESPAWN={ordinary:300,elite:480,clearRadius:480};
export function markDefeated(game,c){
  c.deadAt=game.time;c.respawnAt=game.time+(c.elite?RESPAWN.elite:RESPAWN.ordinary);
  c.returnedHome=false;
}
export function visitHaven(game){
  for(const c of game.creatures)if(c.dead)c.returnedHome=true;
}
export function tryRespawn(game,c){
  if(!c.dead||!c.returnedHome||!Number.isFinite(c.respawnAt)||game.time<c.respawnAt)return false;
  // A protected haven counts as leaving the hunting ground. This matters for
  // the pasture and camps immediately outside a refuge's boundary.
  if(!game.isSafe&&(dist(game.player,c)<RESPAWN.clearRadius||dist(game.player,{x:c.homeX,y:c.homeY})<RESPAWN.clearRadius))return false;
  // The introductory pair stays free until Rowan has received the quest.
  if(c.quest==='herd'&&game.quests.herd!=='complete')return false;
  const spawn={x:c.homeX,y:c.homeY};
  if(SPECIES[c.type].rootwall){
    const group=game.world.rootwallGroups.find(g=>g.ids.includes(c.id));
    if(group){const site=group.phase==='dispersing'?1-group.site:group.site;
      Object.assign(spawn,(group.phase==='holding'||group.phase==='gathering'?group.walls[site][c.rootIndex]:group.scatter[site][c.rootIndex][0]));}
  }
  if(!game.isSafe&&dist(game.player,spawn)<RESPAWN.clearRadius||!canWalk(game.world,spawn.x,spawn.y,c.solid||5,c))return false;
  Object.assign(c,spawn,{dead:false,hp:c.maxHp,aggro:false,provoked:false,returning:false,returnRoute:[],windup:0,attack:1,root:0,stun:0,slow:0,flash:0,pursuitTime:0});
  delete c.respawnAt;delete c.returnedHome;game.defeated.delete(c.id);game.dirty=true;
  return true;
}
