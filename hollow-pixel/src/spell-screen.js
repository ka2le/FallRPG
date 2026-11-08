import { ACTIVE_SPELLS, SLOTS } from './data.js';
import { LESSONS } from './adventure.js';
import { SPELL_UPGRADES } from './spell-effects.js';
import { gicon } from './ui-art.js';

const number=n=>Number.isInteger(n)?String(n):n.toFixed(1);
const kinds={surge:'Next attack',ward:'Shield',nova:'Self area',haste:'Escape',bind:'Spreading root',fox:'Companion',renew:'Healing'};
const metric=(icon,label,value,unit='')=>`<div class="spell-metric" aria-label="${label}: ${value}${unit}">${gicon(icon)}<b>${value}<small>${unit}</small></b><span>${label}</span></div>`;

export class SpellScreen{
  constructor(ui){this.ui=ui;this.selected=null;}
  click(el){
    const g=this.ui.game,available=this.ui.character.available;
    if(el.dataset.spellSelect){this.selected=el.dataset.spellSelect;this.ui.renderModal();return true;}
    if(el.dataset.learn){if(available>=(LESSONS[el.dataset.learn]?.points||1)&&g.learn(el.dataset.learn))this.selected=el.dataset.learn;this.changed();return true;}
    if(el.dataset.upgradeSpell){if(available>=1)g.upgradeSpell(el.dataset.upgradeSpell);this.changed();return true;}
    if(el.dataset.spellAssign){const select=document.querySelector('[data-spell-key]');if(select)g.setBinding(select.value,el.dataset.spellAssign);this.changed();return true;}
    if(el.hasAttribute('data-auto-surge')){g.toggleAutoSurge();this.changed();return true;}
    return false;
  }
  changed(){this.ui.renderActions();this.ui.renderModal();this.ui.onSave();}
  render(){
    const g=this.ui.game,available=this.ui.character.available,learned=ACTIVE_SPELLS.filter(s=>g.learned.has(s.id));
    if(!g.learned.has(this.selected))this.selected=learned[0]?.id||null;
    const lessons=ACTIVE_SPELLS.filter(s=>!g.learned.has(s.id)&&g.player.level>=LESSONS[s.id].level&&(!LESSONS[s.id].requires||g.learned.has(LESSONS[s.id].requires)));
    const next=Math.min(...ACTIVE_SPELLS.filter(s=>!g.learned.has(s.id)&&LESSONS[s.id].level>g.player.level).map(s=>LESSONS[s.id].level));
    const tiles=learned.map(s=>`<button class="known-spell ${s.id===this.selected?'selected':''}" data-spell-select="${s.id}" aria-pressed="${s.id===this.selected}" style="--spell:${s.color}">${this.ui.spellIcon(s.id)}<span>${s.name}</span>${g.spellUpgrades.has(s.id)?`<i title="Focused">${gicon('star')}</i>`:''}<small>${SLOTS.filter(k=>g.bindings[k]===s.id).slice(0,2).map(k=>`<kbd>${k.toUpperCase()}</kbd>`).join('')}</small></button>`).join('');
    const unlocks=lessons.map(s=>`<div class="spell-lesson"><span><b>${s.name}</b><small>${kinds[s.id]}</small></span><button data-learn="${s.id}" ${available>=LESSONS[s.id].points?'':'disabled'} aria-label="Learn ${s.name} for ${LESSONS[s.id].points} skill point">${gicon('plus')}Learn <span class="point-price">${gicon('facet')}${LESSONS[s.id].points}</span></button></div>`).join('');
    return `<div class="spell-top"><span class="skill-balance">${gicon('facet')}<b>${available}</b><small>skill points</small></span><span class="points-rate">+2 / level</span></div>
      ${learned.length?`<div class="known-spells">${tiles}</div>${this.detail(this.selected)}`:`<div class="no-spells">${gicon('scroll')}<b>No spells learned</b><small>Your basic spark is always available.</small></div>`}
      ${unlocks?`<section class="spell-lessons"><h3>Learn a spell</h3>${unlocks}</section>`:''}
      ${Number.isFinite(next)?`<div class="next-lesson">Next lesson <span class="level-requirement">Lv ${next}</span></div>`:''}`;
  }
  detail(id){
    const g=this.ui.game,s=g.spellValues(id),upgraded=g.spellUpgrades.has(id),u=SPELL_UPGRADES[id],available=this.ui.character.available;
    let metrics=metric('drop','Mana',s.cost)+metric('relic','Recovery',number(g.spellCooldown(id)),'s');
    if(s.damage)metrics+=metric('spark',id==='fox'?'Per bite':'Damage',number(s.damage));
    if(s.shield)metrics+=metric('shield','Shield',number(s.shield));
    if(s.healing)metrics+=metric('heart','Healing',number(s.healing));
    if(s.duration&&id!=='renew')metrics+=metric('relic','Duration',number(s.duration),'s');
    if(id==='renew')metrics+=metric('relic','Heal time',number(s.healDuration),'s');
    if(s.radius)metrics+=metric('focus','Radius',number(s.radius));
    if(s.slow)metrics+=metric('boot','Slow',number(s.slow),'s');
    if(id==='haste')metrics+=metric('boot','Move speed',Math.round((s.hasteSpeed-1)*100),'%');
    const assigned=SLOTS.find(k=>g.bindings[k]===id)||'1';
    return `<section class="spell-inspect" style="--spell:${s.color}"><header><div>${this.ui.spellIcon(id)}<strong>${s.name}</strong></div><span class="spell-kind">${kinds[id]}</span></header>
      <div class="spell-metrics">${metrics}</div>
      <div class="spell-bind"><label>Key <select data-spell-key aria-label="Spell key">${SLOTS.map(k=>`<option value="${k}" ${k===assigned?'selected':''}>${k.toUpperCase()}</option>`).join('')}</select></label><button data-spell-assign="${id}">Bind</button>${id==='surge'?`<button class="auto-cast ${g.autoSurge?'selected':''}" data-auto-surge aria-pressed="${g.autoSurge}" title="Use Lance whenever mana allows. Basic sparks fill the gaps.">${gicon('regen')}Auto-cast</button>`:''}</div>
      <div class="spell-focus ${upgraded?'focused':''}"><div>${gicon('star')}<span><b>${u.name}</b><small>${u.summary}</small></span></div><button data-upgrade-spell="${id}" ${upgraded||available<1?'disabled':''} aria-label="Upgrade ${s.name} for 1 skill point">${upgraded?`${gicon('check')}Focused`:`Focus <span class="point-price">${gicon('facet')}1</span>`}</button></div>
      ${id==='surge'?`<div class="mana-sustain" title="Mana regeneration as a share of sustained Lance casting"><span>Mana sustain</span><meter min="0" max="1" value="${Math.min(1,g.manaRegen/(s.cost/1.1))}"></meter><b>${Math.min(100,Math.round(g.manaRegen/(s.cost/1.1)*100))}%</b></div>`:''}</section>`;
  }
}
