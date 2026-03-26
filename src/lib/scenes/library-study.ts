import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath,
  createLine, createGroup, createText,
} from '../engine/primitives';
import {
  combineDefs, indoorDefs, wallGradient, floorGradient, linearGradient,
  radialGradient, woodGrainPattern, fabricPattern, lampGlowGradient,
} from './svg-effects';
import { detailedBookshelf, detailedTable, detailedLamp, resetComponentId } from './svg-components';

let _uid = 0;
function uid(p = 'ls') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

export function generateLibraryStudy(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  // ── Color palette ──
  const wallBase = rng.pick(['#5C3D2E', '#4A3728', '#6B4A3A', '#3E2B1E', '#5A4030']);
  const wallDark = rng.pick(['#3E2B1E', '#332218', '#4A3520']);
  const floorBase = rng.pick(['#8B6E4E', '#7A5E3E', '#6B4E2E']);
  const floorDark = rng.pick(['#6B4E2E', '#5A3E1E', '#4A2E0E']);
  const carpetColor = rng.pick(['#8B0000', '#4A0066', '#003366', '#2E5030', '#6B3A2A']);
  const carpetBorder = rng.pick(['#DAA520', '#C0A060', '#B0903A']);
  const deskColor = rng.pick(['#5C3317', '#4A2810', '#6B4226', '#3E2205']);
  const chairColor = rng.pick(['#8B4513', '#4A6741', '#2E5090', '#6B3A2A']);
  const lampShadeColor = rng.pick(['#2E5030', '#FFFACD', '#8B4513', '#2E2E5A']);

  // ── SVG Defs ──
  const defs = combineDefs(
    indoorDefs(),
    wallGradient('wallGrad', wallBase, wallDark),
    floorGradient('floorGrad', floorBase, floorDark),
    woodGrainPattern('woodPat', floorBase),
    woodGrainPattern('deskPat', deskColor),
    fabricPattern('carpetPat', carpetColor),
    fabricPattern('chairPat', chairColor),
    lampGlowGradient('deskGlow', '#FFF3B0'),
    radialGradient('fireGlow', [
      { offset: '0%', color: '#FF6600', opacity: 0.5 },
      { offset: '50%', color: '#FF4400', opacity: 0.2 },
      { offset: '100%', color: '#FF2200', opacity: 0 },
    ]),
    linearGradient('panelGrad', [
      { offset: '0%', color: wallBase },
      { offset: '50%', color: '#7A5A4A' },
      { offset: '100%', color: wallBase },
    ], '0%', '0%', '100%', '0%'),
  );

  const wallBottom = h * 0.68;

  // ════════════════════════════════════════════
  //  LAYER 0 — Wood-paneled walls & floor
  // ════════════════════════════════════════════

  // Wall
  elements.push(createRect(0, 0, w, wallBottom, 'url(#wallGrad)', { layer: 0, category: 'wall', modifiable: false }));

  // Wood panel vertical strips
  const panelCount = rng.nextInt(10, 14);
  for (let i = 0; i < panelCount; i++) {
    const px = i * (w / panelCount);
    elements.push(createRect(px, 0, 2, wallBottom, wallDark, { layer: 0, category: 'wall', modifiable: false, opacity: 0.3 }));
  }
  // Panel horizontal rail
  elements.push(createRect(0, wallBottom * 0.55, w, 4, wallDark, { layer: 0, category: 'wall', modifiable: false, opacity: 0.4 }));
  // Crown molding
  elements.push(createRect(0, 0, w, 6, '#8B6E4E', { layer: 0, category: 'wall', modifiable: false, opacity: 0.6 }));

  // Floor
  elements.push(createRect(0, wallBottom, w, h - wallBottom, 'url(#woodPat)', { layer: 0, category: 'floor', modifiable: false }));
  // Floor board lines
  const boardCount = rng.nextInt(12, 16);
  for (let i = 0; i < boardCount; i++) {
    elements.push(createRect(i * (w / boardCount), wallBottom, 1, h - wallBottom, '#4A2810', { layer: 0, category: 'floor', modifiable: false, opacity: 0.2 }));
  }
  // Baseboard
  elements.push(createRect(0, wallBottom - 3, w, 6, '#4A3520', { layer: 0, category: 'wall', modifiable: false }));

  // ════════════════════════════════════════════
  //  LAYER 1 — Carpet
  // ════════════════════════════════════════════

  const carpetX = w * 0.15;
  const carpetY = h * 0.73;
  const carpetW = w * 0.55;
  const carpetH = h * 0.18;

  elements.push(createRect(carpetX, carpetY, carpetW, carpetH, carpetColor, {
    layer: 1, category: 'carpet', modifiable: true, id: uid('carpet'), filter: 'url(#softShadow)',
  }));
  // Border
  elements.push(createRect(carpetX + 4, carpetY + 3, carpetW - 8, carpetH - 6, 'none', {
    layer: 1, category: 'carpet', modifiable: false, stroke: carpetBorder, strokeWidth: 2, opacity: 0.7,
  }));
  elements.push(createRect(carpetX + 10, carpetY + 8, carpetW - 20, carpetH - 16, 'none', {
    layer: 1, category: 'carpet', modifiable: false, stroke: carpetBorder, strokeWidth: 1, opacity: 0.4,
  }));
  // Center medallion
  const medX = carpetX + carpetW / 2;
  const medY = carpetY + carpetH / 2;
  elements.push(createEllipse(medX, medY, carpetH * 0.35, carpetH * 0.3, carpetBorder, {
    layer: 1, category: 'carpet', modifiable: false, opacity: 0.3,
  }));

  // ════════════════════════════════════════════
  //  LAYER 2 — Bookshelves (left wall)
  // ════════════════════════════════════════════

  const shelfX = w * 0.01;
  const shelfY = h * 0.06;
  const shelfW = w * 0.18;
  const shelfH = wallBottom - shelfY - 4;
  elements.push(detailedBookshelf(shelfX, shelfY, shelfW, shelfH, rng));

  // Second bookshelf
  const shelf2X = w * 0.2;
  const shelf2W = w * 0.14;
  elements.push(detailedBookshelf(shelf2X, shelfY + 10, shelf2W, shelfH - 15, rng));

  // ════════════════════════════════════════════
  //  LAYER 2 — Fireplace (center-left wall)
  // ════════════════════════════════════════════

  const fpX = w * 0.36;
  const fpY = wallBottom * 0.35;
  const fpW = w * 0.18;
  const fpH = wallBottom - fpY;

  // Fireplace surround
  elements.push(createRect(fpX - 8, fpY - 10, fpW + 16, fpH + 10, '#8B7355', {
    layer: 2, category: 'fireplace', modifiable: false, filter: 'url(#shadow)',
  }));
  // Mantel
  elements.push(createRect(fpX - 14, fpY - 16, fpW + 28, 10, '#6B4E2E', {
    layer: 2, category: 'fireplace', modifiable: true, id: uid('mantel'),
  }));
  // Opening
  elements.push(createRect(fpX, fpY, fpW, fpH - 8, '#1A1A1A', {
    layer: 2, category: 'fireplace', modifiable: false,
  }));
  // Arch top
  elements.push(createPath(fpX, fpY,
    `M${fpX},${fpY + 8} Q${fpX + fpW / 2},${fpY - fpH * 0.08} ${fpX + fpW},${fpY + 8}`,
    '#8B7355', { layer: 2, category: 'fireplace', modifiable: false }));
  // Fire
  const fireColors = ['#FF4400', '#FF6600', '#FFAA00', '#FFD700'];
  for (let f = 0; f < 5; f++) {
    const fx = fpX + fpW * 0.2 + f * (fpW * 0.6 / 5);
    const fy = wallBottom - 12;
    const fh = rng.nextFloat(15, 30);
    elements.push(createPath(fx, fy,
      `M${fx},${fy} Q${fx - 5},${fy - fh * 0.5} ${fx + rng.nextFloat(-3, 3)},${fy - fh} Q${fx + 5},${fy - fh * 0.5} ${fx},${fy}`,
      rng.pick(fireColors), { layer: 2, category: 'fire', modifiable: false, opacity: rng.nextFloat(0.6, 0.9) }));
  }
  // Fire glow
  elements.push(createCircle(fpX + fpW / 2, wallBottom - 10, 40, 'url(#fireGlow)', {
    layer: 1, category: 'fireplace', modifiable: false, opacity: 0.5,
  }));
  // Logs
  elements.push(createEllipse(fpX + fpW * 0.3, wallBottom - 8, 12, 4, '#5C3317', { layer: 2, category: 'fire', modifiable: false }));
  elements.push(createEllipse(fpX + fpW * 0.6, wallBottom - 7, 14, 4, '#4A2810', { layer: 2, category: 'fire', modifiable: false }));

  // ════════════════════════════════════════════
  //  LAYER 2 — Desk with lamp
  // ════════════════════════════════════════════

  const deskX = w * 0.58;
  const deskY = h * 0.58;
  const deskW = w * 0.28;
  const deskH = wallBottom - deskY;

  // Desk body
  elements.push(createRect(deskX, deskY, deskW, 5, deskColor, {
    layer: 2, category: 'desk', modifiable: true, id: uid('desk'), filter: 'url(#shadow)',
  }));
  // Desk front panel
  elements.push(createRect(deskX + 4, deskY + 5, deskW - 8, deskH - 8, deskColor, {
    layer: 2, category: 'desk', modifiable: false, opacity: 0.9,
  }));
  // Drawers
  const drawerCount = rng.nextInt(2, 3);
  const drawerH = (deskH - 12) / drawerCount;
  for (let d = 0; d < drawerCount; d++) {
    const dy = deskY + 8 + d * drawerH;
    elements.push(createRect(deskX + deskW * 0.6, dy, deskW * 0.32, drawerH - 3, deskColor, {
      layer: 2, category: 'desk', modifiable: false, stroke: wallDark, strokeWidth: 0.8,
    }));
    // Drawer handle
    elements.push(createRect(deskX + deskW * 0.72, dy + drawerH / 2 - 2, 8, 3, '#C0A060', { layer: 2, category: 'desk', modifiable: false }));
  }
  // Desk legs
  elements.push(createRect(deskX + 4, deskY + deskH - 3, 5, 6, deskColor, { layer: 2, category: 'desk', modifiable: false }));
  elements.push(createRect(deskX + deskW - 9, deskY + deskH - 3, 5, 6, deskColor, { layer: 2, category: 'desk', modifiable: false }));

  // Desk lamp
  elements.push(detailedLamp(deskX + deskW * 0.78, deskY - 2, 55, rng));
  // Lamp glow
  elements.push(createCircle(deskX + deskW * 0.78, deskY - 30, 40, 'url(#deskGlow)', {
    layer: 1, category: 'lamp', modifiable: false, opacity: 0.5,
  }));

  // Open book on desk
  const bookX = deskX + 15;
  const bookY = deskY - 2;
  elements.push(createRect(bookX, bookY - 8, 35, 22, '#F5F0E0', {
    layer: 3, category: 'book', modifiable: true, id: uid('obook'), filter: 'url(#softShadow)',
  }));
  // Book spine/fold
  elements.push(createLine(bookX + 17, bookY - 8, bookX + 17, bookY + 14, '#C8B8A0', { strokeWidth: 1, layer: 3 }));
  // Text lines on pages
  for (let line = 0; line < 5; line++) {
    const lw = rng.nextFloat(8, 14);
    elements.push(createRect(bookX + 3, bookY - 5 + line * 3.5, lw, 1, '#999', { layer: 3, category: 'book', modifiable: false, opacity: 0.4 }));
    elements.push(createRect(bookX + 20, bookY - 5 + line * 3.5, lw, 1, '#999', { layer: 3, category: 'book', modifiable: false, opacity: 0.4 }));
  }

  // Pen
  elements.push(createLine(deskX + 55, deskY - 3, deskX + 72, deskY - 8, '#1A1A5A', {
    strokeWidth: 2, layer: 3, category: 'pen', modifiable: true, id: uid('pen'),
  }));
  elements.push(createCircle(deskX + 72, deskY - 8, 1.5, '#C0A060', { layer: 3, category: 'pen', modifiable: false }));

  // Inkwell
  if (rng.chance(0.5)) {
    elements.push(createRect(deskX + 76, deskY - 6, 8, 6, '#222', {
      layer: 3, category: 'ink', modifiable: true, id: uid('ink'),
    }));
    elements.push(createRect(deskX + 74, deskY - 8, 12, 3, '#333', { layer: 3, category: 'ink', modifiable: false }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Armchair
  // ════════════════════════════════════════════

  const chairX = w * 0.38;
  const chairY = h * 0.65;
  const chairW = w * 0.14;
  const chairH = h * 0.15;

  // Chair back
  elements.push(createRect(chairX - 4, chairY - chairH * 0.6, chairW + 8, chairH * 0.6, chairColor, {
    layer: 2, category: 'chair', modifiable: false, opacity: 0.85,
  }));
  // Chair seat
  elements.push(createRect(chairX, chairY, chairW, chairH, chairColor, {
    layer: 2, category: 'chair', modifiable: true, id: uid('chair'), filter: 'url(#shadow)',
  }));
  // Arms
  elements.push(createRect(chairX - 12, chairY - chairH * 0.3, 14, chairH * 0.8, chairColor, { layer: 2, category: 'chair', modifiable: false, opacity: 0.9 }));
  elements.push(createRect(chairX + chairW - 2, chairY - chairH * 0.3, 14, chairH * 0.8, chairColor, { layer: 2, category: 'chair', modifiable: false, opacity: 0.9 }));
  // Cushion
  elements.push(createRect(chairX + 4, chairY + 3, chairW - 8, chairH * 0.35, chairColor, {
    layer: 2, category: 'chair', modifiable: false, opacity: 0.7,
  }));
  // Chair legs
  elements.push(createRect(chairX, chairY + chairH, 5, 6, '#4A2810', { layer: 2, category: 'chair', modifiable: false }));
  elements.push(createRect(chairX + chairW - 5, chairY + chairH, 5, 6, '#4A2810', { layer: 2, category: 'chair', modifiable: false }));

  // ════════════════════════════════════════════
  //  LAYER 2 — Globe
  // ════════════════════════════════════════════

  const globeX = w * 0.9;
  const globeY = h * 0.5;
  const globeR = rng.nextFloat(16, 22);

  // Globe stand
  elements.push(createRect(globeX - 6, globeY + globeR + 2, 12, 4, '#8B7355', {
    layer: 2, category: 'globe', modifiable: false,
  }));
  elements.push(createRect(globeX - 1.5, globeY + 2, 3, globeR + 2, '#8B7355', { layer: 2, category: 'globe', modifiable: false }));
  // Globe sphere
  elements.push(createCircle(globeX, globeY, globeR, '#4A90B0', {
    layer: 2, category: 'globe', modifiable: true, id: uid('globe'), stroke: '#8B7355', strokeWidth: 1.5, filter: 'url(#shadow)',
  }));
  // Continents (simplified)
  elements.push(createEllipse(globeX - globeR * 0.2, globeY - globeR * 0.2, globeR * 0.35, globeR * 0.25, '#5A8B50', {
    layer: 2, category: 'globe', modifiable: false, opacity: 0.7,
  }));
  elements.push(createEllipse(globeX + globeR * 0.3, globeY + globeR * 0.15, globeR * 0.2, globeR * 0.3, '#5A8B50', {
    layer: 2, category: 'globe', modifiable: false, opacity: 0.7,
  }));
  // Axis ring
  elements.push(createEllipse(globeX, globeY, globeR + 3, globeR + 3, 'none', {
    layer: 2, category: 'globe', modifiable: false, stroke: '#8B7355', strokeWidth: 1, opacity: 0.5,
  }));

  // ════════════════════════════════════════════
  //  LAYER 3 — Wall clock
  // ════════════════════════════════════════════

  const clockX = w * 0.54;
  const clockY = h * 0.1;
  const clockR = rng.nextFloat(20, 26);

  elements.push(createCircle(clockX, clockY, clockR, '#FFFFF0', {
    layer: 3, category: 'clock', modifiable: true, stroke: '#5C3317', strokeWidth: 3, id: uid('clock'), filter: 'url(#shadow)',
  }));
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 - 90) * Math.PI / 180;
    const isMain = i % 3 === 0;
    if (isMain) {
      const txt = [12, 3, 6, 9][i / 3].toString();
      elements.push(createText(
        clockX + Math.cos(a) * clockR * 0.72 - 4,
        clockY + Math.sin(a) * clockR * 0.72 + 4,
        txt, '#333', { fontSize: 7, layer: 3 }));
    } else {
      elements.push(createCircle(clockX + Math.cos(a) * clockR * 0.8, clockY + Math.sin(a) * clockR * 0.8, 1, '#333', { layer: 3 }));
    }
  }
  const hour = rng.nextInt(1, 12);
  const min = rng.nextInt(0, 11) * 5;
  const hAngle = (hour * 30 + min * 0.5 - 90) * Math.PI / 180;
  const mAngle = (min * 6 - 90) * Math.PI / 180;
  elements.push(createLine(clockX, clockY, clockX + Math.cos(hAngle) * clockR * 0.5, clockY + Math.sin(hAngle) * clockR * 0.5, '#333', { strokeWidth: 2.5, layer: 3 }));
  elements.push(createLine(clockX, clockY, clockX + Math.cos(mAngle) * clockR * 0.7, clockY + Math.sin(mAngle) * clockR * 0.7, '#333', { strokeWidth: 1.5, layer: 3 }));
  elements.push(createCircle(clockX, clockY, 2, '#DAA520', { layer: 3 }));

  // ════════════════════════════════════════════
  //  LAYER 3 — Painting on wall
  // ════════════════════════════════════════════

  const picX = w * 0.65;
  const picY = h * 0.06;
  const picW = rng.nextFloat(60, 80);
  const picH = rng.nextFloat(45, 55);
  const frameColor = rng.pick(['#DAA520', '#8B6914', '#5C3317']);

  elements.push(createRect(picX, picY, picW, picH, frameColor, {
    layer: 3, category: 'painting', modifiable: true, id: uid('paint'), filter: 'url(#shadow)',
  }));
  elements.push(createRect(picX + 4, picY + 4, picW - 8, picH - 8, rng.nextColor([0, 360], [20, 50], [60, 80]), {
    layer: 3, category: 'painting', modifiable: false,
  }));
  // Landscape in painting
  elements.push(createRect(picX + 4, picY + picH * 0.55, picW - 8, picH * 0.45 - 8, '#4A8B3E', {
    layer: 3, category: 'painting', modifiable: false, opacity: 0.6,
  }));
  elements.push(createCircle(picX + picW * 0.75, picY + picH * 0.3, 6, '#FFD700', {
    layer: 3, category: 'painting', modifiable: false, opacity: 0.5,
  }));

  // ════════════════════════════════════════════
  //  LAYER 3 — Mantel items
  // ════════════════════════════════════════════

  const mantelY = fpY - 16;

  // Candelabra
  const candX = fpX + 10;
  elements.push(createRect(candX - 6, mantelY - 4, 12, 4, '#DAA520', { layer: 3, category: 'candle', modifiable: false }));
  for (let c = 0; c < 3; c++) {
    const cx = candX - 4 + c * 4;
    elements.push(createRect(cx, mantelY - 18, 3, 14, '#FFF8DC', {
      layer: 3, category: 'candle', modifiable: true, id: uid('candle'),
    }));
    // Flame
    elements.push(createEllipse(cx + 1.5, mantelY - 20, 2, 3, '#FFD700', { layer: 3, category: 'candle', modifiable: false, opacity: 0.8 }));
  }

  // Photo frame on mantel
  if (rng.chance(0.7)) {
    const pfx = fpX + fpW - 20;
    elements.push(createRect(pfx, mantelY - 20, 16, 20, '#8B6914', {
      layer: 3, category: 'frame', modifiable: true, id: uid('frame'), filter: 'url(#softShadow)',
    }));
    elements.push(createRect(pfx + 2, mantelY - 18, 12, 16, '#F0E8D8', { layer: 3, category: 'frame', modifiable: false }));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Reading glasses on desk
  // ════════════════════════════════════════════

  if (rng.chance(0.65)) {
    const gx = deskX + 40;
    const gy = deskY - 3;
    // Left lens
    elements.push(createCircle(gx, gy, 5, 'none', {
      layer: 3, category: 'glasses', modifiable: true, id: uid('glass'), stroke: '#8B7355', strokeWidth: 1.2,
    }));
    // Right lens
    elements.push(createCircle(gx + 12, gy, 5, 'none', { layer: 3, category: 'glasses', modifiable: false, stroke: '#8B7355', strokeWidth: 1.2 }));
    // Bridge
    elements.push(createLine(gx + 5, gy, gx + 7, gy, '#8B7355', { strokeWidth: 1, layer: 3 }));
    // Arms
    elements.push(createLine(gx - 5, gy, gx - 12, gy + 4, '#8B7355', { strokeWidth: 1, layer: 3 }));
    elements.push(createLine(gx + 17, gy, gx + 24, gy + 4, '#8B7355', { strokeWidth: 1, layer: 3 }));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Extra books stacked on desk
  // ════════════════════════════════════════════

  const bookColors = ['#8B0000', '#1E3A5F', '#2E7D32', '#4A148C', '#E65100', '#333'];
  for (let b = 0; b < rng.nextInt(2, 4); b++) {
    const bw = rng.nextFloat(20, 30);
    elements.push(createRect(deskX + deskW * 0.35 + rng.nextFloat(-3, 3), deskY - 4 - b * 5, bw, 4, rng.pick(bookColors), {
      layer: 3, category: 'book', modifiable: true, id: uid('sbook'),
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Decorative items on bookshelf top
  // ════════════════════════════════════════════

  // Small bust/figurine
  if (rng.chance(0.5)) {
    const bx = shelfX + shelfW / 2;
    const by = shelfY - 2;
    elements.push(createEllipse(bx, by - 5, 5, 8, '#D0C0A0', {
      layer: 3, category: 'decor', modifiable: true, id: uid('bust'),
    }));
    elements.push(createCircle(bx, by - 15, 5, '#D0C0A0', { layer: 3, category: 'decor', modifiable: false }));
  }

  // Quill in holder
  if (rng.chance(0.6)) {
    const qx = deskX + deskW - 15;
    const qy = deskY - 2;
    elements.push(createRect(qx - 3, qy - 10, 6, 10, '#4A2810', {
      layer: 3, category: 'quill', modifiable: true, id: uid('qhold'),
    }));
    elements.push(createLine(qx, qy - 10, qx - 4, qy - 28, '#333', { strokeWidth: 1, layer: 3 }));
    elements.push(createPath(qx, qy,
      `M${qx - 4},${qy - 28} L${qx - 8},${qy - 24} L${qx - 4},${qy - 22}`,
      '#DDD', { layer: 3, category: 'quill', modifiable: false, opacity: 0.8 }));
  }

  return { elements, defs };
}
