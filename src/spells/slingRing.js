import { Container, Graphics, BLEND_MODES } from 'pixi.js';
import { ParticleSystem } from '../vfx/particles.js';
import { createMandala } from '../vfx/mandalaTexture.js';

const LIFETIME_MS = 3000;
const MAX_RADIUS = 130;

export class SlingRingSpell {
  constructor(stage, center) {
    this.container = new Container();
    this.container.x = center.x;
    this.container.y = center.y;
    stage.addChild(this.container);

    this._elapsed = 0;
    this._alive = true;

    // Outer ring graphic
    this._ring = new Graphics();
    this._ring.blendMode = BLEND_MODES.ADD;
    this.container.addChild(this._ring);

    // Rotating inner mandala
    this._mandala = createMandala(MAX_RADIUS * 0.78, 12);
    this._mandala.blendMode = BLEND_MODES.ADD;
    this._mandala.alpha = 0;
    this.container.addChild(this._mandala);

    // Second counter-rotating mandala ring
    this._mandala2 = createMandala(MAX_RADIUS * 0.5, 8);
    this._mandala2.blendMode = BLEND_MODES.ADD;
    this._mandala2.alpha = 0;
    this.container.addChild(this._mandala2);

    this._sparks = new ParticleSystem(this.container);

    // Initial burst
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2;
      this._sparks.emit(
        Math.cos(a) * 20, Math.sin(a) * 20,
        2, 30, 3
      );
    }
  }

  update(dtMs) {
    this._elapsed += dtMs;
    const t = Math.min(1, this._elapsed / LIFETIME_MS);

    // Fade alpha: ramp in fast, hold, ramp out last 30%
    const alpha = t < 0.1
      ? t / 0.1
      : t > 0.7
      ? 1 - (t - 0.7) / 0.3
      : 1;
    this.container.alpha = alpha;

    // Expanding ring radius over first 600ms
    const expandT = Math.min(1, this._elapsed / 600);
    const eased = 1 - (1 - expandT) ** 3;
    const radius = MAX_RADIUS * eased;

    // Draw ring layers
    const g = this._ring;
    g.clear();
    g.lineStyle(4, 0xFF6B1A, 0.95);
    g.drawCircle(0, 0, radius);
    g.lineStyle(2, 0xFFB627, 0.7);
    g.drawCircle(0, 0, radius * 0.92);
    g.lineStyle(1, 0xFFF4C2, 0.4);
    g.drawCircle(0, 0, radius * 0.82);

    // Rotating spark arcs on outer ring
    for (let i = 0; i < 8; i++) {
      const baseAngle = (i / 8) * Math.PI * 2 + this._elapsed * 0.002;
      g.lineStyle(2, 0xFF6B1A, 0.6);
      g.arc(0, 0, radius + 5, baseAngle, baseAngle + 0.4);
    }

    // Reveal mandala as ring expands
    this._mandala.alpha = eased * 0.85;
    this._mandala2.alpha = eased * 0.7;
    this._mandala.rotation += 0.012;
    this._mandala2.rotation -= 0.018;

    // Continuous sparks along ring edge
    if (this._elapsed < LIFETIME_MS * 0.7 && Math.random() < 0.5) {
      const a = Math.random() * Math.PI * 2;
      this._sparks.emit(
        Math.cos(a) * radius, Math.sin(a) * radius,
        3, 18, 1.8
      );
    }

    this._sparks.update();

    if (this._elapsed >= LIFETIME_MS) this._alive = false;
  }

  get alive() { return this._alive; }

  dispose() {
    this._sparks.dispose();
    this.container.parent?.removeChild(this.container);
    this.container.destroy({ children: true });
  }
}
