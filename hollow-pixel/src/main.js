import './style.css';
import { Game, SAVE_KEY } from './game.js';
import { Renderer } from './render.js';
import { UI, shell } from './ui.js';
import { Soundscape } from './audio.js';
import { saveScreenshot } from './screenshot.js';
import { SPECIES } from './data.js';

document.getElementById('app').innerHTML=shell();
let saved=null,storageAvailable=true;
try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{storageAvailable=false;}
const game=new Game(saved),canvas=document.getElementById('world'),renderer=new Renderer(canvas,game),sound=new Soundscape();
let lastSave=0,capturing=false;
async function printscreen(){
  if(capturing)return;capturing=true;
  try{await saveScreenshot();}catch(error){console.error(error);ui.toast('Screenshot could not be saved.');}
  finally{capturing=false;}
}
function save(manual=false){
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(game.snapshot()));game.dirty=false;lastSave=performance.now();if(manual)ui.saved();}
  catch{storageAvailable=false;if(manual)ui.toast('Saving unavailable.');}
}
const ui=new UI(game,renderer,save),keys=new Set();
const handled=['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift','q','e','f','r','c',' ','1','2','3','h','enter','tab','j','k','m','escape'];
function clearKeys(){keys.clear();}
window.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(k==='p'){e.preventDefault();if(!e.repeat)void printscreen();return;}
  if(ui.modal){
    if(k==='enter'&&document.activeElement?.tagName==='A')return;
    if(k==='c'||k==='enter'){e.preventDefault();ui.advanceDialogue();return;}
    if(k==='escape'){e.preventDefault();ui.close();clearKeys();return;}
    // Trap keyboard focus inside the open dialog.
    if(k==='tab'){const focusable=[...document.querySelectorAll('#modal-root button:not(:disabled), #modal-root a[href]')],current=focusable.indexOf(document.activeElement),next=e.shiftKey?(current<=0?focusable.length-1:current-1):(current+1)%focusable.length;e.preventDefault();focusable[next]?.focus();}
    return;
  }
  // Space/Enter retain normal activation for focused menu buttons.
  if(document.activeElement?.tagName==='BUTTON'&&(k===' '||k==='enter'))return;
  if(handled.includes(k))e.preventDefault();keys.add(k);if(e.repeat)return;
  if(['q','e','f','r'].includes(k))game.beginCast(k);
  if(['1','2','3'].includes(k))game.setStance({1:'ember',2:'frost',3:'siphon'}[k]);
  if(k==='c'||k==='enter')game.interact();if(k==='h')game.tonic();if(k==='tab'){const modes=['ember','frost','siphon'];game.setStance(modes[(modes.indexOf(game.stance)+1)%3]);}
  if(k===' ')game.autoAttack=!game.autoAttack;
  if(k==='j'){clearKeys();ui.open('journal');}if(k==='k'){clearKeys();ui.open('grimoire');}if(k==='m'){clearKeys();ui.open('map');}if(k==='escape'){clearKeys();if(game.aiming)game.cancelCast();else ui.open('pause');}
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{clearKeys();if(!ui.modal)ui.open('pause');save();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearKeys();save();if(!ui.modal)ui.open('pause');}});
window.addEventListener('beforeunload',()=>save());
canvas.addEventListener('pointermove',e=>{const point=renderer.world(e.clientX,e.clientY),hit=renderer.hitCreature(point);renderer.hover=hit?.id||null;game.pointer=point;canvas.style.cursor=game.aiming?'crosshair':hit?'pointer':'default';});
canvas.addEventListener('pointerleave',()=>renderer.hover=null);
canvas.addEventListener('pointerdown',e=>{
  if(ui.modal||e.isPrimary===false)return;e.preventDefault();canvas.focus();sound.ctx?.resume();const point=renderer.world(e.clientX,e.clientY),hit=renderer.hitCreature(point);
  game.pointer=point;
  if(e.button===0){
    if(game.aiming)game.confirmCast(point);
    else if(hit){game.chooseTarget(hit.id);if(SPECIES[hit.type].neutral&&Math.hypot(hit.x-game.player.x,hit.y-game.player.y)<115)game.observe(hit);}
    else {
      const near=game.nearby;
      if(near&&Math.abs(point.x-near.x)<22&&point.y>near.y-60&&point.y<near.y+18){game.target=null;game.destination=null;game.route=[];game.interact();}
      else game.navigateTo(point.x,point.y);
    }
  }
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
    game.update(dt,{left:keys.has('a')||keys.has('arrowleft'),right:keys.has('d')||keys.has('arrowright'),up:keys.has('w')||keys.has('arrowup'),down:keys.has('s')||keys.has('arrowdown'),run:keys.has('shift')});
    for(const e of game.events.splice(0)){ui.handleEvent(e);sound.event(e);}renderer.draw(dt);ui.tick(dt);if(!game.paused)sound.update(dt);
    if(now-lastSave>12000&&!game.paused)save();requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // Explicit opt-in harness for local browser verification; absent from production builds.
  if(import.meta.env.DEV&&new URLSearchParams(location.search).has('test'))window.__hollow={game,renderer,ui,save};
}catch(error){console.error(error);document.getElementById('loading').innerHTML='<p>Artwork could not load. Refresh to retry.</p>';}
