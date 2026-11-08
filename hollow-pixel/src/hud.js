// Game-style progress HUD: level gem, number-free memory bar, level-up moment,
// new-item pop-up, and a quest tracker that steps aside when nothing changes.
import { xpForLevel } from './progression.js';
import { GEAR, dangerAt } from './adventure.js';
import { QuestTracker } from './quest-tracker.js';
import { gicon, itemArt, SLOT_INFO } from './ui-art.js';

const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

export class ProgressHud{
  constructor(ui){
    this.ui=ui;this.game=ui.game;
    const hud=document.querySelector('.hud'),vitals=document.getElementById('vitals');
    // Level gem sits beside the vitals; the memory bar lives under them.
    hud.insertAdjacentHTML('beforeend',`<button id="level-gem" class="level-gem" data-menu="equipment" aria-label="Character"><span class="gem-face">${gicon('facet','gem-back')}<b id="level-num">1</b></span><i class="gem-pip" aria-hidden="true">${gicon('plus')}</i></button>
      <div id="status-chips" class="status-chips"></div>
      <div id="levelup" class="levelup" role="status" aria-live="polite" aria-atomic="true"></div>
      <div id="loot-pop" class="loot-pop" aria-live="polite"></div>`);
    vitals.insertAdjacentHTML('beforeend',`<div class="vital xp" id="xp-meter" role="meter" aria-label="Memories toward next level"><span>${gicon('star')}</span><div><i id="xp-fill"></i><em></em></div></div>`);
    const status=document.getElementById('adventure-status');status.classList.add('objective-tracker');
    this.packButton=document.querySelector('[data-menu="equipment"].menu-pip, .menu-icons [data-menu="equipment"]');
    this.packButton?.insertAdjacentHTML('beforeend','<span class="skill-orb" aria-hidden="true"></span>');
    this.lastLevel=this.game.player.level;this.lastXp=this.game.player.xp;
    this.seenGear=new Set(this.game.inventory);this.newGear=new Set();
    this.questSig='';this.questUntil=0;this.levelTimer=null;this.lootTimer=null;
    this.tracker=new QuestTracker(ui);
  }
  reset(){this.dismissLevelUp();this.lastLevel=this.game.player.level;this.lastXp=this.game.player.xp;this.seenGear=new Set(this.game.inventory);this.newGear.clear();}
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
    const packIcon=this.packButton;
    packIcon?.classList.toggle('has-news',this.newGear.size>0);
    packIcon?.classList.toggle('skill-ready',points>0);
    if(packIcon){
      packIcon.title=points>0?`${points} skill points ready · Spend on spells or stats · I`:'Character · I';
      packIcon.setAttribute('aria-label',points>0?`Character I · ${points} unspent skill points`:'Character I');
      if(points>0)packIcon.dataset.openTab=this.ui.character.spells.spendable(points)?'spells':'growth';
      else delete packIcon.dataset.openTab;
    }
    this.chips(g,p);this.tracker.tick();
  }
  chips(g,p){
    const region=dangerAt(p.x,p.y),danger=!g.isSafe&&region.level>p.level+1;
    const html=(g.isSafe?`<span class="chip safe" title="Safe haven · Rest, learn spells and trade here">${gicon('hearth')}</span>`:'')+(danger?`<span class="chip danger" title="${esc(region.name)} · Level ${region.level} creatures">${gicon('warn')}<small>Dangerous</small></span>`:'');
    const el=document.getElementById('status-chips');if(el.innerHTML!==html)el.innerHTML=html;
  }
  levelUp(from,to){
    const gained=(to-from)*2,box=document.getElementById('levelup');
    this.dismissLevelUp();
    this.game.emit('levelup',{level:to});
    box.innerHTML=`<strong class="lu-title">Level ${to}</strong>`;
    box.setAttribute('aria-label',`Level ${to}. ${gained} skill points gained. Spend points in Character, I.`);
    box.classList.add('shown');
    document.getElementById('xp-meter').classList.add('levelled');
    setTimeout(()=>document.getElementById('xp-meter').classList.remove('levelled'),1200);
    this.levelTimer=setTimeout(()=>{
      const target=this.packButton;
      const arrive=()=>{
        this.dismissLevelUp();
        if(this.game.unspentPoints>0&&target){
          target.classList.add('landed');
          this.landTimer=setTimeout(()=>target.classList.remove('landed'),900);
        }
      };
      if(!target||matchMedia('(prefers-reduced-motion: reduce)').matches){arrive();return;}
      // Measure the live HUD so the text lands on Character at any screen size.
      const start=box.getBoundingClientRect(),end=target.getBoundingClientRect();
      const dx=end.x+end.width/2-(start.x+start.width/2),dy=end.y+end.height/2-(start.y+start.height/2);
      box.classList.add('leaving');
      this.levelFlight=box.animate([
        {transform:'translateX(-50%) scale(1)',opacity:1},
        {transform:`translate(calc(-50% + ${dx}px), ${dy}px) scale(.08)`,opacity:.25},
      ],{duration:800,easing:'cubic-bezier(.6,0,.8,.5)',fill:'forwards'});
      this.levelFlight.onfinish=arrive;
    },5000);
  }
  dismissLevelUp(){
    clearTimeout(this.levelTimer);clearTimeout(this.landTimer);
    if(this.levelFlight){this.levelFlight.onfinish=null;this.levelFlight.cancel();this.levelFlight=null;}
    this.packButton?.classList.remove('landed');
    const box=document.getElementById('levelup');
    if(box){box.classList.remove('shown','leaving');box.innerHTML='';box.removeAttribute('aria-label');}
  }
  loot(id){
    const it=GEAR[id];if(!it)return;
    const box=document.getElementById('loot-pop');
    box.innerHTML=`<button data-menu="equipment" data-open-tab="gear">${itemArt(id,it,'loot-art')}<span><small>New ${SLOT_INFO[it.slot]?.name.toLowerCase()||'item'}</small><b>${esc(it.name)}</b></span><kbd>I</kbd></button>`;
    box.classList.add('shown');clearTimeout(this.lootTimer);
    this.lootTimer=setTimeout(()=>box.classList.remove('shown'),4500);
  }
  seen(){this.newGear.clear();}
}
