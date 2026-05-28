// MediaPipe landmark indices
const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const INDEX_MCP = 5;
const MIDDLE_TIP = 12;
const MIDDLE_MCP = 9;
const RING_TIP = 16;
const RING_MCP = 13;
const PINKY_TIP = 20;
const PINKY_MCP = 17;

// Returns true if a fingertip is "extended" (tip is further from wrist than MCP)
function isFingerExtended(landmarks, tipIdx, mcpIdx) {
  const tip = landmarks[tipIdx];
  const mcp = landmarks[mcpIdx];
  const wrist = landmarks[WRIST];

  // Compare distance from wrist to tip vs wrist to mcp
  const dTip = dist(tip, wrist);
  const dMcp = dist(mcp, wrist);
  return dTip > dMcp * 1.1;
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}

// Thumb extension: compare tip x vs mcp x relative to handedness
function isThumbExtended(landmarks, handedness) {
  const tip = landmarks[THUMB_TIP];
  const mcp = landmarks[2]; // thumb MCP
  // Rough check: tip is farther laterally from palm center
  const palmCenter = landmarks[9]; // middle finger MCP as palm center proxy
  const tipDist = dist(tip, palmCenter);
  const mcpDist = dist(mcp, palmCenter);
  return tipDist > mcpDist * 1.05;
}

export function classifyPose(landmarks, handedness) {
  if (!landmarks || landmarks.length < 21) return 'unknown';

  const index = isFingerExtended(landmarks, INDEX_TIP, INDEX_MCP);
  const middle = isFingerExtended(landmarks, MIDDLE_TIP, MIDDLE_MCP);
  const ring = isFingerExtended(landmarks, RING_TIP, RING_MCP);
  const pinky = isFingerExtended(landmarks, PINKY_TIP, PINKY_MCP);
  const thumb = isThumbExtended(landmarks, handedness);

  const extendedCount = [index, middle, ring, pinky].filter(Boolean).length;

  // open_palm: all 4 fingers extended + thumb roughly extended
  if (extendedCount >= 4 && thumb) return 'open_palm';

  // sling_ring: index + middle extended, ring + pinky curled
  if (index && middle && !ring && !pinky) return 'sling_ring';

  // index_only: only index extended
  if (index && !middle && !ring && !pinky) return 'index_only';

  // fist: all fingers curled
  if (extendedCount === 0) return 'fist';

  // partial_palm: 3+ fingers
  if (extendedCount >= 3) return 'partial_palm';

  return 'other';
}
