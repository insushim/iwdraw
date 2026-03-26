import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath,
  createLine, createGroup, createText,
} from '../engine/primitives';
import {
  combineDefs, indoorDefs, wallGradient, floorGradient, linearGradient,
  radialGradient, checkeredPattern, lampGlowGradient,
} from './svg-effects';
import { detailedBookshelf, resetComponentId } from './svg-components';

let _uid = 0;
function uid(p = 'kr') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

export function generateKidsRoom(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  // ── Color palette ──
  const wallColor1 = rng.pick(['#B8D4F0', '#F0D4E8', '#D4F0B8', '#FFF0B8', '#E0D0F0', '#FFD8C0']);
  const wallColor2 = rng.pick(['#A0C4E0', '#E0C4D8', '#C4E0A8', '#EFE0A8', '#D0C0E0']);
  const floorBase = rng.pick(['#DEB887', '#C4A882', '#D2B48C']);
  const floorDark = rng.pick(['#B89565', '#A08060']);
  const bedColor = rng.pick(['#FF6B6B', '#6BB5FF', '#6BFF6B', '#FFD700', '#FF69B4', '#87CEEB']);
  const bedFrame = rng.pick(['#FFF', '#F0E8D8', '#5C8ACC', '#CC5C8A']);
  const toyChestColor = rng.pick(['#FF6347', '#4169E1', '#32CD32', '#FFD700']);

  // ── SVG Defs ──
  const defs = combineDefs(
    indoorDefs(),
    wallGradient('wallGrad', wallColor1, wallColor2),
    floorGradient('floorGrad', floorBase, floorDark),
    checkeredPattern('carpetPat', '#FF9999', '#9999FF', 12),
    lampGlowGradient('nightGlow', '#FFFACD'),
    radialGradient('starGlow', [
      { offset: '0%', color: '#FFD700', opacity: 0.6 },
      { offset: '100%', color: '#FFD700', opacity: 0 },
    ]),
    linearGradient('rainbowGrad', [
      { offset: '0%', color: '#FF0000' },
      { offset: '17%', color: '#FF8800' },
      { offset: '33%', color: '#FFFF00' },
      { offset: '50%', color: '#00CC00' },
      { offset: '67%', color: '#0088FF' },
      { offset: '83%', color: '#4400FF' },
      { offset: '100%', color: '#8800FF' },
    ], '0%', '50%', '100%', '50%'),
  );

  const wallBottom = h * 0.68;

  // ════════════════════════════════════════════
  //  LAYER 0 — Colorful walls & floor
  // ════════════════════════════════════════════

  // Wall
  elements.push(createRect(0, 0, w, wallBottom, 'url(#wallGrad)', { layer: 0, category: 'wall', modifiable: false }));

  // Chair rail / decorative border
  elements.push(createRect(0, wallBottom * 0.6, w, 5, 'url(#rainbowGrad)', { layer: 0, category: 'wall', modifiable: false, opacity: 0.5 }));

  // Stars on wall (wallpaper pattern)
  for (let i = 0; i < 8; i++) {
    const sx = rng.nextFloat(10, w - 10);
    const sy = rng.nextFloat(10, wallBottom * 0.55);
    elements.push(createText(sx, sy, '\u2605', rng.pick(['#FFD700', '#FF69B4', '#87CEEB', '#98FB98']), {
      fontSize: rng.nextFloat(8, 14), layer: 0, category: 'wall', modifiable: false, opacity: 0.25,
    }));
  }

  // Crown molding
  elements.push(createRect(0, 0, w, 4, '#FFF', { layer: 0, category: 'wall', modifiable: false, opacity: 0.5 }));

  // Floor
  elements.push(createRect(0, wallBottom, w, h - wallBottom, 'url(#floorGrad)', { layer: 0, category: 'floor', modifiable: false }));
  // Floor board lines
  for (let i = 0; i < 12; i++) {
    elements.push(createRect(i * (w / 12), wallBottom, 1, h - wallBottom, '#A0855A', { layer: 0, category: 'floor', modifiable: false, opacity: 0.15 }));
  }
  // Baseboard
  elements.push(createRect(0, wallBottom - 2, w, 5, '#FFF', { layer: 0, category: 'wall', modifiable: false }));

  // ════════════════════════════════════════════
  //  LAYER 1 — Colorful carpet
  // ════════════════════════════════════════════

  const carpetX = w * 0.2;
  const carpetY = h * 0.73;
  const carpetW = w * 0.45;
  const carpetH = h * 0.16;

  elements.push(createRect(carpetX, carpetY, carpetW, carpetH, 'url(#carpetPat)', {
    layer: 1, category: 'carpet', modifiable: true, id: uid('carpet'), filter: 'url(#softShadow)',
  }));
  // Carpet border
  elements.push(createRect(carpetX - 2, carpetY - 2, carpetW + 4, carpetH + 4, 'none', {
    layer: 1, category: 'carpet', modifiable: false, stroke: '#FF6699', strokeWidth: 3, opacity: 0.6,
  }));

  // ════════════════════════════════════════════
  //  LAYER 2 — Bed
  // ════════════════════════════════════════════

  const bedX = w * 0.02;
  const bedY = h * 0.45;
  const bedW = w * 0.35;
  const bedH = h * 0.22;

  // Headboard
  elements.push(createRect(bedX - 4, bedY - bedH * 0.5, 8, bedH * 0.5 + bedH, bedFrame, {
    layer: 2, category: 'bed', modifiable: false, stroke: '#D0C8B8', strokeWidth: 1,
  }));
  // Bed frame
  elements.push(createRect(bedX, bedY, bedW, bedH, bedFrame, {
    layer: 2, category: 'bed', modifiable: false, filter: 'url(#shadow)',
  }));
  // Mattress
  elements.push(createRect(bedX + 3, bedY + 2, bedW - 6, bedH - 10, '#FFF', { layer: 2, category: 'bed', modifiable: false }));
  // Blanket/duvet
  elements.push(createRect(bedX + 3, bedY + 8, bedW - 6, bedH - 14, bedColor, {
    layer: 2, category: 'bed', modifiable: true, id: uid('blanket'), opacity: 0.9,
  }));
  // Blanket fold
  elements.push(createRect(bedX + 3, bedY + 8, bedW - 6, 8, bedColor, {
    layer: 2, category: 'bed', modifiable: false, opacity: 0.7,
  }));
  // Pillow
  const pillowColor = rng.pick(['#FFF', '#FFDAB9', '#B0E0E6', '#FFB6C1']);
  elements.push(createEllipse(bedX + 20, bedY + 8, 18, 8, pillowColor, {
    layer: 3, category: 'bed', modifiable: true, id: uid('pillow'), filter: 'url(#softShadow)',
  }));
  // Bed legs
  elements.push(createRect(bedX + 2, bedY + bedH, 5, 6, bedFrame, { layer: 2, category: 'bed', modifiable: false }));
  elements.push(createRect(bedX + bedW - 7, bedY + bedH, 5, 6, bedFrame, { layer: 2, category: 'bed', modifiable: false }));

  // ════════════════════════════════════════════
  //  LAYER 3 — Stuffed animals on bed
  // ════════════════════════════════════════════

  // Teddy bear
  const bearX = bedX + bedW * 0.65;
  const bearY = bedY + 4;
  const bearColor = rng.pick(['#D2B48C', '#A0784E', '#F5DEB3', '#8B6E4E']);
  elements.push(createEllipse(bearX, bearY + 4, 10, 12, bearColor, {
    layer: 3, category: 'toy', modifiable: true, id: uid('bear'), filter: 'url(#softShadow)',
  }));
  // Bear head
  elements.push(createCircle(bearX, bearY - 8, 8, bearColor, { layer: 3, category: 'toy', modifiable: false }));
  // Ears
  elements.push(createCircle(bearX - 6, bearY - 14, 4, bearColor, { layer: 3, category: 'toy', modifiable: false }));
  elements.push(createCircle(bearX + 6, bearY - 14, 4, bearColor, { layer: 3, category: 'toy', modifiable: false }));
  elements.push(createCircle(bearX - 6, bearY - 14, 2.5, '#D4A574', { layer: 3, category: 'toy', modifiable: false }));
  elements.push(createCircle(bearX + 6, bearY - 14, 2.5, '#D4A574', { layer: 3, category: 'toy', modifiable: false }));
  // Face
  elements.push(createCircle(bearX - 3, bearY - 10, 1.5, '#333', { layer: 3, category: 'toy', modifiable: false }));
  elements.push(createCircle(bearX + 3, bearY - 10, 1.5, '#333', { layer: 3, category: 'toy', modifiable: false }));
  elements.push(createCircle(bearX, bearY - 7, 2, '#333', { layer: 3, category: 'toy', modifiable: false }));
  // Arms
  elements.push(createEllipse(bearX - 9, bearY + 2, 4, 6, bearColor, { layer: 3, category: 'toy', modifiable: false }));
  elements.push(createEllipse(bearX + 9, bearY + 2, 4, 6, bearColor, { layer: 3, category: 'toy', modifiable: false }));

  // Bunny (optional)
  if (rng.chance(0.6)) {
    const bunX = bedX + bedW * 0.4;
    const bunY = bedY + 6;
    const bunColor = rng.pick(['#FFF', '#FFB6C1', '#B0E0E6', '#E6E6FA']);
    elements.push(createEllipse(bunX, bunY + 2, 7, 9, bunColor, {
      layer: 3, category: 'toy', modifiable: true, id: uid('bunny'),
    }));
    elements.push(createCircle(bunX, bunY - 6, 6, bunColor, { layer: 3, category: 'toy', modifiable: false }));
    // Ears (tall)
    elements.push(createEllipse(bunX - 3, bunY - 18, 2.5, 8, bunColor, { layer: 3, category: 'toy', modifiable: false }));
    elements.push(createEllipse(bunX + 3, bunY - 18, 2.5, 8, bunColor, { layer: 3, category: 'toy', modifiable: false }));
    elements.push(createEllipse(bunX - 3, bunY - 18, 1.5, 6, '#FFB6C1', { layer: 3, category: 'toy', modifiable: false, opacity: 0.6 }));
    elements.push(createEllipse(bunX + 3, bunY - 18, 1.5, 6, '#FFB6C1', { layer: 3, category: 'toy', modifiable: false, opacity: 0.6 }));
    // Face
    elements.push(createCircle(bunX - 2, bunY - 7, 1, '#333', { layer: 3 }));
    elements.push(createCircle(bunX + 2, bunY - 7, 1, '#333', { layer: 3 }));
    elements.push(createCircle(bunX, bunY - 5, 1.5, '#FF69B4', { layer: 3, opacity: 0.7 }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Toy chest
  // ════════════════════════════════════════════

  const chestX = w * 0.4;
  const chestY = h * 0.58;
  const chestW = w * 0.16;
  const chestH = h * 0.1;

  elements.push(createRect(chestX, chestY, chestW, chestH, toyChestColor, {
    layer: 2, category: 'chest', modifiable: true, id: uid('chest'), filter: 'url(#shadow)',
  }));
  // Lid (partially open)
  elements.push(createRect(chestX - 2, chestY - 6, chestW + 4, 8, toyChestColor, {
    layer: 2, category: 'chest', modifiable: false, opacity: 0.85,
  }));
  // Latch
  elements.push(createRect(chestX + chestW / 2 - 4, chestY + chestH / 2 - 3, 8, 6, '#DAA520', {
    layer: 2, category: 'chest', modifiable: false,
  }));
  // Toy peeking out
  elements.push(createCircle(chestX + 12, chestY - 3, 5, '#FF4500', { layer: 3, category: 'toy', modifiable: false }));

  // ════════════════════════════════════════════
  //  LAYER 3 — Toys on floor
  // ════════════════════════════════════════════

  // Building blocks
  const blockColors = ['#FF0000', '#00CC00', '#0066FF', '#FFFF00', '#FF6600', '#9900CC'];
  for (let b = 0; b < rng.nextInt(3, 5); b++) {
    const bx = w * 0.5 + rng.nextFloat(-20, 60);
    const by = h * 0.82 + rng.nextFloat(-5, 5);
    const bsize = rng.nextFloat(10, 16);
    elements.push(createRect(bx, by - bsize, bsize, bsize, rng.pick(blockColors), {
      layer: 3, category: 'block', modifiable: true, id: uid('block'), rotation: rng.nextFloat(-15, 15),
    }));
    // Letter on block
    const letter = rng.pick('ABCDEFGHIJKLM'.split(''));
    elements.push(createText(bx + bsize / 2 - 3, by - bsize / 2 + 3, letter, '#FFF', {
      fontSize: bsize * 0.6, layer: 3, category: 'block', modifiable: false, opacity: 0.8,
    }));
  }

  // Toy car
  const carX = w * 0.65;
  const carY = h * 0.85;
  const carColor = rng.pick(['#CC0000', '#0066CC', '#00AA00', '#FF8800']);
  elements.push(createRect(carX, carY - 8, 28, 8, carColor, {
    layer: 3, category: 'toycar', modifiable: true, id: uid('car'),
  }));
  elements.push(createRect(carX + 6, carY - 14, 16, 7, carColor, { layer: 3, category: 'toycar', modifiable: false, opacity: 0.9 }));
  // Windshield
  elements.push(createRect(carX + 8, carY - 13, 5, 5, '#B0D0FF', { layer: 3, category: 'toycar', modifiable: false, opacity: 0.7 }));
  // Wheels
  elements.push(createCircle(carX + 6, carY, 4, '#333', { layer: 3, category: 'toycar', modifiable: false }));
  elements.push(createCircle(carX + 22, carY, 4, '#333', { layer: 3, category: 'toycar', modifiable: false }));
  elements.push(createCircle(carX + 6, carY, 2, '#888', { layer: 3, category: 'toycar', modifiable: false }));
  elements.push(createCircle(carX + 22, carY, 2, '#888', { layer: 3, category: 'toycar', modifiable: false }));

  // Doll (optional)
  if (rng.chance(0.6)) {
    const dollX = w * 0.48;
    const dollY = h * 0.82;
    const dressColor = rng.pick(['#FF69B4', '#9370DB', '#FF6347', '#87CEEB']);
    // Body/dress
    elements.push(createPath(dollX, dollY,
      `M${dollX - 6},${dollY - 8} L${dollX - 10},${dollY + 5} L${dollX + 10},${dollY + 5} L${dollX + 6},${dollY - 8} Z`,
      dressColor, { layer: 3, category: 'doll', modifiable: true, id: uid('doll') }));
    // Head
    elements.push(createCircle(dollX, dollY - 14, 6, '#FDDBB4', { layer: 3, category: 'doll', modifiable: false }));
    // Hair
    elements.push(createPath(dollX, dollY,
      `M${dollX - 6},${dollY - 16} Q${dollX},${dollY - 22} ${dollX + 6},${dollY - 16}`,
      rng.pick(['#4A2810', '#FFD700', '#8B0000', '#1A1A1A']), { layer: 3, category: 'doll', modifiable: false }));
    // Eyes
    elements.push(createCircle(dollX - 2, dollY - 15, 1, '#333', { layer: 3 }));
    elements.push(createCircle(dollX + 2, dollY - 15, 1, '#333', { layer: 3 }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Drawings on wall
  // ════════════════════════════════════════════

  // Child's drawing (sun)
  const drawX = w * 0.42;
  const drawY = h * 0.08;
  elements.push(createRect(drawX, drawY, 50, 40, '#FFF', {
    layer: 2, category: 'drawing', modifiable: true, id: uid('draw1'), filter: 'url(#softShadow)',
  }));
  // Sun in drawing
  elements.push(createCircle(drawX + 38, drawY + 10, 6, '#FFD700', { layer: 3, category: 'drawing', modifiable: false }));
  // House in drawing
  elements.push(createRect(drawX + 10, drawY + 18, 16, 14, '#FF6347', { layer: 3, category: 'drawing', modifiable: false, opacity: 0.7 }));
  elements.push(createPath(drawX, drawY,
    `M${drawX + 8},${drawY + 18} L${drawX + 18},${drawY + 10} L${drawX + 28},${drawY + 18}`,
    '#8B4513', { layer: 3, category: 'drawing', modifiable: false, opacity: 0.7 }));
  // Grass
  elements.push(createRect(drawX + 4, drawY + 32, 42, 4, '#32CD32', { layer: 3, category: 'drawing', modifiable: false, opacity: 0.6 }));

  // Second drawing
  if (rng.chance(0.7)) {
    const d2x = w * 0.55;
    const d2y = h * 0.12;
    elements.push(createRect(d2x, d2y, 40, 35, '#FFF', {
      layer: 2, category: 'drawing', modifiable: true, id: uid('draw2'), filter: 'url(#softShadow)',
    }));
    // Rainbow
    elements.push(createPath(d2x, d2y,
      `M${d2x + 5},${d2y + 25} Q${d2x + 20},${d2y + 5} ${d2x + 35},${d2y + 25}`,
      'none', { stroke: 'url(#rainbowGrad)', strokeWidth: 4, layer: 3, opacity: 0.6 }));
    // Flower
    elements.push(createCircle(d2x + 15, d2y + 28, 3, '#FF69B4', { layer: 3, opacity: 0.7 }));
    elements.push(createLine(d2x + 15, d2y + 31, d2x + 15, d2y + 33, '#32CD32', { strokeWidth: 1.5, layer: 3 }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Alphabet poster
  // ════════════════════════════════════════════

  const posterX = w * 0.72;
  const posterY = h * 0.06;
  const posterW = 55;
  const posterH = 40;

  elements.push(createRect(posterX, posterY, posterW, posterH, '#FFFACD', {
    layer: 2, category: 'poster', modifiable: true, id: uid('poster'), filter: 'url(#softShadow)',
  }));
  // Title
  elements.push(createText(posterX + 6, posterY + 12, 'ABC', '#FF4500', { fontSize: 10, layer: 3, category: 'poster', modifiable: false }));
  // Small letters
  const letters = 'DEFGHIJ';
  for (let l = 0; l < letters.length; l++) {
    const lx = posterX + 5 + (l % 4) * 12;
    const ly = posterY + 22 + Math.floor(l / 4) * 12;
    elements.push(createText(lx, ly, letters[l], rng.pick(['#FF0000', '#0066CC', '#00AA00', '#FF8800', '#9900CC']), {
      fontSize: 8, layer: 3, category: 'poster', modifiable: false, opacity: 0.7,
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Bookshelf with picture books
  // ════════════════════════════════════════════

  const shelfX = w * 0.7;
  const shelfY = wallBottom * 0.5;
  const shelfW = w * 0.13;
  const shelfH = wallBottom - shelfY - 4;
  elements.push(detailedBookshelf(shelfX, shelfY, shelfW, shelfH, rng));

  // ════════════════════════════════════════════
  //  LAYER 3 — Nightlight
  // ════════════════════════════════════════════

  const nlX = w * 0.88;
  const nlY = wallBottom * 0.7;

  // Outlet plate
  elements.push(createRect(nlX - 6, nlY - 2, 12, 10, '#F0F0F0', { layer: 2, category: 'nightlight', modifiable: false }));
  // Nightlight body
  const nlColor = rng.pick(['#FF69B4', '#87CEEB', '#FFD700', '#98FB98', '#DDA0DD']);
  elements.push(createEllipse(nlX, nlY - 10, 10, 12, nlColor, {
    layer: 3, category: 'nightlight', modifiable: true, id: uid('nlight'), filter: 'url(#softShadow)',
  }));
  // Glow
  elements.push(createCircle(nlX, nlY - 10, 25, 'url(#nightGlow)', {
    layer: 1, category: 'nightlight', modifiable: false, opacity: 0.4,
  }));
  // Star shape on nightlight
  elements.push(createText(nlX - 4, nlY - 7, '\u2605', '#FFF', {
    fontSize: 8, layer: 3, category: 'nightlight', modifiable: false, opacity: 0.6,
  }));

  // ════════════════════════════════════════════
  //  LAYER 3 — Window with curtain
  // ════════════════════════════════════════════

  const windowX = w * 0.15;
  const windowW = w * 0.15;
  const windowH = h * 0.25;
  const windowY = h * 0.05;

  elements.push(createRect(windowX - 3, windowY - 3, windowW + 6, windowH + 6, '#FFF', { layer: 1, category: 'window', modifiable: false }));
  elements.push(createRect(windowX, windowY, windowW, windowH, '#87CEEB', { layer: 1, category: 'window', modifiable: false }));
  elements.push(createRect(windowX + windowW / 2 - 1, windowY, 2, windowH, '#FFF', { layer: 1, category: 'window', modifiable: false }));
  elements.push(createRect(windowX, windowY + windowH / 2 - 1, windowW, 2, '#FFF', { layer: 1, category: 'window', modifiable: false }));
  // Window sill
  elements.push(createRect(windowX - 5, windowY + windowH, windowW + 10, 5, '#E8E0D0', { layer: 1, category: 'window', modifiable: false }));
  // Cute curtains
  const cColor = rng.pick(['#FF69B4', '#87CEEB', '#FFD700', '#98FB98']);
  elements.push(createRect(windowX - 15, windowY - 4, 14, windowH + 15, cColor, {
    layer: 1, category: 'curtain', modifiable: true, id: uid('lcurt'), opacity: 0.85,
  }));
  elements.push(createRect(windowX + windowW + 1, windowY - 4, 14, windowH + 15, cColor, {
    layer: 1, category: 'curtain', modifiable: true, id: uid('rcurt'), opacity: 0.85,
  }));

  // ════════════════════════════════════════════
  //  LAYER 3 — Ball on floor
  // ════════════════════════════════════════════

  if (rng.chance(0.7)) {
    const ballX = w * 0.35;
    const ballY = h * 0.88;
    const ballR = rng.nextFloat(8, 12);
    elements.push(createCircle(ballX, ballY, ballR, rng.pick(['#FF4500', '#4169E1', '#32CD32', '#FFD700']), {
      layer: 3, category: 'ball', modifiable: true, id: uid('ball'), filter: 'url(#softShadow)',
    }));
    // Stripe on ball
    elements.push(createRect(ballX - ballR, ballY - 1.5, ballR * 2, 3, '#FFF', {
      layer: 3, category: 'ball', modifiable: false, opacity: 0.4,
    }));
    // Shadow under ball
    elements.push(createEllipse(ballX, ballY + ballR + 1, ballR * 0.8, 2, 'rgba(0,0,0,0.15)', { layer: 1, category: 'ball', modifiable: false }));
  }

  // Crayon box
  if (rng.chance(0.6)) {
    const cbx = w * 0.58;
    const cby = h * 0.85;
    elements.push(createRect(cbx, cby - 12, 22, 14, '#FFCC00', {
      layer: 3, category: 'crayon', modifiable: true, id: uid('cbox'),
    }));
    // Crayons sticking out
    const crayonColors = ['#FF0000', '#0066FF', '#00CC00', '#FF8800', '#9900CC'];
    for (let c = 0; c < 4; c++) {
      elements.push(createRect(cbx + 3 + c * 5, cby - 18 - c * 2, 3, 8, crayonColors[c], {
        layer: 3, category: 'crayon', modifiable: false,
      }));
    }
  }

  // Stacking rings
  if (rng.chance(0.5)) {
    const srx = w * 0.78;
    const sry = h * 0.85;
    // Pole
    elements.push(createRect(srx - 1.5, sry - 25, 3, 25, '#DEB887', { layer: 3, category: 'toy', modifiable: false }));
    // Base
    elements.push(createEllipse(srx, sry, 12, 3, '#DEB887', { layer: 3, category: 'toy', modifiable: false }));
    // Rings
    const ringColors = ['#FF0000', '#FF8800', '#FFFF00', '#00CC00', '#0066FF'];
    for (let r = 0; r < 4; r++) {
      elements.push(createEllipse(srx, sry - 5 - r * 5, 10 - r * 1.5, 3, ringColors[r], {
        layer: 3, category: 'toy', modifiable: true, id: uid('ring'),
      }));
    }
  }

  return { elements, defs };
}
