import * as THREE from 'three';
// Canopies are drawn exactly once. Only the wood switches detail levels.
export const TREE_BLEND=12;
export const TREE_CULL_MARGIN=8;
export const forestRange=viewDistance=>Math.min(350,viewDistance+65);
export function treeGeometry(source,canopy){
  const geometry=new THREE.BufferGeometry(),indices=[];
  for(const [name,attribute] of Object.entries(source.attributes))geometry.setAttribute(name,attribute);
  for(const group of source.groups){
    if((group.materialIndex!==0)!==canopy)continue;
    const start=indices.length;
    for(let i=group.start;i<group.start+group.count;i++)indices.push(source.index.getX(i));
    geometry.addGroup(start,group.count,group.materialIndex);
  }
  geometry.setIndex(indices);geometry.computeBoundingSphere();return geometry;
}
export function forestMaterial(source,uniforms,near=null){
  const material=source.clone(),compile=source.onBeforeCompile,key=source.customProgramCacheKey();
  material.onBeforeCompile=shader=>{
    compile.call(source,shader);
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader='varying float vTreeDistance;varying vec3 vTreeLocal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vTreeDistance=length((modelMatrix*instanceMatrix[3]).xz-cameraPosition.xz);vTreeLocal=position;`);
    shader.fragmentShader='uniform float treeDetail;uniform float treeRange;varying float vTreeDistance;varying vec3 vTreeLocal;\n'+shader.fragmentShader;
    if(near!==null)shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`#include <alphatest_fragment>
      float grain=fract(sin(dot(floor(vTreeLocal*18.),vec3(12.9898,78.233,37.719)))*43758.5453);
      float detail=1.-smoothstep(treeDetail-${TREE_BLEND.toFixed(1)},treeDetail+${TREE_BLEND.toFixed(1)},vTreeDistance);
      if(${near?'grain>=detail':'grain<detail'})discard;`);
    // Let silhouettes recede into the haze at the outer cull boundary, without
    // poking holes in the canopy or exposing branches as leaves fade away.
    shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',`#include <fog_fragment>
      #ifdef USE_FOG
      gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,smoothstep(treeRange-35.,treeRange,vTreeDistance));
      #endif`);
  };
  material.customProgramCacheKey=()=>`${key}-forest-coverage-${near}`;
  return material;
}
