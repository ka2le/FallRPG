export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseDX = 0; this.mouseDY = 0;
    this.buttons = new Set();
    this.btnPressed = new Set();
    this.btnReleased = new Set();
    this.wheel = 0;
    this.locked = false;
    this.enabled = false;
    addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code) || (e.ctrlKey && ['KeyW', 'KeyS', 'KeyD'].includes(e.code))) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    addEventListener('blur', () => { this.keys.clear(); this.buttons.clear(); });
    addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX; this.mouseDY += e.movementY;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (!this.locked) return;
      this.buttons.add(e.button); this.btnPressed.add(e.button);
    });
    addEventListener('mouseup', (e) => { if (this.buttons.has(e.button)) this.btnReleased.add(e.button); this.buttons.delete(e.button); });
    addEventListener('wheel', (e) => { if (this.locked) this.wheel += Math.sign(e.deltaY); }, { passive: true });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      if (!this.locked) { this.keys.clear(); for (const b of this.buttons) this.btnReleased.add(b); this.buttons.clear(); }
      if (this.onLockChange) this.onLockChange(this.locked);
    });
  }
  lock() { try { const p = this.canvas.requestPointerLock({ unadjustedMovement: false }); if (p && p.catch) p.catch(() => this.canvas.requestPointerLock()); } catch (e) { this.canvas.requestPointerLock(); } }
  down(code) { return this.keys.has(code); }
  endFrame() { this.pressed.clear(); this.btnPressed.clear(); this.btnReleased.clear(); this.mouseDX = 0; this.mouseDY = 0; this.wheel = 0; }
}
