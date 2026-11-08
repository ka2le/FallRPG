import { BIOMES, ACTIVE_SPELLS, SPELL_BY_ID, SLOTS, NUMBER_SLOTS, SPECIES, QUESTS, PLACES } from './data.js';
import { ATTRIBUTES, xpForLevel } from './progression.js';
import { biomeAt, dist, WIDTH, HEIGHT, MIN_X, MIN_Y } from './world.js';
import { fullscreenButton } from '../../game-picker/fullscreen.js';
import { GEAR, LESSONS, HUNTS, dangerAt } from './adventure.js';
import { ProgressHud } from './hud.js';
import { CharacterScreen } from './character.js';
import { itemArt,GEAR_STAT } from './ui-art.js';
import { highlight } from './quests.js';
import { journalQuests, giverQuests, storyObjective } from './quest-journal.js';
import { shopWindow } from './shop-screen.js';
import { JournalScreen } from './journal-screen.js';
import { EXTRA_REWARDS } from './items.js';
import { pixelItem } from './item-sprites.js';
import { wholeNumber } from './display-numbers.js';

const paths={
  fire:'M17 2C19 10 8 12 10 20C5 17 5 12 6 10C-1 22 7 30 16 30C29 29 31 17 25 11C26 19 20 21 19 18C23 12 20 6 17 2Z',
  vine:'M15 29C3 23 7 11 16 13S23 26 17 22M19 11Q22 3 29 6Q29 14 19 11M10 16Q2 15 3 8Q11 7 10 16',
  frost:'M16 3V29M5 9L27 23M5 23L27 9M12 6L16 10L20 6M12 26L16 22L20 26M5 14L10 13L9 8M23 24L22 19L27 18M5 18L10 19L9 24M23 8L22 13L27 14',
  ward:'M16 3L27 8V16Q26 24 16 29Q6 24 5 16V8ZM16 9V22M11 14L16 19L21 14',
  wave:'M5 11Q0 16 5 21M10 7Q2 16 10 25M27 11Q32 16 27 21M22 7Q30 16 22 25M16 10L20 16L16 22L12 16Z',
  moon:'M22 4A12 12 0 1 0 28 23A11 11 0 0 1 22 4ZM24 9V15M21 12H27',
  leaf:'M6 26Q0 6 27 5Q31 29 6 26ZM7 25L22 11M10 22L9 14M15 18L24 18',
  blink:'M19 3L8 18H16L12 29L26 13H18ZM3 9H8M1 15H5M3 22H7',
  fox:'M4 4L14 12H19L28 4L26 21L16 29L6 21ZM10 18L13 20M22 18L19 20M14 25H18',
  staff:'M8 29L22 8M16 4L24 2L29 9L21 13L16 4ZM6 23L11 27',
  tonic:'M12 3H20V9L25 16V27H7V16L12 9ZM12 6H20M8 20H24M16 15V25M12 20H20',
  book:'M16 8Q8 3 3 6V27Q10 24 16 29Q22 24 29 27V6Q22 3 16 8V29M7 11L12 13M7 16L12 18M21 12L25 10M21 17L25 15',
  map:'M3 7L11 3L21 8L29 4V25L21 29L11 24L3 28ZM11 3V24M21 8V29',
  sun:'M16 8A8 8 0 1 0 16 24A8 8 0 1 0 16 8M16 1V5M16 27V31M1 16H5M27 16H31M5 5L8 8M24 24L27 27M5 27L8 24M24 8L27 5',
  sound:'M4 12H10L18 5V27L10 20H4ZM23 11Q28 16 23 21M26 6Q36 16 26 26',
  diamond:'M16 2L29 16L16 30L3 16ZM16 7V25M8 16L16 20L24 16',
};
export const icon=(name,extra='')=>`<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}><path d="${paths[name]||paths.diamond}"/></svg>`;
const key=k=>`<kbd>${k}</kbd>`;
export function shell(){return `<main id="stage">
  <canvas id="world" tabindex="0" aria-label="Game world. Drag in the bottom third to move. Pinch to zoom before moving. Tap villagers to talk or creatures to switch targets. WASD moves. Spells use 1 through 9. Q E R are optional spell bindings. F drinks a healing tonic. Space interacts."></canvas>
  <div id="loading">${icon('diamond')}</div>
  <div class="hud">
    <div id="vitals" class="vitals" aria-label="Health and aether"><div class="vital hp" id="health-meter" role="meter" aria-label="Health"><span>♥</span><div><i id="health-fill"></i><b id="shield-fill"></b></div></div><div class="vital mp" id="mana-meter" role="meter" aria-label="Aether"><span>◆</span><div><i id="mana-fill"></i></div></div></div>
    <nav class="menu-icons" aria-label="Game menus"><button data-menu="journal" aria-label="Journal J" title="Journal · Quests J · Map M">${icon('book')}</button><button data-menu="equipment" aria-label="Character I" title="Character · Items I · Spells K">${icon('staff')}</button><button data-menu="pause" aria-label="Pause menu" title="Menu · Esc">≡</button></nav>
    <div id="adventure-status" class="adventure-status"></div>
    <div id="region-name" class="region-name"></div>
    <div id="notice" class="notice" role="status" aria-live="polite"></div>
    <div class="combat-controls"><div id="aim-hint" class="aim-hint hidden">Click to cast <span>· Esc cancel</span></div><div id="actions" class="action-row" aria-label="Casting controls"></div></div>
    <span id="save-mark" class="save-mark" aria-label="Saved">◇</span>
  </div>
  </main><div id="modal-root"></div>`;}

export class UI{
  constructor(game,renderer,onSave){this.game=game;this.renderer=renderer;this.onSave=onSave;this.modal=null;this.selectedSlot='1';this.journalTab='quests';this.selectedNote=null;this.timer=0;this.els=Object.fromEntries([...document.querySelectorAll('[id]')].map(e=>[e.id,e]));this.renderActions();this.character=new CharacterScreen(this);this.journal=new JournalScreen(this);this.hud=new ProgressHud(this);this.bind();}
  bind(){document.addEventListener('click',e=>{
    const el=e.target.closest('button');if(!el)return;
    if(el.dataset.menu){const m=el.dataset.menu;if(m==='equipment'||m==='grimoire'){this.openCharacter(el.dataset.openTab||(m==='grimoire'?'spells':'gear'));return;}if(m==='journal'||m==='map'){this.openJournal(el.dataset.openTab||(m==='map'?'map':'quests'));return;}this.open(m);return;}
    if(this.modal==='equipment'&&this.character.click(el))return;
    if(el.dataset.mapZoom){
      const r=this.renderer,v=r.mapView||{zoom:1,x:MIN_X+WIDTH/2,y:MIN_Y+HEIGHT/2},action=el.dataset.mapZoom;
      if(action==='quest'){const t=this.hud?.tracker,st=t?.tracked?.steps.find(x=>x.current);if(st?.target)r.mapView={zoom:4,x:st.target.x,y:st.target.y};}
      else if(action==='overview')r.mapView={zoom:1,x:MIN_X+WIDTH/2,y:MIN_Y+HEIGHT/2};
      else if(action==='player')r.mapView={zoom:8,x:this.game.player.x,y:this.game.player.y};
      else r.mapView={zoom:Math.max(1,Math.min(16,v.zoom*(action==='in'?2:.5))),x:v.zoom===1?this.game.player.x:v.x,y:v.zoom===1?this.game.player.y:v.y};
      r.drawMinimap(document.getElementById('atlas-canvas'),true);return;
    }
    if(el.hasAttribute('data-close')){this.close();return;}
    if(el.hasAttribute('data-auto-attack')){this.game.toggleAutoAttack();this.els.world.focus();return;}
    if(el.hasAttribute('data-auto-surge')){this.game.toggleAutoSurge();this.renderModal();this.onSave();return;}
    if(el.dataset.grow){this.game.spendPoint(el.dataset.grow);this.renderModal();this.onSave();return;}
    if(el.hasAttribute('data-unbind')){this.game.setBinding(this.selectedSlot,'');this.renderActions();this.renderModal();this.onSave();return;}
    if(el.dataset.cast&&!this.modal){this.game.beginCast(el.dataset.cast);this.els.world.focus();return;}
    if(el.hasAttribute('data-tonic')){this.game.tonic();this.els.world.focus();return;}
    if(el.dataset.slot){this.selectedSlot=el.dataset.slot;this.renderModal();return;}
    if(el.dataset.bind){if(!this.game.learned.has(el.dataset.bind)){this.showSpell(el.dataset.bind);return;}this.game.setBinding(this.selectedSlot,el.dataset.bind);this.renderActions();this.renderModal();this.onSave();return;}
    if(el.dataset.journalTab){this.journalTab=el.dataset.journalTab;this.renderModal();return;}
    if(el.dataset.note){this.selectedNote=el.dataset.note;this.renderModal();return;}
    if(el.dataset.shopPick){this.shopPick=el.dataset.shopPick;this.renderModal();return;}
    if(el.dataset.shopEquip){this.game.equip(el.dataset.shopEquip);this.renderModal();this.onSave();return;}
    if(el.dataset.trackQuest){this.hud.tracker.track(el.dataset.trackQuest);this.renderModal();return;}
    if(el.dataset.mapQuest){const t=this.hud.tracker;t.track(el.dataset.mapQuest);const st=t.tracked?.steps.find(x=>x.current);if(st?.target)this.renderer.mapView={zoom:4,x:st.target.x,y:st.target.y};this.openJournal('map',false);return;}
    if(el.dataset.questAction){this.game.questAction(el.dataset.questAction);this.onSave();this.close();return;}
    if(el.dataset.buy){this.game.buyTonic(el.dataset.buy);this.renderModal();this.onSave();return;}
    if(el.dataset.equip){this.game.equip(el.dataset.equip);this.renderModal();this.onSave();return;}
    if(el.dataset.gearBuy){this.game.buyGear(el.dataset.gearBuy);this.renderModal();this.onSave();return;}
    if(el.hasAttribute('data-new-journey')){this.game.emit('new-journey');return;}
    if(el.dataset.learn){this.game.learn(el.dataset.learn,el.dataset.style==='true');this.renderActions();this.renderModal();this.onSave();return;}
    if(el.hasAttribute('data-rest')){if(this.game.rest()){this.onSave();this.close();}}
  });
  window.addEventListener('resize',()=>{if(this.mapOpen){this.journal.fitMap();this.renderer.drawMinimap(document.getElementById('atlas-canvas'),true);}});
  document.addEventListener('contextmenu',e=>{const slot=e.target.closest('[data-cast]');if(slot){e.preventDefault();this.selectedSlot=slot.dataset.cast;this.open('grimoire');}});
  document.addEventListener('pointerover',e=>{const card=e.target.closest('[data-bind]');if(card&&this.modal==='grimoire')this.showSpell(card.dataset.bind);});
  document.addEventListener('focusin',e=>{if(e.target.dataset?.bind&&this.modal==='grimoire')this.showSpell(e.target.dataset.bind);});
  }
  ready(){this.els.loading.classList.add('hidden');this.els.world.focus();this.showRegion(PLACES.find(p=>dist(this.game.player,p)<180)?.name||BIOMES[biomeAt(this.game.player.x,this.game.player.y)].name);}
  renderActions(){this.els.actions.innerHTML=`<button data-auto-attack class="stance" aria-label="Toggle basic automatic attack" title="Basic spark · C\nFree automatic attacks. Click a creature to focus it.">${icon('fire')}${key('C')}</button>`+NUMBER_SLOTS.filter(slot=>this.game.learned.has(this.game.bindings[slot])).map(slot=>{const s=SPELL_BY_ID[this.game.bindings[slot]];return `<button data-cast="${slot}" class="spell-slot ${s?'':'empty-slot'}" style="--spell:${s?.color||'#7f9277'}" aria-label="${s?.name||'Empty spell slot'} ${slot}" title="${s?`${s.name} · ${slot}\n${s.description}\n${s.cost} aether · ${this.game.spellCooldown(s.id).toFixed(2)}s`:'Empty slot · Assign in Spells (K)'}. Right-click to rebind.">${s?icon(s.glyph):'·'}${key(slot)}<span class="cooldown" id="cd-${slot}"></span></button>`;}).join('')+`<button class="tonic-slot" data-tonic aria-label="Healing tonic F" title="Tonic · F\nRestore 65 health.">${pixelItem('health-tonic')}${key('F')}<small id="tonic-count">${this.game.player.tonics}</small></button>`;}
  tick(dt){this.timer+=dt;if(this.timer<.1)return;this.timer=0;const g=this.game,p=g.player;
    this.els['health-fill'].style.width=`${p.hp/p.maxHp*100}%`;this.els['mana-fill'].style.width=`${p.mana/p.maxMana*100}%`;this.els['shield-fill'].style.width=`${Math.min(100,p.shield/(g.spellValues('ward').shield)*100)}%`;
    for(const [id,value,max,label] of [['health-meter',p.hp,p.maxHp,'Health'],['mana-meter',p.mana,p.maxMana,'Aether']]){const el=this.els[id];el.title=`${label}: ${Math.ceil(value)} / ${max}`;el.setAttribute('aria-valuenow',Math.ceil(value));el.setAttribute('aria-valuemax',max);el.setAttribute('aria-valuemin',0);}
    this.els.vitals.classList.toggle('quiet',g.isSafe&&p.hp===p.maxHp&&p.mana>=p.maxMana-1);document.getElementById('tonic-count').textContent=p.tonics;
    this.hud.tick();
    document.querySelector('[data-tonic]').title=`Tonic · F\nRestore ${wholeNumber(g.stats.tonicHealing)} health. 8-second recovery.`;
    const basic=document.querySelector('[data-auto-attack]');basic.classList.toggle('selected',g.autoAttack);basic.classList.toggle('attack-paused',!g.autoAttack);basic.setAttribute('aria-pressed',String(g.autoAttack));
    basic.setAttribute('aria-label',`Automatic basic attacks ${g.autoAttack?'on':'off'}`);basic.title=`Basic spark · ${g.autoAttack?(g.isSafe?'On · paused in safe haven':'On'):'Off'}\nFree automatic attacks. C toggles; selecting an enemy resumes. Reloading resumes attacks.`;
    let status=basic.querySelector('.basic-status');if(!status){status=document.createElement('small');status.className='basic-status';status.setAttribute('aria-hidden','true');basic.append(status);}status.textContent=!g.autoAttack?'OFF':g.isSafe?'SAFE':'';
    for(const slot of NUMBER_SLOTS){const s=SPELL_BY_ID[g.bindings[slot]],cd=g.cooldowns[s?.id]||0,el=document.getElementById(`cd-${slot}`);if(!el)continue;el.textContent=cd>0?Math.ceil(cd):'';el.style.height=cd>0?`${Math.min(100,cd/g.spellCooldown(s.id)*100)}%`:'0';el.parentElement.classList.toggle('unavailable',!!s&&p.mana<s.cost);el.parentElement.classList.toggle('armed',g.aiming?.slot===slot||!!s&&g.empowered===s.id);}
    for(const button of document.querySelectorAll('[data-cast]')){const id=g.bindings[button.dataset.cast],learned=g.learned.has(id);button.classList.toggle('spell-locked',!!id&&!learned);if(id&&!learned)button.title='Unlearned · Help Rowan, then visit a trainer in town (K).';}
    this.els['aim-hint'].classList.toggle('hidden',!g.aiming);if(this.mapOpen)this.renderer.drawMinimap(document.getElementById('atlas-canvas'),true);
  }
  toast(text){clearTimeout(this.noticeTimer);this.els.notice.textContent=text.length>76?text.slice(0,73)+'…':text;this.els.notice.classList.add('shown');this.noticeTimer=setTimeout(()=>this.els.notice.classList.remove('shown'),2600);}
  saved(){this.els['save-mark'].classList.add('shown');clearTimeout(this.saveTimer);this.saveTimer=setTimeout(()=>this.els['save-mark'].classList.remove('shown'),1200);}
  showRegion(name){this.els['region-name'].textContent=name;this.els['region-name'].classList.add('shown');clearTimeout(this.regionTimer);this.regionTimer=setTimeout(()=>this.els['region-name'].classList.remove('shown'),2400);}
  // Two windows: Character (Items I · Spells K · Stats) and Journal (Quests J · Map M · Creatures).
  // A key opens its window on that tab, switches tab if the window is already open, and closes it on a second press.
  get mapOpen(){return this.modal==='journal'&&this.journalTab==='map';}
  openCharacter(tab='gear',toggle=true){if(this.modal==='equipment'){if(this.character.tab===tab){if(toggle)this.close();}else{this.character.setTab(tab);this.renderModal();}return;}this.character.tab=tab;this.show('equipment');}
  openJournal(tab='quests',toggle=true){if(this.modal==='journal'){if(this.journalTab===tab){if(toggle)this.close();}else{this.journalTab=tab;this.renderModal();}return;}this.journalTab=tab;this.show('journal');}
  open(type){if(type==='grimoire'){this.openCharacter('spells');return;}if(type==='map'){this.openJournal('map');return;}if(type==='journal'){this.openJournal(this.journalTab||'quests');return;}if(this.modal===type){this.close();return;}this.show(type);}
  show(type){this.onPause?.();if(this.modal==='equipment')this.character.onClose();if(type==='equipment')this.hud?.dismissLevelUp();this.modal=type;this.game.paused=true;this.game.cancelCast();this.renderModal();}
  spellIcon(id){return icon(SPELL_BY_ID[id].glyph);}
  close(){if(this.modal==='equipment')this.character.onClose();this.character.hideTip();this.modal=null;this.game.paused=false;this.els['modal-root'].innerHTML='';this.els.world.focus();}
  isConversation(){return ['rowan','mara','innkeeper','pip'].includes(this.modal)||this.game.world.interactables.some(i=>i.id===this.modal&&['npc','lore'].includes(i.kind));}
  advanceDialogue(){if(this.isConversation()){const primary=document.querySelector('.dialogue-actions button:not(:disabled)');primary?primary.click():this.close();}}
  renderModal(){const names={grimoire:'Spells',journal:'Journal',equipment:'Character',newjourney:'New journey',help:'Controls',pause:'Paused',rowan:'Rowan',mara:'Mara',market:'Market',innkeeper:'Toma',pip:'Pip'},dialogue=this.isConversation(),title=names[this.modal]||this.game.world.interactables.find(i=>i.id===this.modal)?.name||'The Hollow';
    this.els['modal-root'].innerHTML=`<div class="modal-backdrop ${dialogue?'conversation':''}"><section class="modal ${dialogue?'dialogue':''} ${this.modal==='equipment'||this.modal==='journal'?'char-modal':''} ${this.modal==='journal'?'journal-modal':''} ${this.modal==='market'?'shop-modal':''}" role="dialog" aria-modal="true" aria-label="${title}"><header><h2>${title}</h2><button data-close aria-label="Close">×</button></header><div class="modal-body">${this.content()}${this.modal==='mara'?this.bounties('Mara'):''}</div></section></div>`;
    this.els['modal-root'].querySelector('[data-close]').focus();
    for(const img of document.querySelectorAll('[data-portrait]'))img.src=this.renderer.thumbnail(Number(img.dataset.portrait),img.dataset.atlas||'creatures');
    if(this.mapOpen){this.journal.fitMap();this.renderer.drawMinimap(document.getElementById('atlas-canvas'),true);}
    if(this.mapOpen){
      const canvas=document.getElementById('atlas-canvas');let drag=null;
      canvas.onpointerdown=e=>{if((this.renderer.mapView?.zoom||1)===1)return;drag={x:e.clientX,y:e.clientY,view:{...this.renderer.mapView}};canvas.setPointerCapture(e.pointerId);};
      canvas.onpointermove=e=>{if(!drag)return;const box=canvas.getBoundingClientRect();this.renderer.mapView={...drag.view,x:drag.view.x-(e.clientX-drag.x)/box.width*WIDTH/drag.view.zoom,y:drag.view.y-(e.clientY-drag.y)/box.height*HEIGHT/drag.view.zoom};this.renderer.drawMinimap(canvas,true);};
      canvas.onpointerup=canvas.onpointercancel=()=>drag=null;
    }
    if(this.modal==='grimoire')this.showSpell(this.game.bindings[this.selectedSlot]);
    if(this.modal==='equipment')this.character.afterRender();
  }
  showSpell(id){const s=SPELL_BY_ID[id],el=document.getElementById('spell-detail');if(!el)return;if(!s){el.innerHTML='<p>Select a learned spell to fill this slot.</p>';return;}const g=this.game;el.innerHTML=`<strong>${s.name}</strong><p>${s.description}</p><small>◆ ${s.cost} &nbsp; ◷ ${g.spellCooldown(s.id).toFixed(2)}s${s.nextAttack?' · Next automatic attack':s.aim?' · Place with a click':' · Cast immediately'}${s.damage?` · ${Math.round(s.damage*g.spellPower*(s.id==='surge'?1+g.stats.lanceBonus:s.id==='fox'?1+g.stats.foxBonus:1))} damage`:''}${s.duration&&s.id!=='renew'?` · ${(s.duration*g.durationPower+(s.id==='bind'?g.stats.bindBonus:0)).toFixed(1)} seconds`:''}</small>`;}
  content(){const g=this.game;
    if(this.modal==='newjourney')return `<p>Begin again at Willowmere with one basic spark. This replaces the current local save.</p><div class="dialogue-actions"><button data-new-journey>Start new journey</button><button data-close>Keep current journey</button></div>`;
    if(this.modal==='grimoire')return this.training()+`<p class="rpg-intro">Choose a slot, then a learned spell. Q / E / R are optional extra bindings.</p><div class="bindings">${SLOTS.map(slot=>{const s=SPELL_BY_ID[g.bindings[slot]];return `<button data-slot="${slot}" title="${s?.name||'Empty slot'}" aria-label="Bind ${slot.toUpperCase()}" class="${slot===this.selectedSlot?'selected':''}" style="--spell:${s?.color||'#7f9277'}">${key(slot.toUpperCase())}${s?icon(s.glyph):'·'}</button>`;}).join('')}</div><button data-unbind>Clear selected binding</button><div class="spell-list">${ACTIVE_SPELLS.map(s=>`<button data-bind="${s.id}" style="--spell:${s.color}" class="${g.bindings[this.selectedSlot]===s.id?'equipped':''}">${icon(s.glyph)}<span>${s.name}${g.learned.has(s.id)?'':' · Unlearned'}</span><small>${SLOTS.filter(k=>g.bindings[k]===s.id).join(' ').toUpperCase()}</small></button>`).join('')}</div><div id="spell-detail" class="spell-detail"></div><button data-auto-surge ${g.learned.has('surge')?'':'disabled'} aria-pressed="${g.autoSurge}">Automatic Aether Lance: ${g.autoSurge?'on':'off'}</button><p class="rpg-intro">Replaces basic sparks whenever aether allows. Needs ${(SPELL_BY_ID.surge.cost/1.1).toFixed(1)} aether/sec to sustain; yours is ${g.manaRegen.toFixed(1)}. Otherwise, basic sparks fill the gaps.</p>`;
    if(this.modal==='journal')return this.journal.render();
    if(this.modal==='pause')return `<div class="pause-list"><button data-close>Continue</button>${fullscreenButton()}<button data-menu="equipment">Character</button><button data-menu="grimoire">Spells</button><button data-menu="journal">Quests</button><button data-menu="map">Map</button><button data-menu="help">Controls</button><button data-sound>Sound on / off</button><button data-menu="newjourney">New journey</button><a href="../" style="color:inherit;text-underline-offset:4px;padding:12px">Choose another game</a></div>`;
    if(this.modal==='help')return `<dl class="controls"><dt>Bottom-third drag</dt><dd>Run immediately; smaller drags reduce speed</dd><dt>Pinch</dt><dd>Start with two fingers before moving. Lift every finger after using the joystick.</dd><dt>Tap / click</dt><dd>Talk to nearby villagers · Switch attack targets</dd><dt>WASD / arrows</dt><dd>Move · Shift to run</dd><dt>1–9</dt><dd>Cast your bound spells. Lance and Briarbind empower the next automatic attack; press again to cancel.</dd><dt>Q / E / R</dt><dd>Optional extra spell bindings, set in Spells (K)</dd><dt>Tab</dt><dd>Cycle nearby threats</dd><dt>C</dt><dd>Toggle basic automatic attacks</dd><dt>Space / Enter</dt><dd>Talk, trade, gather, observe, advance dialogue (on touch: tap the thing)</dd><dt>F</dt><dd>Healing tonic</dd><dt>I / K</dt><dd>Character: items / spells (stats on the same window)</dd><dt>J / M</dt><dd>Journal: quests / map (creatures on the same window)</dd><dt>Respawns</dt><dd>5 minutes after defeat (8 for elites), plus a return to a safe haven. Never while you are nearby. Bounty rewards remain completed.</dd><dt>P</dt><dd>Save a screenshot</dd></dl>`;
    if(this.modal==='equipment')return this.character.render();
    if(this.modal==='market')return shopWindow(this);
    if(this.modal==='innkeeper')return `<p>“Stay a while. The north road is safe until the pasture. Beyond the river, watch the flowers.”</p><div class="dialogue-actions"><button data-rest>Rest</button><button data-close>Leave</button></div>`;
    if(this.modal==='pip')return `<p>“The little grey ones need cold food AND hot food. Mara says that's why they won't leave the border.”</p><div class="dialogue-actions"><button data-close>Thanks</button></div>`;
    if(this.modal==='rowan'){
      let text,action='';const state=g.quests.herd;
      if(state==='offered'){text='Briars have split my feeding pair. Take the north path and clear the three walking seedlings. Leave the Barkjaws be.';action=this.questButton('herd',"I'll help.");}
      else if(state==='active'&&!g.herdCleared){text='Follow the north path. Three seedlings are keeping the grazers apart. Come back when the pair is together.';}
      else if(state==='active'){text="Together again! Take my singing reed and these tonics. Use your two skill points in Character: learn Aether Lance, strengthen your magic, or build your mana. Then help me reopen the winding Briar Road.";action=this.questButton('herd','Take wand & supplies');}
      else text='Mara is across the square. Tell her I sent you. She tends the crossing where the snow meets the warm stone.';
      return this.dialogue(14,text,action)+(state==='complete'?this.bounties('Rowan'):'');
    }
    if(this.modal==='mara'){
      if(g.quests.herd!=='complete')return this.dialogue(13,'Rowan has trouble at the pasture. Help him first. His herd keeps this whole village open.');
      if(g.quests.seam==='offered'||g.quests.seam==='locked')return this.dialogue(13,"Rowan's token? Then I trust you. Follow the southeast path to the Steamward. Clear the fallen branches at the crossing. The little Scavengers need food from both sides.",this.questButton('seam',"I'll open the crossing."));
      if(g.quests.seam==='active')return this.dialogue(13,g.crossingOpen?'Both sides of a meal, at last. Here—something for the road.':"Southeast, where snow meets warm stone. Clear the crossing, then come back and tell me what you saw.",g.crossingOpen?this.questButton('seam','Tell her about the Scavengers'):'');
      if(g.quests.seasons==='offered')return this.dialogue(13,"You've started to notice how this place works. Keep notes on a Barkjaw, a Mantleback, a Snowkeel and a Ventback. Bring them back when your travels allow.",this.questButton('seasons',"I'll keep a notebook."));
      if(g.quests.seasons==='active')return this.dialogue(13,g.fieldComplete?'Four lives, four ways of belonging. You have the makings of a wayfarer.':'Keep your distance from the Ventback nests. The parents are peaceful until you get too close.',g.fieldComplete?this.questButton('seasons','Share the notebook'):'');
      return this.dialogue(13,'The roads grow dangerous beyond the village. These contracts pay for better equipment and lessons.');
    }
    const local=this.game.world.interactables.find(i=>i.id===this.modal);
    if(local?.dialogue||local?.text)return local.kind==='npc'?this.dialogue(local.sprite??36,local.dialogue||local.text)+this.bounties(local.name):`<p>${highlight(local.text||local.dialogue)}</p><div class="dialogue-actions"><button data-close>Continue</button></div>`;
    return '';
  }
  training(){const g=this.game,p=g.player;return `<p class="rpg-intro">${p.coins} amber · Learn in Willowmere or a safe camp. ${g.quests.herd==='complete'?'One basic spark stays with you; powerful spells spend aether.':'Clear Rowan’s pasture first. Aether Lance is your first lesson.'}</p><div class="lesson-list">${Object.entries(LESSONS).map(([id,l])=>`<div><span>${SPELL_BY_ID[id].name}<small>Level ${l.level} · ${g.learned.has(id)?'Learned':`${l.price} amber`}${l.requires&&!g.learned.has(l.requires)?` · Learn ${SPELL_BY_ID[l.requires].name} first`:''}</small></span>${g.learned.has(id)?'<b>✓</b>':`<button data-learn="${id}" ${g.canLearn(id)?'':'disabled'}>Learn</button>`}</div>`).join('')}</div>`;}
  growth(){const g=this.game;return `<div class="growth"><p>${g.unspentPoints} growth points · 3 each level</p>${Object.entries(ATTRIBUTES).map(([id,a])=>`<article><div><strong>${a.name} · ${g.attributes[id]}</strong><small>${a.description}</small></div><button data-grow="${id}" ${g.unspentPoints?'':'disabled'}>+1</button></article>`).join('')}</div>`;}
  pack(){const g=this.game,p=g.player;return `<p class="rpg-intro">Level ${p.level} · ${Math.ceil(p.hp)}/${p.maxHp} health · ${p.maxMana} aether<br>${Math.round(g.spellPower*100)}% magic power · ${g.manaRegen.toFixed(1)} aether/sec in combat · ${Math.round(g.basicDamage)} basic damage<br>${Math.round((g.gear.armor||0)*100)}% damage reduction · +${Math.round((g.gear.speed||0)*100)}% movement</p>${this.growth()}<div class="gear-list">${g.inventory.map(id=>{const it=GEAR[id],worn=g.equipment[it.slot]===id;return `<article><div>${icon(it.slot==='weapon'?'staff':it.slot==='robe'?'ward':it.slot==='boots'?'blink':'diamond')}</div><div><strong>${it.name}</strong><small>${it.slot} · ${it.description}</small>${!worn?`<small>Replaces ${GEAR[g.equipment[it.slot]]?.name||'an empty slot'}</small>`:''}</div><button data-equip="${id}" ${worn?'disabled':''}>${worn?'Equipped':'Equip'}</button></article>`;}).join('')}</div>`;}
  shop(){const g=this.game;return `<p class="rpg-intro">${g.player.coins} amber · Equip purchases in Pack (I). Rest at the Hearthstone before setting out.</p><div class="dialogue-actions"><button data-menu="grimoire">Spell lessons</button><button data-menu="equipment">Open pack</button><button data-menu="journal">Bounties</button></div><div class="gear-list">${Object.entries(GEAR).filter(([,it])=>it.price).map(([id,it])=>`<article><div>${itemArt(id,it)}</div><div><strong>${it.name}</strong><small>${it.description}</small><small>${Object.entries(it.stats).map(([key,value])=>GEAR_STAT[key]?.text(value)||'').join(' · ')}</small><small>Level ${it.level} · ${it.price} amber</small></div><button data-gear-buy="${id}" ${g.inventory.includes(id)||g.player.coins<it.price||g.player.level<it.level?'disabled':''}>${g.inventory.includes(id)?'Owned':'Buy'}</button></article>`).join('')}</div>`;}
  bounties(giver=null){return giver?giverQuests(this,giver):journalQuests(this);}
  dialogue(portrait,text,action=''){return `<div class="dialogue-line"><img data-portrait="${portrait}" alt=""/><p>${highlight(text)}</p></div>${storyObjective(this,this.modal)}<div class="dialogue-actions">${action}<button data-close>${action?'Later':'Continue'}</button></div>`;}
  questButton(id,text){return `<button data-quest-action="${id}">${text}</button>`;}
  objective(id){const g=this.game;if(id==='herd')return g.herdCleared?'Return to Rowan.':`Clear the pasture north of Willowmere. ${g.creatures.filter(c=>c.quest==='herd'&&c.dead).length}/3 seedlings.`;if(id==='seam')return g.crossingOpen?'Tell Mara the crossing is open.':'Clear the branches at the Steamward, southeast of Willowmere.';return g.fieldComplete?'Bring the notebook to Mara.':`Observe a Barkjaw, Mantleback, Snowkeel, and Ventback. ${['barkjaw','mantleback','snowkeel','ventback'].filter(s=>g.observed.has(s)).length}/4.`;}
  questLog(){return journalQuests(this);}
  fieldLog(){const ids=[...this.game.observed];if(!ids.length)return '<p>Approach a creature and press Space (or tap it) to observe it.</p>';const id=ids.includes(this.selectedNote)?this.selectedNote:ids[0],s=SPECIES[id];return `<div class="creature-list">${ids.map(id=>`<button data-note="${id}" class="${id===this.selectedNote?'selected':''}"><img data-portrait="${SPECIES[id].sprite}" data-atlas="${SPECIES[id].atlas||'creatures'}" alt=""/><span>${SPECIES[id].name}</span></button>`).join('')}</div><article class="field-detail"><h3>${s.name}</h3><p>${s.note}</p></article>`;}
  handleEvent(e){this.hud?.tracker?.event(e);if(e.type==='toast'&&/^Level \d+\.|^New equipment: |^Cleared .*journal|^Return to Rowan\.$|^New journal entry/.test(e.text))return;if(e.type==='toast')this.toast(e.text);if(e.type==='dialogue')this.open(e.npc);if(e.type==='map')this.openJournal('map',false);if(e.type==='bindings')this.renderActions();if(e.type==='save')this.onSave(true);if(e.type==='place')this.showRegion(e.place.name);}
}
