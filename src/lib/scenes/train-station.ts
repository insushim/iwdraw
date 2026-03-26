import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath,
  createLine, createGroup, createText,
} from '../engine/primitives';
import {
  combineDefs, outdoorDefs, skyGradient, linearGradient,
  radialGradient,
} from './svg-effects';
import {
  detailedPerson, detailedCloud, detailedBench, detailedLamp,
  detailedBird, resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'ts') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// ── Helper components ──

function trainLocomotive(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const bodyColor = rng.pick(['#2244AA', '#CC3333', '#228822', '#333']);
  const accentColor = rng.pick(['#FFD700', '#FFFFFF', '#CC9900']);

  // Main body
  children.push(createRect(x, y - s * 0.5, s * 1.2, s * 0.5, bodyColor, { layer: 2, stroke: '#222', strokeWidth: 1 }));
  // Cab (taller rear section)
  children.push(createRect(x + s * 0.85, y - s * 0.78, s * 0.35, s * 0.78, bodyColor, { layer: 2, stroke: '#222', strokeWidth: 1 }));
  // Cab roof
  children.push(createRect(x + s * 0.82, y - s * 0.82, s * 0.41, s * 0.05, '#222', { layer: 2 }));
  // Cab windows
  children.push(createRect(x + s * 0.9, y - s * 0.72, s * 0.1, s * 0.12, '#87CEEB', { layer: 2, stroke: '#444', strokeWidth: 0.5 }));
  children.push(createRect(x + s * 1.05, y - s * 0.72, s * 0.1, s * 0.12, '#87CEEB', { layer: 2, stroke: '#444', strokeWidth: 0.5 }));
  // Nose / front
  const nosePath = `M${x},${y - s * 0.5} L${x - s * 0.15},${y - s * 0.35} L${x - s * 0.15},${y} L${x},${y} Z`;
  children.push(createPath(x, y, nosePath, bodyColor, { layer: 2, stroke: '#222', strokeWidth: 1 }));
  // Headlight
  children.push(createCircle(x - s * 0.15, y - s * 0.3, s * 0.06, '#FFD700', { layer: 2, opacity: 0.9 }));
  children.push(createCircle(x - s * 0.15, y - s * 0.3, s * 0.12, '#FFD700', { layer: 2, opacity: 0.1 }));
  // Accent stripes
  children.push(createRect(x, y - s * 0.22, s * 1.2, s * 0.04, accentColor, { layer: 2, opacity: 0.8 }));
  children.push(createRect(x, y - s * 0.48, s * 0.85, s * 0.03, accentColor, { layer: 2, opacity: 0.6 }));
  // Smokestack / chimney
  children.push(createRect(x + s * 0.2, y - s * 0.65, s * 0.08, s * 0.15, '#333', { layer: 2 }));
  children.push(createEllipse(x + s * 0.24, y - s * 0.65, s * 0.06, s * 0.02, '#444', { layer: 2 }));
  // Wheels
  const wheelR = s * 0.09;
  const wheelY2 = y + wheelR * 0.2;
  for (let i = 0; i < 3; i++) {
    const wx = x + s * 0.15 + i * s * 0.35;
    children.push(createCircle(wx, wheelY2, wheelR, '#333', { layer: 2, stroke: '#555', strokeWidth: 1.5 }));
    children.push(createCircle(wx, wheelY2, wheelR * 0.35, '#666', { layer: 2 }));
    // Spokes
    for (let sp = 0; sp < 4; sp++) {
      const angle = sp * Math.PI / 2;
      children.push(createLine(wx, wheelY2, wx + Math.cos(angle) * wheelR * 0.8, wheelY2 + Math.sin(angle) * wheelR * 0.8, '#555', { strokeWidth: 1, layer: 2 }));
    }
  }
  // Cow catcher
  children.push(createPath(x, y, `M${x - s * 0.15},${y} L${x - s * 0.25},${y + s * 0.05} L${x - s * 0.15},${y + s * 0.05} Z`, '#555', { layer: 2 }));

  return createGroup(x, y, children, { layer: 2, category: 'train', modifiable: true, id: uid('loco'), filter: 'url(#shadow)' });
}

function trainCar(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const carColor = rng.pick(['#2255BB', '#CC4444', '#44AA44', '#885522', '#557788']);
  // Body
  children.push(createRect(x, y - s * 0.45, s * 1.0, s * 0.45, carColor, { layer: 2, stroke: '#222', strokeWidth: 1 }));
  // Roof
  children.push(createRect(x - 2, y - s * 0.48, s * 1.04, s * 0.04, '#444', { layer: 2 }));
  // Windows
  const windowCount = rng.nextInt(4, 6);
  for (let i = 0; i < windowCount; i++) {
    const ww = (s * 0.85) / windowCount;
    const wx = x + s * 0.06 + i * ww;
    children.push(createRect(wx + 2, y - s * 0.38, ww - 5, s * 0.18, '#87CEEB', { layer: 2, stroke: '#444', strokeWidth: 0.5 }));
  }
  // Bottom stripe
  children.push(createRect(x, y - s * 0.06, s * 1.0, s * 0.03, '#FFD700', { layer: 2, opacity: 0.6 }));
  // Wheels (2 bogies)
  const wheelR = s * 0.065;
  const wheelY2 = y + wheelR * 0.2;
  for (let i = 0; i < 2; i++) {
    const bx = x + s * 0.2 + i * s * 0.6;
    children.push(createCircle(bx, wheelY2, wheelR, '#333', { layer: 2, stroke: '#555', strokeWidth: 1 }));
    children.push(createCircle(bx, wheelY2, wheelR * 0.3, '#666', { layer: 2 }));
    children.push(createCircle(bx + s * 0.12, wheelY2, wheelR, '#333', { layer: 2, stroke: '#555', strokeWidth: 1 }));
    children.push(createCircle(bx + s * 0.12, wheelY2, wheelR * 0.3, '#666', { layer: 2 }));
  }
  // Coupling at end
  children.push(createRect(x + s * 1.0, y - s * 0.15, s * 0.05, s * 0.06, '#444', { layer: 2 }));
  return createGroup(x, y, children, { layer: 2, category: 'car', modifiable: true, id: uid('car') });
}

function stationClock(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  // Clock face
  children.push(createCircle(x, y, s, '#FFFFF0', { layer: 3, stroke: '#333', strokeWidth: 2 }));
  // Border ring
  children.push(createCircle(x, y, s * 0.92, 'none', { layer: 3, stroke: '#222', strokeWidth: 1 }));
  // Hour marks
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30 - 90) * Math.PI / 180;
    const innerR = s * 0.75;
    const outerR = s * 0.85;
    children.push(createLine(x + Math.cos(angle) * innerR, y + Math.sin(angle) * innerR, x + Math.cos(angle) * outerR, y + Math.sin(angle) * outerR, '#333', { strokeWidth: i % 3 === 0 ? 2 : 1, layer: 3 }));
  }
  // Hour hand
  const hourAngle = rng.nextFloat(0, 360) * Math.PI / 180;
  children.push(createLine(x, y, x + Math.cos(hourAngle) * s * 0.5, y + Math.sin(hourAngle) * s * 0.5, '#222', { strokeWidth: 3, layer: 3 }));
  // Minute hand
  const minAngle = rng.nextFloat(0, 360) * Math.PI / 180;
  children.push(createLine(x, y, x + Math.cos(minAngle) * s * 0.7, y + Math.sin(minAngle) * s * 0.7, '#333', { strokeWidth: 2, layer: 3 }));
  // Center dot
  children.push(createCircle(x, y, s * 0.06, '#222', { layer: 3 }));
  // Mounting bracket
  children.push(createRect(x - s * 0.06, y + s, s * 0.12, s * 0.3, '#555', { layer: 2 }));
  return createGroup(x, y, children, { layer: 3, category: 'clock', modifiable: true, id: uid('clock'), filter: 'url(#shadow)' });
}

function ticketBooth(x: number, y: number, w2: number, h2: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const boothColor = rng.pick(['#8B6914', '#A0784C', '#6B4226']);
  // Main structure
  children.push(createRect(x, y, w2, h2, boothColor, { layer: 2, stroke: '#4A2810', strokeWidth: 1.5 }));
  // Counter
  children.push(createRect(x, y + h2 * 0.55, w2, h2 * 0.05, '#5C3317', { layer: 2 }));
  // Window
  children.push(createRect(x + w2 * 0.15, y + h2 * 0.1, w2 * 0.7, h2 * 0.4, '#87CEEB', { layer: 2, stroke: '#666', strokeWidth: 0.8 }));
  // Window divider
  children.push(createLine(x + w2 * 0.5, y + h2 * 0.1, x + w2 * 0.5, y + h2 * 0.5, '#666', { strokeWidth: 1, layer: 2 }));
  // Sign above
  children.push(createRect(x - 5, y - 20, w2 + 10, 20, '#333', { layer: 2 }));
  children.push(createText(x + 5, y - 5, rng.pick(['TICKETS', 'BILLETS']), '#FFD700', { layer: 2, fontSize: 10, category: 'text' }));
  // Small roof
  children.push(createRect(x - 8, y - 22, w2 + 16, 4, '#555', { layer: 2 }));
  return createGroup(x, y, children, { layer: 2, category: 'booth', modifiable: true, id: uid('booth'), filter: 'url(#shadow)' });
}

function vendingMachine(x: number, y: number, w2: number, h2: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const machineColor = rng.pick(['#CC3333', '#2255BB', '#228822']);
  // Body
  children.push(createRect(x, y, w2, h2, machineColor, { layer: 3, stroke: '#222', strokeWidth: 1 }));
  // Display window
  children.push(createRect(x + w2 * 0.1, y + h2 * 0.05, w2 * 0.8, h2 * 0.5, '#E8E0D0', { layer: 3, stroke: '#444', strokeWidth: 0.5 }));
  // Product rows
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const ix = x + w2 * 0.15 + col * w2 * 0.22;
      const iy = y + h2 * 0.08 + row * h2 * 0.15;
      children.push(createRect(ix, iy, w2 * 0.15, h2 * 0.1, rng.pick(['#FF4444', '#4488FF', '#44CC44', '#FFAA00', '#CC44CC']), { layer: 3, opacity: 0.8 }));
    }
  }
  // Payment panel
  children.push(createRect(x + w2 * 0.3, y + h2 * 0.58, w2 * 0.4, h2 * 0.15, '#222', { layer: 3 }));
  // Coin slot
  children.push(createRect(x + w2 * 0.42, y + h2 * 0.62, w2 * 0.05, h2 * 0.06, '#555', { layer: 3 }));
  // Dispensing slot
  children.push(createRect(x + w2 * 0.15, y + h2 * 0.78, w2 * 0.7, h2 * 0.15, '#1A1A1A', { layer: 3 }));
  return createGroup(x, y, children, { layer: 3, category: 'vending', modifiable: true, id: uid('vend'), filter: 'url(#shadow)' });
}

function luggage(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const color = rng.pick(['#5C3317', '#AA3333', '#2255BB', '#333', '#448844', '#CC7700']);
  // Suitcase body
  children.push(createRect(x, y - s * 0.7, s * 0.5, s * 0.7, color, { layer: 3, stroke: '#333', strokeWidth: 1 }));
  // Handle
  children.push(createRect(x + s * 0.18, y - s * 0.78, s * 0.14, s * 0.08, '#555', { layer: 3 }));
  // Strap / band
  children.push(createLine(x, y - s * 0.35, x + s * 0.5, y - s * 0.35, '#444', { strokeWidth: 2, layer: 3, opacity: 0.5 }));
  // Clasps
  children.push(createRect(x + s * 0.12, y - s * 0.37, s * 0.04, s * 0.04, '#888', { layer: 3 }));
  children.push(createRect(x + s * 0.34, y - s * 0.37, s * 0.04, s * 0.04, '#888', { layer: 3 }));
  // Wheels
  children.push(createCircle(x + s * 0.08, y, s * 0.04, '#333', { layer: 3 }));
  children.push(createCircle(x + s * 0.42, y, s * 0.04, '#333', { layer: 3 }));
  return createGroup(x, y, children, { layer: 3, category: 'luggage', modifiable: true, id: uid('lug') });
}

function stationSign(x: number, y: number, w2: number, text: string): SVGElementData {
  const children: SVGElementData[] = [];
  children.push(createRect(x, y, w2, 30, '#1A1A4A', { layer: 3, stroke: '#333', strokeWidth: 1.5 }));
  children.push(createRect(x + 3, y + 3, w2 - 6, 24, '#2A2A5A', { layer: 3 }));
  children.push(createText(x + 10, y + 21, text, '#FFD700', { layer: 3, fontSize: 14, category: 'text' }));
  return createGroup(x, y, children, { layer: 3, category: 'sign', modifiable: true, id: uid('ssign') });
}

// ══════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ══════════════════════════════════════════════════════════════

export function generateTrainStation(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  const skyTop = rng.pick(['#4A90D9', '#5090D0', '#6090C0']);
  const skyMid = rng.pick(['#7AB8E0', '#80BEE5', '#90C4E8']);
  const skyBot = rng.pick(['#B0D4F1', '#C0DDEE', '#CCE0F0']);

  const defs = combineDefs(
    outdoorDefs(),
    skyGradient('skyGrad', skyTop, skyMid, skyBot),
    linearGradient('platformGrad', [
      { offset: '0%', color: '#C0B0A0' },
      { offset: '100%', color: '#A09080' },
    ]),
    linearGradient('trackGrad', [
      { offset: '0%', color: '#555' },
      { offset: '50%', color: '#666' },
      { offset: '100%', color: '#555' },
    ]),
    linearGradient('roofGrad', [
      { offset: '0%', color: '#778899' },
      { offset: '100%', color: '#5A6A7A' },
    ]),
    radialGradient('clockGlow', [
      { offset: '0%', color: '#FFFFF0', opacity: 0.3 },
      { offset: '100%', color: '#FFFFF0', opacity: 0 },
    ]),
  );

  // ════════════════════════════════════════════
  //  LAYER 0 -- Sky
  // ════════════════════════════════════════════
  elements.push(createRect(0, 0, w, h * 0.3, 'url(#skyGrad)', { layer: 0, category: 'sky', modifiable: false }));

  // Clouds
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(detailedCloud(rng.nextFloat(20, w - 80), rng.nextFloat(10, h * 0.12), rng.nextFloat(35, 65), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 1 -- Station roof structure
  // ════════════════════════════════════════════
  const roofY = h * 0.12;
  const roofH = h * 0.2;
  // Main roof - arched canopy
  elements.push(createPath(0, 0, `M0,${roofY + roofH} Q${w * 0.5},${roofY - roofH * 0.3} ${w},${roofY + roofH}`, 'url(#roofGrad)', {
    layer: 1, category: 'roof', modifiable: false, stroke: '#4A5A6A', strokeWidth: 2,
  }));
  // Roof underside shadow
  elements.push(createPath(0, 0, `M0,${roofY + roofH} Q${w * 0.5},${roofY + roofH * 0.3} ${w},${roofY + roofH}`, 'none', {
    layer: 1, stroke: '#3A4A5A', strokeWidth: 1, opacity: 0.4, modifiable: false,
  }));
  // Support pillars
  const pillarCount = 6;
  for (let i = 0; i < pillarCount; i++) {
    const px = w * (i + 0.5) / pillarCount;
    const pillarTop = roofY + roofH - 5;
    elements.push(createRect(px - 5, pillarTop, 10, h * 0.48 - pillarTop, '#888', { layer: 1, category: 'pillar', modifiable: false, stroke: '#777', strokeWidth: 0.5 }));
    // Decorative top
    elements.push(createRect(px - 8, pillarTop - 3, 16, 6, '#999', { layer: 1, modifiable: false }));
  }

  // ════════════════════════════════════════════
  //  LAYER 1 -- Platform
  // ════════════════════════════════════════════
  const platformY = h * 0.48;
  elements.push(createRect(0, platformY, w, h * 0.14, 'url(#platformGrad)', { layer: 1, category: 'platform', modifiable: false }));
  // Platform edge line (yellow safety line)
  elements.push(createRect(0, platformY + h * 0.12, w, 3, '#FFD700', { layer: 1, category: 'line', modifiable: false, opacity: 0.8 }));
  // Platform texture
  for (let i = 0; i < 15; i++) {
    elements.push(createLine(i * (w / 15), platformY, i * (w / 15), platformY + h * 0.14, '#9A8A7A', { strokeWidth: 0.5, layer: 1, opacity: 0.2 }));
  }

  // ════════════════════════════════════════════
  //  LAYER 1 -- Tracks
  // ════════════════════════════════════════════
  const trackY = platformY + h * 0.15;
  // Rail bed (gravel)
  elements.push(createRect(0, trackY, w, h * 0.08, '#706050', { layer: 1, category: 'track', modifiable: false }));
  // Rails
  elements.push(createLine(0, trackY + 8, w, trackY + 8, '#888', { strokeWidth: 3, layer: 1, category: 'track', modifiable: false }));
  elements.push(createLine(0, trackY + h * 0.06, w, trackY + h * 0.06, '#888', { strokeWidth: 3, layer: 1, category: 'track', modifiable: false }));
  // Ties / sleepers
  for (let i = 0; i < 30; i++) {
    const tx = i * (w / 30) + rng.nextFloat(-2, 2);
    elements.push(createRect(tx, trackY + 4, 4, h * 0.06, '#5C3317', { layer: 1, opacity: 0.7, modifiable: false }));
  }

  // Second track
  const track2Y = trackY + h * 0.1;
  elements.push(createRect(0, track2Y, w, h * 0.08, '#706050', { layer: 1, category: 'track', modifiable: false }));
  elements.push(createLine(0, track2Y + 8, w, track2Y + 8, '#888', { strokeWidth: 3, layer: 1, modifiable: false }));
  elements.push(createLine(0, track2Y + h * 0.06, w, track2Y + h * 0.06, '#888', { strokeWidth: 3, layer: 1, modifiable: false }));
  for (let i = 0; i < 30; i++) {
    const tx = i * (w / 30) + rng.nextFloat(-2, 2);
    elements.push(createRect(tx, track2Y + 4, 4, h * 0.06, '#5C3317', { layer: 1, opacity: 0.7, modifiable: false }));
  }

  // Far platform
  elements.push(createRect(0, track2Y + h * 0.08, w, h * 0.08, '#B0A090', { layer: 1, category: 'platform', modifiable: false }));

  // ════════════════════════════════════════════
  //  LAYER 2 -- Train on tracks
  // ════════════════════════════════════════════
  const trainY = trackY + h * 0.05;
  elements.push(trainLocomotive(50, trainY, 70, rng));
  elements.push(trainCar(185, trainY, 70, rng));
  elements.push(trainCar(265, trainY, 70, rng));
  elements.push(trainCar(345, trainY, 70, rng));

  // ════════════════════════════════════════════
  //  LAYER 3 -- Platform furniture & items
  // ════════════════════════════════════════════

  // Benches on platform
  elements.push(detailedBench(w * 0.15, platformY + h * 0.08, 50, rng));
  elements.push(detailedBench(w * 0.55, platformY + h * 0.08, 50, rng));

  // Station clock
  elements.push(stationClock(w * 0.5, h * 0.2, 25, rng));

  // Ticket booth
  elements.push(ticketBooth(w * 0.82, platformY - 60, 50, 60, rng));

  // Station lamps on platform
  elements.push(detailedLamp(w * 0.25, platformY - 5, 50, rng));
  elements.push(detailedLamp(w * 0.7, platformY - 5, 50, rng));

  // Vending machine
  elements.push(vendingMachine(w * 0.92, platformY - 55, 30, 55, rng));

  // Station name sign
  const stationName = rng.pick(['CENTRAL', 'MAIN ST', 'NORTH', 'UNION', 'PARK']);
  elements.push(stationSign(w * 0.32, h * 0.14, 140, stationName));

  // ════════════════════════════════════════════
  //  LAYER 3 -- People waiting on platform
  // ════════════════════════════════════════════
  const personPositions = [
    { x: w * 0.1, y: platformY + h * 0.06 },
    { x: w * 0.28, y: platformY + h * 0.07 },
    { x: w * 0.42, y: platformY + h * 0.05 },
    { x: w * 0.6, y: platformY + h * 0.06 },
    { x: w * 0.75, y: platformY + h * 0.07 },
  ];
  for (const pos of personPositions) {
    if (rng.chance(0.8)) {
      elements.push(detailedPerson(pos.x, pos.y, rng.nextFloat(50, 68), rng));
    }
  }

  // ════════════════════════════════════════════
  //  LAYER 3 -- Luggage
  // ════════════════════════════════════════════
  elements.push(luggage(w * 0.12, platformY + h * 0.1, 22, rng));
  elements.push(luggage(w * 0.44, platformY + h * 0.1, 20, rng));
  elements.push(luggage(w * 0.62, platformY + h * 0.09, 24, rng));

  // ════════════════════════════════════════════
  //  LAYER 4 -- Birds & details
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    elements.push(detailedBird(rng.nextFloat(50, w - 50), rng.nextFloat(10, h * 0.1), true, rng));
  }

  // Departure board
  const boardX = w * 0.02;
  const boardY = h * 0.24;
  elements.push(createRect(boardX, boardY, 110, 50, '#1A1A1A', { layer: 3, category: 'board', modifiable: true, id: uid('board'), stroke: '#333', strokeWidth: 1.5 }));
  elements.push(createText(boardX + 5, boardY + 14, 'DEPARTURES', '#00FF00', { layer: 3, fontSize: 8, category: 'text', modifiable: false }));
  for (let i = 0; i < 3; i++) {
    const time = `${rng.nextInt(6, 23)}:${rng.nextInt(0, 5)}${rng.nextInt(0, 9)}`;
    const dest = rng.pick(['LONDON', 'PARIS', 'TOKYO', 'ROME', 'BERLIN']);
    elements.push(createText(boardX + 5, boardY + 26 + i * 10, `${time}  ${dest}`, '#CCFF00', { layer: 3, fontSize: 7, category: 'text', modifiable: true, id: uid('dep') }));
  }

  return { elements, defs };
}
