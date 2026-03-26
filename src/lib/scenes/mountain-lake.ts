import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath, createGroup, createLine, createPolygon,
} from '../engine/primitives';
import {
  combineDefs, outdoorDefs, daySkyGradient, waterGradient, groundGradient,
  sunGlowGradient, linearGradient, waterRipple, grassPattern,
} from './svg-effects';
import {
  detailedTree, detailedCloud, detailedMountain, detailedFlower, detailedRock,
  detailedBird, detailedButterfly,
  resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'ml') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// Wooden dock / pier extending into water
function createDock(x: number, y: number, length: number, width: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const plankColor = rng.pick(['#8B6914', '#A0522D', '#7B5B3A']);
  const plankDark = '#5C3A1E';
  const planks = Math.floor(length / 12);

  // Support posts
  children.push(createRect(x - 2, y - 3, 4, width + 8, '#5C3317', { layer: 2, opacity: 0.7 }));
  children.push(createRect(x + length * 0.5 - 2, y - 3, 4, width + 8, '#5C3317', { layer: 2, opacity: 0.7 }));
  children.push(createRect(x + length - 4, y - 3, 4, width + 8, '#5C3317', { layer: 2, opacity: 0.7 }));

  // Planks
  for (let i = 0; i < planks; i++) {
    const px = x + i * 12;
    children.push(createRect(px, y, 10, width, plankColor, { layer: 2, stroke: plankDark, strokeWidth: 0.5 }));
  }

  // Side rails
  children.push(createRect(x, y - 1, length, 2, plankDark, { layer: 2 }));
  children.push(createRect(x, y + width - 1, length, 2, plankDark, { layer: 2 }));

  // Rope post at end
  children.push(createRect(x + length - 3, y + width * 0.3, 3, width * 0.4, '#5C3317', { layer: 2 }));
  children.push(createCircle(x + length - 1.5, y + width * 0.3, 2, '#5C3317', { layer: 2 }));

  return createGroup(x, y, children, { layer: 2, category: 'dock', modifiable: true, id: uid('dock'), filter: 'url(#shadow)' });
}

// Fishing boat
function createBoat(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const boatColor = rng.pick(['#8B4513', '#A0522D', '#6B3410', '#4A6741']);

  // Hull
  const hullD = `M${x - s * 0.4},${y} Q${x - s * 0.45},${y + s * 0.15} ${x - s * 0.3},${y + s * 0.22} L${x + s * 0.3},${y + s * 0.22} Q${x + s * 0.45},${y + s * 0.15} ${x + s * 0.4},${y} Z`;
  children.push(createPath(x, y, hullD, boatColor, { layer: 3, stroke: '#3E2723', strokeWidth: 1 }));

  // Seat plank
  children.push(createRect(x - s * 0.2, y + s * 0.05, s * 0.4, s * 0.04, '#A0522D', { layer: 3 }));

  // Oar
  children.push(createLine(x - s * 0.5, y - s * 0.1, x + s * 0.15, y + s * 0.18, '#8B7355', { strokeWidth: 2, layer: 3 }));
  children.push(createEllipse(x - s * 0.5, y - s * 0.1, s * 0.06, s * 0.03, '#6B3410', { layer: 3 }));

  // Rope coil
  children.push(createCircle(x + s * 0.15, y + s * 0.1, s * 0.04, '#C4A882', { layer: 3, stroke: '#8B7355', strokeWidth: 1 }));

  return createGroup(x, y, children, { layer: 3, category: 'boat', modifiable: true, id: uid('boat'), filter: 'url(#shadow)' });
}

// Lily pad with optional tiny flower
function createLilyPad(x: number, y: number, size: number, hasFlower: boolean, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const padColor = rng.pick(['#2E7D32', '#388E3C', '#1B5E20']);

  const padD = `M${x + s},${y} A${s},${s} 0 1,0 ${x + s * 0.1},${y - s * 0.15} L${x},${y} L${x + s * 0.15},${y + s * 0.1} A${s},${s} 0 0,0 ${x + s},${y} Z`;
  children.push(createPath(x, y, padD, padColor, { layer: 3, opacity: 0.75 }));

  // Veins on pad
  children.push(createLine(x, y, x + s * 0.7, y - s * 0.3, '#1B5E20', { strokeWidth: 0.5, layer: 3, opacity: 0.3 }));
  children.push(createLine(x, y, x + s * 0.5, y + s * 0.5, '#1B5E20', { strokeWidth: 0.5, layer: 3, opacity: 0.3 }));

  if (hasFlower) {
    const flowerColor = rng.pick(['#FFFFFF', '#FFB6C1', '#FFF0F5']);
    for (let p = 0; p < 5; p++) {
      const angle = (p * 72 + rng.nextFloat(-10, 10)) * Math.PI / 180;
      const px = x + s * 0.3 + Math.cos(angle) * s * 0.2;
      const py = y - s * 0.1 + Math.sin(angle) * s * 0.15;
      children.push(createEllipse(px, py, s * 0.1, s * 0.06, flowerColor, { rotation: p * 72, layer: 3, opacity: 0.9 }));
    }
    children.push(createCircle(x + s * 0.3, y - s * 0.1, s * 0.06, '#FFD700', { layer: 3 }));
  }

  return createGroup(x, y, children, { layer: 3, category: 'lilypad', modifiable: true, id: uid('lily') });
}

// Deer
function createDeer(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const bodyColor = rng.pick(['#8B6914', '#A0522D', '#C4955A']);

  children.push(createEllipse(x, y - s * 0.3, s * 0.3, s * 0.15, bodyColor, { layer: 3 }));
  children.push(createCircle(x + s * 0.3, y - s * 0.45, s * 0.08, bodyColor, { layer: 3 }));
  children.push(createPath(x, y, `M${x + s * 0.15},${y - s * 0.35} Q${x + s * 0.22},${y - s * 0.42} ${x + s * 0.25},${y - s * 0.42}`, 'none', { stroke: bodyColor, strokeWidth: s * 0.06, layer: 3 }));
  children.push(createCircle(x + s * 0.32, y - s * 0.47, s * 0.015, '#111', { layer: 3 }));
  children.push(createEllipse(x + s * 0.34, y - s * 0.52, s * 0.025, s * 0.04, bodyColor, { layer: 3 }));

  // Antlers
  children.push(createPath(x, y, `M${x + s * 0.3},${y - s * 0.53} L${x + s * 0.27},${y - s * 0.65} L${x + s * 0.23},${y - s * 0.6}`, 'none', { stroke: '#5C3317', strokeWidth: 1.5, layer: 3 }));
  children.push(createPath(x, y, `M${x + s * 0.3},${y - s * 0.53} L${x + s * 0.35},${y - s * 0.65} L${x + s * 0.4},${y - s * 0.6}`, 'none', { stroke: '#5C3317', strokeWidth: 1.5, layer: 3 }));

  // Legs
  children.push(createRect(x - s * 0.12, y - s * 0.17, s * 0.035, s * 0.17, bodyColor, { layer: 3 }));
  children.push(createRect(x - s * 0.04, y - s * 0.17, s * 0.035, s * 0.17, bodyColor, { layer: 3 }));
  children.push(createRect(x + s * 0.08, y - s * 0.17, s * 0.035, s * 0.17, bodyColor, { layer: 3 }));
  children.push(createRect(x + s * 0.16, y - s * 0.17, s * 0.035, s * 0.17, bodyColor, { layer: 3 }));

  // Tail
  children.push(createCircle(x - s * 0.28, y - s * 0.32, s * 0.03, '#F5DEB3', { layer: 3 }));
  // Belly highlight
  children.push(createEllipse(x, y - s * 0.25, s * 0.2, s * 0.08, '#F5DEB3', { layer: 3, opacity: 0.4 }));

  return createGroup(x, y, children, { layer: 3, category: 'animal', modifiable: true, id: uid('deer'), filter: 'url(#shadow)' });
}

// Distant cabin
function createDistantCabin(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];

  children.push(createRect(x, y - s * 0.4, s, s * 0.4, '#8B6914', { layer: 1, opacity: 0.6 }));
  const roofPts = `${x - s * 0.08},${y - s * 0.4} ${x + s / 2},${y - s * 0.65} ${x + s + s * 0.08},${y - s * 0.4}`;
  children.push(createPolygon(x, y, roofPts, '#654321', { layer: 1, opacity: 0.6 }));
  children.push(createRect(x + s * 0.35, y - s * 0.3, s * 0.3, s * 0.15, '#FFD700', { layer: 1, opacity: 0.4 }));

  return createGroup(x, y, children, { layer: 1, category: 'cabin', modifiable: false, id: uid('cabin'), filter: 'url(#bgBlur)' });
}

export function generateMountainLake(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  // === SVG DEFS ===
  const defs = combineDefs(
    outdoorDefs(),
    daySkyGradient('skyGrad'),
    waterGradient('lakeGrad', '#0097A7', '#006064'),
    groundGradient('grassGrad', '#66BB6A', '#388E3C'),
    sunGlowGradient('sunGlow', '#FFF9C4', '#FFB300'),
    linearGradient('shoreGrad', [
      { offset: '0%', color: '#8D6E63' },
      { offset: '40%', color: '#6D4C41' },
      { offset: '100%', color: '#4E342E' },
    ]),
    grassPattern('grassPat', '#3a8d2e'),
    waterRipple('waterRipple'),
  );

  // ============================
  // === LAYER 0: SKY ===
  // ============================
  elements.push(createRect(0, 0, w, h * 0.4, 'url(#skyGrad)', { layer: 0, category: 'sky', modifiable: false, id: uid('sky') }));

  // Sun with radial glow
  const sunX = w * rng.nextFloat(0.75, 0.9);
  const sunY = h * rng.nextFloat(0.06, 0.12);
  elements.push(createCircle(sunX, sunY, 50, 'url(#sunGlow)', { layer: 0, category: 'sun', modifiable: false, opacity: 0.8, id: uid('sun_glow'), filter: 'url(#glow)' }));
  elements.push(createCircle(sunX, sunY, 22, '#FFD54F', { layer: 0, category: 'sun', modifiable: true, opacity: 0.95, id: uid('sun') }));

  // Clouds (4-6) - detailed components with depth blur
  const cloudCount = rng.nextInt(4, 6);
  for (let i = 0; i < cloudCount; i++) {
    const cx = rng.nextFloat(30, w - 80);
    const cy = rng.nextFloat(15, h * 0.18);
    const cs = rng.nextFloat(40, 80);
    const cloud = detailedCloud(cx, cy, cs, rng);
    cloud.filter = 'url(#bgBlur)';
    elements.push(cloud);
    // Cloud shadow underneath
    elements.push(createEllipse(cx, cy + cs * 0.3, cs * 0.5, cs * 0.08, '#90A4AE', {
      layer: 0, category: 'cloud_shadow', modifiable: false, opacity: 0.15, id: uid('cshadow'),
    }));
  }

  // ============================
  // === LAYER 0-1: MOUNTAINS (3-5) - detailed components
  // ============================
  const mtnCount = rng.nextInt(3, 5);
  for (let i = 0; i < mtnCount; i++) {
    const mx = rng.nextFloat(-80, w * 0.75);
    const mw = rng.nextFloat(200, 420);
    const mh = rng.nextFloat(100, 200);
    const depth = (i + 1) / mtnCount;

    // Detailed mountain with depth-of-field blur on distant ones
    const mtn = detailedMountain(mx, h * 0.4, mw, mh, rng);
    if (depth < 0.6) {
      mtn.filter = 'url(#bgBlur)';
    }
    elements.push(mtn);

    // Reflected mountain silhouette in lake
    const lightness = 35 + (1 - depth) * 25;
    const mColor = `hsl(210, 15%, ${lightness}%)`;
    const refPts = `${mx},${h * 0.4} ${mx + mw / 2},${h * 0.4 + mh * 0.5} ${mx + mw},${h * 0.4}`;
    elements.push(createPolygon(mx, h * 0.4, refPts, mColor, { layer: 1, category: 'reflection', modifiable: false, opacity: 0.12 + depth * 0.05, id: uid('mtn_ref'), filter: 'url(#waterRipple)' }));
  }

  // ============================
  // === LAYER 1: SHORE - GRASS AREA ===
  // ============================
  const leftShoreD = `M0,${h * 0.38} Q${w * 0.08},${h * 0.36} ${w * 0.15},${h * 0.42} Q${w * 0.22},${h * 0.48} ${w * 0.25},${h * 0.52} L${w * 0.25},${h} L0,${h} Z`;
  elements.push(createPath(0, 0, leftShoreD, 'url(#grassGrad)', { layer: 1, category: 'shore', modifiable: false, id: uid('shore_l') }));

  const rightShoreD = `M${w * 0.7},${h * 0.52} Q${w * 0.75},${h * 0.46} ${w * 0.82},${h * 0.42} Q${w * 0.9},${h * 0.38} ${w},${h * 0.4} L${w},${h} L${w * 0.7},${h} Z`;
  elements.push(createPath(0, 0, rightShoreD, 'url(#grassGrad)', { layer: 1, category: 'shore', modifiable: false, id: uid('shore_r') }));

  const bottomShoreD = `M0,${h * 0.78} Q${w * 0.15},${h * 0.74} ${w * 0.3},${h * 0.76} Q${w * 0.5},${h * 0.78} ${w * 0.7},${h * 0.75} Q${w * 0.85},${h * 0.73} ${w},${h * 0.76} L${w},${h} L0,${h} Z`;
  elements.push(createPath(0, 0, bottomShoreD, 'url(#grassGrad)', { layer: 1, category: 'shore', modifiable: false, id: uid('shore_b') }));

  // Grass pattern overlay on shore
  elements.push(createPath(0, 0, bottomShoreD, 'url(#grassPat)', { layer: 1, category: 'shore', modifiable: false, opacity: 0.25, id: uid('grass_overlay') }));

  // Dirt/grass transition
  const dirtTransD = `M0,${h * 0.79} Q${w * 0.2},${h * 0.77} ${w * 0.4},${h * 0.78} Q${w * 0.6},${h * 0.79} ${w * 0.8},${h * 0.76} Q${w * 0.95},${h * 0.75} ${w},${h * 0.77} L${w},${h * 0.8} Q${w * 0.8},${h * 0.79} ${w * 0.5},${h * 0.81} Q${w * 0.2},${h * 0.8} 0,${h * 0.82} Z`;
  elements.push(createPath(0, 0, dirtTransD, 'url(#shoreGrad)', { layer: 1, category: 'shore', modifiable: false, opacity: 0.6, id: uid('dirt') }));

  // ============================
  // === LAYER 1: LAKE ===
  // ============================
  const lakeD = `M${w * 0.15},${h * 0.42} Q${w * 0.1},${h * 0.5} ${w * 0.12},${h * 0.6} Q${w * 0.15},${h * 0.72} ${w * 0.25},${h * 0.76} Q${w * 0.45},${h * 0.8} ${w * 0.65},${h * 0.76} Q${w * 0.8},${h * 0.72} ${w * 0.83},${h * 0.6} Q${w * 0.85},${h * 0.5} ${w * 0.8},${h * 0.42} Q${w * 0.65},${h * 0.38} ${w * 0.5},${h * 0.38} Q${w * 0.3},${h * 0.38} ${w * 0.15},${h * 0.42} Z`;
  elements.push(createPath(0, 0, lakeD, 'url(#lakeGrad)', { layer: 1, category: 'lake', modifiable: false, id: uid('lake') }));

  // Surface highlight
  elements.push(createEllipse(w * 0.5, h * 0.45, w * 0.2, h * 0.02, '#FFFFFF', {
    layer: 1, category: 'lake', modifiable: false, opacity: 0.1, id: uid('lake_hi'),
  }));

  // Wave ripples on water surface
  for (let i = 0; i < rng.nextInt(8, 14); i++) {
    const rx = rng.nextFloat(w * 0.2, w * 0.75);
    const ry = rng.nextFloat(h * 0.42, h * 0.72);
    elements.push(createEllipse(rx, ry, rng.nextFloat(8, 25), rng.nextFloat(1.5, 4), '#B3E5FC', {
      layer: 2, category: 'ripple', modifiable: false, opacity: rng.nextFloat(0.1, 0.25), id: uid('ripple'),
    }));
  }

  // ============================
  // === LAYER 1: PEBBLES ALONG WATERLINE ===
  // ============================
  for (let i = 0; i < rng.nextInt(12, 20); i++) {
    const angle = rng.nextFloat(0, Math.PI * 2);
    const dist = rng.nextFloat(0.9, 1.05);
    const px = w * 0.5 + Math.cos(angle) * w * 0.32 * dist;
    const py = h * 0.58 + Math.sin(angle) * h * 0.18 * dist;
    if (py > h * 0.73 && py < h * 0.82) {
      const pebbleColor = rng.pick(['#9E9E9E', '#757575', '#BDBDBD', '#A1887F', '#8D6E63']);
      elements.push(createEllipse(px, py, rng.nextFloat(2, 5), rng.nextFloat(1.5, 3), pebbleColor, {
        layer: 1, category: 'pebble', modifiable: false, opacity: rng.nextFloat(0.5, 0.8), id: uid('peb'),
      }));
    }
  }
  // Pebbles along bottom shore
  for (let i = 0; i < rng.nextInt(10, 18); i++) {
    const px = rng.nextFloat(w * 0.15, w * 0.85);
    const py = rng.nextFloat(h * 0.74, h * 0.8);
    const pebbleColor = rng.pick(['#9E9E9E', '#757575', '#BDBDBD', '#A1887F', '#8D6E63']);
    elements.push(createEllipse(px, py, rng.nextFloat(2, 5), rng.nextFloat(1.5, 3), pebbleColor, {
      layer: 1, category: 'pebble', modifiable: false, opacity: rng.nextFloat(0.5, 0.8), id: uid('peb'),
    }));
  }

  // ============================
  // === LAYER 2: TREES (7-11) - detailed components
  // ============================
  const treeCount = rng.nextInt(7, 11);
  for (let i = 0; i < treeCount; i++) {
    const side = rng.chance(0.5);
    let tx: number, ty: number;
    if (side) {
      tx = rng.nextFloat(5, w * 0.2);
      ty = h * rng.nextFloat(0.4, 0.7);
    } else {
      tx = rng.nextFloat(w * 0.75, w - 15);
      ty = h * rng.nextFloat(0.42, 0.7);
    }
    const treeType = rng.pick(['pine', 'oak'] as const);
    const treeSize = rng.nextFloat(70, 130);
    const tree = detailedTree(tx, ty, treeType, treeSize, rng);
    tree.filter = 'url(#softShadow)';
    elements.push(tree);

    // Tree reflection in water
    if (ty < h * 0.6) {
      const refY = h * 0.4 + (h * 0.4 - (ty - treeSize * 0.3)) * 0.4 + h * 0.08;
      elements.push(createEllipse(tx, refY, treeSize * 0.12, treeSize * 0.25, '#2E7D32', {
        layer: 1, category: 'reflection', modifiable: false, opacity: 0.08, id: uid('tree_ref'), filter: 'url(#waterRipple)',
      }));
    }
  }

  // Bottom shore trees
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const tx = rng.nextFloat(w * 0.1, w * 0.9);
    const ty = h * rng.nextFloat(0.82, 0.92);
    const treeType = rng.pick(['pine', 'oak'] as const);
    const tree = detailedTree(tx, ty, treeType, rng.nextFloat(80, 140), rng);
    tree.filter = 'url(#shadow)';
    elements.push(tree);
  }

  // ============================
  // === LAYER 2: WILDFLOWERS (7-11) - detailed components
  // ============================
  for (let i = 0; i < rng.nextInt(7, 11); i++) {
    const fx = rng.nextFloat(w * 0.05, w * 0.95);
    const fy = rng.nextFloat(h * 0.78, h * 0.95);
    const flowerType = rng.pick(['daisy', 'tulip', 'rose', 'sunflower'] as const);
    const flower = detailedFlower(fx, fy, flowerType, rng.nextFloat(15, 32), rng);
    flower.filter = 'url(#softShadow)';
    elements.push(flower);
  }

  // ============================
  // === LAYER 2: ROCKS (5-8) - detailed components
  // ============================
  for (let i = 0; i < rng.nextInt(5, 8); i++) {
    const rx = rng.nextFloat(w * 0.1, w * 0.85);
    const ry = rng.nextFloat(h * 0.7, h * 0.82);
    const rock = detailedRock(rx, ry, rng.nextFloat(12, 35), rng);
    rock.filter = 'url(#softShadow)';
    elements.push(rock);
  }

  // ============================
  // === LAYER 2: DOCK / PIER ===
  // ============================
  const dockX = rng.nextFloat(w * 0.3, w * 0.55);
  const dockY = h * rng.nextFloat(0.68, 0.74);
  const dockLen = rng.nextFloat(70, 110);
  elements.push(createDock(dockX, dockY, dockLen, 16, rng));

  // ============================
  // === LAYER 3: FISHING BOAT (optional)
  // ============================
  if (rng.chance(0.65)) {
    elements.push(createBoat(dockX + dockLen + rng.nextFloat(10, 25), dockY + 5, rng.nextFloat(30, 45), rng));
    elements.push(createPath(0, 0, `M${dockX + dockLen},${dockY + 8} Q${dockX + dockLen + 10},${dockY + 15} ${dockX + dockLen + 15},${dockY + 8}`, 'none', {
      stroke: '#8B7355', strokeWidth: 1.5, layer: 3, category: 'rope', modifiable: false, opacity: 0.6, id: uid('rope'),
    }));
  }

  // ============================
  // === LAYER 3: LILY PADS (3-6)
  // ============================
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    const lx = rng.nextFloat(w * 0.3, w * 0.65);
    const ly = rng.nextFloat(h * 0.5, h * 0.68);
    elements.push(createLilyPad(lx, ly, rng.nextFloat(8, 16), rng.chance(0.6), rng));
  }

  // ============================
  // === LAYER 3: DEER (optional)
  // ============================
  if (rng.chance(0.55)) {
    elements.push(createDeer(rng.nextFloat(w * 0.05, w * 0.2), h * rng.nextFloat(0.58, 0.72), rng.nextFloat(45, 70), rng));
  }

  // ============================
  // === LAYER 3: DISTANT CABIN (optional)
  // ============================
  if (rng.chance(0.5)) {
    elements.push(createDistantCabin(rng.nextFloat(w * 0.78, w * 0.92), h * rng.nextFloat(0.42, 0.48), rng.nextFloat(25, 40), rng));
  }

  // ============================
  // === LAYER 3: GRASS TUFTS ON SHORE ===
  // ============================
  for (let i = 0; i < 16; i++) {
    const gx = rng.nextFloat(0, w);
    const gy = rng.nextFloat(h * 0.78, h * 0.98);
    const gh = rng.nextFloat(8, 16);
    const bladeCount = rng.nextInt(3, 5);
    let grassD = '';
    for (let b = 0; b < bladeCount; b++) {
      const bx = gx + rng.nextFloat(-5, 5);
      const tip = rng.nextFloat(-4, 4);
      grassD += `M${bx},${gy} Q${bx + tip * 0.5},${gy - gh * 0.6} ${bx + tip},${gy - gh} `;
    }
    const grassColor = rng.pick(['#2E7D32', '#388E3C', '#1B5E20', '#33691E']);
    elements.push(createPath(gx, gy, grassD, 'none', { stroke: grassColor, strokeWidth: rng.nextFloat(1, 2), layer: 3, category: 'grass', modifiable: false, opacity: rng.nextFloat(0.5, 0.85), id: uid('grass') }));
  }

  // ============================
  // === LAYER 4: BIRDS (3-5) - detailed components
  // ============================
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    elements.push(detailedBird(rng.nextFloat(40, w - 40), rng.nextFloat(25, h * 0.3), true, rng));
  }

  // ============================
  // === LAYER 4: BUTTERFLIES (2-4) - detailed components
  // ============================
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(detailedButterfly(rng.nextFloat(w * 0.05, w * 0.95), rng.nextFloat(h * 0.6, h * 0.85), rng.nextFloat(12, 20), rng));
  }

  // ============================
  // === LAYER 4: DAPPLED LIGHT ON GROUND ===
  // ============================
  for (let i = 0; i < rng.nextInt(6, 10); i++) {
    const lx = rng.nextFloat(20, w - 20);
    const ly = rng.nextFloat(h * 0.78, h * 0.95);
    elements.push(createEllipse(lx, ly, rng.nextFloat(6, 18), rng.nextFloat(3, 8), '#FFFDE7', {
      layer: 4, category: 'light_spot', modifiable: false, opacity: rng.nextFloat(0.05, 0.12), id: uid('light'),
    }));
  }

  // ============================
  // === LAYER 4: FLOATING PARTICLES (pollen/mist) ===
  // ============================
  for (let i = 0; i < rng.nextInt(8, 14); i++) {
    elements.push(createCircle(rng.nextFloat(10, w - 10), rng.nextFloat(h * 0.1, h * 0.7), rng.nextFloat(1, 2.5), '#FFF9C4', {
      layer: 4, category: 'particle', modifiable: false, opacity: rng.nextFloat(0.15, 0.35), id: uid('dust'),
    }));
  }

  return { elements, defs };
}
