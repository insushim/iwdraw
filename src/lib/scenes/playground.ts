import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath,
  createLine, createGroup, createText,
} from '../engine/primitives';
import {
  combineDefs, outdoorDefs, skyGradient, linearGradient,
  groundGradient, sunGlowGradient,
} from './svg-effects';
import {
  detailedTree, detailedCloud, detailedPerson, detailedFlower,
  detailedBench, detailedBird, resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'pg') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// ── Helper components ──

function slide(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const slideColor = rng.pick(['#FF4444', '#FF6600', '#FFCC00', '#3399FF']);
  const metalColor = '#888';

  // Platform
  children.push(createRect(x, y - s * 0.8, s * 0.35, s * 0.05, '#666', { layer: 2 }));
  // Ladder legs
  children.push(createLine(x + s * 0.02, y - s * 0.8, x + s * 0.02, y, metalColor, { strokeWidth: 3, layer: 2 }));
  children.push(createLine(x + s * 0.28, y - s * 0.8, x + s * 0.28, y, metalColor, { strokeWidth: 3, layer: 2 }));
  // Ladder rungs
  for (let i = 0; i < 5; i++) {
    const ry = y - s * (0.12 + i * 0.13);
    children.push(createLine(x + s * 0.02, ry, x + s * 0.28, ry, metalColor, { strokeWidth: 2, layer: 2 }));
  }
  // Slide surface - curved path
  const slideStart = { x: x + s * 0.35, y: y - s * 0.75 };
  const slideEnd = { x: x + s * 1.0, y: y - s * 0.02 };
  const slidePath = `M${slideStart.x},${slideStart.y} Q${x + s * 0.5},${y - s * 0.7} ${x + s * 0.7},${y - s * 0.35} Q${x + s * 0.85},${y - s * 0.1} ${slideEnd.x},${slideEnd.y}`;
  children.push(createPath(x, y, slidePath, 'none', { layer: 2, stroke: slideColor, strokeWidth: s * 0.08 }));
  // Slide rails
  children.push(createPath(x, y, `M${slideStart.x},${slideStart.y - s * 0.04} Q${x + s * 0.5},${y - s * 0.74} ${x + s * 0.7},${y - s * 0.39} Q${x + s * 0.85},${y - s * 0.14} ${slideEnd.x},${slideEnd.y - s * 0.01}`, 'none', { layer: 2, stroke: slideColor, strokeWidth: 2, opacity: 0.7 }));
  children.push(createPath(x, y, `M${slideStart.x},${slideStart.y + s * 0.04} Q${x + s * 0.5},${y - s * 0.66} ${x + s * 0.7},${y - s * 0.31} Q${x + s * 0.85},${y - s * 0.06} ${slideEnd.x + s * 0.02},${slideEnd.y + s * 0.02}`, 'none', { layer: 2, stroke: slideColor, strokeWidth: 2, opacity: 0.7 }));
  // Platform railing
  children.push(createRect(x + s * 0.32, y - s * 0.92, s * 0.04, s * 0.12, metalColor, { layer: 2 }));
  children.push(createLine(x, y - s * 0.92, x + s * 0.36, y - s * 0.92, metalColor, { strokeWidth: 2.5, layer: 2 }));

  return createGroup(x, y, children, { layer: 2, category: 'slide', modifiable: true, id: uid('slide'), filter: 'url(#shadow)' });
}

function swingSet(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const poleColor = '#777';
  const seatColor = rng.pick(['#333', '#5C3317', '#444']);

  // A-frame structure
  children.push(createLine(x, y, x + s * 0.15, y - s * 0.9, poleColor, { strokeWidth: 4, layer: 2 }));
  children.push(createLine(x + s * 0.3, y, x + s * 0.15, y - s * 0.9, poleColor, { strokeWidth: 4, layer: 2 }));
  children.push(createLine(x + s * 0.7, y, x + s * 0.55, y - s * 0.9, poleColor, { strokeWidth: 4, layer: 2 }));
  children.push(createLine(x + s * 1.0, y, x + s * 0.55, y - s * 0.9, poleColor, { strokeWidth: 4, layer: 2 }));
  // Top bar
  children.push(createLine(x + s * 0.15, y - s * 0.9, x + s * 0.55, y - s * 0.9, poleColor, { strokeWidth: 4.5, layer: 2 }));

  // Swing 1
  const swing1X = x + s * 0.28;
  const swing1Angle = rng.nextFloat(-0.15, 0.15);
  const swing1BottomX = swing1X + Math.sin(swing1Angle) * s * 0.6;
  const swing1BottomY = y - s * 0.22 + Math.cos(swing1Angle) * s * 0.02;
  children.push(createLine(swing1X - s * 0.04, y - s * 0.88, swing1BottomX - s * 0.06, swing1BottomY, '#555', { strokeWidth: 1.5, layer: 2 }));
  children.push(createLine(swing1X + s * 0.04, y - s * 0.88, swing1BottomX + s * 0.06, swing1BottomY, '#555', { strokeWidth: 1.5, layer: 2 }));
  children.push(createRect(swing1BottomX - s * 0.07, swing1BottomY, s * 0.14, s * 0.03, seatColor, { layer: 2 }));

  // Swing 2
  const swing2X = x + s * 0.48;
  const swing2Angle = rng.nextFloat(-0.2, 0.2);
  const swing2BottomX = swing2X + Math.sin(swing2Angle) * s * 0.6;
  const swing2BottomY = y - s * 0.22 + Math.cos(swing2Angle) * s * 0.02;
  children.push(createLine(swing2X - s * 0.04, y - s * 0.88, swing2BottomX - s * 0.06, swing2BottomY, '#555', { strokeWidth: 1.5, layer: 2 }));
  children.push(createLine(swing2X + s * 0.04, y - s * 0.88, swing2BottomX + s * 0.06, swing2BottomY, '#555', { strokeWidth: 1.5, layer: 2 }));
  children.push(createRect(swing2BottomX - s * 0.07, swing2BottomY, s * 0.14, s * 0.03, seatColor, { layer: 2 }));

  return createGroup(x, y, children, { layer: 2, category: 'swings', modifiable: true, id: uid('swings'), filter: 'url(#shadow)' });
}

function monkeyBars(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const metalColor = rng.pick(['#CC7700', '#BB6600', '#DD8800']);

  // Side supports (A-frame)
  children.push(createLine(x, y, x + s * 0.05, y - s * 0.6, metalColor, { strokeWidth: 3.5, layer: 2 }));
  children.push(createLine(x + s * 0.15, y, x + s * 0.1, y - s * 0.6, metalColor, { strokeWidth: 3.5, layer: 2 }));
  children.push(createLine(x + s * 0.85, y, x + s * 0.8, y - s * 0.6, metalColor, { strokeWidth: 3.5, layer: 2 }));
  children.push(createLine(x + s * 1.0, y, x + s * 0.95, y - s * 0.6, metalColor, { strokeWidth: 3.5, layer: 2 }));
  // Top rails
  children.push(createLine(x + s * 0.07, y - s * 0.6, x + s * 0.87, y - s * 0.6, metalColor, { strokeWidth: 3.5, layer: 2 }));
  children.push(createLine(x + s * 0.07, y - s * 0.58, x + s * 0.87, y - s * 0.58, metalColor, { strokeWidth: 2, layer: 2, opacity: 0.5 }));
  // Rungs
  const rungCount = rng.nextInt(6, 8);
  for (let i = 0; i < rungCount; i++) {
    const rx = x + s * 0.12 + i * (s * 0.76 / (rungCount - 1));
    children.push(createLine(rx, y - s * 0.6, rx, y - s * 0.55, metalColor, { strokeWidth: 2.5, layer: 2 }));
  }

  return createGroup(x, y, children, { layer: 2, category: 'monkeybars', modifiable: true, id: uid('mbars'), filter: 'url(#shadow)' });
}

function sandbox(x: number, y: number, w2: number, h2: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  // Wooden border
  children.push(createRect(x, y, w2, h2, '#C4A35A', { layer: 2, stroke: '#A08A4A', strokeWidth: 2 }));
  // Sand surface
  children.push(createRect(x + 4, y + 4, w2 - 8, h2 - 8, '#E8D8A0', { layer: 2 }));
  // Sand texture dots
  for (let i = 0; i < 12; i++) {
    children.push(createCircle(x + rng.nextFloat(8, w2 - 8), y + rng.nextFloat(8, h2 - 8), rng.nextFloat(1, 2.5), '#D0C080', { layer: 2, opacity: 0.4 }));
  }
  // Sand castle
  const castleX = x + w2 * 0.3;
  const castleY = y + h2 * 0.5;
  children.push(createRect(castleX, castleY - 12, 16, 12, '#D4B878', { layer: 3 }));
  children.push(createRect(castleX + 3, castleY - 18, 10, 8, '#D4B878', { layer: 3 }));
  // Castle crenellations
  for (let i = 0; i < 3; i++) {
    children.push(createRect(castleX + 3 + i * 4, castleY - 21, 3, 3, '#D4B878', { layer: 3 }));
  }
  // Bucket
  const bucketX = x + w2 * 0.7;
  const bucketY = y + h2 * 0.6;
  children.push(createPath(0, 0, `M${bucketX - 6},${bucketY - 10} L${bucketX - 8},${bucketY} L${bucketX + 8},${bucketY} L${bucketX + 6},${bucketY - 10} Z`, rng.pick(['#FF4444', '#3399FF', '#FFCC00']), { layer: 3 }));
  children.push(createPath(0, 0, `M${bucketX - 5},${bucketY - 10} Q${bucketX},${bucketY - 16} ${bucketX + 5},${bucketY - 10}`, 'none', { layer: 3, stroke: '#666', strokeWidth: 1.5 }));
  // Shovel
  const shovelX = x + w2 * 0.85;
  children.push(createLine(shovelX, bucketY - 14, shovelX + 5, bucketY + 2, '#8B6914', { strokeWidth: 2, layer: 3 }));
  children.push(createRect(shovelX + 2, bucketY + 2, 8, 6, '#888', { layer: 3, rotation: 15 }));

  return createGroup(x, y, children, { layer: 2, category: 'sandbox', modifiable: true, id: uid('sandbox'), filter: 'url(#softShadow)' });
}

function trashCan(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const canColor = rng.pick(['#228B22', '#555', '#2E5090']);
  // Body
  const canPath = `M${x - s * 0.3},${y} L${x - s * 0.25},${y - s * 0.8} L${x + s * 0.25},${y - s * 0.8} L${x + s * 0.3},${y} Z`;
  children.push(createPath(x, y, canPath, canColor, { layer: 3, stroke: '#333', strokeWidth: 1 }));
  // Lid
  children.push(createEllipse(x, y - s * 0.8, s * 0.3, s * 0.08, '#444', { layer: 3, stroke: '#333', strokeWidth: 0.8 }));
  // Band
  children.push(createLine(x - s * 0.28, y - s * 0.3, x + s * 0.28, y - s * 0.3, '#444', { strokeWidth: 2, layer: 3, opacity: 0.5 }));
  return createGroup(x, y, children, { layer: 3, category: 'trash', modifiable: true, id: uid('trash') });
}

function ball(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const ballColor = rng.pick(['#FF4444', '#3399FF', '#FFCC00', '#FF6600', '#FF69B4']);
  children.push(createCircle(x, y, size, ballColor, { layer: 3 }));
  // Highlight
  children.push(createCircle(x - size * 0.25, y - size * 0.3, size * 0.3, '#FFFFFF', { layer: 3, opacity: 0.35 }));
  // Shadow
  children.push(createEllipse(x, y + size, size * 0.8, size * 0.2, 'rgba(0,0,0,0.15)', { layer: 2 }));
  return createGroup(x, y, children, { layer: 3, category: 'ball', modifiable: true, id: uid('ball') });
}

function kite(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const kiteColor = rng.pick(['#FF4444', '#3399FF', '#FFCC00', '#FF69B4', '#00CC66']);
  const kiteColor2 = rng.pick(['#FFD700', '#FFFFFF', '#FF8C00', '#87CEEB']);
  // Diamond shape
  const kitePath = `M${x},${y - size * 0.8} L${x + size * 0.5},${y} L${x},${y + size * 0.3} L${x - size * 0.5},${y} Z`;
  children.push(createPath(x, y, kitePath, kiteColor, { layer: 1, stroke: '#333', strokeWidth: 0.8 }));
  // Cross struts
  children.push(createLine(x, y - size * 0.8, x, y + size * 0.3, '#333', { strokeWidth: 1, layer: 1 }));
  children.push(createLine(x - size * 0.5, y, x + size * 0.5, y, '#333', { strokeWidth: 1, layer: 1 }));
  // Color split
  children.push(createPath(x, y, `M${x},${y - size * 0.8} L${x + size * 0.5},${y} L${x},${y + size * 0.3} Z`, kiteColor2, { layer: 1, opacity: 0.5 }));
  // Tail - wavy string
  const tailLen = size * 2;
  children.push(createPath(x, y, `M${x},${y + size * 0.3} Q${x + 10},${y + size * 0.3 + tailLen * 0.3} ${x - 8},${y + size * 0.3 + tailLen * 0.6} Q${x + 6},${y + size * 0.3 + tailLen * 0.8} ${x - 5},${y + size * 0.3 + tailLen}`, 'none', { layer: 1, stroke: '#555', strokeWidth: 1 }));
  // Bows on tail
  for (let i = 0; i < 3; i++) {
    const bx = x + rng.nextFloat(-8, 6);
    const by = y + size * 0.3 + tailLen * (0.25 + i * 0.3);
    children.push(createPath(0, 0, `M${bx - 4},${by} L${bx},${by - 3} L${bx + 4},${by} L${bx},${by + 3} Z`, rng.pick([kiteColor, kiteColor2]), { layer: 1, opacity: 0.8 }));
  }
  // String going to ground
  children.push(createLine(x, y + size * 0.3, x + size * 1.5, y + size * 4, '#888', { strokeWidth: 0.5, layer: 1, opacity: 0.5 }));

  return createGroup(x, y, children, { layer: 1, category: 'kite', modifiable: true, id: uid('kite') });
}

function jumpRope(x: number, y: number, s: number): SVGElementData {
  const children: SVGElementData[] = [];
  const ropeColor = '#AA3333';
  // Arc of the rope
  children.push(createPath(x, y, `M${x - s * 0.5},${y} Q${x},${y - s * 0.6} ${x + s * 0.5},${y}`, 'none', { layer: 3, stroke: ropeColor, strokeWidth: 2 }));
  // Handle left
  children.push(createRect(x - s * 0.5 - 3, y - 5, 6, 14, '#8B6914', { layer: 3 }));
  // Handle right
  children.push(createRect(x + s * 0.5 - 3, y - 5, 6, 14, '#8B6914', { layer: 3 }));
  return createGroup(x, y, children, { layer: 3, category: 'rope', modifiable: true, id: uid('rope') });
}

// ══════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ══════════════════════════════════════════════════════════════

export function generatePlayground(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  const skyTop = rng.pick(['#4A90D9', '#4088D0', '#5C9EE0']);
  const skyMid = rng.pick(['#7AB8E0', '#70B0D8', '#85C0E5']);
  const skyBot = rng.pick(['#B0D4F1', '#A8CCE8', '#C0DDEE']);

  const defs = combineDefs(
    outdoorDefs(),
    skyGradient('skyGrad', skyTop, skyMid, skyBot),
    groundGradient('grassGrad', '#4A8C3F', '#2D6A27'),
    linearGradient('pathGrad', [
      { offset: '0%', color: '#C8B898' },
      { offset: '100%', color: '#B0A080' },
    ]),
    sunGlowGradient('sunGlow'),
    linearGradient('sandGrad', [
      { offset: '0%', color: '#E8D8A0' },
      { offset: '100%', color: '#D0C088' },
    ]),
  );

  // ════════════════════════════════════════════
  //  LAYER 0 -- Sky
  // ════════════════════════════════════════════
  elements.push(createRect(0, 0, w, h * 0.45, 'url(#skyGrad)', { layer: 0, category: 'sky', modifiable: false }));

  // Sun
  const sunX = w * 0.82;
  const sunY = h * 0.09;
  elements.push(createCircle(sunX, sunY, 28, '#FFD700', { layer: 0, category: 'sun', modifiable: true, id: uid('sun'), opacity: 0.9 }));
  elements.push(createCircle(sunX, sunY, 50, 'url(#sunGlow)', { layer: 0, category: 'sun', modifiable: false, opacity: 0.15 }));

  // Clouds
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    elements.push(detailedCloud(rng.nextFloat(20, w - 80), rng.nextFloat(15, h * 0.2), rng.nextFloat(40, 75), rng));
  }

  // Kite in the sky
  elements.push(kite(rng.nextFloat(120, 350), rng.nextFloat(30, 80), rng.nextFloat(18, 26), rng));

  // Birds
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    elements.push(detailedBird(rng.nextFloat(50, w - 50), rng.nextFloat(20, h * 0.15), true, rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 1 -- Grass ground
  // ════════════════════════════════════════════
  elements.push(createRect(0, h * 0.45, w, h * 0.55, 'url(#grassGrad)', { layer: 1, category: 'ground', modifiable: false }));

  // Path through the park
  const pathY = h * 0.82;
  elements.push(createPath(0, 0, `M0,${pathY} Q${w * 0.25},${pathY - 15} ${w * 0.5},${pathY + 5} Q${w * 0.75},${pathY + 20} ${w},${pathY - 5}`, 'none', {
    layer: 1, stroke: 'url(#pathGrad)', strokeWidth: 35, category: 'path', modifiable: false, opacity: 0.8,
  }));

  // ════════════════════════════════════════════
  //  LAYER 1 -- Background trees
  // ════════════════════════════════════════════
  const treeTypes: Array<'pine' | 'oak'> = ['pine', 'oak'];
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const tx = rng.nextFloat(20, w - 20);
    const ty = h * rng.nextFloat(0.42, 0.5);
    elements.push(detailedTree(tx, ty, rng.pick(treeTypes), rng.nextFloat(70, 120), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 -- Playground equipment
  // ════════════════════════════════════════════

  // Slide
  elements.push(slide(80, h * 0.68, 100, rng));

  // Swing set
  elements.push(swingSet(320, h * 0.68, 120, rng));

  // Monkey bars
  elements.push(monkeyBars(550, h * 0.66, 100, rng));

  // Sandbox
  elements.push(sandbox(w * 0.05, h * 0.72, 100, 60, rng));

  // ════════════════════════════════════════════
  //  LAYER 3 -- People (kids playing, parents)
  // ════════════════════════════════════════════

  // Kids near slide
  elements.push(detailedPerson(190, h * 0.67, rng.nextFloat(35, 45), rng));

  // Kid near swings
  elements.push(detailedPerson(350, h * 0.65, rng.nextFloat(32, 42), rng));

  // Parent watching (taller)
  elements.push(detailedPerson(480, h * 0.64, rng.nextFloat(58, 70), rng));

  // Kid near monkey bars
  elements.push(detailedPerson(600, h * 0.65, rng.nextFloat(34, 44), rng));

  // More kids in the field
  elements.push(detailedPerson(rng.nextFloat(250, 300), h * 0.75, rng.nextFloat(33, 43), rng));
  elements.push(detailedPerson(rng.nextFloat(650, 720), h * 0.74, rng.nextFloat(55, 68), rng));

  // ════════════════════════════════════════════
  //  LAYER 3 -- Props
  // ════════════════════════════════════════════

  // Ball on the grass
  elements.push(ball(rng.nextFloat(400, 500), h * 0.76, rng.nextFloat(6, 10), rng));

  // Trash can
  elements.push(trashCan(w * 0.88, h * 0.68, 22, rng));

  // Bench
  elements.push(detailedBench(w * 0.72, h * 0.7, 60, rng));

  // Jump rope on ground
  elements.push(jumpRope(rng.nextFloat(250, 350), h * 0.78, 40));

  // ════════════════════════════════════════════
  //  LAYER 3 -- Flowers along edges
  // ════════════════════════════════════════════
  const flowerTypes: Array<'daisy' | 'tulip' | 'sunflower'> = ['daisy', 'tulip', 'sunflower'];
  for (let i = 0; i < rng.nextInt(4, 7); i++) {
    const fx = rng.nextFloat(10, w - 10);
    const fy = h * rng.nextFloat(0.5, 0.6);
    elements.push(detailedFlower(fx, fy, rng.pick(flowerTypes), rng.nextFloat(18, 30), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 4 -- Playground sign
  // ════════════════════════════════════════════
  const signX = w * 0.01;
  const signY = h * 0.4;
  // Post
  elements.push(createRect(signX + 30, signY, 5, h * 0.28, '#6B4226', { layer: 2, modifiable: false }));
  // Sign board
  elements.push(createRect(signX, signY - 5, 65, 28, '#5C8A3F', { layer: 2, category: 'sign', modifiable: true, id: uid('parksign'), stroke: '#3A6A2A', strokeWidth: 1.5 }));
  elements.push(createText(signX + 6, signY + 14, rng.pick(['PARK', 'PLAY']), '#FFFFFF', {
    layer: 2, category: 'text', modifiable: true, id: uid('parktxt'), fontSize: 13,
  }));

  return { elements, defs };
}
