import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath, createGroup,
  createLine, createPolygon, createTree, createBird, createRock,
} from '../engine/primitives';

let _uid = 0;
function uid(p = 'bs') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// Detailed palm tree with coconuts and textured trunk
function detailedPalm(x: number, y: number, size: number, rng: SeededRandom, lean: number = 0): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const trunkColor = rng.pick(['#8B5E3C', '#7B4F2C', '#6B4226']);

  // Trunk segments for texture
  const segments = 8;
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const tx = x + lean * t * t * s * 0.3;
    const ty = y - t * s * 0.65;
    const nextT = (i + 1) / segments;
    const ntx = x + lean * nextT * nextT * s * 0.3;
    const nty = y - nextT * s * 0.65;
    const w = s * 0.07 * (1 - t * 0.4);
    const segPath = `M${tx - w},${ty} L${ntx - w * 0.85},${nty} L${ntx + w * 0.85},${nty} L${tx + w},${ty} Z`;
    const shade = i % 2 === 0 ? trunkColor : '#5C3A1E';
    children.push(createPath(x, y, segPath, shade, { layer: 2, opacity: 0.9 }));
  }

  // Trunk ring marks
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const rx = x + lean * t * t * s * 0.3;
    const ry = y - t * s * 0.65;
    const ringW = s * 0.07 * (1 - t * 0.4);
    children.push(createLine(rx - ringW, ry, rx + ringW, ry, '#4A2E14', { strokeWidth: 1, layer: 2, opacity: 0.4 }));
  }

  const topX = x + lean * s * 0.3;
  const topY = y - s * 0.65;

  // Palm fronds (7-9)
  const frondCount = rng.nextInt(7, 9);
  for (let i = 0; i < frondCount; i++) {
    const angle = (i * 360 / frondCount + rng.nextFloat(-15, 15)) * Math.PI / 180;
    const frondLen = s * rng.nextFloat(0.35, 0.55);
    const droop = rng.nextFloat(0.2, 0.45);
    const endX = topX + Math.cos(angle) * frondLen;
    const endY = topY + Math.sin(angle) * frondLen * 0.5 + frondLen * droop;
    const cpX = topX + Math.cos(angle) * frondLen * 0.5;
    const cpY = topY + Math.sin(angle) * frondLen * 0.2 - frondLen * 0.1;

    // Main frond stem
    const frondColor = rng.nextHSL([95, 130], [45, 70], [25, 42]);
    children.push(createPath(topX, topY, `M${topX},${topY} Q${cpX},${cpY} ${endX},${endY}`, 'none', {
      stroke: frondColor, strokeWidth: s * 0.025, layer: 2, opacity: 0.9,
    }));

    // Leaf blades along the frond
    const bladeCount = rng.nextInt(5, 8);
    for (let j = 1; j <= bladeCount; j++) {
      const bt = j / (bladeCount + 1);
      const bx = topX + (cpX - topX) * bt * 2 * (bt < 0.5 ? 1 : 0) + (bt >= 0.5 ? cpX + (endX - cpX) * (bt - 0.5) * 2 - topX : 0) + topX * 0;
      // Simplified bezier point
      const bzx = (1 - bt) * (1 - bt) * topX + 2 * (1 - bt) * bt * cpX + bt * bt * endX;
      const bzy = (1 - bt) * (1 - bt) * topY + 2 * (1 - bt) * bt * cpY + bt * bt * endY;
      const bladeLen = s * 0.08 * (1 - bt * 0.5);
      const side = j % 2 === 0 ? 1 : -1;
      const perpAngle = angle + side * Math.PI / 2.5;
      const bladeEndX = bzx + Math.cos(perpAngle) * bladeLen;
      const bladeEndY = bzy + Math.sin(perpAngle) * bladeLen * 0.6 + bladeLen * 0.3;
      children.push(createPath(bzx, bzy, `M${bzx},${bzy} Q${(bzx + bladeEndX) / 2},${bzy - bladeLen * 0.1} ${bladeEndX},${bladeEndY}`, 'none', {
        stroke: frondColor, strokeWidth: s * 0.012, layer: 2, opacity: 0.7,
      }));
    }
  }

  // Coconuts (2-4)
  const coconutCount = rng.nextInt(2, 4);
  for (let i = 0; i < coconutCount; i++) {
    const cx = topX + rng.nextFloat(-s * 0.06, s * 0.06);
    const cy = topY + rng.nextFloat(-s * 0.02, s * 0.04);
    children.push(createCircle(cx, cy, s * 0.03, '#5C4033', { layer: 2 }));
    children.push(createCircle(cx - s * 0.008, cy - s * 0.01, s * 0.01, '#7B5B4A', { layer: 2, opacity: 0.5 }));
  }

  return createGroup(x, y, children, { layer: 2, category: 'palm', modifiable: true, id: uid('palm') });
}

// Detailed sandcastle with towers, walls, flag
function sandcastle(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const sandColor = '#E8C170';
  const sandDark = '#D4A84B';
  const sandLight = '#F5DCA0';

  // Base mound
  const basePath = `M${x - s * 0.5},${y} Q${x - s * 0.45},${y - s * 0.12} ${x - s * 0.3},${y - s * 0.15} L${x + s * 0.3},${y - s * 0.15} Q${x + s * 0.45},${y - s * 0.12} ${x + s * 0.5},${y} Z`;
  children.push(createPath(x, y, basePath, sandColor, { layer: 3 }));

  // Main tower (center)
  children.push(createRect(x - s * 0.12, y - s * 0.55, s * 0.24, s * 0.4, sandColor, { layer: 3 }));
  // Tower top (crenellations)
  for (let i = 0; i < 4; i++) {
    children.push(createRect(x - s * 0.12 + i * s * 0.07, y - s * 0.62, s * 0.04, s * 0.07, sandColor, { layer: 3 }));
  }
  // Tower window
  children.push(createPath(x, y, `M${x - s * 0.03},${y - s * 0.35} Q${x},${y - s * 0.42} ${x + s * 0.03},${y - s * 0.35} L${x + s * 0.03},${y - s * 0.28} L${x - s * 0.03},${y - s * 0.28} Z`, sandDark, { layer: 3, opacity: 0.6 }));

  // Side towers
  const sides = [-1, 1];
  for (const side of sides) {
    const tx = x + side * s * 0.28;
    children.push(createRect(tx - s * 0.08, y - s * 0.38, s * 0.16, s * 0.23, sandColor, { layer: 3 }));
    // Crenellations
    for (let i = 0; i < 3; i++) {
      children.push(createRect(tx - s * 0.08 + i * s * 0.06, y - s * 0.43, s * 0.035, s * 0.05, sandColor, { layer: 3 }));
    }
  }

  // Wall between towers
  children.push(createRect(x - s * 0.2, y - s * 0.22, s * 0.08, s * 0.07, sandLight, { layer: 3, opacity: 0.8 }));
  children.push(createRect(x + s * 0.12, y - s * 0.22, s * 0.08, s * 0.07, sandLight, { layer: 3, opacity: 0.8 }));

  // Flag on top
  const flagColor = rng.pick(['#FF4444', '#2196F3', '#FF9800', '#E91E63']);
  children.push(createLine(x, y - s * 0.62, x, y - s * 0.82, '#8D6E63', { strokeWidth: 1.5, layer: 3 }));
  children.push(createPolygon(x, y - s * 0.82, `${x},${y - s * 0.82} ${x + s * 0.1},${y - s * 0.77} ${x},${y - s * 0.72}`, flagColor, { layer: 3 }));

  // Sand texture dots
  for (let i = 0; i < 6; i++) {
    children.push(createCircle(x + rng.nextFloat(-s * 0.1, s * 0.1), y - rng.nextFloat(s * 0.2, s * 0.5), 1, sandDark, { layer: 3, opacity: 0.3 }));
  }

  return createGroup(x, y, children, { layer: 3, category: 'sandcastle', modifiable: true, id: uid('castle') });
}

// Beach umbrella with detailed stripes and shadow
function beachUmbrella(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const colors = rng.pick([
    ['#F44336', '#FFF'], ['#2196F3', '#FFF'], ['#FF9800', '#FFF'],
    ['#4CAF50', '#FFF'], ['#E91E63', '#FFEB3B'],
  ]);

  // Shadow on sand
  children.push(createEllipse(x + s * 0.15, y + s * 0.02, s * 0.45, s * 0.06, '#000', { layer: 2, opacity: 0.12 }));

  // Pole
  children.push(createLine(x, y, x, y - s * 0.85, '#8D6E63', { strokeWidth: s * 0.04, layer: 2 }));

  // Umbrella canopy (semi-circle with stripes using path segments)
  const segments = 8;
  const canopyR = s * 0.5;
  const canopyY = y - s * 0.85;
  for (let i = 0; i < segments; i++) {
    const startAngle = Math.PI + (i * Math.PI / segments);
    const endAngle = Math.PI + ((i + 1) * Math.PI / segments);
    const x1 = x + Math.cos(startAngle) * canopyR;
    const y1 = canopyY + Math.sin(startAngle) * canopyR * 0.35;
    const x2 = x + Math.cos(endAngle) * canopyR;
    const y2 = canopyY + Math.sin(endAngle) * canopyR * 0.35;
    const color = colors[i % 2];
    const segPath = `M${x},${canopyY} L${x1},${y1} A${canopyR},${canopyR * 0.35} 0 0,1 ${x2},${y2} Z`;
    children.push(createPath(x, canopyY, segPath, color, { layer: 2, opacity: 0.9 }));
  }

  // Top knob
  children.push(createCircle(x, canopyY, s * 0.025, '#FFD700', { layer: 2 }));

  return createGroup(x, y, children, { layer: 2, category: 'umbrella', modifiable: true, id: uid('umb') });
}

// Detailed seashell
function seashell(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const shellType = rng.nextInt(0, 2);
  const shellColor = rng.pick(['#FFF8E1', '#FFCCBC', '#F8BBD0', '#FFE0B2', '#D7CCC8', '#FFECB3']);
  const shellDark = rng.pick(['#BCAAA4', '#D4A373', '#C9956B']);

  if (shellType === 0) {
    // Spiral shell
    const bodyPath = `M${x},${y} Q${x - s * 0.4},${y - s * 0.3} ${x - s * 0.1},${y - s * 0.6} Q${x + s * 0.3},${y - s * 0.7} ${x + s * 0.4},${y - s * 0.3} Q${x + s * 0.35},${y + s * 0.05} ${x},${y} Z`;
    children.push(createPath(x, y, bodyPath, shellColor, { layer: 3 }));
    // Spiral lines
    children.push(createPath(x, y, `M${x + s * 0.1},${y - s * 0.1} Q${x},${y - s * 0.3} ${x + s * 0.15},${y - s * 0.4}`, 'none', { stroke: shellDark, strokeWidth: 0.8, layer: 3, opacity: 0.5 }));
    children.push(createPath(x, y, `M${x + s * 0.2},${y - s * 0.15} Q${x + s * 0.05},${y - s * 0.35} ${x + s * 0.25},${y - s * 0.45}`, 'none', { stroke: shellDark, strokeWidth: 0.6, layer: 3, opacity: 0.4 }));
  } else if (shellType === 1) {
    // Scallop shell (fan shape)
    const fanPath = `M${x},${y} Q${x - s * 0.35},${y - s * 0.1} ${x - s * 0.3},${y - s * 0.5} Q${x},${y - s * 0.65} ${x + s * 0.3},${y - s * 0.5} Q${x + s * 0.35},${y - s * 0.1} ${x},${y} Z`;
    children.push(createPath(x, y, fanPath, shellColor, { layer: 3 }));
    // Ridges
    for (let i = 0; i < 5; i++) {
      const ridgeAngle = (-40 + i * 20) * Math.PI / 180;
      const rx = x + Math.sin(ridgeAngle) * s * 0.28;
      const ry = y - Math.cos(ridgeAngle) * s * 0.45;
      children.push(createLine(x, y, rx, ry, shellDark, { strokeWidth: 0.7, layer: 3, opacity: 0.35 }));
    }
  } else {
    // Cowrie shell (oval)
    children.push(createEllipse(x, y - s * 0.2, s * 0.2, s * 0.3, shellColor, { layer: 3 }));
    children.push(createLine(x, y + s * 0.1, x, y - s * 0.5, shellDark, { strokeWidth: 1, layer: 3, opacity: 0.4 }));
    // Spots
    for (let i = 0; i < 3; i++) {
      children.push(createCircle(x + rng.nextFloat(-s * 0.1, s * 0.1), y - rng.nextFloat(0, s * 0.4), s * 0.03, shellDark, { layer: 3, opacity: 0.3 }));
    }
  }

  return createGroup(x, y, children, { layer: 3, category: 'shell', modifiable: true, id: uid('shell') });
}

// Sailboat with reflection
function sailboat(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const hullColor = rng.pick(['#8D6E63', '#5D4037', '#795548', '#A1887F']);
  const sailColor = rng.pick(['#FFFFFF', '#FFF8E1', '#E3F2FD']);

  // Hull
  const hullPath = `M${x - s * 0.4},${y} L${x - s * 0.3},${y + s * 0.15} L${x + s * 0.35},${y + s * 0.15} L${x + s * 0.45},${y} Z`;
  children.push(createPath(x, y, hullPath, hullColor, { layer: 2 }));

  // Hull stripe
  children.push(createPath(x, y, `M${x - s * 0.35},${y + s * 0.05} L${x + s * 0.4},${y + s * 0.05}`, 'none', { stroke: '#FFF', strokeWidth: 1.5, layer: 2, opacity: 0.5 }));

  // Mast
  children.push(createLine(x, y + s * 0.12, x, y - s * 0.6, '#5D4037', { strokeWidth: 2, layer: 2 }));

  // Main sail (triangle)
  const mainSailPath = `M${x},${y - s * 0.55} L${x},${y + s * 0.05} L${x + s * 0.3},${y + s * 0.05} Z`;
  children.push(createPath(x, y, mainSailPath, sailColor, { layer: 2, opacity: 0.9 }));

  // Jib sail (front triangle)
  const jibPath = `M${x},${y - s * 0.5} L${x},${y + s * 0.02} L${x - s * 0.2},${y + s * 0.02} Z`;
  children.push(createPath(x, y, jibPath, sailColor, { layer: 2, opacity: 0.85 }));

  // Pennant
  const pennantColor = rng.pick(['#F44336', '#FF9800', '#FFEB3B']);
  children.push(createPolygon(x, y - s * 0.6, `${x},${y - s * 0.6} ${x + s * 0.08},${y - s * 0.57} ${x},${y - s * 0.54}`, pennantColor, { layer: 2 }));

  return createGroup(x, y, children, { layer: 2, category: 'boat', modifiable: true, id: uid('boat') });
}

// Beach towel with stripes and fringe
function beachTowel(x: number, y: number, w: number, h: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const baseColor = rng.nextColor([0, 360], [60, 85], [55, 75]);
  const stripeColor = rng.nextColor([0, 360], [50, 80], [65, 85]);
  const rotation = rng.nextFloat(-12, 12);

  // Main towel body
  children.push(createRect(x, y, w, h, baseColor, { layer: 2, rotation }));

  // Stripes
  const stripeCount = rng.nextInt(3, 5);
  const stripeH = h / (stripeCount * 2 + 1);
  for (let i = 0; i < stripeCount; i++) {
    const sy = y + stripeH * (2 * i + 1);
    children.push(createRect(x, sy, w, stripeH, stripeColor, { layer: 2, opacity: 0.6, rotation }));
  }

  // Fringe on short edges
  for (let i = 0; i < 6; i++) {
    const fx = x + (i + 0.5) * w / 6;
    children.push(createLine(fx, y, fx, y - 3, baseColor, { strokeWidth: 1, layer: 2, opacity: 0.7 }));
    children.push(createLine(fx, y + h, fx, y + h + 3, baseColor, { strokeWidth: 1, layer: 2, opacity: 0.7 }));
  }

  return createGroup(x, y, children, { layer: 2, category: 'towel', modifiable: true, id: uid('towel') });
}

// Bird in V-formation (group)
function birdFormation(x: number, y: number, count: number, rng: SeededRandom): SVGElementData[] {
  const birds: SVGElementData[] = [];
  const spacing = rng.nextFloat(12, 20);
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const row = Math.ceil(i / 2);
    const bx = x + side * row * spacing;
    const by = y + row * spacing * 0.5 + rng.nextFloat(-3, 3);
    birds.push(createBird(bx, by, true, rng));
  }
  return birds;
}

export function generateBeachSunset(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  const elements: SVGElementData[] = [];

  // === SVG DEFS: Gradients & Filters ===
  const defs = `
    <linearGradient id="sunsetSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1A0533"/>
      <stop offset="15%" stop-color="#2E1065"/>
      <stop offset="30%" stop-color="#6B1D5E"/>
      <stop offset="45%" stop-color="#C2185B"/>
      <stop offset="58%" stop-color="#E65100"/>
      <stop offset="72%" stop-color="#FF8F00"/>
      <stop offset="85%" stop-color="#FFB300"/>
      <stop offset="100%" stop-color="#FFD54F"/>
    </linearGradient>
    <linearGradient id="oceanWater" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0D47A1" stop-opacity="0.85"/>
      <stop offset="30%" stop-color="#1565C0"/>
      <stop offset="60%" stop-color="#1976D2"/>
      <stop offset="100%" stop-color="#1E88E5"/>
    </linearGradient>
    <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFF9C4"/>
      <stop offset="20%" stop-color="#FFEE58"/>
      <stop offset="45%" stop-color="#FFB300" stop-opacity="0.8"/>
      <stop offset="70%" stop-color="#FF6D00" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#FF6D00" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="sunCore" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="40%" stop-color="#FFF9C4"/>
      <stop offset="100%" stop-color="#FFD54F"/>
    </radialGradient>
    <linearGradient id="reflectionGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFD54F" stop-opacity="0.6"/>
      <stop offset="50%" stop-color="#FFB300" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#FF8F00" stop-opacity="0.05"/>
    </linearGradient>
    <linearGradient id="sandGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F5DCA0"/>
      <stop offset="40%" stop-color="#F0D090"/>
      <stop offset="100%" stop-color="#D4A84B"/>
    </linearGradient>
    <filter id="sunBlur">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <filter id="softGlow">
      <feGaussianBlur stdDeviation="3"/>
    </filter>
  `;

  // ========================================
  // LAYER 0: Sky background (gradient)
  // ========================================
  elements.push(createRect(0, 0, w, h * 0.52, 'url(#sunsetSky)', { layer: 0, category: 'sky', modifiable: false }));

  // Wispy clouds catching sunset light
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    const cx = rng.nextFloat(20, w - 60);
    const cy = rng.nextFloat(h * 0.04, h * 0.22);
    const cw = rng.nextFloat(50, 120);
    const ch = rng.nextFloat(6, 14);
    const cloudColor = rng.pick(['#FF8A65', '#FFAB91', '#FFB74D', '#FFE0B2']);
    children: elements.push(createEllipse(cx, cy, cw, ch, cloudColor, {
      layer: 0, category: 'cloud', modifiable: false, opacity: rng.nextFloat(0.2, 0.5),
    }));
    // Secondary puff
    elements.push(createEllipse(cx + cw * 0.4, cy - ch * 0.3, cw * 0.6, ch * 0.7, cloudColor, {
      layer: 0, category: 'cloud', modifiable: false, opacity: rng.nextFloat(0.15, 0.35),
    }));
  }

  // Horizon glow band (warm light at horizon)
  elements.push(createRect(0, h * 0.42, w, h * 0.1, '#FFD54F', { layer: 0, category: 'glow', modifiable: false, opacity: 0.25 }));
  elements.push(createRect(0, h * 0.38, w, h * 0.06, '#FFE082', { layer: 0, category: 'glow', modifiable: false, opacity: 0.15 }));

  // ========================================
  // LAYER 0: Sun with radial gradient glow
  // ========================================
  const sunX = w * rng.nextFloat(0.35, 0.65);
  const sunY = h * 0.38;

  // Outer glow (large)
  elements.push(createCircle(sunX, sunY, 80, 'url(#sunGlow)', { layer: 0, category: 'sun', modifiable: false }));

  // Mid glow
  elements.push(createCircle(sunX, sunY, 55, '#FFB300', { layer: 0, category: 'sun', modifiable: false, opacity: 0.2 }));

  // Sun disc
  elements.push(createCircle(sunX, sunY, 32, 'url(#sunCore)', { layer: 0, category: 'sun', modifiable: true }));

  // Sun rays (subtle lines)
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30) * Math.PI / 180;
    const innerR = 38;
    const outerR = rng.nextFloat(55, 75);
    const rx1 = sunX + Math.cos(angle) * innerR;
    const ry1 = sunY + Math.sin(angle) * innerR;
    const rx2 = sunX + Math.cos(angle) * outerR;
    const ry2 = sunY + Math.sin(angle) * outerR;
    elements.push(createLine(rx1, ry1, rx2, ry2, '#FFD54F', {
      strokeWidth: rng.nextFloat(1, 2.5), layer: 0, category: 'sun', modifiable: false, opacity: rng.nextFloat(0.08, 0.2),
    }));
  }

  // ========================================
  // LAYER 1: Ocean
  // ========================================
  const oceanTop = h * 0.48;
  const oceanBottom = h * 0.7;
  elements.push(createRect(0, oceanTop, w, oceanBottom - oceanTop, 'url(#oceanWater)', { layer: 1, category: 'ocean', modifiable: false }));

  // Sun reflection column on water
  const refW = 60;
  elements.push(createRect(sunX - refW / 2, oceanTop, refW, oceanBottom - oceanTop, 'url(#reflectionGrad)', {
    layer: 1, category: 'reflection', modifiable: false,
  }));

  // Shimmer/sparkle reflection fragments
  for (let i = 0; i < 12; i++) {
    const ry = rng.nextFloat(oceanTop + 5, oceanBottom - 10);
    const spread = (ry - oceanTop) / (oceanBottom - oceanTop) * 50 + 10;
    const rx = sunX + rng.nextFloat(-spread, spread);
    const rw = rng.nextFloat(4, 18);
    const rh = rng.nextFloat(1.5, 3);
    elements.push(createEllipse(rx, ry, rw, rh, '#FFD54F', {
      layer: 1, category: 'reflection', modifiable: false, opacity: rng.nextFloat(0.15, 0.5),
    }));
  }

  // Ocean waves (6-8 layered)
  const waveCount = rng.nextInt(6, 8);
  for (let i = 0; i < waveCount; i++) {
    const wy = oceanTop + (i + 1) * (oceanBottom - oceanTop) / (waveCount + 1);
    const amplitude = rng.nextFloat(2, 5);
    const segments = rng.nextInt(4, 6);
    let wavePath = `M0,${wy}`;
    for (let j = 0; j < segments; j++) {
      const sx = (j + 0.5) * w / segments;
      const ex = (j + 1) * w / segments;
      const dir = j % 2 === 0 ? -1 : 1;
      wavePath += ` Q${sx},${wy + dir * amplitude} ${ex},${wy}`;
    }
    const waveColor = i < waveCount / 2 ? '#BBDEFB' : '#90CAF9';
    elements.push(createPath(0, 0, wavePath, 'none', {
      stroke: waveColor, strokeWidth: rng.nextFloat(1, 2.5), layer: 1, category: 'wave', modifiable: false,
      opacity: rng.nextFloat(0.25, 0.55),
    }));
  }

  // Foam line at shore
  const foamY = oceanBottom - 3;
  let foamPath = `M0,${foamY}`;
  for (let j = 0; j < 10; j++) {
    const fx = (j + 0.5) * w / 10;
    const fex = (j + 1) * w / 10;
    foamPath += ` Q${fx},${foamY + rng.nextFloat(-3, 3)} ${fex},${foamY}`;
  }
  elements.push(createPath(0, 0, foamPath, 'none', {
    stroke: '#E3F2FD', strokeWidth: 3, layer: 1, category: 'foam', modifiable: false, opacity: 0.6,
  }));
  // Second foam line
  const foamY2 = oceanBottom;
  let foamPath2 = `M0,${foamY2}`;
  for (let j = 0; j < 12; j++) {
    const fx = (j + 0.5) * w / 12;
    const fex = (j + 1) * w / 12;
    foamPath2 += ` Q${fx},${foamY2 + rng.nextFloat(-2, 2)} ${fex},${foamY2}`;
  }
  elements.push(createPath(0, 0, foamPath2, 'none', {
    stroke: '#FFFFFF', strokeWidth: 2, layer: 1, category: 'foam', modifiable: false, opacity: 0.4,
  }));

  // Boat on horizon
  const boatX = rng.nextFloat(w * 0.1, w * 0.85);
  const boatY = oceanTop + rng.nextFloat(8, 25);
  const boatSize = rng.nextFloat(18, 30);
  elements.push(sailboat(boatX, boatY, boatSize, rng));

  // ========================================
  // LAYER 1: Beach sand
  // ========================================
  const sandTop = h * 0.68;
  const sandPath = `M0,${sandTop} Q${w * 0.2},${sandTop - 8} ${w * 0.4},${sandTop + 2} Q${w * 0.6},${sandTop - 5} ${w * 0.8},${sandTop + 3} Q${w * 0.9},${sandTop - 2} ${w},${sandTop + 1} L${w},${h} L0,${h} Z`;
  elements.push(createPath(0, 0, sandPath, 'url(#sandGrad)', { layer: 1, category: 'sand', modifiable: false }));

  // Wet sand near water
  const wetSandPath = `M0,${sandTop} Q${w * 0.2},${sandTop - 8} ${w * 0.4},${sandTop + 2} Q${w * 0.6},${sandTop - 5} ${w * 0.8},${sandTop + 3} Q${w * 0.9},${sandTop - 2} ${w},${sandTop + 1} L${w},${sandTop + 18} Q${w * 0.7},${sandTop + 14} ${w * 0.4},${sandTop + 20} Q${w * 0.2},${sandTop + 12} 0,${sandTop + 16} Z`;
  elements.push(createPath(0, 0, wetSandPath, '#C9A85C', { layer: 1, category: 'sand', modifiable: false, opacity: 0.5 }));

  // Sand ripple texture
  for (let i = 0; i < rng.nextInt(8, 14); i++) {
    const ry = rng.nextFloat(sandTop + 20, h - 15);
    const rx = rng.nextFloat(10, w - 10);
    const rippleW = rng.nextFloat(25, 70);
    const ripplePath = `M${rx},${ry} Q${rx + rippleW * 0.5},${ry - 1.5} ${rx + rippleW},${ry}`;
    elements.push(createPath(0, 0, ripplePath, 'none', {
      stroke: '#D4A84B', strokeWidth: 0.8, layer: 1, category: 'sand', modifiable: false, opacity: rng.nextFloat(0.15, 0.35),
    }));
  }

  // Sand dots/texture
  for (let i = 0; i < rng.nextInt(15, 25); i++) {
    elements.push(createCircle(
      rng.nextFloat(5, w - 5),
      rng.nextFloat(sandTop + 10, h - 5),
      rng.nextFloat(0.5, 1.5),
      rng.pick(['#C9A85C', '#B8944A', '#D4A84B']),
      { layer: 1, category: 'sand', modifiable: false, opacity: rng.nextFloat(0.15, 0.35) },
    ));
  }

  // ========================================
  // LAYER 2: Palm trees (2-4)
  // ========================================
  const palmCount = rng.nextInt(2, 4);
  const palmPositions: number[] = [];
  for (let i = 0; i < palmCount; i++) {
    const px = rng.nextFloat(w * 0.05 + i * w * 0.2, w * 0.2 + i * w * 0.25);
    palmPositions.push(px);
    const lean = rng.nextFloat(-0.5, 0.8);
    const palmSize = rng.nextFloat(90, 140);
    elements.push(detailedPalm(px, sandTop + rng.nextFloat(-2, 8), palmSize, rng, lean));
  }

  // ========================================
  // LAYER 2: Beach umbrella
  // ========================================
  const umbrellaX = rng.nextFloat(w * 0.25, w * 0.65);
  const umbrellaY = sandTop + rng.nextFloat(25, 45);
  elements.push(beachUmbrella(umbrellaX, umbrellaY, rng.nextFloat(45, 65), rng));

  // ========================================
  // LAYER 2: Beach towel near umbrella
  // ========================================
  const towelX = umbrellaX + rng.nextFloat(20, 50);
  const towelY = umbrellaY + rng.nextFloat(5, 15);
  elements.push(beachTowel(towelX, towelY, rng.nextFloat(40, 55), rng.nextFloat(22, 30), rng));

  // ========================================
  // LAYER 3: Sandcastle
  // ========================================
  const castleX = rng.nextFloat(w * 0.15, w * 0.75);
  const castleY = sandTop + rng.nextFloat(40, 65);
  elements.push(sandcastle(castleX, castleY, rng.nextFloat(30, 45), rng));

  // ========================================
  // LAYER 3: Seashells (4-7)
  // ========================================
  for (let i = 0; i < rng.nextInt(4, 7); i++) {
    const sx = rng.nextFloat(15, w - 15);
    const sy = rng.nextFloat(sandTop + 15, h - 20);
    elements.push(seashell(sx, sy, rng.nextFloat(6, 14), rng));
  }

  // ========================================
  // LAYER 3: Rocks along shoreline and scattered
  // ========================================
  // Shoreline rocks
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const rx = rng.nextFloat(10, w - 10);
    const ry = sandTop + rng.nextFloat(-5, 15);
    elements.push(createRock(rx, ry, rng.nextFloat(8, 22), rng));
  }
  // Scattered beach rocks
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(createRock(rng.nextFloat(20, w - 20), rng.nextFloat(sandTop + 30, h - 15), rng.nextFloat(10, 20), rng));
  }

  // ========================================
  // LAYER 3: Footprints in sand (subtle)
  // ========================================
  if (rng.chance(0.7)) {
    const fpStartX = rng.nextFloat(w * 0.2, w * 0.5);
    const fpStartY = sandTop + rng.nextFloat(30, 50);
    for (let i = 0; i < rng.nextInt(4, 7); i++) {
      const fx = fpStartX + i * rng.nextFloat(12, 18) + (i % 2 === 0 ? -3 : 3);
      const fy = fpStartY + i * rng.nextFloat(6, 10);
      children: elements.push(createEllipse(fx, fy, 3.5, 5, '#C9A85C', {
        layer: 3, category: 'footprint', modifiable: false, opacity: 0.25, rotation: rng.nextFloat(-15, 15),
      }));
    }
  }

  // ========================================
  // LAYER 3: Starfish
  // ========================================
  if (rng.chance(0.6)) {
    const sfx = rng.nextFloat(w * 0.1, w * 0.9);
    const sfy = rng.nextFloat(sandTop + 20, h - 25);
    const sfSize = rng.nextFloat(8, 14);
    const sfColor = rng.pick(['#FF7043', '#FF5722', '#E64A19', '#FFB74D']);
    const sfChildren: SVGElementData[] = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i * 72 - 90) * Math.PI / 180;
      const tipX = sfx + Math.cos(angle) * sfSize;
      const tipY = sfy + Math.sin(angle) * sfSize;
      const leftAngle = angle - 0.3;
      const rightAngle = angle + 0.3;
      const armPath = `M${sfx},${sfy} L${sfx + Math.cos(leftAngle) * sfSize * 0.4},${sfy + Math.sin(leftAngle) * sfSize * 0.4} L${tipX},${tipY} L${sfx + Math.cos(rightAngle) * sfSize * 0.4},${sfy + Math.sin(rightAngle) * sfSize * 0.4} Z`;
      sfChildren.push(createPath(sfx, sfy, armPath, sfColor, { layer: 3, opacity: 0.85 }));
    }
    sfChildren.push(createCircle(sfx, sfy, sfSize * 0.2, sfColor, { layer: 3 }));
    elements.push(createGroup(sfx, sfy, sfChildren, { layer: 3, category: 'starfish', modifiable: true, id: uid('star') }));
  }

  // ========================================
  // LAYER 4: Birds in V-formation
  // ========================================
  const birdCount = rng.nextInt(5, 9);
  const formationX = rng.nextFloat(w * 0.15, w * 0.7);
  const formationY = rng.nextFloat(h * 0.06, h * 0.18);
  elements.push(...birdFormation(formationX, formationY, birdCount, rng));

  // A few extra solo distant birds
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    elements.push(createBird(rng.nextFloat(20, w - 20), rng.nextFloat(h * 0.03, h * 0.25), true, rng));
  }

  // ========================================
  // LAYER 4: Distant horizon details
  // ========================================
  // Distant island silhouette
  if (rng.chance(0.5)) {
    const islandX = rng.nextFloat(w * 0.05, w * 0.3);
    const islandW = rng.nextFloat(40, 80);
    const islandPath = `M${islandX},${oceanTop + 2} Q${islandX + islandW * 0.3},${oceanTop - 12} ${islandX + islandW * 0.5},${oceanTop - 10} Q${islandX + islandW * 0.7},${oceanTop - 8} ${islandX + islandW},${oceanTop + 2} Z`;
    elements.push(createPath(0, 0, islandPath, '#2E1065', { layer: 1, category: 'island', modifiable: false, opacity: 0.35 }));
  }

  // ========================================
  // LAYER 4: Atmospheric haze at horizon
  // ========================================
  elements.push(createRect(0, oceanTop - 5, w, 12, '#FF8F00', { layer: 4, category: 'haze', modifiable: false, opacity: 0.1 }));

  return { elements, defs };
}
