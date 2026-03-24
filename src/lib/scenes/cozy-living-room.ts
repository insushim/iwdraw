import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPolygon, createPath,
  createLine, createGroup, createText,
  createPottedPlant, createBookshelf, createTable, createClock,
  createPicture, createRug, createCushion, createVase, createLamp,
} from '../engine/primitives';

let _uid = 0;
function uid(p = 'lr') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

export function generateCozyLivingRoom(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  const elements: SVGElementData[] = [];

  // ── Color palette ──
  const wallBase = rng.pick(['#F5E6D3', '#E8D5B7', '#FFF8DC', '#FAEBD7', '#F0E68C', '#D4E6B5']);
  const wallDark = rng.pick(['#DCC9A8', '#CEBF9E', '#E8DCC0', '#D9C9A0']);
  const floorBase = rng.pick(['#DEB887', '#D2B48C', '#C4A882', '#8B7355']);
  const floorDark = rng.pick(['#B89565', '#A08060', '#9A7B5A']);
  const skyTop = rng.pick(['#5B9BD5', '#87CEEB', '#6CB4EE', '#4A90D9']);
  const skyBottom = rng.pick(['#B8D8F0', '#D6EAF8', '#AED6F1']);
  const sofaColor = rng.pick(['#4A6741', '#8B4513', '#4169E1', '#A0522D', '#6B4226', '#CD853F', '#7B3F6B', '#2E5090']);
  const curtainColor = rng.nextColor([0, 360], [30, 60], [60, 80]);
  const lampShadeColor = rng.pick(['#FFFACD', '#FFE4B5', '#FFDAB9', '#FFF8DC']);

  // ── SVG Defs (gradients) ──
  const defs = `
    <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${wallBase}" />
      <stop offset="40%" stop-color="${wallBase}" stop-opacity="0.95" />
      <stop offset="100%" stop-color="${wallDark}" />
    </linearGradient>
    <linearGradient id="floorGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${floorBase}" />
      <stop offset="50%" stop-color="${floorDark}" />
      <stop offset="100%" stop-color="${floorBase}" />
    </linearGradient>
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${skyTop}" />
      <stop offset="100%" stop-color="${skyBottom}" />
    </linearGradient>
    <radialGradient id="lampGlow" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FFFDE0" stop-opacity="0.95" />
      <stop offset="40%" stop-color="#FFE88A" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#FFD700" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="wainscotGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F5DEB3" />
      <stop offset="100%" stop-color="#D2B48C" />
    </linearGradient>
  `;

  // ════════════════════════════════════════════
  //  LAYER 0 — Walls, floor, ceiling trim
  // ════════════════════════════════════════════

  const wallBottom = h * 0.7;
  const wainscotTop = h * 0.5;

  // Wall (gradient fill referenced by url)
  elements.push(createRect(0, 0, w, wallBottom, 'url(#wallGrad)', { layer: 0, category: 'wall', modifiable: false, id: uid('wall') }));

  // Subtle wallpaper horizontal accent stripe
  elements.push(createRect(0, h * 0.18, w, 2, wallDark, { layer: 0, category: 'wall', modifiable: false, opacity: 0.3, id: uid('stripe1') }));
  elements.push(createRect(0, h * 0.22, w, 1, wallDark, { layer: 0, category: 'wall', modifiable: false, opacity: 0.2, id: uid('stripe2') }));

  // Wainscoting panel (lower wall)
  elements.push(createRect(0, wainscotTop, w, wallBottom - wainscotTop, 'url(#wainscotGrad)', { layer: 0, category: 'wall', modifiable: false, id: uid('wainscot') }));
  // Wainscoting top rail
  elements.push(createRect(0, wainscotTop - 2, w, 4, '#C4A46C', { layer: 0, category: 'wall', modifiable: false, id: uid('rail') }));
  // Wainscoting panel rectangles
  const panelCount = rng.nextInt(4, 7);
  const panelW = (w - 20) / panelCount;
  for (let i = 0; i < panelCount; i++) {
    const px = 10 + i * panelW + 6;
    elements.push(createRect(px, wainscotTop + 8, panelW - 12, wallBottom - wainscotTop - 16, 'none', {
      layer: 0, category: 'wall', modifiable: false, stroke: '#C4A46C', strokeWidth: 1.5, opacity: 0.5, id: uid('panel'),
    }));
  }

  // Crown molding (ceiling)
  elements.push(createRect(0, 0, w, 5, '#E8D5B7', { layer: 0, category: 'wall', modifiable: false, opacity: 0.7, id: uid('crown1') }));
  elements.push(createRect(0, 5, w, 3, '#D4C4A0', { layer: 0, category: 'wall', modifiable: false, opacity: 0.5, id: uid('crown2') }));

  // Floor with gradient
  elements.push(createRect(0, wallBottom, w, h * 0.3, 'url(#floorGrad)', { layer: 0, category: 'floor', modifiable: false, id: uid('floor') }));

  // Floor board lines
  const boardCount = rng.nextInt(10, 14);
  for (let i = 0; i < boardCount; i++) {
    const bx = i * (w / boardCount);
    elements.push(createRect(bx, wallBottom, 1, h * 0.3, '#A0855A', { layer: 0, category: 'floor', modifiable: false, opacity: 0.25, id: uid('board') }));
  }
  // Horizontal board lines for realism
  for (let j = 0; j < 3; j++) {
    const by = wallBottom + (j + 1) * (h * 0.3 / 4);
    elements.push(createRect(0, by, w, 1, '#A0855A', { layer: 0, category: 'floor', modifiable: false, opacity: 0.15, id: uid('hboard') }));
  }

  // Baseboard
  elements.push(createRect(0, wallBottom - 3, w, 6, '#8B7355', { layer: 1, category: 'wall', modifiable: false, id: uid('baseboard') }));

  // ════════════════════════════════════════════
  //  LAYER 1 — Window with sky gradient
  // ════════════════════════════════════════════

  const windowX = rng.nextFloat(w * 0.57, w * 0.72);
  const windowW = w * 0.2;
  const windowH = h * 0.35;
  const windowY = h * 0.08;

  // Window sill / frame background
  elements.push(createRect(windowX - 4, windowY - 4, windowW + 8, windowH + 12, '#FFF', { layer: 1, category: 'window', modifiable: false, id: uid('wframe') }));
  // Sky inside window
  elements.push(createRect(windowX, windowY, windowW, windowH, 'url(#skyGrad)', { layer: 1, category: 'window', modifiable: true, id: uid('sky') }));

  // Clouds in window
  const cloudY = windowY + windowH * 0.25;
  elements.push(createEllipse(windowX + windowW * 0.3, cloudY, windowW * 0.12, windowH * 0.06, '#FFF', { layer: 1, category: 'window', modifiable: false, opacity: 0.85, id: uid('cloud') }));
  elements.push(createEllipse(windowX + windowW * 0.45, cloudY - 3, windowW * 0.08, windowH * 0.05, '#FFF', { layer: 1, category: 'window', modifiable: false, opacity: 0.75, id: uid('cloud') }));
  elements.push(createEllipse(windowX + windowW * 0.7, cloudY + 8, windowW * 0.1, windowH * 0.05, '#FAFAFA', { layer: 1, category: 'window', modifiable: false, opacity: 0.7, id: uid('cloud') }));

  // Window cross bars
  elements.push(createRect(windowX + windowW / 2 - 1.5, windowY, 3, windowH, '#FFF', { layer: 1, category: 'window', modifiable: false, id: uid('wbar') }));
  elements.push(createRect(windowX, windowY + windowH / 2 - 1.5, windowW, 3, '#FFF', { layer: 1, category: 'window', modifiable: false, id: uid('wbar') }));

  // Window sill
  elements.push(createRect(windowX - 6, windowY + windowH, windowW + 12, 6, '#E0D0B8', { layer: 1, category: 'window', modifiable: false, id: uid('sill') }));

  // Curtain rod
  elements.push(createRect(windowX - 25, windowY - 8, windowW + 50, 3, '#8B7355', { layer: 1, category: 'curtain', modifiable: false, id: uid('crod') }));
  // Curtain rod finials
  elements.push(createCircle(windowX - 25, windowY - 6.5, 4, '#8B7355', { layer: 1, category: 'curtain', modifiable: false, id: uid('cfin') }));
  elements.push(createCircle(windowX + windowW + 25, windowY - 6.5, 4, '#8B7355', { layer: 1, category: 'curtain', modifiable: false, id: uid('cfin') }));

  // Curtains (draped, with folds)
  const curtainH = h * 0.45;
  // Left curtain
  const leftCX = windowX - 20;
  elements.push(createRect(leftCX, windowY - 5, 22, curtainH, curtainColor, { layer: 1, category: 'curtain', modifiable: true, id: uid('lcurt') }));
  elements.push(createRect(leftCX + 7, windowY - 5, 4, curtainH, curtainColor, { layer: 1, category: 'curtain', modifiable: false, opacity: 0.7, id: uid('lfold') }));
  elements.push(createRect(leftCX + 15, windowY - 5, 3, curtainH, curtainColor, { layer: 1, category: 'curtain', modifiable: false, opacity: 0.6, id: uid('lfold') }));
  // Right curtain
  const rightCX = windowX + windowW - 2;
  elements.push(createRect(rightCX, windowY - 5, 22, curtainH, curtainColor, { layer: 1, category: 'curtain', modifiable: true, id: uid('rcurt') }));
  elements.push(createRect(rightCX + 5, windowY - 5, 4, curtainH, curtainColor, { layer: 1, category: 'curtain', modifiable: false, opacity: 0.7, id: uid('rfold') }));
  elements.push(createRect(rightCX + 13, windowY - 5, 3, curtainH, curtainColor, { layer: 1, category: 'curtain', modifiable: false, opacity: 0.6, id: uid('rfold') }));

  // ════════════════════════════════════════════
  //  LAYER 1 — Rug with pattern
  // ════════════════════════════════════════════

  const rugX = w * 0.18;
  const rugY = h * 0.74;
  const rugW = w * 0.52;
  const rugH = h * 0.16;
  const rugColor = rng.nextColor([0, 360], [40, 70], [40, 60]);
  const rugBorder = rng.nextColor([0, 360], [30, 60], [30, 50]);
  const rugAccent = rng.nextColor([0, 360], [50, 80], [50, 70]);

  // Rug base
  elements.push(createRect(rugX, rugY, rugW, rugH, rugColor, { layer: 1, category: 'rug', modifiable: true, id: uid('rug') }));
  // Rug border
  elements.push(createRect(rugX + 4, rugY + 3, rugW - 8, rugH - 6, rugBorder, { layer: 1, category: 'rug', modifiable: false, opacity: 0.35, id: uid('rugb') }));
  // Rug inner border
  elements.push(createRect(rugX + 10, rugY + 7, rugW - 20, rugH - 14, 'none', { layer: 1, category: 'rug', modifiable: false, stroke: rugAccent, strokeWidth: 1.5, opacity: 0.5, id: uid('rugi') }));
  // Rug diamond pattern in center
  const rcx = rugX + rugW / 2;
  const rcy = rugY + rugH / 2;
  const dSize = rugH * 0.28;
  const diamondPts = `${rcx},${rcy - dSize} ${rcx + dSize * 1.5},${rcy} ${rcx},${rcy + dSize} ${rcx - dSize * 1.5},${rcy}`;
  elements.push(createPolygon(rcx, rcy, diamondPts, rugAccent, { layer: 1, category: 'rug', modifiable: false, opacity: 0.4, id: uid('rugd') }));

  // ════════════════════════════════════════════
  //  LAYER 2 — Sofa (detailed with cushions, arms, back)
  // ════════════════════════════════════════════

  const sofaX = w * 0.13;
  const sofaY = h * 0.48;
  const sofaW = w * 0.42;
  const sofaH = h * 0.22;
  const sofaDark = sofaColor;

  // Sofa back
  elements.push(createRect(sofaX - 4, sofaY - h * 0.12, sofaW + 8, h * 0.12, sofaDark, { layer: 2, category: 'sofa', modifiable: false, opacity: 0.85, id: uid('sback') }));
  // Sofa seat
  elements.push(createRect(sofaX, sofaY, sofaW, sofaH, sofaDark, { layer: 2, category: 'sofa', modifiable: true, id: uid('sseat') }));
  // Sofa seat highlight
  elements.push(createRect(sofaX + 4, sofaY + 2, sofaW - 8, sofaH * 0.3, sofaDark, { layer: 2, category: 'sofa', modifiable: false, opacity: 0.7, id: uid('shigh') }));

  // Sofa arm left
  elements.push(createRect(sofaX - 14, sofaY - h * 0.06, 16, sofaH + h * 0.06, sofaDark, { layer: 2, category: 'sofa', modifiable: false, opacity: 0.9, id: uid('sarml') }));
  // Sofa arm right
  elements.push(createRect(sofaX + sofaW - 2, sofaY - h * 0.06, 16, sofaH + h * 0.06, sofaDark, { layer: 2, category: 'sofa', modifiable: false, opacity: 0.9, id: uid('sarmr') }));

  // Sofa legs
  const legColor = '#5C3317';
  elements.push(createRect(sofaX, sofaY + sofaH, 6, 8, legColor, { layer: 2, category: 'sofa', modifiable: false, id: uid('sleg') }));
  elements.push(createRect(sofaX + sofaW - 6, sofaY + sofaH, 6, 8, legColor, { layer: 2, category: 'sofa', modifiable: false, id: uid('sleg') }));

  // Seat division line
  elements.push(createLine(sofaX + sofaW / 3, sofaY + 4, sofaX + sofaW / 3, sofaY + sofaH - 4, sofaDark, { strokeWidth: 1, layer: 2, category: 'sofa', modifiable: false, opacity: 0.4, id: uid('sdiv') }));
  elements.push(createLine(sofaX + sofaW * 2 / 3, sofaY + 4, sofaX + sofaW * 2 / 3, sofaY + sofaH - 4, sofaDark, { strokeWidth: 1, layer: 2, category: 'sofa', modifiable: false, opacity: 0.4, id: uid('sdiv') }));

  // Cushions on sofa
  const cushionCount = rng.nextInt(2, 4);
  for (let i = 0; i < cushionCount; i++) {
    const cx = sofaX + 12 + i * (sofaW / cushionCount);
    const cSize = rng.nextFloat(22, 32);
    const cColor = rng.nextColor([0, 360], [50, 80], [50, 70]);
    elements.push(createRect(cx, sofaY - h * 0.08, cSize, cSize * 0.85, cColor, { layer: 3, category: 'cushion', modifiable: true, id: uid('cush'), stroke: cColor, strokeWidth: 0.5 }));
    // Cushion button detail
    elements.push(createCircle(cx + cSize / 2, sofaY - h * 0.08 + cSize * 0.42, 2, cColor, { layer: 3, category: 'cushion', modifiable: false, opacity: 0.6, id: uid('cbtn') }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Coffee table with items
  // ════════════════════════════════════════════

  const tableX = w * 0.25;
  const tableY = h * 0.72;
  const tableW = w * 0.22;
  const tableH = h * 0.08;
  const tableColor = rng.pick(['#8B6914', '#A0522D', '#6B3410', '#DEB887']);

  // Table top
  elements.push(createRect(tableX, tableY, tableW, tableH * 0.25, tableColor, { layer: 2, category: 'furniture', modifiable: true, id: uid('ttop') }));
  // Table top edge highlight
  elements.push(createRect(tableX + 2, tableY + 1, tableW - 4, 2, tableColor, { layer: 2, category: 'furniture', modifiable: false, opacity: 0.5, id: uid('tedge') }));
  // Table legs
  elements.push(createRect(tableX + tableW * 0.08, tableY + tableH * 0.25, tableW * 0.04, tableH * 0.75, tableColor, { layer: 2, category: 'furniture', modifiable: false, id: uid('tleg') }));
  elements.push(createRect(tableX + tableW * 0.88, tableY + tableH * 0.25, tableW * 0.04, tableH * 0.75, tableColor, { layer: 2, category: 'furniture', modifiable: false, id: uid('tleg') }));
  // Table bottom shelf
  elements.push(createRect(tableX + tableW * 0.05, tableY + tableH * 0.7, tableW * 0.9, tableH * 0.1, tableColor, { layer: 2, category: 'furniture', modifiable: false, opacity: 0.7, id: uid('tshelf') }));

  // Items on table
  // Book stack (always)
  const bookStackX = tableX + 8;
  const bookColors = ['#8B0000', '#1E3A5F', '#2E7D32', '#4A148C', '#E65100'];
  for (let b = 0; b < rng.nextInt(2, 4); b++) {
    const bw = rng.nextFloat(22, 30);
    elements.push(createRect(bookStackX + rng.nextFloat(-2, 2), tableY - 4 - b * 5, bw, 4, rng.pick(bookColors), { layer: 3, category: 'book', modifiable: true, id: uid('book') }));
  }

  // Coffee cup
  if (rng.chance(0.75)) {
    const cupX = tableX + tableW * 0.55;
    const cupY = tableY - 2;
    // Saucer
    elements.push(createEllipse(cupX + 6, cupY + 2, 10, 3, '#F5F5F5', { layer: 3, category: 'cup', modifiable: false, id: uid('saucer') }));
    // Cup body
    elements.push(createRect(cupX, cupY - 10, 12, 12, '#FFF', { layer: 3, category: 'cup', modifiable: true, stroke: '#CCC', strokeWidth: 1, id: uid('cup') }));
    // Cup handle
    elements.push(createCircle(cupX + 14, cupY - 4, 4, 'none', { layer: 3, category: 'cup', modifiable: false, stroke: '#CCC', strokeWidth: 1.5, id: uid('chandle') }));
    // Coffee inside
    elements.push(createRect(cupX + 1.5, cupY - 8, 9, 3, '#6B3410', { layer: 3, category: 'cup', modifiable: false, opacity: 0.8, id: uid('coffee') }));
  }

  // Remote control
  if (rng.chance(0.65)) {
    const remX = tableX + tableW * 0.72;
    elements.push(createRect(remX, tableY - 3, 22, 7, '#333', { layer: 3, category: 'remote', modifiable: true, id: uid('remote') }));
    // Buttons on remote
    elements.push(createCircle(remX + 5, tableY - 0.5, 1.5, '#C00', { layer: 3, category: 'remote', modifiable: false, id: uid('rbtn') }));
    elements.push(createRect(remX + 10, tableY - 2, 3, 2, '#555', { layer: 3, category: 'remote', modifiable: false, id: uid('rbtn') }));
    elements.push(createRect(remX + 14, tableY - 2, 3, 2, '#555', { layer: 3, category: 'remote', modifiable: false, id: uid('rbtn') }));
  }

  // Small potted plant on table
  if (rng.chance(0.5)) {
    const spx = tableX + tableW * 0.38;
    const potColor = rng.pick(['#A0522D', '#D2691E', '#CD853F']);
    elements.push(createRect(spx - 5, tableY - 8, 10, 8, potColor, { layer: 3, category: 'plant', modifiable: true, id: uid('tpot') }));
    elements.push(createCircle(spx, tableY - 14, 7, rng.nextHSL([90, 140], [40, 60], [30, 50]), { layer: 3, category: 'plant', modifiable: false, id: uid('tplant') }));
    elements.push(createCircle(spx - 5, tableY - 11, 4, rng.nextHSL([90, 140], [40, 60], [35, 55]), { layer: 3, category: 'plant', modifiable: false, id: uid('tleaf') }));
    elements.push(createCircle(spx + 5, tableY - 11, 4, rng.nextHSL([90, 140], [40, 60], [35, 55]), { layer: 3, category: 'plant', modifiable: false, id: uid('tleaf') }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Bookshelf (left wall, packed with books)
  // ════════════════════════════════════════════

  const shelfX = w * 0.01;
  const shelfY = h * 0.12;
  const shelfW = w * 0.13;
  const shelfH = h * 0.56;

  // Bookshelf frame
  elements.push(createRect(shelfX, shelfY, shelfW, shelfH, '#6B3410', { layer: 2, category: 'furniture', modifiable: true, stroke: '#5C3317', strokeWidth: 1.5, id: uid('shelf') }));
  // Shelves and books
  const shelfCount = 5;
  const bookHues = [0, 30, 60, 120, 200, 240, 280, 320];
  for (let s = 0; s < shelfCount; s++) {
    const sy = shelfY + s * (shelfH / shelfCount);
    const sectionH = shelfH / shelfCount;
    // Shelf plank
    elements.push(createRect(shelfX, sy, shelfW, 3, '#5C3317', { layer: 2, category: 'furniture', modifiable: false, id: uid('plank') }));
    // Books on each shelf
    const books = rng.nextInt(4, 7);
    let bx = shelfX + 3;
    for (let b = 0; b < books; b++) {
      const bw = rng.nextFloat(shelfW * 0.07, shelfW * 0.16);
      const bh = rng.nextFloat(sectionH * 0.55, sectionH * 0.88);
      const hue = rng.pick(bookHues);
      const bookColor = `hsl(${hue}, ${rng.nextInt(40, 80)}%, ${rng.nextInt(30, 60)}%)`;
      elements.push(createRect(bx, sy + sectionH - bh, bw, bh - 3, bookColor, { layer: 2, category: 'book', modifiable: false, id: uid('bk') }));
      // Occasional spine detail
      if (rng.chance(0.4)) {
        elements.push(createRect(bx + bw * 0.3, sy + sectionH - bh + 3, bw * 0.4, 2, '#FFF', { layer: 2, category: 'book', modifiable: false, opacity: 0.3, id: uid('bksp') }));
      }
      bx += bw + rng.nextFloat(1, 3);
      if (bx > shelfX + shelfW - 5) break;
    }
  }
  // Small decorative object on one shelf (globe / figurine)
  if (rng.chance(0.6)) {
    const decoShelf = rng.nextInt(0, shelfCount - 1);
    const decoY = shelfY + decoShelf * (shelfH / shelfCount) + shelfH / shelfCount - 10;
    elements.push(createCircle(shelfX + shelfW - 10, decoY, 5, rng.pick(['#4682B4', '#DAA520', '#CD853F']), { layer: 2, category: 'decor', modifiable: true, id: uid('deco') }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — TV or large framed picture
  // ════════════════════════════════════════════

  const hasTV = rng.chance(0.55);

  if (hasTV) {
    // TV on stand
    const tvX = w * 0.63;
    const tvY = h * 0.22;
    const tvW = w * 0.2;
    const tvH = h * 0.22;

    // TV stand (low cabinet)
    elements.push(createRect(tvX - 5, tvY + tvH + 5, tvW + 10, h * 0.08, '#5C3317', { layer: 2, category: 'furniture', modifiable: false, id: uid('tvstand') }));
    // Cabinet door lines
    elements.push(createLine(tvX + tvW / 2, tvY + tvH + 5, tvX + tvW / 2, tvY + tvH + 5 + h * 0.08, '#4A2810', { strokeWidth: 1, layer: 2, category: 'furniture', modifiable: false, id: uid('tvdoor') }));
    // Cabinet knobs
    elements.push(createCircle(tvX + tvW * 0.35, tvY + tvH + 5 + h * 0.04, 2, '#DAA520', { layer: 2, category: 'furniture', modifiable: false, id: uid('knob') }));
    elements.push(createCircle(tvX + tvW * 0.65, tvY + tvH + 5 + h * 0.04, 2, '#DAA520', { layer: 2, category: 'furniture', modifiable: false, id: uid('knob') }));

    // TV bezel
    elements.push(createRect(tvX, tvY, tvW, tvH, '#111', { layer: 2, category: 'tv', modifiable: true, id: uid('tv') }));
    // TV screen
    elements.push(createRect(tvX + 4, tvY + 3, tvW - 8, tvH - 6, '#1A1A2E', { layer: 2, category: 'tv', modifiable: false, id: uid('screen') }));
    // Screen reflection
    elements.push(createRect(tvX + tvW * 0.6, tvY + 5, tvW * 0.25, tvH * 0.4, '#FFF', { layer: 2, category: 'tv', modifiable: false, opacity: 0.04, id: uid('reflect') }));
    // Power LED
    elements.push(createCircle(tvX + tvW / 2, tvY + tvH - 3, 1.5, '#0F0', { layer: 2, category: 'tv', modifiable: false, opacity: 0.6, id: uid('led') }));
  } else {
    // Large framed picture
    const picX = w * 0.62;
    const picY = h * 0.1;
    const picW = w * 0.22;
    const picH = h * 0.28;
    const frameColor = rng.pick(['#8B6914', '#333', '#DAA520', '#C0C0C0']);
    const artBg = rng.nextColor([0, 360], [20, 50], [70, 90]);

    elements.push(createRect(picX, picY, picW, picH, frameColor, { layer: 2, category: 'picture', modifiable: true, id: uid('lgpic') }));
    elements.push(createRect(picX + 5, picY + 5, picW - 10, picH - 10, artBg, { layer: 2, category: 'picture', modifiable: false, id: uid('canvas') }));
    // Landscape inside the picture
    elements.push(createRect(picX + 5, picY + picH * 0.6, picW - 10, picH * 0.4 - 10, rng.nextHSL([90, 140], [30, 50], [35, 50]), { layer: 2, category: 'picture', modifiable: false, opacity: 0.7, id: uid('pland') }));
    elements.push(createCircle(picX + picW * 0.75, picY + picH * 0.3, 8, '#FFD700', { layer: 2, category: 'picture', modifiable: false, opacity: 0.6, id: uid('psun') }));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Wall clock
  // ════════════════════════════════════════════

  const clockX = w * 0.45;
  const clockY = h * 0.13;
  const clockR = rng.nextFloat(18, 24);
  elements.push(createClock(clockX, clockY, clockR, rng));

  // ════════════════════════════════════════════
  //  LAYER 3 — Framed wall pictures (2-3)
  // ════════════════════════════════════════════

  const picCount = rng.nextInt(2, 3);
  const picPositions = [
    { x: w * 0.2, y: h * 0.06 },
    { x: w * 0.32, y: h * 0.08 },
    { x: w * 0.15, y: h * 0.05 },
  ];
  for (let i = 0; i < picCount; i++) {
    const pp = picPositions[i];
    const pw = rng.nextFloat(40, 60);
    const ph = rng.nextFloat(30, 45);
    elements.push(createPicture(pp.x, pp.y, pw, ph, rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Floor lamp with warm glow
  // ════════════════════════════════════════════

  const lampOnRight = rng.chance(0.5);
  const flampX = lampOnRight ? w * 0.88 : w * 0.06;
  const flampBaseY = wallBottom - 3;

  // Lamp pole
  elements.push(createRect(flampX - 2, h * 0.2, 4, flampBaseY - h * 0.2, '#8B7355', { layer: 2, category: 'lamp', modifiable: false, id: uid('lpole') }));
  // Lamp base
  elements.push(createEllipse(flampX, flampBaseY, 12, 4, '#8B7355', { layer: 2, category: 'lamp', modifiable: false, id: uid('lbase') }));

  // Lamp shade (trapezoid shape via path)
  const shadeTop = h * 0.18;
  const shadeBot = h * 0.26;
  const shadeTopW = 14;
  const shadeBotW = 22;
  const shadePath = `M${flampX - shadeTopW},${shadeTop} L${flampX - shadeBotW},${shadeBot} L${flampX + shadeBotW},${shadeBot} L${flampX + shadeTopW},${shadeTop} Z`;
  elements.push(createPath(flampX, shadeTop, shadePath, lampShadeColor, { layer: 3, category: 'lamp', modifiable: true, id: uid('shade'), stroke: '#D4B896', strokeWidth: 1 }));

  // Warm glow circle (radial gradient)
  elements.push(createCircle(flampX, shadeBot - 5, 55, 'url(#lampGlow)', { layer: 1, category: 'lamp', modifiable: false, opacity: 0.6, id: uid('glow') }));

  // ════════════════════════════════════════════
  //  LAYER 3 — Potted plants (2-3)
  // ════════════════════════════════════════════

  const plantCount = rng.nextInt(2, 3);
  const plantSpots = [
    { x: lampOnRight ? w * 0.92 : w * 0.94, y: wallBottom - 3 },
    { x: w * 0.58, y: wallBottom - 3 },
    { x: w * 0.03, y: wallBottom - 3 },
  ];
  for (let i = 0; i < plantCount; i++) {
    const ps = plantSpots[i];
    elements.push(createPottedPlant(ps.x, ps.y, rng.nextFloat(28, 48), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Side table with vase
  // ════════════════════════════════════════════

  const sideRight = !lampOnRight; // Put side table opposite to lamp
  const sideX = sideRight ? sofaX + sofaW + 18 : sofaX - 45;
  const sideY = h * 0.57;
  const sideW = 32;
  const sideH = wallBottom - sideY;
  const sideColor = rng.pick(['#8B6914', '#A0522D', '#6B3410']);

  // Side table
  elements.push(createRect(sideX, sideY, sideW, 4, sideColor, { layer: 2, category: 'furniture', modifiable: true, id: uid('sidetop') }));
  elements.push(createRect(sideX + 5, sideY + 4, 4, sideH - 4, sideColor, { layer: 2, category: 'furniture', modifiable: false, id: uid('sideleg') }));
  elements.push(createRect(sideX + sideW - 9, sideY + 4, 4, sideH - 4, sideColor, { layer: 2, category: 'furniture', modifiable: false, id: uid('sideleg') }));
  // Small shelf
  elements.push(createRect(sideX + 2, sideY + sideH * 0.5, sideW - 4, 3, sideColor, { layer: 2, category: 'furniture', modifiable: false, opacity: 0.7, id: uid('sideshlf') }));

  // Vase with flowers on side table
  const vaseX = sideX + sideW / 2;
  elements.push(createVase(vaseX, sideY - 2, rng.nextFloat(22, 30), rng));
  // Flower stems poking out of vase
  for (let f = 0; f < rng.nextInt(2, 4); f++) {
    const fx = vaseX + rng.nextFloat(-6, 6);
    const fy = sideY - rng.nextFloat(22, 32);
    elements.push(createCircle(fx, fy, rng.nextFloat(3, 5), rng.nextColor([0, 360], [60, 90], [55, 75]), { layer: 3, category: 'flower', modifiable: false, id: uid('flwr') }));
    elements.push(createLine(fx, fy + 3, vaseX, sideY - 12, rng.nextHSL([100, 130], [40, 60], [30, 45]), { strokeWidth: 1, layer: 3, category: 'flower', modifiable: false, id: uid('stem') }));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Cat on sofa (optional)
  // ════════════════════════════════════════════

  if (rng.chance(0.45)) {
    const catColor = rng.pick(['#FF8C00', '#333', '#FFF', '#808080', '#A0522D', '#F5DEB3']);
    const cx = sofaX + sofaW * 0.7;
    const cy = sofaY - 4;

    // Cat body (oval)
    elements.push(createEllipse(cx, cy + 3, 14, 9, catColor, { layer: 3, category: 'cat', modifiable: true, id: uid('catbody') }));
    // Cat head
    elements.push(createCircle(cx - 12, cy - 4, 8, catColor, { layer: 3, category: 'cat', modifiable: false, id: uid('cathead') }));
    // Ears (triangles)
    const ear1 = `${cx - 17},${cy - 10} ${cx - 14},${cy - 18} ${cx - 11},${cy - 10}`;
    const ear2 = `${cx - 9},${cy - 10} ${cx - 6},${cy - 18} ${cx - 3},${cy - 10}`;
    elements.push(createPolygon(cx, cy, ear1, catColor, { layer: 3, category: 'cat', modifiable: false, id: uid('cear') }));
    elements.push(createPolygon(cx, cy, ear2, catColor, { layer: 3, category: 'cat', modifiable: false, id: uid('cear') }));
    // Inner ears
    const iear1 = `${cx - 16},${cy - 11} ${cx - 14},${cy - 16} ${cx - 12},${cy - 11}`;
    const iear2 = `${cx - 8},${cy - 11} ${cx - 6},${cy - 16} ${cx - 4},${cy - 11}`;
    elements.push(createPolygon(cx, cy, iear1, '#FFB6C1', { layer: 3, category: 'cat', modifiable: false, opacity: 0.5, id: uid('ciear') }));
    elements.push(createPolygon(cx, cy, iear2, '#FFB6C1', { layer: 3, category: 'cat', modifiable: false, opacity: 0.5, id: uid('ciear') }));
    // Eyes
    elements.push(createCircle(cx - 15, cy - 5, 2, '#333', { layer: 3, category: 'cat', modifiable: false, id: uid('ceye') }));
    elements.push(createCircle(cx - 9, cy - 5, 2, '#333', { layer: 3, category: 'cat', modifiable: false, id: uid('ceye') }));
    // Nose
    elements.push(createCircle(cx - 12, cy - 2, 1, '#FF69B4', { layer: 3, category: 'cat', modifiable: false, id: uid('cnose') }));
    // Tail (curved)
    const tailPath = `M${cx + 14},${cy + 3} Q${cx + 25},${cy - 10} ${cx + 20},${cy - 18}`;
    elements.push(createPath(cx, cy, tailPath, 'none', { stroke: catColor, strokeWidth: 3, layer: 3, category: 'cat', modifiable: false, id: uid('ctail') }));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Extra decorative details
  // ════════════════════════════════════════════

  // Light switch on wall
  elements.push(createRect(w * 0.52, h * 0.4, 6, 10, '#F5F5F5', { layer: 3, category: 'decor', modifiable: false, stroke: '#CCC', strokeWidth: 0.5, id: uid('switch') }));
  elements.push(createRect(w * 0.523, h * 0.42, 3, 3, '#DDD', { layer: 3, category: 'decor', modifiable: false, id: uid('swtoggle') }));

  // Electrical outlet near baseboard
  elements.push(createRect(w * 0.38, wallBottom - 16, 7, 10, '#F5F5F5', { layer: 3, category: 'decor', modifiable: false, stroke: '#CCC', strokeWidth: 0.5, id: uid('outlet') }));

  // Coasters on coffee table
  if (rng.chance(0.5)) {
    elements.push(createCircle(tableX + tableW * 0.85, tableY + 1, 5, '#8B6914', { layer: 3, category: 'decor', modifiable: false, opacity: 0.5, id: uid('coaster') }));
  }

  // Magazine on coffee table shelf
  if (rng.chance(0.55)) {
    elements.push(createRect(tableX + tableW * 0.2, tableY + tableH * 0.72, 25, 4, rng.pick(['#E74C3C', '#3498DB', '#F39C12']), { layer: 3, category: 'decor', modifiable: true, id: uid('mag') }));
  }

  // Throw blanket draped on sofa arm
  if (rng.chance(0.5)) {
    const blanketColor = rng.nextColor([0, 360], [30, 60], [60, 80]);
    const bx = sofaX + sofaW - 8;
    elements.push(createRect(bx, sofaY - h * 0.04, 24, h * 0.18, blanketColor, { layer: 3, category: 'decor', modifiable: true, opacity: 0.75, id: uid('blanket') }));
    // Fringe at bottom
    for (let f = 0; f < 4; f++) {
      elements.push(createLine(bx + 4 + f * 5, sofaY + h * 0.14, bx + 4 + f * 5, sofaY + h * 0.16, blanketColor, { strokeWidth: 1.5, layer: 3, category: 'decor', modifiable: false, opacity: 0.6, id: uid('fringe') }));
    }
  }

  // Slippers near sofa
  if (rng.chance(0.4)) {
    const slipColor = rng.pick(['#FFB6C1', '#87CEEB', '#DDA0DD', '#F0E68C']);
    const slX = sofaX + sofaW * 0.15;
    const slY = wallBottom + h * 0.02;
    elements.push(createEllipse(slX, slY, 8, 5, slipColor, { layer: 3, category: 'decor', modifiable: true, id: uid('slip') }));
    elements.push(createEllipse(slX + 18, slY + 2, 8, 5, slipColor, { layer: 3, category: 'decor', modifiable: true, id: uid('slip') }));
  }

  return { elements, defs };
}
