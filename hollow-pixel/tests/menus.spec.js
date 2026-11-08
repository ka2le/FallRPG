import { test, expect } from '@playwright/test';
test.beforeEach(async({page})=>{await page.goto('/?test');await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForFunction(()=>!!window.__hollow);});

test('two windows: Character (I items, K spells) and Journal (J quests, M map)',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await expect(page.locator('.menu-icons button')).toHaveCount(3);
  await page.keyboard.press('j');await expect(page.getByRole('dialog',{name:'Journal',exact:true})).toBeVisible();await expect(page.locator('[data-journal-tab="quests"]')).toHaveAttribute('aria-selected','true');
  // Another window key switches tab in place; the same key again closes the window.
  await page.keyboard.press('m');await expect(page.locator('[data-journal-tab="map"]')).toHaveAttribute('aria-selected','true');await expect(page.locator('#atlas-canvas')).toBeVisible();
  const fits=await page.evaluate(()=>{const c=document.getElementById('atlas-canvas').getBoundingClientRect(),m=document.querySelector('.modal').getBoundingClientRect();return c.bottom<=m.bottom&&c.right<=m.right;});expect(fits).toBe(true);
  await page.locator('[data-journal-tab="wildlife"]').click();await expect(page.locator('[data-journal-tab="wildlife"]')).toHaveAttribute('aria-selected','true');
  await page.keyboard.press('k');await expect(page.getByRole('dialog',{name:'Character',exact:true})).toBeVisible();await expect(page.locator('[data-char-tab="spells"]')).toHaveAttribute('aria-selected','true');
  await page.keyboard.press('i');await expect(page.locator('[data-char-tab="gear"]')).toHaveAttribute('aria-selected','true');
  await page.keyboard.press('i');await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('.menu-icons [data-menu="journal"]').click();await expect(page.locator('[data-journal-tab="quests"]')).toHaveAttribute('aria-selected','true');
  await page.keyboard.press('Escape');
  // The healing tonic sits on F; F is no longer a spell key.
  await expect(page.locator('[data-tonic] kbd')).toHaveText('F');
  expect(await page.evaluate(async()=>{const {SLOTS}=await import('/src/data.js');return SLOTS.includes('f');})).toBe(false);
  expect(errors).toEqual([]);
});

test('new item marks clear on touch, and the tab mark clears after leaving Items',async({page})=>{
  await page.evaluate(()=>{const g=window.__hollow.game;g.awardItem('briarcoat');g.awardItem('leafcape');});
  await page.waitForFunction(()=>window.__hollow.ui.hud.newGear.size===2);await page.keyboard.press('k');await expect(page.locator('[data-char-tab="gear"] .badge.new')).toBeVisible();
  await page.locator('[data-char-tab="gear"]').click();
  await expect(page.locator('.tile .new-mark')).toHaveCount(2);await expect(page.locator('[data-char-tab="gear"] .badge.new')).toHaveCount(0);
  // Hovering one item clears only its own mark, right away.
  await page.locator('.tile[data-equip="briarcoat"]').hover();await expect(page.locator('.tile[data-equip="briarcoat"] .new-mark')).toHaveCount(0);await expect(page.locator('.tile .new-mark')).toHaveCount(1);
  // Leaving the Items tab clears the rest, so neither the tab nor the items say "new" any more.
  await page.locator('[data-char-tab="growth"]').click();await expect(page.locator('[data-char-tab="gear"] .badge.new')).toHaveCount(0);
  await page.locator('[data-char-tab="gear"]').click();await expect(page.locator('.tile .new-mark')).toHaveCount(0);
  expect(await page.evaluate(()=>window.__hollow.ui.hud.newGear.size)).toBe(0);
  // Opening another tab without ever looking at Items keeps the marks.
  await page.keyboard.press('Escape');await page.evaluate(()=>window.__hollow.game.awardItem('reedgrips'));
  await page.waitForFunction(()=>window.__hollow.ui.hud.newGear.has('reedgrips'));await page.keyboard.press('k');await page.keyboard.press('Escape');
  expect(await page.evaluate(()=>window.__hollow.ui.hud.newGear.has('reedgrips'))).toBe(true);
});

test('quest tracker: compact when collapsed, arrow points at the goal on screen',async({page})=>{
  await page.evaluate(()=>{const {game:g,ui}=window.__hollow;g.quests.herd='complete';g.refreshHunts();g.questAction('briar-road');ui.hud.tracker.until=0;});
  await page.waitForTimeout(300);await page.evaluate(()=>{const t=window.__hollow.ui.hud.tracker;t.until=0;t.el.classList.remove('expanded');});await page.mouse.move(5,700);await page.waitForTimeout(300);
  const box=await page.locator('#adventure-status .qt').boundingBox();expect(box.height).toBeLessThan(40);
  expect(await page.locator('#adventure-status .qt').evaluate(el=>getComputedStyle(el).backgroundImage)).toBe('none');
  await expect(page.locator('#adventure-status .qt-label')).toHaveText(/The Briar Turn/);
  // Compare the arrow with the on-screen direction from the player to the target.
  const check=await page.evaluate(()=>{const {game:g,renderer:r,ui}=window.__hollow,t=ui.hud.tracker.tracked.steps.find(s=>s.current).target,a=r.screen(g.player.x,g.player.y),b=r.screen(t.x,t.y);
    const want=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI+90,got=parseFloat(document.querySelector('.qt-compass').style.getPropertyValue('--a'));return ((got-want)%360+540)%360-180;});
  expect(Math.abs(check)).toBeLessThan(2);
  await page.locator('#adventure-status .qt').hover();await expect(page.locator('#adventure-status .qt-step')).toBeVisible();
  const open=await page.locator('#adventure-status .qt').boundingBox();expect(open.height).toBeLessThan(90);
});

test('the market stall is signposted, clickable and opens the market when reached',async({page})=>{
  const pt=await page.evaluate(()=>{const {renderer:r}=window.__hollow,s=r.screen(1190,860),box=r.canvas.getBoundingClientRect();return {x:box.left+s.x*box.width/r.width,y:box.top+s.y*box.height/r.height};});
  await page.mouse.move(pt.x,pt.y);await expect.poll(()=>page.evaluate(()=>document.getElementById('world').style.cursor)).toBe('pointer');
  await page.mouse.click(pt.x,pt.y);
  await expect(page.locator('.shop-window')).toBeVisible({timeout:15000});
});

test('Space interacts (and the conversation stays open); C toggles automatic attacks',async({page})=>{
  await page.evaluate(()=>{const {game:g,renderer:r}=window.__hollow;const rowan=g.world.interactables.find(i=>i.id==='rowan');Object.assign(g.player,{x:rowan.x,y:rowan.y+30});r.camera.x=rowan.x;r.camera.y=(rowan.y+30)*.72;});
  await page.waitForFunction(()=>window.__hollow.game.nearby?.id==='rowan');
  await page.locator('#world').focus();await page.keyboard.press('Space');
  await expect(page.getByRole('dialog',{name:'Rowan'})).toBeVisible();await page.waitForTimeout(200);await expect(page.getByRole('dialog',{name:'Rowan'})).toBeVisible();
  expect(await page.evaluate(()=>window.__hollow.game.autoAttack)).toBe(true);
  // Space advances the conversation: here it accepts Rowan's request.
  await page.keyboard.press('Space');await expect.poll(()=>page.evaluate(()=>window.__hollow.game.quests.herd)).toBe('active');
  await expect(page.getByRole('dialog')).toHaveCount(0);await page.locator('#world').focus();
  await page.keyboard.press('c');expect(await page.evaluate(()=>window.__hollow.game.autoAttack)).toBe(false);
  await expect(page.locator('[data-auto-attack] kbd')).toHaveText('C');
});

test('quests appear only after their giver has told you about them',async({page})=>{
  await page.keyboard.press('j');await expect(page.locator('.quest-entry')).toHaveCount(0);await expect(page.locator('.qc-empty')).toBeVisible();await page.keyboard.press('Escape');
  await expect(page.locator('#adventure-status .qt')).toHaveCount(0);
  // Finishing the pasture unlocks Rowan's and Mara's next offers, but you have not heard them yet.
  await page.evaluate(()=>{const {game:g,ui}=window.__hollow;ui.open('rowan');ui.close();g.questAction('herd');for(const c of g.creatures.filter(c=>c.quest==='herd'))g.hurt(c,999);g.questAction('herd');});
  await page.keyboard.press('j');await expect(page.locator('.quest-entry:not(.complete)')).toHaveCount(0);await page.keyboard.press('Escape');
  await page.evaluate(()=>window.__hollow.ui.open('rowan'));await page.keyboard.press('Escape');
  await page.keyboard.press('j');await expect(page.locator('.quest-entry[data-quest="briar-road"]')).toHaveCount(1);await expect(page.locator('.quest-entry[data-quest="seam"]')).toHaveCount(0);
  // Remembered across a reload.
  await page.keyboard.press('Escape');await page.evaluate(()=>window.__hollow.save());await page.reload();await page.waitForFunction(()=>!!window.__hollow);
  await page.keyboard.press('j');await expect(page.locator('.quest-entry[data-quest="briar-road"]')).toHaveCount(1);
});
