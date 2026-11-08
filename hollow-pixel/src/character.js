// Character screen: equipment paper doll, live stat sheet, growth with a
// confirm step, and hover cards that show the exact change before you commit.
import { STANCES,SPELL_BY_ID } from './data.js';
import { ATTRIBUTES, playerStats, xpForLevel } from './progression.js';
import { GEAR } from './adventure.js';
import { effectiveSpell } from './spell-effects.js';
import { SpellScreen } from './spell-screen.js';
import { gicon, itemArt, art, SLOT_INFO, SLOT_ORDER, STAT_INFO, STAT_ORDER, GEAR_STAT, ATTR_ART, ATTR_COLOR, ATTR_SHORT } from './ui-art.js';

const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const EPS=1e-6;

// Exactly the numbers the game uses, for any hypothetical growth or equipment.
export function deriveStats(game,attributes=game.attributes,equipment=game.equipment){
  const gear={};
  for(const id of Object.values(equipment))for(const [k,v] of Object.entries(GEAR[id]?.stats||{}))gear[k]=(gear[k]||0)+v;
  const s=playerStats(game.player.level,attributes,gear);
  const spell=id=>effectiveSpell(id,s,game.spellUpgrades.has(id));
  return {health:s.maxHp,healthRegen:s.healthRegen,mana:s.maxMana,regen:s.manaRegen,power:s.spellPower,damage:(STANCES[0].damage+(gear.damage||0))*s.spellPower,armor:Math.min(.6,gear.armor||0),speed:gear.speed||0,
    ward:spell('ward').shield,bloom:spell('nova').radius,bind:spell('bind').duration,
    fox:spell('fox').damage,lance:spell('surge').damage,tonic:s.tonicHealing,cooldown:s.cooldownReduction};
}
export function statDiff(a,b){const out={};for(const k of STAT_ORDER){const d=b[k]-a[k];if(Math.abs(d)>EPS)out[k]=d;}return out;}

export class CharacterScreen{
  constructor(ui){this.ui=ui;this.game=ui.game;this.tab=null;this.filter='all';this.pending={power:0,mana:0};this.preview=null;this.picked=null;this.pointer='mouse';this.spells=new SpellScreen(ui);
    document.addEventListener('pointerdown',e=>{this.pointer=e.pointerType||'mouse';},true);
    document.addEventListener('pointerover',e=>this.hover(e.target));
    document.addEventListener('focusin',e=>this.hover(e.target));
    document.addEventListener('pointerout',e=>{if(e.target.closest?.('[data-tip]')&&!e.relatedTarget?.closest?.('[data-tip]'))this.unhover();});
  }
  get pendingTotal(){return Object.values(this.pending).reduce((a,b)=>a+b,0);}
  get available(){return this.game.unspentPoints-this.pendingTotal;}
  pendingAttrs(extra){const a={...this.game.attributes};for(const k in this.pending)a[k]+=this.pending[k];if(extra)a[extra]++;return a;}
  reset(){this.pending={power:0,mana:0};this.preview=null;this.picked=null;this.hideTip();}
  onOpen(){if(!this.tab)this.tab=this.game.unspentPoints>0?'growth':'gear';}
  onClose(){this.ui.hud?.seen();this.reset();this.tab=null;this.filter='all';}

  // Returns true when the click belonged to this screen.
  click(el){
    const g=this.game;
    if(this.spells?.click(el))return true;
    if(el.dataset.charTab){this.tab=el.dataset.charTab;this.ui.renderModal();return true;}
    if(el.dataset.gearFilter){this.filter=el.dataset.gearFilter;this.tab='gear';this.ui.renderModal();return true;}
    if(el.dataset.unequip){if(g.unequip(el.dataset.unequip)){this.preview=null;this.hideTip();this.ui.renderModal();this.ui.onSave();}return true;}
    if(el.dataset.grow){if(this.available>0&&ATTRIBUTES[el.dataset.grow]){this.pending[el.dataset.grow]++;this.flash=el.dataset.grow;}this.ui.renderModal();this.refocus(`[data-grow="${el.dataset.grow}"]`);return true;}
    if(el.dataset.growUndo){if(this.pending[el.dataset.growUndo]>0)this.pending[el.dataset.growUndo]--;this.ui.renderModal();return true;}
    if(el.hasAttribute('data-grow-reset')){this.pending={power:0,mana:0};this.ui.renderModal();return true;}
    if(el.hasAttribute('data-grow-confirm')){
      for(const [id,n] of Object.entries(this.pending))for(let i=0;i<n;i++)g.spendPoint(id);
      this.celebrate=Object.keys(this.pending).filter(k=>this.pending[k]>0);
      this.pending={power:0,mana:0};g.recalculate?.();this.ui.onSave();
      this.ui.renderModal();return true;
    }
    if(el.dataset.equip){
      const id=el.dataset.equip;
      if(g.equipment[GEAR[id]?.slot]===id)return true;
      // On touch, the first tap previews; a second tap on the same item equips.
      if(this.pointer==='touch'&&this.picked!==id){this.picked=id;this.ui.renderModal();const t=document.querySelector(`[data-equip="${id}"]`);t?.focus();this.hover(t);return true;}
      g.equip(id);this.picked=null;this.justEquipped=id;this.hideTip();this.ui.renderModal();this.ui.onSave();return true;
    }
    return false;
  }
  refocus(sel){const b=document.querySelector(sel);if(b&&!b.disabled)b.focus();else document.querySelector('[data-grow-confirm]')?.focus();}

  render(){
    const g=this.game,p=g.player;this.onOpen();
    const base=deriveStats(g),pend=deriveStats(g,this.pendingAttrs()),preview=this.preview||pend;
    const diff=statDiff(base,preview),frac=p.level>=50?1:Math.min(1,p.xp/xpForLevel(p.level));
    const slots=SLOT_ORDER.map(slot=>{const id=g.equipment[slot],it=GEAR[id];
      return `<button class="doll-slot s-${slot} ${this.filter===slot?'focus':''}" data-gear-filter="${slot}" data-tip="slot" data-tip-id="${slot}" aria-label="${SLOT_INFO[slot].name}: ${esc(it?.name||'empty')}">${it?itemArt(id,it):`<span class="art empty">${gicon(SLOT_INFO[slot].icon)}</span>`}<span class="equip-slot-name">${SLOT_INFO[slot].name}</span></button>`;}).join('');
    const statRow=k=>{const s=STAT_INFO[k],d=diff[k];
      return `<li data-tip="stat" data-tip-id="${k}" class="${d?(d>0?'up':'down'):''}" style="--c:${s.color}">${art(`stat-${k}`,s.icon)}<span>${s.name}</span><b>${s.fmt(preview[k])}</b><em>${d?s.delta(d):''}</em></li>`;};
    const points=g.unspentPoints;
    return `<div class="char">
      <aside class="char-side">
        <div class="doll"><div class="doll-hero"><img data-portrait="12" alt=""/></div>${slots}</div>
        <div class="char-level"><span class="mini-gem">${gicon('plain')}<b>${p.level}</b></span><div class="char-xp" title="Memories toward level ${p.level+1}"><i style="width:${frac*100}%"></i></div></div>
        <p class="gear-count">${Object.keys(g.equipment).length} / ${SLOT_ORDER.length} slots worn</p>
        <ul class="stat-sheet">${STAT_ORDER.slice(0,7).map(statRow).join('')}</ul>
        <details class="spell-stats"><summary>More stats</summary><ul class="stat-sheet">${STAT_ORDER.slice(7).filter(k=>!({ward:'ward',bloom:'nova',bind:'bind',fox:'fox',lance:'surge'})[k]||g.learned.has(({ward:'ward',bloom:'nova',bind:'bind',fox:'fox',lance:'surge'})[k])).map(statRow).join('')}</ul></details>
        <p class="amber" title="Amber · equipment and supplies">${art('icon-amber','gem')}${p.coins}</p>
      </aside>
      <section class="char-main">
        <nav class="char-tabs" role="tablist"><button role="tab" data-char-tab="gear" aria-selected="${this.tab==='gear'}" class="${this.tab==='gear'?'selected':''}">${gicon('bag')}Items${this.ui.hud?.newGear?.size?'<i class="badge new">new</i>':''}</button><button role="tab" data-char-tab="spells" aria-selected="${this.tab==='spells'}" class="${this.tab==='spells'?'selected':''}">${gicon('scroll')}Spells</button><button role="tab" data-char-tab="growth" aria-selected="${this.tab==='growth'}" class="${this.tab==='growth'?'selected':''}">${gicon('star')}Stats${points?`<i class="badge">${points}</i>`:''}</button></nav>
        ${this.tab==='growth'?this.growthPanel():this.tab==='spells'?this.spells.render():this.gearPanel()}
      </section></div>`;
  }
  afterRender(){if(this.celebrate){for(const id of this.celebrate)document.querySelector(`.attr[data-attr="${id}"]`)?.classList.add('grew');this.celebrate=null;}
    if(this.justEquipped){document.querySelector(`[data-equip="${this.justEquipped}"]`)?.classList.add('just');document.querySelector(`.doll-slot.s-${GEAR[this.justEquipped]?.slot}`)?.classList.add('just');this.justEquipped=null;}
    if(this.flash){document.querySelector(`.attr[data-attr="${this.flash}"]`)?.classList.add('bump');this.flash=null;}}

  growthPanel(){
    const g=this.game,avail=this.available,total=g.unspentPoints,pend=this.pendingTotal;
    const orbs=Array.from({length:Math.max(total,0)},(_,i)=>`<i class="${i<pend?'used':''}"></i>`).join('');
    const head=total?`<div class="grow-head"><span class="orbs" aria-label="${avail} of ${total} skill points left">${orbs}</span><p>${avail?`Choose where to grow · <b>${avail}</b> left`:'All points placed · confirm to keep them'}</p></div>`:`<div class="grow-head quiet"><p>${gicon('sprout')} Each level grants 2 skill points. Spend them here or on spells.</p></div>`;
    const attrs=Object.entries(ATTRIBUTES).map(([id,a])=>{const have=g.attributes[id],add=this.pending[id];
      const pips=Array.from({length:Math.min(have+add,30)},(_,i)=>`<i class="${i>=have?'new':''}"></i>`).join('');
      return `<article class="attr ${add?'pending':''}" data-attr="${id}" style="--c:${ATTR_COLOR[id]}">
        <div class="attr-art">${art(`attr-${id}`,ATTR_ART[id])}</div>
        <div class="attr-body"><strong>${a.name}<span class="rank">${have+add}</span></strong><small>${ATTR_SHORT[id]}</small><div class="attr-pips">${pips||'<span class="none">—</span>'}</div></div>
        <div class="attr-act">${add?`<button class="undo" data-grow-undo="${id}" aria-label="Remove a point from ${a.name}">${gicon('minus')}</button>`:''}<button class="grow" data-grow="${id}" data-tip="grow" data-tip-id="${id}" ${avail>0?'':'disabled'} aria-label="Add a point to ${a.name}">${gicon('plus')}</button></div>
      </article>`;}).join('');
    const foot=pend?`<div class="grow-foot"><button data-grow-reset class="ghost">Reset</button><button data-grow-confirm class="primary">${gicon('check')} Confirm stats</button></div>`:'';
    return head+`<div class="attrs">${attrs}</div>`+foot;
  }
  gearPanel(){
    const g=this.game,news=this.ui.hud?.newGear||new Set();
    const chips=['all',...SLOT_ORDER].map(s=>`<button data-gear-filter="${s}" class="${this.filter===s?'selected':''}" aria-label="${s==='all'?'All items':SLOT_INFO[s].name}">${s==='all'?gicon('bag'):gicon(SLOT_INFO[s].icon)}<span>${s==='all'?'All':SLOT_INFO[s].name}</span></button>`).join('');
    const items=g.inventory.filter(id=>GEAR[id]&&(this.filter==='all'||GEAR[id].slot===this.filter))
      .sort((a,b)=>SLOT_ORDER.indexOf(GEAR[a].slot)-SLOT_ORDER.indexOf(GEAR[b].slot));
    const tiles=items.map(id=>{const it=GEAR[id],worn=g.equipment[it.slot]===id,up=!worn&&this.isUpgrade(id);
      return `<button class="tile ${worn?'worn':''} ${this.picked===id?'picked':''}" data-equip="${id}" data-tip="item" data-tip-pos="below" data-tip-id="${id}" aria-pressed="${worn}" aria-label="${esc(it.name)}${worn?' · equipped':''}">${itemArt(id,it)}${worn?`<i class="worn-mark">${gicon('check')}</i>`:''}${up?`<i class="up-mark" title="Upgrade">▲</i>`:''}${news.has(id)?'<i class="new-mark">new</i>':''}</button>`;}).join('');
    const hint=this.pointer==='touch'?'Tap an item to compare, tap again to equip.':'Hover an item to compare · click to equip.';
    const worn=Object.entries(g.equipment).filter(([slot])=>this.filter==='all'||slot===this.filter);
    return `<div class="gear-filter">${chips}</div><div class="tiles">${tiles||'<p class="empty-note">Nothing here yet. Bounties and markets offer new equipment.</p>'}</div><p class="gear-hint">${hint}</p><div class="remove-gear">${worn.map(([slot,id])=>`<button data-unequip="${slot}" aria-label="Remove ${esc(GEAR[id].name)}">Remove ${SLOT_INFO[slot].name.toLowerCase()}</button>`).join('')}</div><a class="item-library-link" href="./item-library.html" target="_blank" rel="noopener">Item sprite library · 128 drawings ↗</a>`;
  }
  isUpgrade(id){const g=this.game,eq={...g.equipment,[GEAR[id].slot]:id},d=statDiff(deriveStats(g),deriveStats(g,g.attributes,eq));return Object.values(d).some(v=>v>0)&&!Object.values(d).some(v=>v<0);}

  // ---------- hover cards & live preview ----------
  hover(target){
    const el=target?.closest?.('[data-tip]');if(!el||!document.querySelector('.char'))return;
    const g=this.game,kind=el.dataset.tip,id=el.dataset.tipId;let html='',preview=null;
    if(kind==='item'){const it=GEAR[id],slot=it.slot,cur=g.equipment[slot],worn=cur===id;
      const eq={...g.equipment,[slot]:id},base=deriveStats(g,this.pendingAttrs()),next=deriveStats(g,this.pendingAttrs(),eq),d=statDiff(base,next);
      if(!worn)preview=next;
      html=`<header>${itemArt(id,it,'tip-art')}<div><b>${esc(it.name)}</b><small>${SLOT_INFO[slot].name}${worn?' · equipped':''}</small></div></header>
        <ul class="tip-stats">${Object.entries(it.stats).map(([k,v])=>GEAR_STAT[k]?`<li>${gicon(GEAR_STAT[k].icon)}${GEAR_STAT[k].text(v)}</li>`:'').join('')||'<li class="dim">No bonuses</li>'}</ul>
        ${worn?'':`<div class="tip-compare"><small>${cur?`Compared with ${esc(GEAR[cur].name)}`:'Fills an empty slot'}</small>${this.diffList(d)}</div>`}
        ${it.description&&!/^[+\d]/.test(it.description)?`<p class="tip-flavor">${esc(it.description)}</p>`:''}
        <p class="tip-act">${worn?'Currently worn':this.pointer==='touch'?'Tap again to equip':'Click to equip'}</p>`;}
    else if(kind==='grow'){const base=deriveStats(g,this.pendingAttrs()),next=deriveStats(g,this.pendingAttrs(id)),d=statDiff(base,next);preview=next;
      html=`<header>${art(`attr-${id}`,ATTR_ART[id],'tip-art')}<div><b>+1 ${ATTRIBUTES[id].name}</b><small>${ATTR_SHORT[id]}</small></div></header><div class="tip-compare">${this.diffList(d)}</div><p class="tip-flavor">${esc(ATTRIBUTES[id].description)}</p>`;}
    else if(kind==='stat'){const s=STAT_INFO[id];html=`<header>${art(`stat-${id}`,s.icon,'tip-art')}<div><b>${s.name}</b><small>${s.fmt(deriveStats(g)[id])}</small></div></header><p class="tip-flavor">${s.about}</p>`;}
    else if(kind==='slot'){const cur=g.equipment[id],it=GEAR[cur];html=`<header>${it?itemArt(cur,it,'tip-art'):art('slot-'+id,SLOT_INFO[id].icon,'tip-art')}<div><b>${it?esc(it.name):'Empty'}</b><small>${SLOT_INFO[id].name}</small></div></header>${it?`<ul class="tip-stats">${Object.entries(it.stats).map(([k,v])=>GEAR_STAT[k]?`<li>${gicon(GEAR_STAT[k].icon)}${GEAR_STAT[k].text(v)}</li>`:'').join('')}</ul>`:''}<p class="tip-flavor">${SLOT_INFO[id].hint} Click to show only ${SLOT_INFO[id].name.toLowerCase()}s.</p>`;}
    if(!html)return;
    this.showTip(el,html);
    if(preview!==this.preview){this.preview=preview;this.updateSheet();}
  }
  unhover(){this.hideTip();if(this.preview){this.preview=null;this.updateSheet();}}
  diffList(d){const keys=Object.keys(d);if(!keys.length)return '<p class="dim">No change to your numbers</p>';
    return `<ul class="tip-diff">${keys.map(k=>`<li class="${d[k]>0?'up':'down'}">${gicon(STAT_INFO[k].icon)}<span>${STAT_INFO[k].name}</span><b>${STAT_INFO[k].delta(d[k])}</b></li>`).join('')}</ul>`;}
  updateSheet(){
    const sheets=document.querySelectorAll('.stat-sheet');if(!sheets.length)return;
    const g=this.game,base=deriveStats(g),shown=this.preview||deriveStats(g,this.pendingAttrs()),d=statDiff(base,shown);
    for(const sheet of sheets)for(const li of sheet.children){const k=li.dataset.tipId,s=STAT_INFO[k];li.className=d[k]?(d[k]>0?'up':'down'):'';li.querySelector('b').textContent=s.fmt(shown[k]);li.querySelector('em').textContent=d[k]?s.delta(d[k]):'';}
  }
  showTip(anchor,html){
    let tip=document.getElementById('game-tip');
    if(!tip){tip=document.createElement('div');tip.id='game-tip';tip.className='game-tip';tip.setAttribute('role','tooltip');document.body.appendChild(tip);}
    tip.innerHTML=html;tip.classList.add('shown');clearTimeout(this.tipTimer);if(this.pointer==='touch')this.tipTimer=setTimeout(()=>this.hideTip(),2600);
    const r=anchor.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight,vw=innerWidth,vh=innerHeight;
    let x=r.right+10,y=r.top+r.height/2-h/2;
    if(anchor.dataset.tipPos==='below'){x=Math.max(8,Math.min(vw-w-8,r.left+r.width/2-w/2));y=r.bottom+10;if(y+h>vh-8)y=r.top-h-10;}
    else{
      if(x+w>vw-8)x=r.left-w-10;
      if(x<8){x=Math.max(8,Math.min(vw-w-8,r.left+r.width/2-w/2));y=r.top-h-10;if(y<8)y=r.bottom+10;}
    }
    tip.style.left=`${Math.round(x)}px`;tip.style.top=`${Math.round(Math.max(8,Math.min(vh-h-8,y)))}px`;
  }
  hideTip(){document.getElementById('game-tip')?.classList.remove('shown');}
}
