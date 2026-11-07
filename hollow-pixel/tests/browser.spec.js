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
  await page.evaluate(()=>{const g=window.__hollow.game;for(const c of g.creatures.filter(c=>c.quest==='herd'))g.hurt(c,999);g.questAction('herd');g.player.level=7;g.player.coins=500;g.recalculate();});
  await page.keyboard.press('k');await expect(page.getByRole('dialog',{name:'Spells',exact:true})).toBeVisible();await page.locator('[data-learn="fox"]').click();await page.locator('[data-learn="frost"][data-style="true"]').click();
  await page.locator('[data-slot="r"]').click();await page.locator('[data-bind="fox"]').click();
  await expect(page.locator('[data-slot="r"]')).toHaveAttribute('title','Lantern Fox');
  await page.screenshot({path:'artifacts/grimoire.png'});await page.keyboard.press('Escape');
  await page.keyboard.press('2');await page.evaluate(()=>window.__hollow.save());await page.reload();await page.waitForFunction(()=>!!window.__hollow);
  expect(await page.evaluate(()=>[window.__hollow.game.bindings.r,window.__hollow.game.quests.herd,window.__hollow.game.stance])).toEqual(['fox','complete','frost']);
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
  const before=await page.evaluate(()=>{const {game,renderer}=window.__hollow;game.world.props=[];game.world.interactables=[];const s=renderer.screen(game.player.x+60,game.player.y),r=renderer.canvas.getBoundingClientRect();return {x:game.player.x,clickX:s.x/renderer.width*r.width,clickY:s.y/renderer.height*r.height};});
  await page.mouse.click(before.clickX,before.clickY);await page.waitForTimeout(150);expect(await page.evaluate(()=>window.__hollow.game.player.x)).toBe(before.x);
  await page.evaluate(()=>{const {game,renderer}=window.__hollow;game.world.props=[];game.learned=new Set(['bramble','bind','frost','ward','wave','siphon','renew','blink','fox']);game.stances=new Set(['ember','frost','siphon']);game.safeZonesEnabled=false;game.player.x=1080;game.player.y=855;game.route=[];game.destination=null;game.creatures=game.creatures.filter(c=>c.type==='seedling').slice(0,1);const c=game.creatures[0];Object.assign(c,{x:1160,y:855,homeX:1160,homeY:855,hp:200,maxHp:200,root:100});game.target=null;renderer.camera.x=1080;renderer.camera.y=855*.72;});
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

test('mobile hold joystick, pinch zoom, target switching, spells and conversations work together',async({browser})=>{
  test.setTimeout(90000);
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const mobile=await context.newPage(),errors=[];mobile.on('pageerror',e=>errors.push(e.message));
  try{
    await mobile.goto('/?test');await mobile.waitForFunction(()=>!!window.__hollow);
    await mobile.evaluate(()=>{const {game:g,renderer:r}=window.__hollow;g.learned.add('bramble');g.world.props=[];g.world.interactables=[];g.world.rootwallGroups=[];g.creatures=[];Object.assign(g.player,{x:1080,y:855});g.route=[];g.destination=null;r.camera.x=1080;r.camera.y=855*.72;});
    const point=async(x,y)=>mobile.evaluate(({x,y})=>{const {renderer:r}=window.__hollow,s=r.screen(x,y),b=r.canvas.getBoundingClientRect();return{x:b.left+s.x/r.width*b.width,y:b.top+s.y/r.height*b.height};},{x,y});
    const position=()=>mobile.evaluate(()=>({x:window.__hollow.game.player.x,y:window.__hollow.game.player.y}));
    expect(await mobile.evaluate(()=>window.__hollow.renderer.zoom)).toBe(1.5);
    const original=await position();let p=await point(1130,855);await mobile.touchscreen.tap(p.x,p.y);await mobile.waitForTimeout(150);
    expect(await position()).toEqual(original);expect(await mobile.evaluate(()=>window.__hollow.game.destination)).toBe(null);
    const cdp=await context.newCDPSession(mobile),send=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
    // Movement can start in the upper half too; only the held finger owns it.
    const a={id:1,x:50,y:300},b={id:2,x:270,y:300};await send('touchStart',[a]);await mobile.waitForTimeout(320);a.x+=65;await send('touchMove',[a]);
    await mobile.waitForFunction(x=>window.__hollow.game.player.x>x+8,original.x);
    expect(await mobile.evaluate(()=>window.__hollow.game.autoAttack)).toBe(true);
    // A second finger immediately stops the joystick and stretches the world view.
    await send('touchStart',[a,b]);await mobile.waitForFunction(()=>!window.__hollow.game.player.moving);
    const stopped=await position();a.x=80;b.x=310;await send('touchMove',[a,b]);
    await mobile.waitForFunction(()=>window.__hollow.renderer.zoom>2);
    a.x=145;b.x=235;await send('touchMove',[a,b]);await mobile.waitForFunction(()=>window.__hollow.renderer.zoom<1.5);
    expect(await position()).toEqual(stopped);
    await send('touchEnd',[a]);await mobile.waitForTimeout(350);b.x+=25;await send('touchMove',[b]);await mobile.waitForTimeout(100);
    expect(await position()).toEqual(stopped);await send('touchEnd',[b]);
    // Holding or pinching while a spell is armed must never confirm placement.
    await mobile.locator('[data-cast="q"]').tap();expect(await mobile.evaluate(()=>window.__hollow.game.aiming?.slot)).toBe('q');
    await send('touchStart',[{id:3,x:280,y:620}]);await mobile.waitForTimeout(320);await send('touchEnd',[]);
    expect(await mobile.evaluate(()=>[window.__hollow.game.aiming?.slot,window.__hollow.game.world.barriers.length])).toEqual(['q',0]);
    const current=await position();p=await point(current.x+65,current.y);await mobile.touchscreen.tap(p.x,p.y);
    expect(await mobile.evaluate(()=>[window.__hollow.game.world.barriers.length,window.__hollow.game.destination])).toEqual([1,null]);
    // Opening a menu cancels held movement and it cannot resume when the menu closes.
    await send('touchStart',[{id:4,x:70,y:400}]);await mobile.waitForTimeout(320);await send('touchMove',[{id:4,x:125,y:400}]);
    await mobile.locator('[data-menu="pause"]').evaluate(el=>el.click());await send('touchEnd',[]);
    await expect(mobile.getByRole('dialog',{name:'Paused',exact:true})).toBeVisible();await mobile.getByRole('button',{name:'Continue',exact:true}).tap();
    const resumed=await position();await mobile.waitForTimeout(150);expect(await position()).toEqual(resumed);
    // An explicit tap overrides the automatic attack's previous target.
    await mobile.evaluate(()=>{const g=window.__hollow.game;g.world.barriers=[];g.safeZonesEnabled=false;g.player.invulnerable=100;g.creatures=[-1,1].map((side,i)=>({id:`tap-${i}`,type:'seedling',x:g.player.x+side*50,y:g.player.y,homeX:g.player.x+side*50,homeY:g.player.y,hp:1000,maxHp:1000,root:100,stun:0,slow:0,flash:0,attack:100,walk:0,face:1,phase:0}));g.target='tap-0';g.boltCooldown=0;});
    await mobile.waitForFunction(()=>window.__hollow.game.projectiles.some(s=>s.target==='tap-0'));
    const c=await mobile.evaluate(()=>window.__hollow.game.creatures[1]);p=await point(c.x,c.y-15);await mobile.touchscreen.tap(p.x,p.y);
    expect(await mobile.evaluate(()=>window.__hollow.game.target)).toBe('tap-1');
    await mobile.waitForFunction(()=>window.__hollow.game.projectiles.some(s=>s.target==='tap-1'));
    await mobile.screenshot({path:'artifacts/mobile-joystick-zoom.png'});
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
  }finally{await context.close();}
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

test('RPG rewards, equipment, lessons, bounty turn-ins and a fresh journey work through menus',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await expect(page.locator('#adventure-status')).toContainText('Speak to Rowan');
  await page.keyboard.press('f');expect(await page.evaluate(()=>window.__hollow.game.player.shield)).toBe(0);
  await page.evaluate(()=>{const g=window.__hollow.game;g.questAction('herd');for(const c of g.creatures.filter(c=>c.quest==='herd'))g.hurt(c,999);g.questAction('herd');});
  await page.keyboard.press('i');await expect(page.getByRole('dialog',{name:'Equipment',exact:true})).toBeVisible();
  await page.locator('[data-equip="reedstaff"]').click();await expect(page.locator('[data-equip="reedstaff"]')).toHaveText('Equipped');await page.screenshot({path:'artifacts/rpg-equipment.png'});await page.keyboard.press('Escape');
  await page.keyboard.press('k');await page.locator('[data-learn="ward"]').click();expect(await page.evaluate(()=>window.__hollow.game.learned.has('ward'))).toBe(true);await page.keyboard.press('Escape');
  await page.keyboard.press('j');await page.locator('[data-quest-action="briar-road"]').click();
  await page.evaluate(()=>{const {game:g,renderer:r}=window.__hollow;Object.assign(g.player,{x:870,y:440,invulnerable:100});g.autoAttack=false;r.camera.x=870;r.camera.y=440*.72;});
  await page.waitForTimeout(250);await page.screenshot({path:'artifacts/rpg-briar-road.png'});
  await page.evaluate(()=>{const {game:g,renderer:r}=window.__hollow;for(const c of g.creatures.filter(c=>['briar-turn','root-hollow','thorn-den'].includes(c.camp)))g.hurt(c,9999);Object.assign(g.player,{x:1040,y:825});r.camera.x=1040;r.camera.y=825*.72;g.target=null;});
  await page.waitForFunction(()=>window.__hollow.game.nearby?.id==='rowan');await page.keyboard.press('c');await page.locator('[data-quest-action="briar-road"]').click();
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
  await page.waitForFunction(()=>window.__hollow.game.nearby?.name==='Fern');await page.keyboard.press('c');
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

test('rapid Claspwood attacks telegraph clearly and can be escaped after the first hit',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const start=await page.evaluate(()=>{
    const {game:g,renderer:r}=window.__hollow,tree=g.world.props.find(p=>p.clasp&&!p.removed&&p.x===750&&p.y===680);
    g.creatures=[];g.autoAttack=false;g.treeAttacks.clear();g.player.x=tree.x-35;g.player.y=tree.y;g.player.hp=g.player.maxHp;g.player.invulnerable=0;
    delete tree.lastSnap;g.update(.01);g.paused=true;r.camera.x=g.player.x;r.camera.y=g.player.y*.72;r.draw(0);
    return {hp:g.player.hp,warning:g.effects.some(e=>e.type==='warning'),pending:g.treeAttacks.size};
  });
  expect(start).toEqual({hp:120,warning:true,pending:1});await page.screenshot({path:'artifacts/claspwood-warning.png'});
  const hit=await page.evaluate(()=>{const {game:g,renderer:r}=window.__hollow;g.paused=false;for(let n=0;n<7;n++)g.update(.05);g.paused=true;r.draw(0);return g.player.hp;});
  expect(hit).toBe(114);await page.screenshot({path:'artifacts/claspwood-strike.png'});
  const escaped=await page.evaluate(()=>{const {game:g,renderer:r}=window.__hollow;g.paused=false;for(let n=0;n<40;n++)g.update(.05,{left:true});g.paused=true;r.draw(0);return g.player.hp;});
  expect(escaped).toBe(114);await page.screenshot({path:'artifacts/claspwood-escape.png'});expect(errors).toEqual([]);
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
