import * as THREE from 'three';
import { N } from '../world/constants.js';
import { G } from './shaderLib.js';

function dataTex(data, format, type, filter = THREE.LinearFilter) {
  const t = new THREE.DataTexture(data, N, N, format, type);
  t.magFilter = filter; t.minFilter = filter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

export function createWorldTextures(W) {
  const NN = N * N;
  const hd = new Float32Array(NN * 4);
  for (let i = 0; i < NN; i++) {
    hd[i * 4] = W.height[i];
    hd[i * 4 + 1] = W.waterKind[i] ? W.waterH[i] : -1000;
    hd[i * 4 + 2] = W.waterType[i];
    hd[i * 4 + 3] = W.waterKind[i];
  }
  const heightTex = dataTex(hd, THREE.RGBAFormat, THREE.FloatType, THREE.NearestFilter);
  const s8 = new Uint8Array(NN * 4);
  for (let i = 0; i < NN * 4; i++) s8[i] = Math.round(W.season[i] * 255);
  const seasonTex = dataTex(s8, THREE.RGBAFormat, THREE.UnsignedByteType);
  const featTex = dataTex(W.feat, THREE.RGBAFormat, THREE.UnsignedByteType);
  const feat2Tex = dataTex(W.feat2, THREE.RGBAFormat, THREE.UnsignedByteType);
  const miscTex = dataTex(W.misc, THREE.RGBAFormat, THREE.UnsignedByteType);
  G.uHeightTex.value = heightTex;
  G.uSeasonTex.value = seasonTex;
  G.uFeatTex.value = featTex;
  G.uFeat2Tex.value = feat2Tex;
  G.uMiscTex.value = miscTex;
  return { heightTex, seasonTex, featTex, feat2Tex, miscTex };
}
