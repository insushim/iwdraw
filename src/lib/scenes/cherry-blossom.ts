import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath, createGroup,
  createLine, createPolygon, createBird, createButterfly, createBench,
  createPerson, createFence, createRock, createFlower, createLamp,
} from '../engine/primitives';

let _uid = 0;
function uid(p = 'cb') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// ─── Detailed cherry blossom tree ───
function cherryBlossomTree(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const trunkColor = rng.pick(['#6B3410', '#5C3317', '#7B3F00']);
  const trunkDark = '#4A2510';

  // Trunk with bark texture
  const trunkW = s * 0.1;
  children.push(createRect(x - trunkW, y - s * 0.15, trunkW * 2, s * 0.55, trunkColor, { layer: 2 }));
  // Bark horizontal lines
  for (let i = 0; i < 6; i++) {
    const ly = y - s * 0.12 + i * s * 0.08;
    children.push(createLine(x - trunkW * 0.9, ly, x + trunkW * 0.9, ly, trunkDark, {
      strokeWidth: 0.8, layer: 2, opacity: 0.35,
    }));
  }

  // Main branches
  const branchCount = rng.nextInt(3, 5);
  for (let i = 0; i < branchCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const bStartY = y - s * 0.3 - i * s * 0.08;
    const bEndX = x + side * rng.nextFloat(s * 0.2, s * 0.4);
    const bEndY = bStartY - rng.nextFloat(s * 0.1, s * 0.25);
    const bPath = `M${x},${bStartY} Q${x + side * s * 0.1},${bStartY - s * 0.08} ${bEndX},${bEndY}`;
    children.push(createPath(x, y, bPath, 'none', {
      stroke: trunkColor, strokeWidth: s * 0.03, layer: 2,
    }));
  }

  // Dense pink crown - multiple overlapping circles
  const pinks = ['#FFB7C5', '#FFC1CC', '#FFAEB9', '#FFD1DC', '#FF9DB2'];
  const crownCx = x;
  const crownCy = y - s * 0.55;

  // Large background crown circles
  for (let i = 0; i < 5; i++) {
    const cx = crownCx + rng.nextFloat(-s * 0.2, s * 0.2);
    const cy = crownCy + rng.nextFloat(-s * 0.12, s * 0.12);
    const r = rng.nextFloat(s * 0.18, s * 0.28);
    children.push(createCircle(cx, cy, r, rng.pick(pinks), {
      layer: 2, opacity: rng.nextFloat(0.6, 0.85),
    }));
  }

  // Medium foreground blossom clusters
  for (let i = 0; i < 7; i++) {
    const cx = crownCx + rng.nextFloat(-s * 0.3, s * 0.3);
    const cy = crownCy + rng.nextFloat(-s * 0.18, s * 0.18);
    const r = rng.nextFloat(s * 0.08, s * 0.15);
    children.push(createCircle(cx, cy, r, rng.pick(pinks), {
      layer: 2, opacity: rng.nextFloat(0.5, 0.8),
    }));
  }

  // Small detail blossom dots
  for (let i = 0; i < 10; i++) {
    const cx = crownCx + rng.nextFloat(-s * 0.35, s * 0.35);
    const cy = crownCy + rng.nextFloat(-s * 0.2, s * 0.2);
    children.push(createCircle(cx, cy, rng.nextFloat(s * 0.02, s * 0.05), '#FFB7C5', {
      layer: 3, opacity: rng.nextFloat(0.5, 0.9),
    }));
  }

  return createGroup(x, y, children, { layer: 2, category: 'tree', modifiable: true, id: uid('chtree') });
}

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
  children.push(createCircle(x, y - s * 0.53, s * 0.12, '#FFD54F', { layer: 3, opacity: 0.25 }));
  // Roof (pagoda-style)
  const roofPath = `M${x - s * 0.22},${y - s * 0.6} L${x},${y - s * 0.78} L${x + s * 0.22},${y - s * 0.6} Z`;
  children.push(createPath(x, y, roofPath, stoneDark, { layer: 3 }));
  // Roof tip
  children.push(createCircle(x, y - s * 0.8, s * 0.025, stoneColor, { layer: 3 }));

  return createGroup(x, y, children, { layer: 3, category: 'lantern', modifiable: true, id: uid('toro') });
}

// ─── Japanese arched bridge ───
function archedBridge(x: number, y: number, width: number, height: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const woodColor = rng.pick(['#8B0000', '#A0522D', '#6B3410']);
  const railColor = woodColor;

  // Arch surface (filled arc)
  const archPath = `M${x},${y} Q${x + width * 0.5},${y - height} ${x + width},${y} L${x + width},${y + 6} Q${x + width * 0.5},${y - height + 6} ${x},${y + 6} Z`;
  children.push(createPath(x, y, archPath, woodColor, { layer: 2, opacity: 0.9 }));

  // Deck boards (horizontal lines across arch)
  for (let i = 0; i < 8; i++) {
    const t = (i + 1) / 9;
    const lx = x + t * width;
    const ly = y - Math.sin(t * Math.PI) * height;
    children.push(createLine(lx - 2, ly, lx + 2, ly, '#4A2510', {
      strokeWidth: 0.6, layer: 2, opacity: 0.3,
    }));
  }

  // Railings (posts along the arch)
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const px = x + t * width;
    const py = y - Math.sin(t * Math.PI) * height;
    children.push(createRect(px - 1.5, py - 14, 3, 14, railColor, { layer: 2 }));
  }

  // Top rail (curved)
  const topRailPath = `M${x},${y - 14} Q${x + width * 0.5},${y - height - 14} ${x + width},${y - 14}`;
  children.push(createPath(x, y, topRailPath, 'none', {
    stroke: railColor, strokeWidth: 2.5, layer: 2,
  }));

  return createGroup(x, y, children, { layer: 2, category: 'bridge', modifiable: true, id: uid('bridge') });
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

// ─── Stream with ripples ───
function streamBody(x: number, y: number, width: number, height: number, rng: SeededRandom): SVGElementData[] {
  const elements: SVGElementData[] = [];

  // Water body
  const waterPath = `M${x},${y} Q${x + width * 0.3},${y + height * 0.2} ${x + width * 0.5},${y + height * 0.5} Q${x + width * 0.7},${y + height * 0.8} ${x + width},${y + height} L${x + width + 15},${y + height} Q${x + width * 0.7 + 15},${y + height * 0.8} ${x + width * 0.5 + 15},${y + height * 0.5} Q${x + width * 0.3 + 15},${y + height * 0.2} ${x + 15},${y} Z`;
  elements.push(createPath(x, y, waterPath, '#4FC3F7', {
    layer: 1, category: 'water', modifiable: false, opacity: 0.7,
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

export function generateCherryBlossom(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  const elements: SVGElementData[] = [];

  // === SVG DEFS ===
  const defs = `
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#87CEEB"/>
      <stop offset="40%" stop-color="#B0D4F1"/>
      <stop offset="70%" stop-color="#D4B8D0"/>
      <stop offset="100%" stop-color="#F0C4D0"/>
    </linearGradient>
    <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7CB342"/>
      <stop offset="40%" stop-color="#8BC34A"/>
      <stop offset="100%" stop-color="#689F38"/>
    </linearGradient>
    <radialGradient id="petalGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFB7C5" stop-opacity="0.6"/>
      <stop offset="60%" stop-color="#FFC1CC" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#FFD1DC" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="pathGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#D2B48C"/>
      <stop offset="50%" stop-color="#C9A86C"/>
      <stop offset="100%" stop-color="#BFA76A"/>
    </linearGradient>
    <radialGradient id="sunWarmGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFF9C4"/>
      <stop offset="30%" stop-color="#FFEE58" stop-opacity="0.6"/>
      <stop offset="70%" stop-color="#FFD54F" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#FFD54F" stop-opacity="0"/>
    </radialGradient>
    <filter id="softGlow">
      <feGaussianBlur stdDeviation="3"/>
    </filter>
  `;

  // ========================================
  // LAYER 0: Sky with soft blue-to-pink gradient
  // ========================================
  const groundY = h * 0.62;
  elements.push(createRect(0, 0, w, groundY, 'url(#skyGrad)', { layer: 0, category: 'sky', modifiable: false }));

  // Soft clouds
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const cx = rng.nextFloat(30, w - 60);
    const cy = rng.nextFloat(h * 0.05, h * 0.2);
    const cw = rng.nextFloat(40, 90);
    const ch = rng.nextFloat(10, 18);
    const cloudColor = rng.pick(['#FFFFFF', '#F8F8FF', '#FFF0F5']);
    elements.push(createEllipse(cx, cy, cw, ch, cloudColor, {
      layer: 0, category: 'cloud', modifiable: true, opacity: rng.nextFloat(0.5, 0.75),
    }));
    elements.push(createEllipse(cx + cw * 0.3, cy - ch * 0.4, cw * 0.65, ch * 0.8, cloudColor, {
      layer: 0, category: 'cloud', modifiable: false, opacity: rng.nextFloat(0.4, 0.6),
    }));
  }

  // ========================================
  // LAYER 0: Sun with warm gentle glow
  // ========================================
  const sunX = w * rng.nextFloat(0.65, 0.85);
  const sunY = h * rng.nextFloat(0.1, 0.18);

  // Outer glow
  elements.push(createCircle(sunX, sunY, 50, 'url(#sunWarmGlow)', { layer: 0, category: 'sun', modifiable: false }));
  // Sun disc
  elements.push(createCircle(sunX, sunY, 20, '#FFF9C4', { layer: 0, category: 'sun', modifiable: true, opacity: 0.9 }));

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

  // Grass texture (small lines)
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
  // LAYER 1: Stone path (winding)
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
  // LAYER 2: Cherry blossom trees (6-10) - THE STAR
  // ========================================
  const treeCount = rng.nextInt(6, 10);
  for (let i = 0; i < treeCount; i++) {
    const tx = rng.nextFloat(w * 0.05 + i * (w * 0.85 / treeCount), w * 0.05 + (i + 0.8) * (w * 0.85 / treeCount));
    const ty = groundY + rng.nextFloat(-3, 10);
    const tSize = rng.nextFloat(80, 130);
    elements.push(cherryBlossomTree(tx, ty, tSize, rng));
  }

  // ========================================
  // LAYER 2: Fence / railing along path
  // ========================================
  const fenceY = groundY + rng.nextFloat(20, 35);
  elements.push(createFence(pathX + pathW / 2 + 5, fenceY, rng.nextFloat(60, 100), rng));

  // ========================================
  // LAYER 2: Street lamps (2-3) with warm glow
  // ========================================
  const lampCount = rng.nextInt(2, 3);
  for (let i = 0; i < lampCount; i++) {
    const lx = pathX + rng.nextFloat(-15, pathW + 15);
    const ly = groundY + rng.nextFloat(10, 40) + i * rng.nextFloat(25, 40);
    elements.push(createLamp(lx, ly, 'street', rng));
    // Warm glow circle around lamp
    elements.push(createCircle(lx, ly - 82, 15, '#FFD54F', {
      layer: 2, category: 'glow', modifiable: false, opacity: 0.15,
    }));
  }

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
  elements.push(createBench(benchX, benchY, rng));

  // ========================================
  // LAYER 3: People (2-4)
  // ========================================
  const personCount = rng.nextInt(2, 4);
  for (let i = 0; i < personCount; i++) {
    const px = rng.nextFloat(w * 0.1, w * 0.9);
    const py = groundY + rng.nextFloat(15, 50);
    elements.push(createPerson(px, py, rng));
  }

  // ========================================
  // LAYER 3: Rocks scattered
  // ========================================
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    const rx = rng.nextFloat(10, w - 10);
    const ry = rng.nextFloat(groundY + 5, h - 15);
    elements.push(createRock(rx, ry, rng.nextFloat(6, 16), rng));
  }

  // ========================================
  // LAYER 3: Small flowers along path
  // ========================================
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    const fx = rng.nextFloat(w * 0.05, w * 0.95);
    const fy = rng.nextFloat(groundY + 10, h - 20);
    const fType = rng.pick(['daisy', 'tulip', 'rose', 'sunflower'] as const);
    elements.push(createFlower(fx, fy, fType, rng.nextFloat(12, 22), rng));
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
      // Rotating oval petal
      elements.push(createEllipse(px, py, pSize, pSize * 0.5, petalColor, {
        layer: 4, category: 'petal', modifiable: true,
        opacity: rng.nextFloat(0.5, 0.9),
        rotation: rng.nextFloat(0, 360),
      }));
    } else {
      // Round petal
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
    elements.push(createBird(bx, by, true, rng));
  }

  // ========================================
  // LAYER 4: Butterflies (3-5)
  // ========================================
  const butterflyCount = rng.nextInt(3, 5);
  for (let i = 0; i < butterflyCount; i++) {
    const bx = rng.nextFloat(30, w - 30);
    const by = rng.nextFloat(h * 0.15, h * 0.65);
    elements.push(createButterfly(bx, by, rng.nextFloat(8, 16), rng));
  }

  return { elements, defs };
}
