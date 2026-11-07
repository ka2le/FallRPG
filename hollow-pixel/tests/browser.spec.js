import { test, expect } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';

test.beforeEach(async({page})=>{
  await page.goto('/?test');await page.evaluate(()=>localStorage.clear());await page.reload();
  await page.waitForFunction(()=>!!window.__hollow);await page.locator('#world').focus();
  await mkdir('artifacts',{recursive:true});
});

test('minimal HUD, keyboard conversations, bindings and saves',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await expect(page.locator('#welcome,.quest-tracker,.ongoing-note,#coordinates')).toHaveCount(0);
  await page.evaluate(()=>{const {game,renderer}=window.__hollow;game.player.x=1040;game.player.y=825;renderer.camera.x=1040;renderer.camera.y=825*.72;});
  await page.waitForFunction(()=>window.__hollow.game.nearby?.id==='rowan');await page.keyboard.press('c');
  await expect(page.getByRole('dialog',{name:'Rowan',exact:true})).toBeVisible();
  await page.screenshot({path:'artifacts/dialogue.png'});await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(()=>window.__hollow.game.quests.herd)).toBe('active');
  await page.keyboard.press('j');await expect(page.locator('.quest-entry')).toHaveCount(1);await page.keyboard.press('Escape');
  await page.keyboard.press('k');await expect(page.getByRole('dialog',{name:'Spells',exact:true})).toBeVisible();
  await page.locator('[data-slot="r"]').click();await page.locator('[data-bind="fox"]').click();
  await expect(page.locator('[data-slot="r"]')).toHaveAttribute('title','Lantern Fox');
  await page.screenshot({path:'artifacts/grimoire.png'});await page.keyboard.press('Escape');
  await page.keyboard.press('2');await page.evaluate(()=>window.__hollow.save());await page.reload();await page.waitForFunction(()=>!!window.__hollow);
  expect(await page.evaluate(()=>[window.__hollow.game.bindings.r,window.__hollow.game.quests.herd,window.__hollow.game.stance])).toEqual(['fox','active','frost']);
  expect(errors).toEqual([]);
});

test('all four habitats, full sprite silhouettes and compact layouts render',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [name,x,y] of [['village',1080,855],['spring',840,570],['autumn',1770,510],['winter',790,1370],['ember',1830,1390]]){
    await page.evaluate(({x,y})=>{const {game,renderer}=window.__hollow;game.player.x=x;game.player.y=y;game.player.invulnerable=100;game.autoAttack=false;game.paused=false;renderer.camera.x=x;renderer.camera.y=y*.72;}, {x,y});
    await page.waitForTimeout(250);await page.screenshot({path:`artifacts/${name}.png`});
  }
  expect(await page.evaluate(()=>[window.__hollow.renderer.sprites.environment.length,window.__hollow.renderer.sprites.creatures.length])).toEqual([64,64]);
  await page.keyboard.press('m');await expect(page.getByRole('dialog',{name:'Map',exact:true})).toBeVisible();await page.screenshot({path:'artifacts/atlas.png'});await page.keyboard.press('Escape');
  await page.setViewportSize({width:1024,height:768});await page.waitForTimeout(150);await page.screenshot({path:'artifacts/compact.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Grimoire K',exact:true}).click();
  await expect(page.locator('[data-bind="bramble"]')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'artifacts/narrow.png'});
  expect(errors).toEqual([]);
});

test('keyboard walking, mode attacks and deliberate spell placement work',async({page})=>{
  const x=await page.evaluate(()=>window.__hollow.game.player.x);await page.keyboard.down('d');await page.waitForFunction(x=>window.__hollow.game.player.x>x+10,x);await page.keyboard.up('d');
  const before=await page.evaluate(()=>({x:window.__hollow.game.player.x,y:window.__hollow.game.player.y}));await page.mouse.click(300,600);await page.waitForTimeout(200);
  expect(await page.evaluate(()=>({x:window.__hollow.game.player.x,y:window.__hollow.game.player.y}))).toEqual(before);
  await page.evaluate(()=>{const {game,renderer}=window.__hollow;game.world.props=[];game.safeZonesEnabled=false;game.player.x=1080;game.player.y=855;game.creatures=game.creatures.filter(c=>c.type==='seedling').slice(0,1);const c=game.creatures[0];Object.assign(c,{x:1160,y:855,homeX:1160,homeY:855,hp:200,maxHp:200,root:100});game.target=null;renderer.camera.x=1080;renderer.camera.y=855*.72;});
  await page.waitForFunction(()=>window.__hollow.game.creatures[0].hp<200);
  await page.keyboard.press('3');expect(await page.evaluate(()=>window.__hollow.game.stance)).toBe('siphon');
  await page.keyboard.press('f');expect(await page.evaluate(()=>window.__hollow.game.player.shield)).toBe(45);
  await page.keyboard.press('q');await expect(page.locator('[data-cast="q"]')).toHaveClass(/armed/);
  const target=await page.evaluate(()=>{const {renderer}=window.__hollow,s=renderer.screen(1130,855),r=renderer.canvas.getBoundingClientRect();return {x:s.x/renderer.width*r.width,y:s.y/renderer.height*r.height};});
  await page.mouse.move(target.x,target.y);await page.screenshot({path:'artifacts/placement.png'});await page.mouse.click(target.x,target.y);
  expect(await page.evaluate(()=>window.__hollow.game.world.barriers.length)).toBe(1);
  await page.waitForTimeout(250);await page.screenshot({path:'artifacts/combat.png'});
  await page.keyboard.press('e');await page.keyboard.press('Escape');expect(await page.evaluate(()=>window.__hollow.game.aiming)).toBe(null);expect(await page.evaluate(()=>window.__hollow.ui.modal)).toBe(null);
});

test('P downloads the current view and works with menus open',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [name,menu] of [['world',null],['menu','k']]){
    if(menu)await page.keyboard.press(menu);
    const downloadPromise=page.waitForEvent('download');await page.keyboard.press('p');const download=await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^between-seasons-.*\.png$/);
    const path=`artifacts/printscreen-${name}.png`;await download.saveAs(path);const buffer=await readFile(path);
    expect(buffer.subarray(1,4).toString()).toBe('PNG');expect(buffer.readUInt32BE(16)).toBe(1440);expect(buffer.readUInt32BE(20)).toBe(900);expect(buffer.length).toBeGreaterThan(100000);
    expect(await page.evaluate(()=>window.__hollow.ui.modal)).toBe(menu?'grimoire':null);
  }
  expect(errors).toEqual([]);
});

test('expanded regions, new atlases, wildlife journal and bounded terrain cache render',async({page})=>{
  test.setTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const places=await page.evaluate(async()=>{const {EXPANSION_PLACES}=await import('/src/regions.js');return EXPANSION_PLACES;});
  for(const place of places){
    await page.evaluate(({x,y})=>{const {game,renderer}=window.__hollow;game.player.x=x;game.player.y=y;game.player.invulnerable=100;game.autoAttack=false;game.paused=false;renderer.camera.x=x;renderer.camera.y=y*.72;},place);
    await page.waitForTimeout(180);await page.screenshot({path:`artifacts/expanded-${place.id}.png`});
  }
  const result=await page.evaluate(()=>{const {renderer,game}=window.__hollow;return {atlases:['groves','wilds','wildlife'].map(a=>renderer.sprites[a].length),cache:renderer.ground.tiles.size,baked:renderer.ground.bakedCount,species:new Set(game.creatures.map(c=>c.type)).size};});
  expect(result.atlases).toEqual([64,64,64]);expect(result.cache).toBeLessThanOrEqual(48);expect(result.baked).toBeGreaterThan(48);expect(result.species).toBe(36);
  await page.evaluate(()=>{const {game,ui}=window.__hollow;game.observed.add('burialstag');ui.journalTab='wildlife';ui.open('journal');});
  await expect(page.locator('[data-portrait="8"][data-atlas="wildlife"]')).toHaveAttribute('src',/^data:image\/png/);await page.screenshot({path:'artifacts/expanded-journal.png'});await page.keyboard.press('Escape');
  await page.keyboard.press('m');await page.screenshot({path:'artifacts/expanded-map.png'});await page.keyboard.press('Escape');
  await page.evaluate(()=>{const {game,renderer}=window.__hollow;const npc=game.world.interactables.find(i=>i.kind==='npc'&&i.dialogue);game.player.x=npc.x;game.player.y=npc.y+15;renderer.camera.x=npc.x;renderer.camera.y=npc.y*.72;});
  await page.waitForFunction(()=>!!window.__hollow.game.nearby?.dialogue);await page.keyboard.press('c');await expect(page.getByRole('dialog')).toBeVisible();await page.screenshot({path:'artifacts/expanded-camp-dialogue.png'});await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toHaveCount(0);
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
