import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { dist } from '../src/world.js';

function encounter(type,distance=175,angle=0,boots=false){
  const world={props:[],interactables:[],ambient:[],rootwallGroups:[],creatures:[{id:'kite-target',type,x:3000+Math.cos(angle)*distance,y:3000+Math.sin(angle)*distance,homeX:3000+Math.cos(angle)*distance,homeY:3000+Math.sin(angle)*distance,level:1,phase:0}]};
  const g=new Game(null,{world});Object.assign(g.player,{x:3000,y:3000});g.safeZonesEnabled=false;g.wasSafe=false;
  if(boots){g.inventory.push('wayboots');g.equip('wayboots');}g.target='kite-target';return g;
}
function retreat(g,{walk=false,attack=true}={}){
  g.autoAttack=attack;const c=g.creatures[0];let damage=0,noticed=false;
  while(g.time<15){
    const d=dist(g.player,c)||1,scale=walk?80/112:1;
    g.update(.05,{x:(g.player.x-c.x)/d*scale,y:(g.player.y-c.y)/d*scale});noticed||=c.aggro;
    for(const e of g.events.splice(0))if(e.type==='player-damage')damage+=e.amount;
    if(c.dead||noticed&&!c.aggro&&c.returning)break;
  }
  return {damage,dead:c.dead,escaped:noticed&&!c.aggro&&c.returning};
}

for(const type of ['rootknife','prowler','petalmaw','stormbell','wyrm']){
  test(`${type} connects against direct retreat while auto-attacking, with its intended attack pressure`,()=>{
    for(const mode of (['petalmaw','stormbell','wyrm'].includes(type)?['walk','run','boots']:['walk']))for(const range of [100,175])for(let direction=0;direction<8;direction++){
      const g=encounter(type,range,direction*Math.PI/4,mode==='boots'),result=retreat(g,{walk:mode==='walk'});
      assert.ok(result.damage>0,`${type}: ${mode}, range ${range}, heading ${direction} cannot avoid every hit by backing away`);
    }
  });
}
test('ordinary territorial enemies still let a retreating runner leave combat alive',()=>{
  for(const type of ['seedling','rootknife','prowler','petalmaw']){
    const g=encounter(type),result=retreat(g,{attack:false});assert.ok(result.escaped,type);assert.ok(g.player.hp>0,type);
  }
});
test('control and Windrun buy a clean escape, instead of making passive backpedaling free',()=>{
  const g=encounter('rootknife');g.learned.add('bind');g.learned.add('haste');assert.ok(g.cast('5'));assert.ok(g.cast('4'));assert.equal(g.player.mana,68);
  const result=retreat(g);assert.equal(result.damage,0);assert.ok(result.escaped);assert.ok(g.player.mana<g.player.maxMana,'the escape spends the shared mana pool');
});
test('the heavy next shot can kill an opening seedling cleanly by spending mana',()=>{
  const g=encounter('seedling');g.learned.add('surge');g.cast('1');const result=retreat(g);assert.ok(result.dead);assert.equal(result.damage,0);assert.ok(g.player.mana<65);
});
test('long-range pressure respects solid cover',()=>{
  const g=encounter('petalmaw');g.world.props=[{x:3085,y:3000,solid:20}];
  for(let n=0;n<60;n++)g.update(.05);assert.equal(g.player.hp,g.player.maxHp);assert.equal(g.creatures[0].aggro,false);
});
