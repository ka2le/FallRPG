import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, SAVE_KEY } from '../src/game.js';
import { HOME, canWalk, dist } from '../src/world.js';
import { FIRST_ROBOT_SPOT, updateRobots, ROBOT_RADIUS, robotRouteClear } from '../src/robots.js';

const game=new Game(),world=game.world;

test('custom worlds keep their authored contents without spawning overworld crews',()=>{
  const arena={props:[],interactables:[],ambient:[],rootwallGroups:[],creatures:[]};
  const isolated=new Game(null,{world:arena});
  assert.equal(isolated.world,arena);assert.equal(arena.robotColonies,undefined);
  assert.equal(arena.props.length,0);isolated.update(.05);
});

test('independent RPG has crews of 3–6 and shared bins throughout all four habitats',()=>{
  assert.equal(SAVE_KEY,'robot-rpg-v1');
  assert.ok(world.robotColonies.length>=60);
  assert.deepEqual(new Set(world.robotColonies.map(c=>c.biome)),new Set(['spring','autumn','winter','ember']));
  assert.ok(world.robotColonies.some(c=>c.x<-6000));assert.ok(world.robotColonies.some(c=>c.x>9000));
  assert.ok(world.robotColonies.some(c=>c.y<-4000));assert.ok(world.robotColonies.some(c=>c.y>6000));
  assert.equal(FIRST_ROBOT_SPOT.x,HOME.x-200);
  assert.ok(dist(world.robotColonies[0],FIRST_ROBOT_SPOT)<65);
  for(const c of world.robotColonies){
    assert.ok(c.robots.length>=3&&c.robots.length<=6);
    assert.ok(c.leaves.length>=10,`${c.id} has reachable leaves`);
    assert.equal(world.props.filter(p=>p.robotBin===c).length,1);
    for(const r of c.robots){assert.equal(r.colonyId,c.id);assert.ok(canWalk(world,r.x,r.y,ROBOT_RADIUS));}
    for(const l of c.leaves)assert.ok(robotRouteClear(world,c.dock,l));
  }
});

test('crews gather, return and keep depositing after the visible mound stops growing',()=>{
  for(const biome of ['spring','autumn','winter','ember']){
    const colony=world.robotColonies.find(c=>c.biome===biome);
    const deposits=new Set(),gathers=new Set(),moved=new Set(),starts=new Map(colony.robots.map(r=>[r.id,{x:r.x,y:r.y}]));
    colony.fill=.88;
    for(let i=1;i<=2400;i++){
      updateRobots(world,colony,i*.05,.05);
      for(const r of colony.robots){
        if(r.cargo>0)gathers.add(r.id);
        if(r.state==='depositing')deposits.add(r.id);
        if(dist(r,starts.get(r.id))>30)moved.add(r.id);
        assert.ok(canWalk(world,r.x,r.y,ROBOT_RADIUS),`${biome} worker stays on walkable ground`);
      }
    }
    assert.equal(deposits.size,colony.robots.length,`${biome}: every robot returns to its bin`);
    assert.equal(gathers.size,colony.robots.length);assert.equal(moved.size,colony.robots.length);
    assert.equal(colony.fill,.88);
    assert.ok(colony.leaves.some(l=>l.readyAt>30),'leaves continue to be gathered after regrowth');
    assert.ok(!('capacity' in colony));assert.ok(!('bags' in colony));
  }
});

test('robots remain outside combat, rewards and hostile targeting',()=>{
  const crew=world.robotColonies[0],before=crew.robots.map(r=>r.id);
  assert.ok(crew.robots.every(r=>!game.creatures.some(c=>c.id===r.id)));
  game.creatures=[];game.player.x=crew.x;game.player.y=crew.y+40;
  const xp=game.player.xp,coins=game.player.coins;
  game.safeZonesEnabled=false;game.learned.add('nova');game.setBinding('e','nova');assert.ok(game.cast('e'));
  for(let n=0;n<60;n++)game.update(.05);
  assert.equal(game.targetCreature,undefined);
  assert.deepEqual(crew.robots.map(r=>r.id),before);
  assert.ok(crew.robots.every(r=>!r.dead&&!r.aggro));
  assert.equal(game.player.xp,xp);assert.equal(game.player.coins,coins);
});

test('paused game freezes robots and a blocked gathering path can recover',()=>{
  const crew=world.robotColonies[0],r=crew.robots[0];
  game.paused=true;const before=JSON.stringify(crew);game.update(.05);assert.equal(JSON.stringify(crew),before);game.paused=false;
  // A temporary player root wall interrupts a route, then expires.
  r.state='returning';r.destination={...crew.dock};r.route=[{...crew.dock}];r.retry=0;
  const previous={x:r.x,y:r.y};
  world.barriers=[{a:{x:r.x-15,y:r.y},b:{x:r.x+15,y:r.y},life:1}];
  updateRobots(world,crew,150,.05);assert.equal(dist(r,previous),0);
  world.barriers=[];
  for(let i=1;i<=1200;i++)updateRobots(world,crew,150+i*.05,.05);
  assert.ok(dist(r,previous)>1||r.state==='depositing');
});
