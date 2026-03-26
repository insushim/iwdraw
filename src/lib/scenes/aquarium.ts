import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath,
  createLine, createGroup, createText,
} from '../engine/primitives';
import {
  combineDefs, indoorDefs, linearGradient, radialGradient,
  softGlow, waterGradient,
} from './svg-effects';
import {
  detailedFish, detailedCoral, detailedSeaweed, detailedRock,
  resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'aq') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// Shark
function shark(x: number, y: number, size: number, rng: SeededRandom, dir: number): SVGElementData {
  const s = size;
  const d = dir;
  const children: SVGElementData[] = [];
  const bodyColor = '#556677';
  const bellyColor = '#CCCCDD';

  // Body
  const bodyPath = `M${x - s * 0.7 * d},${y} Q${x - s * 0.5 * d},${y - s * 0.2} ${x},${y - s * 0.15} Q${x + s * 0.4 * d},${y - s * 0.1} ${x + s * 0.7 * d},${y} Q${x + s * 0.4 * d},${y + s * 0.12} ${x},${y + s * 0.15} Q${x - s * 0.5 * d},${y + s * 0.1} ${x - s * 0.7 * d},${y} Z`;
  children.push(createPath(x, y, bodyPath, bodyColor, { layer: 3 }));
  // Belly
  const bellyP = `M${x - s * 0.5 * d},${y + s * 0.02} Q${x},${y + s * 0.13} ${x + s * 0.5 * d},${y + s * 0.02}`;
  children.push(createPath(x, y, bellyP, bellyColor, { layer: 3, opacity: 0.5 }));
  // Dorsal fin
  const dorsalPath = `M${x - s * 0.05 * d},${y - s * 0.14} L${x + s * 0.05 * d},${y - s * 0.38} L${x + s * 0.2 * d},${y - s * 0.12}`;
  children.push(createPath(x, y, dorsalPath, '#4A5A6A', { layer: 3 }));
  // Tail fin
  const tailPath = `M${x - s * 0.65 * d},${y} L${x - s * 0.85 * d},${y - s * 0.2} L${x - s * 0.72 * d},${y} L${x - s * 0.85 * d},${y + s * 0.15} Z`;
  children.push(createPath(x, y, tailPath, '#4A5A6A', { layer: 3 }));
  // Pectoral fins
  children.push(createPath(x, y, `M${x + s * 0.1 * d},${y + s * 0.08} L${x + s * 0.25 * d},${y + s * 0.22} L${x + s * 0.3 * d},${y + s * 0.08}`, '#4A5A6A', { layer: 3, opacity: 0.8 }));
  // Eye
  children.push(createCircle(x + s * 0.45 * d, y - s * 0.04, s * 0.03, '#111', { layer: 3 }));
  // Gill slits
  for (let i = 0; i < 3; i++) {
    const gx = x + (s * 0.3 + i * s * 0.05) * d;
    children.push(createLine(gx, y - s * 0.06, gx, y + s * 0.04, '#3A4A5A', { strokeWidth: 0.8, layer: 3, opacity: 0.6 }));
  }

  return createGroup(x, y, children, { layer: 3, category: 'shark', modifiable: true, id: uid('shark') });
}

// Sea turtle
function seaTurtle(x: number, y: number, size: number, rng: SeededRandom, dir: number): SVGElementData {
  const s = size;
  const d = dir;
  const children: SVGElementData[] = [];
  const shellColor = rng.pick(['#5A8A50', '#4A7A42', '#6A9A58']);

  // Shell (oval)
  children.push(createEllipse(x, y, s * 0.35, s * 0.25, shellColor, { layer: 3, stroke: '#3A6A30', strokeWidth: 1.5 }));
  // Shell pattern (hexagonal patches)
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const px = x + Math.cos(angle) * s * 0.15;
    const py = y + Math.sin(angle) * s * 0.1;
    children.push(createEllipse(px, py, s * 0.08, s * 0.06, '#4A7A42', { layer: 3, stroke: '#3A6A30', strokeWidth: 0.5, opacity: 0.6 }));
  }
  // Head
  const headPath = `M${x + s * 0.32 * d},${y} Q${x + s * 0.42 * d},${y - s * 0.06} ${x + s * 0.48 * d},${y} Q${x + s * 0.42 * d},${y + s * 0.06} ${x + s * 0.32 * d},${y}`;
  children.push(createPath(x, y, headPath, '#7AAA68', { layer: 3 }));
  // Eye
  children.push(createCircle(x + s * 0.42 * d, y - s * 0.02, s * 0.02, '#111', { layer: 3 }));
  // Flippers
  children.push(createPath(x, y, `M${x + s * 0.15 * d},${y - s * 0.2} Q${x + s * 0.35 * d},${y - s * 0.35} ${x + s * 0.4 * d},${y - s * 0.15}`, '#6A9A58', { layer: 3, stroke: '#4A7A42', strokeWidth: 0.8 }));
  children.push(createPath(x, y, `M${x + s * 0.15 * d},${y + s * 0.2} Q${x + s * 0.35 * d},${y + s * 0.35} ${x + s * 0.4 * d},${y + s * 0.15}`, '#6A9A58', { layer: 3, stroke: '#4A7A42', strokeWidth: 0.8 }));
  children.push(createPath(x, y, `M${x - s * 0.2 * d},${y - s * 0.15} Q${x - s * 0.35 * d},${y - s * 0.28} ${x - s * 0.3 * d},${y - s * 0.1}`, '#6A9A58', { layer: 3, opacity: 0.8 }));
  children.push(createPath(x, y, `M${x - s * 0.2 * d},${y + s * 0.15} Q${x - s * 0.35 * d},${y + s * 0.28} ${x - s * 0.3 * d},${y + s * 0.1}`, '#6A9A58', { layer: 3, opacity: 0.8 }));

  return createGroup(x, y, children, { layer: 3, category: 'turtle', modifiable: true, id: uid('turtle') });
}

// Jellyfish
function jellyfish(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const color = rng.pick(['#E040FB', '#FF80AB', '#B388FF', '#82B1FF', '#80D8FF']);
  const children: SVGElementData[] = [];

  // Bell
  const bellPath = `M${x - s * 0.35},${y} Q${x - s * 0.38},${y - s * 0.45} ${x},${y - s * 0.6} Q${x + s * 0.38},${y - s * 0.45} ${x + s * 0.35},${y} Q${x + s * 0.15},${y + s * 0.08} ${x},${y + s * 0.04} Q${x - s * 0.15},${y + s * 0.08} ${x - s * 0.35},${y} Z`;
  children.push(createPath(x, y, bellPath, color, { layer: 3, opacity: 0.3 }));
  // Inner body
  children.push(createPath(x, y, `M${x - s * 0.2},${y - s * 0.05} Q${x},${y - s * 0.4} ${x + s * 0.2},${y - s * 0.05}`, color, { layer: 3, opacity: 0.2, stroke: color, strokeWidth: 1 }));
  // Tentacles
  for (let i = 0; i < rng.nextInt(5, 8); i++) {
    const tx = x + (i - 3) * s * 0.08;
    const tLen = rng.nextFloat(s * 0.3, s * 0.8);
    const cp1x = tx + rng.nextFloat(-10, 10);
    const cp2x = tx + rng.nextFloat(-12, 12);
    const tentPath = `M${tx},${y + s * 0.04} Q${cp1x},${y + tLen * 0.4} ${tx + rng.nextFloat(-5, 5)},${y + tLen * 0.6} Q${cp2x},${y + tLen * 0.8} ${tx + rng.nextFloat(-8, 8)},${y + tLen}`;
    children.push(createPath(x, y, tentPath, 'none', { stroke: color, strokeWidth: rng.nextFloat(0.8, 2), layer: 3, opacity: rng.nextFloat(0.2, 0.4) }));
  }
  // Glow spots
  for (let i = 0; i < 3; i++) {
    children.push(createCircle(x + rng.nextFloat(-s * 0.1, s * 0.1), y - s * 0.25 + rng.nextFloat(-s * 0.1, s * 0.1), rng.nextFloat(1.5, 3), color, { layer: 3, opacity: 0.5 }));
  }
  return createGroup(x, y, children, { layer: 3, category: 'jellyfish', modifiable: true, id: uid('jelly'), filter: 'url(#glow)' });
}

// Octopus
function octopus(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const color = rng.pick(['#CC4488', '#8844AA', '#CC6644', '#AA4466']);
  const children: SVGElementData[] = [];

  // Head (rounded dome)
  const headPath = `M${x - s * 0.25},${y} Q${x - s * 0.3},${y - s * 0.3} ${x - s * 0.15},${y - s * 0.45} Q${x},${y - s * 0.55} ${x + s * 0.15},${y - s * 0.45} Q${x + s * 0.3},${y - s * 0.3} ${x + s * 0.25},${y} Z`;
  children.push(createPath(x, y, headPath, color, { layer: 3 }));
  // Eyes
  children.push(createCircle(x - s * 0.1, y - s * 0.2, s * 0.06, '#FFF', { layer: 3 }));
  children.push(createCircle(x + s * 0.1, y - s * 0.2, s * 0.06, '#FFF', { layer: 3 }));
  children.push(createCircle(x - s * 0.1, y - s * 0.2, s * 0.03, '#111', { layer: 3 }));
  children.push(createCircle(x + s * 0.1, y - s * 0.2, s * 0.03, '#111', { layer: 3 }));
  // Tentacles (8 curving arms)
  for (let i = 0; i < 8; i++) {
    const baseAngle = ((i - 3.5) / 7) * Math.PI * 0.8;
    const startX = x + Math.cos(baseAngle + Math.PI / 2) * s * 0.15;
    const startY = y;
    const endX = startX + Math.cos(baseAngle) * s * rng.nextFloat(0.4, 0.7);
    const endY = startY + s * rng.nextFloat(0.3, 0.6);
    const cpx1 = startX + rng.nextFloat(-s * 0.15, s * 0.15);
    const cpy1 = startY + s * 0.15;
    const cpx2 = endX + rng.nextFloat(-s * 0.1, s * 0.1);
    const cpy2 = endY - s * 0.1;
    const armPath = `M${startX},${startY} C${cpx1},${cpy1} ${cpx2},${cpy2} ${endX},${endY}`;
    children.push(createPath(x, y, armPath, 'none', { stroke: color, strokeWidth: rng.nextFloat(2.5, 4), layer: 3, opacity: 0.8 }));
    // Suckers
    for (let j = 0; j < 3; j++) {
      const t = (j + 1) / 4;
      const sx2 = startX + (endX - startX) * t + rng.nextFloat(-2, 2);
      const sy2 = startY + (endY - startY) * t + rng.nextFloat(-2, 2);
      children.push(createCircle(sx2, sy2, rng.nextFloat(1, 2), '#FFFFFF', { layer: 3, opacity: 0.3 }));
    }
  }
  return createGroup(x, y, children, { layer: 3, category: 'octopus', modifiable: true, id: uid('octo') });
}

// Decorative castle
function aquaCastle(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const stoneColor = '#A0A0A0';

  // Main tower
  children.push(createRect(x - s * 0.15, y - s * 0.6, s * 0.3, s * 0.6, stoneColor, { layer: 2, stroke: '#808080', strokeWidth: 0.8 }));
  // Tower top (crenellations)
  for (let i = 0; i < 3; i++) {
    children.push(createRect(x - s * 0.15 + i * s * 0.12, y - s * 0.7, s * 0.06, s * 0.1, stoneColor, { layer: 2 }));
  }
  // Left small tower
  children.push(createRect(x - s * 0.4, y - s * 0.4, s * 0.18, s * 0.4, '#909090', { layer: 2, stroke: '#707070', strokeWidth: 0.5 }));
  // Right small tower
  children.push(createRect(x + s * 0.22, y - s * 0.35, s * 0.18, s * 0.35, '#909090', { layer: 2, stroke: '#707070', strokeWidth: 0.5 }));
  // Archway door
  const archPath = `M${x - s * 0.08},${y} L${x - s * 0.08},${y - s * 0.15} Q${x},${y - s * 0.25} ${x + s * 0.08},${y - s * 0.15} L${x + s * 0.08},${y} Z`;
  children.push(createPath(x, y, archPath, '#555', { layer: 2 }));
  // Windows
  children.push(createRect(x - s * 0.06, y - s * 0.45, s * 0.04, s * 0.06, '#555', { layer: 2 }));
  children.push(createRect(x + s * 0.02, y - s * 0.45, s * 0.04, s * 0.06, '#555', { layer: 2 }));
  // Algae/moss patches
  for (let i = 0; i < 3; i++) {
    children.push(createCircle(x + rng.nextFloat(-s * 0.2, s * 0.2), y - rng.nextFloat(0, s * 0.4), rng.nextFloat(3, 8), '#4A8A40', { layer: 2, opacity: rng.nextFloat(0.2, 0.4) }));
  }

  return createGroup(x, y, children, { layer: 2, category: 'castle', modifiable: true, id: uid('castle') });
}

// Bubble
function bubble(x: number, y: number, r: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  children.push(createCircle(x, y, r, '#B3E5FC', { layer: 4, opacity: rng.nextFloat(0.12, 0.3), stroke: '#80DEEA', strokeWidth: 0.5 }));
  children.push(createCircle(x - r * 0.25, y - r * 0.25, r * 0.22, '#FFF', { layer: 4, opacity: 0.45 }));
  return createGroup(x, y, children, { layer: 4, category: 'bubble', modifiable: true, id: uid('bub') });
}

// Viewing glass frame
function tankFrame(w2: number, h2: number, glassLeft: number, glassTop: number, glassW: number, glassH: number): SVGElementData[] {
  const els: SVGElementData[] = [];
  const frameColor = '#2A2A35';
  const frameW = 12;

  // Top frame
  els.push(createRect(glassLeft - frameW, glassTop - frameW, glassW + frameW * 2, frameW, frameColor, { layer: 4, category: 'frame', modifiable: false }));
  // Bottom frame
  els.push(createRect(glassLeft - frameW, glassTop + glassH, glassW + frameW * 2, frameW, frameColor, { layer: 4, category: 'frame', modifiable: false }));
  // Left frame
  els.push(createRect(glassLeft - frameW, glassTop, frameW, glassH, frameColor, { layer: 4, category: 'frame', modifiable: false }));
  // Right frame
  els.push(createRect(glassLeft + glassW, glassTop, frameW, glassH, frameColor, { layer: 4, category: 'frame', modifiable: false }));

  // Corner bolts
  const boltR = 3;
  const corners = [
    { x: glassLeft - frameW / 2, y: glassTop - frameW / 2 },
    { x: glassLeft + glassW + frameW / 2, y: glassTop - frameW / 2 },
    { x: glassLeft - frameW / 2, y: glassTop + glassH + frameW / 2 },
    { x: glassLeft + glassW + frameW / 2, y: glassTop + glassH + frameW / 2 },
  ];
  for (const c of corners) {
    els.push(createCircle(c.x, c.y, boltR, '#555', { layer: 4, stroke: '#333', strokeWidth: 0.5 }));
  }

  // Glass reflections
  els.push(createPath(0, 0,
    `M${glassLeft + 15},${glassTop + 10} L${glassLeft + 20},${glassTop + 10} L${glassLeft + 10},${glassTop + glassH - 10} L${glassLeft + 5},${glassTop + glassH - 10} Z`,
    '#FFFFFF', { layer: 4, category: 'glass', modifiable: false, opacity: 0.06 }));
  els.push(createPath(0, 0,
    `M${glassLeft + glassW - 25},${glassTop + 15} L${glassLeft + glassW - 20},${glassTop + 15} L${glassLeft + glassW - 30},${glassTop + glassH - 20} L${glassLeft + glassW - 35},${glassTop + glassH - 20} Z`,
    '#FFFFFF', { layer: 4, category: 'glass', modifiable: false, opacity: 0.04 }));

  return els;
}

export function generateAquarium(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  // Tank dimensions (slightly inset from canvas)
  const glassL = 20;
  const glassT = 20;
  const glassW = w - 40;
  const glassH = h - 60;
  const floorY = glassT + glassH * 0.82;

  const defs = combineDefs(
    indoorDefs(),
    softGlow('glow', 6, '#4FC3F7'),
    softGlow('coralGlow', 4, '#FF8A80'),
    waterGradient('tankWater', '#0077AA', '#003366'),
    linearGradient('deepWater', [
      { offset: '0%', color: '#001830' },
      { offset: '25%', color: '#002850' },
      { offset: '55%', color: '#004488' },
      { offset: '100%', color: '#0066AA' },
    ]),
    radialGradient('lightBeam', [
      { offset: '0%', color: '#66CCFF', opacity: 0.1 },
      { offset: '100%', color: '#66CCFF', opacity: 0 },
    ], '50%', '0%', '80%'),
    linearGradient('sandGrad', [
      { offset: '0%', color: '#D4B870' },
      { offset: '50%', color: '#C8A850' },
      { offset: '100%', color: '#B89840' },
    ]),
    radialGradient('bubbleGrad', [
      { offset: '0%', color: '#FFF', opacity: 0.35 },
      { offset: '100%', color: '#80DEEA', opacity: 0.08 },
    ], '30%', '30%', '70%'),
  );

  // ═══════════════════════════════════════
  // LAYER 0 — Room wall behind tank
  // ═══════════════════════════════════════
  elements.push(createRect(0, 0, w, h, '#1A1A25', { layer: 0, category: 'room', modifiable: false }));

  // ═══════════════════════════════════════
  // LAYER 0 — Tank water background
  // ═══════════════════════════════════════
  elements.push(createRect(glassL, glassT, glassW, glassH, 'url(#deepWater)', { layer: 0, category: 'water', modifiable: false }));

  // Light beams from top
  for (let i = 0; i < rng.nextInt(4, 7); i++) {
    const rx = rng.nextFloat(glassL + 20, glassL + glassW - 20);
    const rw = rng.nextFloat(10, 30);
    const rh2 = rng.nextFloat(glassH * 0.3, glassH * 0.6);
    const rayPath = `M${rx - rw},${glassT} L${rx - rw * 2},${glassT + rh2} L${rx + rw * 2},${glassT + rh2} L${rx + rw},${glassT} Z`;
    elements.push(createPath(0, 0, rayPath, '#4FC3F7', { layer: 0, category: 'light', modifiable: false, opacity: rng.nextFloat(0.02, 0.06) }));
  }

  // Caustic patterns
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    elements.push(createEllipse(rng.nextFloat(glassL, glassL + glassW), rng.nextFloat(glassT, glassT + glassH * 0.5), rng.nextFloat(25, 60), rng.nextFloat(8, 20), '#64B5F6', {
      layer: 0, category: 'caustic', modifiable: false, opacity: rng.nextFloat(0.02, 0.05),
    }));
  }

  // ═══════════════════════════════════════
  // LAYER 1 — Sand bottom
  // ═══════════════════════════════════════
  const sandPath = `M${glassL},${floorY} Q${glassL + glassW * 0.15},${floorY - 5} ${glassL + glassW * 0.3},${floorY + 3} Q${glassL + glassW * 0.5},${floorY - 4} ${glassL + glassW * 0.7},${floorY + 2} Q${glassL + glassW * 0.85},${floorY - 3} ${glassL + glassW},${floorY + 4} L${glassL + glassW},${glassT + glassH} L${glassL},${glassT + glassH} Z`;
  elements.push(createPath(0, 0, sandPath, 'url(#sandGrad)', { layer: 1, category: 'sand', modifiable: false }));

  // Sand ripples
  for (let i = 0; i < 6; i++) {
    const ry = floorY + 5 + i * 8;
    elements.push(createPath(0, 0, `M${glassL + rng.nextFloat(0, 20)},${ry} Q${glassL + glassW * 0.25},${ry - 2} ${glassL + glassW * 0.5},${ry + 1} Q${glassL + glassW * 0.75},${ry - 1} ${glassL + glassW},${ry + 2}`, 'none', {
      stroke: '#B89840', strokeWidth: 0.8, layer: 1, opacity: 0.25,
    }));
  }

  // Small rocks
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    elements.push(detailedRock(rng.nextFloat(glassL + 20, glassL + glassW - 20), floorY + rng.nextFloat(-5, 10), rng.nextFloat(6, 15), rng));
  }

  // ═══════════════════════════════════════
  // LAYER 2 — Decorative castle
  // ═══════════════════════════════════════
  elements.push(aquaCastle(glassL + glassW * rng.nextFloat(0.6, 0.8), floorY, rng.nextFloat(35, 55), rng));

  // ═══════════════════════════════════════
  // LAYER 2 — Coral formations
  // ═══════════════════════════════════════
  for (let i = 0; i < rng.nextInt(4, 7); i++) {
    elements.push(detailedCoral(rng.nextFloat(glassL + 30, glassL + glassW - 30), floorY + rng.nextFloat(-10, 5), rng.nextFloat(30, 60), rng));
  }

  // ═══════════════════════════════════════
  // LAYER 2 — Seaweed
  // ═══════════════════════════════════════
  for (let i = 0; i < rng.nextInt(5, 9); i++) {
    elements.push(detailedSeaweed(rng.nextFloat(glassL + 10, glassL + glassW - 10), floorY + rng.nextFloat(-5, 10), rng.nextFloat(50, 120), rng));
  }

  // ═══════════════════════════════════════
  // LAYER 3 — Fish (detailed)
  // ═══════════════════════════════════════
  for (let i = 0; i < rng.nextInt(5, 8); i++) {
    const dir = rng.chance(0.5) ? 1 : -1;
    elements.push(detailedFish(
      rng.nextFloat(glassL + 40, glassL + glassW - 40),
      rng.nextFloat(glassT + 30, floorY - 30),
      rng.nextFloat(18, 38), rng, dir,
    ));
  }

  // ═══════════════════════════════════════
  // LAYER 3 — Shark
  // ═══════════════════════════════════════
  if (rng.chance(0.7)) {
    const dir = rng.chance(0.5) ? 1 : -1;
    elements.push(shark(
      rng.nextFloat(glassL + glassW * 0.2, glassL + glassW * 0.8),
      rng.nextFloat(glassT + 40, glassT + glassH * 0.35),
      rng.nextFloat(45, 65), rng, dir,
    ));
  }

  // ═══════════════════════════════════════
  // LAYER 3 — Sea turtle
  // ═══════════════════════════════════════
  if (rng.chance(0.65)) {
    const dir = rng.chance(0.5) ? 1 : -1;
    elements.push(seaTurtle(
      rng.nextFloat(glassL + glassW * 0.15, glassL + glassW * 0.85),
      rng.nextFloat(glassT + glassH * 0.25, glassT + glassH * 0.5),
      rng.nextFloat(30, 50), rng, dir,
    ));
  }

  // ═══════════════════════════════════════
  // LAYER 3 — Jellyfish
  // ═══════════════════════════════════════
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    elements.push(jellyfish(
      rng.nextFloat(glassL + 50, glassL + glassW - 50),
      rng.nextFloat(glassT + 30, glassT + glassH * 0.4),
      rng.nextFloat(20, 35), rng,
    ));
  }

  // ═══════════════════════════════════════
  // LAYER 3 — Octopus
  // ═══════════════════════════════════════
  if (rng.chance(0.55)) {
    elements.push(octopus(
      rng.nextFloat(glassL + glassW * 0.1, glassL + glassW * 0.4),
      floorY - rng.nextFloat(20, 40),
      rng.nextFloat(25, 40), rng,
    ));
  }

  // ═══════════════════════════════════════
  // LAYER 4 — Bubbles
  // ═══════════════════════════════════════
  for (let i = 0; i < rng.nextInt(12, 20); i++) {
    elements.push(bubble(
      rng.nextFloat(glassL + 10, glassL + glassW - 10),
      rng.nextFloat(glassT + 10, glassT + glassH - 10),
      rng.nextFloat(2, 10), rng,
    ));
  }

  // ═══════════════════════════════════════
  // LAYER 4 — Floating particles
  // ═══════════════════════════════════════
  for (let i = 0; i < rng.nextInt(15, 30); i++) {
    elements.push(createCircle(rng.nextFloat(glassL, glassL + glassW), rng.nextFloat(glassT, glassT + glassH), rng.nextFloat(0.3, 1.5), '#B3E5FC', {
      layer: 4, category: 'plankton', modifiable: false, opacity: rng.nextFloat(0.08, 0.25),
    }));
  }

  // ═══════════════════════════════════════
  // LAYER 4 — Tank frame
  // ═══════════════════════════════════════
  elements.push(...tankFrame(w, h, glassL, glassT, glassW, glassH));

  // ═══════════════════════════════════════
  // LAYER 4 — Info placard below tank
  // ═══════════════════════════════════════
  const placardX = w * 0.3;
  const placardY = glassT + glassH + 18;
  elements.push(createRect(placardX, placardY, w * 0.4, 22, '#F5F0E0', { layer: 4, category: 'placard', modifiable: false, stroke: '#C8B880', strokeWidth: 0.5 }));
  elements.push(createText(placardX + 10, placardY + 15, rng.pick(['Tropical Reef Tank', 'Ocean Ecosystem', 'Pacific Wonders', 'Deep Sea Display']), '#333', {
    layer: 4, category: 'text', modifiable: true, id: uid('label'), fontSize: 11, fontFamily: 'serif',
  }));

  return { elements, defs };
}
