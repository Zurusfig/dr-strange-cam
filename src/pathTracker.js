const BUFFER_FRAMES = 60;
const CIRCLE_MIN_FRAMES = 30;
const CIRCLE_RADIUS_VARIANCE_THRESHOLD = 0.35; // max std/mean ratio
const CIRCLE_MIN_ANGLE_COVERAGE = 270; // degrees the path must cover

export class PathTracker {
  constructor() {
    this._buffer = []; // { x, y, ts }
    this.lastShape = 'none';
    this.circleProgress = 0; // 0–100
    this._circleCenter = null;
  }

  push(x, y) {
    const now = performance.now();
    this._buffer.push({ x, y, ts: now });
    // Keep rolling window
    if (this._buffer.length > BUFFER_FRAMES) {
      this._buffer.shift();
    }
    this._analyze();
  }

  reset() {
    this._buffer = [];
    this.lastShape = 'none';
    this.circleProgress = 0;
    this._circleCenter = null;
  }

  _analyze() {
    if (this._buffer.length < CIRCLE_MIN_FRAMES) {
      this.circleProgress = Math.round((this._buffer.length / CIRCLE_MIN_FRAMES) * 30);
      return;
    }

    const pts = this._buffer;
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;

    const radii = pts.map(p => Math.hypot(p.x - cx, p.y - cy));
    const meanR = radii.reduce((s, r) => s + r, 0) / radii.length;
    if (meanR < 0.01) {
      this.lastShape = 'none';
      this.circleProgress = 0;
      return;
    }

    const variance = radii.reduce((s, r) => s + (r - meanR) ** 2, 0) / radii.length;
    const stdDev = Math.sqrt(variance);
    const normalizedStd = stdDev / meanR;

    // Check angular coverage
    const angles = pts.map(p => Math.atan2(p.y - cy, p.x - cx) * (180 / Math.PI));
    const coverage = this._angularCoverage(angles);

    this.circleProgress = Math.min(100, Math.round(
      (coverage / CIRCLE_ANGLE_COVERAGE_TARGET) * 100 * (1 - normalizedStd)
    ));

    if (normalizedStd < CIRCLE_RADIUS_VARIANCE_THRESHOLD && coverage >= CIRCLE_MIN_ANGLE_COVERAGE) {
      this.lastShape = 'circle';
      this._circleCenter = { x: cx, y: cy, r: meanR };
    } else {
      this.lastShape = 'none';
    }
  }

  _angularCoverage(angles) {
    // Sort angles and find max gap to determine coverage
    const sorted = [...angles].sort((a, b) => a - b);
    let maxGap = 0;
    for (let i = 1; i < sorted.length; i++) {
      maxGap = Math.max(maxGap, sorted[i] - sorted[i - 1]);
    }
    // Gap between last and first (wrap around)
    const wrapGap = 360 - sorted[sorted.length - 1] + sorted[0];
    maxGap = Math.max(maxGap, wrapGap);
    return 360 - maxGap;
  }

  get circleCenter() {
    return this._circleCenter;
  }
}

const CIRCLE_ANGLE_COVERAGE_TARGET = 320;
