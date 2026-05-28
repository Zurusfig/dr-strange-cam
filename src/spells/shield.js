import { Container, Graphics, BLEND_MODES } from 'pixi.js';
import { ParticleSystem } from '../vfx/particles.js';
import { createMandala } from '../vfx/mandalaTexture.js';

const FADE_MS = 1800;
const RAMP_MS = 200;

export class ShieldSpell {
  constructor(stage, leftPos, rightPos) {
    this.container = new Container();
    stage.addChild(this.container);

    this._alpha = 0;
    this._alive = true;
    this._releasing = false;
    this._releaseStart = 0;
    this._elapsed = 0;

    this._hex = new Graphics();
    this._hex.blendMode = BLEND_MODES.ADD;
    this.container.addChild(this._hex);

    this._mandala = createMandala(90, 6);
    this._mandala.blendMode = BLEND_MODES.ADD;
    this.container.addChild(this._mandala);

    this._sparks = new ParticleSystem(this.container);

    this._shieldRadius = 100;
    this._updateGeometry(leftPos, rightPos);
  }

  update(dtMs, leftPos, rightPos) {
    this._elapsed += dtMs;

    if (leftPos && rightPos) {
      this._releasing = false;
      this._alpha = Math.min(1, this._alpha + dtMs / RAMP_MS);
      this._updateGeometry(leftPos, rightPos);
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
    this._mandala.rotation += 0.006;

    // Edge shimmer sparks
    if (!this._releasing && Math.random() < 0.25) {
      const a = Math.random() * Math.PI * 2;
      const r = this._shieldRadius;
      this._sparks.emit(
        Math.cos(a) * r, Math.sin(a) * r,
        2, 20, 1.2
      );
    }
    this._sparks.update();
  }

  _updateGeometry(leftPos, rightPos) {
    const cx = (leftPos.x + rightPos.x) / 2;
    const cy = (leftPos.y + rightPos.y) / 2;
    const span = Math.hypot(rightPos.x - leftPos.x, rightPos.y - leftPos.y);
    const r = Math.max(80, span * 0.55 + 60);

    this.container.x = cx;
    this.container.y = cy;
    this._shieldRadius = r;

    const g = this._hex;
    g.clear();

    // Filled hex with faint tint
    const sides = 6;
    g.lineStyle(3, 0xFF6B1A, 0.95);
    g.beginFill(0xFF6B1A, 0.06);
    this._drawPolygon(g, sides, r, -Math.PI / 6);
    g.endFill();

    // Inner hex rings
    g.lineStyle(1.5, 0xFFB627, 0.6);
    this._drawPolygon(g, sides, r * 0.75, -Math.PI / 6);

    g.lineStyle(1, 0xFFF4C2, 0.3);
    this._drawPolygon(g, sides, r * 0.5, -Math.PI / 6);

    // Radial spokes from center to hex vertices
    g.lineStyle(1, 0xFFB627, 0.3);
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 - Math.PI / 6;
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }

    this._mandala.scale.set(r / 110);
  }

  _drawPolygon(g, sides, r, offset = 0) {
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 + offset;
      pts.push(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.drawPolygon(pts);
  }

  get alive() { return this._alive; }

  dispose() {
    this._sparks.dispose();
    this.container.parent?.removeChild(this.container);
    this.container.destroy({ children: true });
  }
}
