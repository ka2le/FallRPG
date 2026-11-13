import { ITEM_TYPES } from './items.js';
import { ITEM_SPRITES } from './item-sprites.js';
import { FORGE_HOOK_NAMES } from './forge-api.js';

export const FORGE_LOCATION={x:1264,y:1006};
export const FORGE_STATS={
  health:['Health','flat'],mana:['Mana','flat'],regen:['Mana / second','flat'],power:['Magic power','percent'],healthRegen:['Health / second','flat'],
  damage:['Spark damage','flat'],armor:['Protection','percent'],speed:['Movement','percent'],ward:['Ward absorption','flat'],
  bloom:['Bloom radius','flat'],bind:['Bind seconds','flat'],fox:['Fox damage','percent'],lance:['Lance damage','percent'],
  tonic:['Tonic healing','flat'],cooldown:['Cooldown reduction','percent'],
};
export const FORGE_HOOKS=FORGE_HOOK_NAMES;
export const FORGE_EFFECTS={
  none:{name:'No special effect',code:''},
  deathAura:{name:'Death aura',code:`return {\n  onUpdate({game, state, dt}) {\n    state.pulse = (state.pulse || 0) + dt;\n    if (state.pulse < 0.1) return;\n    state.pulse = 0;\n    for (const target of game.nearbyCreatures(700)) {\n      game.killCreature(target, '#c76b83');\n    }\n  }\n};`},
  ventback:{name:'Ventback immunity',code:`return {\n  onDamage(ctx) {\n    if (ctx.source?.type === 'ventback') ctx.cancel = true;\n  }\n};`},
  leech:{name:'Life-stealing sparks',code:`return {\n  onHit({player, damage}) {\n    player.hp = Math.min(player.maxHp, player.hp + damage * 0.25);\n  }\n};`},
  mana:{name:'Mana on defeat',code:`return {\n  onKill({player}) {\n    player.mana = Math.min(player.maxMana, player.mana + 25);\n  }\n};`},
  thorns:{name:'Molten retaliation',code:`return {\n  onDamage({game, source, state}) {\n    if (source?.id && !source.dead && !state.reflecting) {\n      state.reflecting = true;\n      try { game.hurt(source, 20, '#ffad65'); }\n      finally { state.reflecting = false; }\n    }\n  }\n};`},
  embers:{name:'Orbiting embers',code:`return {\n  onUpdate({game, player, state, dt}) {\n    state.time = (state.time || 0) + dt;\n    if (state.time >= 0.5) {\n      state.time = 0;\n      game.effect('ring', player.x, player.y, '#ffad65', {radius: 24, life: 0.5});\n    }\n  }\n};`},
};
export const emptyForgeDraft=()=>({name:'Unshaped ember',slot:'ring',sprite:'amberloop',stats:{},description:'Made at the Forge in Willowmere.',effect:'none',functionCode:''});
export function aggregateGear(items){const gear={};for(const item of items){for(const [key,value] of Object.entries(item?.stats||{}))gear[key]=(gear[key]||0)+value;if(item?.forged){gear.forgeArmor=(gear.forgeArmor||0)+(item.stats.armor||0);gear.forgeCooldown=(gear.forgeCooldown||0)+(item.stats.cooldown||0);}}return gear;}
export const gearProtection=gear=>Math.min(1,Math.min(.6,(gear.armor||0)-(gear.forgeArmor||0))+(gear.forgeArmor||0));
export const gearCooldown=gear=>Math.min(1,Math.max(0,Math.min(.2,(gear.cooldown||0)-(gear.forgeCooldown||0))+(gear.forgeCooldown||0)));

// Serialized item definitions are data until the player equips the item.
export function validateForgeDraft(input){
  if(!input||typeof input!=='object')throw new Error('The smith did not return an item draft.');
  const slot=ITEM_TYPES.includes(input.slot)?input.slot:null;
  if(!slot)throw new Error('Choose a valid item type.');
  if(!ITEM_SPRITES[input.sprite])throw new Error('Choose an item drawing.');
  const stats={};
  for(const key of Object.keys(FORGE_STATS))if(input.stats?.[key]!==undefined){
    const value=input.stats[key];if(typeof value!=='number'||!Number.isFinite(value))throw new Error(`${FORGE_STATS[key][0]} must be a finite number.`);
    if(value!==0)stats[key]=value;
  }
  const name=String(input.name||'').trim();if(!name||name.length>100)throw new Error('Give your item a name (up to 100 characters).');
  const effect=Object.hasOwn(FORGE_EFFECTS,input.effect)?input.effect:'none';
  const functionCode=String(input.functionCode??FORGE_EFFECTS[effect].code);
  if(functionCode.length>20000)throw new Error('The function slot is limited to 20,000 characters.');
  if(functionCode.trim())compileForgeCode(functionCode);
  return {name,slot,sprite:input.sprite,stats,description:String(input.description||'').slice(0,2000),effect,functionCode,forged:true,level:1};
}
export function compileForgeCode(code){
  try{return new Function(`"use strict";\n${code}\n//# sourceURL=forge-item.js`);}
  catch(error){throw new Error(`Function syntax: ${error.message}`);}
}

// Each equipped instance owns its state and hooks. Exceptions disable just that
// item's function; unequipping always drops its runtime. This is intentionally
// an experimental, full-access JS extension point, not a security sandbox.
export class ForgeRuntime{
  constructor(game){this.game=game;this.active=new Map();this.dispatching=new Set();}
  context(id,extra={}){const runtime=this.active.get(id);return {game:this.game,player:this.game.player,item:runtime.item,state:runtime.state,...extra};}
  disable(id,error){const runtime=this.active.get(id);if(!runtime||runtime.failed)return;runtime.failed=true;runtime.error=String(error.message||error).slice(0,160);this.game.toast(`${runtime.item.name}: function stopped (${runtime.error}). Edit it at the Forge.`);}
  call(id,hook,extra={}){const runtime=this.active.get(id);if(!runtime||(runtime.failed&&hook!=='onUnequip')||!runtime.hooks?.[hook])return;
    const key=`${id}:${hook}`;if(this.dispatching.has(key))return;
    this.dispatching.add(key);try{const ctx=this.context(id,extra),result=runtime.hooks[hook].call(ctx,ctx);if(result&&typeof result.then==='function'){result.catch(()=>{});throw new Error('Item hooks must be synchronous.');}return {ctx,result};}catch(error){this.disable(id,error);}finally{this.dispatching.delete(key);}
  }
  sync(items,{deferEquip=false}={}){
    const added=[];
    const wanted=new Map(items.filter(([,item])=>item?.functionCode?.trim()));
    for(const [id,r] of this.active)if(wanted.get(id)?.functionCode!==r.item.functionCode){this.call(id,'onUnequip');this.active.delete(id);}
    for(const [id,item] of wanted)if(!this.active.has(id)){
      const runtime={item,state:{},hooks:{},failed:false};this.active.set(id,runtime);
      try{runtime.hooks=compileForgeCode(item.functionCode)();if(!runtime.hooks||typeof runtime.hooks!=='object')throw new Error('Return an object of item hooks.');for(const key of Object.keys(runtime.hooks))if(!FORGE_HOOKS.includes(key))throw new Error(`Unknown item hook: ${key}.`);for(const key of FORGE_HOOKS)if(runtime.hooks[key]!==undefined&&typeof runtime.hooks[key]!=='function')throw new Error(`${key} must be a function.`);added.push(id);if(!deferEquip)this.call(id,'onEquip');}catch(error){this.disable(id,error);}
    }
    return added;
  }
  run(hook,event={}){for(const id of [...this.active.keys()])this.call(id,hook,event);}
  transform(hook,event,{ids=null}={}){let cancelled=event.cancel===true;for(const id of ids||[...this.active.keys()]){
    const before=Object.fromEntries(Object.entries(event).map(([k,v])=>[k,v&&typeof v==='object'&&!Array.isArray(v)?{...v}:v]));
    const result=this.call(id,hook,event);if(!result)continue;
    let invalid=null;for(const key of Object.keys(event)){const value=result.ctx[key];if(typeof before[key]==='number'&&!Number.isFinite(value))invalid=key;else if(before[key]&&typeof before[key]==='object')for(const [k,v] of Object.entries(before[key]))if(typeof v==='number'&&!Number.isFinite(value?.[k]))invalid=`${key}.${k}`;}
    if(invalid){this.disable(id,new Error(`Invalid numeric modifier: ${invalid}`));for(const [key,value] of Object.entries(before))event[key]=value;continue;}
    for(const key of Object.keys(event))event[key]=result.ctx[key];cancelled ||= event.cancel===true||result.result===false;
  }if(Object.hasOwn(event,'cancel'))event.cancel=cancelled;return event;}
  damage(amount,source){let cancel=false;for(const id of [...this.active.keys()]){const output=this.call(id,'onDamage',{amount,source,cancel:false});if(output){cancel ||= output.ctx.cancel===true||output.result===false;amount=output.ctx.amount;}}
    return cancel?0:Number.isFinite(amount)?Math.max(0,amount):0;
  }
}
