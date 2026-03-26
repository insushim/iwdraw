import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath, createGroup, createLine,
} from '../engine/primitives';
import {
  combineDefs, outdoorDefs, daySkyGradient, groundGradient,
  sunGlowGradient, linearGradient, waterGradient, grassPattern, waterRipple,
} from './svg-effects';
import {
  detailedTree, detailedCloud, detailedMountain, detailedFlower, detailedRock,
  detailedBird, detailedButterfly, detailedMushroom, detailedBench, detailedFence,
  resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'fc') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

export function generateForestClearing(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  // === SVG DEFS ===
  const defs = combineDefs(
    outdoorDefs(),
    daySkyGradient('skyGrad'),
    groundGradient('groundGrad', '#4CAF50', '#2E7D32'),
    sunGlowGradient('sunGlow', '#FFFDE7', '#FFB300'),
    waterGradient('streamGrad', '#64B5F6', '#90CAF9'),
    linearGradient('lightRayGrad', [
      { offset: '0%', color: '#FFF9C4', opacity: 0.15 },
      { offset: '100%', color: '#FFF9C4', opacity: 0 },
    ]),
    grassPattern('grassPat', '#3a7d2e'),
    waterRipple('waterRipple'),
  );

  // ============================
  // === LAYER 0: SKY ===
  // ============================
  elements.push(createRect(0, 0, w, h * 0.55, 'url(#skyGrad)', { layer: 0, category: 'sky', modifiable: false, id: uid('sky') }));

  // Sun with radial gradient glow
  const sunX = w * rng.nextFloat(0.78, 0.9);
  const sunY = h * rng.nextFloat(0.07, 0.14);
  elements.push(createCircle(sunX, sunY, 55, 'url(#sunGlow)', { layer: 0, category: 'sun', modifiable: false, opacity: 0.7, id: uid('sun_glow'), filter: 'url(#glow)' }));
  elements.push(createCircle(sunX, sunY, 26, '#FFD54F', { layer: 0, category: 'sun', modifiable: true, opacity: 0.95, id: uid('sun') }));

  // Clouds (4-6) - detailed components with depth blur
  for (let i = 0; i < rng.nextInt(4, 6); i++) {
    const cloud = detailedCloud(rng.nextFloat(30, w - 80), rng.nextFloat(15, h * 0.2), rng.nextFloat(40, 75), rng);
    cloud.filter = 'url(#bgBlur)';
    elements.push(cloud);
  }

  // ============================
  // === LAYER 0: DISTANT MOUNTAINS ===
  // ============================
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const mtn = detailedMountain(rng.nextFloat(-50, w * 0.7), h * 0.55, rng.nextFloat(200, 350), rng.nextFloat(80, 150), rng);
    mtn.filter = 'url(#bgBlur)';
    elements.push(mtn);
  }

  // ============================
  // === LAYER 1: GROUND ===
  // ============================
  const groundPath = `M0,${h * 0.55} Q${w * 0.15},${h * 0.52} ${w * 0.3},${h * 0.54} Q${w * 0.45},${h * 0.56} ${w * 0.55},${h * 0.53} Q${w * 0.7},${h * 0.51} ${w * 0.85},${h * 0.54} Q${w * 0.95},${h * 0.56} ${w},${h * 0.53} L${w},${h} L0,${h} Z`;
  elements.push(createPath(0, 0, groundPath, 'url(#groundGrad)', { layer: 1, category: 'ground', modifiable: false, id: uid('ground') }));

  // Darker bottom ground layer
  elements.push(createRect(0, h * 0.75, w, h * 0.25, '#2E7D32', { layer: 1, category: 'ground', modifiable: false, opacity: 0.5, id: uid('ground_dark') }));

  // Grass texture overlay using pattern
  elements.push(createPath(0, 0, groundPath, 'url(#grassPat)', { layer: 1, category: 'ground', modifiable: false, opacity: 0.3, id: uid('grass_overlay') }));

  // ============================
  // === LAYER 1: GRASS TUFTS ===
  // ============================
  for (let i = 0; i < 22; i++) {
    const gx = rng.nextFloat(0, w);
    const gy = rng.nextFloat(h * 0.56, h * 0.98);
    const gh = rng.nextFloat(8, 18);
    const bladeCount = rng.nextInt(3, 6);
    let grassD = '';
    for (let b = 0; b < bladeCount; b++) {
      const bx = gx + rng.nextFloat(-6, 6);
      const tip = rng.nextFloat(-4, 4);
      grassD += `M${bx},${gy} Q${bx + tip * 0.5},${gy - gh * 0.6} ${bx + tip},${gy - gh} `;
    }
    const grassColor = rng.pick(['#2E7D32', '#388E3C', '#1B5E20', '#33691E', '#4CAF50']);
    elements.push(createPath(gx, gy, grassD, 'none', { stroke: grassColor, strokeWidth: rng.nextFloat(1, 2.5), layer: 1, category: 'grass', modifiable: false, opacity: rng.nextFloat(0.5, 0.9), id: uid('grass') }));
  }

  // ============================
  // === LAYER 1: WINDING STREAM ===
  // ============================
  const streamStartX = rng.nextFloat(w * 0.15, w * 0.35);
  const sp1x = streamStartX + rng.nextFloat(20, 60);
  const sp1y = h * 0.62;
  const sp2x = sp1x + rng.nextFloat(-30, 30);
  const sp2y = h * 0.70;
  const sp3x = sp2x + rng.nextFloat(30, 80);
  const sp3y = h * 0.78;
  const sp4x = sp3x + rng.nextFloat(20, 60);
  const sp4y = h * 0.88;
  const sp5x = sp4x + rng.nextFloat(10, 50);

  const streamPath = `M${streamStartX},${h * 0.55} Q${sp1x},${sp1y} ${sp2x},${sp2y} Q${sp2x + 20},${sp2y + 10} ${sp3x},${sp3y} Q${sp3x + 15},${sp3y + 8} ${sp4x},${sp4y} Q${sp4x + 10},${sp4y + 5} ${sp5x},${h}`;

  // Stream bank
  elements.push(createPath(0, 0, streamPath, 'none', { stroke: '#5D4037', strokeWidth: 18, layer: 1, category: 'stream', modifiable: false, opacity: 0.3, id: uid('stream_bank') }));
  // Main water with ripple filter
  elements.push(createPath(0, 0, streamPath, 'none', { stroke: 'url(#streamGrad)', strokeWidth: 13, layer: 1, category: 'stream', modifiable: true, opacity: 0.7, id: uid('stream'), filter: 'url(#waterRipple)' }));
  // Water highlights
  elements.push(createPath(0, 0, streamPath, 'none', { stroke: '#BBDEFB', strokeWidth: 4, layer: 2, category: 'stream', modifiable: false, opacity: 0.45, id: uid('stream_hi') }));

  // Stream reflections / ripples
  for (let i = 0; i < 6; i++) {
    const t = (i + 1) / 7;
    const rx = streamStartX + (sp5x - streamStartX) * t + rng.nextFloat(-10, 10);
    const ry = h * 0.55 + (h - h * 0.55) * t + rng.nextFloat(-5, 5);
    elements.push(createEllipse(rx, ry, rng.nextFloat(6, 12), rng.nextFloat(2, 4), '#BBDEFB', {
      layer: 2, category: 'stream', modifiable: false, opacity: rng.nextFloat(0.2, 0.4), id: uid('ripple'),
    }));
  }

  // ============================
  // === LAYER 2: BACKGROUND TREES (10-14) ===
  // ============================
  const treeCount = rng.nextInt(10, 14);
  for (let i = 0; i < treeCount; i++) {
    const tx = rng.nextFloat(10, w - 30);
    const ty = h * rng.nextFloat(0.52, 0.58);
    const treeType = rng.pick(['pine', 'oak', 'willow', 'cherry'] as const);
    const treeSize = rng.nextFloat(80, 150);
    const tree = detailedTree(tx, ty, treeType, treeSize, rng);
    // Background trees get depth-of-field blur
    if (ty < h * 0.55) {
      tree.filter = 'url(#bgBlur)';
    }
    elements.push(tree);
  }

  // ============================
  // === LAYER 2: LIGHT RAYS THROUGH CANOPY ===
  // ============================
  for (let i = 0; i < rng.nextInt(5, 8); i++) {
    const rx = rng.nextFloat(w * 0.05, w * 0.95);
    const rw = rng.nextFloat(10, 30);
    const rh = rng.nextFloat(h * 0.3, h * 0.65);
    const angle = rng.nextFloat(-0.15, 0.15);
    const rayPath = `M${rx - rw},${h * 0.15} L${rx - rw * 3 + angle * rh},${h * 0.15 + rh} L${rx + rw * 3 + angle * rh},${h * 0.15 + rh} L${rx + rw},${h * 0.15} Z`;
    elements.push(createPath(0, 0, rayPath, '#FFF9C4', {
      layer: 2, category: 'light_ray', modifiable: false, opacity: rng.nextFloat(0.04, 0.1), id: uid('ray'),
    }));
  }

  // ============================
  // === LAYER 2: ROCKS (5-8) ===
  // ============================
  for (let i = 0; i < rng.nextInt(5, 8); i++) {
    const rock = detailedRock(rng.nextFloat(40, w - 40), rng.nextFloat(h * 0.6, h * 0.88), rng.nextFloat(12, 35), rng);
    rock.filter = 'url(#softShadow)';
    elements.push(rock);
  }

  // ============================
  // === LAYER 2: LOG ===
  // ============================
  if (rng.chance(0.6)) {
    const lx = rng.nextFloat(80, w - 200);
    const ly = rng.nextFloat(h * 0.65, h * 0.8);
    const logLen = rng.nextFloat(70, 100);
    elements.push(createRect(lx, ly, logLen, 14, '#8B6914', { layer: 2, category: 'log', modifiable: true, stroke: '#6B3410', strokeWidth: 1, id: uid('log'), filter: 'url(#shadow)' }));
    elements.push(createCircle(lx, ly + 7, 7, '#A0522D', { layer: 2, category: 'log', modifiable: false, id: uid('log_end') }));
    elements.push(createCircle(lx + logLen, ly + 7, 7, '#A0522D', { layer: 2, category: 'log', modifiable: false, id: uid('log_end') }));
    for (let i = 1; i < 5; i++) {
      const bx = lx + logLen * (i / 5);
      elements.push(createPath(bx, ly, `M${bx},${ly + 2} L${bx},${ly + 12}`, 'none', { stroke: '#6B3410', strokeWidth: 0.8, layer: 2, category: 'log', modifiable: false, opacity: 0.4, id: uid('bark') }));
    }
  }

  // ============================
  // === LAYER 2: BENCH (optional) ===
  // ============================
  if (rng.chance(0.35)) {
    const bench = detailedBench(rng.nextFloat(w * 0.2, w * 0.7), h * rng.nextFloat(0.65, 0.78), rng.nextFloat(35, 50), rng);
    bench.filter = 'url(#shadow)';
    elements.push(bench);
  }

  // ============================
  // === LAYER 2: FENCE (optional) ===
  // ============================
  if (rng.chance(0.3)) {
    const fenceX = rng.nextFloat(10, w * 0.3);
    const fence = detailedFence(fenceX, h * rng.nextFloat(0.6, 0.7), rng.nextFloat(80, 150), rng.nextFloat(25, 35), rng);
    fence.filter = 'url(#softShadow)';
    elements.push(fence);
  }

  // ============================
  // === LAYER 3: WINDING PATH (optional) ===
  // ============================
  if (rng.chance(0.5)) {
    const pathStartX = rng.nextFloat(w * 0.55, w * 0.75);
    const pp1y = h * 0.58;
    const pp2x = pathStartX + rng.nextFloat(-40, -10);
    const pp2y = h * 0.68;
    const pp3x = pp2x + rng.nextFloat(20, 50);
    const pp3y = h * 0.80;
    const pp4x = pp3x + rng.nextFloat(-20, 20);

    const dirtPath = `M${pathStartX},${h * 0.54} Q${pathStartX - 10},${pp1y} ${pp2x},${pp2y} Q${pp2x + 15},${pp2y + 8} ${pp3x},${pp3y} Q${pp3x + 10},${pp3y + 6} ${pp4x},${h}`;

    elements.push(createPath(0, 0, dirtPath, 'none', { stroke: '#5D4037', strokeWidth: 22, layer: 1, category: 'path', modifiable: false, opacity: 0.25, id: uid('path_edge') }));
    elements.push(createPath(0, 0, dirtPath, 'none', { stroke: '#8D6E63', strokeWidth: 16, layer: 1, category: 'path', modifiable: true, opacity: 0.45, id: uid('path') }));
    elements.push(createPath(0, 0, dirtPath, 'none', { stroke: '#A1887F', strokeWidth: 6, layer: 1, category: 'path', modifiable: false, opacity: 0.3, id: uid('path_hi') }));
  }

  // ============================
  // === LAYER 3: FLOWERS (10-14) ===
  // ============================
  for (let i = 0; i < rng.nextInt(10, 14); i++) {
    const fx = rng.nextFloat(20, w - 20);
    const fy = rng.nextFloat(h * 0.58, h * 0.93);
    const flowerType = rng.pick(['daisy', 'tulip', 'rose', 'sunflower'] as const);
    const flower = detailedFlower(fx, fy, flowerType, rng.nextFloat(18, 38), rng);
    flower.filter = 'url(#softShadow)';
    elements.push(flower);
  }

  // ============================
  // === LAYER 3: MUSHROOMS (5-8) ===
  // ============================
  for (let i = 0; i < rng.nextInt(5, 8); i++) {
    const mush = detailedMushroom(rng.nextFloat(40, w - 40), rng.nextFloat(h * 0.68, h * 0.92), rng.nextFloat(12, 28), rng);
    mush.filter = 'url(#softShadow)';
    elements.push(mush);
  }

  // ============================
  // === LAYER 3: BIRDS (3-5) ===
  // ============================
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    elements.push(detailedBird(rng.nextFloat(40, w - 40), rng.nextFloat(25, h * 0.35), true, rng));
  }

  // ============================
  // === LAYER 3: BUTTERFLIES (4-6) ===
  // ============================
  for (let i = 0; i < rng.nextInt(4, 6); i++) {
    elements.push(detailedButterfly(rng.nextFloat(60, w - 60), rng.nextFloat(h * 0.35, h * 0.75), rng.nextFloat(12, 22), rng));
  }

  // ============================
  // === LAYER 4: FOREGROUND GRASS TUFTS ===
  // ============================
  for (let i = 0; i < 14; i++) {
    const gx = rng.nextFloat(0, w);
    const gy = rng.nextFloat(h * 0.88, h * 0.99);
    const gh = rng.nextFloat(10, 20);
    let grassD = '';
    for (let b = 0; b < rng.nextInt(3, 6); b++) {
      const bx = gx + rng.nextFloat(-5, 5);
      const tip = rng.nextFloat(-5, 5);
      grassD += `M${bx},${gy} Q${bx + tip * 0.4},${gy - gh * 0.6} ${bx + tip},${gy - gh} `;
    }
    const fgColor = rng.pick(['#1B5E20', '#2E7D32', '#33691E']);
    elements.push(createPath(gx, gy, grassD, 'none', { stroke: fgColor, strokeWidth: rng.nextFloat(1.5, 3), layer: 4, category: 'grass', modifiable: false, opacity: rng.nextFloat(0.6, 1), id: uid('fg_grass') }));
  }

  // ============================
  // === LAYER 4: DAPPLED LIGHT SPOTS ===
  // ============================
  for (let i = 0; i < rng.nextInt(8, 14); i++) {
    const lx = rng.nextFloat(20, w - 20);
    const ly = rng.nextFloat(h * 0.56, h * 0.9);
    elements.push(createEllipse(lx, ly, rng.nextFloat(8, 25), rng.nextFloat(4, 12), '#FFFDE7', {
      layer: 4, category: 'light_spot', modifiable: false, opacity: rng.nextFloat(0.06, 0.15), id: uid('light'),
    }));
  }

  // ============================
  // === LAYER 4: FLOATING PARTICLES (pollen/dust) ===
  // ============================
  for (let i = 0; i < rng.nextInt(10, 18); i++) {
    elements.push(createCircle(rng.nextFloat(10, w - 10), rng.nextFloat(h * 0.1, h * 0.75), rng.nextFloat(1, 3), '#FFF9C4', {
      layer: 4, category: 'particle', modifiable: false, opacity: rng.nextFloat(0.15, 0.4), id: uid('dust'),
    }));
  }

  return { elements, defs };
}
