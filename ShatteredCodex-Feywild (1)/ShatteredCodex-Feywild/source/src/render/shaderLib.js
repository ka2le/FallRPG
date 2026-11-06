// Shared uniforms + GLSL snippets + a patcher that injects Feywild lighting
// (terrain-raymarched sun shadows, cloud shadows, terrain AO, seasonal snow
// cover, analytic height fog) into three.js standard materials.
import * as THREE from 'three';

export const G = {
  uTime: { value: 0 },
  uSunDir: { value: new THREE.Vector3(0.3, 0.5, 0.2).normalize() },
  uLightDir: { value: new THREE.Vector3(0.3, 0.5, 0.2).normalize() }, // sun or moon (whichever lights)
  uSunColor: { value: new THREE.Color(1, 0.9, 0.8) },
  uNight: { value: 0 },
  uSkyZenith: { value: new THREE.Color() },
  uSkyHorizon: { value: new THREE.Color() },
  uSunGlow: { value: new THREE.Color() },
  uGroundColor: { value: new THREE.Color() },
  uFogColor: { value: new THREE.Color() },
  uFogSunColor: { value: new THREE.Color() },
  uFogDensity: { value: 0.0012 },
  uFogFalloff: { value: 0.0085 },
  uWindDir: { value: new THREE.Vector2(1, 0.3).normalize() },
  uWind: { value: 0.5 },
  uStorm: { value: 0 },
  uCloudCover: { value: 0.45 },
  uCloudOffset: { value: new THREE.Vector2() },
  uAurora: { value: 0 },
  uHeightTex: { value: null },
  uSeasonTex: { value: null },
  uFeatTex: { value: null },
  uFeat2Tex: { value: null },
  uMiscTex: { value: null },
  uShadowTex: { value: null },
  uNoiseTex: { value: null },
  uWorld: { value: new THREE.Vector4(1024, 1025, 2, 0) },
  uPlayerPos: { value: new THREE.Vector3() },
  uRegionTint: { value: new THREE.Color(1, 1, 1) },
};

export const GLSL_UNIFORMS = /* glsl */`
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uLightDir;
uniform vec3 uSunColor;
uniform float uNight;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;
uniform vec3 uSunGlow;
uniform vec3 uGroundColor;
uniform vec3 uFogColor;
uniform vec3 uFogSunColor;
uniform float uFogDensity;
uniform float uFogFalloff;
uniform vec2 uWindDir;
uniform float uWind;
uniform float uStorm;
uniform float uCloudCover;
uniform vec2 uCloudOffset;
uniform float uAurora;
uniform highp sampler2D uHeightTex;
uniform sampler2D uSeasonTex;
uniform sampler2D uFeatTex;
uniform sampler2D uFeat2Tex;
uniform sampler2D uMiscTex;
uniform sampler2D uShadowTex;
uniform sampler2D uNoiseTex;
uniform vec4 uWorld;
uniform vec3 uPlayerPos;
`;

export const GLSL_COMMON = /* glsl */`
float fHash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 fHash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
vec3 fHash32(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz+33.33); return fract((p3.xxy+p3.yzz)*p3.zyx); }
float fHash13(vec3 p3){ p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
// 4x4 ordered dither in [0,1) for screen-door LOD cross-fades
float feyBayer(vec2 fc){
  ivec2 q = ivec2(mod(fc, 4.0));
  int i = q.x + q.y * 4;
  float m = i == 0 ? 0.0 : i == 1 ? 8.0 : i == 2 ? 2.0 : i == 3 ? 10.0 : i == 4 ? 12.0 : i == 5 ? 4.0 : i == 6 ? 14.0 : i == 7 ? 6.0
          : i == 8 ? 3.0 : i == 9 ? 11.0 : i == 10 ? 1.0 : i == 11 ? 9.0 : i == 12 ? 15.0 : i == 13 ? 7.0 : i == 14 ? 13.0 : 5.0;
  return (m + 0.5) / 16.0;
}

vec2 feyUV(vec2 xz){ return ((xz + uWorld.x) / uWorld.z + 0.5) / uWorld.y; }

float feyHeight(vec2 xz){
  vec2 g = (xz + uWorld.x) / uWorld.z;
  if (g.x < 0.0 || g.y < 0.0 || g.x > uWorld.y - 1.0 || g.y > uWorld.y - 1.0) return -40.0;
  g = clamp(g, vec2(0.0), vec2(uWorld.y - 1.001));
  ivec2 i = ivec2(floor(g)); vec2 f = g - vec2(i);
  float a = texelFetch(uHeightTex, i, 0).r;
  float b = texelFetch(uHeightTex, i + ivec2(1,0), 0).r;
  float c = texelFetch(uHeightTex, i + ivec2(0,1), 0).r;
  float d = texelFetch(uHeightTex, i + ivec2(1,1), 0).r;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
vec4 feyHeightFull(vec2 xz){
  vec2 g = clamp((xz + uWorld.x) / uWorld.z, vec2(0.0), vec2(uWorld.y - 1.001));
  ivec2 i = ivec2(floor(g)); vec2 f = g - vec2(i);
  vec4 a = texelFetch(uHeightTex, i, 0);
  vec4 b = texelFetch(uHeightTex, i + ivec2(1,0), 0);
  vec4 c = texelFetch(uHeightTex, i + ivec2(0,1), 0);
  vec4 d = texelFetch(uHeightTex, i + ivec2(1,1), 0);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
vec4 feySeason(vec2 xz){ return texture(uSeasonTex, feyUV(xz)); }

float feyCloudDensity(vec2 p){
  vec2 uv = p * 0.00011 + uCloudOffset;
  float n = texture(uNoiseTex, uv).r * 0.55 + texture(uNoiseTex, uv * 2.7 + 0.31).g * 0.3 + texture(uNoiseTex, uv * 6.9 + 0.7).a * 0.15;
  float cov = clamp(uCloudCover + uStorm * 0.5, 0.0, 1.0);
  return smoothstep(1.0 - cov, 1.0 - cov + 0.32, n);
}
float feyCloudShadow(vec3 wp){
  vec3 L = uLightDir;
  vec2 p = wp.xz + L.xz / max(L.y, 0.12) * (1800.0 - wp.y);
  return 1.0 - 0.62 * feyCloudDensity(p);
}

vec3 feySkyApprox(vec3 d){
  float h = max(d.y, 0.0);
  vec3 col = mix(uSkyHorizon, uSkyZenith, pow(h, 0.48));
  col = mix(col, uFogColor, exp(-h * 14.0) * 0.55);
  float m = max(dot(d, uSunDir), 0.0);
  col += uSunGlow * (0.22 * pow(m, 3.0) + 0.8 * pow(m, 24.0));
  if (d.y > 0.0){
    float t = 1.0 / (d.y + 0.035);
    vec2 p = d.xz * t * 1800.0 + cameraPosition.xz;
    float dens = feyCloudDensity(p);
    vec3 cc = mix(uSkyZenith, uSkyHorizon, 0.5) * 0.9 + uSunColor * 0.3 * max(uLightDir.y + 0.2, 0.0);
    col = mix(col, cc, dens * smoothstep(0.0, 0.15, d.y) * 0.9);
  }
  col = mix(col, vec3(0.5, 0.52, 0.6) * (0.3 + 0.7 * (1.0 - uNight)), uStorm * 0.6);
  return col;
}

vec3 feyApplyFog(vec3 col, vec3 wp){
  vec3 cam = cameraPosition;
  vec3 d = wp - cam; float dist = length(d); vec3 v = d / max(dist, 1e-4);
  float b = uFogFalloff;
  float k = b * v.y;
  float integral = abs(k) > 1e-5 ? (1.0 - exp(-dist * k)) / k : dist;
  float dens = uFogDensity * (1.0 + uStorm * 7.0);
  float amt = dens * exp(-b * max(cam.y, -20.0)) * integral;
  float f = 1.0 - exp(-amt);
  float sunAmt = pow(max(dot(v, uSunDir), 0.0), 7.0) * (1.0 - uStorm);
  vec3 fc = mix(uFogColor, uFogSunColor, sunAmt);
  fc = mix(fc, vec3(0.5, 0.55, 0.66) * (0.2 + 0.8 * (1.0 - uNight)), uStorm * 0.85);
  return mix(col, fc, clamp(f, 0.0, 1.0));
}
`;

// Vertex world position for instanced/non-instanced
const WORLDPOS_VERT = /* glsl */`
  {
    vec4 feyWP = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      feyWP = instanceMatrix * feyWP;
    #endif
    feyWP = modelMatrix * feyWP;
    vFeyWorld = feyWP.xyz;
  }
`;

let lightsChunk = null;
function getLightsChunk() {
  if (lightsChunk) return lightsChunk;
  const src = THREE.ShaderChunk.lights_fragment_begin;
  const needle = 'getDirectionalLightInfo( directionalLight, directLight );';
  if (!src.includes(needle)) console.warn('Fey: lights chunk layout changed');
  lightsChunk = src.replace(needle, needle + '\n\t\tdirectLight.color *= feySunVis;');
  return lightsChunk;
}

/**
 * Patch a three.js material with Feywild world lighting.
 * opts: { key, uniforms, vertexHead, vertexBegin, vertexNormal, fragHead, fragColor (runs after map/color),
 *         fragEmissive (after emissive), snow (0..1), ao (bool), noInstanceColor,
 *         fade (bool: per-instance `instanceFade` attribute drives a dithered LOD cross-fade) }
 */
export function feyPatch(mat, opts = {}) {
  const snow = opts.snow ?? 1.0;
  const fade = !!opts.fade;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    Object.assign(shader.uniforms, G, opts.uniforms || {});
    let vs = shader.vertexShader;
    let fs = shader.fragmentShader;
    vs = GLSL_UNIFORMS + 'varying vec3 vFeyWorld;\n' + GLSL_COMMON + (fade ? 'attribute float instanceFade;\nvarying float vFeyFade;\n' : '') + (opts.vertexHead || '') + vs;
    if (opts.vertexNormal) vs = vs.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n' + opts.vertexNormal);
    if (opts.vertexBegin) vs = vs.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + opts.vertexBegin);
    if (opts.noInstanceColor) vs = vs.replace('#include <color_vertex>', '#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )\nvColor = vec4( 1.0 );\n#endif\n#ifdef USE_COLOR_ALPHA\nvColor *= color;\n#elif defined( USE_COLOR )\nvColor.rgb *= color;\n#endif');
    vs = vs.replace('#include <fog_vertex>', '#include <fog_vertex>\n' + WORLDPOS_VERT + (fade ? 'vFeyFade = instanceFade;\n' : '') + (opts.vertexEnd || ''));

    fs = GLSL_UNIFORMS + 'varying vec3 vFeyWorld;\n' + GLSL_COMMON + (fade ? 'varying float vFeyFade;\n' : '') + (opts.fragHead || '') + fs;
    if (fade) fs = fs.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n  if (feyBayer(gl_FragCoord.xy) >= vFeyFade) discard;');
    if (opts.fragMap) fs = fs.replace('#include <map_fragment>', opts.fragMap);
    if (opts.fragColor) fs = fs.replace('#include <color_fragment>', '#include <color_fragment>\n' + opts.fragColor);
    const snowCode = snow > 0 ? `
      {
        vec3 feyWN = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
        vec4 feyS = feySeason(vFeyWorld.xz);
        float feyAlt = smoothstep(150.0, 230.0, vFeyWorld.y);
        float feySnow = clamp(feyS.w * 1.25 - 0.2 + feyAlt * 0.8, 0.0, 1.0) * ${snow.toFixed(3)};
        float feyN = texture(uNoiseTex, vFeyWorld.xz * 0.11).g;
        feySnow *= smoothstep(0.35 - feySnow * 0.3, 0.75 - feySnow * 0.25, feyWN.y + (feyN - 0.5) * 0.35);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78, 0.83, 0.9), feySnow);
        roughnessFactor = mix(roughnessFactor, 0.55, feySnow);
      }` : '';
    fs = fs.replace('#include <emissivemap_fragment>', `
      float feySunVis = 1.0;
      {
        vec4 feySh = texture(uShadowTex, feyUV(vFeyWorld.xz));
        float feyAbove = clamp((vFeyWorld.y - feyHeight(vFeyWorld.xz)) / 25.0, 0.0, 1.0);
        feySunVis = mix(feySh.r, 1.0, feyAbove) * feyCloudShadow(vFeyWorld);
      }
      ${snowCode}
      #include <emissivemap_fragment>
      ${opts.fragEmissive || ''}
    `);
    fs = fs.replace('#include <lights_fragment_begin>', getLightsChunk());
    fs = fs.replace('#include <aomap_fragment>', `#include <aomap_fragment>
      {
        vec4 feySh2 = texture(uShadowTex, feyUV(vFeyWorld.xz));
        float feyAbove2 = clamp((vFeyWorld.y - feyHeight(vFeyWorld.xz)) / 30.0, 0.0, 1.0);
        float feyAO = mix(feySh2.g, 1.0, feyAbove2);
        ${opts.aoExtra || ''}
        reflectedLight.indirectDiffuse *= feyAO;
        reflectedLight.indirectSpecular *= feyAO;
      }`);
    fs = fs.replace('#include <fog_fragment>', 'gl_FragColor.rgb = feyApplyFog(gl_FragColor.rgb, vFeyWorld);');
    shader.vertexShader = vs;
    shader.fragmentShader = fs;
    if (opts.onShader) opts.onShader(shader);
    if (prev) prev(shader, renderer);
  };
  mat.customProgramCacheKey = () => 'fey-' + (opts.key || mat.type) + '-' + snow + (fade ? '-fade' : '');
  return mat;
}

// Wind sway snippet for foliage (operates on `transformed`, needs instanceMatrix optional)
export const WIND_VERT = /* glsl */`
  {
    vec3 feyBase = vec3(0.0);
    #ifdef USE_INSTANCING
      feyBase = instanceMatrix[3].xyz;
    #endif
    float feyPh = dot(feyBase.xz, vec2(0.13, 0.17));
    float hN = max(transformed.y, 0.0);
    float sway = (sin(uTime * 1.3 + feyPh) * 0.6 + sin(uTime * 2.1 + feyPh * 1.7) * 0.3) * (0.3 + uWind + uStorm * 1.5);
    float bend = hN * hN * 0.0022;
    transformed.xz += uWindDir * sway * bend * 4.0;
    #ifdef FEY_LEAF
      float fl = sin(uTime * 6.0 + dot(transformed, vec3(1.7, 2.3, 1.1)) + feyPh) * 0.06 * (0.5 + uWind + uStorm);
      transformed += vec3(fl, fl * 0.6, -fl) * aLeaf;
    #endif
  }
`;

// Sprites (monsters, villagers, critters) lit by the Feywild sky and wrapped in its height fog.
export const uSpriteLight = { value: new THREE.Color(1, 1, 1) };
export function feySprite(mat) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, G, { uSpriteLight });
    shader.vertexShader = GLSL_UNIFORMS + 'varying vec3 vFeyWorld;\n' + GLSL_COMMON + shader.vertexShader.replace('#include <fog_vertex>', '#include <fog_vertex>\n  vFeyWorld = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;');
    shader.fragmentShader = GLSL_UNIFORMS + 'varying vec3 vFeyWorld;\nuniform vec3 uSpriteLight;\n' + GLSL_COMMON + shader.fragmentShader
      .replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\n  diffuseColor.rgb *= uSpriteLight;')
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\n  gl_FragColor.rgb = feyApplyFog(gl_FragColor.rgb, vFeyWorld);');
  };
  mat.customProgramCacheKey = () => 'feysprite';
  mat.fog = false;
  return mat;
}
