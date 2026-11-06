// HDR post chain: MSAA scene -> bloom -> screen-space god rays -> Fey grade
// (AgX filmic, vibrance, split toning, vignette, spell/underwater warps).
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const GodRayShader = {
  uniforms: { tDiffuse: { value: null }, uSun: { value: new THREE.Vector2(0.5, 0.5) }, uStrength: { value: 0 }, uColor: { value: new THREE.Color(1, 0.9, 0.8) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec2 uSun; uniform float uStrength; uniform vec3 uColor;
    varying vec2 vUv;
    void main(){
      vec4 base = texture2D(tDiffuse, vUv);
      if (uStrength <= 0.001) { gl_FragColor = base; return; }
      vec2 uv = vUv;
      vec2 delta = (uv - uSun) / 48.0 * 0.92;
      float illum = 1.0;
      vec3 acc = vec3(0.0);
      float dither = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
      uv -= delta * dither;
      for (int i = 0; i < 48; i++){
        uv -= delta;
        vec3 s = texture2D(tDiffuse, uv).rgb;
        float l = max(dot(s, vec3(0.3, 0.59, 0.11)) - 1.6, 0.0);
        float near = smoothstep(0.55, 0.0, length(uv - uSun));
        float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
        acc += min(s, vec3(12.0)) * min(l, 6.0) * illum * near * inside;
        illum *= 0.955;
      }
      gl_FragColor = vec4(base.rgb + acc * uColor * uStrength * 0.0055, base.a);
    }`,
};

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uExposure: { value: 1.0 },
    uSaturation: { value: 1.05 },
    uVibrance: { value: 0.25 },
    uContrast: { value: 1.06 },
    uTint: { value: new THREE.Color(1, 1, 1) },
    uShadowTint: { value: new THREE.Color(0.92, 0.95, 1.08) },
    uHighTint: { value: new THREE.Color(1.05, 1.0, 0.95) },
    uVignette: { value: 0.28 },
    uTime: { value: 0 },
    uHaste: { value: 0 },
    uWarp: { value: 0 },
    uFlash: { value: 0 },
    uFlashColor: { value: new THREE.Color(1, 1, 1) },
    uUnderwater: { value: 0 },
    uHeat: { value: 0 },
    uFly: { value: 0 },
    uAspect: { value: 1 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uExposure, uSaturation, uVibrance, uContrast, uVignette, uTime, uHaste, uWarp, uFlash, uUnderwater, uHeat, uFly, uAspect;
    uniform vec3 uTint, uShadowTint, uHighTint, uFlashColor;
    varying vec2 vUv;
    // AgX filmic tone mapping (Blender/Filament) — graceful highlight roll-off
    vec3 agxContrast(vec3 x){ vec3 x2 = x * x; vec3 x4 = x2 * x2; return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232; }
    vec3 AgX(vec3 color){
      const mat3 toRec2020 = mat3(vec3(0.6274, 0.0691, 0.0164), vec3(0.3293, 0.9195, 0.0880), vec3(0.0433, 0.0113, 0.8956));
      const mat3 fromRec2020 = mat3(vec3(1.6605, -0.1246, -0.0182), vec3(-0.5876, 1.1329, -0.1006), vec3(-0.0728, -0.0083, 1.1187));
      const mat3 inset = mat3(vec3(0.856627153315983, 0.137318972929847, 0.11189821299995), vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903), vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859));
      const mat3 outset = mat3(vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826), vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294), vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405));
      color = inset * (toRec2020 * color);
      color = clamp((log2(max(color, 1e-10)) + 12.47393) / 16.5, 0.0, 1.0);
      color = agxContrast(color);
      // look: between AgX base and 'punchy' — rich, filmic, not garish
      color = pow(max(color, 0.0), vec3(1.28));
      float lu = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = lu + 1.32 * (color - lu);
      color = pow(max(outset * color, 0.0), vec3(2.2));
      return clamp(fromRec2020 * color, 0.0, 1.0);
    }
    float h12(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    void main(){
      vec2 uv = vUv;
      vec2 cc = uv - 0.5;
      float r = length(cc * vec2(uAspect, 1.0));
      // teleport warp: pinch & swirl
      if (uWarp > 0.001){
        float a = uWarp * 2.5 * smoothstep(0.9, 0.0, r);
        float cs = cos(a), sn = sin(a);
        cc = mat2(cs, -sn, sn, cs) * cc * (1.0 - uWarp * 0.35 * smoothstep(0.8, 0.0, r));
        uv = cc + 0.5;
      }
      // underwater / heat shimmer
      if (uUnderwater > 0.001) uv += vec2(sin(uv.y * 30.0 + uTime * 2.0), cos(uv.x * 25.0 + uTime * 1.7)) * 0.003 * uUnderwater;
      if (uHeat > 0.001) uv += vec2(sin(uv.y * 60.0 + uTime * 8.0), 0.0) * 0.002 * uHeat;
      // haste / flight radial blur + chromatic aberration
      vec3 col;
      float blur = uHaste * 0.014 + uFly * 0.01;
      if (blur > 0.0005){
        vec3 acc = vec3(0.0);
        vec2 dir = (uv - 0.5);
        float edge = smoothstep(0.15, 0.7, r);
        for (int i = 0; i < 8; i++){
          float t = float(i) / 7.0;
          vec2 o = dir * blur * t * edge;
          acc.r += texture2D(tDiffuse, uv - o * 1.1).r;
          acc.g += texture2D(tDiffuse, uv - o).g;
          acc.b += texture2D(tDiffuse, uv - o * 0.9).b;
        }
        col = acc / 8.0;
      } else {
        col = texture2D(tDiffuse, uv).rgb;
      }
      col *= uExposure * uTint;
      if (uUnderwater > 0.001){
        float dep = uUnderwater;
        col = mix(col, col * vec3(0.25, 0.75, 0.85) + vec3(0.01, 0.05, 0.07), dep);
      }
      if (uHeat > 0.001) col = mix(col, col * vec3(1.3, 0.75, 0.55) + vec3(0.2, 0.03, 0.0), uHeat * 0.3);
      col = AgX(col);
      // grade (display-referred)
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      // vibrance: lift muted colours more than already-rich ones (keeps accents jewel-like, base natural)
      float cmax = max(col.r, max(col.g, col.b)), cmin = min(col.r, min(col.g, col.b));
      float csat = (cmax - cmin) / max(cmax, 1e-4);
      col = mix(vec3(l), col, uSaturation * (1.0 + uVibrance * (1.0 - csat)));
      // split toning: cool shadows, gilded highlights
      col = mix(col * uShadowTint, col * uHighTint, smoothstep(0.05, 0.75, l));
      // gentle S-curve around mid grey (rich but not crushed blacks)
      vec3 sc = col - 0.18;
      col = 0.18 + sc * uContrast / (1.0 + max(sc, 0.0) * (uContrast - 1.0) * 1.2);
      col = max(col, 0.0);
      // haste speed lines
      if (uHaste > 0.001){
        float ang = atan(cc.y, cc.x);
        float lines = step(0.994, h12(vec2(floor(ang * 90.0), floor(uTime * 14.0))));
        col += vec3(1.0, 0.95, 0.85) * lines * smoothstep(0.5, 0.85, r) * uHaste * 0.06;
      }
      // vignette
      col *= 1.0 - uVignette * smoothstep(0.35, 1.05, r);
      col = clamp(col, 0.0, 1.0);
      col = mix(col, uFlashColor, clamp(uFlash, 0.0, 1.0));
      col = toSRGB(col);
      col += (h12(vUv * 1000.0 + uTime) - 0.5) / 255.0;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export class Post {
  constructor(renderer, scene, camera, quality) {
    this.renderer = renderer;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: quality === 'low' ? 0 : 4 });
    this.composer = new EffectComposer(renderer, rt);
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.55, 0.5, 2.0);
    this.composer.addPass(this.bloom);
    this.godrays = new ShaderPass(GodRayShader);
    this.godraysEnabled = quality !== 'low';
    this.composer.addPass(this.godrays);
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
    this.u = this.grade.uniforms;
  }
  setSize(w, h) {
    this.composer.setSize(w, h);
    this.u.uAspect.value = w / h;
  }
  setPixelRatio(pr) { this.composer.setPixelRatio(pr); }
  render(dt) { this.composer.render(dt); }
}
