import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath,
  createLine, createGroup, createText,
} from '../engine/primitives';
import {
  combineDefs, indoorDefs, wallGradient, floorGradient, linearGradient,
  radialGradient, brickPattern, woodGrainPattern,
} from './svg-effects';
import {
  detailedTable, detailedLamp, detailedFlower, resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'cf') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// Coffee cup with saucer
function coffeeCup(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const cupColor = rng.pick(['#FFFFFF', '#F5F0E8', '#E8E0D0', '#FFF8F0']);
  children.push(createEllipse(x, y + s * 0.02, s * 0.35, s * 0.08, '#F0EBE0', { layer: 3, stroke: '#D0C8B8', strokeWidth: 0.5 }));
  const cupPath = `M${x - s * 0.15},${y - s * 0.2} L${x - s * 0.12},${y} L${x + s * 0.12},${y} L${x + s * 0.15},${y - s * 0.2} Z`;
  children.push(createPath(x, y, cupPath, cupColor, { layer: 3, stroke: '#D0C8B8', strokeWidth: 0.8 }));
  children.push(createRect(x - s * 0.13, y - s * 0.18, s * 0.26, s * 0.06, '#3E2723', { layer: 3, opacity: 0.85 }));
  children.push(createPath(x, y, `M${x + s * 0.15},${y - s * 0.15} Q${x + s * 0.28},${y - s * 0.1} ${x + s * 0.15},${y - s * 0.02}`, 'none', { stroke: cupColor, strokeWidth: s * 0.04, layer: 3 }));
  for (let i = 0; i < 2; i++) {
    const sx = x + rng.nextFloat(-s * 0.06, s * 0.06);
    children.push(createPath(x, y, `M${sx},${y - s * 0.22} Q${sx + rng.nextFloat(-4, 4)},${y - s * 0.35} ${sx + rng.nextFloat(-3, 3)},${y - s * 0.45}`, 'none', { stroke: '#CCBBAA', strokeWidth: 0.8, layer: 3, opacity: 0.3 }));
  }
  return createGroup(x, y, children, { layer: 3, category: 'cup', modifiable: true, id: uid('cup'), filter: 'url(#softShadow)' });
}

// Pastry on plate
function pastryPlate(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  children.push(createEllipse(x, y, s * 0.3, s * 0.08, '#F5F0E8', { layer: 3, stroke: '#D0C8B8', strokeWidth: 0.5 }));
  const pType = rng.pick(['croissant', 'muffin', 'cake'] as const);
  if (pType === 'croissant') {
    const cPath = `M${x - s * 0.15},${y - s * 0.04} Q${x - s * 0.1},${y - s * 0.15} ${x},${y - s * 0.12} Q${x + s * 0.1},${y - s * 0.15} ${x + s * 0.15},${y - s * 0.04} Q${x + s * 0.08},${y - s * 0.02} ${x},${y - s * 0.05} Q${x - s * 0.08},${y - s * 0.02} ${x - s * 0.15},${y - s * 0.04} Z`;
    children.push(createPath(x, y, cPath, '#D4A050', { layer: 3 }));
  } else if (pType === 'muffin') {
    const wPath = `M${x - s * 0.1},${y} L${x - s * 0.08},${y - s * 0.08} L${x + s * 0.08},${y - s * 0.08} L${x + s * 0.1},${y} Z`;
    children.push(createPath(x, y, wPath, '#E8D8C0', { layer: 3 }));
    children.push(createCircle(x, y - s * 0.12, s * 0.1, rng.pick(['#8B6914', '#6B4226', '#AA6633']), { layer: 3 }));
  } else {
    const slicePath = `M${x - s * 0.12},${y} L${x - s * 0.1},${y - s * 0.12} L${x + s * 0.1},${y - s * 0.12} L${x + s * 0.12},${y} Z`;
    children.push(createPath(x, y, slicePath, '#FFF0D0', { layer: 3 }));
    children.push(createRect(x - s * 0.1, y - s * 0.14, s * 0.2, s * 0.03, rng.pick(['#FF9999', '#FFCC99', '#CC9966']), { layer: 3 }));
    if (rng.chance(0.6)) children.push(createCircle(x, y - s * 0.16, s * 0.025, '#CC2222', { layer: 3 }));
  }
  return createGroup(x, y, children, { layer: 3, category: 'pastry', modifiable: true, id: uid('pastry') });
}

// Espresso machine
function espressoMachine(x: number, y: number, w2: number, h2: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  children.push(createRect(x, y, w2, h2, '#556677', { layer: 2, stroke: '#445566', strokeWidth: 1 }));
  children.push(createRect(x, y, w2, h2 * 0.25, '#667788', { layer: 2 }));
  children.push(createRect(x + w2 * 0.1, y + h2 * 0.3, w2 * 0.8, h2 * 0.35, '#AABBCC', { layer: 2, stroke: '#8899AA', strokeWidth: 0.5 }));
  for (let i = 0; i < 2; i++) {
    const gx = x + w2 * 0.25 + i * w2 * 0.35;
    const gy = y + h2 * 0.68;
    children.push(createCircle(gx, gy, w2 * 0.06, '#334455', { layer: 2 }));
    children.push(createRect(gx - w2 * 0.08, gy + w2 * 0.04, w2 * 0.16, w2 * 0.03, '#222', { layer: 2 }));
  }
  children.push(createLine(x + w2 * 0.85, y + h2 * 0.4, x + w2 * 0.9, y + h2 * 0.8, '#AABBCC', { strokeWidth: 2, layer: 2 }));
  children.push(createCircle(x + w2 * 0.3, y + h2 * 0.15, w2 * 0.05, '#FFFFF0', { layer: 2, stroke: '#888', strokeWidth: 0.5 }));
  children.push(createCircle(x + w2 * 0.55, y + h2 * 0.15, w2 * 0.05, '#FFFFF0', { layer: 2, stroke: '#888', strokeWidth: 0.5 }));
  children.push(createRect(x + w2 * 0.05, y + h2 * 0.88, w2 * 0.9, h2 * 0.08, '#445566', { layer: 2 }));
  return createGroup(x, y, children, { layer: 2, category: 'machine', modifiable: true, id: uid('espresso'), filter: 'url(#shadow)' });
}

// Pendant lamp
function pendantLamp(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const shadeColor = rng.pick(['#2A2A2A', '#3A3530', '#1A1A2A', '#4A3A2A']);
  children.push(createLine(x, 0, x, y - s * 0.3, '#333', { strokeWidth: 1.5, layer: 2 }));
  const shadePath = `M${x - s * 0.25},${y} Q${x - s * 0.28},${y - s * 0.15} ${x - s * 0.15},${y - s * 0.3} L${x + s * 0.15},${y - s * 0.3} Q${x + s * 0.28},${y - s * 0.15} ${x + s * 0.25},${y} Z`;
  children.push(createPath(x, y, shadePath, shadeColor, { layer: 2 }));
  children.push(createCircle(x, y - s * 0.05, s * 0.08, '#FFEECC', { layer: 2, opacity: 0.9 }));
  children.push(createCircle(x, y + s * 0.1, s * 0.6, '#FFE4AA', { layer: 1, opacity: 0.06 }));
  children.push(createCircle(x, y + s * 0.1, s * 0.35, '#FFE4AA', { layer: 1, opacity: 0.08 }));
  return createGroup(x, y, children, { layer: 2, category: 'lamp', modifiable: true, id: uid('lamp'), filter: 'url(#shadow)' });
}

// Bar stool
function barStool(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const seatColor = rng.pick(['#5C3317', '#3A3A3A', '#4A3020', '#2A2A3A']);
  children.push(createEllipse(x, y, s * 0.18, s * 0.06, seatColor, { layer: 3 }));
  children.push(createLine(x, y + s * 0.06, x, y + s * 0.55, '#555', { strokeWidth: 2.5, layer: 3 }));
  children.push(createEllipse(x, y + s * 0.42, s * 0.12, s * 0.035, 'none', { layer: 3, stroke: '#555', strokeWidth: 1.5 }));
  children.push(createLine(x, y + s * 0.55, x - s * 0.15, y + s * 0.62, '#555', { strokeWidth: 2, layer: 3 }));
  children.push(createLine(x, y + s * 0.55, x + s * 0.15, y + s * 0.62, '#555', { strokeWidth: 2, layer: 3 }));
  return createGroup(x, y, children, { layer: 3, category: 'stool', modifiable: true, id: uid('stool'), filter: 'url(#softShadow)' });
}

// Cafe table with chairs
function cafeTable(x: number, y: number, tableSize: number, rng: SeededRandom): SVGElementData {
  const s = tableSize;
  const children: SVGElementData[] = [];
  const tableColor = rng.pick(['#8B6914', '#6B3410', '#A0522D', '#5C3317']);
  children.push(createEllipse(x, y, s * 0.35, s * 0.1, tableColor, { layer: 2, stroke: '#4A3020', strokeWidth: 1 }));
  children.push(createRect(x - s * 0.03, y + s * 0.1, s * 0.06, s * 0.35, tableColor, { layer: 2 }));
  children.push(createEllipse(x, y + s * 0.45, s * 0.15, s * 0.04, '#4A3020', { layer: 2 }));

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

  return createGroup(x, y, children, { layer: 2, category: 'table', modifiable: true, id: uid('table'), filter: 'url(#shadow)' });
}

// Seated person
function cafePerson(x: number, y: number, standing: boolean, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const skinColor = rng.pick(['#FDBCB4', '#D2996C', '#8D5524', '#C68642']);
  const hairColor = rng.pick(['#2C1608', '#4A3020', '#8B6914', '#333', '#AA4422']);
  const topColor = rng.nextColor([0, 360], [30, 70], [35, 65]);
  if (standing) {
    children.push(createCircle(x, y - 32, 6, skinColor, { layer: 3 }));
    children.push(createCircle(x, y - 35, 6.5, hairColor, { layer: 3, opacity: 0.6 }));
    children.push(createRect(x - 6, y - 26, 12, 18, topColor, { layer: 3 }));
    children.push(createRect(x - 5, y - 14, 10, 14, '#F5F0E0', { layer: 3, opacity: 0.9 }));
    children.push(createRect(x - 4, y - 8, 3, 14, '#333', { layer: 3 }));
    children.push(createRect(x + 1, y - 8, 3, 14, '#333', { layer: 3 }));
  } else {
    children.push(createCircle(x, y - 18, 5.5, skinColor, { layer: 3 }));
    children.push(createCircle(x, y - 20.5, 6, hairColor, { layer: 3, opacity: 0.5 }));
    children.push(createRect(x - 5, y - 12, 10, 14, topColor, { layer: 3 }));
    children.push(createLine(x - 5, y - 8, x - 10, y - 4, topColor, { strokeWidth: 3, layer: 3 }));
    children.push(createLine(x + 5, y - 8, x + 10, y - 4, topColor, { strokeWidth: 3, layer: 3 }));
  }
  return createGroup(x, y, children, { layer: 3, category: 'person', modifiable: true, id: uid('person') });
}

// Bottle on shelf
function bottle(x: number, y: number, h2: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const bColor = rng.pick(['#224400', '#442200', '#002244', '#440022', '#664400', '#003322']);
  const bw = rng.nextFloat(5, 9);
  children.push(createRect(x - bw / 2, y - h2 * 0.7, bw, h2 * 0.7, bColor, { layer: 3, opacity: 0.8 }));
  children.push(createRect(x - bw * 0.3, y - h2, bw * 0.6, h2 * 0.3, bColor, { layer: 3, opacity: 0.8 }));
  if (rng.chance(0.6)) {
    children.push(createRect(x - bw / 2 + 1, y - h2 * 0.5, bw - 2, h2 * 0.2, rng.pick(['#F5F0D0', '#FFF8E0', '#EEDDCC']), { layer: 3, opacity: 0.8 }));
  }
  children.push(createRect(x - bw * 0.25, y - h2 - 2, bw * 0.5, 2, '#888', { layer: 3 }));
  return createGroup(x, y, children, { layer: 3, category: 'bottle', modifiable: true, id: uid('bot') });
}

export function generateCafeInterior(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  // ── Color palette ──
  const wallTop = rng.pick(['#D4A574', '#C4956A', '#B88A5E', '#CC9966']);
  const wallBottom2 = rng.pick(['#C09060', '#A87850', '#B08050', '#A07040']);
  const floorBase = rng.pick(['#5C3317', '#4A2810', '#6B3410', '#503018']);
  const floorLight = rng.pick(['#6B4020', '#5A3518', '#7A4A28']);
  const brickColor = rng.pick(['#8B4513', '#A0522D', '#6B3410', '#7A3A15']);
  const brickMortar = rng.pick(['#C4A882', '#B89B70', '#D0B890']);
  const wainscotColor = rng.pick(['#6B3410', '#5C3317', '#8B6914']);
  const counterColor = rng.pick(['#5C3317', '#4A2810', '#6B4226']);
  const cafeName = rng.pick(['BLOSSOM', 'COZY CUP', 'MOCHA', 'THE NOOK', 'AROMA']);

  // ── SVG Defs ──
  const defs = combineDefs(
    indoorDefs(),
    wallGradient('wallGrad', wallTop, wallBottom2),
    floorGradient('floorGrad', floorBase, floorLight),
    radialGradient('ceilingLightGlow', [
      { offset: '0%', color: '#FFEECC', opacity: 0.25 },
      { offset: '60%', color: '#FFE4AA', opacity: 0.08 },
      { offset: '100%', color: '#FFD488', opacity: 0 },
    ]),
    linearGradient('menuBoardGrad', [
      { offset: '0%', color: '#2A2A2A' },
      { offset: '100%', color: '#1A1A1A' },
    ]),
    linearGradient('counterGrad', [
      { offset: '0%', color: counterColor },
      { offset: '40%', color: counterColor },
      { offset: '100%', color: '#3A1A08' },
    ]),
    linearGradient('windowLight', [
      { offset: '0%', color: '#FFF8E0' },
      { offset: '100%', color: '#FFE8B0' },
    ]),
    brickPattern('brickPat', brickMortar, brickColor),
    woodGrainPattern('woodFloor', floorBase),
  );

  const wallFloorY = h * 0.68;
  const ceilingY = h * 0.04;

  // ════════════════════════════════════════════
  //  LAYER 0 — Walls, ceiling, floor
  // ════════════════════════════════════════════

  elements.push(createRect(0, ceilingY, w, wallFloorY - ceilingY, 'url(#wallGrad)', { layer: 0, category: 'wall', modifiable: false }));
  elements.push(createRect(0, 0, w, ceilingY, '#E8D8C0', { layer: 0, category: 'ceiling', modifiable: false }));

  // Ceiling beams
  const beamCount = rng.nextInt(3, 4);
  for (let i = 0; i < beamCount; i++) {
    const bx = w * (i + 1) / (beamCount + 1);
    elements.push(createRect(bx - 4, 0, 8, ceilingY + 3, '#6B4226', { layer: 0, category: 'beam', modifiable: false, opacity: 0.7 }));
  }

  // Exposed brick (left side) using pattern
  const brickW = w * 0.3;
  const brickBottom = wallFloorY * 0.55;
  elements.push(createRect(0, ceilingY, brickW, brickBottom - ceilingY, 'url(#brickPat)', { layer: 0, category: 'brick', modifiable: false }));

  // Wainscoting (lower wall)
  const wainscotTop = wallFloorY * 0.58;
  elements.push(createRect(0, wainscotTop, w, wallFloorY - wainscotTop, wainscotColor, { layer: 0, category: 'wainscot', modifiable: false }));
  elements.push(createRect(0, wainscotTop - 2, w, 4, '#4A2810', { layer: 0, category: 'wainscot', modifiable: false }));
  const wpCount = rng.nextInt(6, 10);
  const wpW = (w - 10) / wpCount;
  for (let i = 0; i < wpCount; i++) {
    elements.push(createRect(5 + i * wpW + 4, wainscotTop + 6, wpW - 8, wallFloorY - wainscotTop - 12, 'none', {
      layer: 0, category: 'wainscot', modifiable: false, stroke: '#3A1A08', strokeWidth: 1, opacity: 0.4,
    }));
  }

  // Floor
  elements.push(createRect(0, wallFloorY, w, h - wallFloorY, 'url(#floorGrad)', { layer: 0, category: 'floor', modifiable: false }));
  const plankCount = rng.nextInt(12, 18);
  for (let i = 0; i < plankCount; i++) {
    elements.push(createRect(i * (w / plankCount), wallFloorY, 1, h - wallFloorY, '#3A1A08', { layer: 0, opacity: 0.2 }));
  }
  for (let j = 0; j < 3; j++) {
    elements.push(createRect(0, wallFloorY + (j + 1) * ((h - wallFloorY) / 4), w, 1, '#3A1A08', { layer: 0, opacity: 0.12 }));
  }
  elements.push(createRect(0, wallFloorY - 2, w, 5, '#3A1A08', { layer: 1, category: 'wall', modifiable: false }));

  // ════════════════════════════════════════════
  //  LAYER 1 — Window (right side)
  // ════════════════════════════════════════════

  const winX = w * 0.65;
  const winW = w * 0.28;
  const winH = h * 0.38;
  const winY = ceilingY + h * 0.04;

  elements.push(createRect(winX - 4, winY - 4, winW + 8, winH + 8, '#5C3317', { layer: 1, category: 'window', modifiable: false }));
  elements.push(createRect(winX, winY, winW, winH, 'url(#windowLight)', { layer: 1, category: 'window', modifiable: true, id: uid('wglass') }));
  elements.push(createRect(winX + winW / 2 - 1.5, winY, 3, winH, '#5C3317', { layer: 1, modifiable: false }));
  elements.push(createRect(winX, winY + winH / 2 - 1.5, winW, 3, '#5C3317', { layer: 1, modifiable: false }));
  elements.push(createText(winX + winW * 0.15, winY + winH * 0.3, cafeName, '#AA8855', {
    layer: 1, category: 'text', modifiable: true, id: uid('wintext'), fontSize: Math.max(8, winW * 0.09), opacity: 0.3,
  }));
  elements.push(createRect(winX - 6, winY + winH, winW + 12, 6, '#4A2810', { layer: 1, modifiable: false }));

  // Light rays from window
  for (let i = 0; i < 3; i++) {
    const rStartX = winX + winW * (0.2 + i * 0.3);
    const rW = rng.nextFloat(15, 30);
    const rH = h * 0.3;
    const rayPath = `M${rStartX},${winY + winH} L${rStartX - rW},${winY + winH + rH} L${rStartX + rW * 0.5},${winY + winH + rH} L${rStartX + rW * 0.3},${winY + winH} Z`;
    elements.push(createPath(0, 0, rayPath, '#FFF8E0', { layer: 1, category: 'light', modifiable: false, opacity: 0.04 }));
  }

  // Potted plant on sill
  const plantX = winX + winW * 0.2;
  const plantSize = rng.nextFloat(22, 32);
  elements.push(createRect(plantX - plantSize * 0.15, winY + winH - plantSize * 0.3, plantSize * 0.3, plantSize * 0.3, '#A0522D', { layer: 1, category: 'plant', modifiable: false }));
  elements.push(createCircle(plantX, winY + winH - plantSize * 0.5, plantSize * 0.25, '#2E7D32', { layer: 1, category: 'plant', modifiable: true, id: uid('plant') }));

  // ════════════════════════════════════════════
  //  LAYER 1 — Menu board
  // ════════════════════════════════════════════

  const menuX = w * 0.08;
  const menuY = ceilingY + h * 0.03;
  const menuW = w * 0.22;
  const menuH = h * 0.2;
  elements.push(createRect(menuX, menuY, menuW, menuH, 'url(#menuBoardGrad)', { layer: 1, category: 'menu', modifiable: true, id: uid('menu'), stroke: '#5C3317', strokeWidth: 3, filter: 'url(#shadow)' }));
  elements.push(createRect(menuX + 4, menuY + 4, menuW - 8, menuH - 8, 'none', { layer: 1, stroke: '#888', strokeWidth: 0.8, opacity: 0.4 }));
  elements.push(createText(menuX + menuW * 0.22, menuY + menuH * 0.2, 'MENU', '#F0E8D0', {
    layer: 2, category: 'menu', modifiable: true, id: uid('mtext'), fontSize: Math.max(9, menuH * 0.14),
  }));
  const menuItems = rng.nextInt(4, 6);
  for (let i = 0; i < menuItems; i++) {
    const ly = menuY + menuH * 0.32 + i * (menuH * 0.12);
    elements.push(createRect(menuX + 10, ly, rng.nextFloat(menuW * 0.3, menuW * 0.6), 2.5, '#E0D8C0', { layer: 2, opacity: rng.nextFloat(0.4, 0.7) }));
    elements.push(createRect(menuX + menuW - 28, ly, 15, 2.5, '#E0D8C0', { layer: 2, opacity: rng.nextFloat(0.3, 0.6) }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Bar counter
  // ════════════════════════════════════════════

  const counterX = w * 0.02;
  const counterW2 = w * 0.42;
  const counterY = wallFloorY * 0.6;
  const counterH = wallFloorY - counterY;

  elements.push(createRect(counterX, counterY, counterW2, counterH, 'url(#counterGrad)', { layer: 2, category: 'counter', modifiable: true, id: uid('counter'), stroke: '#3A1A08', strokeWidth: 1, filter: 'url(#shadow)' }));
  elements.push(createRect(counterX - 3, counterY - 3, counterW2 + 6, 6, '#7A4A28', { layer: 2, category: 'counter', modifiable: false, stroke: '#5A3218', strokeWidth: 0.5 }));
  elements.push(createLine(counterX, counterY + counterH * 0.5, counterX + counterW2, counterY + counterH * 0.5, '#3A1A08', { strokeWidth: 0.8, layer: 2, opacity: 0.3 }));

  // Espresso machine
  const machineW = counterW2 * 0.25;
  const machineH = counterH * 0.65;
  elements.push(espressoMachine(counterX + counterW2 * 0.35, counterY - machineH, machineW, machineH, rng));

  // Stacked cups
  const cupsX = counterX + counterW2 * 0.65;
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    elements.push(createRect(cupsX + i * 9, counterY - 9, 8, 7, '#FFFFFF', { layer: 3, stroke: '#DDD', strokeWidth: 0.5 }));
  }

  // Pastry display case
  const caseX = counterX + counterW2 * 0.08;
  const caseW = counterW2 * 0.22;
  const caseH = counterH * 0.5;
  const caseY = counterY - caseH;
  elements.push(createRect(caseX, caseY, caseW, caseH, '#DDEEFF', { layer: 3, category: 'display', modifiable: true, opacity: 0.2, stroke: '#AABBCC', strokeWidth: 0.8, id: uid('case') }));
  elements.push(createLine(caseX, caseY + caseH * 0.5, caseX + caseW, caseY + caseH * 0.5, '#BBCCDD', { strokeWidth: 0.5, layer: 3, opacity: 0.4 }));
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const px = caseX + 5 + i * (caseW / 5);
    const py = caseY + caseH * (rng.chance(0.5) ? 0.3 : 0.75);
    elements.push(createCircle(px, py, rng.nextFloat(3, 5), rng.pick(['#D4A050', '#CC8833', '#AA6633', '#FFCC88']), { layer: 3 }));
  }

  // Cash register
  const regX = counterX + counterW2 * 0.82;
  const regW = counterW2 * 0.14;
  const regH = counterH * 0.3;
  const regY = counterY - regH;
  elements.push(createRect(regX, regY, regW, regH, '#333', { layer: 3, category: 'register', modifiable: true, id: uid('reg'), stroke: '#222', strokeWidth: 0.5, filter: 'url(#softShadow)' }));
  elements.push(createRect(regX + regW * 0.1, regY + regH * 0.08, regW * 0.8, regH * 0.3, '#225533', { layer: 3 }));
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      elements.push(createRect(regX + regW * 0.15 + c * regW * 0.25, regY + regH * 0.5 + r * regH * 0.18, regW * 0.18, regH * 0.12, '#555', { layer: 3, opacity: 0.7 }));
    }
  }

  // Tip jar
  elements.push(createRect(counterX + counterW2 * 0.75 - 5, counterY - 17, 10, 14, '#DDEEFF', { layer: 3, category: 'tipjar', modifiable: true, opacity: 0.35, stroke: '#BBCCDD', strokeWidth: 0.5, id: uid('tip') }));
  elements.push(createText(counterX + counterW2 * 0.75 - 4, counterY - 7, 'TIP', '#555', { layer: 3, fontSize: 4 }));

  // Bar stools
  for (let i = 0; i < rng.nextInt(3, 4); i++) {
    elements.push(barStool(counterX + counterW2 * 0.15 + i * (counterW2 * 0.25), counterY + counterH * 0.15, counterH * 0.7, rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Shelves behind counter
  // ════════════════════════════════════════════

  const shelfW = counterW2 * 0.9;
  const shelfStartX = counterX + counterW2 * 0.05;
  for (let s = 0; s < 2; s++) {
    const shY = ceilingY + h * 0.08 + s * h * 0.12;
    elements.push(createRect(shelfStartX, shY, shelfW, 3, '#5C3317', { layer: 2, category: 'shelf', modifiable: false }));
    const itemCount = rng.nextInt(4, 7);
    for (let b = 0; b < itemCount; b++) {
      elements.push(bottle(shelfStartX + 8 + b * (shelfW / (itemCount + 1)), shY, rng.nextFloat(18, 30), rng));
    }
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Tables (3-5) with chairs
  // ════════════════════════════════════════════

  const tableCount = rng.nextInt(3, 5);
  const tableZone = { x: w * 0.45, tw: w * 0.52, yTop: wallFloorY * 0.55, yBot: h * 0.92 };

  for (let i = 0; i < tableCount; i++) {
    const tx = tableZone.x + (i % 3) * (tableZone.tw / 3) + rng.nextFloat(0, tableZone.tw * 0.08);
    const ty = i < 3 ? tableZone.yTop + rng.nextFloat(0, h * 0.08) : tableZone.yBot - rng.nextFloat(h * 0.05, h * 0.15);
    const tSize = rng.nextFloat(55, 75);
    elements.push(cafeTable(tx, ty, tSize, rng));

    const tiX = tx;
    const tiY = ty - tSize * 0.06;
    if (rng.chance(0.7)) elements.push(coffeeCup(tiX + rng.nextFloat(-10, 5), tiY, rng.nextFloat(16, 22), rng));
    if (rng.chance(0.5)) elements.push(pastryPlate(tiX + rng.nextFloat(5, 18), tiY + rng.nextFloat(-2, 4), rng.nextFloat(16, 22), rng));
    if (rng.chance(0.4)) {
      elements.push(createRect(tiX - 14, tiY - 2, 18, 12, rng.pick(['#8B0000', '#1E3A5F', '#2E7D32', '#4A148C']), {
        layer: 3, category: 'book', modifiable: true, id: uid('book'),
      }));
    }
    if (rng.chance(0.35)) {
      elements.push(detailedFlower(tiX + rng.nextFloat(-15, -5), tiY, rng.pick(['daisy', 'tulip', 'rose', 'sunflower']), rng.nextFloat(10, 16), rng));
    }
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Pendant lights
  // ════════════════════════════════════════════

  const lampCount = rng.nextInt(3, 4);
  for (let i = 0; i < lampCount; i++) {
    const lx = w * (i + 1) / (lampCount + 1) + rng.nextFloat(-20, 20);
    elements.push(pendantLamp(lx, ceilingY + h * rng.nextFloat(0.08, 0.14), rng.nextFloat(22, 32), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Seated people, barista
  // ════════════════════════════════════════════

  // Barista behind counter
  elements.push(cafePerson(counterX + counterW2 * 0.5, counterY - 8, true, rng));

  // Seated customers at tables
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const tx = tableZone.x + (i % 3) * (tableZone.tw / 3) + rng.nextFloat(10, 30);
    const ty = tableZone.yTop + rng.nextFloat(-5, h * 0.05);
    elements.push(cafePerson(tx, ty, false, rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Wall decorations
  // ════════════════════════════════════════════

  const picCount2 = rng.nextInt(2, 3);
  for (let i = 0; i < picCount2; i++) {
    const px = w * 0.5 + i * w * 0.17 + rng.nextFloat(-5, 5);
    const py = ceilingY + h * 0.06 + rng.nextFloat(0, h * 0.04);
    const pw = rng.nextFloat(28, 40);
    const ph = rng.nextFloat(22, 35);
    elements.push(createRect(px, py, pw, ph, rng.pick(['#5C3317', '#333', '#8B6914', '#DAA520']), { layer: 3, category: 'picture', modifiable: true, id: uid('frame'), filter: 'url(#shadow)' }));
    elements.push(createRect(px + 3, py + 3, pw - 6, ph - 6, rng.nextColor([0, 360], [20, 50], [65, 85]), { layer: 3 }));
  }

  // Wall clock
  {
    const clkX = w * rng.nextFloat(0.4, 0.55);
    const clkY = ceilingY + h * 0.09;
    const clkR = rng.nextFloat(12, 16);
    elements.push(createCircle(clkX, clkY, clkR, '#FFFFF0', { layer: 3, category: 'clock', modifiable: true, stroke: '#5C3317', strokeWidth: 2, id: uid('clock'), filter: 'url(#shadow)' }));
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 - 90) * Math.PI / 180;
      elements.push(createCircle(clkX + Math.cos(a) * clkR * 0.8, clkY + Math.sin(a) * clkR * 0.8, clkR * 0.04, '#333', { layer: 3 }));
    }
    const hr = rng.nextInt(1, 12);
    const mn = rng.nextInt(0, 11) * 5;
    const ha = (hr * 30 + mn * 0.5 - 90) * Math.PI / 180;
    const ma = (mn * 6 - 90) * Math.PI / 180;
    elements.push(createLine(clkX, clkY, clkX + Math.cos(ha) * clkR * 0.5, clkY + Math.sin(ha) * clkR * 0.5, '#333', { strokeWidth: 2.5, layer: 3 }));
    elements.push(createLine(clkX, clkY, clkX + Math.cos(ma) * clkR * 0.7, clkY + Math.sin(ma) * clkR * 0.7, '#333', { strokeWidth: 1.5, layer: 3 }));
    elements.push(createCircle(clkX, clkY, clkR * 0.06, '#333', { layer: 3 }));
  }

  // WiFi sign
  if (rng.chance(0.7)) {
    const csX = w * rng.nextFloat(0.55, 0.62);
    const csY = wainscotTop - h * 0.08;
    elements.push(createRect(csX, csY, 28, 20, '#2A2A2A', { layer: 3, category: 'sign', modifiable: true, id: uid('csign'), stroke: '#5C3317', strokeWidth: 1.5, filter: 'url(#softShadow)' }));
    elements.push(createText(csX + 4, csY + 12, 'WIFI', '#E0D8C0', { layer: 3, fontSize: 6 }));
  }

  return { elements, defs };
}
