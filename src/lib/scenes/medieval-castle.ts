import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import { createRect, createCircle, createEllipse, createPath, createLine, createGroup } from '../engine/primitives';
import {
  combineDefs, outdoorDefs, skyGradient, linearGradient, radialGradient,
  groundGradient, brickPattern, dropShadow, gaussianBlur,
} from './svg-effects';
import {
  detailedTree, detailedCloud, detailedRock, detailedBird, detailedPerson,
  resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'mc') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// Helper: castle tower
function castleTower(x: number, y: number, towerW: number, towerH: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const wallColor = '#8A8070';
  const wallDark = '#6A6058';
  const wallLight = '#A09888';

  // Tower body
  children.push(createRect(x, y - towerH, towerW, towerH, wallColor, { layer: 2 }));

  // Brick texture lines
  for (let by = 5; by < towerH; by += rng.nextFloat(12, 18)) {
    const offset = (Math.floor(by / 15) % 2) * 8;
    for (let bx = offset; bx < towerW; bx += 16) {
      children.push(createRect(x + bx, y - towerH + by, 14, 10, wallDark, { layer: 2, opacity: 0.15 }));
    }
  }

  // Highlight edge
  children.push(createRect(x, y - towerH, 2, towerH, wallLight, { layer: 2, opacity: 0.3 }));

  // Battlements (merlons)
  const merlonW = towerW / 5;
  for (let m = 0; m < 5; m += 2) {
    children.push(createRect(x + m * merlonW, y - towerH - merlonW * 0.8, merlonW, merlonW * 0.8, wallColor, { layer: 2 }));
    children.push(createRect(x + m * merlonW, y - towerH - merlonW * 0.8, merlonW, merlonW * 0.8, wallDark, { layer: 2, opacity: 0.1 }));
  }

  // Arrow slit windows
  for (let aw = 0; aw < rng.nextInt(2, 4); aw++) {
    const wy = y - towerH * (0.3 + aw * 0.25);
    const wx = x + towerW * 0.5 - 2;
    children.push(createRect(wx, wy, 4, 14, '#2A2220', { layer: 2 }));
    children.push(createRect(wx - 2, wy + 5, 8, 4, '#2A2220', { layer: 2 }));
  }

  return createGroup(x, y, children, { layer: 2, category: 'tower', modifiable: true, id: uid('twr') });
}

// Helper: flag/banner
function flagBanner(x: number, y: number, flagH: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const flagColor = rng.pick(['#CC2222', '#2244AA', '#228844', '#DDAA00', '#8822AA']);
  const poleH = flagH * 1.5;

  // Pole
  children.push(createRect(x - 1, y - poleH, 2, poleH, '#666', { layer: 3 }));
  // Pole top ornament
  children.push(createCircle(x, y - poleH, 3, '#DAA520', { layer: 3 }));

  // Flag (waving shape)
  const fw = flagH * 0.8;
  const fh = flagH * 0.5;
  const waveAmt = rng.nextFloat(3, 8);
  const flagD = `M${x + 1},${y - poleH + 3} ` +
    `Q${x + fw * 0.3},${y - poleH + 3 - waveAmt} ${x + fw * 0.5},${y - poleH + 3} ` +
    `Q${x + fw * 0.7},${y - poleH + 3 + waveAmt} ${x + fw},${y - poleH + 3} ` +
    `L${x + fw},${y - poleH + 3 + fh} ` +
    `Q${x + fw * 0.7},${y - poleH + 3 + fh + waveAmt * 0.5} ${x + fw * 0.5},${y - poleH + 3 + fh} ` +
    `Q${x + fw * 0.3},${y - poleH + 3 + fh - waveAmt * 0.5} ${x + 1},${y - poleH + 3 + fh} Z`;
  children.push(createPath(x, y, flagD, flagColor, { layer: 3, opacity: 0.9 }));

  // Simple emblem (cross or stripe)
  if (rng.chance(0.5)) {
    // Horizontal stripe
    children.push(createRect(x + 2, y - poleH + 3 + fh * 0.35, fw - 3, fh * 0.3, '#FFD700', { layer: 3, opacity: 0.7 }));
  }

  return createGroup(x, y, children, { layer: 3, category: 'flag', modifiable: true, id: uid('flag') });
}

// Helper: horse
function horse(x: number, y: number, s: number, rng: SeededRandom, facingLeft: boolean): SVGElementData {
  const children: SVGElementData[] = [];
  const color = rng.pick(['#4A3728', '#6B4E37', '#8B6914', '#2B1B0E', '#DDD']);
  const dir = facingLeft ? -1 : 1;

  // Body
  children.push(createEllipse(x, y - s * 0.35, s * 0.45, s * 0.22, color, { layer: 2 }));
  // Neck
  children.push(createPath(x, y, `M${x + dir * s * 0.3},${y - s * 0.45} Q${x + dir * s * 0.4},${y - s * 0.65} ${x + dir * s * 0.45},${y - s * 0.75}`, 'none', { stroke: color, strokeWidth: s * 0.14, layer: 2 }));
  // Head
  children.push(createEllipse(x + dir * s * 0.5, y - s * 0.8, s * 0.12, s * 0.08, color, { layer: 2 }));
  // Ears
  children.push(createPath(x, y, `M${x + dir * s * 0.48},${y - s * 0.86} L${x + dir * s * 0.46},${y - s * 0.95} L${x + dir * s * 0.52},${y - s * 0.88}`, color, { layer: 2 }));
  // Eye
  children.push(createCircle(x + dir * s * 0.52, y - s * 0.82, s * 0.02, '#111', { layer: 2 }));
  // Legs
  children.push(createRect(x - s * 0.25, y - s * 0.15, s * 0.06, s * 0.25, color, { layer: 2 }));
  children.push(createRect(x - s * 0.08, y - s * 0.15, s * 0.06, s * 0.25, color, { layer: 2 }));
  children.push(createRect(x + s * 0.1, y - s * 0.15, s * 0.06, s * 0.25, color, { layer: 2 }));
  children.push(createRect(x + s * 0.25, y - s * 0.15, s * 0.06, s * 0.25, color, { layer: 2 }));
  // Hooves
  children.push(createRect(x - s * 0.26, y + s * 0.08, s * 0.08, s * 0.04, '#222', { layer: 2 }));
  children.push(createRect(x - s * 0.09, y + s * 0.08, s * 0.08, s * 0.04, '#222', { layer: 2 }));
  children.push(createRect(x + s * 0.09, y + s * 0.08, s * 0.08, s * 0.04, '#222', { layer: 2 }));
  children.push(createRect(x + s * 0.24, y + s * 0.08, s * 0.08, s * 0.04, '#222', { layer: 2 }));
  // Tail
  children.push(createPath(x, y, `M${x - dir * s * 0.4},${y - s * 0.35} Q${x - dir * s * 0.55},${y - s * 0.2} ${x - dir * s * 0.5},${y - s * 0.05}`, 'none', { stroke: color, strokeWidth: s * 0.04, layer: 2 }));
  // Mane
  children.push(createPath(x, y, `M${x + dir * s * 0.35},${y - s * 0.5} Q${x + dir * s * 0.28},${y - s * 0.6} ${x + dir * s * 0.4},${y - s * 0.7}`, 'none', { stroke: color, strokeWidth: s * 0.06, layer: 2, opacity: 0.7 }));

  return createGroup(x, y, children, { layer: 2, category: 'horse', modifiable: true, id: uid('horse'), filter: 'url(#shadow)' });
}

export function generateMedievalCastle(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  // === SVG Defs ===
  const defs = combineDefs(
    outdoorDefs(),
    skyGradient('skyGrad', '#3A7AC0', '#6AA8D8', '#A0C8E8'),
    groundGradient('hillGrad', '#5A8A3A', '#3A6A2A'),
    linearGradient('moatGrad', [
      { offset: '0%', color: '#2A6B8A' },
      { offset: '50%', color: '#1A5570' },
      { offset: '100%', color: '#2A6B8A' },
    ]),
    linearGradient('pathGrad', [
      { offset: '0%', color: '#9A8A70' },
      { offset: '100%', color: '#8A7A60' },
    ]),
    brickPattern('castleBrick', '#7A7068', '#6A6058'),
    radialGradient('sunGlow', [
      { offset: '0%', color: '#FFFFFF', opacity: 0.8 },
      { offset: '50%', color: '#FFE082', opacity: 0.3 },
      { offset: '100%', color: '#FFD700', opacity: 0 },
    ]),
    dropShadow('castleShadow', 4, 6, 5, 'rgba(0,0,0,0.25)'),
    gaussianBlur('farBlur', 2),
  );

  // ════════════════════════════════════════════
  //  LAYER 0 — Sky
  // ════════════════════════════════════════════
  elements.push(createRect(0, 0, w, h * 0.55, 'url(#skyGrad)', { layer: 0, category: 'sky', modifiable: false }));

  // Sun
  const sunX = rng.nextFloat(w * 0.1, w * 0.3);
  const sunY = rng.nextFloat(h * 0.06, h * 0.15);
  elements.push(createCircle(sunX, sunY, 50, 'url(#sunGlow)', { layer: 0, category: 'sun', modifiable: false, opacity: 0.6 }));
  elements.push(createCircle(sunX, sunY, 16, '#FFF8DC', { layer: 0, category: 'sun', modifiable: true, id: uid('sun'), opacity: 0.95 }));

  // Clouds
  for (let i = 0; i < rng.nextInt(2, 5); i++) {
    elements.push(detailedCloud(rng.nextFloat(40, w - 80), rng.nextFloat(20, h * 0.22), rng.nextFloat(45, 80), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 1 — Rolling green hills
  // ════════════════════════════════════════════
  // Far hill
  elements.push(createPath(0, h * 0.55,
    `M0,${h * 0.55} Q${w * 0.25},${h * 0.42} ${w * 0.5},${h * 0.48} Q${w * 0.75},${h * 0.44} ${w},${h * 0.52} L${w},${h} L0,${h} Z`,
    '#5A8A3A', { layer: 1, category: 'ground', modifiable: false, opacity: 0.6, filter: 'url(#farBlur)' }));

  // Main ground
  elements.push(createRect(0, h * 0.5, w, h * 0.5, 'url(#hillGrad)', { layer: 1, category: 'ground', modifiable: false }));

  // Castle hill (elevated mound)
  const hillCX = w * 0.5;
  const hillD = `M${hillCX - 250},${h * 0.55} Q${hillCX - 150},${h * 0.38} ${hillCX},${h * 0.35} Q${hillCX + 150},${h * 0.38} ${hillCX + 250},${h * 0.55} Z`;
  elements.push(createPath(hillCX, h * 0.55, hillD, '#4A7A2E', { layer: 1, category: 'hill', modifiable: false }));
  // Hill highlight
  elements.push(createPath(hillCX, h * 0.55,
    `M${hillCX - 180},${h * 0.48} Q${hillCX - 80},${h * 0.39} ${hillCX},${h * 0.36} Q${hillCX + 60},${h * 0.38} ${hillCX + 120},${h * 0.42}`,
    'none', { layer: 1, category: 'hill', modifiable: false, stroke: '#6AA04A', strokeWidth: 2, opacity: 0.3 }));

  // ════════════════════════════════════════════
  //  LAYER 1 — Moat
  // ════════════════════════════════════════════
  const moatY = h * 0.62;
  elements.push(createPath(0, moatY,
    `M${hillCX - 220},${moatY} Q${hillCX - 160},${moatY + 15} ${hillCX},${moatY + 18} Q${hillCX + 160},${moatY + 15} ${hillCX + 220},${moatY}`,
    'none', { layer: 1, category: 'moat', modifiable: false, stroke: 'url(#moatGrad)', strokeWidth: 20, opacity: 0.8 }));
  // Water reflection
  elements.push(createEllipse(hillCX, moatY + 14, 160, 5, '#80C0E0', { layer: 1, category: 'moat', modifiable: false, opacity: 0.15 }));

  // ════════════════════════════════════════════
  //  LAYER 2 — Castle main structure
  // ════════════════════════════════════════════
  const castleX = hillCX - 120;
  const castleY = h * 0.35;
  const castleW2 = 240;
  const castleH2 = 120;
  const wallColor = '#8A8070';
  const wallDark = '#6A6058';

  // Main wall
  elements.push(createRect(castleX, castleY - castleH2 * 0.4, castleW2, castleH2 * 0.6, 'url(#castleBrick)', {
    layer: 2, category: 'castle', modifiable: false,
  }));
  // Wall top border
  elements.push(createRect(castleX, castleY - castleH2 * 0.4, castleW2, 3, wallDark, { layer: 2, category: 'castle', modifiable: false }));

  // Battlements on main wall
  const merlonCount = Math.floor(castleW2 / 18);
  for (let m = 0; m < merlonCount; m += 2) {
    elements.push(createRect(castleX + m * 18, castleY - castleH2 * 0.4 - 10, 16, 10, wallColor, {
      layer: 2, category: 'battlement', modifiable: false,
    }));
  }

  // Left tower
  elements.push(castleTower(castleX - 25, castleY + castleH2 * 0.2, 35, castleH2 * 1.2, rng));
  // Right tower
  elements.push(castleTower(castleX + castleW2 - 10, castleY + castleH2 * 0.2, 35, castleH2 * 1.2, rng));
  // Center keep tower (tallest)
  elements.push(castleTower(castleX + castleW2 * 0.38, castleY + castleH2 * 0.2, 55, castleH2 * 1.6, rng));

  // ════════════════════════════════════════════
  //  LAYER 2 — Castle gate and drawbridge
  // ════════════════════════════════════════════
  const gateX = castleX + castleW2 * 0.35;
  const gateY = castleY + castleH2 * 0.2;
  const gateW = 50;
  const gateH = 55;

  // Gate arch
  const gateD = `M${gateX},${gateY} L${gateX},${gateY - gateH * 0.6} Q${gateX},${gateY - gateH} ${gateX + gateW * 0.5},${gateY - gateH} Q${gateX + gateW},${gateY - gateH} ${gateX + gateW},${gateY - gateH * 0.6} L${gateX + gateW},${gateY} Z`;
  elements.push(createPath(gateX, gateY, gateD, '#1A1410', {
    layer: 2, category: 'gate', modifiable: true, id: uid('gate'),
  }));
  // Gate portcullis lines
  for (let gl = 4; gl < gateW - 4; gl += 8) {
    elements.push(createLine(gateX + gl, gateY - gateH * 0.9, gateX + gl, gateY, '#3A3430', {
      strokeWidth: 2, layer: 2, category: 'gate', modifiable: false, opacity: 0.7,
    }));
  }

  // Drawbridge
  const bridgeW = gateW + 10;
  const bridgeLen = 50;
  elements.push(createRect(gateX - 5, gateY, bridgeW, bridgeLen, '#6B5030', {
    layer: 2, category: 'bridge', modifiable: true, id: uid('bridge'),
  }));
  // Plank lines
  for (let pl = 5; pl < bridgeLen; pl += 8) {
    elements.push(createLine(gateX - 3, gateY + pl, gateX + bridgeW - 7, gateY + pl, '#5A4020', {
      strokeWidth: 0.5, layer: 2, category: 'bridge', modifiable: false, opacity: 0.4,
    }));
  }
  // Chains
  elements.push(createPath(gateX, gateY, `M${gateX},${gateY - gateH * 0.3} Q${gateX - 8},${gateY + bridgeLen * 0.3} ${gateX - 3},${gateY + bridgeLen}`, 'none', { stroke: '#888', strokeWidth: 2, layer: 2, opacity: 0.6 }));
  elements.push(createPath(gateX, gateY, `M${gateX + gateW},${gateY - gateH * 0.3} Q${gateX + gateW + 8},${gateY + bridgeLen * 0.3} ${gateX + bridgeW - 2},${gateY + bridgeLen}`, 'none', { stroke: '#888', strokeWidth: 2, layer: 2, opacity: 0.6 }));

  // ════════════════════════════════════════════
  //  LAYER 2 — Flags on towers
  // ════════════════════════════════════════════
  elements.push(flagBanner(castleX - 8, castleY + castleH2 * 0.2 - castleH2 * 1.2, rng.nextFloat(20, 30), rng));
  elements.push(flagBanner(castleX + castleW2 + 8, castleY + castleH2 * 0.2 - castleH2 * 1.2, rng.nextFloat(20, 30), rng));
  elements.push(flagBanner(castleX + castleW2 * 0.65, castleY + castleH2 * 0.2 - castleH2 * 1.6, rng.nextFloat(25, 35), rng));

  // ════════════════════════════════════════════
  //  LAYER 2 — Path from drawbridge
  // ════════════════════════════════════════════
  const pathStartX = gateX + gateW * 0.5;
  elements.push(createPath(pathStartX, gateY + bridgeLen,
    `M${pathStartX - 20},${gateY + bridgeLen} Q${pathStartX - 10},${h * 0.72} ${pathStartX + 10},${h * 0.82} Q${pathStartX + 30},${h * 0.9} ${pathStartX + 60},${h * 0.95}`,
    'none', { layer: 1, category: 'path', modifiable: false, stroke: 'url(#pathGrad)', strokeWidth: 30, opacity: 0.6 }));

  // ════════════════════════════════════════════
  //  LAYER 2 — Trees around castle
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    const tx = rng.nextFloat(20, w - 40);
    const ty = h * 0.55 + rng.nextFloat(5, 30);
    elements.push(detailedTree(tx, ty, rng.pick(['oak', 'pine']), rng.nextFloat(50, 85), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Horses
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    const hx = rng.nextFloat(50, w - 80);
    const hy = h * 0.60 + rng.nextFloat(10, 30);
    elements.push(horse(hx, hy, rng.nextFloat(30, 45), rng, rng.chance(0.5)));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Knights / guards
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 5); i++) {
    const kx = rng.nextFloat(40, w - 40);
    const ky = h * 0.60 + rng.nextFloat(10, 30);
    elements.push(detailedPerson(kx, ky, rng.nextFloat(25, 35), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Rocks on hillside
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    elements.push(detailedRock(rng.nextFloat(20, w - 20), h * 0.56 + rng.nextFloat(0, 35), rng.nextFloat(5, 14), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 4 — Birds
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 5); i++) {
    elements.push(detailedBird(rng.nextFloat(50, w - 50), rng.nextFloat(15, h * 0.25), true, rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 4 — Particles
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(8, 15); i++) {
    elements.push(createCircle(rng.nextFloat(0, w), rng.nextFloat(0, h * 0.5), rng.nextFloat(0.3, 1.2), '#FFF', {
      layer: 4, category: 'particle', modifiable: false, opacity: rng.nextFloat(0.04, 0.15),
    }));
  }

  return { elements, defs };
}
