import * as THREE from 'three';
import {makeGroundTextures} from './fey/render/groundTextures.js';
import {biomeAt,terrain,terrainNormal} from './landscape.js';

// A bounded adaptation of Feywild's splat terrain. Eight material layers share two
// texture arrays. Mipmaps + world-space UVs keep the ground stable across chunks.
export function buildGround(world){
  const fallback=[0x677747,0x62513a,0xa4783f,0x8e9293,0xd2dce3,0xb8a580,0x626452,0x565459];
  const albedo=new Uint8Array(32),normal=new Uint8Array(32);
  fallback.forEach((hex,i)=>{const c=new THREE.Color(hex);albedo.set([c.r*255,c.g*255,c.b*255,128],i*4);normal.set([128,128,230,255],i*4);});
  const array=data=>{const t=new THREE.DataArrayTexture(data,1,1,8);t.needsUpdate=true;return t;};
  const uniforms={groundAlbedo:{value:array(albedo)},groundNormal:{value:array(normal)},groundDetailDistance:{value:45},groundNormalDistance:{value:85}};
  world.groundQuality=preset=>{uniforms.groundDetailDistance.value=preset==='low'?0:preset==='high'?95:45;uniforms.groundNormalDistance.value=preset==='low'?45:preset==='high'?110:85;};
  const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.9});
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=`attribute vec4 ground0;attribute vec4 ground1;varying vec4 vGround0;varying vec4 vGround1;varying vec3 vGroundWorld;varying vec3 vGroundNormal;\n`+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vGround0=ground0;vGround1=ground1;vGroundWorld=(modelMatrix*vec4(position,1.)).xyz;vGroundNormal=normal;`);
    shader.fragmentShader=`uniform highp sampler2DArray groundAlbedo;uniform highp sampler2DArray groundNormal;uniform float groundDetailDistance;uniform float groundNormalDistance;
      varying vec4 vGround0;varying vec4 vGround1;varying vec3 vGroundWorld;varying vec3 vGroundNormal;
      vec3 groundWN;float groundRough;float groundDistance;
      void sampleLayer(float layer,vec2 uv,out vec4 alb,out vec4 nrm){
        vec2 dx=dFdx(uv),dy=dFdy(uv);float mixFactor=.5+.5*sin(vGroundWorld.x*.037+sin(vGroundWorld.z*.029)*2.);
        alb=textureGrad(groundAlbedo,vec3(uv,layer),dx,dy);nrm=vec4(.5,.5,.9,1.);
        if(groundDistance<groundNormalDistance)nrm=textureGrad(groundNormal,vec3(uv,layer),dx,dy);
        if(groundDistance<groundDetailDistance){vec4 b=textureGrad(groundAlbedo,vec3(uv+vec2(.37,.61),layer),dx,dy);float t=smoothstep(.2,.8,mixFactor+(b.a-alb.a)*.3);alb=mix(alb,b,t);if(groundDistance<groundNormalDistance)nrm=mix(nrm,textureGrad(groundNormal,vec3(uv+vec2(.37,.61),layer),dx,dy),t);}
      }\n`+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      groundDistance=distance(cameraPosition,vGroundWorld);
      float weights[8]=float[8](vGround0.x,vGround0.y,vGround0.z,vGround0.w,vGround1.x,vGround1.y,vGround1.z,vGround1.w);
      vec3 baseN=normalize(vGroundNormal),colorSum=vec3(0.),normalSum=vec3(0.);float total=0.,roughSum=0.;
      float scales[8]=float[8](.48,.42,.46,.16,.18,.4,.35,.22);
      for(int i=0;i<8;i++){
        float w=weights[i];if(w<.018)continue;vec4 alb,nrm;sampleLayer(float(i),vGroundWorld.xz*scales[i],alb,nrm);
        if(i==3&&baseN.y<.9){vec3 blend=pow(abs(baseN),vec3(4.));blend/=blend.x+blend.y+blend.z;
          alb=alb*blend.y+texture(groundAlbedo,vec3(vGroundWorld.zy*scales[i],3.))*blend.x+texture(groundAlbedo,vec3(vGroundWorld.xy*scales[i],3.))*blend.z;}
        float weight=w*(.65+alb.a*.7);vec3 tint=vec3(1.);
        if(i==0)tint=vec3(.94,1.08,.93);if(i==2)tint=vec3(1.1,.98,.86);
        colorSum+=alb.rgb*tint*weight;normalSum+=vec3(nrm.r*2.-1.,0.,nrm.g*2.-1.)*weight;roughSum+=nrm.b*weight;total+=weight;
      }
      float macro=.92+.08*sin(vGroundWorld.x*.07+sin(vGroundWorld.z*.05)*2.);
      diffuseColor.rgb*=colorSum/max(total,.001)*macro*1.12;
      groundRough=roughSum/max(total,.001);
      groundWN=normalize(baseN+normalSum/max(total,.001)*.9*(1.-smoothstep(25.,groundNormalDistance,groundDistance)));
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(groundRough,.45,1.);');
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=normalize(mat3(viewMatrix)*groundWN);');
  };
  material.customProgramCacheKey=()=> 'feywild-ground-array-v2';
  const tile=104,segments=52;
  for(let tz=-4;tz<4;tz++)for(let tx=-4;tx<4;tx++){
    const geometry=new THREE.PlaneGeometry(tile,tile,segments,segments);geometry.rotateX(-Math.PI/2);
    const pos=geometry.attributes.position,norm=geometry.attributes.normal,a=new Float32Array(pos.count*4),b=new Float32Array(pos.count*4);
    for(let i=0;i<pos.count;i++){const x=pos.getX(i)+(tx+.5)*tile,z=pos.getZ(i)+(tz+.5)*tile,biome=biomeAt(x,z),n=terrainNormal(x,z);pos.setY(i,terrain(x,z));norm.setXYZ(i,n.x,n.y,n.z);a.set(biome.weights.slice(0,4),i*4);b.set(biome.weights.slice(4),i*4);}
    geometry.setAttribute('ground0',new THREE.BufferAttribute(a,4));geometry.setAttribute('ground1',new THREE.BufferAttribute(b,4));geometry.computeBoundingSphere();world.mesh(geometry,material,(tx+.5)*tile,0,(tz+.5)*tile);
  }
  world.groundReady=makeGroundTextures(256).then(textures=>{uniforms.groundAlbedo.value.dispose();uniforms.groundNormal.value.dispose();uniforms.groundAlbedo.value=textures.albedo;uniforms.groundNormal.value=textures.normal;world.groundTexturesLoaded=true;}).catch(error=>{console.error('Ground texture generation failed',error);});
}
