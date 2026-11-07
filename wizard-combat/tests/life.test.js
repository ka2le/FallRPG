import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENERY,CAMPS} from '../src/data.js';
import {LIFE_RANGE} from '../src/life-layout.js';
import {lifeGeometry} from '../src/life-render.js';
import {waterDistance,pathDistance,terrain,biomeAt} from '../src/landscape.js';
import {clearBody} from '../src/physics.js';

test('world details are bounded and travel stops occupy usable land across the courts',()=>{
  const {items,sites,cover}=SCENERY.life;
  assert.ok(items.length>7000&&items.length<16000);
  assert.ok(sites.length>=10&&sites.length<=14);
  assert.equal(new Set(sites.map(s=>s.court)).size,4);
  for(const site of sites){
    assert.ok(waterDistance(site.x,site.z)>10);
    assert.ok(pathDistance(site.x,site.z)>11&&pathDistance(site.x,site.z)<19);
    assert.ok(CAMPS.every(c=>Math.hypot(c.x-site.x,c.z-site.z)>28));
    if(site.kind==='boundary store')assert.ok(biomeAt(site.x,site.z).seasons.filter(w=>w>=.12).length>=2);
    if(site.kind==='seed courier stop')assert.ok(clearBody(site.x,site.z,terrain(site.x,site.z),.42),'shelter entrance stays open');
  }
  for(const c of cover)assert.ok(!clearBody(c.x,c.z,c.base+.2,.1,.5),'solid posts and caches participate in collision');
  for(const item of items)assert.ok(Number.isFinite(item.y)&&LIFE_RANGE[item.kind]&&item.range<=260);
});

test('decoration prefabs have a small triangle budget and no alpha-dependent surfaces',()=>{
  for(const kind of Object.keys(LIFE_RANGE)){
    const g=lifeGeometry(kind),count=g.index?g.index.count:g.attributes.position.count;
    assert.ok(count/3<700,`${kind}: ${count/3} triangles`);
    assert.ok(g.attributes.color.count===g.attributes.position.count);
    assert.ok(g.attributes.position.array.every(Number.isFinite));g.dispose();
  }
});
