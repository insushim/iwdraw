import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import { createRect, createCircle, createEllipse, createPath, createLine, createGroup } from '../engine/primitives';
import {
  combineDefs, outdoorDefs, skyGradient, linearGradient, radialGradient,
  groundGradient, dropShadow, grassPattern,
} from './svg-effects';
import {
  detailedTree, detailedCloud, detailedHouse, detailedFlower,
  detailedFence, detailedBird, detailedRock, resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'sb') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

export function generateSuburbanHouse(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  // === SVG Defs ===
  const defs = combineDefs(
    outdoorDefs(),
    skyGradient('skyGrad', '#4A90D9', '#7AB8E0', '#B0D4F1'),
    groundGradient('grassGrad', '#4A8C3F', '#357A2B'),
    grassPattern('grassPat', '#3D8030'),
    linearGradient('drivewayGrad', [
      { offset: '0%', color: '#8A8A8A' },
      { offset: '100%', color: '#6A6A6A' },
    ]),
    linearGradient('roadGrad', [
      { offset: '0%', color: '#555555' },
      { offset: '100%', color: '#444444' },
    ]),
    linearGradient('sidewalkGrad', [
      { offset: '0%', color: '#C8C0B0' },
      { offset: '100%', color: '#B0A898' },
    ]),
    radialGradient('sunGlow', [
      { offset: '0%', color: '#FFFFFF', opacity: 1 },
      { offset: '40%', color: '#FFE082', opacity: 0.5 },
      { offset: '100%', color: '#FFD700', opacity: 0 },
    ]),
    dropShadow('longShadow', 4, 6, 4, 'rgba(0,0,0,0.15)'),
  );

  // ════════════════════════════════════════════
  //  LAYER 0 — Sky
  // ════════════════════════════════════════════
  elements.push(createRect(0, 0, w, h * 0.5, 'url(#skyGrad)', { layer: 0, category: 'sky', modifiable: false }));

  // Sun
  const sunX = rng.nextFloat(w * 0.7, w * 0.9);
  const sunY = rng.nextFloat(h * 0.06, h * 0.14);
  elements.push(createCircle(sunX, sunY, 50, 'url(#sunGlow)', { layer: 0, category: 'sun', modifiable: false, opacity: 0.7 }));
  elements.push(createCircle(sunX, sunY, 18, '#FFF8DC', { layer: 0, category: 'sun', modifiable: true, id: uid('sun'), opacity: 0.95 }));

  // Clouds
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    elements.push(detailedCloud(rng.nextFloat(20, w - 60), rng.nextFloat(15, h * 0.2), rng.nextFloat(40, 80), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 1 — Ground layers
  // ════════════════════════════════════════════
  // Main lawn
  elements.push(createRect(0, h * 0.48, w, h * 0.52, 'url(#grassGrad)', { layer: 1, category: 'ground', modifiable: false }));

  // Road at bottom
  elements.push(createRect(0, h * 0.82, w, h * 0.06, 'url(#roadGrad)', { layer: 1, category: 'road', modifiable: false }));
  // Curbs
  elements.push(createRect(0, h * 0.818, w, 3, '#999', { layer: 1, category: 'curb', modifiable: false }));
  elements.push(createRect(0, h * 0.88, w, 3, '#999', { layer: 1, category: 'curb', modifiable: false }));

  // Sidewalk
  elements.push(createRect(0, h * 0.883, w, h * 0.035, 'url(#sidewalkGrad)', { layer: 1, category: 'sidewalk', modifiable: false }));
  // Sidewalk cracks
  for (let sx = 60; sx < w; sx += rng.nextFloat(80, 140)) {
    elements.push(createLine(sx, h * 0.883, sx, h * 0.918, '#A09888', { strokeWidth: 0.5, layer: 1, category: 'crack', modifiable: false, opacity: 0.4 }));
  }

  // Front yard lawn (below sidewalk)
  elements.push(createRect(0, h * 0.918, w, h * 0.082, 'url(#grassPat)', { layer: 1, category: 'ground', modifiable: false }));

  // ════════════════════════════════════════════
  //  LAYER 2 — Houses
  // ════════════════════════════════════════════
  const houseCount = rng.nextInt(2, 3);
  const houseSpacing = w / houseCount;
  for (let i = 0; i < houseCount; i++) {
    const hx = 30 + i * houseSpacing + rng.nextFloat(-15, 15);
    const hw = rng.nextFloat(120, 160);
    const hh = rng.nextFloat(100, 140);
    elements.push(detailedHouse(hx, h * 0.48, hw, hh, rng));

    // Driveway for each house
    const driveX = hx + hw * 0.3;
    const driveW = hw * 0.3;
    elements.push(createRect(driveX, h * 0.48, driveW, h * 0.34, 'url(#drivewayGrad)', {
      layer: 1, category: 'driveway', modifiable: false, opacity: 0.85,
    }));
    // Driveway crack
    elements.push(createPath(driveX, h * 0.5, `M${driveX + driveW * 0.4},${h * 0.5} L${driveX + driveW * 0.45},${h * 0.6} L${driveX + driveW * 0.38},${h * 0.72}`, 'none', {
      layer: 1, category: 'crack', modifiable: false, stroke: '#777', strokeWidth: 0.5, opacity: 0.3,
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Garage (attached to first house)
  // ════════════════════════════════════════════
  if (rng.chance(0.7)) {
    const gx = 30 + rng.nextFloat(130, 170);
    const gy = h * 0.48;
    const gw = 70;
    const gh = 65;
    const garChildren: SVGElementData[] = [];
    garChildren.push(createRect(gx, gy - gh, gw, gh, '#DDD8CC', { layer: 2 }));
    // Garage roof
    garChildren.push(createPath(gx, gy, `M${gx - 5},${gy - gh} L${gx + gw / 2},${gy - gh - 20} L${gx + gw + 5},${gy - gh} Z`, '#6B4226', { layer: 2 }));
    // Garage door
    garChildren.push(createRect(gx + 8, gy - gh * 0.7, gw - 16, gh * 0.7, '#E8E0D0', { layer: 2 }));
    // Door panel lines
    for (let pl = 0; pl < 4; pl++) {
      const py = gy - gh * 0.7 + pl * (gh * 0.7 / 4);
      garChildren.push(createLine(gx + 10, py, gx + gw - 10, py, '#C8C0B0', { strokeWidth: 0.5, layer: 2, opacity: 0.5 }));
    }
    // Door handle
    garChildren.push(createRect(gx + gw / 2 - 6, gy - 10, 12, 3, '#888', { layer: 2 }));
    elements.push(createGroup(gx, gy, garChildren, {
      layer: 2, category: 'garage', modifiable: true, id: uid('gar'), filter: 'url(#shadow)',
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Mailboxes
  // ════════════════════════════════════════════
  for (let i = 0; i < houseCount; i++) {
    const mx = 80 + i * houseSpacing + rng.nextFloat(-20, 20);
    const my = h * 0.88;
    const mbChildren: SVGElementData[] = [];
    // Post
    mbChildren.push(createRect(mx - 2, my - 40, 4, 40, '#8B7355', { layer: 2 }));
    // Box
    const boxColor = rng.pick(['#2244AA', '#CC2222', '#228844', '#333333']);
    mbChildren.push(createRect(mx - 12, my - 52, 24, 16, boxColor, { layer: 2 }));
    // Rounded top
    mbChildren.push(createPath(mx, my, `M${mx - 12},${my - 52} Q${mx - 12},${my - 60} ${mx},${my - 62} Q${mx + 12},${my - 60} ${mx + 12},${my - 52} Z`, boxColor, { layer: 2 }));
    // Flag
    const flagUp = rng.chance(0.4);
    if (flagUp) {
      mbChildren.push(createRect(mx + 12, my - 55, 2, 12, '#CC0000', { layer: 2 }));
      mbChildren.push(createPath(mx, my, `M${mx + 14},${my - 55} L${mx + 22},${my - 52} L${mx + 14},${my - 49} Z`, '#CC0000', { layer: 2 }));
    }
    elements.push(createGroup(mx, my, mbChildren, {
      layer: 2, category: 'mailbox', modifiable: true, id: uid('mail'),
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Trees in yards
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    const tx = rng.nextFloat(20, w - 40);
    const ty = h * 0.48 + rng.nextFloat(5, 20);
    const treeType = rng.pick(['oak', 'cherry', 'pine'] as const);
    elements.push(detailedTree(tx, ty, treeType, rng.nextFloat(55, 95), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Fence sections
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    const fx = rng.nextFloat(10, w * 0.4) + i * rng.nextFloat(200, 350);
    if (fx > w - 80) continue;
    elements.push(detailedFence(fx, h * 0.50, rng.nextFloat(60, 120), rng.nextFloat(28, 38), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Flower beds
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(5, 8); i++) {
    const fx = rng.nextFloat(20, w - 20);
    const fy = h * 0.49 + rng.nextFloat(0, 8);
    elements.push(detailedFlower(fx, fy, rng.pick(['daisy', 'tulip', 'rose', 'sunflower']), rng.nextFloat(12, 22), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Dog or cat
  // ════════════════════════════════════════════
  if (rng.chance(0.7)) {
    const isDog = rng.chance(0.6);
    const ax = rng.nextFloat(100, w - 100);
    const ay = h * 0.50;
    const aChildren: SVGElementData[] = [];

    if (isDog) {
      const dogColor = rng.pick(['#8B6914', '#A0522D', '#D2B48C', '#5C4033']);
      // Body
      aChildren.push(createEllipse(ax, ay - 10, 18, 10, dogColor, { layer: 2 }));
      // Head
      aChildren.push(createCircle(ax + 15, ay - 16, 8, dogColor, { layer: 2 }));
      // Ears
      aChildren.push(createEllipse(ax + 12, ay - 24, 4, 6, dogColor, { layer: 2, opacity: 0.85 }));
      aChildren.push(createEllipse(ax + 18, ay - 24, 4, 6, dogColor, { layer: 2, opacity: 0.85 }));
      // Eye
      aChildren.push(createCircle(ax + 17, ay - 17, 1.5, '#222', { layer: 2 }));
      // Nose
      aChildren.push(createCircle(ax + 22, ay - 15, 2, '#222', { layer: 2 }));
      // Tail
      aChildren.push(createPath(ax, ay, `M${ax - 16},${ay - 12} Q${ax - 25},${ay - 28} ${ax - 20},${ay - 30}`, 'none', { stroke: dogColor, strokeWidth: 3, layer: 2 }));
      // Legs
      aChildren.push(createRect(ax - 10, ay - 2, 4, 10, dogColor, { layer: 2 }));
      aChildren.push(createRect(ax + 8, ay - 2, 4, 10, dogColor, { layer: 2 }));
    } else {
      const catColor = rng.pick(['#333333', '#FF8C00', '#A0A0A0', '#F5F5DC']);
      // Body
      aChildren.push(createEllipse(ax, ay - 10, 14, 9, catColor, { layer: 2 }));
      // Head
      aChildren.push(createCircle(ax + 12, ay - 16, 7, catColor, { layer: 2 }));
      // Ears (triangular)
      aChildren.push(createPath(ax, ay, `M${ax + 8},${ay - 22} L${ax + 6},${ay - 30} L${ax + 12},${ay - 24} Z`, catColor, { layer: 2 }));
      aChildren.push(createPath(ax, ay, `M${ax + 13},${ay - 22} L${ax + 16},${ay - 30} L${ax + 18},${ay - 24} Z`, catColor, { layer: 2 }));
      // Eyes
      aChildren.push(createEllipse(ax + 10, ay - 17, 2, 2.5, '#22CC22', { layer: 2 }));
      aChildren.push(createEllipse(ax + 15, ay - 17, 2, 2.5, '#22CC22', { layer: 2 }));
      aChildren.push(createEllipse(ax + 10, ay - 17, 0.8, 2, '#111', { layer: 2 }));
      aChildren.push(createEllipse(ax + 15, ay - 17, 0.8, 2, '#111', { layer: 2 }));
      // Tail
      aChildren.push(createPath(ax, ay, `M${ax - 12},${ay - 10} Q${ax - 22},${ay - 20} ${ax - 18},${ay - 28}`, 'none', { stroke: catColor, strokeWidth: 3, layer: 2 }));
    }

    elements.push(createGroup(ax, ay, aChildren, {
      layer: 2, category: 'animal', modifiable: true, id: uid('pet'), filter: 'url(#softShadow)',
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Bicycle
  // ════════════════════════════════════════════
  if (rng.chance(0.6)) {
    const bx = rng.nextFloat(80, w - 80);
    const by = h * 0.49;
    const bikeChildren: SVGElementData[] = [];
    const bikeColor = rng.pick(['#CC2222', '#2255CC', '#228833', '#111111']);
    const wheelR = 14;
    // Wheels
    bikeChildren.push(createCircle(bx, by, wheelR, 'none', { layer: 2, stroke: '#333', strokeWidth: 2 }));
    bikeChildren.push(createCircle(bx + 38, by, wheelR, 'none', { layer: 2, stroke: '#333', strokeWidth: 2 }));
    // Spokes
    for (let sp = 0; sp < 4; sp++) {
      const angle = sp * Math.PI / 4;
      bikeChildren.push(createLine(bx + Math.cos(angle) * wheelR, by + Math.sin(angle) * wheelR, bx - Math.cos(angle) * wheelR, by - Math.sin(angle) * wheelR, '#888', { strokeWidth: 0.5, layer: 2, opacity: 0.5 }));
      bikeChildren.push(createLine(bx + 38 + Math.cos(angle) * wheelR, by + Math.sin(angle) * wheelR, bx + 38 - Math.cos(angle) * wheelR, by - Math.sin(angle) * wheelR, '#888', { strokeWidth: 0.5, layer: 2, opacity: 0.5 }));
    }
    // Frame
    bikeChildren.push(createPath(bx, by, `M${bx},${by} L${bx + 16},${by - 18} L${bx + 38},${by} M${bx + 16},${by - 18} L${bx + 30},${by - 18} L${bx + 38},${by}`, 'none', { stroke: bikeColor, strokeWidth: 2.5, layer: 2 }));
    // Seat
    bikeChildren.push(createEllipse(bx + 16, by - 20, 6, 2, '#333', { layer: 2 }));
    // Handlebars
    bikeChildren.push(createPath(bx, by, `M${bx + 28},${by - 22} L${bx + 32},${by - 18} L${bx + 36},${by - 22}`, 'none', { stroke: '#555', strokeWidth: 2, layer: 2 }));
    // Pedal
    bikeChildren.push(createCircle(bx + 19, by, 3, '#666', { layer: 2 }));

    elements.push(createGroup(bx, by, bikeChildren, {
      layer: 2, category: 'bicycle', modifiable: true, id: uid('bike'), filter: 'url(#softShadow)',
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Small rocks / garden stones
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 5); i++) {
    elements.push(detailedRock(rng.nextFloat(20, w - 20), h * 0.50 + rng.nextFloat(0, 8), rng.nextFloat(5, 12), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 4 — Birds in sky
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(detailedBird(rng.nextFloat(30, w - 30), rng.nextFloat(30, h * 0.25), true, rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 4 — Floating particles (pollen)
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(8, 15); i++) {
    elements.push(createCircle(rng.nextFloat(0, w), rng.nextFloat(h * 0.1, h * 0.5), rng.nextFloat(0.5, 1.5), '#FFF', {
      layer: 4, category: 'particle', modifiable: false, opacity: rng.nextFloat(0.05, 0.2),
    }));
  }

  return { elements, defs };
}
