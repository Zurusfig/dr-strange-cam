import { Graphics, BLEND_MODES } from 'pixi.js';

const PALETTE = [0xFF6B1A, 0xFFB627, 0xFFF4C2];

export class ParticleSystem {
  constructor(parentContainer) {
    this.g = new Graphics();
    this.g.blendMode = BLEND_MODES.ADD;
    parentContainer.addChild(this.g);
    this._particles = [];
  }

  // Emit particles at local-space position (relative to parent container)
  emit(x, y, count = 10, spread = 40, speed = 2) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const s = speed * (0.5 + Math.random() * 0.8);
      this._particles.push({
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread,
        vx: Math.cos(angle) * s,
        vy: Math.sin(angle) * s - Math.random() * 0.5,
        life: 1.0,
        decay: 0.018 + Math.random() * 0.025,
        size: 1.5 + Math.random() * 2.5,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      });
    }
  }

  update() {
    const g = this.g;
    g.clear();
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04; // slight gravity
      p.vx *= 0.98; // drag
      p.life -= p.decay;
      if (p.life <= 0) { this._particles.splice(i, 1); continue; }
      g.beginFill(p.color, p.life);
      g.drawCircle(p.x, p.y, p.size * p.life);
      g.endFill();
    }
  }

  get count() { return this._particles.length; }

  dispose() {
    this.g.parent?.removeChild(this.g);
    this.g.destroy();
    this._particles = [];
  }
}
