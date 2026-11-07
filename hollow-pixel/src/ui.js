import { BIOMES, SPELLS, SPELL_BY_ID, SLOTS, SPECIES, QUESTS, PLACES, STANCES } from './data.js';
import { biomeAt, dist, WIDTH, HEIGHT, MIN_X, MIN_Y } from './world.js';
import { fullscreenButton } from '../../game-picker/fullscreen.js';
import { GEAR, LESSONS, STANCE_LESSONS, HUNTS, dangerAt } from './adventure.js';

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
  <canvas id="world" tabindex="0" aria-label="Game world. Hold anywhere briefly, then drag to move. Pinch to zoom. Tap nearby villagers to talk or creatures to switch targets. WASD moves. 1 2 3 choose automatic casting. Q E R aim spells, F shields. C interacts."></canvas>
  <div id="loading">${icon('diamond')}</div>
  <div class="hud">
    <div id="vitals" class="vitals" aria-label="Health and aether"><div class="vital hp" id="health-meter" role="meter" aria-label="Health"><span>♥</span><div><i id="health-fill"></i><b id="shield-fill"></b></div></div><div class="vital mp" id="mana-meter" role="meter" aria-label="Aether"><span>◆</span><div><i id="mana-fill"></i></div></div></div>
    <nav class="menu-icons" aria-label="Game menus"><button data-menu="journal" aria-label="Journal J" title="Journal · J">${icon('book')}</button><button data-menu="grimoire" aria-label="Grimoire K" title="Spells · K">${icon('vine')}</button><button data-menu="map" aria-label="Atlas M" title="Map · M">${icon('map')}</button><button data-menu="equipment" aria-label="Equipment I" title="Pack · I">${icon('staff')}</button><button data-menu="pause" aria-label="Pause menu" title="Menu · Esc">≡</button></nav>
    <div id="adventure-status" class="adventure-status"></div>
    <div id="region-name" class="region-name"></div>
    <div id="notice" class="notice" role="status" aria-live="polite"></div>
    <div class="combat-controls"><div id="aim-hint" class="aim-hint hidden">Click to cast <span>· Esc cancel</span></div><div id="actions" class="action-row" aria-label="Casting controls"></div></div>
    <span id="save-mark" class="save-mark" aria-label="Saved">◇</span>
  </div>
  </main><div id="modal-root"></div>`;}

export class UI{
  constructor(game,renderer,onSave){this.game=game;this.renderer=renderer;this.onSave=onSave;this.modal=null;this.selectedSlot='q';this.journalTab='quests';this.selectedNote=null;this.timer=0;this.els=Object.fromEntries([...document.querySelectorAll('[id]')].map(e=>[e.id,e]));this.renderActions();this.bind();}
  bind(){document.addEventListener('click',e=>{
    const el=e.target.closest('button');if(!el)return;
    if(el.dataset.menu){this.open(el.dataset.menu);return;}
    if(el.dataset.mapZoom){
      const r=this.renderer,v=r.mapView||{zoom:1,x:MIN_X+WIDTH/2,y:MIN_Y+HEIGHT/2},action=el.dataset.mapZoom;
      if(action==='overview')r.mapView={zoom:1,x:MIN_X+WIDTH/2,y:MIN_Y+HEIGHT/2};
      else if(action==='player')r.mapView={zoom:8,x:this.game.player.x,y:this.game.player.y};
      else r.mapView={zoom:Math.max(1,Math.min(16,v.zoom*(action==='in'?2:.5))),x:v.zoom===1?this.game.player.x:v.x,y:v.zoom===1?this.game.player.y:v.y};
      r.drawMinimap(document.getElementById('atlas-canvas'),true);return;
    }
    if(el.hasAttribute('data-close')){this.close();return;}
    if(el.dataset.stance){this.game.setStance(el.dataset.stance);this.els.world.focus();return;}
    if(el.dataset.cast&&!this.modal){this.game.beginCast(el.dataset.cast);this.els.world.focus();return;}
    if(el.hasAttribute('data-tonic')){this.game.tonic();this.els.world.focus();return;}
    if(el.dataset.slot){this.selectedSlot=el.dataset.slot;this.renderModal();return;}
    if(el.dataset.bind){if(!this.game.learned.has(el.dataset.bind)){this.showSpell(el.dataset.bind);return;}this.game.setBinding(this.selectedSlot,el.dataset.bind);this.renderActions();this.renderModal();this.onSave();return;}
    if(el.dataset.journalTab){this.journalTab=el.dataset.journalTab;this.renderModal();return;}
    if(el.dataset.note){this.selectedNote=el.dataset.note;this.renderModal();return;}
    if(el.dataset.questAction){this.game.questAction(el.dataset.questAction);this.onSave();this.close();return;}
    if(el.dataset.buy){this.game.buyTonic(el.dataset.buy);this.renderModal();this.onSave();return;}
    if(el.dataset.equip){this.game.equip(el.dataset.equip);this.renderModal();this.onSave();return;}
    if(el.dataset.gearBuy){this.game.buyGear(el.dataset.gearBuy);this.renderModal();this.onSave();return;}
    if(el.hasAttribute('data-new-journey')){this.game.emit('new-journey');return;}
    if(el.dataset.learn){this.game.learn(el.dataset.learn,el.dataset.style==='true');this.renderActions();this.renderModal();this.onSave();return;}
    if(el.hasAttribute('data-rest')){if(this.game.rest()){this.onSave();this.close();}}
  });
  document.addEventListener('contextmenu',e=>{const slot=e.target.closest('[data-cast]');if(slot){e.preventDefault();this.selectedSlot=slot.dataset.cast;this.open('grimoire');}});
  document.addEventListener('pointerover',e=>{const card=e.target.closest('[data-bind]');if(card&&this.modal==='grimoire')this.showSpell(card.dataset.bind);});
  document.addEventListener('focusin',e=>{if(e.target.dataset?.bind&&this.modal==='grimoire')this.showSpell(e.target.dataset.bind);});
  }
  ready(){this.els.loading.classList.add('hidden');this.els.world.focus();this.showRegion(PLACES.find(p=>dist(this.game.player,p)<180)?.name||BIOMES[biomeAt(this.game.player.x,this.game.player.y)].name);}
  renderActions(){this.els.actions.innerHTML=STANCES.map(s=>`<button data-stance="${s.id}" class="stance" style="--spell:${s.color}" aria-label="${s.name} stance" title="${s.name} · ${s.key}\n${s.description}">${icon(s.glyph)}${key(s.key)}</button>`).join('')+'<span class="divider"></span>'+SLOTS.map(slot=>{const s=SPELL_BY_ID[this.game.bindings[slot]];return `<button data-cast="${slot}" class="spell-slot" style="--spell:${s.color}" aria-label="${s.name} ${slot.toUpperCase()}" title="${s.name} · ${slot.toUpperCase()}\n${s.description}\n${s.cost} aether · ${s.cooldown}s. Right-click to rebind.">${icon(s.glyph)}${key(slot.toUpperCase())}<span class="cooldown" id="cd-${slot}"></span></button>`;}).join('')+`<span class="divider"></span><button class="tonic-slot" data-tonic aria-label="Healing tonic H" title="Tonic · H\nRestore 65 health.">${icon('tonic')}${key('H')}<small id="tonic-count">${this.game.player.tonics}</small></button>`;}
  tick(dt){this.timer+=dt;if(this.timer<.1)return;this.timer=0;const g=this.game,p=g.player;
    this.els['health-fill'].style.width=`${p.hp/p.maxHp*100}%`;this.els['mana-fill'].style.width=`${p.mana/p.maxMana*100}%`;this.els['shield-fill'].style.width=`${p.shield/45*100}%`;
    for(const [id,value,max,label] of [['health-meter',p.hp,p.maxHp,'Health'],['mana-meter',p.mana,p.maxMana,'Aether']]){const el=this.els[id];el.title=`${label}: ${Math.ceil(value)} / ${max}`;el.setAttribute('aria-valuenow',Math.ceil(value));el.setAttribute('aria-valuemax',max);el.setAttribute('aria-valuemin',0);}
    this.els.vitals.classList.toggle('quiet',g.isSafe&&p.hp===p.maxHp&&p.mana>99);document.getElementById('tonic-count').textContent=p.tonics;
    const region=dangerAt(p.x,p.y),quest=g.quests.herd==='offered'?'Speak to Rowan beside the waypost.':g.quests.herd==='active'?this.objective('herd'):HUNTS.find(h=>g.quests[h.id]==='active');
    const statusMarkup=`<b>Level ${p.level}</b> <span>${p.xp}/${100+p.level*40} memories · ${p.coins} amber</span><small class="${region.level>p.level+1?'danger':''}">${g.isSafe?'Safe haven':`${region.name} · Lv ${region.level}${region.level>p.level+1?' · Dangerous':''}`}</small><button data-menu="journal">${typeof quest==='string'?quest:quest?(g.huntReady(quest.id)?`Return to ${quest.giver} · claim bounty`:`${quest.title} · ${quest.camps.filter(c=>g.cleared.has(c.id)).length}/3 camps`):g.quests.herd==='complete'?'Visit Rowan or the market for bounties and supplies.':'Clear the pasture.'}</button>`;if(this.els['adventure-status'].innerHTML!==statusMarkup)this.els['adventure-status'].innerHTML=statusMarkup;
    for(const button of document.querySelectorAll('[data-stance]')){const active=button.dataset.stance===g.stance;button.classList.toggle('selected',active);button.classList.toggle('passive',active&&!g.autoAttack);button.setAttribute('aria-pressed',String(active&&g.autoAttack));}
    for(const button of document.querySelectorAll('[data-stance]'))button.classList.toggle('spell-locked',!g.stances.has(button.dataset.stance));
    for(const slot of SLOTS){const s=SPELL_BY_ID[g.bindings[slot]],cd=g.cooldowns[s.id]||0,el=document.getElementById(`cd-${slot}`);el.textContent=cd>0?Math.ceil(cd):'';el.style.height=cd>0?`${cd/s.cooldown*100}%`:'0';el.parentElement.classList.toggle('unavailable',p.mana<s.cost);el.parentElement.classList.toggle('armed',g.aiming?.slot===slot);}
    for(const button of document.querySelectorAll('[data-cast]')){const learned=g.learned.has(g.bindings[button.dataset.cast]);button.classList.toggle('spell-locked',!learned);if(!learned)button.title='Unlearned · Help Rowan, then visit a trainer in town (K).';}
    this.els['aim-hint'].classList.toggle('hidden',!g.aiming);if(this.modal==='map')this.renderer.drawMinimap(document.getElementById('atlas-canvas'),true);
  }
  toast(text){clearTimeout(this.noticeTimer);this.els.notice.textContent=text.length>76?text.slice(0,73)+'…':text;this.els.notice.classList.add('shown');this.noticeTimer=setTimeout(()=>this.els.notice.classList.remove('shown'),2600);}
  saved(){this.els['save-mark'].classList.add('shown');clearTimeout(this.saveTimer);this.saveTimer=setTimeout(()=>this.els['save-mark'].classList.remove('shown'),1200);}
  showRegion(name){this.els['region-name'].textContent=name;this.els['region-name'].classList.add('shown');clearTimeout(this.regionTimer);this.regionTimer=setTimeout(()=>this.els['region-name'].classList.remove('shown'),2400);}
  open(type){if(this.modal===type){this.close();return;}this.onPause?.();this.modal=type;this.game.paused=true;this.game.cancelCast();this.renderModal();}
  close(){this.modal=null;this.game.paused=false;this.els['modal-root'].innerHTML='';this.els.world.focus();}
  isConversation(){return ['rowan','mara','market','innkeeper','pip'].includes(this.modal)||this.game.world.interactables.some(i=>i.id===this.modal&&['npc','lore'].includes(i.kind));}
  advanceDialogue(){if(this.isConversation()){const primary=document.querySelector('.dialogue-actions button:not(:disabled)');primary?primary.click():this.close();}}
  renderModal(){const names={grimoire:'Spells',journal:'Journal',map:'Map',equipment:'Equipment',newjourney:'New journey',help:'Controls',pause:'Paused',rowan:'Rowan',mara:'Mara',market:'Market',innkeeper:'Toma',pip:'Pip'},dialogue=this.isConversation(),title=names[this.modal]||this.game.world.interactables.find(i=>i.id===this.modal)?.name||'The Hollow';
    this.els['modal-root'].innerHTML=`<div class="modal-backdrop ${dialogue?'conversation':''}"><section class="modal ${dialogue?'dialogue':''} ${this.modal==='map'?'map-modal':''}" role="dialog" aria-modal="true" aria-label="${title}"><header><h2>${title}</h2><button data-close aria-label="Close">×</button></header><div class="modal-body">${this.content()}${this.modal==='mara'?this.bounties('Mara'):''}</div></section></div>`;
    this.els['modal-root'].querySelector('[data-close]').focus();
    for(const img of document.querySelectorAll('[data-portrait]'))img.src=this.renderer.thumbnail(Number(img.dataset.portrait),img.dataset.atlas||'creatures');
    if(this.modal==='map')this.renderer.drawMinimap(document.getElementById('atlas-canvas'),true);
    if(this.modal==='map'){
      const canvas=document.getElementById('atlas-canvas');let drag=null;
      canvas.onpointerdown=e=>{if((this.renderer.mapView?.zoom||1)===1)return;drag={x:e.clientX,y:e.clientY,view:{...this.renderer.mapView}};canvas.setPointerCapture(e.pointerId);};
      canvas.onpointermove=e=>{if(!drag)return;const box=canvas.getBoundingClientRect();this.renderer.mapView={...drag.view,x:drag.view.x-(e.clientX-drag.x)/box.width*WIDTH/drag.view.zoom,y:drag.view.y-(e.clientY-drag.y)/box.height*HEIGHT/drag.view.zoom};this.renderer.drawMinimap(canvas,true);};
      canvas.onpointerup=canvas.onpointercancel=()=>drag=null;
    }
    if(this.modal==='grimoire')this.showSpell(this.game.bindings[this.selectedSlot]);
  }
  showSpell(id){const s=SPELL_BY_ID[id],el=document.getElementById('spell-detail');if(!s||!el)return;el.innerHTML=`<strong>${s.name}</strong><p>${s.description}</p><small>◆ ${s.cost} &nbsp; ◷ ${s.cooldown}s${s.aim?' &nbsp; · Place with a click':''}</small>`;}
  content(){const g=this.game;
    if(this.modal==='newjourney')return `<p>Begin again at Willowmere with basic Ember casting. This replaces the current local save. Existing journeys keep their previously available spells until you start anew.</p><div class="dialogue-actions"><button data-new-journey>Start new journey</button><button data-close>Keep current journey</button></div>`;
    if(this.modal==='grimoire')return this.training()+`<div class="bindings">${SLOTS.map(slot=>{const s=SPELL_BY_ID[g.bindings[slot]];return `<button data-slot="${slot}" title="${s.name}" aria-label="Bind ${slot.toUpperCase()}" class="${slot===this.selectedSlot?'selected':''}" style="--spell:${s.color}">${key(slot.toUpperCase())}${icon(s.glyph)}</button>`;}).join('')}</div><div class="spell-list">${SPELLS.map(s=>`<button data-bind="${s.id}" style="--spell:${s.color}" class="${g.bindings[this.selectedSlot]===s.id?'equipped':''}">${icon(s.glyph)}<span>${s.name}${g.learned.has(s.id)?'':' · Unlearned'}</span><small>${SLOTS.filter(k=>g.bindings[k]===s.id).join(' ').toUpperCase()}</small></button>`).join('')}</div><div id="spell-detail" class="spell-detail"></div>`;
    if(this.modal==='journal')return `<div class="tabs"><button data-journal-tab="quests" class="${this.journalTab==='quests'?'selected':''}">Quests</button><button data-journal-tab="wildlife" class="${this.journalTab==='wildlife'?'selected':''}">Creatures</button></div>`+(this.journalTab==='quests'?this.questLog():this.fieldLog());
    if(this.modal==='map')return `<div class="map-tools"><button data-map-zoom="out" aria-label="Zoom map out">−</button><button data-map-zoom="in" aria-label="Zoom map in">+</button><button data-map-zoom="player">Find me</button><button data-map-zoom="overview">Whole world</button><small>Drag to pan when zoomed</small></div><canvas id="atlas-canvas" width="720" height="${Math.round(720*HEIGHT/WIDTH)}" aria-label="World map and player location"></canvas>`;
    if(this.modal==='pause')return `<div class="pause-list"><button data-close>Continue</button>${fullscreenButton()}<button data-menu="grimoire">Spells</button><button data-menu="journal">Journal</button><button data-menu="map">Map</button><button data-menu="help">Controls</button><button data-sound>Sound on / off</button><button data-menu="newjourney">New journey</button><a href="../" style="color:inherit;text-underline-offset:4px;padding:12px">Choose another game</a></div>`;
    if(this.modal==='help')return `<dl class="controls"><dt>Hold + drag</dt><dd>Hold anywhere for a quarter second to use the invisible movement joystick</dd><dt>Pinch</dt><dd>Two fingers zoom the world in or out</dd><dt>Tap / click</dt><dd>Nearby villagers and objects to interact · Creatures to switch targets or observe</dd><dt>WASD / arrows</dt><dd>Move · Shift to run</dd><dt>1 / 2 / 3</dt><dd>Ember / Frost / Siphon auto-casting</dd><dt>Q / E / R</dt><dd>Aim a spell, then tap or click to place</dd><dt>F</dt><dd>Shield immediately</dd><dt>Esc / right-click</dt><dd>Cancel placement</dd><dt>Space</dt><dd>Toggle automatic attacks</dd><dt>C / Enter</dt><dd>Talk, gather, observe</dd><dt>H</dt><dd>Healing tonic</dd><dt>K / I / J / M</dt><dd>Spells / equipment / journal / map</dd><dt>P</dt><dd>Save a screenshot</dd></dl>`;
    if(this.modal==='equipment')return this.pack();
    if(this.modal==='market')return this.shop()+`<div class="shop"><span>${icon('tonic')}</span><div><strong>Wildflower tonic</strong><p>Restores 65 health. 8-second recovery between tonics.</p><small>${g.player.coins} amber · ${g.player.herbs} sprigs</small></div></div><div class="dialogue-actions"><button data-buy="coins" ${g.player.coins<12?'disabled':''}>12 amber</button><button data-buy="herbs" ${g.player.herbs<3?'disabled':''}>3 sprigs</button><button data-close>Leave</button></div>`;
    if(this.modal==='innkeeper')return `<p>“Stay a while. The north road is safe until the pasture. Beyond the river, watch the flowers.”</p><div class="dialogue-actions"><button data-rest>Rest</button><button data-close>Leave</button></div>`;
    if(this.modal==='pip')return `<p>“The little grey ones need cold food AND hot food. Mara says that's why they won't leave the border.”</p><div class="dialogue-actions"><button data-close>Thanks</button></div>`;
    if(this.modal==='rowan'){
      let text,action='';const state=g.quests.herd;
      if(state==='offered'){text='Briars have split my feeding pair. Take the north path and clear the three walking seedlings. Leave the Barkjaws be.';action=this.questButton('herd',"I'll help.");}
      else if(state==='active'&&!g.herdCleared){text='Follow the north path. Three seedlings are keeping the grazers apart. Come back when the pair is together.';}
      else if(state==='active'){text="Together again! Take my singing reed and these tonics. I can teach you Briarbind. Equip the reed in your pack; the market has more lessons. Then help me reopen the winding Briar Road north of the pasture.";action=this.questButton('herd','Learn Briarbind · take wand & supplies');}
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
    if(local?.dialogue||local?.text)return local.kind==='npc'?this.dialogue(local.sprite??36,local.dialogue||local.text)+this.bounties(local.name):`<p>${local.text||local.dialogue}</p><div class="dialogue-actions"><button data-close>Continue</button></div>`;
    return '';
  }
  training(){const g=this.game,p=g.player;return `<p class="rpg-intro">${p.coins} amber · Learn in Willowmere or a safe camp. ${g.quests.herd==='complete'?'Select a key below, then a learned spell to assign it.':'Clear Rowan’s pasture first. Briarbind is your first lesson.'}</p><div class="lesson-list">${[...Object.entries(LESSONS).map(([id,l])=>({id,...l,name:SPELL_BY_ID[id].name,known:g.learned.has(id)})),...Object.entries(STANCE_LESSONS).map(([id,l])=>({id,...l,name:`${STANCES.find(s=>s.id===id).name} casting style`,known:g.stances.has(id),style:true}))].map(l=>`<div><span>${l.name}<small>Level ${l.level} · ${l.known?'Learned':`${l.price} amber`}</small></span>${l.known?'<b>✓</b>':`<button data-learn="${l.id}" data-style="${!!l.style}" ${!g.isSafe||g.quests.herd!=='complete'||p.level<l.level||p.coins<l.price?'disabled':''}>Learn</button>`}</div>`).join('')}</div>`;}
  pack(){const g=this.game,p=g.player;return `<p class="rpg-intro">Level ${p.level} · ${Math.ceil(p.hp)}/${p.maxHp} health · ${p.maxMana} aether<br>${Math.round(g.spellPower*100)}% spell power · ${Math.round((g.gear.armor||0)*100)}% damage reduction · +${Math.round((g.gear.speed||0)*100)}% movement</p><div class="gear-list">${g.inventory.map(id=>{const it=GEAR[id],worn=g.equipment[it.slot]===id;return `<article><div>${icon(it.slot==='weapon'?'staff':it.slot==='robe'?'ward':it.slot==='boots'?'blink':'diamond')}</div><div><strong>${it.name}</strong><small>${it.slot} · ${it.description}</small>${!worn?`<small>Replaces ${GEAR[g.equipment[it.slot]]?.name||'an empty slot'}</small>`:''}</div><button data-equip="${id}" ${worn?'disabled':''}>${worn?'Equipped':'Equip'}</button></article>`;}).join('')}</div>`;}
  shop(){const g=this.game;return `<p class="rpg-intro">${g.player.coins} amber · Equip purchases in Pack (I). Rest at the Hearthstone before setting out.</p><div class="dialogue-actions"><button data-menu="grimoire">Spell lessons</button><button data-menu="equipment">Open pack</button><button data-menu="journal">Bounties</button></div><div class="gear-list">${Object.entries(GEAR).filter(([,it])=>it.price).map(([id,it])=>`<article><div>${icon(it.slot==='weapon'?'staff':'diamond')}</div><div><strong>${it.name}</strong><small>${it.description}</small><small>Level ${it.level} · ${it.price} amber</small></div><button data-gear-buy="${id}" ${g.inventory.includes(id)||g.player.coins<it.price||g.player.level<it.level?'disabled':''}>${g.inventory.includes(id)?'Owned':'Buy'}</button></article>`).join('')}</div>`;}
  bounties(giver=null){const g=this.game;return HUNTS.filter(h=>g.quests[h.id]!=='locked'&&(!giver||h.giver===giver)).map(h=>{const state=g.quests[h.id],done=state==='complete',ready=g.huntReady(h.id),canClaim=giver===h.giver&&g.isSafe;return `<article class="quest-entry ${state}"><h3>${done?'✓ ':''}${h.title} <small>Lv ${h.level}</small></h3><p>${h.detail}</p><ul>${h.camps.map(c=>`<li>${g.cleared.has(c.id)?'✓':'◇'} ${c.name} · Lv ${c.level}${c.elite?' elite':''}</li>`).join('')}</ul><p class="bounty-reward">${GEAR[h.item].name} · ${h.coins} amber · ${h.xp} memories</p>${done?'':state==='offered'?`<button data-quest-action="${h.id}" ${g.isSafe?'':'disabled'}>Accept bounty</button>`:ready?canClaim?`<button data-quest-action="${h.id}">Claim reward</button>`:`<p>Return to ${h.giver} for your reward.</p>`:''}</article>`;}).join('');}
  dialogue(portrait,text,action=''){return `<div class="dialogue-line"><img data-portrait="${portrait}" alt=""/><p>${text}</p></div><div class="dialogue-actions">${action}<button data-close>${action?'Later':'Continue'}</button></div>`;}
  questButton(id,text){return `<button data-quest-action="${id}">${text}</button>`;}
  objective(id){const g=this.game;if(id==='herd')return g.herdCleared?'Return to Rowan.':`Clear the pasture north of Willowmere. ${g.creatures.filter(c=>c.quest==='herd'&&c.dead).length}/3 seedlings.`;if(id==='seam')return g.crossingOpen?'Tell Mara the crossing is open.':'Clear the branches at the Steamward, southeast of Willowmere.';return g.fieldComplete?'Bring the notebook to Mara.':`Observe a Barkjaw, Mantleback, Snowkeel, and Ventback. ${['barkjaw','mantleback','snowkeel','ventback'].filter(s=>g.observed.has(s)).length}/4.`;}
  questLog(){const known=QUESTS.filter(q=>['active','complete'].includes(this.game.quests[q.id]));return this.bounties()+ (known.length?known.map(q=>`<article class="quest-entry ${this.game.quests[q.id]}"><h3>${this.game.quests[q.id]==='complete'?'✓ ':''}${q.title}</h3><p>${this.game.quests[q.id]==='complete'?'Finished.':this.objective(q.id)}</p></article>`).join(''):'<p>Talk to Rowan by the village signpost.</p>');}
  fieldLog(){const ids=[...this.game.observed];if(!ids.length)return '<p>Approach a creature and press C to observe it.</p>';const id=ids.includes(this.selectedNote)?this.selectedNote:ids[0],s=SPECIES[id];return `<div class="creature-list">${ids.map(id=>`<button data-note="${id}" class="${id===this.selectedNote?'selected':''}"><img data-portrait="${SPECIES[id].sprite}" data-atlas="${SPECIES[id].atlas||'creatures'}" alt=""/><span>${SPECIES[id].name}</span></button>`).join('')}</div><article class="field-detail"><h3>${s.name}</h3><p>${s.note}</p></article>`;}
  handleEvent(e){if(e.type==='toast')this.toast(e.text);if(e.type==='dialogue')this.open(e.npc);if(e.type==='map')this.open('map');if(e.type==='bindings')this.renderActions();if(e.type==='save')this.onSave(true);if(e.type==='place')this.showRegion(e.place.name);}
}
