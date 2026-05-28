const LANDMARK_CONNECTIONS = [
  // thumb
  [0,1],[1,2],[2,3],[3,4],
  // index
  [0,5],[5,6],[6,7],[7,8],
  // middle
  [0,9],[9,10],[10,11],[11,12],
  // ring
  [0,13],[13,14],[14,15],[15,16],
  // pinky
  [0,17],[17,18],[18,19],[19,20],
  // palm
  [5,9],[9,13],[13,17],
];

const HAND_COLORS = { Left: '#4fc3f7', Right: '#ff6b1a' };
const POSE_COLORS = {
  open_palm: '#4caf50',
  fist: '#f44336',
  sling_ring: '#ff9800',
  index_only: '#ffeb3b',
  partial_palm: '#69f0ae',
  other: '#aaaaaa',
  unknown: '#666666',
  none: '#444444',
};

export class DebugOverlay {
  constructor(canvas, video) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.video = video;
    this.visible = false;
    this._fps = 0;
    this._frameCount = 0;
    this._lastFpsTime = performance.now();

    this._setupKeys();
  }

  _setupKeys() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'd' || e.key === 'D') this.toggle();
    });
  }

  toggle() {
    this.visible = !this.visible;
    document.getElementById('debug-panel').classList.toggle('visible', this.visible);
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
  }

  render(handResults, gestureState) {
    this._trackFps();
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!handResults) return;

    for (const hand of handResults.hands) {
      this._drawHand(ctx, hand, w, h);
    }

    if (this.visible) {
      this._updatePanel(gestureState);
    }
  }

  _drawHand(ctx, hand, w, h) {
    const lms = hand.landmarks;
    const color = HAND_COLORS[hand.handedness] ?? '#ffffff';
    const poseColor = POSE_COLORS[hand.pose] ?? '#aaa';

    // Draw connections
    ctx.strokeStyle = color + 'aa';
    ctx.lineWidth = 2;
    for (const [a, b] of LANDMARK_CONNECTIONS) {
      const pa = this._lmToCanvas(lms[a], w, h);
      const pb = this._lmToCanvas(lms[b], w, h);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }

    // Draw landmark dots
    for (let i = 0; i < lms.length; i++) {
      const p = this._lmToCanvas(lms[i], w, h);
      ctx.beginPath();
      ctx.arc(p.x, p.y, i === 0 ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? color : poseColor;
      ctx.fill();
    }

    // Label above wrist
    const wrist = this._lmToCanvas(lms[0], w, h);
    ctx.fillStyle = color;
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`${hand.handedness} · ${hand.pose}`, wrist.x - 40, wrist.y + 20);
  }

  _lmToCanvas(lm, w, h) {
    // Flip x because video is CSS mirrored
    return { x: (1 - lm.x) * w, y: lm.y * h };
  }

  _updatePanel(state) {
    if (!state) return;
    document.getElementById('dbg-left-pose').textContent = state.leftPose ?? '—';
    document.getElementById('dbg-right-pose').textContent = state.rightPose ?? '—';
    document.getElementById('dbg-combo').textContent = state.combo ?? 'none';
    document.getElementById('dbg-combo-held').textContent = state.heldMs ?? 0;
    document.getElementById('dbg-path').textContent = state.pathShape ?? 'none';
    document.getElementById('dbg-circle').textContent = `${state.circleProgress ?? 0}%`;
    document.getElementById('dbg-spells').textContent = state.triggeredSpell ?? '—';
    document.getElementById('dbg-fps').textContent = this._fps;
  }

  _trackFps() {
    this._frameCount++;
    const now = performance.now();
    if (now - this._lastFpsTime >= 1000) {
      this._fps = this._frameCount;
      this._frameCount = 0;
      this._lastFpsTime = now;
    }
  }
}
