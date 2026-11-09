import { Game } from './game.js';
import { GEAR } from './adventure.js';
import { SPECIES, ACTIVE_SPELL_IDS } from './data.js';
import { validateForgeDraft } from './forge.js';

// Executed only in the disposable simulation worker (or controlled unit tests).
// No player saves, live Game objects, API keys, DOM or rendering are passed in.
const DEFAULT_ACTORS=[{id:'idle',type:'seedling',x:1180,y:855},{id:'neutral',type:'ventback',x:1250,y:855},{id:'distant',type:'seedling',x:6080,y:855}];
const vitals=g=>({hp:g.player.hp,maxHp:g.player.maxHp,mana:g.player.mana,maxMana:g.player.maxMana});
const describe=g=>({player:{...vitals(g),x:g.player.x,y:g.player.y,shield:g.player.shield,coins:g.player.coins,herbs:g.player.herbs,tonics:g.player.tonics},stats:g.stats,cooldowns:{...g.cooldowns},actors:g.creatures.slice(0,24).map(c=>({id:c.id,type:c.type,hp:c.hp,dead:c.dead,aggro:c.aggro,x:c.x,y:c.y,root:c.root,stun:c.stun,slow:c.slow})),effects:g.effects.length,projectiles:g.projectiles.length,functions:[...g.forgeRuntime.active.values()].map(r=>({failed:r.failed,error:r.error||null}))});
function assertVitals(g){const p=g.player;if(![p.hp,p.maxHp,p.mana,p.maxMana].every(Number.isFinite)||p.maxHp<=0||p.maxMana<0||p.hp<0||p.hp>p.maxHp+1e-6||p.mana<0||p.mana>p.maxMana+1e-6)throw new Error(`Invalid player vitals: ${JSON.stringify(vitals(g))}`);}
function assertRuntime(g){for(const r of g.forgeRuntime.active.values())if(r.failed)throw new Error(`Item runtime error: ${r.error||'function stopped'}`);assertVitals(g);}
function fixture(options={}){
  const actors=options.creatures||DEFAULT_ACTORS;if(!Array.isArray(actors)||actors.length>24)throw new Error('A test fixture supports up to 24 actors.');
  const definitions=actors.map((a,i)=>{if(!SPECIES[a.type||'seedling'])throw new Error(`Unknown creature species ${a.type}`);return {id:a.id||`actor-${i}`,type:a.type||'seedling',x:a.x??1180+i*70,y:a.y??855,homeX:a.x??1180+i*70,homeY:a.y??855,phase:0,level:1};});
  const world={props:structuredClone(options.props||[]),interactables:structuredClone(options.interactables||[]),ambient:[],rootwallGroups:[],creatures:definitions},g=new Game(null,{world});
  g.safeZonesEnabled=false;g.autoAttack=false;g.actorAIEnabled=options.actorAI===true;g.player.level=50;g.learned=new Set(ACTIVE_SPELL_IDS);Object.assign(g.player,options.player||{});g.recalculate();g.player.hp=options.player?.hp??g.player.maxHp;g.player.mana=options.player?.mana??g.player.maxMana;
  actors.forEach((a,i)=>Object.assign(g.creatures[i],{attack:9999},a));return g;
}
function advance(g,seconds,input={}){if(!Number.isFinite(seconds)||seconds<0||seconds>10)throw new Error('tick expects 0–10 seconds.');for(let remaining=seconds;remaining>1e-8;remaining-=.05){g.update(Math.min(.05,remaining),input);assertRuntime(g);}}

export function runForgeSimulation({draft:rawDraft,tests=[],allowHealthLoss=false,mode='candidate'}){
  const created=new Set(),checks=[],cases=[];let draft;
  const track=g=>{for(const id of Object.keys(g.forgedItems))created.add(id);return g;};
  const wear=(g,item)=>{const id=g.forgeItem(item);created.add(id);g.equip(id);assertRuntime(g);return id;};
  try{
    draft=validateForgeDraft(mode==='plan'?{...rawDraft,stats:{},functionCode:'',effect:'none'}:rawDraft);
    // Exercise every runtime entry point without trusting model-written tests.
    const g=fixture(),baseline=fixture(),plain={...draft,functionCode:'',effect:'none'};
    const before=g.player.hp/g.player.maxHp,id=wear(g,draft);wear(baseline,plain);const equipped=describe(g);assertRuntime(g);
    if(!allowHealthLoss&&g.player.hp/g.player.maxHp<before-1e-6)throw new Error('Equipping unexpectedly reduced the wearer’s health.');
    advance(g,.65);advance(baseline,.65);
    if(!allowHealthLoss&&g.player.hp<baseline.player.hp-1e-6)throw new Error('Idle updates unexpectedly reduced the wearer’s health.');
    for(const actor of g.creatures)if(!actor.dead){g.hurt(actor,1);break;}
    assertRuntime(g);const source=g.creatures.find(c=>!c.dead);const hp=g.player.hp;
    g.damagePlayer(5,source);if(!allowHealthLoss&&g.player.hp<hp-5-1e-6)throw new Error('An incoming hit caused unexpected extra health loss.');assertRuntime(g);
    for(const actor of g.creatures)if(!actor.dead){g.killCreature(actor);break;}
    g.player.mana=g.player.maxMana;g.cast('2');g.healPlayer(1,'simulation');g.launchProjectile({x:g.player.x,y:g.player.y-14,target:'distant',speed:240,damage:1,enemy:false,age:0});advance(g,.05,{right:true});assertRuntime(g);
    const saved=g.snapshot(),restored=track(new Game(saved,{world:fixture().world}));restored.safeZonesEnabled=false;restored.autoAttack=false;restored.actorAIEnabled=false;advance(restored,.1);assertRuntime(restored);
    for(const instance of [g,restored]){const slot=instance.wornSlot(id);if(slot)instance.unequip(slot);assertRuntime(instance);if(instance.forgeRuntime.active.size)throw new Error('An item function remained active after unequip.');advance(instance,.1);}
    checks.push('factory and hooks','wearer vitals','hit / damage / kill / cast','save and reload','unequip lifecycle');
    const runCase=(test,item)=>{
      const games=[];let assertions=0;
      const makeGame=options=>{if(games.length>=8)throw new Error('Too many fixtures in one test.');const game=fixture(options);games.push(game);return game;};
      const equip=game=>{if(!games.includes(game))throw new Error('equip expects a game made by makeGame.');return wear(game,item);};
      const assert=(condition,message='Behavior assertion failed')=>{assertions++;if(!condition){const error=new Error(message);error.name='ForgeAssertionError';throw error;}};
      try{new Function('makeGame','equip','tick','assert','draft',`"use strict";\n${test.code}\n//# sourceURL=forge-behavior-test.js`)(makeGame,equip,advance,assert,item);if(!assertions)throw new Error('The test ran no assertions.');for(const game of games)assertRuntime(game);return {passed:true,assertions,snapshots:games.map(describe)};}
      catch(error){return {passed:false,assertions,error:String(error.message||error),errorKind:error.name==='ForgeAssertionError'?'assertion':'execution',snapshots:games.map(describe)};}
      finally{for(const game of games)track(game);}
    };
    for(const test of tests){const result=runCase(test,draft);
      if(mode==='plan'){
        if(test.requiresEffect&&!result.passed&&result.errorKind==='assertion'&&result.assertions>0){result.passed=true;result.baselineFailedAsExpected=true;delete result.error;}
        else if(test.requiresEffect&&result.passed){result.passed=false;result.error='Vacuous positive test: a blank item passed. Assert the requested behavior.';}
        else if(!result.passed)result.error=`The acceptance test itself fails without an item: ${result.error}. Check the test API/fixture and natural game behavior.`;
      }else if(result.passed&&test.requiresEffect){const blank=runCase(test,{...draft,stats:{},functionCode:'',effect:'none'});if(blank.passed){result.passed=false;result.error='Vacuous positive test: a blank item passed too. Assert the requested runtime behavior.';}}
      cases.push({name:test.name,...result});}
    if(!cases.length||!tests.some(t=>t.requiresEffect))throw new Error('Behavioral acceptance tests are required.');
    return {passed:cases.every(c=>c.passed),checks,cases,equipped};
  }catch(error){return {passed:false,error:String(error.message||error),checks,cases};}
  finally{for(const id of created)delete GEAR[id];}
}
