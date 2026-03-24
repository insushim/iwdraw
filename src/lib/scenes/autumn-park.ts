import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath, createGroup,
  createLine, createPolygon, createTree, createBird, createBench,
  createPerson, createFence, createRock, createLamp,
} from '../engine/primitives';

let _uid = 0;
function uid(p = 'ap') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// ─── Autumn-colored tree with detailed foliage ───
function autumnTree(x: number, y: number, size: number, type: 'oak' | 'willow', rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const trunkColor = rng.pick(['#5C3317', '#6B3410', '#7B3F00', '#4A2E14']);
  const trunkDark = '#3E200D';

  // Trunk
  const trunkW = s * (type === 'oak' ? 0.1 : 0.08);
  const trunkH = s * (type === 'oak' ? 0.5 : 0.48);
  children.push(createRect(x - trunkW, y - s * 0.12, trunkW * 2, trunkH, trunkColor, { layer: 2 }));

  // Bark texture
  for (let i = 0; i < 5; i++) {
    const ly = y - s * 0.1 + i * trunkH * 0.2;
    children.push(createLine(x - trunkW * 0.85, ly, x + trunkW * 0.85, ly, trunkDark, {
      strokeWidth: 0.7, layer: 2, opacity: 0.3,
    }));
  }

  const autumnColors = ['#FF6F00', '#E65100', '#BF360C', '#FFD54F', '#F57F17', '#D84315', '#FF8F00', '#EF6C00'];
  const crownCx = x;
  const crownCy = y - s * 0.5;

  if (type === 'oak') {
    // Dense rounded crown
    for (let i = 0; i < 6; i++) {
      const cx = crownCx + rng.nextFloat(-s * 0.22, s * 0.22);
      const cy = crownCy + rng.nextFloat(-s * 0.15, s * 0.1);
      const r = rng.nextFloat(s * 0.15, s * 0.28);
      children.push(createCircle(cx, cy, r, rng.pick(autumnColors), {
        layer: 2, opacity: rng.nextFloat(0.65, 0.9),
      }));
    }
    // Some bare branches poking through
    for (let i = 0; i < rng.nextInt(2, 4); i++) {
      const side = rng.chance(0.5) ? -1 : 1;
      const bx = crownCx + side * rng.nextFloat(s * 0.15, s * 0.35);
      const by = crownCy - rng.nextFloat(s * 0.05, s * 0.2);
      const branchPath = `M${crownCx + side * s * 0.05},${crownCy + s * 0.05} Q${crownCx + side * s * 0.15},${crownCy - s * 0.05} ${bx},${by}`;
      children.push(createPath(x, y, branchPath, 'none', {
        stroke: trunkColor, strokeWidth: s * 0.02, layer: 2, opacity: 0.6,
      }));
    }
    // Small detail leaf clusters
    for (let i = 0; i < 8; i++) {
      const cx = crownCx + rng.nextFloat(-s * 0.3, s * 0.3);
      const cy = crownCy + rng.nextFloat(-s * 0.2, s * 0.15);
      children.push(createCircle(cx, cy, rng.nextFloat(s * 0.03, s * 0.07), rng.pick(autumnColors), {
        layer: 2, opacity: rng.nextFloat(0.5, 0.8),
      }));
    }
  } else {
    // Willow: drooping branches with autumn color
    const willowTop = y - s * 0.5;
    // Small crown at top
    children.push(createCircle(crownCx, willowTop + s * 0.05, s * 0.12, rng.pick(autumnColors), {
      layer: 2, opacity: 0.6,
    }));
    // Drooping branches
    for (let i = 0; i < rng.nextInt(8, 12); i++) {
      const bx = crownCx + rng.nextFloat(-s * 0.2, s * 0.2);
      const endY = y + rng.nextFloat(-s * 0.05, s * 0.15);
      const endX = bx + rng.nextFloat(-s * 0.1, s * 0.1);
      const cp = bx + rng.nextFloat(-s * 0.12, s * 0.12);
      const branchPath = `M${bx},${willowTop} Q${cp},${(willowTop + endY) / 2} ${endX},${endY}`;
      children.push(createPath(x, y, branchPath, 'none', {
        stroke: rng.pick(autumnColors), strokeWidth: s * 0.015, layer: 2, opacity: rng.nextFloat(0.5, 0.8),
      }));
    }
  }

  return createGroup(x, y, children, { layer: 2, category: 'tree', modifiable: true, id: uid('atree') });
}

// ─── Dog (simple walking shape) ───
function createDog(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const dogColor = rng.pick(['#8B6914', '#A0522D', '#333333', '#F5DEB3', '#D2691E']);

  // Body
  children.push(createEllipse(x, y - s * 0.3, s * 0.35, s * 0.18, dogColor, { layer: 3 }));
  // Head
  children.push(createCircle(x + s * 0.3, y - s * 0.4, s * 0.13, dogColor, { layer: 3 }));
  // Ear
  children.push(createEllipse(x + s * 0.35, y - s * 0.5, s * 0.06, s * 0.1, dogColor, { layer: 3, opacity: 0.8 }));
  // Legs (4)
  children.push(createRect(x - s * 0.2, y - s * 0.14, s * 0.06, s * 0.14, dogColor, { layer: 3 }));
  children.push(createRect(x - s * 0.05, y - s * 0.14, s * 0.06, s * 0.14, dogColor, { layer: 3 }));
  children.push(createRect(x + s * 0.1, y - s * 0.14, s * 0.06, s * 0.14, dogColor, { layer: 3 }));
  children.push(createRect(x + s * 0.22, y - s * 0.14, s * 0.06, s * 0.14, dogColor, { layer: 3 }));
  // Tail
  const tailPath = `M${x - s * 0.3},${y - s * 0.35} Q${x - s * 0.4},${y - s * 0.55} ${x - s * 0.32},${y - s * 0.6}`;
  children.push(createPath(x, y, tailPath, 'none', {
    stroke: dogColor, strokeWidth: s * 0.04, layer: 3,
  }));
  // Eye
  children.push(createCircle(x + s * 0.33, y - s * 0.42, s * 0.025, '#333', { layer: 3 }));
  // Nose
  children.push(createCircle(x + s * 0.42, y - s * 0.38, s * 0.02, '#222', { layer: 3 }));

  return createGroup(x, y, children, { layer: 3, category: 'dog', modifiable: true, id: uid('dog') });
}

// ─── Duck on water ───
function createDuck(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const bodyColor = rng.pick(['#F5F5F5', '#8B6914', '#556B2F']);

  // Body (floating ellipse)
  children.push(createEllipse(x, y, s * 0.3, s * 0.15, bodyColor, { layer: 3 }));
  // Head
  children.push(createCircle(x + s * 0.25, y - s * 0.12, s * 0.1, rng.chance(0.5) ? '#2E7D32' : bodyColor, { layer: 3 }));
  // Beak
  children.push(createPolygon(x, y, `${x + s * 0.33},${y - s * 0.12} ${x + s * 0.45},${y - s * 0.1} ${x + s * 0.33},${y - s * 0.08}`, '#FF8F00', { layer: 3 }));
  // Eye
  children.push(createCircle(x + s * 0.27, y - s * 0.14, s * 0.02, '#333', { layer: 3 }));
  // Water ripple around duck
  children.push(createEllipse(x, y + s * 0.05, s * 0.35, s * 0.06, '#90CAF9', {
    layer: 3, opacity: 0.3,
  }));

  return createGroup(x, y, children, { layer: 3, category: 'duck', modifiable: true, id: uid('duck') });
}

// ─── Leaf pile (raked leaves mound) ───
function leafPile(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const leafColors = ['#FF6F00', '#E65100', '#BF360C', '#FFD54F', '#F57F17', '#D84315'];

  // Mound base
  const moundPath = `M${x - s * 0.5},${y} Q${x - s * 0.4},${y - s * 0.3} ${x},${y - s * 0.4} Q${x + s * 0.4},${y - s * 0.3} ${x + s * 0.5},${y} Z`;
  children.push(createPath(x, y, moundPath, rng.pick(leafColors), { layer: 3, opacity: 0.8 }));

  // Scattered leaves on top of mound
  for (let i = 0; i < rng.nextInt(8, 14); i++) {
    const lx = x + rng.nextFloat(-s * 0.4, s * 0.4);
    const ly = y - rng.nextFloat(0, s * 0.35);
    const lr = rng.nextFloat(2, 5);
    children.push(createCircle(lx, ly, lr, rng.pick(leafColors), {
      layer: 3, opacity: rng.nextFloat(0.6, 0.95),
    }));
  }

  return createGroup(x, y, children, { layer: 3, category: 'leafpile', modifiable: true, id: uid('pile') });
}

// ─── Leaf shape (simple 2-curve path) ───
function createLeafShape(x: number, y: number, size: number, color: string, rotation: number): SVGElementData {
  const s = size;
  const d = `M${x},${y - s * 0.5} Q${x + s * 0.3},${y - s * 0.15} ${x},${y + s * 0.5} Q${x - s * 0.3},${y - s * 0.15} ${x},${y - s * 0.5} Z`;
  return createPath(x, y, d, color, {
    layer: 4, category: 'leaf', modifiable: true, id: uid('leaf'),
    opacity: 0.85, rotation,
  });
}

// ─── Pond ───
function createPond(x: number, y: number, w: number, h: number, rng: SeededRandom): SVGElementData[] {
  const elements: SVGElementData[] = [];

  // Pond body (organic ellipse shape)
  const pondPath = `M${x},${y + h * 0.3} Q${x + w * 0.1},${y - h * 0.1} ${x + w * 0.5},${y} Q${x + w * 0.9},${y - h * 0.05} ${x + w},${y + h * 0.4} Q${x + w * 0.85},${y + h} ${x + w * 0.5},${y + h * 0.95} Q${x + w * 0.15},${y + h * 0.9} ${x},${y + h * 0.3} Z`;
  elements.push(createPath(x, y, pondPath, '#4FC3F7', {
    layer: 1, category: 'pond', modifiable: false, opacity: 0.7,
  }));

  // Darker center
  elements.push(createEllipse(x + w * 0.5, y + h * 0.5, w * 0.35, h * 0.3, '#0288D1', {
    layer: 1, category: 'pond', modifiable: false, opacity: 0.3,
  }));

  // Ripples
  for (let i = 0; i < 5; i++) {
    const rx = x + rng.nextFloat(w * 0.15, w * 0.85);
    const ry = y + rng.nextFloat(h * 0.15, h * 0.85);
    elements.push(createEllipse(rx, ry, rng.nextFloat(5, 12), rng.nextFloat(1.5, 3), '#B3E5FC', {
      layer: 1, category: 'pond', modifiable: false, opacity: rng.nextFloat(0.25, 0.5),
    }));
  }

  // Reflected autumn colors
  for (let i = 0; i < 4; i++) {
    const rx = x + rng.nextFloat(w * 0.2, w * 0.8);
    const ry = y + rng.nextFloat(h * 0.2, h * 0.8);
    elements.push(createEllipse(rx, ry, rng.nextFloat(4, 10), rng.nextFloat(2, 4), rng.pick(['#FF8F00', '#FFD54F', '#E65100']), {
      layer: 1, category: 'pond', modifiable: false, opacity: rng.nextFloat(0.1, 0.25),
    }));
  }

  return elements;
}

// ─── Footbridge ───
function footbridge(x: number, y: number, width: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const woodColor = rng.pick(['#795548', '#6D4C41', '#8D6E63']);

  // Bridge deck
  children.push(createRect(x, y, width, 8, woodColor, { layer: 2, stroke: '#5D4037', strokeWidth: 0.5 }));
  // Planks
  for (let i = 0; i < Math.floor(width / 6); i++) {
    children.push(createLine(x + i * 6, y, x + i * 6, y + 8, '#5D4037', {
      strokeWidth: 0.5, layer: 2, opacity: 0.3,
    }));
  }
  // Railings
  children.push(createRect(x, y - 12, width, 2, woodColor, { layer: 2 }));
  children.push(createRect(x, y + 8, width, 2, woodColor, { layer: 2 }));
  // Railing posts
  for (let i = 0; i <= Math.floor(width / 15); i++) {
    const px = x + i * 15;
    children.push(createRect(px - 1, y - 12, 2, 12, woodColor, { layer: 2 }));
    children.push(createRect(px - 1, y + 8, 2, 4, woodColor, { layer: 2 }));
  }
  // Support pillars beneath
  children.push(createRect(x + 3, y + 8, 3, 10, '#5D4037', { layer: 2 }));
  children.push(createRect(x + width - 6, y + 8, 3, 10, '#5D4037', { layer: 2 }));

  return createGroup(x, y, children, { layer: 2, category: 'bridge', modifiable: true, id: uid('fbridge') });
}

// ─── Squirrel ───
function createSquirrel(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const furColor = rng.pick(['#8B6914', '#A0522D', '#6B3410']);

  // Body
  children.push(createEllipse(x, y - s * 0.2, s * 0.18, s * 0.22, furColor, { layer: 3 }));
  // Head
  children.push(createCircle(x + s * 0.12, y - s * 0.42, s * 0.1, furColor, { layer: 3 }));
  // Ear
  children.push(createCircle(x + s * 0.1, y - s * 0.52, s * 0.04, furColor, { layer: 3 }));
  // Tail (bushy curve)
  const tailPath = `M${x - s * 0.1},${y - s * 0.3} Q${x - s * 0.35},${y - s * 0.7} ${x - s * 0.05},${y - s * 0.55}`;
  children.push(createPath(x, y, tailPath, 'none', {
    stroke: furColor, strokeWidth: s * 0.08, layer: 3,
  }));
  // Eye
  children.push(createCircle(x + s * 0.15, y - s * 0.44, s * 0.02, '#333', { layer: 3 }));

  return createGroup(x, y, children, { layer: 3, category: 'squirrel', modifiable: true, id: uid('sqrl') });
}

export function generateAutumnPark(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  const elements: SVGElementData[] = [];

  // === SVG DEFS ===
  const defs = `
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4FC3F7"/>
      <stop offset="40%" stop-color="#81D4FA"/>
      <stop offset="70%" stop-color="#B3E5FC"/>
      <stop offset="90%" stop-color="#FFE0B2"/>
      <stop offset="100%" stop-color="#FFCC80"/>
    </linearGradient>
    <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#A1887F"/>
      <stop offset="30%" stop-color="#8D6E63"/>
      <stop offset="60%" stop-color="#795548"/>
      <stop offset="100%" stop-color="#6D4C41"/>
    </linearGradient>
    <linearGradient id="leafGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FF6F00"/>
      <stop offset="50%" stop-color="#E65100"/>
      <stop offset="100%" stop-color="#BF360C"/>
    </linearGradient>
    <linearGradient id="pathGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#BDBDBD"/>
      <stop offset="50%" stop-color="#9E9E9E"/>
      <stop offset="100%" stop-color="#757575"/>
    </linearGradient>
    <radialGradient id="sunGoldenGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFF9C4"/>
      <stop offset="30%" stop-color="#FFD54F" stop-opacity="0.7"/>
      <stop offset="60%" stop-color="#FFB300" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#FF8F00" stop-opacity="0"/>
    </radialGradient>
    <filter id="softGlow">
      <feGaussianBlur stdDeviation="3"/>
    </filter>
  `;

  const groundY = h * 0.6;

  // ========================================
  // LAYER 0: Sky - blue fading to warm golden horizon
  // ========================================
  elements.push(createRect(0, 0, w, groundY, 'url(#skyGrad)', { layer: 0, category: 'sky', modifiable: false }));

  // Wispy clouds
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const cx = rng.nextFloat(20, w - 50);
    const cy = rng.nextFloat(h * 0.04, h * 0.18);
    const cw = rng.nextFloat(45, 100);
    const ch = rng.nextFloat(8, 15);
    const cloudColor = rng.pick(['#FFFFFF', '#FFF8E1', '#FFECB3']);
    elements.push(createEllipse(cx, cy, cw, ch, cloudColor, {
      layer: 0, category: 'cloud', modifiable: true, opacity: rng.nextFloat(0.4, 0.65),
    }));
    elements.push(createEllipse(cx + cw * 0.35, cy - ch * 0.3, cw * 0.55, ch * 0.65, cloudColor, {
      layer: 0, category: 'cloud', modifiable: false, opacity: rng.nextFloat(0.3, 0.5),
    }));
  }

  // ========================================
  // LAYER 0: Sun - low and warm, golden glow
  // ========================================
  const sunX = w * rng.nextFloat(0.7, 0.9);
  const sunY = h * rng.nextFloat(0.12, 0.22);

  // Outer golden glow
  elements.push(createCircle(sunX, sunY, 55, 'url(#sunGoldenGlow)', { layer: 0, category: 'sun', modifiable: false }));
  // Sun disc
  elements.push(createCircle(sunX, sunY, 22, '#FFD54F', { layer: 0, category: 'sun', modifiable: true, opacity: 0.9 }));
  // Warm horizon glow band
  elements.push(createRect(0, groundY - 20, w, 25, '#FFE0B2', { layer: 0, category: 'glow', modifiable: false, opacity: 0.15 }));

  // ========================================
  // LAYER 1: Ground - warm brown-orange with wavy edge
  // ========================================
  let groundPath = `M0,${groundY}`;
  const wavePts = 8;
  for (let i = 0; i < wavePts; i++) {
    const cx = (i + 0.5) * w / wavePts;
    const ex = (i + 1) * w / wavePts;
    const amp = rng.nextFloat(-5, 5);
    groundPath += ` Q${cx},${groundY + amp} ${ex},${groundY}`;
  }
  groundPath += ` L${w},${h} L0,${h} Z`;
  elements.push(createPath(0, 0, groundPath, 'url(#groundGrad)', { layer: 1, category: 'ground', modifiable: false }));

  // Leaf litter texture on ground
  const litterColors = ['#FF6F00', '#E65100', '#BF360C', '#FFD54F', '#F57F17', '#D84315', '#8D6E63'];
  for (let i = 0; i < rng.nextInt(30, 45); i++) {
    const lx = rng.nextFloat(3, w - 3);
    const ly = rng.nextFloat(groundY + 2, h - 5);
    const lr = rng.nextFloat(1, 3.5);
    elements.push(createCircle(lx, ly, lr, rng.pick(litterColors), {
      layer: 1, category: 'litter', modifiable: false, opacity: rng.nextFloat(0.25, 0.55),
    }));
  }

  // ========================================
  // LAYER 1: Wide park path winding through
  // ========================================
  const pathCenterX = w * 0.5;
  const pathW = rng.nextFloat(40, 55);
  const pathTop = groundY + 5;

  // Path base
  elements.push(createRect(pathCenterX - pathW / 2, pathTop, pathW, h - pathTop - 3, 'url(#pathGrad)', {
    layer: 1, category: 'path', modifiable: false,
  }));

  // Cobblestone/gravel texture
  for (let i = 0; i < rng.nextInt(20, 35); i++) {
    const sx = pathCenterX - pathW / 2 + rng.nextFloat(3, pathW - 3);
    const sy = rng.nextFloat(pathTop + 2, h - 8);
    const sr = rng.nextFloat(1.5, 3.5);
    const stoneColor = rng.pick(['#E0E0E0', '#BDBDBD', '#CFD8DC', '#B0BEC5']);
    elements.push(createCircle(sx, sy, sr, stoneColor, {
      layer: 1, category: 'path', modifiable: false, opacity: rng.nextFloat(0.3, 0.6),
      stroke: '#9E9E9E', strokeWidth: 0.3,
    }));
  }

  // ========================================
  // LAYER 1: Pond with ducks
  // ========================================
  const pondX = rng.nextFloat(w * 0.05, w * 0.2);
  const pondY = groundY + rng.nextFloat(15, 30);
  const pondW = rng.nextFloat(60, 90);
  const pondH = rng.nextFloat(35, 50);
  elements.push(...createPond(pondX, pondY, pondW, pondH, rng));

  // Ducks (2-3)
  const duckCount = rng.nextInt(2, 3);
  for (let i = 0; i < duckCount; i++) {
    const dx = pondX + rng.nextFloat(pondW * 0.2, pondW * 0.8);
    const dy = pondY + rng.nextFloat(pondH * 0.3, pondH * 0.7);
    elements.push(createDuck(dx, dy, rng.nextFloat(14, 22), rng));
  }

  // ========================================
  // LAYER 1: Small stream for footbridge
  // ========================================
  const streamX = rng.nextFloat(w * 0.6, w * 0.75);
  const streamY = groundY + rng.nextFloat(10, 20);
  const streamW = rng.nextFloat(20, 30);
  // Stream body
  elements.push(createRect(streamX, streamY, streamW, h - streamY - 5, '#4FC3F7', {
    layer: 1, category: 'stream', modifiable: false, opacity: 0.6,
  }));
  for (let i = 0; i < 4; i++) {
    const ry = streamY + rng.nextFloat(5, h - streamY - 10);
    elements.push(createEllipse(streamX + streamW * 0.5, ry, rng.nextFloat(4, 10), rng.nextFloat(1, 2.5), '#B3E5FC', {
      layer: 1, category: 'stream', modifiable: false, opacity: rng.nextFloat(0.3, 0.5),
    }));
  }

  // ========================================
  // LAYER 2: Footbridge over stream
  // ========================================
  const bridgeY = streamY + rng.nextFloat(5, 15);
  elements.push(footbridge(streamX - 5, bridgeY, streamW + 10, rng));

  // ========================================
  // LAYER 2: Trees (6-10) - mix of oak and willow, autumn colors
  // ========================================
  const treeCount = rng.nextInt(6, 10);
  for (let i = 0; i < treeCount; i++) {
    const tx = rng.nextFloat(w * 0.03 + i * (w * 0.88 / treeCount), w * 0.03 + (i + 0.85) * (w * 0.88 / treeCount));
    const ty = groundY + rng.nextFloat(-3, 10);
    const tSize = rng.nextFloat(75, 125);
    const tType = rng.pick(['oak', 'willow'] as const);
    elements.push(autumnTree(tx, ty, tSize, tType, rng));
  }

  // ========================================
  // LAYER 2: Fence / low wall along path
  // ========================================
  const fenceY = groundY + rng.nextFloat(25, 40);
  elements.push(createFence(pathCenterX + pathW / 2 + 5, fenceY, rng.nextFloat(50, 90), rng));

  // ========================================
  // LAYER 2: Lamp posts (3-4) - old-fashioned with warm glow
  // ========================================
  const lampCount = rng.nextInt(3, 4);
  for (let i = 0; i < lampCount; i++) {
    const lx = pathCenterX + rng.nextFloat(-pathW / 2 - 10, pathW / 2 + 10);
    const ly = groundY + rng.nextFloat(12, 35) + i * rng.nextFloat(20, 35);
    elements.push(createLamp(lx, ly, 'street', rng));
    // Warm glow
    elements.push(createCircle(lx, ly - 82, 18, '#FFD54F', {
      layer: 2, category: 'glow', modifiable: false, opacity: 0.12,
    }));
  }

  // ========================================
  // LAYER 3: Park benches (2-3), some with person
  // ========================================
  const benchCount = rng.nextInt(2, 3);
  for (let i = 0; i < benchCount; i++) {
    const bx = rng.nextFloat(w * 0.1, w * 0.85);
    const by = groundY + rng.nextFloat(15, 40);
    elements.push(createBench(bx, by, rng));
    // Sitting person on some benches
    if (rng.chance(0.6)) {
      elements.push(createPerson(bx + 18, by - 5, rng));
    }
  }

  // ========================================
  // LAYER 3: People walking (3-5)
  // ========================================
  const walkingCount = rng.nextInt(3, 5);
  for (let i = 0; i < walkingCount; i++) {
    const px = rng.nextFloat(w * 0.08, w * 0.92);
    const py = groundY + rng.nextFloat(15, 55);
    elements.push(createPerson(px, py, rng));
  }

  // ========================================
  // LAYER 3: Dogs (1-2) walking with person
  // ========================================
  const dogCount = rng.nextInt(1, 2);
  for (let i = 0; i < dogCount; i++) {
    const dx = rng.nextFloat(w * 0.15, w * 0.85);
    const dy = groundY + rng.nextFloat(20, 50);
    elements.push(createDog(dx, dy, rng.nextFloat(18, 28), rng));
  }

  // ========================================
  // LAYER 3: Leaf piles (raked)
  // ========================================
  const pileCount = rng.nextInt(2, 4);
  for (let i = 0; i < pileCount; i++) {
    const px = rng.nextFloat(w * 0.05, w * 0.9);
    const py = rng.nextFloat(groundY + 15, h - 20);
    elements.push(leafPile(px, py, rng.nextFloat(20, 35), rng));
  }

  // ========================================
  // LAYER 3: Rocks scattered
  // ========================================
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    const rx = rng.nextFloat(10, w - 10);
    const ry = rng.nextFloat(groundY + 5, h - 10);
    elements.push(createRock(rx, ry, rng.nextFloat(6, 15), rng));
  }

  // ========================================
  // LAYER 3: Squirrel on tree (optional)
  // ========================================
  if (rng.chance(0.65)) {
    const sqX = rng.nextFloat(w * 0.1, w * 0.85);
    const sqY = groundY - rng.nextFloat(10, 30);
    elements.push(createSquirrel(sqX, sqY, rng.nextFloat(12, 20), rng));
  }

  // ========================================
  // LAYER 3: Distant jogger silhouette
  // ========================================
  if (rng.chance(0.7)) {
    const jx = rng.nextFloat(w * 0.7, w * 0.95);
    const jy = groundY + rng.nextFloat(5, 12);
    // Simple dark silhouette
    const jogChildren: SVGElementData[] = [
      createCircle(jx, jy - 18, 3.5, '#444', { layer: 3 }),
      createRect(jx - 3, jy - 14, 6, 10, '#444', { layer: 3 }),
      createRect(jx - 3, jy - 4, 2.5, 8, '#444', { layer: 3 }),
      createRect(jx + 0.5, jy - 4, 2.5, 8, '#444', { layer: 3 }),
    ];
    elements.push(createGroup(jx, jy, jogChildren, {
      layer: 3, category: 'jogger', modifiable: true, id: uid('jogger'), opacity: 0.5,
    }));
  }

  // ========================================
  // LAYER 4: Falling leaves (30-45) - KEY VISUAL
  // ========================================
  const fallingLeafCount = rng.nextInt(30, 45);
  const leafColors = ['#FF6F00', '#E65100', '#BF360C', '#FFD54F', '#F57F17', '#D84315'];
  for (let i = 0; i < fallingLeafCount; i++) {
    const lx = rng.nextFloat(0, w);
    const ly = rng.nextFloat(0, h);
    const lSize = rng.nextFloat(3, 9);
    const leafColor = rng.pick(leafColors);
    const isLeafShaped = rng.chance(0.5);

    if (isLeafShaped) {
      // Leaf-shaped (simple 2-curve path)
      elements.push(createLeafShape(lx, ly, lSize, leafColor, rng.nextFloat(0, 360)));
    } else {
      // Circular leaf
      elements.push(createCircle(lx, ly, lSize * 0.45, leafColor, {
        layer: 4, category: 'leaf', modifiable: true,
        opacity: rng.nextFloat(0.5, 0.9),
      }));
    }
  }

  // ========================================
  // LAYER 4: Birds (3-5)
  // ========================================
  const birdCount = rng.nextInt(3, 5);
  for (let i = 0; i < birdCount; i++) {
    const bx = rng.nextFloat(20, w - 20);
    const by = rng.nextFloat(h * 0.04, h * 0.25);
    elements.push(createBird(bx, by, true, rng));
  }

  return { elements, defs };
}
