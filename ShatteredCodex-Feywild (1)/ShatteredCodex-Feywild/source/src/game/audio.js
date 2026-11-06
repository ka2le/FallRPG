// Procedural WebAudio: wind, water, lava rumble, birdsong, crickets, fey chimes,
// footsteps and spell sounds. No audio files needed.
export class Audio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.7;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -16; this.comp.ratio.value = 4;
    this.master.connect(this.comp).connect(ctx.destination);
    // reverb
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(3.2, 2.6);
    this.revGain = ctx.createGain(); this.revGain.gain.value = 0.35;
    this.reverb.connect(this.revGain).connect(this.master);
    this.noiseBuf = this.makeNoise(4, 'pink');
    this.brownBuf = this.makeNoise(4, 'brown');
    // ambient beds
    this.wind = this.loop(this.brownBuf, 'bandpass', 420, 0.6);
    this.gust = this.loop(this.noiseBuf, 'bandpass', 1400, 4);
    this.water = this.loop(this.noiseBuf, 'bandpass', 900, 0.8);
    this.lava = this.loop(this.brownBuf, 'lowpass', 140, 1);
    this.flyWind = this.loop(this.noiseBuf, 'bandpass', 700, 1.2);
    this.nextBird = 1; this.nextCricket = 0; this.nextChime = 3; this.nextBubble = 0;
    this.t = 0;
  }

  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }

  impulse(sec, decay) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }
  makeNoise(sec, kind) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else { b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
    }
    return b;
  }
  loop(buf, type, freq, q) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(f).connect(g).connect(this.master);
    src.start();
    return { src, f, g };
  }
  ramp(param, v, t = 0.3) { param.setTargetAtTime(v, this.ctx.currentTime, t); }

  // env: {wind, storm, water, lava, day, night, spring, summer, autumn, winter, flySpeed}
  update(dt, env) {
    if (!this.ctx) return;
    this.t += dt;
    const e = env;
    this.ramp(this.wind.g.gain, 0.08 + e.wind * 0.12 + e.storm * 0.5 + e.altitude * 0.1, 0.8);
    this.ramp(this.wind.f.frequency, 300 + e.storm * 500 + e.wind * 200, 0.8);
    const gustAmt = (0.02 + e.storm * 0.18) * (0.5 + 0.5 * Math.sin(this.t * 0.7) * Math.sin(this.t * 0.23));
    this.ramp(this.gust.g.gain, Math.max(0, gustAmt), 0.5);
    this.ramp(this.gust.f.frequency, 900 + 700 * Math.sin(this.t * 0.4) + e.storm * 800, 0.5);
    this.ramp(this.water.g.gain, e.water * 0.22, 0.5);
    this.ramp(this.lava.g.gain, e.lava * 0.5, 0.5);
    this.ramp(this.flyWind.g.gain, Math.min(0.35, e.flySpeed * 0.008), 0.2);
    this.ramp(this.flyWind.f.frequency, 400 + e.flySpeed * 25, 0.2);

    // birdsong by day in spring/summer
    this.nextBird -= dt;
    if (this.nextBird < 0) {
      this.nextBird = 1.5 + Math.random() * 5;
      const birdy = (e.spring + e.summer * 0.8 + e.autumn * 0.3) * e.day * (1 - e.storm);
      if (Math.random() < birdy) this.bird();
    }
    this.nextCricket -= dt;
    if (this.nextCricket < 0) {
      this.nextCricket = 0.35 + Math.random() * 0.5;
      const cr = (e.summer + e.autumn * 0.6 + e.spring * 0.3) * e.night * (1 - e.storm);
      if (Math.random() < cr) this.cricket();
    }
    this.nextChime -= dt;
    if (this.nextChime < 0) {
      this.nextChime = 4 + Math.random() * 9;
      if (Math.random() < 0.6 + e.magic * 0.4) this.chime(e);
    }
    this.nextBubble -= dt;
    if (this.nextBubble < 0) {
      this.nextBubble = 0.2 + Math.random() * 0.8;
      if (Math.random() < e.lava) this.bubble();
    }
  }

  env(freqs, type = 'sine', dur = 0.5, vol = 0.1, pan = 0, reverb = 0.3, attack = 0.01) {
    const ctx = this.ctx, t0 = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (p) { p.pan.value = pan; g.connect(p); p.connect(this.master); if (reverb) { const rg = ctx.createGain(); rg.gain.value = reverb; p.connect(rg).connect(this.reverb); } }
    else g.connect(this.master);
    const oscs = [];
    for (const f of freqs) {
      const o = ctx.createOscillator(); o.type = type;
      if (Array.isArray(f)) { o.frequency.setValueAtTime(f[0], t0); o.frequency.exponentialRampToValueAtTime(f[1], t0 + dur * (f[2] || 1)); }
      else o.frequency.value = f;
      o.connect(g); o.start(t0); o.stop(t0 + dur + 0.05);
      oscs.push(o);
    }
    return { g, oscs };
  }

  noiseBurst(dur, type, freq, q, vol, pan = 0, sweep = null, reverb = 0.2, buf = null) {
    const ctx = this.ctx, t0 = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = buf || this.noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t0 + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + Math.min(0.02, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    src.connect(f).connect(g);
    if (p) { p.pan.value = pan; g.connect(p).connect(this.master); if (reverb) { const rg = ctx.createGain(); rg.gain.value = reverb; p.connect(rg).connect(this.reverb); } }
    else g.connect(this.master);
    src.start(t0, Math.random() * 2); src.stop(t0 + dur + 0.05);
  }

  bird() {
    const pan = Math.random() * 1.6 - 0.8;
    const base = 2000 + Math.random() * 2500;
    const notes = 2 + Math.floor(Math.random() * 5);
    const style = Math.random();
    for (let i = 0; i < notes; i++) {
      setTimeout(() => {
        if (!this.ctx) return;
        const f = base * (0.85 + Math.random() * 0.4);
        if (style < 0.5) this.env([[f, f * 1.4, 0.8]], 'sine', 0.09, 0.03, pan, 0.4);
        else this.env([[f * 1.3, f * 0.8, 0.9]], 'sine', 0.14, 0.025, pan, 0.4);
      }, i * (70 + Math.random() * 70));
    }
  }
  cricket() {
    const pan = Math.random() * 1.6 - 0.8;
    for (let i = 0; i < 3; i++) setTimeout(() => this.ctx && this.env([4400 + Math.random() * 300], 'triangle', 0.03, 0.012, pan, 0.2), i * 45);
  }
  chime(e) {
    // pentatonic fey chimes, mode shifts with season
    const scales = [[0, 2, 4, 7, 9], [0, 2, 4, 7, 9, 11], [0, 3, 5, 7, 10], [0, 2, 3, 7, 8]];
    let si = 0; const s = [e.spring, e.summer, e.autumn, e.winter];
    for (let k = 1; k < 4; k++) if (s[k] > s[si]) si = k;
    const sc = scales[si];
    const root = [523.25, 587.33, 440, 493.88][si];
    const n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        if (!this.ctx) return;
        const deg = sc[Math.floor(Math.random() * sc.length)] + (Math.random() < 0.3 ? 12 : 0);
        const f = root * Math.pow(2, deg / 12);
        this.env([f, f * 2.01], 'sine', 2.8, 0.018, Math.random() * 1.2 - 0.6, 0.9, 0.005);
      }, i * (180 + Math.random() * 260));
    }
  }
  bubble() { const f = 60 + Math.random() * 90; this.env([[f, f * 2.5, 1]], 'sine', 0.18, 0.08, Math.random() - 0.5, 0.1); }

  footstep(surface) {
    if (!this.ctx) return;
    const pan = (Math.random() - 0.5) * 0.2;
    if (surface === 'snow') this.noiseBurst(0.18, 'bandpass', 1800, 0.9, 0.1, pan, 900, 0.05);
    else if (surface === 'leaves') { this.noiseBurst(0.22, 'highpass', 2500, 0.6, 0.08, pan, null, 0.05); }
    else if (surface === 'stone' || surface === 'ice') this.noiseBurst(0.07, 'bandpass', 2600, 2, 0.06, pan, null, 0.15);
    else if (surface === 'water') this.noiseBurst(0.25, 'bandpass', 700, 1.2, 0.08, pan, 300, 0.1);
    else this.noiseBurst(0.12, 'bandpass', 1200, 0.8, 0.05, pan, 600, 0.05);
  }

  // ---- spells
  fireCast() {
    this.noiseBurst(0.45, 'bandpass', 400, 1.5, 0.35, 0, 2500, 0.2, this.brownBuf);
    this.env([[180, 60, 1]], 'sawtooth', 0.35, 0.05, 0, 0.1);
  }
  explosion(dist) {
    const v = Math.max(0.05, 1 - dist / 250);
    this.noiseBurst(1.8, 'lowpass', 1600, 0.7, 0.9 * v, 0, 90, 0.5, this.brownBuf);
    this.noiseBurst(0.5, 'bandpass', 2500, 0.8, 0.25 * v, 0, 400, 0.3);
    this.env([[110, 30, 1]], 'sine', 1.2, 0.5 * v, 0, 0.2, 0.005);
  }
  sizzle() { this.noiseBurst(1.0, 'highpass', 3000, 0.5, 0.2, 0, 6000, 0.2); }
  teleportCharge() { this.env([[300, 900, 1]], 'sine', 0.5, 0.03, 0, 0.5); }
  teleport() {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((f, i) => setTimeout(() => this.ctx && this.env([f, f * 1.5], 'sine', 1.2, 0.05, (i - 2) * 0.2, 0.9, 0.005), i * 40));
    this.noiseBurst(0.6, 'bandpass', 4000, 3, 0.15, 0, 500, 0.6);
  }
  fly(on) {
    if (on) { this.noiseBurst(0.8, 'bandpass', 300, 1, 0.3, 0, 2000, 0.4); this.env([[220, 660, 1]], 'triangle', 0.8, 0.05, 0, 0.6); }
    else { this.noiseBurst(0.6, 'bandpass', 1500, 1, 0.2, 0, 300, 0.4); this.env([[660, 220, 1]], 'triangle', 0.6, 0.04, 0, 0.6); }
  }
  haste() {
    this.env([[200, 1600, 1]], 'sawtooth', 0.7, 0.04, 0, 0.5);
    [784, 988, 1175, 1568].forEach((f, i) => setTimeout(() => this.ctx && this.env([f], 'sine', 0.9, 0.05, 0, 0.8, 0.005), 150 + i * 60));
  }
  light(on) { const f = on ? [880, 1320, 1760] : [1760, 1320, 880]; f.forEach((x, i) => setTimeout(() => this.ctx && this.env([x], 'sine', 1.4, 0.05, 0, 0.9, 0.005), i * 90)); }
  fizzle() { this.noiseBurst(0.2, 'bandpass', 800, 1, 0.1, 0, 200, 0.2); }
  splash(v = 1) { this.noiseBurst(0.7, 'bandpass', 900, 0.7, 0.3 * v, 0, 250, 0.3); }
  bounce() { this.env([[180, 520, 1]], 'sine', 0.35, 0.18, 0, 0.3); }
}
