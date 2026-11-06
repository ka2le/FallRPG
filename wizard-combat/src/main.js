import './style.css';
import {JourneyUI} from './journey-ui.js';
import {ITEMS,QUESTS} from './journey.js';
import {regionAt} from './landscape.js';
import {floorAt} from './physics.js';
import {Combat,blocked} from './combat.js';
import {World} from './world.js';
import {TestingMode} from './testing-mode.js';
import {SPELLS,SPECIES,CAMPS,ACTIONS,CONTROLS,SHIELD} from './data.js';
import {spellIcon} from './art/spells.js';
import {MONSTER_ART} from './monsters/index.js';
import {svgMarkup,restPose} from './monsters/rig.js';

const $=s=>document.querySelector(s),game=new Combat();
const testing=new TestingMode(game);
const SAVE_KEY='hollow-fey-journey-v2';let saveError=false,resetting=false,lastSaved=null;
try{const data=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(game.restore(data)){game.player.grounded=true;game.player.y=floorAt(game.player.x,game.player.z)+1.7;}}catch{}
function saveGame(){if(resetting)return;try{const serialized=JSON.stringify(game.save());if(serialized===lastSaved)return;localStorage.setItem(SAVE_KEY,serialized);lastSaved=serialized;saveError=false;}catch{saveError=true;}}
const icons={
  book:'<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>',
  settings:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="18" r="2" fill="currentColor"/>',
  bag:'<path d="M5 9h14l-1.2 11H6.2Z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/><path d="M9.5 13.5h5"/>',
  scroll:'<path d="M7 4h11a2 2 0 0 1 0 4h-1v10a2 2 0 0 1-2 2H6a2 2 0 0 1 0-4h1Z"/><path d="M7 16v2M10 9h5M10 12h5"/>',
  map:'<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2Z"/><path d="M9 4v14M15 6v14"/>',
  claw:'<path d="M6 20c1-5 2-10 6-14M11 20c.5-4 1.5-8 5-12M16 20c0-3 1-6 3-8"/>',
  undo:'<path d="M9 7H5V3"/><path d="M5.5 7A8 8 0 1 1 4 13"/>'
};
const svg=body=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
function mouseIcon(button){
  const fill=button==='left'?'<path d="M11 4C7 4 6 7 6 11h5Z" fill="currentColor" stroke="none"/>':button==='right'?'<path d="M13 4c4 0 5 3 5 7h-5Z" fill="currentColor" stroke="none"/>':`<path d="M4 ${button==='back'?13:8}v4" stroke-width="3"/>`;
  return svg(`<rect x="6" y="3" width="12" height="19" rx="6"/><path d="M12 3v8M6 11h12"/>${fill}`);
}
for(const el of document.querySelectorAll('[data-icon]'))el.innerHTML=svg(icons[el.dataset.icon]);
let world;
try{world=new World($('#world'),game);}catch(error){$('#entry .entry-card').innerHTML='<h1>WebGL unavailable</h1><p>Enable hardware acceleration to play.</p>';throw error;}
let playing=false,started=false,windowed=false,noticeUntil=0,deathUntil=0,hitUntil=0,flash=0,sensitivity=1,soundEnabled=true,audio,returnToPlay=false;
const keys=new Set(),held=new Set(),barViews=new Map();
const dock=$('#spell-dock');
const dockNodes=CONTROLS.map(control=>{
  const s=SPELLS[ACTIONS[control.action]],b=document.createElement('button');b.className='spell-slot';b.style.setProperty('--spell',s.color);
  b.title=`${control.key} · ${s.name}`;b.setAttribute('aria-label',`${control.key}: ${s.name}`);
  b.innerHTML=`<span class="slot-art">${spellIcon(ACTIONS[control.action])}</span><i class="cooldown"></i><b class="cd-text"></b><span class="slot-number">${control.key}</span>${s.cost?`<span class="slot-cost">${s.cost}</span>`:''}`;
  b.onclick=()=>{if(playing)game.use(control.action,movement());else openDialog('book');};(Number.isNaN(Number(control.key))?dock:$('#utility-dock')).append(b);return b;
});
const journeyUI=new JourneyUI(game,saveGame);let lastRevision=-1;
CAMPS.forEach((c,i)=>{
  const b=document.createElement('button');b.className='camp-button';b.title=`${c.name} · travel`;b.setAttribute('aria-label',c.name);
  b.innerHTML=`<span class="enemies">${[...new Set(c.types)].slice(0,3).map(t=>`<span class="portrait tiny">${portraitOf(t)}</span>`).join('')}${c.types.length>3?`<small>${c.types.length}</small>`:''}</span><span class="name">${c.name} · ${c.level}</span>`;
  b.onclick=()=>{game.travel(i);closeDialogs();resume();};$('#camp-list').append(b);
});
function stop(){saveGame();playing=false;keys.clear();held.clear();game.player.moving=false;game.player.vx=game.player.vz=0;document.body.classList.remove('playing');}
function closeDialogs(){for(const id of ['book','lab'])if($(`#${id}`).open)$(`#${id}`).close();}
function openDialog(id,page='spells'){
  if(id==='book')journeyUI.show(page);
  if(!$('#book').open&&!$('#lab').open)returnToPlay=playing;started=true;stop();if(document.pointerLockElement)document.exitPointerLock();closeDialogs();$('#pause').classList.add('hidden');$('#entry').classList.add('hidden');
  $(`#${id}`).showModal();
}
function closeMenu(){closeDialogs();if(returnToPlay)resume();else pause();}
function startWindowed(){windowed=true;started=true;playing=true;closeDialogs();$('#entry').classList.add('hidden');$('#pause').classList.add('hidden');document.body.classList.add('playing');initAudio();}
function captureBlocked(){$('#windowed').classList.remove('hidden');$('#pointer-help').hidden=false;pause();}
async function resume(){
  closeDialogs();started=true;$('#entry').classList.add('hidden');if(windowed){startWindowed();return;}
  try{await $('#world').requestPointerLock();}catch{captureBlocked();}
}
function pause(){stop();if(started&&!$('#book').open&&!$('#lab').open)$('#pause').classList.remove('hidden');}
function leave(){stop();if(document.pointerLockElement)document.exitPointerLock();else pause();}
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement===$('#world')){playing=true;$('#pause').classList.add('hidden');document.body.classList.add('playing');initAudio();}else if(!$('#book').open&&!$('#lab').open)pause();});
document.addEventListener('pointerlockerror',captureBlocked);
document.addEventListener('visibilitychange',()=>{if(document.hidden)leave();});
window.addEventListener('blur',()=>{if(playing)leave();else{keys.clear();held.clear();}});
$('#enter').onclick=resume;$('#resume').onclick=resume;$('#windowed').onclick=startWindowed;
$('#book-button').onclick=()=>openDialog('book');$('#bag-button').onclick=()=>openDialog('book','equipment');$('#pause-bag').onclick=()=>openDialog('book','equipment');$('#lab-button').onclick=()=>openDialog('lab');$('#pause-book').onclick=()=>openDialog('book');$('#pause-lab').onclick=()=>openDialog('lab');
for(const b of document.querySelectorAll('[data-close]'))b.onclick=closeMenu;
for(const d of document.querySelectorAll('dialog'))d.addEventListener('cancel',e=>{e.preventDefault();closeMenu();});
$('#damage-scale').oninput=e=>{game.damageScale=Number(e.target.value)/100;$('#damage-value').textContent=`${e.target.value}%`;};
$('#sensitivity').oninput=e=>{sensitivity=Number(e.target.value)/100;$('#sensitivity-value').textContent=`${e.target.value}%`;};
$('#respawn').onchange=e=>game.respawn=e.target.checked;$('#sound').onchange=e=>soundEnabled=e.target.checked;
$('#refill').onclick=()=>{game.player.hp=game.player.maxHp;game.player.mana=game.player.maxMana;tone(520,.1);};
$('#reset-encounters').onclick=()=>{game.resetEncounters();tone(380,.1);};
$('#reset-session').onclick=()=>{if(!confirm('Start a new journey? This resets your saved spells, equipment and exploration.'))return;resetting=true;localStorage.removeItem(SAVE_KEY);location.reload();};
$('#xp-button').onclick=()=>openDialog('book');$('#quest-tracker').onclick=()=>openDialog('book','journal');
$('#quality').onchange=e=>{const preset={low:[1,32,150],balanced:[1.5,55,220],high:[1.75,70,270]}[e.target.value];world.renderer.setPixelRatio(Math.min(devicePixelRatio,preset[0]));world.treeDetail=preset[1];world.viewDistance=preset[2];world.resize();world.forestTimer=0;};
$('#perf').onchange=e=>$('#performance').hidden=!e.target.checked;
let showNumbers=true;$('#numbers').onchange=e=>showNumbers=e.target.checked;
$('#testing-mode').onchange=e=>{testing.setEnabled(e.target.checked);$('#testing-controls').hidden=!testing.enabled;notice(testing.enabled?'Testing · G to fly · Shift to accelerate':'Testing off');};
function movement(){return {x:Number(keys.has('KeyD'))-Number(keys.has('KeyA')),z:Number(keys.has('KeyS'))-Number(keys.has('KeyW'))};}
function pressAction(action){if(action==='attack')held.add(action);game.use(action,movement());}
const abilityKeys={KeyQ:'shockwave',KeyE:'frostburst',KeyR:'drain',KeyF:'blink',KeyJ:'attack',KeyK:'bind',KeyL:'shield',Digit1:'companion',Digit2:'haste',Digit3:'renew',Digit4:'recall'};
document.addEventListener('keydown',e=>{
  if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
  if(e.code==='Escape'&&windowed&&playing){pause();return;}
  if(['Tab','KeyB','KeyI','KeyV','KeyM','KeyN'].includes(e.code)&&!e.repeat){if(e.code==='Tab'&&$('#book').open)return;e.preventDefault();const page={KeyI:'equipment',KeyV:'journal',KeyM:'map',KeyN:'bestiary'}[e.code]||'spells';if($('#book').open&&journeyUI.tab===page)closeMenu();else openDialog('book',page);return;}
  if(e.code==='KeyT'&&!e.repeat){if($('#lab').open)closeMenu();else openDialog('lab');return;}
  if(!playing)return;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);
  if(!e.repeat){if(e.code==='KeyG'&&testing.enabled)notice(testing.toggleFlight()?'Flight · Space ↑ · Ctrl ↓':'On foot');else if(e.code==='Space'&&!testing.flying)game.jump();else if(abilityKeys[e.code])pressAction(abilityKeys[e.code]);}
});
document.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='KeyJ')held.delete('attack');});
document.addEventListener('mousemove',e=>{if(!playing)return;game.player.yaw-=e.movementX*.0018*sensitivity;game.player.pitch=Math.max(-1.4,Math.min(1.4,game.player.pitch-e.movementY*.0018*sensitivity));});
document.addEventListener('contextmenu',e=>{if(playing)e.preventDefault();});
const mouseButtons={0:'attack',2:'bind',4:'shield'};
document.addEventListener('mousedown',e=>{if(!playing||e.target.closest('button,input,dialog'))return;if(e.button>=2)e.preventDefault();const action=mouseButtons[e.button];if(action){e.preventDefault();pressAction(action);}});
document.addEventListener('mouseup',e=>{if(playing)e.preventDefault();held.delete(mouseButtons[e.button]);});
document.addEventListener('auxclick',e=>{if(playing)e.preventDefault();});
document.addEventListener('wheel',e=>{if(playing)e.preventDefault();},{passive:false});
function notice(text){$('#notice').textContent=text;noticeUntil=performance.now()+2800;}
function initAudio(){if(!audio){const Audio=window.AudioContext||window.webkitAudioContext;if(Audio)audio=new Audio();}audio?.resume();}
function tone(freq,duration,type='sine',volume=.035,end=freq){
  if(!soundEnabled||!audio)return;const osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(30,end),audio.currentTime+duration);gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);
}
let lastHurtTone=0;
function consumeEvents(){
  const events=game.events.splice(0);world.events(events);
  for(const ev of events){
    if(ev.type==='death'){deathUntil=performance.now()+2300;tone(180,.5,'triangle',.08,45);}
    if(ev.type==='hurt'){flash=Math.min(.7,flash+.16);if(game.time-lastHurtTone>.15){tone(80,.12,'triangle',.04,40);lastHurtTone=game.time;}}
    if(ev.type==='cast'){const s=SPELLS[ev.spell];tone([320,220,140,610,180,550,420,660,550,420,320][ev.spell],s.cost?.23:.12,'sine',s.cost?.045:.025,s.cost?130:270);}
    if(ev.type==='latch')tone(230,.22,'sine',.035,500);
    if(ev.type==='hit'){hitUntil=performance.now()+110;tone(130,.05,'triangle',.012,90);const e=game.enemies.find(e=>e.id===ev.enemy);if(e)floater(e,ev.amount===undefined?'Rooted':Math.max(1,Math.round(ev.amount)),ev.amount===undefined?'#bfe48c':ev.color,ev.amount===undefined?'status':'hit');}
    if(ev.type==='kill'){tone(570,.2,'sine',.03,920);const e=game.enemies.find(e=>e.id===ev.enemy);if(e)floater(e,`+${Math.round(e.xpReward)} xp`,'#f2d58a','xp');}
    if(ev.type==='block'){tone(ev.broken?330:820,.18,'sine',.055,ev.broken?100:1500);$('#ward-indicator').classList.remove('blocked');void $('#ward-indicator').offsetWidth;$('#ward-indicator').classList.add('blocked');}
    if(ev.type==='explosion')tone(160,.3,'triangle',.035,55);
    if(ev.type==='level')notice(`Level ${game.level} · +1 ✧ · Tab to learn`);
    if(ev.type==='learn')notice(`${SPELLS[ACTIONS[ev.action]].name} learned`);
    if(ev.type==='locked')notice(`${SPELLS[ACTIONS[ev.action]].name} · learn in the codex [Tab]`);
    if(ev.type==='loot')notice(`${ITEMS[ev.item].name} · I to equip`);
    if(ev.type==='quest')notice(`${ev.name} · complete`);
    if(ev.type==='empty'){$('.vital.mana').classList.remove('empty');void $('.vital.mana').offsetWidth;$('.vital.mana').classList.add('empty');tone(90,.06,'triangle',.015);}
  }
}
// Floating combat numbers, projected onto the enemy and drifting up.
const floaters=[];let tickTimer=0;
function floater(e,text,color,kind='hit'){if(!showNumbers||floaters.length>40)return;const node=document.createElement('span');node.className=`floater ${kind}`;node.textContent=text;node.style.color=color;$('#floaters').append(node);floaters.push({node,x:e.x,y:e.y+SPECIES[e.type].size*.55,z:e.z,age:0,dx:(Math.random()-.5)*30,life:kind==='xp'?1.4:.9});}
function updateFloaters(dt){
  tickTimer-=dt;if(tickTimer<=0){tickTimer=.45;for(const e of game.enemies)if(e.tickPool>=1){floater(e,Math.round(e.tickPool),e.tickColor||'#fff','tick');e.tickPool=0;}}
  for(let i=floaters.length-1;i>=0;i--){const f=floaters[i];f.age+=dt;const pos=world.projectPoint(f.x,f.y,f.z),k=f.age/f.life;
    if(k>=1||!pos.visible){f.node.remove();floaters.splice(i,1);continue;}
    f.node.style.transform=`translate3d(${pos.x+f.dx*k}px,${pos.y-30-k*48}px,0) translate(-50%,-50%) scale(${k<.12?1.35-k*3:1})`;f.node.style.opacity=k<.7?1:1-(k-.7)/.3;}
}
function portraitOf(type){const art=MONSTER_ART[type];return art?svgMarkup(art,restPose(art)):`<span class="emoji">${SPECIES[type].emoji}</span>`;}
let frameTarget=null;
function updateTargetFrame(){
  const t=game.target(72)||game.enemies.find(e=>e.id===game.beam.target&&e.hp>0),frame=$('#target-frame');
  if(!t){frame.hidden=true;frameTarget=null;return;}frame.hidden=false;
  if(frameTarget!==t.id){frameTarget=t.id;frame.querySelector('.tf-portrait').innerHTML=portraitOf(t.type);frame.querySelector('.tf-name b').textContent=SPECIES[t.type].name;frame.querySelector('.tf-name small').textContent=t.level;}
  frame.querySelector('.tf-bar i').style.transform=`scaleX(${Math.max(0,t.hp/t.maxHp)})`;frame.querySelector('.tf-bar span').textContent=`${Math.ceil(t.hp)} / ${t.maxHp}`;
  frame.querySelector('.tf-status').innerHTML=[t.windup>0?'<i class="st danger">Attacking</i>':'',t.root>0?`<i class="st root">Rooted ${t.root.toFixed(1)}s</i>`:'',t.freeze>0?'<i class="st stun">Staggered</i>':'',t.slow>0?'<i class="st slow">Slowed</i>':'',t.burn>0?'<i class="st burn">Burning</i>':'',t.shell?'<i class="st shell">Ice shell</i>':''].join('');
  frame.classList.toggle('danger',t.windup>0);
}
function updateEnemyBars(){
  const target=game.target(70),live=new Set(game.enemies.map(e=>e.id));
  for(const [id,node] of barViews)if(!live.has(id)){node.remove();barViews.delete(id);}
  for(const e of game.enemies){
    let node=barViews.get(e.id);
    if(e.hp<=0||Math.hypot(e.x-game.player.x,e.z-game.player.z)>65){if(node)node.style.opacity='0';continue;}
    if(!node){node=document.createElement('div');node.className='enemy-health';node.innerHTML=`<div class="status"></div><div class="track"><b>${e.level}</b><div class="fill"></div></div>`;$('#enemy-bars').append(node);barViews.set(e.id,node);}
    const distance=Math.hypot(e.x-game.player.x,e.z-game.player.z),pos=world.project(e);
    const visible=e.hp>0&&distance<65&&pos.visible&&(e.aggro||e.hp<e.maxHp||target===e)&&!blocked(game.player,e);
    node.style.opacity=visible?'1':'0';if(!visible)continue;
    node.style.transform=`translate3d(${pos.x-37}px,${pos.y-23}px,0)`;
    node.querySelector('.fill').style.transform=`scaleX(${Math.max(0,e.hp/e.maxHp)})`;node.classList.toggle('target',target===e);
    node.classList.toggle('danger',e.windup>0);
    node.querySelector('.status').textContent=[e.windup>0?'!':'',e.root>0?'❧':'',e.freeze>0?'◎':'',game.beam.time>0&&game.beam.target===e.id?'☽':'',e.shell?'◇':''].filter(Boolean).slice(0,3).join('');
  }
  $('#crosshair').classList.toggle('locked',!!game.target());$('#crosshair').classList.toggle('hit',performance.now()<hitUntil);
}
let uiTime=0;
function updateUI(dt){
  updateEnemyBars();updateFloaters(dt);updateTargetFrame();uiTime+=dt;if(uiTime<.05)return;uiTime=0;const p=game.player;
  $('#hp').style.transform=`scaleX(${p.hp/p.maxHp})`;$('#mana').style.transform=`scaleX(${p.mana/p.maxMana})`;$('#hp-text').textContent=`${Math.ceil(p.hp)} / ${p.maxHp}`;$('#mana-text').textContent=`${Math.floor(p.mana)} / ${p.maxMana}`;
  dockNodes.forEach((node,n)=>{
    const control=CONTROLS[n],index=ACTIONS[control.action],s=SPELLS[control.action==='attack'?game.attackMode:index],known=game.known.has(control.action);node.hidden=!known;node.classList.toggle('locked',!known);
    node.style.setProperty('--spell',s.color);
    node.classList.toggle('selected',control.action==='attack'||control.action==='drain'&&game.beam.time>0||control.action==='shield'&&p.ward>0);
    node.classList.toggle('unaffordable',p.mana<s.cost);const cd=game.cooldowns[index],frac=cd/s.rate;node.querySelector('.cooldown').style.setProperty('--cd',`${frac*360}deg`);node.classList.toggle('cooling',cd>.3&&s.rate>1);node.querySelector('.cd-text').textContent=cd>.3&&s.rate>1?(cd<10?cd.toFixed(1):Math.ceil(cd)):'';
    node.title=`${control.key} · ${s.name}${s.cost?' · '+s.cost+' ◆':''}`;node.setAttribute('aria-label',`${control.key}: ${s.name}`);
  });
  const region=regionAt(p.x,p.z);$('#region-name').textContent=region.name;$('#region-level').textContent=region.name==='The Hearth'?'':`Lv ${region.level}+`;
  $('#level-text').textContent=game.level;$('#xp-fill').style.transform=`scaleX(${game.xp/game.xpNeeded()})`;$('#knowledge-badge').textContent=game.knowledge?`+${game.knowledge}`:'';$('#xp-button').title=`Level ${game.level} · ${Math.floor(game.xp)} / ${game.xpNeeded()} xp`;
  const activeQuest=QUESTS.find(q=>game.questAvailable(q)&&!game.claimed.has(q.id));const qp=activeQuest?game.questProgress(activeQuest):0,qKey=activeQuest?`${activeQuest.id}:${qp}`:'';if($('#quest-tracker').dataset.key!==qKey){$('#quest-tracker').dataset.key=qKey;$('#quest-tracker').innerHTML=activeQuest?`<i class="${qp>=activeQuest.need?'ready':''}"></i><b>${activeQuest.name}</b><span>${qp} / ${activeQuest.need}</span>`:'';}
  const buffs=[[7,game.companion.time],[8,game.buffs.haste],[9,game.buffs.renew],[10,game.buffs.recall]].filter(([,t])=>t>0);const buffKey=buffs.map(b=>b[0]).join();
  if($('#buffs').dataset.key!==buffKey){$('#buffs').dataset.key=buffKey;$('#buffs').innerHTML=buffs.map(([i])=>`<span class="buff">${spellIcon(i)}<b></b></span>`).join('');}
  $('#buffs').querySelectorAll('.buff b').forEach((b,i)=>b.textContent=Math.ceil(buffs[i][1]));
  if(lastRevision!==game.revision){lastRevision=game.revision;if($('#book').open)journeyUI.render();saveGame();}
  $('#beam-indicator').hidden=game.beam.time<=0;$('#beam-indicator i').style.transform=`scaleX(${game.beam.time/SPELLS[4].duration})`;
  $('#beam-indicator').classList.toggle('latched',game.beam.target!==null);
  $('#stat-kills').textContent=game.kills;$('#stat-deaths').textContent=game.deaths;$('#stat-level').textContent=game.level;
  $('#notice').style.opacity=performance.now()<noticeUntil?'1':'0';$('#death').hidden=performance.now()>=deathUntil;
  $('#ward-indicator').hidden=p.ward<=0;$('#ward-indicator>span').innerHTML=Array.from({length:SHIELD.charges},(_,i)=>`<i class="${i<p.wardHits?'charged':''}"></i>`).join('');$('#ward-indicator .ward-time i').style.transform=`scaleX(${p.ward/SHIELD.duration})`;
}
let worldDt=0,menuFrame=0,previous=performance.now(),perfTime=0,perfFrames=0,frameMs=16,saveTime=0;
function frame(now){
  const elapsed=now-previous,dt=Math.min(elapsed/1000,.05);previous=now;frameMs=frameMs*.95+elapsed*.05;perfTime+=dt;perfFrames++;saveTime+=dt;if(saveTime>10){saveTime=0;saveGame();}if(perfTime>1){$('#performance').textContent=`${Math.round(1000/frameMs)} fps · ${world.renderer.info.render.calls} draws · ${Math.round(world.renderer.info.render.triangles/1000)}k tris`;perfTime=0;perfFrames=0;}
  if(playing){
    const m=movement();if(windowed){game.player.yaw+=(Number(keys.has('ArrowLeft'))-Number(keys.has('ArrowRight')))*dt*1.7*sensitivity;game.player.pitch=Math.max(-1.35,Math.min(1.35,game.player.pitch+(Number(keys.has('ArrowUp'))-Number(keys.has('ArrowDown')))*dt*1.3*sensitivity));}
    const sprint=keys.has('ShiftLeft')||keys.has('ShiftRight'),vertical=Number(keys.has('Space'))-Number(keys.has('ControlLeft')||keys.has('ControlRight'));
    if(!testing.move(m.x,m.z,dt,sprint,vertical))game.move(m.x,m.z,dt,sprint);game.update(dt);
    if(held.has('attack'))game.use('attack',m);
  }
  // Behind an open menu the blurred scene only needs a few frames per second.
  consumeEvents();worldDt+=dt;const menu=$('#book').open||$('#lab').open;if(!menu||now-menuFrame>250){world.update(worldDt);worldDt=0;menuFrame=now;}flash=Math.max(0,flash-dt*2);$('#damage-flash').style.opacity=flash;updateUI(dt);requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.hollowSnapshot=()=>({playing,progress:game.save(),render:{calls:world.renderer.info.render.calls,triangles:world.renderer.info.render.triangles,frameMs},attackMode:SPELLS[game.attackMode].id,beam:{...game.beam},player:{...game.player},projectiles:game.projectiles.map(b=>({team:b.team,spell:b.spell,x:b.x,y:b.y,z:b.z})),enemies:game.enemies.map(e=>({type:e.type,hp:e.hp,x:e.x,z:e.z,root:e.root,ai:e.aiState,cover:e.coverPlan?.id})),kills:game.kills,deaths:game.deaths});

window.addEventListener('pagehide',saveGame);
if(import.meta.env.DEV)window.hollowGame=game;
