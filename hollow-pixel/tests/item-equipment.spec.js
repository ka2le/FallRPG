import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
test('pixel gear, twelve slots, comparison, removal, saves and mobile layout work',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?test');await page.waitForFunction(()=>window.__hollow);
 await page.evaluate(async()=>{const {game:g}=window.__hollow,{NEW_GEAR}=await import('/src/items.js');g.autoAttack=false;g.player.invulnerable=999;g.player.level=12;g.learn('surge');g.learn('ward');for(const id of Object.keys(NEW_GEAR))g.awardItem(id);g.recalculate();});
 await page.keyboard.press('i');await page.locator('[data-char-tab="gear"]').click();await expect(page.locator('.doll-slot')).toHaveCount(12);await expect(page.locator('[data-equip="watchlens"] .item-sprite')).toHaveCount(1);
 await page.locator('[data-equip="watchlens"]').hover();await expect(page.locator('#game-tip')).toContainText('Willow Ward');await page.locator('[data-equip="watchlens"]').click();await expect(page.locator('[data-equip="watchlens"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('.spell-stats summary').click();const ward=await page.evaluate(()=>Number(window.__hollow.game.spellValues('ward').shield.toFixed(1)).toString());await expect(page.locator('[data-tip-id="ward"] b')).toHaveText(ward);
 await page.getByRole('button',{name:'Remove Watchstone lens',exact:true}).click();await expect(page.locator('[data-equip="watchlens"]')).toHaveAttribute('aria-pressed','false');
 await page.locator('[data-equip="watchlens"]').focus();await page.keyboard.press('Enter');await expect(page.locator('[data-equip="watchlens"]')).toHaveAttribute('aria-pressed','true');
 await page.evaluate(()=>window.__hollow.save());await page.reload();await page.waitForFunction(()=>window.__hollow);expect(await page.evaluate(()=>window.__hollow.game.equipment.focus)).toBe('watchlens');
 await page.keyboard.press('i');await page.locator('[data-char-tab="gear"]').click();await mkdir('artifacts',{recursive:true});await page.screenshot({path:'artifacts/pixel-equipment-expanded.png'});
 await page.setViewportSize({width:390,height:844});await expect(page.locator('.doll-slot')).toHaveCount(12);expect(await page.locator('.char-modal').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);await page.screenshot({path:'artifacts/pixel-equipment-mobile.png'});expect(errors).toEqual([]);
});
test('128 item drawings have real alpha and usable filters, PNG downloads and small-scale previews',async({page})=>{
 await page.goto('/item-library.html');await expect(page.locator('[data-sprite]')).toHaveCount(128);
 const sheets=await page.evaluate(async()=>{const output=[];for(const sheet of ['items-gear-v1','items-supplies-v1']){const image=new Image();image.src=`./assets/${sheet}.png`;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);const {data}=ctx.getImageData(0,0,c.width,c.height);let transparent=0;const cells=new Set();for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const a=data[(y*c.width+x)*4+3];if(a===0)transparent++;if(a>24)cells.add(Math.floor(y/(c.height/8))*8+Math.floor(x/(c.width/8)));}output.push({sheet,width:c.width,height:c.height,transparent:transparent/(c.width*c.height),cells:cells.size});}return output;});
 for(const s of sheets){expect(s.width).toBe(s.height);expect(s.width).toBeGreaterThan(512);expect(s.transparent).toBeGreaterThan(.1);expect(s.cells).toBe(64);}
 await page.locator('#collection').selectOption('Collectible gear');await expect(page.locator('[data-sprite]')).toHaveCount(50);await page.locator('#search').fill('lantern');await expect(page.locator('#count')).toContainText('drawings shown');
 await page.locator('#collection').selectOption('');await page.locator('#search').fill('health tonic');await expect(page.locator('[data-sprite]')).toHaveCount(1);const download=page.waitForEvent('download');await page.locator('[data-sprite="health-tonic"]').click();expect((await download).suggestedFilename()).toBe('health-tonic.png');
 await page.locator('#search').fill('');await page.locator('#scale').selectOption('32');await mkdir('artifacts',{recursive:true});await page.screenshot({path:'artifacts/pixel-item-library.png'});
 await page.locator('#category').selectOption('Lantern');await expect(page.locator('[data-sprite]')).toHaveCount(3);await page.locator('#search').fill('unfindablezz');await expect(page.locator('#count')).toHaveText('0 drawings shown');
});
