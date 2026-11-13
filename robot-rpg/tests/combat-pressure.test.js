import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { HOME } from '../src/world.js';

function arena(type='rootknife',level=1,distance=150){
  const g=new Game(),source=g.creatures.find(c=>c.type===type);
  g.autoAttack=false;g.safeZonesEnabled=false;g.world.props=[];g.world.interactables=[];g.world.ambient=[];
  Object.assign(g.player,{x:3000,y:3000});
  const c={...source,id:'pressure-test',x:3000+distance,y:3000,homeX:3000+distance,homeY:3000,level,aggro:false,attack:0,phase:0,damage:8,camp:undefined,quest:undefined};
  g.creatures=[c];return {g,c};
}
function advance(g,seconds,input={}){for(let n=0;n<Math.round(seconds/.01);n++)g.update(.01,input);}
const damage=g=>g.events.filter(e=>e.type==='player-damage').reduce((sum,e)=>sum+e.amount,0);

test('monsters close distance faster and land repeated attacks during a standing exchange',()=>{
  const {g,c}=arena('rootknife',1,100),start=c.x;advance(g,1);
  assert.ok(start-c.x>45,'combat movement exceeds the old 39 units/sec');
  c.x=g.player.x+30;c.y=g.player.y;c.homeX=c.x;c.homeY=c.y;c.attack=0;c.windup=0;const before=damage(g);
  advance(g,2.2);assert.ok(damage(g)-before>=16,'at least two strikes land even while passive healing offsets a little damage');
});
test('running past an over-level melee hunter draws an opening rush and actual damage',()=>{
  const {g,c}=arena('rootknife',6,150);advance(g,.01);assert.equal(c.aggro,true,'the stronger hunter notices beyond the old 110-unit radius');
  advance(g,2.7,{right:true,run:true});assert.ok(g.player.hp<120,'sprinting through the dangerous hunter is not free');
  assert.equal(c.pursuitTime,0,'the opening rush ends rather than becoming an endless sprint');
});
test('faster ranged attacks can catch a fleeing runner',()=>{
  const {g}=arena('petalmaw',1,130);advance(g,3.9,{left:true,run:true});assert.ok(g.player.hp<120,'enemy projectiles catch ordinary sprinting');
});
test('larger awareness respects cover, village safety and neutral wildlife',()=>{
  const {g,c}=arena('rootknife',7,170);g.world.props=[{x:3085,y:3000,solid:20}];advance(g,.1);assert.equal(c.aggro,false);
  g.world.props=[];advance(g,.02);assert.equal(c.aggro,true);
  g.safeZonesEnabled=true;Object.assign(g.player,HOME);Object.assign(c,{x:HOME.x+30,y:HOME.y,homeX:HOME.x+30,homeY:HOME.y});advance(g,2);assert.equal(c.aggro,false);assert.equal(g.player.hp,120);
  g.safeZonesEnabled=false;c.type='barkjaw';advance(g,.1);assert.equal(c.aggro,false);
});
test('roots and stun still stop an opening rush',()=>{
  const {g,c}=arena('rootknife',7,150);c.root=4;const x=c.x;advance(g,.5);assert.equal(c.x,x);c.root=0;c.stun=2;advance(g,.5);assert.equal(c.x,x);
});
function grove(){const {g}=arena();g.creatures=[];const tree={id:'clasp-test',x:3030,y:3000,solid:0,clasp:true};g.world.props=[tree];return {g,tree};}
test('Claspwoods visibly warn before damage and strike repeatedly if the player stays',()=>{
  const {g}=grove();advance(g,.29);assert.equal(g.player.hp,120);assert.ok(g.effects.some(e=>e.type==='warning'));
  advance(g,.03);assert.equal(damage(g),6);advance(g,2.3);assert.equal(damage(g),18);assert.ok(g.player.hp<106);
});
test('moving out after the first tree strike prevents the rapid follow-up',()=>{
  const {g}=grove();advance(g,.32);assert.equal(damage(g),6);const hp=g.player.hp;advance(g,2,{left:true});assert.equal(damage(g),6);assert.ok(g.player.hp>hp&&g.player.hp<hp+3);
});
test('leaving during the tree warning dodges the strike; returning starts a fresh warning',()=>{
  const {g}=grove();advance(g,.1);g.player.y+=100;advance(g,1.5);assert.equal(g.player.hp,120);assert.equal(g.treeAttacks.size,0);
  g.player.y-=100;advance(g,.2);assert.equal(g.player.hp,120);advance(g,.12);assert.equal(damage(g),6);
});
test('alarm calls share the tree cooldown and safe havens cancel pending roots',()=>{
  const {g,tree}=grove();assert.ok(g.triggerTree(tree));assert.equal(g.triggerTree(tree),false);advance(g,.31);assert.equal(damage(g),6);assert.equal(g.triggerTree(tree),false);
  advance(g,.81);assert.equal(g.treeAttacks.size,1);g.safeZonesEnabled=true;Object.assign(g.player,HOME);advance(g,.4);assert.equal(g.treeAttacks.size,0);assert.equal(damage(g),6);assert.ok(g.player.hp<117);
});
