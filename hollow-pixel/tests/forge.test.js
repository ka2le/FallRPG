import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { GEAR } from '../src/adventure.js';
import { emptyForgeDraft, validateForgeDraft, FORGE_EFFECTS, FORGE_LOCATION } from '../src/forge.js';
import { parseForgeReply } from '../src/forge-ai.js';
import { createWorld, canWalk, inVillage, propsNear } from '../src/world.js';
import { codexArgs, codexEnvironment, createForgeMiddleware, readGameSources } from '../scripts/forge-bridge.mjs';
import { createServer } from 'node:http';

const world=()=>({props:[],interactables:[],ambient:[],rootwallGroups:[],creatures:[{id:'vent',type:'ventback',x:1800,y:855,homeX:1800,homeY:855,phase:0,level:1},{id:'seed',type:'seedling',x:1850,y:855,homeX:1850,homeY:855,phase:0,level:1}]});
const game=()=>{const g=new Game(null,{world:world()});g.safeZonesEnabled=false;g.autoAttack=false;return g;};
test('the reported this.state crown runs without crashing, persists on reload, and stops when removed',()=>{
  const g=game(),target=g.creatures[1];g.player.x=1700;target.aggro=true;
  const id=g.forgeItem({...emptyForgeDraft(),slot:'head',functionCode:`return {onUpdate({game,player,dt}){
    const state=this.state;state.pulse=(state.pulse||0)+dt;if(state.pulse<0.5)return;
    const elapsed=state.pulse;state.pulse=0;for(const target of game.creatures){
      if(target.dead||!target.aggro||Math.hypot(target.x-player.x,target.y-player.y)>700)continue;
      game.hurt(target,500*elapsed,'#c76b83');
    }
  }};`},{equip:true});
  for(let n=0;n<11;n++)g.forgeRuntime.run('onUpdate',{dt:.05});
  assert.equal(g.forgeRuntime.active.get(id).failed,false);assert.equal(target.dead,true);
  const h=new Game(g.snapshot(),{world:world()});h.forgeRuntime.run('onUpdate',{dt:.05});assert.equal(h.forgeRuntime.active.get(id).failed,false);h.unequip('head');assert.equal(h.forgeRuntime.active.size,0);
});
test('death aura instantly kills idle high-health enemies and wildlife in range, preserves player and distant creatures',()=>{
  const g=game();Object.assign(g.player,{x:1800,y:855});g.creatures.forEach(c=>{c.hp=c.maxHp=1e9;c.aggro=false;});
  const distant={...g.creatures[1],id:'distant',x:2600,homeX:2600};g.creatures.push(distant);
  const id=g.forgeItem({...emptyForgeDraft(),slot:'head',functionCode:FORGE_EFFECTS.deathAura.code},{equip:true}),hp=g.player.hp;
  assert.equal(g.killCreature(g.player),false);g.forgeRuntime.run('onUpdate',{dt:.05});g.forgeRuntime.run('onUpdate',{dt:.05});
  assert.ok(g.creatures[0].dead);assert.ok(g.creatures[1].dead);assert.equal(distant.dead,false);assert.equal(g.player.hp,hp);
  assert.equal(g.forgeRuntime.active.get(id).failed,false);g.unequip('head');distant.x=g.player.x;g.forgeRuntime.run('onUpdate',{dt:1});assert.equal(distant.dead,false);
});
test('changing health gear preserves health percentage without equip-cycle healing; reforge updates the original into the pack',()=>{
  const g=game();g.player.hp=90;const id=g.forgeItem({...emptyForgeDraft(),slot:'head',stats:{health:1000}},{equip:true});
  assert.equal(g.player.hp,840);assert.equal(g.player.maxHp,1120);g.unequip('head');assert.equal(g.player.hp,90);g.equip(id);assert.equal(g.player.hp,840);
  const size=g.inventory.length;g.reforgeItem(id,{...g.forgedItems[id],functionCode:FORGE_EFFECTS.deathAura.code});assert.equal(g.inventory.length,size);assert.equal(g.equipment.head,undefined);assert.equal(g.player.hp,90);assert.equal(g.forgeRuntime.active.size,0);g.equip(id);assert.equal(g.player.hp,840);assert.equal(GEAR[id].functionCode,FORGE_EFFECTS.deathAura.code);
});
test('free unrestricted draft stats, arbitrary art and eight slots persist with executable item code',()=>{
  const g=game(),coins=g.player.coins;
  const id=g.forgeItem({...emptyForgeDraft(),name:'Impossible crown',slot:'head',sprite:'dream-draught',stats:{regen:10000,mana:50000,power:10}},{equip:true});
  assert.equal(g.equipment.head,id);assert.equal(g.manaRegen,10004);assert.equal(g.player.maxMana,50100);assert.equal(g.player.coins,coins);assert.equal(GEAR[id].sprite,'dream-draught');
  const saved=g.snapshot(),h=new Game(saved,{world:world()});assert.equal(h.equipment.head,id);assert.equal(h.manaRegen,10004);assert.deepEqual(h.forgedItems[id],g.forgedItems[id]);h.unequip('head');assert.equal(h.manaRegen,4);
  assert.throws(()=>validateForgeDraft({...emptyForgeDraft(),stats:{regen:Infinity}}),/finite/);
  assert.throws(()=>validateForgeDraft({...emptyForgeDraft(),functionCode:'return {'}),/syntax/);
  assert.equal(parseForgeReply(JSON.stringify({message:'Ready',draft:emptyForgeDraft()})).draft.slot,'ring');
  g.awardItem('amberloop');g.equip('amberloop');
  const ring=g.forgeItem({...emptyForgeDraft(),equipSlot:'trinket1'},{equip:true});
  assert.equal(g.equipment.trinket1,'amberloop');assert.equal(g.equipment.trinket2,ring);assert.equal('equipSlot' in g.forgedItems[ring],false);
  assert.ok(g.equip(ring,'trinket3'));assert.equal(g.equipment.trinket3,ring);
});
test('forged protection and cooldown bypass ordinary caps; health recovery uses the live stat',()=>{
  const g=game();const id=g.forgeItem({...emptyForgeDraft(),stats:{armor:1,cooldown:1,healthRegen:20}},{equip:true});
  assert.equal(g.spellCooldown('ward'),0);assert.equal(g.stats.healthRegen,20.5);assert.equal(g.stats.healthRegenRest,21.2);g.damagePlayer(80,{type:'seedling'});assert.equal(g.player.hp,120);g.unequip(g.wornSlot(id));g.damagePlayer(10,{type:'seedling'});assert.equal(g.player.hp,110);
});
test('Ventback immunity works for melee and source-carrying projectiles, and stops when removed',()=>{
  const g=game(),source=g.creatures[0],id=g.forgeItem({...emptyForgeDraft(),functionCode:FORGE_EFFECTS.ventback.code},{equip:true});
  const hp=g.player.hp;g.damagePlayer(20,source);assert.equal(g.player.hp,hp);
  g.projectiles.push({x:g.player.x,y:g.player.y-14,target:'player',source,speed:200,damage:20,enemy:true,age:0});g.update(.01);assert.equal(g.player.hp,hp);
  g.damagePlayer(10,g.creatures[1]);assert.equal(g.player.hp,hp-10);
  const restored=new Game(g.snapshot(),{world:world()});restored.safeZonesEnabled=false;const before=restored.player.hp;restored.damagePlayer(20,restored.creatures[0]);assert.equal(restored.player.hp,before);
  g.unequip(g.wornSlot(id));g.damagePlayer(20,source);assert.equal(g.player.hp,hp-30);
});
test('novel browser functions receive live game state, maintain separate state and clean up on unequip',()=>{
  const g=game();const id=g.forgeItem({...emptyForgeDraft(),functionCode:`return {
    onEquip({player,state}) {state.old=player.tonics;player.tonics+=7;},
    onUpdate({state,dt}) {state.elapsed=(state.elapsed||0)+dt;},
    onHit({player}) {player.herbs+=2;},
    onKill({player}) {player.coins+=11;},
    onCast({player}) {player.herbs+=3;},
    onUnequip({player,state}) {player.tonics=state.old;}
  };`},{equip:true});
  assert.equal(g.player.tonics,10);g.update(.01);assert.ok(g.forgeRuntime.active.get(id).state.elapsed>0);
  const coins=g.player.coins;g.hurt(g.creatures[1],999);assert.equal(g.player.herbs,2);assert.equal(g.player.coins,coins+11+g.creatures[1].coins);
  g.learned.add('ward');g.cast('2');assert.equal(g.player.herbs,5);
  g.unequip(g.wornSlot(id));assert.equal(g.player.tonics,3);assert.equal(g.forgeRuntime.active.size,0);
});
test('broken functions stop once, normal combat continues, and invalid saved items do not block loading',()=>{
  const g=game();const id=g.forgeItem({...emptyForgeDraft(),functionCode:'return {onDamage(){throw new Error("bad rune")}};'},{equip:true});
  g.damagePlayer(10,g.creatures[0]);g.damagePlayer(10,g.creatures[0]);assert.equal(g.player.hp,100);assert.equal(g.forgeRuntime.active.get(id).failed,true);assert.equal(g.events.filter(e=>e.type==='toast'&&e.text.includes('function stopped')).length,1);
  const saved=g.snapshot();saved.forgedItems[id].functionCode='invalid {';const h=new Game(saved,{world:world()});assert.equal(h.inventory.includes(id),false);assert.equal(h.equipment.trinket1,undefined);
});
test('Forge is southeast of the market, reachable inside town, with indexed solid scenery',()=>{
  const w=createWorld(),forge=w.interactables.find(i=>i.id==='forge'),market=w.interactables.find(i=>i.id==='market');assert.deepEqual({x:forge.x,y:forge.y},FORGE_LOCATION);assert.ok(forge.x>market.x&&forge.y>market.y);assert.ok(inVillage(forge));
  assert.ok(canWalk(w,forge.x,forge.y+18));assert.ok(propsNear(w,forge.x,forge.y,100).some(p=>p.id==='forge-building'));assert.equal(canWalk(w,forge.x+13,forge.y-21),false);
});
test('local Codex fixes Luna medium, uses native read-only execution and excludes credentials',()=>{
  const args=codexArgs();assert.equal(args[args.indexOf('--model')+1],'gpt-6-luna');assert.ok(args.includes('model_reasoning_effort="medium"'));assert.equal(args[args.indexOf('--sandbox')+1],'read-only');assert.ok(!args.includes('--dangerously-bypass-approvals-and-sandbox'));
  assert.deepEqual(codexEnvironment({PATH:'native',OPENAI_API_KEY:'secret',CODEX_THREAD_ID:'secret'}),{PATH:'native'});
});
test('bridge accepts drafts, rejects untrusted origins and does not silently change model',async()=>{
  const server=createServer(createForgeMiddleware({generate:async()=>JSON.stringify({message:'Shaped.',draft:emptyForgeDraft()})}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{const url=`http://127.0.0.1:${server.address().port}/api/forge`,body=JSON.stringify({messages:[{role:'user',content:'Make a ring'}],draft:emptyForgeDraft()});
    const good=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://127.0.0.1:5175'},body});assert.equal(good.status,200);assert.equal(parseForgeReply((await good.json()).text).draft.slot,'ring');
    const denied=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://untrusted.example'},body});assert.equal(denied.status,403);
    const bad=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(bad.status,400);
  }finally{await new Promise(r=>server.close(r));}
  const sources=await readGameSources();assert.ok(sources['src/game.js'].includes('damagePlayer'));assert.ok(sources['src/world.js']);
});
