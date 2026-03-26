import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath, createGroup, createLine, createPolygon,
} from '../engine/primitives';
import {
  combineDefs, outdoorDefs, snowGradient, linearGradient, radialGradient,
  lampGlowGradient, dropShadow,
} from './svg-effects';
import {
  detailedTree, detailedHouse, detailedPerson, detailedFence, detailedRock,
  resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'sv') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// Snowman with hat, scarf, coal eyes/buttons, carrot nose, stick arms
function createSnowman(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const scarfColor = rng.pick(['#DC143C', '#FF4500', '#4169E1', '#228B22']);

  // Bottom ball
  children.push(createCircle(x, y - s * 0.18, s * 0.22, '#FAFAFA', { layer: 3, stroke: '#E0E0E0', strokeWidth: 1 }));
  // Middle ball
  children.push(createCircle(x, y - s * 0.45, s * 0.16, '#FAFAFA', { layer: 3, stroke: '#E0E0E0', strokeWidth: 1 }));
  // Head
  children.push(createCircle(x, y - s * 0.68, s * 0.12, '#FAFAFA', { layer: 3, stroke: '#E0E0E0', strokeWidth: 1 }));

  // Hat
  children.push(createRect(x - s * 0.1, y - s * 0.88, s * 0.2, s * 0.12, '#1a1a1a', { layer: 3 }));
  children.push(createRect(x - s * 0.14, y - s * 0.78, s * 0.28, s * 0.03, '#1a1a1a', { layer: 3 }));
  // Hat band
  children.push(createRect(x - s * 0.1, y - s * 0.82, s * 0.2, s * 0.025, scarfColor, { layer: 3 }));

  // Coal eyes
  children.push(createCircle(x - s * 0.04, y - s * 0.71, s * 0.015, '#111', { layer: 3 }));
  children.push(createCircle(x + s * 0.04, y - s * 0.71, s * 0.015, '#111', { layer: 3 }));

  // Carrot nose
  children.push(createPath(x, y, `M${x},${y - s * 0.68} L${x + s * 0.1},${y - s * 0.66} L${x},${y - s * 0.65} Z`, '#FF8C00', { layer: 3 }));

  // Smile (coal dots)
  for (let i = 0; i < 5; i++) {
    const angle = (160 + i * 10) * Math.PI / 180;
    children.push(createCircle(x + Math.cos(angle) * s * 0.07, y - s * 0.65 + Math.sin(angle) * s * 0.05, s * 0.01, '#111', { layer: 3 }));
  }

  // Scarf
  children.push(createRect(x - s * 0.12, y - s * 0.56, s * 0.24, s * 0.04, scarfColor, { layer: 3 }));
  children.push(createRect(x + s * 0.06, y - s * 0.56, s * 0.04, s * 0.1, scarfColor, { layer: 3 }));

  // Buttons
  for (let i = 0; i < 3; i++) {
    children.push(createCircle(x, y - s * 0.38 - i * s * 0.06, s * 0.015, '#111', { layer: 3 }));
  }

  // Stick arms
  children.push(createLine(x - s * 0.16, y - s * 0.45, x - s * 0.35, y - s * 0.55, '#5C3317', { strokeWidth: 2, layer: 3 }));
  children.push(createLine(x + s * 0.16, y - s * 0.45, x + s * 0.35, y - s * 0.55, '#5C3317', { strokeWidth: 2, layer: 3 }));
  // Twig fingers
  children.push(createLine(x - s * 0.35, y - s * 0.55, x - s * 0.4, y - s * 0.62, '#5C3317', { strokeWidth: 1.5, layer: 3 }));
  children.push(createLine(x - s * 0.35, y - s * 0.55, x - s * 0.42, y - s * 0.54, '#5C3317', { strokeWidth: 1.5, layer: 3 }));
  children.push(createLine(x + s * 0.35, y - s * 0.55, x + s * 0.4, y - s * 0.62, '#5C3317', { strokeWidth: 1.5, layer: 3 }));
  children.push(createLine(x + s * 0.35, y - s * 0.55, x + s * 0.42, y - s * 0.54, '#5C3317', { strokeWidth: 1.5, layer: 3 }));

  return createGroup(x, y, children, { layer: 3, category: 'snowman', modifiable: true, id: uid('snowman'), filter: 'url(#shadow)' });
}

// Smoke trail from chimney
function createSmoke(x: number, y: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  for (let i = 0; i < rng.nextInt(4, 7); i++) {
    const cx = x + rng.nextFloat(-8, 8) + i * rng.nextFloat(-3, 3);
    const cy = y - i * rng.nextFloat(10, 18);
    const r = rng.nextFloat(4, 8 + i * 2);
    children.push(createCircle(cx, cy, r, '#C0C0C0', { layer: 4, opacity: rng.nextFloat(0.15, 0.35 - i * 0.03) }));
  }
  return createGroup(x, y, children, { layer: 4, category: 'smoke', modifiable: false, id: uid('smoke') });
}

// Dog sitting
function createDog(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const color = rng.pick(['#8B4513', '#D2691E', '#F5DEB3', '#333']);
  const children: SVGElementData[] = [];
  children.push(createEllipse(x, y - s * 0.2, s * 0.25, s * 0.15, color, { layer: 3 }));
  children.push(createCircle(x + s * 0.2, y - s * 0.35, s * 0.12, color, { layer: 3 }));
  children.push(createEllipse(x + s * 0.28, y - s * 0.42, s * 0.06, s * 0.08, color, { layer: 3, opacity: 0.8 }));
  children.push(createCircle(x + s * 0.22, y - s * 0.37, s * 0.02, '#111', { layer: 3 }));
  children.push(createCircle(x + s * 0.3, y - s * 0.33, s * 0.02, '#111', { layer: 3 }));
  children.push(createPath(x, y, `M${x - s * 0.2},${y - s * 0.25} Q${x - s * 0.35},${y - s * 0.45} ${x - s * 0.28},${y - s * 0.5}`, 'none', { stroke: color, strokeWidth: s * 0.04, layer: 3 }));
  children.push(createRect(x + s * 0.1, y - s * 0.08, s * 0.04, s * 0.08, color, { layer: 3 }));
  children.push(createRect(x - s * 0.08, y - s * 0.08, s * 0.04, s * 0.08, color, { layer: 3 }));

  return createGroup(x, y, children, { layer: 3, category: 'animal', modifiable: true, id: uid('dog'), filter: 'url(#shadow)' });
}

// Sled
function createSled(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const woodColor = rng.pick(['#8B4513', '#A0522D', '#6B3410']);

  children.push(createPath(x, y, `M${x},${y} Q${x + s * 0.1},${y + s * 0.05} ${x + s * 0.5},${y + s * 0.05} L${x + s * 0.55},${y}`, 'none', { stroke: '#555', strokeWidth: 2, layer: 3 }));
  children.push(createPath(x, y, `M${x},${y - s * 0.12} Q${x + s * 0.1},${y - s * 0.07} ${x + s * 0.5},${y - s * 0.07} L${x + s * 0.55},${y - s * 0.12}`, 'none', { stroke: '#555', strokeWidth: 2, layer: 3 }));

  for (let i = 0; i < 4; i++) {
    const px = x + s * 0.08 + i * s * 0.1;
    children.push(createRect(px, y - s * 0.15, s * 0.08, s * 0.15, woodColor, { layer: 3, stroke: '#5C3317', strokeWidth: 0.5 }));
  }

  children.push(createLine(x + s * 0.1, y - s * 0.02, x + s * 0.1, y - s * 0.12, '#555', { strokeWidth: 1.5, layer: 3 }));
  children.push(createLine(x + s * 0.45, y - s * 0.02, x + s * 0.45, y - s * 0.12, '#555', { strokeWidth: 1.5, layer: 3 }));

  return createGroup(x, y, children, { layer: 3, category: 'sled', modifiable: true, id: uid('sled'), filter: 'url(#shadow)' });
}

export function generateSnowyVillage(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  // === SVG DEFS ===
  const defs = combineDefs(
    outdoorDefs(),
    linearGradient('winterSkyGrad', [
      { offset: '0%', color: '#3B4A6B' },
      { offset: '30%', color: '#5A6F8F' },
      { offset: '60%', color: '#7A8FAF' },
      { offset: '100%', color: '#9AAFCF' },
    ]),
    snowGradient('snowGrad'),
    lampGlowGradient('lampGlow'),
    radialGradient('windowGlow', [
      { offset: '0%', color: '#FFE082', opacity: 0.9 },
      { offset: '60%', color: '#FFB74D', opacity: 0.5 },
      { offset: '100%', color: '#FF8F00', opacity: 0 },
    ]),
    dropShadow('snowShadow', 1, 2, 2, 'rgba(0,0,0,0.1)'),
  );

  // ============================
  // === LAYER 0: SKY ===
  // ============================
  elements.push(createRect(0, 0, w, h * 0.5, 'url(#winterSkyGrad)', { layer: 0, category: 'sky', modifiable: false, id: uid('sky') }));

  // === AURORA BOREALIS BANDS ===
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const ax = rng.nextFloat(w * 0.05, w * 0.95);
    const ay = rng.nextFloat(h * 0.03, h * 0.15);
    const arx = rng.nextFloat(60, 140);
    const ary = rng.nextFloat(15, 35);
    const auroraColor = rng.pick(['#4CAF50', '#81C784', '#7E57C2', '#9575CD', '#26A69A']);
    elements.push(createEllipse(ax, ay, arx, ary, auroraColor, {
      layer: 0, category: 'aurora', modifiable: false, opacity: rng.nextFloat(0.04, 0.08), id: uid('aurora'), filter: 'url(#bgBlur)',
    }));
  }

  // ============================
  // === LAYER 0: MOUNTAINS (3-5) ===
  // ============================
  const mtnCount = rng.nextInt(3, 5);
  for (let i = 0; i < mtnCount; i++) {
    const mx = rng.nextFloat(-80, w * 0.8);
    const mw = rng.nextFloat(200, 400);
    const mh = rng.nextFloat(80, 160);
    const depth = (i + 1) / mtnCount;
    const mColor = rng.pick(['#4A5568', '#5A6578', '#3D4E63', '#6B7B8F']);

    // Mountain body
    const mPts = `${mx},${h * 0.5} ${mx + mw / 2},${h * 0.5 - mh} ${mx + mw},${h * 0.5}`;
    elements.push(createPolygon(mx, h * 0.5, mPts, mColor, { layer: 0, category: 'mountain', modifiable: false, opacity: 0.5 + depth * 0.3, id: uid('mtn'), filter: 'url(#bgBlur)' }));

    // Snow cap
    const capW = mw * 0.35;
    const capPts = `${mx + mw / 2 - capW / 2},${h * 0.5 - mh * 0.65} ${mx + mw / 2},${h * 0.5 - mh} ${mx + mw / 2 + capW / 2},${h * 0.5 - mh * 0.65}`;
    elements.push(createPolygon(mx, h * 0.5, capPts, '#F0F4F8', { layer: 0, category: 'mountain', modifiable: false, opacity: 0.8, id: uid('mtn_snow') }));
  }

  // ============================
  // === LAYER 1: SNOW GROUND ===
  // ============================
  const snowPath = `M0,${h * 0.48} Q${w * 0.1},${h * 0.46} ${w * 0.2},${h * 0.49} Q${w * 0.35},${h * 0.52} ${w * 0.45},${h * 0.47} Q${w * 0.6},${h * 0.44} ${w * 0.75},${h * 0.48} Q${w * 0.9},${h * 0.51} ${w},${h * 0.47} L${w},${h} L0,${h} Z`;
  elements.push(createPath(0, 0, snowPath, 'url(#snowGrad)', { layer: 1, category: 'ground', modifiable: false, id: uid('snow_ground') }));

  // Snow sparkle highlights
  for (let i = 0; i < rng.nextInt(15, 25); i++) {
    elements.push(createCircle(rng.nextFloat(10, w - 10), rng.nextFloat(h * 0.5, h * 0.95), rng.nextFloat(1, 2.5), '#FFFFFF', {
      layer: 4, category: 'sparkle', modifiable: false, opacity: rng.nextFloat(0.4, 0.9), id: uid('sparkle'),
    }));
  }

  // ============================
  // === LAYER 2: HOUSES (3-5) - detailed components
  // ============================
  const houseCount = rng.nextInt(3, 5);
  const housePositions: { x: number; y: number; s: number }[] = [];

  for (let i = 0; i < houseCount; i++) {
    const hx = w * (0.1 + i * 0.22) + rng.nextFloat(-20, 20);
    const hy = h * rng.nextFloat(0.48, 0.6);
    const hs = rng.nextFloat(60, 90);

    housePositions.push({ x: hx, y: hy, s: hs });

    // Detailed house component with shadow
    const house = detailedHouse(hx, hy, hs, hs * 0.9, rng);
    house.filter = 'url(#shadow)';
    elements.push(house);

    // Snow on roof
    const roofSnowD = `M${hx - hs * 0.12},${hy - hs * 0.5} Q${hx + hs * 0.25},${hy - hs * 0.53} ${hx + hs / 2},${hy - hs * 0.87} Q${hx + hs * 0.75},${hy - hs * 0.53} ${hx + hs + hs * 0.12},${hy - hs * 0.5} L${hx + hs + hs * 0.12},${hy - hs * 0.46} Q${hx + hs * 0.75},${hy - hs * 0.49} ${hx + hs / 2},${hy - hs * 0.82} Q${hx + hs * 0.25},${hy - hs * 0.49} ${hx - hs * 0.12},${hy - hs * 0.46} Z`;
    elements.push(createPath(0, 0, roofSnowD, '#F8FAFC', { layer: 2, category: 'snow_roof', modifiable: false, opacity: 0.9, id: uid('roof_snow'), filter: 'url(#snowShadow)' }));

    // Warm window glow overlay
    const glowX = hx + hs * 0.5;
    const glowY = hy - hs * 0.35;
    elements.push(createCircle(glowX, glowY, hs * 0.4, 'url(#windowGlow)', { layer: 2, category: 'window_glow', modifiable: false, opacity: 0.3, id: uid('win_glow'), filter: 'url(#glow)' }));

    // Chimney + smoke
    const chimneyX = hx + hs * rng.nextFloat(0.7, 0.85);
    const chimneyY = hy - hs * 0.75;
    elements.push(createRect(chimneyX - 5, chimneyY, 10, hs * 0.15, '#696969', { layer: 2, category: 'chimney', modifiable: false, id: uid('chimney') }));
    elements.push(createSmoke(chimneyX, chimneyY - 5, rng));
  }

  // ============================
  // === LAYER 2: PINE TREES (8-12) - detailed components, frosted
  // ============================
  const treeCount = rng.nextInt(8, 12);
  for (let i = 0; i < treeCount; i++) {
    const tx = rng.nextFloat(10, w - 30);
    const ty = h * rng.nextFloat(0.46, 0.62);
    const treeSize = rng.nextFloat(70, 130);
    const tree = detailedTree(tx, ty, 'pine', treeSize, rng);
    tree.filter = 'url(#softShadow)';
    elements.push(tree);

    // Frost / snow on branches
    const frostCount = rng.nextInt(3, 6);
    for (let j = 0; j < frostCount; j++) {
      const fx = tx + rng.nextFloat(-treeSize * 0.2, treeSize * 0.2);
      const fy = ty - treeSize * rng.nextFloat(0.15, 0.7);
      elements.push(createCircle(fx, fy, rng.nextFloat(3, 8), '#F0F4F8', {
        layer: 2, category: 'frost', modifiable: false, opacity: rng.nextFloat(0.5, 0.85), id: uid('frost'),
      }));
    }
  }

  // ============================
  // === LAYER 2: STREET LAMPS (3-4) ===
  // ============================
  const lampCount = rng.nextInt(3, 4);
  for (let i = 0; i < lampCount; i++) {
    const lx = w * (0.15 + i * 0.25) + rng.nextFloat(-15, 15);
    const ly = h * rng.nextFloat(0.55, 0.68);

    // Simple lamp post (keep as primitive for customization)
    const lampChildren: SVGElementData[] = [];
    // Post
    lampChildren.push(createRect(lx - 2, ly - 80, 4, 80, '#444', { layer: 2 }));
    // Lamp head
    lampChildren.push(createRect(lx - 6, ly - 85, 12, 8, '#555', { layer: 2 }));
    // Light bulb area
    lampChildren.push(createRect(lx - 4, ly - 82, 8, 4, '#FFD54F', { layer: 2, opacity: 0.8 }));
    elements.push(createGroup(lx, ly, lampChildren, { layer: 2, category: 'lamp', modifiable: true, id: uid('lamp'), filter: 'url(#shadow)' }));

    // Warm glow around lamp
    elements.push(createCircle(lx, ly - 82, 35, 'url(#lampGlow)', {
      layer: 2, category: 'lamp_glow', modifiable: false, opacity: 0.7, id: uid('lamp_glow'), filter: 'url(#glow)',
    }));
  }

  // ============================
  // === LAYER 2: FENCE SECTIONS - detailed components
  // ============================
  const fenceCount = rng.nextInt(2, 3);
  for (let i = 0; i < fenceCount; i++) {
    const fx = rng.nextFloat(10, w * 0.8);
    const fy = h * rng.nextFloat(0.58, 0.72);
    const fence = detailedFence(fx, fy, rng.nextFloat(60, 120), rng.nextFloat(25, 35), rng);
    fence.filter = 'url(#snowShadow)';
    elements.push(fence);
  }

  // ============================
  // === LAYER 2: ROCKS scattered in snow
  // ============================
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const rock = detailedRock(rng.nextFloat(20, w - 20), rng.nextFloat(h * 0.6, h * 0.85), rng.nextFloat(8, 20), rng);
    rock.filter = 'url(#snowShadow)';
    elements.push(rock);
  }

  // ============================
  // === LAYER 3: SNOWMAN ===
  // ============================
  const snowmanX = rng.nextFloat(w * 0.25, w * 0.75);
  const snowmanY = h * rng.nextFloat(0.6, 0.72);
  elements.push(createSnowman(snowmanX, snowmanY, rng.nextFloat(70, 100), rng));

  // ============================
  // === LAYER 3: PEOPLE (2-3) - detailed components
  // ============================
  const peopleCount = rng.nextInt(2, 3);
  for (let i = 0; i < peopleCount; i++) {
    const px = rng.nextFloat(w * 0.1, w * 0.9);
    const py = h * rng.nextFloat(0.6, 0.75);
    const person = detailedPerson(px, py, rng.nextFloat(28, 38), rng);
    person.filter = 'url(#shadow)';
    elements.push(person);

    // Winter hat
    elements.push(createCircle(px, py - 34, 7, rng.pick(['#DC143C', '#4169E1', '#228B22', '#FFD700']), {
      layer: 3, category: 'hat', modifiable: false, id: uid('hat'),
    }));
    // Scarf overlay
    elements.push(createRect(px - 5, py - 22, 10, 3, rng.pick(['#DC143C', '#FF4500', '#4169E1']), {
      layer: 3, category: 'scarf', modifiable: false, id: uid('scarf'),
    }));
  }

  // ============================
  // === LAYER 3: SLED ===
  // ============================
  elements.push(createSled(rng.nextFloat(w * 0.15, w * 0.7), h * rng.nextFloat(0.65, 0.78), rng.nextFloat(50, 70), rng));

  // ============================
  // === LAYER 3: DOG (optional) ===
  // ============================
  if (rng.chance(0.65)) {
    elements.push(createDog(rng.nextFloat(w * 0.2, w * 0.8), h * rng.nextFloat(0.65, 0.78), rng.nextFloat(30, 50), rng));
  }

  // ============================
  // === LAYER 3: SKI/SLED TRACKS IN SNOW ===
  // ============================
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const sx = rng.nextFloat(w * 0.05, w * 0.5);
    const sy = h * rng.nextFloat(0.6, 0.85);
    const trackLen = rng.nextFloat(80, 180);
    const trackD = `M${sx},${sy} Q${sx + trackLen * 0.3},${sy + rng.nextFloat(-5, 5)} ${sx + trackLen * 0.6},${sy + rng.nextFloat(-3, 3)} Q${sx + trackLen * 0.8},${sy + rng.nextFloat(-4, 4)} ${sx + trackLen},${sy + rng.nextFloat(-2, 2)}`;
    elements.push(createPath(0, 0, trackD, 'none', { stroke: '#C8D6E5', strokeWidth: 1.5, layer: 1, category: 'track', modifiable: false, opacity: 0.4, id: uid('track') }));
    elements.push(createPath(0, 0, trackD.replace(new RegExp(`,${sy}`, 'g'), `,${sy + 4}`), 'none', { stroke: '#C8D6E5', strokeWidth: 1.5, layer: 1, category: 'track', modifiable: false, opacity: 0.35, id: uid('track2') }));
  }

  // ============================
  // === LAYER 1: FOOTPRINTS IN SNOW ===
  // ============================
  for (let i = 0; i < rng.nextInt(6, 10); i++) {
    const fpx = rng.nextFloat(w * 0.1, w * 0.9);
    const fpy = rng.nextFloat(h * 0.6, h * 0.9);
    elements.push(createEllipse(fpx, fpy, 3, 1.5, '#C8D6E5', { layer: 1, category: 'footprint', modifiable: false, opacity: 0.3, id: uid('fp') }));
    elements.push(createEllipse(fpx + 5, fpy + 3, 3, 1.5, '#C8D6E5', { layer: 1, category: 'footprint', modifiable: false, opacity: 0.3, id: uid('fp') }));
  }

  // ============================
  // === LAYER 1: ROAD/PATH ===
  // ============================
  const roadD = `M0,${h * 0.68} Q${w * 0.2},${h * 0.66} ${w * 0.4},${h * 0.7} Q${w * 0.6},${h * 0.74} ${w * 0.8},${h * 0.69} Q${w * 0.95},${h * 0.66} ${w},${h * 0.7}`;
  elements.push(createPath(0, 0, roadD, 'none', { stroke: '#B0BEC5', strokeWidth: 30, layer: 1, category: 'road', modifiable: false, opacity: 0.15, id: uid('road') }));

  // ============================
  // === LAYER 4: SNOWFLAKES (40-60) ===
  // ============================
  const snowflakeCount = rng.nextInt(40, 60);
  for (let i = 0; i < snowflakeCount; i++) {
    const sx = rng.nextFloat(0, w);
    const sy = rng.nextFloat(0, h);
    const sr = rng.nextFloat(1, 4);
    elements.push(createCircle(sx, sy, sr, '#FFFFFF', {
      layer: 4, category: 'snowflake', modifiable: false, opacity: rng.nextFloat(0.3, 0.9), id: uid('sf'),
    }));
  }

  // ============================
  // === LAYER 4: LARGER DETAILED SNOWFLAKES (8-12) ===
  // ============================
  for (let i = 0; i < rng.nextInt(8, 12); i++) {
    const sx = rng.nextFloat(20, w - 20);
    const sy = rng.nextFloat(10, h * 0.8);
    const ss = rng.nextFloat(4, 8);
    const children: SVGElementData[] = [];
    for (let a = 0; a < 6; a++) {
      const angle = a * 60 * Math.PI / 180;
      const ex = sx + Math.cos(angle) * ss;
      const ey = sy + Math.sin(angle) * ss;
      children.push(createLine(sx, sy, ex, ey, '#FFFFFF', { strokeWidth: 1, layer: 4, opacity: 0.7 }));
      const bx = sx + Math.cos(angle) * ss * 0.6;
      const by = sy + Math.sin(angle) * ss * 0.6;
      const brAngle1 = angle + 0.5;
      const brAngle2 = angle - 0.5;
      children.push(createLine(bx, by, bx + Math.cos(brAngle1) * ss * 0.3, by + Math.sin(brAngle1) * ss * 0.3, '#FFFFFF', { strokeWidth: 0.7, layer: 4, opacity: 0.5 }));
      children.push(createLine(bx, by, bx + Math.cos(brAngle2) * ss * 0.3, by + Math.sin(brAngle2) * ss * 0.3, '#FFFFFF', { strokeWidth: 0.7, layer: 4, opacity: 0.5 }));
    }
    elements.push(createGroup(sx, sy, children, { layer: 4, category: 'snowflake', modifiable: false, opacity: rng.nextFloat(0.4, 0.8), id: uid('sf_detail') }));
  }

  // ============================
  // === LAYER 4: FOREGROUND SNOW MOUNDS ===
  // ============================
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const mx = rng.nextFloat(-30, w);
    const my = h * rng.nextFloat(0.88, 0.98);
    const mw = rng.nextFloat(80, 180);
    const mh = rng.nextFloat(15, 35);
    const moundD = `M${mx},${my} Q${mx + mw * 0.25},${my - mh} ${mx + mw * 0.5},${my - mh * 0.9} Q${mx + mw * 0.75},${my - mh * 0.5} ${mx + mw},${my} Z`;
    elements.push(createPath(0, 0, moundD, '#F0F4F8', { layer: 4, category: 'snow_mound', modifiable: false, opacity: 0.8, id: uid('mound') }));
  }

  // ============================
  // === LAYER 4: WARM LIGHT PATCHES ON SNOW ===
  // ============================
  for (const hp of housePositions) {
    elements.push(createEllipse(hp.x + hp.s * 0.5, hp.y + 10, hp.s * 0.6, 12, '#FFE082', {
      layer: 1, category: 'light_patch', modifiable: false, opacity: 0.08, id: uid('light_patch'), filter: 'url(#glow)',
    }));
  }

  return { elements, defs };
}
