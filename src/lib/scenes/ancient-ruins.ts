import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import { createRect, createCircle, createEllipse, createPath, createLine, createGroup } from '../engine/primitives';
import {
  combineDefs, outdoorDefs, skyGradient, linearGradient, radialGradient,
  groundGradient, dropShadow, gaussianBlur,
} from './svg-effects';
import {
  detailedRock, detailedBird, detailedCloud, resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'ar') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// Helper: broken stone column
function brokenColumn(x: number, y: number, colW: number, colH: number, breakH: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const stoneColor = rng.pick(['#C8B896', '#B8A886', '#D4C8A8', '#BEB09A']);
  const stoneDark = '#8A7E6A';
  const stoneLight = '#E0D8C0';

  // Column shadow
  children.push(createEllipse(x + colW / 2, y + 2, colW * 0.6, 4, 'rgba(0,0,0,0.12)', { layer: 1 }));

  // Column base (wider)
  children.push(createRect(x - colW * 0.15, y - colW * 0.12, colW * 1.3, colW * 0.12, stoneDark, { layer: 2, opacity: 0.7 }));
  children.push(createRect(x - colW * 0.08, y - colW * 0.2, colW * 1.16, colW * 0.08, stoneColor, { layer: 2 }));

  // Column shaft with fluting (vertical grooves)
  children.push(createRect(x, y - breakH, colW, breakH - colW * 0.2, stoneColor, { layer: 2 }));
  // Fluting lines
  for (let f = 0; f < 5; f++) {
    const fx = x + colW * (0.15 + f * 0.18);
    children.push(createLine(fx, y - breakH + 2, fx, y - colW * 0.22, stoneDark, { strokeWidth: 0.8, layer: 2, opacity: 0.3 }));
  }

  // Broken top (jagged)
  const jaggedD = `M${x},${y - breakH} ` +
    `L${x + colW * 0.15},${y - breakH - rng.nextFloat(3, 10)} ` +
    `L${x + colW * 0.35},${y - breakH - rng.nextFloat(0, 5)} ` +
    `L${x + colW * 0.55},${y - breakH - rng.nextFloat(5, 14)} ` +
    `L${x + colW * 0.75},${y - breakH - rng.nextFloat(1, 8)} ` +
    `L${x + colW},${y - breakH} Z`;
  children.push(createPath(x, y, jaggedD, stoneLight, { layer: 2, opacity: 0.8 }));

  // Weathering marks
  for (let w2 = 0; w2 < 3; w2++) {
    const wy = y - rng.nextFloat(colW * 0.3, breakH * 0.8);
    children.push(createPath(x, wy,
      `M${x + colW * 0.1},${wy} Q${x + colW * 0.5},${wy + rng.nextFloat(-3, 3)} ${x + colW * 0.9},${wy + rng.nextFloat(-2, 2)}`,
      'none', { stroke: stoneDark, strokeWidth: 0.6, layer: 2, opacity: 0.25 }));
  }

  return createGroup(x, y, children, { layer: 2, category: 'column', modifiable: true, id: uid('col'), filter: 'url(#shadow)' });
}

// Helper: crumbled wall section
function crumbledWall(x: number, y: number, wallW: number, wallH: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const wallColor = rng.pick(['#C0A880', '#B8A070', '#D0B890']);
  const mortarColor = '#A09070';

  // Main wall block
  children.push(createRect(x, y - wallH, wallW, wallH, wallColor, { layer: 2 }));

  // Brick pattern
  for (let by = 0; by < wallH - 4; by += 10) {
    const offset = (Math.floor(by / 10) % 2) * 10;
    for (let bx = offset; bx < wallW - 2; bx += 20) {
      children.push(createRect(x + bx + 1, y - wallH + by + 1, Math.min(18, wallW - bx - 2), 8, mortarColor, { layer: 2, opacity: 0.3 }));
    }
  }

  // Crumbled top edge
  const crumbleD = `M${x},${y - wallH} ` +
    `L${x + wallW * 0.12},${y - wallH - rng.nextFloat(2, 8)} ` +
    `L${x + wallW * 0.28},${y - wallH + rng.nextFloat(5, 15)} ` +
    `L${x + wallW * 0.45},${y - wallH - rng.nextFloat(0, 6)} ` +
    `L${x + wallW * 0.6},${y - wallH + rng.nextFloat(8, 20)} ` +
    `L${x + wallW * 0.78},${y - wallH - rng.nextFloat(2, 10)} ` +
    `L${x + wallW * 0.9},${y - wallH + rng.nextFloat(3, 12)} ` +
    `L${x + wallW},${y - wallH} Z`;
  children.push(createPath(x, y, crumbleD, wallColor, { layer: 2 }));

  // Fallen debris at base
  for (let d = 0; d < rng.nextInt(2, 5); d++) {
    const dx = x + rng.nextFloat(-5, wallW + 5);
    const ds = rng.nextFloat(3, 8);
    children.push(createRect(dx, y - ds, ds * 1.5, ds, mortarColor, {
      layer: 2, rotation: rng.nextFloat(-20, 20), opacity: 0.7,
    }));
  }

  return createGroup(x, y, children, { layer: 2, category: 'wall', modifiable: true, id: uid('wall'), filter: 'url(#shadow)' });
}

// Helper: vine/creeper on ruins
function vineOvergrowth(x: number, y: number, w2: number, h2: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const vineColor = rng.pick(['#2D6B1E', '#3A7A2A', '#4B8B33']);
  const leafColor = rng.pick(['#3E8B2F', '#4D9B3A', '#5BAA48']);

  // Main vine stem
  const stemD = `M${x},${y} Q${x + w2 * 0.3},${y - h2 * 0.4} ${x + w2 * 0.5},${y - h2 * 0.7} Q${x + w2 * 0.7},${y - h2 * 0.9} ${x + w2},${y - h2}`;
  children.push(createPath(x, y, stemD, 'none', { stroke: vineColor, strokeWidth: 2, layer: 3, opacity: 0.8 }));

  // Branch stems
  for (let b = 0; b < rng.nextInt(2, 5); b++) {
    const t = rng.nextFloat(0.2, 0.8);
    const bx = x + w2 * t * 0.5;
    const by = y - h2 * t;
    const branchD = `M${bx},${by} Q${bx + rng.nextFloat(-15, 15)},${by - rng.nextFloat(5, 20)} ${bx + rng.nextFloat(-20, 20)},${by - rng.nextFloat(15, 30)}`;
    children.push(createPath(bx, by, branchD, 'none', { stroke: vineColor, strokeWidth: 1, layer: 3, opacity: 0.6 }));
  }

  // Leaves
  for (let l = 0; l < rng.nextInt(6, 12); l++) {
    const t = rng.nextFloat(0.1, 0.95);
    const lx = x + w2 * t * 0.5 + rng.nextFloat(-12, 12);
    const ly = y - h2 * t + rng.nextFloat(-8, 8);
    const leafS = rng.nextFloat(3, 7);
    const leafD = `M${lx},${ly} Q${lx - leafS},${ly - leafS * 0.8} ${lx},${ly - leafS * 1.5} Q${lx + leafS},${ly - leafS * 0.8} ${lx},${ly} Z`;
    children.push(createPath(lx, ly, leafD, leafColor, { layer: 3, opacity: rng.nextFloat(0.5, 0.9) }));
  }

  return createGroup(x, y, children, { layer: 3, category: 'vine', modifiable: true, id: uid('vine') });
}

// Helper: lizard
function lizard(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const color = rng.pick(['#6B7B3A', '#8B6B3A', '#5A6B2A', '#7A8A4A']);
  const s = size;

  // Body
  children.push(createEllipse(x, y, s * 0.4, s * 0.15, color, { layer: 3 }));
  // Head
  children.push(createEllipse(x + s * 0.4, y - s * 0.02, s * 0.18, s * 0.1, color, { layer: 3 }));
  // Eye
  children.push(createCircle(x + s * 0.48, y - s * 0.06, s * 0.035, '#222', { layer: 3 }));
  // Tail (curved)
  children.push(createPath(x, y, `M${x - s * 0.35},${y} Q${x - s * 0.6},${y + s * 0.1} ${x - s * 0.7},${y - s * 0.05}`, 'none', { stroke: color, strokeWidth: s * 0.06, layer: 3 }));
  // Legs
  children.push(createPath(x, y, `M${x - s * 0.15},${y + s * 0.1} L${x - s * 0.25},${y + s * 0.25}`, 'none', { stroke: color, strokeWidth: s * 0.04, layer: 3 }));
  children.push(createPath(x, y, `M${x + s * 0.15},${y + s * 0.1} L${x + s * 0.25},${y + s * 0.25}`, 'none', { stroke: color, strokeWidth: s * 0.04, layer: 3 }));
  children.push(createPath(x, y, `M${x - s * 0.15},${y - s * 0.1} L${x - s * 0.22},${y - s * 0.22}`, 'none', { stroke: color, strokeWidth: s * 0.04, layer: 3 }));
  children.push(createPath(x, y, `M${x + s * 0.2},${y - s * 0.08} L${x + s * 0.3},${y - s * 0.2}`, 'none', { stroke: color, strokeWidth: s * 0.04, layer: 3 }));

  return createGroup(x, y, children, { layer: 3, category: 'lizard', modifiable: true, id: uid('liz') });
}

export function generateAncientRuins(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  // === SVG Defs ===
  const defs = combineDefs(
    outdoorDefs(),
    skyGradient('skyGrad', '#5A9AD9', '#9AC8E8', '#D4BC90'),
    linearGradient('sandGrad', [
      { offset: '0%', color: '#D4B882' },
      { offset: '40%', color: '#C8A870' },
      { offset: '100%', color: '#BEA060' },
    ]),
    groundGradient('dustGrad', '#C8A870', '#B09060'),
    linearGradient('mountainGrad', [
      { offset: '0%', color: '#8A7A6A' },
      { offset: '50%', color: '#9A8A78' },
      { offset: '100%', color: '#B0A090' },
    ]),
    radialGradient('sunHaze', [
      { offset: '0%', color: '#FFFFFF', opacity: 0.6 },
      { offset: '40%', color: '#FFE4A0', opacity: 0.3 },
      { offset: '100%', color: '#FFE4A0', opacity: 0 },
    ]),
    linearGradient('hazeGrad', [
      { offset: '0%', color: '#D4BC90', opacity: 0 },
      { offset: '60%', color: '#D4BC90', opacity: 0.15 },
      { offset: '100%', color: '#D4BC90', opacity: 0.35 },
    ]),
    dropShadow('ruinShadow', 3, 5, 4, 'rgba(0,0,0,0.2)'),
    gaussianBlur('dustBlur', 3),
  );

  // ════════════════════════════════════════════
  //  LAYER 0 — Sky (arid/hazy)
  // ════════════════════════════════════════════
  elements.push(createRect(0, 0, w, h * 0.55, 'url(#skyGrad)', { layer: 0, category: 'sky', modifiable: false }));

  // Sun with haze
  const sunX = rng.nextFloat(w * 0.6, w * 0.85);
  const sunY = rng.nextFloat(h * 0.08, h * 0.16);
  elements.push(createCircle(sunX, sunY, 60, 'url(#sunHaze)', { layer: 0, category: 'sun', modifiable: false, opacity: 0.8 }));
  elements.push(createCircle(sunX, sunY, 16, '#FFF8E0', { layer: 0, category: 'sun', modifiable: true, id: uid('sun'), opacity: 0.9 }));

  // Clouds (sparse)
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    elements.push(detailedCloud(rng.nextFloat(20, w - 80), rng.nextFloat(20, h * 0.18), rng.nextFloat(50, 80), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 1 — Distant mountains
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const mx = i * (w / 4) + rng.nextFloat(-30, 30);
    const mw = rng.nextFloat(140, 260);
    const mh = rng.nextFloat(60, 120);
    const mountainD = `M${mx},${h * 0.55} L${mx + mw * 0.3},${h * 0.55 - mh * 0.7} L${mx + mw * 0.5},${h * 0.55 - mh} L${mx + mw * 0.7},${h * 0.55 - mh * 0.6} L${mx + mw},${h * 0.55} Z`;
    const mtColor = rng.pick(['#9A8A75', '#8B7B68', '#A09080']);
    elements.push(createPath(mx, h * 0.55, mountainD, mtColor, {
      layer: 1, category: 'mountain', modifiable: false, filter: 'url(#bgBlur)', opacity: 0.6,
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 1 — Sandy ground
  // ════════════════════════════════════════════
  elements.push(createRect(0, h * 0.5, w, h * 0.5, 'url(#sandGrad)', { layer: 1, category: 'ground', modifiable: false }));

  // Sand texture undulations
  for (let i = 0; i < 5; i++) {
    const sy = h * 0.55 + i * 25 + rng.nextFloat(-5, 5);
    const sandWaveD = `M0,${sy} Q${w * 0.25},${sy - 3} ${w * 0.5},${sy + 2} Q${w * 0.75},${sy + 5} ${w},${sy - 1}`;
    elements.push(createPath(0, sy, sandWaveD, 'none', {
      layer: 1, category: 'ground', modifiable: false, stroke: '#C0A068', strokeWidth: 0.8, opacity: 0.3,
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Broken columns
  // ════════════════════════════════════════════
  const colPositions: number[] = [];
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    const cx = rng.nextFloat(60, w - 80);
    const cy = h * 0.55 + rng.nextFloat(-5, 25);
    const cw = rng.nextFloat(18, 28);
    const fullH = rng.nextFloat(80, 150);
    const breakH = rng.nextFloat(fullH * 0.3, fullH * 0.9);
    elements.push(brokenColumn(cx, cy, cw, fullH, breakH, rng));
    colPositions.push(cx);
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Crumbled walls
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const wx = rng.nextFloat(30, w - 120);
    const wy = h * 0.56 + rng.nextFloat(0, 30);
    const ww = rng.nextFloat(60, 120);
    const wh = rng.nextFloat(30, 60);
    elements.push(crumbledWall(wx, wy, ww, wh, rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Stone arch (partial)
  // ════════════════════════════════════════════
  if (rng.chance(0.7)) {
    const archX = rng.nextFloat(w * 0.25, w * 0.65);
    const archY = h * 0.55;
    const archW = rng.nextFloat(80, 120);
    const archH = rng.nextFloat(80, 110);
    const archChildren: SVGElementData[] = [];
    const archColor = '#B8A080';

    // Left pillar
    archChildren.push(createRect(archX, archY - archH * 0.7, 18, archH * 0.7, archColor, { layer: 2 }));
    // Right pillar
    archChildren.push(createRect(archX + archW - 18, archY - archH * 0.6, 18, archH * 0.6, archColor, { layer: 2 }));
    // Arch curve (partial - broken on one side)
    const archD = `M${archX},${archY - archH * 0.7} Q${archX},${archY - archH} ${archX + archW * 0.5},${archY - archH} Q${archX + archW * 0.8},${archY - archH} ${archX + archW - 18},${archY - archH * 0.6}`;
    archChildren.push(createPath(archX, archY, archD, 'none', { stroke: archColor, strokeWidth: 14, layer: 2, opacity: 0.9 }));
    // Keystone
    archChildren.push(createRect(archX + archW * 0.45, archY - archH - 5, 14, 14, '#C8B890', { layer: 2, rotation: 45 }));

    elements.push(createGroup(archX, archY, archChildren, {
      layer: 2, category: 'arch', modifiable: true, id: uid('arch'), filter: 'url(#ruinShadow)',
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Scattered rocks
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(6, 10); i++) {
    elements.push(detailedRock(rng.nextFloat(15, w - 15), h * 0.55 + rng.nextFloat(5, h * 0.38), rng.nextFloat(5, 18), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Vines on ruins
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const vx = colPositions.length > 0 ? colPositions[rng.nextInt(0, colPositions.length - 1)] + rng.nextFloat(-5, 5) : rng.nextFloat(60, w - 60);
    const vy = h * 0.55 + rng.nextFloat(-5, 10);
    elements.push(vineOvergrowth(vx, vy, rng.nextFloat(20, 40), rng.nextFloat(40, 80), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Lizards
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    elements.push(lizard(rng.nextFloat(80, w - 80), h * 0.58 + rng.nextFloat(0, 30), rng.nextFloat(14, 22), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Scattered pottery shards
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const px = rng.nextFloat(40, w - 40);
    const py = h * 0.60 + rng.nextFloat(0, 25);
    const shardColor = rng.pick(['#B86B3A', '#C87A4A', '#A85A2A']);
    const shardD = `M${px},${py} L${px + rng.nextFloat(5, 12)},${py - rng.nextFloat(3, 8)} L${px + rng.nextFloat(10, 18)},${py + rng.nextFloat(0, 4)} L${px + rng.nextFloat(3, 8)},${py + rng.nextFloat(4, 10)} Z`;
    elements.push(createPath(px, py, shardD, shardColor, {
      layer: 3, category: 'shard', modifiable: true, id: uid('shard'), opacity: 0.8,
      rotation: rng.nextFloat(-30, 30),
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 4 — Birds (vultures circling)
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(detailedBird(rng.nextFloat(50, w - 50), rng.nextFloat(30, h * 0.3), true, rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 4 — Dust/haze overlay
  // ════════════════════════════════════════════
  elements.push(createRect(0, h * 0.4, w, h * 0.6, 'url(#hazeGrad)', {
    layer: 4, category: 'haze', modifiable: false, opacity: 0.4,
  }));

  // Dust particles
  for (let i = 0; i < rng.nextInt(15, 25); i++) {
    elements.push(createCircle(rng.nextFloat(0, w), rng.nextFloat(h * 0.3, h), rng.nextFloat(0.5, 2), '#D4BC90', {
      layer: 4, category: 'dust', modifiable: false, opacity: rng.nextFloat(0.05, 0.2),
    }));
  }

  return { elements, defs };
}
