import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const planFor=draft=>({intent:`Apply ${draft.name}'s requested behavior.`,itemType:draft.slot,allowedStats:Object.keys(draft.stats||{}),allowHealthLoss:false,tests:[{name:'Requested behavior is active only while equipped',requiresEffect:true,code:draft.functionCode?`const g=makeGame();const id=equip(g);const before=g.player.hp;g.damagePlayer(25,{type:'ventback'});assert(g.player.hp===before,'Ventback damage was not cancelled');g.damagePlayer(10,{type:'seedling'});assert(g.player.hp===before-10,'Unrelated damage was cancelled');g.unequip(g.wornSlot(id));g.damagePlayer(10,{type:'ventback'});assert(g.player.hp===before-20,'Effect continued after removal');`:`const g=makeGame();const before=g.stats.manaRegen;const id=equip(g);assert(g.stats.manaRegen===before+${draft.stats.regen||0},'Requested regeneration missing');g.unequip(g.wornSlot(id));assert(g.stats.manaRegen===before,'Regeneration remained after removal');`}]});
const stageReply=(phase,reply)=>phase==='plan'?planFor(reply.draft):phase==='review'?{approved:true,issues:[]}:reply;
const mockForge=(route,reply)=>route.fulfill({json:{text:JSON.stringify(stageReply(route.request().postDataJSON().phase,reply))}});
test.beforeEach(async({page})=>{await page.goto('/?test');await page.waitForFunction(()=>window.__hollow);});
test('town Forge, editable sprite/stat/function choices, free crafting, inventory and reload',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(()=>{const {game:g}=window.__hollow;const forge=g.world.interactables.find(i=>i.id==='forge');g.player.x=forge.x;g.player.y=forge.y+18;g.nearby=forge;g.interact();});
  await expect(page.getByRole('dialog',{name:'The Forge',exact:true})).toBeVisible();await expect(page.locator('[data-forge-sprite]')).toHaveCount(128);
  await page.locator('[data-forge-field="name"]').fill('Crown of infinite mana');await page.locator('[data-forge-field="slot"]').selectOption('head');await page.locator('[data-forge-search]').fill('crown');await expect(page.locator('[data-forge-sprite]:visible')).toHaveCount(2);
  await page.locator('[data-forge-sprite="rimecrown"]').click();await page.locator('[data-forge-stat="regen"]').fill('1000');await page.locator('[data-forge="craft"]').click();
  await expect(page.locator('[data-forge="equip"]')).toHaveCount(0);await expect(page.locator('.forge-status')).toContainText('in your pack');expect(await page.evaluate(()=>window.__hollow.game.manaRegen)).toBe(4);expect(await page.evaluate(()=>window.__hollow.game.player.coins)).toBe(24);
  await page.locator('[data-close]').click();await page.keyboard.press('i');await expect(page.locator('.bag .item-sprite')).toHaveCount(3);await page.getByRole('button',{name:'Crown of infinite mana',exact:true}).click();expect(await page.evaluate(()=>window.__hollow.game.manaRegen)).toBe(1004);await page.reload();await page.waitForFunction(()=>window.__hollow);expect(await page.evaluate(()=>window.__hollow.game.manaRegen)).toBe(1004);
  expect(errors).toEqual([]);
});
test('chat fills a draft and executable novel code; connection errors leave the draft intact',async({page})=>{
  await page.route('**/api/forge',route=>mockForge(route,{message:'A ring to quiet the Ventbacks.',draft:{name:'Ventback covenant',slot:'ring',sprite:'dewloop',stats:{mana:7},description:'The vents fall silent.',functionCode:"return {onDamage(ctx){if(ctx.source?.type==='ventback')ctx.cancel=true;}};"}}));
  await page.evaluate(()=>window.__hollow.ui.open('forge'));await page.locator('#forge-prompt').fill('Make me a ring that makes me immune to ventbacks');await page.getByRole('button',{name:'Ask Cinder'}).click();await expect(page.locator('[data-forge-field="name"]')).toHaveValue('Ventback covenant');
  await page.locator('[data-forge-stat="mana"]').fill('12');await page.locator('[data-forge="craft"]').click();await page.getByRole('button',{name:'Open inventory →'}).click();await page.getByRole('button',{name:'Ventback covenant',exact:true}).click();
  expect(await page.evaluate(()=>{const g=window.__hollow.game;g.safeZonesEnabled=false;const hp=g.player.hp;g.damagePlayer(50,{type:'ventback'});return g.player.hp===hp;})).toBe(true);
  await page.evaluate(()=>window.__hollow.ui.open('forge'));await page.route('**/api/forge',route=>route.fulfill({status:400,json:{error:'Codex is not signed in.'}}));await page.locator('#forge-prompt').fill('Add sparks');await page.getByRole('button',{name:'Ask Cinder'}).click();await expect(page.locator('.forge-chat')).toContainText('Codex is not signed in.');await expect(page.locator('[data-forge-field="name"]')).toHaveValue('Ventback covenant');
});
test('repair an existing broken crown through inventory without duplicating it or auto-equipping',async({page})=>{
  const id=await page.evaluate(()=>{const {game:g,ui}=window.__hollow;const id=g.forgeItem({name:'Broken death crown',slot:'head',sprite:'rimecrown',stats:{health:1000},functionCode:'return {onUpdate(){throw new Error("bad rune")}};'});g.equip(id);g.forgeRuntime.run('onUpdate',{dt:.05});ui.openCharacter('gear');return id;});
  await page.locator(`[data-equip="${id}"]`).hover();await expect(page.locator('#game-tip')).toContainText('bad rune');await page.locator(`[data-forge-edit="${id}"]`).click();await expect(page.locator('[data-forge-field="name"]')).toHaveValue('Broken death crown');
  await page.locator('[data-forge-field="effect"]').selectOption('deathAura');await page.locator('[data-forge="craft"]').click();
  expect(await page.evaluate(id=>({count:window.__hollow.game.inventory.filter(x=>x===id).length,worn:!!window.__hollow.game.wornSlot(id)}),id)).toEqual({count:1,worn:false});
  await page.getByRole('button',{name:'Open inventory →'}).click();await page.locator(`[data-equip="${id}"]`).click();
  expect(await page.evaluate(()=>{const g=window.__hollow.game;g.autoAttack=false;const hp=g.player.hp;const target=g.creatures.find(c=>!c.dead&&!c.rootwall);Object.assign(target,{x:g.player.x+100,y:g.player.y,hp:1e9,maxHp:1e9,aggro:false});g.forgeRuntime.run('onUpdate',{dt:.1});return {dead:target.dead,hurtPlayer:g.player.hp<hp};})).toEqual({dead:true,hurtPlayer:false});
});
test('API mode reads bundled source with Luna medium and never persists the personal key',async({page})=>{
  const requests=[];
  await page.route('https://api.openai.com/v1/responses',async route=>{const body=route.request().postDataJSON();requests.push(body);
    if(requests.length===1)await route.fulfill({json:{status:'completed',output:[{type:'function_call',name:'read_game_source',call_id:'source-call',arguments:'{"file":"src/game.js"}'}]}});
    else {const phase=/Current harness phase: (\w+)/.exec(body.instructions)[1];await route.fulfill({json:{status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(stageReply(phase,{message:'I have read the runes.',draft:{name:'API crown',slot:'head',sprite:'rimecrown',stats:{regen:999},functionCode:''}}))}]}]}});}
  });
  await page.evaluate(()=>window.__hollow.ui.open('forge'));await page.locator('[data-forge="connection"]').click();await page.locator('[data-forge-provider]').selectOption('api');await page.locator('[data-forge-key]').fill('sk-test-session-only');await page.locator('#forge-prompt').fill('Read game.js and make a crown');await page.getByRole('button',{name:'Ask Cinder'}).click();
  await expect(page.locator('[data-forge-field="name"]')).toHaveValue('API crown');expect(requests).toHaveLength(4);expect(requests[0].model).toBe('gpt-6-luna');expect(requests[0].reasoning.effort).toBe('medium');expect(requests[0].store).toBe(false);expect(requests[1].input.find(x=>x.type==='function_call_output').output).toContain('damagePlayer');expect(requests[3].instructions).toContain('phase: review');
  expect(await page.evaluate(()=>JSON.stringify({...localStorage}))).not.toContain('sk-test-session-only');await page.reload();await page.waitForFunction(()=>window.__hollow);await page.evaluate(()=>window.__hollow.ui.open('forge'));await page.locator('[data-forge="connection"]').click();await expect(page.locator('[data-forge-key]')).toHaveAttribute('placeholder','sk-…');
});
test('cancel a pending chat and preserve edits made while Cinder is working',async({page})=>{
  await page.route('**/api/forge',async route=>{await new Promise(r=>setTimeout(r,300));try{await mockForge(route,{message:'A suggested crown.',draft:{name:'Cinder’s suggestion',slot:'head',sprite:'rimecrown',stats:{regen:50},functionCode:''}});}catch{/* Request may have been cancelled. */}});
  await page.evaluate(()=>window.__hollow.ui.open('forge'));await page.locator('#forge-prompt').fill('Make a crown');await page.getByRole('button',{name:'Ask Cinder'}).click();await page.locator('[data-forge-field="name"]').fill('My draft');await expect(page.locator('[data-forge="apply-suggestion"]')).toBeVisible();await expect(page.locator('[data-forge-field="name"]')).toHaveValue('My draft');await page.locator('[data-forge="apply-suggestion"]').click();await expect(page.locator('[data-forge-field="name"]')).toHaveValue('Cinder’s suggestion');
  await page.locator('#forge-prompt').fill('Another idea');await page.getByRole('button',{name:'Ask Cinder'}).click();await page.locator('[data-forge="cancel"]').click();await expect(page.locator('.forge-status')).toContainText('cancelled');await expect(page.locator('[data-forge-field="name"]')).toHaveValue('Cinder’s suggestion');
});
test('failed generated effects are repaired inside the agent loop before entering the editable draft',async({page})=>{
  const builds=[],feedback=[];
  const good={message:'Tested ring.',draft:{name:'Tested immunity',slot:'ring',sprite:'dewloop',stats:{},functionCode:"return {onDamage(c){if(c.source?.type==='ventback')c.cancel=true;}};"}};
  await page.route('**/api/forge',async route=>{const request=route.request().postDataJSON();let reply;
    if(request.phase==='build'){builds.push(request);reply=builds.length===1?{message:'Broken candidate.',draft:{...good.draft,name:'Never show this',functionCode:'return {onUpdate(c){c.state.missing.value++;}};'}}:good;}
    else if(request.phase==='review')reply={approved:true,issues:[]};else reply=planFor(good.draft);
    feedback.push(request);await route.fulfill({json:{text:JSON.stringify(reply)}});
  });
  await page.evaluate(()=>window.__hollow.ui.open('forge'));await page.locator('#forge-prompt').fill('A ring immune only to Ventbacks');await page.getByRole('button',{name:'Ask Cinder'}).click();
  await expect(page.locator('[data-forge-field="name"]')).toHaveValue('Tested immunity');expect(builds).toHaveLength(2);expect(builds[1].messages.at(-1).content).toContain('runtime error');expect(feedback.map(r=>r.phase)).toEqual(['plan','build','build','review']);expect(await page.evaluate(()=>window.__hollow.game.inventory.length)).toBe(2);
});
test('simulation timeout and cancellation terminate workers without touching the live game',async({page})=>{
  const proof=await page.evaluate(async()=>{const {simulateForgeItem}=await import('/src/forge-simulation-client.js');const before=JSON.stringify(window.__hollow.game.snapshot());
    const result=await simulateForgeItem({draft:{name:'Unbounded',slot:'ring',sprite:'dewloop',stats:{},functionCode:'while(true){}'},tests:[]},undefined,{timeoutMs:500});
    const controller=new AbortController(),pending=simulateForgeItem({draft:{name:'Cancelled',slot:'ring',sprite:'dewloop',stats:{},functionCode:'while(true){}'},tests:[]},controller.signal);controller.abort();let aborted=false;try{await pending;}catch(e){aborted=e.name==='AbortError';}
    return {failed:!result.passed,timeout:result.error.includes('time limit'),aborted,inventory:window.__hollow.game.inventory.length,forged:Object.keys(window.__hollow.game.forgedItems).length};
  });expect(proof).toEqual({failed:true,timeout:true,aborted:true,inventory:2,forged:0});
});
test('a requested shield corrects a stale Ring type and equips in the off hand after reload',async({page})=>{
  const draft={name:'Everliving Bark Buckler',slot:'shield',sprite:'bark-buckler',stats:{health:10000,healthRegen:1000},description:'Living bark with deep health reserves.',functionCode:''};let builds=0;
  await page.route('**/api/forge',route=>{
    const {phase}=route.request().postDataJSON();const reply=phase==='plan'?{intent:'Make the selected shield an immortality shield with high health and regeneration.',itemType:'shield',allowedStats:['health','healthRegen'],tests:[{name:'Health and recovery bonuses',requiresEffect:true,code:'const g=makeGame(),hp=g.player.maxHp,regen=g.stats.healthRegen;equip(g);assert(g.player.maxHp===hp+10000&&g.stats.healthRegen===regen+1000,"Missing health and regeneration");'}]}:phase==='review'?{approved:true,issues:[]}:{message:'Your living bark shield.',draft:{...draft,slot:++builds===1?'ring':'shield'}};
    return route.fulfill({json:{text:JSON.stringify(reply)}});
  });
  await page.evaluate(()=>window.__hollow.ui.open('forge'));await page.locator('[data-forge-sprite="bark-buckler"]').click();await expect(page.locator('[data-forge-field="slot"]')).toHaveValue('ring');
  await page.locator('#forge-prompt').fill('make this selected shield be an immortality shield, by giving a lot of hp and regen');await page.getByRole('button',{name:'Ask Cinder'}).click();
  await expect(page.locator('[data-forge-field="slot"]')).toHaveValue('shield');await expect(page.locator('[data-forge-sprite="bark-buckler"]')).toHaveAttribute('aria-pressed','true');expect(builds).toBe(2);
  await page.locator('[data-forge="craft"]').click();await page.getByRole('button',{name:'Open inventory →'}).click();await page.getByRole('button',{name:draft.name,exact:true}).click();
  const check=()=>page.evaluate(()=>{const g=window.__hollow.game,id=g.equipment.offhand;return {type:g.forgedItems[id]?.slot,sprite:g.forgedItems[id]?.sprite,health:g.gear.health};});
  expect(await check()).toEqual({type:'shield',sprite:'bark-buckler',health:10000});await page.reload();await page.waitForFunction(()=>window.__hollow);expect(await check()).toEqual({type:'shield',sprite:'bark-buckler',health:10000});
});

test('Forge art alpha, animation frames, desktop and mobile layout and text keyboard controls',async({page})=>{
  const art=await page.evaluate(async()=>{const img=new Image();img.src='./assets/forge-v1.png';await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;let alpha=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]===0)alpha++;return {ratio:alpha/(c.width*c.height),w:c.width,h:c.height,frames:window.__hollow.renderer.sprites.forge.length};});
  expect(art.ratio).toBeGreaterThan(.1);expect(art.frames).toBe(8);
  expect(await page.evaluate(()=>({market:window.__hollow.renderer.hitInteractable({x:1190,y:860})?.id,forge:window.__hollow.renderer.hitInteractable({x:1261,y:880})?.id}))).toEqual({market:'market',forge:'forge'});
  await page.evaluate(()=>window.__hollow.ui.open('forge'));await page.locator('#forge-prompt').pressSequentially('I wish for magic');await expect(page.locator('#forge-prompt')).toHaveValue('I wish for magic');await expect(page.getByRole('dialog',{name:'The Forge'})).toBeVisible();
  await mkdir('artifacts',{recursive:true});await page.screenshot({path:'artifacts/forge-desktop.png'});
  await page.setViewportSize({width:390,height:844});expect(await page.locator('.forge-modal').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);await page.locator('#forge-prompt').scrollIntoViewIfNeeded();await page.screenshot({path:'artifacts/forge-mobile.png'});
});
