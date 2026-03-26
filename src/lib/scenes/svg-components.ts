// ─── High-Quality SVG Component Library ──────────────────────
// Illustration-quality components using complex bezier paths
// Drop-in replacements for primitives.ts basic shapes

import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';

type Opts = Partial<Pick<SVGElementData, 'stroke' | 'strokeWidth' | 'opacity' | 'rotation' | 'transform' | 'layer' | 'category' | 'modifiable' | 'id' | 'filter' | 'clipPath'>>;

let _cid = 10000;
function cuid(prefix = 'hq'): string {
  return `${prefix}_${++_cid}_${Date.now().toString(36)}`;
}
export function resetComponentId() { _cid = 10000; }

function mkPath(x: number, y: number, d: string, fill: string, opts: Opts = {}): SVGElementData {
  return { id: opts.id || cuid('p'), type: 'path', x, y, d, fill, layer: opts.layer ?? 2, category: opts.category ?? 'misc', modifiable: opts.modifiable ?? false, stroke: opts.stroke, strokeWidth: opts.strokeWidth, opacity: opts.opacity, transform: opts.transform, filter: opts.filter };
}
function mkCircle(x: number, y: number, r: number, fill: string, opts: Opts = {}): SVGElementData {
  return { id: opts.id || cuid('c'), type: 'circle', x, y, radius: r, fill, layer: opts.layer ?? 2, category: opts.category ?? 'misc', modifiable: opts.modifiable ?? false, opacity: opts.opacity, filter: opts.filter };
}
function mkEllipse(x: number, y: number, rx: number, ry: number, fill: string, opts: Opts = {}): SVGElementData {
  return { id: opts.id || cuid('e'), type: 'ellipse', x, y, rx, ry, fill, layer: opts.layer ?? 2, category: opts.category ?? 'misc', modifiable: opts.modifiable ?? false, opacity: opts.opacity, transform: opts.transform, filter: opts.filter };
}
function mkRect(x: number, y: number, w: number, h: number, fill: string, opts: Opts = {}): SVGElementData {
  return { id: opts.id || cuid('r'), type: 'rect', x, y, width: w, height: h, fill, layer: opts.layer ?? 2, category: opts.category ?? 'misc', modifiable: opts.modifiable ?? false, stroke: opts.stroke, strokeWidth: opts.strokeWidth, opacity: opts.opacity, transform: opts.transform, filter: opts.filter };
}
function mkGroup(x: number, y: number, children: SVGElementData[], opts: Opts = {}): SVGElementData {
  return { id: opts.id || cuid('g'), type: 'group', x, y, fill: 'none', children, layer: opts.layer ?? 2, category: opts.category ?? 'misc', modifiable: opts.modifiable ?? false, opacity: opts.opacity, transform: opts.transform, filter: opts.filter, clipPath: opts.clipPath };
}
function mkLine(x1: number, y1: number, x2: number, y2: number, stroke: string, sw: number, opts: Opts = {}): SVGElementData {
  return { id: opts.id || cuid('l'), type: 'line', x: x1, y: y1, x1, y1, x2, y2, fill: 'none', stroke, strokeWidth: sw, layer: opts.layer ?? 2, category: opts.category ?? 'misc', modifiable: false, opacity: opts.opacity };
}

function hsl(h: number, s: number, l: number): string { return `hsl(${h}, ${s}%, ${l}%)`; }
function darken(h: number, s: number, l: number, amt: number): string { return hsl(h, s, Math.max(0, l - amt)); }
function lighten(h: number, s: number, l: number, amt: number): string { return hsl(h, Math.max(0, s - 5), Math.min(100, l + amt)); }

// ═══════════════════════════════════════════════════════════════
// TREES
// ═══════════════════════════════════════════════════════════════

export function detailedTree(x: number, y: number, type: 'pine' | 'oak' | 'palm' | 'cherry' | 'willow', size: number, rng: SeededRandom): SVGElementData {
  switch (type) {
    case 'pine': return detailedPine(x, y, size, rng);
    case 'oak': return detailedOak(x, y, size, rng);
    case 'palm': return detailedPalm(x, y, size, rng);
    case 'cherry': return detailedCherry(x, y, size, rng);
    case 'willow': return detailedWillow(x, y, size, rng);
  }
}

function detailedPine(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const ch: SVGElementData[] = [];
  const th = rng.nextInt(28, 35), ts = rng.nextInt(30, 40), tl = rng.nextInt(18, 25);
  const trunkW = s * 0.09;

  // Trunk with bark texture
  const tw = trunkW;
  ch.push(mkPath(x, y, `M${x - tw},${y} L${x - tw * 0.7},${y - s * 0.35} L${x + tw * 0.7},${y - s * 0.35} L${x + tw},${y} Z`, hsl(th, ts, tl)));
  // Bark lines
  for (let i = 1; i <= 3; i++) {
    const by = y - s * 0.35 * i / 4;
    ch.push(mkLine(x - tw * 0.4, by, x + tw * 0.2, by + s * 0.02, hsl(th, ts, tl - 5), 0.5, { opacity: 0.4 }));
  }

  // Layered foliage tiers with organic bezier shapes
  const gh = rng.nextInt(110, 140), gs = rng.nextInt(45, 65), gl = rng.nextInt(25, 38);
  for (let i = 0; i < 4; i++) {
    const tierW = s * (0.55 - i * 0.1);
    const tierY = y - s * 0.2 - i * s * 0.2;
    const tierH = s * 0.25;
    const jx = rng.nextFloat(-s * 0.02, s * 0.02);
    // Main tier shape with organic edges
    ch.push(mkPath(x, tierY, `M${x + jx},${tierY - tierH} C${x - tierW * 0.3},${tierY - tierH * 0.6} ${x - tierW * 0.6},${tierY + tierH * 0.1} ${x - tierW / 2},${tierY + tierH * 0.15} L${x + tierW / 2},${tierY + tierH * 0.15} C${x + tierW * 0.6},${tierY + tierH * 0.1} ${x + tierW * 0.3},${tierY - tierH * 0.6} ${x + jx},${tierY - tierH} Z`, hsl(gh, gs, gl - i * 2)));
    // Highlight on left
    ch.push(mkPath(x, tierY, `M${x + jx - tierW * 0.05},${tierY - tierH * 0.8} C${x - tierW * 0.2},${tierY - tierH * 0.4} ${x - tierW * 0.35},${tierY} ${x - tierW * 0.3},${tierY + tierH * 0.1}`, 'none', { stroke: lighten(gh, gs, gl, 12), strokeWidth: 1, opacity: 0.3 }));
  }

  // Snow on top (optional)
  if (rng.chance(0.3)) {
    ch.push(mkPath(x, y, `M${x - s * 0.08},${y - s * 0.95} Q${x},${y - s * 1.02} ${x + s * 0.08},${y - s * 0.95}`, '#FFFFFF', { opacity: 0.8 }));
  }

  return mkGroup(x, y, ch, { layer: 2, category: 'tree', modifiable: true, id: cuid('pine') });
}

function detailedOak(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const ch: SVGElementData[] = [];
  const th = rng.nextInt(22, 32), ts = rng.nextInt(35, 50), tl = rng.nextInt(20, 28);

  // Trunk with organic shape
  const tw = s * 0.1;
  ch.push(mkPath(x, y, `M${x - tw},${y} C${x - tw},${y - s * 0.15} ${x - tw * 1.2},${y - s * 0.25} ${x - tw * 0.6},${y - s * 0.4} L${x + tw * 0.6},${y - s * 0.4} C${x + tw * 1.2},${y - s * 0.25} ${x + tw},${y - s * 0.15} ${x + tw},${y} Z`, hsl(th, ts, tl)));

  // Main branches
  ch.push(mkPath(x, y, `M${x - tw * 0.4},${y - s * 0.38} C${x - s * 0.2},${y - s * 0.5} ${x - s * 0.25},${y - s * 0.5} ${x - s * 0.22},${y - s * 0.55}`, 'none', { stroke: hsl(th, ts, tl + 3), strokeWidth: tw * 0.5 }));
  ch.push(mkPath(x, y, `M${x + tw * 0.4},${y - s * 0.38} C${x + s * 0.15},${y - s * 0.48} ${x + s * 0.2},${y - s * 0.52} ${x + s * 0.18},${y - s * 0.56}`, 'none', { stroke: hsl(th, ts, tl + 3), strokeWidth: tw * 0.4 }));

  // Foliage - multiple organic blobs
  const gh = rng.nextInt(95, 135), gs = rng.nextInt(40, 60), gl = rng.nextInt(28, 42);
  const crownCx = x, crownCy = y - s * 0.6;
  const r = s * 0.35;
  // Back layer (darker)
  ch.push(mkPath(x, y, `M${crownCx - r},${crownCy + r * 0.3} C${crownCx - r * 1.1},${crownCy - r * 0.3} ${crownCx - r * 0.5},${crownCy - r * 1.1} ${crownCx},${crownCy - r} C${crownCx + r * 0.5},${crownCy - r * 1.1} ${crownCx + r * 1.1},${crownCy - r * 0.3} ${crownCx + r},${crownCy + r * 0.3} C${crownCx + r * 0.7},${crownCy + r * 0.5} ${crownCx - r * 0.7},${crownCy + r * 0.5} ${crownCx - r},${crownCy + r * 0.3} Z`, darken(gh, gs, gl, 5)));

  // Front layer blobs
  const blobCount = rng.nextInt(4, 6);
  for (let i = 0; i < blobCount; i++) {
    const bx = crownCx + rng.nextFloat(-r * 0.5, r * 0.5);
    const by = crownCy + rng.nextFloat(-r * 0.4, r * 0.3);
    const br = r * rng.nextFloat(0.3, 0.5);
    ch.push(mkPath(bx, by,
      `M${bx - br},${by} C${bx - br},${by - br * 0.8} ${bx - br * 0.3},${by - br} ${bx},${by - br} C${bx + br * 0.3},${by - br} ${bx + br},${by - br * 0.8} ${bx + br},${by} C${bx + br},${by + br * 0.6} ${bx - br},${by + br * 0.6} ${bx - br},${by} Z`,
      hsl(gh + rng.nextInt(-5, 5), gs, gl + rng.nextInt(-3, 3)), { opacity: rng.nextFloat(0.7, 0.95) }));
  }
  // Highlight spots
  for (let i = 0; i < 3; i++) {
    const hx = crownCx + rng.nextFloat(-r * 0.4, r * 0.2);
    const hy = crownCy + rng.nextFloat(-r * 0.5, -r * 0.1);
    ch.push(mkCircle(hx, hy, r * 0.08, lighten(gh, gs, gl, 15), { opacity: 0.3 }));
  }

  // Shadow under tree
  ch.push(mkEllipse(x, y + s * 0.02, s * 0.3, s * 0.04, 'rgba(0,0,0,0.15)', { layer: 1 }));

  return mkGroup(x, y, ch, { layer: 2, category: 'tree', modifiable: true, id: cuid('oak') });
}

export function detailedPalm(x: number, y: number, s: number, rng: SeededRandom, lean = 0): SVGElementData {
  const ch: SVGElementData[] = [];
  const leanX = lean || rng.nextFloat(-s * 0.15, s * 0.15);
  const topX = x + leanX, topY = y - s * 0.75;

  // Trunk segments with texture
  const segments = 8;
  const th = rng.nextInt(25, 35), ts = rng.nextInt(30, 45), tl = rng.nextInt(30, 40);
  for (let i = 0; i < segments; i++) {
    const t1 = i / segments, t2 = (i + 1) / segments;
    const x1 = x + leanX * t1, y1 = y - s * 0.75 * t1;
    const x2 = x + leanX * t2, y2 = y - s * 0.75 * t2;
    const w1 = s * (0.07 - t1 * 0.03), w2 = s * (0.07 - t2 * 0.03);
    const shade = i % 2 === 0 ? 0 : 4;
    ch.push(mkPath(x, y, `M${x1 - w1},${y1} L${x2 - w2},${y2} L${x2 + w2},${y2} L${x1 + w1},${y1} Z`, hsl(th, ts, tl + shade)));
    // Ring mark
    ch.push(mkLine(x1 - w1 * 0.8, y1, x1 + w1 * 0.8, y1, hsl(th, ts, tl - 8), 0.6, { opacity: 0.4 }));
  }

  // Coconuts
  const coconutCount = rng.nextInt(2, 4);
  for (let i = 0; i < coconutCount; i++) {
    const cx = topX + rng.nextFloat(-s * 0.05, s * 0.05);
    const cy = topY + rng.nextFloat(0, s * 0.05);
    ch.push(mkCircle(cx, cy, s * 0.025, '#5C3D1A', { layer: 3 }));
  }

  // Fronds with detailed leaf blades
  const frondCount = rng.nextInt(6, 9);
  const fh = rng.nextInt(105, 125), fs = rng.nextInt(50, 70), fl = rng.nextInt(30, 42);
  for (let i = 0; i < frondCount; i++) {
    const angle = (i / frondCount) * 360;
    const rad = angle * Math.PI / 180;
    const length = s * rng.nextFloat(0.35, 0.5);
    const endX = topX + Math.cos(rad) * length;
    const endY = topY + Math.sin(rad) * length * 0.6 - s * 0.05;
    const cpX = topX + Math.cos(rad) * length * 0.5;
    const cpY = topY + Math.sin(rad) * length * 0.3 - s * 0.12;
    // Main frond spine
    ch.push(mkPath(topX, topY, `M${topX},${topY} Q${cpX},${cpY} ${endX},${endY}`, 'none', { stroke: hsl(fh, fs, fl), strokeWidth: 1.5, layer: 3 }));
    // Leaf blades along frond
    const bladeCount = 6;
    for (let b = 1; b <= bladeCount; b++) {
      const t = b / (bladeCount + 1);
      const bx = topX + (cpX - topX) * 2 * t * (1 - t) + (endX - topX) * t * t;
      const by = topY + (cpY - topY) * 2 * t * (1 - t) + (endY - topY) * t * t;
      const bladeLen = s * 0.06 * (1 - t * 0.5);
      const perpAngle = rad + Math.PI / 2;
      ch.push(mkLine(bx, by, bx + Math.cos(perpAngle) * bladeLen, by + Math.sin(perpAngle) * bladeLen, hsl(fh, fs, fl + rng.nextInt(-3, 5)), 0.8, { layer: 3, opacity: 0.7 }));
      ch.push(mkLine(bx, by, bx - Math.cos(perpAngle) * bladeLen, by - Math.sin(perpAngle) * bladeLen, hsl(fh, fs, fl + rng.nextInt(-3, 5)), 0.8, { layer: 3, opacity: 0.7 }));
    }
  }

  return mkGroup(x, y, ch, { layer: 2, category: 'tree', modifiable: true, id: cuid('palm') });
}

function detailedCherry(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const ch: SVGElementData[] = [];
  const th = rng.nextInt(10, 20), ts = rng.nextInt(30, 45), tl = rng.nextInt(22, 30);

  // Organic trunk
  ch.push(mkPath(x, y, `M${x - s * 0.06},${y} C${x - s * 0.07},${y - s * 0.15} ${x - s * 0.04},${y - s * 0.3} ${x - s * 0.03},${y - s * 0.4} L${x + s * 0.03},${y - s * 0.4} C${x + s * 0.04},${y - s * 0.3} ${x + s * 0.07},${y - s * 0.15} ${x + s * 0.06},${y} Z`, hsl(th, ts, tl)));

  // Branches
  ch.push(mkPath(x, y, `M${x},${y - s * 0.38} Q${x - s * 0.15},${y - s * 0.5} ${x - s * 0.25},${y - s * 0.48}`, 'none', { stroke: hsl(th, ts, tl + 3), strokeWidth: s * 0.025 }));
  ch.push(mkPath(x, y, `M${x},${y - s * 0.35} Q${x + s * 0.12},${y - s * 0.48} ${x + s * 0.22},${y - s * 0.45}`, 'none', { stroke: hsl(th, ts, tl + 3), strokeWidth: s * 0.02 }));

  // Blossom clouds with soft pink blobs
  const ph = rng.nextInt(335, 350), ps = rng.nextInt(60, 80), pl = rng.nextInt(75, 85);
  const centers = [
    { cx: x, cy: y - s * 0.55, r: s * 0.22 },
    { cx: x - s * 0.2, cy: y - s * 0.45, r: s * 0.16 },
    { cx: x + s * 0.18, cy: y - s * 0.43, r: s * 0.15 },
    { cx: x - s * 0.08, cy: y - s * 0.65, r: s * 0.13 },
    { cx: x + s * 0.1, cy: y - s * 0.62, r: s * 0.12 },
  ];
  for (const c of centers) {
    ch.push(mkPath(c.cx, c.cy,
      `M${c.cx - c.r},${c.cy} C${c.cx - c.r},${c.cy - c.r * 0.9} ${c.cx + c.r},${c.cy - c.r * 0.9} ${c.cx + c.r},${c.cy} C${c.cx + c.r},${c.cy + c.r * 0.7} ${c.cx - c.r},${c.cy + c.r * 0.7} ${c.cx - c.r},${c.cy} Z`,
      hsl(ph, ps, pl + rng.nextInt(-3, 3)), { opacity: rng.nextFloat(0.6, 0.85) }));
  }

  // Falling petals
  for (let i = 0; i < rng.nextInt(5, 10); i++) {
    const px = x + rng.nextFloat(-s * 0.5, s * 0.5);
    const py = y + rng.nextFloat(-s * 0.8, s * 0.1);
    ch.push(mkEllipse(px, py, s * 0.015, s * 0.01, hsl(ph, ps, pl + 5), { layer: 4, opacity: rng.nextFloat(0.3, 0.7), rotation: rng.nextFloat(0, 360) }));
  }

  return mkGroup(x, y, ch, { layer: 2, category: 'tree', modifiable: true, id: cuid('cherry') });
}

function detailedWillow(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const ch: SVGElementData[] = [];
  const th = rng.nextInt(25, 35), ts = rng.nextInt(30, 45), tl = rng.nextInt(22, 30);

  // Trunk
  ch.push(mkPath(x, y, `M${x - s * 0.08},${y} C${x - s * 0.09},${y - s * 0.2} ${x - s * 0.06},${y - s * 0.35} ${x - s * 0.04},${y - s * 0.45} L${x + s * 0.04},${y - s * 0.45} C${x + s * 0.06},${y - s * 0.35} ${x + s * 0.09},${y - s * 0.2} ${x + s * 0.08},${y} Z`, hsl(th, ts, tl)));

  // Upper crown volume
  const gh = rng.nextInt(90, 115), gs = rng.nextInt(35, 55), gl = rng.nextInt(30, 42);
  ch.push(mkEllipse(x, y - s * 0.52, s * 0.2, s * 0.12, hsl(gh, gs, gl), { opacity: 0.5 }));

  // Drooping branches with organic curves
  const branchCount = rng.nextInt(10, 16);
  for (let i = 0; i < branchCount; i++) {
    const startX = x + rng.nextFloat(-s * 0.15, s * 0.15);
    const startY = y - s * rng.nextFloat(0.4, 0.5);
    const endX = startX + rng.nextFloat(-s * 0.25, s * 0.25);
    const endY = y + rng.nextFloat(-s * 0.05, s * 0.15);
    const cp1x = startX + rng.nextFloat(-s * 0.1, s * 0.1);
    const cp1y = startY + (endY - startY) * 0.3;
    const cp2x = endX + rng.nextFloat(-s * 0.05, s * 0.05);
    const cp2y = endY - (endY - startY) * 0.2;
    ch.push(mkPath(x, y, `M${startX},${startY} C${cp1x},${cp1y} ${cp2x},${cp2y} ${endX},${endY}`, 'none', {
      stroke: hsl(gh, gs, gl + rng.nextInt(-5, 5)), strokeWidth: rng.nextFloat(0.5, 1.5), opacity: rng.nextFloat(0.4, 0.7)
    }));
  }

  return mkGroup(x, y, ch, { layer: 2, category: 'tree', modifiable: true, id: cuid('willow') });
}

// ═══════════════════════════════════════════════════════════════
// CLOUDS
// ═══════════════════════════════════════════════════════════════

export function detailedCloud(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const ch: SVGElementData[] = [];
  const s = size;
  const color = rng.pick(['#FFFFFF', '#F8F8FF', '#F0F8FF']);

  // Main cloud body with organic bezier shape
  const w = s * rng.nextFloat(0.8, 1.2);
  const h = s * rng.nextFloat(0.3, 0.5);
  ch.push(mkPath(x, y,
    `M${x - w / 2},${y} C${x - w / 2},${y - h * 0.8} ${x - w * 0.2},${y - h * 1.3} ${x},${y - h} C${x + w * 0.15},${y - h * 1.5} ${x + w * 0.35},${y - h * 1.1} ${x + w * 0.3},${y - h * 0.7} C${x + w * 0.5},${y - h * 0.9} ${x + w / 2},${y - h * 0.4} ${x + w / 2},${y} Z`,
    color, { opacity: 0.9 }));

  // Secondary puff on top
  ch.push(mkPath(x, y,
    `M${x - w * 0.15},${y - h * 0.8} C${x - w * 0.15},${y - h * 1.4} ${x + w * 0.15},${y - h * 1.4} ${x + w * 0.15},${y - h * 0.8}`,
    color, { opacity: 0.85 }));

  // Highlight
  ch.push(mkEllipse(x - w * 0.1, y - h * 0.9, w * 0.15, h * 0.25, '#FFFFFF', { opacity: 0.4 }));

  // Bottom shadow
  ch.push(mkEllipse(x, y + h * 0.05, w * 0.4, h * 0.1, '#D0D8E8', { opacity: 0.3 }));

  return mkGroup(x, y, ch, { layer: 0, category: 'cloud', modifiable: true, id: cuid('cloud'), opacity: rng.nextFloat(0.7, 0.95) });
}

// ═══════════════════════════════════════════════════════════════
// MOUNTAINS
// ═══════════════════════════════════════════════════════════════

export function detailedMountain(x: number, y: number, w: number, h: number, rng: SeededRandom): SVGElementData {
  const ch: SVGElementData[] = [];
  const mh = rng.nextInt(210, 230), ms = rng.nextInt(15, 30), ml = rng.nextInt(35, 50);

  // Main mountain with ridge detail
  const peakX = x + w * rng.nextFloat(0.4, 0.6);
  const ridge1 = x + w * 0.3, ridge1Y = y - h * 0.6;
  const ridge2 = x + w * 0.7, ridge2Y = y - h * 0.55;
  ch.push(mkPath(x, y,
    `M${x},${y} L${ridge1},${ridge1Y} L${peakX},${y - h} L${ridge2},${ridge2Y} L${x + w},${y} Z`,
    hsl(mh, ms, ml)));

  // Shadow face
  ch.push(mkPath(x, y,
    `M${peakX},${y - h} L${ridge2},${ridge2Y} L${x + w},${y} L${peakX + w * 0.05},${y} Z`,
    hsl(mh, ms, ml - 8), { opacity: 0.6 }));

  // Snow cap
  if (h > 80) {
    const snowLine = y - h * 0.7;
    ch.push(mkPath(x, y,
      `M${peakX - w * 0.08},${snowLine} Q${peakX - w * 0.03},${snowLine + h * 0.05} ${peakX},${y - h} Q${peakX + w * 0.03},${snowLine + h * 0.05} ${peakX + w * 0.1},${snowLine} Q${peakX + w * 0.05},${snowLine + h * 0.03} ${peakX - w * 0.08},${snowLine} Z`,
      '#FFFFFF', { opacity: 0.9 }));
  }

  // Atmospheric haze at base
  ch.push(mkRect(x, y - h * 0.15, w, h * 0.15, hsl(mh, 10, 70), { opacity: 0.2 }));

  // Tree line
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    const tx = x + rng.nextFloat(w * 0.1, w * 0.9);
    const tyBase = y - h * rng.nextFloat(0.08, 0.25);
    const ts = h * 0.08;
    ch.push(mkPath(tx, tyBase,
      `M${tx},${tyBase} L${tx - ts * 0.4},${tyBase + ts} L${tx + ts * 0.4},${tyBase + ts} Z`,
      hsl(130, 30, 20), { opacity: 0.5 }));
  }

  return mkGroup(x, y, ch, { layer: 1, category: 'mountain', modifiable: true, id: cuid('mtn'), filter: 'url(#bgBlur)' });
}

// ═══════════════════════════════════════════════════════════════
// FLOWERS
// ═══════════════════════════════════════════════════════════════

export function detailedFlower(x: number, y: number, type: 'daisy' | 'tulip' | 'rose' | 'sunflower', size: number, rng: SeededRandom): SVGElementData {
  const ch: SVGElementData[] = [];
  const s = size;
  const sh = rng.nextInt(105, 125), ss = rng.nextInt(45, 60), sl = rng.nextInt(30, 42);

  // Stem with curve
  const stemCurve = rng.nextFloat(-s * 0.05, s * 0.05);
  ch.push(mkPath(x, y, `M${x},${y} Q${x + stemCurve},${y - s * 0.3} ${x},${y - s * 0.5}`, 'none', { stroke: hsl(sh, ss, sl), strokeWidth: s * 0.035, layer: 3 }));
  // Small leaf on stem
  ch.push(mkPath(x, y, `M${x + stemCurve * 0.5},${y - s * 0.2} Q${x + s * 0.08},${y - s * 0.25} ${x + s * 0.06},${y - s * 0.15}`, hsl(sh, ss, sl + 5), { layer: 3, opacity: 0.7 }));

  const flowerY = y - s * 0.5;
  switch (type) {
    case 'daisy': {
      const petalCount = rng.nextInt(8, 12);
      for (let i = 0; i < petalCount; i++) {
        const angle = (i * 360 / petalCount) * Math.PI / 180;
        const px = x + Math.cos(angle) * s * 0.12;
        const py = flowerY + Math.sin(angle) * s * 0.12;
        const endX = x + Math.cos(angle) * s * 0.2;
        const endY = flowerY + Math.sin(angle) * s * 0.2;
        ch.push(mkPath(x, flowerY, `M${x},${flowerY} Q${px},${py - s * 0.02} ${endX},${endY} Q${px},${py + s * 0.02} ${x},${flowerY} Z`, '#FFFEF0', { layer: 3 }));
      }
      ch.push(mkCircle(x, flowerY, s * 0.06, '#FFD700', { layer: 3 }));
      ch.push(mkCircle(x - s * 0.02, flowerY - s * 0.02, s * 0.02, '#FFF3B0', { layer: 3, opacity: 0.5 }));
      break;
    }
    case 'tulip': {
      const tc = rng.pick(['#FF4444', '#FF69B4', '#FFD700', '#DA70D6', '#FF6347']);
      // 3 overlapping petals
      ch.push(mkPath(x, flowerY, `M${x},${flowerY + s * 0.08} C${x - s * 0.1},${flowerY} ${x - s * 0.1},${flowerY - s * 0.15} ${x},${flowerY - s * 0.2} C${x + s * 0.03},${flowerY - s * 0.12} ${x + s * 0.01},${flowerY} ${x},${flowerY + s * 0.08} Z`, tc, { layer: 3 }));
      ch.push(mkPath(x, flowerY, `M${x},${flowerY + s * 0.08} C${x + s * 0.1},${flowerY} ${x + s * 0.1},${flowerY - s * 0.15} ${x},${flowerY - s * 0.2} C${x - s * 0.03},${flowerY - s * 0.12} ${x - s * 0.01},${flowerY} ${x},${flowerY + s * 0.08} Z`, tc, { layer: 3, opacity: 0.85 }));
      ch.push(mkPath(x, flowerY, `M${x - s * 0.04},${flowerY + s * 0.06} C${x - s * 0.06},${flowerY - s * 0.05} ${x},${flowerY - s * 0.22} ${x + s * 0.04},${flowerY + s * 0.06}`, tc, { layer: 3, opacity: 0.7 }));
      break;
    }
    case 'rose': {
      const rc = rng.pick(['#DC143C', '#FF1493', '#C71585']);
      // Spiral petal layers
      for (let i = 4; i >= 0; i--) {
        const pr = s * (0.04 + i * 0.02);
        const angle = i * 45;
        const px = x + Math.cos(angle * Math.PI / 180) * pr * 0.2;
        const py = flowerY + Math.sin(angle * Math.PI / 180) * pr * 0.2;
        ch.push(mkCircle(px, py, pr, rc, { layer: 3, opacity: 0.7 + i * 0.05 }));
      }
      // Center highlight
      ch.push(mkCircle(x, flowerY, s * 0.025, '#FFB7C5', { layer: 3, opacity: 0.6 }));
      break;
    }
    case 'sunflower': {
      // Seed center
      ch.push(mkCircle(x, flowerY, s * 0.09, '#3D2400', { layer: 3 }));
      ch.push(mkCircle(x, flowerY, s * 0.06, '#5C3D1A', { layer: 3, opacity: 0.8 }));
      // Petals
      for (let i = 0; i < 14; i++) {
        const angle = (i * 360 / 14) * Math.PI / 180;
        const tipX = x + Math.cos(angle) * s * 0.2;
        const tipY = flowerY + Math.sin(angle) * s * 0.2;
        const cpL = angle + 0.15, cpR = angle - 0.15;
        ch.push(mkPath(x, flowerY,
          `M${x + Math.cos(cpL) * s * 0.06},${flowerY + Math.sin(cpL) * s * 0.06} Q${x + Math.cos(angle) * s * 0.15},${flowerY + Math.sin(angle) * s * 0.15} ${tipX},${tipY} Q${x + Math.cos(angle) * s * 0.15},${flowerY + Math.sin(angle) * s * 0.15} ${x + Math.cos(cpR) * s * 0.06},${flowerY + Math.sin(cpR) * s * 0.06} Z`,
          '#FFD700', { layer: 3 }));
      }
      break;
    }
  }

  return mkGroup(x, y, ch, { layer: 3, category: 'flower', modifiable: true, id: cuid('flower') });
}

// ═══════════════════════════════════════════════════════════════
// ROCKS
// ═══════════════════════════════════════════════════════════════

export function detailedRock(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const ch: SVGElementData[] = [];
  const s = size;
  const rh = rng.nextInt(20, 40), rs = rng.nextInt(5, 15), rl = rng.nextInt(35, 50);

  const w = s * rng.nextFloat(0.8, 1.3);
  const h = s * rng.nextFloat(0.5, 0.8);
  // Organic rock shape
  ch.push(mkPath(x, y,
    `M${x - w / 2},${y} C${x - w / 2},${y - h * 0.3} ${x - w * 0.3},${y - h} ${x - w * 0.1},${y - h * 0.9} L${x + w * 0.15},${y - h} C${x + w * 0.35},${y - h * 0.8} ${x + w / 2},${y - h * 0.2} ${x + w / 2},${y} Z`,
    hsl(rh, rs, rl)));

  // Light face
  ch.push(mkPath(x, y,
    `M${x - w * 0.1},${y - h * 0.9} L${x + w * 0.15},${y - h} C${x + w * 0.25},${y - h * 0.85} ${x + w * 0.1},${y - h * 0.5} ${x},${y - h * 0.3}`,
    hsl(rh, rs, rl + 10), { opacity: 0.5 }));

  // Shadow face
  ch.push(mkPath(x, y,
    `M${x + w * 0.15},${y - h} C${x + w * 0.35},${y - h * 0.8} ${x + w / 2},${y - h * 0.2} ${x + w / 2},${y} L${x + w * 0.1},${y} Z`,
    hsl(rh, rs, rl - 10), { opacity: 0.4 }));

  // Texture cracks
  ch.push(mkPath(x, y, `M${x - w * 0.2},${y - h * 0.4} Q${x},${y - h * 0.5} ${x + w * 0.1},${y - h * 0.3}`, 'none', { stroke: hsl(rh, rs, rl - 15), strokeWidth: 0.5, opacity: 0.3 }));

  return mkGroup(x, y, ch, { layer: 2, category: 'rock', modifiable: true, id: cuid('rock') });
}

// ═══════════════════════════════════════════════════════════════
// BIRDS
// ═══════════════════════════════════════════════════════════════

export function detailedBird(x: number, y: number, distant: boolean, rng: SeededRandom): SVGElementData {
  const ch: SVGElementData[] = [];
  const s = distant ? rng.nextFloat(6, 10) : rng.nextFloat(12, 18);

  if (distant) {
    // Simple V-shape silhouette for distant birds
    ch.push(mkPath(x, y, `M${x - s},${y} Q${x - s * 0.3},${y - s * 0.5} ${x},${y - s * 0.2} Q${x + s * 0.3},${y - s * 0.5} ${x + s},${y}`, 'none', { stroke: '#2D3436', strokeWidth: 1.2, layer: 4 }));
  } else {
    // Detailed bird with body, wings, beak
    const bodyColor = rng.pick(['#2D3436', '#5D4037', '#37474F', '#4E342E']);
    // Body
    ch.push(mkEllipse(x, y, s * 0.4, s * 0.25, bodyColor, { layer: 4 }));
    // Head
    ch.push(mkCircle(x + s * 0.35, y - s * 0.1, s * 0.18, bodyColor, { layer: 4 }));
    // Beak
    ch.push(mkPath(x, y, `M${x + s * 0.5},${y - s * 0.1} L${x + s * 0.7},${y - s * 0.05} L${x + s * 0.5},${y}`, '#FF8C00', { layer: 4 }));
    // Wing
    ch.push(mkPath(x, y, `M${x - s * 0.1},${y - s * 0.15} Q${x},${y - s * 0.6} ${x + s * 0.2},${y - s * 0.4} Q${x + s * 0.1},${y - s * 0.2} ${x - s * 0.1},${y - s * 0.15} Z`, lighten(0, 0, 30, 10), { layer: 4, opacity: 0.7 }));
    // Eye
    ch.push(mkCircle(x + s * 0.4, y - s * 0.15, s * 0.04, '#FFFFFF', { layer: 4 }));
  }

  return mkGroup(x, y, ch, { layer: 4, category: 'bird', modifiable: true, id: cuid('bird') });
}

// ═══════════════════════════════════════════════════════════════
// HOUSES & BUILDINGS
// ═══════════════════════════════════════════════════════════════

export function detailedHouse(x: number, y: number, w: number, h: number, rng: SeededRandom): SVGElementData {
  const ch: SVGElementData[] = [];
  const wallH = rng.nextInt(0, 20), wallS = rng.nextInt(15, 35), wallL = rng.nextInt(70, 88);
  const roofH = rng.nextInt(0, 30), roofS = rng.nextInt(40, 65), roofL = rng.nextInt(30, 45);

  // Wall
  ch.push(mkRect(x, y - h * 0.6, w, h * 0.6, hsl(wallH, wallS, wallL), { layer: 2 }));

  // Roof with overhang
  const roofOverhang = w * 0.08;
  ch.push(mkPath(x, y, `M${x - roofOverhang},${y - h * 0.6} L${x + w / 2},${y - h} L${x + w + roofOverhang},${y - h * 0.6} Z`, hsl(roofH, roofS, roofL), { layer: 2 }));
  // Roof shadow
  ch.push(mkPath(x, y, `M${x + w / 2},${y - h} L${x + w + roofOverhang},${y - h * 0.6} L${x + w / 2 + roofOverhang * 0.5},${y - h * 0.6} Z`, hsl(roofH, roofS, roofL - 8), { layer: 2, opacity: 0.5 }));

  // Door
  const doorW = w * 0.2, doorH = h * 0.35;
  const doorX = x + w * 0.5 - doorW / 2;
  ch.push(mkRect(doorX, y - doorH, doorW, doorH, hsl(25, 40, 30), { layer: 2 }));
  // Doorknob
  ch.push(mkCircle(doorX + doorW * 0.8, y - doorH * 0.45, doorW * 0.06, '#C0A870', { layer: 2 }));

  // Windows
  const winW = w * 0.18, winH = h * 0.18;
  for (let i = 0; i < 2; i++) {
    const wx = x + w * (0.15 + i * 0.52);
    const wy = y - h * 0.5;
    ch.push(mkRect(wx, wy, winW, winH, '#B0D4F1', { layer: 2, stroke: hsl(wallH, wallS, wallL - 20), strokeWidth: 1 }));
    // Window cross
    ch.push(mkLine(wx + winW / 2, wy, wx + winW / 2, wy + winH, hsl(wallH, wallS, wallL - 15), 0.8));
    ch.push(mkLine(wx, wy + winH / 2, wx + winW, wy + winH / 2, hsl(wallH, wallS, wallL - 15), 0.8));
    // Curtain hints
    ch.push(mkPath(wx, wy, `M${wx},${wy} Q${wx + winW * 0.15},${wy + winH * 0.3} ${wx},${wy + winH}`, '#F5E6D3', { opacity: 0.4 }));
  }

  // Chimney
  if (rng.chance(0.6)) {
    const chimX = x + w * 0.75, chimW = w * 0.12, chimH = h * 0.2;
    ch.push(mkRect(chimX, y - h - chimH * 0.5, chimW, chimH + h * 0.05, hsl(roofH, roofS - 10, roofL - 5), { layer: 2 }));
  }

  // Shadow
  ch.push(mkEllipse(x + w / 2, y + 2, w * 0.5, 3, 'rgba(0,0,0,0.1)', { layer: 1 }));

  return mkGroup(x, y, ch, { layer: 2, category: 'building', modifiable: true, id: cuid('house') });
}

// ═══════════════════════════════════════════════════════════════
// PEOPLE
// ═══════════════════════════════════════════════════════════════

export function detailedPerson(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const ch: SVGElementData[] = [];
  const skinH = rng.nextInt(15, 35), skinS = rng.nextInt(40, 65), skinL = rng.nextInt(55, 75);
  const shirtH = rng.nextInt(0, 360), shirtS = rng.nextInt(40, 70), shirtL = rng.nextInt(40, 60);
  const pantsH = rng.nextInt(200, 240), pantsS = rng.nextInt(30, 60), pantsL = rng.nextInt(25, 40);

  // Shadow
  ch.push(mkEllipse(x, y, s * 0.15, s * 0.03, 'rgba(0,0,0,0.12)', { layer: 2 }));

  // Legs
  ch.push(mkRect(x - s * 0.06, y - s * 0.3, s * 0.05, s * 0.3, hsl(pantsH, pantsS, pantsL)));
  ch.push(mkRect(x + s * 0.01, y - s * 0.3, s * 0.05, s * 0.3, hsl(pantsH, pantsS, pantsL)));
  // Shoes
  ch.push(mkEllipse(x - s * 0.04, y, s * 0.04, s * 0.02, '#333'));
  ch.push(mkEllipse(x + s * 0.04, y, s * 0.04, s * 0.02, '#333'));

  // Body/torso
  ch.push(mkPath(x, y, `M${x - s * 0.08},${y - s * 0.3} L${x - s * 0.1},${y - s * 0.55} Q${x},${y - s * 0.58} ${x + s * 0.1},${y - s * 0.55} L${x + s * 0.08},${y - s * 0.3} Z`, hsl(shirtH, shirtS, shirtL)));

  // Arms
  ch.push(mkPath(x, y, `M${x - s * 0.1},${y - s * 0.53} Q${x - s * 0.18},${y - s * 0.4} ${x - s * 0.15},${y - s * 0.32}`, 'none', { stroke: hsl(shirtH, shirtS, shirtL), strokeWidth: s * 0.04 }));
  ch.push(mkPath(x, y, `M${x + s * 0.1},${y - s * 0.53} Q${x + s * 0.18},${y - s * 0.4} ${x + s * 0.15},${y - s * 0.32}`, 'none', { stroke: hsl(shirtH, shirtS, shirtL), strokeWidth: s * 0.04 }));
  // Hands
  ch.push(mkCircle(x - s * 0.15, y - s * 0.32, s * 0.02, hsl(skinH, skinS, skinL)));
  ch.push(mkCircle(x + s * 0.15, y - s * 0.32, s * 0.02, hsl(skinH, skinS, skinL)));

  // Head
  ch.push(mkCircle(x, y - s * 0.65, s * 0.08, hsl(skinH, skinS, skinL)));
  // Hair
  const hairColor = rng.pick(['#2C1810', '#4A3728', '#8B6508', '#1A1A1A', '#6B3A2A']);
  ch.push(mkPath(x, y, `M${x - s * 0.08},${y - s * 0.67} Q${x - s * 0.09},${y - s * 0.78} ${x},${y - s * 0.78} Q${x + s * 0.09},${y - s * 0.78} ${x + s * 0.08},${y - s * 0.67}`, hairColor));

  return mkGroup(x, y, ch, { layer: 3, category: 'person', modifiable: true, id: cuid('person') });
}

// ═══════════════════════════════════════════════════════════════
// FISH & MARINE
// ═══════════════════════════════════════════════════════════════

export function detailedFish(x: number, y: number, s: number, rng: SeededRandom, dir = 1): SVGElementData {
  const ch: SVGElementData[] = [];
  const fh = rng.nextInt(0, 360), fs = rng.nextInt(55, 80), fl = rng.nextInt(45, 65);

  // Body with organic shape
  const bw = s * 0.5, bh = s * 0.25;
  ch.push(mkPath(x, y,
    `M${x - bw * dir},${y} C${x - bw * 0.7 * dir},${y - bh} ${x + bw * 0.3 * dir},${y - bh * 0.8} ${x + bw * dir},${y} C${x + bw * 0.3 * dir},${y + bh * 0.8} ${x - bw * 0.7 * dir},${y + bh} ${x - bw * dir},${y} Z`,
    hsl(fh, fs, fl)));

  // Belly (lighter)
  ch.push(mkPath(x, y,
    `M${x - bw * 0.6 * dir},${y + bh * 0.1} C${x},${y + bh * 0.6} ${x + bw * 0.4 * dir},${y + bh * 0.4} ${x + bw * 0.8 * dir},${y}`,
    hsl(fh, fs - 10, fl + 15), { opacity: 0.5 }));

  // Tail fin
  ch.push(mkPath(x, y,
    `M${x - bw * dir},${y} L${x - bw * 1.3 * dir},${y - bh * 0.6} Q${x - bw * 1.1 * dir},${y} ${x - bw * 1.3 * dir},${y + bh * 0.6} Z`,
    hsl(fh, fs, fl - 5)));

  // Dorsal fin
  ch.push(mkPath(x, y,
    `M${x - bw * 0.1 * dir},${y - bh * 0.7} Q${x + bw * 0.1 * dir},${y - bh * 1.2} ${x + bw * 0.3 * dir},${y - bh * 0.7}`,
    hsl(fh, fs, fl - 8), { opacity: 0.7 }));

  // Eye
  const eyeX = x + bw * 0.5 * dir;
  ch.push(mkCircle(eyeX, y - bh * 0.15, s * 0.04, '#FFFFFF'));
  ch.push(mkCircle(eyeX + s * 0.01 * dir, y - bh * 0.15, s * 0.02, '#1A1A1A'));

  // Scales hint
  for (let i = 0; i < 3; i++) {
    const sx = x + (bw * 0.1 + i * bw * 0.2) * dir;
    ch.push(mkPath(sx, y,
      `M${sx},${y - bh * 0.3} Q${sx + bw * 0.08 * dir},${y} ${sx},${y + bh * 0.3}`,
      'none', { stroke: hsl(fh, fs, fl + 10), strokeWidth: 0.4, opacity: 0.3 }));
  }

  return mkGroup(x, y, ch, { layer: 3, category: 'fish', modifiable: true, id: cuid('fish') });
}

export function detailedCoral(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const ch: SVGElementData[] = [];
  const ch1 = rng.nextInt(0, 40), cs = rng.nextInt(60, 85), cl = rng.nextInt(45, 65);
  const branchCount = rng.nextInt(3, 6);

  for (let i = 0; i < branchCount; i++) {
    const bx = x + rng.nextFloat(-s * 0.3, s * 0.3);
    const bh = s * rng.nextFloat(0.4, 0.8);
    const lean = rng.nextFloat(-s * 0.15, s * 0.15);
    const w = s * rng.nextFloat(0.05, 0.1);
    ch.push(mkPath(bx, y,
      `M${bx - w},${y} C${bx - w + lean * 0.3},${y - bh * 0.3} ${bx + lean * 0.7 - w * 0.5},${y - bh * 0.7} ${bx + lean},${y - bh} C${bx + lean + w},${y - bh * 0.9} ${bx + lean * 0.7 + w * 0.5},${y - bh * 0.3} ${bx + w},${y} Z`,
      hsl(ch1 + rng.nextInt(-10, 10), cs, cl + rng.nextInt(-5, 5))));
    // Tip bump
    ch.push(mkCircle(bx + lean, y - bh, w * 1.2, hsl(ch1, cs, cl + 10), { opacity: 0.7 }));
  }

  return mkGroup(x, y, ch, { layer: 2, category: 'coral', modifiable: true, id: cuid('coral') });
}

export function detailedSeaweed(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const ch: SVGElementData[] = [];
  const gh = rng.nextInt(100, 140), gs = rng.nextInt(45, 65), gl = rng.nextInt(25, 40);
  const strandCount = rng.nextInt(2, 5);

  for (let i = 0; i < strandCount; i++) {
    const sx = x + rng.nextFloat(-s * 0.1, s * 0.1);
    const h = s * rng.nextFloat(0.5, 1);
    const sway = rng.nextFloat(-s * 0.15, s * 0.15);
    ch.push(mkPath(sx, y,
      `M${sx},${y} C${sx + sway * 0.3},${y - h * 0.3} ${sx + sway * 0.7},${y - h * 0.5} ${sx + sway},${y - h} C${sx + sway + s * 0.03},${y - h * 0.85} ${sx + sway * 0.5 + s * 0.03},${y - h * 0.4} ${sx + s * 0.03},${y}`,
      hsl(gh, gs, gl + rng.nextInt(-3, 3)), { opacity: rng.nextFloat(0.6, 0.85) }));
  }

  return mkGroup(x, y, ch, { layer: 2, category: 'seaweed', modifiable: true, id: cuid('weed') });
}

// ═══════════════════════════════════════════════════════════════
// FURNITURE (indoor scenes)
// ═══════════════════════════════════════════════════════════════

export function detailedLamp(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const ch: SVGElementData[] = [];
  const shadeH = rng.nextInt(20, 50), shadeS = rng.nextInt(30, 60), shadeL = rng.nextInt(55, 75);

  // Pole
  ch.push(mkRect(x - s * 0.015, y - s * 0.7, s * 0.03, s * 0.5, '#888', { layer: 3 }));

  // Base
  ch.push(mkEllipse(x, y - s * 0.2, s * 0.08, s * 0.02, '#777', { layer: 3 }));
  ch.push(mkRect(x - s * 0.06, y - s * 0.22, s * 0.12, s * 0.02, '#888', { layer: 3 }));

  // Shade
  ch.push(mkPath(x, y, `M${x - s * 0.12},${y - s * 0.6} L${x - s * 0.08},${y - s * 0.8} L${x + s * 0.08},${y - s * 0.8} L${x + s * 0.12},${y - s * 0.6} Z`, hsl(shadeH, shadeS, shadeL), { layer: 3 }));

  // Glow
  ch.push(mkEllipse(x, y - s * 0.55, s * 0.2, s * 0.15, `hsl(${shadeH}, 80%, 90%)`, { layer: 3, opacity: 0.2 }));

  return mkGroup(x, y, ch, { layer: 3, category: 'lamp', modifiable: true, id: cuid('lamp') });
}

export function detailedBookshelf(x: number, y: number, w: number, h: number, rng: SeededRandom): SVGElementData {
  const ch: SVGElementData[] = [];
  const woodH = rng.nextInt(20, 35), woodS = rng.nextInt(35, 50), woodL = rng.nextInt(30, 42);

  // Frame
  ch.push(mkRect(x, y, w, h, hsl(woodH, woodS, woodL)));
  ch.push(mkRect(x + 2, y + 2, w - 4, h - 4, hsl(woodH, woodS, woodL + 8)));

  // Shelves
  const shelfCount = 3;
  const shelfH = h / (shelfCount + 1);
  for (let i = 1; i <= shelfCount; i++) {
    const sy = y + i * shelfH;
    ch.push(mkRect(x, sy - 2, w, 4, hsl(woodH, woodS, woodL)));
  }

  // Books on each shelf
  const bookColors = ['#B22222', '#1E90FF', '#228B22', '#FFD700', '#8B4513', '#9370DB', '#FF6347', '#20B2AA'];
  for (let shelf = 0; shelf < shelfCount; shelf++) {
    const sy = y + shelf * shelfH + 4;
    let bx = x + 4;
    const maxBx = x + w - 6;
    while (bx < maxBx) {
      const bw = rng.nextFloat(6, 14);
      const bh = shelfH - 8 + rng.nextFloat(-4, 0);
      if (bx + bw > maxBx) break;
      const color = rng.pick(bookColors);
      ch.push(mkRect(bx, sy + (shelfH - 8 - bh), bw, bh, color, { layer: 3 }));
      // Spine line
      ch.push(mkLine(bx + bw * 0.3, sy + (shelfH - 8 - bh) + 3, bx + bw * 0.3, sy + shelfH - 10, '#00000020', 0.5));
      bx += bw + rng.nextFloat(1, 3);
    }
  }

  return mkGroup(x, y, ch, { layer: 2, category: 'bookshelf', modifiable: true, id: cuid('shelf') });
}

export function detailedTable(x: number, y: number, w: number, h: number, rng: SeededRandom): SVGElementData {
  const ch: SVGElementData[] = [];
  const woodH = rng.nextInt(20, 35), woodS = rng.nextInt(35, 55), woodL = rng.nextInt(35, 50);

  // Table top with perspective
  const topThick = h * 0.08;
  ch.push(mkPath(x, y, `M${x},${y} L${x + w * 0.1},${y - h * 0.15} L${x + w * 1.1},${y - h * 0.15} L${x + w},${y} Z`, hsl(woodH, woodS, woodL + 5)));
  ch.push(mkRect(x, y, w, topThick, hsl(woodH, woodS, woodL)));

  // Legs
  const legW = w * 0.04;
  ch.push(mkRect(x + w * 0.05, y + topThick, legW, h - topThick, hsl(woodH, woodS, woodL - 5)));
  ch.push(mkRect(x + w * 0.88, y + topThick, legW, h - topThick, hsl(woodH, woodS, woodL - 5)));

  // Shadow under table
  ch.push(mkEllipse(x + w / 2, y + h + 2, w * 0.4, 3, 'rgba(0,0,0,0.08)', { layer: 1 }));

  return mkGroup(x, y, ch, { layer: 2, category: 'table', modifiable: true, id: cuid('table') });
}

// ═══════════════════════════════════════════════════════════════
// NATURE DETAILS
// ═══════════════════════════════════════════════════════════════

export function detailedButterfly(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const ch: SVGElementData[] = [];
  const bh = rng.nextInt(0, 360), bs = rng.nextInt(60, 85), bl = rng.nextInt(50, 70);

  // Body
  ch.push(mkEllipse(x, y, s * 0.04, s * 0.15, '#333'));
  // Wings
  ch.push(mkPath(x, y, `M${x},${y - s * 0.05} C${x - s * 0.25},${y - s * 0.3} ${x - s * 0.35},${y - s * 0.1} ${x - s * 0.15},${y + s * 0.05} Q${x - s * 0.05},${y + s * 0.02} ${x},${y} Z`, hsl(bh, bs, bl), { opacity: 0.8 }));
  ch.push(mkPath(x, y, `M${x},${y - s * 0.05} C${x + s * 0.25},${y - s * 0.3} ${x + s * 0.35},${y - s * 0.1} ${x + s * 0.15},${y + s * 0.05} Q${x + s * 0.05},${y + s * 0.02} ${x},${y} Z`, hsl(bh, bs, bl), { opacity: 0.8 }));
  // Wing spots
  ch.push(mkCircle(x - s * 0.15, y - s * 0.1, s * 0.04, hsl(bh + 30, bs, bl + 15), { opacity: 0.6 }));
  ch.push(mkCircle(x + s * 0.15, y - s * 0.1, s * 0.04, hsl(bh + 30, bs, bl + 15), { opacity: 0.6 }));

  return mkGroup(x, y, ch, { layer: 4, category: 'butterfly', modifiable: true, id: cuid('bfly') });
}

export function detailedMushroom(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const ch: SVGElementData[] = [];
  const capH = rng.nextInt(0, 20), capS = rng.nextInt(60, 80), capL = rng.nextInt(40, 55);

  // Stem
  ch.push(mkPath(x, y, `M${x - s * 0.06},${y} C${x - s * 0.07},${y - s * 0.2} ${x - s * 0.05},${y - s * 0.35} ${x - s * 0.04},${y - s * 0.4} L${x + s * 0.04},${y - s * 0.4} C${x + s * 0.05},${y - s * 0.35} ${x + s * 0.07},${y - s * 0.2} ${x + s * 0.06},${y} Z`, '#F5F0E0'));

  // Cap
  ch.push(mkPath(x, y, `M${x - s * 0.2},${y - s * 0.38} C${x - s * 0.2},${y - s * 0.65} ${x + s * 0.2},${y - s * 0.65} ${x + s * 0.2},${y - s * 0.38} Z`, hsl(capH, capS, capL)));

  // Spots
  const spotCount = rng.nextInt(2, 5);
  for (let i = 0; i < spotCount; i++) {
    ch.push(mkCircle(
      x + rng.nextFloat(-s * 0.12, s * 0.12),
      y - s * rng.nextFloat(0.42, 0.55),
      s * rng.nextFloat(0.02, 0.04),
      '#FFFEF0', { opacity: 0.8 }));
  }

  return mkGroup(x, y, ch, { layer: 3, category: 'mushroom', modifiable: true, id: cuid('mush') });
}

export function detailedStar(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const points = 5;
  const outerR = s, innerR = s * 0.4;
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    d += (i === 0 ? 'M' : 'L') + `${px},${py} `;
  }
  d += 'Z';
  return mkPath(x, y, d, '#FFD700', { layer: 4, category: 'star', modifiable: true, id: cuid('star'), opacity: rng.nextFloat(0.6, 1) });
}

export function detailedBench(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const ch: SVGElementData[] = [];
  const woodColor = hsl(rng.nextInt(20, 30), rng.nextInt(35, 50), rng.nextInt(32, 42));

  // Seat planks
  for (let i = 0; i < 3; i++) {
    ch.push(mkRect(x, y - s * 0.35 + i * s * 0.04, s * 0.6, s * 0.035, woodColor, { layer: 2 }));
  }
  // Back rest
  for (let i = 0; i < 2; i++) {
    ch.push(mkRect(x + s * 0.02, y - s * 0.6 + i * s * 0.05, s * 0.56, s * 0.04, woodColor, { layer: 2 }));
  }
  // Legs
  ch.push(mkRect(x + s * 0.05, y - s * 0.35, s * 0.035, s * 0.35, '#555', { layer: 2 }));
  ch.push(mkRect(x + s * 0.52, y - s * 0.35, s * 0.035, s * 0.35, '#555', { layer: 2 }));
  // Armrests
  ch.push(mkRect(x, y - s * 0.45, s * 0.06, s * 0.04, '#666'));
  ch.push(mkRect(x + s * 0.54, y - s * 0.45, s * 0.06, s * 0.04, '#666'));

  return mkGroup(x, y, ch, { layer: 2, category: 'bench', modifiable: true, id: cuid('bench') });
}

export function detailedFence(x: number, y: number, length: number, s: number, rng: SeededRandom): SVGElementData {
  const ch: SVGElementData[] = [];
  const color = hsl(rng.nextInt(20, 35), rng.nextInt(25, 40), rng.nextInt(45, 60));
  const postCount = Math.floor(length / (s * 0.25)) + 1;
  const gap = length / (postCount - 1);

  // Rails
  ch.push(mkRect(x, y - s * 0.3, length, s * 0.03, color, { layer: 2 }));
  ch.push(mkRect(x, y - s * 0.15, length, s * 0.03, color, { layer: 2 }));

  // Posts with pointed tops
  for (let i = 0; i < postCount; i++) {
    const px = x + i * gap;
    ch.push(mkRect(px - s * 0.02, y - s * 0.35, s * 0.04, s * 0.4, color, { layer: 2 }));
    // Pointed top
    ch.push(mkPath(px, y, `M${px - s * 0.025},${y - s * 0.35} L${px},${y - s * 0.42} L${px + s * 0.025},${y - s * 0.35} Z`, color));
  }

  return mkGroup(x, y, ch, { layer: 2, category: 'fence', modifiable: true, id: cuid('fence') });
}
