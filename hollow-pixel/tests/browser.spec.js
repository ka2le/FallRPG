import { test, expect } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';

test.beforeEach(async({page})=>{
  await page.goto('/?test');await page.evaluate(()=>localStorage.clear());await page.reload();
  await page.waitForFunction(()=>!!window.__hollow);await page.locator('#world').focus();
  await mkdir('artifacts',{recursive:true});
});

for(const width of [1440,390])test(`level-up stays in the upper HUD and flies to the skill menu at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.evaluate(()=>window.__hollow.game.reward(140));
  const notice=page.locator('#levelup'),character=page.locator('.menu-icons [data-menu="equipment"]');
  await expect(notice).toHaveText('Level 2');await expect(notice).toBeVisible();
  await expect(character.locator('.skill-orb')).toBeVisible();
  const layout=await page.evaluate(()=>{
    const box=id=>document.querySelector(id).getBoundingClientRect(),n=box('#levelup');
    const overlaps=other=>n.left<other.right&&n.right>other.left&&n.top<other.bottom&&n.bottom>other.top;
    return {top:n.top,bottom:n.bottom,center:n.x+n.width/2,blocked:['#vitals','.menu-icons','#adventure-status'].some(s=>overlaps(box(s))),pointer:getComputedStyle(document.querySelector('#levelup')).pointerEvents};
  });
  expect(layout.top).toBeLessThanOrEqual(70);expect(layout.bottom).toBeLessThan(110);expect(layout.center).toBeCloseTo(width/2,0);
  expect(layout.blocked).toBe(false);expect(layout.pointer).toBe('none');
  const start=await page.evaluate(()=>window.__hollow.game.player.x);await page.keyboard.down('d');
  await page.waitForFunction(x=>window.__hollow.game.player.x>x+8,start);await page.keyboard.up('d');
  await page.screenshot({path:`artifacts/level-up-hud-${width}.png`});
  await page.waitForTimeout(2500);await expect(notice).toBeVisible();await expect(notice).not.toHaveClass(/leaving/);
  await expect(notice).toHaveClass(/leaving/);
  // Inspect the rendered end of the flight against the actual menu location.
  const landing=await notice.evaluate(el=>{
    const animation=el.getAnimations()[0];animation.pause();animation.currentTime=799;
    const a=el.getBoundingClientRect(),b=document.querySelector('.menu-icons [data-menu="equipment"]').getBoundingClientRect();
    const distance=Math.hypot(a.x+a.width/2-b.x-b.width/2,a.y+a.height/2-b.y-b.height/2);
    animation.play();return distance;
  });
  expect(landing).toBeLessThan(3);await expect(notice).toBeHidden();
  await expect(character).toHaveClass(/landed/);await expect(character.locator('.skill-orb')).toBeVisible();
  await character.click();await expect(page.getByRole('tab',{name:'Spells',exact:true})).toHaveAttribute('aria-selected','true');
  await page.keyboard.press('Escape');await expect(character.locator('.skill-orb')).toBeVisible();
  await character.click();await page.locator('[data-learn="surge"]').click();await page.locator('[data-upgrade-spell="surge"]').click();
  await expect(character.locator('.skill-orb')).toBeHidden();await page.keyboard.press('Escape');
  await expect(character).not.toHaveClass(/skill-ready/);
});

test('level-up handles repeated gains, early menu opening and reduced motion',async({page})=>{
  await page.evaluate(()=>window.__hollow.game.reward(140));await expect(page.locator('#levelup')).toHaveText('Level 2');
  await page.waitForFunction(()=>!!window.__hollow.ui.hud.levelFlight);
  await page.evaluate(()=>window.__hollow.game.reward(180));await expect(page.locator('#levelup')).toHaveText('Level 3');
  await page.locator('.menu-icons [data-menu="equipment"]').click();await expect(page.locator('#levelup')).toBeHidden();
  await page.waitForTimeout(900);await expect(page.locator('.menu-icons .landed')).toHaveCount(0);await page.keyboard.press('Escape');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>window.__hollow.game.reward(10000));await expect(page.locator('#levelup')).toBeVisible();
  await expect(page.locator('#levelup')).toBeHidden({timeout:6500});
  await expect(page.locator('.skill-orb')).toBeVisible();
  expect(await page.locator('.skill-orb').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
});

test('spell bindings and combat amounts display clear labels and whole numbers',async({page})=>{
  await page.evaluate(()=>{
    const {game:g}=window.__hollow;g.player.level=12;g.attributes.power=3;
    g.learned=new Set(['surge','ward','nova','haste','renew','bind','fox']);g.spellUpgrades=new Set(g.learned);g.recalculate();
  });
  await page.keyboard.press('k');
  const bindings=page.getByRole('button',{name:'Bindings',exact:true});await expect(bindings).toBeVisible();
  await expect(bindings.locator('kbd')).toHaveCount(0);await bindings.click();await expect(page.locator('.sb-slots')).toBeVisible();
  await page.getByRole('button',{name:'Done',exact:true}).click();await expect(bindings).toBeVisible();
  for(const value of await page.locator('.sm.dmg b,.sm.shield b,.sm.heal b').allTextContents())expect(value).toMatch(/^\d+$/);
  for(const id of ['surge','ward','nova','renew','fox']){
    await page.locator(`.spell-entry[data-spell="${id}"]`).hover();
    const rows=await page.locator('.tip-spell li').evaluateAll(rows=>rows.filter(r=>/^(Damage|Damage per bite|Shield|Healing)$/.test(r.querySelector('span').textContent)).map(r=>r.querySelector('b').textContent));
    expect(rows.length).toBeGreaterThan(0);for(const value of rows)expect(value).toMatch(/^\d+$/);
  }
  await page.locator('.spell-stats summary').click();
  for(const id of ['damage','ward','fox','lance','tonic'])await expect(page.locator(`.stat-sheet [data-tip-id="${id}"] b`)).toHaveText(/^\d+$/);
  await page.getByRole('tab',{name:'Stats',exact:true}).click();await page.locator('[data-grow="power"]').click();
  const deltas=await page.locator('.stat-sheet [data-tip-id="damage"] em,.stat-sheet [data-tip-id="ward"] em,.stat-sheet [data-tip-id="fox"] em,.stat-sheet [data-tip-id="lance"] em').allTextContents();
  expect(deltas.some(Boolean)).toBe(true);for(const value of deltas.filter(Boolean))expect(value).toMatch(/^[+−]\d+$/);
  await page.screenshot({path:'artifacts/whole-number-spell-stats.png'});
});

test('unified Items Spells Stats tabs spend shared skill points and grow an initially empty hotbar',async({page})=>{
  await expect(page.locator('[data-cast]')).toHaveCount(0);await page.evaluate(()=>window.__hollow.game.reward(140));await page.keyboard.press('k');
  await expect(page.getByRole('dialog',{name:'Character',exact:true})).toBeVisible();await expect(page.getByRole('tab')).toHaveCount(3);
  await expect(page.getByRole('tab',{name:'Items',exact:true})).toBeVisible();await expect(page.getByRole('tab',{name:'Spells',exact:true})).toHaveAttribute('aria-selected','true');await expect(page.getByRole('tab',{name:/^Stats/})).toBeVisible();
  await expect(page.locator('.known-spell')).toHaveCount(0);await page.locator('[data-learn="surge"]').click();await expect(page.locator('[data-cast]')).toHaveCount(1);
  await page.locator('[data-upgrade-spell="surge"]').click();await expect(page.locator('[data-upgrade-spell="surge"]')).toBeDisabled();
  expect(await page.evaluate(()=>({points:window.__hollow.game.unspentPoints,upgrades:[...window.__hollow.game.spellUpgrades],coins:window.__hollow.game.player.coins}))).toEqual({points:0,upgrades:['surge'],coins:24});
  await expect(page.locator('.spell-metrics')).toBeVisible();await expect(page.locator('.spell-locked')).toHaveCount(0);await page.screenshot({path:'artifacts/unified-spells-focused.png'});
});

test('unified skill spending stays within one budget across draft stats, spell focus and save reload',async({page})=>{
  await page.evaluate(()=>window.__hollow.game.reward(320));await page.keyboard.press('i');await page.getByRole('tab',{name:/^Stats/}).click();
  await page.locator('[data-grow="mana"]').click();await page.locator('[data-grow="mana"]').click();await page.getByRole('tab',{name:'Spells',exact:true}).click();
  await page.locator('[data-learn="surge"]').click();await page.locator('[data-upgrade-spell="surge"]').click();await page.getByRole('tab',{name:/^Stats/}).click();
  await expect(page.locator('[data-grow="power"]')).toBeDisabled();await page.locator('[data-grow-confirm]').click();
  expect(await page.evaluate(()=>({points:window.__hollow.game.unspentPoints,attributes:window.__hollow.game.attributes,mana:window.__hollow.game.player.maxMana,regen:window.__hollow.game.manaRegen}))).toEqual({points:0,attributes:{power:0,mana:2},mana:116,regen:5.3});
  await page.keyboard.press('Escape');await page.evaluate(()=>window.__hollow.save());await page.reload();await page.waitForFunction(()=>!!window.__hollow);
  expect(await page.evaluate(()=>[window.__hollow.game.attributes,[...window.__hollow.game.spellUpgrades],window.__hollow.game.unspentPoints])).toEqual([{power:0,mana:2},['surge'],0]);await expect(page.locator('[data-cast]')).toHaveCount(1);
});

test('unified spell collection supports all seven focus upgrades and mobile tabs without overflow',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{const g=window.__hollow.game;g.player.level=11;g.recalculate();});await page.keyboard.press('k');
  for(const id of ['surge','ward','nova','haste','renew','bind','fox']){
    await page.locator(`[data-learn="${id}"]`).click();await page.locator(`[data-upgrade-spell="${id}"]`).click();
  }
  await expect(page.locator('.known-spell')).toHaveCount(7);await expect(page.locator('[data-cast]')).toHaveCount(7);
  expect(await page.evaluate(()=>[window.__hollow.game.unspentPoints,window.__hollow.game.spellUpgrades.size])).toEqual([6,7]);
  for(const name of ['Items','Stats','Spells']){
    await page.getByRole('tab',{name:new RegExp(`^${name}`)}).click();expect(await page.locator('.char-modal').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  }
  await page.screenshot({path:'artifacts/unified-spells-mobile.png'});await page.setViewportSize({width:1440,height:900});await page.screenshot({path:'artifacts/unified-spells-all.png'});expect(errors).toEqual([]);
});

for(const type of ['rootknife','petalmaw'])test(`${type} pressure comes from pursuit or ranged attacks while the player retreats`,async({page})=>{
  await page.evaluate(async(type)=>{
    const {game:g,renderer:r}=window.__hollow,{SPECIES}=await import('/src/data.js'),s=SPECIES[type],c=g.creatures.find(c=>c.type===type);
    g.world.props=[];g.world.interactables=[];g.world.ambient=[];g.world.rootwallGroups=[];g.safeZonesEnabled=false;g.wasSafe=false;g.autoAttack=true;g.boltCooldown=0;g.target=null;
    Object.assign(g.player,{x:3000,y:3000,hp:120,invulnerable:0});
    const startX=type==='seedling'?3150:3175;Object.assign(c,{x:startX,y:3000,homeX:startX,homeY:3000,quest:undefined,opening:false,level:1,hp:s.hp,maxHp:s.hp,damage:s.damage,attack:1,windup:0,root:0,stun:0,slow:0,dead:false,aggro:false,returning:false});g.creatures=type==='seedling'?[c,...[40,70].map((offset,i)=>({...c,id:`pack-ally-${i}`,x:c.x+offset,homeX:c.x+offset}))]:[c];r.camera.x=3000;r.camera.y=3000*.72;
  },type);
  if(type==='petalmaw')await page.keyboard.down('Shift');
  await page.keyboard.down('a');
  try{await page.waitForFunction(()=>window.__hollow.game.player.hp<window.__hollow.game.player.maxHp,null,{timeout:10000});}
  finally{await page.keyboard.up('a');await page.keyboard.up('Shift');}
  expect(await page.evaluate(()=>window.__hollow.game.player.hp)).toBeLessThan(120);
});

test('entering Willowmere sends a wounded enemy home without a full-health reset',async({page})=>{
  const start=await page.evaluate(()=>{
    const {game:g,renderer:r}=window.__hollow,c=g.creatures.find(c=>c.type==='seedling');g.world.props=[];g.world.interactables=[];g.world.rootwallGroups=[];g.world.ambient=[];g.creatures=[c];g.autoAttack=false;g.target=null;
    Object.assign(c,{x:1340,y:855,homeX:1510,homeY:855,hp:12,maxHp:40,aggro:true,returning:false,root:0,stun:0});Object.assign(g.player,{x:1080,y:855});r.camera.x=1080;r.camera.y=855*.72;return {time:g.time,x:c.x};
  });
  await page.waitForFunction(t=>window.__hollow.game.time>t+.8,start.time);
  const state=await page.evaluate(()=>{const g=window.__hollow.game,c=g.creatures[0];return {x:c.x,hp:c.hp,aggro:c.aggro};});
  expect(state.x).toBeGreaterThan(start.x+30);expect(state.hp).toBeGreaterThan(12);expect(state.hp).toBeLessThan(20);expect(state.aggro).toBe(false);
});

test('the first pasture fight is manageable without spells or tonics and does not pull the next camp',async({page})=>{
  const result=await page.evaluate(async()=>{
    const {PASTURE}=await import('/src/opening.js');
    const {game:g,renderer:r}=window.__hollow;g.paused=false;g.questAction('herd');g.navigateTo(PASTURE.approach.x,PASTURE.approach.y);const outsiders=new Set();let died=false;
    for(let n=0;n<500&&!g.herdCleared&&!died;n++){
      g.update(.05,{run:true});for(const c of g.creatures)if(c.aggro&&c.quest!=='herd')outsiders.add(c.id);died=g.events.some(e=>e.type==='respawn');
    }
    g.paused=true;r.camera.x=g.player.x;r.camera.y=g.player.y*.72;r.draw(0);
    return {cleared:g.herdCleared,hp:g.player.hp,tonics:g.player.tonics,spells:g.learned.size,died,outsiders:outsiders.size};
  });
  expect(result.cleared).toBe(true);expect(result.died).toBe(false);expect(result.hp).toBeGreaterThanOrEqual(75);expect(result.hp).toBeLessThan(120);
  expect(result.tonics).toBe(3);expect(result.spells).toBe(0);expect(result.outsiders).toBe(0);await page.screenshot({path:'artifacts/opening-pasture.png'});
});

test('the north path leaves room outside the haven to retreat while the first pack stays engaged',async({page})=>{
  const result=await page.evaluate(async()=>{
    const {PASTURE}=await import('/src/opening.js'),{game:g,renderer:r}=window.__hollow;g.paused=false;g.questAction('herd');g.navigateTo(PASTURE.townExit.x,PASTURE.townExit.y);
    for(let n=0;n<300&&g.route.length;n++)g.update(.05,{run:true});const exit={safe:g.isSafe,hp:g.player.hp,aggro:g.creatures.some(c=>c.aggro)};
    g.navigateTo(PASTURE.approach.x,PASTURE.approach.y);for(let n=0;n<300&&!g.creatures.some(c=>c.quest==='herd'&&c.aggro);n++)g.update(.05,{run:true});
    const before={x:g.player.x,y:g.player.y};let entered=false;for(let n=0;n<30;n++){g.update(.05,{x:0,y:80/112});entered||=g.isSafe;}
    const active=g.creatures.filter(c=>c.quest==='herd'&&!c.dead);g.paused=true;r.camera.x=g.player.x;r.camera.y=g.player.y*.72;r.draw(0);
    return {exit,entered,moved:Math.hypot(g.player.x-before.x,g.player.y-before.y),engaged:active.some(c=>c.aggro),returning:active.some(c=>c.returning)};
  });
  expect(result.exit).toEqual({safe:false,hp:120,aggro:false});expect(result.entered).toBe(false);expect(result.moved).toBeGreaterThan(110);expect(result.engaged).toBe(true);expect(result.returning).toBe(false);
  await page.screenshot({path:'artifacts/pasture-retreat-room.png'});
});

test('loading a paused-attack save restores automatic sparks and a keyboard approach damages the first Seedlings',async({page})=>{
  await page.evaluate(()=>{const {game:g,save}=window.__hollow;g.autoAttack=false;Object.assign(g.player,{x:970,y:670});save();});
  await page.reload();await page.waitForFunction(()=>!!window.__hollow);
  await expect(page.getByRole('button',{name:'Automatic basic attacks on',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.locator('#world').focus();await page.keyboard.down('w');
  try{await page.waitForFunction(()=>window.__hollow.game.creatures.some(c=>c.quest==='herd'&&c.hp<c.maxHp),null,{timeout:6000});}
  finally{await page.keyboard.up('w');}
  expect(await page.evaluate(()=>window.__hollow.game.player.mana)).toBe(100);
  await page.keyboard.press('c');const paused=page.getByRole('button',{name:'Automatic basic attacks off',exact:true});
  await expect(paused).toHaveAttribute('aria-pressed','false');await expect(paused.locator('.basic-status')).toHaveText('OFF');
  await paused.click();await expect(page.getByRole('button',{name:'Automatic basic attacks on',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.screenshot({path:'artifacts/automatic-basic-attack.png'});
});

test('rushing enemies spread into a smooth attack ring without blocking one another',async({page})=>{
  const result=await page.evaluate(()=>{
    const {game:g,renderer:r}=window.__hollow,template=g.creatures.find(c=>c.type==='rootknife');g.world.props=[];g.world.interactables=[];g.world.rootwallGroups=[];g.world.ambient=[];
    g.creatures=Array.from({length:6},(_,i)=>({...template,id:`spacing-${i}`,x:3130+i*2,y:3000,homeX:3130+i*2,homeY:3000,aggro:true,returning:false,dead:false,root:0,stun:0,slow:0,attack:1,windup:0}));
    Object.assign(g.player,{x:3000,y:3000,invulnerable:1000});g.autoAttack=false;g.target=null;g.safeZonesEnabled=false;g.paused=false;
    for(let n=0;n<300;n++)g.update(.05);let maxStep=0;
    for(let n=0;n<40;n++){const before=g.creatures.map(c=>({x:c.x,y:c.y}));g.update(.05);g.creatures.forEach((c,i)=>maxStep=Math.max(maxStep,Math.hypot(c.x-before[i].x,c.y-before[i].y)));}
    const gap=Math.min(...g.creatures.flatMap((c,i)=>g.creatures.slice(i+1).map(b=>Math.hypot(c.x-b.x,c.y-b.y))));
    g.paused=true;r.camera.x=g.player.x;r.camera.y=g.player.y*.72;r.draw(0);return {gap,maxStep,inRange:g.creatures.every(c=>Math.hypot(c.x-g.player.x,c.y-g.player.y)<53),solid:g.creatures.some(c=>c.solid)};
  });
  expect(result.gap).toBeGreaterThan(28);expect(result.maxStep).toBeLessThan(.1);expect(result.inRange).toBe(true);expect(result.solid).toBe(false);
  await page.screenshot({path:'artifacts/enemy-soft-spacing.png'});
});

test('rooted trees regenerate and walking trees retaliate visibly',async({page})=>{
  const wall=await page.evaluate(()=>{
    const {game:g,renderer:r}=window.__hollow,group=g.world.rootwallGroups.find(a=>a.phase==='holding'),axis={x:group.b.x-group.a.x,y:group.b.y-group.a.y},length=Math.hypot(axis.x,axis.y);axis.x/=length;axis.y/=length;
    g.world.props=[];g.world.interactables=[];g.world.ambient=[];g.world.rootwallGroups=[group];g.creatures=group.members;group.elapsed=0;const c=group.members[2];
    Object.assign(g.player,{x:c.x-axis.x*160,y:c.y-axis.y*160,invulnerable:100});g.safeZonesEnabled=false;g.autoAttack=true;g.target=c.id;g.boltCooldown=0;
    for(let n=0;n<800;n++)g.update(.05);g.autoAttack=false;g.projectiles=[];r.camera.x=g.player.x;r.camera.y=g.player.y*.72;
    return {alive:!c.dead,hp:c.hp,max:c.maxHp};
  });
  expect(wall.alive).toBe(true);expect(wall.hp).toBeGreaterThan(wall.max-30);await page.screenshot({path:'artifacts/rootwall-regeneration.png'});
  const chase=await page.evaluate(()=>{
    const {game:g,renderer:r}=window.__hollow,group=g.world.rootwallGroups[0];group.phase='scattered';group.elapsed=0;
    for(const c of group.members)Object.assign(c,group.scatter[group.site][c.rootIndex][0],{provoked:false,aggro:false,returning:false});
    const target=group.members[2];Object.assign(g.player,{x:target.x-140,y:target.y,invulnerable:100});g.hurt(target,1);
    const before=group.members.map(c=>Math.hypot(c.x-g.player.x,c.y-g.player.y));for(let n=0;n<60;n++)g.update(.05);r.camera.x=g.player.x;r.camera.y=g.player.y*.72;
    return {provoked:target.provoked,approached:group.members.some((c,i)=>Math.hypot(c.x-g.player.x,c.y-g.player.y)<before[i]-35)};
  });
  expect(chase.provoked).toBe(true);expect(chase.approached).toBe(true);await page.screenshot({path:'artifacts/rootwall-retaliation.png'});
});

test('minimal HUD, keyboard conversations, bindings and saves',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await expect(page.locator('#welcome,.quest-tracker,.ongoing-note,#coordinates')).toHaveCount(0);
  await page.evaluate(()=>{const {game,renderer}=window.__hollow;game.player.x=1040;game.player.y=825;renderer.camera.x=1040;renderer.camera.y=825*.72;});
  await page.waitForFunction(()=>window.__hollow.game.nearby?.id==='rowan');await page.keyboard.press('Space');
  await expect(page.getByRole('dialog',{name:'Rowan',exact:true})).toBeVisible();
  await page.screenshot({path:'artifacts/dialogue.png'});await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(()=>window.__hollow.game.quests.herd)).toBe('active');
  await page.keyboard.press('j');await expect(page.locator('.quest-entry')).toHaveCount(1);await page.keyboard.press('Escape');
  await page.evaluate(()=>{const g=window.__hollow.game;for(const c of g.creatures.filter(c=>c.quest==='herd'))g.hurt(c,999);g.questAction('herd');g.player.level=11;g.player.coins=1000;g.recalculate();});
  await page.keyboard.press('k');await expect(page.getByRole('dialog',{name:'Character',exact:true})).toBeVisible();for(const id of ['surge','ward','nova','haste','bind','fox'])await page.locator(`[data-learn="${id}"]`).click();
  await page.locator('[data-spell-select="fox"]').click();await page.locator('[data-bind-slot="r"]').click();
  await expect(page.locator('[data-spell-select="fox"]')).toContainText('R');
  await page.screenshot({path:'artifacts/grimoire.png'});await page.keyboard.press('Escape');
  await page.keyboard.press('2');await page.evaluate(()=>window.__hollow.save());await page.reload();await page.waitForFunction(()=>!!window.__hollow);
  expect(await page.evaluate(()=>[window.__hollow.game.bindings.r,window.__hollow.game.quests.herd,window.__hollow.game.stance])).toEqual(['fox','complete','ember']);
  expect(errors).toEqual([]);
});

test('all four habitats, full sprite silhouettes and compact layouts render',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [name,x,y] of [['village',1080,855],['spring',840,570],['autumn',1770,510],['winter',790,1370],['ember',1830,1390]]){
    await page.evaluate(({x,y})=>{const {game,renderer}=window.__hollow;game.player.x=x;game.player.y=y;game.player.invulnerable=100;game.autoAttack=false;game.paused=false;renderer.camera.x=x;renderer.camera.y=y*.72;}, {x,y});
    await page.waitForTimeout(250);await page.screenshot({path:`artifacts/${name}.png`});
  }
  expect(await page.evaluate(()=>[window.__hollow.renderer.sprites.environment.length,window.__hollow.renderer.sprites.creatures.length])).toEqual([64,64]);
  await page.keyboard.press('m');await expect(page.getByRole('dialog',{name:'Journal',exact:true})).toBeVisible();await expect(page.locator('#atlas-canvas')).toBeVisible();await page.screenshot({path:'artifacts/atlas.png'});await page.keyboard.press('Escape');
  await page.setViewportSize({width:1024,height:768});await page.waitForTimeout(150);await page.screenshot({path:'artifacts/compact.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.setViewportSize({width:390,height:844});await page.locator('.menu-icons [data-menu="equipment"]').click();await page.locator('[data-char-tab="spells"]').click();
  await expect(page.locator('.no-spells')).toBeVisible();await expect(page.locator('.known-spell')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'artifacts/narrow.png'});
  expect(errors).toEqual([]);
});

test('keyboard walking, mode attacks and deliberate spell placement work',async({page})=>{
  const x=await page.evaluate(()=>window.__hollow.game.player.x);await page.keyboard.down('d');await page.waitForFunction(x=>window.__hollow.game.player.x>x+10,x);await page.keyboard.up('d');
  const before=await page.evaluate(()=>{const {game,renderer}=window.__hollow;game.world.props=[];game.world.interactables=[];const s=renderer.screen(game.player.x+60,game.player.y),r=renderer.canvas.getBoundingClientRect();return {x:game.player.x,clickX:s.x/renderer.width*r.width,clickY:s.y/renderer.height*r.height};});
  await page.mouse.click(before.clickX,before.clickY);await page.waitForTimeout(150);expect(await page.evaluate(()=>window.__hollow.game.player.x)).toBe(before.x);
  await page.evaluate(()=>{const {game,renderer}=window.__hollow;game.world.props=[];Object.assign(game.bindings,{q:'bramble',e:'frost',r:'wave'});game.learned=new Set(['surge','nova','haste','bramble','bind','frost','ward','wave','siphon','renew','blink','fox']);game.stances=new Set(['ember','frost','siphon']);game.safeZonesEnabled=false;game.player.x=1080;game.player.y=855;game.route=[];game.destination=null;game.creatures=game.creatures.filter(c=>c.type==='seedling').slice(0,1);const c=game.creatures[0];Object.assign(c,{x:1160,y:855,homeX:1160,homeY:855,hp:200,maxHp:200,root:100});game.target=null;renderer.camera.x=1080;renderer.camera.y=855*.72;});
  await page.waitForFunction(()=>window.__hollow.game.creatures[0].hp<200);
  await page.keyboard.press('1');expect(await page.evaluate(()=>window.__hollow.game.aiming)).toBe(null);await page.keyboard.press('3');expect(await page.evaluate(()=>window.__hollow.game.cooldowns.nova>0)).toBe(true);
  await page.keyboard.press('2');expect(await page.evaluate(()=>window.__hollow.game.player.shield)).toBe(45);
  await page.evaluate(()=>window.__hollow.game.player.mana=100);await page.keyboard.press('q');expect(await page.evaluate(()=>window.__hollow.game.aiming?.slot)).toBe('q');
  const target=await page.evaluate(()=>{const {renderer}=window.__hollow,s=renderer.screen(1130,855),r=renderer.canvas.getBoundingClientRect();return {x:s.x/renderer.width*r.width,y:s.y/renderer.height*r.height};});
  await page.mouse.move(target.x,target.y);await page.screenshot({path:'artifacts/placement.png'});await page.mouse.click(target.x,target.y);
  expect(await page.evaluate(()=>window.__hollow.game.world.barriers.length)).toBe(1);
  await page.waitForTimeout(250);await page.screenshot({path:'artifacts/combat.png'});
  await page.evaluate(()=>window.__hollow.game.player.mana=100);await page.keyboard.press('e');await page.keyboard.press('Escape');expect(await page.evaluate(()=>window.__hollow.game.aiming)).toBe(null);expect(await page.evaluate(()=>window.__hollow.ui.modal)).toBe(null);
});

test('P downloads the current view and works with menus open',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [name,menu] of [['world',null],['menu','k']]){
    if(menu)await page.keyboard.press(menu);
    const downloadPromise=page.waitForEvent('download');await page.keyboard.press('p');const download=await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^between-seasons-.*\.png$/);
    const path=`artifacts/printscreen-${name}.png`;await download.saveAs(path);const buffer=await readFile(path);
    expect(buffer.subarray(1,4).toString()).toBe('PNG');expect(buffer.readUInt32BE(16)).toBe(1440);expect(buffer.readUInt32BE(20)).toBe(900);expect(buffer.length).toBeGreaterThan(100000);
    expect(await page.evaluate(()=>window.__hollow.ui.modal)).toBe(menu?'equipment':null);
  }
  expect(errors).toEqual([]);
});

test('growth, numbered spells and optional bindings are usable without placement clicks',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(()=>{const g=window.__hollow.game;g.reward(320);g.learn('surge');g.learn('ward');});
  await page.keyboard.press('i');await page.getByRole('tab',{name:/^Stats/}).click();await expect(page.locator('[data-grow="power"]')).toBeEnabled();
  await page.locator('[data-grow="power"]').click();await page.locator('[data-grow="mana"]').click();
  await expect(page.locator('[data-grow="power"]')).toBeDisabled();await page.screenshot({path:'artifacts/growth.png'});await page.locator('[data-grow-confirm]').click();expect(await page.evaluate(()=>window.__hollow.game.unspentPoints)).toBe(0);await page.keyboard.press('Escape');
  await page.keyboard.press('1');expect(await page.evaluate(()=>[window.__hollow.game.empowered,window.__hollow.game.aiming])).toEqual(['surge',null]);expect(await page.evaluate(()=>window.__hollow.game.player.mana)).toBeGreaterThanOrEqual(100);
  await expect(page.locator('[data-cast="1"]')).toHaveClass(/armed/);await page.keyboard.press('q');expect(await page.evaluate(()=>window.__hollow.game.empowered)).toBe(null);
  await page.keyboard.press('2');expect(await page.evaluate(()=>window.__hollow.game.player.shield)).toBeGreaterThan(45);await page.keyboard.press('9');
  await page.keyboard.press('k');await page.locator('[data-spell-select="ward"]').click();await page.locator('[data-bind-slot="q"]').click();await page.locator('[data-spell-select="surge"]').click();await page.locator('[data-bind-slot="9"]').click();
  await page.screenshot({path:'artifacts/new-spells.png'});await page.keyboard.press('Escape');
  expect(await page.evaluate(()=>[window.__hollow.game.bindings.q,window.__hollow.game.bindings['9']])).toEqual(['ward','surge']);
  await page.evaluate(()=>window.__hollow.save());await page.reload();await page.waitForFunction(()=>!!window.__hollow);
  expect(await page.evaluate(()=>window.__hollow.game.attributes)).toEqual({power:1,mana:1});
  expect(errors).toEqual([]);
});

test('mobile bottom joystick, fresh pinch zoom, target switching, spells and conversations work together',async({browser})=>{
  test.setTimeout(90000);
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const mobile=await context.newPage(),errors=[];mobile.setDefaultTimeout(10000);mobile.on('pageerror',e=>errors.push(e.message));
  let stage='startup';
  try{
    await mobile.goto('/?test');await mobile.waitForFunction(()=>!!window.__hollow);
    await mobile.evaluate(()=>{const {game:g,renderer:r}=window.__hollow;g.learned.add('bramble');g.setBinding('1','bramble');g.world.props=[];g.world.interactables=[];g.world.rootwallGroups=[];g.creatures=[];Object.assign(g.player,{x:1080,y:855});g.route=[];g.destination=null;r.camera.x=1080;r.camera.y=855*.72;});
    const point=async(x,y)=>mobile.evaluate(({x,y})=>{const {renderer:r}=window.__hollow,s=r.screen(x,y),b=r.canvas.getBoundingClientRect();return{x:b.left+s.x/r.width*b.width,y:b.top+s.y/r.height*b.height};},{x,y});
    const position=()=>mobile.evaluate(()=>({x:window.__hollow.game.player.x,y:window.__hollow.game.player.y}));
    expect(await mobile.evaluate(()=>window.__hollow.renderer.zoom)).toBe(1.5);
    const original=await position();let p=await point(1130,855);await mobile.touchscreen.tap(p.x,p.y);await mobile.waitForTimeout(150);
    expect(await position()).toEqual(original);expect(await mobile.evaluate(()=>window.__hollow.game.destination)).toBe(null);
    const cdp=await context.newCDPSession(mobile),send=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
    stage='upper swipe';
    // Upper-screen swipes are never a joystick.
    let a={id:1,x:50,y:300},b={id:3,x:270,y:300};await send('touchStart',[a]);a.x+=65;await send('touchMove',[a]);
    await mobile.waitForTimeout(100);expect(await position()).toEqual(original);await send('touchEnd',[a]);
    stage='immediate movement';
    // The lower-third joystick responds to the very first drag, without a hold.
    a={id:2,x:50,y:650};await send('touchStart',[a]);a.x+=65;await send('touchMove',[a]);
    await mobile.waitForFunction(x=>window.__hollow.game.player.x>x+8,original.x);
    const runStart=await mobile.evaluate(()=>({x:window.__hollow.game.player.x,time:window.__hollow.game.time}));
    await mobile.waitForFunction(time=>window.__hollow.game.time>time+.1,runStart.time);
    const runEnd=await mobile.evaluate(()=>({x:window.__hollow.game.player.x,time:window.__hollow.game.time,speed:112*(1+(window.__hollow.game.gear.speed||0))}));
    expect((runEnd.x-runStart.x)/(runEnd.time-runStart.time)).toBeCloseTo(runEnd.speed,3);
    expect(await mobile.evaluate(()=>window.__hollow.game.autoAttack)).toBe(true);
    stage='extra fingers';
    // Extra fingers cannot turn movement into zoom or stop the joystick.
    await send('touchStart',[a,b]);b.x=330;await send('touchMove',[a,b]);await mobile.waitForTimeout(100);
    expect(await mobile.evaluate(()=>window.__hollow.renderer.zoom)).toBe(1.5);
    await send('touchEnd',[b]);const moving=await position();await mobile.waitForFunction(x=>window.__hollow.game.player.x>x+4,moving.x);
    stage='recentring';
    // Recentring the joystick does not unlock pinch until every finger is lifted.
    a.x=50;await send('touchMove',[a]);await mobile.waitForFunction(()=>!window.__hollow.game.player.moving);
    const stopped=await position();b={id:3,x:270,y:300};await send('touchStart',[a,b]);b.x=340;await send('touchMove',[a,b]);
    await mobile.waitForTimeout(100);expect(await mobile.evaluate(()=>window.__hollow.renderer.zoom)).toBe(1.5);
    await send('touchEnd',[a]);b.y=650;await send('touchMove',[b]);await mobile.waitForTimeout(100);
    expect(await position()).toEqual(stopped);await send('touchEnd',[b]);
    stage='fresh pinch';
    // A fresh two-finger gesture can zoom in and out without moving the player.
    a={id:4,x:100,y:300};b={id:5,x:290,y:300};await send('touchStart',[a]);await send('touchStart',[a,b]);
    a.x=50;b.x=340;await send('touchMove',[a,b]);await mobile.waitForFunction(()=>window.__hollow.renderer.zoom>2);
    a.x=145;b.x=235;await send('touchMove',[a,b]);await mobile.waitForFunction(()=>window.__hollow.renderer.zoom<1.5);
    expect(await position()).toEqual(stopped);await send('touchEnd',[a]);await send('touchEnd',[b]);
    stage='spell movement';
    // Moving with a spell armed must not confirm placement on release.
    await mobile.locator('[data-cast="1"]').tap();expect(await mobile.evaluate(()=>window.__hollow.game.aiming?.slot)).toBe('1');
    const beforeSpellMove=await position();a={id:6,x:280,y:620};await send('touchStart',[a]);a.x-=50;await send('touchMove',[a]);
    await mobile.waitForFunction(x=>window.__hollow.game.player.x<x-4,beforeSpellMove.x);await send('touchEnd',[a]);
    expect(await mobile.evaluate(()=>[window.__hollow.game.aiming?.slot,window.__hollow.game.world.barriers.length])).toEqual(['1',0]);
    const current=await position();p=await point(current.x+65,current.y);await mobile.touchscreen.tap(p.x,p.y);
    expect(await mobile.evaluate(()=>[window.__hollow.game.world.barriers.length,window.__hollow.game.destination])).toEqual([1,null]);
    stage='pause reset';
    // Exercise the menu handlers while cancelling a synthetic held pointer;
    // movement must stay stopped after the menu closes.
    a={id:7,x:70,y:650};await send('touchStart',[a]);a.x+=55;await send('touchMove',[a]);
    await mobile.waitForFunction(()=>window.__hollow.game.player.moving);
    await mobile.locator('[data-menu="pause"]').evaluate(el=>el.click());await send('touchEnd',[]);
    await expect(mobile.getByRole('dialog',{name:'Paused',exact:true})).toBeVisible();await mobile.getByRole('button',{name:'Continue',exact:true}).evaluate(el=>el.click());await expect(mobile.getByRole('dialog')).toHaveCount(0);
    const resumed=await position();await mobile.waitForTimeout(150);expect(await position()).toEqual(resumed);
    stage='retargeting';
    // An explicit tap overrides the automatic attack's previous target.
    await mobile.evaluate(()=>{const g=window.__hollow.game;g.world.barriers=[];g.safeZonesEnabled=false;g.player.invulnerable=100;g.creatures=[-1,1].map((side,i)=>({id:`tap-${i}`,type:'seedling',x:g.player.x+side*50,y:g.player.y,homeX:g.player.x+side*50,homeY:g.player.y,hp:1000,maxHp:1000,root:100,stun:0,slow:0,flash:0,attack:100,walk:0,face:1,phase:0}));g.target='tap-0';g.boltCooldown=0;});
    await mobile.waitForFunction(()=>window.__hollow.game.projectiles.some(s=>s.target==='tap-0'));
    const c=await mobile.evaluate(()=>window.__hollow.game.creatures[1]);p=await point(c.x,c.y-15);await mobile.touchscreen.tap(p.x,p.y);
    expect(await mobile.evaluate(()=>window.__hollow.game.target)).toBe('tap-1');
    await mobile.waitForFunction(()=>window.__hollow.game.projectiles.some(s=>s.target==='tap-1'));
    await mobile.screenshot({path:'artifacts/mobile-joystick-zoom.png'});
    stage='NPC conversation';
    await mobile.reload();await mobile.waitForFunction(()=>!!window.__hollow);
    await mobile.evaluate(()=>{const {game:g,renderer:r}=window.__hollow;g.player.x=1040;g.player.y=825;r.camera.x=1040;r.camera.y=825*.72;});
    await mobile.waitForFunction(()=>window.__hollow.game.nearby?.id==='rowan');
    const npc=await mobile.evaluate(()=>window.__hollow.game.nearby);p=await point(npc.x,npc.y-24);await mobile.touchscreen.tap(p.x,p.y);
    await expect(mobile.getByRole('dialog',{name:'Rowan',exact:true})).toBeVisible();await mobile.getByRole('button',{name:'Close',exact:true}).tap();
    for(const [name,x,y] of [['spring',840,570],['autumn',1770,510],['winter',790,1370],['ember',1830,1390]]){
      await mobile.evaluate(({x,y})=>{const {game:g,renderer:r}=window.__hollow;Object.assign(g.player,{x,y,invulnerable:100});g.autoAttack=false;r.camera.x=x;r.camera.y=y*.72;r.setZoom(1.5);},{x,y});
      await mobile.waitForTimeout(150);await mobile.screenshot({path:`artifacts/mobile-zoom-${name}.png`});
    }
    await mobile.setViewportSize({width:844,height:390});expect(await mobile.evaluate(()=>window.__hollow.renderer.zoom)).toBe(1.5);
    expect(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
  }catch(error){console.error(`Mobile control stage: ${stage}`);throw error;}finally{await context.close().catch(()=>{});}
});

test('expanded regions, new atlases, wildlife journal and bounded terrain cache render',async({page})=>{
  test.setTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const places=await page.evaluate(async()=>{const {EXPANSION_PLACES}=await import('/src/regions.js');return EXPANSION_PLACES;});
  for(const place of places){
    await page.evaluate(({x,y})=>{const {game,renderer}=window.__hollow;game.player.x=x;game.player.y=y;game.player.invulnerable=100;game.autoAttack=false;game.paused=false;renderer.camera.x=x;renderer.camera.y=y*.72;},place);
    await page.waitForTimeout(180);await page.screenshot({path:`artifacts/expanded-${place.id}.png`});
  }
  const result=await page.evaluate(()=>{const {renderer,game}=window.__hollow;return {atlases:['groves','wilds','wildlife'].map(a=>renderer.sprites[a].length),cache:renderer.ground.tiles.size,baked:renderer.ground.bakedCount,species:new Set(game.creatures.map(c=>c.type)).size};});
  expect(result.atlases).toEqual([64,64,64]);expect(result.cache).toBeLessThanOrEqual(48);expect(result.baked).toBeGreaterThan(48);expect(result.species).toBe(37);
  await page.evaluate(()=>{const {game,ui}=window.__hollow;game.observed.add('burialstag');ui.journalTab='wildlife';ui.open('journal');});
  await expect(page.locator('[data-portrait="8"][data-atlas="wildlife"]')).toHaveAttribute('src',/^data:image\/png/);await page.screenshot({path:'artifacts/expanded-journal.png'});await page.keyboard.press('Escape');
  await page.keyboard.press('m');await page.screenshot({path:'artifacts/expanded-map.png'});await page.keyboard.press('Escape');
  await page.evaluate(()=>{const {game,renderer}=window.__hollow;const npc=game.world.interactables.find(i=>i.kind==='npc'&&i.dialogue);game.player.x=npc.x;game.player.y=npc.y+15;renderer.camera.x=npc.x;renderer.camera.y=npc.y*.72;});
  await page.waitForFunction(()=>!!window.__hollow.game.nearby?.dialogue);await page.keyboard.press('Space');await expect(page.getByRole('dialog')).toBeVisible();await page.screenshot({path:'artifacts/expanded-camp-dialogue.png'});await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('camera motion preserves tree pixels and wildlife sorts on both sides of a trunk',async({page})=>{
  const result=await page.evaluate(async()=>{
    const {Renderer}=await import('/src/render.js'),{environmentFrame}=await import('/src/sprites.js');
    const {renderer,game}=window.__hollow,tree=game.world.props.find(p=>p.tree&&p.atlas==='groves'&&!p.removed);
    const canvas=document.createElement('canvas');canvas.width=720;canvas.height=450;
    const probe=Object.assign(Object.create(Renderer.prototype),{ctx:canvas.getContext('2d'),canvas,width:720,height:450,camera:{x:1100,y:600},sprites:renderer.sprites,atlases:renderer.atlases,rasters:new Map()});
    probe.ctx.imageSmoothingEnabled=false;
    let baseline,stable=true;
    for(let n=0;n<25;n++){
      probe.camera.x=1100+n*.19;probe.camera.y=600+n*.13;probe.ctx.clearRect(0,0,720,450);
      for(const [x,y] of [[1100.2,855.5],[1155.8,875.3]]){
        const s=probe.screen(x,y);probe.sprite('groves',environmentFrame(tree),s.x,s.y,100,{sway:.008});
      }
      const anchor=probe.screen(1100.2,855.5),pixels=probe.ctx.getImageData(anchor.x-70,anchor.y-120,210,160).data;
      if(!baseline)baseline=pixels;else if(pixels.some((v,i)=>v!==baseline[i]))stable=false;
    }
    const original={game:renderer.game,sprite:renderer.sprite,creature:renderer.drawCreature,ambient:renderer.drawAmbient};
    const animal={...game.creatures.find(c=>c.type==='barkjaw'),x:1100,y:845},insect={x:1110,y:845,sprite:51,phase:0};
    const scene={...game,time:2,player:{...game.player,x:1200,y:955},creatures:[animal],fox:null,nearby:null,effects:[],floaters:[],projectiles:[],world:{...game.world,props:[{...tree,x:1100,y:855,size:100}],interactables:[],ambient:[insect],barriers:[]}};
    const orders=[];let order=[];
    try{
      renderer.game=scene;
      renderer.sprite=function(atlas,...args){if(atlas==='groves')order.push('tree');return original.sprite.call(this,atlas,...args);};
      renderer.drawCreature=function(...args){order.push('animal');return original.creature.apply(this,args);};
      renderer.drawAmbient=function(...args){order.push('insect');return original.ambient.apply(this,args);};
      for(const y of [845,875]){
        animal.y=y;insect.y=y;order=[];renderer.camera.x=1100;renderer.camera.y=855*.72;renderer.draw(0);orders.push(order);
      }
    }finally{renderer.game=original.game;renderer.sprite=original.sprite;renderer.drawCreature=original.creature;renderer.drawAmbient=original.ambient;}
    return {stable,orders,rasters:probe.rasters.size};
  });
  expect(result.stable).toBe(true);expect(result.rasters).toBe(1);
  expect(result.orders).toEqual([['animal','insect','tree'],['tree','animal','insect']]);
  await page.locator('#world').focus();
  for(const keys of [['w'],['s','d']]){
    const before=await page.evaluate(()=>({...window.__hollow.game.player}));
    for(const key of keys)await page.keyboard.down(key);await page.waitForTimeout(350);for(const key of keys)await page.keyboard.up(key);
    const after=await page.evaluate(()=>({...window.__hollow.game.player}));expect(after.y).not.toBe(before.y);
  }
  await page.setViewportSize({width:1441,height:901});
  await page.waitForFunction(()=>{const c=window.__hollow.renderer.canvas,r=c.getBoundingClientRect();return r.width===1442&&r.height===902&&r.width/c.width===2&&r.height/c.height===2;});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('RPG rewards, equipment, lessons, bounty turn-ins and a fresh journey work through menus',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Rowan's offer stays out of the quest UI until he has told you about it.
  await expect(page.locator('#adventure-status .qt')).toHaveCount(0);
  // F drinks a tonic (never a spell); at full health it is kept.
  await page.keyboard.press('f');expect(await page.evaluate(()=>[window.__hollow.game.player.shield,window.__hollow.game.player.tonics])).toEqual([0,3]);
  await page.evaluate(()=>window.__hollow.game.player.hp=40);await page.keyboard.press('f');expect(await page.evaluate(()=>window.__hollow.game.player.tonics)).toBe(2);await page.waitForTimeout(100);
  await page.evaluate(()=>{const g=window.__hollow.game;g.questAction('herd');for(const c of g.creatures.filter(c=>c.quest==='herd'))g.hurt(c,999);g.questAction('herd');});
  await page.keyboard.press('i');await expect(page.getByRole('dialog',{name:'Character',exact:true})).toBeVisible();
  await page.locator('[data-char-tab="gear"]').click();await page.locator('[data-equip="reedstaff"]').click();await expect(page.locator('[data-equip="reedstaff"]')).toHaveAttribute('aria-pressed','true');await page.screenshot({path:'artifacts/rpg-equipment.png'});await page.keyboard.press('Escape');
  await page.evaluate(()=>window.__hollow.game.reward(180));await page.keyboard.press('k');await page.locator('[data-learn="surge"]').click();await page.locator('[data-learn="ward"]').click();expect(await page.evaluate(()=>window.__hollow.game.learned.has('ward'))).toBe(true);await page.keyboard.press('Escape');
  await page.keyboard.press('j');await expect(page.locator('.quest-entry[data-quest="briar-road"]')).toHaveCount(0);await page.keyboard.press('Escape');
  await page.evaluate(()=>window.__hollow.ui.open('rowan'));await page.locator('[data-quest-action="briar-road"]').click();
  await page.evaluate(()=>{const {game:g,renderer:r}=window.__hollow;Object.assign(g.player,{x:870,y:440,invulnerable:100});g.autoAttack=false;r.camera.x=870;r.camera.y=440*.72;});
  await page.waitForTimeout(250);await page.screenshot({path:'artifacts/rpg-briar-road.png'});
  await page.evaluate(()=>{const {game:g,renderer:r}=window.__hollow;for(const c of g.creatures.filter(c=>['briar-turn','root-hollow','thorn-den'].includes(c.camp)))g.hurt(c,9999);Object.assign(g.player,{x:1040,y:825});r.camera.x=1040;r.camera.y=825*.72;g.target=null;});
  await page.waitForFunction(()=>window.__hollow.game.nearby?.id==='rowan');await page.keyboard.press('Space');await page.locator('[data-quest-action="briar-road"]').click();
  expect(await page.evaluate(()=>window.__hollow.game.inventory.includes('briarcoat'))).toBe(true);
  await page.evaluate(()=>window.__hollow.save());await page.reload();await page.waitForFunction(()=>!!window.__hollow);
  expect(await page.evaluate(()=>[window.__hollow.game.equipment.weapon,window.__hollow.game.quests['briar-road'],window.__hollow.game.learned.has('ward')])).toEqual(['reedstaff','complete',true]);
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'New journey',exact:true}).click();await page.getByRole('button',{name:'Start new journey',exact:true}).click();
  await page.waitForFunction(()=>window.__hollow?.game.quests.herd==='offered'&&window.__hollow.game.learned.size===0);
  expect(await page.evaluate(()=>window.__hollow.game.inventory)).toEqual(['twig','wraps']);expect(errors).toEqual([]);
});

test('the tenfold frontier renders dense habitats, working refuges and a zoomable atlas',async({page})=>{
  test.setTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const districts=await page.evaluate(async()=>{const {FRONTIER_DISTRICTS}=await import('/src/frontier.js');return FRONTIER_DISTRICTS;});
  for(const district of districts){
    await page.evaluate(d=>{const {game:g,renderer:r}=window.__hollow;g.player.x=d.x;g.player.y=d.y;g.player.invulnerable=100;g.autoAttack=false;g.paused=false;r.camera.x=d.x;r.camera.y=d.y*.72;},district);
    await page.waitForTimeout(200);await page.screenshot({path:`artifacts/frontier-${district.id}.png`});
    const state=await page.evaluate(()=>{const {game:g,renderer:r}=window.__hollow,screen=r.screen(g.player.x,g.player.y);return {near:r.nearProps.length,cache:r.ground.tiles.size,onScreen:screen.x>0&&screen.x<r.width&&screen.y>0&&screen.y<r.height};});
    expect(state.near).toBeLessThan(1500);expect(state.near).toBeGreaterThan(50);expect(state.cache).toBeLessThanOrEqual(48);
    expect(state.onScreen).toBe(true);
  }
  const mossway=districts.find(d=>d.id==='mossway');
  await page.evaluate(d=>{const {game:g,renderer:r}=window.__hollow;g.quests['briar-road']='complete';g.refreshHunts();g.player.x=d.hub.x-15;g.player.y=d.hub.y-10;g.player.invulnerable=100;g.target=null;r.camera.x=g.player.x;r.camera.y=g.player.y*.72;},mossway);
  await page.waitForFunction(()=>window.__hollow.game.nearby?.name==='Fern');await page.keyboard.press('Space');
  await expect(page.getByRole('dialog',{name:'Fern',exact:true})).toBeVisible();await page.locator('[data-quest-action="road-mossway"]').click();
  expect(await page.evaluate(()=>window.__hollow.game.quests['road-mossway'])).toBe('active');
  await page.keyboard.press('m');await page.getByRole('button',{name:'Whole world',exact:true}).click();await page.screenshot({path:'artifacts/frontier-whole-world.png'});
  expect(await page.evaluate(()=>window.__hollow.renderer.mapView)).toEqual({zoom:1,x:1080,y:855});
  await page.getByRole('button',{name:'Find me',exact:true}).click();expect(await page.evaluate(()=>window.__hollow.renderer.mapView.zoom)).toBe(8);
  const canvas=page.locator('#atlas-canvas'),box=await canvas.boundingBox(),before=await page.evaluate(()=>window.__hollow.renderer.mapView.x);
  await page.mouse.move(box.x+box.width*.6,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.4,box.y+box.height*.5,{steps:5});await page.mouse.up();
  expect(await page.evaluate(()=>window.__hollow.renderer.mapView.x)).toBeGreaterThan(before);await page.screenshot({path:'artifacts/frontier-zoom-map.png'});
  await page.getByRole('button',{name:'Whole world',exact:true}).click();expect(await page.evaluate(()=>window.__hollow.renderer.mapView.zoom)).toBe(1);
  expect(errors).toEqual([]);
});

test('outer seasonal resource gardens render around the centered world',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const biome of ['spring','autumn','winter','ember']){
    const state=await page.evaluate(async biome=>{
      const {FRONTIER_HABITATS}=await import('/src/frontier.js'),{canWalk}=await import('/src/world.js'),site=FRONTIER_HABITATS.find(s=>s.biome===biome);
      const {game:g,renderer:r}=window.__hollow,resident=g.creatures.find(c=>c.site===site.id);Object.assign(g.player,{x:resident.x,y:resident.y,invulnerable:100});g.autoAttack=false;g.paused=false;r.camera.x=g.player.x;r.camera.y=g.player.y*.72;
      return {walkable:canWalk(g.world,g.player.x,g.player.y,5),x:g.player.x,y:g.player.y};
    },biome);
    expect(state.walkable).toBe(true);await page.waitForTimeout(250);await page.screenshot({path:`artifacts/frontier-garden-${biome}.png`});
  }
  expect(errors).toEqual([]);
});

test('remote woods, meadows, marshes and ridges render between the named districts',async({page})=>{
  test.setTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const kind of ['deep-grove','flower-meadow','reed-marsh','basalt-rise']){
    const state=await page.evaluate(async kind=>{
      const {FRONTIER_LANDSCAPES,frontierLandscapeAt}=await import('/src/frontier-landscape.js'),{FRONTIER_DISTRICTS}=await import('/src/frontier.js');
      const {game:g,renderer:r}=window.__hollow;
      const site=FRONTIER_LANDSCAPES.find(s=>s.kind===kind&&!frontierLandscapeAt(s.x,s.y).authored&&FRONTIER_DISTRICTS.every(d=>Math.hypot(s.x-d.x,s.y-d.y)>1100)&&g.creatures.some(c=>c.landscape===s.id));
      if(!site)return null;
      const resident=g.creatures.find(c=>c.landscape===site.id);Object.assign(g.player,{x:resident.x,y:resident.y,invulnerable:100});g.autoAttack=false;g.paused=false;r.camera.x=g.player.x;r.camera.y=g.player.y*.72;
      return {id:site.id,kind:frontierLandscapeAt(site.x,site.y).kind};
    },kind);
    expect(state?.kind).toBe(kind);await page.waitForTimeout(250);await page.screenshot({path:`artifacts/remote-${kind}.png`});
    const cache=await page.evaluate(()=>window.__hollow.renderer.ground.tiles.size);expect(cache).toBeLessThanOrEqual(48);
  }
  expect(errors).toEqual([]);
});

test('rapid Claspwood attacks telegraph clearly and can be escaped after the first hit',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const start=await page.evaluate(()=>{
    const {game:g,renderer:r}=window.__hollow,tree=g.world.props.find(p=>p.clasp&&!p.removed&&p.x===750&&p.y===680);
    g.creatures=[];g.autoAttack=false;g.treeAttacks.clear();g.player.x=tree.x-35;g.player.y=tree.y;g.player.hp=g.player.maxHp;g.player.invulnerable=0;
    delete tree.lastSnap;g.update(.01);g.paused=true;r.camera.x=g.player.x;r.camera.y=g.player.y*.72;r.draw(0);
    return {hp:g.player.hp,warning:g.effects.some(e=>e.type==='warning'),pending:g.treeAttacks.size};
  });
  expect(start).toEqual({hp:120,warning:true,pending:1});await page.screenshot({path:'artifacts/claspwood-warning.png'});
  const hit=await page.evaluate(()=>{const {game:g,renderer:r}=window.__hollow;g.events=[];g.paused=false;for(let n=0;n<7;n++)g.update(.05);g.paused=true;r.draw(0);return {hp:g.player.hp,damage:g.events.filter(e=>e.type==='player-damage').map(e=>e.amount)};});
  expect(hit.damage).toEqual([6]);expect(hit.hp).toBeGreaterThanOrEqual(114);expect(hit.hp).toBeLessThan(115);await page.screenshot({path:'artifacts/claspwood-strike.png'});
  const escaped=await page.evaluate(()=>{const {game:g,renderer:r}=window.__hollow;g.events=[];g.paused=false;for(let n=0;n<40;n++)g.update(.05,{left:true});g.paused=true;r.draw(0);return {hp:g.player.hp,damage:g.events.filter(e=>e.type==='player-damage').map(e=>e.amount)};});
  expect(escaped.damage).toEqual([]);expect(escaped.hp).toBeGreaterThanOrEqual(hit.hp);await page.screenshot({path:'artifacts/claspwood-escape.png'});expect(errors).toEqual([]);
});

test('Marching Claspwoods assemble a solid minute-long wall and peel away one at a time',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(async()=>{
    const {updateRootwalls}=await import('/src/rootwalls.js'),{game:g,renderer:r}=window.__hollow;
    const group=g.world.rootwallGroups.find(a=>a.id==='longbriar-march-0');g.paused=true;g.autoAttack=false;g.player.invulnerable=100;
    const length=Math.hypot(group.b.x-group.a.x,group.b.y-group.a.y),dx=(group.b.x-group.a.x)/length,dy=(group.b.y-group.a.y)/length;
    g.player.x=group.a.x-dx*130-dy*150;g.player.y=group.a.y-dy*130+dx*150;group.phase='gathering';group.site=0;group.elapsed=0;
    for(const c of group.members)Object.assign(c,group.scatter[0][c.rootIndex][0]);
    window.__groveStep=seconds=>{for(let n=0;n<Math.round(seconds/.05);n++){g.time+=.05;updateRootwalls(g,.05);}r.camera.x=group.a.x;r.camera.y=group.a.y*.72;r.draw(0);return {phase:group.phase,site:group.site,elapsed:group.elapsed,positions:group.members.map(c=>({x:c.x,y:c.y}))};};
    window.__groveStep(3);
  });
  await page.screenshot({path:'artifacts/rootwall-gathering.png'});
  const held=await page.evaluate(()=>{for(let n=0;n<600;n++){const state=window.__groveStep(.05);if(state.phase==='holding')return state;}throw new Error('Grove never assembled');});
  await page.screenshot({path:'artifacts/rootwall-holding.png'});
  const blocked=await page.evaluate(async()=>{const {canWalk}=await import('/src/world.js'),g=window.__hollow.game,group=g.world.rootwallGroups.find(a=>a.id==='longbriar-march-0'),p=group.walls[0][2];return canWalk(g.world,p.x,p.y,8);});expect(blocked).toBe(false);
  expect((await page.evaluate(()=>window.__groveStep(59.8))).phase).toBe('holding');
  const peeling=await page.evaluate(()=>window.__groveStep(3.2));expect(peeling.phase).toBe('dispersing');
  expect(Math.hypot(peeling.positions[0].x-held.positions[0].x,peeling.positions[0].y-held.positions[0].y)).toBeGreaterThan(20);
  for(let i=1;i<6;i++)expect(peeling.positions[i]).toEqual(held.positions[i]);
  await page.screenshot({path:'artifacts/rootwall-peeling.png'});
  const migrated=await page.evaluate(()=>window.__groveStep(60));expect(migrated.site).toBe(1);expect(migrated.phase).toBe('scattered');
  await page.screenshot({path:'artifacts/rootwall-vacated.png'});
  const open=await page.evaluate(async()=>{const {canWalk}=await import('/src/world.js'),g=window.__hollow.game,group=g.world.rootwallGroups.find(a=>a.id==='longbriar-march-0'),p=group.walls[0][2];return canWalk(g.world,p.x,p.y,8);});expect(open).toBe(true);
  await page.evaluate(()=>{const {game:g,ui}=window.__hollow;g.observed.add('wallroot');ui.journalTab='wildlife';ui.selectedNote='wallroot';ui.open('journal');});
  await expect(page.locator('[data-portrait="8"][data-atlas="groves"]')).toHaveAttribute('src',/^data:image\/png/);await page.screenshot({path:'artifacts/rootwall-field-guide.png'});
  expect(errors).toEqual([]);
});
