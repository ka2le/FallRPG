import test from 'node:test';
import assert from 'node:assert/strict';
import {MONSTER_ART} from '../src/monsters/index.js';
import {STATE,evaluate,svgMarkup} from '../src/monsters/rig.js';
import {SPECIES} from '../src/data.js';
import {ITEMS,SLOTS,characterStats,gearTotals,statText,itemRarity} from '../src/journey.js';
import {ITEM_ART} from '../src/art/items.js';
import {SPELL_ART} from '../src/art/spells.js';
import {SPELLS} from '../src/data.js';
import {paperdoll} from '../src/art/figure.js';

const states={idle:{},move:{move:1,phase:2},windup:{windup:1},attack:{attack:1},hurt:{hurt:1},stun:{stun:1},root:{root:1},dodge:{dodge:-1},dead:{dead:1}};
test('every painted rig belongs to a species and has a valid part tree',()=>{
  for(const [type,def] of Object.entries(MONSTER_ART)){
    assert.ok(SPECIES[type],type);const ids=new Set();
    for(const p of def.parts){assert.ok(!ids.has(p.id),`${type}: duplicate ${p.id}`);ids.add(p.id);assert.equal(p.pivot.length,2);}
    for(const p of def.parts){let q=p,depth=0;while(q.parent){q=def.parts.find(x=>x.id===q.parent);assert.ok(q,`${type}: ${p.id} has a missing parent`);assert.ok(++depth<20,`${type}: parent cycle at ${p.id}`);}}
  }
});
test('rig animations produce finite poses in every combat state',()=>{
  for(const [type,def] of Object.entries(MONSTER_ART))for(const [name,extra] of Object.entries(states))for(const t of [0,.37,2.9,13.1]){
    const pose=evaluate(def,Object.assign(STATE(),{t,seed:3},extra));
    for(const [id,q] of Object.entries(pose))for(const k of ['x','y','r','sx','sy','o'])assert.ok(Number.isFinite(q[k]),`${type}.${id}.${k} in ${name}`);
  }
});
test('rigs serialise to standalone SVG for portraits',()=>{for(const def of Object.values(MONSTER_ART)){const svg=svgMarkup(def);assert.match(svg,/^<svg /);assert.ok(!svg.includes('undefined')&&!svg.includes('NaN'));}});
test('every item, slot and spell has art',()=>{for(const id of Object.keys(ITEMS))assert.match(ITEM_ART[id],/<svg/,id);assert.equal(SPELL_ART.length,SPELLS.length);for(const [slot] of SLOTS)assert.ok(Object.values(ITEMS).some(it=>it.slot===slot));
  const doll=paperdoll({weapon:'glasswand',robe:'ashrobe',head:'moonhood',focus:'tidefocus',charm:'moonring',boots:'snowboots'});assert.ok(!doll.includes('undefined'));});
test('character sheet numbers follow equipment',()=>{
  const base=characterStats(1,{}),geared=characterStats(1,gearTotals({weapon:'glasswand',robe:'ashrobe',boots:'snowboots'}));
  assert.equal(base.hp,100);assert.equal(base.fire,16);assert.ok(Math.abs(base.fireDps-16/.24)<1e-9);
  assert.equal(geared.hp,140);assert.ok(Math.abs(geared.power-1.22)<1e-9);assert.ok(Math.abs(geared.move-8.4)<1e-9);assert.equal(geared.armor,.06);
  assert.equal(statText('armor',.12),'−12% Damage taken');assert.equal(statText('hp',20),'+20 Health');assert.equal(itemRarity('twig'),0);assert.equal(itemRarity('embercrown'),4);
});
