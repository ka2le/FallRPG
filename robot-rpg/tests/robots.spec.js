import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('robot crews render and work in every habitat; walking west finds the opening crew',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?test');await page.waitForFunction(()=>!!window.__hollow);
  await expect(page).toHaveTitle('Robot RPG · The Hollow');
  await mkdir('artifacts',{recursive:true});
  const start=await page.evaluate(()=>window.__hollow.game.player.x);
  await page.locator('#world').focus();await page.keyboard.down('a');
  await page.waitForFunction(x=>window.__hollow.game.player.x<x-190,start);
  await page.keyboard.up('a');
  expect(await page.evaluate(()=>{const g=window.__hollow.game,c=g.world.robotColonies[0];return Math.hypot(g.player.x-c.x,g.player.y-c.y);})).toBeLessThan(65);
  await page.screenshot({path:'artifacts/robot-opening.png'});
  for(const biome of ['spring','autumn','winter','ember']){
    const result=await page.evaluate(async biome=>{
      const {game:g,renderer:r}=window.__hollow,{updateRobots}=await import('/src/robots.js');
      g.paused=true;const colony=g.world.robotColonies.find(c=>c.biome===biome);
      g.player.x=colony.x+50;g.player.y=colony.y+60;r.camera.x=colony.x;r.camera.y=(colony.y+25)*.72;
      const positions=colony.robots.map(a=>({x:a.x,y:a.y}));const states=new Set();
      for(let n=0;n<1600;n++){g.time+=.05;updateRobots(g.world,g.player,g.time,.05);for(const a of colony.robots)states.add(a.state);}
      r.draw(0);
      return {fill:colony.fill,states:[...states],moved:colony.robots.some((a,i)=>Math.hypot(a.x-positions[i].x,a.y-positions[i].y)>10)};
    },biome);
    expect(result.moved).toBe(true);expect(result.states).toContain('picking');expect(result.states).toContain('depositing');expect(result.fill).toBeGreaterThan(.24);
    await page.screenshot({path:`artifacts/robot-${biome}.png`});
  }
  await page.setViewportSize({width:390,height:844});
  const mobile=await page.evaluate(()=>{const {game:g,renderer:r}=window.__hollow,c=g.world.robotColonies[0];r.resize();g.player.x=c.x+25;g.player.y=c.y+45;r.camera.x=c.x;r.camera.y=(c.y+20)*.72;r.draw(0);return {bin:r.screen(c.x,c.y),width:r.width,height:r.height};});
  expect(mobile.bin.x).toBeGreaterThan(0);expect(mobile.bin.x).toBeLessThan(mobile.width);
  expect(mobile.bin.y).toBeGreaterThan(0);expect(mobile.bin.y).toBeLessThan(mobile.height);
  await page.screenshot({path:'artifacts/robot-mobile.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('robot RPG save leaves the original pixel RPG save untouched',async({page})=>{
  await page.goto('/?test');await page.waitForFunction(()=>!!window.__hollow);
  const result=await page.evaluate(()=>{
    localStorage.setItem('hollow-between-seasons-v1','original-adventure');
    window.__hollow.game.player.coins=123;window.__hollow.save();
    return {original:localStorage.getItem('hollow-between-seasons-v1'),robot:JSON.parse(localStorage.getItem('robot-rpg-v1')).player.coins};
  });
  expect(result).toEqual({original:'original-adventure',robot:123});
  await page.reload();await page.waitForFunction(()=>!!window.__hollow);
  expect(await page.evaluate(()=>window.__hollow.game.player.coins)).toBe(123);
});
