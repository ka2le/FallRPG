// Quest cards for the journal and for quest givers' conversations.
import { questList, knownQuests, highlight, who } from './quests.js';
import { GEAR } from './adventure.js';
import { itemArt, gicon } from './ui-art.js';
import { pixelItem } from './item-sprites.js';

const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function badge(q){
  if(q.state==='complete')return `<span class="qc-badge done">✓</span>`;
  if(q.state==='offered')return `<span class="qc-badge new">!</span>`;
  if(q.ready)return `<span class="qc-badge ready">?</span>`;
  return `<span class="qc-badge">${pixelItem(q.kind==='bounty'?'sealed-scroll':'field-notebook','qc-icon')||gicon('scroll')}</span>`;
}
function reward(q){
  if(!q.reward)return '';
  if(q.reward.text)return `<span class="qc-reward-text">${highlight(esc(q.reward.text))}</span>`;
  const items=q.reward.items.map(id=>`<span class="qc-item" data-tip="reward" data-tip-id="${id}" tabindex="0">${itemArt(id,GEAR[id])}</span>`).join('');
  return `${items}<span class="qc-coin">${pixelItem('amber-coins','qc-amber')||'◆'}<b>${q.reward.coins}</b></span><span class="qc-xp" title="Memories">✦<b>${q.reward.xp}</b></span>`;
}
function steps(q,compact){
  const list=compact?q.steps.filter(s=>s.current||(!s.done&&!s.preview)).slice(0,2):q.steps;
  return `<ol class="qc-steps">${list.map(s=>{
    const cls=s.done?'done':s.current?'current':s.preview?'preview':'todo',c=s.count&&!s.preview?s.count:null;
    return `<li class="${cls}"><i class="qc-mark">${s.done?'✓':s.current?'◆':'◇'}</i><span class="qc-text">${s.html}</span>${c?`<span class="qc-count"><b>${c[0]}</b>/${c[1]}</span><span class="qc-bar"><i style="width:${c[0]/Math.max(1,c[1])*100}%"></i></span>`:''}</li>`;}).join('')}</ol>`;
}
export function questCard(ui,q,{giverView=false,compact=false}={}){
  const g=ui.game,tracked=ui.hud?.tracker?.tracked?.id===q.id,live=q.state!=='complete';
  let actions='';
  if(q.kind==='bounty'&&q.state==='offered')actions+=`<button class="primary" data-quest-action="${q.id}" ${g.isSafe?'':'disabled title="Accept bounties in a safe haven"'}>Accept bounty</button>`;
  else if(q.kind==='bounty'&&q.ready&&q.state==='active')actions+=giverView&&g.isSafe?`<button class="primary" data-quest-action="${q.id}">Claim reward</button>`:'';
  if(live&&!giverView){
    if(!tracked)actions+=`<button data-track-quest="${q.id}">${gicon('star')}Track</button>`;
    if(q.steps.some(s=>s.current&&s.target))actions+=`<button data-map-quest="${q.id}">${gicon('map')}Map</button>`;
  }
  const sub=q.kind==='bounty'?`Bounty · Lv ${q.level} · ${who(q.giver)}`:`Story · ${who(q.giver)}`;
  return `<article class="quest-entry qc ${q.state} ${q.ready?'ready':''} ${tracked?'tracked':''}" data-quest="${q.id}">
    <header>${badge(q)}<div class="qc-head"><h3>${esc(q.title)}</h3><small>${sub}</small></div>${tracked&&live?'<span class="qc-tracking">★ Tracking</span>':''}</header>
    ${steps(q,compact)}
    <footer><span class="qc-reward">${reward(q)}</span>${actions?`<span class="qc-actions">${actions}</span>`:''}</footer>
  </article>`;
}
export function journalQuests(ui){
  const list=knownQuests(ui.game),live=list.filter(q=>q.state!=='complete'),done=list.filter(q=>q.state==='complete');
  const tracked=ui.hud?.tracker?.tracked?.id;live.sort((a,b)=>(b.id===tracked)-(a.id===tracked));
  if(!list.length)return '<p class="qc-empty">No quests yet. Look for people with a gold <b>!</b> above them and talk to them.</p>';
  return `<div class="qc-list">${live.map(q=>questCard(ui,q)).join('')}</div>${done.length?`<details class="qc-done"><summary>Completed · ${done.length}</summary>${done.map(q=>questCard(ui,q,{compact:true})).join('')}</details>`:''}`;
}
export function giverQuests(ui,giver){
  const shown=questList(ui.game).filter(q=>q.kind==='bounty'&&q.giver===giver&&q.state!=='complete');
  for(const q of shown)ui.game.seeQuest(q.id);
  return shown.map(q=>questCard(ui,q,{giverView:true})).join('');
}
// Shown inside a story giver's conversation: what exactly they're asking for.
export function storyObjective(ui,npcId){
  const q=questList(ui.game).find(q=>q.kind==='story'&&q.giverId===npcId&&q.state!=='complete');if(!q)return '';
  ui.game.seeQuest(q.id);
  if(q.state==='offered')return `<div class="qc-objective"><span class="qc-badge new">!</span><div><small>${esc(q.title)}</small><p>${highlight(esc(q.detail))}</p><span class="qc-reward-text">${highlight(esc(q.reward.text))}</span></div></div>`;
  return `<div class="qc-objective active">${steps(q,true)}</div>`;
}
