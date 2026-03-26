import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath, createLine, createGroup,
} from '../engine/primitives';
import {
  combineDefs, outdoorDefs, snowGradient,
  linearGradient, radialGradient,
  dropShadow, gaussianBlur, softGlow,
} from './svg-effects';
import {
  detailedTree, detailedPerson, detailedRock,
  resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'ww') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// ── Snowman ──────────────────────────────────────────────────────
function snowman(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const scarfColor = rng.pick(['#DC143C', '#FF4500', '#4169E1', '#228B22', '#9C27B0']);

  // Shadow
  children.push(createEllipse(x, y + s * 0.02, s * 0.2, s * 0.04, 'rgba(0,0,0,0.08)', { layer: 2 }));

  // Bottom ball
  children.push(createCircle(x, y - s * 0.18, s * 0.22, '#FAFAFA', { layer: 2, stroke: '#E0E0E0', strokeWidth: 1 }));
  children.push(createCircle(x - s * 0.08, y - s * 0.22, s * 0.04, '#FFF', { layer: 2, opacity: 0.3 }));

  // Middle ball
  children.push(createCircle(x, y - s * 0.45, s * 0.16, '#FAFAFA', { layer: 2, stroke: '#E0E0E0', strokeWidth: 1 }));
  children.push(createCircle(x - s * 0.06, y - s * 0.48, s * 0.03, '#FFF', { layer: 2, opacity: 0.3 }));

  // Head
  children.push(createCircle(x, y - s * 0.68, s * 0.12, '#FAFAFA', { layer: 2, stroke: '#E0E0E0', strokeWidth: 1 }));

  // Top hat
  children.push(createRect(x - s * 0.1, y - s * 0.88, s * 0.2, s * 0.12, '#1a1a1a', { layer: 2 }));
  children.push(createRect(x - s * 0.14, y - s * 0.78, s * 0.28, s * 0.03, '#1a1a1a', { layer: 2 }));
  children.push(createRect(x - s * 0.1, y - s * 0.82, s * 0.2, s * 0.025, scarfColor, { layer: 2 }));

  // Coal eyes
  children.push(createCircle(x - s * 0.04, y - s * 0.71, s * 0.015, '#111', { layer: 2 }));
  children.push(createCircle(x + s * 0.04, y - s * 0.71, s * 0.015, '#111', { layer: 2 }));

  // Carrot nose
  children.push(createPath(x, y, `M${x},${y - s * 0.68} L${x + s * 0.12},${y - s * 0.66} L${x},${y - s * 0.65} Z`, '#FF8C00', { layer: 2 }));

  // Smile (coal dots)
  for (let i = 0; i < 5; i++) {
    const angle = (160 + i * 10) * Math.PI / 180;
    children.push(createCircle(x + Math.cos(angle) * s * 0.07, y - s * 0.65 + Math.sin(angle) * s * 0.05, s * 0.01, '#111', { layer: 2 }));
  }

  // Scarf
  children.push(createRect(x - s * 0.13, y - s * 0.56, s * 0.26, s * 0.04, scarfColor, { layer: 2 }));
  children.push(createRect(x + s * 0.06, y - s * 0.56, s * 0.04, s * 0.12, scarfColor, { layer: 2 }));
  // Scarf fringe
  for (let i = 0; i < 3; i++) {
    children.push(createLine(x + s * 0.065 + i * s * 0.012, y - s * 0.44, x + s * 0.065 + i * s * 0.012, y - s * 0.41, scarfColor, { strokeWidth: 1, layer: 2 }));
  }

  // Buttons
  for (let i = 0; i < 3; i++) {
    children.push(createCircle(x, y - s * 0.38 - i * s * 0.06, s * 0.015, '#111', { layer: 2 }));
  }

  // Stick arms
  children.push(createLine(x - s * 0.16, y - s * 0.45, x - s * 0.35, y - s * 0.55, '#5C3317', { strokeWidth: 2.5, layer: 2 }));
  children.push(createLine(x + s * 0.16, y - s * 0.45, x + s * 0.35, y - s * 0.52, '#5C3317', { strokeWidth: 2.5, layer: 2 }));
  // Twig fingers
  children.push(createLine(x - s * 0.35, y - s * 0.55, x - s * 0.38, y - s * 0.6, '#5C3317', { strokeWidth: 1.5, layer: 2 }));
  children.push(createLine(x - s * 0.35, y - s * 0.55, x - s * 0.4, y - s * 0.56, '#5C3317', { strokeWidth: 1.5, layer: 2 }));
  children.push(createLine(x + s * 0.35, y - s * 0.52, x + s * 0.38, y - s * 0.57, '#5C3317', { strokeWidth: 1.5, layer: 2 }));
  children.push(createLine(x + s * 0.35, y - s * 0.52, x + s * 0.4, y - s * 0.53, '#5C3317', { strokeWidth: 1.5, layer: 2 }));

  return createGroup(x, y, children, { layer: 2, category: 'snowman', modifiable: true, id: uid('snowman'), filter: 'url(#shadow)' });
}

// ── Snow fort ────────────────────────────────────────────────────
function snowFort(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const snowWhite = '#FAFAFA';
  const snowShadow = '#D0E0F0';

  // Shadow
  children.push(createEllipse(x, y + s * 0.02, s * 0.4, s * 0.05, 'rgba(0,0,0,0.06)', { layer: 2 }));

  // Main wall
  children.push(createPath(x, y, `M${x - s * 0.35},${y} L${x - s * 0.35},${y - s * 0.25} Q${x},${y - s * 0.28} ${x + s * 0.35},${y - s * 0.25} L${x + s * 0.35},${y} Z`, snowWhite, { layer: 2, stroke: snowShadow, strokeWidth: 1 }));

  // Crenellations (snow blocks on top)
  for (let i = 0; i < 5; i++) {
    const bx = x - s * 0.3 + i * s * 0.15;
    children.push(createRect(bx, y - s * 0.32, s * 0.08, s * 0.07, snowWhite, { layer: 2, stroke: snowShadow, strokeWidth: 0.5 }));
  }

  // Snow block texture
  for (let i = 0; i < 3; i++) {
    const by = y - s * 0.08 - i * s * 0.08;
    children.push(createLine(x - s * 0.32, by, x + s * 0.32, by, snowShadow, { strokeWidth: 0.5, layer: 2, opacity: 0.4 }));
  }
  for (let i = 0; i < 4; i++) {
    const bx = x - s * 0.2 + i * s * 0.14;
    children.push(createLine(bx, y, bx, y - s * 0.24, snowShadow, { strokeWidth: 0.3, layer: 2, opacity: 0.3 }));
  }

  // Snowballs in front
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    children.push(createCircle(
      x + rng.nextFloat(-s * 0.25, s * 0.25),
      y + rng.nextFloat(-s * 0.02, s * 0.05),
      rng.nextFloat(s * 0.025, s * 0.04),
      snowWhite, { layer: 2, stroke: snowShadow, strokeWidth: 0.5 },
    ));
  }

  return createGroup(x, y, children, { layer: 2, category: 'fort', modifiable: true, id: uid('fort') });
}

// ── Sled ─────────────────────────────────────────────────────────
function sled(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const woodColor = rng.pick(['#8B4513', '#A0522D', '#5D4037']);
  const metalColor = '#616161';

  // Runners
  children.push(createPath(x, y, `M${x - s * 0.3},${y} Q${x - s * 0.35},${y - s * 0.04} ${x - s * 0.3},${y - s * 0.08} L${x + s * 0.25},${y - s * 0.08}`, 'none', { stroke: metalColor, strokeWidth: 2, layer: 2 }));
  children.push(createPath(x, y, `M${x - s * 0.28},${y + s * 0.04} Q${x - s * 0.33},${y} ${x - s * 0.28},${y - s * 0.04} L${x + s * 0.27},${y - s * 0.04}`, 'none', { stroke: metalColor, strokeWidth: 2, layer: 2 }));

  // Seat slats
  for (let i = 0; i < 4; i++) {
    const sx = x - s * 0.2 + i * s * 0.12;
    children.push(createRect(sx, y - s * 0.12, s * 0.08, s * 0.02, woodColor, { layer: 2 }));
  }

  // Rope
  children.push(createPath(x, y, `M${x + s * 0.25},${y - s * 0.1} Q${x + s * 0.35},${y - s * 0.18} ${x + s * 0.32},${y - s * 0.22}`, 'none', { stroke: '#8D6E63', strokeWidth: 1.5, layer: 2 }));

  return createGroup(x, y, children, { layer: 2, category: 'sled', modifiable: true, id: uid('sled') });
}

// ── Ice skater ───────────────────────────────────────────────────
function iceSkater(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const skinColor = rng.pick(['#FFCCBC', '#FFE0B2', '#D7A98C', '#8D6E63']);
  const coatColor = rng.pick(['#F44336', '#2196F3', '#4CAF50', '#9C27B0', '#FF9800']);
  const pantsColor = rng.pick(['#1a1a1a', '#3E2723', '#1565C0']);

  // Body/coat
  children.push(createRect(x - s * 0.06, y - s * 0.45, s * 0.12, s * 0.2, coatColor, { layer: 2 }));
  // Pants/legs
  children.push(createRect(x - s * 0.05, y - s * 0.25, s * 0.04, s * 0.18, pantsColor, { layer: 2 }));
  children.push(createRect(x + s * 0.01, y - s * 0.25, s * 0.04, s * 0.18, pantsColor, { layer: 2 }));

  // Skates
  children.push(createLine(x - s * 0.06, y - s * 0.07, x + s * 0.02, y - s * 0.07, '#C0C0C0', { strokeWidth: 1.5, layer: 2 }));
  children.push(createLine(x, y - s * 0.07, x + s * 0.08, y - s * 0.07, '#C0C0C0', { strokeWidth: 1.5, layer: 2 }));

  // Boots
  children.push(createRect(x - s * 0.06, y - s * 0.1, s * 0.05, s * 0.04, '#1a1a1a', { layer: 2 }));
  children.push(createRect(x + s * 0.01, y - s * 0.1, s * 0.05, s * 0.04, '#1a1a1a', { layer: 2 }));

  // Head
  children.push(createCircle(x, y - s * 0.52, s * 0.06, skinColor, { layer: 2 }));
  // Eyes
  children.push(createCircle(x - s * 0.02, y - s * 0.53, s * 0.008, '#111', { layer: 2 }));
  children.push(createCircle(x + s * 0.02, y - s * 0.53, s * 0.008, '#111', { layer: 2 }));

  // Winter hat (beanie)
  children.push(createPath(x, y, `M${x - s * 0.065},${y - s * 0.55} Q${x},${y - s * 0.7} ${x + s * 0.065},${y - s * 0.55}`, coatColor, { layer: 2 }));
  // Pom pom
  children.push(createCircle(x, y - s * 0.68, s * 0.02, '#FFF', { layer: 2 }));

  // Arms (extended for balance)
  children.push(createLine(x - s * 0.06, y - s * 0.4, x - s * 0.18, y - s * 0.48, coatColor, { strokeWidth: s * 0.04, layer: 2 }));
  children.push(createLine(x + s * 0.06, y - s * 0.4, x + s * 0.18, y - s * 0.45, coatColor, { strokeWidth: s * 0.04, layer: 2 }));

  // Mittens
  children.push(createCircle(x - s * 0.19, y - s * 0.49, s * 0.02, coatColor, { layer: 2 }));
  children.push(createCircle(x + s * 0.19, y - s * 0.46, s * 0.02, coatColor, { layer: 2 }));

  return createGroup(x, y, children, { layer: 2, category: 'skater', modifiable: true, id: uid('skater') });
}

// ── Icicle cluster ───────────────────────────────────────────────
function icicles(x: number, y: number, count: number, maxLen: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  for (let i = 0; i < count; i++) {
    const ix = x + i * rng.nextFloat(4, 8);
    const len = rng.nextFloat(maxLen * 0.4, maxLen);
    children.push(createPath(ix, y, `M${ix - 2},${y} L${ix},${y + len} L${ix + 2},${y} Z`, '#E3F2FD', { layer: 3, opacity: 0.7 }));
    // Highlight
    children.push(createLine(ix - 0.5, y + 1, ix, y + len * 0.7, '#FFF', { strokeWidth: 0.5, layer: 3, opacity: 0.5 }));
  }
  return createGroup(x, y, children, { layer: 3, category: 'icicle', modifiable: true, id: uid('icicle') });
}

// ── Northern Lights ──────────────────────────────────────────────
function northernLights(w: number, h: number, rng: SeededRandom): SVGElementData[] {
  const elems: SVGElementData[] = [];
  const colors = ['#00E676', '#69F0AE', '#00BFA5', '#1DE9B6', '#64FFDA', '#18FFFF', '#80D8FF'];

  for (let i = 0; i < rng.nextInt(4, 7); i++) {
    const cx = rng.nextFloat(w * 0.1, w * 0.9);
    const cy = rng.nextFloat(h * 0.03, h * 0.2);
    const cw = rng.nextFloat(60, 150);
    const ch = rng.nextFloat(15, 40);
    const color = rng.pick(colors);

    // Wide ethereal bands
    const bandPath = `M${cx - cw / 2},${cy} Q${cx - cw * 0.2},${cy - ch * 0.5} ${cx},${cy - ch * 0.3} Q${cx + cw * 0.3},${cy + ch * 0.2} ${cx + cw / 2},${cy - ch * 0.1}`;
    elems.push(createPath(0, 0, bandPath, 'none', {
      stroke: color, strokeWidth: rng.nextFloat(8, 20), layer: 0, category: 'aurora',
      modifiable: false, opacity: rng.nextFloat(0.08, 0.2), filter: 'url(#auroraBlur)',
    }));
  }

  return elems;
}

export function generateWinterWonderland(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  // === SVG DEFS ===
  const defs = combineDefs(
    outdoorDefs(),
    linearGradient('nightSky', [
      { offset: '0%', color: '#0D1B2A' },
      { offset: '30%', color: '#1B2838' },
      { offset: '60%', color: '#1B3A4B' },
      { offset: '100%', color: '#2A4858' },
    ]),
    snowGradient('snowGrad'),
    linearGradient('frozenLake', [
      { offset: '0%', color: '#B3E5FC', opacity: 0.7 },
      { offset: '50%', color: '#81D4FA', opacity: 0.6 },
      { offset: '100%', color: '#4FC3F7', opacity: 0.5 },
    ]),
    linearGradient('iceSheen', [
      { offset: '0%', color: '#E1F5FE', opacity: 0.4 },
      { offset: '50%', color: '#FFF', opacity: 0.2 },
      { offset: '100%', color: '#E1F5FE', opacity: 0.1 },
    ]),
    radialGradient('moonGlow', [
      { offset: '0%', color: '#FFFFFF', opacity: 1 },
      { offset: '30%', color: '#E3F2FD', opacity: 0.6 },
      { offset: '70%', color: '#B3E5FC', opacity: 0.2 },
      { offset: '100%', color: '#B3E5FC', opacity: 0 },
    ]),
    radialGradient('starTwinkle', [
      { offset: '0%', color: '#FFFFFF', opacity: 1 },
      { offset: '100%', color: '#FFFFFF', opacity: 0 },
    ]),
    dropShadow('winterShadow', 2, 3, 3, 'rgba(0,0,0,0.15)'),
    gaussianBlur('auroraBlur', 8),
    gaussianBlur('snowBlur', 1),
    softGlow('moonBloom', 10, '#E3F2FD'),
  );

  // ════════════════════════════════════════
  // LAYER 0: Night sky
  // ════════════════════════════════════════
  elements.push(createRect(0, 0, w, h * 0.55, 'url(#nightSky)', { layer: 0, category: 'sky', modifiable: false, id: uid('sky') }));

  // Stars
  for (let i = 0; i < rng.nextInt(25, 40); i++) {
    const sx = rng.nextFloat(5, w - 5);
    const sy = rng.nextFloat(5, h * 0.45);
    const sr = rng.nextFloat(0.5, 2);
    elements.push(createCircle(sx, sy, sr, '#FFF', {
      layer: 0, category: 'star', modifiable: false, opacity: rng.nextFloat(0.3, 0.9),
    }));
  }
  // Bright stars with glow
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    const sx = rng.nextFloat(20, w - 20);
    const sy = rng.nextFloat(10, h * 0.35);
    elements.push(createCircle(sx, sy, 4, 'url(#starTwinkle)', { layer: 0, category: 'star', modifiable: false }));
    elements.push(createCircle(sx, sy, 1.5, '#FFF', { layer: 0, category: 'star', modifiable: false }));
  }

  // Moon
  const moonX = w * rng.nextFloat(0.7, 0.85);
  const moonY = h * 0.1;
  elements.push(createCircle(moonX, moonY, 35, 'url(#moonGlow)', { layer: 0, category: 'moon', modifiable: false, filter: 'url(#moonBloom)' }));
  elements.push(createCircle(moonX, moonY, 18, '#F5F5F5', { layer: 0, category: 'moon', modifiable: true, id: uid('moon') }));
  // Moon craters
  [
    createCircle(moonX - 5, moonY - 3, 3, '#E0E0E0', { layer: 0, opacity: 0.3 }),
    createCircle(moonX + 4, moonY + 5, 2, '#E0E0E0', { layer: 0, opacity: 0.2 }),
  ].forEach(c => { c.category = 'moon'; elements.push(c); });

  // ════════════════════════════════════════
  // LAYER 0: Northern lights
  // ════════════════════════════════════════
  elements.push(...northernLights(w, h, rng));

  // ════════════════════════════════════════
  // LAYER 1: Snow-covered ground
  // ════════════════════════════════════════
  const groundY = h * 0.5;
  // Rolling snow hills
  let snowPath = `M0,${groundY + 5}`;
  for (let i = 0; i < 6; i++) {
    const sx = (i + 0.5) * w / 6;
    const ex = (i + 1) * w / 6;
    snowPath += ` Q${sx},${groundY - rng.nextFloat(5, 20)} ${ex},${groundY + rng.nextFloat(-3, 5)}`;
  }
  snowPath += ` L${w},${h} L0,${h} Z`;
  elements.push(createPath(0, 0, snowPath, 'url(#snowGrad)', { layer: 1, category: 'ground', modifiable: false, id: uid('ground') }));

  // Snow sparkle dots
  for (let i = 0; i < rng.nextInt(15, 25); i++) {
    elements.push(createCircle(
      rng.nextFloat(5, w - 5),
      rng.nextFloat(groundY, h - 5),
      rng.nextFloat(0.5, 1.5),
      '#FFF', { layer: 1, category: 'sparkle', modifiable: false, opacity: rng.nextFloat(0.3, 0.7) },
    ));
  }

  // ════════════════════════════════════════
  // LAYER 1: Frozen lake
  // ════════════════════════════════════════
  const lakeX = w * rng.nextFloat(0.3, 0.5);
  const lakeY = h * rng.nextFloat(0.6, 0.68);
  const lakeRx = rng.nextFloat(80, 110);
  const lakeRy = rng.nextFloat(25, 35);

  // Lake body
  elements.push(createEllipse(lakeX, lakeY, lakeRx, lakeRy, 'url(#frozenLake)', { layer: 1, category: 'lake', modifiable: true, id: uid('lake') }));
  // Ice sheen
  elements.push(createEllipse(lakeX - lakeRx * 0.2, lakeY - lakeRy * 0.2, lakeRx * 0.4, lakeRy * 0.4, 'url(#iceSheen)', { layer: 1, category: 'lake', modifiable: false }));
  // Scratches from skates
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    const sx = lakeX + rng.nextFloat(-lakeRx * 0.5, lakeRx * 0.5);
    const sy = lakeY + rng.nextFloat(-lakeRy * 0.4, lakeRy * 0.4);
    const len = rng.nextFloat(10, 25);
    const angle = rng.nextFloat(0, Math.PI);
    elements.push(createLine(sx, sy, sx + Math.cos(angle) * len, sy + Math.sin(angle) * len * 0.3, '#FFF', {
      strokeWidth: 0.5, layer: 1, category: 'ice', modifiable: false, opacity: rng.nextFloat(0.2, 0.4),
    }));
  }

  // ════════════════════════════════════════
  // LAYER 2: Snow-covered trees (4-6)
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(4, 6); i++) {
    const tx = rng.nextFloat(w * 0.02 + i * w * 0.15, w * 0.15 + i * w * 0.15);
    const ty = groundY + rng.nextFloat(0, 15);
    const treeSize = rng.nextFloat(55, 90);
    const tree = detailedTree(tx, ty, 'pine', treeSize, rng);
    tree.filter = 'url(#winterShadow)';
    tree.modifiable = true;
    tree.id = uid('tree');
    elements.push(tree);

    // Snow caps on tree
    for (let j = 0; j < rng.nextInt(2, 4); j++) {
      const sx = tx + rng.nextFloat(-treeSize * 0.2, treeSize * 0.2);
      const sy = ty - treeSize * (0.2 + j * 0.18) + rng.nextFloat(-5, 5);
      const snowW = rng.nextFloat(8, 18);
      elements.push(createEllipse(sx, sy, snowW, snowW * 0.3, '#FAFAFA', {
        layer: 2, category: 'snow', modifiable: false, opacity: 0.8,
      }));
    }
  }

  // ════════════════════════════════════════
  // LAYER 2: Ice skaters (2-3) on the lake
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 3); i++) {
    const sx = lakeX + rng.nextFloat(-lakeRx * 0.5, lakeRx * 0.5);
    const sy = lakeY + rng.nextFloat(-lakeRy * 0.3, lakeRy * 0.3);
    elements.push(iceSkater(sx, sy, rng.nextFloat(30, 45), rng));
  }

  // ════════════════════════════════════════
  // LAYER 2: Snowman
  // ════════════════════════════════════════
  elements.push(snowman(
    w * rng.nextFloat(0.15, 0.3),
    groundY + rng.nextFloat(15, 35),
    rng.nextFloat(50, 70),
    rng,
  ));

  // ════════════════════════════════════════
  // LAYER 2: Snow fort
  // ════════════════════════════════════════
  elements.push(snowFort(
    w * rng.nextFloat(0.65, 0.82),
    groundY + rng.nextFloat(20, 40),
    rng.nextFloat(55, 75),
    rng,
  ));

  // ════════════════════════════════════════
  // LAYER 2: Sled
  // ════════════════════════════════════════
  elements.push(sled(
    w * rng.nextFloat(0.5, 0.7),
    groundY + rng.nextFloat(25, 50),
    rng.nextFloat(35, 50),
    rng,
  ));

  // ════════════════════════════════════════
  // LAYER 2: People (standing around, 2-3)
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 3); i++) {
    const px = rng.nextFloat(w * 0.05, w * 0.95);
    const py = rng.nextFloat(groundY + 15, h * 0.82);
    // Don't place on the lake
    if (Math.abs(px - lakeX) < lakeRx && Math.abs(py - lakeY) < lakeRy) continue;
    const person = detailedPerson(px, py, rng.nextFloat(28, 40), rng);
    person.modifiable = true;
    person.id = uid('person');
    elements.push(person);
  }

  // ════════════════════════════════════════
  // LAYER 2: Rocks with snow
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const rx = rng.nextFloat(10, w - 10);
    const ry = rng.nextFloat(groundY + 5, h * 0.85);
    const rock = detailedRock(rx, ry, rng.nextFloat(8, 16), rng);
    rock.filter = 'url(#winterShadow)';
    rock.modifiable = true;
    rock.id = uid('rock');
    elements.push(rock);
    // Snow on rock
    elements.push(createEllipse(rx, ry - 6, 8, 3, '#FAFAFA', {
      layer: 2, category: 'snow', modifiable: false, opacity: 0.8,
    }));
  }

  // ════════════════════════════════════════
  // LAYER 3: Icicles on trees
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const ix = rng.nextFloat(w * 0.1, w * 0.9);
    const iy = groundY + rng.nextFloat(-30, -10);
    elements.push(icicles(ix, iy, rng.nextInt(3, 6), rng.nextFloat(10, 20), rng));
  }

  // ════════════════════════════════════════
  // LAYER 3: Falling snowflakes
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(20, 35); i++) {
    const fx = rng.nextFloat(0, w);
    const fy = rng.nextFloat(0, h);
    const fSize = rng.nextFloat(1, 4);
    elements.push(createCircle(fx, fy, fSize, '#FFF', {
      layer: 3, category: 'snowflake', modifiable: false, opacity: rng.nextFloat(0.3, 0.8),
      filter: fSize > 2.5 ? 'url(#snowBlur)' : undefined,
    }));
  }

  // Larger decorative snowflakes (modifiable)
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const sx = rng.nextFloat(w * 0.1, w * 0.9);
    const sy = rng.nextFloat(h * 0.1, h * 0.45);
    const ss = rng.nextFloat(6, 10);
    const sfChildren: SVGElementData[] = [];
    // 6-armed snowflake
    for (let a = 0; a < 6; a++) {
      const angle = (a * 60) * Math.PI / 180;
      sfChildren.push(createLine(sx, sy, sx + Math.cos(angle) * ss, sy + Math.sin(angle) * ss, '#FFF', {
        strokeWidth: 1, layer: 3, opacity: 0.7,
      }));
      // Branch
      const bx = sx + Math.cos(angle) * ss * 0.6;
      const by = sy + Math.sin(angle) * ss * 0.6;
      const ba1 = angle + Math.PI / 4;
      const ba2 = angle - Math.PI / 4;
      sfChildren.push(createLine(bx, by, bx + Math.cos(ba1) * ss * 0.3, by + Math.sin(ba1) * ss * 0.3, '#FFF', {
        strokeWidth: 0.7, layer: 3, opacity: 0.5,
      }));
      sfChildren.push(createLine(bx, by, bx + Math.cos(ba2) * ss * 0.3, by + Math.sin(ba2) * ss * 0.3, '#FFF', {
        strokeWidth: 0.7, layer: 3, opacity: 0.5,
      }));
    }
    elements.push(createGroup(sx, sy, sfChildren, { layer: 3, category: 'snowflake', modifiable: true, id: uid('flake') }));
  }

  // ════════════════════════════════════════
  // LAYER 3: Snow drifts in foreground
  // ════════════════════════════════════════
  const driftPath = `M0,${h - 15} Q${w * 0.15},${h - 25} ${w * 0.3},${h - 12} Q${w * 0.5},${h - 20} ${w * 0.7},${h - 10} Q${w * 0.85},${h - 18} ${w},${h - 8} L${w},${h} L0,${h} Z`;
  elements.push(createPath(0, 0, driftPath, '#F5F5F5', { layer: 3, category: 'snow', modifiable: false, opacity: 0.6 }));

  return { elements, defs };
}
