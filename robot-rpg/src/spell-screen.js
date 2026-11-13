import { ACTIVE_SPELLS, SLOTS, SPELL_BY_ID } from './data.js';
import { LESSONS } from './adventure.js';
import { SPELL_UPGRADES } from './spell-effects.js';
import { gicon } from './ui-art.js';
import { wholeNumber } from './display-numbers.js';

// Spellbook: every spell on one spread. Each entry shows only what matters in
// the moment (mana cost and its main effect). Everything else lives on hover.
const n=v=>Number.isInteger(v)?String(v):(+v.toFixed(1)).toString();
const kinds={surge:'Next attack',ward:'Shield',nova:'Burst',haste:'Escape',bind:'Root',fox:'Companion',renew:'Healing'};

// The one headline number for each spell, with an icon and colour that say what it is.
function headline(id,s){
  if(s.damage&&id!=='fox')return {icon:'spark',cls:'dmg',value:wholeNumber(s.damage),label:'damage'};
  if(id==='fox')return {icon:'spark',cls:'dmg',value:wholeNumber(s.damage),label:'per bite'};
  if(s.shield)return {icon:'shield',cls:'shield',value:wholeNumber(s.shield),label:'shield'};
  if(s.healing)return {icon:'heart',cls:'heal',value:wholeNumber(s.healing),label:'healing'};
  if(id==='haste')return {icon:'boot',cls:'speed',value:`+${Math.round((s.hasteSpeed-1)*100)}%`,label:'speed'};
  if(s.duration)return {icon:'sprout',cls:'root',value:`${n(s.duration)}s`,label:'root'};
  return null;
}

export class SpellScreen{
  constructor(ui){this.ui=ui;this.bindMode=false;this.held=null;this.heldSlot=null;}
  get game(){return this.ui.game;}
  click(el){
    const g=this.game,available=this.ui.character.available;
    if(el.hasAttribute('data-rebind')){this.bindMode=!this.bindMode;this.held=this.heldSlot=null;this.ui.renderModal();return true;}
    if(el.dataset.spellSelect){
      const id=el.dataset.spellSelect;if(!g.learned.has(id))return true;
      if(this.heldSlot){g.setBinding(this.heldSlot,id);this.flashSlot=this.heldSlot;this.heldSlot=null;this.changed();return true;}
      // Clicking a spell starts rebinding it: choose a key next.
      this.bindMode=true;this.held=this.held===id?null:id;this.ui.renderModal();return true;
    }
    if(el.dataset.bindSlot){
      const k=el.dataset.bindSlot;
      if(this.held){g.setBinding(k,g.bindings[k]===this.held?'':this.held);this.flashSlot=k;this.held=null;this.changed();return true;}
      this.heldSlot=this.heldSlot===k?null:k;this.ui.renderModal();return true;
    }
    if(el.dataset.learn){if(available>=(LESSONS[el.dataset.learn]?.points||1)&&g.learn(el.dataset.learn))this.justLearned=el.dataset.learn;this.changed();return true;}
    if(el.dataset.upgradeSpell){if(available>=1&&g.upgradeSpell(el.dataset.upgradeSpell))this.justFocused=el.dataset.upgradeSpell;this.changed();return true;}
    if(el.hasAttribute('data-auto-surge')){g.toggleAutoSurge();this.changed();return true;}
    return false;
  }
  changed(){this.ui.renderActions();this.ui.renderModal();this.ui.onSave();this.after();}
  after(){
    for(const [key,cls] of [['justLearned','learned-now'],['justFocused','focused-now']])if(this[key]){document.querySelector(`.spell-entry[data-spell="${this[key]}"]`)?.classList.add(cls);this[key]=null;}
    if(this.flashSlot){document.querySelector(`[data-bind-slot="${this.flashSlot}"]`)?.classList.add('set-now');this.flashSlot=null;}
  }
  // True when skill points could buy something in the spellbook right now.
  spendable(available){
    const g=this.game;if(available<1)return false;
    return ACTIVE_SPELLS.some(s=>{const l=LESSONS[s.id];
      if(g.learned.has(s.id))return !!SPELL_UPGRADES[s.id]&&!g.spellUpgrades.has(s.id);
      return !!l&&g.player.level>=l.level&&available>=(l.points||1)&&(!l.requires||g.learned.has(l.requires));});
  }
  keysFor(id){return SLOTS.filter(k=>this.game.bindings[k]===id);}

  entry(spell){
    const g=this.game,id=spell.id,known=g.learned.has(id),l=LESSONS[id],available=this.ui.character.available;
    const s=g.spellValues(id),h=headline(id,s),focused=g.spellUpgrades.has(id),u=SPELL_UPGRADES[id];
    const ready=!known&&l&&g.player.level>=l.level&&(!l.requires||g.learned.has(l.requires));
    const keys=this.bindMode&&known?`<span class="se-keys">${this.keysFor(id).map(k=>`<kbd>${k.toUpperCase()}</kbd>`).join('')||'<em>no key</em>'}</span>`:'';
    const metrics=`<span class="spell-metrics"><span class="sm mana" aria-label="${wholeNumber(s.cost)} mana">${gicon('drop')}<b>${wholeNumber(s.cost)}</b></span>${h?`<span class="sm ${h.cls}" aria-label="${h.value} ${h.label}">${gicon(h.icon)}<b>${h.value}</b></span>`:''}</span>`;
    let side='';
    if(known)side=u?`<button class="se-focus ${focused?'done':''}" data-upgrade-spell="${id}" ${focused||available<1?'disabled':''} aria-label="${focused?`${spell.name} is focused`:`Focus ${spell.name} for 1 skill point`}">${gicon('star')}${focused?'':'<small>1</small>'}</button>`:'';
    else if(ready)side=`<button class="se-learn" data-learn="${id}" ${available>=(l.points||1)?'':'disabled'} aria-label="Learn ${spell.name} for ${l.points||1} skill point">Learn <span>${gicon('facet')}${l.points||1}</span></button>`;
    else side=`<span class="se-lock">${gicon('warn')}Lv ${l?.level||1}</span>`;
    const auto=id==='surge'&&known?`<button class="se-auto ${g.autoSurge?'on':''}" data-auto-surge aria-pressed="${g.autoSurge}" aria-label="Auto-cast Aether Lance" title="Auto-cast · use Lance whenever mana allows">${gicon('regen')}</button>`:'';
    return `<article class="spell-entry ${known?'known-spell':'unknown'} ${ready?'ready':''} ${focused?'is-focused':''} ${this.held===id?'held':''}" data-spell="${id}" data-tip="spell" data-tip-id="${id}" style="--spell:${spell.color}">
      <button class="se-main" data-spell-select="${id}" ${known?'':'tabindex="-1"'} aria-label="${spell.name}${known?' · click to choose its key':''}"><span class="se-rune">${this.ui.spellIcon(id)}${focused?`<i class="se-star">${gicon('star')}</i>`:''}</span><span class="se-name"><b>${spell.name}</b><small>${kinds[id]||''}</small></span>${keys}${known?metrics:''}</button>${auto}${side}
    </article>`;
  }
  render(){
    const g=this.game,learned=ACTIVE_SPELLS.filter(s=>g.learned.has(s.id));
    const order=[...ACTIVE_SPELLS].sort((a,b)=>(LESSONS[a.id]?.level||0)-(LESSONS[b.id]?.level||0));
    const half=Math.ceil(order.length/2);
    const page=list=>`<div class="sb-page">${list.map(s=>this.entry(s)).join('')}</div>`;
    const bar=this.bindMode?`<div class="sb-keys"><p>${this.held?`Choose a key for <b style="color:${SPELL_BY_ID[this.held].color}">${SPELL_BY_ID[this.held].name}</b>`:this.heldSlot?`Now pick a spell for <kbd>${this.heldSlot.toUpperCase()}</kbd>`:'Click a spell, then a key'}</p><div class="sb-slots">${SLOTS.map(k=>{const id=g.bindings[k],sp=SPELL_BY_ID[id],live=id&&g.learned.has(id);
      return `<button data-bind-slot="${k}" class="${this.heldSlot===k?'held':''} ${live?'':'empty'}" style="--spell:${live?sp.color:'#5d6a4c'}" aria-label="Key ${k.toUpperCase()}: ${live?sp.name:'empty'}">${live?this.ui.spellIcon(id):''}<kbd>${k.toUpperCase()}</kbd></button>`;}).join('')}</div></div>`:'';
    return `<div class="spellbook ${this.bindMode?'binding':''}">
      <div class="sb-head"><h3>${gicon('scroll')}Grimoire</h3><button class="sb-rebind ${this.bindMode?'on':''}" data-rebind aria-pressed="${this.bindMode}">${this.bindMode?`${gicon('check')}Done`:'Bindings'}</button></div>
      ${learned.length?'':`<p class="no-spells">${gicon('spark')}Your basic spark is always ready. Learn a first spell below.</p>`}
      <div class="sb-spread">${page(order.slice(0,half))}${page(order.slice(half))}</div>
      ${bar}
    </div>`;
  }
  tip(id){
    const g=this.game,sp=SPELL_BY_ID[id],s=g.spellValues(id),u=SPELL_UPGRADES[id],focused=g.spellUpgrades.has(id),known=g.learned.has(id),l=LESSONS[id];
    const rows=[];const row=(icon,label,value)=>rows.push(`<li>${gicon(icon)}<span>${label}</span><b>${value}</b></li>`);
    row('drop','Mana',wholeNumber(s.cost));
    if(s.damage)row('spark',id==='fox'?'Damage per bite':'Damage',wholeNumber(s.damage));
    if(s.shield)row('shield','Shield',wholeNumber(s.shield));
    if(s.healing)row('heart','Healing',wholeNumber(s.healing));
    if(id==='haste')row('boot','Move speed',`+${Math.round((s.hasteSpeed-1)*100)}%`);
    if(s.duration&&id!=='renew')row('regen','Lasts',`${n(s.duration)}s`);
    if(id==='renew')row('regen','Heals over',`${n(s.healDuration)}s`);
    if(s.radius)row('gem','Radius',wholeNumber(s.radius));
    if(s.slow)row('boot','Slows',`${n(s.slow)}s`);
    row('regen','Recovery',`${n(g.spellCooldown(id))}s`);
    const keys=this.keysFor(id);
    return `<header><span class="tip-art" style="color:${sp.color}">${this.ui.spellIcon(id)}</span><div><b>${sp.name}</b><small>${kinds[id]||''}${known&&keys.length?` · key ${keys.map(k=>k.toUpperCase()).join(' / ')}`:''}</small></div></header>
      <p class="tip-flavor" style="font-style:normal;margin-top:0!important">${sp.description}</p>
      <ul class="tip-stats tip-spell">${rows.join('')}</ul>
      ${u?`<div class="tip-compare tip-focus ${focused?'on':''}"><small>${gicon('star')} Focus · ${u.name}${focused?' · active':' · 1 skill point'}</small><p>${u.summary}</p></div>`:''}
      ${known?'':`<p class="tip-act">${l&&g.player.level<l.level?`Unlocks at level ${l.level}`:l?.requires&&!g.learned.has(l.requires)?`Learn ${SPELL_BY_ID[l.requires].name} first`:`Learn for ${l?.points||1} skill point`}</p>`}`;
  }
}
