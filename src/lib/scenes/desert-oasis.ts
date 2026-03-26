import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath, createLine, createGroup,
} from '../engine/primitives';
import {
  combineDefs, outdoorDefs, skyGradient, sandGradient,
  linearGradient, radialGradient, sunGlowGradient, waterGradient,
  dropShadow, gaussianBlur, softGlow,
} from './svg-effects';
import {
  detailedTree, detailedRock, detailedBird,
  resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'do') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// ── Cactus (saguaro style) ─────────────────────────────────────
function cactus(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const green = rng.pick(['#2E7D32', '#388E3C', '#1B5E20', '#33691E']);
  const darkGreen = '#1B5E20';

  // Shadow
  children.push(createEllipse(x, y + s * 0.02, s * 0.15, s * 0.04, 'rgba(0,0,0,0.12)', { layer: 2 }));

  // Main trunk
  const trunkPath = `M${x - s * 0.06},${y} L${x - s * 0.06},${y - s * 0.7} Q${x},${y - s * 0.78} ${x + s * 0.06},${y - s * 0.7} L${x + s * 0.06},${y} Z`;
  children.push(createPath(x, y, trunkPath, green, { layer: 2 }));

  // Trunk ridges
  for (let i = 0; i < 3; i++) {
    const rx = x - s * 0.03 + i * s * 0.03;
    children.push(createLine(rx, y, rx, y - s * 0.68, darkGreen, { strokeWidth: 0.5, layer: 2, opacity: 0.3 }));
  }

  // Left arm
  if (rng.chance(0.8)) {
    const armY = y - s * rng.nextFloat(0.35, 0.55);
    const armPath = `M${x - s * 0.06},${armY} L${x - s * 0.22},${armY} Q${x - s * 0.28},${armY} ${x - s * 0.28},${armY - s * 0.06} L${x - s * 0.28},${armY - s * 0.2} Q${x - s * 0.22},${armY - s * 0.26} ${x - s * 0.16},${armY - s * 0.2} L${x - s * 0.16},${armY - s * 0.06} Q${x - s * 0.16},${armY + s * 0.02} ${x - s * 0.06},${armY + s * 0.06}`;
    children.push(createPath(x, y, armPath, green, { layer: 2 }));
  }

  // Right arm
  if (rng.chance(0.8)) {
    const armY = y - s * rng.nextFloat(0.4, 0.6);
    const armPath = `M${x + s * 0.06},${armY} L${x + s * 0.2},${armY} Q${x + s * 0.26},${armY} ${x + s * 0.26},${armY - s * 0.06} L${x + s * 0.26},${armY - s * 0.18} Q${x + s * 0.2},${armY - s * 0.24} ${x + s * 0.14},${armY - s * 0.18} L${x + s * 0.14},${armY - s * 0.06} Q${x + s * 0.14},${armY + s * 0.02} ${x + s * 0.06},${armY + s * 0.06}`;
    children.push(createPath(x, y, armPath, green, { layer: 2 }));
  }

  // Flowers on top
  if (rng.chance(0.4)) {
    children.push(createCircle(x, y - s * 0.76, s * 0.03, rng.pick(['#FFD700', '#FF6F61', '#FF1493']), { layer: 2 }));
  }

  return createGroup(x, y, children, { layer: 2, category: 'cactus', modifiable: true, id: uid('cactus'), filter: 'url(#shadow)' });
}

// ── Camel ───────────────────────────────────────────────────────
function camel(x: number, y: number, size: number, rng: SeededRandom, facing = 1): SVGElementData {
  const s = size;
  const f = facing;
  const children: SVGElementData[] = [];
  const bodyColor = rng.pick(['#C19A6B', '#B8860B', '#D2B48C', '#A0826D']);
  const darkBody = '#8B6914';

  // Shadow
  children.push(createEllipse(x, y + s * 0.02, s * 0.35, s * 0.05, 'rgba(0,0,0,0.1)', { layer: 2 }));

  // Legs (4)
  const legW = s * 0.04;
  const legH = s * 0.3;
  children.push(createRect(x + f * s * 0.12, y - legH, legW, legH, darkBody, { layer: 2 }));
  children.push(createRect(x + f * s * 0.18, y - legH, legW, legH, bodyColor, { layer: 2 }));
  children.push(createRect(x - f * s * 0.15, y - legH, legW, legH, darkBody, { layer: 2 }));
  children.push(createRect(x - f * s * 0.1, y - legH, legW, legH, bodyColor, { layer: 2 }));

  // Body
  const bodyPath = `M${x - f * s * 0.2},${y - s * 0.3} Q${x - f * s * 0.15},${y - s * 0.55} ${x},${y - s * 0.5} Q${x + f * s * 0.08},${y - s * 0.6} ${x + f * s * 0.15},${y - s * 0.5} Q${x + f * s * 0.25},${y - s * 0.45} ${x + f * s * 0.22},${y - s * 0.3} Z`;
  children.push(createPath(x, y, bodyPath, bodyColor, { layer: 2 }));

  // Hump
  const humpPath = `M${x - f * s * 0.05},${y - s * 0.5} Q${x},${y - s * 0.7} ${x + f * s * 0.08},${y - s * 0.5}`;
  children.push(createPath(x, y, humpPath, bodyColor, { layer: 2, stroke: darkBody, strokeWidth: 0.5 }));

  // Neck
  const neckPath = `M${x + f * s * 0.2},${y - s * 0.4} Q${x + f * s * 0.28},${y - s * 0.6} ${x + f * s * 0.3},${y - s * 0.75}`;
  children.push(createPath(x, y, neckPath, 'none', { stroke: bodyColor, strokeWidth: s * 0.06, layer: 2 }));

  // Head
  const headX = x + f * s * 0.3;
  const headY = y - s * 0.78;
  children.push(createEllipse(headX, headY, s * 0.06, s * 0.04, bodyColor, { layer: 2 }));
  // Eye
  children.push(createCircle(headX + f * s * 0.03, headY - s * 0.01, s * 0.01, '#222', { layer: 2 }));
  // Ear
  children.push(createEllipse(headX - f * s * 0.01, headY - s * 0.04, s * 0.015, s * 0.02, darkBody, { layer: 2 }));

  // Tail
  const tailPath = `M${x - f * s * 0.2},${y - s * 0.4} Q${x - f * s * 0.28},${y - s * 0.45} ${x - f * s * 0.25},${y - s * 0.35}`;
  children.push(createPath(x, y, tailPath, 'none', { stroke: darkBody, strokeWidth: 1.5, layer: 2 }));

  return createGroup(x, y, children, { layer: 2, category: 'camel', modifiable: true, id: uid('camel') });
}

// ── Desert Fox ──────────────────────────────────────────────────
function desertFox(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const furColor = '#E8B86D';
  const darkFur = '#C4913B';
  const belly = '#FFF8E1';

  // Shadow
  children.push(createEllipse(x, y + s * 0.02, s * 0.2, s * 0.03, 'rgba(0,0,0,0.1)', { layer: 2 }));

  // Body
  children.push(createEllipse(x, y - s * 0.15, s * 0.18, s * 0.1, furColor, { layer: 2 }));
  // Belly
  children.push(createEllipse(x, y - s * 0.12, s * 0.12, s * 0.06, belly, { layer: 2, opacity: 0.7 }));

  // Legs
  children.push(createRect(x - s * 0.1, y - s * 0.08, s * 0.03, s * 0.1, darkFur, { layer: 2 }));
  children.push(createRect(x - s * 0.05, y - s * 0.08, s * 0.03, s * 0.1, darkFur, { layer: 2 }));
  children.push(createRect(x + s * 0.04, y - s * 0.08, s * 0.03, s * 0.1, furColor, { layer: 2 }));
  children.push(createRect(x + s * 0.09, y - s * 0.08, s * 0.03, s * 0.1, furColor, { layer: 2 }));

  // Head
  children.push(createCircle(x + s * 0.18, y - s * 0.2, s * 0.08, furColor, { layer: 2 }));
  // Snout
  children.push(createEllipse(x + s * 0.25, y - s * 0.18, s * 0.04, s * 0.025, belly, { layer: 2 }));
  children.push(createCircle(x + s * 0.28, y - s * 0.18, s * 0.01, '#222', { layer: 2 }));
  // Eye
  children.push(createCircle(x + s * 0.2, y - s * 0.22, s * 0.012, '#222', { layer: 2 }));

  // Ears (big fennec-style)
  const ear1 = `M${x + s * 0.14},${y - s * 0.26} L${x + s * 0.12},${y - s * 0.42} L${x + s * 0.18},${y - s * 0.28} Z`;
  const ear2 = `M${x + s * 0.2},${y - s * 0.26} L${x + s * 0.22},${y - s * 0.42} L${x + s * 0.26},${y - s * 0.28} Z`;
  children.push(createPath(x, y, ear1, furColor, { layer: 2 }));
  children.push(createPath(x, y, ear2, furColor, { layer: 2 }));
  // Inner ears
  children.push(createPath(x, y, `M${x + s * 0.145},${y - s * 0.28} L${x + s * 0.13},${y - s * 0.38} L${x + s * 0.17},${y - s * 0.29} Z`, '#F8BBD0', { layer: 2, opacity: 0.6 }));
  children.push(createPath(x, y, `M${x + s * 0.205},${y - s * 0.28} L${x + s * 0.215},${y - s * 0.38} L${x + s * 0.25},${y - s * 0.29} Z`, '#F8BBD0', { layer: 2, opacity: 0.6 }));

  // Bushy tail
  const tailPath = `M${x - s * 0.18},${y - s * 0.15} Q${x - s * 0.3},${y - s * 0.25} ${x - s * 0.28},${y - s * 0.18} Q${x - s * 0.32},${y - s * 0.12} ${x - s * 0.22},${y - s * 0.1} Z`;
  children.push(createPath(x, y, tailPath, furColor, { layer: 2 }));
  // White tip
  children.push(createCircle(x - s * 0.28, y - s * 0.16, s * 0.025, '#FFF', { layer: 2, opacity: 0.8 }));

  return createGroup(x, y, children, { layer: 2, category: 'fox', modifiable: true, id: uid('fox') });
}

// ── Scorpion ────────────────────────────────────────────────────
function scorpion(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const color = rng.pick(['#4A3728', '#5C3D2E', '#3E2723']);

  // Body
  children.push(createEllipse(x, y, s * 0.08, s * 0.04, color, { layer: 3 }));
  // Head
  children.push(createEllipse(x + s * 0.1, y, s * 0.04, s * 0.03, color, { layer: 3 }));

  // Pincers
  children.push(createPath(x, y, `M${x + s * 0.13},${y - s * 0.02} Q${x + s * 0.2},${y - s * 0.06} ${x + s * 0.22},${y - s * 0.03}`, 'none', { stroke: color, strokeWidth: 1.2, layer: 3 }));
  children.push(createPath(x, y, `M${x + s * 0.13},${y + s * 0.02} Q${x + s * 0.2},${y + s * 0.06} ${x + s * 0.22},${y + s * 0.03}`, 'none', { stroke: color, strokeWidth: 1.2, layer: 3 }));

  // Tail segments
  const tailPath = `M${x - s * 0.08},${y} Q${x - s * 0.14},${y - s * 0.03} ${x - s * 0.18},${y - s * 0.08} Q${x - s * 0.2},${y - s * 0.14} ${x - s * 0.17},${y - s * 0.2} L${x - s * 0.15},${y - s * 0.18}`;
  children.push(createPath(x, y, tailPath, 'none', { stroke: color, strokeWidth: 1.5, layer: 3 }));
  // Stinger
  children.push(createCircle(x - s * 0.17, y - s * 0.21, s * 0.012, '#8B0000', { layer: 3 }));

  // Legs
  for (let i = 0; i < 4; i++) {
    const lx = x - s * 0.04 + i * s * 0.04;
    children.push(createLine(lx, y - s * 0.03, lx - s * 0.03, y - s * 0.07, color, { strokeWidth: 0.8, layer: 3 }));
    children.push(createLine(lx, y + s * 0.03, lx - s * 0.03, y + s * 0.07, color, { strokeWidth: 0.8, layer: 3 }));
  }

  return createGroup(x, y, children, { layer: 3, category: 'scorpion', modifiable: true, id: uid('scorpion') });
}

// ── Sand Dune ───────────────────────────────────────────────────
function sandDune(x: number, y: number, w: number, h: number, color: string): SVGElementData {
  const d = `M${x},${y} Q${x + w * 0.3},${y - h} ${x + w * 0.5},${y - h * 0.8} Q${x + w * 0.7},${y - h * 0.6} ${x + w},${y} Z`;
  return createPath(x, y, d, color, { layer: 1, category: 'dune', modifiable: false, id: `dune_${x|0}_${y|0}` });
}

export function generateDesertOasis(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  // === SVG DEFS ===
  const defs = combineDefs(
    outdoorDefs(),
    skyGradient('desertSky', '#1565C0', '#64B5F6', '#FFE082'),
    sandGradient('sandGrad'),
    sunGlowGradient('sunGlow', '#FFFFFF', '#FFD700'),
    waterGradient('oasisWater', '#2196F3', '#0D47A1'),
    radialGradient('heatShimmer', [
      { offset: '0%', color: '#FFD700', opacity: 0.15 },
      { offset: '50%', color: '#FF8F00', opacity: 0.05 },
      { offset: '100%', color: '#FF8F00', opacity: 0 },
    ]),
    linearGradient('duneGrad1', [
      { offset: '0%', color: '#F5DEB3' },
      { offset: '60%', color: '#E8C88A' },
      { offset: '100%', color: '#D4A556' },
    ]),
    linearGradient('duneGrad2', [
      { offset: '0%', color: '#EAD09E' },
      { offset: '100%', color: '#C9A05C' },
    ]),
    linearGradient('duneShadow', [
      { offset: '0%', color: '#C9A05C', opacity: 0.8 },
      { offset: '100%', color: '#B8944A', opacity: 0.4 },
    ]),
    dropShadow('palmShadow', 4, 5, 4, 'rgba(0,0,0,0.2)'),
    gaussianBlur('distantBlur', 2),
    softGlow('heatGlow', 10, '#FFD700'),
  );

  // ════════════════════════════════════════
  // LAYER 0: Sky
  // ════════════════════════════════════════
  elements.push(createRect(0, 0, w, h * 0.55, 'url(#desertSky)', { layer: 0, category: 'sky', modifiable: false, id: uid('sky') }));

  // Sun with glow
  const sunX = w * rng.nextFloat(0.6, 0.8);
  const sunY = h * 0.12;
  elements.push(createCircle(sunX, sunY, 60, 'url(#sunGlow)', { layer: 0, category: 'sun', modifiable: false, filter: 'url(#glow)' }));
  elements.push(createCircle(sunX, sunY, 28, '#FFF9C4', { layer: 0, category: 'sun', modifiable: true, id: uid('sun') }));

  // Heat shimmer bands
  for (let i = 0; i < 3; i++) {
    const sy = h * 0.42 + i * 8;
    elements.push(createRect(0, sy, w, 6, '#FFD700', { layer: 0, category: 'heat', modifiable: false, opacity: 0.05 + i * 0.02 }));
  }

  // Wispy clouds
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const cx = rng.nextFloat(30, w - 80);
    const cy = rng.nextFloat(h * 0.04, h * 0.2);
    const cw = rng.nextFloat(40, 90);
    const ch = rng.nextFloat(5, 10);
    elements.push(createEllipse(cx, cy, cw, ch, '#FFF', {
      layer: 0, category: 'cloud', modifiable: false, opacity: rng.nextFloat(0.15, 0.3), filter: 'url(#bgBlur)',
    }));
  }

  // ════════════════════════════════════════
  // LAYER 1: Distant dunes (background)
  // ════════════════════════════════════════
  // Far dune line
  const farDuneY = h * 0.48;
  let farDunePath = `M0,${farDuneY + 15}`;
  for (let i = 0; i < 6; i++) {
    const dx = (i + 0.5) * w / 6;
    const dex = (i + 1) * w / 6;
    const dh = rng.nextFloat(15, 35);
    farDunePath += ` Q${dx},${farDuneY - dh} ${dex},${farDuneY + rng.nextFloat(-5, 5)}`;
  }
  farDunePath += ` L${w},${h} L0,${h} Z`;
  elements.push(createPath(0, 0, farDunePath, 'url(#duneGrad2)', {
    layer: 1, category: 'dune', modifiable: false, opacity: 0.6, filter: 'url(#distantBlur)',
  }));

  // Mid dunes
  const midDuneY = h * 0.52;
  let midDunePath = `M0,${midDuneY + 10}`;
  for (let i = 0; i < 5; i++) {
    const dx = (i + 0.5) * w / 5;
    const dex = (i + 1) * w / 5;
    const dh = rng.nextFloat(20, 45);
    midDunePath += ` Q${dx},${midDuneY - dh} ${dex},${midDuneY + rng.nextFloat(-3, 8)}`;
  }
  midDunePath += ` L${w},${h} L0,${h} Z`;
  elements.push(createPath(0, 0, midDunePath, 'url(#duneGrad1)', {
    layer: 1, category: 'dune', modifiable: false,
  }));

  // ════════════════════════════════════════
  // LAYER 1: Main desert ground
  // ════════════════════════════════════════
  const groundY = h * 0.58;
  elements.push(createRect(0, groundY, w, h - groundY, 'url(#sandGrad)', { layer: 1, category: 'ground', modifiable: false, id: uid('ground') }));

  // Sand ripples
  for (let i = 0; i < rng.nextInt(10, 16); i++) {
    const ry = rng.nextFloat(groundY + 10, h - 10);
    const rx = rng.nextFloat(10, w - 10);
    const rw = rng.nextFloat(20, 60);
    const ripple = `M${rx},${ry} Q${rx + rw * 0.5},${ry - 1.5} ${rx + rw},${ry}`;
    elements.push(createPath(0, 0, ripple, 'none', {
      stroke: '#C9A05C', strokeWidth: 0.7, layer: 1, category: 'sand', modifiable: false, opacity: rng.nextFloat(0.15, 0.3),
    }));
  }

  // ════════════════════════════════════════
  // LAYER 1: Oasis water pool
  // ════════════════════════════════════════
  const poolX = w * rng.nextFloat(0.35, 0.55);
  const poolY = h * rng.nextFloat(0.62, 0.68);
  const poolRx = rng.nextFloat(60, 85);
  const poolRy = rng.nextFloat(20, 30);

  // Water shadow
  elements.push(createEllipse(poolX, poolY + 3, poolRx + 5, poolRy + 3, 'rgba(0,0,0,0.08)', { layer: 1, category: 'pool', modifiable: false }));
  // Water body
  elements.push(createEllipse(poolX, poolY, poolRx, poolRy, 'url(#oasisWater)', { layer: 1, category: 'pool', modifiable: true, id: uid('pool'), opacity: 0.85 }));
  // Water surface highlight
  elements.push(createEllipse(poolX - poolRx * 0.2, poolY - poolRy * 0.3, poolRx * 0.4, poolRy * 0.3, '#64B5F6', {
    layer: 1, category: 'pool', modifiable: false, opacity: 0.4,
  }));
  // Shore grass patches
  for (let i = 0; i < rng.nextInt(5, 8); i++) {
    const angle = rng.nextFloat(0, Math.PI * 2);
    const gx = poolX + Math.cos(angle) * (poolRx + rng.nextFloat(2, 12));
    const gy = poolY + Math.sin(angle) * (poolRy + rng.nextFloat(2, 8));
    const grassPath = `M${gx},${gy} Q${gx - 2},${gy - 8} ${gx - 3},${gy - 14} M${gx},${gy} Q${gx + 1},${gy - 9} ${gx + 4},${gy - 12} M${gx},${gy} Q${gx + 3},${gy - 7} ${gx + 6},${gy - 10}`;
    elements.push(createPath(0, 0, grassPath, 'none', {
      stroke: rng.pick(['#4CAF50', '#66BB6A', '#388E3C']), strokeWidth: 1.5, layer: 2, category: 'grass', modifiable: false, opacity: 0.7,
    }));
  }

  // ════════════════════════════════════════
  // LAYER 2: Palm trees around oasis
  // ════════════════════════════════════════
  const palmCount = rng.nextInt(3, 5);
  for (let i = 0; i < palmCount; i++) {
    const angle = (i / palmCount) * Math.PI * 1.5 + rng.nextFloat(-0.3, 0.3);
    const dist = poolRx + rng.nextFloat(15, 40);
    const px = poolX + Math.cos(angle) * dist;
    const py = poolY + Math.sin(angle) * (poolRy + rng.nextFloat(8, 20));
    const palmSize = rng.nextFloat(80, 120);
    const lean = rng.nextFloat(-0.3, 0.5);
    const palm = detailedTree(px, py, 'palm', palmSize, rng);
    palm.filter = 'url(#palmShadow)';
    palm.modifiable = true;
    palm.id = uid('palm');
    elements.push(palm);
  }

  // ════════════════════════════════════════
  // LAYER 2: Cacti (3-5)
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const cx = rng.nextFloat(w * 0.05, w * 0.95);
    const cy = rng.nextFloat(groundY + 5, h - 20);
    // Avoid placing on the pool
    if (Math.abs(cx - poolX) < poolRx + 20 && Math.abs(cy - poolY) < poolRy + 15) continue;
    elements.push(cactus(cx, cy, rng.nextFloat(40, 70), rng));
  }

  // ════════════════════════════════════════
  // LAYER 2: Desert rocks
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(4, 6); i++) {
    const rx = rng.nextFloat(15, w - 15);
    const ry = rng.nextFloat(groundY, h - 10);
    const rock = detailedRock(rx, ry, rng.nextFloat(8, 22), rng);
    rock.filter = 'url(#softShadow)';
    rock.modifiable = true;
    rock.id = uid('rock');
    elements.push(rock);
  }

  // ════════════════════════════════════════
  // LAYER 2: Camels (2-3)
  // ════════════════════════════════════════
  const camelCount = rng.nextInt(2, 3);
  for (let i = 0; i < camelCount; i++) {
    const cx = rng.nextFloat(w * 0.1 + i * w * 0.25, w * 0.3 + i * w * 0.25);
    const cy = rng.nextFloat(groundY + 15, h * 0.78);
    const facing = rng.chance(0.5) ? 1 : -1;
    elements.push(camel(cx, cy, rng.nextFloat(45, 65), rng, facing));
  }

  // ════════════════════════════════════════
  // LAYER 2: Desert fox
  // ════════════════════════════════════════
  if (rng.chance(0.8)) {
    const fx = rng.nextFloat(w * 0.1, w * 0.85);
    const fy = rng.nextFloat(groundY + 20, h * 0.82);
    elements.push(desertFox(fx, fy, rng.nextFloat(35, 50), rng));
  }

  // ════════════════════════════════════════
  // LAYER 3: Scorpions (1-2)
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(1, 2); i++) {
    const sx = rng.nextFloat(w * 0.1, w * 0.9);
    const sy = rng.nextFloat(groundY + 30, h - 15);
    elements.push(scorpion(sx, sy, rng.nextFloat(18, 28), rng));
  }

  // ════════════════════════════════════════
  // LAYER 2: Foreground dunes (subtle)
  // ════════════════════════════════════════
  elements.push(sandDune(0, h * 0.88, w * 0.4, 25, '#D4A556'));
  elements.push(sandDune(w * 0.6, h * 0.92, w * 0.4, 18, '#C9A05C'));

  // ════════════════════════════════════════
  // LAYER 3: Birds
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 5); i++) {
    const bird = detailedBird(rng.nextFloat(20, w - 20), rng.nextFloat(h * 0.05, h * 0.25), true, rng);
    bird.modifiable = true;
    bird.id = uid('bird');
    elements.push(bird);
  }

  // ════════════════════════════════════════
  // LAYER 3: Heat shimmer effect near horizon
  // ════════════════════════════════════════
  elements.push(createEllipse(w * 0.5, h * 0.5, w * 0.6, 15, 'url(#heatShimmer)', {
    layer: 3, category: 'heat', modifiable: false, opacity: 0.3,
  }));

  // Small desert flowers near oasis
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const angle = rng.nextFloat(0, Math.PI * 2);
    const fx = poolX + Math.cos(angle) * (poolRx + rng.nextFloat(5, 25));
    const fy = poolY + Math.sin(angle) * (poolRy + rng.nextFloat(5, 15));
    const petalColor = rng.pick(['#FFD700', '#FF6F61', '#FF1493', '#FFA726']);
    const fSize = rng.nextFloat(3, 6);
    const flowerChildren: SVGElementData[] = [];
    for (let p = 0; p < 5; p++) {
      const pa = (p * 72) * Math.PI / 180;
      flowerChildren.push(createCircle(fx + Math.cos(pa) * fSize, fy + Math.sin(pa) * fSize, fSize * 0.5, petalColor, { layer: 3 }));
    }
    flowerChildren.push(createCircle(fx, fy, fSize * 0.35, '#FFD700', { layer: 3 }));
    elements.push(createGroup(fx, fy, flowerChildren, { layer: 3, category: 'flower', modifiable: true, id: uid('flower') }));
  }

  return { elements, defs };
}
