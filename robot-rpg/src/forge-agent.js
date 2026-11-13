import { FORGE_STATS, validateForgeDraft } from './forge.js';
import { ITEM_TYPES } from './items.js';

export const FORGE_IDENTITY_RULES=`Item identity is part of the request and must be checked separately from effects. Resolve itemType from the latest player intent, using one of: ${ITEM_TYPES.join(', ')}. It is the item kind, stored in draft.slot, never a numbered/body equipment slot. An explicitly requested kind overrides a stale/default draft type even when refining a selected drawing. For example, a shield/buckler item is shield; a crown/helmet is head; a sword/staff is weapon. Distinguish the object being made from its powers: a ring that grants a magical shield is still ring. If the request does not change the kind, preserve the current draft.slot. An explicitly requested unusual drawing/type combination is valid; do not infer type solely from sprite, name or description. Preserve the selected drawing when the player refers to this/selected item or only changes its powers, unless they ask to change the look. Naming/describing a shield without setting draft.slot to shield does not satisfy a shield request. Resolve obvious kinds without asking the player to select a type manually. Behavior tests should test effects; the harness separately enforces itemType, so a type/name assertion alone is not a positive effect test.`;

export const FORGE_AGENT_ATTEMPTS=3;
export const FORGE_TEST_API=`Tests run in a fresh isolated worker using the REAL Game and ForgeRuntime, never the player's live game.
Test format: {name:string,requiresEffect:boolean,code:string}. code is a synchronous JavaScript function BODY.
Available test functions:
  makeGame({player:{hp,mana,level,x,y,...},creatures:[{id,type,x,y,hp,maxHp,aggro,...}],props:[],interactables:[],actorAI:false}={}) -> real Game. Default player at x=1080,y=855, level=50, full health/mana, autoAttack=false, all spells learned, safeZonesEnabled=false. Default actors: idle seedling at (1180,855), neutral ventback at (1250,855), distant seedling at (6080,855). Ordinary actor AI is OFF in fixtures so boundary targets stay put and ordinary combat does not change passive recovery. Item hooks, statuses, collision, player movement, projectiles, rewards and all Game APIs still run normally. Set actorAI:true when deliberately testing enemy pursuit/attacks. Setting an actor's aggro:true still makes isInCombat true and switches passive health recovery from healthRegenRest to healthRegen. Use explicit fixtures when testing a boundary or species. Optional props/interactables populate the isolated world for scenery or gathering effects. You can configure real game/world fields directly in a test.
  equip(game) -> creates/equips the CURRENT CANDIDATE and returns its ID. No draft argument. For 'before equipped' tests, do not call equip until after the first assertions.
  tick(game,seconds,input={}) -> actual game.update in 0.05-second steps, max 10 seconds per call. input can contain right/left/up/down/run for movement tests.
  assert(condition,message) -> real assertion, throws on false. At least one assertion must actually run in every test.
  draft -> current candidate data. game.creatures, game.player, game.stats, game.equipment, game.hurt, game.damagePlayer, game.cast, game.unequip, game.snapshot and all other real game APIs are available.
No imports, async, timers, DOM, networking, storage, process, or external libraries. Tests cannot change the candidate passed to equip. Each test creates its own game(s).
requiresEffect=true means a POSITIVE behavior test. The harness also runs that test with a blank item; it MUST fail for the blank item. This catches empty/vacuous tests. Mark cleanup/negative/boundary checks requiresEffect=false. Include at least one positive test. Test the requested behavior, not just that the item exists or has a name. A function request needs a positive test observing its runtime effect, not just its stats. Never assert something merely because the implementation does it.
For proximity effects, independently test idle actors, engaged actors, peaceful actors if requested, actors outside the range, and the wearer; do not make every target aggro. A continuous effect must also catch an actor moved into range AFTER equipping, not just initial targets. Use very high target HP for guaranteed-kill claims. For immunities, test the specified species AND an unrelated damaging species, including a projectile if relevant. For timed effects, advance enough actual seconds. For stateful effects, test repeated ticks. Include unequip/cleanup when applicable. Negative tests must pass for an ordinary blank item; account for natural regeneration and combat state. Do not assert nonexistent stat fields: playerStats exposes speed/armor and the actual fields listed in src/progression.js; compare changes to a measured baseline.
The harness separately checks factory/hook errors, finite vitals, unexpected health loss, damage/hit/kill/cast hooks, save/reload and removal. Generated code may use ANY existing game API; read source instead of declaring a feature impossible.`;

const json=text=>{try{return JSON.parse(String(text).trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));}catch{throw new Error('Expected one JSON object.');}};
class ForgeTransportError extends Error{}
export function validateForgePlan(value){
  if(value?.question&&typeof value.question==='string')return {question:value.question.slice(0,3000)};
  if(typeof value?.intent!=='string'||!value.intent.trim())throw new Error('A test plan needs the player’s intended behavior.');
  if(!ITEM_TYPES.includes(value.itemType))throw new Error(`The plan must resolve itemType to an existing item kind: ${ITEM_TYPES.join(', ')}. Do not omit it or use an equipment slot.`);
  if(!Array.isArray(value.tests)||!value.tests.length||value.tests.length>8)throw new Error('Supply 1–8 executable behavior tests.');
  const tests=value.tests.map(t=>{if(!t||typeof t.name!=='string'||typeof t.code!=='string'||!t.code.trim()||t.code.length>10000||typeof t.requiresEffect!=='boolean')throw new Error('Each test needs name, requiresEffect and synchronous code.');return {name:t.name.slice(0,160),requiresEffect:t.requiresEffect,code:t.code};});
  if(!tests.some(t=>t.requiresEffect))throw new Error('At least one positive behavior test is required.');
  const allowedStats=Array.isArray(value.allowedStats)?value.allowedStats:[];
  if(allowedStats.some(k=>!Object.hasOwn(FORGE_STATS,k)))throw new Error('allowedStats must contain existing stat keys.');
  return {intent:value.intent.slice(0,6000),itemType:value.itemType,allowedStats:[...new Set(allowedStats)],allowHealthLoss:value.allowHealthLoss===true,tests};
}
const checkAbort=signal=>{if(signal?.aborted){const error=new Error('Forge request cancelled.');error.name='AbortError';throw error;}};
export function forgeStatViolations(draft,original,plan){return Object.keys(FORGE_STATS).filter(k=>(draft.stats[k]||0)!==(original.stats?.[k]||0)&&!plan.allowedStats.includes(k)).map(k=>`Unrequested stat change: ${k} (${original.stats?.[k]||0} → ${draft.stats[k]||0}). Keep this stat unchanged.`);}

// Transport-independent agent loop. Tests are written from the request BEFORE
// implementation and remain fixed while implementation failures are repaired.
export async function runForgeAgent({messages,draft,generate,simulate,signal,onProgress=()=>{}}){
  checkAbort(signal);
  const original=validateForgeDraft(draft),history=messages.slice(-16).map(m=>({role:m.role,content:m.content.slice(0,12000)}));
  const request=async(phase,instruction)=>{checkAbort(signal);let result;try{result=await generate({phase,messages:[...history,{role:'user',content:instruction}],draft:original,signal});}catch(error){checkAbort(signal);throw new ForgeTransportError(error.message||'The Forge connection failed.');}checkAbort(signal);return json(result);};
  onProgress('Checking what your item should do…');
  let plan,planError='';
  for(let n=0;n<3;n++)try{
    plan=validateForgePlan(await request('plan',`HARNESS PHASE: PLAN. Do not implement an item yet. Read the player conversation and current draft. Independently specify the intended item kind, behavior and executable acceptance tests BEFORE seeing any proposed implementation. Return ONLY {"intent":"precise requested item kind, behavior, target scope and boundaries","itemType":"resolved canonical item kind","allowedStats":["only stat keys the player explicitly asked to change"],"allowHealthLoss":false,"tests":[{"name":"...","requiresEffect":true,"code":"..."}]}. Do not allow health loss unless explicitly requested. Do not authorize extra buffs/tradeoffs. If essential information is genuinely missing return {"question":"brief question"} instead.\n${FORGE_IDENTITY_RULES}\n${FORGE_TEST_API}\n${planError}`));
    if(!plan.question){onProgress('Checking the design before shaping it…');const baseline=await simulate({draft:original,tests:plan.tests,mode:'plan'},signal);checkAbort(signal);if(!baseline.passed)throw new Error(`The tests themselves are not valid yet. Correct test code/fixtures without weakening the original request: ${JSON.stringify(baseline)}`);}break;
  }catch(error){checkAbort(signal);if(error instanceof ForgeTransportError)throw error;plan=null;planError=`Previous plan was invalid: ${error.message}. Correct the test code/fixtures while preserving the request.`;}
  if(!plan)throw new Error('Cinder could not prepare valid tests for this request. Your draft is unchanged.');
  if(plan.question)return {message:plan.question,draft:null};
  const locked=JSON.stringify(plan),failures=[];let feedback='',lastReport;
  for(let attempt=1;attempt<=FORGE_AGENT_ATTEMPTS;attempt++){
    checkAbort(signal);onProgress(attempt===1?'Shaping your item…':'Correcting the item after testing…');
    let reply,report;
    try{
      reply=await request('build',`HARNESS PHASE: BUILD (attempt ${attempt}/${FORGE_AGENT_ATTEMPTS}). Implement the player’s request using the current real game source. Return ONLY {"message":"brief in-character description","draft":{complete editable item}}. The following acceptance plan was defined from the request BEFORE implementation and is locked. You must satisfy it; do not weaken or rewrite tests. Set draft.slot to the plan's itemType; a matching name/description/drawing does not replace the actual item type. Stat changes are limited to allowedStats. Fix the implementation using actual execution feedback below. Do not replace a novel effect with a preset unless it actually meets the request.\nLOCKED PLAN: ${locked}\n${FORGE_TEST_API}\n${feedback}`);
      if(typeof reply.message!=='string'||!reply.draft)throw new Error('Return a complete item draft, not a claim that the requested behavior is unavailable.');
      reply={message:reply.message.slice(0,6000),draft:validateForgeDraft(reply.draft)};
      const violations=forgeStatViolations(reply.draft,original,plan);
      if(reply.draft.slot!==plan.itemType)violations.unshift(`Wrong item type: requested ${plan.itemType}, returned ${reply.draft.slot}. Set draft.slot to ${plan.itemType}; changing its name, description or drawing is not enough.`);
      if(violations.length)throw new Error(violations.join('\n'));
      onProgress('Testing your item…');report=await simulate({draft:reply.draft,tests:plan.tests,allowHealthLoss:plan.allowHealthLoss},signal);checkAbort(signal);lastReport=report;
      if(!report.passed)throw new Error(JSON.stringify(report));
      onProgress('Checking the finished item against your request…');
      const review=await request('review',`HARNESS PHASE: REVIEW. Independently compare the ORIGINAL PLAYER REQUEST above to this candidate, the locked tests, and ACTUAL execution results. Return ONLY {"approved":true,"issues":[]} or {"approved":false,"issues":["concrete mismatch"]}. Check the actual draft.slot against the kind of object the player requested, not just its name or behavior; reject a stale/default type even if every effect works. Also check the selected/requested look and explicit naming instructions. Reject weakened semantics (damage instead of requested guaranteed kills, engaged-only filters for proximity, extra unrequested stats, missing boundary coverage, or changes to the wearer not asked for). Also reject itemType/tests/allowedStats that themselves misrepresent the original request. Do not approve merely because tests passed. Do not invent balance restrictions.\n${FORGE_IDENTITY_RULES}\nPLAN: ${locked}\nCANDIDATE: ${JSON.stringify(reply)}\nEXECUTED RESULTS: ${JSON.stringify(report)}`);
      if(review.approved!==true||!Array.isArray(review.issues)||review.issues.length)throw new Error(`Intent review rejected the candidate: ${JSON.stringify(review.issues||['Invalid review response'])}`);
      return {...reply,validation:{attempts:attempt,intent:plan.intent,itemType:plan.itemType,tests:plan.tests.map(t=>t.name),checks:report.checks,reviewed:true,failures}};
    }catch(error){checkAbort(signal);if(error instanceof ForgeTransportError)throw error;failures.push({attempt,candidate:reply||null,report:report||null,error:error.message});feedback=`PREVIOUS CANDIDATE: ${JSON.stringify(reply||null)}\nACTUAL HARNESS FEEDBACK: ${error.message}\nKeep the locked tests. Return a corrected complete draft. Wrong or nonexistent APIs must be corrected from source.`;}
  }
  const error=new Error(`Cinder could not produce an item that passed its checks after ${FORGE_AGENT_ATTEMPTS} attempts. Your draft is unchanged.${lastReport?.error?` ${lastReport.error}`:''}`);error.diagnostics={plan,failures};throw error;
}
