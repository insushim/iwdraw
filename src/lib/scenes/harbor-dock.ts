import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath,
  createLine, createGroup, createText,
} from '../engine/primitives';
import {
  combineDefs, outdoorDefs, skyGradient, linearGradient,
  radialGradient, waterGradient,
} from './svg-effects';
import {
  detailedCloud, detailedBird, detailedPerson, detailedRock,
  resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'hd') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// ── Helper components ──

function fishingBoat(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const hullColor = rng.pick(['#4A3020', '#5C3317', '#6B4226', '#8B4513']);
  const cabinColor = rng.pick(['#F5F0E0', '#E8E0D0', '#FFF8E8']);
  // Hull
  const hullPath = `M${x - s * 0.5},${y} Q${x - s * 0.55},${y + s * 0.15} ${x - s * 0.4},${y + s * 0.25} L${x + s * 0.4},${y + s * 0.25} Q${x + s * 0.55},${y + s * 0.15} ${x + s * 0.5},${y} Z`;
  children.push(createPath(x, y, hullPath, hullColor, { layer: 2, stroke: '#333', strokeWidth: 1 }));
  // Hull stripe
  children.push(createPath(x, y, `M${x - s * 0.45},${y + s * 0.05} Q${x},${y + s * 0.08} ${x + s * 0.45},${y + s * 0.05}`, 'none', { layer: 2, stroke: rng.pick(['#CC2222', '#2255CC', '#FFFFFF']), strokeWidth: 2.5 }));
  // Cabin
  children.push(createRect(x - s * 0.15, y - s * 0.25, s * 0.3, s * 0.25, cabinColor, { layer: 2, stroke: '#AAA', strokeWidth: 0.5 }));
  // Cabin window
  children.push(createRect(x - s * 0.08, y - s * 0.2, s * 0.06, s * 0.08, '#87CEEB', { layer: 2, stroke: '#666', strokeWidth: 0.5 }));
  children.push(createRect(x + s * 0.02, y - s * 0.2, s * 0.06, s * 0.08, '#87CEEB', { layer: 2, stroke: '#666', strokeWidth: 0.5 }));
  // Cabin roof
  children.push(createRect(x - s * 0.18, y - s * 0.28, s * 0.36, s * 0.04, '#555', { layer: 2 }));
  // Mast
  children.push(createLine(x + s * 0.2, y - s * 0.25, x + s * 0.2, y - s * 0.6, '#8B6914', { strokeWidth: 2.5, layer: 2 }));
  // Boom / pole
  children.push(createLine(x + s * 0.2, y - s * 0.55, x + s * 0.45, y - s * 0.45, '#8B6914', { strokeWidth: 1.5, layer: 2 }));
  // Water reflection
  children.push(createEllipse(x, y + s * 0.3, s * 0.4, s * 0.06, hullColor, { layer: 1, opacity: 0.15 }));
  return createGroup(x, y, children, { layer: 2, category: 'boat', modifiable: true, id: uid('fboat'), filter: 'url(#shadow)' });
}

function sailboat(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const hullColor = rng.pick(['#FFFFFF', '#F0E8D8', '#2244AA', '#CC3333']);
  const sailColor = rng.pick(['#FFFFFF', '#FFF8E8', '#FFFFF0']);
  // Hull
  const hullPath = `M${x - s * 0.35},${y} Q${x - s * 0.38},${y + s * 0.1} ${x - s * 0.25},${y + s * 0.18} L${x + s * 0.25},${y + s * 0.18} Q${x + s * 0.38},${y + s * 0.1} ${x + s * 0.35},${y} Z`;
  children.push(createPath(x, y, hullPath, hullColor, { layer: 2, stroke: '#555', strokeWidth: 1 }));
  // Mast
  children.push(createLine(x, y, x, y - s * 0.8, '#5C3317', { strokeWidth: 2.5, layer: 2 }));
  // Main sail
  const sailPath = `M${x},${y - s * 0.75} L${x + s * 0.35},${y - s * 0.1} L${x},${y - s * 0.08} Z`;
  children.push(createPath(x, y, sailPath, sailColor, { layer: 2, opacity: 0.92, stroke: '#CCC', strokeWidth: 0.5 }));
  // Jib sail
  const jibPath = `M${x},${y - s * 0.7} L${x - s * 0.2},${y - s * 0.1} L${x},${y - s * 0.12} Z`;
  children.push(createPath(x, y, jibPath, sailColor, { layer: 2, opacity: 0.8 }));
  // Flag at top
  children.push(createPath(x, y, `M${x},${y - s * 0.8} L${x + s * 0.08},${y - s * 0.83} L${x},${y - s * 0.86}`, rng.pick(['#FF0000', '#0000FF', '#FFD700']), { layer: 2, opacity: 0.8 }));
  // Water reflection
  children.push(createEllipse(x, y + s * 0.22, s * 0.28, s * 0.04, sailColor, { layer: 1, opacity: 0.1 }));
  return createGroup(x, y, children, { layer: 2, category: 'boat', modifiable: true, id: uid('sail'), filter: 'url(#shadow)' });
}

function lighthouse(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const stripeColor = rng.pick(['#CC2222', '#2255CC', '#333']);
  // Tower - tapered
  const towerPath = `M${x - s * 0.12},${y} L${x - s * 0.08},${y - s * 0.7} L${x + s * 0.08},${y - s * 0.7} L${x + s * 0.12},${y} Z`;
  children.push(createPath(x, y, towerPath, '#FFFFFF', { layer: 2, stroke: '#CCC', strokeWidth: 0.8 }));
  // Stripes
  const stripeCount = 4;
  for (let i = 0; i < stripeCount; i++) {
    const t1 = (i * 2) / (stripeCount * 2);
    const t2 = (i * 2 + 1) / (stripeCount * 2);
    const ly1 = y - s * 0.7 * t1;
    const ly2 = y - s * 0.7 * t2;
    const lw1 = s * (0.12 - 0.04 * t1);
    const lw2 = s * (0.12 - 0.04 * t2);
    children.push(createPath(x, y, `M${x - lw1},${ly1} L${x - lw2},${ly2} L${x + lw2},${ly2} L${x + lw1},${ly1} Z`, stripeColor, { layer: 2 }));
  }
  // Light room
  children.push(createRect(x - s * 0.1, y - s * 0.78, s * 0.2, s * 0.08, '#333', { layer: 2 }));
  // Glass windows
  children.push(createRect(x - s * 0.07, y - s * 0.77, s * 0.14, s * 0.06, '#FFD700', { layer: 2, opacity: 0.8 }));
  // Roof
  const roofPath = `M${x},${y - s * 0.92} L${x - s * 0.12},${y - s * 0.78} L${x + s * 0.12},${y - s * 0.78} Z`;
  children.push(createPath(x, y, roofPath, '#555', { layer: 2 }));
  // Light beam
  children.push(createCircle(x, y - s * 0.74, s * 0.25, '#FFD700', { layer: 2, opacity: 0.08 }));
  // Door
  children.push(createRect(x - s * 0.035, y - s * 0.08, s * 0.07, s * 0.08, '#5C3317', { layer: 2 }));
  return createGroup(x, y, children, { layer: 2, category: 'lighthouse', modifiable: true, id: uid('lhouse'), filter: 'url(#shadow)' });
}

function barrel(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const barrelColor = rng.pick(['#8B6914', '#A0784C', '#7A5A30']);
  // Body
  children.push(createEllipse(x, y + s * 0.02, s * 0.3, s * 0.08, barrelColor, { layer: 3 }));
  children.push(createRect(x - s * 0.28, y - s * 0.45, s * 0.56, s * 0.5, barrelColor, { layer: 3 }));
  children.push(createEllipse(x, y - s * 0.45, s * 0.28, s * 0.07, '#A08858', { layer: 3 }));
  // Metal bands
  children.push(createEllipse(x, y - s * 0.1, s * 0.3, s * 0.075, 'none', { layer: 3, stroke: '#555', strokeWidth: 1.5 }));
  children.push(createEllipse(x, y - s * 0.32, s * 0.29, s * 0.07, 'none', { layer: 3, stroke: '#555', strokeWidth: 1.5 }));
  return createGroup(x, y, children, { layer: 3, category: 'barrel', modifiable: true, id: uid('barrel') });
}

function anchor(x: number, y: number, s: number): SVGElementData {
  const children: SVGElementData[] = [];
  const color = '#444';
  // Shank (vertical)
  children.push(createLine(x, y - s * 0.8, x, y + s * 0.1, color, { strokeWidth: 3, layer: 3 }));
  // Ring at top
  children.push(createCircle(x, y - s * 0.85, s * 0.08, 'none', { layer: 3, stroke: color, strokeWidth: 2.5 }));
  // Stock (horizontal bar near top)
  children.push(createLine(x - s * 0.25, y - s * 0.65, x + s * 0.25, y - s * 0.65, color, { strokeWidth: 2.5, layer: 3 }));
  // Arms (curved)
  children.push(createPath(x, y, `M${x},${y + s * 0.1} Q${x - s * 0.3},${y + s * 0.15} ${x - s * 0.3},${y - s * 0.1}`, 'none', { layer: 3, stroke: color, strokeWidth: 2.5 }));
  children.push(createPath(x, y, `M${x},${y + s * 0.1} Q${x + s * 0.3},${y + s * 0.15} ${x + s * 0.3},${y - s * 0.1}`, 'none', { layer: 3, stroke: color, strokeWidth: 2.5 }));
  // Flukes (tips of arms)
  children.push(createPath(x, y, `M${x - s * 0.3},${y - s * 0.1} L${x - s * 0.35},${y - s * 0.02} L${x - s * 0.25},${y - s * 0.05} Z`, color, { layer: 3 }));
  children.push(createPath(x, y, `M${x + s * 0.3},${y - s * 0.1} L${x + s * 0.35},${y - s * 0.02} L${x + s * 0.25},${y - s * 0.05} Z`, color, { layer: 3 }));
  return createGroup(x, y, children, { layer: 3, category: 'anchor', modifiable: true, id: uid('anchor') });
}

function crab(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const crabColor = rng.pick(['#CC4422', '#DD5533', '#BB3311']);
  // Body
  children.push(createEllipse(x, y, s * 0.35, s * 0.25, crabColor, { layer: 3 }));
  // Eyes on stalks
  children.push(createLine(x - s * 0.15, y - s * 0.2, x - s * 0.2, y - s * 0.35, crabColor, { strokeWidth: 2, layer: 3 }));
  children.push(createCircle(x - s * 0.2, y - s * 0.37, s * 0.05, '#1A1A1A', { layer: 3 }));
  children.push(createLine(x + s * 0.15, y - s * 0.2, x + s * 0.2, y - s * 0.35, crabColor, { strokeWidth: 2, layer: 3 }));
  children.push(createCircle(x + s * 0.2, y - s * 0.37, s * 0.05, '#1A1A1A', { layer: 3 }));
  // Claws
  children.push(createPath(x, y, `M${x - s * 0.35},${y - s * 0.05} L${x - s * 0.6},${y - s * 0.15} L${x - s * 0.55},${y - s * 0.25} L${x - s * 0.45},${y - s * 0.18} Z`, crabColor, { layer: 3 }));
  children.push(createPath(x, y, `M${x - s * 0.6},${y - s * 0.15} L${x - s * 0.65},${y - s * 0.3} M${x - s * 0.6},${y - s * 0.15} L${x - s * 0.7},${y - s * 0.18}`, 'none', { layer: 3, stroke: crabColor, strokeWidth: 2 }));
  children.push(createPath(x, y, `M${x + s * 0.35},${y - s * 0.05} L${x + s * 0.6},${y - s * 0.15} L${x + s * 0.55},${y - s * 0.25} L${x + s * 0.45},${y - s * 0.18} Z`, crabColor, { layer: 3 }));
  children.push(createPath(x, y, `M${x + s * 0.6},${y - s * 0.15} L${x + s * 0.65},${y - s * 0.3} M${x + s * 0.6},${y - s * 0.15} L${x + s * 0.7},${y - s * 0.18}`, 'none', { layer: 3, stroke: crabColor, strokeWidth: 2 }));
  // Legs (3 per side)
  for (let i = 0; i < 3; i++) {
    const ly = y + s * (0.0 + i * 0.08);
    children.push(createLine(x - s * 0.33, ly, x - s * 0.5, ly + s * 0.1, crabColor, { strokeWidth: 1.5, layer: 3 }));
    children.push(createLine(x + s * 0.33, ly, x + s * 0.5, ly + s * 0.1, crabColor, { strokeWidth: 1.5, layer: 3 }));
  }
  return createGroup(x, y, children, { layer: 3, category: 'crab', modifiable: true, id: uid('crab') });
}

function warehouse(x: number, y: number, w2: number, h2: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const wallColor = rng.pick(['#A09080', '#908070', '#B0A090', '#807060']);
  // Main building
  children.push(createRect(x, y, w2, h2, wallColor, { layer: 1, stroke: '#666', strokeWidth: 1 }));
  // Roof
  const roofPath = `M${x - 5},${y} L${x + w2 / 2},${y - h2 * 0.25} L${x + w2 + 5},${y} Z`;
  children.push(createPath(x, y, roofPath, '#666', { layer: 1, stroke: '#555', strokeWidth: 0.5 }));
  // Large door
  children.push(createRect(x + w2 * 0.3, y + h2 * 0.4, w2 * 0.4, h2 * 0.6, '#5C3317', { layer: 1, stroke: '#4A2810', strokeWidth: 1 }));
  children.push(createLine(x + w2 * 0.5, y + h2 * 0.4, x + w2 * 0.5, y + h2, '#4A2810', { strokeWidth: 1, layer: 1 }));
  // Windows
  children.push(createRect(x + w2 * 0.08, y + h2 * 0.15, w2 * 0.15, w2 * 0.12, '#87CEEB', { layer: 1, stroke: '#666', strokeWidth: 0.5 }));
  children.push(createRect(x + w2 * 0.75, y + h2 * 0.15, w2 * 0.15, w2 * 0.12, '#87CEEB', { layer: 1, stroke: '#666', strokeWidth: 0.5 }));
  return createGroup(x, y, children, { layer: 1, category: 'warehouse', modifiable: true, id: uid('whouse') });
}

function dockRope(x1: number, y1: number, x2: number, y2: number, rng: SeededRandom): SVGElementData {
  const mx = (x1 + x2) / 2;
  const my = Math.max(y1, y2) + rng.nextFloat(8, 20);
  const ropePath = `M${x1},${y1} Q${mx},${my} ${x2},${y2}`;
  return createPath(0, 0, ropePath, 'none', { layer: 3, stroke: '#A08858', strokeWidth: 2.5, category: 'rope', modifiable: true, id: uid('rope') });
}

function crane(x: number, y: number, s: number): SVGElementData {
  const children: SVGElementData[] = [];
  const metalColor = '#666';
  // Base
  children.push(createRect(x - s * 0.1, y - s * 0.05, s * 0.2, s * 0.05, '#444', { layer: 2 }));
  // Tower
  children.push(createRect(x - s * 0.04, y - s * 0.8, s * 0.08, s * 0.8, metalColor, { layer: 2 }));
  // Cross braces on tower
  for (let i = 0; i < 4; i++) {
    const ty = y - s * (0.15 + i * 0.16);
    children.push(createLine(x - s * 0.04, ty, x + s * 0.04, ty - s * 0.12, metalColor, { strokeWidth: 1, layer: 2, opacity: 0.6 }));
    children.push(createLine(x + s * 0.04, ty, x - s * 0.04, ty - s * 0.12, metalColor, { strokeWidth: 1, layer: 2, opacity: 0.6 }));
  }
  // Boom arm
  children.push(createLine(x, y - s * 0.78, x + s * 0.6, y - s * 0.7, metalColor, { strokeWidth: 3, layer: 2 }));
  // Counter-boom
  children.push(createLine(x, y - s * 0.78, x - s * 0.2, y - s * 0.72, metalColor, { strokeWidth: 3, layer: 2 }));
  // Counter weight
  children.push(createRect(x - s * 0.22, y - s * 0.72, s * 0.06, s * 0.08, '#444', { layer: 2 }));
  // Cable from boom
  children.push(createLine(x + s * 0.5, y - s * 0.72, x + s * 0.5, y - s * 0.35, '#333', { strokeWidth: 1, layer: 2 }));
  // Hook
  children.push(createPath(0, 0, `M${x + s * 0.5},${y - s * 0.35} Q${x + s * 0.5 - 4},${y - s * 0.28} ${x + s * 0.5},${y - s * 0.25}`, 'none', { layer: 2, stroke: '#333', strokeWidth: 2 }));
  return createGroup(x, y, children, { layer: 2, category: 'crane', modifiable: true, id: uid('crane'), filter: 'url(#shadow)' });
}

// ══════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ══════════════════════════════════════════════════════════════

export function generateHarborDock(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  const skyTop = rng.pick(['#4A90D9', '#5090D0', '#3A80C8']);
  const skyMid = rng.pick(['#7AB8E0', '#80BEE5', '#6CB0D8']);
  const skyBot = rng.pick(['#B0D4F1', '#BBDDEE', '#A8CDE8']);

  const defs = combineDefs(
    outdoorDefs(),
    skyGradient('skyGrad', skyTop, skyMid, skyBot),
    waterGradient('waterGrad', '#2080A0', '#0A4060'),
    linearGradient('dockGrad', [
      { offset: '0%', color: '#A08858' },
      { offset: '50%', color: '#8B7648' },
      { offset: '100%', color: '#7A6438' },
    ]),
    linearGradient('distantWaterGrad', [
      { offset: '0%', color: '#5AA8C8' },
      { offset: '100%', color: '#3888A8' },
    ]),
    radialGradient('sunReflection', [
      { offset: '0%', color: '#FFFFFF', opacity: 0.2 },
      { offset: '100%', color: '#FFFFFF', opacity: 0 },
    ]),
  );

  // ════════════════════════════════════════════
  //  LAYER 0 -- Sky
  // ════════════════════════════════════════════
  elements.push(createRect(0, 0, w, h * 0.35, 'url(#skyGrad)', { layer: 0, category: 'sky', modifiable: false }));

  // Clouds
  for (let i = 0; i < rng.nextInt(2, 5); i++) {
    elements.push(detailedCloud(rng.nextFloat(20, w - 80), rng.nextFloat(10, h * 0.15), rng.nextFloat(40, 70), rng));
  }

  // Sun
  const sunX = w * 0.15;
  const sunY = h * 0.08;
  elements.push(createCircle(sunX, sunY, 22, '#FFD700', { layer: 0, category: 'sun', modifiable: true, id: uid('sun'), opacity: 0.85 }));
  elements.push(createCircle(sunX, sunY, 40, '#FFD700', { layer: 0, modifiable: false, opacity: 0.08 }));

  // ════════════════════════════════════════════
  //  LAYER 0 -- Distant shoreline
  // ════════════════════════════════════════════
  const shoreY = h * 0.32;
  elements.push(createPath(0, 0, `M0,${shoreY} Q${w * 0.15},${shoreY - 8} ${w * 0.3},${shoreY + 2} Q${w * 0.5},${shoreY + 6} ${w * 0.7},${shoreY - 3} Q${w * 0.85},${shoreY - 8} ${w},${shoreY + 4} L${w},${shoreY + 15} L0,${shoreY + 15} Z`, '#6A8A5A', { layer: 0, category: 'shore', modifiable: false, opacity: 0.5 }));

  // ════════════════════════════════════════════
  //  LAYER 1 -- Ocean water
  // ════════════════════════════════════════════
  elements.push(createRect(0, h * 0.35, w, h * 0.65, 'url(#waterGrad)', { layer: 1, category: 'water', modifiable: false }));

  // Water ripples / wave lines
  for (let i = 0; i < 12; i++) {
    const wy = h * 0.38 + i * (h * 0.05);
    const waveAmplitude = rng.nextFloat(3, 8);
    const wavePhase = rng.nextFloat(0, 100);
    elements.push(createPath(0, 0, `M0,${wy} Q${w * 0.15 + wavePhase},${wy - waveAmplitude} ${w * 0.3},${wy} Q${w * 0.45 + wavePhase},${wy + waveAmplitude} ${w * 0.6},${wy} Q${w * 0.75 + wavePhase},${wy - waveAmplitude * 0.7} ${w},${wy}`, 'none', {
      layer: 1, stroke: '#FFFFFF', strokeWidth: 0.8, opacity: rng.nextFloat(0.05, 0.15), category: 'wave', modifiable: false,
    }));
  }

  // Sun reflection on water
  elements.push(createEllipse(sunX + 20, h * 0.42, 35, 8, 'url(#sunReflection)', { layer: 1, modifiable: false, opacity: 0.4 }));

  // ════════════════════════════════════════════
  //  LAYER 1 -- Lighthouse (distant)
  // ════════════════════════════════════════════
  elements.push(lighthouse(w * 0.88, h * 0.28, 55, rng));

  // ════════════════════════════════════════════
  //  LAYER 2 -- Boats
  // ════════════════════════════════════════════
  elements.push(fishingBoat(w * 0.25, h * 0.42, 70, rng));
  elements.push(sailboat(w * 0.55, h * 0.38, 55, rng));
  elements.push(fishingBoat(w * 0.75, h * 0.45, 55, rng));

  // ════════════════════════════════════════════
  //  LAYER 2 -- Warehouses / buildings on shore
  // ════════════════════════════════════════════
  elements.push(warehouse(10, h * 0.38, 80, 55, rng));
  elements.push(warehouse(100, h * 0.4, 65, 50, rng));

  // Crane
  elements.push(crane(200, h * 0.56, 100));

  // ════════════════════════════════════════════
  //  LAYER 2 -- Wooden dock / pier
  // ════════════════════════════════════════════
  const dockY = h * 0.55;
  const dockH = 20;
  // Main dock platform
  elements.push(createRect(0, dockY, w * 0.7, dockH, 'url(#dockGrad)', { layer: 2, category: 'dock', modifiable: false, stroke: '#6A5430', strokeWidth: 1 }));
  // Planks
  const plankCount = 20;
  for (let i = 0; i < plankCount; i++) {
    const px = i * (w * 0.7 / plankCount);
    elements.push(createLine(px, dockY, px, dockY + dockH, '#6A5430', { strokeWidth: 0.5, layer: 2, opacity: 0.3 }));
  }
  // Dock supports / pilings
  for (let i = 0; i < 6; i++) {
    const pilX = 30 + i * (w * 0.7 / 6);
    elements.push(createRect(pilX - 4, dockY + dockH, 8, 35, '#7A5A30', { layer: 2, category: 'piling', modifiable: false }));
  }

  // Extended pier going into water
  const pierX = w * 0.35;
  const pierW = 40;
  elements.push(createRect(pierX, dockY, pierW, h * 0.3, 'url(#dockGrad)', { layer: 2, category: 'pier', modifiable: false, stroke: '#6A5430', strokeWidth: 1 }));
  // Pier planks
  for (let i = 0; i < 10; i++) {
    const py = dockY + i * (h * 0.3 / 10);
    elements.push(createLine(pierX, py, pierX + pierW, py, '#6A5430', { strokeWidth: 0.5, layer: 2, opacity: 0.3 }));
  }

  // Dock bollards for ropes
  for (let i = 0; i < 3; i++) {
    const bx = 60 + i * 160;
    const by = dockY;
    elements.push(createRect(bx - 4, by - 10, 8, 10, '#555', { layer: 3 }));
    elements.push(createEllipse(bx, by - 10, 6, 3, '#666', { layer: 3 }));
  }

  // Ropes hanging between bollards
  elements.push(dockRope(60, dockY - 5, 220, dockY - 5, rng));
  elements.push(dockRope(220, dockY - 5, 380, dockY - 5, rng));

  // ════════════════════════════════════════════
  //  LAYER 3 -- Dock items (barrels, crab, anchor)
  // ════════════════════════════════════════════
  elements.push(barrel(w * 0.08, dockY - 5, 22, rng));
  elements.push(barrel(w * 0.12, dockY - 3, 20, rng));
  elements.push(barrel(w * 0.52, dockY - 4, 24, rng));

  // Anchor leaning against barrel
  elements.push(anchor(w * 0.16, dockY - 2, 25));

  // Crab on the dock
  elements.push(crab(w * 0.6, dockY - 4, 12, rng));

  // ════════════════════════════════════════════
  //  LAYER 3 -- People on dock
  // ════════════════════════════════════════════
  elements.push(detailedPerson(w * 0.3, dockY - 5, rng.nextFloat(55, 70), rng));
  elements.push(detailedPerson(w * 0.45, dockY - 3, rng.nextFloat(50, 65), rng));

  // Rocks along shoreline
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(detailedRock(w * rng.nextFloat(0.72, 0.98), h * rng.nextFloat(0.55, 0.7), rng.nextFloat(15, 30), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 4 -- Seagulls
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    elements.push(detailedBird(rng.nextFloat(30, w - 30), rng.nextFloat(15, h * 0.3), rng.chance(0.5), rng));
  }

  // Harbor sign
  elements.push(createRect(w * 0.01, dockY - 32, 80, 25, '#4A3020', { layer: 3, category: 'sign', modifiable: true, id: uid('hsign'), stroke: '#3A2010', strokeWidth: 1.5 }));
  elements.push(createText(w * 0.01 + 8, dockY - 14, rng.pick(['HARBOR', 'PORT', 'DOCK']), '#FFF8DC', {
    layer: 3, category: 'text', modifiable: true, id: uid('htxt'), fontSize: 12,
  }));

  return { elements, defs };
}
