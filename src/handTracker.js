import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const SMOOTHING_ALPHA = 0.5;

export class HandTracker {
  constructor() {
    this.landmarker = null;
    this.lastResults = null;
    this._smoothed = {}; // key: handIndex, value: smoothed landmarks array
  }

  async init() {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }

  detect(videoEl) {
    if (!this.landmarker) return null;
    const now = performance.now();
    try {
      const results = this.landmarker.detectForVideo(videoEl, now);
      this.lastResults = this._processResults(results);
      return this.lastResults;
    } catch {
      return this.lastResults;
    }
  }

  _processResults(raw) {
    if (!raw || !raw.landmarks || raw.landmarks.length === 0) {
      this._smoothed = {};
      return { hands: [] };
    }

    const hands = [];
    for (let i = 0; i < raw.landmarks.length; i++) {
      // MediaPipe reports handedness BEFORE mirroring. Since we mirror the video
      // with CSS scaleX(-1), Left becomes Right and vice versa.
      const rawHandedness = raw.handednesses[i]?.[0]?.categoryName ?? 'Unknown';
      const handedness = rawHandedness === 'Left' ? 'Right' : 'Left';

      const rawLandmarks = raw.landmarks[i];
      const smoothed = this._smooth(i, rawLandmarks);

      hands.push({ handedness, landmarks: smoothed, worldLandmarks: raw.worldLandmarks?.[i] });
    }
    return { hands };
  }

  _smooth(idx, landmarks) {
    if (!this._smoothed[idx]) {
      this._smoothed[idx] = landmarks.map(l => ({ x: l.x, y: l.y, z: l.z }));
      return this._smoothed[idx];
    }
    const prev = this._smoothed[idx];
    const result = landmarks.map((l, j) => ({
      x: prev[j].x + SMOOTHING_ALPHA * (l.x - prev[j].x),
      y: prev[j].y + SMOOTHING_ALPHA * (l.y - prev[j].y),
      z: prev[j].z + SMOOTHING_ALPHA * (l.z - prev[j].z),
    }));
    this._smoothed[idx] = result;
    return result;
  }

  // Convert normalized [0,1] landmark to canvas pixel coords.
  // x is flipped because video is mirrored with CSS.
  landmarkToCanvas(landmark, canvasW, canvasH) {
    return {
      x: (1 - landmark.x) * canvasW,
      y: landmark.y * canvasH,
    };
  }
}
