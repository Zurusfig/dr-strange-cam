import { Container, Graphics, BLEND_MODES } from 'pixi.js';
import { ParticleSystem } from '../vfx/particles.js';
import { createMandala } from '../vfx/mandalaTexture.js';

const FADE_MS = 2000;
const RAMP_MS = 300;
const DISC_RADIUS = 65;

export class MandalaSpell {
  constructor(stage, leftPos, rightPos) {
    this.container = new Container();
    stage.addChild(this.container);

    this._alpha = 0;
    this._alive = true;
    this._releasing = false;
    this._releaseStart = 0;
    this._elapsed = 0;

    // Left fist disc
    this._leftDisc = this._makeDisc(1);
    this.container.addChild(this._leftDisc.root);

    // Right fist disc
    this._rightDisc = this._makeDisc(-1);
    this.container.addChild(this._rightDisc.root);

    this._updatePositions(leftPos, rightPos);
  }

  _makeDisc(spinDir) {
    const root = new Container();

    // Outer glow ring
    const glow = new Graphics();
    glow.blendMode = BLEND_MODES.ADD;
    glow.lineStyle(6, 0xFF6B1A, 0.4);
    glow.drawCircle(0, 0, DISC_RADIUS + 10);
    root.addChild(glow);

    // Main mandala
    const m1 = createMandala(DISC_RADIUS, 10);
    m1.blendMode = BLEND_MODES.ADD;
    root.addChild(m1);

    // Inner counter-rotating mandala
    const m2 = createMandala(DISC_RADIUS * 0.5, 6);
    m2.blendMode = BLEND_MODES.ADD;
    root.addChild(m2);

    const sparks = new ParticleSystem(root);

    return { root, m1, m2, glow, sparks, spinDir };
  }

  update(dtMs, leftPos, rightPos) {
    this._elapsed += dtMs;

    if (leftPos && rightPos) {
      this._releasing = false;
      this._alpha = Math.min(1, this._alpha + dtMs / RAMP_MS);
      this._updatePositions(leftPos, rightPos);
    } else {
      if (!this._releasing) {
        this._releasing = true;
        this._releaseStart = this._elapsed;
      }
      const t = (this._elapsed - this._releaseStart) / FADE_MS;
      this._alpha = Math.max(0, 1 - t);
      if (t >= 1) this._alive = false;
    }

    this.container.alpha = this._alpha;

    for (const disc of [this._leftDisc, this._rightDisc]) {
      disc.m1.rotation += 0.028 * disc.spinDir;
      disc.m2.rotation -= 0.042 * disc.spinDir;

      // Pulse glow ring
      const pulse = 0.3 + 0.1 * Math.sin(this._elapsed * 0.006);
      disc.glow.alpha = pulse;

      // Orbiting sparks
      if (!this._releasing && Math.random() < 0.35) {
        const a = Math.random() * Math.PI * 2;
        const r = DISC_RADIUS * (0.6 + Math.random() * 0.5);
        disc.sparks.emit(Math.cos(a) * r, Math.sin(a) * r, 2, 20, 1.2);
      }
      disc.sparks.update();
    }
  }

  _updatePositions(leftPos, rightPos) {
    if (leftPos) {
      this._leftDisc.root.x = leftPos.x;
      this._leftDisc.root.y = leftPos.y;
    }
    if (rightPos) {
      this._rightDisc.root.x = rightPos.x;
      this._rightDisc.root.y = rightPos.y;
    }
  }

  get alive() { return this._alive; }

  dispose() {
    this._leftDisc.sparks.dispose();
    this._rightDisc.sparks.dispose();
    this.container.parent?.removeChild(this.container);
    this.container.destroy({ children: true });
  }
}
