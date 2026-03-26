import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath,
  createLine, createGroup, createText,
} from '../engine/primitives';
import {
  combineDefs, fantasyDefs, linearGradient, radialGradient,
  dropShadow, softGlow,
} from './svg-effects';
import { detailedRock, resetComponentId } from './svg-components';

let _uid = 0;
function uid(p = 'dl') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// Stalactite hanging from cave ceiling
function stalactite(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const color = rng.pick(['#5A5A6A', '#4A4A5A', '#6A6A7A', '#555566']);
  const w = s * rng.nextFloat(0.3, 0.5);
  const path = `M${x - w},${y} Q${x - w * 0.6},${y + s * 0.3} ${x - w * 0.15},${y + s * 0.85} L${x},${y + s} L${x + w * 0.15},${y + s * 0.85} Q${x + w * 0.6},${y + s * 0.3} ${x + w},${y} Z`;
  return createPath(x, y, path, color, { layer: 1, category: 'stalactite', modifiable: true, id: uid('stlc'), opacity: 0.9 });
}

// Stalagmite rising from cave floor
function stalagmite(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const color = rng.pick(['#5A5A6A', '#4E4E5E', '#636373']);
  const w = s * rng.nextFloat(0.25, 0.45);
  const path = `M${x - w},${y} Q${x - w * 0.5},${y - s * 0.4} ${x - w * 0.1},${y - s * 0.9} L${x},${y - s} L${x + w * 0.1},${y - s * 0.9} Q${x + w * 0.5},${y - s * 0.4} ${x + w},${y} Z`;
  return createPath(x, y, path, color, { layer: 2, category: 'stalagmite', modifiable: true, id: uid('stlg') });
}

// Treasure chest
function treasureChest(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const woodColor = rng.pick(['#6B3A10', '#7A4520', '#5C2E05']);
  const metalColor = '#C8A820';

  // Chest body
  children.push(createRect(x - s * 0.4, y - s * 0.3, s * 0.8, s * 0.35, woodColor, { layer: 3, stroke: '#3A1A00', strokeWidth: 1 }));
  // Chest lid (curved top)
  const lidPath = `M${x - s * 0.42},${y - s * 0.3} Q${x - s * 0.42},${y - s * 0.65} ${x},${y - s * 0.7} Q${x + s * 0.42},${y - s * 0.65} ${x + s * 0.42},${y - s * 0.3} Z`;
  children.push(createPath(x, y, lidPath, rng.pick(['#7A4520', '#6B3A10']), { layer: 3, stroke: '#3A1A00', strokeWidth: 1 }));
  // Metal bands
  children.push(createRect(x - s * 0.42, y - s * 0.32, s * 0.84, s * 0.04, metalColor, { layer: 3, opacity: 0.8 }));
  children.push(createRect(x - s * 0.42, y - s * 0.08, s * 0.84, s * 0.04, metalColor, { layer: 3, opacity: 0.8 }));
  // Lock
  children.push(createCircle(x, y - s * 0.3, s * 0.06, metalColor, { layer: 3, stroke: '#8A6800', strokeWidth: 1 }));
  // Keyhole
  children.push(createCircle(x, y - s * 0.3, s * 0.02, '#1A1A1A', { layer: 3 }));

  return createGroup(x, y, children, { layer: 3, category: 'chest', modifiable: true, id: uid('chest'), filter: 'url(#shadow)' });
}

// Gem / crystal
function gem(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const color = rng.pick(['#FF2244', '#22AAFF', '#44FF44', '#FF44FF', '#FFAA00', '#00FFCC']);
  const children: SVGElementData[] = [];
  const gemPath = `M${x},${y - s} L${x + s * 0.5},${y - s * 0.3} L${x + s * 0.35},${y + s * 0.3} L${x - s * 0.35},${y + s * 0.3} L${x - s * 0.5},${y - s * 0.3} Z`;
  children.push(createPath(x, y, gemPath, color, { layer: 3, opacity: 0.8 }));
  // Facet highlight
  const facetPath = `M${x},${y - s} L${x + s * 0.15},${y - s * 0.2} L${x - s * 0.15},${y - s * 0.2} Z`;
  children.push(createPath(x, y, facetPath, '#FFFFFF', { layer: 3, opacity: 0.35 }));
  return createGroup(x, y, children, { layer: 3, category: 'gem', modifiable: true, id: uid('gem'), filter: 'url(#magicGlow)' });
}

// Gold coin
function goldCoin(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  children.push(createEllipse(x, y, size, size * 0.6, '#D4A520', { layer: 3, stroke: '#A07800', strokeWidth: 0.8 }));
  children.push(createEllipse(x, y, size * 0.65, size * 0.38, '#E8C840', { layer: 3, opacity: 0.6 }));
  return createGroup(x, y, children, { layer: 3, category: 'coin', modifiable: true, id: uid('coin') });
}

// Skull with bones
function skull(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const boneColor = '#E8E0D0';

  // Skull dome
  const skullPath = `M${x - s * 0.35},${y + s * 0.1} Q${x - s * 0.4},${y - s * 0.2} ${x - s * 0.25},${y - s * 0.45} Q${x},${y - s * 0.6} ${x + s * 0.25},${y - s * 0.45} Q${x + s * 0.4},${y - s * 0.2} ${x + s * 0.35},${y + s * 0.1} L${x + s * 0.2},${y + s * 0.25} L${x - s * 0.2},${y + s * 0.25} Z`;
  children.push(createPath(x, y, skullPath, boneColor, { layer: 3, stroke: '#B0A890', strokeWidth: 0.8 }));
  // Eye sockets
  children.push(createEllipse(x - s * 0.12, y - s * 0.1, s * 0.08, s * 0.1, '#1A1015', { layer: 3 }));
  children.push(createEllipse(x + s * 0.12, y - s * 0.1, s * 0.08, s * 0.1, '#1A1015', { layer: 3 }));
  // Nose
  children.push(createPath(x, y, `M${x - s * 0.04},${y + s * 0.05} L${x},${y - s * 0.02} L${x + s * 0.04},${y + s * 0.05}`, '#1A1015', { layer: 3, opacity: 0.7 }));
  // Crossed bones
  children.push(createLine(x - s * 0.35, y + s * 0.2, x + s * 0.35, y + s * 0.45, boneColor, { strokeWidth: s * 0.08, layer: 3 }));
  children.push(createLine(x + s * 0.35, y + s * 0.2, x - s * 0.35, y + s * 0.45, boneColor, { strokeWidth: s * 0.08, layer: 3 }));

  return createGroup(x, y, children, { layer: 3, category: 'skull', modifiable: true, id: uid('skull') });
}

// Wall torch with flame
function wallTorch(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];

  // Bracket on wall
  children.push(createRect(x - s * 0.08, y, s * 0.16, s * 0.06, '#555555', { layer: 2, stroke: '#333333', strokeWidth: 0.5 }));
  // Torch stick
  children.push(createRect(x - s * 0.04, y - s * 0.5, s * 0.08, s * 0.55, '#6B3A10', { layer: 2 }));
  // Flame (outer)
  const flamePath = `M${x},${y - s * 1.1} Q${x - s * 0.15},${y - s * 0.8} ${x - s * 0.1},${y - s * 0.55} Q${x},${y - s * 0.45} ${x + s * 0.1},${y - s * 0.55} Q${x + s * 0.15},${y - s * 0.8} ${x},${y - s * 1.1} Z`;
  children.push(createPath(x, y, flamePath, '#FF6600', { layer: 3, opacity: 0.9 }));
  // Flame (inner)
  const innerFlame = `M${x},${y - s * 1.0} Q${x - s * 0.08},${y - s * 0.78} ${x - s * 0.05},${y - s * 0.6} Q${x},${y - s * 0.52} ${x + s * 0.05},${y - s * 0.6} Q${x + s * 0.08},${y - s * 0.78} ${x},${y - s * 1.0} Z`;
  children.push(createPath(x, y, innerFlame, '#FFCC00', { layer: 3, opacity: 0.8 }));
  // Flame glow
  children.push(createCircle(x, y - s * 0.7, s * 0.4, 'url(#fireGlow)', { layer: 2, opacity: 0.4 }));

  return createGroup(x, y, children, { layer: 2, category: 'torch', modifiable: true, id: uid('torch') });
}

// Smoke wisps
function smokeWisp(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const dx1 = rng.nextFloat(-s * 0.3, s * 0.3);
  const dx2 = rng.nextFloat(-s * 0.5, s * 0.5);
  const path = `M${x},${y} Q${x + dx1},${y - s * 0.4} ${x + dx2},${y - s * 0.8} Q${x + dx2 + rng.nextFloat(-s * 0.2, s * 0.2)},${y - s * 1.1} ${x + rng.nextFloat(-s * 0.3, s * 0.3)},${y - s * 1.3}`;
  return createPath(x, y, path, 'none', {
    stroke: '#888888', strokeWidth: rng.nextFloat(1.5, 3.5),
    layer: 4, category: 'smoke', modifiable: false, opacity: rng.nextFloat(0.08, 0.18),
  });
}

// Dragon sleeping on gold
function dragon(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const bodyColor = rng.pick(['#2D6B30', '#8B2020', '#1A3A6B', '#5A1A6B']);
  const bellyColor = rng.pick(['#D4A520', '#C8B060', '#E8C860']);
  const wingColor = rng.pick(['#3A2010', '#4A1515', '#1A2A4A']);

  // Tail (curving around)
  const tailPath = `M${x + s * 0.6},${y + s * 0.1} Q${x + s * 0.9},${y + s * 0.15} ${x + s * 1.1},${y} Q${x + s * 1.25},${y - s * 0.15} ${x + s * 1.15},${y - s * 0.25} Q${x + s * 1.0},${y - s * 0.3} ${x + s * 0.95},${y - s * 0.2}`;
  children.push(createPath(x, y, tailPath, 'none', { stroke: bodyColor, strokeWidth: s * 0.12, layer: 2 }));
  // Tail tip (spade)
  const tipPath = `M${x + s * 1.15},${y - s * 0.25} L${x + s * 1.3},${y - s * 0.35} L${x + s * 1.2},${y - s * 0.18} L${x + s * 1.3},${y - s * 0.1} Z`;
  children.push(createPath(x, y, tipPath, bodyColor, { layer: 2 }));

  // Body (curled, sleeping form)
  const bodyPath = `M${x - s * 0.5},${y + s * 0.15} Q${x - s * 0.55},${y - s * 0.1} ${x - s * 0.35},${y - s * 0.25} Q${x - s * 0.1},${y - s * 0.35} ${x + s * 0.2},${y - s * 0.3} Q${x + s * 0.5},${y - s * 0.25} ${x + s * 0.6},${y + s * 0.1} Q${x + s * 0.4},${y + s * 0.25} ${x + s * 0.1},${y + s * 0.3} Q${x - s * 0.2},${y + s * 0.3} ${x - s * 0.5},${y + s * 0.15} Z`;
  children.push(createPath(x, y, bodyPath, bodyColor, { layer: 2 }));

  // Belly scales
  const bellyPath = `M${x - s * 0.3},${y + s * 0.12} Q${x},${y + s * 0.22} ${x + s * 0.35},${y + s * 0.15} Q${x + s * 0.3},${y + s * 0.05} ${x},${y} Q${x - s * 0.2},${y + s * 0.02} ${x - s * 0.3},${y + s * 0.12} Z`;
  children.push(createPath(x, y, bellyPath, bellyColor, { layer: 2, opacity: 0.6 }));

  // Wing (folded over body)
  const wingPath = `M${x - s * 0.1},${y - s * 0.25} Q${x + s * 0.05},${y - s * 0.55} ${x + s * 0.35},${y - s * 0.5} Q${x + s * 0.55},${y - s * 0.45} ${x + s * 0.5},${y - s * 0.2} Q${x + s * 0.35},${y - s * 0.15} ${x + s * 0.15},${y - s * 0.12} Z`;
  children.push(createPath(x, y, wingPath, wingColor, { layer: 2, opacity: 0.7 }));
  // Wing membrane lines
  for (let i = 0; i < 3; i++) {
    const t = (i + 1) * 0.25;
    const mx = x - s * 0.1 + (x + s * 0.5 - (x - s * 0.1)) * t;
    const my = y - s * 0.25 + (y - s * 0.2 - (y - s * 0.25)) * t;
    const ty = y - s * 0.5 + t * s * 0.1;
    children.push(createLine(mx, my, mx + s * 0.05, ty, wingColor, { strokeWidth: 1, layer: 2, opacity: 0.5 }));
  }

  // Neck and head (curled inward, sleeping)
  const neckPath = `M${x - s * 0.35},${y - s * 0.2} Q${x - s * 0.55},${y - s * 0.35} ${x - s * 0.5},${y - s * 0.5} Q${x - s * 0.45},${y - s * 0.6} ${x - s * 0.3},${y - s * 0.55}`;
  children.push(createPath(x, y, neckPath, 'none', { stroke: bodyColor, strokeWidth: s * 0.1, layer: 2 }));

  // Head
  const headPath = `M${x - s * 0.42},${y - s * 0.55} Q${x - s * 0.48},${y - s * 0.65} ${x - s * 0.35},${y - s * 0.7} Q${x - s * 0.2},${y - s * 0.72} ${x - s * 0.15},${y - s * 0.62} Q${x - s * 0.18},${y - s * 0.52} ${x - s * 0.3},${y - s * 0.5} Z`;
  children.push(createPath(x, y, headPath, bodyColor, { layer: 3 }));

  // Closed eye
  const eyeX = x - s * 0.28;
  const eyeY = y - s * 0.6;
  children.push(createPath(x, y, `M${eyeX - s * 0.04},${eyeY} Q${eyeX},${eyeY + s * 0.02} ${eyeX + s * 0.04},${eyeY}`, 'none', {
    stroke: '#FFCC00', strokeWidth: 1.5, layer: 3,
  }));

  // Nostrils (small smoke)
  const nostrilX = x - s * 0.18;
  const nostrilY = y - s * 0.65;
  children.push(createCircle(nostrilX, nostrilY, s * 0.015, '#1A1A1A', { layer: 3 }));
  children.push(createCircle(nostrilX + s * 0.04, nostrilY + s * 0.01, s * 0.015, '#1A1A1A', { layer: 3 }));

  // Horns
  children.push(createPath(x, y, `M${x - s * 0.35},${y - s * 0.68} Q${x - s * 0.42},${y - s * 0.82} ${x - s * 0.38},${y - s * 0.9}`, 'none', { stroke: '#8A7A60', strokeWidth: s * 0.03, layer: 3 }));
  children.push(createPath(x, y, `M${x - s * 0.25},${y - s * 0.7} Q${x - s * 0.28},${y - s * 0.84} ${x - s * 0.22},${y - s * 0.88}`, 'none', { stroke: '#8A7A60', strokeWidth: s * 0.025, layer: 3 }));

  // Spines along back
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const sx2 = x - s * 0.3 + t * s * 0.8;
    const sy2 = y - s * 0.28 + Math.sin(t * Math.PI) * s * 0.08;
    children.push(createPath(x, y, `M${sx2 - s * 0.02},${sy2} L${sx2},${sy2 - s * 0.08} L${sx2 + s * 0.02},${sy2}`, bodyColor, { layer: 2, opacity: 0.9 }));
  }

  return createGroup(x, y, children, { layer: 2, category: 'dragon', modifiable: true, id: uid('dragon'), filter: 'url(#shadow)' });
}

// Gold pile
function goldPile(x: number, y: number, w2: number, h2: number, rng: SeededRandom): SVGElementData[] {
  const elements: SVGElementData[] = [];
  // Mound shape
  const moundPath = `M${x - w2 / 2},${y} Q${x - w2 * 0.3},${y - h2 * 0.8} ${x},${y - h2} Q${x + w2 * 0.3},${y - h2 * 0.8} ${x + w2 / 2},${y} Z`;
  elements.push(createPath(x, y, moundPath, '#C8A520', { layer: 2, category: 'gold', modifiable: false, opacity: 0.8 }));
  // Gold highlight
  const highlightPath = `M${x - w2 * 0.15},${y - h2 * 0.5} Q${x},${y - h2 * 0.85} ${x + w2 * 0.1},${y - h2 * 0.6}`;
  elements.push(createPath(x, y, highlightPath, 'none', { stroke: '#E8D860', strokeWidth: 2.5, layer: 2, opacity: 0.5 }));
  // Scattered coins on top
  for (let i = 0; i < rng.nextInt(8, 14); i++) {
    const cx = x + rng.nextFloat(-w2 * 0.35, w2 * 0.35);
    const cy = y - rng.nextFloat(h2 * 0.1, h2 * 0.85);
    const cs = rng.nextFloat(3, 6);
    elements.push(createEllipse(cx, cy, cs, cs * 0.6, rng.pick(['#D4A520', '#E8C840', '#B8901A']), { layer: 2, opacity: rng.nextFloat(0.6, 1) }));
  }
  return elements;
}

export function generateDragonLair(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  // === SVG Defs ===
  const defs = combineDefs(
    fantasyDefs(),
    dropShadow('shadow', 2, 3, 4, 'rgba(0,0,0,0.5)'),
    softGlow('fireGlow', 12, '#FF6600'),
    softGlow('lavaGlow', 10, '#FF4400'),
    linearGradient('caveBg', [
      { offset: '0%', color: '#0A0808' },
      { offset: '30%', color: '#1A1210' },
      { offset: '60%', color: '#251A15' },
      { offset: '100%', color: '#1A1010' },
    ]),
    linearGradient('caveWall', [
      { offset: '0%', color: '#2A2228' },
      { offset: '50%', color: '#1E1620' },
      { offset: '100%', color: '#141018' },
    ]),
    radialGradient('lavaPoolGrad', [
      { offset: '0%', color: '#FF6600', opacity: 0.9 },
      { offset: '40%', color: '#CC3300', opacity: 0.7 },
      { offset: '80%', color: '#881100', opacity: 0.5 },
      { offset: '100%', color: '#440800', opacity: 0.3 },
    ]),
    radialGradient('fireGlowGrad', [
      { offset: '0%', color: '#FF8800', opacity: 0.15 },
      { offset: '50%', color: '#FF4400', opacity: 0.06 },
      { offset: '100%', color: '#FF2200', opacity: 0 },
    ]),
  );

  // ═══════════════════════════════════════
  // LAYER 0 — Cave background
  // ═══════════════════════════════════════
  elements.push(createRect(0, 0, w, h, 'url(#caveBg)', { layer: 0, category: 'cave', modifiable: false }));

  // Cave ceiling (irregular dark shape)
  const ceilPath = `M0,0 L${w},0 L${w},${h * 0.12} Q${w * 0.85},${h * 0.08} ${w * 0.7},${h * 0.15} Q${w * 0.55},${h * 0.2} ${w * 0.4},${h * 0.12} Q${w * 0.25},${h * 0.06} ${w * 0.1},${h * 0.18} L0,${h * 0.1} Z`;
  elements.push(createPath(0, 0, ceilPath, '#0A0808', { layer: 0, category: 'cave', modifiable: false }));

  // Cave walls (left and right)
  const leftWall = `M0,0 L0,${h} L${w * 0.08},${h} Q${w * 0.12},${h * 0.7} ${w * 0.06},${h * 0.5} Q${w * 0.1},${h * 0.3} ${w * 0.04},${h * 0.15} L0,0 Z`;
  elements.push(createPath(0, 0, leftWall, 'url(#caveWall)', { layer: 0, category: 'cave', modifiable: false }));
  const rightWall = `M${w},0 L${w},${h} L${w * 0.92},${h} Q${w * 0.88},${h * 0.65} ${w * 0.94},${h * 0.45} Q${w * 0.9},${h * 0.25} ${w * 0.96},${h * 0.1} L${w},0 Z`;
  elements.push(createPath(0, 0, rightWall, 'url(#caveWall)', { layer: 0, category: 'cave', modifiable: false }));

  // Cave floor
  const floorY = h * 0.78;
  const floorPath = `M0,${floorY} Q${w * 0.15},${floorY - 10} ${w * 0.3},${floorY + 5} Q${w * 0.5},${floorY - 8} ${w * 0.7},${floorY + 3} Q${w * 0.85},${floorY - 5} ${w},${floorY + 8} L${w},${h} L0,${h} Z`;
  elements.push(createPath(0, 0, floorPath, '#1A1210', { layer: 1, category: 'floor', modifiable: false }));

  // ═══════════════════════════════════════
  // LAYER 0 — Ambient fire glow from lava
  // ═══════════════════════════════════════
  elements.push(createCircle(w * 0.65, floorY + 20, w * 0.3, 'url(#fireGlowGrad)', { layer: 0, category: 'glow', modifiable: false }));
  elements.push(createCircle(w * 0.2, h * 0.3, w * 0.15, 'url(#fireGlowGrad)', { layer: 0, category: 'glow', modifiable: false, opacity: 0.5 }));

  // ═══════════════════════════════════════
  // LAYER 1 — Stalactites from ceiling
  // ═══════════════════════════════════════
  for (let i = 0; i < rng.nextInt(5, 8); i++) {
    const sx = rng.nextFloat(w * 0.05, w * 0.95);
    const sy = rng.nextFloat(h * 0.02, h * 0.12);
    elements.push(stalactite(sx, sy, rng.nextFloat(30, 65), rng));
  }

  // ═══════════════════════════════════════
  // LAYER 2 — Stalagmites from floor
  // ═══════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const sx = rng.nextFloat(w * 0.02, w * 0.2);
    elements.push(stalagmite(sx, floorY + rng.nextFloat(-5, 5), rng.nextFloat(25, 50), rng));
  }
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const sx = rng.nextFloat(w * 0.8, w * 0.98);
    elements.push(stalagmite(sx, floorY + rng.nextFloat(-5, 5), rng.nextFloat(20, 45), rng));
  }

  // ═══════════════════════════════════════
  // LAYER 1 — Lava pool
  // ═══════════════════════════════════════
  const lavaX = w * rng.nextFloat(0.55, 0.7);
  const lavaY = floorY + rng.nextFloat(5, 15);
  const lavaW = rng.nextFloat(80, 130);
  const lavaH = rng.nextFloat(20, 35);
  elements.push(createEllipse(lavaX, lavaY, lavaW, lavaH, 'url(#lavaPoolGrad)', {
    layer: 1, category: 'lava', modifiable: true, id: uid('lava'), filter: 'url(#lavaGlow)',
  }));
  // Lava bubbles
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    const bx = lavaX + rng.nextFloat(-lavaW * 0.6, lavaW * 0.6);
    const by = lavaY + rng.nextFloat(-lavaH * 0.3, lavaH * 0.3);
    elements.push(createCircle(bx, by, rng.nextFloat(2, 5), '#FF8800', { layer: 2, opacity: rng.nextFloat(0.3, 0.6) }));
  }

  // ═══════════════════════════════════════
  // LAYER 2 — Gold pile
  // ═══════════════════════════════════════
  const gpX = w * rng.nextFloat(0.35, 0.5);
  const gpY = floorY;
  elements.push(...goldPile(gpX, gpY, w * 0.35, h * 0.15, rng));

  // ═══════════════════════════════════════
  // LAYER 2 — Dragon sleeping on gold
  // ═══════════════════════════════════════
  elements.push(dragon(gpX, gpY - h * 0.08, rng.nextFloat(90, 120), rng));

  // ═══════════════════════════════════════
  // LAYER 3 — Treasure chests
  // ═══════════════════════════════════════
  elements.push(treasureChest(w * rng.nextFloat(0.1, 0.2), floorY - rng.nextFloat(5, 15), rng.nextFloat(22, 32), rng));
  if (rng.chance(0.7)) {
    elements.push(treasureChest(w * rng.nextFloat(0.7, 0.85), floorY - rng.nextFloat(5, 15), rng.nextFloat(18, 28), rng));
  }

  // ═══════════════════════════════════════
  // LAYER 3 — Gems scattered
  // ═══════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    elements.push(gem(rng.nextFloat(w * 0.1, w * 0.9), floorY - rng.nextFloat(0, 15), rng.nextFloat(6, 12), rng));
  }

  // ═══════════════════════════════════════
  // LAYER 3 — Gold coins scattered
  // ═══════════════════════════════════════
  for (let i = 0; i < rng.nextInt(4, 7); i++) {
    elements.push(goldCoin(rng.nextFloat(w * 0.15, w * 0.85), floorY - rng.nextFloat(0, 8), rng.nextFloat(3, 6), rng));
  }

  // ═══════════════════════════════════════
  // LAYER 3 — Skull and bones
  // ═══════════════════════════════════════
  elements.push(skull(w * rng.nextFloat(0.08, 0.18), floorY - rng.nextFloat(8, 18), rng.nextFloat(14, 22), rng));
  if (rng.chance(0.6)) {
    elements.push(skull(w * rng.nextFloat(0.78, 0.92), floorY - rng.nextFloat(5, 12), rng.nextFloat(10, 16), rng));
  }

  // ═══════════════════════════════════════
  // LAYER 2 — Wall torches
  // ═══════════════════════════════════════
  elements.push(wallTorch(w * 0.12, h * 0.25, rng.nextFloat(25, 35), rng));
  elements.push(wallTorch(w * 0.88, h * 0.3, rng.nextFloat(25, 35), rng));

  // ═══════════════════════════════════════
  // LAYER 3 — Rocks
  // ═══════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    elements.push(detailedRock(rng.nextFloat(w * 0.05, w * 0.95), floorY + rng.nextFloat(-8, 10), rng.nextFloat(12, 25), rng));
  }

  // ═══════════════════════════════════════
  // LAYER 4 — Smoke wisps
  // ═══════════════════════════════════════
  for (let i = 0; i < rng.nextInt(4, 7); i++) {
    elements.push(smokeWisp(rng.nextFloat(w * 0.1, w * 0.9), rng.nextFloat(h * 0.3, floorY), rng.nextFloat(40, 80), rng));
  }
  // Smoke from dragon nostrils
  for (let i = 0; i < 2; i++) {
    elements.push(smokeWisp(gpX - 90 + rng.nextFloat(-10, 10), gpY - h * 0.08 - 60, rng.nextFloat(20, 40), rng));
  }

  // ═══════════════════════════════════════
  // LAYER 4 — Vignette (dark edges for cave feel)
  // ═══════════════════════════════════════
  elements.push(createRect(0, 0, w, h * 0.08, '#050505', { layer: 4, category: 'vignette', modifiable: false, opacity: 0.6 }));
  elements.push(createRect(0, h * 0.92, w, h * 0.08, '#050505', { layer: 4, category: 'vignette', modifiable: false, opacity: 0.5 }));

  return { elements, defs };
}
