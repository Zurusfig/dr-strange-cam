import { Graphics } from 'pixi.js';

// Returns a Graphics object drawing a mandala centered at 0,0.
// Caller must addChild and set position.
export function createMandala(radius = 80, spokes = 8) {
  const g = new Graphics();
  _drawMandala(g, radius, spokes);
  return g;
}

export function redrawMandala(g, radius = 80, spokes = 8) {
  g.clear();
  _drawMandala(g, radius, spokes);
}

function _drawMandala(g, r, spokes) {
  const rings = 4;

  // Concentric rings
  for (let i = rings; i >= 1; i--) {
    const ri = r * (i / rings);
    const alpha = 0.5 + (i / rings) * 0.4;
    const color = i === rings ? 0xFF6B1A : i === rings - 1 ? 0xFFB627 : 0xFFF4C2;
    g.lineStyle(i === rings ? 2 : 1, color, alpha);
    g.drawCircle(0, 0, ri);
  }

  // Spokes
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    g.lineStyle(1, 0xFFB627, 0.55);
    g.moveTo(Math.cos(a) * r * 0.18, Math.sin(a) * r * 0.18);
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }

  // Mid-ring diamond nodes
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 + Math.PI / spokes;
    const mid = r * 0.55;
    g.lineStyle(1, 0xFFB627, 0.45);
    g.drawCircle(Math.cos(a) * mid, Math.sin(a) * mid, r * 0.07);
  }

  // Outer decorative arcs between spokes
  for (let i = 0; i < spokes; i++) {
    const a1 = (i / spokes) * Math.PI * 2;
    const a2 = ((i + 0.5) / spokes) * Math.PI * 2;
    const am = (a1 + a2) / 2;
    const ro = r * 0.88;
    g.lineStyle(1.5, 0xFF6B1A, 0.35);
    g.arc(0, 0, ro, a1 + 0.1, a2 - 0.1);
  }

  // Inner star
  g.lineStyle(1, 0xFFF4C2, 0.5);
  const starR = r * 0.22;
  const starPts = 6;
  for (let i = 0; i < starPts; i++) {
    const a = (i / starPts) * Math.PI * 2;
    const an = ((i + 1) / starPts) * Math.PI * 2;
    g.moveTo(Math.cos(a) * starR, Math.sin(a) * starR);
    g.lineTo(Math.cos(an) * starR, Math.sin(an) * starR);
  }
}
