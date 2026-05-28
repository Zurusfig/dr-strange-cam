import { Application } from 'pixi.js';
import { AdvancedBloomFilter } from 'pixi-filters';
import { HandTracker } from './handTracker.js';
import { classifyPose } from './poseClassifier.js';
import { GestureDetector } from './gestureDetector.js';
import { SpellManager } from './spellManager.js';
import { DebugOverlay } from './debug.js';

const videoEl = document.getElementById('webcam');
const landmarkCanvas = document.getElementById('landmark-canvas');
const statusEl = document.getElementById('status');
const spellFlash = document.getElementById('spell-flash');
const appEl = document.getElementById('app');

const handTracker = new HandTracker();
const gestureDetector = new GestureDetector();
let debugOverlay = null;
let spellManager = null;
let pixiApp = null;

let canvasW = 0;
let canvasH = 0;

const SPELL_NAMES = {
  sling_ring: 'Sling Ring Portal',
  shield: 'Shield of the Seraphim',
  mandalas: 'Mandalas of Light',
};
const lastSpellTrigger = {};
let flashTimeout = null;

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

  // PixiJS setup — transparent canvas layered over webcam
  pixiApp = new Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });

  const pixiCanvas = pixiApp.view;
  pixiCanvas.style.cssText = [
    'position:absolute', 'top:0', 'left:0',
    'width:100%', 'height:100%',
    'pointer-events:none', 'z-index:1',
  ].join(';');
  appEl.appendChild(pixiCanvas);
  landmarkCanvas.style.zIndex = '2';

  // Global bloom on the VFX stage
  const bloom = new AdvancedBloomFilter({
    threshold: 0.25,
    bloomScale: 1.8,
    brightness: 1.3,
    blur: 10,
    quality: 4,
  });
  pixiApp.stage.filters = [bloom];

  spellManager = new SpellManager(pixiApp.stage);

  canvasW = window.innerWidth;
  canvasH = window.innerHeight;
  debugOverlay = new DebugOverlay(landmarkCanvas, videoEl);
  debugOverlay.resize(canvasW, canvasH);

  window.addEventListener('resize', onResize);

  statusEl.textContent = 'Ready  ·  Press D for debug';
  requestAnimationFrame(loop);
}

function onResize() {
  canvasW = window.innerWidth;
  canvasH = window.innerHeight;
  debugOverlay?.resize(canvasW, canvasH);
  pixiApp?.renderer.resize(canvasW, canvasH);
}

function loop() {
  requestAnimationFrame(loop);

  const results = handTracker.detect(videoEl);
  if (!results) return;

  for (const hand of results.hands) {
    hand.pose = classifyPose(hand.landmarks, hand.handedness);
  }

  const gestureState = gestureDetector.update(results, canvasW, canvasH);

  const activeSpells = spellManager.update(gestureState, results, canvasW, canvasH);

  debugOverlay.render(results, { ...gestureState, activeSpells });

  if (gestureState.triggeredSpell) {
    const key = gestureState.triggeredSpell;
    const now = performance.now();
    if (!lastSpellTrigger[key] || now - lastSpellTrigger[key] > 1000) {
      lastSpellTrigger[key] = now;
      flashSpell(SPELL_NAMES[key] ?? key);
    }
  }
}

function flashSpell(name) {
  spellFlash.textContent = name;
  spellFlash.style.opacity = '1';
  clearTimeout(flashTimeout);
  flashTimeout = setTimeout(() => { spellFlash.style.opacity = '0'; }, 1600);
}

init();
