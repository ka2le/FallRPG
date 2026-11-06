'use strict';
(function () {
  const SAVE_KEY = 'codex_rpg_save_v1';
  G.now = 0; G.started = false;
  let renderer, scene, camera, last = 0, saveT = 30;
  const $ = id => document.getElementById(id);
  const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
  G.Player = G.P;

  G.hasSave = function () { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } };
  G.save = function () {
    if (!G.started || G.P.dead) return;
    const data = { v: 1, t: Date.now(), now: G.now, time: G.W.time, player: G.P.serialize(), quests: G.Quests.state, S: G.S };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { console.warn('save failed', e); }
  };
  function loadSave() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; }
  }

  G.applyView = function () {
    const k = G.settings.viewDist || 1;
    const far = 560 * k, near = 150 * k;
    scene.fog.near = near; scene.fog.far = far;
    G.W.terrainUniforms.fogNear.value = near; G.W.terrainUniforms.fogFar.value = far;
    G.vegDist = 560 * k;
    G.Flora && G.Flora.setView(k);
    fogNear = near; fogFar = far;
  };

  let fogNear = 150, fogFar = 560; const UWC = new THREE.Color(0x0d4a5a);
  function underwater(cam) {
    const W = G.W; const uw = cam.position.y < -0.05 && !W.lavaAt(cam.position.x, cam.position.z);
    if (uw !== !!W.underwater) { W.underwater = uw; const el = document.getElementById('uwTint'); if (el) el.classList.toggle('on', uw); }
    const n = uw ? 0.5 : fogNear, f = uw ? 42 : fogFar;
    scene.fog.near = n; scene.fog.far = f; W.terrainUniforms.fogNear.value = n; W.terrainUniforms.fogFar.value = f;
    if (uw) { scene.fog.color.copy(UWC); W.terrainUniforms.fogColor.value.copy(UWC); }
  }
  function setStatus(t) { $('loadText').textContent = t; }

  async function boot() {
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && !matchMedia('(pointer:fine)').matches);
    G.mobile = mobile;
    renderer = new THREE.WebGLRenderer({ antialias: !mobile, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.useLegacyLights = true;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 2));
    renderer.setSize(innerWidth, innerHeight);
    $('game').appendChild(renderer.domElement);
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x9fb6cc, 150, 560);
    renderer.setClearColor(0x9fb6cc);
    camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 1700);
    camera.rotation.order = 'YXZ';
    G.camera = camera; G.scene = scene; G.renderer = renderer;
    setStatus('Shaping the world…'); await nextFrame();
    G.W.init(scene, t => setStatus(t + '…'));
    setStatus('Summoning creatures…'); await nextFrame();
    G.FX.init(scene); G.E.init(scene); G.SP.init(scene); G.UI.init();
    G.Input.init($('touchLayer'));
    G.applyView();
    onResize(); window.addEventListener('resize', onResize);
    G.W.updateSky(0, camera);
    // title screen
    $('loadText').style.display = 'none';
    $('titleBtns').style.display = 'flex';
    $('btnContinue').style.display = G.hasSave() ? '' : 'none';
    $('titleHelp').innerHTML = G.UI.helpHtml();
    $('btnNew').onclick = () => { if (G.hasSave() && !confirm('Start a new game? Your saved progress will be overwritten.')) return; start(null); };
    $('btnContinue').onclick = () => start(loadSave());
    // render the world behind the title
    camera.position.set(-40, 40, 60); camera.lookAt(0, 8, 0);
    requestAnimationFrame(titleLoop);
  }
  function titleLoop(t) {
    if (G.started) return;
    const a = t * 0.00004;
    camera.position.set(Math.cos(a) * 90, 45, Math.sin(a) * 90); camera.lookAt(0, 6, 0);
    G.W.update(0.016, camera, t / 1000); G.W.updateSky(0.016, camera);
    renderer.render(scene, camera);
    requestAnimationFrame(titleLoop);
  }

  function start(save) {
    const P = G.P;
    G.Quests.reset(); G.S = { bossKilled: {}, chests: {}, shrines: {}, kills: 0 };
    if (save && save.player) {
      try {
        P.load(save.player); G.Quests.state = save.quests || {}; Object.assign(G.S, save.S || {});
        G.now = save.now || 0; G.W.time = save.time || 0.12;
      } catch (e) { console.error(e); alert('Save could not be loaded, starting a new game.'); save = null; P.newGame(); }
    } else P.newGame();
    G.W.chests.forEach(c => { if (G.S.chests[c.id]) G.UI.openChest(c, true); });
    G.W.shrines.forEach(s => { s.used = !!G.S.shrines[s.id]; });
    G.W.npcs.forEach(n => { n.label.material.sizeAttenuation = false; n.label.scale.set(0.4 * G.labelK, 0.1 * G.labelK, 1); n.label.material.needsUpdate = true; });
    G.W.refreshNpcMarkers();
    $('screen').classList.add('hidden');
    G.UI.showHUD();
    G.started = true;
    if (!save) {
      G.UI.toast('<div class="zt">The Shattered Codex</div><div class="zs">Speak with Elder Maren (!) in Brightwater</div>', 'zone');
      G.UI.msg('Welcome, wizard. Villagers marked with ! have work for you.', 'quest');
      G.UI.msg(G.touchMode ? 'Drag the left side to walk, the right side to look. Tap spells to cast.' : 'Click the game to capture the mouse. WASD to move, left-click casts Magic Missile, E to talk.', 'info');
      G.UI.msg('You have 3 attribute points to spend — open your character sheet (I).', 'gold');
    } else G.UI.msg('Welcome back. Your journey continues.', 'info');
    last = performance.now();
    requestAnimationFrame(loop);
  }

  function onResize() {
    G.labelK = Math.max(1, Math.min(1.9, 620 / innerHeight));
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    G.FX.resize(innerHeight * renderer.getPixelRatio(), camera.fov);
  }

  let fpsAcc = 0, fpsN = 0;
  function loop(t) {
    requestAnimationFrame(loop);
    let dt = (t - last) / 1000; last = t;
    if (!(dt > 0)) dt = 0.016; dt = Math.min(dt, 0.05);
    const paused = G.UI.isOpen();
    const P = G.P;
    if (!paused) {
      G.now += dt;
      P.update(dt);
      G.SP.update(dt);
      G.E.update(dt);
      G.W.updateSky(dt, camera);
      saveT -= dt; if (saveT <= 0) { saveT = 30; G.save(); }
    }
    // camera
    const eye = P.eye();
    const bob = P.onGround && !P.flying && !paused ? Math.sin(P.bob) * 0.06 : 0;
    camera.position.set(eye.x, eye.y + bob, eye.z);
    const sh = G.UI.shakeAmt;
    camera.rotation.set(P.pitch + (sh ? (Math.random() - .5) * sh * 0.08 : 0), P.yaw + (sh ? (Math.random() - .5) * sh * 0.08 : 0), 0);
    underwater(camera);
    G.W.update(dt, camera, G.now);
    G.FX.update(paused ? 0 : dt, camera);
    G.UI.update(dt);
    renderer.render(scene, camera);
  }

  window.addEventListener('beforeunload', () => { if (G.started) G.save(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.started) { G.save(); if (!G.UI.isOpen() && !G.P.dead) G.UI.open('pause'); } });
  document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && G.started && !G.UI.isOpen() && !G.touchMode && !G.P.dead) G.UI.open('pause'); });
  window.addEventListener('error', e => { const b = $('errBox'); if (b) { b.style.display = 'block'; b.textContent = 'Error: ' + e.message + ' (' + (e.filename || '').split('/').pop() + ':' + e.lineno + ')'; } });
  window.addEventListener('load', () => boot().catch(err => { console.error(err); setStatus('Failed to start: ' + err.message); }));
})();
