import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath, createGroup,
  createLine, createPolygon, createTree, createFence, createStar,
} from '../engine/primitives';

let _uid = 0;
function uid(p = 'hw') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// Carved jack-o-lantern pumpkin
function carvedPumpkin(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const orange = rng.pick(['#FF6600', '#FF7F24', '#FF8C00', '#E65C00']);

  // Pumpkin body (overlapping ellipses for segments)
  children.push(createEllipse(x, y, s * 0.4, s * 0.35, orange, { layer: 3 }));
  children.push(createEllipse(x - s * 0.15, y, s * 0.3, s * 0.33, orange, { layer: 3, opacity: 0.8 }));
  children.push(createEllipse(x + s * 0.15, y, s * 0.3, s * 0.33, orange, { layer: 3, opacity: 0.8 }));

  // Segment lines
  children.push(createPath(x, y, `M${x - s * 0.05},${y - s * 0.33} Q${x - s * 0.08},${y} ${x - s * 0.05},${y + s * 0.33}`, 'none', { stroke: '#CC5500', strokeWidth: 1, layer: 3, opacity: 0.5 }));
  children.push(createPath(x, y, `M${x + s * 0.05},${y - s * 0.33} Q${x + s * 0.08},${y} ${x + s * 0.05},${y + s * 0.33}`, 'none', { stroke: '#CC5500', strokeWidth: 1, layer: 3, opacity: 0.5 }));

  // Stem
  children.push(createRect(x - s * 0.04, y - s * 0.42, s * 0.08, s * 0.12, '#2E6B14', { layer: 3 }));

  // Carved face: triangle eyes
  const eyeColor = '#FFD700';
  const eyeL = `M${x - s * 0.18},${y - s * 0.05} L${x - s * 0.1},${y - s * 0.2} L${x - s * 0.02},${y - s * 0.05} Z`;
  const eyeR = `M${x + s * 0.02},${y - s * 0.05} L${x + s * 0.1},${y - s * 0.2} L${x + s * 0.18},${y - s * 0.05} Z`;
  children.push(createPath(x, y, eyeL, eyeColor, { layer: 3, opacity: 0.9 }));
  children.push(createPath(x, y, eyeR, eyeColor, { layer: 3, opacity: 0.9 }));

  // Triangle nose
  const nose = `M${x - s * 0.04},${y + s * 0.05} L${x},${y - s * 0.05} L${x + s * 0.04},${y + s * 0.05} Z`;
  children.push(createPath(x, y, nose, eyeColor, { layer: 3, opacity: 0.85 }));

  // Jagged mouth
  const mouthPath = `M${x - s * 0.2},${y + s * 0.1} L${x - s * 0.12},${y + s * 0.18} L${x - s * 0.06},${y + s * 0.1} L${x},${y + s * 0.2} L${x + s * 0.06},${y + s * 0.1} L${x + s * 0.12},${y + s * 0.18} L${x + s * 0.2},${y + s * 0.1}`;
  children.push(createPath(x, y, mouthPath, eyeColor, { layer: 3, opacity: 0.9, stroke: eyeColor, strokeWidth: 2 }));

  return createGroup(x, y, children, { layer: 3, category: 'pumpkin', modifiable: true, id: uid('pumpkin') });
}

// Uncarved pumpkin
function plainPumpkin(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const orange = rng.pick(['#FF6600', '#E65C00', '#FF7F24']);
  children.push(createEllipse(x, y, s * 0.3, s * 0.25, orange, { layer: 3 }));
  children.push(createEllipse(x - s * 0.1, y, s * 0.22, s * 0.23, orange, { layer: 3, opacity: 0.7 }));
  children.push(createEllipse(x + s * 0.1, y, s * 0.22, s * 0.23, orange, { layer: 3, opacity: 0.7 }));
  children.push(createRect(x - s * 0.03, y - s * 0.32, s * 0.06, s * 0.1, '#2E6B14', { layer: 3 }));
  return createGroup(x, y, children, { layer: 3, category: 'pumpkin', modifiable: true, id: uid('pumpkin') });
}

// Tombstone
function tombstone(x: number, y: number, size: number, rng: SeededRandom, showRIP: boolean): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const color = rng.pick(['#696969', '#808080', '#A9A9A9', '#778899']);
  const style = rng.nextInt(0, 2);

  if (style === 0) {
    // Rounded top
    children.push(createPath(x, y, `M${x - s * 0.2},${y} L${x - s * 0.2},${y - s * 0.5} Q${x - s * 0.2},${y - s * 0.75} ${x},${y - s * 0.8} Q${x + s * 0.2},${y - s * 0.75} ${x + s * 0.2},${y - s * 0.5} L${x + s * 0.2},${y} Z`, color, { layer: 3 }));
  } else if (style === 1) {
    // Cross shape
    children.push(createRect(x - s * 0.15, y - s * 0.6, s * 0.3, s * 0.6, color, { layer: 3 }));
    children.push(createRect(x - s * 0.25, y - s * 0.55, s * 0.5, s * 0.12, color, { layer: 3 }));
  } else {
    // Simple rectangle
    children.push(createRect(x - s * 0.18, y - s * 0.65, s * 0.36, s * 0.65, color, { layer: 3 }));
  }

  // Cracks
  children.push(createPath(x, y, `M${x - s * 0.05},${y - s * 0.3} L${x + s * 0.02},${y - s * 0.15} L${x - s * 0.08},${y - s * 0.05}`, 'none', { stroke: '#555', strokeWidth: 1, layer: 3, opacity: 0.6 }));

  if (showRIP) {
    // RIP text (simplified as lines)
    children.push(createPath(x, y, `M${x - s * 0.1},${y - s * 0.5} L${x - s * 0.1},${y - s * 0.38}`, 'none', { stroke: '#333', strokeWidth: 1.5, layer: 3 }));
    children.push(createCircle(x, y - s * 0.44, s * 0.02, '#333', { layer: 3 }));
    children.push(createPath(x, y, `M${x + s * 0.08},${y - s * 0.5} L${x + s * 0.08},${y - s * 0.38}`, 'none', { stroke: '#333', strokeWidth: 1.5, layer: 3 }));
  }

  return createGroup(x, y, children, { layer: 3, category: 'tombstone', modifiable: true, id: uid('tomb') });
}

// Ghost
function ghost(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];

  // Ghost body
  const bodyPath = `M${x - s * 0.25},${y + s * 0.3} L${x - s * 0.25},${y - s * 0.1} Q${x - s * 0.25},${y - s * 0.4} ${x},${y - s * 0.45} Q${x + s * 0.25},${y - s * 0.4} ${x + s * 0.25},${y - s * 0.1} L${x + s * 0.25},${y + s * 0.3} Q${x + s * 0.15},${y + s * 0.2} ${x + s * 0.08},${y + s * 0.3} Q${x},${y + s * 0.2} ${x - s * 0.08},${y + s * 0.3} Q${x - s * 0.15},${y + s * 0.2} ${x - s * 0.25},${y + s * 0.3} Z`;
  children.push(createPath(x, y, bodyPath, '#F5F5F5', { layer: 4, opacity: 0.5 }));

  // Ghost eyes
  children.push(createEllipse(x - s * 0.08, y - s * 0.15, s * 0.06, s * 0.08, '#111', { layer: 4, opacity: 0.7 }));
  children.push(createEllipse(x + s * 0.08, y - s * 0.15, s * 0.06, s * 0.08, '#111', { layer: 4, opacity: 0.7 }));

  // Ghost mouth
  children.push(createEllipse(x, y + s * 0.02, s * 0.05, s * 0.04, '#111', { layer: 4, opacity: 0.5 }));

  return createGroup(x, y, children, { layer: 4, category: 'ghost', modifiable: true, id: uid('ghost') });
}

// Bat (V-shaped flying)
function bat(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const wingPath = `M${x},${y} Q${x - s * 0.3},${y - s * 0.25} ${x - s * 0.5},${y - s * 0.1} Q${x - s * 0.35},${y - s * 0.15} ${x - s * 0.2},${y + s * 0.05} L${x},${y} L${x + s * 0.2},${y + s * 0.05} Q${x + s * 0.35},${y - s * 0.15} ${x + s * 0.5},${y - s * 0.1} Q${x + s * 0.3},${y - s * 0.25} ${x},${y} Z`;
  const children: SVGElementData[] = [
    createPath(x, y, wingPath, '#1A1A2E', { layer: 4, opacity: 0.85 }),
    createCircle(x, y - s * 0.02, s * 0.06, '#1A1A2E', { layer: 4 }),
    // Tiny eyes
    createCircle(x - s * 0.03, y - s * 0.04, s * 0.015, '#FF0000', { layer: 4, opacity: 0.8 }),
    createCircle(x + s * 0.03, y - s * 0.04, s * 0.015, '#FF0000', { layer: 4, opacity: 0.8 }),
  ];
  return createGroup(x, y, children, { layer: 4, category: 'bat', modifiable: true, id: uid('bat') });
}

// Black cat
function blackCat(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];

  // Body
  children.push(createEllipse(x, y, s * 0.25, s * 0.15, '#111', { layer: 3 }));
  // Head
  children.push(createCircle(x - s * 0.2, y - s * 0.12, s * 0.12, '#111', { layer: 3 }));
  // Ears
  children.push(createPolygon(x, y, `${x - s * 0.28},${y - s * 0.2} ${x - s * 0.32},${y - s * 0.35} ${x - s * 0.22},${y - s * 0.22}`, '#111', { layer: 3 }));
  children.push(createPolygon(x, y, `${x - s * 0.14},${y - s * 0.2} ${x - s * 0.1},${y - s * 0.35} ${x - s * 0.18},${y - s * 0.22}`, '#111', { layer: 3 }));
  // Eyes
  children.push(createEllipse(x - s * 0.24, y - s * 0.14, s * 0.03, s * 0.02, '#FFFF00', { layer: 3 }));
  children.push(createEllipse(x - s * 0.16, y - s * 0.14, s * 0.03, s * 0.02, '#FFFF00', { layer: 3 }));
  // Tail
  const tailPath = `M${x + s * 0.22},${y - s * 0.05} Q${x + s * 0.4},${y - s * 0.3} ${x + s * 0.35},${y - s * 0.4}`;
  children.push(createPath(x, y, tailPath, 'none', { stroke: '#111', strokeWidth: s * 0.04, layer: 3 }));

  return createGroup(x, y, children, { layer: 3, category: 'cat', modifiable: true, id: uid('cat') });
}

// Witch's cauldron
function cauldron(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];

  // Cauldron body
  const bodyPath = `M${x - s * 0.3},${y - s * 0.2} Q${x - s * 0.35},${y + s * 0.2} ${x},${y + s * 0.25} Q${x + s * 0.35},${y + s * 0.2} ${x + s * 0.3},${y - s * 0.2} Z`;
  children.push(createPath(x, y, bodyPath, '#1A1A1A', { layer: 3 }));

  // Rim
  children.push(createEllipse(x, y - s * 0.2, s * 0.32, s * 0.06, '#333', { layer: 3 }));

  // Legs
  children.push(createRect(x - s * 0.22, y + s * 0.2, s * 0.06, s * 0.1, '#1A1A1A', { layer: 3 }));
  children.push(createRect(x + s * 0.16, y + s * 0.2, s * 0.06, s * 0.1, '#1A1A1A', { layer: 3 }));

  // Green potion
  children.push(createEllipse(x, y - s * 0.15, s * 0.25, s * 0.05, '#00FF00', { layer: 3, opacity: 0.6 }));

  // Rising bubbles
  for (let i = 0; i < rng.nextInt(4, 7); i++) {
    const bx = x + rng.nextFloat(-s * 0.15, s * 0.15);
    const by = y - s * 0.2 - rng.nextFloat(s * 0.05, s * 0.4);
    const br = rng.nextFloat(s * 0.02, s * 0.06);
    children.push(createCircle(bx, by, br, '#00FF00', { layer: 4, opacity: rng.nextFloat(0.3, 0.7) }));
  }

  return createGroup(x, y, children, { layer: 3, category: 'cauldron', modifiable: true, id: uid('cauldron') });
}

// Spider web
function spiderWeb(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const webColor = '#CCCCCC';

  // Radial lines (8 spokes)
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI / 4);
    const ex = x + Math.cos(angle) * s * 0.5;
    const ey = y + Math.sin(angle) * s * 0.5;
    children.push(createLine(x, y, ex, ey, webColor, { strokeWidth: 0.8, layer: 3, opacity: 0.6 }));
  }

  // Concentric arcs (4 rings)
  for (let ring = 1; ring <= 4; ring++) {
    const r = (ring / 4) * s * 0.5;
    for (let i = 0; i < 8; i++) {
      const a1 = i * Math.PI / 4;
      const a2 = (i + 1) * Math.PI / 4;
      const x1 = x + Math.cos(a1) * r;
      const y1 = y + Math.sin(a1) * r;
      const x2 = x + Math.cos(a2) * r;
      const y2 = y + Math.sin(a2) * r;
      const cpx = x + Math.cos((a1 + a2) / 2) * r * 1.05;
      const cpy = y + Math.sin((a1 + a2) / 2) * r * 1.05;
      children.push(createPath(x, y, `M${x1},${y1} Q${cpx},${cpy} ${x2},${y2}`, 'none', {
        stroke: webColor, strokeWidth: 0.6, layer: 3, opacity: 0.5,
      }));
    }
  }

  // Spider body (optional)
  if (rng.chance(0.6)) {
    const sx = x + rng.nextFloat(-s * 0.1, s * 0.1);
    const sy = y + rng.nextFloat(-s * 0.1, s * 0.1);
    children.push(createCircle(sx, sy, s * 0.03, '#111', { layer: 3 }));
    children.push(createCircle(sx, sy + s * 0.04, s * 0.025, '#111', { layer: 3 }));
  }

  return createGroup(x, y, children, { layer: 3, category: 'web', modifiable: true, id: uid('web') });
}

// Haunted house
function hauntedHouse(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const wallColor = rng.pick(['#2C1810', '#3B2318', '#1A0F0A']);

  // Main building body
  children.push(createRect(x - s * 0.4, y - s * 0.5, s * 0.8, s * 0.5, wallColor, { layer: 2 }));

  // Damaged roof (crooked)
  const roofPts = `${x - s * 0.5},${y - s * 0.5} ${x - s * 0.05},${y - s * 0.9} ${x + s * 0.5},${y - s * 0.48}`;
  children.push(createPolygon(x, y, roofPts, '#1A1A2E', { layer: 2 }));

  // Roof damage (gaps)
  children.push(createPath(x, y, `M${x + s * 0.1},${y - s * 0.65} L${x + s * 0.15},${y - s * 0.55} L${x + s * 0.2},${y - s * 0.6}`, 'none', { stroke: '#0D0A1A', strokeWidth: 3, layer: 2 }));

  // Tower/chimney
  children.push(createRect(x + s * 0.2, y - s * 0.95, s * 0.12, s * 0.3, '#333', { layer: 2 }));

  // Windows (some glowing, some broken)
  const windowPositions = [
    { wx: x - s * 0.25, wy: y - s * 0.4, glow: rng.chance(0.5) },
    { wx: x + s * 0.1, wy: y - s * 0.4, glow: rng.chance(0.4) },
    { wx: x - s * 0.25, wy: y - s * 0.2, glow: rng.chance(0.3) },
    { wx: x + s * 0.1, wy: y - s * 0.2, glow: false },
  ];

  for (const win of windowPositions) {
    const ww = s * 0.15;
    const wh = s * 0.12;
    if (win.glow) {
      children.push(createRect(win.wx, win.wy, ww, wh, '#FFD700', { layer: 2, opacity: 0.6 }));
      // Window frame
      children.push(createRect(win.wx, win.wy, ww, wh, 'none', { layer: 2, stroke: '#444', strokeWidth: 1 }));
      children.push(createLine(win.wx + ww / 2, win.wy, win.wx + ww / 2, win.wy + wh, '#444', { strokeWidth: 1, layer: 2 }));
      children.push(createLine(win.wx, win.wy + wh / 2, win.wx + ww, win.wy + wh / 2, '#444', { strokeWidth: 1, layer: 2 }));
    } else {
      children.push(createRect(win.wx, win.wy, ww, wh, '#0A0A14', { layer: 2, stroke: '#444', strokeWidth: 1 }));
      // Broken glass line
      children.push(createPath(win.wx, win.wy, `M${win.wx + ww * 0.3},${win.wy} L${win.wx + ww * 0.5},${win.wy + wh * 0.6} L${win.wx + ww * 0.7},${win.wy + wh * 0.3}`, 'none', { stroke: '#555', strokeWidth: 0.8, layer: 2 }));
    }
  }

  // Door (ajar)
  const doorX = x - s * 0.08;
  const doorY = y - s * 0.2;
  const doorW = s * 0.16;
  const doorH = s * 0.2;
  children.push(createRect(doorX, doorY, doorW, doorH, '#0A0A0A', { layer: 2 }));
  // Door frame
  children.push(createRect(doorX, doorY, doorW, doorH, 'none', { layer: 2, stroke: '#3B2318', strokeWidth: 2 }));
  // Ajar door panel (slightly open - a thin dark gap)
  children.push(createRect(doorX + doorW * 0.15, doorY, doorW * 0.7, doorH, '#1A0F0A', { layer: 2, opacity: 0.8 }));
  // Door handle
  children.push(createCircle(doorX + doorW * 0.75, doorY + doorH * 0.5, s * 0.015, '#8B7355', { layer: 2 }));

  // Cobwebs on corners (thin curved paths)
  children.push(createPath(x, y, `M${x - s * 0.4},${y - s * 0.5} Q${x - s * 0.3},${y - s * 0.45} ${x - s * 0.3},${y - s * 0.35}`, 'none', { stroke: '#AAA', strokeWidth: 0.5, layer: 3, opacity: 0.4 }));
  children.push(createPath(x, y, `M${x - s * 0.4},${y - s * 0.5} Q${x - s * 0.35},${y - s * 0.42} ${x - s * 0.25},${y - s * 0.42}`, 'none', { stroke: '#AAA', strokeWidth: 0.5, layer: 3, opacity: 0.4 }));
  children.push(createPath(x, y, `M${x + s * 0.4},${y - s * 0.48} Q${x + s * 0.32},${y - s * 0.43} ${x + s * 0.3},${y - s * 0.35}`, 'none', { stroke: '#AAA', strokeWidth: 0.5, layer: 3, opacity: 0.4 }));

  return createGroup(x, y, children, { layer: 2, category: 'building', modifiable: true, id: uid('hauntedhouse') });
}

// Dead tree (no leaves, gnarled)
function deadTree(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const trunkColor = rng.pick(['#2C1810', '#3B2318', '#1A0F0A', '#333']);

  // Main trunk
  children.push(createPath(x, y, `M${x - s * 0.05},${y} L${x - s * 0.03},${y - s * 0.5} L${x + s * 0.03},${y - s * 0.5} L${x + s * 0.05},${y} Z`, trunkColor, { layer: 2 }));

  // Gnarled branches (6-8)
  const branchCount = rng.nextInt(6, 8);
  for (let i = 0; i < branchCount; i++) {
    const startY = y - s * rng.nextFloat(0.3, 0.5);
    const side = rng.chance(0.5) ? 1 : -1;
    const endX = x + side * rng.nextFloat(s * 0.15, s * 0.4);
    const endY = startY - rng.nextFloat(s * 0.1, s * 0.35);
    const cpX = x + side * rng.nextFloat(s * 0.05, s * 0.2);
    const cpY = (startY + endY) / 2 + rng.nextFloat(-s * 0.05, s * 0.05);
    children.push(createPath(x, y, `M${x},${startY} Q${cpX},${cpY} ${endX},${endY}`, 'none', {
      stroke: trunkColor, strokeWidth: rng.nextFloat(s * 0.02, s * 0.05), layer: 2, opacity: 0.9,
    }));

    // Sub-branches
    if (rng.chance(0.5)) {
      const subEnd = {
        x: endX + side * rng.nextFloat(s * 0.05, s * 0.15),
        y: endY - rng.nextFloat(s * 0.05, s * 0.15),
      };
      children.push(createPath(x, y, `M${endX},${endY} L${subEnd.x},${subEnd.y}`, 'none', {
        stroke: trunkColor, strokeWidth: rng.nextFloat(s * 0.01, s * 0.025), layer: 2, opacity: 0.8,
      }));
    }
  }

  return createGroup(x, y, children, { layer: 2, category: 'tree', modifiable: true, id: uid('deadtree') });
}

// Path lantern
function pathLantern(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  // Post
  children.push(createRect(x - s * 0.03, y - s * 0.5, s * 0.06, s * 0.5, '#555', { layer: 3 }));
  // Lantern body
  children.push(createRect(x - s * 0.06, y - s * 0.6, s * 0.12, s * 0.12, '#8B7355', { layer: 3 }));
  // Flame glow
  children.push(createCircle(x, y - s * 0.54, s * 0.04, '#FF8C00', { layer: 3, opacity: 0.9 }));
  children.push(createCircle(x, y - s * 0.54, s * 0.1, '#FF8C00', { layer: 3, opacity: 0.2 }));

  return createGroup(x, y, children, { layer: 3, category: 'lantern', modifiable: true, id: uid('lantern') });
}

export function generateHalloweenNight(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  const elements: SVGElementData[] = [];
  const groundY = h * 0.72;

  // === SVG DEFS ===
  const defs = `
    <linearGradient id="nightSkyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0D0A1A"/>
      <stop offset="40%" stop-color="#1A0F2E"/>
      <stop offset="70%" stop-color="#2D1B4E"/>
      <stop offset="100%" stop-color="#1A1A2E"/>
    </linearGradient>
    <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFACD" stop-opacity="0.95"/>
      <stop offset="40%" stop-color="#F0E68C" stop-opacity="0.6"/>
      <stop offset="70%" stop-color="#DAA520" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#DAA520" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="pumpkinGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FF8C00" stop-opacity="0.5"/>
      <stop offset="60%" stop-color="#FF6600" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#FF6600" stop-opacity="0"/>
    </radialGradient>
    <filter id="fogFilter">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  `;

  // === LAYER 0: Sky background ===
  elements.push(createRect(0, 0, w, h, 'url(#nightSkyGrad)', { layer: 0, category: 'sky', modifiable: false }));

  // === LAYER 0: Stars (20-30) ===
  for (let i = 0; i < rng.nextInt(20, 30); i++) {
    const sx = rng.nextFloat(10, w - 10);
    const sy = rng.nextFloat(10, h * 0.45);
    const sr = rng.nextFloat(0.5, 2);
    elements.push(createCircle(sx, sy, sr, '#FFFACD', {
      layer: 0, category: 'star', modifiable: false, opacity: rng.nextFloat(0.3, 0.9),
    }));
  }
  // A few bigger twinkling stars
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    elements.push(createStar(rng.nextFloat(20, w - 20), rng.nextFloat(15, h * 0.35), rng.nextFloat(2, 4), rng));
  }

  // === LAYER 0: Huge moon with craters ===
  const moonX = rng.nextFloat(w * 0.6, w * 0.85);
  const moonY = rng.nextFloat(h * 0.12, h * 0.25);
  const moonR = rng.nextFloat(h * 0.1, h * 0.14);

  // Moon glow aura
  elements.push(createCircle(moonX, moonY, moonR * 2.5, 'url(#moonGlow)', { layer: 0, category: 'moon', modifiable: false }));
  // Moon disc
  elements.push(createCircle(moonX, moonY, moonR, '#FFFACD', { layer: 0, category: 'moon', modifiable: true, id: uid('moon'), opacity: 0.95 }));
  // Craters
  for (let i = 0; i < rng.nextInt(4, 7); i++) {
    const cx = moonX + rng.nextFloat(-moonR * 0.6, moonR * 0.6);
    const cy = moonY + rng.nextFloat(-moonR * 0.6, moonR * 0.6);
    const cr = rng.nextFloat(moonR * 0.06, moonR * 0.15);
    elements.push(createCircle(cx, cy, cr, '#E8D88C', { layer: 0, category: 'moon', modifiable: false, opacity: 0.5 }));
  }

  // === LAYER 1: Ground ===
  const groundPath = `M0,${groundY} Q${w * 0.15},${groundY - 8} ${w * 0.3},${groundY + 3} Q${w * 0.5},${groundY - 5} ${w * 0.7},${groundY + 4} Q${w * 0.85},${groundY - 3} ${w},${groundY + 2} L${w},${h} L0,${h} Z`;
  elements.push(createPath(0, 0, groundPath, '#0A1A0A', { layer: 1, category: 'ground', modifiable: false }));
  // Darker ground layer
  elements.push(createRect(0, groundY + 15, w, h - groundY - 15, '#050F05', { layer: 1, category: 'ground', modifiable: false, opacity: 0.6 }));

  // === LAYER 1: Stone pathway to house ===
  const houseX = w * 0.5;
  const pathStartX = w * 0.45;
  for (let i = 0; i < rng.nextInt(8, 12); i++) {
    const px = pathStartX + rng.nextFloat(-15, 15) + (i * 5) * rng.nextFloat(-0.5, 0.5);
    const py = groundY + 5 + i * ((h - groundY - 10) / 12);
    const pw = rng.nextFloat(12, 22);
    const ph = rng.nextFloat(6, 12);
    elements.push(createEllipse(px, py, pw * 0.5, ph * 0.5, rng.pick(['#555', '#666', '#777']), {
      layer: 1, category: 'path', modifiable: false, opacity: 0.5,
    }));
  }

  // === LAYER 2: Haunted house ===
  elements.push(hauntedHouse(houseX, groundY + 5, h * 0.55, rng));

  // === LAYER 2: Dead trees (4-6) ===
  const treeCount = rng.nextInt(4, 6);
  for (let i = 0; i < treeCount; i++) {
    const tx = rng.nextFloat(w * 0.02, w * 0.98);
    const ts = rng.nextFloat(h * 0.3, h * 0.55);
    elements.push(deadTree(tx, groundY + rng.nextFloat(-5, 10), ts, rng));
  }

  // === LAYER 2: Graveyard section (left side) ===
  const graveStartX = w * 0.05;
  const tombCount = rng.nextInt(3, 5);
  for (let i = 0; i < tombCount; i++) {
    const tx = graveStartX + i * rng.nextFloat(w * 0.06, w * 0.1);
    const ts = rng.nextFloat(h * 0.08, h * 0.14);
    elements.push(tombstone(tx, groundY + 3, ts, rng, i === 0));
  }

  // Iron fence in graveyard area
  elements.push(createFence(graveStartX - 10, groundY + 3, tombCount * w * 0.08 + 30, rng));

  // === LAYER 3: Pumpkins (5-8) ===
  const pumpkinCount = rng.nextInt(5, 8);
  for (let i = 0; i < pumpkinCount; i++) {
    const px = rng.nextFloat(w * 0.05, w * 0.95);
    const py = groundY + rng.nextFloat(-5, 15);
    const ps = rng.nextFloat(h * 0.05, h * 0.09);
    if (rng.chance(0.65)) {
      elements.push(carvedPumpkin(px, py, ps, rng));
      // Pumpkin glow
      elements.push(createCircle(px, py, ps * 0.8, 'url(#pumpkinGlow)', { layer: 3, category: 'glow', modifiable: false }));
    } else {
      elements.push(plainPumpkin(px, py, ps, rng));
    }
  }

  // === LAYER 3: Witch's cauldron ===
  elements.push(cauldron(rng.nextFloat(w * 0.65, w * 0.85), groundY + 5, h * 0.12, rng));

  // === LAYER 3: Black cat on fence ===
  elements.push(blackCat(graveStartX + rng.nextFloat(10, 40), groundY - 15, h * 0.1, rng));

  // === LAYER 3: Spider web in tree corner ===
  elements.push(spiderWeb(rng.nextFloat(w * 0.1, w * 0.3), rng.nextFloat(groundY - h * 0.35, groundY - h * 0.2), h * 0.12, rng));

  // === LAYER 3: Path lanterns (3-5) ===
  const lanternCount = rng.nextInt(3, 5);
  for (let i = 0; i < lanternCount; i++) {
    const lx = pathStartX + rng.nextFloat(-30, 30);
    const ly = groundY + 5 + i * ((h - groundY - 10) / lanternCount);
    elements.push(pathLantern(lx, ly, h * 0.08, rng));
  }

  // === LAYER 4: Ghosts (2-3) ===
  const ghostCount = rng.nextInt(2, 3);
  for (let i = 0; i < ghostCount; i++) {
    elements.push(ghost(
      rng.nextFloat(w * 0.1, w * 0.9),
      rng.nextFloat(h * 0.15, groundY - h * 0.1),
      rng.nextFloat(h * 0.08, h * 0.14),
      rng,
    ));
  }

  // === LAYER 4: Bats (5-8) ===
  const batCount = rng.nextInt(5, 8);
  for (let i = 0; i < batCount; i++) {
    elements.push(bat(
      rng.nextFloat(20, w - 20),
      rng.nextFloat(h * 0.05, h * 0.45),
      rng.nextFloat(h * 0.03, h * 0.06),
      rng,
    ));
  }

  // === LAYER 4: Fog/mist layers ===
  for (let i = 0; i < rng.nextInt(4, 7); i++) {
    const fogY = groundY + rng.nextFloat(-20, 30);
    const fogW = rng.nextFloat(w * 0.3, w * 0.7);
    const fogX = rng.nextFloat(-fogW * 0.1, w - fogW * 0.5);
    elements.push(createRect(fogX, fogY, fogW, rng.nextFloat(15, 35), '#888', {
      layer: 4, category: 'fog', modifiable: false, opacity: rng.nextFloat(0.05, 0.15),
    }));
  }
  // Bottom fog band
  elements.push(createRect(0, h - h * 0.08, w, h * 0.08, '#666', { layer: 4, category: 'fog', modifiable: false, opacity: 0.1 }));

  return { elements, defs };
}
