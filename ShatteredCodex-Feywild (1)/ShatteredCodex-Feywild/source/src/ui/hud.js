// DOM HUD: spell bar, region banner, clock/compass, help, pause & settings.
const ICONS = {
  fireball: `<svg viewBox="0 0 64 64"><defs><radialGradient id="gf" cx="50%" cy="65%" r="55%"><stop offset="0" stop-color="#fff6c0"/><stop offset=".45" stop-color="#ffb030"/><stop offset="1" stop-color="#e03a10"/></radialGradient></defs><path d="M32 6c4 10 14 14 14 28a14 14 0 0 1-28 0c0-8 5-12 7-18 2 5 4 7 6 8 1-7-1-12 1-18z" fill="url(#gf)"/><circle cx="32" cy="40" r="7" fill="#fffbe0" opacity=".9"/></svg>`,
  teleport: `<svg viewBox="0 0 64 64"><defs><radialGradient id="gt"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#c49aff"/><stop offset="1" stop-color="#6a3aff" stop-opacity="0"/></radialGradient></defs><circle cx="32" cy="32" r="24" fill="url(#gt)" opacity=".5"/><path d="M32 10a22 22 0 1 1-20 13" fill="none" stroke="#d8c0ff" stroke-width="3" stroke-linecap="round"/><path d="M32 18a14 14 0 1 1-12 7" fill="none" stroke="#a080ff" stroke-width="3" stroke-linecap="round"/><path d="M32 4l3 8-3 3-3-3z M32 28l4 4-4 4-4-4z" fill="#fff"/></svg>`,
  fly: `<svg viewBox="0 0 64 64"><path d="M30 44C18 44 8 34 6 18c8 6 14 6 20 4-4 5-3 9 0 12-1-6 3-9 6-10 0 8-1 14-2 20z" fill="#7affe0"/><path d="M34 44c12 0 22-10 24-26-8 6-14 6-20 4 4 5 3 9 0 12 1-6-3-9-6-10 0 8 1 14 2 20z" fill="#b8fff0"/><circle cx="32" cy="48" r="4" fill="#fff"/></svg>`,
  haste: `<svg viewBox="0 0 64 64"><path d="M38 4L14 36h14l-6 24 28-34H34z" fill="#ffe050" stroke="#fff6b0" stroke-width="2" stroke-linejoin="round"/><path d="M8 20h10M4 30h10M8 40h8" stroke="#fff3a0" stroke-width="3" stroke-linecap="round"/></svg>`,
  light: `<svg viewBox="0 0 64 64"><defs><radialGradient id="gl"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#dde8ff"/><stop offset="1" stop-color="#8ab0ff" stop-opacity="0"/></radialGradient></defs><circle cx="32" cy="32" r="26" fill="url(#gl)"/><circle cx="32" cy="32" r="7" fill="#fff"/><g stroke="#e8f0ff" stroke-width="2" stroke-linecap="round"><path d="M32 6v8M32 50v8M6 32h8M50 32h8M13 13l6 6M45 45l6 6M51 13l-6 6M19 45l-6 6"/></g></svg>`,
};

export class HUD {
  constructor(spells) {
    this.el = document.getElementById('hud');
    this.bar = document.getElementById('spellbar');
    this.slots = [];
    spells.forEach((s, i) => {
      const d = document.createElement('div');
      d.className = 'slot';
      d.innerHTML = `<div class="icon">${ICONS[s.id] || ''}</div><div class="cd"></div><div class="key">${i + 1}</div><div class="tip"><b>${s.name}</b><span>${s.desc}</span></div>`;
      d.style.setProperty('--c', `rgb(${Math.round(Math.min(1, s.color.r) * 255)},${Math.round(Math.min(1, s.color.g) * 255)},${Math.round(Math.min(1, s.color.b) * 255)})`);
      this.bar.appendChild(d);
      this.slots.push({ el: d, cd: d.querySelector('.cd') });
    });
    this.spells = spells;
    this.banner = document.getElementById('region');
    this.bannerName = this.banner.querySelector('.name');
    this.bannerSub = this.banner.querySelector('.sub');
    this.clock = document.getElementById('clock');
    this.compass = document.getElementById('compass');
    this.hasteBar = document.getElementById('hastebar');
    this.fps = document.getElementById('fps');
    this.currentRegion = '';
    this.regionTimer = 0;
    this.selectSpell(0);
    this.fpsAcc = 0; this.fpsN = 0;
  }
  selectSpell(i) { this.slots.forEach((s, k) => s.el.classList.toggle('sel', k === i)); }
  showRegion(r) {
    if (r.name === this.currentRegion) return;
    this.currentRegion = r.name;
    this.bannerName.textContent = r.name;
    this.bannerSub.textContent = r.sub;
    this.banner.classList.remove('show');
    void this.banner.offsetWidth;
    this.banner.classList.add('show');
  }
  update(dt, player, sky, seasonW) {
    this.spells.forEach((s, i) => {
      const slot = this.slots[i];
      const f = s.cooldown > 0 ? s.cd / s.cooldown : 0;
      slot.cd.style.background = f > 0 ? `conic-gradient(rgba(0,0,0,.65) ${f * 360}deg, transparent 0)` : 'none';
      slot.el.classList.toggle('active', !!s.active);
    });
    const t = sky.timeOfDay;
    const hh = Math.floor(t), mm = Math.floor((t - hh) * 60);
    const phase = t < 5 ? 'Deep Night' : t < 7 ? 'Dawn' : t < 11 ? 'Morning' : t < 14 ? 'Midday' : t < 17.5 ? 'Afternoon' : t < 19.5 ? 'Golden Hour' : t < 21 ? 'Dusk' : 'Night';
    const sn = ['Spring', 'Summer', 'Autumn', 'Winter'];
    let si = 0; for (let k = 1; k < 4; k++) if (seasonW[k] > seasonW[si]) si = k;
    this.clock.innerHTML = `<span class="t">${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}</span><span class="p">${phase} · Court of ${sn[si]}</span>`;
    // compass
    const deg = ((-player.yaw * 180 / Math.PI) % 360 + 360) % 360;
    this.compass.style.backgroundPosition = `${-deg * 2 + 180}px 0`;
    const h = player.hasteTime > 0 ? player.hasteTime / 12 : 0;
    this.hasteBar.style.width = `${h * 100}%`;
    this.hasteBar.parentElement.style.opacity = h > 0 ? 1 : 0;
    this.fpsAcc += dt; this.fpsN++;
    if (this.fpsAcc > 0.5) { this.fps.textContent = `${Math.round(this.fpsN / this.fpsAcc)} fps`; this.fpsAcc = 0; this.fpsN = 0; }
  }
}
