import { GEAR } from './adventure.js';
import { ITEM_TYPES } from './items.js';
import { ITEM_SPRITES, pixelItem } from './item-sprites.js';
import { SLOT_INFO, gicon } from './ui-art.js';
import { emptyForgeDraft, validateForgeDraft, FORGE_STATS, FORGE_EFFECTS, FORGE_HOOKS } from './forge.js';
import { askForge, loadForgeSettings, saveForgeSettings, setForgeApiKey, hasForgeApiKey } from './forge-ai.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const options=(entries,value)=>entries.map(([id,name])=>`<option value="${esc(id)}" ${value===id?'selected':''}>${esc(name)}</option>`).join('');
const spriteName=id=>GEAR[id]?.name||ITEM_SPRITES[id]?.name||id;
const INTRO='Bring me a shape, a number, or an impossible idea. I carry the heat; the little rift supplies the magic. What shall we make?';
export class ForgeScreen{
  constructor(ui){this.ui=ui;this.draft=emptyForgeDraft();this.messages=[];this.settings=loadForgeSettings();this.status='';this.busy=false;this.search='';this.category='all';this.created=null;this.connectionOpen=false;this.revision=0;}
  render(){const d=this.draft;
    return `<div class="forge-window">
      <div class="forge-ribbon"><button data-forge="connection" aria-label="Forge connection settings" title="Connection settings" aria-expanded="${this.connectionOpen}">${gicon('gem')}${this.settings.provider==='api'?'OpenAI API':'Local Codex'}</button></div>
      ${this.connectionOpen?this.connection():''}
      <div class="forge-columns">
        <section class="forge-bench" aria-label="Item workbench">
          <div class="forge-preview">${pixelItem(d.sprite,'forge-preview-art')}<h3 data-forge-preview-name>${esc(d.name)}</h3><b>FREE</b></div>
          <div class="forge-editor">
            <div class="forge-fields"><label>Item name<input data-forge-field="name" maxlength="100" value="${esc(d.name)}"/></label><label>Item type<select data-forge-field="slot">${options(ITEM_TYPES.map(id=>[id,SLOT_INFO[id].name]),d.slot)}</select></label></div>
            <label class="forge-description">Description<textarea data-forge-field="description" rows="2" maxlength="2000">${esc(d.description)}</textarea></label>
            <div class="forge-section-title"><h3>Choose a shape</h3></div>
            <div class="forge-art-tools"><input data-forge-search placeholder="Search drawings…" aria-label="Search item drawings" value="${esc(this.search)}"/><select data-forge-category aria-label="Drawing collection">${options([['all','All drawings'],['gear','Equipment'],['supplies','Supplies & curios']],this.category)}</select></div>
            <div class="forge-sprites" aria-label="Item drawings">${Object.keys(ITEM_SPRITES).map(id=>`<button class="tile ${d.sprite===id?'picked':''}" data-forge-sprite="${id}" title="${esc(spriteName(id))}" aria-label="${esc(spriteName(id))}" aria-pressed="${d.sprite===id}">${pixelItem(id)}</button>`).join('')}</div>
            <div class="forge-section-title"><h3>Inscribe the numbers</h3><small>Percent fields use 100 = +100%</small></div>
            <div class="forge-stats">${Object.entries(FORGE_STATS).map(([id,[name,unit]])=>`<label>${name}${unit==='percent'?' %':''}<input type="number" step="any" data-forge-stat="${id}" value="${(d.stats[id]||0)*(unit==='percent'?100:1)}"/></label>`).join('')}</div>
            <div class="forge-section-title"><h3>Function slot</h3><small>Active while equipped</small></div>
            <label>Starting effect<select data-forge-field="effect">${options(Object.entries(FORGE_EFFECTS).map(([id,v])=>[id,v.name]),d.effect)}</select></label>
            <details class="forge-code" ${d.functionCode?'open':''}><summary>Inspect & edit JavaScript${d.functionCode?' · inscribed':''}</summary><p>Return an object with ${FORGE_HOOKS.join(', ')}. Each hook receives <code>{game, player, item, state, ...event}</code>. Experimental code has full access to this game and browser.</p><textarea spellcheck="false" data-forge-field="functionCode" rows="9" aria-label="Item function JavaScript" placeholder="return { onDamage(ctx) { /* your magic */ } };">${esc(d.functionCode)}</textarea></details>
          </div>
          <div class="forge-actions"><button class="primary" data-forge="craft">${gicon('spark')}Forge to pack</button><button data-forge="reset" title="Start a new draft">New draft</button></div>
          <div class="forge-status" role="status" aria-live="polite">${esc(this.status)}${this.pendingDraft?'<button data-forge="apply-suggestion">Apply Cinder’s suggestion</button>':''}${this.created?` <button data-menu="equipment">Open inventory →</button>`:''}</div>
        </section>
        <aside class="forge-smith" aria-label="Talk to Cinder">
          <div class="forge-smith-heading"><span class="forge-smith-sprite" aria-hidden="true"></span><h3>Cinder</h3></div>
          <div class="forge-chat" role="log" aria-label="Conversation with Cinder" aria-live="polite"><article class="smith"><small>Cinder</small><p>${INTRO}</p></article>${this.messages.map(m=>`<article class="${m.role==='user'?'player':'smith'}"><small>${m.role==='user'?'You':'Cinder'}</small><p>${esc(m.content)}</p></article>`).join('')}${this.busy?`<article class="smith forge-thinking"><small>Cinder</small><p>${esc(this.progress||'Shaping your idea…')}</p></article>`:''}</div>
          <div class="forge-examples"><button data-forge-prompt="Make a crown with extreme mana regeneration.">A crown of endless mana</button><button data-forge-prompt="Make me a ring that makes me immune to Ventbacks. Inspect how their damage works.">A ring against Ventbacks</button></div>
          <form class="forge-compose"><textarea id="forge-prompt" aria-label="Talk to Cinder" rows="3" maxlength="6000" placeholder="What if a ring could…" ${this.busy?'disabled':''}></textarea><div>${this.busy?'<button type="button" data-forge="cancel">Cancel</button>':'<button type="submit" class="primary">Ask Cinder ↗</button>'}</div></form>
        </aside>
      </div>
    </div>`;
  }
  connection(){return `<section class="forge-connection" aria-label="Forge connection settings"><label>Connection<select data-forge-provider>${options([['codex','Local Codex (default)'],['api','OpenAI API key']],this.settings.provider)}</select></label>${this.settings.provider==='api'?`<label>OpenAI API key<input type="password" data-forge-key autocomplete="off" placeholder="${hasForgeApiKey()?'Key set for this page session':'sk-…'}"/></label><p>Your personal key stays in memory until the page closes. API requests use your OpenAI billing. On GitHub Pages, the smith can inspect the bundled game source.</p>`:`<label>Local bridge URL (hosted game)<input data-forge-bridge value="${esc(this.settings.bridge)}"/></label><p>Local play: <code>npm run dev</code> includes the connection. Hosted play: start <code>npm run forge:bridge</code> and allow your site's origin with <code>FORGE_ALLOWED_ORIGIN</code>.</p>`}</section>`;}
  afterRender(){const root=document.querySelector('.forge-window');if(!root)return;
    this.filterSprites();const chat=root.querySelector('.forge-chat');chat.scrollTop=chat.scrollHeight;
    if(this.promptText)root.querySelector('#forge-prompt').value=this.promptText;
    if(this.editorScroll)root.querySelector('.forge-editor').scrollTop=this.editorScroll;
    root.querySelectorAll('[data-forge-field]').forEach(el=>el.addEventListener('input',()=>{
      const key=el.dataset.forgeField;this.draft[key]=el.value;this.revision++;
      if(key==='name')root.querySelector('[data-forge-preview-name]').textContent=el.value;
      if(key==='effect'){this.draft.functionCode=FORGE_EFFECTS[el.value].code;this.refresh();}
    }));
    root.querySelectorAll('[data-forge-stat]').forEach(el=>el.addEventListener('input',()=>{this.draft.stats[el.dataset.forgeStat]=el.value===''?0:el.valueAsNumber/(FORGE_STATS[el.dataset.forgeStat][1]==='percent'?100:1);this.revision++;}));
    root.querySelector('[data-forge-search]').addEventListener('input',e=>{this.search=e.target.value;this.filterSprites();});
    root.querySelector('[data-forge-category]').addEventListener('change',e=>{this.category=e.target.value;this.filterSprites();});
    root.querySelector('[data-forge-provider]')?.addEventListener('change',e=>{this.settings.provider=e.target.value;this.persistSettings();this.refresh();});
    root.querySelector('[data-forge-bridge]')?.addEventListener('change',e=>{try{const url=new URL(e.target.value);if(!['http:','https:'].includes(url.protocol)||!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw new Error('Use a localhost bridge URL.');this.settings.bridge=url.origin;this.persistSettings();}catch(error){this.status=error.message;this.refresh();}});
    root.querySelector('[data-forge-key]')?.addEventListener('change',e=>{setForgeApiKey(e.target.value);e.target.value='';e.target.placeholder=hasForgeApiKey()?'Key set for this page session':'sk-…';});
    root.querySelector('.forge-compose').addEventListener('submit',e=>{e.preventDefault();void this.ask();});
  }
  persistSettings(){try{saveForgeSettings(this.settings);}catch{this.status='Connection selected for this session; browser settings storage is unavailable.';}}
  editItem(id){const item=this.ui.game.forgedItems[id];if(!item)return;this.editingId=id;this.draft=structuredClone(item);this.revision++;this.created=null;this.pendingDraft=null;this.status=`Editing ${item.name}.`;this.refresh();}
  filterSprites(){for(const el of document.querySelectorAll('[data-forge-sprite]')){const id=el.dataset.forgeSprite,gear=ITEM_SPRITES[id].sheet==='items-gear-v1',match=(!this.search||`${spriteName(id)} ${id}`.toLowerCase().includes(this.search.toLowerCase()))&&(this.category==='all'||(this.category==='gear'?gear:!gear));el.hidden=!match;}}
  refresh(){if(this.ui.modal==='forge'){this.promptText=document.getElementById('forge-prompt')?.value||'';this.editorScroll=document.querySelector('.forge-editor')?.scrollTop||0;this.ui.renderModal();}}
  click(el){
    if(el.dataset.forgeSprite){this.draft.sprite=el.dataset.forgeSprite;this.revision++;this.refresh();return true;}
    if(el.dataset.forgePrompt){const field=document.getElementById('forge-prompt');if(field&&!this.busy){field.value=el.dataset.forgePrompt;field.focus();}return true;}
    const action=el.dataset.forge;if(!action)return false;
    if(action==='connection'){this.connectionOpen=!this.connectionOpen;this.refresh();}
    if(action==='cancel'){this.abort?.abort();}
    if(action==='apply-suggestion'&&this.pendingDraft){this.draft=this.pendingDraft;this.pendingDraft=null;this.revision++;this.status='Cinder’s suggestion is on the anvil.';this.refresh();}
    if(action==='reset'){this.draft=emptyForgeDraft();this.editingId=null;this.revision++;this.created=null;this.pendingDraft=null;this.status='A fresh shape awaits.';this.refresh();}
    if(action==='craft')try{this.created=this.editingId?this.ui.game.reforgeItem(this.editingId,this.draft):this.ui.game.forgeItem(this.draft);this.ui.onSave();this.status=`${this.draft.name} is in your pack.`;this.refresh();}catch(error){this.status=error.message;this.refresh();}
    return true;
  }
  async ask(){const field=document.getElementById('forge-prompt'),text=field?.value.trim();if(!text||this.busy)return;
    this.messages.push({role:'user',content:text});field.value='';this.promptText='';this.busy=true;this.status='';this.abort=new AbortController();const timeout=setTimeout(()=>this.abort?.abort(),480000),revision=this.revision;
    let draft;try{draft=validateForgeDraft(this.draft);}catch(error){this.messages.push({role:'assistant',content:`Check the draft first: ${error.message}`});this.busy=false;clearTimeout(timeout);this.refresh();return;}
    this.refresh();
    try{const reply=await askForge({messages:this.messages,draft,settings:this.settings,signal:this.abort.signal,onProgress:message=>{this.progress=message;this.refresh();}});this.messages.push({role:'assistant',content:reply.message});if(reply.draft){if(this.revision===revision){this.draft=reply.draft;this.revision++;this.created=null;this.status='Cinder filled the draft. Adjust anything, then forge it.';}else{this.pendingDraft=reply.draft;this.status='Your draft changed while Cinder was working. His suggestion is ready below.';}}}
    catch(error){const cancelled=this.abort.signal.aborted;this.messages.push({role:'assistant',content:cancelled?'The embers can wait. Request cancelled.':error.message});this.status=cancelled?'Request cancelled.':error.message;}
    finally{clearTimeout(timeout);this.busy=false;this.abort=null;this.refresh();}
  }
  onClose(){this.abort?.abort();}
}
