import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath, createGroup,
  createLine, createPolygon,
} from '../engine/primitives';
import {
  combineDefs, outdoorDefs, skyGradient, groundGradient, sunGlowGradient,
  linearGradient, radialGradient, waterGradient, lampGlowGradient,
  dropShadow, softGlow, waterRipple,
} from './svg-effects';
import {
  detailedTree, detailedCloud, detailedFlower, detailedRock, detailedBird,
  detailedButterfly, detailedPerson, detailedBench, detailedFence,
  resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'cb') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// ─── Stone lantern (toro) ───
function stoneLantern(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const stoneColor = '#9E9E9E';
  const stoneDark = '#757575';

  // Base
  children.push(createRect(x - s * 0.18, y - s * 0.08, s * 0.36, s * 0.08, stoneColor, { layer: 3, stroke: stoneDark, strokeWidth: 0.5 }));
  // Pillar
  children.push(createRect(x - s * 0.06, y - s * 0.45, s * 0.12, s * 0.37, stoneDark, { layer: 3 }));
  // Lamp house
  children.push(createRect(x - s * 0.14, y - s * 0.6, s * 0.28, s * 0.15, stoneColor, { layer: 3, stroke: stoneDark, strokeWidth: 0.5 }));
  // Lamp glow opening
  children.push(createRect(x - s * 0.08, y - s * 0.57, s * 0.16, s * 0.09, '#FFFDE7', { layer: 3, opacity: 0.7 }));
  // Warm glow
  children.push(createCircle(x, y - s * 0.53, s * 0.12, 'url(#lanternGlow)', { layer: 3, opacity: 0.4 }));
  // Roof (pagoda-style)
  const roofPath = `M${x - s * 0.22},${y - s * 0.6} L${x},${y - s * 0.78} L${x + s * 0.22},${y - s * 0.6} Z`;
  children.push(createPath(x, y, roofPath, stoneDark, { layer: 3 }));
  // Roof tip
  children.push(createCircle(x, y - s * 0.8, s * 0.025, stoneColor, { layer: 3 }));

  return createGroup(x, y, children, { layer: 3, category: 'lantern', modifiable: true, id: uid('toro'), filter: 'url(#shadow)' });
}

// ─── Japanese arched bridge ───
function archedBridge(x: number, y: number, width: number, height: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const woodColor = rng.pick(['#8B0000', '#A0522D', '#6B3410']);
  const railColor = woodColor;

  // Arch surface
  const archPath = `M${x},${y} Q${x + width * 0.5},${y - height} ${x + width},${y} L${x + width},${y + 6} Q${x + width * 0.5},${y - height + 6} ${x},${y + 6} Z`;
  children.push(createPath(x, y, archPath, woodColor, { layer: 2, opacity: 0.9 }));

  // Deck boards
  for (let i = 0; i < 8; i++) {
    const t = (i + 1) / 9;
    const lx = x + t * width;
    const ly = y - Math.sin(t * Math.PI) * height;
    children.push(createLine(lx - 2, ly, lx + 2, ly, '#4A2510', {
      strokeWidth: 0.6, layer: 2, opacity: 0.3,
    }));
  }

  // Railing posts
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const px = x + t * width;
    const py = y - Math.sin(t * Math.PI) * height;
    children.push(createRect(px - 1.5, py - 14, 3, 14, railColor, { layer: 2 }));
  }

  // Top rail
  const topRailPath = `M${x},${y - 14} Q${x + width * 0.5},${y - height - 14} ${x + width},${y - 14}`;
  children.push(createPath(x, y, topRailPath, 'none', {
    stroke: railColor, strokeWidth: 2.5, layer: 2,
  }));

  return createGroup(x, y, children, { layer: 2, category: 'bridge', modifiable: true, id: uid('bridge'), filter: 'url(#shadow)' });
}

// ─── Stream with ripples ───
function streamBody(x: number, y: number, width: number, height: number, rng: SeededRandom): SVGElementData[] {
  const elements: SVGElementData[] = [];

  // Water body
  const waterPath = `M${x},${y} Q${x + width * 0.3},${y + height * 0.2} ${x + width * 0.5},${y + height * 0.5} Q${x + width * 0.7},${y + height * 0.8} ${x + width},${y + height} L${x + width + 15},${y + height} Q${x + width * 0.7 + 15},${y + height * 0.8} ${x + width * 0.5 + 15},${y + height * 0.5} Q${x + width * 0.3 + 15},${y + height * 0.2} ${x + 15},${y} Z`;
  elements.push(createPath(x, y, waterPath, 'url(#waterGrad)', {
    layer: 1, category: 'water', modifiable: false, opacity: 0.7, filter: 'url(#waterRipple)',
  }));

  // Ripples
  for (let i = 0; i < 6; i++) {
    const rx = x + rng.nextFloat(3, width + 10);
    const ry = y + rng.nextFloat(5, height - 5);
    elements.push(createEllipse(rx, ry, rng.nextFloat(3, 8), rng.nextFloat(1, 2.5), '#B3E5FC', {
      layer: 1, category: 'water', modifiable: false, opacity: rng.nextFloat(0.3, 0.6),
    }));
  }

  // Pink reflections from cherry trees
  for (let i = 0; i < 4; i++) {
    const rx = x + rng.nextFloat(2, width + 8);
    const ry = y + rng.nextFloat(3, height - 3);
    elements.push(createEllipse(rx, ry, rng.nextFloat(2, 5), rng.nextFloat(1, 2), '#FFB7C5', {
      layer: 1, category: 'water', modifiable: false, opacity: rng.nextFloat(0.15, 0.35),
    }));
  }

  return elements;
}

// ─── Cobblestone path segment ───
function cobblePath(x: number, y: number, pathWidth: number, pathLength: number, rng: SeededRandom): SVGElementData[] {
  const elements: SVGElementData[] = [];
  const stoneColors = ['#D2B48C', '#C9A86C', '#BFA76A', '#D4A84B', '#CDB794'];

  // Base path
  elements.push(createRect(x - pathWidth / 2, y, pathWidth, pathLength, 'url(#pathGrad)', {
    layer: 1, category: 'path', modifiable: false,
  }));

  // Cobblestones
  const rows = Math.floor(pathLength / 8);
  for (let i = 0; i < rows; i++) {
    const stonesInRow = rng.nextInt(3, 5);
    for (let j = 0; j < stonesInRow; j++) {
      const sx = x - pathWidth / 2 + rng.nextFloat(2, pathWidth - 4);
      const sy = y + i * 8 + rng.nextFloat(-1, 3);
      const sr = rng.nextFloat(2, 4);
      elements.push(createCircle(sx, sy, sr, rng.pick(stoneColors), {
        layer: 1, category: 'path', modifiable: false, opacity: rng.nextFloat(0.4, 0.7),
        stroke: '#A0896A', strokeWidth: 0.3,
      }));
    }
  }

  return elements;
}

export function generateCherryBlossom(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  // === SVG DEFS ===
  const defs = combineDefs(
    outdoorDefs(),
    skyGradient('skyGrad', '#87CEEB', '#D4B8D0', '#F0C4D0'),
    groundGradient('groundGrad', '#7CB342', '#689F38'),
    sunGlowGradient('sunWarmGlow', '#FFF9C4', '#FFD54F'),
    waterGradient('waterGrad', '#4FC3F7', '#0288D1'),
    lampGlowGradient('lanternGlow', '#FFD54F'),
    linearGradient('pathGrad', [
      { offset: '0%', color: '#D2B48C' },
      { offset: '50%', color: '#C9A86C' },
      { offset: '100%', color: '#BFA76A' },
    ]),
    radialGradient('petalGrad', [
      { offset: '0%', color: '#FFB7C5', opacity: 0.6 },
      { offset: '60%', color: '#FFC1CC', opacity: 0.3 },
      { offset: '100%', color: '#FFD1DC', opacity: 0 },
    ]),
    waterRipple('waterRipple'),
    softGlow('petalGlow', 4, '#FFB7C5'),
  );

  // ========================================
  // LAYER 0: Sky with soft blue-to-pink gradient
  // ========================================
  const groundY = h * 0.62;
  elements.push(createRect(0, 0, w, groundY, 'url(#skyGrad)', { layer: 0, category: 'sky', modifiable: false }));

  // Detailed clouds
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const cx = rng.nextFloat(30, w - 60);
    const cy = rng.nextFloat(h * 0.05, h * 0.2);
    elements.push(detailedCloud(cx, cy, rng.nextFloat(40, 80), rng));
  }

  // ========================================
  // LAYER 0: Sun with warm glow
  // ========================================
  const sunX = w * rng.nextFloat(0.65, 0.85);
  const sunY = h * rng.nextFloat(0.1, 0.18);
  elements.push(createCircle(sunX, sunY, 50, 'url(#sunWarmGlow)', { layer: 0, category: 'sun', modifiable: false }));
  elements.push(createCircle(sunX, sunY, 20, '#FFF9C4', { layer: 0, category: 'sun', modifiable: true, opacity: 0.9, filter: 'url(#glow)' }));

  // ========================================
  // LAYER 1: Ground with wavy edge
  // ========================================
  let groundPath = `M0,${groundY}`;
  const wavePts = 8;
  for (let i = 0; i < wavePts; i++) {
    const cx = (i + 0.5) * w / wavePts;
    const ex = (i + 1) * w / wavePts;
    const amp = rng.nextFloat(-6, 6);
    groundPath += ` Q${cx},${groundY + amp} ${ex},${groundY}`;
  }
  groundPath += ` L${w},${h} L0,${h} Z`;
  elements.push(createPath(0, 0, groundPath, 'url(#groundGrad)', { layer: 1, category: 'ground', modifiable: false }));

  // Grass texture
  for (let i = 0; i < rng.nextInt(20, 30); i++) {
    const gx = rng.nextFloat(5, w - 5);
    const gy = rng.nextFloat(groundY + 3, h - 10);
    const gh = rng.nextFloat(3, 8);
    const grassColor = rng.pick(['#558B2F', '#33691E', '#689F38', '#7CB342']);
    elements.push(createLine(gx, gy, gx + rng.nextFloat(-2, 2), gy - gh, grassColor, {
      strokeWidth: rng.nextFloat(0.8, 1.5), layer: 1, category: 'grass', modifiable: false, opacity: rng.nextFloat(0.4, 0.7),
    }));
  }

  // ========================================
  // LAYER 1: Stream / pond
  // ========================================
  const streamX = w * rng.nextFloat(0.3, 0.5);
  const streamY = groundY + rng.nextFloat(5, 15);
  const streamW = rng.nextFloat(30, 50);
  const streamH = h - streamY - 10;
  elements.push(...streamBody(streamX, streamY, streamW, streamH, rng));

  // ========================================
  // LAYER 1: Stone path
  // ========================================
  const pathX = w * rng.nextFloat(0.15, 0.35);
  const pathW = rng.nextFloat(28, 38);
  const pathLen = h - groundY - 5;
  elements.push(...cobblePath(pathX, groundY + 2, pathW, pathLen, rng));

  // ========================================
  // LAYER 2: Japanese arched bridge over stream
  // ========================================
  const bridgeX = streamX - 5;
  const bridgeY = streamY + rng.nextFloat(5, 15);
  elements.push(archedBridge(bridgeX, bridgeY, streamW + 20, rng.nextFloat(15, 22), rng));

  // ========================================
  // LAYER 2: Cherry blossom trees (6-10)
  // ========================================
  const treeCount = rng.nextInt(6, 10);
  for (let i = 0; i < treeCount; i++) {
    const tx = rng.nextFloat(w * 0.05 + i * (w * 0.85 / treeCount), w * 0.05 + (i + 0.8) * (w * 0.85 / treeCount));
    const ty = groundY + rng.nextFloat(-3, 10);
    const tSize = rng.nextFloat(80, 130);
    const tree = detailedTree(tx, ty, 'cherry', tSize, rng);
    elements.push(tree);
  }

  // ========================================
  // LAYER 2: Fence along path
  // ========================================
  const fenceY = groundY + rng.nextFloat(20, 35);
  elements.push(detailedFence(pathX + pathW / 2 + 5, fenceY, rng.nextFloat(60, 100), 1, rng));

  // ========================================
  // LAYER 3: Stone lantern (toro)
  // ========================================
  const toroX = rng.nextFloat(w * 0.6, w * 0.8);
  const toroY = groundY + rng.nextFloat(15, 35);
  elements.push(stoneLantern(toroX, toroY, rng.nextFloat(35, 50), rng));

  // ========================================
  // LAYER 3: Bench under tree
  // ========================================
  const benchX = rng.nextFloat(w * 0.15, w * 0.5);
  const benchY = groundY + rng.nextFloat(15, 30);
  elements.push(detailedBench(benchX, benchY, 1, rng));

  // ========================================
  // LAYER 3: People (2-4)
  // ========================================
  const personCount = rng.nextInt(2, 4);
  for (let i = 0; i < personCount; i++) {
    const px = rng.nextFloat(w * 0.1, w * 0.9);
    const py = groundY + rng.nextFloat(15, 50);
    elements.push(detailedPerson(px, py, rng.nextFloat(0.8, 1.2), rng));
  }

  // ========================================
  // LAYER 3: Rocks scattered
  // ========================================
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    const rx = rng.nextFloat(10, w - 10);
    const ry = rng.nextFloat(groundY + 5, h - 15);
    elements.push(detailedRock(rx, ry, rng.nextFloat(6, 16), rng));
  }

  // ========================================
  // LAYER 3: Small flowers along path
  // ========================================
  for (let i = 0; i < rng.nextInt(4, 8); i++) {
    const fx = rng.nextFloat(w * 0.05, w * 0.95);
    const fy = rng.nextFloat(groundY + 10, h - 20);
    const fType = rng.pick(['daisy', 'tulip', 'rose', 'sunflower'] as const);
    elements.push(detailedFlower(fx, fy, fType, rng.nextFloat(12, 22), rng));
  }

  // ========================================
  // LAYER 3: Dappled light / shadow on ground
  // ========================================
  for (let i = 0; i < rng.nextInt(8, 14); i++) {
    const dx = rng.nextFloat(20, w - 20);
    const dy = rng.nextFloat(groundY + 5, h - 15);
    const dr = rng.nextFloat(5, 15);
    const isDark = rng.chance(0.5);
    elements.push(createEllipse(dx, dy, dr, dr * rng.nextFloat(0.4, 0.8), isDark ? '#2E7D32' : '#FFFDE7', {
      layer: 3, category: 'shadow', modifiable: false, opacity: rng.nextFloat(0.08, 0.2),
    }));
  }

  // ========================================
  // LAYER 4: Falling petals (40-60) - KEY VISUAL
  // ========================================
  const petalCount = rng.nextInt(40, 60);
  const petalPinks = ['#FFB7C5', '#FFC1CC', '#FFAEB9', '#FFD1DC', '#FF9DB2', '#FFA5B9'];
  for (let i = 0; i < petalCount; i++) {
    const px = rng.nextFloat(0, w);
    const py = rng.nextFloat(0, h);
    const pSize = rng.nextFloat(2, 7);
    const petalColor = rng.pick(petalPinks);
    const isOval = rng.chance(0.4);

    if (isOval) {
      elements.push(createEllipse(px, py, pSize, pSize * 0.5, petalColor, {
        layer: 4, category: 'petal', modifiable: true,
        opacity: rng.nextFloat(0.5, 0.9),
        rotation: rng.nextFloat(0, 360),
        filter: 'url(#petalGlow)',
      }));
    } else {
      elements.push(createCircle(px, py, pSize * 0.5, petalColor, {
        layer: 4, category: 'petal', modifiable: true,
        opacity: rng.nextFloat(0.4, 0.85),
      }));
    }
  }

  // ========================================
  // LAYER 4: Birds (3-5)
  // ========================================
  const birdCount = rng.nextInt(3, 5);
  for (let i = 0; i < birdCount; i++) {
    const bx = rng.nextFloat(20, w - 20);
    const by = rng.nextFloat(h * 0.05, h * 0.3);
    elements.push(detailedBird(bx, by, true, rng));
  }

  // ========================================
  // LAYER 4: Butterflies (3-5)
  // ========================================
  const butterflyCount = rng.nextInt(3, 5);
  for (let i = 0; i < butterflyCount; i++) {
    const bx = rng.nextFloat(30, w - 30);
    const by = rng.nextFloat(h * 0.15, h * 0.65);
    elements.push(detailedButterfly(bx, by, rng.nextFloat(8, 16), rng));
  }

  return { elements, defs };
}
