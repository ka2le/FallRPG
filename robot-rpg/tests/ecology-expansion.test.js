import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { SPECIES } from '../src/data.js';
import { MORE_SPECIES } from '../src/expansion-monsters.js';
import { creatureAppearance } from '../src/sprites.js';
import { Renderer } from '../src/render.js';
import { UI } from '../src/ui.js';
import { biomeAt, seamX, dist, HOME } from '../src/world.js';
import { CAMP_SITES } from '../src/regions.js';

function arena(){const g=new Game();g.autoAttack=false;g.world.props=[];g.world.interactables=[];g.creatures=[];return g;}
function animal(type,x,y){const s=SPECIES[type];return {id:`test-${type}`,type,x,y,homeX:x,homeY:y,phase:0,hp:s.hp,maxHp:s.hp,face:1,moving:false,walk:0,attack:1,windup:0,root:0,stun:0,slow:0,aggro:false,flash:0,dead:false,state:'wandering'};}
function ecologyFor(g,c,seconds){for(let t=0;t<seconds;t+=.5){g.time+=.5;g.ecology(c,.5);}}

test('new creatures and regional forms select the wildlife atlas and their paired pose',()=>{
  assert.deepEqual(creatureAppearance(SPECIES.cuphorn),{atlas:'wildlife',frame:3});
  assert.deepEqual(creatureAppearance(SPECIES.cuphorn,{moving:true,walk:1.2}),{atlas:'wildlife',frame:35});
  assert.deepEqual(creatureAppearance(SPECIES.barkjaw,{visual:{atlas:'wildlife',sprite:24},moving:true,walk:1}),{atlas:'wildlife',frame:56});
  assert.deepEqual(creatureAppearance(SPECIES.scavenger,{visual:{atlas:'wildlife',sprite:30},moving:true,walk:3}),{atlas:'wildlife',frame:62});
  assert.deepEqual(creatureAppearance(SPECIES.seedling,{moving:true,walk:1}),{atlas:'creatures',frame:24});
});

test('journal portraits retain the wildlife atlas and do not apply the old character remap',()=>{
  const html=UI.prototype.fieldLog.call({game:{observed:new Set(['corpseborer'])},selectedNote:'corpseborer'});
  assert.match(html,/data-portrait="12" data-atlas="wildlife"/);
  const previous=globalThis.document,calls=[];
  globalThis.document={createElement:()=>({getContext:()=>({drawImage:(...args)=>calls.push(args)}),toDataURL:()=> 'data:image/png;base64,portrait'})};
  try{
    const sprite={x:120,y:0,w:30,h:40},source={name:'wildlife'};
    const renderer={sprites:{wildlife:Array.from({length:64},(_,i)=>i===12?sprite:{x:i,y:1,w:1,h:1})},atlases:{wildlife:source}};
    Renderer.prototype.thumbnail.call(renderer,12,'wildlife');
    assert.equal(calls[0][0],source);assert.deepEqual(calls[0].slice(1,5),[120,0,30,40]);
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('new peaceful species remain neutral at close range and are ignored by automatic casting',()=>{
  const g=arena();g.safeZonesEnabled=false;g.autoAttack=true;
  g.creatures=Object.entries(MORE_SPECIES).filter(([,s])=>s.neutral).map(([id],i)=>animal(id,HOME.x+28+i,HOME.y+25));
  for(let i=0;i<60;i++)g.update(.05);
  assert.equal(g.projectiles.length,0);assert.equal(g.player.hp,g.player.maxHp);
  for(const c of g.creatures){assert.equal(c.aggro,false,c.type);assert.equal(c.hp,c.maxHp,c.type);}
});

test('Stillglass refuses a feeding site across the seasonal boundary',()=>{
  const g=arena(),y=500,x=seamX(y)-18,c=animal('stillglass',x,y);g.creatures=[c];
  g.world.props=[{x:x+95,y,atlas:'wilds',art:47,solid:0}];
  assert.equal(biomeAt(c.x,c.y),'spring');assert.equal(biomeAt(x+95,y),'autumn');
  ecologyFor(g,c,150);
  assert.equal(biomeAt(c.x,c.y),'spring');assert.ok(dist(c,{x:c.homeX,y:c.homeY})<400);
});

test('resource routines ignore distant scenery and stay within their home neighborhood',()=>{
  const g=arena(),c=animal('cuphorn',1000,500);g.creatures=[c];
  g.world.props=[{x:1000,y:2000,atlas:'wilds',art:5,solid:0}];
  ecologyFor(g,c,180);
  assert.ok(dist(c,{x:c.homeX,y:c.homeY})<85);assert.equal(biomeAt(c.x,c.y),'spring');
});

test('Alarm Caller cannot damage a traveler within a safe camp',()=>{
  const g=arena(),camp=CAMP_SITES[0];g.player.x=camp.x;g.player.y=camp.y;
  const c=animal('alarmcaller',camp.x+35,camp.y);g.creatures=[c];
  g.world.props=[{x:camp.x+8,y:camp.y,atlas:'groves',family:'claspwood',clasp:true,solid:0}];
  assert.equal(g.isSafe,true);g.time=1;g.ecology(c,.05);
  assert.equal(g.player.hp,g.player.maxHp);assert.equal(c.aggro,false);
});

test('new discoveries survive save restoration and appear in the field journal',()=>{
  const g=arena();
  for(const id of ['cuphorn','burialstag','glassbrood']){const c=animal(id,HOME.x+30,HOME.y);g.observe(c);}
  const restored=new Game(g.snapshot());
  assert.deepEqual([...restored.observed],['cuphorn','burialstag','glassbrood']);
  const html=UI.prototype.fieldLog.call({game:restored,selectedNote:'glassbrood'});
  assert.match(html,/Glassbrood/);assert.match(html,/data-portrait="23" data-atlas="wildlife"/);
});

test('regional Scavengers feed at their own warm-cold crossing before the village quest opens',()=>{
  const g=arena(),c={...animal('scavenger',5020,2560),cold:.1,warm:1,crossing:{x:5020,y:2560}};g.creatures=[c];
  assert.equal(g.crossingOpen,false);ecologyFor(g,c,14);
  assert.equal(biomeAt(c.crossingGoals.cold.x,c.crossingGoals.cold.y),'winter');
  assert.equal(biomeAt(c.crossingGoals.warm.x,c.crossingGoals.warm.y),'ember');
  assert.ok(c.cold>.5);assert.ok(c.warm>.5);assert.ok(dist(c,c.crossing)<180);
});
