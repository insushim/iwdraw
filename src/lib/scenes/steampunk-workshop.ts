import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath,
  createLine, createGroup, createText,
} from '../engine/primitives';
import {
  combineDefs, indoorDefs, linearGradient, radialGradient,
  wallGradient, floorGradient, dropShadow, softGlow,
} from './svg-effects';
import { resetComponentId } from './svg-components';

let _uid = 0;
function uid(p = 'sp') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// Gear / cog
function gear(x: number, y: number, outerR: number, innerR: number, teeth: number, color: string, rng: SeededRandom): SVGElementData {
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a1 = (i / teeth) * Math.PI * 2;
    const a2 = ((i + 0.3) / teeth) * Math.PI * 2;
    const a3 = ((i + 0.5) / teeth) * Math.PI * 2;
    const a4 = ((i + 0.8) / teeth) * Math.PI * 2;
    const p1x = x + Math.cos(a1) * innerR, p1y = y + Math.sin(a1) * innerR;
    const p2x = x + Math.cos(a2) * outerR, p2y = y + Math.sin(a2) * outerR;
    const p3x = x + Math.cos(a3) * outerR, p3y = y + Math.sin(a3) * outerR;
    const p4x = x + Math.cos(a4) * innerR, p4y = y + Math.sin(a4) * innerR;
    d += (i === 0 ? 'M' : 'L') + `${p1x},${p1y} L${p2x},${p2y} L${p3x},${p3y} L${p4x},${p4y} `;
  }
  d += 'Z';
  const children: SVGElementData[] = [];
  children.push(createPath(x, y, d, color, { layer: 2, stroke: '#5A4A30', strokeWidth: 0.8 }));
  // Center hole
  children.push(createCircle(x, y, innerR * 0.35, '#2A2015', { layer: 2 }));
  children.push(createCircle(x, y, innerR * 0.22, color, { layer: 2, opacity: 0.5 }));
  // Spokes
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const sx2 = x + Math.cos(angle) * innerR * 0.22;
    const sy2 = y + Math.sin(angle) * innerR * 0.22;
    const ex = x + Math.cos(angle) * innerR * 0.85;
    const ey = y + Math.sin(angle) * innerR * 0.85;
    children.push(createLine(sx2, sy2, ex, ey, '#5A4A30', { strokeWidth: 1.5, layer: 2, opacity: 0.5 }));
  }
  return createGroup(x, y, children, { layer: 2, category: 'gear', modifiable: true, id: uid('gear') });
}

// Brass pipe
function brassPipe(x1: number, y1: number, x2: number, y2: number, diameter: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const pipeColor = rng.pick(['#B8860B', '#CD9B1D', '#C8A830']);
  children.push(createLine(x1, y1, x2, y2, pipeColor, { strokeWidth: diameter, layer: 2 }));
  // Pipe highlight
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len * diameter * 0.2, ny = dx / len * diameter * 0.2;
  children.push(createLine(x1 + nx, y1 + ny, x2 + nx, y2 + ny, '#E8D880', { strokeWidth: diameter * 0.15, layer: 2, opacity: 0.4 }));
  // Joints at ends
  children.push(createCircle(x1, y1, diameter * 0.65, pipeColor, { layer: 2, stroke: '#8A6B0B', strokeWidth: 1 }));
  children.push(createCircle(x2, y2, diameter * 0.65, pipeColor, { layer: 2, stroke: '#8A6B0B', strokeWidth: 1 }));
  return createGroup(x1, y1, children, { layer: 2, category: 'pipe', modifiable: true, id: uid('pipe') });
}

// Pressure gauge
function pressureGauge(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  // Outer ring
  children.push(createCircle(x, y, s, '#A08020', { layer: 3, stroke: '#6A5010', strokeWidth: 2 }));
  // Glass face
  children.push(createCircle(x, y, s * 0.82, '#F5F0E0', { layer: 3 }));
  // Scale markings
  for (let i = 0; i < 10; i++) {
    const angle = (-Math.PI * 0.75) + (i / 9) * Math.PI * 1.5;
    const ix = x + Math.cos(angle) * s * 0.65;
    const iy = y + Math.sin(angle) * s * 0.65;
    const ox = x + Math.cos(angle) * s * 0.75;
    const oy = y + Math.sin(angle) * s * 0.75;
    children.push(createLine(ix, iy, ox, oy, '#333', { strokeWidth: 1, layer: 3 }));
  }
  // Needle
  const needleAngle = rng.nextFloat(-Math.PI * 0.75, Math.PI * 0.75);
  const nx = x + Math.cos(needleAngle) * s * 0.6;
  const ny = y + Math.sin(needleAngle) * s * 0.6;
  children.push(createLine(x, y, nx, ny, '#CC0000', { strokeWidth: 1.5, layer: 3 }));
  // Center cap
  children.push(createCircle(x, y, s * 0.08, '#8A6B0B', { layer: 3 }));
  // Glass highlight
  children.push(createCircle(x - s * 0.2, y - s * 0.2, s * 0.15, '#FFFFFF', { layer: 3, opacity: 0.3 }));
  return createGroup(x, y, children, { layer: 3, category: 'gauge', modifiable: true, id: uid('gauge'), filter: 'url(#shadow)' });
}

// Steam valve
function steamValve(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  // Valve base
  children.push(createRect(x - s * 0.25, y - s * 0.1, s * 0.5, s * 0.2, '#888', { layer: 3, stroke: '#555', strokeWidth: 1 }));
  // Valve wheel (cross handle)
  children.push(createCircle(x, y, s * 0.3, 'none', { layer: 3, stroke: '#AA2222', strokeWidth: s * 0.06 }));
  children.push(createLine(x - s * 0.28, y, x + s * 0.28, y, '#AA2222', { strokeWidth: s * 0.06, layer: 3 }));
  children.push(createLine(x, y - s * 0.28, x, y + s * 0.28, '#AA2222', { strokeWidth: s * 0.06, layer: 3 }));
  // Center nut
  children.push(createCircle(x, y, s * 0.08, '#666', { layer: 3 }));
  return createGroup(x, y, children, { layer: 3, category: 'valve', modifiable: true, id: uid('valve') });
}

// Steam cloud
function steamCloud(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const count = rng.nextInt(4, 7);
  for (let i = 0; i < count; i++) {
    const cx = x + rng.nextFloat(-s * 0.3, s * 0.3);
    const cy = y + rng.nextFloat(-s * 0.2, s * 0.2) - i * s * 0.1;
    const r = s * rng.nextFloat(0.15, 0.35);
    children.push(createCircle(cx, cy, r, '#E8E8E8', { layer: 4, opacity: rng.nextFloat(0.15, 0.3) }));
  }
  return createGroup(x, y, children, { layer: 4, category: 'steam', modifiable: true, id: uid('steam') });
}

// Lightbulb (Edison style)
function lightbulb(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  // Wire
  children.push(createLine(x, y - s * 0.8, x, y - s * 0.4, '#333', { strokeWidth: 1, layer: 3 }));
  // Bulb socket (brass)
  children.push(createRect(x - s * 0.08, y - s * 0.42, s * 0.16, s * 0.12, '#B8860B', { layer: 3, stroke: '#8A6B0B', strokeWidth: 0.5 }));
  // Glass bulb
  const bulbPath = `M${x - s * 0.08},${y - s * 0.3} Q${x - s * 0.2},${y - s * 0.15} ${x - s * 0.18},${y + s * 0.05} Q${x - s * 0.12},${y + s * 0.2} ${x},${y + s * 0.25} Q${x + s * 0.12},${y + s * 0.2} ${x + s * 0.18},${y + s * 0.05} Q${x + s * 0.2},${y - s * 0.15} ${x + s * 0.08},${y - s * 0.3} Z`;
  children.push(createPath(x, y, bulbPath, '#FFF8E0', { layer: 3, opacity: 0.6, stroke: '#C8B870', strokeWidth: 0.5 }));
  // Filament
  const filPath = `M${x - s * 0.04},${y - s * 0.2} Q${x},${y - s * 0.05} ${x + s * 0.04},${y - s * 0.2}`;
  children.push(createPath(x, y, filPath, 'none', { stroke: '#FFD700', strokeWidth: 0.8, layer: 3, opacity: 0.8 }));
  // Glow
  children.push(createCircle(x, y, s * 0.4, 'url(#bulbGlow)', { layer: 3, opacity: 0.3 }));
  return createGroup(x, y, children, { layer: 3, category: 'bulb', modifiable: true, id: uid('bulb') });
}

// Workbench
function workbench(x: number, y: number, w2: number, h2: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  // Table top
  children.push(createRect(x, y, w2, h2 * 0.08, '#6B4A2A', { layer: 2, stroke: '#4A3218', strokeWidth: 1 }));
  // Legs
  children.push(createRect(x + w2 * 0.05, y + h2 * 0.08, w2 * 0.06, h2 * 0.92, '#5A3A1A', { layer: 2 }));
  children.push(createRect(x + w2 * 0.89, y + h2 * 0.08, w2 * 0.06, h2 * 0.92, '#5A3A1A', { layer: 2 }));
  // Shelf
  children.push(createRect(x + w2 * 0.05, y + h2 * 0.55, w2 * 0.9, h2 * 0.04, '#5A3A1A', { layer: 2, opacity: 0.8 }));
  // Drawer
  children.push(createRect(x + w2 * 0.3, y + h2 * 0.12, w2 * 0.4, h2 * 0.15, '#5A3A1A', { layer: 2, stroke: '#4A3218', strokeWidth: 0.5 }));
  // Drawer handle
  children.push(createCircle(x + w2 * 0.5, y + h2 * 0.2, w2 * 0.015, '#B8860B', { layer: 2 }));
  return createGroup(x, y, children, { layer: 2, category: 'bench', modifiable: false, filter: 'url(#shadow)' });
}

// Tool (wrench or hammer)
function tool(x: number, y: number, type: 'wrench' | 'hammer' | 'screwdriver', size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  if (type === 'wrench') {
    children.push(createRect(x - s * 0.03, y - s * 0.5, s * 0.06, s * 0.7, '#888', { layer: 3 }));
    const jawPath = `M${x - s * 0.12},${y - s * 0.5} L${x - s * 0.15},${y - s * 0.65} L${x - s * 0.05},${y - s * 0.58} L${x + s * 0.05},${y - s * 0.58} L${x + s * 0.15},${y - s * 0.65} L${x + s * 0.12},${y - s * 0.5} Z`;
    children.push(createPath(x, y, jawPath, '#999', { layer: 3, stroke: '#666', strokeWidth: 0.5 }));
  } else if (type === 'hammer') {
    children.push(createRect(x - s * 0.03, y - s * 0.3, s * 0.06, s * 0.6, '#8B6E4E', { layer: 3 }));
    children.push(createRect(x - s * 0.15, y - s * 0.5, s * 0.3, s * 0.15, '#777', { layer: 3, stroke: '#555', strokeWidth: 0.5 }));
  } else {
    children.push(createRect(x - s * 0.025, y - s * 0.3, s * 0.05, s * 0.55, '#FFD700', { layer: 3 }));
    const tipPath = `M${x - s * 0.02},${y - s * 0.5} L${x},${y - s * 0.62} L${x + s * 0.02},${y - s * 0.5}`;
    children.push(createPath(x, y, tipPath, '#888', { layer: 3 }));
  }
  return createGroup(x, y, children, { layer: 3, category: 'tool', modifiable: true, id: uid('tool'), rotation: rng.nextFloat(-15, 15) });
}

// Flying goggles
function goggles(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  // Strap
  children.push(createPath(x, y, `M${x - s * 0.5},${y} Q${x - s * 0.5},${y - s * 0.15} ${x - s * 0.3},${y - s * 0.1}`, 'none', { stroke: '#8B4513', strokeWidth: s * 0.06, layer: 3 }));
  children.push(createPath(x, y, `M${x + s * 0.3},${y - s * 0.1} Q${x + s * 0.5},${y - s * 0.15} ${x + s * 0.5},${y}`, 'none', { stroke: '#8B4513', strokeWidth: s * 0.06, layer: 3 }));
  // Left lens frame
  children.push(createCircle(x - s * 0.15, y, s * 0.18, '#B8860B', { layer: 3, stroke: '#8A6B0B', strokeWidth: 1.5 }));
  children.push(createCircle(x - s * 0.15, y, s * 0.13, '#88CCFF', { layer: 3, opacity: 0.5 }));
  // Right lens frame
  children.push(createCircle(x + s * 0.15, y, s * 0.18, '#B8860B', { layer: 3, stroke: '#8A6B0B', strokeWidth: 1.5 }));
  children.push(createCircle(x + s * 0.15, y, s * 0.13, '#88CCFF', { layer: 3, opacity: 0.5 }));
  // Bridge
  children.push(createLine(x - s * 0.02, y, x + s * 0.02, y, '#B8860B', { strokeWidth: s * 0.05, layer: 3 }));
  // Lens glare
  children.push(createCircle(x - s * 0.19, y - s * 0.04, s * 0.04, '#FFF', { layer: 3, opacity: 0.4 }));
  children.push(createCircle(x + s * 0.11, y - s * 0.04, s * 0.04, '#FFF', { layer: 3, opacity: 0.4 }));
  return createGroup(x, y, children, { layer: 3, category: 'goggles', modifiable: true, id: uid('gogg') });
}

// Top hat
function topHat(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const hatColor = rng.pick(['#1A1A1A', '#2A1A10', '#1A1A2A']);
  // Brim
  children.push(createEllipse(x, y, s * 0.4, s * 0.08, hatColor, { layer: 3, stroke: '#333', strokeWidth: 0.5 }));
  // Crown
  children.push(createRect(x - s * 0.2, y - s * 0.55, s * 0.4, s * 0.55, hatColor, { layer: 3 }));
  // Top
  children.push(createEllipse(x, y - s * 0.55, s * 0.2, s * 0.05, hatColor, { layer: 3, stroke: '#444', strokeWidth: 0.5 }));
  // Band with gear buckle
  children.push(createRect(x - s * 0.22, y - s * 0.15, s * 0.44, s * 0.06, '#B8860B', { layer: 3 }));
  children.push(createCircle(x, y - s * 0.12, s * 0.04, '#CD9B1D', { layer: 3, stroke: '#8A6B0B', strokeWidth: 0.5 }));
  return createGroup(x, y, children, { layer: 3, category: 'hat', modifiable: true, id: uid('hat'), filter: 'url(#shadow)' });
}

// Blueprint
function blueprint(x: number, y: number, w2: number, h2: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  // Paper
  children.push(createRect(x, y, w2, h2, '#1A3A6A', { layer: 3, stroke: '#0A2A5A', strokeWidth: 0.5 }));
  // Grid lines
  const gridSpacing = w2 / 6;
  for (let i = 1; i < 6; i++) {
    children.push(createLine(x + i * gridSpacing, y, x + i * gridSpacing, y + h2, '#2A4A7A', { strokeWidth: 0.3, layer: 3, opacity: 0.5 }));
  }
  for (let i = 1; i < 4; i++) {
    children.push(createLine(x, y + i * (h2 / 4), x + w2, y + i * (h2 / 4), '#2A4A7A', { strokeWidth: 0.3, layer: 3, opacity: 0.5 }));
  }
  // Schematic drawing (gear outline)
  children.push(createCircle(x + w2 * 0.4, y + h2 * 0.45, w2 * 0.15, 'none', { layer: 3, stroke: '#6A9ACA', strokeWidth: 0.8 }));
  children.push(createCircle(x + w2 * 0.4, y + h2 * 0.45, w2 * 0.05, 'none', { layer: 3, stroke: '#6A9ACA', strokeWidth: 0.5 }));
  // Dimension lines
  children.push(createLine(x + w2 * 0.1, y + h2 * 0.8, x + w2 * 0.7, y + h2 * 0.8, '#6A9ACA', { strokeWidth: 0.5, layer: 3 }));
  return createGroup(x, y, children, { layer: 3, category: 'blueprint', modifiable: true, id: uid('bp'), rotation: rng.nextFloat(-5, 5) });
}

// Clockwork mechanism
function clockwork(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  // Backing plate
  children.push(createCircle(x, y, s, '#C8A830', { layer: 2, stroke: '#8A7020', strokeWidth: 1.5 }));
  children.push(createCircle(x, y, s * 0.9, '#2A2015', { layer: 2 }));
  // Inner gears (small)
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 + rng.nextFloat(0, 0.5);
    const gx = x + Math.cos(angle) * s * 0.4;
    const gy = y + Math.sin(angle) * s * 0.4;
    const gr = s * rng.nextFloat(0.15, 0.25);
    let d = '';
    const tCount = rng.nextInt(6, 10);
    for (let t = 0; t < tCount; t++) {
      const a1 = (t / tCount) * Math.PI * 2;
      const a2 = ((t + 0.4) / tCount) * Math.PI * 2;
      const p1x = gx + Math.cos(a1) * gr * 0.7, p1y = gy + Math.sin(a1) * gr * 0.7;
      const p2x = gx + Math.cos(a1) * gr, p2y = gy + Math.sin(a1) * gr;
      const p3x = gx + Math.cos(a2) * gr, p3y = gy + Math.sin(a2) * gr;
      const p4x = gx + Math.cos(a2) * gr * 0.7, p4y = gy + Math.sin(a2) * gr * 0.7;
      d += (t === 0 ? 'M' : 'L') + `${p1x},${p1y} L${p2x},${p2y} L${p3x},${p3y} L${p4x},${p4y} `;
    }
    d += 'Z';
    children.push(createPath(gx, gy, d, '#C8A830', { layer: 2, opacity: 0.8 }));
    children.push(createCircle(gx, gy, gr * 0.2, '#4A3A20', { layer: 2 }));
  }
  // Central spindle
  children.push(createCircle(x, y, s * 0.1, '#E8D060', { layer: 2 }));
  return createGroup(x, y, children, { layer: 2, category: 'clockwork', modifiable: true, id: uid('clock'), filter: 'url(#shadow)' });
}

export function generateSteampunkWorkshop(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  const defs = combineDefs(
    indoorDefs(),
    dropShadow('shadow', 2, 3, 3, 'rgba(0,0,0,0.35)'),
    softGlow('warmGlow', 8, '#FFD700'),
    wallGradient('wallGrad', '#3A3025', '#2A2018'),
    floorGradient('floorGrad', '#5A4A35', '#3A3020'),
    linearGradient('ceilingGrad', [
      { offset: '0%', color: '#1A1510' },
      { offset: '100%', color: '#2A2218' },
    ]),
    radialGradient('bulbGlow', [
      { offset: '0%', color: '#FFE888', opacity: 0.5 },
      { offset: '50%', color: '#FFD060', opacity: 0.15 },
      { offset: '100%', color: '#FFC040', opacity: 0 },
    ]),
    linearGradient('copperPipe', [
      { offset: '0%', color: '#CD9B1D' },
      { offset: '50%', color: '#E8C060' },
      { offset: '100%', color: '#B8860B' },
    ]),
  );

  // ═══════════════════════════════════════
  // LAYER 0 — Workshop walls and floor
  // ═══════════════════════════════════════
  // Back wall
  elements.push(createRect(0, 0, w, h * 0.65, 'url(#wallGrad)', { layer: 0, category: 'wall', modifiable: false }));
  // Ceiling
  elements.push(createRect(0, 0, w, h * 0.06, 'url(#ceilingGrad)', { layer: 0, category: 'ceiling', modifiable: false }));
  // Floor
  elements.push(createRect(0, h * 0.65, w, h * 0.35, 'url(#floorGrad)', { layer: 0, category: 'floor', modifiable: false }));
  // Baseboard
  elements.push(createRect(0, h * 0.63, w, h * 0.03, '#2A2015', { layer: 1, category: 'wall', modifiable: false }));

  // Brick texture on walls (subtle)
  for (let r = 0; r < 12; r++) {
    for (let c = 0; c < 20; c++) {
      const bx = c * 42 + (r % 2 === 0 ? 0 : 21);
      const by = h * 0.06 + r * 48;
      if (by > h * 0.63) continue;
      elements.push(createRect(bx, by, 40, 18, '#3A3025', {
        layer: 0, category: 'wall', modifiable: false, opacity: rng.nextFloat(0.05, 0.15),
        stroke: '#2A2018', strokeWidth: 0.3,
      }));
    }
  }

  // ═══════════════════════════════════════
  // LAYER 1 — Large background gears (wall decoration)
  // ═══════════════════════════════════════
  const bgGearColors = ['#4A3A28', '#3A2A18', '#5A4A35'];
  elements.push(gear(w * 0.15, h * 0.25, 60, 42, 12, rng.pick(bgGearColors), rng));
  elements.push(gear(w * 0.28, h * 0.18, 40, 28, 10, rng.pick(bgGearColors), rng));
  elements.push(gear(w * 0.85, h * 0.22, 50, 35, 11, rng.pick(bgGearColors), rng));

  // ═══════════════════════════════════════
  // LAYER 2 — Brass pipes along wall
  // ═══════════════════════════════════════
  // Horizontal pipes
  elements.push(brassPipe(0, h * 0.1, w * 0.4, h * 0.1, 6, rng));
  elements.push(brassPipe(w * 0.6, h * 0.08, w, h * 0.08, 5, rng));
  // Vertical pipe connecting
  elements.push(brassPipe(w * 0.4, h * 0.1, w * 0.4, h * 0.35, 6, rng));
  elements.push(brassPipe(w * 0.6, h * 0.08, w * 0.6, h * 0.4, 5, rng));
  // Diagonal pipe
  elements.push(brassPipe(w * 0.4, h * 0.35, w * 0.6, h * 0.4, 4, rng));

  // ═══════════════════════════════════════
  // LAYER 2 — Pressure gauges on pipes
  // ═══════════════════════════════════════
  elements.push(pressureGauge(w * 0.2, h * 0.1, rng.nextFloat(12, 18), rng));
  elements.push(pressureGauge(w * 0.5, h * 0.22, rng.nextFloat(10, 15), rng));
  elements.push(pressureGauge(w * 0.75, h * 0.08, rng.nextFloat(11, 16), rng));

  // ═══════════════════════════════════════
  // LAYER 2 — Steam valves
  // ═══════════════════════════════════════
  elements.push(steamValve(w * 0.4, h * 0.22, rng.nextFloat(12, 18), rng));
  elements.push(steamValve(w * 0.6, h * 0.25, rng.nextFloat(10, 14), rng));

  // ═══════════════════════════════════════
  // LAYER 2 — Workbench
  // ═══════════════════════════════════════
  const benchX = w * 0.1;
  const benchY = h * 0.48;
  const benchW = w * 0.5;
  const benchH = h * 0.22;
  elements.push(workbench(benchX, benchY, benchW, benchH, rng));

  // ═══════════════════════════════════════
  // LAYER 3 — Tools on workbench
  // ═══════════════════════════════════════
  const toolTypes: ('wrench' | 'hammer' | 'screwdriver')[] = ['wrench', 'hammer', 'screwdriver'];
  for (let i = 0; i < 3; i++) {
    elements.push(tool(
      benchX + benchW * (0.15 + i * 0.25) + rng.nextFloat(-10, 10),
      benchY - rng.nextFloat(5, 20),
      toolTypes[i],
      rng.nextFloat(18, 28), rng,
    ));
  }

  // ═══════════════════════════════════════
  // LAYER 3 — Blueprint on bench
  // ═══════════════════════════════════════
  elements.push(blueprint(benchX + benchW * 0.55, benchY - rng.nextFloat(2, 8), benchW * 0.35, benchH * 0.35, rng));

  // ═══════════════════════════════════════
  // LAYER 3 — Flying goggles on bench
  // ═══════════════════════════════════════
  elements.push(goggles(benchX + benchW * 0.85, benchY - rng.nextFloat(8, 15), rng.nextFloat(18, 25), rng));

  // ═══════════════════════════════════════
  // LAYER 3 — Top hat (on hook or stand)
  // ═══════════════════════════════════════
  elements.push(topHat(w * rng.nextFloat(0.68, 0.78), h * rng.nextFloat(0.35, 0.45), rng.nextFloat(25, 35), rng));

  // ═══════════════════════════════════════
  // LAYER 2 — Clockwork mechanism on wall
  // ═══════════════════════════════════════
  elements.push(clockwork(w * rng.nextFloat(0.72, 0.85), h * rng.nextFloat(0.38, 0.5), rng.nextFloat(30, 45), rng));

  // ═══════════════════════════════════════
  // LAYER 3 — Edison lightbulbs hanging from ceiling
  // ═══════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const bx = w * (0.15 + i * 0.2) + rng.nextFloat(-20, 20);
    elements.push(lightbulb(bx, h * rng.nextFloat(0.06, 0.14), rng.nextFloat(22, 32), rng));
  }

  // ═══════════════════════════════════════
  // LAYER 4 — Steam clouds
  // ═══════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    elements.push(steamCloud(rng.nextFloat(w * 0.1, w * 0.9), rng.nextFloat(h * 0.05, h * 0.4), rng.nextFloat(25, 50), rng));
  }

  // ═══════════════════════════════════════
  // LAYER 3 — Small foreground gears (on bench/floor)
  // ═══════════════════════════════════════
  const fgGearColors = ['#C8A830', '#B89828', '#D8B840'];
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const gx = rng.nextFloat(w * 0.15, w * 0.85);
    const gy = rng.nextFloat(h * 0.5, h * 0.62);
    elements.push(gear(gx, gy, rng.nextFloat(8, 16), rng.nextFloat(5, 10), rng.nextInt(6, 10), rng.pick(fgGearColors), rng));
  }

  // ═══════════════════════════════════════
  // LAYER 3 — "WORKSHOP" text sign
  // ═══════════════════════════════════════
  elements.push(createText(w * 0.35, h * 0.58, 'WORKSHOP', '#B8860B', {
    layer: 3, category: 'text', modifiable: true, id: uid('sign'), fontSize: 14, fontFamily: 'serif',
  }));

  // ═══════════════════════════════════════
  // LAYER 4 — Warm ambient vignette
  // ═══════════════════════════════════════
  elements.push(createRect(0, 0, w, h * 0.04, '#1A1008', { layer: 4, category: 'vignette', modifiable: false, opacity: 0.4 }));
  elements.push(createRect(0, h * 0.95, w, h * 0.05, '#1A1008', { layer: 4, category: 'vignette', modifiable: false, opacity: 0.3 }));

  return { elements, defs };
}
