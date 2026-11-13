import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { SPECIES } from '../src/data.js';
import { enemyPressure } from '../src/combat-tuning.js';
import { spreadCombatants } from '../src/crowd.js';
import { canWalk, dist, moveBody } from '../src/world.js';
import { fieldGame, advance } from '../scripts/balance-fixtures.mjs';
import { PASTURE, BRIAR_CAMPS, OPENING_LAYOUT_VERSION } from '../src/opening.js';
import { inVillage } from '../src/world.js';

test('the actual first quest is survivable with basic attacks and no supplies, without pulling the next camps',()=>{
  const g=new Game();g.questAction('herd');g.navigateTo(PASTURE.approach.x,PASTURE.approach.y);const outsiders=new Set();let died=false;
  while(g.time<25&&!g.herdCleared&&!died){
    g.update(.05,{run:true});for(const c of g.creatures)if(c.aggro&&c.quest!=='herd')outsiders.add(c.id);
    died||=g.events.some(e=>e.type==='respawn');g.events=[];
  }
  assert.ok(g.herdCleared);assert.equal(died,false);assert.ok(g.player.hp>=75&&g.player.hp<g.player.maxHp);
  assert.equal(g.player.tonics,3);assert.equal(g.learned.size,0);assert.equal(outsiders.size,0);
});

test('small Seedlings share the easiest attack tempo and damage, beyond the introductory quest',()=>{
  const herd=enemyPressure({type:'seedling',quest:'herd',level:1},SPECIES.seedling,1),wild=enemyPressure({type:'seedling',level:1},SPECIES.seedling,1);
  assert.ok(herd.speed>80&&herd.speed<112);assert.equal(herd.recovery,1.15);assert.equal(herd.windup,wild.windup);assert.ok(wild.speed>=120);
  const g=fieldGame([{type:'seedling',quest:'herd',x:3150,y:3000},{type:'seedling',x:3300,y:3000}],{x:3000,y:3000});
  assert.equal(g.creatures[0].maxHp,g.creatures[1].maxHp);assert.equal(g.creatures[0].damage,3);assert.equal(g.creatures[1].damage,3);
});

test('standing inside either side or the centre of the pasture never pulls stronger camps into its three-sapling fight',()=>{
  for(const x of [PASTURE.x-70,PASTURE.x,PASTURE.x+80]){
    const g=new Game();Object.assign(g.player,{x,y:PASTURE.y});g.questAction('herd');let died=false;const outside=new Set();
    while(g.time<20&&!g.herdCleared&&!died){g.update(.05);for(const c of g.creatures)if(c.aggro&&c.quest!=='herd')outside.add(c.id);died=g.events.some(e=>e.type==='respawn');}
    assert.ok(g.herdCleared&&!died);assert.ok(g.player.hp>=70);assert.equal(g.player.tonics,3);assert.equal(outside.size,0);
  }
});

test('the relocated starting road keeps level-five frontier packs out of its authored level-two encounters',()=>{
  const g=new Game();for(const camp of Object.values(BRIAR_CAMPS))for(const c of g.creatures)if(!SPECIES[c.type].neutral&&dist(c,camp)<360)assert.ok(c.level<=3,`${c.id}: unexpected level ${c.level}`);
  assert.equal(g.creatures.find(c=>c.id==='creature-10').level,2);
});

test('three saplings are comfortable with only automatic sparks; a larger thicket benefits from mana',()=>{
  const fight=(count,heavy=0)=>{
    const g=fieldGame(Array.from({length:count},(_,i)=>({type:'seedling',x:3100+Math.cos(i*1.9)*12,y:3000+Math.sin(i*1.9)*12})),{x:3000,y:3000});g.safeZonesEnabled=false;g.autoAttack=true;
    if(heavy)g.learned.add('surge');let used=0,died=false;
    while(g.time<25&&!died&&!g.creatures.every(c=>c.dead)){
      if(used<heavy&&!g.empowered&&!(g.cooldowns.surge>0)){g.cast('1');used++;}g.update(.05);died=g.events.some(e=>e.type==='respawn');
    }
    return {g,died,clear:g.creatures.every(c=>c.dead)};
  };
  const three=fight(3);assert.ok(three.clear&&!three.died);assert.ok(three.g.player.hp>=70);assert.equal(three.g.player.mana,100);assert.equal(three.g.player.tonics,3);
  const five=fight(5),helped=fight(5,2);assert.ok(five.clear||five.died,'the larger group resolves within the probe');assert.ok(helped.clear&&!helped.died);assert.ok(helped.g.player.mana<100);assert.ok(five.died||helped.g.player.hp>five.g.player.hp+20,'mana meaningfully reduces the larger group’s pressure');
});

test('the apprentice can leave town unchallenged, then backpedal 120 units during the first fight without resetting it',()=>{
  const g=new Game();g.questAction('herd');g.navigateTo(PASTURE.townExit.x,PASTURE.townExit.y);while(g.route.length&&g.time<15)g.update(.05,{run:true});
  assert.equal(g.isSafe,false);assert.equal(g.player.hp,120);assert.ok(g.creatures.every(c=>!c.aggro));
  g.navigateTo(PASTURE.approach.x,PASTURE.approach.y);while(!g.creatures.some(c=>c.quest==='herd'&&c.aggro)&&g.time<25)g.update(.05,{run:true});
  const start={...g.player};for(let n=0;n<30;n++){g.update(.05,{x:0,y:80/112});assert.equal(g.isSafe,false);}
  assert.ok(dist(g.player,start)>110);assert.ok(g.creatures.some(c=>c.quest==='herd'&&!c.dead&&c.aggro));assert.ok(g.creatures.filter(c=>c.quest==='herd'&&!c.dead).every(c=>!c.returning));
  assert.equal(inVillage(g.player),false);
});

test('older saves keep wounds and progress while relocated enemies stay at the new pasture',()=>{
  const g=new Game(),save=g.snapshot(),c=g.creatures.find(c=>c.quest==='herd');delete save.openingLayout;
  save.enemyStates=[{id:c.id,x:970,y:640,hp:17,aggro:true,anchor:{x:963,y:600}}];save.player.coins=73;
  const restored=new Game(save),moved=restored.creatures.find(a=>a.id===c.id);
  assert.ok(dist(moved,{x:moved.homeX,y:moved.homeY})<1);assert.equal(moved.hp,17);assert.equal(moved.aggro,false);assert.equal(restored.player.coins,73);assert.equal(restored.snapshot().openingLayout,OPENING_LAYOUT_VERSION);
});

test('pausing automatic fire is visible and selecting a hostile resumes it without provoking wildlife',()=>{
  const g=fieldGame([{type:'seedling',x:3150,y:3000},{type:'barkjaw',x:3170,y:3000}],{x:3000,y:3000});g.autoAttack=true;
  assert.equal(g.toggleAutoAttack(),false);assert.ok(g.events.some(e=>e.type==='toast'&&e.text.includes('paused')));
  g.chooseTarget(g.creatures[1].id);assert.equal(g.autoAttack,false);g.chooseTarget(g.creatures[0].id);assert.equal(g.autoAttack,true);
  advance(g,.8);assert.ok(g.creatures[0].hp<g.creatures[0].maxHp);assert.equal(g.creatures[1].aggro,false);
});

test('six collinear pursuers fan out, remain in attack range, and settle without jitter',()=>{
  const g=fieldGame(Array.from({length:6},(_,i)=>({type:'rootknife',x:3130+i*2,y:3000})),{x:3000,y:3000});g.safeZonesEnabled=false;
  for(const c of g.creatures){c.aggro=true;c.attack=1000;}advance(g,15);
  for(const c of g.creatures){assert.ok(Math.min(...g.creatures.filter(b=>b!==c).map(b=>dist(c,b)))>28);assert.ok(dist(c,g.player)<53);}
  let maxStep=0,travel=0;for(let n=0;n<40;n++){const before=g.creatures.map(c=>({...c}));g.update(.05);g.creatures.forEach((c,i)=>{const step=dist(c,before[i]);maxStep=Math.max(maxStep,step);travel+=step;});}
  assert.ok(maxStep<.1,`settled crowd jumped ${maxStep}`);assert.ok(travel/6<.5,'a settled crowd should stay still');
  for(const c of g.creatures)c.attack=0;g.player.invulnerable=0;advance(g,.8);assert.ok(g.player.hp<g.player.maxHp,'spacing does not stop the pack attacking');
});

test('overlapping enemies separate deterministically without acquiring blocking bodies',()=>{
  const actors=[{id:'a',type:'seedling',x:3150,y:3000,aggro:true},{id:'b',type:'seedling',x:3150,y:3000,aggro:true}];
  const a=fieldGame(actors,{x:3000,y:3000}),b=fieldGame(actors.toReversed(),{x:3000,y:3000});for(const g of [a,b])for(const c of g.creatures)c.aggro=true;
  for(let n=0;n<60;n++){spreadCombatants(a,.05);spreadCombatants(b,.05);}
  assert.ok(dist(a.creatures[0],a.creatures[1])>20);
  for(const c of a.creatures){assert.ok(dist(c,b.creatures.find(v=>v.id===c.id))<.0001);assert.ok(canWalk(a.world,c.x,c.y,5));assert.equal(c.solid,undefined);}
  const body={x:3120,y:3000};moveBody(a.world,body,80,0,8);assert.equal(body.x,3200,'the player can pass through the enemies');
});

test('a fighting pack keeps a readable ring and does not jitter during repeated attacks',()=>{
  const g=fieldGame(Array.from({length:6},(_,i)=>({type:'rootknife',x:3130+i*2,y:3000})),{x:3000,y:3000});g.safeZonesEnabled=false;g.player.invulnerable=1000;
  for(const c of g.creatures)c.aggro=true;advance(g,15);let travel=0;
  for(let n=0;n<40;n++){const before=g.creatures.map(c=>({...c}));g.update(.05);g.creatures.forEach((c,i)=>travel+=dist(c,before[i]));}
  assert.ok(travel/6<.5);for(const c of g.creatures)assert.ok(Math.min(...g.creatures.filter(b=>b!==c).map(b=>dist(c,b)))>28);
});

test('crowd steering respects roots, stuns, returning enemies and solid scenery',()=>{
  const g=fieldGame([{type:'seedling',x:3150,y:3000},{type:'seedling',x:3150,y:3000}],{x:3000,y:3000});for(const c of g.creatures)c.aggro=true;
  for(const field of ['root','stun','returning']){
    g.creatures[0][field]=field==='returning'?true:1;const before={...g.creatures[0]};for(let n=0;n<20;n++)spreadCombatants(g,.05);
    assert.equal(dist(g.creatures[0],before),0);g.creatures[0][field]=0;
  }
  g.world.props=[{x:3150,y:3023,solid:15}];for(let n=0;n<100;n++)spreadCombatants(g,.05);
  for(const c of g.creatures)assert.ok(canWalk(g.world,c.x,c.y,5));
});

test('a narrow passage allows a pursuing pack to compress and pass through',()=>{
  const g=fieldGame([0,1,2].map(i=>({type:'rootknife',x:3290+i*10,y:3000})),{x:3000,y:3000});g.safeZonesEnabled=false;g.player.invulnerable=100;
  g.world.props=[];for(let x=3050;x<=3320;x+=20)for(const y of [2978,3022])g.world.props.push({x,y,solid:10});
  for(const c of g.creatures){c.aggro=true;c.attack=1000;}advance(g,8);assert.ok(g.creatures.every(c=>dist(c,g.player)<53),'soft spacing must yield to the passage');
});
