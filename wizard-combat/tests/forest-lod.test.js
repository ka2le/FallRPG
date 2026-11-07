import test from 'node:test';
import assert from 'node:assert/strict';
import {generateTreeKind} from '../src/fey/render/treeGen.js';
import {treeGeometry} from '../src/forest-lod.js';
import {foliageMipmaps} from '../src/foliage-mips.js';

test('persistent canopy and wood partition every triangle without duplicate foliage',()=>{
  for(const kind of ['oak','pine','crystal','mushroom']){
    const {high,low}=generateTreeKind(kind,31),crown=treeGeometry(high,true),wood=treeGeometry(high,false),farWood=treeGeometry(low,false);
    assert.equal(crown.index.count+wood.index.count,high.index.count);
    assert.ok(crown.groups.every(g=>g.materialIndex!==0));
    assert.ok(wood.groups.every(g=>g.materialIndex===0));assert.ok(farWood.groups.every(g=>g.materialIndex===0));
    for(const g of [high,low,crown,wood,farWood])g.dispose();
  }
});

test('fine leaf sprays survive every mip level without dark transparent fringes',()=>{
  const size=64,data=new Uint8ClampedArray(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++)if((x+y)%8<2)data.set([180,220,150,255],(y*size+x)*4);
  const levels=foliageMipmaps(data,size,size);
  assert.deepEqual(levels.map(l=>l.width),[64,32,16,8,4,2,1]);
  for(const level of levels){let covered=0;for(let i=3;i<level.data.length;i+=4){if(level.data[i]>107)covered++;if(level.data[i]>0)assert.ok(level.data[i-2]>=218,'filter foliage color without black alpha bleed');}assert.ok(covered>0,`${level.width}px leaves disappeared`);}
  assert.ok(foliageMipmaps(new Uint8ClampedArray(size*size*4),size,size).every(l=>l.data.every(v=>v===0)));
});

function canopy(geometry,attribute){
  const group=geometry.groups.find(g=>g.materialIndex===1),a=geometry.getAttribute(attribute),out=[];
  for(let i=group.start;i<group.start+group.count;i++){
    const index=geometry.index.getX(i);
    for(let k=0;k<a.itemSize;k++)out.push(a.array[index*a.itemSize+k]);
  }
  return out;
}
test('distant foliage preserves near silhouettes, UVs, normals, and wind weights',()=>{
  for(const kind of ['oak','blossom','willow','maple','pine','crystal']){
    const {high,low}=generateTreeKind(kind,31);
    for(const attribute of ['position','normal','uv','aLeaf'])assert.deepEqual(canopy(low,attribute),canopy(high,attribute),`${kind}: ${attribute}`);
    assert.ok(low.groups[0].count<high.groups[0].count*.7,`${kind} must still simplify its branches`);
    assert.ok(low.index.count<high.index.count);
    high.dispose();low.dispose();
  }
});
