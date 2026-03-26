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
import { detailedBookshelf, resetComponentId } from './svg-components';

let _uid = 0;
function uid(p = 'cl') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

export function generateClassroom(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  // ── Color palette ──
  const wallBase = rng.pick(['#FFF8DC', '#F5F0E8', '#FFFFF0', '#F0F8FF', '#F5F5DC']);
  const wallDark = rng.pick(['#E8DCC0', '#DDD8C0', '#E8E0D0']);
  const floorTile = rng.pick(['#C4B898', '#D0C8B8', '#B8B0A0']);
  const floorGrout = rng.pick(['#A0988A', '#9A9288', '#8E8678']);
  const boardColor = rng.pick(['#1A3A1A', '#0A2A0A', '#2A4A2A']); // dark green chalkboard
  const boardFrame = rng.pick(['#8B7355', '#6B5535', '#A08060']);
  const deskColor = rng.pick(['#DEB887', '#C4A882', '#B8A070']);
  const teacherDeskColor = rng.pick(['#6B4226', '#5C3317', '#7A5A3A']);
  const chairColor = rng.pick(['#4169E1', '#CC5500', '#228B22', '#DAA520']);

  // ── SVG Defs ──
  const defs = combineDefs(
    indoorDefs(),
    wallGradient('wallGrad', wallBase, wallDark),
    floorGradient('floorGrad', floorTile, floorGrout),
    tilesPattern('tilePat', floorTile, floorGrout, 24),
    woodGrainPattern('deskPat', deskColor),
    linearGradient('boardGrad', [
      { offset: '0%', color: boardColor },
      { offset: '50%', color: '#1A4A1A' },
      { offset: '100%', color: boardColor },
    ]),
    radialGradient('ceilingLight', [
      { offset: '0%', color: '#FFFFFF', opacity: 0.3 },
      { offset: '100%', color: '#FFFFFF', opacity: 0 },
    ]),
  );

  const wallBottom = h * 0.65;

  // ════════════════════════════════════════════
  //  LAYER 0 — Walls & floor
  // ════════════════════════════════════════════

  // Wall
  elements.push(createRect(0, 0, w, wallBottom, 'url(#wallGrad)', { layer: 0, category: 'wall', modifiable: false }));

  // Bulletin board strip (top of wall)
  elements.push(createRect(0, 2, w, 3, '#8B4513', { layer: 0, category: 'wall', modifiable: false, opacity: 0.4 }));

  // Floor
  elements.push(createRect(0, wallBottom, w, h - wallBottom, 'url(#tilePat)', { layer: 0, category: 'floor', modifiable: false }));

  // Baseboard
  elements.push(createRect(0, wallBottom - 2, w, 5, '#C4A882', { layer: 0, category: 'wall', modifiable: false }));

  // ════════════════════════════════════════════
  //  LAYER 1 — Blackboard / Whiteboard
  // ════════════════════════════════════════════

  const bbX = w * 0.15;
  const bbY = h * 0.06;
  const bbW = w * 0.55;
  const bbH = h * 0.32;

  // Board frame
  elements.push(createRect(bbX - 5, bbY - 5, bbW + 10, bbH + 10, boardFrame, {
    layer: 1, category: 'board', modifiable: false,
  }));
  // Board surface
  elements.push(createRect(bbX, bbY, bbW, bbH, 'url(#boardGrad)', {
    layer: 1, category: 'board', modifiable: true, id: uid('board'), filter: 'url(#shadow)',
  }));
  // Chalk tray
  elements.push(createRect(bbX, bbY + bbH, bbW, 6, boardFrame, { layer: 1, category: 'board', modifiable: false }));

  // Writing on board
  const mathProblem = rng.pick(['2 + 3 = ?', 'A B C D', '1 x 2 = ?', 'Hello!']);
  elements.push(createText(bbX + 20, bbY + 30, mathProblem, '#FFFFFF', {
    fontSize: 16, layer: 2, category: 'writing', modifiable: true, id: uid('chalk1'), opacity: 0.9,
  }));
  // More writing
  const line2 = rng.pick(['Good Morning', '3 + 4 = 7', 'Monday', 'Today:']);
  elements.push(createText(bbX + 20, bbY + 55, line2, '#FFFFFF', {
    fontSize: 12, layer: 2, category: 'writing', modifiable: true, id: uid('chalk2'), opacity: 0.8,
  }));
  // Drawing on board (star or smiley)
  if (rng.chance(0.6)) {
    elements.push(createCircle(bbX + bbW - 50, bbY + bbH * 0.4, 15, 'none', {
      layer: 2, category: 'writing', modifiable: false, stroke: '#FFFF88', strokeWidth: 1.5, opacity: 0.6,
    }));
    // Smiley eyes
    elements.push(createCircle(bbX + bbW - 55, bbY + bbH * 0.35, 2, '#FFFF88', { layer: 2, category: 'writing', modifiable: false, opacity: 0.6 }));
    elements.push(createCircle(bbX + bbW - 45, bbY + bbH * 0.35, 2, '#FFFF88', { layer: 2, category: 'writing', modifiable: false, opacity: 0.6 }));
    // Smile
    elements.push(createPath(bbX, bbY,
      `M${bbX + bbW - 57},${bbY + bbH * 0.45} Q${bbX + bbW - 50},${bbY + bbH * 0.52} ${bbX + bbW - 43},${bbY + bbH * 0.45}`,
      'none', { stroke: '#FFFF88', strokeWidth: 1.5, layer: 2, opacity: 0.6 }));
  }

  // Chalk pieces on tray
  const chalkColors = ['#FFF', '#FFFF88', '#FF8888', '#88FF88', '#88BBFF'];
  for (let c = 0; c < rng.nextInt(2, 4); c++) {
    const cx = bbX + 10 + c * 15;
    elements.push(createRect(cx, bbY + bbH + 1, 8, 3, rng.pick(chalkColors), {
      layer: 3, category: 'chalk', modifiable: true, id: uid('chalk'),
    }));
  }

  // Eraser
  elements.push(createRect(bbX + bbW - 30, bbY + bbH + 1, 18, 4, '#333', {
    layer: 3, category: 'eraser', modifiable: true, id: uid('eraser'),
  }));

  // ════════════════════════════════════════════
  //  LAYER 2 — Student desks (2 rows x 3)
  // ════════════════════════════════════════════

  const deskRows = 2;
  const deskCols = 3;
  const deskStartX = w * 0.1;
  const deskStartY = h * 0.55;
  const deskW = w * 0.2;
  const deskH = h * 0.06;
  const deskSpaceX = w * 0.25;
  const deskSpaceY = h * 0.18;

  for (let row = 0; row < deskRows; row++) {
    for (let col = 0; col < deskCols; col++) {
      const dx = deskStartX + col * deskSpaceX;
      const dy = deskStartY + row * deskSpaceY;

      // Desk surface
      elements.push(createRect(dx, dy, deskW, deskH, deskColor, {
        layer: 2, category: 'desk', modifiable: row === 0 && col === 1, id: uid('sdesk'), filter: 'url(#softShadow)',
      }));
      // Desk front
      elements.push(createRect(dx + 2, dy + deskH, deskW - 4, deskH * 0.8, deskColor, {
        layer: 2, category: 'desk', modifiable: false, opacity: 0.85,
      }));
      // Desk legs
      elements.push(createRect(dx + 3, dy + deskH + deskH * 0.8, 4, 12, '#888', { layer: 2, category: 'desk', modifiable: false }));
      elements.push(createRect(dx + deskW - 7, dy + deskH + deskH * 0.8, 4, 12, '#888', { layer: 2, category: 'desk', modifiable: false }));

      // Chair behind desk
      const chairSeatY = dy + deskH + deskH * 0.8 + 2;
      elements.push(createRect(dx + deskW * 0.25, chairSeatY, deskW * 0.5, 5, chairColor, {
        layer: 2, category: 'chair', modifiable: false, opacity: 0.8,
      }));
      // Chair back
      elements.push(createRect(dx + deskW * 0.3, chairSeatY + 5, deskW * 0.4, 12, chairColor, {
        layer: 2, category: 'chair', modifiable: false, opacity: 0.7,
      }));
    }
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Items on desks
  // ════════════════════════════════════════════

  // Notebooks/books on front row
  for (let col = 0; col < deskCols; col++) {
    const dx = deskStartX + col * deskSpaceX;
    const dy = deskStartY;

    // Notebook
    if (rng.chance(0.8)) {
      const nbColor = rng.pick(['#FF6B6B', '#6BB5FF', '#6BFF6B', '#FFD700', '#FF69B4']);
      elements.push(createRect(dx + 8, dy - 5, 20, 14, nbColor, {
        layer: 3, category: 'notebook', modifiable: true, id: uid('nb'),
      }));
      // Lines
      for (let l = 0; l < 3; l++) {
        elements.push(createRect(dx + 11, dy - 2 + l * 3, 14, 0.5, '#FFF', { layer: 3, category: 'notebook', modifiable: false, opacity: 0.5 }));
      }
    }

    // Pencil
    if (rng.chance(0.7)) {
      const pencilColor = rng.pick(['#FFD700', '#FF6347', '#4169E1', '#32CD32']);
      elements.push(createRect(dx + deskW - 30, dy - 2, 22, 3, pencilColor, {
        layer: 3, category: 'pencil', modifiable: true, id: uid('pencil'), rotation: rng.nextFloat(-5, 5),
      }));
      // Pencil tip
      elements.push(createPath(dx, dy,
        `M${dx + deskW - 8},${dy - 2} L${dx + deskW - 5},${dy - 0.5} L${dx + deskW - 8},${dy + 1}`,
        '#DEB887', { layer: 3, category: 'pencil', modifiable: false }));
      // Pencil point
      elements.push(createPath(dx, dy,
        `M${dx + deskW - 5},${dy - 0.5} L${dx + deskW - 3},${dy - 0.5}`,
        'none', { stroke: '#333', strokeWidth: 0.8, layer: 3 }));
    }
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Teacher's desk
  // ════════════════════════════════════════════

  const tdX = w * 0.6;
  const tdY = h * 0.44;
  const tdW = w * 0.22;
  const tdH = h * 0.06;

  // Teacher desk top
  elements.push(createRect(tdX, tdY, tdW, tdH, teacherDeskColor, {
    layer: 2, category: 'tdesk', modifiable: true, id: uid('tdesk'), filter: 'url(#shadow)',
  }));
  // Desk front panel
  elements.push(createRect(tdX + 3, tdY + tdH, tdW - 6, wallBottom - tdY - tdH - 4, teacherDeskColor, {
    layer: 2, category: 'tdesk', modifiable: false, opacity: 0.85,
  }));
  // Drawer
  elements.push(createRect(tdX + tdW * 0.55, tdY + tdH + 4, tdW * 0.35, (wallBottom - tdY - tdH) * 0.4, teacherDeskColor, {
    layer: 2, category: 'tdesk', modifiable: false, stroke: wallDark, strokeWidth: 0.8,
  }));
  elements.push(createRect(tdX + tdW * 0.68, tdY + tdH + 14, 8, 3, '#C0A060', { layer: 2 }));

  // Items on teacher's desk
  // Apple
  elements.push(createCircle(tdX + 15, tdY - 5, 6, '#CC2222', {
    layer: 3, category: 'apple', modifiable: true, id: uid('apple'),
  }));
  elements.push(createLine(tdX + 15, tdY - 11, tdX + 16, tdY - 14, '#4A2810', { strokeWidth: 1, layer: 3 }));
  elements.push(createPath(tdX, tdY,
    `M${tdX + 16},${tdY - 13} Q${tdX + 20},${tdY - 15} ${tdX + 19},${tdY - 12}`,
    '#228B22', { layer: 3, opacity: 0.8 }));

  // Book stack
  for (let b = 0; b < rng.nextInt(2, 3); b++) {
    elements.push(createRect(tdX + 30 + rng.nextFloat(-2, 2), tdY - 3 - b * 4, rng.nextFloat(22, 28), 3.5, rng.pick(['#1E3A5F', '#8B0000', '#2E7D32', '#4A148C']), {
      layer: 3, category: 'book', modifiable: true, id: uid('tbook'),
    }));
  }

  // Pencil holder
  elements.push(createRect(tdX + tdW - 25, tdY - 12, 12, 12, rng.pick(['#333', '#4169E1', '#8B4513']), {
    layer: 3, category: 'holder', modifiable: true, id: uid('holder'),
  }));
  // Pencils in holder
  for (let p = 0; p < 4; p++) {
    elements.push(createRect(tdX + tdW - 24 + p * 3, tdY - 18 - p * 2, 2, 8, rng.pick(['#FFD700', '#FF6347', '#4169E1', '#32CD32']), {
      layer: 3, category: 'pencil', modifiable: false,
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Globe on teacher's desk
  // ════════════════════════════════════════════

  const globeX = tdX + tdW - 45;
  const globeY = tdY - 10;
  const globeR = 11;

  // Stand
  elements.push(createRect(globeX - 4, globeY + globeR, 8, 3, '#8B7355', { layer: 2, category: 'globe', modifiable: false }));
  elements.push(createRect(globeX - 1, globeY + 2, 2, globeR, '#8B7355', { layer: 2, category: 'globe', modifiable: false }));
  // Globe
  elements.push(createCircle(globeX, globeY, globeR, '#4A90B0', {
    layer: 2, category: 'globe', modifiable: true, id: uid('globe'), stroke: '#8B7355', strokeWidth: 1,
  }));
  elements.push(createEllipse(globeX - 2, globeY - 2, globeR * 0.35, globeR * 0.25, '#5A8B50', { layer: 2, opacity: 0.6 }));
  elements.push(createEllipse(globeX + 3, globeY + 2, globeR * 0.2, globeR * 0.3, '#5A8B50', { layer: 2, opacity: 0.6 }));

  // ════════════════════════════════════════════
  //  LAYER 3 — Wall clock
  // ════════════════════════════════════════════

  const clockX = w * 0.85;
  const clockY = h * 0.12;
  const clockR = 20;

  elements.push(createCircle(clockX, clockY, clockR, '#FFFFF0', {
    layer: 3, category: 'clock', modifiable: true, stroke: '#333', strokeWidth: 2, id: uid('clock'), filter: 'url(#shadow)',
  }));
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 - 90) * Math.PI / 180;
    elements.push(createCircle(clockX + Math.cos(a) * clockR * 0.8, clockY + Math.sin(a) * clockR * 0.8, 1, '#333', { layer: 3 }));
  }
  const hour = rng.nextInt(1, 12);
  const min = rng.nextInt(0, 11) * 5;
  const hAngle = (hour * 30 + min * 0.5 - 90) * Math.PI / 180;
  const mAngle = (min * 6 - 90) * Math.PI / 180;
  elements.push(createLine(clockX, clockY, clockX + Math.cos(hAngle) * clockR * 0.5, clockY + Math.sin(hAngle) * clockR * 0.5, '#333', { strokeWidth: 2.5, layer: 3 }));
  elements.push(createLine(clockX, clockY, clockX + Math.cos(mAngle) * clockR * 0.7, clockY + Math.sin(mAngle) * clockR * 0.7, '#333', { strokeWidth: 1.5, layer: 3 }));
  elements.push(createCircle(clockX, clockY, 2, '#CC0000', { layer: 3 }));

  // ════════════════════════════════════════════
  //  LAYER 2 — Map/poster on wall (left side)
  // ════════════════════════════════════════════

  const mapX = w * 0.02;
  const mapY = h * 0.06;
  const mapW = 55;
  const mapH = 40;

  elements.push(createRect(mapX, mapY, mapW, mapH, '#E8E0C0', {
    layer: 2, category: 'map', modifiable: true, id: uid('map'), filter: 'url(#softShadow)',
  }));
  // Map content (simplified world map)
  elements.push(createRect(mapX + 3, mapY + 3, mapW - 6, mapH - 6, '#B8D8F0', { layer: 2, category: 'map', modifiable: false }));
  // Continents
  elements.push(createEllipse(mapX + mapW * 0.25, mapY + mapH * 0.35, 8, 6, '#5A8B50', { layer: 2, category: 'map', modifiable: false, opacity: 0.7 }));
  elements.push(createEllipse(mapX + mapW * 0.5, mapY + mapH * 0.4, 6, 8, '#5A8B50', { layer: 2, category: 'map', modifiable: false, opacity: 0.7 }));
  elements.push(createEllipse(mapX + mapW * 0.7, mapY + mapH * 0.4, 8, 5, '#5A8B50', { layer: 2, category: 'map', modifiable: false, opacity: 0.7 }));

  // Second poster (rules or schedule)
  const p2X = w * 0.02;
  const p2Y = mapY + mapH + 8;
  elements.push(createRect(p2X, p2Y, 50, 35, '#FFFACD', {
    layer: 2, category: 'poster', modifiable: true, id: uid('poster'),
  }));
  elements.push(createText(p2X + 5, p2Y + 12, rng.pick(['Class Rules', 'Schedule', 'Goals']), '#333', {
    fontSize: 7, layer: 3, category: 'poster', modifiable: false,
  }));
  for (let l = 0; l < 3; l++) {
    elements.push(createRect(p2X + 5, p2Y + 16 + l * 6, rng.nextFloat(25, 38), 1, '#999', {
      layer: 3, category: 'poster', modifiable: false, opacity: 0.4,
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Bookshelf (right wall)
  // ════════════════════════════════════════════

  const shelfX = w * 0.86;
  const shelfY = h * 0.25;
  const shelfW = w * 0.12;
  const shelfH = wallBottom - shelfY - 4;
  elements.push(detailedBookshelf(shelfX, shelfY, shelfW, shelfH, rng));

  // ════════════════════════════════════════════
  //  LAYER 3 — Backpacks on floor
  // ════════════════════════════════════════════

  for (let bp = 0; bp < rng.nextInt(2, 3); bp++) {
    const bpX = w * 0.05 + bp * rng.nextFloat(60, 90);
    const bpY = wallBottom + 2;
    const bpColor = rng.pick(['#FF4500', '#4169E1', '#32CD32', '#FFD700', '#FF69B4', '#8B4513']);
    // Backpack body
    elements.push(createRect(bpX, bpY, 18, 22, bpColor, {
      layer: 3, category: 'backpack', modifiable: true, id: uid('bpack'), filter: 'url(#softShadow)',
    }));
    // Flap
    elements.push(createRect(bpX + 2, bpY, 14, 8, bpColor, { layer: 3, category: 'backpack', modifiable: false, opacity: 0.8 }));
    // Buckle
    elements.push(createRect(bpX + 7, bpY + 8, 4, 3, '#DAA520', { layer: 3, category: 'backpack', modifiable: false }));
    // Strap
    elements.push(createPath(bpX, bpY,
      `M${bpX + 4},${bpY} Q${bpX - 3},${bpY + 5} ${bpX + 2},${bpY + 14}`,
      'none', { stroke: bpColor, strokeWidth: 2, layer: 3, opacity: 0.7 }));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Ceiling light
  // ════════════════════════════════════════════

  elements.push(createRect(w * 0.35, 0, w * 0.3, 4, '#E0E0E0', { layer: 0, category: 'light', modifiable: false }));
  elements.push(createCircle(w * 0.5, 2, 35, 'url(#ceilingLight)', { layer: 0, category: 'light', modifiable: false, opacity: 0.4 }));

  // ════════════════════════════════════════════
  //  LAYER 3 — Door (right side)
  // ════════════════════════════════════════════

  if (rng.chance(0.5)) {
    const doorX = w * 0.75;
    const doorY = wallBottom * 0.25;
    const doorW = w * 0.08;
    const doorH = wallBottom - doorY;

    elements.push(createRect(doorX, doorY, doorW, doorH, '#8B7355', {
      layer: 2, category: 'door', modifiable: true, id: uid('door'),
    }));
    // Door panels
    elements.push(createRect(doorX + 4, doorY + 6, doorW - 8, doorH * 0.35, '#7A6345', {
      layer: 2, category: 'door', modifiable: false, opacity: 0.6,
    }));
    elements.push(createRect(doorX + 4, doorY + doorH * 0.45, doorW - 8, doorH * 0.45, '#7A6345', {
      layer: 2, category: 'door', modifiable: false, opacity: 0.6,
    }));
    // Handle
    elements.push(createCircle(doorX + doorW - 8, doorY + doorH * 0.5, 3, '#DAA520', {
      layer: 2, category: 'door', modifiable: false,
    }));
    // Window in door
    elements.push(createRect(doorX + 6, doorY + 8, doorW - 12, doorH * 0.18, '#B0D0FF', {
      layer: 2, category: 'door', modifiable: false, opacity: 0.6,
    }));
  }

  return { elements, defs };
}
