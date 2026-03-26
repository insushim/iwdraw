import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath,
  createLine, createGroup, createText,
} from '../engine/primitives';
import {
  combineDefs, indoorDefs, wallGradient, floorGradient,
  linearGradient, radialGradient, tilesPattern, woodGrainPattern,
  lampGlowGradient,
} from './svg-effects';
import {
  detailedLamp, resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'bk') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// ── Helper components ──

function breadLoaf(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const crustColor = rng.pick(['#C8922A', '#D4A040', '#B88A28', '#DAA848']);
  const loafPath = `M${x - s * 0.4},${y} Q${x - s * 0.45},${y - s * 0.3} ${x - s * 0.2},${y - s * 0.4} Q${x},${y - s * 0.48} ${x + s * 0.2},${y - s * 0.4} Q${x + s * 0.45},${y - s * 0.3} ${x + s * 0.4},${y} Z`;
  children.push(createPath(x, y, loafPath, crustColor, { layer: 3, stroke: '#A07820', strokeWidth: 0.5 }));
  // Score marks on top
  for (let i = 0; i < 3; i++) {
    const sx = x - s * 0.15 + i * s * 0.15;
    children.push(createPath(0, 0, `M${sx},${y - s * 0.35} Q${sx + s * 0.02},${y - s * 0.42} ${sx + s * 0.05},${y - s * 0.35}`, 'none', { layer: 3, stroke: '#8A6818', strokeWidth: 0.8, opacity: 0.5 }));
  }
  // Highlight
  children.push(createEllipse(x - s * 0.1, y - s * 0.38, s * 0.12, s * 0.06, '#E8C060', { layer: 3, opacity: 0.3 }));
  return createGroup(x, y, children, { layer: 3, category: 'bread', modifiable: true, id: uid('loaf') });
}

function baguette(x: number, y: number, s: number, angle: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const color = rng.pick(['#D4A040', '#C89830', '#DAA848']);
  // Long body
  children.push(createEllipse(x, y, s * 0.5, s * 0.08, color, { layer: 3, rotation: angle, stroke: '#A08020', strokeWidth: 0.5 }));
  // Score lines
  for (let i = 0; i < 4; i++) {
    const sx = x - s * 0.3 + i * s * 0.16;
    children.push(createLine(sx, y - s * 0.04, sx + s * 0.06, y + s * 0.04, '#B08830', { strokeWidth: 0.5, layer: 3, opacity: 0.4 }));
  }
  // Tapered ends (slightly darker)
  children.push(createEllipse(x - s * 0.45, y, s * 0.06, s * 0.06, '#B88828', { layer: 3, opacity: 0.5 }));
  children.push(createEllipse(x + s * 0.45, y, s * 0.06, s * 0.06, '#B88828', { layer: 3, opacity: 0.5 }));
  return createGroup(x, y, children, { layer: 3, category: 'bread', modifiable: true, id: uid('baguette') });
}

function pastry(x: number, y: number, s: number, type: string, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  if (type === 'croissant') {
    const color = '#D4A050';
    const cPath = `M${x - s * 0.4},${y} Q${x - s * 0.35},${y - s * 0.3} ${x - s * 0.1},${y - s * 0.25} Q${x},${y - s * 0.15} ${x + s * 0.1},${y - s * 0.25} Q${x + s * 0.35},${y - s * 0.3} ${x + s * 0.4},${y} Q${x + s * 0.2},${y + s * 0.08} ${x},${y + s * 0.05} Q${x - s * 0.2},${y + s * 0.08} ${x - s * 0.4},${y} Z`;
    children.push(createPath(x, y, cPath, color, { layer: 3 }));
    // Layers
    children.push(createPath(0, 0, `M${x - s * 0.25},${y - s * 0.05} Q${x},${y - s * 0.12} ${x + s * 0.25},${y - s * 0.05}`, 'none', { layer: 3, stroke: '#B08830', strokeWidth: 0.6, opacity: 0.4 }));
    children.push(createPath(0, 0, `M${x - s * 0.2},${y + s * 0.02} Q${x},${y - s * 0.04} ${x + s * 0.2},${y + s * 0.02}`, 'none', { layer: 3, stroke: '#B08830', strokeWidth: 0.5, opacity: 0.3 }));
  } else if (type === 'muffin') {
    const topColor = rng.pick(['#8B6914', '#6B4226', '#AA6633', '#CC8844']);
    // Wrapper
    children.push(createPath(x, y, `M${x - s * 0.25},${y} L${x - s * 0.2},${y - s * 0.2} L${x + s * 0.2},${y - s * 0.2} L${x + s * 0.25},${y} Z`, '#E8D8C0', { layer: 3 }));
    // Wrapper lines
    for (let i = 0; i < 4; i++) {
      const lx = x - s * 0.18 + i * s * 0.1;
      children.push(createLine(lx, y, lx + s * 0.02, y - s * 0.2, '#D0C0A0', { strokeWidth: 0.5, layer: 3, opacity: 0.4 }));
    }
    // Muffin top (domed)
    children.push(createPath(x, y, `M${x - s * 0.25},${y - s * 0.2} Q${x - s * 0.28},${y - s * 0.35} ${x},${y - s * 0.42} Q${x + s * 0.28},${y - s * 0.35} ${x + s * 0.25},${y - s * 0.2}`, topColor, { layer: 3 }));
    // Chocolate chips or berries
    for (let i = 0; i < 3; i++) {
      children.push(createCircle(x + rng.nextFloat(-s * 0.12, s * 0.12), y - s * rng.nextFloat(0.25, 0.38), s * 0.025, rng.pick(['#3A1A08', '#5C2E10', '#222']), { layer: 3 }));
    }
  } else if (type === 'cinnamon_roll') {
    const rollColor = '#D4A050';
    children.push(createCircle(x, y - s * 0.15, s * 0.2, rollColor, { layer: 3 }));
    // Spiral
    children.push(createPath(x, y, `M${x},${y - s * 0.15} Q${x + s * 0.08},${y - s * 0.15} ${x + s * 0.08},${y - s * 0.22} Q${x + s * 0.08},${y - s * 0.3} ${x},${y - s * 0.3} Q${x - s * 0.12},${y - s * 0.3} ${x - s * 0.12},${y - s * 0.2} Q${x - s * 0.12},${y - s * 0.1} ${x},${y - s * 0.08}`, 'none', { layer: 3, stroke: '#A07828', strokeWidth: 1, opacity: 0.5 }));
    // Icing
    children.push(createPath(x, y, `M${x - s * 0.12},${y - s * 0.2} Q${x - s * 0.05},${y - s * 0.12} ${x + s * 0.05},${y - s * 0.18} Q${x + s * 0.1},${y - s * 0.22} ${x + s * 0.08},${y - s * 0.1}`, 'none', { layer: 3, stroke: '#FFF8DC', strokeWidth: 2, opacity: 0.7 }));
  }
  return createGroup(x, y, children, { layer: 3, category: 'pastry', modifiable: true, id: uid('pastry') });
}

function cake(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const cakeColor = rng.pick(['#FFF0D0', '#FFE4C4', '#F5DEB3', '#FFD8CC']);
  const frostingColor = rng.pick(['#FF9999', '#FFFFFF', '#CC9966', '#FFB6C1', '#99CCFF']);
  // Base
  children.push(createRect(x - s * 0.3, y - s * 0.4, s * 0.6, s * 0.4, cakeColor, { layer: 3, stroke: '#D0C0A0', strokeWidth: 0.5 }));
  // Frosting layer on top
  children.push(createRect(x - s * 0.32, y - s * 0.44, s * 0.64, s * 0.06, frostingColor, { layer: 3 }));
  // Frosting drips
  for (let i = 0; i < 4; i++) {
    const dx = x - s * 0.25 + i * s * 0.16;
    const dripH = rng.nextFloat(s * 0.05, s * 0.12);
    children.push(createPath(0, 0, `M${dx},${y - s * 0.38} Q${dx + s * 0.02},${y - s * 0.38 + dripH * 0.5} ${dx},${y - s * 0.38 + dripH}`, frostingColor, { layer: 3, stroke: frostingColor, strokeWidth: 3 }));
  }
  // Cherry on top
  if (rng.chance(0.7)) {
    children.push(createCircle(x, y - s * 0.48, s * 0.04, '#CC2222', { layer: 3 }));
    children.push(createCircle(x - s * 0.015, y - s * 0.49, s * 0.012, '#FF6666', { layer: 3, opacity: 0.5 }));
    // Stem
    children.push(createPath(0, 0, `M${x},${y - s * 0.52} Q${x + s * 0.03},${y - s * 0.58} ${x + s * 0.02},${y - s * 0.62}`, 'none', { layer: 3, stroke: '#228B22', strokeWidth: 1 }));
  }
  return createGroup(x, y, children, { layer: 3, category: 'cake', modifiable: true, id: uid('cake') });
}

function displayCase(x: number, y: number, w2: number, h2: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  // Case frame
  children.push(createRect(x, y, w2, h2, '#F5F0E8', { layer: 2, stroke: '#C0B0A0', strokeWidth: 1.5 }));
  // Glass front
  children.push(createRect(x + 2, y + 2, w2 - 4, h2 - 4, '#E0F0FF', { layer: 2, opacity: 0.15 }));
  // Shelves
  const shelfCount = 3;
  for (let i = 1; i < shelfCount; i++) {
    const sy = y + i * (h2 / shelfCount);
    children.push(createRect(x + 2, sy - 1, w2 - 4, 3, '#D0C8B8', { layer: 2 }));
  }
  // Glass highlight
  children.push(createPath(x, y, `M${x + 5},${y + 5} L${x + 15},${y + 5} L${x + 5},${y + 20} Z`, '#FFFFFF', { layer: 2, opacity: 0.15 }));
  return createGroup(x, y, children, { layer: 2, category: 'case', modifiable: false, id: uid('case') });
}

function cashRegister(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const color = rng.pick(['#333', '#4A3020', '#2A2A2A']);
  // Main body
  children.push(createRect(x, y - s * 0.5, s * 0.6, s * 0.5, color, { layer: 3, stroke: '#222', strokeWidth: 1 }));
  // Screen
  children.push(createRect(x + s * 0.08, y - s * 0.45, s * 0.44, s * 0.15, '#1A3A1A', { layer: 3, stroke: '#555', strokeWidth: 0.5 }));
  // Price on screen
  children.push(createText(x + s * 0.12, y - s * 0.34, '$0.00', '#00FF00', { layer: 3, fontSize: 8, category: 'text' }));
  // Buttons
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      children.push(createRect(x + s * 0.08 + col * s * 0.11, y - s * 0.26 + row * s * 0.06, s * 0.08, s * 0.04, '#555', { layer: 3 }));
    }
  }
  // Drawer
  children.push(createRect(x - s * 0.02, y - s * 0.03, s * 0.64, s * 0.04, '#444', { layer: 3 }));
  return createGroup(x, y, children, { layer: 3, category: 'register', modifiable: true, id: uid('reg'), filter: 'url(#softShadow)' });
}

function flourBag(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const bagColor = rng.pick(['#F5F0E0', '#E8E0D0', '#FFF8F0']);
  // Bag body
  const bagPath = `M${x - s * 0.3},${y} L${x - s * 0.25},${y - s * 0.6} Q${x - s * 0.15},${y - s * 0.68} ${x},${y - s * 0.65} Q${x + s * 0.15},${y - s * 0.68} ${x + s * 0.25},${y - s * 0.6} L${x + s * 0.3},${y} Z`;
  children.push(createPath(x, y, bagPath, bagColor, { layer: 3, stroke: '#C0B0A0', strokeWidth: 0.8 }));
  // Label
  children.push(createRect(x - s * 0.18, y - s * 0.45, s * 0.36, s * 0.2, '#FFFFFF', { layer: 3, stroke: '#DDD', strokeWidth: 0.5 }));
  children.push(createText(x - s * 0.12, y - s * 0.32, rng.pick(['FLOUR', 'SUGAR']), '#8B6914', { layer: 3, fontSize: 7, category: 'text' }));
  // Tied top
  children.push(createPath(x, y, `M${x - s * 0.05},${y - s * 0.63} Q${x},${y - s * 0.72} ${x + s * 0.05},${y - s * 0.63}`, 'none', { layer: 3, stroke: '#A08858', strokeWidth: 1.5 }));
  // Flour dust on ground
  children.push(createEllipse(x, y + s * 0.02, s * 0.2, s * 0.03, '#FFF8F0', { layer: 2, opacity: 0.25 }));
  return createGroup(x, y, children, { layer: 3, category: 'bag', modifiable: true, id: uid('bag') });
}

function oven(x: number, y: number, w2: number, h2: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const color = rng.pick(['#333', '#444', '#2A2A2A']);
  // Body
  children.push(createRect(x, y, w2, h2, color, { layer: 2, stroke: '#222', strokeWidth: 1.5 }));
  // Oven door
  children.push(createRect(x + w2 * 0.08, y + h2 * 0.35, w2 * 0.84, h2 * 0.5, '#444', { layer: 2, stroke: '#555', strokeWidth: 1 }));
  // Oven window
  children.push(createRect(x + w2 * 0.15, y + h2 * 0.4, w2 * 0.7, h2 * 0.3, '#1A0A00', { layer: 2, stroke: '#333', strokeWidth: 0.5 }));
  // Oven glow through window
  children.push(createRect(x + w2 * 0.18, y + h2 * 0.43, w2 * 0.64, h2 * 0.24, '#FF6600', { layer: 2, opacity: 0.2 }));
  // Control knobs on top section
  for (let i = 0; i < 4; i++) {
    const kx = x + w2 * 0.2 + i * w2 * 0.18;
    children.push(createCircle(kx, y + h2 * 0.15, w2 * 0.035, '#666', { layer: 2, stroke: '#555', strokeWidth: 0.5 }));
  }
  // Temperature display
  children.push(createRect(x + w2 * 0.35, y + h2 * 0.05, w2 * 0.3, h2 * 0.08, '#1A1A1A', { layer: 2 }));
  children.push(createText(x + w2 * 0.38, y + h2 * 0.12, rng.pick(['180C', '200C', '220C']), '#FF4400', { layer: 2, fontSize: 8, category: 'text' }));
  // Door handle
  children.push(createRect(x + w2 * 0.35, y + h2 * 0.87, w2 * 0.3, w2 * 0.03, '#888', { layer: 2 }));
  return createGroup(x, y, children, { layer: 2, category: 'oven', modifiable: true, id: uid('oven'), filter: 'url(#shadow)' });
}

function menuBoard(x: number, y: number, w2: number, h2: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  // Board
  children.push(createRect(x, y, w2, h2, '#2A2A2A', { layer: 2, stroke: '#5C3317', strokeWidth: 3 }));
  // Title
  children.push(createText(x + w2 * 0.2, y + h2 * 0.16, 'MENU', '#FFF8DC', { layer: 2, fontSize: 14, category: 'text' }));
  children.push(createLine(x + 10, y + h2 * 0.2, x + w2 - 10, y + h2 * 0.2, '#FFF8DC', { strokeWidth: 0.8, layer: 2, opacity: 0.5 }));
  // Menu items
  const items = rng.shuffle(['Sourdough', 'Croissant', 'Baguette', 'Muffin', 'Ciabatta', 'Rye Loaf', 'Danish']);
  const prices = ['$3.50', '$2.80', '$4.00', '$2.50', '$3.80', '$5.00', '$3.20'];
  for (let i = 0; i < Math.min(5, items.length); i++) {
    const iy = y + h2 * 0.28 + i * h2 * 0.13;
    children.push(createText(x + 10, iy, items[i], '#E8D8C0', { layer: 2, fontSize: 8, category: 'text' }));
    children.push(createText(x + w2 - 35, iy, prices[i], '#FFD700', { layer: 2, fontSize: 8, category: 'text' }));
  }
  return createGroup(x, y, children, { layer: 2, category: 'menu', modifiable: true, id: uid('menu'), filter: 'url(#shadow)' });
}

function bakerPerson(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const skinColor = rng.pick(['#FDBCB4', '#D2996C', '#8D5524', '#C68642']);
  // Legs
  children.push(createRect(x - s * 0.06, y - s * 0.22, s * 0.05, s * 0.22, '#333', { layer: 3 }));
  children.push(createRect(x + s * 0.01, y - s * 0.22, s * 0.05, s * 0.22, '#333', { layer: 3 }));
  // Apron / body
  children.push(createRect(x - s * 0.1, y - s * 0.5, s * 0.2, s * 0.3, '#FFFFFF', { layer: 3, stroke: '#DDD', strokeWidth: 0.5 }));
  // Apron strings
  children.push(createPath(x, y, `M${x - s * 0.1},${y - s * 0.35} Q${x - s * 0.15},${y - s * 0.32} ${x - s * 0.08},${y - s * 0.28}`, 'none', { layer: 3, stroke: '#DDD', strokeWidth: 1 }));
  // Shirt under apron (at neck)
  children.push(createRect(x - s * 0.08, y - s * 0.52, s * 0.16, s * 0.04, rng.pick(['#4488CC', '#CC4444', '#228844']), { layer: 3 }));
  // Arms
  children.push(createLine(x - s * 0.1, y - s * 0.44, x - s * 0.18, y - s * 0.32, skinColor, { strokeWidth: s * 0.04, layer: 3 }));
  children.push(createLine(x + s * 0.1, y - s * 0.44, x + s * 0.18, y - s * 0.32, skinColor, { strokeWidth: s * 0.04, layer: 3 }));
  // Head
  children.push(createCircle(x, y - s * 0.58, s * 0.08, skinColor, { layer: 3 }));
  // Eyes
  children.push(createCircle(x - s * 0.025, y - s * 0.59, s * 0.012, '#333', { layer: 3 }));
  children.push(createCircle(x + s * 0.025, y - s * 0.59, s * 0.012, '#333', { layer: 3 }));
  // Smile
  children.push(createPath(x, y, `M${x - s * 0.02},${y - s * 0.56} Q${x},${y - s * 0.54} ${x + s * 0.02},${y - s * 0.56}`, 'none', { layer: 3, stroke: '#333', strokeWidth: 0.8 }));
  // Baker hat (tall chef hat / toque)
  children.push(createRect(x - s * 0.06, y - s * 0.66, s * 0.12, s * 0.02, '#FFFFFF', { layer: 3 }));
  const hatPath = `M${x - s * 0.06},${y - s * 0.66} Q${x - s * 0.08},${y - s * 0.78} ${x - s * 0.04},${y - s * 0.82} Q${x},${y - s * 0.86} ${x + s * 0.04},${y - s * 0.82} Q${x + s * 0.08},${y - s * 0.78} ${x + s * 0.06},${y - s * 0.66} Z`;
  children.push(createPath(x, y, hatPath, '#FFFFFF', { layer: 3, stroke: '#DDD', strokeWidth: 0.5 }));
  // Shoes
  children.push(createEllipse(x - s * 0.04, y + s * 0.01, s * 0.04, s * 0.02, '#333', { layer: 3 }));
  children.push(createEllipse(x + s * 0.04, y + s * 0.01, s * 0.04, s * 0.02, '#333', { layer: 3 }));
  return createGroup(x, y, children, { layer: 3, category: 'baker', modifiable: true, id: uid('baker') });
}

// ══════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ══════════════════════════════════════════════════════════════

export function generateBakeryShop(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  const wallTop = rng.pick(['#FFF5E0', '#FFF0D8', '#FFFAE8', '#F5E8D0']);
  const wallBot = rng.pick(['#F0E0C8', '#E8D8B8', '#F5E0C0']);
  const floorBase = rng.pick(['#A08060', '#907050', '#B09070']);
  const floorLight = rng.pick(['#B09070', '#A08060', '#C0A080']);

  const defs = combineDefs(
    indoorDefs(),
    wallGradient('wallGrad', wallTop, wallBot),
    floorGradient('floorGrad', floorBase, floorLight),
    linearGradient('counterGrad', [
      { offset: '0%', color: '#8B6914' },
      { offset: '50%', color: '#7A5A10' },
      { offset: '100%', color: '#6B4C10' },
    ]),
    radialGradient('warmGlow', [
      { offset: '0%', color: '#FFE8AA', opacity: 0.2 },
      { offset: '60%', color: '#FFD888', opacity: 0.06 },
      { offset: '100%', color: '#FFC868', opacity: 0 },
    ]),
    linearGradient('shelfGrad', [
      { offset: '0%', color: '#8B6914' },
      { offset: '100%', color: '#6B4C10' },
    ]),
    tilesPattern('floorTiles', '#C4A888', '#B09868', 22),
    woodGrainPattern('woodPat', '#7A5A30'),
    lampGlowGradient('bakeryGlow', '#FFE8AA'),
  );

  const wallFloorY = h * 0.68;
  const ceilingY = h * 0.04;

  // ════════════════════════════════════════════
  //  LAYER 0 -- Walls & ceiling
  // ════════════════════════════════════════════
  elements.push(createRect(0, ceilingY, w, wallFloorY - ceilingY, 'url(#wallGrad)', { layer: 0, category: 'wall', modifiable: false }));
  elements.push(createRect(0, 0, w, ceilingY, '#F5E8D0', { layer: 0, category: 'ceiling', modifiable: false }));

  // Warm ambient glow
  elements.push(createCircle(w * 0.5, h * 0.35, 200, 'url(#warmGlow)', { layer: 0, modifiable: false }));

  // Wainscoting (lower wall, wooden)
  const wainscotTop = wallFloorY * 0.6;
  elements.push(createRect(0, wainscotTop, w, wallFloorY - wainscotTop, 'url(#woodPat)', { layer: 0, modifiable: false }));
  elements.push(createRect(0, wainscotTop - 2, w, 4, '#5C3317', { layer: 0, modifiable: false }));

  // ════════════════════════════════════════════
  //  LAYER 0 -- Floor
  // ════════════════════════════════════════════
  elements.push(createRect(0, wallFloorY, w, h - wallFloorY, 'url(#floorTiles)', { layer: 0, category: 'floor', modifiable: false }));
  elements.push(createRect(0, wallFloorY - 2, w, 5, '#5C3317', { layer: 1, modifiable: false }));

  // ════════════════════════════════════════════
  //  LAYER 1 -- Back wall shelves with bread
  // ════════════════════════════════════════════
  const shelfStartX = w * 0.02;
  const shelfW = w * 0.4;
  const shelfCount = 3;
  for (let i = 0; i < shelfCount; i++) {
    const sy = ceilingY + h * 0.08 + i * h * 0.16;
    // Shelf plank
    elements.push(createRect(shelfStartX, sy, shelfW, 6, 'url(#shelfGrad)', { layer: 1, category: 'shelf', modifiable: false, stroke: '#5A4210', strokeWidth: 0.5 }));
    // Shelf brackets
    elements.push(createPath(0, 0, `M${shelfStartX + 10},${sy + 6} L${shelfStartX + 10},${sy + 18} L${shelfStartX + 22},${sy + 6}`, 'none', { layer: 1, stroke: '#5A4210', strokeWidth: 1.5 }));
    elements.push(createPath(0, 0, `M${shelfStartX + shelfW - 10},${sy + 6} L${shelfStartX + shelfW - 10},${sy + 18} L${shelfStartX + shelfW - 22},${sy + 6}`, 'none', { layer: 1, stroke: '#5A4210', strokeWidth: 1.5 }));

    // Baguettes on top shelf
    if (i === 0) {
      for (let b = 0; b < rng.nextInt(3, 5); b++) {
        elements.push(baguette(shelfStartX + 30 + b * 50, sy - 8, rng.nextFloat(32, 42), rng.nextFloat(-10, 10), rng));
      }
    }
    // Bread loaves on middle shelf
    if (i === 1) {
      for (let b = 0; b < rng.nextInt(2, 4); b++) {
        elements.push(breadLoaf(shelfStartX + 30 + b * 55, sy - 2, rng.nextFloat(28, 38), rng));
      }
    }
    // Rolls on bottom shelf
    if (i === 2) {
      for (let b = 0; b < rng.nextInt(4, 6); b++) {
        const rx = shelfStartX + 15 + b * 35;
        elements.push(createCircle(rx, sy - 8, rng.nextFloat(6, 9), rng.pick(['#D4A040', '#C89830', '#DAA848']), { layer: 3, category: 'roll', modifiable: true, id: uid('roll') }));
      }
    }
  }

  // ════════════════════════════════════════════
  //  LAYER 2 -- Display case (center)
  // ════════════════════════════════════════════
  const caseX = w * 0.3;
  const caseY = wallFloorY - 90;
  const caseW = w * 0.38;
  const caseH = 90;
  elements.push(displayCase(caseX, caseY, caseW, caseH, rng));

  // Pastries inside display case
  const pastryTypes = ['croissant', 'muffin', 'cinnamon_roll'];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < rng.nextInt(2, 4); col++) {
      const px = caseX + 25 + col * (caseW / 4);
      const py = caseY + 12 + row * (caseH / 3);
      elements.push(pastry(px, py, rng.nextFloat(18, 24), rng.pick(pastryTypes), rng));
    }
  }

  // Cakes on top of display case
  elements.push(cake(caseX + caseW * 0.25, caseY - 2, rng.nextFloat(28, 36), rng));
  elements.push(cake(caseX + caseW * 0.7, caseY - 2, rng.nextFloat(26, 34), rng));

  // ════════════════════════════════════════════
  //  LAYER 2 -- Counter
  // ════════════════════════════════════════════
  const counterY = wallFloorY - 10;
  elements.push(createRect(caseX - 10, counterY, caseW + 20, 12, 'url(#counterGrad)', { layer: 2, category: 'counter', modifiable: false, stroke: '#5A4210', strokeWidth: 1 }));

  // Cash register on counter
  elements.push(cashRegister(caseX + caseW - 50, counterY - 2, 40, rng));

  // ════════════════════════════════════════════
  //  LAYER 2 -- Menu board (right wall)
  // ════════════════════════════════════════════
  elements.push(menuBoard(w * 0.72, ceilingY + h * 0.06, w * 0.24, h * 0.32, rng));

  // ════════════════════════════════════════════
  //  LAYER 2 -- Oven (back right)
  // ════════════════════════════════════════════
  elements.push(oven(w * 0.75, wallFloorY - 75, 80, 75, rng));

  // ════════════════════════════════════════════
  //  LAYER 3 -- Flour bags
  // ════════════════════════════════════════════
  elements.push(flourBag(w * 0.88, wallFloorY, rng.nextFloat(22, 28), rng));
  elements.push(flourBag(w * 0.93, wallFloorY + 2, rng.nextFloat(20, 26), rng));

  // ════════════════════════════════════════════
  //  LAYER 3 -- Baker with hat
  // ════════════════════════════════════════════
  elements.push(bakerPerson(w * 0.68, wallFloorY - 5, 80, rng));

  // ════════════════════════════════════════════
  //  LAYER 3 -- Pendant lamps
  // ════════════════════════════════════════════
  const lampPositions = [w * 0.25, w * 0.5, w * 0.75];
  for (const lx of lampPositions) {
    elements.push(detailedLamp(lx, ceilingY + 15, rng.nextFloat(28, 38), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 -- Decorative details
  // ════════════════════════════════════════════

  // "BAKERY" sign on wall
  elements.push(createRect(w * 0.42, ceilingY + 3, 120, 28, '#5C3317', { layer: 1, category: 'sign', modifiable: true, id: uid('bsign'), stroke: '#4A2810', strokeWidth: 1.5 }));
  elements.push(createText(w * 0.42 + 12, ceilingY + 22, rng.pick(['BAKERY', 'BOULANGERIE', 'FRESH BAKED']), '#FFF8DC', {
    layer: 1, category: 'text', modifiable: true, id: uid('btxt'), fontSize: 14,
  }));

  // Bread basket on counter
  const basketX = caseX + 10;
  const basketY = counterY - 5;
  const basketW = 40;
  elements.push(createPath(0, 0, `M${basketX},${basketY} Q${basketX - 4},${basketY + 10} ${basketX + 5},${basketY + 12} L${basketX + basketW - 5},${basketY + 12} Q${basketX + basketW + 4},${basketY + 10} ${basketX + basketW},${basketY} Z`, '#D4A850', { layer: 3, category: 'basket', modifiable: true, id: uid('basket'), stroke: '#A08828', strokeWidth: 0.8 }));
  // Small rolls in basket
  for (let i = 0; i < 3; i++) {
    elements.push(createCircle(basketX + 8 + i * 10, basketY - 4, rng.nextFloat(4, 6), '#DAA848', { layer: 3, modifiable: false }));
  }

  // Window on left wall showing outside
  const winX = w * 0.02;
  const winY = ceilingY + h * 0.04;
  const winW = w * 0.12;
  const winH = h * 0.22;
  elements.push(createRect(winX - 3, winY - 3, winW + 6, winH + 6, '#5C3317', { layer: 1, modifiable: false }));
  elements.push(createRect(winX, winY, winW, winH, '#B0D4F1', { layer: 1, category: 'window', modifiable: true, id: uid('win'), opacity: 0.8 }));
  elements.push(createLine(winX + winW / 2, winY, winX + winW / 2, winY + winH, '#5C3317', { strokeWidth: 2, layer: 1 }));
  elements.push(createLine(winX, winY + winH / 2, winX + winW, winY + winH / 2, '#5C3317', { strokeWidth: 2, layer: 1 }));

  return { elements, defs };
}
