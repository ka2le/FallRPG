import { Game } from '../src/game.js';
import { ROOTWALL } from '../src/rootwall-layout.js';

export function fieldGame(actors,player={x:1500,y:855},Engine=Game){
  const world={props:[],interactables:[],ambient:[],rootwallGroups:[],creatures:actors.map((c,i)=>({id:`probe-${i}`,level:1,phase:0,homeX:c.x,homeY:c.y,...c}))};
  const g=new Engine(null,{world});Object.assign(g.player,player);g.autoAttack=false;g.wasSafe=g.isSafe;return g;
}
export function treeGame(phase='holding',level=2,Engine=Game){
  const a={x:980,y:360},b={x:1040,y:360},walls=[a,b].map(p=>Array.from({length:6},(_,i)=>({x:p.x,y:p.y+(i-2.5)*36})));
  const scatter=walls.map((row,s)=>row.map((p,i)=>[{x:p.x+110+i*14,y:p.y},{x:p.x+140+i*14,y:p.y}]));
  const ids=Array.from({length:6},(_,i)=>`wall-${i}`),creatures=ids.map((id,i)=>({id,type:'wallroot',level,phase:i*1.4,rootwall:'audit-grove',rootIndex:i,clasp:true,solid:ROOTWALL.radius,...(phase==='holding'?walls[0][i]:scatter[0][i][0]),homeX:scatter[0][i][0].x,homeY:scatter[0][i][0].y}));
  const world={props:[],interactables:[],ambient:[],creatures,rootwallGroups:[{id:'audit-grove',a,b,walls,scatter,ids,site:0,phase,elapsed:0,scatterDuration:90}]};
  const g=new Engine(null,{world}),target=g.creatures[2];Object.assign(g.player,{x:target.x-160,y:target.y});g.wasSafe=false;g.autoAttack=false;g.target=target.id;
  return {g,group:g.world.rootwallGroups[0],target};
}
export function advance(g,seconds,input={}){for(let i=0;i<Math.round(seconds/.05);i++)g.update(.05,input);}
