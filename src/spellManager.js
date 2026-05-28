import { SlingRingSpell } from './spells/slingRing.js';
import { ShieldSpell } from './spells/shield.js';
import { MandalaSpell } from './spells/mandala.js';

const COOLDOWNS = {
  sling_ring: 3500,
  shield: 400,
  mandalas: 400,
};

export class SpellManager {
  constructor(stage) {
    this._stage = stage;
    this._spells = {}; // keyed by spell id
    this._cooldowns = {};
    this._lastTime = performance.now();
  }

  update(gestureState, handResults, canvasW, canvasH) {
    const now = performance.now();
    const dtMs = now - this._lastTime;
    this._lastTime = now;

    const hands = this._extractHands(handResults, canvasW, canvasH);
    const combo = gestureState.combo;

    // --- Trigger new spells ---
    if (gestureState.triggeredSpell) {
      const key = gestureState.triggeredSpell;
      if (!this._onCooldown(key)) {
        this._spawn(key, hands, gestureState);
        this._cooldowns[key] = now + (COOLDOWNS[key] ?? 1000);
      }
    }

    // --- Update persistent spells (shield, mandalas follow hands) ---
    const shieldActive = combo === 'shield';
    if (this._spells.shield) {
      this._spells.shield.update(
        dtMs,
        shieldActive ? hands.left?.wrist : null,
        shieldActive ? hands.right?.wrist : null
      );
      if (!this._spells.shield.alive) { this._spells.shield.dispose(); delete this._spells.shield; }
    }

    const mandalaActive = combo === 'mandalas';
    if (this._spells.mandalas) {
      this._spells.mandalas.update(
        dtMs,
        mandalaActive ? hands.left?.wrist : null,
        mandalaActive ? hands.right?.wrist : null
      );
      if (!this._spells.mandalas.alive) { this._spells.mandalas.dispose(); delete this._spells.mandalas; }
    }

    // --- Update one-shot spells ---
    for (const key of ['sling_ring']) {
      if (!this._spells[key]) continue;
      this._spells[key].update(dtMs);
      if (!this._spells[key].alive) {
        this._spells[key].dispose();
        delete this._spells[key];
      }
    }

    return Object.keys(this._spells);
  }

  _spawn(key, hands, state) {
    switch (key) {
      case 'sling_ring': {
        this._spells.sling_ring?.dispose();
        // Use circle center if available (canvas coords from pathTracker), else left index tip
        const center = state.circleCenter
          ?? hands.left?.indexTip
          ?? { x: 320, y: 240 };
        this._spells.sling_ring = new SlingRingSpell(this._stage, center);
        break;
      }
      case 'shield': {
        if (!this._spells.shield) {
          const l = hands.left?.wrist ?? { x: 280, y: 380 };
          const r = hands.right?.wrist ?? { x: 480, y: 380 };
          this._spells.shield = new ShieldSpell(this._stage, l, r);
        }
        break;
      }
      case 'mandalas': {
        if (!this._spells.mandalas) {
          const l = hands.left?.wrist ?? { x: 200, y: 350 };
          const r = hands.right?.wrist ?? { x: 580, y: 350 };
          this._spells.mandalas = new MandalaSpell(this._stage, l, r);
        }
        break;
      }
    }
  }

  _onCooldown(key) {
    return this._cooldowns[key] && performance.now() < this._cooldowns[key];
  }

  _extractHands(handResults, canvasW, canvasH) {
    const out = { left: null, right: null };
    for (const hand of handResults.hands) {
      const lms = hand.landmarks;
      // x is flipped for mirrored webcam
      const flip = (lm) => ({ x: (1 - lm.x) * canvasW, y: lm.y * canvasH });
      const entry = {
        wrist: flip(lms[0]),
        indexTip: flip(lms[8]),
        middleMcp: flip(lms[9]),
      };
      if (hand.handedness === 'Left') out.left = entry;
      else out.right = entry;
    }
    return out;
  }

  disposeAll() {
    for (const s of Object.values(this._spells)) s.dispose();
    this._spells = {};
  }
}
