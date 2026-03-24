import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath,
  createLine, createGroup, createText, createPottedPlant,
} from '../engine/primitives';

let _uid = 0;
function uid(p = 'cf') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// Coffee cup with saucer
function coffeeCup(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const cupColor = rng.pick(['#FFFFFF', '#F5F0E8', '#E8E0D0', '#FFF8F0']);
  // Saucer
  children.push(createEllipse(x, y + s * 0.02, s * 0.35, s * 0.08, '#F0EBE0', { layer: 3, stroke: '#D0C8B8', strokeWidth: 0.5 }));
  // Cup body
  const cupPath = `M${x - s * 0.15},${y - s * 0.2} L${x - s * 0.12},${y} L${x + s * 0.12},${y} L${x + s * 0.15},${y - s * 0.2} Z`;
  children.push(createPath(x, y, cupPath, cupColor, { layer: 3, stroke: '#D0C8B8', strokeWidth: 0.8 }));
  // Coffee inside
  children.push(createRect(x - s * 0.13, y - s * 0.18, s * 0.26, s * 0.06, '#3E2723', { layer: 3, opacity: 0.85 }));
  // Handle
  children.push(createPath(x, y, `M${x + s * 0.15},${y - s * 0.15} Q${x + s * 0.28},${y - s * 0.1} ${x + s * 0.15},${y - s * 0.02}`, 'none', { stroke: cupColor, strokeWidth: s * 0.04, layer: 3 }));
  // Steam wisps
  for (let i = 0; i < 2; i++) {
    const sx = x + rng.nextFloat(-s * 0.06, s * 0.06);
    const steamPath = `M${sx},${y - s * 0.22} Q${sx + rng.nextFloat(-4, 4)},${y - s * 0.35} ${sx + rng.nextFloat(-3, 3)},${y - s * 0.45}`;
    children.push(createPath(x, y, steamPath, 'none', { stroke: '#CCBBAA', strokeWidth: 0.8, layer: 3, opacity: 0.3 }));
  }
  return createGroup(x, y, children, { layer: 3, category: 'cup', modifiable: true, id: uid('cup') });
}

// Pastry on plate
function pastryPlate(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  // Plate
  children.push(createEllipse(x, y, s * 0.3, s * 0.08, '#F5F0E8', { layer: 3, stroke: '#D0C8B8', strokeWidth: 0.5 }));
  // Pastry type
  const pType = rng.pick(['croissant', 'muffin', 'cake'] as const);
  if (pType === 'croissant') {
    const cPath = `M${x - s * 0.15},${y - s * 0.04} Q${x - s * 0.1},${y - s * 0.15} ${x},${y - s * 0.12} Q${x + s * 0.1},${y - s * 0.15} ${x + s * 0.15},${y - s * 0.04} Q${x + s * 0.08},${y - s * 0.02} ${x},${y - s * 0.05} Q${x - s * 0.08},${y - s * 0.02} ${x - s * 0.15},${y - s * 0.04} Z`;
    children.push(createPath(x, y, cPath, '#D4A050', { layer: 3 }));
    children.push(createPath(x, y, `M${x - s * 0.08},${y - s * 0.07} Q${x},${y - s * 0.1} ${x + s * 0.08},${y - s * 0.07}`, 'none', { stroke: '#C09040', strokeWidth: 0.8, layer: 3, opacity: 0.5 }));
  } else if (pType === 'muffin') {
    // Wrapper
    const wPath = `M${x - s * 0.1},${y} L${x - s * 0.08},${y - s * 0.08} L${x + s * 0.08},${y - s * 0.08} L${x + s * 0.1},${y} Z`;
    children.push(createPath(x, y, wPath, '#E8D8C0', { layer: 3 }));
    // Top
    children.push(createCircle(x, y - s * 0.12, s * 0.1, rng.pick(['#8B6914', '#6B4226', '#AA6633']), { layer: 3 }));
  } else {
    // Slice of cake
    const slicePath = `M${x - s * 0.12},${y} L${x - s * 0.1},${y - s * 0.12} L${x + s * 0.1},${y - s * 0.12} L${x + s * 0.12},${y} Z`;
    children.push(createPath(x, y, slicePath, '#FFF0D0', { layer: 3 }));
    // Frosting top
    children.push(createRect(x - s * 0.1, y - s * 0.14, s * 0.2, s * 0.03, rng.pick(['#FF9999', '#FFCC99', '#CC9966']), { layer: 3 }));
    // Cherry on top
    if (rng.chance(0.6)) {
      children.push(createCircle(x, y - s * 0.16, s * 0.025, '#CC2222', { layer: 3 }));
    }
  }
  return createGroup(x, y, children, { layer: 3, category: 'pastry', modifiable: true, id: uid('pastry') });
}

// Espresso machine
function espressoMachine(x: number, y: number, w2: number, h2: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  // Body
  children.push(createRect(x, y, w2, h2, '#556677', { layer: 2, stroke: '#445566', strokeWidth: 1 }));
  // Top section
  children.push(createRect(x, y, w2, h2 * 0.25, '#667788', { layer: 2 }));
  // Chrome front panel
  children.push(createRect(x + w2 * 0.1, y + h2 * 0.3, w2 * 0.8, h2 * 0.35, '#AABBCC', { layer: 2, stroke: '#8899AA', strokeWidth: 0.5 }));
  // Group heads (2)
  for (let i = 0; i < 2; i++) {
    const gx = x + w2 * 0.25 + i * w2 * 0.35;
    const gy = y + h2 * 0.68;
    children.push(createCircle(gx, gy, w2 * 0.06, '#334455', { layer: 2 }));
    // Portafilter handle
    children.push(createRect(gx - w2 * 0.08, gy + w2 * 0.04, w2 * 0.16, w2 * 0.03, '#222', { layer: 2 }));
  }
  // Steam wand
  children.push(createLine(x + w2 * 0.85, y + h2 * 0.4, x + w2 * 0.9, y + h2 * 0.8, '#AABBCC', { strokeWidth: 2, layer: 2 }));
  // Pressure gauges
  children.push(createCircle(x + w2 * 0.3, y + h2 * 0.15, w2 * 0.05, '#FFFFF0', { layer: 2, stroke: '#888', strokeWidth: 0.5 }));
  children.push(createCircle(x + w2 * 0.55, y + h2 * 0.15, w2 * 0.05, '#FFFFF0', { layer: 2, stroke: '#888', strokeWidth: 0.5 }));
  // Drip tray
  children.push(createRect(x + w2 * 0.05, y + h2 * 0.88, w2 * 0.9, h2 * 0.08, '#445566', { layer: 2 }));
  return createGroup(x, y, children, { layer: 2, category: 'machine', modifiable: true, id: uid('espresso') });
}

// Pendant lamp
function pendantLamp(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const shadeColor = rng.pick(['#2A2A2A', '#3A3530', '#1A1A2A', '#4A3A2A']);
  // Cord
  children.push(createLine(x, 0, x, y - s * 0.3, '#333', { strokeWidth: 1.5, layer: 2 }));
  // Shade (cone/dome shape)
  const shadePath = `M${x - s * 0.25},${y} Q${x - s * 0.28},${y - s * 0.15} ${x - s * 0.15},${y - s * 0.3} L${x + s * 0.15},${y - s * 0.3} Q${x + s * 0.28},${y - s * 0.15} ${x + s * 0.25},${y} Z`;
  children.push(createPath(x, y, shadePath, shadeColor, { layer: 2 }));
  // Bulb
  children.push(createCircle(x, y - s * 0.05, s * 0.08, '#FFEECC', { layer: 2, opacity: 0.9 }));
  // Warm glow
  children.push(createCircle(x, y + s * 0.1, s * 0.6, '#FFE4AA', { layer: 1, opacity: 0.06 }));
  children.push(createCircle(x, y + s * 0.1, s * 0.35, '#FFE4AA', { layer: 1, opacity: 0.08 }));
  return createGroup(x, y, children, { layer: 2, category: 'lamp', modifiable: true, id: uid('lamp') });
}

// Bar stool
function barStool(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const seatColor = rng.pick(['#5C3317', '#3A3A3A', '#4A3020', '#2A2A3A']);
  // Seat (circular top)
  children.push(createEllipse(x, y, s * 0.18, s * 0.06, seatColor, { layer: 3 }));
  // Leg center pole
  children.push(createLine(x, y + s * 0.06, x, y + s * 0.55, '#555', { strokeWidth: 2.5, layer: 3 }));
  // Foot ring
  children.push(createEllipse(x, y + s * 0.42, s * 0.12, s * 0.035, 'none', { layer: 3, stroke: '#555', strokeWidth: 1.5 }));
  // Base legs (4 spread out)
  children.push(createLine(x, y + s * 0.55, x - s * 0.15, y + s * 0.62, '#555', { strokeWidth: 2, layer: 3 }));
  children.push(createLine(x, y + s * 0.55, x + s * 0.15, y + s * 0.62, '#555', { strokeWidth: 2, layer: 3 }));
  return createGroup(x, y, children, { layer: 3, category: 'stool', modifiable: true, id: uid('stool') });
}

// Cafe table with items
function cafeTable(x: number, y: number, tableSize: number, rng: SeededRandom, items: string[]): SVGElementData {
  const s = tableSize;
  const children: SVGElementData[] = [];
  const tableColor = rng.pick(['#8B6914', '#6B3410', '#A0522D', '#5C3317']);

  // Table top (round)
  children.push(createEllipse(x, y, s * 0.35, s * 0.1, tableColor, { layer: 2, stroke: '#4A3020', strokeWidth: 1 }));
  // Table leg
  children.push(createRect(x - s * 0.03, y + s * 0.1, s * 0.06, s * 0.35, tableColor, { layer: 2 }));
  // Table base
  children.push(createEllipse(x, y + s * 0.45, s * 0.15, s * 0.04, '#4A3020', { layer: 2 }));

  // Chairs (2, on sides)
  const chairColor = rng.pick(['#5C3317', '#3A3A3A', '#4A2010']);
  // Left chair
  const lcx = x - s * 0.35;
  children.push(createRect(lcx - s * 0.08, y - s * 0.15, s * 0.16, s * 0.04, chairColor, { layer: 1 }));
  children.push(createRect(lcx - s * 0.07, y + s * 0.04, s * 0.02, s * 0.22, chairColor, { layer: 1 }));
  children.push(createRect(lcx + s * 0.05, y + s * 0.04, s * 0.02, s * 0.22, chairColor, { layer: 1 }));
  children.push(createRect(lcx - s * 0.08, y - s * 0.15, s * 0.02, s * 0.22, chairColor, { layer: 1 }));
  children.push(createRect(lcx + s * 0.06, y - s * 0.15, s * 0.02, s * 0.22, chairColor, { layer: 1 }));

  // Right chair
  const rcx = x + s * 0.35;
  children.push(createRect(rcx - s * 0.08, y - s * 0.15, s * 0.16, s * 0.04, chairColor, { layer: 3 }));
  children.push(createRect(rcx - s * 0.07, y + s * 0.04, s * 0.02, s * 0.22, chairColor, { layer: 3 }));
  children.push(createRect(rcx + s * 0.05, y + s * 0.04, s * 0.02, s * 0.22, chairColor, { layer: 3 }));
  children.push(createRect(rcx - s * 0.08, y - s * 0.15, s * 0.02, s * 0.22, chairColor, { layer: 3 }));
  children.push(createRect(rcx + s * 0.06, y - s * 0.15, s * 0.02, s * 0.22, chairColor, { layer: 3 }));

  return createGroup(x, y, children, { layer: 2, category: 'table', modifiable: true, id: uid('table') });
}

// Simple person (seated or standing)
function cafePerson(x: number, y: number, standing: boolean, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const skinColor = rng.pick(['#FDBCB4', '#D2996C', '#8D5524', '#C68642']);
  const hairColor = rng.pick(['#2C1608', '#4A3020', '#8B6914', '#333', '#AA4422']);
  const topColor = rng.nextColor([0, 360], [30, 70], [35, 65]);

  if (standing) {
    // Head
    children.push(createCircle(x, y - 32, 6, skinColor, { layer: 3 }));
    // Hair
    children.push(createCircle(x, y - 35, 6.5, hairColor, { layer: 3, opacity: 0.6 }));
    // Body
    children.push(createRect(x - 6, y - 26, 12, 18, topColor, { layer: 3 }));
    // Apron (if barista)
    children.push(createRect(x - 5, y - 14, 10, 14, '#F5F0E0', { layer: 3, opacity: 0.9 }));
    // Legs
    children.push(createRect(x - 4, y - 8, 3, 14, '#333', { layer: 3 }));
    children.push(createRect(x + 1, y - 8, 3, 14, '#333', { layer: 3 }));
  } else {
    // Seated: head + torso only (legs hidden behind table)
    children.push(createCircle(x, y - 18, 5.5, skinColor, { layer: 3 }));
    children.push(createCircle(x, y - 20.5, 6, hairColor, { layer: 3, opacity: 0.5 }));
    children.push(createRect(x - 5, y - 12, 10, 14, topColor, { layer: 3 }));
    // Arms resting
    children.push(createLine(x - 5, y - 8, x - 10, y - 4, topColor, { strokeWidth: 3, layer: 3 }));
    children.push(createLine(x + 5, y - 8, x + 10, y - 4, topColor, { strokeWidth: 3, layer: 3 }));
  }

  return createGroup(x, y, children, { layer: 3, category: 'person', modifiable: true, id: uid('person') });
}

// Bottle on shelf
function bottle(x: number, y: number, h2: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const bColor = rng.pick(['#224400', '#442200', '#002244', '#440022', '#664400', '#003322', '#552200', '#660033']);
  const bw = rng.nextFloat(5, 9);
  // Body
  children.push(createRect(x - bw / 2, y - h2 * 0.7, bw, h2 * 0.7, bColor, { layer: 3, opacity: 0.8 }));
  // Neck
  children.push(createRect(x - bw * 0.3, y - h2, bw * 0.6, h2 * 0.3, bColor, { layer: 3, opacity: 0.8 }));
  // Label
  if (rng.chance(0.6)) {
    children.push(createRect(x - bw / 2 + 1, y - h2 * 0.5, bw - 2, h2 * 0.2, rng.pick(['#F5F0D0', '#FFF8E0', '#EEDDCC']), { layer: 3, opacity: 0.8 }));
  }
  // Cap
  children.push(createRect(x - bw * 0.25, y - h2 - 2, bw * 0.5, 2, '#888', { layer: 3 }));
  return createGroup(x, y, children, { layer: 3, category: 'bottle', modifiable: true, id: uid('bot') });
}

// Mason jar
function masonJar(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const contentColor = rng.pick(['#8B6914', '#AA6633', '#667744', '#885522', '#996644']);
  // Jar body (transparent)
  children.push(createRect(x - s * 0.15, y - s * 0.5, s * 0.3, s * 0.5, '#DDEEFF', { layer: 3, opacity: 0.3, stroke: '#BBCCDD', strokeWidth: 0.5 }));
  // Contents
  children.push(createRect(x - s * 0.13, y - s * 0.35, s * 0.26, s * 0.33, contentColor, { layer: 3, opacity: 0.5 }));
  // Lid
  children.push(createRect(x - s * 0.17, y - s * 0.55, s * 0.34, s * 0.06, '#AABBAA', { layer: 3 }));
  return createGroup(x, y, children, { layer: 3, category: 'jar', modifiable: true, id: uid('jar') });
}

export function generateCafeInterior(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  const elements: SVGElementData[] = [];

  // ── Color palette ──
  const wallTop = rng.pick(['#D4A574', '#C4956A', '#B88A5E', '#CC9966']);
  const wallBottom = rng.pick(['#C09060', '#A87850', '#B08050', '#A07040']);
  const floorBase = rng.pick(['#5C3317', '#4A2810', '#6B3410', '#503018']);
  const floorLight = rng.pick(['#6B4020', '#5A3518', '#7A4A28']);
  const brickColor = rng.pick(['#8B4513', '#A0522D', '#6B3410', '#7A3A15']);
  const brickMortar = rng.pick(['#C4A882', '#B89B70', '#D0B890']);
  const wainscotColor = rng.pick(['#6B3410', '#5C3317', '#8B6914']);
  const counterColor = rng.pick(['#5C3317', '#4A2810', '#6B4226']);
  const cafeName = rng.pick(['BLOSSOM', 'COZY CUP', 'MOCHA', 'THE NOOK', 'AROMA']);

  // ── SVG Defs ──
  const defs = `
    <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${wallTop}"/>
      <stop offset="100%" stop-color="${wallBottom}"/>
    </linearGradient>
    <linearGradient id="floorGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${floorBase}"/>
      <stop offset="50%" stop-color="${floorLight}"/>
      <stop offset="100%" stop-color="${floorBase}"/>
    </linearGradient>
    <radialGradient id="ceilingLightGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFEECC" stop-opacity="0.25"/>
      <stop offset="60%" stop-color="#FFE4AA" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#FFD488" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="menuBoardGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2A2A2A"/>
      <stop offset="100%" stop-color="#1A1A1A"/>
    </linearGradient>
    <linearGradient id="counterGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${counterColor}"/>
      <stop offset="40%" stop-color="${counterColor}"/>
      <stop offset="100%" stop-color="#3A1A08"/>
    </linearGradient>
    <linearGradient id="windowLight" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFF8E0"/>
      <stop offset="100%" stop-color="#FFE8B0"/>
    </linearGradient>
  `;

  const wallFloorY = h * 0.68;
  const ceilingY = h * 0.04;

  // ════════════════════════════════════════════
  //  LAYER 0 — Walls
  // ════════════════════════════════════════════

  // Main wall
  elements.push(createRect(0, ceilingY, w, wallFloorY - ceilingY, 'url(#wallGrad)', { layer: 0, category: 'wall', modifiable: false, id: uid('wall') }));

  // Ceiling
  elements.push(createRect(0, 0, w, ceilingY, '#E8D8C0', { layer: 0, category: 'ceiling', modifiable: false, id: uid('ceil') }));

  // Ceiling beams (3-4)
  const beamCount = rng.nextInt(3, 4);
  for (let i = 0; i < beamCount; i++) {
    const bx = w * (i + 1) / (beamCount + 1);
    elements.push(createRect(bx - 4, 0, 8, ceilingY + 3, '#6B4226', { layer: 0, category: 'beam', modifiable: false, opacity: 0.7, id: uid('beam') }));
  }

  // ════════════════════════════════════════════
  //  LAYER 0 — Exposed brick section (left side)
  // ════════════════════════════════════════════

  const brickX = 0;
  const brickW = w * 0.3;
  const brickTop = ceilingY;
  const brickBottom = wallFloorY * 0.55;

  // Brick background
  elements.push(createRect(brickX, brickTop, brickW, brickBottom - brickTop, brickMortar, { layer: 0, category: 'brick', modifiable: false, id: uid('brickbg') }));

  // Individual bricks
  const brickH = 8;
  const brickWid = 18;
  const brickGap = 2;
  const rows = Math.floor((brickBottom - brickTop) / (brickH + brickGap));
  for (let row = 0; row < rows; row++) {
    const offsetX = row % 2 === 0 ? 0 : brickWid * 0.5;
    const by = brickTop + row * (brickH + brickGap);
    const cols = Math.ceil(brickW / (brickWid + brickGap)) + 1;
    for (let col = 0; col < cols; col++) {
      const bx = brickX + offsetX + col * (brickWid + brickGap);
      if (bx + brickWid > brickW + 5) continue;
      const shade = rng.nextFloat(-0.08, 0.08);
      const bCol = shade > 0 ? brickColor : rng.pick([brickColor, '#7A3A15', '#8B4A20']);
      elements.push(createRect(bx, by, brickWid, brickH, bCol, {
        layer: 0, category: 'brick', modifiable: false, opacity: rng.nextFloat(0.7, 0.95), id: uid('brk'),
      }));
    }
  }

  // ════════════════════════════════════════════
  //  LAYER 0 — Wainscoting (lower wall)
  // ════════════════════════════════════════════

  const wainscotTop = wallFloorY * 0.58;
  elements.push(createRect(0, wainscotTop, w, wallFloorY - wainscotTop, wainscotColor, { layer: 0, category: 'wainscot', modifiable: false, id: uid('wainscot') }));
  // Top rail
  elements.push(createRect(0, wainscotTop - 2, w, 4, '#4A2810', { layer: 0, category: 'wainscot', modifiable: false, id: uid('wrail') }));
  // Panels
  const wpCount = rng.nextInt(6, 10);
  const wpW = (w - 10) / wpCount;
  for (let i = 0; i < wpCount; i++) {
    const px = 5 + i * wpW + 4;
    elements.push(createRect(px, wainscotTop + 6, wpW - 8, wallFloorY - wainscotTop - 12, 'none', {
      layer: 0, category: 'wainscot', modifiable: false, stroke: '#3A1A08', strokeWidth: 1, opacity: 0.4, id: uid('wpanel'),
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 0 — Floor
  // ════════════════════════════════════════════

  elements.push(createRect(0, wallFloorY, w, h - wallFloorY, 'url(#floorGrad)', { layer: 0, category: 'floor', modifiable: false, id: uid('floor') }));

  // Floor plank lines
  const plankCount = rng.nextInt(12, 18);
  for (let i = 0; i < plankCount; i++) {
    const px = i * (w / plankCount);
    elements.push(createRect(px, wallFloorY, 1, h - wallFloorY, '#3A1A08', { layer: 0, category: 'floor', modifiable: false, opacity: 0.2, id: uid('plank') }));
  }
  // Horizontal plank seams
  for (let j = 0; j < 3; j++) {
    const py = wallFloorY + (j + 1) * ((h - wallFloorY) / 4);
    elements.push(createRect(0, py, w, 1, '#3A1A08', { layer: 0, category: 'floor', modifiable: false, opacity: 0.12, id: uid('hplank') }));
  }

  // Baseboard
  elements.push(createRect(0, wallFloorY - 2, w, 5, '#3A1A08', { layer: 1, category: 'wall', modifiable: false, id: uid('base') }));

  // ════════════════════════════════════════════
  //  LAYER 1 — Window (right side)
  // ════════════════════════════════════════════

  const winX = w * 0.65;
  const winW = w * 0.28;
  const winH = h * 0.38;
  const winY = ceilingY + h * 0.04;

  // Window frame
  elements.push(createRect(winX - 4, winY - 4, winW + 8, winH + 8, '#5C3317', { layer: 1, category: 'window', modifiable: false, id: uid('wframe') }));
  // Window glass with warm light
  elements.push(createRect(winX, winY, winW, winH, 'url(#windowLight)', { layer: 1, category: 'window', modifiable: true, id: uid('wglass') }));

  // Window mullions (cross bars)
  elements.push(createRect(winX + winW / 2 - 1.5, winY, 3, winH, '#5C3317', { layer: 1, category: 'window', modifiable: false, id: uid('wmull') }));
  elements.push(createRect(winX, winY + winH / 2 - 1.5, winW, 3, '#5C3317', { layer: 1, category: 'window', modifiable: false, id: uid('wmull') }));

  // Reversed cafe name on glass
  elements.push(createText(winX + winW * 0.15, winY + winH * 0.3, cafeName, '#AA8855', {
    layer: 1, category: 'text', modifiable: true, id: uid('wintext'), fontSize: Math.max(8, winW * 0.09), opacity: 0.3,
  }));

  // Window sill
  elements.push(createRect(winX - 6, winY + winH, winW + 12, 6, '#4A2810', { layer: 1, category: 'window', modifiable: false, id: uid('sill') }));

  // Potted plant on sill
  elements.push(createPottedPlant(winX + winW * 0.2, winY + winH - 2, rng.nextFloat(22, 32), rng));

  // Light rays from window (subtle)
  for (let i = 0; i < 3; i++) {
    const rStartX = winX + winW * (0.2 + i * 0.3);
    const rW = rng.nextFloat(15, 30);
    const rH = h * 0.3;
    const rayPath = `M${rStartX},${winY + winH} L${rStartX - rW},${winY + winH + rH} L${rStartX + rW * 0.5},${winY + winH + rH} L${rStartX + rW * 0.3},${winY + winH} Z`;
    elements.push(createPath(0, 0, rayPath, '#FFF8E0', { layer: 1, category: 'light', modifiable: false, opacity: 0.04, id: uid('wray') }));
  }

  // ════════════════════════════════════════════
  //  LAYER 1 — Menu board (above counter area)
  // ════════════════════════════════════════════

  const menuX = w * 0.08;
  const menuY = ceilingY + h * 0.03;
  const menuW = w * 0.22;
  const menuH = h * 0.2;

  // Board
  elements.push(createRect(menuX, menuY, menuW, menuH, 'url(#menuBoardGrad)', { layer: 1, category: 'menu', modifiable: true, id: uid('menu'), stroke: '#5C3317', strokeWidth: 3 }));
  // Decorative border
  elements.push(createRect(menuX + 4, menuY + 4, menuW - 8, menuH - 8, 'none', { layer: 1, category: 'menu', modifiable: false, stroke: '#888', strokeWidth: 0.8, opacity: 0.4, id: uid('mborder') }));

  // Chalk text lines
  elements.push(createText(menuX + menuW * 0.22, menuY + menuH * 0.2, 'MENU', '#F0E8D0', {
    layer: 2, category: 'menu', modifiable: true, id: uid('mtext'), fontSize: Math.max(9, menuH * 0.14),
  }));
  // Menu items (represented as chalk text rects)
  const menuItems = rng.nextInt(4, 6);
  for (let i = 0; i < menuItems; i++) {
    const ly = menuY + menuH * 0.32 + i * (menuH * 0.12);
    const lw = rng.nextFloat(menuW * 0.3, menuW * 0.6);
    elements.push(createRect(menuX + 10, ly, lw, 2.5, '#E0D8C0', {
      layer: 2, category: 'menu', modifiable: false, opacity: rng.nextFloat(0.4, 0.7), id: uid('mline'),
    }));
    // Price
    elements.push(createRect(menuX + menuW - 28, ly, 15, 2.5, '#E0D8C0', {
      layer: 2, category: 'menu', modifiable: false, opacity: rng.nextFloat(0.3, 0.6), id: uid('mprice'),
    }));
  }

  // Small chalk decorations
  elements.push(createCircle(menuX + menuW * 0.85, menuY + menuH * 0.15, 4, '#F0E8D0', { layer: 2, category: 'menu', modifiable: false, opacity: 0.3, id: uid('mdeco') }));

  // ════════════════════════════════════════════
  //  LAYER 2 — Bar counter
  // ════════════════════════════════════════════

  const counterX = w * 0.02;
  const counterW = w * 0.42;
  const counterY = wallFloorY * 0.6;
  const counterH = wallFloorY - counterY;

  // Counter body
  elements.push(createRect(counterX, counterY, counterW, counterH, 'url(#counterGrad)', { layer: 2, category: 'counter', modifiable: true, id: uid('counter'), stroke: '#3A1A08', strokeWidth: 1 }));
  // Counter top surface (lighter)
  elements.push(createRect(counterX - 3, counterY - 3, counterW + 6, 6, '#7A4A28', { layer: 2, category: 'counter', modifiable: false, id: uid('ctop'), stroke: '#5A3218', strokeWidth: 0.5 }));
  // Counter panel line
  elements.push(createLine(counterX, counterY + counterH * 0.5, counterX + counterW, counterY + counterH * 0.5, '#3A1A08', { strokeWidth: 0.8, layer: 2, opacity: 0.3, id: uid('cpanel') }));

  // ════════════════════════════════════════════
  //  LAYER 2 — Espresso machine on counter
  // ════════════════════════════════════════════

  const machineW = counterW * 0.25;
  const machineH = counterH * 0.65;
  const machineX = counterX + counterW * 0.35;
  const machineY = counterY - machineH;
  elements.push(espressoMachine(machineX, machineY, machineW, machineH, rng));

  // ════════════════════════════════════════════
  //  LAYER 2 — Stacked cups on counter
  // ════════════════════════════════════════════

  const cupsX = counterX + counterW * 0.65;
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const cw = 8;
    const ch = 7;
    elements.push(createRect(cupsX + i * (cw + 1), counterY - ch - 2, cw, ch, '#FFFFFF', {
      layer: 3, category: 'cup', modifiable: false, stroke: '#DDD', strokeWidth: 0.5, id: uid('scup'),
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Pastry display case on counter
  // ════════════════════════════════════════════

  const caseX = counterX + counterW * 0.08;
  const caseW = counterW * 0.22;
  const caseH = counterH * 0.5;
  const caseY = counterY - caseH;
  // Glass case
  elements.push(createRect(caseX, caseY, caseW, caseH, '#DDEEFF', { layer: 3, category: 'display', modifiable: true, opacity: 0.2, stroke: '#AABBCC', strokeWidth: 0.8, id: uid('case') }));
  // Shelf inside
  elements.push(createLine(caseX, caseY + caseH * 0.5, caseX + caseW, caseY + caseH * 0.5, '#BBCCDD', { strokeWidth: 0.5, layer: 3, opacity: 0.4 }));
  // Pastries inside (small circles/rects)
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const px = caseX + 5 + i * (caseW / 5);
    const py = caseY + caseH * (rng.chance(0.5) ? 0.3 : 0.75);
    const pastryColor = rng.pick(['#D4A050', '#CC8833', '#AA6633', '#FFCC88']);
    elements.push(createCircle(px, py, rng.nextFloat(3, 5), pastryColor, { layer: 3, category: 'pastry', modifiable: false, id: uid('dpastry') }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Cash register on counter
  // ════════════════════════════════════════════

  const regX = counterX + counterW * 0.82;
  const regW = counterW * 0.14;
  const regH = counterH * 0.3;
  const regY = counterY - regH;
  elements.push(createRect(regX, regY, regW, regH, '#333', { layer: 3, category: 'register', modifiable: true, id: uid('reg'), stroke: '#222', strokeWidth: 0.5 }));
  // Screen
  elements.push(createRect(regX + regW * 0.1, regY + regH * 0.08, regW * 0.8, regH * 0.3, '#225533', { layer: 3, category: 'register', modifiable: false, id: uid('screen') }));
  // Buttons
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      elements.push(createRect(regX + regW * 0.15 + c * regW * 0.25, regY + regH * 0.5 + r * regH * 0.18, regW * 0.18, regH * 0.12, '#555', { layer: 3, opacity: 0.7, id: uid('btn') }));
    }
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Tip jar on counter
  // ════════════════════════════════════════════

  const tipX = counterX + counterW * 0.75;
  const tipY = counterY - 3;
  elements.push(createRect(tipX - 5, tipY - 14, 10, 14, '#DDEEFF', { layer: 3, category: 'tipjar', modifiable: true, opacity: 0.35, stroke: '#BBCCDD', strokeWidth: 0.5, id: uid('tip') }));
  elements.push(createText(tipX - 4, tipY - 4, 'TIP', '#555', { layer: 3, category: 'tipjar', modifiable: false, fontSize: 4, id: uid('tiptxt') }));
  // Coins inside
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(createCircle(tipX + rng.nextFloat(-3, 3), tipY - rng.nextFloat(6, 12), 2, rng.pick(['#FFD700', '#C0C0C0', '#CD7F32']), { layer: 3, opacity: 0.6, id: uid('coin') }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Bar stools (3-4)
  // ════════════════════════════════════════════

  const stoolCount = rng.nextInt(3, 4);
  for (let i = 0; i < stoolCount; i++) {
    const sx = counterX + counterW * 0.15 + i * (counterW * 0.25);
    elements.push(barStool(sx, counterY + counterH * 0.15, counterH * 0.7, rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Shelves behind counter (upper wall)
  // ════════════════════════════════════════════

  const shelfRows = 2;
  const shelfW = counterW * 0.9;
  const shelfStartX = counterX + counterW * 0.05;
  for (let s = 0; s < shelfRows; s++) {
    const shY = ceilingY + h * 0.08 + s * h * 0.12;
    // Shelf plank
    elements.push(createRect(shelfStartX, shY, shelfW, 3, '#5C3317', { layer: 2, category: 'shelf', modifiable: false, id: uid('shelf') }));
    // Shelf bracket
    elements.push(createPath(0, 0, `M${shelfStartX + 5},${shY + 3} L${shelfStartX + 5},${shY + 10} L${shelfStartX + 12},${shY + 3}`, 'none', { stroke: '#4A2810', strokeWidth: 1, layer: 2, opacity: 0.5, id: uid('bracket') }));
    elements.push(createPath(0, 0, `M${shelfStartX + shelfW - 5},${shY + 3} L${shelfStartX + shelfW - 5},${shY + 10} L${shelfStartX + shelfW - 12},${shY + 3}`, 'none', { stroke: '#4A2810', strokeWidth: 1, layer: 2, opacity: 0.5, id: uid('bracket') }));

    // Items on shelf: bottles and mason jars
    const itemCount = rng.nextInt(4, 7);
    for (let b = 0; b < itemCount; b++) {
      const bx = shelfStartX + 8 + b * (shelfW / (itemCount + 1));
      const bh = rng.nextFloat(18, 30);
      if (rng.chance(0.7)) {
        elements.push(bottle(bx, shY, bh, rng));
      } else {
        elements.push(masonJar(bx, shY, bh * 0.8, rng));
      }
    }
  }

  // Potted herb on shelf
  if (rng.chance(0.7)) {
    const herbX = shelfStartX + shelfW * 0.85;
    const herbShY = ceilingY + h * 0.08;
    elements.push(createPottedPlant(herbX, herbShY - 2, 18, rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Tables (3-5) with chairs
  // ════════════════════════════════════════════

  const tableCount = rng.nextInt(3, 5);
  const tableZone = { x: w * 0.45, w: w * 0.52, yTop: wallFloorY * 0.55, yBot: h * 0.92 };
  const tablePositions: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < tableCount; i++) {
    const tx = tableZone.x + (i % 3) * (tableZone.w / 3) + rng.nextFloat(0, tableZone.w * 0.08);
    const ty = i < 3 ? tableZone.yTop + rng.nextFloat(0, h * 0.08) : tableZone.yBot - rng.nextFloat(h * 0.05, h * 0.15);
    const tSize = rng.nextFloat(55, 75);

    tablePositions.push({ x: tx, y: ty });
    elements.push(cafeTable(tx, ty, tSize, rng, []));

    // Table items
    const tableItemX = tx;
    const tableItemY = ty - tSize * 0.06;

    // Coffee cup on some tables
    if (rng.chance(0.7)) {
      elements.push(coffeeCup(tableItemX + rng.nextFloat(-10, 5), tableItemY, rng.nextFloat(16, 22), rng));
    }
    // Pastry on some tables
    if (rng.chance(0.5)) {
      elements.push(pastryPlate(tableItemX + rng.nextFloat(5, 18), tableItemY + rng.nextFloat(-2, 4), rng.nextFloat(16, 22), rng));
    }
    // Book or laptop
    if (rng.chance(0.4)) {
      const bookColor = rng.pick(['#8B0000', '#1E3A5F', '#2E7D32', '#4A148C']);
      elements.push(createRect(tableItemX - 14, tableItemY - 2, 18, 12, bookColor, {
        layer: 3, category: 'book', modifiable: true, id: uid('book'),
      }));
    } else if (rng.chance(0.3)) {
      // Laptop
      elements.push(createRect(tableItemX - 12, tableItemY - 3, 24, 2, '#555', { layer: 3, category: 'laptop', modifiable: true, id: uid('laptop') }));
      elements.push(createRect(tableItemX - 10, tableItemY - 18, 20, 15, '#444', { layer: 3, category: 'laptop', modifiable: false, id: uid('lscreen') }));
      elements.push(createRect(tableItemX - 8, tableItemY - 16, 16, 11, '#336699', { layer: 3, opacity: 0.5, id: uid('ldisp') }));
    }
    // Small vase with flower (optional)
    if (rng.chance(0.35)) {
      const vx = tableItemX + rng.nextFloat(-15, -5);
      const vs = rng.nextFloat(12, 18);
      // Simple vase
      const vPath = `M${vx - vs * 0.1},${tableItemY} L${vx - vs * 0.15},${tableItemY - vs * 0.3} Q${vx - vs * 0.18},${tableItemY - vs * 0.5} ${vx},${tableItemY - vs * 0.55} Q${vx + vs * 0.18},${tableItemY - vs * 0.5} ${vx + vs * 0.15},${tableItemY - vs * 0.3} L${vx + vs * 0.1},${tableItemY} Z`;
      elements.push(createPath(vx, tableItemY, vPath, rng.nextColor([0, 360], [40, 70], [40, 65]), { layer: 3, category: 'vase', modifiable: true, id: uid('vase') }));
      // Flower stem
      elements.push(createLine(vx, tableItemY - vs * 0.55, vx, tableItemY - vs * 0.85, '#447744', { strokeWidth: 1, layer: 3, id: uid('stem') }));
      // Flower head
      elements.push(createCircle(vx, tableItemY - vs * 0.9, vs * 0.08, rng.pick(['#FF6666', '#FFAA44', '#FF66AA', '#FFDD44']), { layer: 3, id: uid('fhead') }));
    }
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Pendant lights (3-4)
  // ════════════════════════════════════════════

  const lampCount = rng.nextInt(3, 4);
  for (let i = 0; i < lampCount; i++) {
    const lx = w * (i + 1) / (lampCount + 1) + rng.nextFloat(-20, 20);
    const ly = ceilingY + h * rng.nextFloat(0.08, 0.14);
    elements.push(pendantLamp(lx, ly, rng.nextFloat(22, 32), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Wall decorations
  // ════════════════════════════════════════════

  // Framed pictures (2-3 on right wall above tables)
  const picCount = rng.nextInt(2, 3);
  for (let i = 0; i < picCount; i++) {
    const px = w * 0.5 + i * w * 0.17 + rng.nextFloat(-5, 5);
    const py = ceilingY + h * 0.06 + rng.nextFloat(0, h * 0.04);
    const pw = rng.nextFloat(28, 40);
    const ph = rng.nextFloat(22, 35);
    const frameColor = rng.pick(['#5C3317', '#333', '#8B6914', '#DAA520']);
    const bgColor = rng.nextColor([0, 360], [20, 50], [65, 85]);
    // Frame
    elements.push(createRect(px, py, pw, ph, frameColor, { layer: 3, category: 'picture', modifiable: true, id: uid('frame') }));
    // Inner picture
    elements.push(createRect(px + 3, py + 3, pw - 6, ph - 6, bgColor, { layer: 3, category: 'picture', modifiable: false, id: uid('pic') }));
    // Simple landscape inside (optional)
    if (rng.chance(0.5)) {
      elements.push(createRect(px + 3, py + ph * 0.55, pw - 6, ph * 0.2, rng.nextHSL([90, 140], [30, 50], [30, 50]), { layer: 3, opacity: 0.6, id: uid('picd') }));
    }
  }

  // Wall clock
  {
    const clockX = w * rng.nextFloat(0.4, 0.55);
    const clockY = ceilingY + h * 0.09;
    const clockR = rng.nextFloat(12, 16);
    elements.push(createCircle(clockX, clockY, clockR, '#FFFFF0', { layer: 3, category: 'clock', modifiable: true, stroke: '#5C3317', strokeWidth: 2, id: uid('clock') }));
    // Hour marks
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 - 90) * Math.PI / 180;
      elements.push(createCircle(clockX + Math.cos(a) * clockR * 0.8, clockY + Math.sin(a) * clockR * 0.8, clockR * 0.04, '#333', { layer: 3, id: uid('hmark') }));
    }
    // Hands
    const hour = rng.nextInt(1, 12);
    const min = rng.nextInt(0, 11) * 5;
    const hAngle = (hour * 30 + min * 0.5 - 90) * Math.PI / 180;
    const mAngle = (min * 6 - 90) * Math.PI / 180;
    elements.push(createLine(clockX, clockY, clockX + Math.cos(hAngle) * clockR * 0.5, clockY + Math.sin(hAngle) * clockR * 0.5, '#333', { strokeWidth: 2.5, layer: 3, id: uid('hhand') }));
    elements.push(createLine(clockX, clockY, clockX + Math.cos(mAngle) * clockR * 0.7, clockY + Math.sin(mAngle) * clockR * 0.7, '#333', { strokeWidth: 1.5, layer: 3, id: uid('mhand') }));
    elements.push(createCircle(clockX, clockY, clockR * 0.06, '#333', { layer: 3, id: uid('ccenter') }));
  }

  // Chalkboard sign (small, on wall near tables)
  if (rng.chance(0.7)) {
    const csX = w * rng.nextFloat(0.55, 0.62);
    const csY = wainscotTop - h * 0.08;
    const csW = 28;
    const csH = 20;
    elements.push(createRect(csX, csY, csW, csH, '#2A2A2A', { layer: 3, category: 'sign', modifiable: true, id: uid('csign'), stroke: '#5C3317', strokeWidth: 1.5 }));
    elements.push(createText(csX + 4, csY + csH * 0.6, 'WIFI', '#E0D8C0', { layer: 3, fontSize: 6, id: uid('wifi') }));
  }

  // Plant hanger (hanging from ceiling or high on wall)
  if (rng.chance(0.65)) {
    const phX = w * rng.nextFloat(0.48, 0.6);
    const phY = ceilingY + h * 0.03;
    // Chain/rope
    elements.push(createLine(phX, 0, phX, phY, '#8B6914', { strokeWidth: 1, layer: 3, opacity: 0.6, id: uid('rope') }));
    // Pot
    const potW = 14;
    const potH = 10;
    elements.push(createRect(phX - potW / 2, phY, potW, potH, rng.pick(['#A0522D', '#D2691E']), { layer: 3, category: 'plant', modifiable: true, id: uid('hpot') }));
    // Trailing plant
    for (let i = 0; i < rng.nextInt(3, 5); i++) {
      const trailPath = `M${phX + rng.nextFloat(-5, 5)},${phY + potH} Q${phX + rng.nextFloat(-15, 15)},${phY + potH + rng.nextFloat(10, 20)} ${phX + rng.nextFloat(-20, 20)},${phY + potH + rng.nextFloat(15, 30)}`;
      elements.push(createPath(0, 0, trailPath, 'none', { stroke: rng.nextHSL([100, 140], [40, 60], [30, 50]), strokeWidth: 1.5, layer: 3, opacity: 0.7, id: uid('trail') }));
    }
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Potted plants on floor (3-4)
  // ════════════════════════════════════════════

  const floorPlantCount = rng.nextInt(3, 4);
  const floorPlantXs = [w * 0.42, w * 0.93, w * rng.nextFloat(0.6, 0.78), w * 0.02];
  for (let i = 0; i < floorPlantCount; i++) {
    const fpx = floorPlantXs[i] + rng.nextFloat(-5, 5);
    const fpy = wallFloorY - 2;
    elements.push(createPottedPlant(fpx, fpy, rng.nextFloat(30, 50), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — People
  // ════════════════════════════════════════════

  // Barista behind counter
  elements.push(cafePerson(counterX + counterW * 0.5, counterY, true, rng));

  // Seated customers (1-2 at tables)
  const seatedCount = rng.nextInt(1, 2);
  for (let i = 0; i < seatedCount && i < tablePositions.length; i++) {
    const tp = tablePositions[i];
    // Seat at right side of table
    elements.push(cafePerson(tp.x + rng.nextFloat(18, 28), tp.y - 5, false, rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Small details on tables
  // ════════════════════════════════════════════

  // Napkin dispensers and sugar/salt on various tables
  for (let i = 0; i < Math.min(tablePositions.length, 3); i++) {
    const tp = tablePositions[i];
    const detailX = tp.x + rng.nextFloat(-20, -10);
    const detailY = tp.y - rng.nextFloat(8, 12);

    // Napkin dispenser (small rect)
    if (rng.chance(0.5)) {
      elements.push(createRect(detailX, detailY, 8, 6, '#AAAAAA', { layer: 3, category: 'detail', modifiable: false, id: uid('napkin'), stroke: '#888', strokeWidth: 0.5 }));
      // Napkins sticking out
      elements.push(createRect(detailX + 1, detailY - 2, 6, 2, '#FFFFFF', { layer: 3, opacity: 0.7, id: uid('nap') }));
    }

    // Sugar packets
    if (rng.chance(0.45)) {
      for (let j = 0; j < rng.nextInt(2, 3); j++) {
        elements.push(createRect(detailX + 12 + j * 4, detailY + 1, 3, 5, rng.pick(['#FFFFFF', '#FFF0D0', '#FFE0E0']), { layer: 3, opacity: 0.8, id: uid('sugar') }));
      }
    }

    // Salt & pepper shakers
    if (rng.chance(0.4)) {
      elements.push(createRect(detailX + 25, detailY - 2, 4, 8, '#F5F5F5', { layer: 3, category: 'detail', modifiable: false, id: uid('salt') }));
      elements.push(createRect(detailX + 31, detailY - 2, 4, 8, '#333', { layer: 3, category: 'detail', modifiable: false, id: uid('pepper') }));
      // Caps
      elements.push(createRect(detailX + 25, detailY - 3.5, 4, 2, '#CCC', { layer: 3, opacity: 0.8, id: uid('scap') }));
      elements.push(createRect(detailX + 31, detailY - 3.5, 4, 2, '#555', { layer: 3, opacity: 0.8, id: uid('pcap') }));
    }
  }

  // ════════════════════════════════════════════
  //  LAYER 4 — Ambient warm glow overlay
  // ════════════════════════════════════════════

  // Subtle warm color overlay from pendant lights
  for (let i = 0; i < lampCount; i++) {
    const lx = w * (i + 1) / (lampCount + 1);
    elements.push(createCircle(lx, ceilingY + h * 0.15, w * 0.18, 'url(#ceilingLightGlow)', {
      layer: 4, category: 'glow', modifiable: false, id: uid('glow'),
    }));
  }

  return { elements, defs };
}
