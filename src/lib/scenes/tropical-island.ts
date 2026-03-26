import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath, createLine, createGroup,
} from '../engine/primitives';
import {
  combineDefs, outdoorDefs, skyGradient, sandGradient,
  linearGradient, radialGradient, waterGradient, sunGlowGradient,
  dropShadow, gaussianBlur, softGlow,
} from './svg-effects';
import {
  detailedTree, detailedCloud, detailedRock, detailedBird, detailedFlower,
  resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'ti') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// ── Coconut on palm ─────────────────────────────────────────────
function coconut(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const color = rng.pick(['#5D4037', '#6D4C41', '#4E342E']);
  children.push(createCircle(x, y, s, color, { layer: 2 }));
  // Highlight
  children.push(createCircle(x - s * 0.3, y - s * 0.3, s * 0.3, '#8D6E63', { layer: 2, opacity: 0.5 }));
  return createGroup(x, y, children, { layer: 2, category: 'coconut', modifiable: true, id: uid('coco') });
}

// ── Parrot ───────────────────────────────────────────────────────
function parrot(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const bodyColor = rng.pick(['#4CAF50', '#F44336', '#2196F3', '#FF9800']);
  const wingColor = rng.pick(['#1565C0', '#C62828', '#2E7D32', '#E65100']);
  const belly = '#FFEB3B';

  // Body
  children.push(createEllipse(x, y, s * 0.12, s * 0.18, bodyColor, { layer: 2 }));
  // Belly
  children.push(createEllipse(x, y + s * 0.05, s * 0.08, s * 0.1, belly, { layer: 2, opacity: 0.6 }));
  // Wing
  children.push(createPath(x, y, `M${x + s * 0.05},${y - s * 0.05} Q${x + s * 0.18},${y} ${x + s * 0.14},${y + s * 0.15}`, 'none', { stroke: wingColor, strokeWidth: s * 0.06, layer: 2 }));
  // Head
  children.push(createCircle(x, y - s * 0.2, s * 0.09, bodyColor, { layer: 2 }));
  // Eye
  children.push(createCircle(x + s * 0.03, y - s * 0.22, s * 0.02, '#FFF', { layer: 2 }));
  children.push(createCircle(x + s * 0.035, y - s * 0.22, s * 0.01, '#111', { layer: 2 }));
  // Beak
  children.push(createPath(x, y, `M${x + s * 0.07},${y - s * 0.2} L${x + s * 0.14},${y - s * 0.18} L${x + s * 0.07},${y - s * 0.16} Z`, '#FF8F00', { layer: 2 }));
  // Tail feathers
  const tailColors = [bodyColor, wingColor, belly];
  for (let i = 0; i < 3; i++) {
    const tx = x - s * 0.02 + i * s * 0.03;
    children.push(createPath(x, y, `M${tx},${y + s * 0.18} Q${tx - s * 0.02},${y + s * 0.32} ${tx + s * 0.01},${y + s * 0.4}`, 'none', { stroke: tailColors[i % 3], strokeWidth: 2, layer: 2 }));
  }

  return createGroup(x, y, children, { layer: 2, category: 'parrot', modifiable: true, id: uid('parrot') });
}

// ── Crab ─────────────────────────────────────────────────────────
function crab(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const color = rng.pick(['#E53935', '#D32F2F', '#FF5722', '#F44336']);
  const darkColor = '#B71C1C';

  // Body
  children.push(createEllipse(x, y, s * 0.12, s * 0.08, color, { layer: 3 }));
  // Eyes on stalks
  children.push(createLine(x - s * 0.05, y - s * 0.07, x - s * 0.06, y - s * 0.12, darkColor, { strokeWidth: 1.2, layer: 3 }));
  children.push(createLine(x + s * 0.05, y - s * 0.07, x + s * 0.06, y - s * 0.12, darkColor, { strokeWidth: 1.2, layer: 3 }));
  children.push(createCircle(x - s * 0.06, y - s * 0.13, s * 0.015, '#111', { layer: 3 }));
  children.push(createCircle(x + s * 0.06, y - s * 0.13, s * 0.015, '#111', { layer: 3 }));

  // Claws
  children.push(createPath(x, y, `M${x - s * 0.12},${y - s * 0.02} L${x - s * 0.2},${y - s * 0.06} Q${x - s * 0.25},${y - s * 0.04} ${x - s * 0.22},${y} Q${x - s * 0.2},${y + s * 0.02} ${x - s * 0.18},${y} Z`, color, { layer: 3 }));
  children.push(createPath(x, y, `M${x + s * 0.12},${y - s * 0.02} L${x + s * 0.2},${y - s * 0.06} Q${x + s * 0.25},${y - s * 0.04} ${x + s * 0.22},${y} Q${x + s * 0.2},${y + s * 0.02} ${x + s * 0.18},${y} Z`, color, { layer: 3 }));

  // Legs (3 per side)
  for (let i = 0; i < 3; i++) {
    const ly = y + s * 0.02 + i * s * 0.025;
    children.push(createLine(x - s * 0.1, ly, x - s * 0.16, ly + s * 0.04, darkColor, { strokeWidth: 1, layer: 3 }));
    children.push(createLine(x + s * 0.1, ly, x + s * 0.16, ly + s * 0.04, darkColor, { strokeWidth: 1, layer: 3 }));
  }

  return createGroup(x, y, children, { layer: 3, category: 'crab', modifiable: true, id: uid('crab') });
}

// ── Tiki Hut ─────────────────────────────────────────────────────
function tikiHut(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const woodColor = rng.pick(['#8B6E4E', '#6D4C41', '#795548']);
  const roofColor = rng.pick(['#F9A825', '#E8B849', '#D4A017']);

  // Shadow
  children.push(createEllipse(x, y + s * 0.02, s * 0.35, s * 0.05, 'rgba(0,0,0,0.1)', { layer: 2 }));

  // Posts
  children.push(createRect(x - s * 0.25, y - s * 0.5, s * 0.04, s * 0.5, woodColor, { layer: 2 }));
  children.push(createRect(x + s * 0.21, y - s * 0.5, s * 0.04, s * 0.5, woodColor, { layer: 2 }));

  // Counter/bar
  children.push(createRect(x - s * 0.28, y - s * 0.2, s * 0.56, s * 0.05, woodColor, { layer: 2, stroke: '#5D4037', strokeWidth: 0.5 }));

  // Thatched roof
  const roofPath = `M${x - s * 0.38},${y - s * 0.5} L${x},${y - s * 0.85} L${x + s * 0.38},${y - s * 0.5} Z`;
  children.push(createPath(x, y, roofPath, roofColor, { layer: 2 }));
  // Roof texture lines
  for (let i = 0; i < 6; i++) {
    const ry = y - s * 0.5 - i * s * 0.05;
    const rw = s * 0.38 * (1 - i / 7);
    children.push(createLine(x - rw, ry, x + rw, ry, '#C68400', { strokeWidth: 1, layer: 2, opacity: 0.5 }));
  }

  // Drinks on counter
  const drinkColors = ['#FF6F00', '#4CAF50', '#E91E63', '#00BCD4'];
  for (let i = 0; i < rng.nextInt(2, 3); i++) {
    const dx = x - s * 0.15 + i * s * 0.15;
    children.push(createRect(dx, y - s * 0.26, s * 0.04, s * 0.06, drinkColors[i % drinkColors.length], { layer: 2 }));
    // Little umbrella
    children.push(createLine(dx + s * 0.02, y - s * 0.26, dx + s * 0.02, y - s * 0.32, '#333', { strokeWidth: 0.5, layer: 2 }));
    children.push(createPath(x, y, `M${dx - s * 0.01},${y - s * 0.32} Q${dx + s * 0.02},${y - s * 0.36} ${dx + s * 0.05},${y - s * 0.32}`, rng.pick(drinkColors), { layer: 2, opacity: 0.8 }));
  }

  // Tiki torch on side
  children.push(createRect(x + s * 0.35, y - s * 0.6, s * 0.025, s * 0.6, woodColor, { layer: 2 }));
  children.push(createPath(x, y, `M${x + s * 0.34},${y - s * 0.62} Q${x + s * 0.36},${y - s * 0.7} ${x + s * 0.38},${y - s * 0.62}`, '#FF6D00', { layer: 2, opacity: 0.8 }));

  return createGroup(x, y, children, { layer: 2, category: 'hut', modifiable: true, id: uid('hut'), filter: 'url(#shadow)' });
}

// ── Hammock ──────────────────────────────────────────────────────
function hammock(x: number, y: number, w: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const ropeColor = '#8D6E63';
  const fabricColor = rng.pick(['#FF7043', '#42A5F5', '#66BB6A', '#FFA726', '#AB47BC']);

  // Hammock curve
  const hammockPath = `M${x},${y} Q${x + w * 0.5},${y + w * 0.3} ${x + w},${y}`;
  children.push(createPath(x, y, hammockPath, fabricColor, { layer: 2, stroke: fabricColor, strokeWidth: w * 0.08, opacity: 0.8 }));

  // Fabric fill
  const fillPath = `M${x},${y} Q${x + w * 0.5},${y + w * 0.3} ${x + w},${y} Q${x + w * 0.5},${y + w * 0.22} ${x},${y} Z`;
  children.push(createPath(x, y, fillPath, fabricColor, { layer: 2, opacity: 0.6 }));

  // Rope lines
  for (let i = 0; i < 5; i++) {
    const t = (i + 1) / 6;
    const mx = x + t * w;
    const my = y + Math.sin(t * Math.PI) * w * 0.28;
    children.push(createLine(mx, y - 2, mx, my, ropeColor, { strokeWidth: 0.8, layer: 2, opacity: 0.5 }));
  }

  // Rope ends
  children.push(createLine(x, y, x - 5, y - 8, ropeColor, { strokeWidth: 1.5, layer: 2 }));
  children.push(createLine(x + w, y, x + w + 5, y - 8, ropeColor, { strokeWidth: 1.5, layer: 2 }));

  return createGroup(x, y, children, { layer: 2, category: 'hammock', modifiable: true, id: uid('hammock') });
}

// ── Sailboat ─────────────────────────────────────────────────────
function sailboat(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const hullColor = rng.pick(['#8D6E63', '#5D4037', '#795548']);
  const sailColor = '#FFFFFF';

  // Hull
  children.push(createPath(x, y, `M${x - s * 0.4},${y} L${x - s * 0.3},${y + s * 0.15} L${x + s * 0.35},${y + s * 0.15} L${x + s * 0.45},${y} Z`, hullColor, { layer: 2 }));
  // Stripe
  children.push(createPath(x, y, `M${x - s * 0.35},${y + s * 0.05} L${x + s * 0.4},${y + s * 0.05}`, 'none', { stroke: '#FFF', strokeWidth: 1.5, layer: 2, opacity: 0.5 }));
  // Mast
  children.push(createLine(x, y + s * 0.12, x, y - s * 0.6, '#5D4037', { strokeWidth: 2, layer: 2 }));
  // Sail
  children.push(createPath(x, y, `M${x},${y - s * 0.55} L${x},${y + s * 0.05} L${x + s * 0.3},${y + s * 0.05} Z`, sailColor, { layer: 2, opacity: 0.9 }));
  // Flag
  const flagColor = rng.pick(['#F44336', '#FF9800', '#FFEB3B']);
  children.push(createPath(x, y, `M${x},${y - s * 0.6} L${x + s * 0.08},${y - s * 0.57} L${x},${y - s * 0.54}`, flagColor, { layer: 2 }));

  return createGroup(x, y, children, { layer: 2, category: 'boat', modifiable: true, id: uid('boat'), filter: 'url(#bgBlur)' });
}

export function generateTropicalIsland(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  // === SVG DEFS ===
  const defs = combineDefs(
    outdoorDefs(),
    skyGradient('tropicalSky', '#0277BD', '#4FC3F7', '#B3E5FC'),
    sandGradient('beachSand'),
    waterGradient('oceanWater', '#006994', '#004D73'),
    sunGlowGradient('sunGlow'),
    linearGradient('shallowWater', [
      { offset: '0%', color: '#00BCD4', opacity: 0.7 },
      { offset: '100%', color: '#006994', opacity: 0.9 },
    ]),
    linearGradient('islandGreen', [
      { offset: '0%', color: '#388E3C' },
      { offset: '100%', color: '#1B5E20' },
    ]),
    radialGradient('sunDisc', [
      { offset: '0%', color: '#FFFFFF' },
      { offset: '50%', color: '#FFF9C4' },
      { offset: '100%', color: '#FFD54F' },
    ]),
    dropShadow('treeShadow', 3, 5, 4, 'rgba(0,0,0,0.2)'),
    gaussianBlur('farBlur', 2.5),
    softGlow('sunBloom', 8),
  );

  // ════════════════════════════════════════
  // LAYER 0: Sky
  // ════════════════════════════════════════
  elements.push(createRect(0, 0, w, h * 0.55, 'url(#tropicalSky)', { layer: 0, category: 'sky', modifiable: false, id: uid('sky') }));

  // Sun
  const sunX = w * rng.nextFloat(0.65, 0.85);
  const sunY = h * 0.1;
  elements.push(createCircle(sunX, sunY, 50, 'url(#sunGlow)', { layer: 0, category: 'sun', modifiable: false, filter: 'url(#sunBloom)' }));
  elements.push(createCircle(sunX, sunY, 22, 'url(#sunDisc)', { layer: 0, category: 'sun', modifiable: true, id: uid('sun') }));

  // Clouds
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const cloud = detailedCloud(rng.nextFloat(30, w - 80), rng.nextFloat(h * 0.04, h * 0.22), rng.nextFloat(35, 70), rng);
    cloud.modifiable = true;
    cloud.id = uid('cloud');
    elements.push(cloud);
  }

  // ════════════════════════════════════════
  // LAYER 1: Ocean
  // ════════════════════════════════════════
  const oceanTop = h * 0.45;
  elements.push(createRect(0, oceanTop, w, h - oceanTop, 'url(#oceanWater)', { layer: 1, category: 'ocean', modifiable: false, id: uid('ocean') }));

  // Waves
  for (let i = 0; i < rng.nextInt(5, 8); i++) {
    const wy = oceanTop + i * 12 + rng.nextFloat(5, 15);
    let wavePath = `M0,${wy}`;
    for (let j = 0; j < 8; j++) {
      const sx = (j + 0.5) * w / 8;
      const ex = (j + 1) * w / 8;
      const dir = j % 2 === 0 ? -1 : 1;
      wavePath += ` Q${sx},${wy + dir * rng.nextFloat(2, 5)} ${ex},${wy}`;
    }
    elements.push(createPath(0, 0, wavePath, 'none', {
      stroke: rng.pick(['#B3E5FC', '#81D4FA', '#4FC3F7']),
      strokeWidth: rng.nextFloat(1, 2.5), layer: 1, category: 'wave', modifiable: false,
      opacity: rng.nextFloat(0.2, 0.5),
    }));
  }

  // Foam at shore
  const foamY = h * 0.62;
  let foamPath = `M0,${foamY}`;
  for (let j = 0; j < 12; j++) {
    const fx = (j + 0.5) * w / 12;
    const fex = (j + 1) * w / 12;
    foamPath += ` Q${fx},${foamY + rng.nextFloat(-3, 3)} ${fex},${foamY}`;
  }
  elements.push(createPath(0, 0, foamPath, 'none', {
    stroke: '#E0F7FA', strokeWidth: 3, layer: 1, category: 'foam', modifiable: false, opacity: 0.7,
  }));

  // ════════════════════════════════════════
  // LAYER 1: Distant sailboat
  // ════════════════════════════════════════
  elements.push(sailboat(rng.nextFloat(w * 0.05, w * 0.35), oceanTop + rng.nextFloat(8, 25), rng.nextFloat(20, 35), rng));

  // ════════════════════════════════════════
  // LAYER 1: Sandy beach (curved)
  // ════════════════════════════════════════
  const beachTop = h * 0.6;
  const beachPath = `M0,${beachTop + 15} Q${w * 0.15},${beachTop - 5} ${w * 0.35},${beachTop + 3} Q${w * 0.55},${beachTop - 8} ${w * 0.75},${beachTop + 5} Q${w * 0.9},${beachTop - 3} ${w},${beachTop + 8} L${w},${h} L0,${h} Z`;
  elements.push(createPath(0, 0, beachPath, 'url(#beachSand)', { layer: 1, category: 'beach', modifiable: false, id: uid('beach') }));

  // Shallow water
  const shallowPath = `M0,${beachTop + 15} Q${w * 0.15},${beachTop - 5} ${w * 0.35},${beachTop + 3} Q${w * 0.55},${beachTop - 8} ${w * 0.75},${beachTop + 5} Q${w * 0.9},${beachTop - 3} ${w},${beachTop + 8} L${w},${beachTop - 5} Q${w * 0.7},${beachTop - 12} ${w * 0.4},${beachTop - 8} Q${w * 0.2},${beachTop - 15} 0,${beachTop - 2} Z`;
  elements.push(createPath(0, 0, shallowPath, 'url(#shallowWater)', { layer: 1, category: 'water', modifiable: false, opacity: 0.5 }));

  // Sand texture
  for (let i = 0; i < rng.nextInt(12, 18); i++) {
    elements.push(createCircle(rng.nextFloat(5, w - 5), rng.nextFloat(beachTop + 15, h - 5), rng.nextFloat(0.5, 1.5), '#C9A05C', {
      layer: 1, category: 'sand', modifiable: false, opacity: rng.nextFloat(0.15, 0.3),
    }));
  }

  // ════════════════════════════════════════
  // LAYER 2: Palm trees (4-6)
  // ════════════════════════════════════════
  const palmCount = rng.nextInt(4, 6);
  for (let i = 0; i < palmCount; i++) {
    const px = rng.nextFloat(w * 0.05 + i * w * 0.15, w * 0.15 + i * w * 0.15);
    const py = beachTop + rng.nextFloat(10, 30);
    const palmSize = rng.nextFloat(80, 130);
    const palm = detailedTree(px, py, 'palm', palmSize, rng);
    palm.filter = 'url(#treeShadow)';
    palm.modifiable = true;
    palm.id = uid('palm');
    elements.push(palm);
  }

  // Coconuts near base of trees
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const cx = rng.nextFloat(w * 0.1, w * 0.8);
    const cy = rng.nextFloat(beachTop + 20, h * 0.82);
    elements.push(coconut(cx, cy, rng.nextFloat(3, 5), rng));
  }

  // ════════════════════════════════════════
  // LAYER 2: Tiki hut
  // ════════════════════════════════════════
  const hutX = rng.nextFloat(w * 0.55, w * 0.75);
  const hutY = beachTop + rng.nextFloat(30, 50);
  elements.push(tikiHut(hutX, hutY, rng.nextFloat(55, 75), rng));

  // ════════════════════════════════════════
  // LAYER 2: Hammock between trees
  // ════════════════════════════════════════
  if (rng.chance(0.8)) {
    const hx = rng.nextFloat(w * 0.1, w * 0.4);
    const hy = beachTop + rng.nextFloat(15, 35);
    elements.push(hammock(hx, hy, rng.nextFloat(50, 70), rng));
  }

  // ════════════════════════════════════════
  // LAYER 2: Tropical flowers (4-6)
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(4, 6); i++) {
    const fx = rng.nextFloat(15, w - 15);
    const fy = rng.nextFloat(beachTop + 15, h - 20);
    const flower = detailedFlower(fx, fy, rng.pick(['daisy', 'tulip', 'rose', 'sunflower'] as const), rng.nextFloat(10, 18), rng);
    flower.modifiable = true;
    flower.id = uid('flower');
    elements.push(flower);
  }

  // ════════════════════════════════════════
  // LAYER 2: Parrots (2-3)
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 3); i++) {
    const px = rng.nextFloat(w * 0.1, w * 0.85);
    const py = rng.nextFloat(h * 0.15, h * 0.45);
    elements.push(parrot(px, py, rng.nextFloat(20, 30), rng));
  }

  // ════════════════════════════════════════
  // LAYER 3: Crabs (2-3)
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 3); i++) {
    const cx = rng.nextFloat(w * 0.1, w * 0.9);
    const cy = rng.nextFloat(beachTop + 25, h - 15);
    elements.push(crab(cx, cy, rng.nextFloat(18, 30), rng));
  }

  // ════════════════════════════════════════
  // LAYER 2: Rocks along shore
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const rock = detailedRock(rng.nextFloat(10, w - 10), beachTop + rng.nextFloat(-5, 15), rng.nextFloat(8, 18), rng);
    rock.filter = 'url(#softShadow)';
    rock.modifiable = true;
    rock.id = uid('rock');
    elements.push(rock);
  }

  // ════════════════════════════════════════
  // LAYER 3: Birds in sky
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const bird = detailedBird(rng.nextFloat(20, w - 20), rng.nextFloat(h * 0.05, h * 0.3), true, rng);
    bird.modifiable = true;
    bird.id = uid('bird');
    elements.push(bird);
  }

  // ════════════════════════════════════════
  // LAYER 3: Seashells on beach
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const sx = rng.nextFloat(15, w - 15);
    const sy = rng.nextFloat(beachTop + 15, h - 10);
    const shellColor = rng.pick(['#FFF8E1', '#FFCCBC', '#F8BBD0', '#FFE0B2']);
    children: [
      createEllipse(sx, sy, 4, 3, shellColor, { layer: 3 }),
    ];
    elements.push(createEllipse(sx, sy, rng.nextFloat(3, 5), rng.nextFloat(2, 4), shellColor, {
      layer: 3, category: 'shell', modifiable: false, opacity: 0.7,
    }));
  }

  return { elements, defs };
}
