// GPU heightfield shadows & ambient occlusion.
// Every surface in the world samples one texture for "is the sun (or moon)
// blocked by terrain here?" computed by ray-marching the heightmap toward the
// light with penumbra estimation — mountains cast long, soft evening shadows
// across the whole 2 km world, far beyond the reach of the shadow map.
import * as THREE from 'three';
import { N } from '../world/constants.js';
import { G } from './shaderLib.js';

const VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const HEAD = /* glsl */`
uniform sampler2D uH;
uniform vec4 uWorld;
varying vec2 vUv;
float hAt(vec2 xz){
  vec2 uv = ((xz + uWorld.x) / uWorld.z + 0.5) / uWorld.y;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return -30.0;
  return texture(uH, uv).r;
}
vec2 texelWorld(){ return (vUv * uWorld.y - 0.5) * uWorld.z - uWorld.x; }
`;

export class TerrainShadow {
  constructor(renderer, W) {
    this.renderer = renderer;
    const NN = N * N;
    const hh = new Uint16Array(NN * 2);
    for (let i = 0; i < NN; i++) {
      hh[i * 2] = THREE.DataUtils.toHalfFloat(W.height[i]);
      const top = W.waterKind[i] ? Math.max(W.height[i], W.waterH[i]) : W.height[i];
      hh[i * 2 + 1] = THREE.DataUtils.toHalfFloat(top);
    }
    this.hTex = new THREE.DataTexture(hh, N, N, THREE.RGFormat, THREE.HalfFloatType);
    this.hTex.magFilter = this.hTex.minFilter = THREE.LinearFilter;
    this.hTex.needsUpdate = true;
    const rtOpts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, generateMipmaps: false };
    this.aoRT = new THREE.WebGLRenderTarget(N, N, rtOpts);
    this.rt = new THREE.WebGLRenderTarget(N, N, rtOpts);
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);

    this.aoMat = new THREE.ShaderMaterial({
      uniforms: { uH: { value: this.hTex }, uWorld: G.uWorld },
      vertexShader: VERT,
      fragmentShader: HEAD + /* glsl */`
      void main(){
        vec2 xz = texelWorld();
        float h = texture(uH, vUv).g;
        float ao = 0.0;
        for (int k = 0; k < 12; k++){
          float a = float(k) / 12.0 * 6.2831853 + 0.3;
          vec2 d = vec2(cos(a), sin(a));
          float ms = 0.0;
          float r = 3.0;
          for (int j = 0; j < 7; j++){
            float s = (hAt(xz + d * r) - h) / r;
            ms = max(ms, s);
            r *= 1.9;
          }
          ao += 1.0 - atan(ms) / 1.5707963;
        }
        ao /= 12.0;
        ao = clamp(pow(ao, 1.6) * 1.08, 0.0, 1.0);
        gl_FragColor = vec4(ao, ao, ao, 1.0);
      }`,
    });
    this.shMat = new THREE.ShaderMaterial({
      uniforms: { uH: { value: this.hTex }, uAO: { value: this.aoRT.texture }, uWorld: G.uWorld, uL: { value: new THREE.Vector3(0, 1, 0) } },
      vertexShader: VERT,
      fragmentShader: HEAD + /* glsl */`
      uniform sampler2D uAO;
      uniform vec3 uL;
      void main(){
        vec2 xz = texelWorld();
        float h = texture(uH, vUv).g + 0.6;
        float sh = 1.0;
        if (uL.y <= 0.0) sh = 0.0;
        else {
          float lxz = max(length(uL.xz), 1e-3);
          vec2 d = uL.xz / lxz;
          float slope = uL.y / lxz;
          float t = 2.5;
          for (int i = 0; i < 64; i++){
            float rayH = h + t * slope;
            if (rayH > 420.0) break;
            float th = hAt(xz + d * t);
            sh = min(sh, 7.0 * (rayH - th) / t + 0.35);
            if (sh <= 0.0) break;
            t = t * 1.09 + 1.4;
          }
          sh = smoothstep(0.0, 1.0, clamp(sh, 0.0, 1.0));
          sh *= smoothstep(-0.02, 0.06, uL.y);
        }
        float ao = texture(uAO, vUv).r;
        gl_FragColor = vec4(sh, ao, 0.0, 1.0);
      }`,
    });
    this.lastL = new THREE.Vector3(9, 9, 9);
    // AO once
    this._render(this.aoMat, this.aoRT);
    G.uShadowTex.value = this.rt.texture;
  }

  _render(mat, rt) {
    this.quad.material = mat;
    const prev = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(rt);
    this.renderer.render(this.scene, this.cam);
    this.renderer.setRenderTarget(prev);
  }

  update(lightDir, force = false) {
    if (!force && lightDir.distanceTo(this.lastL) < 0.004) return;
    this.lastL.copy(lightDir);
    this.shMat.uniforms.uL.value.copy(lightDir);
    this._render(this.shMat, this.rt);
  }
}
