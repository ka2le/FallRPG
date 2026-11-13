import test from 'node:test';
import assert from 'node:assert/strict';
import { fieldGame } from '../scripts/balance-fixtures.mjs';

function fight(types,level=1,{enemyLevel=1,reed=false,mana=false,lance=false}={}){
  const g=fieldGame(types.map((type,i)=>({type,level:enemyLevel,x:3105+i*8,y:3000+(i-1)*20})),{x:3000,y:3000});
  g.safeZonesEnabled=false;g.autoAttack=true;g.player.level=level;
  if(lance)g.learn('surge');if(mana)while(g.unspentPoints)g.spendPoint('mana');
  if(reed){g.awardItem('reedstaff');g.equip('reedstaff');}g.recalculate();g.player.hp=g.player.maxHp;g.player.mana=g.player.maxMana;
  let damage=0,died=false,heavy=0;
  while(g.time<35&&!died&&!g.creatures.every(c=>c.dead)){
    if(lance&&!g.empowered&&g.player.mana>=38)g.cast('1');g.update(.05);
    for(const e of g.events.splice(0)){if(e.type==='player-damage')damage+=e.amount;if(e.type==='respawn')died=true;if(e.type==='cast'&&e.id==='surge')heavy++;}
  }
  return {g,damage,died,heavy,clear:g.creatures.every(c=>c.dead),seconds:g.time};
}

test('starter Rootknives and orchids are comfortable basic-only fights with no gear or consumables',()=>{
  for(const type of ['rootknife','petalmaw']){
    const r=fight([type]);assert.ok(r.clear&&!r.died,type);assert.ok(r.g.player.hp>=100,type);assert.ok(r.seconds<4.5,type);assert.equal(r.g.player.tonics,3);assert.equal(r.g.learned.size,0);
  }
});

test('returning at level three makes the same sapling group substantially quicker and less costly for a Mana build',()=>{
  const fresh=fight(['seedling','seedling','seedling']),grown=fight(['seedling','seedling','seedling'],3,{reed:true,mana:true});
  assert.ok(fresh.clear&&grown.clear&&!grown.died);assert.ok(grown.seconds<fresh.seconds*.75);assert.ok(grown.damage<fresh.damage*.7);assert.equal(grown.g.attributes.power,0);assert.ok(grown.g.player.hp>120);
});

test('a few levels and the first earned wand let a Mana build re-clear early hunters with fewer attacks received',()=>{
  const fresh=fight(['rootknife','rootknife'],1,{enemyLevel:2}),grown=fight(['rootknife','rootknife'],5,{enemyLevel:2,reed:true,mana:true});
  assert.ok(grown.clear&&!grown.died);assert.ok(grown.seconds<fresh.seconds*.8);assert.ok(grown.damage<fresh.damage*.8);assert.ok(grown.g.player.hp>fresh.g.player.hp+35);assert.equal(grown.heavy,0);
});

test('level five can beat a harder hunter pack with simple Lance casts and no armour, shields or potions',()=>{
  const r=fight(['prowler','prowler','prowler'],5,{enemyLevel:4,reed:true,mana:true,lance:true});
  assert.ok(r.clear&&!r.died);assert.ok(r.heavy>=2);assert.ok(r.g.player.hp>30);assert.equal(r.g.player.tonics,3);assert.equal(r.g.equipment.robe,'wraps');assert.equal(r.g.player.shield,0);
});

test('easier hostile scaling preserves the neutral wildlife health and damage curve',()=>{
  const g=fieldGame([{type:'barkjaw',level:4,x:3150,y:3000},{type:'rootknife',level:4,x:3200,y:3000}]);
  assert.equal(g.creatures[0].maxHp,172);assert.equal(g.creatures[0].damage,22);assert.ok(g.creatures[1].maxHp<80);assert.ok(g.creatures[1].damage<15);
});

test('pre-balance wounded enemies keep their health fraction on load and never reset by saving again',()=>{
  const actors=[{type:'rootknife',x:3150,y:3000}],g=fieldGame(actors,{x:3000,y:3000}),c=g.creatures[0];c.hp=c.maxHp/2;c.returning=true;
  const saved=g.snapshot();saved.combatVersion=3;delete saved.enemyStates[0].maxHp;saved.enemyStates[0].hp=32;
  const h=fieldGame(actors,{x:3000,y:3000});h.restore(saved);assert.equal(h.creatures[0].hp,24);assert.equal(h.creatures[0].maxHp,48);assert.ok(h.creatures[0].returning);
  const next=fieldGame(actors,{x:3000,y:3000});next.restore(h.snapshot());assert.equal(next.creatures[0].hp,24);assert.equal(next.snapshot().combatVersion,4);
});
