// Game-style progress HUD: level gem, number-free memory bar, level-up moment,
// new-item pop-up, and a quest tracker that steps aside when nothing changes.
import { QUESTS } from './data.js';
import { xpForLevel } from './progression.js';
import { GEAR, HUNTS, dangerAt } from './adventure.js';
import { gicon, itemArt, SLOT_INFO } from './ui-art.js';

const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

export class ProgressHud{
  constructor(ui){
    this.ui=ui;this.game=ui.game;
    const hud=document.querySelector('.hud'),vitals=document.getElementById('vitals');
    // Level gem sits beside the vitals; the memory bar lives under them.
    hud.insertAdjacentHTML('beforeend',`<button id="level-gem" class="level-gem" data-menu="equipment" aria-label="Character"><span class="gem-face">${gicon('facet','gem-back')}<b id="level-num">1</b></span><i class="gem-pip" aria-hidden="true">${gicon('plus')}</i></button>
      <div id="status-chips" class="status-chips"></div>
      <div id="levelup" class="levelup" aria-live="polite"></div>
      <div id="loot-pop" class="loot-pop" aria-live="polite"></div>`);
    vitals.insertAdjacentHTML('beforeend',`<div class="vital xp" id="xp-meter" role="meter" aria-label="Memories toward next level"><span>${gicon('star')}</span><div><i id="xp-fill"></i><em></em></div></div>`);
    const status=document.getElementById('adventure-status');status.classList.add('objective-tracker');
    this.packButton=document.querySelector('[data-menu="equipment"].menu-pip, .menu-icons [data-menu="equipment"]');
    this.lastLevel=this.game.player.level;this.lastXp=this.game.player.xp;
    this.seenGear=new Set(this.game.inventory);this.newGear=new Set();
    this.questSig='';this.questUntil=0;this.levelTimer=null;this.lootTimer=null;
    status.addEventListener('pointerenter',()=>status.classList.add('expanded'));
    status.addEventListener('pointerleave',()=>{if(performance.now()>this.questUntil)status.classList.remove('expanded');});
  }
  reset(){this.lastLevel=this.game.player.level;this.lastXp=this.game.player.xp;this.seenGear=new Set(this.game.inventory);this.newGear.clear();}
  tick(){
    const g=this.game,p=g.player,need=xpForLevel(p.level),frac=p.level>=50?1:Math.min(1,p.xp/need);
    if(p.level<this.lastLevel)this.reset();
    if(p.level>this.lastLevel){this.levelUp(this.lastLevel,p.level);this.lastLevel=p.level;}
    const fill=document.getElementById('xp-fill'),meter=document.getElementById('xp-meter');
    fill.style.width=`${frac*100}%`;
    if(p.xp>this.lastXp&&!meter.classList.contains('gain')){meter.classList.add('gain');setTimeout(()=>meter.classList.remove('gain'),700);}
    this.lastXp=p.xp;
    meter.classList.toggle('near',frac>=.85&&p.level<50);
    meter.title=p.level>=50?'Memories · You have reached the highest level':`Memories · Fill the bar to reach level ${p.level+1}`;
    document.getElementById('level-num').textContent=p.level;
    const points=g.unspentPoints,gem=document.getElementById('level-gem');
    gem.classList.toggle('ready',points>0);
    gem.title=points>0?`Level ${p.level} · Skill points ready! Open Character (I)`:`Level ${p.level} · Character (I)`;
    // New items join the pack quietly with a short pop-up instead of a text toast.
    for(const id of g.inventory)if(!this.seenGear.has(id)){this.seenGear.add(id);this.newGear.add(id);this.loot(id);}
    const packIcon=document.querySelector('.menu-icons [data-menu="equipment"]');
    packIcon?.classList.toggle('has-news',points>0||this.newGear.size>0);
    this.chips(g,p);this.quest(g);
  }
  chips(g,p){
    const region=dangerAt(p.x,p.y),danger=!g.isSafe&&region.level>p.level+1;
    const html=(g.isSafe?`<span class="chip safe" title="Safe haven · Rest, learn spells and trade here">${gicon('hearth')}</span>`:'')+(danger?`<span class="chip danger" title="${esc(region.name)} · Level ${region.level} creatures">${gicon('warn')}<small>Dangerous</small></span>`:'');
    const el=document.getElementById('status-chips');if(el.innerHTML!==html)el.innerHTML=html;
  }
  questInfo(g){
    if(g.quests.herd==='offered')return {title:'Speak to Rowan',detail:'Speak to Rowan beside the waypost.'};
    if(g.quests.herd==='active'){
      const q=QUESTS.find(q=>q.id==='herd'),dead=g.creatures.filter(c=>c.quest==='herd'&&c.dead).length;
      return g.herdCleared?{title:q?.title||'The pasture',detail:'Return to Rowan.',ready:true}:{title:q?.title||'The pasture',detail:'Clear the seedlings north of Willowmere.',done:Math.min(3,dead),total:3};
    }
    const hunt=HUNTS.find(h=>g.quests[h.id]==='active');
    if(hunt){
      const done=hunt.camps.filter(c=>g.cleared.has(c.id)).length;
      return g.huntReady(hunt.id)?{title:hunt.title,detail:`Return to ${hunt.giver} for your reward.`,ready:true}:{title:hunt.title,detail:`Clear the camps · reward: ${GEAR[hunt.item]?.name||'gear'}`,done,total:hunt.camps.length};
    }
    return g.quests.herd==='complete'?{title:'Find a bounty',detail:'Visit Rowan or the market for bounties and supplies.'}:{title:'Clear the pasture',detail:''};
  }
  quest(g){
    const q=this.questInfo(g),pips=q.total?`<span class="pips">${Array.from({length:q.total},(_,i)=>`<i class="${i<q.done?'on':''}"></i>`).join('')}</span>`:'';
    const sig=`${q.title}|${q.detail}|${q.done}|${q.ready}`;
    const el=document.getElementById('adventure-status');
    if(sig!==this.questSig){
      this.questSig=sig;this.questUntil=performance.now()+7000;
      el.innerHTML=`<button data-menu="journal" class="qt-inner ${q.ready?'ready':''}" aria-label="Journal · ${esc(q.title)}"><span class="qt-icon">${gicon(q.ready?'check':'scroll')}</span><span class="qt-text"><b>${esc(q.title)}</b><small>${esc(q.detail)}</small></span>${pips}</button>`;
      el.classList.add('expanded');
    }else if(performance.now()>this.questUntil&&!el.matches(':hover'))el.classList.remove('expanded');
  }
  levelUp(from,to){
    const gained=(to-from)*2,box=document.getElementById('levelup');
    this.game.emit('levelup',{level:to});
    box.innerHTML=`<div class="lu-rays"></div><div class="lu-card"><small>Level up</small><strong>${gicon('facet','lu-gem')}<span>${to}</span></strong><p>${gicon('sprout')} +${gained} skill points</p><button data-menu="equipment" data-open-tab="growth" class="lu-go">Choose skills <kbd>I</kbd></button></div>`;
    box.classList.remove('leaving');box.classList.add('shown');
    document.getElementById('xp-meter').classList.add('levelled');
    setTimeout(()=>document.getElementById('xp-meter').classList.remove('levelled'),1200);
    clearTimeout(this.levelTimer);
    this.levelTimer=setTimeout(()=>{box.classList.add('leaving');this.levelTimer=setTimeout(()=>{box.classList.remove('shown','leaving');box.innerHTML='';document.getElementById('level-gem').classList.add('landed');setTimeout(()=>document.getElementById('level-gem')?.classList.remove('landed'),900);},650);},4200);
  }
  dismissLevelUp(){const box=document.getElementById('levelup');if(box?.classList.contains('shown')){clearTimeout(this.levelTimer);box.classList.remove('shown','leaving');box.innerHTML='';}}
  loot(id){
    const it=GEAR[id];if(!it)return;
    const box=document.getElementById('loot-pop');
    box.innerHTML=`<button data-menu="equipment" data-open-tab="gear">${itemArt(id,it,'loot-art')}<span><small>New ${SLOT_INFO[it.slot]?.name.toLowerCase()||'item'}</small><b>${esc(it.name)}</b></span><kbd>I</kbd></button>`;
    box.classList.add('shown');clearTimeout(this.lootTimer);
    this.lootTimer=setTimeout(()=>box.classList.remove('shown'),4500);
  }
  seen(){this.newGear.clear();}
}
