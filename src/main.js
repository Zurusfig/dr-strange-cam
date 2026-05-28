import { HandTracker } from './handTracker.js';
import { classifyPose } from './poseClassifier.js';
import { GestureDetector } from './gestureDetector.js';
import { DebugOverlay } from './debug.js';

const videoEl = document.getElementById('webcam');
const landmarkCanvas = document.getElementById('landmark-canvas');
const statusEl = document.getElementById('status');
const spellFlash = document.getElementById('spell-flash');

const handTracker = new HandTracker();
const gestureDetector = new GestureDetector();
let debugOverlay = null;

let canvasW = 0;
let canvasH = 0;
let running = false;
let lastSpellTrigger = {};

async function init() {
  statusEl.textContent = 'Requesting webcam...';

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false,
    });
  } catch (err) {
    statusEl.textContent = `Webcam error: ${err.message}`;
    return;
  }

  videoEl.srcObject = stream;
  await new Promise(resolve => { videoEl.onloadedmetadata = resolve; });
  await videoEl.play();

  statusEl.textContent = 'Loading hand model...';
  try {
    await handTracker.init();
  } catch (err) {
    statusEl.textContent = `Model error: ${err.message}`;
    return;
  }

  resize();
  window.addEventListener('resize', resize);

  debugOverlay = new DebugOverlay(landmarkCanvas, videoEl);

  statusEl.textContent = 'Ready — press D for debug panel';
  running = true;
  requestAnimationFrame(loop);
}

function resize() {
  canvasW = window.innerWidth;
  canvasH = window.innerHeight;
  if (debugOverlay) debugOverlay.resize(canvasW, canvasH);
}

function loop() {
  if (!running) return;
  requestAnimationFrame(loop);

  const results = handTracker.detect(videoEl);
  if (!results) return;

  // Attach pose to each hand
  for (const hand of results.hands) {
    hand.pose = classifyPose(hand.landmarks, hand.handedness);
  }

  const gestureState = gestureDetector.update(results, canvasW, canvasH);

  debugOverlay.render(results, gestureState);

  // Flash spell name on trigger
  if (gestureState.triggeredSpell) {
    const spell = gestureState.triggeredSpell;
    const now = performance.now();
    const cooldown = 1000;
    if (!lastSpellTrigger[spell] || now - lastSpellTrigger[spell] > cooldown) {
      lastSpellTrigger[spell] = now;
      flashSpell(SPELL_NAMES[spell] ?? spell);
    }
  }
}

const SPELL_NAMES = {
  sling_ring: 'Sling Ring Portal',
  shield: 'Shield of the Seraphim',
  mandalas: 'Mandalas of Light',
};

let flashTimeout = null;
function flashSpell(name) {
  spellFlash.textContent = name;
  spellFlash.style.opacity = '1';
  if (flashTimeout) clearTimeout(flashTimeout);
  flashTimeout = setTimeout(() => { spellFlash.style.opacity = '0'; }, 1500);
}

init();
