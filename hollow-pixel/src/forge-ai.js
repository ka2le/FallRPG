import { emptyForgeDraft, validateForgeDraft, FORGE_STATS, FORGE_HOOKS } from './forge.js';
import { runForgeAgent, FORGE_IDENTITY_RULES } from './forge-agent.js';
import { simulateForgeItem } from './forge-simulation-client.js';
import { forgeApiReference } from './forge-api.js';
import { ITEM_SPRITES } from './item-sprites.js';
import { ITEM_TYPES } from './items.js';
import { SPECIES } from './data.js';

export const FORGE_MODEL='gpt-6-luna';
export const FORGE_EFFORT='medium';
export const FORGE_SETTINGS_KEY='hollow-forge-connection-v1';
export function loadForgeSettings(){try{return {provider:'codex',bridge:'http://127.0.0.1:5176',...JSON.parse(localStorage.getItem(FORGE_SETTINGS_KEY)||'{}')};}catch{return {provider:'codex',bridge:'http://127.0.0.1:5176'};}}
export function saveForgeSettings(settings){localStorage.setItem(FORGE_SETTINGS_KEY,JSON.stringify({provider:settings.provider,bridge:settings.bridge}));}
// The key is deliberately session-only, and is never included in a save file.
let apiKey='';
export const setForgeApiKey=key=>{apiKey=key.trim();};
export const hasForgeApiKey=()=>!!apiKey;
export function forgeInstructions(){return `You are the item-coding agent behind Cinder, a living lava smith in The Hollow: Between Seasons. Design FREE experimental items using ${FORGE_MODEL} with medium reasoning. Follow the HARNESS PHASE contract in the final input: PLAN defines acceptance tests before implementation; BUILD returns {"message":"brief in-character explanation","draft":{complete item}}; REVIEW independently checks the candidate against the original request and executed evidence. Return ONLY the JSON object required for that phase. Never claim an item was forged or equipped: you only fill a draft the player can edit. The harness, not the model, determines whether tests passed. Treat simulation reports as execution feedback and repair code rather than weakening expectations. The player must never debug a candidate that the harness already knows failed.
Draft fields: ${JSON.stringify(emptyForgeDraft())}. Item types: ${ITEM_TYPES.join(', ')}. The item type determines its compatible equipment slots later; do not choose a numbered equipment slot.
${FORGE_IDENTITY_RULES}
Available stats (all optional finite numbers; percentage stats are fractions, e.g. power:1 means +100%): ${JSON.stringify(FORGE_STATS)}. No price, level, budget or magnitude restrictions. Preserve current draft fields when refining. The renderer uses an existing sprite ID, independent of type: ${Object.keys(ITEM_SPRITES).join(', ')}.
Species IDs and names: ${JSON.stringify(Object.fromEntries(Object.entries(SPECIES).map(([id,s])=>[id,s.name])))}.
Prefer existing numeric stats for requests like extreme mana regeneration: set regen high (e.g. 1000) and slot head for a crown; do not write code for a numeric stat.
Only change stats the player requests. Do not add health, power, penalties, prices, or tradeoffs merely because the item sounds powerful. Start new unrequested stats at zero. All stats are BONUSES; health:1000 adds 1000 maximum health. Equipping preserves the player's health percentage.
Inspect the actual source to establish capabilities before claiming a behavior is unavailable. Existing Game methods include nearbyCreatures(radius,{hostileOnly:false}), killCreature(target,color), hurt(target,damage,color), damagePlayer(amount,source), cast(slot), effect(...), and normal equipment, quest and world APIs. These are general building blocks, not a restriction to presets. game.creatures excludes the player. Creature aggro means currently engaged, not hostile species membership. Preserve the player's requested semantics and target scope, including idle actors and boundaries; do not substitute weaker behavior or add balance restrictions.
State must come from the hook argument: onUpdate({game,player,state,dt}). Normal method hooks also receive this.state as the same object for compatibility; arrow functions MUST use the argument. Never read this.state at factory top level. dt is seconds (at most 0.05 per frame), so accumulate state for pulses. onUpdate still runs in a safe haven; only open menus pause it. The harness executes candidate hooks, lifecycle and locked behavior tests before the player sees a draft. Use the real failure report, including actual actor/vital snapshots, to correct mistakes.
${forgeApiReference()}
For NEW behavior, inspect source and write REAL SYNCHRONOUS JAVASCRIPT in functionCode. It is a function BODY returning an object with hooks: ${FORGE_HOOKS.join(', ')}. Each hook gets a context {game,player,item,state,...event}; full game methods and objects are accessible. onDamage gets {amount,source,cancel}; set ctx.cancel=true for immunity, or mutate ctx.amount for modified damage. source is the attacking creature (including enemy projectiles), tree, or null. onHit gets {target,damage}; onKill {target}; onCast {spell:spellId}; onUpdate {dt} seconds; state is per equipped instance. onEquip and onUnequip manage temporary changes. Hooks only run while equipped. Restore temporary changes onUnequip. Do not use imports, exports, async, timers, DOM, networking, storage, eval, top-level side effects, infinite loops, or mutate game source files. Return hooks, not a string of code. Catchable errors stop the item's function. Example: return { onDamage(ctx) { if(ctx.source?.type === 'ventback') ctx.cancel = true; } }; Set effect:"none" for original code. Read relevant game code before implementing unfamiliar behavior. Never invent game APIs. Return complete valid JSON, with escaped newlines inside functionCode.`;}

export function parseForgeReply(text){
  const cleaned=String(text).trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  let reply;try{reply=JSON.parse(cleaned);}catch{throw new Error('Cinder returned an unreadable draft. Try again; your current draft is unchanged.');}
  if(typeof reply.message!=='string')throw new Error('Cinder returned an incomplete reply.');
  return {message:reply.message.slice(0,6000),draft:reply.draft==null?null:validateForgeDraft(reply.draft)};
}
const responseText=response=>response.output?.filter(x=>x.type==='message').flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n')||response.output_text||'';
async function requestForgeModel({messages,draft,phase,settings,signal}){
  const input=messages;
  const instructions=forgeInstructions()+`\nCurrent harness phase: ${phase}.\nCurrent editable draft: ${JSON.stringify(draft)}`;
  if(settings.provider!=='api'){
    const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
    const endpoint=local?new URL('api/forge',document.baseURI).href:`${settings.bridge.replace(/\/$/,'')}/api/forge`;
    let response;try{response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:input,draft,phase}),signal});}
    catch(error){if(signal?.aborted)throw error;throw new Error('Local Codex is unavailable. Run npm run dev locally, or npm run forge:bridge for a hosted game. Connection settings also offer an API key.');}
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Local Codex could not complete the draft.');return result.text;
  }
  if(!apiKey)throw new Error('Add your OpenAI API key in Forge connection settings. It is kept only until this page closes.');
  const {default:files}=await import('virtual:forge-source');
  let conversation=[{role:'user',content:`Available game files: ${Object.keys(files).join(', ')}`},...input];
  const tools=[{type:'function',name:'read_game_source',description:'Read a complete game source file to implement a new item function. Use file="INDEX" to list paths.',parameters:{type:'object',properties:{file:{type:'string'}},required:['file'],additionalProperties:false},strict:true}];
  for(let step=0;step<14;step++){
    const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`},signal,body:JSON.stringify({model:FORGE_MODEL,reasoning:{effort:FORGE_EFFORT},instructions,input:conversation,tools,text:{format:{type:'json_object'}},store:false})});
    const result=await response.json();if(!response.ok)throw new Error(result.error?.message||`OpenAI request failed (${response.status}).`);
    const calls=result.output?.filter(x=>x.type==='function_call')||[];
    if(!calls.length){if(result.status==='incomplete')throw new Error('Cinder ran out of room for this draft. Try a smaller change.');return responseText(result);}
    conversation.push(...result.output);
    for(const call of calls){let file;try{file=JSON.parse(call.arguments).file;}catch{file='INDEX';}conversation.push({type:'function_call_output',call_id:call.call_id,output:file==='INDEX'?Object.keys(files).join('\n'):files[file]||'Unknown file. Use INDEX to list source paths.'});}
  }
  throw new Error('Cinder needs a more focused request. Your current draft is unchanged.');
}
export async function askForge({messages,draft,settings=loadForgeSettings(),signal,onProgress}){
  return runForgeAgent({messages,draft,signal,onProgress,generate:request=>requestForgeModel({...request,settings}),simulate:simulateForgeItem});
}
