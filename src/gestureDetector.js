import { PathTracker } from './pathTracker.js';

const COMBO_SUSTAIN_MS = 500;
const STATE_HISTORY = 30;

export class GestureDetector {
  constructor() {
    this.pathTracker = new PathTracker();
    this._stateHistory = [];
    this._comboStartTime = null;
    this._currentCombo = 'none';
    this._prevCombo = 'none';
    this.activeCombo = 'none';
    this.comboHeldMs = 0;
    this.triggeredSpell = null; // fires once per detection, then null
  }

  update(handResults, canvasW, canvasH) {
    this.triggeredSpell = null;

    const { leftHand, rightHand } = this._getHands(handResults);

    // Update path tracker for left index fingertip when index_only or sling_ring context
    if (leftHand && (leftHand.pose === 'index_only')) {
      const tip = leftHand.landmarks[8];
      const x = (1 - tip.x) * canvasW;
      const y = tip.y * canvasH;
      this.pathTracker.push(x, y);
    } else {
      // Don't reset abruptly — only clear when pose is clearly different for a bit
      if (!leftHand || (leftHand.pose !== 'index_only' && leftHand.pose !== 'sling_ring')) {
        this.pathTracker.reset();
      }
    }

    const rawCombo = this._detectCombo(leftHand, rightHand);

    // Update history
    this._stateHistory.push(rawCombo);
    if (this._stateHistory.length > STATE_HISTORY) this._stateHistory.shift();

    // Require combo to be stable (majority of recent frames)
    const stableCombo = this._mostFrequent(this._stateHistory);

    if (stableCombo === this._prevCombo) {
      if (this._comboStartTime === null) {
        this._comboStartTime = performance.now();
      }
      this.comboHeldMs = Math.round(performance.now() - this._comboStartTime);
    } else {
      this._comboStartTime = stableCombo !== 'none' ? performance.now() : null;
      this.comboHeldMs = 0;
    }

    this._prevCombo = stableCombo;
    this.activeCombo = stableCombo;

    // Fire spell trigger when sustained long enough
    if (stableCombo !== 'none' && this.comboHeldMs >= COMBO_SUSTAIN_MS) {
      // For sling ring, also need circle completed
      if (stableCombo === 'sling_ring_pose') {
        if (this.pathTracker.lastShape === 'circle') {
          this.triggeredSpell = 'sling_ring';
        }
      } else {
        this.triggeredSpell = stableCombo;
      }
    }

    return {
      combo: stableCombo,
      heldMs: this.comboHeldMs,
      pathShape: this.pathTracker.lastShape,
      circleProgress: this.pathTracker.circleProgress,
      circleCenter: this.pathTracker.circleCenter,
      triggeredSpell: this.triggeredSpell,
      leftPose: leftHand?.pose ?? 'none',
      rightPose: rightHand?.pose ?? 'none',
    };
  }

  _getHands(handResults) {
    let leftHand = null;
    let rightHand = null;
    for (const hand of handResults.hands) {
      if (hand.handedness === 'Left') leftHand = hand;
      else if (hand.handedness === 'Right') rightHand = hand;
    }
    return { leftHand, rightHand };
  }

  _detectCombo(left, right) {
    if (!left || !right) return 'none';

    const lp = left.pose;
    const rp = right.pose;

    // Shield: both open palms, side by side at similar height
    if ((lp === 'open_palm' || lp === 'partial_palm') &&
        (rp === 'open_palm' || rp === 'partial_palm')) {
      return 'shield';
    }

    // Mandalas: both fists
    if (lp === 'fist' && rp === 'fist') {
      return 'mandalas';
    }

    // Sling ring pose: right hand = sling_ring, left hand = index_only
    if (rp === 'sling_ring' && lp === 'index_only') {
      return 'sling_ring_pose';
    }

    return 'none';
  }

  _mostFrequent(arr) {
    const counts = {};
    for (const v of arr) counts[v] = (counts[v] ?? 0) + 1;
    let best = 'none'; let bestCount = 0;
    for (const [k, c] of Object.entries(counts)) {
      if (c > bestCount) { bestCount = c; best = k; }
    }
    // Must be majority
    return bestCount > arr.length * 0.5 ? best : 'none';
  }
}
