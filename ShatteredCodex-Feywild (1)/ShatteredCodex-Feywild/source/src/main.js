// The Shattered Codex × Feywild
// Feywild renderer + procedural world, driving the Shattered Codex gameplay
// (quests, villages, monsters, loot, leveling, spellbook, inventory).
import './codex/globals.js';
import './codex/util.js';
import './codex/data.js';
import './codex/textures.js';
import './codex/items.js';
import './codex/art.js';
import './codex/fx.js';
import './codex/entities.js';
import './codex/player.js';
import './codex/spells.js';
import './codex/quests.js';
import './codex/ui.js';
import * as THREE from 'three';
import { generateWorld } from './world/terrainGen.js';
import { WorldQuery } from './world/worldQuery.js';
import { hashString, smoothstep, lerp } from './core/rng.js';
import { G as UNI, feySprite, uSpriteLight } from './render/shaderLib.js';
import { makeNoiseTexture, makeDetailTexture, makeWaterNormalTexture, makeParticleAtlas, makeSingleLeafTexture, makeFlowerTexture } from './render/textures.js';
import { createWorldTextures } from './render/worldTextures.js';
import { makeGroundTextures } from './render/groundTextures.js';
import { Sky } from './render/sky.js';
import { Terrain } from './render/terrain.js';
import { TerrainShadow } from './render/terrainShadow.js';
import { Water } from './render/water.js';
import { Forest } from './render/forest.js';
import { Props } from './render/props.js';
import { GroundCover, setCoverViewport } from './render/groundCover.js';
import { AmbientParticles, SpellFX } from './render/particles.js';
import { Post } from './render/post.js';
import { Audio } from './game/audio.js';
import { Player as Body } from './game/player.js';
import { ICONS } from './ui/icons.js';
import { setupWorld, buildScene } from './codex/worldAdapter.js';
import { Staff } from './codex/staff.js';
import { setupBody } from './codex/bodyLink.js';

const CG = window.G;
const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'feycodex_save_v1';
// grass: LOD rings [spacing, outer radius, blade segments, width multiplier]
const QUALITY = {
  low: { pr: 0.75, shadow: 1024, shadowRange: 70, grass: [[0.24, 16, 4, 1.0], [0.48, 38, 2, 1.8]], flowers: [1.4, 35], litter: [0.65, 24], particles: 0.5, tex: 512 },
  medium: { pr: 1.0, shadow: 2048, shadowRange: 95, grass: [[0.21, 18, 5, 1.0], [0.38, 40, 3, 1.5], [0.75, 75, 2, 2.3]], flowers: [1.1, 45], litter: [0.5, 30], particles: 0.75, tex: 512 },
  high: { pr: Math.min(devicePixelRatio, 1.25), shadow: 4096, shadowRange: 115, grass: [[0.2, 22, 5, 1.0], [0.36, 46, 3, 1.5], [0.7, 95, 2, 2.3]], flowers: [0.95, 60], litter: [0.45, 38], particles: 1, tex: 1024 },
  ultra: { pr: Math.min(devicePixelRatio, 2), shadow: 4096, shadowRange: 150, grass: [[0.17, 26, 5, 1.0], [0.3, 55, 3, 1.5], [0.6, 125, 2, 2.2]], flowers: [0.8, 75], litter: [0.4, 46], particles: 1.3, tex: 1024 },
};
// concentric LOD rings; each border cross-fades over a band both rings share
function ringsFrom(list) {
  const out = [];
  let r0 = 0, bandIn = 0;
  list.forEach(([spacing, r1, segments, widthMul], i) => {
    const last = i === list.length - 1;
    const bandOut = last ? r1 * 0.3 : r1 * 0.22;
    out.push({ spacing, r0, r1, segments, widthMul, bandIn, bandOut });
    r0 = r1; bandIn = bandOut;
  });
  return out;
}

class LightPool {
  constructor(scene, n) {
    this.lights = [];
    for (let i = 0; i < n; i++) { const l = new THREE.PointLight(0xffffff, 0, 0, 2); l.userData.busy = false; scene.add(l); this.lights.push(l); }
  }
  get() { const l = this.lights.find((x) => !x.userData.busy); if (l) { l.userData.busy = true; l.intensity = 0; } return l || null; }
  free(l) { if (!l) return; l.userData.busy = false; l.intensity = 0; }
}
const rnd = (a, b) => a + Math.random() * (b - a);
const NULL_INPUT = { mouseDX: 0, mouseDY: 0, down: () => false, pressed: new Set() };

CG.now = 0; CG.started = false; CG.lightLevel = 1; CG.ICONS = ICONS; CG.feySprite = feySprite;
CG.hasSave = () => { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } };
const loadSave = () => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; } };
let worldSeed = 'codex';
CG.save = function () {
  if (!CG.started || CG.P.dead) return;
  const data = { v: 1, seed: worldSeed, quality: $('quality').value, t: Date.now(), now: CG.now, time: CG.W.time, player: CG.P.serialize(), quests: CG.Quests.state, S: CG.S };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { console.warn('save failed', e); }
};

function title() {
  const save = CG.hasSave() ? loadSave() : null;
  if (save) {
    $('btnContinue').style.display = '';
    if (save.quality && $('quality').querySelector(`option[value="${save.quality}"]`)) $('quality').value = save.quality;
  }
  $('titleHelp').innerHTML = CG.UI.helpHtml();
  $('btnNew').onclick = () => {
    if (CG.hasSave() && !confirm('Start a new game? Your saved progress will be overwritten.')) return;
    start(null, $('seed').value.trim() || 'codex');
  };
  $('btnContinue').onclick = () => start(save, save.seed || 'codex');
}

let starting = false;
async function start(save, seedStr) {
  if (starting) return; starting = true;
  worldSeed = seedStr;
  const quality = $('quality').value;
  const Q = QUALITY[quality];
  $('titleBtns').style.display = 'none'; $('titleOpts').style.display = 'none'; $('titleHelp').style.display = 'none';
  $('loadWrap').style.display = '';
  const progress = (msg, p) => { $('loadText').textContent = msg + '…'; $('loadBar').style.width = `${Math.round(p * 100)}%`; };
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const audio = new Audio();
  audio.init();

  // ---------------------------------------------------------------- renderer
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
  renderer.setPixelRatio(Q.pr);
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  $('game').appendChild(renderer.domElement);

  // ---------------------------------------------------------------- world
  const sites = CG.VILLAGES.map((v) => ({ id: v.id, x: v.x, z: v.z, hub: v.id === 'brightwater' }));
  const W = await generateWorld(hashString(seedStr), { quality, sites }, progress);
  const query = new WorldQuery(W);
  setupWorld(W, query);
  progress('Spinning fey threads into textures', 0.8); await tick();
  UNI.uNoiseTex.value = makeNoiseTexture(256, hashString(seedStr) % 1000 + 3);
  const detailTex = makeDetailTexture(512, 21);
  const waterNormal = makeWaterNormalTexture(256, 99);
  const particleAtlas = makeParticleAtlas();
  const leafAtlas = makeSingleLeafTexture();
  const flowerAtlas = makeFlowerTexture();
  createWorldTextures(W);
  const ground = await makeGroundTextures(Q.tex, (name, p) => progress(`Painting ${name}`, 0.81 + p * 0.04));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 12000);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  CG.camera = camera; CG.scene = scene; CG.renderer = renderer;
  const sky = new Sky(renderer, scene);
  sky.setShadowQuality(Q.shadow, Q.shadowRange);
  Object.defineProperty(CG.W, 'time', { get: () => ((sky.timeOfDay - 6) / 24 + 1) % 1, set: (v) => { sky.timeOfDay = ((v * 24 + 6) % 24 + 24) % 24; }, configurable: true });

  progress('Shaping the land', 0.86); await tick();
  const terrain = new Terrain(W, detailTex, ground);
  scene.add(terrain.group);
  const tshadow = new TerrainShadow(renderer, W);
  const water = new Water(W, waterNormal, detailTex);
  scene.add(water.group);

  progress('Raising villages, shrines and monster lairs', 0.88); await tick();
  buildScene(scene);
  // clear vegetation where people live, fight and walk
  W.trees = W.trees.filter((t) => !CG.W.isCleared(t.x, t.z));
  W.props = W.props.filter((p) => p.kind !== 'stone' && (p.kind === 'pylon' || !CG.W.isCleared(p.x, p.z)));

  progress('Growing trees, giant blooms and toadstools', 0.9); await tick();
  progress('Baking distant tree impostors', 0.905); await tick();
  const forest = new Forest(W, query, quality, renderer, camera);
  forest.shadowRadius = Q.shadowRange * 1.25;
  scene.add(forest.group);
  const props = new Props(W, query, ground);
  scene.add(props.group);
  progress('Sowing grass and wildflowers', 0.92); await tick();
  const cover = [];
  const grassRings = ringsFrom(Q.grass);
  cover.push(new GroundCover({ type: 'grass', rings: grassRings, query }));
  cover.push(new GroundCover({ type: 'flower', rings: [{ spacing: Q.flowers[0], r0: 0, r1: Q.flowers[1], bandOut: Q.flowers[1] * 0.28 }], atlas: flowerAtlas, query }));
  cover.push(new GroundCover({ type: 'litter', rings: [{ spacing: Q.litter[0], r0: 0, r1: Q.litter[1], bandOut: Q.litter[1] * 0.28 }], atlas: leafAtlas, query }));
  for (const c of cover) scene.add(c.mesh);
  terrain.uGrassEnd.value = grassRings[grassRings.length - 1].r1;
  const ambient = new AmbientParticles(particleAtlas, leafAtlas, Q.particles);
  scene.add(ambient.group);

  progress('Summoning creatures', 0.94); await tick();
  const fx = new SpellFX(particleAtlas);
  scene.add(fx.group);
  const lights = new LightPool(scene, 6);
  const post = new Post(renderer, scene, camera, quality);
  const body = new Body(query, camera);
  CG.fey = { fx, lights, post, camera, audio, body, sky, query };
  CG.FX.init(scene); CG.E.init(scene); CG.SP.init(scene); CG.UI.init();
  CG.Input.init($('touchLayer'));
  const staff = new Staff(camera);

  // view distance setting from the pause menu
  let viewK = 1;
  CG.applyView = () => { viewK = CG.settings.viewDist || 1; forest.loDist = 1900 * viewK; };
  CG.applyView();

  const onResize = () => {
    CG.labelK = Math.max(1, Math.min(1.9, 620 / innerHeight));
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    post.setSize(innerWidth, innerHeight);
    CG.FX.resize(innerHeight * renderer.getPixelRatio(), camera.fov);
  };
  onResize(); addEventListener('resize', onResize);

  // ---------------------------------------------------------------- sound & feel hooks
  const SP = CG.SP;
  const origCast = SP.cast;
  SP.cast = function (id) {
    const wasFlying = CG.P.flying;
    const ok = origCast.call(this, id);
    if (ok) {
      const d = SP.defs[id];
      staff.cast(SP.SCH_COL[d.school] || 0xffffff);
      try {
        if (id === 'fly') audio.fly(!wasFlying);
        else if (id === 'haste') audio.haste();
        else if (['blink', 'beacon_recall', 'town_portal'].includes(id)) audio.teleport();
        else if (d.school === 'fire') audio.fireCast();
        else if (d.school === 'holy' || id === 'heal') audio.light(true);
        else if (d.school === 'frost') audio.noiseBurst(0.35, 'highpass', 3200, 0.7, 0.12, 0, 7000, 0.3);
        else if (d.school === 'storm') audio.noiseBurst(0.3, 'bandpass', 2400, 0.6, 0.2, 0, 600, 0.4);
        else audio.env([[700 + Math.random() * 200, 1500, 1]], 'sine', 0.25, 0.035, 0, 0.5);
      } catch (e) { /* audio is optional */ }
    }
    return ok;
  };
  const origHurt = CG.UI.hurt;
  CG.UI.hurt = function (f) { origHurt.call(this, f); try { audio.noiseBurst(0.18, 'lowpass', 400, 0.7, Math.min(0.5, 0.15 + f), 0, 120, 0.1, audio.brownBuf); } catch (e) { } };
  const origToast = CG.UI.toast;
  CG.UI.toast = function (text, cls) { origToast.call(this, text, cls); if (cls === 'level' || cls === 'quest' || cls === 'boss') { try { audio.chime({ spring: 1, summer: 0, autumn: 0, winter: 0 }); audio.light(true); } catch (e) { } } };
  // ---------------------------------------------------------------- the Feywild body under the Codex hero
  const P = CG.P;
  setupBody(CG, body, P, query, camera, audio, fx, post, lights, staff);

  // ---------------------------------------------------------------- start game state
  CG.Quests.reset(); CG.S = { bossKilled: {}, chests: {}, shrines: {}, kills: 0 };
  if (save && save.player) {
    try {
      P.load(save.player); CG.Quests.state = save.quests || {}; Object.assign(CG.S, save.S || {});
      CG.now = save.now || 0; if (save.time !== undefined) CG.W.time = save.time;
      if (!P.spells.wisp) { P.spells.wisp = 1; const e = P.hotbar.indexOf(null); if (e >= 0) P.hotbar[e] = 'wisp'; }
      if (!P.spells.fly) { P.spells.fly = 1; const e = P.hotbar.indexOf(null); if (e >= 0) P.hotbar[e] = 'fly'; }
    } catch (e) { console.error(e); alert('Save could not be loaded, starting a new game.'); save = null; P.newGame(); }
  } else P.newGame();
  CG.W.chests.forEach((c) => { if (CG.S.chests[c.id]) CG.UI.openChest(c, true); });
  CG.W.shrines.forEach((s) => { s.used = !!CG.S.shrines[s.id]; });
  CG.W.npcs.forEach((n) => { n.label.material.sizeAttenuation = false; n.label.scale.set(0.4 * CG.labelK, 0.1 * CG.labelK, 1); n.label.material.needsUpdate = true; });
  CG.W.refreshNpcMarkers();

  // initial updates & shader warm-up
  body.update(0, NULL_INPUT);
  sky.update(0, camera, new THREE.Color(1, 1, 1), 0);
  tshadow.update(sky.lightDir, true);
  forest.update(camera, true);
  props.update(camera, 0, true);
  setCoverViewport(camera, innerHeight * renderer.getPixelRatio());
  for (const c of cover) c.update(camera);
  progress('Awakening the shaders (this can take a moment)', 0.96); await tick();
  try { if (renderer.compileAsync) await renderer.compileAsync(scene, camera); else renderer.compile(scene, camera); } catch (e) { console.warn(e); }
  post.render(0.016);
  progress('The Feywild awaits', 1); await tick();

  $('screen').classList.add('hidden');
  CG.UI.showHUD();
  CG.started = true;
  if (!save) {
    CG.UI.toast('<div class="zt">The Shattered Codex</div><div class="zs">Speak with Elder Maren (!) in Brightwater</div>', 'zone');
    CG.UI.msg('Welcome, wizard. Villagers marked with ! have work for you.', 'quest');
    CG.UI.msg(CG.touchMode ? 'Drag the left side to walk, the right side to look. Tap spells to cast.' : 'Click the game to capture the mouse. WASD to move, left-click casts Magic Missile, E to talk.', 'info');
    CG.UI.msg('You already know Fly (slot 3 or F) — take to the skies whenever you like. Slot 4 summons a lantern-wisp for the night.', 'magic');
    CG.UI.msg('You have an attribute point to spend — open your character sheet (I).', 'gold');
  } else CG.UI.msg('Welcome back. Your journey continues.', 'info');

  addEventListener('beforeunload', () => { if (CG.started) CG.save(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && CG.started) { CG.save(); if (!CG.UI.isOpen() && !P.dead) CG.UI.open('pause'); } });
  document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && CG.started && !CG.UI.isOpen() && !CG.touchMode && !P.dead) CG.UI.open('pause'); });

  // debug hook
  window.__fey = {
    W, query, sky, scene, renderer, P, CG,
    body, fx, forest, cover, terrain, post,
    teleport(x, z, yaw = 0, pitch = 0, tod, up = 0) { P.teleport(x, z); body.pos.y += up; if (up) body.flying = true; body.yaw = yaw; body.pitch = pitch; if (tod !== undefined && !Number.isNaN(tod)) sky.timeOfDay = tod; body.update(0, NULL_INPUT); },
    forceStorm: null,
  };

  // ---------------------------------------------------------------- loop
  let last = performance.now(), saveT = 30, time = 0;
  const env = { season: [0.25, 0.25, 0.25, 0.25], storm: 0, heat: 0, under: 0, pollen: 0, lava: 0 };
  const windAngle = { v: 0.4 };
  const regionTint = new THREE.Color(1, 1, 1);
  const sunScreen = new THREE.Vector3();
  const spriteTmp = new THREE.Color();
  const tmpS = [0, 0, 0, 0];
  const perf = { acc: 0, n: 0, pr: Q.pr };

  function frame(t) {
    requestAnimationFrame(frame);
    let dt = (t - last) / 1000; last = t;
    if (!(dt > 0)) dt = 0.016; dt = Math.min(dt, 0.05);
    time += dt;
    UNI.uTime.value = time;
    const paused = CG.UI.isOpen();
    const lookDX = CG.Input.lookDX, lookDY = CG.Input.lookDY;
    body.shake = Math.max(body.shake, CG.UI.shakeAmt * 0.9);
    if (!paused) {
      CG.now += dt;
      P.update(dt);
      if (P.dead) body.update(dt, NULL_INPUT);
      SP.update(dt);
      CG.E.update(dt);
      saveT -= dt; if (saveT <= 0) { saveT = 30; CG.save(); }
      sky.timeScale = CG.Input.keys.KeyT ? 90 : 1;
    } else { sky.timeScale = 0; body.update(0, NULL_INPUT); CG.Input.lookDX = CG.Input.lookDY = 0; }
    UNI.uPlayerPos.value.copy(P.pos).y += 1.6;
    CG.feyTick(dt, paused);

    // ---------------- environment around the player
    const px = P.pos.x, pz = P.pos.z;
    const s = query.season(px, pz, tmpS);
    const f = query.feat(px, pz);
    const k = 1 - Math.exp(-dt * 0.8);
    for (let i = 0; i < 4; i++) env.season[i] += (s[i] - env.season[i]) * k;
    const S = env.season;
    const stormCycle = smoothstep(0.3, 0.85, 0.5 + 0.5 * Math.sin(time * 2 * Math.PI / 180 - Math.PI / 2));
    let stormTarget = Math.min(1, stormCycle * smoothstep(0.45, 0.85, S[3]) + f.glacier * 0.6 * S[3]);
    if (window.__fey.forceStorm != null) { stormTarget = window.__fey.forceStorm * smoothstep(0.45, 0.85, S[3]); env.storm = stormTarget; }
    env.storm += (stormTarget - env.storm) * (1 - Math.exp(-dt * 0.35));
    UNI.uStorm.value = env.storm;
    env.pollen += (f.pollen - env.pollen) * k;
    env.lava += (Math.max(f.lava, P.inLava ? 1 : 0) - env.lava) * k;
    windAngle.v += dt * 0.01 * Math.sin(time * 0.05);
    UNI.uWindDir.value.set(Math.cos(windAngle.v), Math.sin(windAngle.v));
    UNI.uWind.value = 0.3 * S[0] + 0.25 * S[1] + 0.85 * S[2] + 0.5 * S[3] + 0.25 * Math.sin(time * 0.3) * Math.sin(time * 0.11);
    UNI.uCloudCover.value = 0.38 + 0.12 * Math.sin(time * 0.013) + S[3] * 0.12 + S[2] * 0.05;
    UNI.uCloudOffset.value.addScaledVector(UNI.uWindDir.value, dt * 0.0012);
    UNI.uFogDensity.value = (0.0005 + env.pollen * 0.0007 + env.lava * 0.0006 + S[3] * 0.00012) / viewK;
    regionTint.setRGB(1, 1, 1).lerp(new THREE.Color(1.05, 0.9, 1.15), env.pollen * 0.5).lerp(new THREE.Color(1.15, 0.9, 0.8), env.lava * 0.5);

    sky.update(dt, camera, regionTint, env.storm);
    const night = UNI.uNight.value;
    CG.W.isNight = night > 0.5; CG.W.dayF = 1 - night;
    CG.lightLevel = lerp(1.0, 0.32, night) * (1 - env.storm * 0.25);
    {
      // sprite light: warm sun by day, cool moonlight by night, a touch of sky
      const sc = UNI.uSunColor.value; const mx = Math.max(sc.r, sc.g, sc.b, 1e-3);
      const day = 1 - night;
      uSpriteLight.value.setRGB(1, 1, 1).lerp(spriteTmp.setRGB(sc.r / mx, sc.g / mx, sc.b / mx), 0.35).multiplyScalar(0.92 + 0.12 * Math.max(0, UNI.uSunDir.value.y))
        .lerp(spriteTmp.setRGB(0.3, 0.34, 0.52), night).multiplyScalar(1 - env.storm * 0.3);
      uSpriteLight.value.lerp(spriteTmp.copy(UNI.uSkyZenith.value).multiplyScalar(0.9), 0.08 * day);
    }
    tshadow.update(sky.lightDir);
    water.update(camera);
    forest.update(camera);
    props.update(camera, time);
    setCoverViewport(camera, innerHeight * renderer.getPixelRatio());
    for (const c of cover) c.update(camera);
    CG.W.update(dt, camera, CG.now);
    CG.FX.update(paused ? 0 : dt, camera);
    fx.update(paused ? 0 : dt);
    CG.UI.update(dt);
    staff.update(dt, P, lookDX, lookDY, !P.dead);
    CG.feyHud(dt, S, night);

    // ---------------- camera fov / post
    const speedK = Math.min(1, body.vel.length() / 40);
    const fovT = 72 + body.haste * 8 + (body.flying ? speedK * 10 : 0);
    if (Math.abs(camera.fov - fovT) > 0.01) { camera.fov += (fovT - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix(); }
    const u = post.u;
    u.uTime.value = time;
    u.uFlash.value = Math.max(0, u.uFlash.value - dt * 1.8);
    u.uExposure.value = lerp(1.08, 2.1, night) * (1 + env.storm * 0.12);
    u.uSaturation.value = 1.02 + S[0] * 0.03 + S[1] * 0.02 + S[2] * 0.06 - S[3] * 0.06 - env.storm * 0.25 + env.pollen * 0.04;
    u.uVibrance.value = 0.3 - S[3] * 0.1;
    u.uContrast.value = 1.12 + S[2] * 0.03;
    u.uShadowTint.value.setRGB(0.95, 0.99, 1.04).lerp(new THREE.Color(0.92, 0.96, 1.1), S[3]).lerp(new THREE.Color(0.98, 0.95, 1.06), S[0] * 0.5).lerp(new THREE.Color(0.86, 0.92, 1.15), night * 0.7);
    u.uHighTint.value.setRGB(1.04, 1.01, 0.95).lerp(new THREE.Color(1.06, 1.0, 0.9), S[1] * 0.5 + S[2] * 0.6).lerp(new THREE.Color(0.99, 1.0, 1.04), S[3]).lerp(new THREE.Color(1.04, 0.99, 1.0), S[0] * 0.5);
    const wc = query.water(camera.position.x, camera.position.z);
    const under = wc.type === 0 && wc.h > -999 && camera.position.y < wc.h - 0.05 && wc.h > query.height(camera.position.x, camera.position.z);
    env.under += ((under ? 1 : 0) - env.under) * Math.min(1, dt * 6);
    u.uUnderwater.value = env.under;
    env.heat += ((P.inLava ? 1 : smoothstep(0.5, 1.0, f.lava) * 0.3) - env.heat) * Math.min(1, dt * 3);
    u.uHeat.value = env.heat;
    u.uHaste.value = body.haste * 0.6;
    sunScreen.copy(UNI.uSunDir.value).multiplyScalar(1000).add(camera.position).project(camera);
    const facing = new THREE.Vector3(); camera.getWorldDirection(facing);
    const sd = facing.dot(UNI.uSunDir.value);
    post.godrays.uniforms.uSun.value.set(sunScreen.x * 0.5 + 0.5, sunScreen.y * 0.5 + 0.5);
    const offS = Math.max(Math.abs(sunScreen.x), Math.abs(sunScreen.y));
    post.godrays.uniforms.uStrength.value = post.godraysEnabled && sunScreen.z < 1 ? smoothstep(1.6, 1.0, offS) * smoothstep(0.2, 0.7, sd) * smoothstep(-0.02, 0.1, UNI.uSunDir.value.y) * (1 - env.storm) : 0;
    post.godrays.uniforms.uColor.value.copy(UNI.uSunColor.value).multiplyScalar(0.25);
    post.bloom.strength = 0.4 + night * 0.25 + env.pollen * 0.1;

    const w = query.water(px, pz);
    const nearWater = w.h > -999 && w.type === 0 ? 1 : f.wet;
    audio.update(dt, {
      wind: UNI.uWind.value, storm: env.storm, water: nearWater, lava: Math.min(1, f.lava * 1.5), day: 1 - night, night,
      spring: S[0], summer: S[1], autumn: S[2], winter: S[3], flySpeed: body.flying ? body.vel.length() : 0,
      altitude: Math.min(1, Math.max(0, (P.pos.y - query.height(px, pz)) / 80)), magic: env.pollen + f.crystal + f.bloom,
    });

    // adaptive resolution
    if (!paused) {
      perf.acc += dt; perf.n++;
      if (perf.acc > 3) {
        const fps = perf.n / perf.acc;
        let pr = perf.pr;
        if (fps < 36 && pr > 0.55) pr = Math.max(0.55, pr - 0.15);
        else if (fps > 57 && pr < Q.pr) pr = Math.min(Q.pr, pr + 0.1);
        if (pr !== perf.pr) { perf.pr = pr; renderer.setPixelRatio(pr); onResize(); post.setPixelRatio(pr); post.setSize(innerWidth, innerHeight); }
        perf.acc = 0; perf.n = 0;
      }
    }
    post.render(dt);
  }
  requestAnimationFrame(frame);
}

addEventListener('error', (e) => { const b = $('errBox'); if (b) { b.style.display = 'block'; b.textContent = 'Error: ' + e.message + ' (' + (e.filename || '').split('/').pop() + ':' + e.lineno + ')'; } });
addEventListener('load', () => { try { title(); } catch (e) { console.error(e); } });
