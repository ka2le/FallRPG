// End-to-end checks use an isolated browser and disposable workers, never a
// user's open tab, local save, equipped items or API key. Requires npm run dev.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const cases=[
  {name:'identity-shield',itemType:'shield',draft:{sprite:'bark-buckler'},request:'make this selected shield be an immortality shield, by giving a lot of hp and regen',test:`const g=makeGame(),hp=g.player.maxHp,regen=g.stats.healthRegen;const id=equip(g);assert(draft.slot==='shield'&&g.equipment.offhand===id,'Shield kept the stale Ring type');assert(draft.sprite==='bark-buckler','Selected shield drawing changed');assert(g.player.maxHp>=hp+1000&&g.stats.healthRegen>=regen+10,'Requested high health and recovery missing');`},
  {name:'identity-crown',itemType:'head',request:'Make a crown with exactly 50 extra mana regeneration per second and no other bonuses.',test:`const g=makeGame(),regen=g.stats.manaRegen;const id=equip(g);assert(draft.slot==='head'&&g.equipment.head===id,'Crown did not become a head item');assert(g.stats.manaRegen===regen+50,'Wrong recovery');`},
  {name:'identity-ring',itemType:'ring',request:'Make a ring that strengthens my Willow Ward shield by exactly 25 absorption, with no other bonuses.',test:`const g=makeGame(),shield=g.spellValues('ward').shield;equip(g);assert(draft.slot==='ring','A ring power was mistaken for a shield item');assert(g.spellValues('ward').shield===shield+25,'Wrong shield bonus');`},
  {name:'identity-refine',itemType:'boots',draft:{name:'Wayfarer boots',slot:'boots',sprite:'wayboots',stats:{speed:.1,regen:3}},request:'Add exactly 250 health to this item. Keep its other bonuses and drawing.',test:`const g=makeGame(),hp=g.player.maxHp;const id=equip(g);assert(draft.slot==='boots'&&g.equipment.boots===id,'Unrequested type change');assert(draft.sprite==='wayboots'&&draft.stats.speed===.1&&draft.stats.regen===3,'Existing choices changed');assert(g.player.maxHp===hp+250,'Wrong health bonus');`},
  {name:'proximity',request:'Create a head item that instantly kills every creature within 200 game units, including idle enemies and peaceful wildlife. Creatures outside 200 units and my health must be unaffected. No other stats or bonuses.',test:`const g=makeGame({creatures:[{id:'idle',type:'seedling',x:1180,y:855,hp:1000000,maxHp:1000000},{id:'peaceful',type:'ventback',x:1250,y:855,hp:1000000,maxHp:1000000},{id:'outside',type:'seedling',x:1281,y:855,hp:1000000,maxHp:1000000}]});const hp=g.player.hp;equip(g);tick(g,.3);assert(g.creatures[0].dead&&g.creatures[1].dead,'Nearby idle/peaceful targets survived');assert(!g.creatures[2].dead,'Outside target died');assert(g.player.hp===hp,'Wearer was affected');`},
  {name:'spellcraft',request:'Make a ring that makes Willow Ward cost zero mana and doubles its shield. All other spells and stats must stay unchanged.',test:`const g=makeGame({player:{mana:0}}),shield=g.spellValues('ward').shield,nova=g.spellValues('nova').cost;equip(g);assert(g.beginCast('2'),'Free ward did not cast at zero mana');assert(g.player.mana===0&&Math.abs(g.player.shield-shield*2)<1e-6,'Wrong cost or shield');assert(g.spellValues('nova').cost===nova,'Other spell cost changed');`},
  {name:'movement',request:'Make boots that heal one extra health per world unit actually walked. No extra healing while stationary or after removal. Normal passive recovery continues, and movement speed and every other stat stay unchanged.',test:`const g=makeGame({player:{hp:100}});const id=equip(g),start=g.player.x,hp=g.player.hp,regen=g.stats.healthRegenRest;tick(g,.1,{right:true});const distance=g.player.x-start;assert(distance>0&&Math.abs(g.player.hp-hp-distance-regen*.1)<1e-5,'Wrong walking healing');const still=g.player.hp;tick(g,.1);assert(Math.abs(g.player.hp-still-regen*.1)<1e-5,'Extra stationary healing');g.unequip(g.wornSlot(id));const off=g.player.hp;tick(g,.1,{right:true});assert(Math.abs(g.player.hp-off-regen*.1)<1e-5,'Healing continued after removal');`},
  {name:'hit-rewards',request:'Make gloves that give exactly 37 amber for every outgoing hit, with no other stats or bonuses. Incoming damage must not pay amber, and the effect must stop when I remove the gloves.',test:`const g=makeGame(),coins=g.player.coins;const id=equip(g);g.hurt(g.creatures[0],1);g.hurt(g.creatures[0],1);assert(g.player.coins===coins+74,'Wrong hit payout');g.damagePlayer(5,{type:'seedling'});assert(g.player.coins===coins+74,'Incoming damage paid amber');g.unequip(g.wornSlot(id));g.hurt(g.creatures[0],1);assert(g.player.coins===coins+74,'Payout continued after removal');`},
];
const chosen=process.argv[2]?cases.filter(c=>c.name===process.argv[2]||process.argv[2]==='identity'&&c.name.startsWith('identity-')):cases;
if(!chosen.length)throw new Error('Unknown validation case.');
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  page.on('console',message=>{if(message.text().startsWith('FORGE '))console.log(message.text());});
  await page.goto('http://127.0.0.1:5175/?test');await page.waitForFunction(()=>window.__hollow);await page.evaluate(()=>window.__hollow.ui.open('forge'));
  for(const scenario of chosen){
    console.log(`START ${scenario.name}`);
    try{
      const proof=await page.evaluate(async scenario=>{
        const {askForge}=await import('/src/forge-ai.js'),{emptyForgeDraft}=await import('/src/forge.js'),{simulateForgeItem}=await import('/src/forge-simulation-client.js');
        const before=JSON.stringify(window.__hollow.game.snapshot());
        let reply;try{reply=await askForge({messages:[{role:'user',content:scenario.request}],draft:{...emptyForgeDraft(),...scenario.draft},settings:{provider:'codex'},signal:AbortSignal.timeout(470000),onProgress:phase=>console.log(`FORGE ${scenario.name}: ${phase}`)});}catch(error){return {error:error.message,diagnostics:error.diagnostics||null};}
        const oracle=await simulateForgeItem({draft:reply.draft,tests:[{name:`Independent ${scenario.name} check`,requiresEffect:true,code:scenario.test}]});
        return {reply,oracle,liveGameUnchanged:JSON.stringify(window.__hollow.game.snapshot())===before};
      },scenario);
      await writeFile(`artifacts/forge-agent-${scenario.name}.json`,JSON.stringify(proof,null,2));
      if(proof.error)throw new Error(proof.error);
      if(scenario.itemType&&proof.reply.draft.slot!==scenario.itemType)throw new Error(`Expected ${scenario.itemType}, received ${proof.reply.draft.slot}`);
      if(!proof.oracle.passed||!proof.liveGameUnchanged)throw new Error(JSON.stringify(proof.oracle));
      console.log(`PASS ${scenario.name}: ${proof.reply.validation.attempts} build attempt(s), ${proof.reply.validation.tests.length} planned tests, independent check passed, live game unchanged.`);
    }catch(error){process.exitCode=1;await writeFile(`artifacts/forge-agent-${scenario.name}-error.txt`,String(error.stack||error));console.error(`FAIL ${scenario.name}: ${error.message}`);}
  }
}finally{await browser.close();}
