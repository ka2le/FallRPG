import test from 'node:test';
import assert from 'node:assert/strict';
import { runForgeAgent, validateForgePlan } from '../src/forge-agent.js';
import { runForgeSimulation } from '../src/forge-simulator.js';
import { emptyForgeDraft } from '../src/forge.js';

const auraCode=`return {onUpdate({game,state,dt}){state.t=(state.t||0)+dt;if(state.t<.1)return;state.t=0;for(const c of game.nearbyCreatures(200))game.killCreature(c);}};`;
const auraDraft={...emptyForgeDraft(),name:'Unusual test ring',functionCode:auraCode};
const auraPlan={intent:'Kill every creature within 200 units, even idle and peaceful creatures, without affecting wearer or distant targets.',itemType:'ring',allowedStats:[],allowHealthLoss:false,tests:[{name:'Idle, engaged and peaceful high-health targets die; wearer and distant target survive',requiresEffect:true,code:`
 const g=makeGame({creatures:[
 {id:'idle',type:'seedling',x:1180,y:855,hp:1000000,maxHp:1000000,aggro:false},
 {id:'engaged',type:'seedling',x:1200,y:855,hp:1000000,maxHp:1000000,aggro:true},
 {id:'peaceful',type:'ventback',x:1250,y:855,hp:1000000,maxHp:1000000,aggro:false},
 {id:'outside',type:'seedling',x:6080,y:855,hp:1000000,maxHp:1000000,aggro:false}]});
 const hp=g.player.hp;equip(g);tick(g,.2);
 assert(g.creatures[0].dead,'Idle target survived');assert(g.creatures[1].dead,'Engaged target survived');assert(g.creatures[2].dead,'Peaceful target survived');assert(!g.creatures[3].dead,'Distant target died');assert(g.player.hp===hp,'Wearer health changed');
`},{name:'Effect is inactive before equip and after removal',requiresEffect:false,code:`const g=makeGame();tick(g,.2);assert(!g.creatures[0].dead,'Active before equip');const id=equip(g);g.unequip(g.wornSlot(id));tick(g,.2);assert(!g.creatures[0].dead,'Active after unequip');`}]};
const generateFor=(builds,record=[])=>async request=>{record.push(request);if(request.phase==='plan')return JSON.stringify(auraPlan);if(request.phase==='review')return JSON.stringify({approved:true,issues:[]});return JSON.stringify({message:'Ready after testing.',draft:builds.shift()||auraDraft});};
const simulate=async request=>runForgeSimulation(request);

test('harness repairs a real hook crash before showing a draft, keeping acceptance tests fixed',async()=>{
 const history=[];let calls=0;
 const reply=await runForgeAgent({messages:[{role:'user',content:'Kill every creature within 200 units.'}],draft:emptyForgeDraft(),generate:generateFor([{...auraDraft,functionCode:'return {onUpdate(ctx){ctx.state.missing.value++;}};'},auraDraft],history),simulate:async r=>{calls++;return simulate(r);}});
 assert.equal(reply.validation.attempts,2);assert.equal(calls,3);assert.ok(history.filter(r=>r.phase==='build')[1].messages.at(-1).content.includes('runtime error'));assert.equal(history.filter(r=>r.phase==='plan').length,1);assert.equal(reply.draft.functionCode,auraCode);assert.equal(reply.validation.reviewed,true);
});
test('harness rejects engaged-only damage as a substitute for a requested instant proximity effect',async()=>{
 const bad={...auraDraft,functionCode:`return {onUpdate({game,player,dt}){for(const c of game.creatures)if(!c.dead&&c.aggro&&Math.hypot(c.x-player.x,c.y-player.y)<200)game.hurt(c,500*dt);}};`};
 const history=[];const reply=await runForgeAgent({messages:[{role:'user',content:auraPlan.intent}],draft:emptyForgeDraft(),generate:generateFor([bad,auraDraft],history),simulate});
 assert.equal(reply.validation.attempts,2);assert.match(history.filter(r=>r.phase==='build')[1].messages.at(-1).content,/Idle target survived/);
});
test('unrequested stats are sent back for repair before simulation',async()=>{
 const history=[];let simulations=0;
 const result=await runForgeAgent({messages:[{role:'user',content:auraPlan.intent}],draft:emptyForgeDraft(),generate:generateFor([{...auraDraft,stats:{health:1000,power:1}},auraDraft],history),simulate:async r=>{simulations++;return simulate(r);}});
 assert.equal(result.validation.attempts,2);assert.equal(simulations,2);assert.match(history.filter(r=>r.phase==='build')[1].messages.at(-1).content,/Unrequested stat change: health/);
});
test('a failed candidate or vacuous test never reaches the editable draft',async()=>{
 const plan={...auraPlan,tests:[{name:'Pretend success',requiresEffect:true,code:'assert(true,"vacuous");'}]};
 await assert.rejects(runForgeAgent({messages:[{role:'user',content:'Make a novel effect'}],draft:emptyForgeDraft(),generate:async r=>JSON.stringify(r.phase==='plan'?plan:{message:'Claims to work',draft:auraDraft}),simulate}),/could not prepare valid tests/);
 const report=runForgeSimulation({draft:auraDraft,tests:plan.tests});assert.equal(report.passed,false);assert.match(report.cases[0].error,/blank item passed/);
 assert.throws(()=>validateForgePlan({...auraPlan,tests:[]}),/executable behavior tests/);
});
test('an independent intent review can reject a passing implementation and trigger correction',async()=>{
 let reviews=0,builds=0;
 const result=await runForgeAgent({messages:[{role:'user',content:auraPlan.intent}],draft:emptyForgeDraft(),generate:async r=>{if(r.phase==='plan')return JSON.stringify(auraPlan);if(r.phase==='build'){builds++;return JSON.stringify({message:'Test effect',draft:auraDraft});}return JSON.stringify(++reviews===1?{approved:false,issues:['The description misstates the target scope.']}:{approved:true,issues:[]});},simulate});
 assert.equal(result.validation.attempts,2);assert.equal(reviews,2);assert.equal(builds,2);
});
test('a novel on-hit effect uses the same harness without a special preset or item-name rule',async()=>{
 const draft={...emptyForgeDraft(),name:'Reed coin charm',functionCode:'return {onHit({player}){player.coins+=37;}};'};
 const plan={intent:'Gain 37 coins on each hit',itemType:'ring',allowedStats:[],tests:[{name:'Two hits grant exactly 74 coins, stopping on removal',requiresEffect:true,code:`const g=makeGame();const before=g.player.coins;const id=equip(g);g.hurt(g.creatures[0],1);g.hurt(g.creatures[0],1);assert(g.player.coins===before+74,'Wrong hit payout');g.unequip(g.wornSlot(id));g.hurt(g.creatures[0],1);assert(g.player.coins===before+74,'Payout continued after removal');`}]};
 const reply=await runForgeAgent({messages:[{role:'user',content:plan.intent}],draft:emptyForgeDraft(),generate:async r=>JSON.stringify(r.phase==='plan'?plan:r.phase==='review'?{approved:true,issues:[]}:{message:'Coins on hit.',draft}),simulate});
 assert.equal(reply.validation.attempts,1);assert.equal(reply.draft.name,'Reed coin charm');
});
test('cancellation stops the harness without returning a candidate',async()=>{
 const controller=new AbortController();controller.abort();let called=false;
 await assert.rejects(runForgeAgent({messages:[],draft:emptyForgeDraft(),signal:controller.signal,generate:async()=>{called=true;},simulate}),/cancelled/);assert.equal(called,false);
});
test('the harness corrects invalid test fixtures before implementing the item',async()=>{
 let plans=0,builds=0;
 const bad={...auraPlan,tests:[...auraPlan.tests,{name:'Invalid assumed field',requiresEffect:false,code:'const g=makeGame();assert(g.stats.nonexistent===0,"Invented API field");'}]};
 const reply=await runForgeAgent({messages:[{role:'user',content:auraPlan.intent}],draft:emptyForgeDraft(),generate:async r=>{if(r.phase==='plan'){plans++;return JSON.stringify(plans===1?bad:auraPlan);}if(r.phase==='build'){builds++;return JSON.stringify({message:'Tested.',draft:auraDraft});}return JSON.stringify({approved:true,issues:[]});},simulate});
 assert.equal(plans,2);assert.equal(builds,1);assert.equal(reply.validation.attempts,1);
});

test('a working effect with the wrong item kind is repaired before simulation or display',async()=>{
 const original={...emptyForgeDraft(),sprite:'bark-buckler'},shield={...original,name:'Everliving Bark Buckler',slot:'shield',stats:{health:10000,healthRegen:1000}};
 const plan={intent:'Make this selected shield an immortality shield by adding a lot of health and health regeneration.',itemType:'shield',allowedStats:['health','healthRegen'],tests:[{name:'Large health reserve and recovery stop after removal',requiresEffect:true,code:`const g=makeGame(),hp=g.player.maxHp,regen=g.stats.healthRegen;const id=equip(g);assert(g.player.maxHp===hp+10000&&g.stats.healthRegen===regen+1000,'Health bonuses missing');g.unequip(g.wornSlot(id));assert(g.player.maxHp===hp&&g.stats.healthRegen===regen,'Bonuses remained');`}]};
 let builds=0,candidateRuns=0;const calls=[];
 const reply=await runForgeAgent({messages:[{role:'user',content:plan.intent}],draft:original,generate:async r=>{calls.push(r);if(r.phase==='plan')return JSON.stringify(plan);if(r.phase==='review')return JSON.stringify({approved:true,issues:[]});return JSON.stringify({message:'A shield with deep reserves.',draft:{...shield,slot:++builds===1?'ring':'shield'}});},simulate:async r=>{if(r.mode!=='plan')candidateRuns++;return simulate(r);}});
 assert.equal(reply.validation.attempts,2);assert.equal(candidateRuns,1);assert.equal(reply.draft.slot,'shield');assert.equal(reply.draft.sprite,'bark-buckler');assert.match(calls.filter(r=>r.phase==='build')[1].messages.at(-1).content,/Wrong item type: requested shield, returned ring/);
 const g=runForgeSimulation({draft:reply.draft,tests:[{name:'Actual shield equipment and reload',requiresEffect:true,code:`const g=makeGame(),id=equip(g);assert(g.equipment.offhand===id&&!g.equipment.trinket1,'Shield did not use off hand');const snapshot=g.snapshot();assert(snapshot.forgedItems[id].slot==='shield','Saved type changed');assert(g.player.maxHp>10000,'Requested health missing');`}]});assert.equal(g.passed,true,JSON.stringify(g));
});

test('plans must resolve a valid item type and explicit visual/type combinations remain possible',async()=>{
 assert.throws(()=>validateForgePlan({...auraPlan,itemType:undefined}),/resolve itemType/);
 assert.throws(()=>validateForgePlan({...auraPlan,itemType:'offhand'}),/item kind/);
 const reply=await runForgeAgent({messages:[{role:'user',content:'Keep this as a ring with a shield drawing and kill nearby creatures.'}],draft:{...emptyForgeDraft(),sprite:'bark-buckler'},generate:generateFor([{...auraDraft,sprite:'bark-buckler'}]),simulate});
 assert.equal(reply.draft.slot,'ring');assert.equal(reply.draft.sprite,'bark-buckler');
});
