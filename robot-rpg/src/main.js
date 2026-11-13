import './style.css';
import './game-ui.css';
import './skills-ui.css';
import './forge.css';
import { Game, SAVE_KEY, interactRange } from './game.js';
import { Renderer } from './render.js';
import { UI, shell } from './ui.js';
import { Soundscape } from './audio.js';
import { saveScreenshot } from './screenshot.js';
import { SPECIES, SLOTS } from './data.js';
import { WorldTouchControls } from './touch-controls.js';

document.getElementById('app').innerHTML=shell();
let saved=null,storageAvailable=true;
try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{storageAvailable=false;}
const game=new Game(saved),canvas=document.getElementById('world'),renderer=new Renderer(canvas,game),sound=new Soundscape();
let lastSave=0,capturing=false,restarting=false;
async function printscreen(){
  if(capturing)return;capturing=true;
  try{await saveScreenshot();}catch(error){console.error(error);ui.toast('Screenshot could not be saved.');}
  finally{capturing=false;}
}
function save(manual=false){
  if(restarting)return;
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(game.snapshot()));game.dirty=false;lastSave=performance.now();if(manual)ui.saved();}
  catch{storageAvailable=false;if(manual)ui.toast('Saving unavailable.');}
}
const ui=new UI(game,renderer,save),keys=new Set();
const touch=new WorldTouchControls(canvas,{enabled:()=>!ui.modal&&!game.paused,tap:worldTap,getZoom:()=>renderer.zoom,setZoom:zoom=>renderer.setZoom(zoom),startMove:()=>{game.destination=null;game.route=[];}});
ui.onPause=()=>{keys.clear();touch.reset();};
const handled=['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift',...SLOTS,'c',' ','f','enter','tab','j','k','m','i','escape'];
// Space interacts. When it opens a conversation, focus lands on a dialogue button; swallow the
// matching keyup so the browser does not also "click" that button and close it again.
let eatSpaceUp=false;
function clearKeys(){keys.clear();touch.reset();}
// I: items · K: spells (Character window) · J: quests · M: map (Journal window).
function windowKey(k){
  if(k==='i')ui.openCharacter('gear');else if(k==='k')ui.openCharacter('spells');
  else if(k==='j')ui.openJournal('quests');else if(k==='m')ui.openJournal('map');else return false;
  return true;
}
window.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(ui.modal&&document.activeElement?.matches('input, textarea, select')&&k!=='tab'){if(k==='escape'){e.preventDefault();ui.close();clearKeys();}return;}
  if(k==='p'){e.preventDefault();if(!e.repeat)void printscreen();return;}
  if(ui.modal){
    if(k==='enter'&&document.activeElement?.matches('a[href], [data-fullscreen], .char button, .char select'))return;
    if(k===' '&&ui.isConversation()){e.preventDefault();eatSpaceUp=true;if(!e.repeat)ui.advanceDialogue();return;}
    if(k==='enter'){e.preventDefault();ui.advanceDialogue();return;}
    if(k==='escape'){e.preventDefault();ui.close();clearKeys();return;}
    // Window keys still work while a window is open: switch tab, or close on a second press.
    if(!e.repeat&&!ui.isConversation()&&windowKey(k)){e.preventDefault();return;}
    // Trap keyboard focus inside the open dialog.
    if(k==='tab'){const focusable=[...document.querySelectorAll('#modal-root button:not(:disabled), #modal-root select:not(:disabled), #modal-root input:not(:disabled), #modal-root textarea:not(:disabled), #modal-root a[href]')].filter(el=>el.getClientRects().length),current=focusable.indexOf(document.activeElement),next=e.shiftKey?(current<=0?focusable.length-1:current-1):(current+1)%focusable.length;e.preventDefault();focusable[next]?.focus();}
    return;
  }
  // Space/Enter retain normal activation for focused menu buttons.
  if(document.activeElement?.tagName==='BUTTON'&&(k===' '||k==='enter'))return;
  if(handled.includes(k))e.preventDefault();keys.add(k);if(e.repeat)return;
  if(SLOTS.includes(k))game.beginCast(k);
  if(k===' '){eatSpaceUp=true;game.interact();}if(k==='enter')game.interact();if(k==='f')game.tonic();if(k==='tab')game.cycleTarget();
  if(k==='c')game.toggleAutoAttack();
  if(windowKey(k))clearKeys();if(k==='escape'){clearKeys();if(game.aiming)game.cancelCast();else ui.open('pause');}
});
window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys.delete(k);if(k===' '&&eatSpaceUp){eatSpaceUp=false;e.preventDefault();}});
window.addEventListener('blur',()=>{clearKeys();if(!ui.modal)ui.open('pause');save();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearKeys();save();if(!ui.modal)ui.open('pause');}});
window.addEventListener('beforeunload',()=>save());
canvas.addEventListener('pointermove',e=>{const point=renderer.world(e.clientX,e.clientY),hit=renderer.hitCreature(point);renderer.hover=hit?.id||null;game.pointer=point;const spot=!hit&&!game.aiming?renderer.hitInteractable(point):null;renderer.hoverSpot=spot?.id||null;canvas.style.cursor=game.aiming?'crosshair':hit||spot?'pointer':'default';});
canvas.addEventListener('pointerleave',()=>{renderer.hover=null;renderer.hoverSpot=null;});
function worldTap(clientX,clientY){
  if(ui.modal||game.paused)return;
  const point=renderer.world(clientX,clientY),hit=renderer.hitCreature(point);
  game.pointer=point;
  if(game.aiming)game.confirmCast(point);
  else if(hit){game.chooseTarget(hit.id);if(SPECIES[hit.type].neutral&&Math.hypot(hit.x-game.player.x,hit.y-game.player.y)<115)game.observe(hit);}
  else {
    const near=renderer.hitInteractable(point);
    if(near){
      if(Math.hypot(near.x-game.player.x,near.y-game.player.y)>=interactRange(near)){game.walkToInteract(near);return;}
      game.target=null;game.destination=null;game.route=[];game.nearby=near;game.interact();
    }
  }
}
canvas.addEventListener('pointerdown',e=>{
  if(ui.modal)return;canvas.focus();sound.ctx?.resume();
  if(e.pointerType==='touch')return;
  e.preventDefault();if(e.button===0)worldTap(e.clientX,e.clientY);
  if(e.button===2){e.preventDefault();game.cancelCast();}
});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('click',async e=>{if(!e.target.closest('[data-sound]'))return;try{const enabled=await sound.toggle();ui.toast(enabled?'Sound on.':'Sound off.');}catch{ui.toast('Audio unavailable.');}});
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>renderer.resize(),80);});

try{
  await renderer.init();ui.ready();if(!storageAvailable)ui.toast('Local saves are unavailable in this browser.');
  let last=performance.now();
  function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;
    if(capturing){requestAnimationFrame(frame);return;}
    game.update(dt,{left:keys.has('a')||keys.has('arrowleft'),right:keys.has('d')||keys.has('arrowright'),up:keys.has('w')||keys.has('arrowup'),down:keys.has('s')||keys.has('arrowdown'),x:touch.movement.x,y:touch.movement.y,run:keys.has('shift')});
    for(const e of game.events.splice(0)){if(e.type==='new-journey'){try{localStorage.setItem(SAVE_KEY,JSON.stringify(new Game().snapshot()));restarting=true;location.reload();return;}catch{ui.toast('Could not replace the local save.');}}ui.handleEvent(e);sound.event(e);}renderer.draw(dt);ui.tick(dt);if(!game.paused)sound.update(dt,game);
    if(now-lastSave>12000&&!game.paused)save();requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // Explicit opt-in harness for local browser verification; absent from production builds.
  if(import.meta.env.DEV&&new URLSearchParams(location.search).has('test'))window.__hollow={game,renderer,ui,save};
}catch(error){console.error(error);document.getElementById('loading').innerHTML='<p>Artwork could not load. Refresh to retry.</p>';}
