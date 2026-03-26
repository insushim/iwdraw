import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPolygon, createPath,
  createLine, createGroup,
} from '../engine/primitives';
import {
  combineDefs, indoorDefs, wallGradient, floorGradient, linearGradient,
  lampGlowGradient, woodGrainPattern, fabricPattern,
} from './svg-effects';
import {
  detailedBookshelf, detailedTable, detailedLamp, detailedFlower,
  resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'lr') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

export function generateCozyLivingRoom(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
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

  // ── SVG Defs ──
  const defs = combineDefs(
    indoorDefs(),
    wallGradient('wallGrad', wallBase, wallDark),
    floorGradient('floorGrad', floorBase, floorDark),
    linearGradient('skyGrad', [
      { offset: '0%', color: skyTop },
      { offset: '100%', color: skyBottom },
    ]),
    linearGradient('wainscotGrad', [
      { offset: '0%', color: '#F5DEB3' },
      { offset: '100%', color: '#D2B48C' },
    ]),
    woodGrainPattern('woodPat', floorBase),
    fabricPattern('fabricPat', sofaColor),
  );

  // ════════════════════════════════════════════
  //  LAYER 0 — Walls, floor, ceiling trim
  // ════════════════════════════════════════════

  const wallBottom = h * 0.7;
  const wainscotTop = h * 0.5;

  // Wall
  elements.push(createRect(0, 0, w, wallBottom, 'url(#wallGrad)', { layer: 0, category: 'wall', modifiable: false }));

  // Subtle wallpaper stripes
  elements.push(createRect(0, h * 0.18, w, 2, wallDark, { layer: 0, category: 'wall', modifiable: false, opacity: 0.3 }));
  elements.push(createRect(0, h * 0.22, w, 1, wallDark, { layer: 0, category: 'wall', modifiable: false, opacity: 0.2 }));

  // Wainscoting panel
  elements.push(createRect(0, wainscotTop, w, wallBottom - wainscotTop, 'url(#wainscotGrad)', { layer: 0, category: 'wall', modifiable: false }));
  // Wainscoting top rail
  elements.push(createRect(0, wainscotTop - 2, w, 4, '#C4A46C', { layer: 0, category: 'wall', modifiable: false }));
  // Wainscoting panel rectangles
  const panelCount = rng.nextInt(4, 7);
  const panelW = (w - 20) / panelCount;
  for (let i = 0; i < panelCount; i++) {
    const px = 10 + i * panelW + 6;
    elements.push(createRect(px, wainscotTop + 8, panelW - 12, wallBottom - wainscotTop - 16, 'none', {
      layer: 0, category: 'wall', modifiable: false, stroke: '#C4A46C', strokeWidth: 1.5, opacity: 0.5,
    }));
  }

  // Crown molding
  elements.push(createRect(0, 0, w, 5, '#E8D5B7', { layer: 0, category: 'wall', modifiable: false, opacity: 0.7 }));
  elements.push(createRect(0, 5, w, 3, '#D4C4A0', { layer: 0, category: 'wall', modifiable: false, opacity: 0.5 }));

  // Floor
  elements.push(createRect(0, wallBottom, w, h * 0.3, 'url(#floorGrad)', { layer: 0, category: 'floor', modifiable: false }));
  // Floor board lines
  const boardCount = rng.nextInt(10, 14);
  for (let i = 0; i < boardCount; i++) {
    elements.push(createRect(i * (w / boardCount), wallBottom, 1, h * 0.3, '#A0855A', { layer: 0, category: 'floor', modifiable: false, opacity: 0.25 }));
  }
  for (let j = 0; j < 3; j++) {
    const by = wallBottom + (j + 1) * (h * 0.3 / 4);
    elements.push(createRect(0, by, w, 1, '#A0855A', { layer: 0, category: 'floor', modifiable: false, opacity: 0.15 }));
  }

  // Baseboard
  elements.push(createRect(0, wallBottom - 3, w, 6, '#8B7355', { layer: 1, category: 'wall', modifiable: false }));

  // ════════════════════════════════════════════
  //  LAYER 1 — Window with sky
  // ════════════════════════════════════════════

  const windowX = rng.nextFloat(w * 0.57, w * 0.72);
  const windowW = w * 0.2;
  const windowH = h * 0.35;
  const windowY = h * 0.08;

  // Window frame
  elements.push(createRect(windowX - 4, windowY - 4, windowW + 8, windowH + 12, '#FFF', { layer: 1, category: 'window', modifiable: false }));
  // Sky inside window
  elements.push(createRect(windowX, windowY, windowW, windowH, 'url(#skyGrad)', { layer: 1, category: 'window', modifiable: true, id: uid('sky') }));
  // Clouds in window
  const cloudY = windowY + windowH * 0.25;
  elements.push(createEllipse(windowX + windowW * 0.3, cloudY, windowW * 0.12, windowH * 0.06, '#FFF', { layer: 1, category: 'window', modifiable: false, opacity: 0.85 }));
  elements.push(createEllipse(windowX + windowW * 0.45, cloudY - 3, windowW * 0.08, windowH * 0.05, '#FFF', { layer: 1, category: 'window', modifiable: false, opacity: 0.75 }));
  elements.push(createEllipse(windowX + windowW * 0.7, cloudY + 8, windowW * 0.1, windowH * 0.05, '#FAFAFA', { layer: 1, category: 'window', modifiable: false, opacity: 0.7 }));
  // Window cross bars
  elements.push(createRect(windowX + windowW / 2 - 1.5, windowY, 3, windowH, '#FFF', { layer: 1, category: 'window', modifiable: false }));
  elements.push(createRect(windowX, windowY + windowH / 2 - 1.5, windowW, 3, '#FFF', { layer: 1, category: 'window', modifiable: false }));
  // Window sill
  elements.push(createRect(windowX - 6, windowY + windowH, windowW + 12, 6, '#E0D0B8', { layer: 1, category: 'window', modifiable: false }));

  // Curtain rod + finials
  elements.push(createRect(windowX - 25, windowY - 8, windowW + 50, 3, '#8B7355', { layer: 1, category: 'curtain', modifiable: false }));
  elements.push(createCircle(windowX - 25, windowY - 6.5, 4, '#8B7355', { layer: 1, category: 'curtain', modifiable: false }));
  elements.push(createCircle(windowX + windowW + 25, windowY - 6.5, 4, '#8B7355', { layer: 1, category: 'curtain', modifiable: false }));

  // Curtains (with fold detail)
  const curtainH = h * 0.45;
  const leftCX = windowX - 20;
  elements.push(createRect(leftCX, windowY - 5, 22, curtainH, curtainColor, { layer: 1, category: 'curtain', modifiable: true, id: uid('lcurt'), filter: 'url(#softShadow)' }));
  elements.push(createRect(leftCX + 7, windowY - 5, 4, curtainH, curtainColor, { layer: 1, category: 'curtain', modifiable: false, opacity: 0.7 }));
  elements.push(createRect(leftCX + 15, windowY - 5, 3, curtainH, curtainColor, { layer: 1, category: 'curtain', modifiable: false, opacity: 0.6 }));
  const rightCX = windowX + windowW - 2;
  elements.push(createRect(rightCX, windowY - 5, 22, curtainH, curtainColor, { layer: 1, category: 'curtain', modifiable: true, id: uid('rcurt'), filter: 'url(#softShadow)' }));
  elements.push(createRect(rightCX + 5, windowY - 5, 4, curtainH, curtainColor, { layer: 1, category: 'curtain', modifiable: false, opacity: 0.7 }));
  elements.push(createRect(rightCX + 13, windowY - 5, 3, curtainH, curtainColor, { layer: 1, category: 'curtain', modifiable: false, opacity: 0.6 }));

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

  elements.push(createRect(rugX, rugY, rugW, rugH, rugColor, { layer: 1, category: 'rug', modifiable: true, id: uid('rug'), filter: 'url(#softShadow)' }));
  elements.push(createRect(rugX + 4, rugY + 3, rugW - 8, rugH - 6, rugBorder, { layer: 1, category: 'rug', modifiable: false, opacity: 0.35 }));
  elements.push(createRect(rugX + 10, rugY + 7, rugW - 20, rugH - 14, 'none', { layer: 1, category: 'rug', modifiable: false, stroke: rugAccent, strokeWidth: 1.5, opacity: 0.5 }));
  const rcx = rugX + rugW / 2;
  const rcy = rugY + rugH / 2;
  const dSize = rugH * 0.28;
  const diamondPts = `${rcx},${rcy - dSize} ${rcx + dSize * 1.5},${rcy} ${rcx},${rcy + dSize} ${rcx - dSize * 1.5},${rcy}`;
  elements.push(createPolygon(rcx, rcy, diamondPts, rugAccent, { layer: 1, category: 'rug', modifiable: false, opacity: 0.4 }));

  // ════════════════════════════════════════════
  //  LAYER 2 — Sofa (detailed)
  // ════════════════════════════════════════════

  const sofaX = w * 0.13;
  const sofaY = h * 0.48;
  const sofaW = w * 0.42;
  const sofaH = h * 0.22;

  // Sofa back
  elements.push(createRect(sofaX - 4, sofaY - h * 0.12, sofaW + 8, h * 0.12, sofaColor, { layer: 2, category: 'sofa', modifiable: false, opacity: 0.85 }));
  // Sofa seat
  elements.push(createRect(sofaX, sofaY, sofaW, sofaH, sofaColor, { layer: 2, category: 'sofa', modifiable: true, id: uid('sseat'), filter: 'url(#shadow)' }));
  // Sofa seat highlight
  elements.push(createRect(sofaX + 4, sofaY + 2, sofaW - 8, sofaH * 0.3, sofaColor, { layer: 2, category: 'sofa', modifiable: false, opacity: 0.7 }));
  // Sofa arms
  elements.push(createRect(sofaX - 14, sofaY - h * 0.06, 16, sofaH + h * 0.06, sofaColor, { layer: 2, category: 'sofa', modifiable: false, opacity: 0.9 }));
  elements.push(createRect(sofaX + sofaW - 2, sofaY - h * 0.06, 16, sofaH + h * 0.06, sofaColor, { layer: 2, category: 'sofa', modifiable: false, opacity: 0.9 }));
  // Sofa legs
  const legColor = '#5C3317';
  elements.push(createRect(sofaX, sofaY + sofaH, 6, 8, legColor, { layer: 2, category: 'sofa', modifiable: false }));
  elements.push(createRect(sofaX + sofaW - 6, sofaY + sofaH, 6, 8, legColor, { layer: 2, category: 'sofa', modifiable: false }));
  // Seat division lines
  elements.push(createLine(sofaX + sofaW / 3, sofaY + 4, sofaX + sofaW / 3, sofaY + sofaH - 4, sofaColor, { strokeWidth: 1, layer: 2, opacity: 0.4 }));
  elements.push(createLine(sofaX + sofaW * 2 / 3, sofaY + 4, sofaX + sofaW * 2 / 3, sofaY + sofaH - 4, sofaColor, { strokeWidth: 1, layer: 2, opacity: 0.4 }));

  // Cushions on sofa
  const cushionCount = rng.nextInt(2, 4);
  for (let i = 0; i < cushionCount; i++) {
    const cx = sofaX + 12 + i * (sofaW / cushionCount);
    const cSize = rng.nextFloat(22, 32);
    const cColor = rng.nextColor([0, 360], [50, 80], [50, 70]);
    elements.push(createRect(cx, sofaY - h * 0.08, cSize, cSize * 0.85, cColor, { layer: 3, category: 'cushion', modifiable: true, id: uid('cush'), stroke: cColor, strokeWidth: 0.5, filter: 'url(#softShadow)' }));
    elements.push(createCircle(cx + cSize / 2, sofaY - h * 0.08 + cSize * 0.42, 2, cColor, { layer: 3, category: 'cushion', modifiable: false, opacity: 0.6 }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Coffee table (detailed component)
  // ════════════════════════════════════════════

  const tableX = w * 0.25;
  const tableY = h * 0.72;
  const tableW = w * 0.22;
  const tableH2 = h * 0.08;
  elements.push(detailedTable(tableX, tableY, tableW, tableH2, rng));

  // Items on table
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
    elements.push(createEllipse(cupX + 6, cupY + 2, 10, 3, '#F5F5F5', { layer: 3, category: 'cup', modifiable: false }));
    elements.push(createRect(cupX, cupY - 10, 12, 12, '#FFF', { layer: 3, category: 'cup', modifiable: true, stroke: '#CCC', strokeWidth: 1, id: uid('cup') }));
    elements.push(createCircle(cupX + 14, cupY - 4, 4, 'none', { layer: 3, category: 'cup', modifiable: false, stroke: '#CCC', strokeWidth: 1.5 }));
    elements.push(createRect(cupX + 1.5, cupY - 8, 9, 3, '#6B3410', { layer: 3, category: 'cup', modifiable: false, opacity: 0.8 }));
  }
  // Remote control
  if (rng.chance(0.65)) {
    elements.push(createRect(tableX + tableW * 0.72, tableY - 3, 22, 7, '#333', { layer: 3, category: 'remote', modifiable: true, id: uid('remote') }));
    elements.push(createCircle(tableX + tableW * 0.72 + 5, tableY - 0.5, 1.5, '#C00', { layer: 3, category: 'remote', modifiable: false }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Bookshelf (detailed component)
  // ════════════════════════════════════════════

  const shelfX = w * 0.01;
  const shelfY = h * 0.12;
  const shelfW = w * 0.13;
  const shelfH = h * 0.56;
  elements.push(detailedBookshelf(shelfX, shelfY, shelfW, shelfH, rng));

  // ════════════════════════════════════════════
  //  LAYER 2 — TV or large framed picture
  // ════════════════════════════════════════════

  const hasTV = rng.chance(0.55);
  if (hasTV) {
    const tvX = w * 0.63;
    const tvY = h * 0.22;
    const tvW = w * 0.2;
    const tvH = h * 0.22;
    // TV stand
    elements.push(createRect(tvX - 5, tvY + tvH + 5, tvW + 10, h * 0.08, '#5C3317', { layer: 2, category: 'furniture', modifiable: false, filter: 'url(#shadow)' }));
    elements.push(createLine(tvX + tvW / 2, tvY + tvH + 5, tvX + tvW / 2, tvY + tvH + 5 + h * 0.08, '#4A2810', { strokeWidth: 1, layer: 2 }));
    elements.push(createCircle(tvX + tvW * 0.35, tvY + tvH + 5 + h * 0.04, 2, '#DAA520', { layer: 2 }));
    elements.push(createCircle(tvX + tvW * 0.65, tvY + tvH + 5 + h * 0.04, 2, '#DAA520', { layer: 2 }));
    // TV bezel
    elements.push(createRect(tvX, tvY, tvW, tvH, '#111', { layer: 2, category: 'tv', modifiable: true, id: uid('tv'), filter: 'url(#shadow)' }));
    elements.push(createRect(tvX + 4, tvY + 3, tvW - 8, tvH - 6, '#1A1A2E', { layer: 2, category: 'tv', modifiable: false }));
    elements.push(createRect(tvX + tvW * 0.6, tvY + 5, tvW * 0.25, tvH * 0.4, '#FFF', { layer: 2, category: 'tv', modifiable: false, opacity: 0.04 }));
    elements.push(createCircle(tvX + tvW / 2, tvY + tvH - 3, 1.5, '#0F0', { layer: 2, category: 'tv', modifiable: false, opacity: 0.6 }));
  } else {
    const picX = w * 0.62;
    const picY = h * 0.1;
    const picW = w * 0.22;
    const picH = h * 0.28;
    const frameColor = rng.pick(['#8B6914', '#333', '#DAA520', '#C0C0C0']);
    const artBg = rng.nextColor([0, 360], [20, 50], [70, 90]);
    elements.push(createRect(picX, picY, picW, picH, frameColor, { layer: 2, category: 'picture', modifiable: true, id: uid('lgpic'), filter: 'url(#shadow)' }));
    elements.push(createRect(picX + 5, picY + 5, picW - 10, picH - 10, artBg, { layer: 2, category: 'picture', modifiable: false }));
    elements.push(createRect(picX + 5, picY + picH * 0.6, picW - 10, picH * 0.4 - 10, rng.nextHSL([90, 140], [30, 50], [35, 50]), { layer: 2, opacity: 0.7 }));
    elements.push(createCircle(picX + picW * 0.75, picY + picH * 0.3, 8, '#FFD700', { layer: 2, opacity: 0.6 }));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Wall clock
  // ════════════════════════════════════════════

  const clockX = w * 0.45;
  const clockY = h * 0.13;
  const clockR = rng.nextFloat(18, 24);
  elements.push(createCircle(clockX, clockY, clockR, '#FFFFF0', { layer: 3, category: 'clock', modifiable: true, stroke: '#8B7355', strokeWidth: 2, id: uid('clock'), filter: 'url(#shadow)' }));
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 - 90) * Math.PI / 180;
    elements.push(createCircle(clockX + Math.cos(a) * clockR * 0.8, clockY + Math.sin(a) * clockR * 0.8, clockR * 0.04, '#333', { layer: 3 }));
  }
  const hour = rng.nextInt(1, 12);
  const min = rng.nextInt(0, 11) * 5;
  const hAngle = (hour * 30 + min * 0.5 - 90) * Math.PI / 180;
  const mAngle = (min * 6 - 90) * Math.PI / 180;
  elements.push(createLine(clockX, clockY, clockX + Math.cos(hAngle) * clockR * 0.5, clockY + Math.sin(hAngle) * clockR * 0.5, '#333', { strokeWidth: 2.5, layer: 3 }));
  elements.push(createLine(clockX, clockY, clockX + Math.cos(mAngle) * clockR * 0.7, clockY + Math.sin(mAngle) * clockR * 0.7, '#333', { strokeWidth: 1.5, layer: 3 }));
  elements.push(createCircle(clockX, clockY, clockR * 0.06, '#333', { layer: 3 }));

  // ════════════════════════════════════════════
  //  LAYER 3 — Framed wall pictures (2-3)
  // ════════════════════════════════════════════

  const picPositions = [
    { x: w * 0.2, y: h * 0.06 },
    { x: w * 0.32, y: h * 0.08 },
    { x: w * 0.15, y: h * 0.05 },
  ];
  for (let i = 0; i < rng.nextInt(2, 3); i++) {
    const pp = picPositions[i];
    const pw = rng.nextFloat(40, 60);
    const ph = rng.nextFloat(30, 45);
    const fc = rng.pick(['#8B6914', '#333', '#DAA520', '#C0C0C0']);
    const bgc = rng.nextColor([0, 360], [20, 50], [70, 90]);
    elements.push(createRect(pp.x, pp.y, pw, ph, fc, { layer: 3, category: 'picture', modifiable: true, id: uid('pic'), filter: 'url(#shadow)' }));
    elements.push(createRect(pp.x + 3, pp.y + 3, pw - 6, ph - 6, bgc, { layer: 3, category: 'picture', modifiable: false }));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Floor lamp (detailed component)
  // ════════════════════════════════════════════

  const lampOnRight = rng.chance(0.5);
  const flampX = lampOnRight ? w * 0.88 : w * 0.06;
  elements.push(detailedLamp(flampX, wallBottom - 3, rng.nextFloat(90, 120), rng));
  // Warm glow
  elements.push(createCircle(flampX, h * 0.24, 55, 'url(#lampGlow)', { layer: 1, category: 'lamp', modifiable: false, opacity: 0.6 }));

  // ════════════════════════════════════════════
  //  LAYER 3 — Potted plants
  // ════════════════════════════════════════════

  for (let i = 0; i < rng.nextInt(2, 3); i++) {
    const px = rng.nextFloat(w * 0.55, w * 0.95);
    const py = wallBottom - 3;
    const potColor = rng.pick(['#A0522D', '#D2691E', '#CD853F']);
    elements.push(createRect(px - 8, py - 12, 16, 12, potColor, { layer: 3, category: 'plant', modifiable: true, id: uid('pot'), filter: 'url(#shadow)' }));
    elements.push(createCircle(px, py - 22, 12, rng.nextHSL([90, 140], [40, 60], [30, 50]), { layer: 3, category: 'plant', modifiable: false }));
    elements.push(createCircle(px - 8, py - 17, 6, rng.nextHSL([90, 140], [40, 60], [35, 55]), { layer: 3, category: 'plant', modifiable: false }));
    elements.push(createCircle(px + 8, py - 17, 6, rng.nextHSL([90, 140], [40, 60], [35, 55]), { layer: 3, category: 'plant', modifiable: false }));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Side table with vase & flowers
  // ════════════════════════════════════════════

  const sideRight = !lampOnRight;
  const sideX = sideRight ? sofaX + sofaW + 18 : sofaX - 45;
  const sideY = h * 0.57;
  const sideW2 = 32;
  const sideH2 = wallBottom - sideY;
  const sideColor = rng.pick(['#8B6914', '#A0522D', '#6B3410']);

  elements.push(createRect(sideX, sideY, sideW2, 4, sideColor, { layer: 2, category: 'furniture', modifiable: true, id: uid('sidetop'), filter: 'url(#shadow)' }));
  elements.push(createRect(sideX + 5, sideY + 4, 4, sideH2 - 4, sideColor, { layer: 2, category: 'furniture', modifiable: false }));
  elements.push(createRect(sideX + sideW2 - 9, sideY + 4, 4, sideH2 - 4, sideColor, { layer: 2, category: 'furniture', modifiable: false }));
  elements.push(createRect(sideX + 2, sideY + sideH2 * 0.5, sideW2 - 4, 3, sideColor, { layer: 2, category: 'furniture', modifiable: false, opacity: 0.7 }));

  // Vase with flowers
  const vaseX = sideX + sideW2 / 2;
  const vaseColor = rng.pick(['#4A90D9', '#D4A574', '#9B59B6']);
  const vPath = `M${vaseX - 5},${sideY - 2} L${vaseX - 7},${sideY - 14} Q${vaseX},${sideY - 20} ${vaseX + 7},${sideY - 14} L${vaseX + 5},${sideY - 2} Z`;
  elements.push(createPath(vaseX, sideY, vPath, vaseColor, { layer: 3, category: 'vase', modifiable: true, id: uid('vase'), filter: 'url(#shadow)' }));
  for (let f = 0; f < rng.nextInt(2, 4); f++) {
    const fx = vaseX + rng.nextFloat(-6, 6);
    const fy = sideY - rng.nextFloat(22, 32);
    elements.push(createCircle(fx, fy, rng.nextFloat(3, 5), rng.nextColor([0, 360], [60, 90], [55, 75]), { layer: 3, category: 'flower', modifiable: false }));
    elements.push(createLine(fx, fy + 3, vaseX, sideY - 12, rng.nextHSL([100, 130], [40, 60], [30, 45]), { strokeWidth: 1, layer: 3 }));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Cat on sofa (optional)
  // ════════════════════════════════════════════

  if (rng.chance(0.45)) {
    const catColor = rng.pick(['#FF8C00', '#333', '#FFF', '#808080', '#A0522D', '#F5DEB3']);
    const catX = sofaX + sofaW * 0.7;
    const catY = sofaY - 4;
    const children: SVGElementData[] = [];
    children.push(createEllipse(catX, catY + 3, 14, 9, catColor, { layer: 3 }));
    children.push(createCircle(catX - 12, catY - 4, 8, catColor, { layer: 3 }));
    const ear1 = `${catX - 17},${catY - 10} ${catX - 14},${catY - 18} ${catX - 11},${catY - 10}`;
    const ear2 = `${catX - 9},${catY - 10} ${catX - 6},${catY - 18} ${catX - 3},${catY - 10}`;
    children.push(createPolygon(catX, catY, ear1, catColor, { layer: 3 }));
    children.push(createPolygon(catX, catY, ear2, catColor, { layer: 3 }));
    children.push(createCircle(catX - 15, catY - 5, 2, '#333', { layer: 3 }));
    children.push(createCircle(catX - 9, catY - 5, 2, '#333', { layer: 3 }));
    children.push(createCircle(catX - 12, catY - 2, 1, '#FF69B4', { layer: 3 }));
    const tailPath = `M${catX + 14},${catY + 3} Q${catX + 25},${catY - 10} ${catX + 20},${catY - 18}`;
    children.push(createPath(catX, catY, tailPath, 'none', { stroke: catColor, strokeWidth: 3, layer: 3 }));
    elements.push(createGroup(catX, catY, children, { layer: 3, category: 'cat', modifiable: true, id: uid('cat'), filter: 'url(#softShadow)' }));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Extra decorative details
  // ════════════════════════════════════════════

  // Light switch
  elements.push(createRect(w * 0.52, h * 0.4, 6, 10, '#F5F5F5', { layer: 3, category: 'decor', modifiable: false, stroke: '#CCC', strokeWidth: 0.5 }));
  elements.push(createRect(w * 0.523, h * 0.42, 3, 3, '#DDD', { layer: 3, category: 'decor', modifiable: false }));

  // Electrical outlet
  elements.push(createRect(w * 0.38, wallBottom - 16, 7, 10, '#F5F5F5', { layer: 3, category: 'decor', modifiable: false, stroke: '#CCC', strokeWidth: 0.5 }));

  // Throw blanket on sofa arm
  if (rng.chance(0.5)) {
    const blanketColor = rng.nextColor([0, 360], [30, 60], [60, 80]);
    elements.push(createRect(sofaX + sofaW - 8, sofaY - h * 0.04, 24, h * 0.18, blanketColor, { layer: 3, category: 'decor', modifiable: true, opacity: 0.75, id: uid('blanket') }));
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
