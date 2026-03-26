import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath,
  createLine, createGroup, createText,
} from '../engine/primitives';
import {
  combineDefs, outdoorDefs, linearGradient, radialGradient,
  skyGradient, groundGradient, dropShadow, softGlow, sunGlowGradient,
} from './svg-effects';
import {
  detailedTree, detailedCloud, detailedRock, detailedPerson,
  detailedFlower, resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'zo') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// Elephant
function elephant(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const gray = rng.pick(['#808890', '#707880', '#909098']);

  // Ground shadow
  children.push(createEllipse(x, y + s * 0.02, s * 0.4, s * 0.06, 'rgba(0,0,0,0.15)', { layer: 2 }));
  // Body
  const bodyPath = `M${x - s * 0.35},${y - s * 0.1} Q${x - s * 0.4},${y - s * 0.35} ${x - s * 0.15},${y - s * 0.45} Q${x + s * 0.1},${y - s * 0.5} ${x + s * 0.3},${y - s * 0.4} Q${x + s * 0.45},${y - s * 0.3} ${x + s * 0.4},${y - s * 0.05} Q${x + s * 0.3},${y + s * 0.05} ${x},${y + s * 0.05} Q${x - s * 0.25},${y + s * 0.05} ${x - s * 0.35},${y - s * 0.1} Z`;
  children.push(createPath(x, y, bodyPath, gray, { layer: 2 }));
  // Legs (4 thick columns)
  children.push(createRect(x - s * 0.28, y - s * 0.08, s * 0.1, s * 0.12, gray, { layer: 2 }));
  children.push(createRect(x - s * 0.12, y - s * 0.06, s * 0.1, s * 0.1, gray, { layer: 2 }));
  children.push(createRect(x + s * 0.1, y - s * 0.06, s * 0.1, s * 0.1, gray, { layer: 2 }));
  children.push(createRect(x + s * 0.25, y - s * 0.08, s * 0.1, s * 0.12, gray, { layer: 2 }));
  // Head
  const headPath = `M${x - s * 0.38},${y - s * 0.3} Q${x - s * 0.5},${y - s * 0.35} ${x - s * 0.5},${y - s * 0.5} Q${x - s * 0.48},${y - s * 0.6} ${x - s * 0.35},${y - s * 0.6} Q${x - s * 0.25},${y - s * 0.58} ${x - s * 0.28},${y - s * 0.4} Z`;
  children.push(createPath(x, y, headPath, gray, { layer: 2 }));
  // Ears
  children.push(createEllipse(x - s * 0.48, y - s * 0.48, s * 0.1, s * 0.12, '#707878', { layer: 2, opacity: 0.8 }));
  // Trunk
  const trunkPath = `M${x - s * 0.42},${y - s * 0.42} Q${x - s * 0.55},${y - s * 0.3} ${x - s * 0.5},${y - s * 0.15} Q${x - s * 0.45},${y - s * 0.05} ${x - s * 0.4},${y - s * 0.1}`;
  children.push(createPath(x, y, trunkPath, 'none', { stroke: gray, strokeWidth: s * 0.06, layer: 2 }));
  // Eye
  children.push(createCircle(x - s * 0.38, y - s * 0.52, s * 0.02, '#222', { layer: 2 }));
  // Tusks
  children.push(createPath(x, y, `M${x - s * 0.42},${y - s * 0.38} Q${x - s * 0.48},${y - s * 0.28} ${x - s * 0.44},${y - s * 0.2}`, 'none', { stroke: '#F5F0E0', strokeWidth: s * 0.02, layer: 2 }));
  // Tail
  children.push(createPath(x, y, `M${x + s * 0.38},${y - s * 0.2} Q${x + s * 0.45},${y - s * 0.15} ${x + s * 0.42},${y - s * 0.08}`, 'none', { stroke: gray, strokeWidth: 1.5, layer: 2 }));

  return createGroup(x, y, children, { layer: 2, category: 'elephant', modifiable: true, id: uid('eleph'), filter: 'url(#shadow)' });
}

// Giraffe
function giraffe(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const bodyColor = '#D4A840';
  const patchColor = '#8A5A20';

  // Ground shadow
  children.push(createEllipse(x, y + s * 0.02, s * 0.2, s * 0.04, 'rgba(0,0,0,0.12)', { layer: 2 }));
  // Body
  children.push(createEllipse(x, y - s * 0.15, s * 0.2, s * 0.12, bodyColor, { layer: 2 }));
  // Legs (4 thin)
  children.push(createRect(x - s * 0.13, y - s * 0.06, s * 0.04, s * 0.1, bodyColor, { layer: 2 }));
  children.push(createRect(x - s * 0.05, y - s * 0.04, s * 0.04, s * 0.08, bodyColor, { layer: 2 }));
  children.push(createRect(x + s * 0.05, y - s * 0.04, s * 0.04, s * 0.08, bodyColor, { layer: 2 }));
  children.push(createRect(x + s * 0.12, y - s * 0.06, s * 0.04, s * 0.1, bodyColor, { layer: 2 }));
  // Hooves
  children.push(createRect(x - s * 0.135, y + s * 0.03, s * 0.05, s * 0.02, '#3A2A10', { layer: 2 }));
  children.push(createRect(x + s * 0.115, y + s * 0.03, s * 0.05, s * 0.02, '#3A2A10', { layer: 2 }));
  // Neck (long!)
  children.push(createPath(x, y, `M${x - s * 0.08},${y - s * 0.25} Q${x - s * 0.06},${y - s * 0.55} ${x - s * 0.04},${y - s * 0.75} L${x + s * 0.04},${y - s * 0.75} Q${x + s * 0.06},${y - s * 0.55} ${x + s * 0.08},${y - s * 0.25} Z`, bodyColor, { layer: 2 }));
  // Head
  children.push(createEllipse(x, y - s * 0.8, s * 0.06, s * 0.04, bodyColor, { layer: 2 }));
  // Ossicones (horns)
  children.push(createLine(x - s * 0.02, y - s * 0.83, x - s * 0.02, y - s * 0.9, '#8A5A20', { strokeWidth: 2, layer: 2 }));
  children.push(createCircle(x - s * 0.02, y - s * 0.91, s * 0.012, '#5A3A10', { layer: 2 }));
  children.push(createLine(x + s * 0.02, y - s * 0.83, x + s * 0.02, y - s * 0.9, '#8A5A20', { strokeWidth: 2, layer: 2 }));
  children.push(createCircle(x + s * 0.02, y - s * 0.91, s * 0.012, '#5A3A10', { layer: 2 }));
  // Eye
  children.push(createCircle(x + s * 0.03, y - s * 0.8, s * 0.01, '#222', { layer: 2 }));
  // Patches on body and neck
  for (let i = 0; i < 6; i++) {
    const px = x + rng.nextFloat(-s * 0.15, s * 0.15);
    const py = y - s * 0.15 + rng.nextFloat(-s * 0.08, s * 0.08);
    children.push(createEllipse(px, py, rng.nextFloat(s * 0.03, s * 0.06), rng.nextFloat(s * 0.02, s * 0.04), patchColor, { layer: 2, opacity: 0.5 }));
  }
  for (let i = 0; i < 4; i++) {
    const px = x + rng.nextFloat(-s * 0.04, s * 0.04);
    const py = y - s * 0.35 - i * s * 0.1;
    children.push(createEllipse(px, py, rng.nextFloat(s * 0.02, s * 0.04), rng.nextFloat(s * 0.015, s * 0.03), patchColor, { layer: 2, opacity: 0.5 }));
  }
  // Tail
  children.push(createPath(x, y, `M${x + s * 0.18},${y - s * 0.18} Q${x + s * 0.22},${y - s * 0.1} ${x + s * 0.2},${y - s * 0.05}`, 'none', { stroke: bodyColor, strokeWidth: 1.5, layer: 2 }));
  children.push(createCircle(x + s * 0.2, y - s * 0.04, s * 0.015, '#5A3A10', { layer: 2 }));

  return createGroup(x, y, children, { layer: 2, category: 'giraffe', modifiable: true, id: uid('giraf'), filter: 'url(#shadow)' });
}

// Monkey (on tree)
function monkey(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const furColor = rng.pick(['#8B6E4E', '#6B4E2E', '#A07A50']);

  // Body (sitting position)
  children.push(createEllipse(x, y, s * 0.15, s * 0.18, furColor, { layer: 3 }));
  // Head
  children.push(createCircle(x, y - s * 0.25, s * 0.12, furColor, { layer: 3 }));
  // Face
  children.push(createCircle(x, y - s * 0.23, s * 0.08, '#E8C8A0', { layer: 3 }));
  // Eyes
  children.push(createCircle(x - s * 0.035, y - s * 0.25, s * 0.02, '#111', { layer: 3 }));
  children.push(createCircle(x + s * 0.035, y - s * 0.25, s * 0.02, '#111', { layer: 3 }));
  // Mouth
  children.push(createPath(x, y, `M${x - s * 0.02},${y - s * 0.19} Q${x},${y - s * 0.17} ${x + s * 0.02},${y - s * 0.19}`, 'none', { stroke: '#8A5A30', strokeWidth: 0.8, layer: 3 }));
  // Ears
  children.push(createCircle(x - s * 0.11, y - s * 0.27, s * 0.035, '#E8C8A0', { layer: 3 }));
  children.push(createCircle(x + s * 0.11, y - s * 0.27, s * 0.035, '#E8C8A0', { layer: 3 }));
  // Arms
  children.push(createPath(x, y, `M${x - s * 0.12},${y - s * 0.08} Q${x - s * 0.22},${y - s * 0.15} ${x - s * 0.2},${y - s * 0.25}`, 'none', { stroke: furColor, strokeWidth: s * 0.04, layer: 3 }));
  children.push(createPath(x, y, `M${x + s * 0.12},${y - s * 0.08} Q${x + s * 0.22},${y + s * 0.02} ${x + s * 0.18},${y + s * 0.1}`, 'none', { stroke: furColor, strokeWidth: s * 0.04, layer: 3 }));
  // Tail (curled)
  children.push(createPath(x, y, `M${x - s * 0.05},${y + s * 0.15} Q${x - s * 0.2},${y + s * 0.25} ${x - s * 0.25},${y + s * 0.15} Q${x - s * 0.28},${y + s * 0.05} ${x - s * 0.2},${y}`, 'none', { stroke: furColor, strokeWidth: s * 0.025, layer: 3 }));

  return createGroup(x, y, children, { layer: 3, category: 'monkey', modifiable: true, id: uid('monk') });
}

// Penguin
function penguin(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];

  // Body
  const bodyPath = `M${x - s * 0.12},${y + s * 0.05} Q${x - s * 0.15},${y - s * 0.1} ${x - s * 0.1},${y - s * 0.25} Q${x},${y - s * 0.35} ${x + s * 0.1},${y - s * 0.25} Q${x + s * 0.15},${y - s * 0.1} ${x + s * 0.12},${y + s * 0.05} Z`;
  children.push(createPath(x, y, bodyPath, '#1A1A2A', { layer: 3 }));
  // Belly (white)
  const bellyPath = `M${x - s * 0.07},${y + s * 0.04} Q${x - s * 0.08},${y - s * 0.08} ${x - s * 0.05},${y - s * 0.18} Q${x},${y - s * 0.22} ${x + s * 0.05},${y - s * 0.18} Q${x + s * 0.08},${y - s * 0.08} ${x + s * 0.07},${y + s * 0.04} Z`;
  children.push(createPath(x, y, bellyPath, '#F0F0F0', { layer: 3 }));
  // Eyes
  children.push(createCircle(x - s * 0.035, y - s * 0.22, s * 0.018, '#FFF', { layer: 3 }));
  children.push(createCircle(x + s * 0.035, y - s * 0.22, s * 0.018, '#FFF', { layer: 3 }));
  children.push(createCircle(x - s * 0.035, y - s * 0.22, s * 0.01, '#111', { layer: 3 }));
  children.push(createCircle(x + s * 0.035, y - s * 0.22, s * 0.01, '#111', { layer: 3 }));
  // Beak
  children.push(createPath(x, y, `M${x - s * 0.02},${y - s * 0.19} L${x},${y - s * 0.15} L${x + s * 0.02},${y - s * 0.19}`, '#FF8800', { layer: 3 }));
  // Flippers
  children.push(createPath(x, y, `M${x - s * 0.12},${y - s * 0.15} Q${x - s * 0.18},${y - s * 0.05} ${x - s * 0.14},${y + s * 0.02}`, 'none', { stroke: '#1A1A2A', strokeWidth: s * 0.04, layer: 3 }));
  children.push(createPath(x, y, `M${x + s * 0.12},${y - s * 0.15} Q${x + s * 0.18},${y - s * 0.05} ${x + s * 0.14},${y + s * 0.02}`, 'none', { stroke: '#1A1A2A', strokeWidth: s * 0.04, layer: 3 }));
  // Feet
  children.push(createEllipse(x - s * 0.05, y + s * 0.06, s * 0.04, s * 0.015, '#FF8800', { layer: 3 }));
  children.push(createEllipse(x + s * 0.05, y + s * 0.06, s * 0.04, s * 0.015, '#FF8800', { layer: 3 }));

  return createGroup(x, y, children, { layer: 3, category: 'penguin', modifiable: true, id: uid('peng') });
}

// Fence barrier
function fence(x: number, y: number, length: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const postCount = Math.max(2, Math.floor(length / 25) + 1);
  const gap = length / (postCount - 1);

  // Rails
  children.push(createLine(x, y - 18, x + length, y - 18, '#8A7A60', { strokeWidth: 3, layer: 2 }));
  children.push(createLine(x, y - 8, x + length, y - 8, '#8A7A60', { strokeWidth: 3, layer: 2 }));
  // Posts
  for (let i = 0; i < postCount; i++) {
    const px = x + i * gap;
    children.push(createRect(px - 2, y - 25, 4, 28, '#7A6A50', { layer: 2 }));
    // Post cap
    children.push(createCircle(px, y - 25, 3, '#8A7A60', { layer: 2 }));
  }
  return createGroup(x, y, children, { layer: 2, category: 'fence', modifiable: false });
}

// Balloon
function balloon(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const color = rng.pick(['#FF4444', '#4488FF', '#FFCC00', '#44CC44', '#FF88CC', '#FF8800']);
  const children: SVGElementData[] = [];
  // Balloon body
  const balloonPath = `M${x},${y - s * 0.9} Q${x - s * 0.35},${y - s * 0.9} ${x - s * 0.35},${y - s * 0.5} Q${x - s * 0.35},${y - s * 0.15} ${x},${y} Q${x + s * 0.35},${y - s * 0.15} ${x + s * 0.35},${y - s * 0.5} Q${x + s * 0.35},${y - s * 0.9} ${x},${y - s * 0.9} Z`;
  children.push(createPath(x, y, balloonPath, color, { layer: 4 }));
  // Highlight
  children.push(createEllipse(x - s * 0.1, y - s * 0.6, s * 0.06, s * 0.12, '#FFF', { layer: 4, opacity: 0.3 }));
  // Knot
  children.push(createPath(x, y, `M${x - s * 0.03},${y} L${x},${y + s * 0.05} L${x + s * 0.03},${y}`, color, { layer: 4 }));
  // String
  children.push(createPath(x, y, `M${x},${y + s * 0.05} Q${x + rng.nextFloat(-s * 0.1, s * 0.1)},${y + s * 0.3} ${x},${y + s * 0.5}`, 'none', { stroke: '#888', strokeWidth: 0.5, layer: 4 }));

  return createGroup(x, y, children, { layer: 4, category: 'balloon', modifiable: true, id: uid('ball') });
}

// Ice cream cart
function iceCreamCart(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];

  // Cart body
  children.push(createRect(x - s * 0.3, y - s * 0.35, s * 0.6, s * 0.3, '#FFF', { layer: 3, stroke: '#DDD', strokeWidth: 1 }));
  // Stripe decoration
  children.push(createRect(x - s * 0.3, y - s * 0.35, s * 0.6, s * 0.05, '#FF6688', { layer: 3 }));
  // Umbrella/awning
  const umbrellaPath = `M${x - s * 0.35},${y - s * 0.35} Q${x - s * 0.35},${y - s * 0.55} ${x},${y - s * 0.6} Q${x + s * 0.35},${y - s * 0.55} ${x + s * 0.35},${y - s * 0.35}`;
  children.push(createPath(x, y, umbrellaPath, rng.pick(['#FF4444', '#FFAA00', '#44AA44']), { layer: 3, opacity: 0.9 }));
  // Pole
  children.push(createLine(x, y - s * 0.6, x, y - s * 0.35, '#888', { strokeWidth: 2, layer: 3 }));
  // Wheels
  children.push(createCircle(x - s * 0.2, y, s * 0.06, '#555', { layer: 3, stroke: '#333', strokeWidth: 1 }));
  children.push(createCircle(x + s * 0.2, y, s * 0.06, '#555', { layer: 3, stroke: '#333', strokeWidth: 1 }));
  // Handle
  children.push(createPath(x, y, `M${x + s * 0.3},${y - s * 0.1} L${x + s * 0.4},${y - s * 0.25}`, 'none', { stroke: '#888', strokeWidth: 2.5, layer: 3 }));
  // "ICE CREAM" text
  children.push(createText(x - s * 0.2, y - s * 0.15, 'ICE CREAM', '#FF6688', {
    layer: 3, category: 'text', modifiable: true, id: uid('ict'), fontSize: Math.max(6, s * 0.08), fontFamily: 'sans-serif',
  }));

  return createGroup(x, y, children, { layer: 3, category: 'cart', modifiable: true, id: uid('cart'), filter: 'url(#shadow)' });
}

// Zoo sign
function zooSign(x: number, y: number, size: number, text: string, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  // Post
  children.push(createRect(x - s * 0.04, y - s * 0.1, s * 0.08, s * 0.2, '#6B4E2E', { layer: 3 }));
  // Sign board
  children.push(createRect(x - s * 0.25, y - s * 0.5, s * 0.5, s * 0.35, '#3A7A3A', { layer: 3, stroke: '#2A5A2A', strokeWidth: 1 }));
  // Text on sign
  children.push(createText(x - s * 0.15, y - s * 0.28, text, '#FFF', {
    layer: 3, category: 'text', modifiable: true, id: uid('sign'), fontSize: Math.max(7, s * 0.1),
  }));
  return createGroup(x, y, children, { layer: 3, category: 'sign', modifiable: true, id: uid('zsign') });
}

// Water feature (small pond)
function waterFeature(x: number, y: number, w2: number, h2: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  children.push(createEllipse(x, y, w2, h2, '#3388BB', { layer: 1, opacity: 0.6 }));
  children.push(createEllipse(x, y, w2 * 0.7, h2 * 0.6, '#44AADD', { layer: 1, opacity: 0.3 }));
  // Ripples
  children.push(createEllipse(x + rng.nextFloat(-w2 * 0.3, w2 * 0.3), y + rng.nextFloat(-h2 * 0.2, h2 * 0.2), w2 * 0.2, h2 * 0.15, 'none', { layer: 1, stroke: '#66CCEE', strokeWidth: 0.5, opacity: 0.4 }));
  return createGroup(x, y, children, { layer: 1, category: 'water', modifiable: true, id: uid('pond') });
}

// Walking path
function walkingPath(x: number, y: number, w2: number, h2: number): SVGElementData {
  return createRect(x, y, w2, h2, '#C8B890', { layer: 1, category: 'path', modifiable: false, stroke: '#A89870', strokeWidth: 0.5 });
}

export function generateZooEnclosure(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];
  const groundY = h * 0.45;

  const defs = combineDefs(
    outdoorDefs(),
    dropShadow('shadow', 2, 3, 3, 'rgba(0,0,0,0.25)'),
    softGlow('glow', 6),
    skyGradient('skyGrad', '#2288DD', '#66BBEE', '#AAD8FF'),
    groundGradient('grassGrad', '#5A9A40', '#3A7A28'),
    sunGlowGradient('sunGlow'),
    linearGradient('pathGrad', [
      { offset: '0%', color: '#D4C0A0' },
      { offset: '100%', color: '#B8A880' },
    ]),
    radialGradient('pondGrad', [
      { offset: '0%', color: '#44BBDD', opacity: 0.7 },
      { offset: '100%', color: '#2288AA', opacity: 0.4 },
    ]),
  );

  // ═══════════════════════════════════════
  // LAYER 0 — Sky
  // ═══════════════════════════════════════
  elements.push(createRect(0, 0, w, groundY, 'url(#skyGrad)', { layer: 0, category: 'sky', modifiable: false }));

  // Sun
  elements.push(createCircle(w * 0.85, h * 0.1, 30, 'url(#sunGlow)', { layer: 0, category: 'sun', modifiable: false }));
  elements.push(createCircle(w * 0.85, h * 0.1, 15, '#FFFFEE', { layer: 0, category: 'sun', modifiable: true, id: uid('sun') }));

  // Clouds
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(detailedCloud(rng.nextFloat(w * 0.05, w * 0.9), rng.nextFloat(h * 0.04, h * 0.2), rng.nextFloat(50, 90), rng));
  }

  // ═══════════════════════════════════════
  // LAYER 1 — Ground / grass
  // ═══════════════════════════════════════
  elements.push(createRect(0, groundY, w, h - groundY, 'url(#grassGrad)', { layer: 1, category: 'ground', modifiable: false }));

  // ═══════════════════════════════════════
  // LAYER 1 — Walking paths
  // ═══════════════════════════════════════
  // Main horizontal path
  elements.push(walkingPath(0, h * 0.58, w, h * 0.06));
  // Vertical path connecting
  elements.push(walkingPath(w * 0.45, h * 0.45, w * 0.1, h * 0.15));

  // ═══════════════════════════════════════
  // LAYER 1 — Water feature
  // ═══════════════════════════════════════
  elements.push(waterFeature(w * rng.nextFloat(0.15, 0.25), h * rng.nextFloat(0.48, 0.55), rng.nextFloat(30, 50), rng.nextFloat(15, 25), rng));

  // ═══════════════════════════════════════
  // LAYER 2 — Background trees
  // ═══════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    elements.push(detailedTree(rng.nextFloat(w * 0.05, w * 0.95), groundY + rng.nextFloat(-5, 5), rng.pick(['oak', 'pine'] as const), rng.nextFloat(70, 110), rng));
  }

  // ═══════════════════════════════════════
  // LAYER 2 — Fences (enclosure barriers)
  // ═══════════════════════════════════════
  // Elephant enclosure fence
  elements.push(fence(w * 0.02, groundY + 5, w * 0.35, rng));
  // Giraffe enclosure fence
  elements.push(fence(w * 0.6, groundY + 5, w * 0.38, rng));
  // Penguin enclosure fence (lower area)
  elements.push(fence(w * 0.55, h * 0.72, w * 0.25, rng));

  // ═══════════════════════════════════════
  // LAYER 2 — Rocks
  // ═══════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    elements.push(detailedRock(rng.nextFloat(w * 0.05, w * 0.95), groundY + rng.nextFloat(5, 25), rng.nextFloat(10, 20), rng));
  }

  // ═══════════════════════════════════════
  // LAYER 2 — Animals
  // ═══════════════════════════════════════
  // Elephant (left enclosure)
  elements.push(elephant(w * rng.nextFloat(0.12, 0.25), groundY + rng.nextFloat(-8, 0), rng.nextFloat(60, 80), rng));

  // Giraffe (right enclosure)
  elements.push(giraffe(w * rng.nextFloat(0.7, 0.85), groundY + rng.nextFloat(-5, 3), rng.nextFloat(65, 85), rng));

  // Monkey (on a tree)
  elements.push(monkey(w * rng.nextFloat(0.4, 0.55), groundY - rng.nextFloat(40, 60), rng.nextFloat(30, 45), rng));

  // Penguins (group of 2-4 in lower area)
  const pengCount = rng.nextInt(2, 4);
  for (let i = 0; i < pengCount; i++) {
    elements.push(penguin(
      w * 0.6 + i * rng.nextFloat(20, 35) + rng.nextFloat(-5, 5),
      h * 0.72 - rng.nextFloat(5, 15),
      rng.nextFloat(22, 32), rng,
    ));
  }

  // ═══════════════════════════════════════
  // LAYER 3 — Visitors (detailedPerson)
  // ═══════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    elements.push(detailedPerson(
      rng.nextFloat(w * 0.1, w * 0.9),
      h * 0.58 + rng.nextFloat(-3, 3),
      rng.nextFloat(40, 55), rng,
    ));
  }

  // ═══════════════════════════════════════
  // LAYER 3 — Zoo signs
  // ═══════════════════════════════════════
  elements.push(zooSign(w * 0.15, groundY + 15, rng.nextFloat(28, 38), 'Elephants', rng));
  elements.push(zooSign(w * 0.75, groundY + 15, rng.nextFloat(28, 38), 'Giraffes', rng));
  elements.push(zooSign(w * 0.6, h * 0.74, rng.nextFloat(22, 30), 'Penguins', rng));

  // ═══════════════════════════════════════
  // LAYER 3 — Flowers
  // ═══════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    elements.push(detailedFlower(rng.nextFloat(w * 0.05, w * 0.95), h * 0.58 + rng.nextFloat(10, 25), rng.pick(['daisy', 'tulip', 'rose', 'sunflower'] as const), rng.nextFloat(18, 28), rng));
  }

  // ═══════════════════════════════════════
  // LAYER 4 — Balloons
  // ═══════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(balloon(rng.nextFloat(w * 0.1, w * 0.9), rng.nextFloat(h * 0.25, h * 0.5), rng.nextFloat(18, 28), rng));
  }

  // ═══════════════════════════════════════
  // LAYER 3 — Ice cream cart
  // ═══════════════════════════════════════
  elements.push(iceCreamCart(w * rng.nextFloat(0.35, 0.5), h * 0.58, rng.nextFloat(45, 60), rng));

  return { elements, defs };
}
