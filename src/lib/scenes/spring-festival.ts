import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath, createLine, createGroup,
} from '../engine/primitives';
import {
  combineDefs, outdoorDefs, skyGradient, groundGradient,
  linearGradient, radialGradient, sunGlowGradient,
  dropShadow, gaussianBlur, softGlow,
} from './svg-effects';
import {
  detailedTree, detailedCloud, detailedPerson, detailedFlower, detailedButterfly,
  detailedBench, detailedBird,
  resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'sf') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// ── Festival tent/booth ──────────────────────────────────────────
function festivalBooth(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const color1 = rng.pick(['#F44336', '#E91E63', '#2196F3', '#4CAF50', '#FF9800']);
  const color2 = '#FFFFFF';
  const woodColor = '#8D6E63';

  // Shadow
  children.push(createEllipse(x, y + s * 0.02, s * 0.3, s * 0.05, 'rgba(0,0,0,0.1)', { layer: 2 }));

  // Posts
  children.push(createRect(x - s * 0.28, y - s * 0.55, s * 0.03, s * 0.55, woodColor, { layer: 2 }));
  children.push(createRect(x + s * 0.25, y - s * 0.55, s * 0.03, s * 0.55, woodColor, { layer: 2 }));

  // Counter
  children.push(createRect(x - s * 0.3, y - s * 0.15, s * 0.6, s * 0.04, woodColor, { layer: 2, stroke: '#5D4037', strokeWidth: 0.5 }));

  // Striped canopy
  const canopyPath = `M${x - s * 0.35},${y - s * 0.55} Q${x},${y - s * 0.7} ${x + s * 0.35},${y - s * 0.55}`;
  children.push(createPath(x, y, canopyPath, color1, { layer: 2, stroke: color1, strokeWidth: s * 0.12 }));

  // Canopy scalloped edge
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const ex = x - s * 0.3 + t * s * 0.6;
    const ey = y - s * 0.55 + Math.sin(t * Math.PI) * (-s * 0.08);
    children.push(createPath(x, y, `M${ex - s * 0.05},${ey} Q${ex},${ey + s * 0.06} ${ex + s * 0.05},${ey}`, (i % 2 === 0) ? color1 : color2, { layer: 2, opacity: 0.9 }));
  }

  // Hanging banner
  const bannerPath = `M${x - s * 0.2},${y - s * 0.52} Q${x},${y - s * 0.48} ${x + s * 0.2},${y - s * 0.52}`;
  children.push(createPath(x, y, bannerPath, 'none', { stroke: '#FFD700', strokeWidth: 2, layer: 2, opacity: 0.7 }));

  // Items on counter
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const ix = x - s * 0.2 + i * s * 0.1;
    const itemColor = rng.pick(['#F44336', '#4CAF50', '#FFEB3B', '#2196F3', '#FF9800']);
    children.push(createCircle(ix, y - s * 0.19, s * 0.025, itemColor, { layer: 2 }));
  }

  return createGroup(x, y, children, { layer: 2, category: 'booth', modifiable: true, id: uid('booth'), filter: 'url(#shadow)' });
}

// ── Lantern (string light) ───────────────────────────────────────
function lantern(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const color = rng.pick(['#F44336', '#FFEB3B', '#FF9800', '#E91E63', '#4CAF50', '#2196F3']);

  // String
  children.push(createLine(x, y - s * 0.5, x, y - s * 0.2, '#424242', { strokeWidth: 0.8, layer: 2 }));
  // Lantern body
  children.push(createEllipse(x, y, s * 0.12, s * 0.16, color, { layer: 2, opacity: 0.85 }));
  // Glow
  children.push(createCircle(x, y, s * 0.2, color, { layer: 2, opacity: 0.15 }));
  // Top cap
  children.push(createRect(x - s * 0.06, y - s * 0.18, s * 0.12, s * 0.03, '#FFD700', { layer: 2 }));
  // Bottom cap
  children.push(createRect(x - s * 0.04, y + s * 0.14, s * 0.08, s * 0.02, '#FFD700', { layer: 2 }));
  // Ribs
  children.push(createLine(x, y - s * 0.16, x, y + s * 0.16, '#333', { strokeWidth: 0.3, layer: 2, opacity: 0.3 }));
  children.push(createLine(x - s * 0.1, y, x + s * 0.1, y, '#333', { strokeWidth: 0.3, layer: 2, opacity: 0.3 }));

  return createGroup(x, y, children, { layer: 2, category: 'lantern', modifiable: true, id: uid('lantern') });
}

// ── Balloon ──────────────────────────────────────────────────────
function balloon(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const color = rng.pick(['#F44336', '#E91E63', '#9C27B0', '#2196F3', '#4CAF50', '#FFEB3B', '#FF9800']);

  // String
  const stringPath = `M${x},${y + s * 0.3} Q${x + rng.nextFloat(-s * 0.05, s * 0.05)},${y + s * 0.5} ${x + rng.nextFloat(-s * 0.08, s * 0.08)},${y + s * 0.7}`;
  children.push(createPath(x, y, stringPath, 'none', { stroke: '#9E9E9E', strokeWidth: 0.7, layer: 2 }));

  // Balloon body
  children.push(createPath(x, y,
    `M${x},${y - s * 0.35} Q${x + s * 0.22},${y - s * 0.3} ${x + s * 0.22},${y} Q${x + s * 0.2},${y + s * 0.25} ${x},${y + s * 0.3} Q${x - s * 0.2},${y + s * 0.25} ${x - s * 0.22},${y} Q${x - s * 0.22},${y - s * 0.3} ${x},${y - s * 0.35} Z`,
    color, { layer: 2, opacity: 0.85 },
  ));

  // Highlight
  children.push(createEllipse(x - s * 0.08, y - s * 0.12, s * 0.06, s * 0.1, '#FFF', { layer: 2, opacity: 0.3 }));

  // Knot
  children.push(createCircle(x, y + s * 0.3, s * 0.02, color, { layer: 2 }));

  return createGroup(x, y, children, { layer: 2, category: 'balloon', modifiable: true, id: uid('balloon') });
}

// ── Fountain ─────────────────────────────────────────────────────
function fountain(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const stoneColor = '#BDBDBD';
  const stoneDark = '#9E9E9E';
  const waterColor = '#64B5F6';

  // Shadow
  children.push(createEllipse(x, y + s * 0.02, s * 0.35, s * 0.06, 'rgba(0,0,0,0.1)', { layer: 2 }));

  // Basin (large oval)
  children.push(createEllipse(x, y - s * 0.05, s * 0.3, s * 0.12, stoneColor, { layer: 2, stroke: stoneDark, strokeWidth: 1 }));
  // Water in basin
  children.push(createEllipse(x, y - s * 0.06, s * 0.25, s * 0.09, waterColor, { layer: 2, opacity: 0.6 }));

  // Center column
  children.push(createRect(x - s * 0.04, y - s * 0.4, s * 0.08, s * 0.32, stoneColor, { layer: 2 }));
  // Upper basin
  children.push(createEllipse(x, y - s * 0.38, s * 0.12, s * 0.05, stoneColor, { layer: 2, stroke: stoneDark, strokeWidth: 0.8 }));
  children.push(createEllipse(x, y - s * 0.39, s * 0.1, s * 0.04, waterColor, { layer: 2, opacity: 0.5 }));

  // Water spout
  children.push(createPath(x, y, `M${x},${y - s * 0.42} Q${x - s * 0.02},${y - s * 0.55} ${x},${y - s * 0.5}`, 'none', { stroke: waterColor, strokeWidth: 2, layer: 2, opacity: 0.6 }));
  children.push(createPath(x, y, `M${x},${y - s * 0.42} Q${x + s * 0.02},${y - s * 0.55} ${x},${y - s * 0.5}`, 'none', { stroke: waterColor, strokeWidth: 2, layer: 2, opacity: 0.6 }));

  // Falling water streams
  for (let i = 0; i < 4; i++) {
    const angle = (i * 90 + 45) * Math.PI / 180;
    const wx = x + Math.cos(angle) * s * 0.1;
    const wy = y - s * 0.36;
    const dropPath = `M${wx},${wy} Q${wx + Math.cos(angle) * s * 0.08},${wy + s * 0.1} ${wx + Math.cos(angle) * s * 0.15},${y - s * 0.08}`;
    children.push(createPath(x, y, dropPath, 'none', { stroke: waterColor, strokeWidth: 1.5, layer: 2, opacity: 0.4 }));
  }

  // Water droplets
  for (let i = 0; i < 5; i++) {
    children.push(createCircle(
      x + rng.nextFloat(-s * 0.15, s * 0.15),
      y - s * 0.1 - rng.nextFloat(s * 0.25, s * 0.45),
      rng.nextFloat(1, 2.5),
      waterColor, { layer: 2, opacity: rng.nextFloat(0.3, 0.6) },
    ));
  }

  // Basin rim decoration
  for (let i = 0; i < 8; i++) {
    const angle = (i * 45) * Math.PI / 180;
    const dx = x + Math.cos(angle) * s * 0.28;
    const dy = y - s * 0.05 + Math.sin(angle) * s * 0.1;
    children.push(createCircle(dx, dy, s * 0.015, stoneDark, { layer: 2, opacity: 0.3 }));
  }

  return createGroup(x, y, children, { layer: 2, category: 'fountain', modifiable: true, id: uid('fountain'), filter: 'url(#shadow)' });
}

// ── Banner string ────────────────────────────────────────────────
function bannerString(x1: number, y1: number, x2: number, y2: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const midY = Math.max(y1, y2) + 10;

  // String
  const stringPath = `M${x1},${y1} Q${(x1 + x2) / 2},${midY} ${x2},${y2}`;
  children.push(createPath(0, 0, stringPath, 'none', { stroke: '#424242', strokeWidth: 1, layer: 2 }));

  // Triangle pennants
  const flagCount = rng.nextInt(6, 10);
  const colors = ['#F44336', '#FFEB3B', '#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0'];
  for (let i = 0; i < flagCount; i++) {
    const t = (i + 0.5) / flagCount;
    const fx = x1 + t * (x2 - x1);
    const fy = y1 + t * (y2 - y1) + Math.sin(t * Math.PI) * (midY - Math.min(y1, y2));
    const flagSize = rng.nextFloat(8, 12);
    children.push(createPath(0, 0, `M${fx - flagSize * 0.4},${fy} L${fx},${fy + flagSize} L${fx + flagSize * 0.4},${fy} Z`, rng.pick(colors), { layer: 2, opacity: 0.85 }));
  }

  return createGroup(0, 0, children, { layer: 2, category: 'banner', modifiable: true, id: uid('banner') });
}

export function generateSpringFestival(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  // === SVG DEFS ===
  const defs = combineDefs(
    outdoorDefs(),
    skyGradient('springSkyClear', '#42A5F5', '#90CAF9', '#E1F5FE'),
    groundGradient('parkGrass', '#66BB6A', '#388E3C'),
    sunGlowGradient('sunGlow'),
    linearGradient('pathStone', [
      { offset: '0%', color: '#D7CCC8' },
      { offset: '50%', color: '#BCAAA4' },
      { offset: '100%', color: '#A1887F' },
    ]),
    radialGradient('cherryBloom', [
      { offset: '0%', color: '#F8BBD0', opacity: 0.8 },
      { offset: '70%', color: '#F48FB1', opacity: 0.4 },
      { offset: '100%', color: '#F48FB1', opacity: 0 },
    ]),
    dropShadow('festShadow', 2, 4, 3, 'rgba(0,0,0,0.2)'),
    gaussianBlur('bgBlur2', 1.5),
    softGlow('festGlow', 6, '#FFD700'),
  );

  // ════════════════════════════════════════
  // LAYER 0: Sky
  // ════════════════════════════════════════
  elements.push(createRect(0, 0, w, h * 0.5, 'url(#springSkyClear)', { layer: 0, category: 'sky', modifiable: false, id: uid('sky') }));

  // Sun
  const sunX = w * rng.nextFloat(0.7, 0.85);
  const sunY = h * 0.08;
  elements.push(createCircle(sunX, sunY, 45, 'url(#sunGlow)', { layer: 0, category: 'sun', modifiable: false, filter: 'url(#glow)' }));
  elements.push(createCircle(sunX, sunY, 20, '#FFF9C4', { layer: 0, category: 'sun', modifiable: true, id: uid('sun') }));

  // Clouds
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const cloud = detailedCloud(rng.nextFloat(20, w - 60), rng.nextFloat(h * 0.04, h * 0.2), rng.nextFloat(30, 55), rng);
    cloud.modifiable = true;
    cloud.id = uid('cloud');
    elements.push(cloud);
  }

  // ════════════════════════════════════════
  // LAYER 1: Park ground
  // ════════════════════════════════════════
  const groundY = h * 0.48;
  elements.push(createRect(0, groundY, w, h - groundY, 'url(#parkGrass)', { layer: 1, category: 'ground', modifiable: false, id: uid('ground') }));

  // Stone path winding through park
  const pathY = h * 0.65;
  let pathD = `M0,${pathY}`;
  for (let i = 0; i < 6; i++) {
    const sx = (i + 0.5) * w / 6;
    const ex = (i + 1) * w / 6;
    pathD += ` Q${sx},${pathY + rng.nextFloat(-15, 15)} ${ex},${pathY + rng.nextFloat(-5, 5)}`;
  }
  elements.push(createPath(0, 0, pathD, 'none', { stroke: 'url(#pathStone)', strokeWidth: 22, layer: 1, category: 'path', modifiable: false, opacity: 0.7 }));
  // Path edges
  elements.push(createPath(0, 0, pathD, 'none', { stroke: '#A1887F', strokeWidth: 24, layer: 1, category: 'path', modifiable: false, opacity: 0.3 }));

  // ════════════════════════════════════════
  // LAYER 2: Cherry blossom trees (3-4)
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 4); i++) {
    const tx = rng.nextFloat(w * 0.05 + i * w * 0.22, w * 0.2 + i * w * 0.22);
    const ty = groundY + rng.nextFloat(5, 25);
    const treeSize = rng.nextFloat(70, 100);
    const tree = detailedTree(tx, ty, 'cherry', treeSize, rng);
    tree.filter = 'url(#festShadow)';
    tree.modifiable = true;
    tree.id = uid('tree');
    elements.push(tree);

    // Floating petals near tree
    for (let j = 0; j < rng.nextInt(3, 6); j++) {
      const px = tx + rng.nextFloat(-treeSize * 0.5, treeSize * 0.5);
      const py = ty - rng.nextFloat(treeSize * 0.2, treeSize * 0.8);
      elements.push(createEllipse(px, py, rng.nextFloat(2, 4), rng.nextFloat(1, 2.5), rng.pick(['#F8BBD0', '#F48FB1', '#FCE4EC', '#FFCDD2']), {
        layer: 3, category: 'petal', modifiable: false, opacity: rng.nextFloat(0.4, 0.8), rotation: rng.nextFloat(0, 360),
      }));
    }
  }

  // ════════════════════════════════════════
  // LAYER 2: Festival booths (2-3)
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 3); i++) {
    const bx = w * 0.15 + i * w * 0.3 + rng.nextFloat(-20, 20);
    const by = groundY + rng.nextFloat(25, 45);
    elements.push(festivalBooth(bx, by, rng.nextFloat(50, 70), rng));
  }

  // ════════════════════════════════════════
  // LAYER 2: Lanterns (string of 4-6)
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(4, 6); i++) {
    const lx = w * 0.1 + i * w * 0.15 + rng.nextFloat(-10, 10);
    const ly = groundY + rng.nextFloat(-15, 5);
    elements.push(lantern(lx, ly, rng.nextFloat(12, 18), rng));
  }

  // ════════════════════════════════════════
  // LAYER 2: People (3-5)
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const px = rng.nextFloat(w * 0.1, w * 0.85);
    const py = rng.nextFloat(h * 0.6, h * 0.78);
    const person = detailedPerson(px, py, rng.nextFloat(28, 40), rng);
    person.modifiable = true;
    person.id = uid('person');
    elements.push(person);
  }

  // ════════════════════════════════════════
  // LAYER 2: Balloons (3-5)
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const bx = rng.nextFloat(w * 0.1, w * 0.9);
    const by = rng.nextFloat(h * 0.15, h * 0.45);
    elements.push(balloon(bx, by, rng.nextFloat(18, 28), rng));
  }

  // ════════════════════════════════════════
  // LAYER 2: Flowers everywhere (5-8)
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(5, 8); i++) {
    const flower = detailedFlower(rng.nextFloat(10, w - 10), rng.nextFloat(groundY + 10, h - 10), rng.pick(['daisy', 'tulip', 'rose', 'sunflower'] as const), rng.nextFloat(8, 15), rng);
    flower.modifiable = true;
    flower.id = uid('flower');
    elements.push(flower);
  }

  // ════════════════════════════════════════
  // LAYER 2: Butterflies (3-5)
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const bfly = detailedButterfly(rng.nextFloat(w * 0.05, w * 0.95), rng.nextFloat(h * 0.2, h * 0.7), rng.nextFloat(10, 18), rng);
    bfly.modifiable = true;
    bfly.id = uid('bfly');
    elements.push(bfly);
  }

  // ════════════════════════════════════════
  // LAYER 2: Fountain
  // ════════════════════════════════════════
  elements.push(fountain(w * rng.nextFloat(0.45, 0.6), h * rng.nextFloat(0.55, 0.65), rng.nextFloat(50, 70), rng));

  // ════════════════════════════════════════
  // LAYER 2: Park bench
  // ════════════════════════════════════════
  const bench = detailedBench(rng.nextFloat(w * 0.6, w * 0.85), h * rng.nextFloat(0.68, 0.76), rng.nextFloat(35, 45), rng);
  bench.modifiable = true;
  bench.id = uid('bench');
  elements.push(bench);

  // ════════════════════════════════════════
  // LAYER 2: Banner strings
  // ════════════════════════════════════════
  elements.push(bannerString(w * 0.05, groundY - 10, w * 0.45, groundY - 15, rng));
  if (rng.chance(0.7)) {
    elements.push(bannerString(w * 0.5, groundY - 12, w * 0.95, groundY - 8, rng));
  }

  // ════════════════════════════════════════
  // LAYER 3: Floating cherry blossom petals
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(8, 14); i++) {
    elements.push(createEllipse(
      rng.nextFloat(5, w - 5),
      rng.nextFloat(h * 0.1, h * 0.7),
      rng.nextFloat(2, 4),
      rng.nextFloat(1, 2.5),
      rng.pick(['#F8BBD0', '#F48FB1', '#FCE4EC', '#FFCDD2']),
      { layer: 3, category: 'petal', modifiable: false, opacity: rng.nextFloat(0.3, 0.7), rotation: rng.nextFloat(0, 360) },
    ));
  }

  // ════════════════════════════════════════
  // LAYER 3: Birds
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const bird = detailedBird(rng.nextFloat(20, w - 20), rng.nextFloat(h * 0.04, h * 0.2), true, rng);
    bird.modifiable = true;
    bird.id = uid('bird');
    elements.push(bird);
  }

  // Foreground grass
  for (let i = 0; i < rng.nextInt(5, 8); i++) {
    const gx = rng.nextFloat(5, w - 5);
    const gy = h - rng.nextFloat(3, 15);
    const grassPath = `M${gx},${gy + 3} Q${gx - 2},${gy - 6} ${gx - 4},${gy - 12} M${gx},${gy + 3} Q${gx + 2},${gy - 8} ${gx + 3},${gy - 14}`;
    elements.push(createPath(0, 0, grassPath, 'none', {
      stroke: rng.pick(['#388E3C', '#43A047', '#2E7D32']),
      strokeWidth: 1.5, layer: 3, category: 'grass', modifiable: false, opacity: 0.5,
    }));
  }

  return { elements, defs };
}
