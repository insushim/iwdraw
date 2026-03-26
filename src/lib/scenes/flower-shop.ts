import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath,
  createLine, createGroup, createText,
} from '../engine/primitives';
import {
  combineDefs, indoorDefs, linearGradient, radialGradient,
  wallGradient, floorGradient, dropShadow, softGlow, lampGlowGradient,
} from './svg-effects';
import { detailedFlower, resetComponentId } from './svg-components';

let _uid = 0;
function uid(p = 'fs') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// Flower bouquet (grouped flowers in wrapper)
function bouquet(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const wrapperColor = rng.pick(['#FFE0E0', '#E0E0FF', '#FFFDE0', '#E0FFE0', '#FFE0FF']);

  // Wrapper (cone shape)
  const wrapPath = `M${x - s * 0.25},${y - s * 0.1} L${x},${y + s * 0.4} L${x + s * 0.25},${y - s * 0.1} Z`;
  children.push(createPath(x, y, wrapPath, wrapperColor, { layer: 3, stroke: '#C8B8B8', strokeWidth: 0.5 }));
  // Wrapper crinkle line
  children.push(createPath(x, y, `M${x - s * 0.22},${y - s * 0.05} Q${x - s * 0.1},${y + s * 0.05} ${x},${y - s * 0.02} Q${x + s * 0.1},${y + s * 0.05} ${x + s * 0.22},${y - s * 0.05}`, 'none', { stroke: '#D0C0C0', strokeWidth: 0.5, layer: 3, opacity: 0.6 }));

  // Flower heads (varied colors sticking out of wrapper)
  const flowerColors = ['#FF4466', '#FF88AA', '#FFDD44', '#FF6600', '#DD44FF', '#FF4488', '#FFAACC'];
  const count = rng.nextInt(5, 8);
  for (let i = 0; i < count; i++) {
    const fx = x + rng.nextFloat(-s * 0.18, s * 0.18);
    const fy = y - rng.nextFloat(s * 0.1, s * 0.35);
    const fr = rng.nextFloat(s * 0.04, s * 0.08);
    const petalColor = rng.pick(flowerColors);
    // Stem stub
    children.push(createLine(fx, fy + fr, fx + rng.nextFloat(-2, 2), y - s * 0.05, '#4A8A30', { strokeWidth: 1, layer: 3, opacity: 0.5 }));
    // Petals
    const petalCount = rng.nextInt(4, 6);
    for (let p = 0; p < petalCount; p++) {
      const angle = (p / petalCount) * Math.PI * 2;
      const px = fx + Math.cos(angle) * fr;
      const py = fy + Math.sin(angle) * fr;
      children.push(createEllipse(px, py, fr * 0.55, fr * 0.3, petalColor, { rotation: p * (360 / petalCount), layer: 3, opacity: 0.85 }));
    }
    // Center
    children.push(createCircle(fx, fy, fr * 0.3, '#FFD700', { layer: 3, opacity: 0.8 }));
  }

  // Ribbon bow
  children.push(createPath(x, y, `M${x - s * 0.08},${y + s * 0.15} Q${x - s * 0.15},${y + s * 0.1} ${x},${y + s * 0.12} Q${x + s * 0.15},${y + s * 0.1} ${x + s * 0.08},${y + s * 0.15}`, rng.pick(['#FF4466', '#4488FF', '#FFD700']), { layer: 3, opacity: 0.9 }));

  return createGroup(x, y, children, { layer: 3, category: 'bouquet', modifiable: true, id: uid('bouq'), filter: 'url(#softShadow)' });
}

// Potted plant
function pottedPlant(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const potColor = rng.pick(['#C85A30', '#8A4A20', '#B84A28', '#A0603A']);

  // Pot
  const potPath = `M${x - s * 0.18},${y} L${x - s * 0.15},${y + s * 0.25} L${x + s * 0.15},${y + s * 0.25} L${x + s * 0.18},${y} Z`;
  children.push(createPath(x, y, potPath, potColor, { layer: 3, stroke: '#6A3A18', strokeWidth: 0.8 }));
  // Pot rim
  children.push(createRect(x - s * 0.2, y - s * 0.03, s * 0.4, s * 0.06, potColor, { layer: 3, stroke: '#6A3A18', strokeWidth: 0.5 }));
  // Soil
  children.push(createEllipse(x, y, s * 0.15, s * 0.04, '#4A3018', { layer: 3 }));

  // Leaves / foliage
  const leafColor = '#3A8A28';
  for (let i = 0; i < rng.nextInt(4, 7); i++) {
    const angle = rng.nextFloat(-Math.PI * 0.8, Math.PI * 0.8);
    const dist = rng.nextFloat(s * 0.15, s * 0.35);
    const lx = x + Math.cos(angle) * dist * 0.4;
    const ly = y - rng.nextFloat(s * 0.1, s * 0.4);
    const leafPath = `M${x},${y - s * 0.05} Q${lx - rng.nextFloat(2, 8)},${ly + dist * 0.3} ${lx},${ly}`;
    children.push(createPath(x, y, leafPath, 'none', { stroke: leafColor, strokeWidth: 2, layer: 3, opacity: rng.nextFloat(0.6, 0.9) }));
    // Leaf blade
    const bladeW = rng.nextFloat(3, 7);
    children.push(createEllipse(lx, ly, bladeW, bladeW * 0.5, leafColor, { layer: 3, opacity: rng.nextFloat(0.5, 0.8), rotation: rng.nextFloat(-30, 30) }));
  }

  return createGroup(x, y, children, { layer: 3, category: 'plant', modifiable: true, id: uid('plant'), filter: 'url(#softShadow)' });
}

// Hanging basket
function hangingBasket(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];

  // Chain/rope from ceiling
  children.push(createLine(x, 0, x, y - s * 0.3, '#888', { strokeWidth: 1.5, layer: 2 }));
  // Basket
  const basketPath = `M${x - s * 0.2},${y - s * 0.1} Q${x - s * 0.25},${y + s * 0.15} ${x},${y + s * 0.2} Q${x + s * 0.25},${y + s * 0.15} ${x + s * 0.2},${y - s * 0.1} Z`;
  children.push(createPath(x, y, basketPath, '#8B6E4E', { layer: 2, stroke: '#6A4A2E', strokeWidth: 1 }));
  // Weave pattern
  for (let i = 0; i < 3; i++) {
    const hy = y - s * 0.05 + i * s * 0.08;
    children.push(createPath(x, y, `M${x - s * 0.18 + i * 0.02},${hy} Q${x},${hy + 3} ${x + s * 0.18 - i * 0.02},${hy}`, 'none', { stroke: '#7A5E3E', strokeWidth: 0.5, layer: 2, opacity: 0.5 }));
  }

  // Flowers cascading down
  const flColors = ['#FF6688', '#FFAA55', '#FF88CC', '#FF4466', '#FFD700'];
  for (let i = 0; i < rng.nextInt(6, 10); i++) {
    const fx = x + rng.nextFloat(-s * 0.25, s * 0.25);
    const fy = y + rng.nextFloat(-s * 0.15, s * 0.3);
    const fr = rng.nextFloat(3, 6);
    children.push(createCircle(fx, fy, fr, rng.pick(flColors), { layer: 2, opacity: rng.nextFloat(0.6, 0.9) }));
  }
  // Greenery
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const lx = x + rng.nextFloat(-s * 0.2, s * 0.2);
    const ly = y + rng.nextFloat(0.1, 0.25) * s;
    children.push(createPath(x, y, `M${x + rng.nextFloat(-5, 5)},${y - s * 0.05} Q${lx},${ly - 5} ${lx},${ly}`, 'none', { stroke: '#4A9A30', strokeWidth: 1.5, layer: 2, opacity: 0.6 }));
  }

  return createGroup(x, y, children, { layer: 2, category: 'basket', modifiable: true, id: uid('bask') });
}

// Vase with flowers
function vase(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const vaseColor = rng.pick(['#4488BB', '#BB4488', '#88BB44', '#CC88AA', '#FFD700', '#AA66CC']);

  // Vase body
  const vasePath = `M${x - s * 0.12},${y - s * 0.35} Q${x - s * 0.2},${y - s * 0.1} ${x - s * 0.15},${y + s * 0.05} L${x + s * 0.15},${y + s * 0.05} Q${x + s * 0.2},${y - s * 0.1} ${x + s * 0.12},${y - s * 0.35} Z`;
  children.push(createPath(x, y, vasePath, vaseColor, { layer: 3, stroke: '#555', strokeWidth: 0.5 }));
  // Neck
  children.push(createRect(x - s * 0.08, y - s * 0.4, s * 0.16, s * 0.06, vaseColor, { layer: 3 }));
  // Vase highlight
  children.push(createPath(x, y, `M${x - s * 0.08},${y - s * 0.3} Q${x - s * 0.12},${y - s * 0.15} ${x - s * 0.1},${y}`, 'none', { stroke: '#FFF', strokeWidth: 1, layer: 3, opacity: 0.2 }));

  // Flowers in vase
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const fx = x + rng.nextFloat(-s * 0.1, s * 0.1);
    const fy = y - s * 0.4 - rng.nextFloat(s * 0.1, s * 0.3);
    // Stem
    children.push(createLine(fx, fy, fx + rng.nextFloat(-2, 2), y - s * 0.35, '#4A8A30', { strokeWidth: 1, layer: 3, opacity: 0.6 }));
    // Flower head
    const fColor = rng.pick(['#FF4466', '#FFAA44', '#FF88CC', '#DD44FF', '#4488FF', '#FFDD44']);
    children.push(createCircle(fx, fy, rng.nextFloat(3, 6), fColor, { layer: 3, opacity: 0.85 }));
    children.push(createCircle(fx, fy, rng.nextFloat(1, 2.5), '#FFE880', { layer: 3, opacity: 0.7 }));
  }

  return createGroup(x, y, children, { layer: 3, category: 'vase', modifiable: true, id: uid('vase'), filter: 'url(#softShadow)' });
}

// Cash register
function cashRegister(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const regColor = '#888080';

  // Main body
  children.push(createRect(x - s * 0.25, y - s * 0.2, s * 0.5, s * 0.25, regColor, { layer: 3, stroke: '#666', strokeWidth: 0.8 }));
  // Screen
  children.push(createRect(x - s * 0.15, y - s * 0.4, s * 0.3, s * 0.15, '#2A2A3A', { layer: 3, stroke: '#444', strokeWidth: 0.5 }));
  // Screen text
  children.push(createText(x - s * 0.08, y - s * 0.28, rng.pick(['$12.50', '$8.99', '$15.00']), '#44FF44', { layer: 3, fontSize: Math.max(6, s * 0.08) }));
  // Buttons (grid)
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 4; c++) {
      children.push(createRect(x - s * 0.18 + c * s * 0.1, y - s * 0.16 + r * s * 0.08, s * 0.07, s * 0.05, rng.pick(['#DDD', '#EEE', '#CCC']), { layer: 3 }));
    }
  }
  // Drawer
  children.push(createRect(x - s * 0.22, y + s * 0.05, s * 0.44, s * 0.04, '#777', { layer: 3, stroke: '#555', strokeWidth: 0.5 }));
  children.push(createCircle(x, y + s * 0.07, s * 0.015, '#999', { layer: 3 }));

  return createGroup(x, y, children, { layer: 3, category: 'register', modifiable: true, id: uid('reg') });
}

// Wrapping paper roll
function wrappingPaper(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const paperColor = rng.pick(['#FFB0C0', '#C0D0FF', '#FFFFA0', '#C0FFD0', '#FFD0FF']);

  // Roll
  children.push(createRect(x - s * 0.04, y - s * 0.4, s * 0.08, s * 0.8, paperColor, { layer: 3, stroke: '#AAA', strokeWidth: 0.3 }));
  // End caps
  children.push(createEllipse(x, y - s * 0.4, s * 0.04, s * 0.025, '#DDD', { layer: 3 }));
  children.push(createEllipse(x, y + s * 0.4, s * 0.04, s * 0.025, '#DDD', { layer: 3 }));
  // Pattern on paper
  for (let i = 0; i < 5; i++) {
    const py = y - s * 0.35 + i * s * 0.15;
    children.push(createCircle(x, py, s * 0.015, '#FFFFFF', { layer: 3, opacity: 0.5 }));
  }

  return createGroup(x, y, children, { layer: 3, category: 'paper', modifiable: true, id: uid('wrap'), rotation: rng.nextFloat(-10, 10) });
}

// Ribbon spool
function ribbonSpool(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const ribbonColor = rng.pick(['#FF4466', '#4488FF', '#FFD700', '#44CC88', '#FF88CC']);

  // Spool body
  children.push(createEllipse(x, y, s * 0.15, s * 0.08, '#DDD', { layer: 3 }));
  children.push(createRect(x - s * 0.15, y - s * 0.06, s * 0.3, s * 0.12, ribbonColor, { layer: 3 }));
  children.push(createEllipse(x, y, s * 0.15, s * 0.08, ribbonColor, { layer: 3, opacity: 0.8 }));
  // Center hole
  children.push(createCircle(x, y, s * 0.04, '#AAA', { layer: 3 }));
  // Trailing ribbon
  children.push(createPath(x, y, `M${x + s * 0.15},${y} Q${x + s * 0.25},${y + s * 0.1} ${x + s * 0.2},${y + s * 0.2} Q${x + s * 0.15},${y + s * 0.25} ${x + s * 0.25},${y + s * 0.3}`, 'none', { stroke: ribbonColor, strokeWidth: 2, layer: 3, opacity: 0.7 }));

  return createGroup(x, y, children, { layer: 3, category: 'ribbon', modifiable: true, id: uid('ribb') });
}

// Shop window with "OPEN" sign
function shopWindow(x: number, y: number, w2: number, h2: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  // Window frame
  children.push(createRect(x, y, w2, h2, '#88BBDD', { layer: 1, stroke: '#F5F0E0', strokeWidth: 4, opacity: 0.3 }));
  // Window dividers
  children.push(createLine(x + w2 / 2, y, x + w2 / 2, y + h2, '#F5F0E0', { strokeWidth: 3, layer: 1 }));
  children.push(createLine(x, y + h2 / 2, x + w2, y + h2 / 2, '#F5F0E0', { strokeWidth: 3, layer: 1 }));
  // Glass reflections
  children.push(createPath(x, y, `M${x + 8},${y + 8} L${x + 12},${y + 8} L${x + 4},${y + h2 * 0.4} L${x + 2},${y + h2 * 0.4} Z`, '#FFF', { layer: 1, opacity: 0.1 }));
  // Outside view (greenery)
  children.push(createRect(x + 2, y + h2 * 0.6, w2 - 4, h2 * 0.38, '#5A9A40', { layer: 1, opacity: 0.2 }));

  // "OPEN" sign (hanging)
  const signX = x + w2 * 0.3;
  const signY = y + h2 * 0.25;
  children.push(createRect(signX, signY, w2 * 0.4, h2 * 0.2, '#FFF', { layer: 2, stroke: '#DDD', strokeWidth: 0.5 }));
  children.push(createText(signX + w2 * 0.08, signY + h2 * 0.14, 'OPEN', '#3A8A3A', {
    layer: 2, category: 'text', modifiable: true, id: uid('open'), fontSize: Math.max(10, h2 * 0.12), fontFamily: 'serif',
  }));
  // Hanging string
  children.push(createLine(signX + w2 * 0.2, y, signX + w2 * 0.2, signY, '#888', { strokeWidth: 0.8, layer: 2 }));

  return createGroup(x, y, children, { layer: 1, category: 'window', modifiable: false });
}

// Awning
function awning(x: number, y: number, w2: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const color1 = rng.pick(['#FF6666', '#FF8844', '#6688FF', '#66AA44']);
  const color2 = '#FFF';
  const awningH = 30;
  const scallops = Math.floor(w2 / 20);

  // Main awning body
  children.push(createRect(x, y, w2, awningH * 0.7, color1, { layer: 1, opacity: 0.9 }));

  // Stripes
  const stripeW = w2 / (scallops * 2);
  for (let i = 0; i < scallops * 2; i += 2) {
    children.push(createRect(x + i * stripeW, y, stripeW, awningH * 0.7, color2, { layer: 1, opacity: 0.8 }));
  }

  // Scalloped edge
  let scPath = `M${x},${y + awningH * 0.7}`;
  const segW = w2 / scallops;
  for (let i = 0; i < scallops; i++) {
    const sx = x + i * segW;
    scPath += ` Q${sx + segW / 2},${y + awningH * 1.1} ${sx + segW},${y + awningH * 0.7}`;
  }
  scPath += ` L${x + w2},${y + awningH * 0.7} Z`;
  children.push(createPath(x, y, scPath, color1, { layer: 1, opacity: 0.85 }));

  return createGroup(x, y, children, { layer: 1, category: 'awning', modifiable: true, id: uid('awn') });
}

// Display shelf
function displayShelf(x: number, y: number, w2: number, h2: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const woodColor = '#8B6E4E';

  // Shelf back
  children.push(createRect(x, y, w2, h2, '#F5F0E0', { layer: 2, stroke: '#D8C8A8', strokeWidth: 0.5 }));
  // Shelf boards (3 shelves)
  for (let i = 0; i < 3; i++) {
    const sy = y + (i + 1) * (h2 / 3.5);
    children.push(createRect(x, sy, w2, h2 * 0.03, woodColor, { layer: 2 }));
  }
  // Side panels
  children.push(createRect(x - 2, y, 4, h2, woodColor, { layer: 2 }));
  children.push(createRect(x + w2 - 2, y, 4, h2, woodColor, { layer: 2 }));

  return createGroup(x, y, children, { layer: 2, category: 'shelf', modifiable: false });
}

export function generateFlowerShop(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  const defs = combineDefs(
    indoorDefs(),
    dropShadow('shadow', 2, 3, 3, 'rgba(0,0,0,0.25)'),
    softGlow('flowerGlow', 6, '#FFB0C0'),
    lampGlowGradient('lampGlow'),
    wallGradient('shopWall', '#FFF8F0', '#F8F0E0'),
    floorGradient('shopFloor', '#C8A878', '#A88858'),
    linearGradient('counterGrad', [
      { offset: '0%', color: '#F5F0E0' },
      { offset: '100%', color: '#E8DCC8' },
    ]),
    radialGradient('warmLight', [
      { offset: '0%', color: '#FFF8E0', opacity: 0.3 },
      { offset: '50%', color: '#FFEECC', opacity: 0.1 },
      { offset: '100%', color: '#FFE8B0', opacity: 0 },
    ]),
    linearGradient('outsideBg', [
      { offset: '0%', color: '#88BBDD' },
      { offset: '100%', color: '#AADDFF' },
    ]),
  );

  // ═══════════════════════════════════════
  // LAYER 0 — Shop interior walls
  // ═══════════════════════════════════════
  elements.push(createRect(0, 0, w, h, 'url(#shopWall)', { layer: 0, category: 'wall', modifiable: false }));

  // Floor
  const floorY = h * 0.68;
  elements.push(createRect(0, floorY, w, h - floorY, 'url(#shopFloor)', { layer: 0, category: 'floor', modifiable: false }));
  // Baseboard
  elements.push(createRect(0, floorY - 2, w, 4, '#A88858', { layer: 1, category: 'wall', modifiable: false }));

  // Floor tiles (subtle)
  const tileSize = 40;
  for (let r = 0; r < Math.ceil((h - floorY) / tileSize); r++) {
    for (let c = 0; c < Math.ceil(w / tileSize); c++) {
      elements.push(createRect(c * tileSize, floorY + r * tileSize, tileSize - 1, tileSize - 1, '#C8A878', {
        layer: 0, category: 'floor', modifiable: false, opacity: rng.nextFloat(0.03, 0.1),
      }));
    }
  }

  // ═══════════════════════════════════════
  // LAYER 0 — Warm ambient light
  // ═══════════════════════════════════════
  elements.push(createCircle(w * 0.5, h * 0.3, w * 0.4, 'url(#warmLight)', { layer: 0, category: 'light', modifiable: false }));

  // ═══════════════════════════════════════
  // LAYER 1 — Shop window (left side)
  // ═══════════════════════════════════════
  const winX = w * 0.02;
  const winY = h * 0.08;
  const winW = w * 0.32;
  const winH = h * 0.48;
  elements.push(shopWindow(winX, winY, winW, winH, rng));

  // ═══════════════════════════════════════
  // LAYER 1 — Awning (outside the window)
  // ═══════════════════════════════════════
  elements.push(awning(winX - 5, winY - 10, winW + 10, rng));

  // ═══════════════════════════════════════
  // LAYER 2 — Display shelves (right wall)
  // ═══════════════════════════════════════
  const shelfX = w * 0.62;
  const shelfY = h * 0.08;
  const shelfW = w * 0.35;
  const shelfH = h * 0.5;
  elements.push(displayShelf(shelfX, shelfY, shelfW, shelfH, rng));

  // ═══════════════════════════════════════
  // LAYER 2 — Counter
  // ═══════════════════════════════════════
  const counterX = w * 0.35;
  const counterY = floorY - h * 0.12;
  const counterW = w * 0.25;
  const counterH = h * 0.12;
  elements.push(createRect(counterX, counterY, counterW, counterH, 'url(#counterGrad)', { layer: 2, category: 'counter', modifiable: false, stroke: '#C8B898', strokeWidth: 1 }));
  // Counter front panel
  elements.push(createRect(counterX, counterY + counterH * 0.1, counterW, counterH * 0.9, '#E8DCC8', { layer: 2, opacity: 0.5, stroke: '#C8B898', strokeWidth: 0.5 }));

  // ═══════════════════════════════════════
  // LAYER 3 — Cash register on counter
  // ═══════════════════════════════════════
  elements.push(cashRegister(counterX + counterW * 0.7, counterY - 5, rng.nextFloat(28, 38), rng));

  // ═══════════════════════════════════════
  // LAYER 3 — Wrapping paper and ribbon on counter
  // ═══════════════════════════════════════
  elements.push(wrappingPaper(counterX + counterW * 0.2, counterY - rng.nextFloat(2, 8), rng.nextFloat(15, 22), rng));
  elements.push(ribbonSpool(counterX + counterW * 0.4, counterY - rng.nextFloat(5, 10), rng.nextFloat(12, 18), rng));

  // ═══════════════════════════════════════
  // LAYER 3 — Bouquets on display (near window)
  // ═══════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(bouquet(
      winX + winW * 0.2 + i * rng.nextFloat(40, 60),
      floorY - rng.nextFloat(15, 30),
      rng.nextFloat(30, 45), rng,
    ));
  }

  // ═══════════════════════════════════════
  // LAYER 3 — Potted plants on floor
  // ═══════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(pottedPlant(
      rng.nextFloat(w * 0.05, w * 0.55),
      floorY - rng.nextFloat(5, 15),
      rng.nextFloat(25, 40), rng,
    ));
  }

  // ═══════════════════════════════════════
  // LAYER 3 — Detailed flowers on shelves (using detailedFlower)
  // ═══════════════════════════════════════
  const flowerTypes: ('daisy' | 'tulip' | 'rose' | 'sunflower')[] = ['daisy', 'tulip', 'rose', 'sunflower'];
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const shelfRow = rng.nextInt(0, 2);
    const fx = shelfX + rng.nextFloat(shelfW * 0.1, shelfW * 0.9);
    const fy = shelfY + (shelfRow + 1) * (shelfH / 3.5) - 5;
    elements.push(detailedFlower(fx, fy, rng.pick(flowerTypes), rng.nextFloat(18, 28), rng));
  }

  // ═══════════════════════════════════════
  // LAYER 3 — Vases with flowers on shelves
  // ═══════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 3); i++) {
    const shelfRow = rng.nextInt(0, 2);
    const vx = shelfX + rng.nextFloat(shelfW * 0.15, shelfW * 0.85);
    const vy = shelfY + (shelfRow + 1) * (shelfH / 3.5) - 8;
    elements.push(vase(vx, vy, rng.nextFloat(20, 30), rng));
  }

  // ═══════════════════════════════════════
  // LAYER 2 — Hanging baskets from ceiling
  // ═══════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 3); i++) {
    elements.push(hangingBasket(
      w * (0.15 + i * 0.3) + rng.nextFloat(-20, 20),
      rng.nextFloat(h * 0.08, h * 0.18),
      rng.nextFloat(30, 45), rng,
    ));
  }

  // ═══════════════════════════════════════
  // LAYER 3 — Shop name text
  // ═══════════════════════════════════════
  elements.push(createText(w * 0.4, h * 0.04 + 14, rng.pick(['Bloom & Petal', 'Rose Garden', 'Flower Paradise', 'Daisy Lane']), '#8A5040', {
    layer: 3, category: 'text', modifiable: true, id: uid('name'), fontSize: 16, fontFamily: 'serif',
  }));

  // ═══════════════════════════════════════
  // LAYER 4 — Soft vignette
  // ═══════════════════════════════════════
  elements.push(createRect(0, 0, w, h * 0.03, '#F8E8D0', { layer: 4, category: 'vignette', modifiable: false, opacity: 0.3 }));
  elements.push(createRect(0, h * 0.97, w, h * 0.03, '#D8C0A0', { layer: 4, category: 'vignette', modifiable: false, opacity: 0.2 }));

  return { elements, defs };
}
