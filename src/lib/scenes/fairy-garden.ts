import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath, createGroup,
  createLine, createPolygon, createFlower, createButterfly, createMushroom,
} from '../engine/primitives';

let _uid = 0;
function uid(p = 'fg') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// Giant mushroom house
function mushroomHouse(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const capColor = rng.pick(['#FF4444', '#FF6347', '#E040FB', '#FF69B4', '#FFD700']);

  // Stem (thick, slightly tapered)
  const stemPath = `M${x - s * 0.1},${y} Q${x - s * 0.12},${y - s * 0.3} ${x - s * 0.08},${y - s * 0.45} L${x + s * 0.08},${y - s * 0.45} Q${x + s * 0.12},${y - s * 0.3} ${x + s * 0.1},${y} Z`;
  children.push(createPath(x, y, stemPath, '#F5DEB3', { layer: 2, stroke: '#DEB887', strokeWidth: 1 }));

  // Cap (large dome)
  const capPath = `M${x - s * 0.35},${y - s * 0.42} Q${x - s * 0.4},${y - s * 0.7} ${x - s * 0.15},${y - s * 0.85} Q${x},${y - s * 0.95} ${x + s * 0.15},${y - s * 0.85} Q${x + s * 0.4},${y - s * 0.7} ${x + s * 0.35},${y - s * 0.42} Z`;
  children.push(createPath(x, y, capPath, capColor, { layer: 2 }));

  // White spots on cap
  for (let i = 0; i < rng.nextInt(4, 7); i++) {
    const sx = x + rng.nextFloat(-s * 0.22, s * 0.22);
    const sy = y - s * 0.55 + rng.nextFloat(-s * 0.2, s * 0.15);
    const sr = rng.nextFloat(s * 0.025, s * 0.05);
    children.push(createCircle(sx, sy, sr, '#FFF', { layer: 2, opacity: 0.8 }));
  }

  // Door
  const doorPath = `M${x - s * 0.05},${y} L${x - s * 0.05},${y - s * 0.2} Q${x},${y - s * 0.28} ${x + s * 0.05},${y - s * 0.2} L${x + s * 0.05},${y} Z`;
  children.push(createPath(x, y, doorPath, '#6B3410', { layer: 2 }));
  // Door handle
  children.push(createCircle(x + s * 0.03, y - s * 0.1, s * 0.01, '#FFD700', { layer: 2 }));

  // Round window
  children.push(createCircle(x - s * 0.15, y - s * 0.55, s * 0.04, '#87CEEB', { layer: 2, opacity: 0.7, stroke: '#5C3317', strokeWidth: 1.5 }));
  // Cross in window
  children.push(createLine(x - s * 0.15 - s * 0.03, y - s * 0.55, x - s * 0.15 + s * 0.03, y - s * 0.55, '#5C3317', { strokeWidth: 1, layer: 2 }));
  children.push(createLine(x - s * 0.15, y - s * 0.55 - s * 0.03, x - s * 0.15, y - s * 0.55 + s * 0.03, '#5C3317', { strokeWidth: 1, layer: 2 }));

  // Chimney (tiny)
  children.push(createRect(x + s * 0.1, y - s * 0.85, s * 0.05, s * 0.12, '#8B4513', { layer: 2 }));
  // Smoke puffs
  for (let i = 0; i < 2; i++) {
    children.push(createCircle(x + s * 0.12 + i * s * 0.02, y - s * 0.88 - i * s * 0.06, s * (0.02 + i * 0.01), '#DDD', { layer: 4, opacity: 0.3 - i * 0.1 }));
  }

  return createGroup(x, y, children, { layer: 2, category: 'mushroomhouse', modifiable: true, id: uid('mhouse') });
}

// Enchanted tree with fairy lights
function enchantedTree(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const trunkColor = rng.pick(['#5C3317', '#6B3410', '#4A2E14']);

  // Twisted trunk
  const trunkPath = `M${x - s * 0.07},${y} Q${x - s * 0.1},${y - s * 0.15} ${x - s * 0.05},${y - s * 0.3} Q${x + s * 0.05},${y - s * 0.4} ${x - s * 0.02},${y - s * 0.5} L${x + s * 0.02},${y - s * 0.5} Q${x - s * 0.03},${y - s * 0.38} ${x + s * 0.05},${y - s * 0.28} Q${x + s * 0.1},${y - s * 0.15} ${x + s * 0.07},${y} Z`;
  children.push(createPath(x, y, trunkPath, trunkColor, { layer: 2 }));

  // Glowing leaves (multiple overlapping circles)
  const leafColors = ['#00E676', '#69F0AE', '#76FF03', '#B2FF59', '#CCFF90'];
  for (let i = 0; i < rng.nextInt(6, 10); i++) {
    const lx = x + rng.nextFloat(-s * 0.3, s * 0.3);
    const ly = y - s * 0.4 + rng.nextFloat(-s * 0.25, s * 0.1);
    const lr = rng.nextFloat(s * 0.08, s * 0.18);
    children.push(createCircle(lx, ly, lr, rng.pick(leafColors), {
      layer: 2, opacity: rng.nextFloat(0.4, 0.7),
    }));
  }
  // Inner glow core
  children.push(createCircle(x, y - s * 0.45, s * 0.12, '#76FF03', { layer: 2, opacity: 0.2 }));

  // Branches
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const side = rng.chance(0.5) ? 1 : -1;
    const startY = y - s * rng.nextFloat(0.3, 0.48);
    const endX = x + side * rng.nextFloat(s * 0.15, s * 0.35);
    const endY = startY - rng.nextFloat(s * 0.05, s * 0.15);
    children.push(createPath(x, y, `M${x},${startY} Q${(x + endX) / 2},${startY - s * 0.05} ${endX},${endY}`, 'none', {
      stroke: trunkColor, strokeWidth: rng.nextFloat(s * 0.02, s * 0.04), layer: 2,
    }));
  }

  // Fairy lights hung on branches (small colored circles)
  const lightColors = ['#FFD700', '#FF69B4', '#00FFFF', '#FF6600', '#AA66FF'];
  for (let i = 0; i < rng.nextInt(5, 9); i++) {
    const lx = x + rng.nextFloat(-s * 0.3, s * 0.3);
    const ly = y - s * 0.3 + rng.nextFloat(-s * 0.15, s * 0.1);
    children.push(createCircle(lx, ly, rng.nextFloat(s * 0.01, s * 0.02), rng.pick(lightColors), { layer: 3, opacity: 0.9 }));
    // Glow around light
    children.push(createCircle(lx, ly, rng.nextFloat(s * 0.03, s * 0.05), rng.pick(lightColors), { layer: 3, opacity: 0.15 }));
  }

  return createGroup(x, y, children, { layer: 2, category: 'tree', modifiable: true, id: uid('etree') });
}

// Fairy character
function fairy(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const skinColor = rng.pick(['#FDBCB4', '#FFE0BD', '#F5CBA7']);
  const dressColor = rng.pick(['#FF69B4', '#E040FB', '#64B5F6', '#81C784', '#FFD700']);
  const wingColor = rng.pick(['#B388FF', '#80D8FF', '#FF80AB', '#A7FFEB']);

  // Wings (two ellipses on each side)
  children.push(createEllipse(x - s * 0.18, y - s * 0.15, s * 0.12, s * 0.2, wingColor, { layer: 3, opacity: 0.4 }));
  children.push(createEllipse(x + s * 0.18, y - s * 0.15, s * 0.12, s * 0.2, wingColor, { layer: 3, opacity: 0.4 }));
  children.push(createEllipse(x - s * 0.12, y + s * 0.02, s * 0.08, s * 0.12, wingColor, { layer: 3, opacity: 0.3 }));
  children.push(createEllipse(x + s * 0.12, y + s * 0.02, s * 0.08, s * 0.12, wingColor, { layer: 3, opacity: 0.3 }));

  // Body (triangle dress)
  const dressPts = `${x},${y - s * 0.15} ${x - s * 0.1},${y + s * 0.15} ${x + s * 0.1},${y + s * 0.15}`;
  children.push(createPolygon(x, y, dressPts, dressColor, { layer: 3 }));

  // Head
  children.push(createCircle(x, y - s * 0.22, s * 0.08, skinColor, { layer: 3 }));

  // Hair
  children.push(createCircle(x, y - s * 0.28, s * 0.07, rng.pick(['#FFD700', '#8B4513', '#FF6347', '#333']), { layer: 3, opacity: 0.8 }));

  // Eyes (tiny dots)
  children.push(createCircle(x - s * 0.025, y - s * 0.23, s * 0.012, '#111', { layer: 3 }));
  children.push(createCircle(x + s * 0.025, y - s * 0.23, s * 0.012, '#111', { layer: 3 }));

  // Sparkle aura
  children.push(createCircle(x, y - s * 0.1, s * 0.25, '#FFD700', { layer: 3, opacity: 0.08 }));

  return createGroup(x, y, children, { layer: 3, category: 'fairy', modifiable: true, id: uid('fairy') });
}

// Crystal/gem formation
function crystal(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const colors = ['#B388FF', '#80D8FF', '#FF80AB', '#A7FFEB', '#84FFFF', '#EA80FC'];

  const count = rng.nextInt(2, 4);
  for (let i = 0; i < count; i++) {
    const cx = x + rng.nextFloat(-s * 0.15, s * 0.15);
    const ch = rng.nextFloat(s * 0.3, s * 0.7);
    const cw = rng.nextFloat(s * 0.06, s * 0.12);
    const color = rng.pick(colors);
    // Crystal shard (tall polygon)
    const pts = `${cx - cw / 2},${y} ${cx - cw * 0.3},${y - ch * 0.7} ${cx},${y - ch} ${cx + cw * 0.3},${y - ch * 0.7} ${cx + cw / 2},${y}`;
    children.push(createPolygon(x, y, pts, color, { layer: 3, opacity: 0.7 }));
    // Highlight
    children.push(createLine(cx - cw * 0.1, y - ch * 0.3, cx, y - ch * 0.8, '#FFF', { strokeWidth: 1, layer: 3, opacity: 0.4 }));
  }

  return createGroup(x, y, children, { layer: 3, category: 'crystal', modifiable: true, id: uid('crystal') });
}

// Glowing pond with lily pads
function glowingPond(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];

  // Pond body
  children.push(createEllipse(x, y, s * 0.5, s * 0.25, '#4A0080', { layer: 1, opacity: 0.6 }));
  children.push(createEllipse(x, y, s * 0.45, s * 0.22, '#6A0DAD', { layer: 1, opacity: 0.4 }));
  // Reflection shimmer
  children.push(createEllipse(x - s * 0.1, y - s * 0.05, s * 0.15, s * 0.05, '#B388FF', { layer: 1, opacity: 0.2 }));

  // Lily pads
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const lx = x + rng.nextFloat(-s * 0.3, s * 0.3);
    const ly = y + rng.nextFloat(-s * 0.12, s * 0.12);
    const lr = rng.nextFloat(s * 0.05, s * 0.09);
    children.push(createCircle(lx, ly, lr, '#2E7D32', { layer: 2, opacity: 0.7 }));
    // Notch in lily pad
    children.push(createPath(lx, ly, `M${lx},${ly} L${lx + lr},${ly - lr * 0.3} L${lx + lr * 0.3},${ly - lr} Z`, '#4A0080', { layer: 2, opacity: 0.4 }));
    // Flower on one
    if (rng.chance(0.4)) {
      children.push(createCircle(lx, ly - lr * 0.3, lr * 0.3, rng.pick(['#FF69B4', '#FF80AB', '#FFF']), { layer: 2, opacity: 0.8 }));
    }
  }

  return createGroup(x, y, children, { layer: 1, category: 'pond', modifiable: true, id: uid('pond') });
}

// Tiny bridge over stream
function tinyBridge(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const woodColor = rng.pick(['#8B6914', '#A0522D', '#6B3410']);

  // Stream (blue-purple)
  children.push(createRect(x - s * 0.05, y - s * 0.3, s * 0.1, s * 0.6, '#6A0DAD', { layer: 1, opacity: 0.3 }));

  // Bridge arch
  const archPath = `M${x - s * 0.2},${y + s * 0.02} Q${x},${y - s * 0.12} ${x + s * 0.2},${y + s * 0.02}`;
  children.push(createPath(x, y, archPath, 'none', { stroke: woodColor, strokeWidth: s * 0.06, layer: 2 }));

  // Planks on bridge surface
  for (let i = 0; i < 5; i++) {
    const t = (i + 0.5) / 5;
    const px = x - s * 0.18 + t * s * 0.36;
    const py = y + s * 0.02 - Math.sin(t * Math.PI) * s * 0.12;
    children.push(createRect(px - s * 0.015, py - s * 0.02, s * 0.03, s * 0.04, woodColor, { layer: 2, opacity: 0.8 }));
  }

  // Railings
  children.push(createPath(x, y, `M${x - s * 0.18},${y - s * 0.02} Q${x},${y - s * 0.18} ${x + s * 0.18},${y - s * 0.02}`, 'none', {
    stroke: woodColor, strokeWidth: s * 0.02, layer: 2,
  }));

  return createGroup(x, y, children, { layer: 2, category: 'bridge', modifiable: true, id: uid('bridge') });
}

// Flower arch/gateway
function flowerArch(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];

  // Arch frame
  const archPath = `M${x - s * 0.25},${y} L${x - s * 0.25},${y - s * 0.5} Q${x},${y - s * 0.8} ${x + s * 0.25},${y - s * 0.5} L${x + s * 0.25},${y}`;
  children.push(createPath(x, y, archPath, 'none', { stroke: '#5C3317', strokeWidth: s * 0.04, layer: 2 }));

  // Flowers and leaves on arch
  const flowerColors = ['#FF69B4', '#FF80AB', '#E040FB', '#FF4081', '#FFF', '#FFD700'];
  for (let i = 0; i < rng.nextInt(10, 16); i++) {
    const t = rng.nextFloat(0, 1);
    const angle = t * Math.PI;
    const ax = x + Math.cos(angle) * s * 0.25 * (1 - t * 0.1);
    const ay = y - s * 0.5 - Math.sin(angle) * s * 0.3 + rng.nextFloat(-s * 0.05, s * 0.05);
    // Leaf
    if (rng.chance(0.5)) {
      children.push(createEllipse(ax, ay, s * 0.025, s * 0.015, '#2E7D32', { layer: 2, opacity: 0.7 }));
    } else {
      // Flower
      children.push(createCircle(ax, ay, rng.nextFloat(s * 0.02, s * 0.04), rng.pick(flowerColors), { layer: 2, opacity: 0.85 }));
    }
  }

  // Vines on left post
  children.push(createPath(x, y, `M${x - s * 0.25},${y} Q${x - s * 0.28},${y - s * 0.2} ${x - s * 0.24},${y - s * 0.35}`, 'none', {
    stroke: '#2E7D32', strokeWidth: 1.5, layer: 2, opacity: 0.6,
  }));
  // Vines on right post
  children.push(createPath(x, y, `M${x + s * 0.25},${y} Q${x + s * 0.28},${y - s * 0.15} ${x + s * 0.24},${y - s * 0.3}`, 'none', {
    stroke: '#2E7D32', strokeWidth: 1.5, layer: 2, opacity: 0.6,
  }));

  return createGroup(x, y, children, { layer: 2, category: 'arch', modifiable: true, id: uid('arch') });
}

// Hanging lantern
function hangingLantern(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const lanternColor = rng.pick(['#FFD700', '#FF8C00', '#FF69B4', '#00FFFF', '#76FF03']);

  // String
  children.push(createLine(x, y - s * 0.5, x, y - s * 0.15, '#5C3317', { strokeWidth: 1, layer: 3, opacity: 0.6 }));
  // Lantern body
  children.push(createPath(x, y, `M${x - s * 0.06},${y - s * 0.15} Q${x - s * 0.08},${y} ${x - s * 0.06},${y + s * 0.08} L${x + s * 0.06},${y + s * 0.08} Q${x + s * 0.08},${y} ${x + s * 0.06},${y - s * 0.15} Z`, lanternColor, { layer: 3, opacity: 0.7 }));
  // Glow
  children.push(createCircle(x, y, s * 0.12, lanternColor, { layer: 3, opacity: 0.15 }));
  // Top cap
  children.push(createRect(x - s * 0.04, y - s * 0.17, s * 0.08, s * 0.03, '#8B7355', { layer: 3 }));

  return createGroup(x, y, children, { layer: 3, category: 'lantern', modifiable: true, id: uid('lantern') });
}

export function generateFairyGarden(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  const elements: SVGElementData[] = [];
  const groundY = h * 0.7;

  // === SVG DEFS ===
  const defs = `
    <linearGradient id="magicSkyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1A0533"/>
      <stop offset="25%" stop-color="#2D1B69"/>
      <stop offset="50%" stop-color="#6A1B9A"/>
      <stop offset="75%" stop-color="#AD1457"/>
      <stop offset="100%" stop-color="#E91E63"/>
    </linearGradient>
    <filter id="glowFilter">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <radialGradient id="sparkleGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFD700" stop-opacity="0.8"/>
      <stop offset="40%" stop-color="#FFD700" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#FFD700" stop-opacity="0"/>
    </radialGradient>
  `;

  // === LAYER 0: Magical twilight sky ===
  elements.push(createRect(0, 0, w, h, 'url(#magicSkyGrad)', { layer: 0, category: 'sky', modifiable: false }));

  // === LAYER 0: Crescent moon ===
  const moonX = rng.nextFloat(w * 0.65, w * 0.85);
  const moonY = rng.nextFloat(h * 0.08, h * 0.18);
  const moonR = h * 0.06;
  const moonD = `M${moonX},${moonY - moonR} A${moonR},${moonR} 0 1,1 ${moonX},${moonY + moonR} A${moonR * 0.7},${moonR} 0 1,0 ${moonX},${moonY - moonR} Z`;
  elements.push(createPath(moonX, moonY, moonD, '#FFF8DC', { layer: 0, category: 'moon', modifiable: true, id: uid('moon'), opacity: 0.9 }));
  // Moon glow
  elements.push(createCircle(moonX, moonY, moonR * 2, '#FFF8DC', { layer: 0, category: 'moon', modifiable: false, opacity: 0.08 }));

  // === LAYER 0: Twinkling stars ===
  for (let i = 0; i < rng.nextInt(20, 30); i++) {
    const sx = rng.nextFloat(5, w - 5);
    const sy = rng.nextFloat(5, h * 0.5);
    const sr = rng.nextFloat(0.5, 2.5);
    elements.push(createCircle(sx, sy, sr, rng.pick(['#FFF', '#FFFACD', '#FFD700']), {
      layer: 0, category: 'star', modifiable: false, opacity: rng.nextFloat(0.3, 1.0),
    }));
  }
  // A few 4-pointed stars
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    const sx = rng.nextFloat(20, w - 20);
    const sy = rng.nextFloat(10, h * 0.4);
    const sr = rng.nextFloat(2, 5);
    let d = '';
    for (let j = 0; j < 8; j++) {
      const r = j % 2 === 0 ? sr : sr * 0.3;
      const angle = (j * Math.PI / 4) - Math.PI / 2;
      d += `${j === 0 ? 'M' : 'L'}${sx + Math.cos(angle) * r},${sy + Math.sin(angle) * r} `;
    }
    d += 'Z';
    elements.push(createPath(sx, sy, d, '#FFF', { layer: 0, category: 'star', modifiable: false, opacity: rng.nextFloat(0.5, 0.9) }));
  }

  // === LAYER 1: Lush ground ===
  const groundPath = `M0,${groundY} Q${w * 0.1},${groundY - 12} ${w * 0.2},${groundY + 3} Q${w * 0.35},${groundY - 8} ${w * 0.5},${groundY + 5} Q${w * 0.65},${groundY - 6} ${w * 0.8},${groundY + 4} Q${w * 0.9},${groundY - 3} ${w},${groundY + 2} L${w},${h} L0,${h} Z`;
  elements.push(createPath(0, 0, groundPath, '#0D3B0D', { layer: 1, category: 'ground', modifiable: false }));
  // Lighter grass patches
  for (let i = 0; i < rng.nextInt(4, 7); i++) {
    const px = rng.nextFloat(0, w);
    const py = rng.nextFloat(groundY, h - 10);
    elements.push(createEllipse(px, py, rng.nextFloat(30, 80), rng.nextFloat(10, 25), '#1B5E20', {
      layer: 1, category: 'ground', modifiable: false, opacity: 0.3,
    }));
  }

  // === LAYER 1: Stepping stones path ===
  const stoneCount = rng.nextInt(8, 12);
  const pathStartX = w * 0.2;
  const pathEndX = w * 0.8;
  for (let i = 0; i < stoneCount; i++) {
    const t = i / (stoneCount - 1);
    const sx = pathStartX + t * (pathEndX - pathStartX);
    const sy = groundY + 5 + Math.sin(t * Math.PI * 2) * 15 + rng.nextFloat(-8, 8);
    const sw = rng.nextFloat(10, 18);
    const sh = rng.nextFloat(6, 10);
    elements.push(createEllipse(sx, sy, sw, sh, rng.pick(['#888', '#999', '#AAA', '#777']), {
      layer: 1, category: 'stone', modifiable: false, opacity: 0.5,
    }));
  }

  // === LAYER 1: Glowing pond ===
  elements.push(glowingPond(rng.nextFloat(w * 0.2, w * 0.5), groundY + rng.nextFloat(15, 35), h * 0.2, rng));

  // === LAYER 2: Giant mushroom houses (2-3) ===
  const mhouseCount = rng.nextInt(2, 3);
  for (let i = 0; i < mhouseCount; i++) {
    const mx = w * 0.15 + i * (w * 0.35) + rng.nextFloat(-w * 0.05, w * 0.05);
    elements.push(mushroomHouse(mx, groundY + rng.nextFloat(-5, 5), h * rng.nextFloat(0.25, 0.38), rng));
  }

  // === LAYER 2: Enchanted trees (4-6) ===
  const etreeCount = rng.nextInt(4, 6);
  for (let i = 0; i < etreeCount; i++) {
    elements.push(enchantedTree(
      rng.nextFloat(w * 0.03, w * 0.97),
      groundY + rng.nextFloat(-8, 5),
      h * rng.nextFloat(0.25, h * 0.001),
      rng,
    ));
  }

  // === LAYER 2: Toadstool ring (circle of small mushrooms) ===
  const ringX = rng.nextFloat(w * 0.3, w * 0.7);
  const ringY = groundY + rng.nextFloat(5, 25);
  const ringR = rng.nextFloat(h * 0.05, h * 0.08);
  const ringCount = rng.nextInt(6, 10);
  for (let i = 0; i < ringCount; i++) {
    const angle = (i * 2 * Math.PI) / ringCount;
    const mx = ringX + Math.cos(angle) * ringR;
    const my = ringY + Math.sin(angle) * ringR * 0.4;
    elements.push(createMushroom(mx, my, rng.nextFloat(h * 0.03, h * 0.05), rng));
  }

  // === LAYER 2: Flower arch/gateway ===
  elements.push(flowerArch(rng.nextFloat(w * 0.35, w * 0.65), groundY + 3, h * 0.35, rng));

  // === LAYER 2: Tiny bridge ===
  elements.push(tinyBridge(rng.nextFloat(w * 0.55, w * 0.8), groundY + rng.nextFloat(5, 20), h * 0.15, rng));

  // === LAYER 3: Fairy-tale flowers (8-12) ===
  const flowerCount = rng.nextInt(8, 12);
  for (let i = 0; i < flowerCount; i++) {
    const fx = rng.nextFloat(w * 0.03, w * 0.97);
    const fy = groundY + rng.nextFloat(-10, 15);
    const fs = rng.nextFloat(h * 0.06, h * 0.12);
    const ftype = rng.pick(['daisy', 'tulip', 'rose', 'sunflower'] as const);
    elements.push(createFlower(fx, fy, ftype, fs, rng));
    // Glow around flower
    elements.push(createCircle(fx, fy - fs * 0.3, fs * 0.25, rng.pick(['#FFD700', '#FF69B4', '#76FF03']), {
      layer: 3, category: 'glow', modifiable: false, opacity: 0.1,
    }));
  }

  // === LAYER 3: Crystals/gem formations ===
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(crystal(
      rng.nextFloat(w * 0.05, w * 0.95),
      groundY + rng.nextFloat(-5, 10),
      h * rng.nextFloat(0.06, h * 0.0002),
      rng,
    ));
  }

  // === LAYER 3: Fairy characters (2-3) ===
  const fairyCount = rng.nextInt(2, 3);
  for (let i = 0; i < fairyCount; i++) {
    elements.push(fairy(
      rng.nextFloat(w * 0.15, w * 0.85),
      rng.nextFloat(groundY - h * 0.3, groundY - h * 0.1),
      h * rng.nextFloat(0.08, h * 0.0003),
      rng,
    ));
  }

  // === LAYER 3: Hanging lanterns (4-6) ===
  for (let i = 0; i < rng.nextInt(4, 6); i++) {
    elements.push(hangingLantern(
      rng.nextFloat(w * 0.05, w * 0.95),
      rng.nextFloat(groundY - h * 0.35, groundY - h * 0.1),
      h * 0.08,
      rng,
    ));
  }

  // === LAYER 4: Butterflies (4-6) ===
  for (let i = 0; i < rng.nextInt(4, 6); i++) {
    elements.push(createButterfly(
      rng.nextFloat(w * 0.05, w * 0.95),
      rng.nextFloat(h * 0.2, groundY - 10),
      rng.nextFloat(h * 0.03, h * 0.06),
      rng,
    ));
  }

  // === LAYER 4: Fireflies/sparkles (25-35) ===
  for (let i = 0; i < rng.nextInt(25, 35); i++) {
    const fx = rng.nextFloat(0, w);
    const fy = rng.nextFloat(h * 0.15, h * 0.95);
    const fr = rng.nextFloat(1, 3);
    const color = rng.pick(['#FFD700', '#FFF', '#FFFACD', '#76FF03']);
    elements.push(createCircle(fx, fy, fr, color, {
      layer: 4, category: 'sparkle', modifiable: false, opacity: rng.nextFloat(0.2, 0.9),
    }));
    // Larger faint glow around sparkle
    if (rng.chance(0.4)) {
      elements.push(createCircle(fx, fy, fr * 3, color, {
        layer: 4, category: 'sparkle', modifiable: false, opacity: rng.nextFloat(0.03, 0.1),
      }));
    }
  }

  // === LAYER 4: Atmospheric particles ===
  for (let i = 0; i < rng.nextInt(10, 20); i++) {
    elements.push(createCircle(rng.nextFloat(0, w), rng.nextFloat(0, h), rng.nextFloat(0.5, 1.5), '#E1BEE7', {
      layer: 4, category: 'particle', modifiable: false, opacity: rng.nextFloat(0.05, 0.2),
    }));
  }

  return { elements, defs };
}
