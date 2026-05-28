import { Container, Graphics, BLEND_MODES } from 'pixi.js';
import { ParticleSystem } from '../vfx/particles.js';

const LIFETIME_MS = 4000;

// Each layer: orbital radius, angular velocity (rad/ms), comet count,
// trail arc (deg), line width, head dot size, color.
// Negative speed = counter-clockwise.
const LAYERS = [
  { r: 72,  speed:  0.0038, count: 3, trail: 110, w: 1.5, dot: 3,   color: 0xFFB627 },
  { r: 105, speed: -0.0026, count: 5, trail:  80, w: 2.5, dot: 4.5, color: 0xFF6B1A },
  { r: 130, speed:  0.0045, count: 4, trail:  55, w: 1.5, dot: 3,   color: 0xFFF4C2 },
];

const TRAIL_SEGMENTS = 14; // arc subdivisions per comet trail

export class SlingRingSpell {
  constructor(stage, center) {
    this.container = new Container();
    this.container.x = center.x;
    this.container.y = center.y;
    stage.addChild(this.container);

    this._elapsed = 0;
    this._alive = true;

    // Comet angles per layer — evenly distributed at spawn
    this._angles = LAYERS.map(l =>
      Array.from({ length: l.count }, (_, i) => (i / l.count) * Math.PI * 2)
    );

    this._g = new Graphics();
    this._g.blendMode = BLEND_MODES.ADD;
    this.container.addChild(this._g);

    this._glow = new Graphics();
    this._glow.blendMode = BLEND_MODES.ADD;
    this.container.addChild(this._glow);

    this._sparks = new ParticleSystem(this.container);

    // Opening burst
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      this._sparks.emit(Math.cos(a) * 12, Math.sin(a) * 12, 2, 20, 3);
    }
  }

  update(dtMs) {
    this._elapsed += dtMs;
    const t = Math.min(1, this._elapsed / LIFETIME_MS);

    // Fade: ramp in 200ms, hold, ramp out last 20%
    const alpha = t < 0.05 ? t / 0.05 : t > 0.80 ? 1 - (t - 0.80) / 0.20 : 1;
    this.container.alpha = alpha;

    // Scale ring open over 600ms
    const expandT = Math.min(1, this._elapsed / 600);
    const scale = 1 - (1 - expandT) ** 3; // ease-out cubic

    const g = this._g;
    g.clear();

    // Advance angles and draw each layer
    LAYERS.forEach((l, li) => {
      const r = l.r * scale;
      const trailRad = (l.trail * Math.PI) / 180;

      this._angles[li] = this._angles[li].map(a => a + l.speed * dtMs);

      for (const head of this._angles[li]) {
        // Arc trail: subdivided into segments with alpha & width fade toward head
        for (let s = 0; s < TRAIL_SEGMENTS; s++) {
          const t0 = s / TRAIL_SEGMENTS;
          const t1 = (s + 1) / TRAIL_SEGMENTS;
          const aStart = head - trailRad + t0 * trailRad;
          const aEnd   = head - trailRad + t1 * trailRad;
          const seg_a = Math.pow(t1, 2.2) * 0.88;      // quadratic alpha fade
          const seg_w = l.w * (0.3 + t1 * 0.7);        // thin tail → thick near head
          g.lineStyle(seg_w, l.color, seg_a);
          g.arc(0, 0, r, aStart, aEnd);
        }

        // Bright head — white core + color halo
        const hx = Math.cos(head) * r;
        const hy = Math.sin(head) * r;
        g.lineStyle(0);
        g.beginFill(0xFFFFFF, 0.95);
        g.drawCircle(hx, hy, l.dot * 0.55);
        g.endFill();
        g.beginFill(l.color, 0.6);
        g.drawCircle(hx, hy, l.dot * 1.3);
        g.endFill();
      }
    });

    // Soft center glow — two concentric halos
    const gc = this._glow;
    gc.clear();
    gc.beginFill(0xFF6B1A, 0.10 * scale);
    gc.drawCircle(0, 0, LAYERS[1].r * scale + 25);
    gc.endFill();
    gc.beginFill(0xFFB627, 0.15 * scale);
    gc.drawCircle(0, 0, LAYERS[0].r * scale * 0.5);
    gc.endFill();

    // Escape sparks from main orbit edge
    if (expandT > 0.6 && t < 0.78 && Math.random() < 0.40) {
      const a = Math.random() * Math.PI * 2;
      const r = LAYERS[1].r * scale;
      this._sparks.emit(Math.cos(a) * r, Math.sin(a) * r, 2, 10, 2.8);
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
