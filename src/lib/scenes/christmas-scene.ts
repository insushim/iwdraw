import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath, createGroup,
  createLine, createPolygon,
} from '../engine/primitives';
import {
  combineDefs, nightDefs, nightSkyGradient, snowGradient, radialGradient,
  lampGlowGradient, linearGradient, softGlow, dropShadow,
} from './svg-effects';
import {
  detailedTree, detailedStar, detailedFence, detailedHouse, detailedRock,
  resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'xm') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// Snowman
function snowman(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];

  // Bottom sphere
  children.push(createCircle(x, y - s * 0.15, s * 0.18, '#FAFAFA', { layer: 3, stroke: '#DDD', strokeWidth: 1 }));
  // Middle sphere
  children.push(createCircle(x, y - s * 0.38, s * 0.14, '#FAFAFA', { layer: 3, stroke: '#DDD', strokeWidth: 1 }));
  // Head
  children.push(createCircle(x, y - s * 0.57, s * 0.1, '#FAFAFA', { layer: 3, stroke: '#DDD', strokeWidth: 1 }));

  // Top hat
  children.push(createRect(x - s * 0.08, y - s * 0.72, s * 0.16, s * 0.1, '#111', { layer: 3 }));
  children.push(createRect(x - s * 0.12, y - s * 0.64, s * 0.24, s * 0.03, '#111', { layer: 3 }));
  // Hat band
  children.push(createRect(x - s * 0.08, y - s * 0.67, s * 0.16, s * 0.02, '#CC0000', { layer: 3 }));

  // Coal eyes
  children.push(createCircle(x - s * 0.035, y - s * 0.59, s * 0.015, '#111', { layer: 3 }));
  children.push(createCircle(x + s * 0.035, y - s * 0.59, s * 0.015, '#111', { layer: 3 }));

  // Carrot nose
  children.push(createPolygon(x, y, `${x},${y - s * 0.56} ${x + s * 0.08},${y - s * 0.55} ${x},${y - s * 0.53}`, '#FF6600', { layer: 3 }));

  // Coal mouth
  for (let i = 0; i < 5; i++) {
    const angle = (i - 2) * 15 * Math.PI / 180;
    const mx = x + Math.cos(angle) * s * 0.05;
    const my = y - s * 0.52 + Math.sin(angle) * s * 0.02 + s * 0.01;
    children.push(createCircle(mx, my, s * 0.008, '#111', { layer: 3 }));
  }

  // Scarf
  children.push(createRect(x - s * 0.1, y - s * 0.49, s * 0.2, s * 0.04, '#CC0000', { layer: 3 }));
  children.push(createRect(x + s * 0.06, y - s * 0.49, s * 0.04, s * 0.1, '#CC0000', { layer: 3 }));

  // Coal buttons
  for (let i = 0; i < 3; i++) {
    children.push(createCircle(x, y - s * 0.28 - i * s * 0.06, s * 0.012, '#111', { layer: 3 }));
  }

  // Stick arms
  children.push(createLine(x - s * 0.14, y - s * 0.4, x - s * 0.32, y - s * 0.5, '#5C3317', { strokeWidth: 2, layer: 3 }));
  children.push(createLine(x + s * 0.14, y - s * 0.4, x + s * 0.32, y - s * 0.5, '#5C3317', { strokeWidth: 2, layer: 3 }));
  children.push(createLine(x - s * 0.28, y - s * 0.48, x - s * 0.34, y - s * 0.55, '#5C3317', { strokeWidth: 1.5, layer: 3 }));
  children.push(createLine(x + s * 0.28, y - s * 0.48, x + s * 0.34, y - s * 0.55, '#5C3317', { strokeWidth: 1.5, layer: 3 }));

  return createGroup(x, y, children, { layer: 3, category: 'snowman', modifiable: true, id: uid('snowman'), filter: 'url(#shadow)' });
}

// Christmas tree with decorations
function christmasTree(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const treeGreen = rng.pick(['#1B5E20', '#2E7D32', '#1A4D1A']);

  // Trunk
  children.push(createRect(x - s * 0.05, y - s * 0.05, s * 0.1, s * 0.15, '#5C3317', { layer: 2 }));

  // Tree layers (3 triangles)
  for (let i = 0; i < 3; i++) {
    const layerW = s * (0.45 - i * 0.08);
    const layerY = y - s * 0.05 - i * s * 0.25;
    const pts = `${x},${layerY - s * 0.22} ${x - layerW / 2},${layerY + s * 0.05} ${x + layerW / 2},${layerY + s * 0.05}`;
    const shade = i === 1 ? '#1B6B1B' : treeGreen;
    children.push(createPolygon(x, y, pts, shade, { layer: 2 }));
  }

  // Star on top
  const starY = y - s * 0.8;
  let starD = '';
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? s * 0.06 : s * 0.025;
    const angle = (i * Math.PI / 5) - Math.PI / 2;
    starD += `${i === 0 ? 'M' : 'L'}${x + Math.cos(angle) * r},${starY + Math.sin(angle) * r} `;
  }
  starD += 'Z';
  children.push(createPath(x, starY, starD, '#FFD700', { layer: 3, opacity: 0.95 }));
  children.push(createCircle(x, starY, s * 0.08, 'url(#starGlow)', { layer: 3, opacity: 0.5 }));

  // Ornaments
  const ornColors = ['#FF0000', '#0066FF', '#FFD700', '#FF69B4', '#00CC00', '#FF6600', '#9900CC'];
  for (let i = 0; i < rng.nextInt(10, 16); i++) {
    const layer = rng.nextInt(0, 2);
    const layerW = s * (0.35 - layer * 0.07);
    const ox = x + rng.nextFloat(-layerW * 0.4, layerW * 0.4);
    const oy = y - s * 0.08 - layer * s * 0.25 + rng.nextFloat(-s * 0.08, s * 0.08);
    const or2 = rng.nextFloat(s * 0.015, s * 0.03);
    children.push(createCircle(ox, oy, or2, rng.pick(ornColors), { layer: 3, opacity: 0.9 }));
    children.push(createCircle(ox - or2 * 0.3, oy - or2 * 0.3, or2 * 0.3, '#FFF', { layer: 3, opacity: 0.5 }));
  }

  // Tinsel
  for (let i = 0; i < 3; i++) {
    const ty = y - s * 0.15 - i * s * 0.2;
    const tw = s * (0.3 - i * 0.05);
    const tinselPath = `M${x - tw * 0.4},${ty} Q${x - tw * 0.15},${ty - s * 0.03} ${x},${ty + s * 0.02} Q${x + tw * 0.15},${ty + s * 0.05} ${x + tw * 0.4},${ty}`;
    children.push(createPath(x, ty, tinselPath, 'none', {
      stroke: rng.pick(['#FFD700', '#C0C0C0']), strokeWidth: 1, layer: 3, opacity: 0.6,
    }));
  }

  // Presents underneath
  const presentColors = ['#FF0000', '#0066FF', '#00AA00', '#FFD700', '#FF69B4'];
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    const pw = rng.nextFloat(s * 0.06, s * 0.12);
    const ph = rng.nextFloat(s * 0.05, s * 0.1);
    const px = x + rng.nextFloat(-s * 0.2, s * 0.2) - pw / 2;
    const py = y - ph + rng.nextFloat(-s * 0.02, s * 0.02);
    const pColor = rng.pick(presentColors);
    children.push(createRect(px, py, pw, ph, pColor, { layer: 3 }));
    children.push(createLine(px + pw / 2, py, px + pw / 2, py + ph, '#FFD700', { strokeWidth: 1.5, layer: 3 }));
    children.push(createLine(px, py + ph / 2, px + pw, py + ph / 2, '#FFD700', { strokeWidth: 1.5, layer: 3 }));
    children.push(createCircle(px + pw / 2, py, s * 0.015, '#FFD700', { layer: 3 }));
  }

  return createGroup(x, y, children, { layer: 2, category: 'christmastree', modifiable: true, id: uid('xtree'), filter: 'url(#shadow)' });
}

// Cozy house with Christmas decorations
function cozyHouse(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const wallColor = rng.pick(['#F5DEB3', '#E8D5B7', '#FFF8DC', '#DEB887']);

  // Main wall
  children.push(createRect(x - s * 0.4, y - s * 0.45, s * 0.8, s * 0.45, wallColor, { layer: 2 }));

  // Roof
  const roofPts = `${x - s * 0.48},${y - s * 0.45} ${x},${y - s * 0.8} ${x + s * 0.48},${y - s * 0.45}`;
  children.push(createPolygon(x, y, roofPts, '#8B0000', { layer: 2 }));

  // Snow on roof
  const snowRoof = `M${x - s * 0.46},${y - s * 0.46} Q${x - s * 0.3},${y - s * 0.52} ${x - s * 0.15},${y - s * 0.62} Q${x - s * 0.05},${y - s * 0.68} ${x},${y - s * 0.78} Q${x + s * 0.05},${y - s * 0.68} ${x + s * 0.15},${y - s * 0.62} Q${x + s * 0.3},${y - s * 0.52} ${x + s * 0.46},${y - s * 0.46}`;
  children.push(createPath(x, y, snowRoof, '#FFF', { layer: 2, opacity: 0.85, stroke: '#EEF', strokeWidth: 2 }));

  // Chimney
  children.push(createRect(x + s * 0.2, y - s * 0.85, s * 0.1, s * 0.25, '#8B4513', { layer: 2 }));
  children.push(createRect(x + s * 0.18, y - s * 0.87, s * 0.14, s * 0.04, '#FFF', { layer: 2, opacity: 0.9 }));
  // Smoke
  for (let i = 0; i < 3; i++) {
    children.push(createCircle(
      x + s * 0.25 + rng.nextFloat(-s * 0.03, s * 0.03) + i * s * 0.02,
      y - s * 0.9 - i * s * 0.07,
      s * (0.025 + i * 0.01),
      '#CCC', { layer: 4, opacity: 0.3 - i * 0.08 },
    ));
  }

  // Windows (warm glowing)
  const winPositions = [
    { wx: x - s * 0.28, wy: y - s * 0.35 },
    { wx: x + s * 0.12, wy: y - s * 0.35 },
  ];
  for (const win of winPositions) {
    const ww = s * 0.14;
    const wh = s * 0.12;
    children.push(createRect(win.wx - s * 0.02, win.wy - s * 0.02, ww + s * 0.04, wh + s * 0.04, 'url(#warmWindowGlow)', { layer: 2, opacity: 0.3 }));
    children.push(createRect(win.wx, win.wy, ww, wh, '#FFD700', { layer: 2, opacity: 0.55 }));
    children.push(createRect(win.wx, win.wy, ww, wh, 'none', { layer: 2, stroke: '#5C3317', strokeWidth: 2 }));
    children.push(createLine(win.wx + ww / 2, win.wy, win.wx + ww / 2, win.wy + wh, '#5C3317', { strokeWidth: 1.5, layer: 2 }));
    children.push(createLine(win.wx, win.wy + wh / 2, win.wx + ww, win.wy + wh / 2, '#5C3317', { strokeWidth: 1.5, layer: 2 }));
  }

  // Door
  const doorX = x - s * 0.08;
  const doorY = y - s * 0.25;
  children.push(createRect(doorX, doorY, s * 0.16, s * 0.25, '#6B3410', { layer: 2 }));
  children.push(createCircle(doorX + s * 0.12, doorY + s * 0.13, s * 0.012, '#C0C0C0', { layer: 2 }));

  // Wreath on door
  const wreathX = doorX + s * 0.08;
  const wreathY = doorY + s * 0.06;
  children.push(createCircle(wreathX, wreathY, s * 0.04, '#1B5E20', { layer: 3, opacity: 0.9 }));
  children.push(createCircle(wreathX, wreathY, s * 0.025, '#6B3410', { layer: 3 }));
  children.push(createCircle(wreathX, wreathY + s * 0.04, s * 0.012, '#FF0000', { layer: 3 }));

  // String lights on eaves
  const lightColors = ['#FF0000', '#00FF00', '#0066FF', '#FFD700', '#FF69B4', '#00FFFF'];
  const eaveY = y - s * 0.45;
  for (let i = 0; i < rng.nextInt(12, 18); i++) {
    const t = i / 16;
    const lx = x - s * 0.42 + t * s * 0.84;
    const ly = eaveY + Math.abs(t - 0.5) * s * 0.02 + rng.nextFloat(0, s * 0.02);
    children.push(createCircle(lx, ly, s * 0.012, rng.pick(lightColors), { layer: 3, opacity: 0.9 }));
  }
  children.push(createPath(x, eaveY, `M${x - s * 0.42},${eaveY} Q${x},${eaveY + s * 0.02} ${x + s * 0.42},${eaveY}`, 'none', {
    stroke: '#333', strokeWidth: 0.5, layer: 3, opacity: 0.4,
  }));

  return createGroup(x, y, children, { layer: 2, category: 'building', modifiable: true, id: uid('house'), filter: 'url(#shadow)' });
}

// Candy cane
function candyCane(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];

  children.push(createRect(x - s * 0.03, y - s * 0.5, s * 0.06, s * 0.5, '#FFF', { layer: 3 }));
  children.push(createPath(x, y, `M${x + s * 0.03},${y - s * 0.5} Q${x + s * 0.03},${y - s * 0.65} ${x - s * 0.08},${y - s * 0.65} Q${x - s * 0.15},${y - s * 0.65} ${x - s * 0.15},${y - s * 0.55}`, 'none', {
    stroke: '#FFF', strokeWidth: s * 0.06, layer: 3,
  }));

  for (let i = 0; i < 6; i++) {
    const sy = y - i * s * 0.08;
    children.push(createRect(x - s * 0.03, sy - s * 0.04, s * 0.06, s * 0.04, '#FF0000', { layer: 3 }));
  }
  children.push(createPath(x, y, `M${x + s * 0.02},${y - s * 0.52} Q${x + s * 0.02},${y - s * 0.58} ${x - s * 0.04},${y - s * 0.6}`, 'none', {
    stroke: '#FF0000', strokeWidth: s * 0.03, layer: 3,
  }));

  return createGroup(x, y, children, { layer: 3, category: 'candycane', modifiable: true, id: uid('candy'), filter: 'url(#shadow)' });
}

// Sled
function sled(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const woodColor = '#8B4513';

  children.push(createPath(x, y, `M${x - s * 0.3},${y} Q${x - s * 0.35},${y - s * 0.05} ${x - s * 0.3},${y - s * 0.1} L${x + s * 0.3},${y - s * 0.1} Q${x + s * 0.35},${y - s * 0.05} ${x + s * 0.3},${y}`, 'none', {
    stroke: '#CC0000', strokeWidth: s * 0.03, layer: 3,
  }));
  for (let i = 0; i < 3; i++) {
    children.push(createRect(x - s * 0.25, y - s * 0.18 - i * s * 0.015, s * 0.5, s * 0.012, woodColor, { layer: 3 }));
  }
  children.push(createRect(x - s * 0.25, y - s * 0.22, s * 0.03, s * 0.12, '#CC0000', { layer: 3 }));
  children.push(createRect(x + s * 0.22, y - s * 0.22, s * 0.03, s * 0.12, '#CC0000', { layer: 3 }));

  return createGroup(x, y, children, { layer: 3, category: 'sled', modifiable: true, id: uid('sled'), filter: 'url(#shadow)' });
}

// Gift box
function giftBox(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const boxColor = rng.pick(['#FF0000', '#0066FF', '#00AA00', '#FF69B4', '#9900CC', '#FFD700']);

  children.push(createRect(x - s * 0.15, y - s * 0.15, s * 0.3, s * 0.15, boxColor, { layer: 3 }));
  children.push(createRect(x - s * 0.17, y - s * 0.19, s * 0.34, s * 0.05, boxColor, { layer: 3, opacity: 0.85 }));
  children.push(createLine(x, y - s * 0.19, x, y, '#FFD700', { strokeWidth: 2, layer: 3 }));
  children.push(createLine(x - s * 0.17, y - s * 0.1, x + s * 0.17, y - s * 0.1, '#FFD700', { strokeWidth: 2, layer: 3 }));
  children.push(createEllipse(x - s * 0.04, y - s * 0.21, s * 0.04, s * 0.025, '#FFD700', { layer: 3 }));
  children.push(createEllipse(x + s * 0.04, y - s * 0.21, s * 0.04, s * 0.025, '#FFD700', { layer: 3 }));

  return createGroup(x, y, children, { layer: 3, category: 'gift', modifiable: true, id: uid('gift'), filter: 'url(#shadow)' });
}

export function generateChristmasScene(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];
  const groundY = h * 0.68;

  // === SVG DEFS ===
  const defs = combineDefs(
    nightDefs(),
    nightSkyGradient('nightSkyGrad'),
    snowGradient('snowGrad'),
    radialGradient('starGlow', [
      { offset: '0%', color: '#FFD700', opacity: 1 },
      { offset: '30%', color: '#FFD700', opacity: 0.5 },
      { offset: '70%', color: '#FFD700', opacity: 0.1 },
      { offset: '100%', color: '#FFD700', opacity: 0 },
    ]),
    radialGradient('warmWindowGlow', [
      { offset: '0%', color: '#FFD700', opacity: 0.4 },
      { offset: '50%', color: '#FFA500', opacity: 0.15 },
      { offset: '100%', color: '#FFA500', opacity: 0 },
    ]),
    lampGlowGradient('lampGlow', '#FFD700'),
    softGlow('snowGlow', 4, '#FFFFFF'),
  );

  // === LAYER 0: Night sky ===
  elements.push(createRect(0, 0, w, h, 'url(#nightSkyGrad)', { layer: 0, category: 'sky', modifiable: false }));

  // Starfield overlay
  elements.push(createRect(0, 0, w, h * 0.5, 'url(#stars)', { layer: 0, category: 'stars', modifiable: false, opacity: 0.7 }));

  // === LAYER 0: Bright star at top ===
  const bStarX = w * 0.5 + rng.nextFloat(-w * 0.15, w * 0.15);
  const bStarY = h * 0.08;
  elements.push(createCircle(bStarX, bStarY, h * 0.06, 'url(#starGlow)', { layer: 0, category: 'star', modifiable: false }));
  // Star sparkle
  let bStarD = '';
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? h * 0.03 : h * 0.01;
    const angle = (i * Math.PI / 4) - Math.PI / 2;
    bStarD += `${i === 0 ? 'M' : 'L'}${bStarX + Math.cos(angle) * r},${bStarY + Math.sin(angle) * r} `;
  }
  bStarD += 'Z';
  elements.push(createPath(bStarX, bStarY, bStarD, '#FFD700', { layer: 0, category: 'star', modifiable: true, id: uid('bigstar'), opacity: 0.95, filter: 'url(#warmGlow)' }));

  // === LAYER 0: Regular stars (15-25) ===
  for (let i = 0; i < rng.nextInt(15, 25); i++) {
    const sx = rng.nextFloat(10, w - 10);
    const sy = rng.nextFloat(10, h * 0.45);
    elements.push(createCircle(sx, sy, rng.nextFloat(0.5, 2), '#FFF', {
      layer: 0, category: 'star', modifiable: false, opacity: rng.nextFloat(0.4, 1),
    }));
  }
  // Detailed stars
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    elements.push(detailedStar(rng.nextFloat(20, w - 20), rng.nextFloat(15, h * 0.4), rng.nextFloat(2, 4), rng));
  }

  // === LAYER 1: Snow ground ===
  const snowPath = `M0,${groundY} Q${w * 0.08},${groundY - 10} ${w * 0.18},${groundY + 2} Q${w * 0.3},${groundY - 8} ${w * 0.42},${groundY + 5} Q${w * 0.55},${groundY - 6} ${w * 0.68},${groundY + 3} Q${w * 0.82},${groundY - 4} ${w * 0.92},${groundY + 6} Q${w * 0.97},${groundY - 2} ${w},${groundY + 3} L${w},${h} L0,${h} Z`;
  elements.push(createPath(0, 0, snowPath, 'url(#snowGrad)', { layer: 1, category: 'ground', modifiable: false }));
  // Blue shadow on snow
  elements.push(createRect(0, groundY + 15, w, h * 0.05, '#B0C4DE', { layer: 1, category: 'ground', modifiable: false, opacity: 0.15 }));

  // === LAYER 2: Pine trees with snow (5-8) ===
  const pineCount = rng.nextInt(5, 8);
  for (let i = 0; i < pineCount; i++) {
    const tx = rng.nextFloat(w * 0.02, w * 0.98);
    const ts = rng.nextFloat(h * 0.2, h * 0.4);
    elements.push(detailedTree(tx, groundY + rng.nextFloat(-5, 5), 'pine', ts, rng));

    // Snow on tree branches
    for (let j = 0; j < 3; j++) {
      const snowW2 = ts * (0.25 - j * 0.05);
      const snowY2 = groundY - ts * (0.1 + j * 0.25) + rng.nextFloat(-5, 5);
      elements.push(createEllipse(tx, snowY2, snowW2, ts * 0.03, '#FFF', {
        layer: 3, category: 'snow', modifiable: false, opacity: 0.85,
      }));
    }
  }

  // === LAYER 2: Cozy house ===
  const houseX = w * rng.nextFloat(0.35, 0.6);
  elements.push(cozyHouse(houseX, groundY + 5, h * 0.55, rng));
  // Window warm glow
  elements.push(createEllipse(houseX - h * 0.16, groundY - h * 0.12, h * 0.12, h * 0.08, 'url(#warmWindowGlow)', { layer: 1, category: 'glow', modifiable: false }));
  elements.push(createEllipse(houseX + h * 0.08, groundY - h * 0.12, h * 0.12, h * 0.08, 'url(#warmWindowGlow)', { layer: 1, category: 'glow', modifiable: false }));

  // === LAYER 2: Second smaller house ===
  if (rng.chance(0.6)) {
    const h2x = houseX > w * 0.5 ? w * 0.15 : w * 0.82;
    elements.push(cozyHouse(h2x, groundY + 5, h * 0.4, rng));
  }

  // === LAYER 2: Snow-covered fence ===
  const fenceX = rng.nextFloat(w * 0.05, w * 0.25);
  const fenceLen = rng.nextFloat(w * 0.15, w * 0.3);
  elements.push(detailedFence(fenceX, groundY + 3, fenceLen, 1, rng));
  // Snow on fence
  elements.push(createRect(fenceX, groundY - 17, fenceLen, 4, '#FFF', { layer: 3, category: 'snow', modifiable: false, opacity: 0.8 }));

  // String of lights along fence
  const fLightColors = ['#FF0000', '#00FF00', '#0066FF', '#FFD700', '#FF69B4'];
  for (let i = 0; i < Math.floor(fenceLen / 12); i++) {
    elements.push(createCircle(fenceX + 6 + i * 12, groundY - 13, 2.5, rng.pick(fLightColors), {
      layer: 3, category: 'light', modifiable: false, opacity: 0.85,
    }));
  }

  // === LAYER 3: Big Christmas tree ===
  const xtreeX = rng.nextFloat(w * 0.35, w * 0.65);
  elements.push(christmasTree(xtreeX, groundY + 5, h * 0.6, rng));

  // === LAYER 3: Snowman ===
  elements.push(snowman(rng.nextFloat(w * 0.15, w * 0.35), groundY + 5, h * 0.5, rng));

  // === LAYER 3: Sled ===
  elements.push(sled(rng.nextFloat(w * 0.6, w * 0.85), groundY + rng.nextFloat(-5, 5), h * 0.12, rng));

  // === LAYER 3: Candy canes (2-3) ===
  for (let i = 0; i < rng.nextInt(2, 3); i++) {
    elements.push(candyCane(
      rng.nextFloat(w * 0.1, w * 0.9),
      groundY + rng.nextFloat(-3, 5),
      h * rng.nextFloat(0.08, 0.12),
      rng,
    ));
  }

  // === LAYER 3: Scattered gift boxes ===
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    elements.push(giftBox(
      rng.nextFloat(w * 0.1, w * 0.9),
      groundY + rng.nextFloat(-5, 10),
      h * rng.nextFloat(0.06, 0.1),
      rng,
    ));
  }

  // === LAYER 3: Rocks under snow ===
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const rx = rng.nextFloat(10, w - 10);
    const ry = rng.nextFloat(groundY + 5, h - 15);
    elements.push(detailedRock(rx, ry, rng.nextFloat(5, 12), rng));
  }

  // === LAYER 3: Footprints to door ===
  const doorApproxX = houseX;
  for (let i = 0; i < rng.nextInt(5, 8); i++) {
    const fpx = doorApproxX + rng.nextFloat(-5, 5);
    const fpy = groundY + 10 + i * rng.nextFloat(12, 18);
    elements.push(createEllipse(fpx - 3, fpy, 4, 2.5, '#C8D8E8', { layer: 1, category: 'footprint', modifiable: false, opacity: 0.4 }));
    elements.push(createEllipse(fpx + 3, fpy + 4, 4, 2.5, '#C8D8E8', { layer: 1, category: 'footprint', modifiable: false, opacity: 0.4 }));
  }

  // === LAYER 4: Snowflakes (30-50) ===
  for (let i = 0; i < rng.nextInt(30, 50); i++) {
    const fx = rng.nextFloat(0, w);
    const fy = rng.nextFloat(0, h * 0.95);
    const fr = rng.nextFloat(1, 4);
    elements.push(createCircle(fx, fy, fr, '#FFF', {
      layer: 4, category: 'snowflake', modifiable: false, opacity: rng.nextFloat(0.3, 0.9),
    }));
  }
  // Detailed snowflake shapes
  for (let i = 0; i < rng.nextInt(5, 10); i++) {
    const sx = rng.nextFloat(15, w - 15);
    const sy = rng.nextFloat(10, h * 0.85);
    const sr = rng.nextFloat(3, 6);
    const snowChildren: SVGElementData[] = [];
    for (let j = 0; j < 6; j++) {
      const angle2 = (j * 60) * Math.PI / 180;
      snowChildren.push(createLine(
        sx, sy,
        sx + Math.cos(angle2) * sr,
        sy + Math.sin(angle2) * sr,
        '#FFF', { strokeWidth: 0.8, layer: 4, opacity: 0.6 },
      ));
    }
    elements.push(createGroup(sx, sy, snowChildren, { layer: 4, category: 'snowflake', modifiable: false, opacity: rng.nextFloat(0.4, 0.8) }));
  }

  return { elements, defs };
}
