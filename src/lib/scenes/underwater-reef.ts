import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import { createRect, createCircle, createEllipse, createPath, createGroup, createLine } from '../engine/primitives';
import {
  combineDefs, outdoorDefs, waterRipple, linearGradient, radialGradient,
  softGlow, waterGradient,
} from './svg-effects';
import {
  detailedFish, detailedCoral, detailedSeaweed, detailedRock,
  detailedStar, resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'uw') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// Detailed jellyfish with translucent bell + flowing tentacles
function detailedJellyfish(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const color = rng.pick(['#E040FB', '#FF80AB', '#B388FF', '#82B1FF', '#80D8FF', '#A7FFEB']);
  const children: SVGElementData[] = [];

  const bellPath = `M${x - s * 0.4},${y} Q${x - s * 0.45},${y - s * 0.5} ${x - s * 0.2},${y - s * 0.7} Q${x},${y - s * 0.8} ${x + s * 0.2},${y - s * 0.7} Q${x + s * 0.45},${y - s * 0.5} ${x + s * 0.4},${y} Q${x + s * 0.2},${y + s * 0.1} ${x},${y + s * 0.05} Q${x - s * 0.2},${y + s * 0.1} ${x - s * 0.4},${y} Z`;
  children.push(createPath(x, y, bellPath, color, { layer: 3, opacity: 0.35 }));

  const innerPath = `M${x - s * 0.25},${y - s * 0.1} Q${x - s * 0.3},${y - s * 0.4} ${x},${y - s * 0.55} Q${x + s * 0.3},${y - s * 0.4} ${x + s * 0.25},${y - s * 0.1}`;
  children.push(createPath(x, y, innerPath, color, { layer: 3, opacity: 0.2, stroke: color, strokeWidth: 1 }));

  const rimPath = `M${x - s * 0.38},${y} Q${x - s * 0.2},${y + s * 0.08} ${x},${y + s * 0.03} Q${x + s * 0.2},${y + s * 0.08} ${x + s * 0.38},${y}`;
  children.push(createPath(x, y, rimPath, 'none', { stroke: color, strokeWidth: 2, layer: 3, opacity: 0.5 }));

  const tentCount = rng.nextInt(6, 8);
  for (let i = 0; i < tentCount; i++) {
    const tx = x + (i - tentCount / 2) * s * 0.1;
    const tLen = rng.nextFloat(s * 0.4, s * 1.0);
    const waviness = rng.nextFloat(8, 20);
    const cp1x = tx + rng.nextFloat(-waviness, waviness);
    const cp2x = tx + rng.nextFloat(-waviness, waviness);
    const tentPath = `M${tx},${y + s * 0.05} Q${cp1x},${y + tLen * 0.35} ${tx + rng.nextFloat(-5, 5)},${y + tLen * 0.5} Q${cp2x},${y + tLen * 0.7} ${tx + rng.nextFloat(-8, 8)},${y + tLen}`;
    children.push(createPath(x, y, tentPath, 'none', {
      stroke: color, strokeWidth: rng.nextFloat(1, 2.5), layer: 3, opacity: rng.nextFloat(0.2, 0.45),
    }));
  }

  for (let i = 0; i < 4; i++) {
    children.push(createCircle(x + rng.nextFloat(-s * 0.15, s * 0.15), y - s * 0.3 + rng.nextFloat(-s * 0.15, s * 0.15), rng.nextFloat(2, 4), color, { layer: 3, opacity: 0.5 }));
  }

  return createGroup(x, y, children, { layer: 3, category: 'jellyfish', modifiable: true, id: uid('jelly'), filter: 'url(#glow)' });
}

// Fancy bubble
function fancyBubble(x: number, y: number, r: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  children.push(createCircle(x, y, r, '#B3E5FC', { layer: 4, opacity: rng.nextFloat(0.15, 0.35), stroke: '#80DEEA', strokeWidth: 0.5 }));
  children.push(createCircle(x - r * 0.25, y - r * 0.25, r * 0.25, '#FFF', { layer: 4, opacity: 0.5 }));
  return createGroup(x, y, children, { layer: 4, category: 'bubble', modifiable: true, id: uid('bub') });
}

// Sea floor with sand ripples
function seaFloor(w2: number, h2: number, floorY: number, rng: SeededRandom): SVGElementData[] {
  const els: SVGElementData[] = [];

  const sandPath = `M0,${floorY} Q${w2 * 0.1},${floorY - 8} ${w2 * 0.2},${floorY + 3} Q${w2 * 0.35},${floorY - 5} ${w2 * 0.5},${floorY + 4} Q${w2 * 0.65},${floorY - 3} ${w2 * 0.8},${floorY + 5} Q${w2 * 0.9},${floorY - 2} ${w2},${floorY + 3} L${w2},${h2} L0,${h2} Z`;
  els.push(createPath(0, 0, sandPath, '#C8B560', { layer: 1, category: 'sand', modifiable: false, opacity: 0.5 }));
  els.push(createRect(0, floorY + 20, w2, h2 - floorY - 20, '#A69040', { layer: 1, category: 'sand', modifiable: false, opacity: 0.3 }));

  // Sand ripples
  for (let i = 0; i < 8; i++) {
    const ry = floorY + 5 + i * 10;
    els.push(createPath(0, 0, `M${rng.nextFloat(0, 30)},${ry} Q${w2 * 0.25},${ry - 3} ${w2 * 0.5},${ry + 2} Q${w2 * 0.75},${ry - 2} ${w2},${ry + 1}`, 'none', { stroke: '#B8A050', strokeWidth: 1, layer: 1, opacity: 0.3 }));
  }

  // Small rocks (use detailedRock)
  for (let i = 0; i < rng.nextInt(4, 8); i++) {
    els.push(detailedRock(rng.nextFloat(20, w2 - 20), rng.nextFloat(floorY - 5, floorY + 15), rng.nextFloat(8, 20), rng));
  }

  // Shells
  for (let i = 0; i < rng.nextInt(2, 5); i++) {
    const sx = rng.nextFloat(30, w2 - 30);
    const sy = rng.nextFloat(floorY, floorY + 15);
    const ss = rng.nextFloat(4, 9);
    const shellColor = rng.pick(['#FFF8E1', '#FFCCBC', '#F8BBD0', '#F0F4C3']);
    const shellPath = `M${sx},${sy} Q${sx - ss},${sy - ss * 1.3} ${sx},${sy - ss * 1.5} Q${sx + ss},${sy - ss * 1.3} ${sx + ss * 0.3},${sy - ss * 0.3} Q${sx + ss * 0.5},${sy} ${sx},${sy} Z`;
    els.push(createPath(sx, sy, shellPath, shellColor, { layer: 3, category: 'shell', modifiable: true, id: uid('shell'), opacity: 0.8 }));
  }

  // Starfish
  if (rng.chance(0.7)) {
    els.push(detailedStar(rng.nextFloat(60, w2 - 60), rng.nextFloat(floorY, floorY + 12), 14, rng));
  }

  return els;
}

export function generateUnderwaterReef(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];
  const floorY = h * 0.78;

  // === SVG Defs ===
  const defs = combineDefs(
    outdoorDefs(),
    waterRipple('waterRipple'),
    linearGradient('waterGrad', [
      { offset: '0%', color: '#001428' },
      { offset: '25%', color: '#002244' },
      { offset: '50%', color: '#003366' },
      { offset: '75%', color: '#0055AA' },
      { offset: '100%', color: '#0077CC' },
    ]),
    radialGradient('lightRay', [
      { offset: '0%', color: '#4FC3F7', opacity: 0.12 },
      { offset: '100%', color: '#4FC3F7', opacity: 0 },
    ], '50%', '0%', '80%'),
    radialGradient('bubbleGrad', [
      { offset: '0%', color: '#FFF', opacity: 0.4 },
      { offset: '100%', color: '#80DEEA', opacity: 0.1 },
    ], '30%', '30%', '70%'),
    softGlow('underwaterGlow', 4, '#4FC3F7'),
    waterGradient('seaFloorGrad', '#1a6b8a', '#0a3d5c'),
  );

  // === LAYER 0: Water background ===
  elements.push(createRect(0, 0, w, h, 'url(#waterGrad)', { layer: 0, category: 'water', modifiable: false }));

  // === LAYER 0: Light rays from surface ===
  for (let i = 0; i < rng.nextInt(5, 8); i++) {
    const rx = rng.nextFloat(w * 0.05, w * 0.95);
    const rw = rng.nextFloat(15, 45);
    const rh = rng.nextFloat(h * 0.3, h * 0.7);
    const rayPath = `M${rx - rw},0 L${rx - rw * 2.5},${rh} L${rx + rw * 2.5},${rh} L${rx + rw},0 Z`;
    elements.push(createPath(0, 0, rayPath, '#4FC3F7', { layer: 0, category: 'light', modifiable: false, opacity: rng.nextFloat(0.03, 0.08) }));
  }

  // === LAYER 0: Caustic light patterns ===
  for (let i = 0; i < rng.nextInt(4, 8); i++) {
    elements.push(createEllipse(rng.nextFloat(0, w), rng.nextFloat(h * 0.1, h * 0.5), rng.nextFloat(30, 80), rng.nextFloat(10, 30), '#64B5F6', {
      layer: 0, category: 'caustic', modifiable: false, opacity: rng.nextFloat(0.02, 0.06),
    }));
  }

  // === LAYER 1: Sea floor ===
  elements.push(...seaFloor(w, h, floorY, rng));

  // === LAYER 2: Coral formations (detailed) ===
  for (let i = 0; i < rng.nextInt(5, 9); i++) {
    const coralEl = detailedCoral(rng.nextFloat(25, w - 25), rng.nextFloat(floorY - 10, floorY + 10), rng.nextFloat(40, 80), rng);
    elements.push(coralEl);
  }

  // === LAYER 2: Seaweed (detailed) ===
  for (let i = 0; i < rng.nextInt(6, 12); i++) {
    elements.push(detailedSeaweed(rng.nextFloat(10, w - 10), floorY + rng.nextFloat(-5, 15), rng.nextFloat(60, 150), rng));
  }

  // === LAYER 3: Foreground fish (detailed) ===
  for (let i = 0; i < rng.nextInt(6, 10); i++) {
    const dir = rng.chance(0.5) ? 1 : -1;
    const fishEl = detailedFish(rng.nextFloat(40, w - 40), rng.nextFloat(h * 0.1, floorY - 30), rng.nextFloat(22, 45), rng, dir);
    elements.push(fishEl);
  }

  // === LAYER 1: Distant fish silhouettes (bg depth) ===
  for (let i = 0; i < rng.nextInt(4, 8); i++) {
    const fx = rng.nextFloat(20, w - 20);
    const fy = rng.nextFloat(h * 0.05, h * 0.4);
    const fs = rng.nextFloat(8, 16);
    const bodyPath = `M${fx + fs},${fy} Q${fx + fs * 0.5},${fy - fs * 0.3} ${fx - fs * 0.5},${fy} Q${fx + fs * 0.5},${fy + fs * 0.3} ${fx + fs},${fy}`;
    const tailPath = `M${fx + fs},${fy} L${fx + fs * 1.4},${fy - fs * 0.25} L${fx + fs * 1.3},${fy} L${fx + fs * 1.4},${fy + fs * 0.25} Z`;
    elements.push(createPath(fx, fy, bodyPath, '#0D47A1', { layer: 1, category: 'fish_bg', modifiable: false, opacity: 0.15, filter: 'url(#bgBlur)' }));
    elements.push(createPath(fx, fy, tailPath, '#0D47A1', { layer: 1, category: 'fish_bg', modifiable: false, opacity: 0.12, filter: 'url(#bgBlur)' }));
  }

  // === LAYER 3: Jellyfish (1-3) ===
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    elements.push(detailedJellyfish(rng.nextFloat(60, w - 60), rng.nextFloat(h * 0.08, h * 0.45), rng.nextFloat(25, 45), rng));
  }

  // === LAYER 4: Bubbles (15-25) ===
  for (let i = 0; i < rng.nextInt(15, 25); i++) {
    elements.push(fancyBubble(rng.nextFloat(8, w - 8), rng.nextFloat(h * 0.05, h * 0.85), rng.nextFloat(3, 12), rng));
  }

  // === LAYER 4: Floating particles (plankton) ===
  for (let i = 0; i < rng.nextInt(20, 40); i++) {
    elements.push(createCircle(rng.nextFloat(0, w), rng.nextFloat(0, h), rng.nextFloat(0.5, 2), '#B3E5FC', {
      layer: 4, category: 'plankton', modifiable: false, opacity: rng.nextFloat(0.1, 0.35),
    }));
  }

  // === LAYER 4: Depth fog ===
  elements.push(createRect(0, h * 0.85, w, h * 0.15, '#001428', { layer: 4, category: 'fog', modifiable: false, opacity: 0.25 }));
  elements.push(createRect(0, 0, w, h * 0.05, '#000A14', { layer: 4, category: 'fog', modifiable: false, opacity: 0.3 }));

  return { elements, defs };
}
