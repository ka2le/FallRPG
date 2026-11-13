// One quest model shared by the HUD tracker, journal, dialogue, world markers and map.
// Pure data in, plain objects out (node-safe: no DOM).
import { QUESTS, SPECIES, PLACES } from './data.js';
import { HUNTS, GEAR } from './adventure.js';
import { EXTRA_REWARDS } from './items.js';

// ---------- highlighted text ----------
const DIRS=['east','south-east','south','south-west','west','north-west','north','north-east'];
const ARROW={north:'↑','north-east':'↗',east:'→','south-east':'↘',south:'↓','south-west':'↙',west:'←','north-west':'↖'};
export const num=n=>`<b class="qh qh-num">${n}</b>`;
export const mob=name=>`<b class="qh qh-mob">${name}</b>`;
export const place=name=>`<b class="qh qh-place">${name}</b>`;
export const who=name=>`<b class="qh qh-who">${name}</b>`;
export const dir=(d,label=d)=>d?`<b class="qh qh-dir"><i aria-hidden="true">${ARROW[d]||''}</i>${label}</b>`:'';
export const keycap=k=>`<kbd class="qh-key">${k}</kbd>`;
export function compass(from,to){
  const dx=to.x-from.x,dy=to.y-from.y;if(Math.hypot(dx,dy)<90)return '';
  return DIRS[Math.round(((Math.atan2(dy,dx)*180/Math.PI)+360)%360/45)%8];
}
export const bearing=(from,to)=>Math.atan2(to.y-from.y,to.x-from.x)*180/Math.PI;
const plural=(name,n)=>n===1?name:name.endsWith('fe')?name.slice(0,-2)+'ves':/(s|sh|ch|x)$/.test(name)?name+'es':name+'s';
const nearestPlace=p=>PLACES.reduce((best,pl)=>!best||Math.hypot(pl.x-p.x,pl.y-p.y)<Math.hypot(best.x-p.x,best.y-p.y)?pl:best,null);
// Words in quest and dialogue text that deserve emphasis: creatures, numbers, places and directions.
const NUMBER_WORDS='one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|both|all three|all four';
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
let highlighter=null;
function buildHighlighter(){
  const mobs=new Set();
  for(const s of Object.values(SPECIES)){mobs.add(s.name);const last=s.name.split(' ').pop();if(last.length>4)mobs.add(last);}
  const mobAlt=[...mobs].sort((a,b)=>b.length-a.length).map(n=>n.endsWith('fe')?`${esc(n)}|${esc(n.slice(0,-2))}ves`:`${esc(n)}(?:e?s)?`).join('|');
  const whoAlt=[...new Set(['Rowan','Mara','Toma','Pip',...HUNTS.map(h=>h.giver)])].sort((a,b)=>b.length-a.length).map(esc).join('|');
  const placeAlt=[...new Set(PLACES.map(p=>p.name).concat(['Willowmere']))].sort((a,b)=>b.length-a.length).map(esc).join('|');
  return new RegExp(`(\\b(?:${whoAlt})\\b)|(\\b(?:${placeAlt})\\b)|(\\b(?:${mobAlt})\\b)|(\\b(?:north|south)(?:[- ]?(?:east|west))?\\b|\\b(?:east|west)\\b)|(\\b(?:\\d+|${NUMBER_WORDS})\\b)`,'gi');
}
export function highlight(text){
  if(!text)return '';highlighter??=buildHighlighter();
  // Only touch text between tags so existing markup survives.
  return String(text).split(/(<[^>]+>)/).map(part=>part.startsWith('<')?part:part.replace(highlighter,(m,wh,pl,mb,d,n)=>wh?who(m):pl?place(m):mb?mob(m):d?dir(m.toLowerCase().replace(' ','-').replace(/^(north|south)(east|west)$/,'$1-$2'),m):num(m))).join('');
}

// ---------- quest model ----------
const STORY_GIVER={herd:'Rowan',seam:'Mara',seasons:'Mara'};
const FIELD=['barkjaw','mantleback','snowkeel','ventback'];
export const npcByName=(game,name)=>game.world.interactables.find(i=>i.kind==='npc'&&i.name===name);
const pos=o=>o?{x:o.x,y:o.y}:null;
function centroid(list){if(!list.length)return null;return {x:list.reduce((a,c)=>a+c.x,0)/list.length,y:list.reduce((a,c)=>a+c.y,0)/list.length};}
function mobList(types){
  const counts={};for(const t of types)counts[t]=(counts[t]||0)+1;
  return Object.entries(counts).map(([t,n])=>`${num(n)} ${mob(plural(SPECIES[t]?.name||t,n))}`).join(' + ');
}
// "north of Willowmere": where something is, from the quest giver's home.
function whereFrom(ref,target){const pl=nearestPlace(ref),d=compass(ref,target);return d?`, ${dir(d)} of ${place(pl.name)}`:` near ${place(pl.name)}`;}

function storyQuest(g,q){
  const state=g.quests[q.id];if(!state||state==='locked')return null;
  const giver=npcByName(g,STORY_GIVER[q.id])||g.world.interactables.find(i=>i.id===q.giver.toLowerCase()),gp=pos(giver),home=nearestPlace(gp||{x:1080,y:785});
  const talk={html:`Speak to ${who(q.giver)} in ${place(home.name)}`,brief:`Speak to ${who(q.giver)}`,target:gp,targetLabel:q.giver};
  const out={id:q.id,kind:'story',title:q.title,giver:q.giver,giverId:giver?.id,level:null,state,detail:q.detail,steps:[],reward:{text:q.reward}};
  if(state==='offered'){out.steps=[{...talk,current:true}];return out;}
  const back={html:`Return to ${who(q.giver)} in ${place(home.name)}`,brief:`Return to ${who(q.giver)}`,target:gp,targetLabel:q.giver};
  if(q.id==='herd'){
    const herd=g.creatures.filter(c=>c.quest==='herd'),dead=herd.filter(c=>c.dead).length,done=g.herdCleared;
    const pasture=PLACES.find(p=>p.id==='pasture')||centroid(herd);
    out.steps=[{html:`Defeat ${mobList(herd.map(c=>c.type))} at ${place(pasture.name||'the pasture')}${whereFrom(gp||pasture,pasture)}`,brief:`Defeat ${mobList(herd.map(c=>c.type))} at ${place(pasture.name||'the pasture')}`,count:[done?herd.length:dead,herd.length],done,target:centroid(herd.filter(c=>!c.dead))||pos(pasture),targetLabel:'Briar Seedlings',mobs:herd.filter(c=>!c.dead).map(c=>c.id)},back];
    if(done)out.ready=true;
  }else if(q.id==='seam'){
    const crossing=g.world.interactables.find(i=>i.kind==='crossing')||PLACES.find(p=>p.id==='seam');
    out.steps=[{html:`Untangle the ${mob('fallen branches')} at ${place('The Steamward')}${whereFrom(gp||crossing,crossing)} ${keycap('Space')}`,brief:`Clear the ${mob('fallen branches')} ${keycap('Space')}`,done:g.crossingOpen,target:pos(crossing),targetLabel:'Tangled crossing'},back];
    if(g.crossingOpen)out.ready=true;
  }else{
    const seen=FIELD.filter(s=>g.observed.has(s)),missing=FIELD.filter(s=>!g.observed.has(s));
    const near=g.creatures.filter(c=>!c.dead&&missing.includes(c.type)).sort((a,b)=>Math.hypot(a.x-g.player.x,a.y-g.player.y)-Math.hypot(b.x-g.player.x,b.y-g.player.y))[0];
    out.steps=[{html:`Observe ${num(4)} creatures ${keycap('Space')}: ${FIELD.map(s=>`<span class="qh-check ${g.observed.has(s)?'on':''}">${mob(SPECIES[s].name)}</span>`).join(' ')}`,brief:`Observe ${missing.length?missing.map(s=>mob(SPECIES[s].name)).join(', '):'all four'} ${keycap('Space')}`,count:[seen.length,4],done:!missing.length,target:pos(near),targetLabel:near?SPECIES[near.type].name:''},back];
    if(!missing.length)out.ready=true;
  }
  if(state==='complete'){for(const s of out.steps)s.done=true;out.ready=false;}
  else{const cur=out.steps.find(s=>!s.done);if(cur)cur.current=true;}
  return out;
}

function huntQuest(g,h){
  const state=g.quests[h.id];if(!state||state==='locked')return null;
  const giver=npcByName(g,h.giver),gp=pos(giver)||h.camps[0],home=nearestPlace(gp);
  const reward={items:[h.item,...(EXTRA_REWARDS[h.id]||[])].filter(id=>GEAR[id]),coins:h.coins,xp:h.xp};
  const out={id:h.id,kind:'bounty',title:h.title,giver:h.giver,giverId:giver?.id,level:h.level,state,detail:h.detail,reward,steps:[]};
  const camps=h.camps.map(c=>{const members=g.creatures.filter(m=>m.camp===c.id),cleared=g.cleared.has(c.id),dead=members.filter(m=>m.dead).length,total=members.length||c.types.length;
    return {html:`${place(c.name)}${c.elite?' <span class="qh-elite">elite</span>':''}: defeat ${mobList(c.types)}${whereFrom(gp,c)}`,brief:`Defeat ${mobList(c.types)} at ${place(c.name)}`,count:[cleared?total:dead,total],done:cleared,target:{x:c.x,y:c.y},targetLabel:c.name,camp:c.id,mobs:members.filter(m=>!m.dead).map(m=>m.id),level:c.level};});
  const back={html:`Return to ${who(h.giver)} at ${place(home.name)} for your reward`,brief:`Return to ${who(h.giver)}`,target:gp,targetLabel:h.giver};
  if(state==='offered'){out.steps=[{html:`Accept from ${who(h.giver)} at ${place(home.name)}`,brief:`Accept from ${who(h.giver)}`,target:gp,targetLabel:h.giver,current:true},...camps.map(c=>({...c,count:null,preview:true}))];return out;}
  out.steps=[...camps,back];
  if(state==='complete')for(const s of out.steps)s.done=true;
  else{out.ready=camps.every(c=>c.done);const cur=out.steps.find(s=>!s.done);if(cur)cur.current=true;}
  return out;
}

const ORDER={ready:0,active:1,offered:2,complete:3};
export const questRank=q=>q.state==='active'&&q.ready?ORDER.ready:ORDER[q.state];
export function questList(g){
  const list=[...QUESTS.map(q=>storyQuest(g,q)),...HUNTS.map(h=>huntQuest(g,h))].filter(Boolean);
  return list.sort((a,b)=>questRank(a)-questRank(b)||(a.kind==='story'?-1:0)-(b.kind==='story'?-1:0)||(a.level||0)-(b.level||0));
}
// The quest UI (journal, tracker, map) lists only quests you know about: anything accepted or
// finished, plus offers a giver has actually told you about. World '!' badges still mark givers.
export const isKnown=(g,q)=>q.state!=='offered'||!!g.seenQuests?.has(q.id);
export const knownQuests=(g,list=questList(g))=>list.filter(q=>isKnown(g,q));
export const currentStep=q=>q?.steps.find(s=>s.current)||null;
// Which quest the HUD follows: the player's choice, else whatever needs attention most.
export function trackedQuest(list,preferred){
  const live=list.filter(q=>q.state!=='complete');
  return live.find(q=>q.id===preferred)||live.find(q=>q.state==='active')||live.find(q=>q.kind==='story')||live[0]||null;
}
// World and map markers: '!' where a quest can be picked up, '?' where one can be handed in.
export function questMarkers(g,list=questList(g)){
  const givers=new Map(),mobs=new Set();
  for(const q of list){
    if(!q.giverId)continue;
    if(q.state==='active'&&q.ready)givers.set(q.giverId,'?');
    else if(q.state==='offered'&&givers.get(q.giverId)!=='?')givers.set(q.giverId,'!');
    if(q.state==='active')for(const s of q.steps)if(!s.done&&s.mobs)for(const id of s.mobs)mobs.add(id);
  }
  return {givers,mobs};
}
