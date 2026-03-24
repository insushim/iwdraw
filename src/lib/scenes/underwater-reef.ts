import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import { createRect, createCircle, createEllipse, createPath, createGroup } from '../engine/primitives';

let _uid = 0;
function uid(p = 'uw') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// Detailed fish with body, fins, tail, eye, and pattern
function detailedFish(x: number, y: number, size: number, rng: SeededRandom, direction: number = 1): SVGElementData {
  const s = size;
  const d = direction; // 1 = right, -1 = left
  const bodyColor = rng.nextColor([0, 360], [60, 95], [45, 70]);
  const finColor = rng.nextColor([0, 360], [50, 80], [50, 65]);
  const bellyColor = rng.nextColor([40, 60], [30, 50], [75, 90]);
  const children: SVGElementData[] = [];

  // Tail fin
  const tailPath = `M${x + d * s * 0.35},${y} L${x + d * s * 0.55},${y - s * 0.2} L${x + d * s * 0.5},${y} L${x + d * s * 0.55},${y + s * 0.2} Z`;
  children.push(createPath(x, y, tailPath, finColor, { layer: 3, opacity: 0.85 }));

  // Body (teardrop shape)
  const bodyPath = `M${x + d * s * 0.35},${y} Q${x + d * s * 0.15},${y - s * 0.22} ${x - d * s * 0.25},${y - s * 0.08} Q${x - d * s * 0.35},${y} ${x - d * s * 0.25},${y + s * 0.08} Q${x + d * s * 0.15},${y + s * 0.22} ${x + d * s * 0.35},${y} Z`;
  children.push(createPath(x, y, bodyPath, bodyColor, { layer: 3 }));

  // Belly highlight
  const bellyPath = `M${x + d * s * 0.2},${y + s * 0.02} Q${x},${y + s * 0.15} ${x - d * s * 0.2},${y + s * 0.05} Q${x},${y + s * 0.05} ${x + d * s * 0.2},${y + s * 0.02} Z`;
  children.push(createPath(x, y, bellyPath, bellyColor, { layer: 3, opacity: 0.5 }));

  // Dorsal fin
  const dorsalPath = `M${x + d * s * 0.1},${y - s * 0.12} Q${x - d * s * 0.05},${y - s * 0.3} ${x - d * s * 0.15},${y - s * 0.1}`;
  children.push(createPath(x, y, dorsalPath, finColor, { layer: 3, stroke: finColor, strokeWidth: s * 0.04, opacity: 0.7 }));

  // Pectoral fin
  const pecPath = `M${x - d * s * 0.05},${y + s * 0.05} Q${x - d * s * 0.1},${y + s * 0.2} ${x + d * s * 0.05},${y + s * 0.12}`;
  children.push(createPath(x, y, pecPath, finColor, { layer: 3, stroke: finColor, strokeWidth: s * 0.03, opacity: 0.6 }));

  // Eye
  children.push(createCircle(x - d * s * 0.18, y - s * 0.02, s * 0.055, '#FFF', { layer: 3 }));
  children.push(createCircle(x - d * s * 0.18, y - s * 0.02, s * 0.03, '#111', { layer: 3 }));
  // Eye highlight
  children.push(createCircle(x - d * s * 0.19, y - s * 0.035, s * 0.012, '#FFF', { layer: 3 }));

  // Stripes or spots (pattern)
  if (rng.chance(0.5)) {
    for (let i = 0; i < rng.nextInt(2, 4); i++) {
      const sx = x + d * s * (-0.05 + i * 0.12);
      children.push(createPath(sx, y, `M${sx},${y - s * 0.12} Q${sx + d * s * 0.03},${y} ${sx},${y + s * 0.12}`, 'none', { stroke: rng.nextColor([0, 360], [40, 70], [30, 55]), strokeWidth: s * 0.03, layer: 3, opacity: 0.4 }));
    }
  }

  return createGroup(x, y, children, { layer: 3, category: 'fish', modifiable: true, id: uid('fish') });
}

// Detailed coral with branching
function detailedCoral(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const baseColor = rng.pick(['#FF5252', '#FF4081', '#E040FB', '#FF6E40', '#FFD740', '#FF1744', '#F50057']);
  const children: SVGElementData[] = [];

  // Main trunk
  const trunkW = s * 0.12;
  children.push(createPath(x, y, `M${x - trunkW / 2},${y} Q${x},${y - s * 0.3} ${x + trunkW * 0.3},${y - s * 0.6}`, 'none', { stroke: baseColor, strokeWidth: trunkW, layer: 2, opacity: 0.9 }));

  // Branches (6-10)
  const branches = rng.nextInt(6, 10);
  for (let i = 0; i < branches; i++) {
    const bAngle = rng.nextFloat(-0.8, 0.8);
    const bLen = rng.nextFloat(s * 0.2, s * 0.5);
    const bStartY = y - rng.nextFloat(s * 0.05, s * 0.55);
    const bStartX = x + rng.nextFloat(-s * 0.15, s * 0.15);
    const bendX = bStartX + Math.sin(bAngle) * bLen;
    const bendY = bStartY - Math.cos(bAngle) * bLen;
    const thickness = rng.nextFloat(s * 0.03, s * 0.08);

    children.push(createPath(x, y, `M${bStartX},${bStartY} Q${(bStartX + bendX) / 2 + rng.nextFloat(-8, 8)},${(bStartY + bendY) / 2} ${bendX},${bendY}`, 'none', {
      stroke: baseColor, strokeWidth: thickness, layer: 2, opacity: rng.nextFloat(0.7, 1),
    }));

    // Branch tip (bulb)
    children.push(createCircle(bendX, bendY, thickness * 1.2, baseColor, { layer: 2, opacity: 0.8 }));

    // Sub-branches
    if (rng.chance(0.4)) {
      const subLen = bLen * 0.4;
      const subAngle = bAngle + rng.nextFloat(-0.5, 0.5);
      const subX = bendX + Math.sin(subAngle) * subLen;
      const subY = bendY - Math.cos(subAngle) * subLen;
      children.push(createPath(x, y, `M${bendX},${bendY} L${subX},${subY}`, 'none', {
        stroke: baseColor, strokeWidth: thickness * 0.6, layer: 2, opacity: 0.6,
      }));
      children.push(createCircle(subX, subY, thickness * 0.8, baseColor, { layer: 2, opacity: 0.7 }));
    }
  }

  return createGroup(x, y, children, { layer: 2, category: 'coral', modifiable: true, id: uid('coral') });
}

// Detailed jellyfish with translucent bell + flowing tentacles
function detailedJellyfish(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const color = rng.pick(['#E040FB', '#FF80AB', '#B388FF', '#82B1FF', '#80D8FF', '#A7FFEB']);
  const children: SVGElementData[] = [];

  // Bell (dome shape)
  const bellPath = `M${x - s * 0.4},${y} Q${x - s * 0.45},${y - s * 0.5} ${x - s * 0.2},${y - s * 0.7} Q${x},${y - s * 0.8} ${x + s * 0.2},${y - s * 0.7} Q${x + s * 0.45},${y - s * 0.5} ${x + s * 0.4},${y} Q${x + s * 0.2},${y + s * 0.1} ${x},${y + s * 0.05} Q${x - s * 0.2},${y + s * 0.1} ${x - s * 0.4},${y} Z`;
  children.push(createPath(x, y, bellPath, color, { layer: 3, opacity: 0.35 }));

  // Bell inner highlight
  const innerPath = `M${x - s * 0.25},${y - s * 0.1} Q${x - s * 0.3},${y - s * 0.4} ${x},${y - s * 0.55} Q${x + s * 0.3},${y - s * 0.4} ${x + s * 0.25},${y - s * 0.1}`;
  children.push(createPath(x, y, innerPath, color, { layer: 3, opacity: 0.2, stroke: color, strokeWidth: 1 }));

  // Bell rim glow
  const rimPath = `M${x - s * 0.38},${y} Q${x - s * 0.2},${y + s * 0.08} ${x},${y + s * 0.03} Q${x + s * 0.2},${y + s * 0.08} ${x + s * 0.38},${y}`;
  children.push(createPath(x, y, rimPath, 'none', { stroke: color, strokeWidth: 2, layer: 3, opacity: 0.5 }));

  // Tentacles (6-8 flowing)
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

  // Internal organs (dots)
  for (let i = 0; i < 4; i++) {
    children.push(createCircle(x + rng.nextFloat(-s * 0.15, s * 0.15), y - s * 0.3 + rng.nextFloat(-s * 0.15, s * 0.15), rng.nextFloat(2, 4), color, { layer: 3, opacity: 0.5 }));
  }

  return createGroup(x, y, children, { layer: 3, category: 'jellyfish', modifiable: true, id: uid('jelly') });
}

// Rich seaweed with leaves
function richSeaweed(x: number, y: number, height: number, rng: SeededRandom): SVGElementData {
  const h = height;
  const color = rng.nextHSL([100, 160], [40, 65], [20, 40]);
  const children: SVGElementData[] = [];

  // Main stem - thick wavy
  const stemPath = `M${x},${y} Q${x + rng.nextFloat(-12, 12)},${y - h * 0.25} ${x + rng.nextFloat(-8, 8)},${y - h * 0.5} Q${x + rng.nextFloat(-12, 12)},${y - h * 0.75} ${x + rng.nextFloat(-5, 5)},${y - h}`;
  children.push(createPath(x, y, stemPath, 'none', { stroke: color, strokeWidth: rng.nextFloat(4, 7), layer: 2, opacity: 0.85 }));

  // Leaves along the stem
  const leafCount = rng.nextInt(4, 8);
  for (let i = 0; i < leafCount; i++) {
    const ly = y - (i + 1) * (h / (leafCount + 1));
    const side = i % 2 === 0 ? 1 : -1;
    const lx = x + side * rng.nextFloat(2, 8);
    const leafLen = rng.nextFloat(12, 25);
    const leafPath = `M${lx},${ly} Q${lx + side * leafLen * 0.5},${ly - leafLen * 0.3} ${lx + side * leafLen},${ly - leafLen * 0.1} Q${lx + side * leafLen * 0.5},${ly + leafLen * 0.1} ${lx},${ly}`;
    children.push(createPath(x, y, leafPath, color, { layer: 2, opacity: rng.nextFloat(0.5, 0.8) }));
  }

  return createGroup(x, y, children, { layer: 2, category: 'seaweed', modifiable: true, id: uid('weed') });
}

// Detailed bubble with gradient highlight
function fancyBubble(x: number, y: number, r: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  children.push(createCircle(x, y, r, '#B3E5FC', { layer: 4, opacity: rng.nextFloat(0.15, 0.35), stroke: '#80DEEA', strokeWidth: 0.5 }));
  // Highlight
  children.push(createCircle(x - r * 0.25, y - r * 0.25, r * 0.25, '#FFF', { layer: 4, opacity: 0.5 }));
  return createGroup(x, y, children, { layer: 4, category: 'bubble', modifiable: true, id: uid('bub') });
}

// Sea floor with sand ripples and scattered elements
function seaFloor(w: number, h: number, floorY: number, rng: SeededRandom): SVGElementData[] {
  const els: SVGElementData[] = [];

  // Sandy ground with wave profile
  const sandPath = `M0,${floorY} Q${w * 0.1},${floorY - 8} ${w * 0.2},${floorY + 3} Q${w * 0.35},${floorY - 5} ${w * 0.5},${floorY + 4} Q${w * 0.65},${floorY - 3} ${w * 0.8},${floorY + 5} Q${w * 0.9},${floorY - 2} ${w},${floorY + 3} L${w},${h} L0,${h} Z`;
  els.push(createPath(0, 0, sandPath, '#C8B560', { layer: 1, category: 'sand', modifiable: false, opacity: 0.5 }));
  // Darker sand layer
  els.push(createRect(0, floorY + 20, w, h - floorY - 20, '#A69040', { layer: 1, category: 'sand', modifiable: false, opacity: 0.3 }));

  // Sand ripples
  for (let i = 0; i < 8; i++) {
    const ry = floorY + 5 + i * 10;
    const ripple = `M${rng.nextFloat(0, 30)},${ry} Q${w * 0.25},${ry - 3} ${w * 0.5},${ry + 2} Q${w * 0.75},${ry - 2} ${w},${ry + 1}`;
    els.push(createPath(0, 0, ripple, 'none', { stroke: '#B8A050', strokeWidth: 1, layer: 1, category: 'sand', modifiable: false, opacity: 0.3 }));
  }

  // Small rocks
  for (let i = 0; i < rng.nextInt(4, 8); i++) {
    const rx = rng.nextFloat(20, w - 20);
    const ry = rng.nextFloat(floorY - 5, floorY + 15);
    const rs = rng.nextFloat(5, 18);
    const rockPath = `M${rx - rs},${ry} Q${rx - rs * 0.8},${ry - rs * 0.7} ${rx},${ry - rs * 0.8} Q${rx + rs * 0.8},${ry - rs * 0.7} ${rx + rs},${ry} Z`;
    els.push(createPath(rx, ry, rockPath, rng.nextHSL([20, 40], [10, 25], [35, 55]), { layer: 2, category: 'rock', modifiable: true, id: uid('rock') }));
  }

  // Shells
  for (let i = 0; i < rng.nextInt(2, 5); i++) {
    const sx = rng.nextFloat(30, w - 30);
    const sy = rng.nextFloat(floorY, floorY + 15);
    const ss = rng.nextFloat(4, 9);
    const shellColor = rng.pick(['#FFF8E1', '#FFCCBC', '#F8BBD0', '#F0F4C3']);
    // Spiral shell shape
    const shellPath = `M${sx},${sy} Q${sx - ss},${sy - ss * 1.3} ${sx},${sy - ss * 1.5} Q${sx + ss},${sy - ss * 1.3} ${sx + ss * 0.3},${sy - ss * 0.3} Q${sx + ss * 0.5},${sy} ${sx},${sy} Z`;
    els.push(createPath(sx, sy, shellPath, shellColor, { layer: 3, category: 'shell', modifiable: true, id: uid('shell'), opacity: 0.8 }));
  }

  // Starfish
  if (rng.chance(0.7)) {
    const stx = rng.nextFloat(60, w - 60);
    const sty = rng.nextFloat(floorY, floorY + 12);
    const stColor = rng.pick(['#FF5722', '#FF7043', '#FF8A65', '#FFB74D']);
    let d = '';
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 14 : 6;
      const angle = (i * Math.PI / 5) - Math.PI / 2;
      d += `${i === 0 ? 'M' : 'L'}${stx + Math.cos(angle) * r},${sty + Math.sin(angle) * r} `;
    }
    d += 'Z';
    els.push(createPath(stx, sty, d, stColor, { layer: 3, category: 'starfish', modifiable: true, id: uid('star'), opacity: 0.85 }));
  }

  return els;
}

export function generateUnderwaterReef(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  const elements: SVGElementData[] = [];
  const floorY = h * 0.78;

  // === SVG DEFS: Gradients & Filters ===
  const defs = `
    <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#001428"/>
      <stop offset="25%" stop-color="#002244"/>
      <stop offset="50%" stop-color="#003366"/>
      <stop offset="75%" stop-color="#0055AA"/>
      <stop offset="100%" stop-color="#0077CC"/>
    </linearGradient>
    <radialGradient id="lightRay" cx="50%" cy="0%" r="80%">
      <stop offset="0%" stop-color="#4FC3F7" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#4FC3F7" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bubbleGrad" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FFF" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#80DEEA" stop-opacity="0.1"/>
    </radialGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <filter id="softBlur">
      <feGaussianBlur stdDeviation="2"/>
    </filter>
  `;

  // === LAYER 0: Water background gradient ===
  elements.push(createRect(0, 0, w, h, 'url(#waterGrad)', { layer: 0, category: 'water', modifiable: false }));

  // === LAYER 0: Light rays from surface ===
  for (let i = 0; i < rng.nextInt(5, 8); i++) {
    const rx = rng.nextFloat(w * 0.05, w * 0.95);
    const rw = rng.nextFloat(15, 45);
    const rh = rng.nextFloat(h * 0.3, h * 0.7);
    const rayPath = `M${rx - rw},0 L${rx - rw * 2.5},${rh} L${rx + rw * 2.5},${rh} L${rx + rw},0 Z`;
    elements.push(createPath(0, 0, rayPath, '#4FC3F7', { layer: 0, category: 'light', modifiable: false, opacity: rng.nextFloat(0.03, 0.08) }));
  }

  // === LAYER 0: Caustic light patterns on mid-water ===
  for (let i = 0; i < rng.nextInt(4, 8); i++) {
    const cx = rng.nextFloat(0, w);
    const cy = rng.nextFloat(h * 0.1, h * 0.5);
    elements.push(createEllipse(cx, cy, rng.nextFloat(30, 80), rng.nextFloat(10, 30), '#64B5F6', {
      layer: 0, category: 'caustic', modifiable: false, opacity: rng.nextFloat(0.02, 0.06),
    }));
  }

  // === LAYER 1: Sea floor ===
  elements.push(...seaFloor(w, h, floorY, rng));

  // === LAYER 2: Coral formations (5-9) ===
  for (let i = 0; i < rng.nextInt(5, 9); i++) {
    elements.push(detailedCoral(rng.nextFloat(25, w - 25), rng.nextFloat(floorY - 10, floorY + 10), rng.nextFloat(40, 80), rng));
  }

  // === LAYER 2: Seaweed (6-12) ===
  for (let i = 0; i < rng.nextInt(6, 12); i++) {
    elements.push(richSeaweed(rng.nextFloat(10, w - 10), floorY + rng.nextFloat(-5, 15), rng.nextFloat(60, 150), rng));
  }

  // === LAYER 3: Fish — foreground detailed (6-10) ===
  for (let i = 0; i < rng.nextInt(6, 10); i++) {
    const fx = rng.nextFloat(40, w - 40);
    const fy = rng.nextFloat(h * 0.1, floorY - 30);
    const dir = rng.chance(0.5) ? 1 : -1;
    elements.push(detailedFish(fx, fy, rng.nextFloat(22, 45), rng, dir));
  }

  // === LAYER 3: Distant fish silhouettes (depth) ===
  for (let i = 0; i < rng.nextInt(4, 8); i++) {
    const fx = rng.nextFloat(20, w - 20);
    const fy = rng.nextFloat(h * 0.05, h * 0.4);
    const fs = rng.nextFloat(8, 16);
    const bodyPath = `M${fx + fs},${fy} Q${fx + fs * 0.5},${fy - fs * 0.3} ${fx - fs * 0.5},${fy} Q${fx + fs * 0.5},${fy + fs * 0.3} ${fx + fs},${fy}`;
    const tailPath = `M${fx + fs},${fy} L${fx + fs * 1.4},${fy - fs * 0.25} L${fx + fs * 1.3},${fy} L${fx + fs * 1.4},${fy + fs * 0.25} Z`;
    elements.push(createPath(fx, fy, bodyPath, '#0D47A1', { layer: 1, category: 'fish_bg', modifiable: false, opacity: 0.15 }));
    elements.push(createPath(fx, fy, tailPath, '#0D47A1', { layer: 1, category: 'fish_bg', modifiable: false, opacity: 0.12 }));
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

  // === LAYER 0: Depth fog (darker at bottom edges) ===
  elements.push(createRect(0, h * 0.85, w, h * 0.15, '#001428', { layer: 4, category: 'fog', modifiable: false, opacity: 0.25 }));
  elements.push(createRect(0, 0, w, h * 0.05, '#000A14', { layer: 4, category: 'fog', modifiable: false, opacity: 0.3 }));

  return { elements, defs };
}
