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
  const th = rng.nextInt(25, 35), ts = rng.nextInt(30, 45), tl = rng.nextInt(18, 26);
  const tw = s * 0.08;

  // Ground shadow
  ch.push(mkEllipse(x, y + s * 0.02, s * 0.25, s * 0.04, 'rgba(0,0,0,0.12)', { layer: 1 }));

  // Trunk - tapered with organic shape
  ch.push(mkPath(x, y,
    `M${x - tw},${y} ` +
    `C${x - tw * 0.95},${y - s * 0.1} ${x - tw * 0.85},${y - s * 0.2} ${x - tw * 0.6},${y - s * 0.35} ` +
    `L${x + tw * 0.6},${y - s * 0.35} ` +
    `C${x + tw * 0.85},${y - s * 0.2} ${x + tw * 0.95},${y - s * 0.1} ${x + tw},${y} Z`,
    hsl(th, ts, tl)));

  // Bark texture
  for (let i = 0; i < 5; i++) {
    const by = y - s * (0.04 + i * 0.06);
    const bw = tw * (1 - i * 0.08);
    ch.push(mkLine(x - bw * 0.5, by, x + bw * 0.3, by + rng.nextFloat(-1, 1),
      darken(th, ts, tl, 6), rng.nextFloat(0.3, 0.6), { opacity: rng.nextFloat(0.2, 0.4) }));
  }

  // Trunk highlight
  ch.push(mkPath(x, y,
    `M${x - tw * 0.7},${y - s * 0.05} C${x - tw * 0.6},${y - s * 0.15} ${x - tw * 0.45},${y - s * 0.25} ${x - tw * 0.35},${y - s * 0.33}`,
    'none', { stroke: lighten(th, ts, tl, 10), strokeWidth: tw * 0.25, opacity: 0.2 }));

  // Foliage tiers (5 tiers for more fullness)
  const gh = rng.nextInt(110, 145), gs = rng.nextInt(48, 68), gl = rng.nextInt(22, 36);
  const tierCount = 5;
  for (let i = 0; i < tierCount; i++) {
    const tierW = s * (0.58 - i * 0.09);
    const tierY = y - s * 0.18 - i * s * 0.17;
    const tierH = s * 0.22;
    const jx = rng.nextFloat(-s * 0.015, s * 0.015);
    const leafGreen = hsl(gh + rng.nextInt(-4, 4), gs, gl - i * 1.5);
    const darkGreen = darken(gh, gs, gl - i * 1.5, 8);

    // Back shadow sub-tier
    ch.push(mkPath(x, tierY,
      `M${x + jx},${tierY - tierH * 0.95} ` +
      `C${x - tierW * 0.2},${tierY - tierH * 0.5} ${x - tierW * 0.55},${tierY + tierH * 0.08} ${x - tierW * 0.48},${tierY + tierH * 0.18} ` +
      `L${x + tierW * 0.48},${tierY + tierH * 0.18} ` +
      `C${x + tierW * 0.55},${tierY + tierH * 0.08} ${x + tierW * 0.2},${tierY - tierH * 0.5} ${x + jx},${tierY - tierH * 0.95} Z`,
      darkGreen, { opacity: 0.5 }));

    // Main tier shape with drooping branch curves
    const leftDroop = rng.nextFloat(0.05, 0.12);
    const rightDroop = rng.nextFloat(0.05, 0.12);
    ch.push(mkPath(x, tierY,
      `M${x + jx},${tierY - tierH} ` +
      `C${x - tierW * 0.15},${tierY - tierH * 0.55} ${x - tierW * 0.45},${tierY - tierH * 0.1} ${x - tierW * 0.5},${tierY + tierH * leftDroop} ` +
      `Q${x - tierW * 0.35},${tierY + tierH * 0.2} ${x - tierW * 0.2},${tierY + tierH * 0.15} ` +
      `L${x + tierW * 0.2},${tierY + tierH * 0.15} ` +
      `Q${x + tierW * 0.35},${tierY + tierH * 0.2} ${x + tierW * 0.5},${tierY + tierH * rightDroop} ` +
      `C${x + tierW * 0.45},${tierY - tierH * 0.1} ${x + tierW * 0.15},${tierY - tierH * 0.55} ${x + jx},${tierY - tierH} Z`,
      leafGreen));

    // Highlight on left edge of each tier
    ch.push(mkPath(x, tierY,
      `M${x + jx - tierW * 0.03},${tierY - tierH * 0.85} ` +
      `C${x - tierW * 0.15},${tierY - tierH * 0.4} ${x - tierW * 0.35},${tierY} ${x - tierW * 0.42},${tierY + tierH * 0.08}`,
      'none', { stroke: lighten(gh, gs, gl, 14), strokeWidth: 1.2, opacity: 0.25 }));

    // Small branch edge bumps
    for (let b = 0; b < 3; b++) {
      const side = b % 2 === 0 ? -1 : 1;
      const bx = x + side * tierW * rng.nextFloat(0.2, 0.45);
      const by2 = tierY + tierH * rng.nextFloat(-0.1, 0.12);
      const br = tierH * rng.nextFloat(0.08, 0.14);
      ch.push(mkPath(bx, by2,
        `M${bx - br * side},${by2 + br * 0.2} C${bx - br * 0.5 * side},${by2 - br} ${bx + br * 0.5 * side},${by2 - br * 0.8} ${bx + br * side * 0.3},${by2 + br * 0.3}`,
        hsl(gh + rng.nextInt(-3, 3), gs, gl + rng.nextInt(-2, 4)),
        { opacity: rng.nextFloat(0.4, 0.7) }));
    }
  }

  // Snow on top (optional)
  if (rng.chance(0.25)) {
    ch.push(mkPath(x, y,
      `M${x - s * 0.06},${y - s * 0.98} Q${x},${y - s * 1.05} ${x + s * 0.06},${y - s * 0.98} Q${x + s * 0.03},${y - s * 0.96} ${x - s * 0.06},${y - s * 0.98} Z`,
      '#FFFFFF', { opacity: 0.85 }));
  }

  return mkGroup(x, y, ch, { layer: 2, category: 'tree', modifiable: true, id: cuid('pine') });
}

function detailedOak(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const ch: SVGElementData[] = [];
  const th = rng.nextInt(22, 32), ts = rng.nextInt(35, 50), tl = rng.nextInt(20, 28);

  // Ground shadow
  ch.push(mkEllipse(x, y + s * 0.02, s * 0.38, s * 0.06, 'rgba(0,0,0,0.15)', { layer: 1 }));

  // Trunk - wide base tapering to crown
  const tw = s * 0.12;
  ch.push(mkPath(x, y,
    `M${x - tw},${y} ` +
    `C${x - tw * 1.05},${y - s * 0.08} ${x - tw * 0.95},${y - s * 0.18} ${x - tw * 0.8},${y - s * 0.26} ` +
    `C${x - tw * 0.65},${y - s * 0.32} ${x - tw * 0.5},${y - s * 0.36} ${x - tw * 0.35},${y - s * 0.4} ` +
    `L${x + tw * 0.35},${y - s * 0.4} ` +
    `C${x + tw * 0.5},${y - s * 0.36} ${x + tw * 0.65},${y - s * 0.32} ${x + tw * 0.8},${y - s * 0.26} ` +
    `C${x + tw * 0.95},${y - s * 0.18} ${x + tw * 1.05},${y - s * 0.08} ${x + tw},${y} Z`,
    hsl(th, ts, tl)));

  // Trunk left highlight
  ch.push(mkPath(x, y,
    `M${x - tw * 0.85},${y - s * 0.05} C${x - tw * 0.75},${y - s * 0.18} ${x - tw * 0.55},${y - s * 0.3} ${x - tw * 0.3},${y - s * 0.38}`,
    'none', { stroke: lighten(th, ts, tl, 12), strokeWidth: tw * 0.25, opacity: 0.25 }));

  // Bark texture lines
  for (let i = 0; i < 6; i++) {
    const by = y - s * (0.04 + i * 0.06);
    const bx1 = x - tw * rng.nextFloat(0.3, 0.7);
    const bx2 = x + tw * rng.nextFloat(0.1, 0.5);
    ch.push(mkPath(x, by,
      `M${bx1},${by} Q${x + rng.nextFloat(-tw * 0.2, tw * 0.2)},${by + rng.nextFloat(-1.5, 1.5)} ${bx2},${by + rng.nextFloat(-1, 1)}`,
      'none', { stroke: darken(th, ts, tl, 8), strokeWidth: rng.nextFloat(0.4, 0.8), opacity: rng.nextFloat(0.2, 0.4) }));
  }

  // Visible branches
  ch.push(mkPath(x, y,
    `M${x - tw * 0.3},${y - s * 0.38} C${x - s * 0.15},${y - s * 0.46} ${x - s * 0.22},${y - s * 0.52} ${x - s * 0.26},${y - s * 0.56}`,
    'none', { stroke: hsl(th, ts, tl + 3), strokeWidth: tw * 0.4 }));
  ch.push(mkPath(x, y,
    `M${x + tw * 0.3},${y - s * 0.38} C${x + s * 0.12},${y - s * 0.45} ${x + s * 0.19},${y - s * 0.52} ${x + s * 0.22},${y - s * 0.57}`,
    'none', { stroke: hsl(th, ts, tl + 3), strokeWidth: tw * 0.35 }));
  ch.push(mkPath(x, y,
    `M${x},${y - s * 0.4} C${x + s * 0.02},${y - s * 0.5} ${x - s * 0.01},${y - s * 0.58} ${x},${y - s * 0.65}`,
    'none', { stroke: hsl(th, ts, tl + 2), strokeWidth: tw * 0.28 }));

  // === FOLIAGE ===
  const gh = rng.nextInt(95, 135), gs = rng.nextInt(42, 62), gl = rng.nextInt(28, 40);
  const ccx = x, ccy = y - s * 0.6;
  const cr = s * 0.38;

  // Back shadow mass (dark, establishing silhouette)
  ch.push(mkPath(ccx, ccy,
    `M${ccx - cr * 0.95},${ccy + cr * 0.42} ` +
    `C${ccx - cr * 1.1},${ccy - cr * 0.15} ${ccx - cr * 0.65},${ccy - cr * 0.95} ${ccx - cr * 0.15},${ccy - cr * 0.92} ` +
    `C${ccx + cr * 0.15},${ccy - cr * 1.05} ${ccx + cr * 0.65},${ccy - cr * 0.9} ${ccx + cr * 0.9},${ccy - cr * 0.45} ` +
    `C${ccx + cr * 1.08},${ccy - cr * 0.05} ${ccx + cr * 0.95},${ccy + cr * 0.35} ${ccx + cr * 0.65},${ccy + cr * 0.5} ` +
    `C${ccx + cr * 0.25},${ccy + cr * 0.6} ${ccx - cr * 0.5},${ccy + cr * 0.55} ${ccx - cr * 0.95},${ccy + cr * 0.42} Z`,
    darken(gh, gs, gl, 10)));

  // Mid-tone leaf clusters (bumpy blobs creating organic canopy edge)
  const clusterCount = rng.nextInt(8, 11);
  for (let i = 0; i < clusterCount; i++) {
    const angle = (i / clusterCount) * Math.PI * 2 + rng.nextFloat(-0.3, 0.3);
    const dist = cr * rng.nextFloat(0.35, 0.7);
    const cx = ccx + Math.cos(angle) * dist;
    const cy = ccy + Math.sin(angle) * dist * 0.8;
    const r2 = cr * rng.nextFloat(0.22, 0.38);
    const j1 = rng.nextFloat(-r2 * 0.15, r2 * 0.15);
    const j2 = rng.nextFloat(-r2 * 0.15, r2 * 0.15);
    ch.push(mkPath(cx, cy,
      `M${cx - r2},${cy + r2 * 0.15} ` +
      `C${cx - r2},${cy - r2 * 0.65 + j1} ${cx - r2 * 0.25 + j2},${cy - r2 * 1.05} ${cx + j1 * 0.5},${cy - r2 * 0.95} ` +
      `C${cx + r2 * 0.3 - j2},${cy - r2 * 1.1} ${cx + r2},${cy - r2 * 0.55 + j1} ${cx + r2},${cy + r2 * 0.15} ` +
      `C${cx + r2},${cy + r2 * 0.55} ${cx - r2},${cy + r2 * 0.55} ${cx - r2},${cy + r2 * 0.15} Z`,
      hsl(gh + rng.nextInt(-6, 6), gs + rng.nextInt(-4, 4), gl + rng.nextInt(-3, 3)),
      { opacity: rng.nextFloat(0.78, 0.95) }));
  }

  // Highlight clusters (sunlit top-left)
  for (let i = 0; i < 5; i++) {
    const angle = rng.nextFloat(-2.8, -0.3);
    const dist = cr * rng.nextFloat(0.25, 0.55);
    const cx = ccx + Math.cos(angle) * dist;
    const cy = ccy + Math.sin(angle) * dist * 0.8;
    const r2 = cr * rng.nextFloat(0.12, 0.22);
    ch.push(mkPath(cx, cy,
      `M${cx - r2},${cy} C${cx - r2},${cy - r2 * 0.85} ${cx + r2},${cy - r2 * 0.85} ${cx + r2},${cy} C${cx + r2},${cy + r2 * 0.6} ${cx - r2},${cy + r2 * 0.6} ${cx - r2},${cy} Z`,
      lighten(gh, gs, gl, 14),
      { opacity: rng.nextFloat(0.25, 0.45) }));
  }

  // Light dapple spots
  for (let i = 0; i < 6; i++) {
    const sx = ccx + rng.nextFloat(-cr * 0.55, cr * 0.25);
    const sy = ccy + rng.nextFloat(-cr * 0.6, cr * 0.15);
    ch.push(mkCircle(sx, sy, cr * rng.nextFloat(0.04, 0.09), lighten(gh, gs, gl, 20), { opacity: rng.nextFloat(0.12, 0.28) }));
  }

  // Canopy bottom shadow edge
  ch.push(mkEllipse(ccx + cr * 0.05, ccy + cr * 0.48, cr * 0.65, cr * 0.1, darken(gh, gs, gl, 14), { opacity: 0.2 }));

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
  const trunkColor = hsl(th, ts, tl);

  // Ground shadow
  ch.push(mkEllipse(x, y + s * 0.02, s * 0.32, s * 0.05, 'rgba(0,0,0,0.12)', { layer: 1 }));

  // Trunk - elegant tapered shape
  ch.push(mkPath(x, y,
    `M${x - s * 0.065},${y} ` +
    `C${x - s * 0.07},${y - s * 0.12} ${x - s * 0.055},${y - s * 0.25} ${x - s * 0.035},${y - s * 0.38} ` +
    `L${x + s * 0.035},${y - s * 0.38} ` +
    `C${x + s * 0.055},${y - s * 0.25} ${x + s * 0.07},${y - s * 0.12} ${x + s * 0.065},${y} Z`,
    trunkColor));
  // Trunk highlight
  ch.push(mkPath(x, y,
    `M${x - s * 0.05},${y - s * 0.05} C${x - s * 0.04},${y - s * 0.18} ${x - s * 0.035},${y - s * 0.3} ${x - s * 0.025},${y - s * 0.36}`,
    'none', { stroke: lighten(th, ts, tl, 12), strokeWidth: s * 0.015, opacity: 0.25 }));

  // Bark texture
  for (let i = 0; i < 4; i++) {
    const by = y - s * (0.06 + i * 0.08);
    ch.push(mkLine(x - s * 0.04, by, x + s * 0.02, by + rng.nextFloat(-0.5, 0.5),
      darken(th, ts, tl, 8), 0.4, { opacity: 0.25 }));
  }

  // Branches - graceful curves
  ch.push(mkPath(x, y,
    `M${x - s * 0.01},${y - s * 0.36} Q${x - s * 0.12},${y - s * 0.48} ${x - s * 0.26},${y - s * 0.46}`,
    'none', { stroke: trunkColor, strokeWidth: s * 0.022 }));
  ch.push(mkPath(x, y,
    `M${x + s * 0.01},${y - s * 0.34} Q${x + s * 0.1},${y - s * 0.46} ${x + s * 0.23},${y - s * 0.44}`,
    'none', { stroke: trunkColor, strokeWidth: s * 0.018 }));
  ch.push(mkPath(x, y,
    `M${x},${y - s * 0.38} Q${x - s * 0.05},${y - s * 0.55} ${x - s * 0.12},${y - s * 0.6}`,
    'none', { stroke: trunkColor, strokeWidth: s * 0.015 }));
  ch.push(mkPath(x, y,
    `M${x},${y - s * 0.38} Q${x + s * 0.06},${y - s * 0.52} ${x + s * 0.14},${y - s * 0.58}`,
    'none', { stroke: trunkColor, strokeWidth: s * 0.013 }));

  // === BLOSSOM CANOPY ===
  const ph = rng.nextInt(335, 352), ps = rng.nextInt(60, 82), pl = rng.nextInt(76, 86);
  const pinkBase = hsl(ph, ps, pl);
  const pinkDark = darken(ph, ps, pl, 12);

  // Back shadow blossom mass
  const centers = [
    { cx: x - s * 0.02, cy: y - s * 0.53, r: s * 0.24 },
    { cx: x - s * 0.22, cy: y - s * 0.44, r: s * 0.17 },
    { cx: x + s * 0.2,  cy: y - s * 0.42, r: s * 0.16 },
    { cx: x - s * 0.1,  cy: y - s * 0.64, r: s * 0.14 },
    { cx: x + s * 0.12, cy: y - s * 0.61, r: s * 0.13 },
  ];
  for (const c of centers) {
    ch.push(mkPath(c.cx, c.cy,
      `M${c.cx - c.r},${c.cy} C${c.cx - c.r},${c.cy - c.r * 0.9} ${c.cx + c.r},${c.cy - c.r * 0.9} ${c.cx + c.r},${c.cy} ` +
      `C${c.cx + c.r},${c.cy + c.r * 0.7} ${c.cx - c.r},${c.cy + c.r * 0.7} ${c.cx - c.r},${c.cy} Z`,
      pinkDark, { opacity: rng.nextFloat(0.35, 0.55) }));
  }

  // Bright blossom clusters (layered organic blobs)
  for (let i = 0; i < 8; i++) {
    const base = centers[rng.nextInt(0, centers.length - 1)];
    const cx = base.cx + rng.nextFloat(-base.r * 0.4, base.r * 0.4);
    const cy = base.cy + rng.nextFloat(-base.r * 0.4, base.r * 0.3);
    const cr = base.r * rng.nextFloat(0.35, 0.6);
    const j = rng.nextFloat(-cr * 0.1, cr * 0.1);
    ch.push(mkPath(cx, cy,
      `M${cx - cr},${cy + cr * 0.1 + j} ` +
      `C${cx - cr},${cy - cr * 0.7} ${cx - cr * 0.2},${cy - cr * 1.05} ${cx + j},${cy - cr * 0.95} ` +
      `C${cx + cr * 0.3},${cy - cr * 1.05} ${cx + cr},${cy - cr * 0.7} ${cx + cr},${cy + cr * 0.1} ` +
      `C${cx + cr},${cy + cr * 0.5} ${cx - cr},${cy + cr * 0.5} ${cx - cr},${cy + cr * 0.1 + j} Z`,
      hsl(ph + rng.nextInt(-4, 4), ps + rng.nextInt(-5, 5), pl + rng.nextInt(-3, 3)),
      { opacity: rng.nextFloat(0.55, 0.85) }));
  }

  // Top highlights (white-pink)
  for (let i = 0; i < 4; i++) {
    const hx = x + rng.nextFloat(-s * 0.2, s * 0.15);
    const hy = y - s * rng.nextFloat(0.5, 0.68);
    const hr = s * rng.nextFloat(0.06, 0.1);
    ch.push(mkCircle(hx, hy, hr, lighten(ph, ps, pl, 8), { opacity: rng.nextFloat(0.25, 0.45) }));
  }

  // Falling petals (more and varied)
  for (let i = 0; i < rng.nextInt(8, 15); i++) {
    const px = x + rng.nextFloat(-s * 0.6, s * 0.6);
    const py = y + rng.nextFloat(-s * 0.85, s * 0.15);
    const petalSize = s * rng.nextFloat(0.01, 0.02);
    ch.push(mkPath(px, py,
      `M${px},${py - petalSize} Q${px + petalSize},${py} ${px},${py + petalSize} Q${px - petalSize * 0.6},${py} ${px},${py - petalSize} Z`,
      hsl(ph, ps, pl + rng.nextInt(-2, 5)),
      { layer: 4, opacity: rng.nextFloat(0.25, 0.65), rotation: rng.nextFloat(0, 360) }));
  }

  return mkGroup(x, y, ch, { layer: 2, category: 'tree', modifiable: true, id: cuid('cherry') });
}

function detailedWillow(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const ch: SVGElementData[] = [];
  const th = rng.nextInt(25, 35), ts = rng.nextInt(30, 45), tl = rng.nextInt(22, 30);

  // Ground shadow
  ch.push(mkEllipse(x, y + s * 0.02, s * 0.4, s * 0.06, 'rgba(0,0,0,0.12)', { layer: 1 }));

  // Trunk - organic tapered
  ch.push(mkPath(x, y,
    `M${x - s * 0.085},${y} ` +
    `C${x - s * 0.09},${y - s * 0.15} ${x - s * 0.065},${y - s * 0.3} ${x - s * 0.04},${y - s * 0.45} ` +
    `L${x + s * 0.04},${y - s * 0.45} ` +
    `C${x + s * 0.065},${y - s * 0.3} ${x + s * 0.09},${y - s * 0.15} ${x + s * 0.085},${y} Z`,
    hsl(th, ts, tl)));
  // Trunk highlight
  ch.push(mkPath(x, y,
    `M${x - s * 0.06},${y - s * 0.05} C${x - s * 0.05},${y - s * 0.2} ${x - s * 0.04},${y - s * 0.35} ${x - s * 0.03},${y - s * 0.43}`,
    'none', { stroke: lighten(th, ts, tl, 10), strokeWidth: s * 0.015, opacity: 0.2 }));
  // Bark lines
  for (let i = 0; i < 4; i++) {
    const by = y - s * (0.06 + i * 0.09);
    ch.push(mkLine(x - s * 0.05, by, x + s * 0.02, by + rng.nextFloat(-0.5, 0.5),
      darken(th, ts, tl, 7), 0.5, { opacity: 0.25 }));
  }

  // Main branches from trunk
  const gh = rng.nextInt(90, 118), gs = rng.nextInt(38, 58), gl = rng.nextInt(28, 40);
  ch.push(mkPath(x, y,
    `M${x - s * 0.02},${y - s * 0.44} Q${x - s * 0.12},${y - s * 0.52} ${x - s * 0.2},${y - s * 0.5}`,
    'none', { stroke: hsl(th, ts, tl + 3), strokeWidth: s * 0.02 }));
  ch.push(mkPath(x, y,
    `M${x + s * 0.02},${y - s * 0.44} Q${x + s * 0.1},${y - s * 0.53} ${x + s * 0.18},${y - s * 0.5}`,
    'none', { stroke: hsl(th, ts, tl + 3), strokeWidth: s * 0.018 }));

  // Upper crown foliage mass
  ch.push(mkEllipse(x, y - s * 0.52, s * 0.22, s * 0.14, darken(gh, gs, gl, 6), { opacity: 0.4 }));
  ch.push(mkEllipse(x - s * 0.08, y - s * 0.5, s * 0.14, s * 0.1, hsl(gh, gs, gl), { opacity: 0.5 }));
  ch.push(mkEllipse(x + s * 0.06, y - s * 0.5, s * 0.13, s * 0.09, hsl(gh, gs, gl + 3), { opacity: 0.45 }));

  // Drooping branches with leaf clusters
  const branchCount = rng.nextInt(14, 20);
  for (let i = 0; i < branchCount; i++) {
    const startX = x + rng.nextFloat(-s * 0.18, s * 0.18);
    const startY = y - s * rng.nextFloat(0.4, 0.52);
    const endX = startX + rng.nextFloat(-s * 0.28, s * 0.28);
    const endY = y + rng.nextFloat(-s * 0.08, s * 0.18);
    const cp1x = startX + rng.nextFloat(-s * 0.1, s * 0.1);
    const cp1y = startY + (endY - startY) * 0.3;
    const cp2x = endX + rng.nextFloat(-s * 0.05, s * 0.05);
    const cp2y = endY - (endY - startY) * 0.2;
    const branchColor = hsl(gh, gs + rng.nextInt(-5, 5), gl + rng.nextInt(-4, 4));

    // Branch line (thicker)
    ch.push(mkPath(x, y,
      `M${startX},${startY} C${cp1x},${cp1y} ${cp2x},${cp2y} ${endX},${endY}`,
      'none', { stroke: branchColor, strokeWidth: rng.nextFloat(0.8, 2), opacity: rng.nextFloat(0.45, 0.75) }));

    // Small leaf clusters along the branch
    const leafCount = rng.nextInt(2, 4);
    for (let l = 0; l < leafCount; l++) {
      const t = rng.nextFloat(0.3, 0.9);
      const lx = startX + (endX - startX) * t + rng.nextFloat(-s * 0.02, s * 0.02);
      const ly = startY + (endY - startY) * t + rng.nextFloat(-s * 0.02, s * 0.02);
      const lr = s * rng.nextFloat(0.02, 0.04);
      ch.push(mkEllipse(lx, ly, lr, lr * 1.4, hsl(gh + rng.nextInt(-5, 5), gs, gl + rng.nextInt(-3, 3)),
        { opacity: rng.nextFloat(0.3, 0.55) }));
    }
  }

  // Highlight at top
  ch.push(mkEllipse(x - s * 0.05, y - s * 0.55, s * 0.08, s * 0.06, lighten(gh, gs, gl, 14), { opacity: 0.2 }));

  return mkGroup(x, y, ch, { layer: 2, category: 'tree', modifiable: true, id: cuid('willow') });
}

// ═══════════════════════════════════════════════════════════════
// CLOUDS
// ═══════════════════════════════════════════════════════════════

export function detailedCloud(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const ch: SVGElementData[] = [];
  const s = size;

  const w = s * rng.nextFloat(0.9, 1.3);
  const h = s * rng.nextFloat(0.35, 0.55);

  // Bottom ambient shadow
  ch.push(mkEllipse(x + w * 0.05, y + h * 0.12, w * 0.48, h * 0.18, hsl(220, 15, 78), { opacity: 0.2 }));

  // Base layer puffs (slightly blue-gray for bottom shadow feel)
  const basePuffs = [
    { cx: x - w * 0.28, cy: y + h * 0.02, rx: w * 0.28, ry: h * 0.42 },
    { cx: x + w * 0.05,  cy: y + h * 0.04, rx: w * 0.32, ry: h * 0.4 },
    { cx: x + w * 0.3,   cy: y + h * 0.01, rx: w * 0.24, ry: h * 0.38 },
  ];
  for (const p of basePuffs) {
    const jx = rng.nextFloat(-w * 0.02, w * 0.02);
    const jy = rng.nextFloat(-h * 0.02, h * 0.02);
    ch.push(mkPath(p.cx, p.cy,
      `M${p.cx - p.rx},${p.cy + p.ry * 0.15 + jy} ` +
      `C${p.cx - p.rx},${p.cy - p.ry * 0.7 + jx} ${p.cx - p.rx * 0.3},${p.cy - p.ry * 1.05} ${p.cx + jx},${p.cy - p.ry} ` +
      `C${p.cx + p.rx * 0.3},${p.cy - p.ry * 1.05 + jy} ${p.cx + p.rx},${p.cy - p.ry * 0.7} ${p.cx + p.rx},${p.cy + p.ry * 0.15} ` +
      `C${p.cx + p.rx},${p.cy + p.ry * 0.5} ${p.cx - p.rx},${p.cy + p.ry * 0.5} ${p.cx - p.rx},${p.cy + p.ry * 0.15 + jy} Z`,
      hsl(215, 8, 90), { opacity: 0.85 }));
  }

  // Mid layer puffs (white, building volume)
  const midPuffs = [
    { cx: x - w * 0.2, cy: y - h * 0.2, rx: w * 0.3, ry: h * 0.5 },
    { cx: x + w * 0.1,  cy: y - h * 0.18, rx: w * 0.33, ry: h * 0.52 },
    { cx: x + w * 0.32, cy: y - h * 0.12, rx: w * 0.22, ry: h * 0.42 },
    { cx: x - w * 0.35, cy: y - h * 0.08, rx: w * 0.2, ry: h * 0.38 },
  ];
  for (const p of midPuffs) {
    const jx = rng.nextFloat(-w * 0.02, w * 0.02);
    ch.push(mkPath(p.cx, p.cy,
      `M${p.cx - p.rx},${p.cy + p.ry * 0.1} ` +
      `C${p.cx - p.rx},${p.cy - p.ry * 0.75 + jx} ${p.cx - p.rx * 0.25},${p.cy - p.ry * 1.1} ${p.cx + jx},${p.cy - p.ry} ` +
      `C${p.cx + p.rx * 0.25},${p.cy - p.ry * 1.1} ${p.cx + p.rx},${p.cy - p.ry * 0.75} ${p.cx + p.rx},${p.cy + p.ry * 0.1} ` +
      `C${p.cx + p.rx},${p.cy + p.ry * 0.45} ${p.cx - p.rx},${p.cy + p.ry * 0.45} ${p.cx - p.rx},${p.cy + p.ry * 0.1} Z`,
      hsl(210, 4, 95), { opacity: 0.9 }));
  }

  // Top highlight puffs (brightest white)
  const topPuffs = [
    { cx: x - w * 0.08, cy: y - h * 0.55, rx: w * 0.24, ry: h * 0.4 },
    { cx: x + w * 0.15, cy: y - h * 0.48, rx: w * 0.2, ry: h * 0.35 },
    { cx: x - w * 0.25, cy: y - h * 0.35, rx: w * 0.18, ry: h * 0.3 },
  ];
  for (const p of topPuffs) {
    ch.push(mkPath(p.cx, p.cy,
      `M${p.cx - p.rx},${p.cy + p.ry * 0.1} ` +
      `C${p.cx - p.rx},${p.cy - p.ry * 0.8} ${p.cx - p.rx * 0.3},${p.cy - p.ry} ${p.cx},${p.cy - p.ry * 0.95} ` +
      `C${p.cx + p.rx * 0.3},${p.cy - p.ry} ${p.cx + p.rx},${p.cy - p.ry * 0.8} ${p.cx + p.rx},${p.cy + p.ry * 0.1} ` +
      `C${p.cx + p.rx},${p.cy + p.ry * 0.4} ${p.cx - p.rx},${p.cy + p.ry * 0.4} ${p.cx - p.rx},${p.cy + p.ry * 0.1} Z`,
      '#FFFFFF', { opacity: 0.95 }));
  }

  // Crown highlight streak
  ch.push(mkPath(x, y,
    `M${x - w * 0.22},${y - h * 0.6} Q${x - w * 0.05},${y - h * 0.8} ${x + w * 0.12},${y - h * 0.55}`,
    'none', { stroke: '#FFFFFF', strokeWidth: h * 0.12, opacity: 0.3 }));

  // Bottom edge soft shadow
  ch.push(mkPath(x, y,
    `M${x - w * 0.35},${y + h * 0.05} Q${x},${y + h * 0.12} ${x + w * 0.35},${y + h * 0.05}`,
    'none', { stroke: hsl(220, 12, 82), strokeWidth: h * 0.08, opacity: 0.25 }));

  return mkGroup(x, y, ch, { layer: 0, category: 'cloud', modifiable: true, id: cuid('cloud'), opacity: rng.nextFloat(0.78, 0.95) });
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
  const wallHue = rng.nextInt(0, 20), wallSat = rng.nextInt(15, 35), wallLit = rng.nextInt(72, 88);
  const wallColor = hsl(wallHue, wallSat, wallLit);
  const wallDark = darken(wallHue, wallSat, wallLit, 10);
  const roofHue = rng.nextInt(0, 30), roofSat = rng.nextInt(40, 65), roofLit = rng.nextInt(30, 45);
  const roofColor = hsl(roofHue, roofSat, roofLit);
  const roofDark = darken(roofHue, roofSat, roofLit, 10);
  const roofLight = lighten(roofHue, roofSat, roofLit, 8);

  // Ground shadow
  ch.push(mkEllipse(x + w / 2, y + 3, w * 0.55, 4, 'rgba(0,0,0,0.12)', { layer: 1 }));

  // Wall
  ch.push(mkRect(x, y - h * 0.6, w, h * 0.6, wallColor, { layer: 2 }));
  // Wall shadow (right side)
  ch.push(mkRect(x + w * 0.7, y - h * 0.6, w * 0.3, h * 0.6, wallDark, { layer: 2, opacity: 0.12 }));
  // Wall highlight (left edge)
  ch.push(mkLine(x + 1, y - h * 0.58, x + 1, y - 2, lighten(wallHue, wallSat, wallLit, 6), 1.5, { opacity: 0.3 }));
  // Foundation line
  ch.push(mkRect(x - 2, y - h * 0.02, w + 4, h * 0.025, darken(wallHue, wallSat, wallLit, 18), { layer: 2, opacity: 0.5 }));

  // Roof with overhang
  const ro = w * 0.08;
  ch.push(mkPath(x, y,
    `M${x - ro},${y - h * 0.6} L${x + w / 2},${y - h} L${x + w + ro},${y - h * 0.6} Z`,
    roofColor, { layer: 2 }));
  // Roof shadow (right half)
  ch.push(mkPath(x, y,
    `M${x + w / 2},${y - h} L${x + w + ro},${y - h * 0.6} L${x + w / 2 + ro * 0.3},${y - h * 0.6} Z`,
    roofDark, { layer: 2, opacity: 0.4 }));
  // Roof ridge line
  ch.push(mkLine(x + w / 2 - w * 0.02, y - h * 0.99, x + w / 2 + w * 0.02, y - h * 0.99,
    roofLight, 2, { opacity: 0.5 }));
  // Roof tile lines
  for (let i = 1; i <= 3; i++) {
    const t = i / 4;
    const ly = y - h * (0.6 + (1 - 0.6) * (1 - t));
    const lx1 = x - ro + (x + w / 2 - (x - ro)) * t;
    const lx2 = x + w + ro - (x + w + ro - (x + w / 2)) * t;
    ch.push(mkLine(lx1, ly, lx2, ly, roofDark, 0.5, { opacity: 0.2 }));
  }

  // Door
  const doorW = w * 0.2, doorH = h * 0.35;
  const doorX = x + w * 0.5 - doorW / 2;
  ch.push(mkRect(doorX, y - doorH, doorW, doorH, hsl(25, 40, 30), { layer: 2 }));
  // Door panel lines
  ch.push(mkRect(doorX + doorW * 0.12, y - doorH * 0.9, doorW * 0.32, doorH * 0.38, hsl(25, 35, 26), { layer: 2, opacity: 0.3 }));
  ch.push(mkRect(doorX + doorW * 0.56, y - doorH * 0.9, doorW * 0.32, doorH * 0.38, hsl(25, 35, 26), { layer: 2, opacity: 0.3 }));
  // Doorknob
  ch.push(mkCircle(doorX + doorW * 0.82, y - doorH * 0.45, doorW * 0.07, '#C0A870', { layer: 2 }));
  ch.push(mkCircle(doorX + doorW * 0.8, y - doorH * 0.46, doorW * 0.025, '#E0D0A0', { layer: 2, opacity: 0.5 }));
  // Door frame
  ch.push(mkPath(doorX, y, `M${doorX - 2},${y} L${doorX - 2},${y - doorH - 3} L${doorX + doorW + 2},${y - doorH - 3} L${doorX + doorW + 2},${y}`,
    'none', { stroke: wallDark, strokeWidth: 2, opacity: 0.4 }));

  // Windows with frames and shutters
  const winW = w * 0.18, winH = h * 0.18;
  for (let i = 0; i < 2; i++) {
    const wx = x + w * (0.15 + i * 0.52);
    const wy = y - h * 0.5;
    // Window frame
    ch.push(mkRect(wx - 2, wy - 2, winW + 4, winH + 4, wallDark, { layer: 2, opacity: 0.4 }));
    // Glass
    ch.push(mkRect(wx, wy, winW, winH, '#B0D4F1', { layer: 2 }));
    // Glass reflection
    ch.push(mkPath(wx, wy,
      `M${wx + winW * 0.1},${wy + winH * 0.1} L${wx + winW * 0.3},${wy + winH * 0.1} L${wx + winW * 0.15},${wy + winH * 0.4} Z`,
      '#FFFFFF', { layer: 2, opacity: 0.2 }));
    // Cross
    ch.push(mkLine(wx + winW / 2, wy, wx + winW / 2, wy + winH, wallDark, 1));
    ch.push(mkLine(wx, wy + winH / 2, wx + winW, wy + winH / 2, wallDark, 1));
    // Window sill
    ch.push(mkRect(wx - 3, wy + winH, winW + 6, 3, wallDark, { layer: 2, opacity: 0.5 }));
  }

  // Chimney
  if (rng.chance(0.6)) {
    const chimX = x + w * 0.75, chimW = w * 0.12, chimH = h * 0.2;
    ch.push(mkRect(chimX, y - h - chimH * 0.5, chimW, chimH + h * 0.05, hsl(roofHue, roofSat - 10, roofLit - 5), { layer: 2 }));
    // Chimney cap
    ch.push(mkRect(chimX - 2, y - h - chimH * 0.5, chimW + 4, 3, hsl(roofHue, roofSat - 10, roofLit - 10), { layer: 2 }));
  }

  return mkGroup(x, y, ch, { layer: 2, category: 'building', modifiable: true, id: cuid('house') });
}

// ═══════════════════════════════════════════════════════════════
// PEOPLE
// ═══════════════════════════════════════════════════════════════

export function detailedPerson(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const ch: SVGElementData[] = [];
  const skinH = rng.nextInt(15, 35), skinS = rng.nextInt(40, 65), skinL = rng.nextInt(55, 75);
  const skinColor = hsl(skinH, skinS, skinL);
  const skinShade = darken(skinH, skinS, skinL, 8);
  const shirtH = rng.nextInt(0, 360), shirtS = rng.nextInt(50, 75), shirtL = rng.nextInt(45, 65);
  const shirtColor = hsl(shirtH, shirtS, shirtL);
  const shirtDark = darken(shirtH, shirtS, shirtL, 12);
  const pantsH = rng.nextInt(200, 250), pantsS = rng.nextInt(30, 60), pantsL = rng.nextInt(25, 42);
  const pantsColor = hsl(pantsH, pantsS, pantsL);
  const pantsDark = darken(pantsH, pantsS, pantsL, 8);
  const hairColor = rng.pick(['#2C1810', '#4A3728', '#8B6508', '#1A1A1A', '#6B3A2A', '#C67A3B']);

  // Ground shadow
  ch.push(mkEllipse(x, y + s * 0.01, s * 0.18, s * 0.035, 'rgba(0,0,0,0.15)', { layer: 2 }));

  // === LEGS (shaped paths, not rectangles) ===
  ch.push(mkPath(x, y,
    `M${x - s * 0.07},${y - s * 0.28} C${x - s * 0.075},${y - s * 0.15} ${x - s * 0.08},${y - s * 0.06} ${x - s * 0.08},${y - s * 0.04} ` +
    `L${x - s * 0.02},${y - s * 0.04} C${x - s * 0.02},${y - s * 0.06} ${x - s * 0.015},${y - s * 0.15} ${x - s * 0.01},${y - s * 0.28} Z`,
    pantsColor));
  ch.push(mkPath(x, y,
    `M${x + s * 0.01},${y - s * 0.28} C${x + s * 0.015},${y - s * 0.15} ${x + s * 0.02},${y - s * 0.06} ${x + s * 0.02},${y - s * 0.04} ` +
    `L${x + s * 0.08},${y - s * 0.04} C${x + s * 0.08},${y - s * 0.06} ${x + s * 0.075},${y - s * 0.15} ${x + s * 0.07},${y - s * 0.28} Z`,
    pantsColor));
  // Pant leg shadow
  ch.push(mkPath(x, y,
    `M${x - s * 0.045},${y - s * 0.26} L${x - s * 0.055},${y - s * 0.06} L${x - s * 0.025},${y - s * 0.06} L${x - s * 0.02},${y - s * 0.26} Z`,
    pantsDark, { opacity: 0.2 }));

  // === SHOES (rounded, with soles) ===
  ch.push(mkPath(x, y,
    `M${x - s * 0.09},${y - s * 0.005} ` +
    `C${x - s * 0.09},${y - s * 0.035} ${x - s * 0.015},${y - s * 0.04} ${x - s * 0.015},${y - s * 0.02} ` +
    `L${x - s * 0.015},${y + s * 0.008} ` +
    `C${x - s * 0.015},${y + s * 0.018} ${x - s * 0.09},${y + s * 0.018} ${x - s * 0.09},${y - s * 0.005} Z`,
    '#3D2B1F'));
  ch.push(mkPath(x, y,
    `M${x + s * 0.015},${y - s * 0.02} ` +
    `C${x + s * 0.015},${y - s * 0.04} ${x + s * 0.09},${y - s * 0.035} ${x + s * 0.09},${y - s * 0.005} ` +
    `C${x + s * 0.09},${y + s * 0.018} ${x + s * 0.015},${y + s * 0.018} ${x + s * 0.015},${y + s * 0.008} Z`,
    '#3D2B1F'));

  // === TORSO (organic shaped body) ===
  ch.push(mkPath(x, y,
    `M${x - s * 0.1},${y - s * 0.28} ` +
    `C${x - s * 0.11},${y - s * 0.36} ${x - s * 0.105},${y - s * 0.46} ${x - s * 0.085},${y - s * 0.53} ` +
    `Q${x},${y - s * 0.57} ${x + s * 0.085},${y - s * 0.53} ` +
    `C${x + s * 0.105},${y - s * 0.46} ${x + s * 0.11},${y - s * 0.36} ${x + s * 0.1},${y - s * 0.28} Z`,
    shirtColor));
  // Shirt shadow (right side)
  ch.push(mkPath(x, y,
    `M${x + s * 0.04},${y - s * 0.52} ` +
    `C${x + s * 0.08},${y - s * 0.46} ${x + s * 0.1},${y - s * 0.37} ${x + s * 0.09},${y - s * 0.3} ` +
    `L${x + s * 0.06},${y - s * 0.3} ` +
    `C${x + s * 0.07},${y - s * 0.38} ${x + s * 0.06},${y - s * 0.46} ${x + s * 0.04},${y - s * 0.52} Z`,
    shirtDark, { opacity: 0.2 }));
  // Collar V-shape
  ch.push(mkPath(x, y,
    `M${x - s * 0.04},${y - s * 0.535} L${x},${y - s * 0.49} L${x + s * 0.04},${y - s * 0.535}`,
    'none', { stroke: shirtDark, strokeWidth: s * 0.006, opacity: 0.5 }));

  // === ARMS (shaped, not just strokes) ===
  ch.push(mkPath(x, y,
    `M${x - s * 0.09},${y - s * 0.52} ` +
    `C${x - s * 0.13},${y - s * 0.48} ${x - s * 0.16},${y - s * 0.42} ${x - s * 0.155},${y - s * 0.34} ` +
    `L${x - s * 0.125},${y - s * 0.335} ` +
    `C${x - s * 0.13},${y - s * 0.41} ${x - s * 0.11},${y - s * 0.46} ${x - s * 0.08},${y - s * 0.5} Z`,
    shirtColor));
  ch.push(mkPath(x, y,
    `M${x + s * 0.09},${y - s * 0.52} ` +
    `C${x + s * 0.13},${y - s * 0.48} ${x + s * 0.16},${y - s * 0.42} ${x + s * 0.155},${y - s * 0.34} ` +
    `L${x + s * 0.125},${y - s * 0.335} ` +
    `C${x + s * 0.13},${y - s * 0.41} ${x + s * 0.11},${y - s * 0.46} ${x + s * 0.08},${y - s * 0.5} Z`,
    shirtColor));
  // Hands
  ch.push(mkCircle(x - s * 0.14, y - s * 0.338, s * 0.022, skinColor));
  ch.push(mkCircle(x + s * 0.14, y - s * 0.338, s * 0.022, skinColor));

  // === NECK ===
  ch.push(mkRect(x - s * 0.022, y - s * 0.585, s * 0.044, s * 0.055, skinColor));

  // === HEAD (oval face) ===
  ch.push(mkEllipse(x, y - s * 0.66, s * 0.085, s * 0.095, skinColor));
  // Face shadow (right side)
  ch.push(mkPath(x, y,
    `M${x + s * 0.04},${y - s * 0.72} C${x + s * 0.08},${y - s * 0.68} ${x + s * 0.08},${y - s * 0.62} ${x + s * 0.04},${y - s * 0.59}`,
    skinShade, { opacity: 0.12 }));
  // Cheek blush
  ch.push(mkEllipse(x - s * 0.055, y - s * 0.635, s * 0.022, s * 0.014, '#FFB7A5', { opacity: 0.3 }));
  ch.push(mkEllipse(x + s * 0.055, y - s * 0.635, s * 0.022, s * 0.014, '#FFB7A5', { opacity: 0.3 }));
  // Eyes
  ch.push(mkEllipse(x - s * 0.032, y - s * 0.675, s * 0.016, s * 0.02, '#2C1810'));
  ch.push(mkEllipse(x + s * 0.032, y - s * 0.675, s * 0.016, s * 0.02, '#2C1810'));
  // Eye highlights
  ch.push(mkCircle(x - s * 0.027, y - s * 0.68, s * 0.005, '#FFFFFF'));
  ch.push(mkCircle(x + s * 0.037, y - s * 0.68, s * 0.005, '#FFFFFF'));
  // Smile
  ch.push(mkPath(x, y,
    `M${x - s * 0.018},${y - s * 0.635} Q${x},${y - s * 0.623} ${x + s * 0.018},${y - s * 0.635}`,
    'none', { stroke: '#C07060', strokeWidth: s * 0.005 }));

  // === HAIR ===
  const hairStyle = rng.nextInt(0, 3);
  if (hairStyle === 0) {
    // Short neat
    ch.push(mkPath(x, y,
      `M${x - s * 0.088},${y - s * 0.69} ` +
      `C${x - s * 0.1},${y - s * 0.77} ${x - s * 0.05},${y - s * 0.82} ${x},${y - s * 0.81} ` +
      `C${x + s * 0.05},${y - s * 0.82} ${x + s * 0.1},${y - s * 0.77} ${x + s * 0.088},${y - s * 0.69} ` +
      `Q${x + s * 0.05},${y - s * 0.72} ${x},${y - s * 0.71} ` +
      `Q${x - s * 0.05},${y - s * 0.72} ${x - s * 0.088},${y - s * 0.69} Z`,
      hairColor));
  } else if (hairStyle === 1) {
    // Side swept
    ch.push(mkPath(x, y,
      `M${x - s * 0.095},${y - s * 0.68} ` +
      `C${x - s * 0.11},${y - s * 0.78} ${x - s * 0.04},${y - s * 0.83} ${x + s * 0.02},${y - s * 0.82} ` +
      `C${x + s * 0.08},${y - s * 0.83} ${x + s * 0.11},${y - s * 0.76} ${x + s * 0.095},${y - s * 0.69} ` +
      `C${x + s * 0.11},${y - s * 0.65} ${x + s * 0.1},${y - s * 0.62} ${x + s * 0.08},${y - s * 0.6} ` +
      `Q${x},${y - s * 0.7} ${x - s * 0.095},${y - s * 0.68} Z`,
      hairColor));
  } else {
    // Fluffy rounded
    ch.push(mkPath(x, y,
      `M${x - s * 0.095},${y - s * 0.67} ` +
      `C${x - s * 0.115},${y - s * 0.74} ${x - s * 0.1},${y - s * 0.84} ${x - s * 0.03},${y - s * 0.84} ` +
      `C${x},${y - s * 0.86} ${x + s * 0.03},${y - s * 0.84} ${x + s * 0.03},${y - s * 0.84} ` +
      `C${x + s * 0.1},${y - s * 0.84} ${x + s * 0.115},${y - s * 0.74} ${x + s * 0.095},${y - s * 0.67} ` +
      `Q${x + s * 0.05},${y - s * 0.71} ${x},${y - s * 0.72} ` +
      `Q${x - s * 0.05},${y - s * 0.71} ${x - s * 0.095},${y - s * 0.67} Z`,
      hairColor));
  }
  // Hair highlight
  ch.push(mkPath(x, y,
    `M${x - s * 0.04},${y - s * 0.78} Q${x},${y - s * 0.81} ${x + s * 0.03},${y - s * 0.77}`,
    'none', { stroke: '#FFFFFF', strokeWidth: s * 0.006, opacity: 0.15 }));

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
  const wh = rng.nextInt(22, 35), ws = rng.nextInt(28, 42), wl = rng.nextInt(48, 62);
  const woodColor = hsl(wh, ws, wl);
  const woodDark = darken(wh, ws, wl, 10);
  const woodLight = lighten(wh, ws, wl, 8);
  const postCount = Math.max(2, Math.floor(length / (s * 0.25)) + 1);
  const gap = length / (postCount - 1);

  // Ground shadow
  ch.push(mkEllipse(x + length / 2, y + s * 0.02, length * 0.48, s * 0.025, 'rgba(0,0,0,0.1)', { layer: 1 }));

  // Rails with depth (front face + top face)
  const railH = s * 0.035;
  const railDepth = s * 0.012;
  // Bottom rail
  ch.push(mkRect(x, y - s * 0.16, length, railH, woodColor, { layer: 2 }));
  ch.push(mkRect(x, y - s * 0.16 - railDepth, length, railDepth, woodLight, { layer: 2, opacity: 0.6 }));
  // Top rail
  ch.push(mkRect(x, y - s * 0.3, length, railH, woodColor, { layer: 2 }));
  ch.push(mkRect(x, y - s * 0.3 - railDepth, length, railDepth, woodLight, { layer: 2, opacity: 0.6 }));

  // Posts with pointed tops, wood grain, nails
  for (let i = 0; i < postCount; i++) {
    const px = x + i * gap;
    const pw = s * 0.042;
    const postLight = hsl(wh, ws, wl + rng.nextInt(-3, 3));

    // Post body
    ch.push(mkRect(px - pw / 2, y - s * 0.37, pw, s * 0.42, postLight, { layer: 2 }));
    // Post right shadow
    ch.push(mkRect(px + pw * 0.15, y - s * 0.37, pw * 0.2, s * 0.42, woodDark, { layer: 2, opacity: 0.2 }));
    // Pointed top
    ch.push(mkPath(px, y,
      `M${px - pw / 2},${y - s * 0.37} L${px},${y - s * 0.44} L${px + pw / 2},${y - s * 0.37} Z`,
      postLight));
    // Point top highlight
    ch.push(mkPath(px, y,
      `M${px - pw / 2},${y - s * 0.37} L${px},${y - s * 0.44} L${px - pw * 0.05},${y - s * 0.37} Z`,
      woodLight, { opacity: 0.35 }));

    // Wood grain lines on post
    for (let g = 0; g < 3; g++) {
      const gy = y - s * (0.08 + g * 0.1);
      ch.push(mkLine(px - pw * 0.35, gy, px + pw * 0.2, gy + rng.nextFloat(-0.5, 0.5),
        woodDark, 0.4, { opacity: rng.nextFloat(0.15, 0.3) }));
    }

    // Nail dots at rail intersections
    ch.push(mkCircle(px, y - s * 0.145, s * 0.006, '#555', { opacity: 0.5 }));
    ch.push(mkCircle(px, y - s * 0.285, s * 0.006, '#555', { opacity: 0.5 }));
  }

  return mkGroup(x, y, ch, { layer: 2, category: 'fence', modifiable: true, id: cuid('fence') });
}
