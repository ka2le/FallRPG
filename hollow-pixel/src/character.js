// Character screen: equipment paper doll, live stat sheet, growth with a
// confirm step, and hover cards that show the exact change before you commit.
import { STANCES,SPELL_BY_ID } from './data.js';
import { ATTRIBUTES, playerStats, xpForLevel } from './progression.js';
import { GEAR } from './adventure.js';
import { SLOT_ACCEPTS } from './items.js';
import { effectiveSpell } from './spell-effects.js';
import { SpellScreen } from './spell-screen.js';
import { gicon, itemArt, art, SLOT_INFO, SLOT_ORDER, EQUIP_SLOT_INFO, EQUIPMENT_SLOTS, slotAccepts, STAT_INFO, STAT_ORDER, GEAR_STAT, ATTR_ART, ATTR_COLOR, ATTR_SHORT } from './ui-art.js';

const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const EPS=1e-6;
const WHOLE_STATS=new Set(['health','mana','damage','ward','bloom','fox','lance','tonic']);

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
export function statDiff(a,b){const out={};for(const k of STAT_ORDER){const d=WHOLE_STATS.has(k)?Math.round(b[k])-Math.round(a[k]):b[k]-a[k];if(Math.abs(d)>EPS)out[k]=d;}return out;}

export class CharacterScreen{
  constructor(ui){this.ui=ui;this.game=ui.game;this.tab=null;this.filter='all';this.pending={power:0,mana:0};this.preview=null;this.picked=null;this.pointer='mouse';this.spells=new SpellScreen(ui);
    document.addEventListener('pointerdown',e=>{this.pointer=e.pointerType||'mouse';},true);
    document.addEventListener('pointerover',e=>this.hover(e.target));
    document.addEventListener('focusin',e=>this.hover(e.target));
    document.addEventListener('pointerout',e=>{if(e.target.closest?.('[data-tip]')&&!e.relatedTarget?.closest?.('[data-tip]'))this.unhover();});
    document.addEventListener('pointerdown',e=>this.dragStart(e));
    document.addEventListener('pointermove',e=>this.dragMove(e));
    document.addEventListener('pointerup',e=>this.dragEnd(e));
    document.addEventListener('pointercancel',()=>this.dragCancel());
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&this.drag?.active){e.stopPropagation();this.dragCancel();}},true);
  }
  get pendingTotal(){return Object.values(this.pending).reduce((a,b)=>a+b,0);}
  get available(){return this.game.unspentPoints-this.pendingTotal;}
  pendingAttrs(extra){const a={...this.game.attributes};for(const k in this.pending)a[k]+=this.pending[k];if(extra)a[extra]++;return a;}
  reset(){this.pending={power:0,mana:0};this.preview=null;this.picked=null;this.hideTip();}
  onOpen(){if(!this.tab)this.tab=this.game.unspentPoints>0?'growth':'gear';}
  onClose(){this.leaveGear();this.reset();this.tab=null;this.dragCancel();}
  setTab(tab){if(tab===this.tab)return;this.leaveGear();this.tab=tab;}
  // "New" marks: once the Items tab has been looked at, leaving it (another tab
  // or closing) clears them all. Touching an item clears its own mark at once.
  leaveGear(){if(this.viewedGear)this.ui.hud?.seen();this.viewedGear=false;}
  markSeen(id){const news=this.ui.hud?.newGear;if(!news?.delete(id))return;for(const el of document.querySelectorAll(`.tile[data-equip="${CSS.escape(id)}"] .new-mark`))el.remove();}

  // Returns true when the click belonged to this screen.
  click(el){
    const g=this.game;
    if(this.spells?.click(el))return true;
    if(el.dataset.charTab){this.setTab(el.dataset.charTab);this.ui.renderModal();return true;}
    if(this.suppressClick){this.suppressClick=false;return true;}
    if(el.dataset.unequip){
      const slot=el.dataset.unequip;
      if(this.pointer==='touch'&&this.picked!==`slot:${slot}`){this.picked=`slot:${slot}`;this.hover(el);return true;}
      this.takeOff(slot);return true;}
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
      const id=el.dataset.equip;this.markSeen(id);
      // On touch, the first tap previews; a second tap on the same item acts.
      if(this.pointer==='touch'&&this.picked!==id){this.picked=id;this.ui.renderModal();const t=document.querySelector(`[data-equip="${id}"]`);t?.focus();this.hover(t);return true;}
      const worn=g.wornSlot(id);if(worn){this.takeOff(worn);return true;}
      this.putOn(id);return true;
    }
    return false;
  }
  putOn(id,slot){const g=this.game;if(!g.equip(id,slot))return false;this.picked=null;this.justEquipped=id;this.preview=null;this.hideTip();this.ui.renderModal();this.ui.onSave();return true;}
  takeOff(slot){const g=this.game;if(!g.unequip(slot))return false;this.picked=null;this.preview=null;this.hideTip();this.ui.renderModal();this.ui.onSave();return true;}

  // ---------- drag & drop (mouse and pen; touch uses tap-to-preview, tap-to-act) ----------
  dragStart(e){
    if(e.pointerType==='touch'||e.button!==0)return;
    const src=e.target.closest?.('[data-drag]');if(!src||!src.closest('.char'))return;
    this.drag={id:src.dataset.drag,from:src.dataset.from,x:e.clientX,y:e.clientY,active:false,src};this.markSeen(src.dataset.drag);
  }
  dragMove(e){
    const d=this.drag;if(!d)return;
    if(!d.active){if(Math.hypot(e.clientX-d.x,e.clientY-d.y)<6)return;d.active=true;this.hideTip();
      const ghost=document.createElement('div');ghost.className='drag-ghost';ghost.innerHTML=itemArt(d.id,GEAR[d.id]);document.body.appendChild(ghost);d.ghost=ghost;
      document.body.classList.add('dragging-item');d.src.classList.add('drag-source');
      const type=GEAR[d.id].slot;for(const el of document.querySelectorAll('[data-drop]')){const slot=el.dataset.drop;el.classList.toggle('can-drop',slot==='bag'?d.from!=='bag':SLOT_ACCEPTS[slot]?.includes(type));}}
    d.ghost.style.transform=`translate(${e.clientX-28}px,${e.clientY-28}px)`;
    const over=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-drop]');
    if(over!==d.over){d.over?.classList.remove('drop-over');d.over=over;if(over?.classList.contains('can-drop'))over.classList.add('drop-over');
      // Live stat preview while hovering a valid slot.
      this.preview=over?.classList.contains('can-drop')&&over.dataset.drop!=='bag'?deriveStats(this.game,this.pendingAttrs(),this.equipPreview(d.id,over.dataset.drop)):over?.dataset.drop==='bag'&&d.from!=='bag'?deriveStats(this.game,this.pendingAttrs(),this.removePreview(d.from)):null;this.updateSheet();}
  }
  dragEnd(e){
    const d=this.drag;if(!d)return;this.drag=null;if(!d.active)return;
    const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-drop]'),ok=target?.classList.contains('can-drop');this.cleanupDrag(d);this.suppressClick=true;setTimeout(()=>this.suppressClick=false,0);
    if(!ok){this.preview=null;this.updateSheet();return;}
    const slot=target.dataset.drop;
    if(slot==='bag')this.takeOff(d.from);else this.putOn(d.id,slot);
  }
  dragCancel(){const d=this.drag;this.drag=null;if(d?.active){this.cleanupDrag(d);this.preview=null;this.updateSheet();}}
  cleanupDrag(d){d.ghost?.remove();document.body.classList.remove('dragging-item');d.src?.classList.remove('drag-source');for(const el of document.querySelectorAll('.can-drop,.drop-over'))el.classList.remove('can-drop','drop-over');}
  equipPreview(id,slot){const g=this.game,eq={...g.equipment},from=g.wornSlot(id);slot=slot||g.slotFor(id);if(from&&from!==slot){if(eq[slot])eq[from]=eq[slot];else delete eq[from];}eq[slot]=id;return eq;}
  removePreview(slot){const eq={...this.game.equipment};delete eq[slot];return eq;}

  refocus(sel){const b=document.querySelector(sel);if(b&&!b.disabled)b.focus();else document.querySelector('[data-grow-confirm]')?.focus();}

  render(){
    const g=this.game,p=g.player;this.onOpen();if(this.tab==='gear')this.viewedGear=true;
    const base=deriveStats(g),pend=deriveStats(g,this.pendingAttrs()),preview=this.preview||pend;
    const diff=statDiff(base,preview),frac=p.level>=50?1:Math.min(1,p.xp/xpForLevel(p.level));
    const slot=k=>{const id=g.equipment[k],it=GEAR[id],info=EQUIP_SLOT_INFO[k];
      return `<button class="doll-slot s-${k} ${it?'filled':''} ${this.picked===`slot:${k}`?'picked':''}" data-drop="${k}" ${it?`data-drag="${id}" data-from="${k}" data-unequip="${k}"`:''} data-tip="slot" data-tip-id="${k}" aria-label="${info.name}: ${esc(it?.name||'empty')}">${it?itemArt(id,it):`<span class="art empty">${gicon(info.icon)}</span>`}</button>`;};
    const slots=['head','weapon','offhand','robe','boots'].map(slot).join('');
    const trinkets=['trinket1','trinket2','trinket3'].map(slot).join('');
    const statRow=k=>{const s=STAT_INFO[k],d=diff[k];
      return `<li data-tip="stat" data-tip-id="${k}" class="${d?(d>0?'up':'down'):''}" style="--c:${s.color}">${art(`stat-${k}`,s.icon)}<span>${s.name}</span><b>${s.fmt(preview[k])}</b><em>${d?s.delta(d):''}</em></li>`;};
    const points=g.unspentPoints;
    return `${this.topBar()}<div class="char">
      <aside class="char-side">
        <div class="doll"><div class="doll-hero"><img data-portrait="12" alt=""/></div>${slots}</div>
        <div class="trinkets" aria-label="Trinkets">${trinkets}</div>
        <div class="char-level"><span class="mini-gem">${gicon('plain')}<b>${p.level}</b></span><div class="char-xp" title="Memories toward level ${p.level+1}"><i style="width:${frac*100}%"></i></div></div>
        <ul class="stat-sheet">${STAT_ORDER.slice(0,7).map(statRow).join('')}</ul>
        <details class="spell-stats"><summary>More stats</summary><ul class="stat-sheet">${STAT_ORDER.slice(7).filter(k=>!({ward:'ward',bloom:'nova',bind:'bind',fox:'fox',lance:'surge'})[k]||g.learned.has(({ward:'ward',bloom:'nova',bind:'bind',fox:'fox',lance:'surge'})[k])).map(statRow).join('')}</ul></details>
        <p class="amber" title="Amber · equipment and supplies">${art('icon-amber','gem')}${p.coins}</p>
      </aside>
      <section class="char-main">
        ${this.tab==='growth'?this.growthPanel():this.tab==='spells'?this.spells.render():this.gearPanel()}
      </section></div>`;
  }
  afterRender(){if(this.celebrate){for(const id of this.celebrate)document.querySelector(`.attr[data-attr="${id}"]`)?.classList.add('grew');this.celebrate=null;}
    if(this.justEquipped){document.querySelector(`[data-equip="${this.justEquipped}"]`)?.classList.add('just');document.querySelector(`.doll-slot.s-${this.game.wornSlot(this.justEquipped)}`)?.classList.add('just');this.justEquipped=null;}
    if(this.flash){document.querySelector(`.attr[data-attr="${this.flash}"]`)?.classList.add('bump');this.flash=null;}}

  // One bar for the whole screen: the tabs, plus the shared skill-point pool.
  // Tabs where points can be spent glow; the count lives only here.
  topBar(){
    const g=this.game,total=g.unspentPoints,avail=this.available,pend=this.pendingTotal,spellOk=avail>0&&this.spells.spendable(avail);
    const keyOf={gear:'I',spells:'K'};
    const tab=(id,icon,name,extra='',spend=false)=>`<button role="tab" data-char-tab="${id}" aria-label="${name}" aria-selected="${this.tab===id}" class="${this.tab===id?'selected':''} ${spend?'can-spend':''}" ${spend?`title="Spend skill points here"`:''}>${gicon(icon)}<span>${name}</span>${spend?'<i class="spend-pip" aria-hidden="true"></i>':''}${extra}${keyOf[id]?`<kbd class="tab-key">${keyOf[id]}</kbd>`:''}</button>`;
    const orbs=Array.from({length:Math.min(total,12)},(_,i)=>`<i class="${i>=avail?'used':''}"></i>`).join('');
    return `<div class="char-top">
      <nav class="char-tabs" role="tablist">${tab('gear','bag','Items',this.ui.hud?.newGear?.size&&this.tab!=='gear'?'<i class="badge new" aria-hidden="true">new</i>':'')}${tab('spells','scroll','Spells','',spellOk)}${tab('growth','star','Stats','',avail>0)}</nav>
      <div class="pb-count ${avail?'':'empty'}" title="Skill points · 2 each level · spend on spells or stats" aria-label="${avail} skill points">${total?`<span class="pb-orbs" aria-hidden="true">${orbs}</span>`:gicon('facet','pb-none')}<b>${avail}</b><small>skill point${avail===1?'':'s'}${pend?` · ${pend} placed`:''}</small></div>
    </div>`;
  }
  growthPanel(){
    const g=this.game,avail=this.available,total=g.unspentPoints,pend=this.pendingTotal;
    const head=pend?`<div class="grow-head"><p>${pend} point${pend>1?'s':''} placed · <b>confirm</b> to keep ${pend>1?'them':'it'}</p></div>`:'';
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
    const g=this.game,news=this.ui.hud?.newGear||new Set(),type=id=>SLOT_ORDER.indexOf(GEAR[id].slot);
    // Worn items first (in body order), then the rest of the bag by type and level.
    const rank=id=>{const w=EQUIPMENT_SLOTS.indexOf(g.wornSlot(id));return w>=0?w:100+type(id);};
    const items=g.inventory.filter(id=>GEAR[id]).sort((a,b)=>rank(a)-rank(b)||(GEAR[a].level||0)-(GEAR[b].level||0));
    const tiles=items.map(id=>{const it=GEAR[id],worn=!!g.wornSlot(id),up=!worn&&this.isUpgrade(id);
      return `<button class="tile ${worn?'worn':''} ${this.picked===id?'picked':''}" data-equip="${id}" data-drag="${id}" data-from="bag" data-tip="item" data-tip-pos="below" data-tip-id="${id}" data-type="${it.slot}" aria-pressed="${worn}" aria-label="${esc(it.name)}${worn?' · equipped':''}">${itemArt(id,it)}${worn?`<i class="worn-mark">${gicon('check')}</i>`:''}${up?`<i class="up-mark">▲</i>`:''}${news.has(id)?'<i class="new-mark">new</i>':''}</button>`;}).join('');
    return `<div class="bag" data-drop="bag"><div class="tiles">${tiles||'<p class="empty-note">Your bag is empty.</p>'}</div></div><a class="item-library-link" href="./item-library.html" target="_blank" rel="noopener" title="Item sprite library">${gicon('bag')}128</a>`;
  }
  isUpgrade(id){const g=this.game,eq=this.equipPreview(id),d=statDiff(deriveStats(g),deriveStats(g,g.attributes,eq));return Object.values(d).some(v=>v>0)&&!Object.values(d).some(v=>v<0);}

  // ---------- hover cards & live preview ----------
  hover(target){
    if(this.drag?.active)return;
    const el=target?.closest?.('[data-tip]');if(!el||!document.querySelector('.char, .shop-window, .qc'))return;
    const g=this.game,kind=el.dataset.tip,id=el.dataset.tipId;let html='',preview=null;
    if(kind==='item')this.markSeen(id);
    if(kind==='item'||kind==='shop'||kind==='reward'){const it=GEAR[id],owned=g.inventory.includes(id),worn=!!g.wornSlot(id),slot=g.slotFor(id),cur=worn?null:g.equipment[slot];
      const eq=worn?this.removePreview(g.wornSlot(id)):this.equipPreview(id),base=deriveStats(g,this.pendingAttrs()),next=deriveStats(g,this.pendingAttrs(),eq),d=statDiff(base,next);
      preview=next;
      html=`<header>${itemArt(id,it,'tip-art')}<div><b>${esc(it.name)}</b><small>${SLOT_INFO[it.slot].name}${worn?' · worn':''}</small></div></header>
        <ul class="tip-stats">${Object.entries(it.stats).map(([k,v])=>GEAR_STAT[k]?`<li>${gicon(GEAR_STAT[k].icon)}${GEAR_STAT[k].text(v)}</li>`:'').join('')||'<li class="dim">No bonuses</li>'}</ul>
        <div class="tip-compare"><small>${worn?'If you take it off':cur?`Replaces ${esc(GEAR[cur].name)}`:`Goes in ${EQUIP_SLOT_INFO[slot].name.toLowerCase()}`}</small>${this.diffList(d)}</div>
        ${it.description&&!/^[+\d]/.test(it.description)?`<p class="tip-flavor">${esc(it.description)}</p>`:''}
        <p class="tip-act">${kind==='reward'?(owned?'Bounty reward · already owned':'Bounty reward'):kind==='shop'?(owned?'Owned':g.player.level<(it.level||1)?`Reach level ${it.level}`:`${it.price} amber · click to choose`):this.pointer==='touch'?(worn?'Tap again to take off':'Tap again to equip'):(worn?'Click or drag to bag to take off':'Click or drag to a slot')}</p>`;}
    else if(kind==='grow'){const base=deriveStats(g,this.pendingAttrs()),next=deriveStats(g,this.pendingAttrs(id)),d=statDiff(base,next);preview=next;
      html=`<header>${art(`attr-${id}`,ATTR_ART[id],'tip-art')}<div><b>+1 ${ATTRIBUTES[id].name}</b><small>${ATTR_SHORT[id]}</small></div></header><div class="tip-compare">${this.diffList(d)}</div><p class="tip-flavor">${esc(ATTRIBUTES[id].description)}</p>`;}
    else if(kind==='stat'){const s=STAT_INFO[id];html=`<header>${art(`stat-${id}`,s.icon,'tip-art')}<div><b>${s.name}</b><small>${s.fmt(deriveStats(g)[id])}</small></div></header><p class="tip-flavor">${s.about}</p>`;}
    else if(kind==='slot'){const cur=g.equipment[id],it=GEAR[cur],info=EQUIP_SLOT_INFO[id];
      if(it){const d=statDiff(deriveStats(g,this.pendingAttrs()),deriveStats(g,this.pendingAttrs(),this.removePreview(id)));preview=deriveStats(g,this.pendingAttrs(),this.removePreview(id));
        html=`<header>${itemArt(cur,it,'tip-art')}<div><b>${esc(it.name)}</b><small>${info.name} · ${SLOT_INFO[it.slot].name}</small></div></header><ul class="tip-stats">${Object.entries(it.stats).map(([k,v])=>GEAR_STAT[k]?`<li>${gicon(GEAR_STAT[k].icon)}${GEAR_STAT[k].text(v)}</li>`:'').join('')}</ul><div class="tip-compare"><small>If you take it off</small>${this.diffList(d)}</div><p class="tip-act">${this.pointer==='touch'?'Tap again to take off':'Click or drag to bag to take off'}</p>`;}
      else html=`<header>${art('slot-'+id,info.icon,'tip-art')}<div><b>${info.name}</b><small>Empty</small></div></header><p class="tip-flavor" style="font-style:normal">Fits ${slotAccepts(id).join(', ').toLowerCase()}.</p>`;
      this.markFits(id);}
    else if(kind==='spell')html=this.spells.tip(id);
    if(!html)return;
    this.showTip(el,html);
    if(preview!==this.preview){this.preview=preview;this.updateSheet();}
  }
  unhover(){this.markFits(null);this.hideTip();if(this.preview){this.preview=null;this.updateSheet();}}
  markFits(slot){const ok=slot?SLOT_ACCEPTS[slot]:null;document.querySelector('.bag')?.classList.toggle('filtering',!!ok);for(const t of document.querySelectorAll('.bag .tile'))t.classList.toggle('fits',!!ok&&ok.includes(t.dataset.type));}
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
    const book=anchor.closest('.spellbook')?.getBoundingClientRect();
    if(book&&vw>650){x=book.right+10;if(x+w>vw-8)x=book.left-w-10;y=r.top+r.height/2-h/2;}
    else if(anchor.dataset.tipPos==='below'){x=Math.max(8,Math.min(vw-w-8,r.left+r.width/2-w/2));y=r.bottom+10;if(y+h>vh-8)y=r.top-h-10;}
    else{
      if(x+w>vw-8)x=r.left-w-10;
      if(x<8){x=Math.max(8,Math.min(vw-w-8,r.left+r.width/2-w/2));y=r.top-h-10;if(y<8)y=r.bottom+10;}
    }
    tip.style.left=`${Math.round(x)}px`;tip.style.top=`${Math.round(Math.max(8,Math.min(vh-h-8,y)))}px`;
  }
  hideTip(){document.getElementById('game-tip')?.classList.remove('shown');}
}
