import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath,
  createLine, createGroup, createText,
} from '../engine/primitives';
import {
  combineDefs, outdoorDefs, skyGradient, linearGradient,
  radialGradient, groundGradient, brickPattern,
} from './svg-effects';
import {
  detailedPerson, detailedCloud, detailedBird, resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'ms') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// ── Helper components ──

function awning(x: number, y: number, w2: number, h2: number, color: string, stripeColor: string, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  // Main canopy shape - slightly curved
  const canopyPath = `M${x},${y} L${x + w2},${y} L${x + w2 + 8},${y + h2} L${x - 8},${y + h2} Z`;
  children.push(createPath(x, y, canopyPath, color, { layer: 2, stroke: '#333', strokeWidth: 0.5 }));
  // Stripes
  const stripeCount = Math.floor(w2 / 12);
  for (let i = 0; i < stripeCount; i += 2) {
    const sx = x + i * (w2 / stripeCount);
    const sw = w2 / stripeCount;
    const sPath = `M${sx},${y} L${sx + sw},${y} L${sx + sw + (8 * sw / w2)},${y + h2} L${sx - (8 * sw / w2)},${y + h2} Z`;
    children.push(createPath(x, y, sPath, stripeColor, { layer: 2, opacity: 0.7 }));
  }
  // Scalloped bottom edge
  const scallops = Math.floor(w2 / 20);
  for (let i = 0; i < scallops; i++) {
    const sx = x - 8 + i * ((w2 + 16) / scallops);
    const scW = (w2 + 16) / scallops;
    children.push(createPath(x, y, `M${sx},${y + h2} Q${sx + scW / 2},${y + h2 + 8} ${sx + scW},${y + h2}`, 'none', { layer: 2, stroke: color, strokeWidth: 2 }));
  }
  // Support poles
  children.push(createRect(x - 2, y, 4, h2 + 80, '#666', { layer: 1, stroke: '#555', strokeWidth: 0.5 }));
  children.push(createRect(x + w2 - 2, y, 4, h2 + 80, '#666', { layer: 1, stroke: '#555', strokeWidth: 0.5 }));
  return createGroup(x, y, children, { layer: 2, category: 'awning', modifiable: true, id: uid('awning') });
}

function fruitCrate(x: number, y: number, s: number, fruitType: string, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const crateW = s * 0.8;
  const crateH = s * 0.5;
  // Wooden crate
  children.push(createRect(x, y, crateW, crateH, '#A0784C', { layer: 3, stroke: '#7A5A30', strokeWidth: 1 }));
  // Wood grain lines
  children.push(createLine(x, y + crateH * 0.3, x + crateW, y + crateH * 0.3, '#8A6838', { strokeWidth: 0.8, layer: 3, opacity: 0.5 }));
  children.push(createLine(x, y + crateH * 0.6, x + crateW, y + crateH * 0.6, '#8A6838', { strokeWidth: 0.8, layer: 3, opacity: 0.5 }));

  // Fruits piled on top
  const fruitColors: Record<string, string[]> = {
    apple: ['#CC2222', '#DD3333', '#BB1111', '#EE4444'],
    orange: ['#FF8C00', '#FFA500', '#E87A00', '#FFB347'],
    banana: ['#FFE135', '#F5D033', '#FFDA2B'],
    tomato: ['#FF4444', '#EE3333', '#DD2222', '#FF5555'],
    lemon: ['#FFF44F', '#FFE633', '#FFD700'],
    grape: ['#6A0DAD', '#7B1FA2', '#551A8B', '#8E24AA'],
  };
  const colors = fruitColors[fruitType] || fruitColors.apple;
  const fruitR = s * rng.nextFloat(0.06, 0.09);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < rng.nextInt(3, 5); col++) {
      const fx = x + crateW * 0.12 + col * crateW * 0.2 + rng.nextFloat(-2, 2);
      const fy = y - fruitR * (row + 0.5) + rng.nextFloat(-1, 1);
      children.push(createCircle(fx, fy, fruitR, rng.pick(colors), { layer: 3, opacity: 0.95 }));
      // Small highlight
      children.push(createCircle(fx - fruitR * 0.25, fy - fruitR * 0.25, fruitR * 0.25, '#FFFFFF', { layer: 3, opacity: 0.25 }));
    }
  }
  return createGroup(x, y, children, { layer: 3, category: 'crate', modifiable: true, id: uid('crate') });
}

function priceSign(x: number, y: number, text: string, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const signW = 36;
  const signH = 20;
  const bgColor = rng.pick(['#FFF8DC', '#FFFFF0', '#FFF5EE', '#FFF0E0']);
  children.push(createRect(x - signW / 2, y - signH / 2, signW, signH, bgColor, { layer: 4, stroke: '#333', strokeWidth: 0.8 }));
  children.push(createText(x - signW / 2 + 4, y + 4, text, '#333', { layer: 4, fontSize: 9, category: 'price' }));
  // Stick/pin
  children.push(createLine(x, y + signH / 2, x, y + signH / 2 + 12, '#666', { strokeWidth: 1.5, layer: 3 }));
  return createGroup(x, y, children, { layer: 4, category: 'sign', modifiable: true, id: uid('sign') });
}

function fishStall(x: number, y: number, w2: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  // Ice bed
  children.push(createRect(x, y, w2, 35, '#D0E8F0', { layer: 3, stroke: '#A0B8C8', strokeWidth: 1 }));
  // Ice texture
  for (let i = 0; i < 8; i++) {
    children.push(createCircle(x + rng.nextFloat(5, w2 - 5), y + rng.nextFloat(3, 32), rng.nextFloat(2, 5), '#E8F4FF', { layer: 3, opacity: 0.5 }));
  }
  // Fish
  const fishCount = rng.nextInt(3, 5);
  for (let i = 0; i < fishCount; i++) {
    const fx = x + 15 + i * (w2 - 30) / fishCount;
    const fy = y + 10 + rng.nextFloat(-3, 10);
    const fishSize = rng.nextFloat(14, 22);
    const fishColor = rng.pick(['#708090', '#B0C4DE', '#87CEEB', '#A9A9A9', '#C0C0C0']);
    // Fish body
    const fishBody = `M${fx - fishSize},${fy} Q${fx - fishSize * 0.3},${fy - fishSize * 0.4} ${fx + fishSize * 0.3},${fy} Q${fx - fishSize * 0.3},${fy + fishSize * 0.4} ${fx - fishSize},${fy} Z`;
    children.push(createPath(fx, fy, fishBody, fishColor, { layer: 3 }));
    // Tail
    const tailPath = `M${fx - fishSize},${fy} L${fx - fishSize * 1.3},${fy - fishSize * 0.3} L${fx - fishSize * 1.3},${fy + fishSize * 0.3} Z`;
    children.push(createPath(fx, fy, tailPath, fishColor, { layer: 3, opacity: 0.85 }));
    // Eye
    children.push(createCircle(fx + fishSize * 0.1, fy - fishSize * 0.08, fishSize * 0.06, '#1A1A1A', { layer: 3 }));
  }
  return createGroup(x, y, children, { layer: 3, category: 'fish', modifiable: true, id: uid('fish') });
}

function hangingLantern(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const color = rng.pick(['#CC2222', '#FFD700', '#FF8C00', '#228B22', '#4169E1']);
  // String
  children.push(createLine(x, y - size * 2, x, y - size * 0.5, '#333', { strokeWidth: 1, layer: 3 }));
  // Lantern body
  const lanternPath = `M${x - size * 0.4},${y - size * 0.3} Q${x - size * 0.5},${y + size * 0.2} ${x - size * 0.3},${y + size * 0.5} L${x + size * 0.3},${y + size * 0.5} Q${x + size * 0.5},${y + size * 0.2} ${x + size * 0.4},${y - size * 0.3} Z`;
  children.push(createPath(x, y, lanternPath, color, { layer: 3, opacity: 0.85 }));
  // Top cap
  children.push(createRect(x - size * 0.25, y - size * 0.45, size * 0.5, size * 0.15, '#555', { layer: 3 }));
  // Glow
  children.push(createCircle(x, y + size * 0.1, size * 0.2, '#FFEEAA', { layer: 3, opacity: 0.3 }));
  // Ribs
  children.push(createLine(x, y - size * 0.3, x, y + size * 0.5, color, { strokeWidth: 0.5, layer: 3, opacity: 0.4 }));
  return createGroup(x, y, children, { layer: 3, category: 'lantern', modifiable: true, id: uid('lantern') });
}

function basket(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const basketColor = rng.pick(['#B8860B', '#D2961A', '#C4882A', '#A07828']);
  // Body
  const basketPath = `M${x - size * 0.5},${y - size * 0.3} Q${x - size * 0.55},${y + size * 0.1} ${x - size * 0.4},${y + size * 0.35} L${x + size * 0.4},${y + size * 0.35} Q${x + size * 0.55},${y + size * 0.1} ${x + size * 0.5},${y - size * 0.3} Z`;
  children.push(createPath(x, y, basketPath, basketColor, { layer: 3, stroke: '#8B6914', strokeWidth: 0.8 }));
  // Weave lines
  for (let i = 0; i < 4; i++) {
    const ly = y - size * 0.2 + i * size * 0.15;
    children.push(createLine(x - size * 0.45, ly, x + size * 0.45, ly, '#8B6914', { strokeWidth: 0.6, layer: 3, opacity: 0.4 }));
  }
  // Handle
  children.push(createPath(x, y, `M${x - size * 0.3},${y - size * 0.3} Q${x},${y - size * 0.7} ${x + size * 0.3},${y - size * 0.3}`, 'none', { layer: 3, stroke: basketColor, strokeWidth: 3 }));
  return createGroup(x, y, children, { layer: 3, category: 'basket', modifiable: true, id: uid('basket') });
}

// ══════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ══════════════════════════════════════════════════════════════

export function generateMarketStall(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  const skyTop = rng.pick(['#4A90D9', '#5C9EE0', '#3A80C8']);
  const skyMid = rng.pick(['#7AB8E0', '#8AC4E8', '#6CB0D8']);
  const skyBot = rng.pick(['#B0D4F1', '#C0DDEE', '#A8CDE8']);

  const defs = combineDefs(
    outdoorDefs(),
    skyGradient('skyGrad', skyTop, skyMid, skyBot),
    groundGradient('groundGrad', '#A89070', '#887058'),
    linearGradient('cobbleGrad', [
      { offset: '0%', color: '#B0A090' },
      { offset: '50%', color: '#A09080' },
      { offset: '100%', color: '#908070' },
    ]),
    brickPattern('brickPat', '#C0A080', '#B5533C'),
    radialGradient('stallGlow', [
      { offset: '0%', color: '#FFF8E0', opacity: 0.15 },
      { offset: '100%', color: '#FFF8E0', opacity: 0 },
    ]),
  );

  // ════════════════════════════════════════════
  //  LAYER 0 -- Sky
  // ════════════════════════════════════════════
  elements.push(createRect(0, 0, w, h * 0.4, 'url(#skyGrad)', { layer: 0, category: 'sky', modifiable: false }));

  // Clouds
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(detailedCloud(rng.nextFloat(30, w - 100), rng.nextFloat(15, h * 0.15), rng.nextFloat(40, 70), rng));
  }

  // Sun
  const sunX = w * 0.85;
  const sunY = h * 0.08;
  elements.push(createCircle(sunX, sunY, 25, '#FFD700', { layer: 0, category: 'sun', modifiable: true, id: uid('sun'), opacity: 0.9 }));
  elements.push(createCircle(sunX, sunY, 40, '#FFD700', { layer: 0, category: 'sun', modifiable: false, opacity: 0.1 }));

  // ════════════════════════════════════════════
  //  LAYER 0 -- Background buildings
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(4, 6); i++) {
    const bx = i * (w / 5) + rng.nextFloat(-15, 15);
    const bh = rng.nextFloat(80, 180);
    const bw = rng.nextFloat(50, 80);
    const shade = rng.nextHSL([20, 40], [15, 30], [60, 75]);
    elements.push(createRect(bx, h * 0.4 - bh, bw, bh, shade, { layer: 0, category: 'building', modifiable: false, opacity: 0.6 }));
    // Windows
    for (let wy = 10; wy < bh - 15; wy += 18) {
      for (let wx = 6; wx < bw - 10; wx += 14) {
        if (rng.chance(0.5)) {
          elements.push(createRect(bx + wx, h * 0.4 - bh + wy, 6, 8, '#FFF8DC', { layer: 0, opacity: 0.4 }));
        }
      }
    }
  }

  // ════════════════════════════════════════════
  //  LAYER 1 -- Ground / cobblestone
  // ════════════════════════════════════════════
  elements.push(createRect(0, h * 0.4, w, h * 0.6, 'url(#groundGrad)', { layer: 1, category: 'ground', modifiable: false }));
  // Cobblestone texture
  for (let i = 0; i < 30; i++) {
    const cx = rng.nextFloat(5, w - 5);
    const cy = rng.nextFloat(h * 0.55, h - 10);
    const cr = rng.nextFloat(4, 8);
    elements.push(createEllipse(cx, cy, cr, cr * 0.6, rng.pick(['#968070', '#A89080', '#B0A090', '#C0B0A0']), {
      layer: 1, category: 'cobble', modifiable: false, opacity: 0.35, stroke: '#706050', strokeWidth: 0.5,
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 -- Market stalls with awnings
  // ════════════════════════════════════════════

  // Stall 1: Fruit stall (left)
  const stall1X = 20;
  const stall1Y = h * 0.28;
  const awningW1 = 200;
  const awningColor1 = rng.pick(['#CC3333', '#DD4444', '#BB2222']);
  const awningStripe1 = rng.pick(['#FFFFFF', '#FFE4C4', '#FFF8DC']);
  elements.push(awning(stall1X, stall1Y, awningW1, 30, awningColor1, awningStripe1, rng));

  // Table surface under awning
  elements.push(createRect(stall1X, stall1Y + 55, awningW1, 8, '#8B6914', { layer: 2, category: 'table', modifiable: false, stroke: '#6B4C10', strokeWidth: 0.5 }));
  // Table legs
  elements.push(createRect(stall1X + 5, stall1Y + 63, 4, 40, '#6B4C10', { layer: 2, modifiable: false }));
  elements.push(createRect(stall1X + awningW1 - 9, stall1Y + 63, 4, 40, '#6B4C10', { layer: 2, modifiable: false }));

  // Fruit crates on the table
  elements.push(fruitCrate(stall1X + 5, stall1Y + 20, 55, 'apple', rng));
  elements.push(fruitCrate(stall1X + 55, stall1Y + 18, 50, 'orange', rng));
  elements.push(fruitCrate(stall1X + 110, stall1Y + 22, 48, 'banana', rng));
  elements.push(fruitCrate(stall1X + 155, stall1Y + 20, 45, 'lemon', rng));

  // Price signs
  elements.push(priceSign(stall1X + 30, stall1Y + 12, '$2.50', rng));
  elements.push(priceSign(stall1X + 85, stall1Y + 10, '$1.80', rng));
  elements.push(priceSign(stall1X + 135, stall1Y + 14, '$3.00', rng));

  // Stall 2: Fish stall (center-right)
  const stall2X = 300;
  const stall2Y = h * 0.3;
  const awningW2 = 180;
  const awningColor2 = rng.pick(['#336699', '#2255AA', '#4477BB']);
  const awningStripe2 = '#FFFFFF';
  elements.push(awning(stall2X, stall2Y, awningW2, 28, awningColor2, awningStripe2, rng));

  // Fish display table
  elements.push(createRect(stall2X, stall2Y + 52, awningW2, 8, '#8B7B5B', { layer: 2, modifiable: false, stroke: '#6B5B3B', strokeWidth: 0.5 }));
  elements.push(createRect(stall2X + 5, stall2Y + 60, 4, 38, '#6B5B3B', { layer: 2, modifiable: false }));
  elements.push(createRect(stall2X + awningW2 - 9, stall2Y + 60, 4, 38, '#6B5B3B', { layer: 2, modifiable: false }));
  elements.push(fishStall(stall2X + 10, stall2Y + 16, awningW2 - 20, rng));

  // Fish price sign
  elements.push(priceSign(stall2X + 90, stall2Y + 8, 'FRESH!', rng));

  // Stall 3: Vegetable stall (far right)
  const stall3X = 560;
  const stall3Y = h * 0.26;
  const awningW3 = 210;
  const awningColor3 = rng.pick(['#228B22', '#2E8B22', '#339933']);
  const awningStripe3 = rng.pick(['#FFD700', '#FFF8DC', '#FFFFFF']);
  elements.push(awning(stall3X, stall3Y, awningW3, 32, awningColor3, awningStripe3, rng));

  // Table
  elements.push(createRect(stall3X, stall3Y + 58, awningW3, 8, '#A07848', { layer: 2, modifiable: false, stroke: '#806038', strokeWidth: 0.5 }));
  elements.push(createRect(stall3X + 5, stall3Y + 66, 4, 36, '#806038', { layer: 2, modifiable: false }));
  elements.push(createRect(stall3X + awningW3 - 9, stall3Y + 66, 4, 36, '#806038', { layer: 2, modifiable: false }));
  elements.push(fruitCrate(stall3X + 10, stall3Y + 24, 52, 'tomato', rng));
  elements.push(fruitCrate(stall3X + 70, stall3Y + 22, 55, 'grape', rng));
  elements.push(fruitCrate(stall3X + 135, stall3Y + 26, 50, 'apple', rng));

  // Price signs for stall 3
  elements.push(priceSign(stall3X + 40, stall3Y + 16, '$4.00', rng));
  elements.push(priceSign(stall3X + 160, stall3Y + 18, '$5.50', rng));

  // ════════════════════════════════════════════
  //  LAYER 3 -- Hanging goods & lanterns
  // ════════════════════════════════════════════

  // Hanging lanterns between stalls
  elements.push(hangingLantern(250, h * 0.18, 12, rng));
  elements.push(hangingLantern(520, h * 0.16, 14, rng));
  elements.push(hangingLantern(680, h * 0.19, 11, rng));

  // String lights connecting stalls
  const stringY = h * 0.22;
  elements.push(createPath(0, 0, `M${stall1X + 100},${stringY} Q${250},${stringY - 15} ${stall2X + 90},${stringY}`, 'none', {
    layer: 2, stroke: '#444', strokeWidth: 1, category: 'string', modifiable: false,
  }));
  elements.push(createPath(0, 0, `M${stall2X + 90},${stringY} Q${440},${stringY - 12} ${stall3X + 100},${stringY}`, 'none', {
    layer: 2, stroke: '#444', strokeWidth: 1, category: 'string', modifiable: false,
  }));

  // ════════════════════════════════════════════
  //  LAYER 3 -- Baskets on ground
  // ════════════════════════════════════════════
  elements.push(basket(80, h * 0.78, 28, rng));
  elements.push(basket(450, h * 0.82, 24, rng));

  // ════════════════════════════════════════════
  //  LAYER 3 -- People shopping
  // ════════════════════════════════════════════
  const personPositions = [
    { x: 100, y: h * 0.72 },
    { x: 180, y: h * 0.75 },
    { x: 350, y: h * 0.7 },
    { x: 430, y: h * 0.74 },
    { x: 600, y: h * 0.73 },
    { x: 700, y: h * 0.76 },
  ];
  for (const pos of personPositions) {
    if (rng.chance(0.85)) {
      elements.push(detailedPerson(pos.x, pos.y, rng.nextFloat(55, 75), rng));
    }
  }

  // ════════════════════════════════════════════
  //  LAYER 4 -- Birds in sky
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(detailedBird(rng.nextFloat(50, w - 50), rng.nextFloat(10, h * 0.18), true, rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 4 -- Foreground crates / details
  // ════════════════════════════════════════════

  // Stacked wooden crates in foreground
  const fgCrateX = rng.nextFloat(10, 50);
  const fgCrateY = h * 0.88;
  elements.push(createRect(fgCrateX, fgCrateY, 40, 30, '#A0784C', { layer: 4, category: 'crate', modifiable: true, id: uid('fgcrate'), stroke: '#7A5830', strokeWidth: 1 }));
  elements.push(createRect(fgCrateX + 5, fgCrateY - 28, 35, 28, '#B08858', { layer: 4, category: 'crate', modifiable: false, stroke: '#8A6838', strokeWidth: 1 }));

  // Scattered produce on ground
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const fx = rng.nextFloat(100, w - 100);
    const fy = rng.nextFloat(h * 0.85, h * 0.92);
    elements.push(createCircle(fx, fy, rng.nextFloat(3, 5), rng.pick(['#CC2222', '#FFA500', '#FFE135']), {
      layer: 4, category: 'produce', modifiable: true, id: uid('loose'),
    }));
  }

  // Market sign (large wooden sign)
  const signX = w * 0.4;
  const signY = h * 0.08;
  elements.push(createRect(signX, signY, 160, 35, '#6B4226', { layer: 2, category: 'sign', modifiable: true, id: uid('msign'), stroke: '#4A2810', strokeWidth: 2, filter: 'url(#shadow)' }));
  elements.push(createText(signX + 18, signY + 24, rng.pick(['MARKET', 'FRESH MARKET', 'BAZAAR']), '#FFF8DC', {
    layer: 2, category: 'text', modifiable: true, id: uid('mtxt'), fontSize: 16,
  }));

  return { elements, defs };
}
