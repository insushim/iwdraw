import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath,
  createLine, createGroup, createText,
} from '../engine/primitives';
import {
  combineDefs, indoorDefs, wallGradient, floorGradient, linearGradient,
  radialGradient, tilesPattern, woodGrainPattern,
} from './svg-effects';
import { detailedTable, detailedFlower, resetComponentId } from './svg-components';

let _uid = 0;
function uid(p = 'kt') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

export function generateKitchenTable(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  // ── Color palette ──
  const wallBase = rng.pick(['#FFF8E7', '#FFFDE0', '#F5F0E0', '#FFF5E1', '#EEECD8']);
  const wallDark = rng.pick(['#EDE5C8', '#E8DFBA', '#DDD8C0']);
  const tileColor = rng.pick(['#D4C8A8', '#C4B898', '#E0D8C0', '#BFCFCF']);
  const tileGrout = rng.pick(['#B0A888', '#A09878', '#8E9E9E']);
  const cabinetColor = rng.pick(['#F5F0E8', '#E8DCC8', '#5C7A5C', '#4A6A8A', '#8B6E50']);
  const cabinetDark = rng.pick(['#D8CEB8', '#C4B8A0', '#4A6A4A', '#3A5A7A', '#7A5E40']);
  const counterColor = rng.pick(['#E8E0D0', '#D0C8B8', '#A09080', '#C0B8A8']);
  const tableColor = rng.pick(['#A0784E', '#8B6E4E', '#7A5E3E', '#6B4E2E']);
  const curtainColor = rng.nextColor([0, 360], [30, 60], [60, 80]);
  const fridgeColor = rng.pick(['#E8E8E8', '#D0D0D0', '#F0F0F0', '#C8D0D8']);
  const stoveColor = rng.pick(['#333333', '#4A4A4A', '#555555']);

  // ── SVG Defs ──
  const defs = combineDefs(
    indoorDefs(),
    wallGradient('wallGrad', wallBase, wallDark),
    floorGradient('floorGrad', tileColor, tileGrout),
    tilesPattern('tilePat', tileColor, tileGrout, 22),
    woodGrainPattern('woodPat', tableColor),
    linearGradient('skyGrad', [
      { offset: '0%', color: '#87CEEB' },
      { offset: '100%', color: '#B0E0FF' },
    ]),
    linearGradient('counterGrad', [
      { offset: '0%', color: counterColor },
      { offset: '100%', color: '#B8B0A0' },
    ]),
    radialGradient('stoveGlow', [
      { offset: '0%', color: '#FF4400', opacity: 0.4 },
      { offset: '100%', color: '#FF4400', opacity: 0 },
    ]),
  );

  const wallBottom = h * 0.65;

  // ════════════════════════════════════════════
  //  LAYER 0 — Walls & floor
  // ════════════════════════════════════════════

  // Wall
  elements.push(createRect(0, 0, w, wallBottom, 'url(#wallGrad)', { layer: 0, category: 'wall', modifiable: false }));

  // Backsplash tile area behind counter
  elements.push(createRect(0, wallBottom * 0.45, w, wallBottom * 0.55, '#F0EBE0', { layer: 0, category: 'wall', modifiable: false, opacity: 0.4 }));

  // Floor tiles
  elements.push(createRect(0, wallBottom, w, h - wallBottom, 'url(#tilePat)', { layer: 0, category: 'floor', modifiable: false }));

  // Baseboard
  elements.push(createRect(0, wallBottom - 3, w, 6, '#A09070', { layer: 0, category: 'wall', modifiable: false }));

  // Crown molding
  elements.push(createRect(0, 0, w, 4, '#E8D8C0', { layer: 0, category: 'wall', modifiable: false, opacity: 0.7 }));

  // ════════════════════════════════════════════
  //  LAYER 1 — Window
  // ════════════════════════════════════════════

  const windowX = w * 0.35;
  const windowW = w * 0.18;
  const windowH = h * 0.3;
  const windowY = h * 0.06;

  // Window frame
  elements.push(createRect(windowX - 4, windowY - 4, windowW + 8, windowH + 8, '#FFF', { layer: 1, category: 'window', modifiable: false }));
  // Sky
  elements.push(createRect(windowX, windowY, windowW, windowH, 'url(#skyGrad)', { layer: 1, category: 'window', modifiable: false }));
  // Cross bars
  elements.push(createRect(windowX + windowW / 2 - 1.5, windowY, 3, windowH, '#FFF', { layer: 1, category: 'window', modifiable: false }));
  elements.push(createRect(windowX, windowY + windowH / 2 - 1.5, windowW, 3, '#FFF', { layer: 1, category: 'window', modifiable: false }));
  // Window sill
  elements.push(createRect(windowX - 6, windowY + windowH, windowW + 12, 6, '#E0D0B8', { layer: 1, category: 'window', modifiable: false }));

  // Curtains
  const curtainH = windowH + 20;
  elements.push(createRect(windowX - 20, windowY - 6, 18, curtainH, curtainColor, { layer: 1, category: 'curtain', modifiable: true, id: uid('lcurt'), filter: 'url(#softShadow)' }));
  elements.push(createRect(windowX - 13, windowY - 6, 3, curtainH, curtainColor, { layer: 1, category: 'curtain', modifiable: false, opacity: 0.65 }));
  elements.push(createRect(windowX + windowW + 2, windowY - 6, 18, curtainH, curtainColor, { layer: 1, category: 'curtain', modifiable: true, id: uid('rcurt'), filter: 'url(#softShadow)' }));
  elements.push(createRect(windowX + windowW + 10, windowY - 6, 3, curtainH, curtainColor, { layer: 1, category: 'curtain', modifiable: false, opacity: 0.65 }));
  // Curtain rod
  elements.push(createRect(windowX - 24, windowY - 10, windowW + 48, 3, '#8B7355', { layer: 1, category: 'curtain', modifiable: false }));

  // ════════════════════════════════════════════
  //  LAYER 1 — Counters (back wall)
  // ════════════════════════════════════════════

  const counterY = wallBottom * 0.58;
  const counterH = wallBottom - counterY;

  // Left counter run (under cabinets)
  elements.push(createRect(0, counterY, windowX - 26, counterH, 'url(#counterGrad)', { layer: 1, category: 'counter', modifiable: false, filter: 'url(#shadow)' }));
  // Counter edge
  elements.push(createRect(0, counterY, windowX - 26, 4, '#D0C0A8', { layer: 1, category: 'counter', modifiable: false }));

  // Right counter run
  const rightCounterX = windowX + windowW + 24;
  elements.push(createRect(rightCounterX, counterY, w - rightCounterX, counterH, 'url(#counterGrad)', { layer: 1, category: 'counter', modifiable: false, filter: 'url(#shadow)' }));
  elements.push(createRect(rightCounterX, counterY, w - rightCounterX, 4, '#D0C0A8', { layer: 1, category: 'counter', modifiable: false }));

  // ════════════════════════════════════════════
  //  LAYER 2 — Cabinets (upper)
  // ════════════════════════════════════════════

  const cabY = h * 0.04;
  const cabH = counterY - cabY - 12;

  // Left cabinets
  const leftCabCount = rng.nextInt(2, 3);
  const leftCabW = (windowX - 30) / leftCabCount;
  for (let i = 0; i < leftCabCount; i++) {
    const cx = 4 + i * leftCabW;
    elements.push(createRect(cx, cabY, leftCabW - 4, cabH, cabinetColor, {
      layer: 2, category: 'cabinet', modifiable: true, id: uid('cab'), stroke: cabinetDark, strokeWidth: 1, filter: 'url(#shadow)',
    }));
    // Door line
    elements.push(createRect(cx + leftCabW / 2 - 2, cabY, 1, cabH, cabinetDark, { layer: 2, category: 'cabinet', modifiable: false, opacity: 0.5 }));
    // Handles
    elements.push(createRect(cx + leftCabW / 2 - 8, cabY + cabH / 2 - 5, 4, 10, '#C0A878', { layer: 2, category: 'cabinet', modifiable: false }));
    elements.push(createRect(cx + leftCabW / 2 + 2, cabY + cabH / 2 - 5, 4, 10, '#C0A878', { layer: 2, category: 'cabinet', modifiable: false }));
  }

  // Right cabinets
  const rightCabCount = rng.nextInt(2, 3);
  const rightCabW = (w - rightCounterX - 4) / rightCabCount;
  for (let i = 0; i < rightCabCount; i++) {
    const cx = rightCounterX + i * rightCabW;
    elements.push(createRect(cx, cabY, rightCabW - 4, cabH, cabinetColor, {
      layer: 2, category: 'cabinet', modifiable: true, id: uid('cab'), stroke: cabinetDark, strokeWidth: 1, filter: 'url(#shadow)',
    }));
    elements.push(createRect(cx + rightCabW / 2 - 2, cabY, 1, cabH, cabinetDark, { layer: 2, category: 'cabinet', modifiable: false, opacity: 0.5 }));
    elements.push(createRect(cx + rightCabW / 2 - 8, cabY + cabH / 2 - 5, 4, 10, '#C0A878', { layer: 2, category: 'cabinet', modifiable: false }));
    elements.push(createRect(cx + rightCabW / 2 + 2, cabY + cabH / 2 - 5, 4, 10, '#C0A878', { layer: 2, category: 'cabinet', modifiable: false }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Refrigerator (right side)
  // ════════════════════════════════════════════

  const fridgeX = w * 0.84;
  const fridgeW = w * 0.14;
  const fridgeH = wallBottom - h * 0.02;

  elements.push(createRect(fridgeX, h * 0.02, fridgeW, fridgeH, fridgeColor, {
    layer: 2, category: 'fridge', modifiable: true, id: uid('fridge'), stroke: '#B0B0B0', strokeWidth: 1, filter: 'url(#shadow)',
  }));
  // Freezer door line
  elements.push(createRect(fridgeX, h * 0.02 + fridgeH * 0.3, fridgeW, 2, '#AAA', { layer: 2, category: 'fridge', modifiable: false }));
  // Handles
  elements.push(createRect(fridgeX + fridgeW * 0.15, h * 0.02 + fridgeH * 0.1, 3, fridgeH * 0.15, '#BBB', { layer: 2, category: 'fridge', modifiable: false }));
  elements.push(createRect(fridgeX + fridgeW * 0.15, h * 0.02 + fridgeH * 0.4, 3, fridgeH * 0.2, '#BBB', { layer: 2, category: 'fridge', modifiable: false }));
  // Fridge magnets
  const magnetColors = ['#CC3333', '#3366CC', '#33AA33', '#FFAA00', '#CC33CC'];
  for (let m = 0; m < rng.nextInt(2, 4); m++) {
    const mx = fridgeX + rng.nextFloat(fridgeW * 0.3, fridgeW * 0.85);
    const my = h * 0.02 + rng.nextFloat(fridgeH * 0.05, fridgeH * 0.25);
    elements.push(createCircle(mx, my, rng.nextFloat(3, 5), rng.pick(magnetColors), { layer: 3, category: 'magnet', modifiable: true, id: uid('mag') }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Stove/Oven
  // ════════════════════════════════════════════

  const stoveX = w * 0.02;
  const stoveW = w * 0.15;
  const stoveY = counterY;
  const stoveH = counterH;

  // Stove body
  elements.push(createRect(stoveX, stoveY, stoveW, stoveH, stoveColor, {
    layer: 2, category: 'stove', modifiable: true, id: uid('stove'), filter: 'url(#shadow)',
  }));
  // Oven door
  elements.push(createRect(stoveX + 6, stoveY + stoveH * 0.35, stoveW - 12, stoveH * 0.55, '#444', {
    layer: 2, category: 'stove', modifiable: false, stroke: '#555', strokeWidth: 1,
  }));
  // Oven window
  elements.push(createRect(stoveX + 10, stoveY + stoveH * 0.4, stoveW - 20, stoveH * 0.2, '#1A1A2E', {
    layer: 2, category: 'stove', modifiable: false, opacity: 0.8,
  }));
  // Oven handle
  elements.push(createRect(stoveX + 10, stoveY + stoveH * 0.33, stoveW - 20, 3, '#888', { layer: 2, category: 'stove', modifiable: false }));
  // Burners (top)
  const burnerPositions = [0.25, 0.75];
  for (const bp of burnerPositions) {
    const bx = stoveX + stoveW * bp;
    const by = stoveY + 10;
    elements.push(createCircle(bx, by, 10, '#222', { layer: 3, category: 'burner', modifiable: false }));
    elements.push(createCircle(bx, by, 7, '#333', { layer: 3, category: 'burner', modifiable: false }));
    elements.push(createCircle(bx, by, 3, '#444', { layer: 3, category: 'burner', modifiable: false }));
  }
  // Knobs
  for (let k = 0; k < 4; k++) {
    elements.push(createCircle(stoveX + 8 + k * (stoveW - 16) / 3, stoveY + stoveH * 0.25, 4, '#888', {
      layer: 3, category: 'stove', modifiable: false, stroke: '#666', strokeWidth: 0.5,
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Sink (on counter)
  // ════════════════════════════════════════════

  const sinkX = rightCounterX + 15;
  const sinkY = counterY + 4;
  const sinkW2 = 50;
  const sinkH2 = 20;

  // Sink basin
  elements.push(createRect(sinkX, sinkY, sinkW2, sinkH2, '#C8C8C8', {
    layer: 2, category: 'sink', modifiable: true, id: uid('sink'), stroke: '#A0A0A0', strokeWidth: 1,
  }));
  elements.push(createRect(sinkX + 3, sinkY + 3, sinkW2 - 6, sinkH2 - 6, '#B0B0B0', { layer: 2, category: 'sink', modifiable: false }));
  // Faucet
  const faucetX = sinkX + sinkW2 / 2;
  elements.push(createRect(faucetX - 2, sinkY - 25, 4, 20, '#C0C0C0', { layer: 3, category: 'sink', modifiable: false }));
  elements.push(createPath(faucetX, sinkY,
    `M${faucetX - 2},${sinkY - 25} Q${faucetX - 2},${sinkY - 30} ${faucetX + 10},${sinkY - 30} L${faucetX + 10},${sinkY - 27}`,
    'none', { stroke: '#C0C0C0', strokeWidth: 3, layer: 3, category: 'sink' }));
  // Faucet handles
  elements.push(createCircle(faucetX - 10, sinkY - 18, 3, '#4A90D9', { layer: 3, category: 'sink', modifiable: false }));
  elements.push(createCircle(faucetX + 10, sinkY - 18, 3, '#CC3333', { layer: 3, category: 'sink', modifiable: false }));

  // ════════════════════════════════════════════
  //  LAYER 2 — Kitchen Table (center)
  // ════════════════════════════════════════════

  const tableX = w * 0.2;
  const tableY = h * 0.78;
  const tableW = w * 0.45;
  const tableLegH = h * 0.14;

  // Table top
  elements.push(createRect(tableX, tableY, tableW, 8, tableColor, {
    layer: 2, category: 'table', modifiable: true, id: uid('table'), filter: 'url(#shadow)',
  }));
  // Table highlight
  elements.push(createRect(tableX + 4, tableY + 1, tableW - 8, 3, tableColor, { layer: 2, category: 'table', modifiable: false, opacity: 0.6 }));
  // Legs
  elements.push(createRect(tableX + 10, tableY + 8, 6, tableLegH, tableColor, { layer: 2, category: 'table', modifiable: false }));
  elements.push(createRect(tableX + tableW - 16, tableY + 8, 6, tableLegH, tableColor, { layer: 2, category: 'table', modifiable: false }));

  // ════════════════════════════════════════════
  //  LAYER 3 — Dishes on table
  // ════════════════════════════════════════════

  // Plates
  const plateCount = rng.nextInt(2, 4);
  for (let i = 0; i < plateCount; i++) {
    const px = tableX + 30 + i * (tableW / (plateCount + 1));
    const py = tableY - 2;
    const plateColor = rng.pick(['#FFFFF0', '#F5F0E8', '#FFF8F0']);
    elements.push(createEllipse(px, py, 20, 5, plateColor, {
      layer: 3, category: 'plate', modifiable: true, id: uid('plate'), stroke: '#D0C8B8', strokeWidth: 0.8,
    }));
    elements.push(createEllipse(px, py, 14, 3.5, plateColor, { layer: 3, category: 'plate', modifiable: false, opacity: 0.7 }));
  }

  // Cups
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    const cx = tableX + 55 + i * rng.nextFloat(80, 120);
    const cy = tableY - 2;
    if (cx > tableX + tableW - 30) break;
    const cupColor = rng.pick(['#FFF', '#F0F0F0', '#FFDAB9', '#87CEEB']);
    elements.push(createRect(cx, cy - 12, 10, 12, cupColor, {
      layer: 3, category: 'cup', modifiable: true, id: uid('cup'), stroke: '#CCC', strokeWidth: 0.8,
    }));
    // Cup handle
    elements.push(createCircle(cx + 12, cy - 6, 4, 'none', { layer: 3, category: 'cup', modifiable: false, stroke: cupColor, strokeWidth: 1.5 }));
    // Coffee/tea inside
    elements.push(createRect(cx + 1, cy - 10, 8, 3, '#6B3410', { layer: 3, category: 'cup', modifiable: false, opacity: 0.7 }));
  }

  // Food items on plates
  if (rng.chance(0.7)) {
    const foodX = tableX + 30;
    const foodY = tableY - 5;
    // Apple
    elements.push(createCircle(foodX, foodY, 6, '#CC2222', { layer: 3, category: 'food', modifiable: true, id: uid('apple') }));
    elements.push(createLine(foodX, foodY - 6, foodX + 1, foodY - 9, '#4A2810', { strokeWidth: 1, layer: 3, category: 'food' }));
    elements.push(createPath(foodX, foodY,
      `M${foodX + 1},${foodY - 8} Q${foodX + 5},${foodY - 10} ${foodX + 4},${foodY - 7}`,
      '#228B22', { layer: 3, category: 'food', opacity: 0.8 }));
  }

  // Bread/toast
  if (rng.chance(0.6)) {
    const bx = tableX + tableW * 0.6;
    const by = tableY - 4;
    elements.push(createRect(bx, by - 8, 16, 10, '#D4A050', {
      layer: 3, category: 'food', modifiable: true, id: uid('bread'), stroke: '#C09040', strokeWidth: 0.5,
    }));
    elements.push(createRect(bx + 2, by - 6, 12, 6, '#E8C880', { layer: 3, category: 'food', modifiable: false, opacity: 0.6 }));
  }

  // Napkin
  if (rng.chance(0.65)) {
    const napColor = rng.pick(['#FFF', '#FFD0D0', '#D0D0FF', '#D0FFD0', '#FFFFD0']);
    const nx = tableX + tableW * 0.85;
    elements.push(createRect(nx, tableY - 4, 14, 14, napColor, {
      layer: 3, category: 'napkin', modifiable: true, id: uid('nap'), rotation: rng.nextFloat(-10, 10),
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Hanging pots
  // ════════════════════════════════════════════

  const potRackX = w * 0.2;
  const potRackY = h * 0.02;
  // Rack bar
  elements.push(createRect(potRackX, potRackY, w * 0.2, 3, '#8B7355', { layer: 2, category: 'rack', modifiable: false }));

  const potCount = rng.nextInt(2, 4);
  for (let i = 0; i < potCount; i++) {
    const px = potRackX + 15 + i * (w * 0.2 / potCount);
    const py = potRackY + 3;
    const potColor = rng.pick(['#8B4513', '#B87333', '#CD7F32', '#555']);
    // Hook line
    elements.push(createLine(px, py, px, py + 12, '#8B7355', { strokeWidth: 1, layer: 2 }));
    // Pot body
    elements.push(createRect(px - 10, py + 12, 20, 14, potColor, {
      layer: 2, category: 'pot', modifiable: true, id: uid('hpot'), filter: 'url(#softShadow)',
    }));
    // Pot handle
    elements.push(createRect(px - 14, py + 14, 4, 2, potColor, { layer: 2, category: 'pot', modifiable: false }));
    elements.push(createRect(px + 10, py + 14, 4, 2, potColor, { layer: 2, category: 'pot', modifiable: false }));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Spice rack (on wall)
  // ════════════════════════════════════════════

  const spiceX = rightCounterX + 5;
  const spiceY = h * 0.08;
  const spiceW2 = 55;
  const spiceH2 = 45;

  // Rack frame
  elements.push(createRect(spiceX, spiceY, spiceW2, spiceH2, '#A0784E', {
    layer: 2, category: 'spice', modifiable: false, stroke: '#8A6A3E', strokeWidth: 1,
  }));
  // Shelves
  elements.push(createRect(spiceX + 2, spiceY + spiceH2 / 2, spiceW2 - 4, 2, '#8A6A3E', { layer: 2, category: 'spice', modifiable: false }));

  // Spice bottles
  const spiceColors = ['#CC3333', '#DDAA00', '#228B22', '#8B4513', '#AA5500', '#996633'];
  for (let row = 0; row < 2; row++) {
    const sy = spiceY + 4 + row * (spiceH2 / 2);
    for (let j = 0; j < rng.nextInt(3, 5); j++) {
      const sx = spiceX + 6 + j * 11;
      if (sx > spiceX + spiceW2 - 10) break;
      const bottleH = rng.nextFloat(12, 18);
      elements.push(createRect(sx, sy + (spiceH2 / 2 - 4) - bottleH, 7, bottleH, rng.pick(spiceColors), {
        layer: 3, category: 'spice', modifiable: true, id: uid('spice'),
      }));
      // Cap
      elements.push(createRect(sx + 1, sy + (spiceH2 / 2 - 4) - bottleH - 3, 5, 3, '#888', { layer: 3, category: 'spice', modifiable: false }));
    }
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Fruit bowl on counter
  // ════════════════════════════════════════════

  const bowlX = w * 0.09;
  const bowlY = counterY - 2;

  // Bowl
  elements.push(createEllipse(bowlX, bowlY, 24, 8, '#E8D8C0', {
    layer: 3, category: 'bowl', modifiable: true, id: uid('bowl'), stroke: '#C8B8A0', strokeWidth: 1, filter: 'url(#softShadow)',
  }));

  // Fruits in bowl
  const fruitTypes = [
    { color: '#CC2222', r: 6 },   // apple
    { color: '#FFD700', r: 5 },   // lemon
    { color: '#FF8C00', r: 6 },   // orange
    { color: '#228B22', r: 5 },   // lime
    { color: '#8B0045', r: 5 },   // plum
  ];
  const fruitCount = rng.nextInt(3, 5);
  for (let f = 0; f < fruitCount; f++) {
    const fruit = rng.pick(fruitTypes);
    const fx = bowlX + rng.nextFloat(-14, 14);
    const fy = bowlY - rng.nextFloat(6, 12);
    elements.push(createCircle(fx, fy, fruit.r, fruit.color, {
      layer: 3, category: 'fruit', modifiable: true, id: uid('fruit'),
    }));
  }

  // Banana (optional)
  if (rng.chance(0.5)) {
    elements.push(createPath(bowlX, bowlY,
      `M${bowlX - 10},${bowlY - 8} Q${bowlX},${bowlY - 18} ${bowlX + 12},${bowlY - 10}`,
      '#FFE135', { layer: 3, category: 'fruit', modifiable: true, id: uid('banana'), strokeWidth: 4, stroke: '#FFD700' }));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Wall clock
  // ════════════════════════════════════════════

  const clockX = w * 0.62;
  const clockY = h * 0.1;
  const clockR = rng.nextFloat(18, 22);

  elements.push(createCircle(clockX, clockY, clockR, '#FFFFF0', {
    layer: 3, category: 'clock', modifiable: true, stroke: '#8B7355', strokeWidth: 2, id: uid('clock'), filter: 'url(#shadow)',
  }));
  // Hour marks
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 - 90) * Math.PI / 180;
    elements.push(createCircle(clockX + Math.cos(a) * clockR * 0.8, clockY + Math.sin(a) * clockR * 0.8, clockR * 0.04, '#333', { layer: 3 }));
  }
  // Hands
  const hour = rng.nextInt(1, 12);
  const min = rng.nextInt(0, 11) * 5;
  const hAngle = (hour * 30 + min * 0.5 - 90) * Math.PI / 180;
  const mAngle = (min * 6 - 90) * Math.PI / 180;
  elements.push(createLine(clockX, clockY, clockX + Math.cos(hAngle) * clockR * 0.5, clockY + Math.sin(hAngle) * clockR * 0.5, '#333', { strokeWidth: 2.5, layer: 3 }));
  elements.push(createLine(clockX, clockY, clockX + Math.cos(mAngle) * clockR * 0.7, clockY + Math.sin(mAngle) * clockR * 0.7, '#333', { strokeWidth: 1.5, layer: 3 }));
  elements.push(createCircle(clockX, clockY, 2, '#333', { layer: 3 }));

  // ════════════════════════════════════════════
  //  LAYER 3 — Counter items
  // ════════════════════════════════════════════

  // Knife block on left counter
  if (rng.chance(0.65)) {
    const kbx = w * 0.14;
    const kby = counterY - 2;
    elements.push(createRect(kbx, kby - 28, 16, 28, '#5C3317', {
      layer: 3, category: 'knife', modifiable: true, id: uid('kblock'), filter: 'url(#softShadow)',
    }));
    // Knife handles
    for (let k = 0; k < 3; k++) {
      elements.push(createRect(kbx + 3 + k * 4, kby - 34 - k * 3, 2, 8, '#333', { layer: 3, category: 'knife', modifiable: false }));
    }
  }

  // Kettle on counter
  if (rng.chance(0.6)) {
    const kettleX = rightCounterX + 70;
    const kettleY = counterY - 2;
    const kColor = rng.pick(['#CC3333', '#336699', '#888', '#E8E8E8']);
    elements.push(createEllipse(kettleX, kettleY - 8, 12, 10, kColor, {
      layer: 3, category: 'kettle', modifiable: true, id: uid('kettle'), filter: 'url(#softShadow)',
    }));
    // Lid
    elements.push(createEllipse(kettleX, kettleY - 16, 8, 3, kColor, { layer: 3, category: 'kettle', modifiable: false, opacity: 0.9 }));
    // Handle
    elements.push(createPath(kettleX, kettleY,
      `M${kettleX - 5},${kettleY - 18} Q${kettleX},${kettleY - 25} ${kettleX + 5},${kettleY - 18}`,
      'none', { stroke: '#333', strokeWidth: 2, layer: 3, category: 'kettle' }));
    // Spout
    elements.push(createPath(kettleX, kettleY,
      `M${kettleX + 12},${kettleY - 10} L${kettleX + 20},${kettleY - 16}`,
      'none', { stroke: kColor, strokeWidth: 3, layer: 3, category: 'kettle' }));
  }

  // Pot/pan on stove
  if (rng.chance(0.7)) {
    const panX = stoveX + stoveW * 0.25;
    const panY = stoveY + 6;
    elements.push(createEllipse(panX, panY, 14, 4, '#555', {
      layer: 3, category: 'pan', modifiable: true, id: uid('pan'), filter: 'url(#softShadow)',
    }));
    elements.push(createRect(panX + 14, panY - 2, 18, 3, '#444', { layer: 3, category: 'pan', modifiable: false }));
  }

  // Towel on oven handle
  if (rng.chance(0.6)) {
    const towelColor = rng.pick(['#FF6B6B', '#6B9FFF', '#6BFF6B', '#FFD700', '#FFF']);
    elements.push(createRect(stoveX + 6, stoveY + stoveH * 0.3, stoveW - 12, 8, towelColor, {
      layer: 3, category: 'towel', modifiable: true, id: uid('towel'),
    }));
  }

  // Salt & pepper on table
  const saltX = tableX + tableW * 0.45;
  elements.push(createRect(saltX, tableY - 14, 6, 12, '#FFF', {
    layer: 3, category: 'condiment', modifiable: true, id: uid('salt'), stroke: '#CCC', strokeWidth: 0.5,
  }));
  elements.push(createRect(saltX + 2, tableY - 16, 2, 2, '#CCC', { layer: 3, category: 'condiment', modifiable: false }));
  elements.push(createRect(saltX + 10, tableY - 14, 6, 12, '#222', {
    layer: 3, category: 'condiment', modifiable: true, id: uid('pepper'), stroke: '#333', strokeWidth: 0.5,
  }));
  elements.push(createRect(saltX + 12, tableY - 16, 2, 2, '#333', { layer: 3, category: 'condiment', modifiable: false }));

  // Flower on window sill
  if (rng.chance(0.6)) {
    const fwx = windowX + windowW * 0.5;
    const fwy = windowY + windowH + 4;
    const potColor = rng.pick(['#A0522D', '#D2691E']);
    elements.push(createRect(fwx - 8, fwy - 10, 16, 12, potColor, { layer: 3, category: 'plant', modifiable: true, id: uid('wpot'), filter: 'url(#softShadow)' }));
    for (let fl = 0; fl < 3; fl++) {
      const fx = fwx + rng.nextFloat(-6, 6);
      const fy = fwy - rng.nextFloat(14, 22);
      elements.push(createCircle(fx, fy, 3, rng.nextColor([0, 360], [60, 90], [55, 75]), { layer: 3, category: 'flower', modifiable: false }));
      elements.push(createLine(fx, fy + 2, fwx, fwy - 10, '#228B22', { strokeWidth: 1, layer: 3 }));
    }
  }

  return { elements, defs };
}
