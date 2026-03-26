import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath,
  createLine, createGroup, createText,
} from '../engine/primitives';
import {
  combineDefs, nightDefs, fantasyDefs, linearGradient, radialGradient,
  starfieldPattern,
} from './svg-effects';
import { detailedStar, resetComponentId } from './svg-components';

let _uid = 0;
function uid(p = 'ss') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// Station module
function stationModule(x: number, y: number, w2: number, h2: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  children.push(createRect(x, y, w2, h2, 'url(#panelGrad)', { layer: 2, stroke: '#4A6A8A', strokeWidth: 1.5 }));
  const panels = rng.nextInt(3, 5);
  for (let i = 1; i < panels; i++) {
    children.push(createLine(x + i * (w2 / panels), y, x + i * (w2 / panels), y + h2, '#3A5A7A', { strokeWidth: 0.8, layer: 2, opacity: 0.5 }));
  }
  children.push(createLine(x, y + h2 / 2, x + w2, y + h2 / 2, '#3A5A7A', { strokeWidth: 0.5, layer: 2, opacity: 0.4 }));
  return createGroup(x, y, children, { layer: 2, category: 'station', modifiable: false });
}

// Solar panel array
function solarPanel(x: number, y: number, w2: number, h2: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  children.push(createRect(x, y, w2, h2, '#1A2A4A', { layer: 2, stroke: '#3A5A7A', strokeWidth: 1 }));
  const cols = Math.floor(w2 / 8);
  const rows = Math.floor(h2 / 6);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx2 = x + 2 + c * (w2 / cols);
      const cy2 = y + 2 + r * (h2 / rows);
      children.push(createRect(cx2, cy2, (w2 / cols) - 2, (h2 / rows) - 2, rng.chance(0.5) ? '#1B3F6F' : '#1A3565', { layer: 2, opacity: rng.nextFloat(0.7, 0.95) }));
    }
  }
  return createGroup(x, y, children, { layer: 2, category: 'solar', modifiable: true, id: uid('solar'), filter: 'url(#shadow)' });
}

// Satellite
function satellite(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  children.push(createRect(x - s * 0.15, y - s * 0.1, s * 0.3, s * 0.2, '#8899AA', { layer: 3, stroke: '#667788', strokeWidth: 0.8 }));
  children.push(createRect(x - s * 0.5, y - s * 0.06, s * 0.3, s * 0.12, '#1A3565', { layer: 3, stroke: '#3A5A7A', strokeWidth: 0.5 }));
  children.push(createRect(x + s * 0.2, y - s * 0.06, s * 0.3, s * 0.12, '#1A3565', { layer: 3, stroke: '#3A5A7A', strokeWidth: 0.5 }));
  children.push(createLine(x, y - s * 0.1, x, y - s * 0.25, '#AABBCC', { strokeWidth: 0.8, layer: 3 }));
  children.push(createCircle(x, y - s * 0.27, s * 0.03, '#CCDDEE', { layer: 3 }));
  children.push(createCircle(x + s * 0.1, y - s * 0.1, s * 0.02, '#FF3333', { layer: 3, opacity: 0.9 }));
  return createGroup(x, y, children, { layer: 3, category: 'satellite', modifiable: true, id: uid('sat'), filter: 'url(#shadow)' });
}

// Astronaut
function astronaut(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  children.push(createCircle(x, y - s * 0.35, s * 0.18, '#EEEEFF', { layer: 3, stroke: '#AABBCC', strokeWidth: 1 }));
  children.push(createCircle(x, y - s * 0.35, s * 0.12, '#224466', { layer: 3, opacity: 0.8 }));
  children.push(createCircle(x - s * 0.04, y - s * 0.38, s * 0.04, '#6699CC', { layer: 3, opacity: 0.5 }));
  children.push(createRect(x - s * 0.14, y - s * 0.18, s * 0.28, s * 0.3, '#EEEEFF', { layer: 3, stroke: '#AABBCC', strokeWidth: 0.8 }));
  children.push(createRect(x + s * 0.14, y - s * 0.16, s * 0.1, s * 0.25, '#CCCCDD', { layer: 3 }));
  children.push(createLine(x - s * 0.14, y - s * 0.12, x - s * 0.28, y - s * 0.02, '#EEEEFF', { strokeWidth: s * 0.06, layer: 3 }));
  children.push(createLine(x + s * 0.14, y - s * 0.12, x + s * 0.28, y - s * 0.22, '#EEEEFF', { strokeWidth: s * 0.06, layer: 3 }));
  children.push(createLine(x - s * 0.06, y + s * 0.12, x - s * 0.1, y + s * 0.3, '#EEEEFF', { strokeWidth: s * 0.06, layer: 3 }));
  children.push(createLine(x + s * 0.06, y + s * 0.12, x + s * 0.1, y + s * 0.28, '#EEEEFF', { strokeWidth: s * 0.06, layer: 3 }));
  children.push(createPath(x, y, `M${x + s * 0.24},${y - s * 0.16} Q${x + s * 0.5},${y - s * 0.3} ${x + s * 0.6},${y - s * 0.5}`, 'none', { stroke: '#FFDD44', strokeWidth: 1, layer: 3, opacity: 0.7 }));
  return createGroup(x, y, children, { layer: 3, category: 'astronaut', modifiable: true, id: uid('astro'), filter: 'url(#glow)' });
}

// Supply capsule
function supplyCapsule(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  children.push(createRect(x - s * 0.12, y - s * 0.25, s * 0.24, s * 0.5, '#AAB0B8', { layer: 3, stroke: '#778899', strokeWidth: 1 }));
  children.push(createPath(x, y, `M${x - s * 0.12},${y - s * 0.25} L${x},${y - s * 0.4} L${x + s * 0.12},${y - s * 0.25} Z`, '#8899AA', { layer: 3 }));
  children.push(createRect(x - s * 0.08, y + s * 0.25, s * 0.16, s * 0.06, '#556677', { layer: 3 }));
  children.push(createPath(x, y, `M${x - s * 0.06},${y + s * 0.31} L${x},${y + s * 0.48} L${x + s * 0.06},${y + s * 0.31}`, '#FF8800', { layer: 3, opacity: 0.6 }));
  children.push(createPath(x, y, `M${x - s * 0.03},${y + s * 0.31} L${x},${y + s * 0.42} L${x + s * 0.03},${y + s * 0.31}`, '#FFDD44', { layer: 3, opacity: 0.5 }));
  children.push(createRect(x - s * 0.16, y - s * 0.1, s * 0.04, s * 0.12, '#1A3565', { layer: 3 }));
  children.push(createRect(x + s * 0.12, y - s * 0.1, s * 0.04, s * 0.12, '#1A3565', { layer: 3 }));
  return createGroup(x, y, children, { layer: 3, category: 'capsule', modifiable: true, id: uid('cap'), filter: 'url(#shadow)' });
}

export function generateSpaceStation(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  const nebulaHue1 = rng.nextInt(260, 320);
  const nebulaHue2 = rng.nextInt(180, 260);
  const stationName = rng.pick(['ISS-2', 'ORION-7', 'ATLAS-3', 'NOVA-1', 'KEPLER-5']);

  // === SVG Defs (combined nightDefs + fantasyDefs + custom) ===
  const defs = combineDefs(
    nightDefs(),
    fantasyDefs(),
    linearGradient('spaceGrad', [
      { offset: '0%', color: '#020010' },
      { offset: '30%', color: '#050520' },
      { offset: '60%', color: '#080830' },
      { offset: '100%', color: '#0A0A3A' },
    ]),
    radialGradient('nebulaGrad1', [
      { offset: '0%', color: `hsl(${nebulaHue1}, 60%, 50%)`, opacity: 0.08 },
      { offset: '60%', color: `hsl(${nebulaHue1}, 50%, 40%)`, opacity: 0.03 },
      { offset: '100%', color: `hsl(${nebulaHue1}, 40%, 30%)`, opacity: 0 },
    ], '30%', '40%', '50%'),
    radialGradient('nebulaGrad2', [
      { offset: '0%', color: `hsl(${nebulaHue2}, 50%, 55%)`, opacity: 0.06 },
      { offset: '70%', color: `hsl(${nebulaHue2}, 40%, 40%)`, opacity: 0.02 },
      { offset: '100%', color: `hsl(${nebulaHue2}, 30%, 30%)`, opacity: 0 },
    ], '70%', '60%', '45%'),
    linearGradient('panelGrad', [
      { offset: '0%', color: '#6A7A8A' },
      { offset: '50%', color: '#4A5A6A' },
      { offset: '100%', color: '#3A4A5A' },
    ]),
    radialGradient('windowGlow', [
      { offset: '0%', color: '#00FFFF', opacity: 0.9 },
      { offset: '60%', color: '#00CCDD', opacity: 0.5 },
      { offset: '100%', color: '#009999', opacity: 0 },
    ]),
    radialGradient('earthGrad', [
      { offset: '0%', color: '#4488CC' },
      { offset: '30%', color: '#2266AA' },
      { offset: '60%', color: '#225588' },
      { offset: '100%', color: '#113355' },
    ], '40%', '40%', '55%'),
    radialGradient('sunFlare', [
      { offset: '0%', color: '#FFFFEE', opacity: 0.25 },
      { offset: '40%', color: '#FFEE88', opacity: 0.08 },
      { offset: '100%', color: '#FFDD44', opacity: 0 },
    ], '0%', '50%', '70%'),
    starfieldPattern('stars'),
  );

  // ════════════════════════════════════════════
  //  LAYER 0 — Deep space background
  // ════════════════════════════════════════════

  elements.push(createRect(0, 0, w, h, 'url(#spaceGrad)', { layer: 0, category: 'space', modifiable: false }));

  // Nebula clouds
  elements.push(createCircle(w * 0.3, h * 0.4, w * 0.45, 'url(#nebulaGrad1)', { layer: 0, category: 'nebula', modifiable: false }));
  elements.push(createCircle(w * 0.7, h * 0.6, w * 0.4, 'url(#nebulaGrad2)', { layer: 0, category: 'nebula', modifiable: false }));
  if (rng.chance(0.6)) {
    const nHue = rng.nextInt(150, 200);
    elements.push(createEllipse(w * rng.nextFloat(0.2, 0.8), h * rng.nextFloat(0.1, 0.5), w * 0.3, h * 0.15, `hsla(${nHue}, 40%, 50%, 0.04)`, { layer: 0, category: 'nebula', modifiable: false }));
  }

  // Starfield (60-100 stars)
  for (let i = 0; i < rng.nextInt(60, 100); i++) {
    elements.push(createCircle(rng.nextFloat(0, w), rng.nextFloat(0, h), rng.nextFloat(0.3, 2.0), rng.pick(['#FFFFFF', '#FFFDE0', '#E0E8FF', '#FFE8D0', '#D0E8FF']), {
      layer: 0, category: 'star', modifiable: false, opacity: rng.nextFloat(0.3, 1.0),
    }));
  }

  // Accent stars with cross rays
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    const sx = rng.nextFloat(20, w - 20);
    const sy = rng.nextFloat(10, h - 10);
    const sr = rng.nextFloat(1.5, 3);
    const rayLen = sr * rng.nextFloat(3, 6);
    elements.push(createCircle(sx, sy, sr, '#FFFFFF', { layer: 0, opacity: 0.9 }));
    elements.push(createLine(sx - rayLen, sy, sx + rayLen, sy, '#FFFFFF', { strokeWidth: 0.5, layer: 0, opacity: 0.4 }));
    elements.push(createLine(sx, sy - rayLen, sx, sy + rayLen, '#FFFFFF', { strokeWidth: 0.5, layer: 0, opacity: 0.4 }));
  }

  // ════════════════════════════════════════════
  //  LAYER 1 — Planet
  // ════════════════════════════════════════════

  const planetSide = rng.pick(['bottomLeft', 'bottomRight'] as const);
  const planetR = rng.nextFloat(w * 0.25, w * 0.35);
  const planetX = planetSide === 'bottomLeft' ? rng.nextFloat(-planetR * 0.3, w * 0.25) : rng.nextFloat(w * 0.75, w + planetR * 0.3);
  const planetY = rng.nextFloat(h * 0.65, h + planetR * 0.2);
  const isAlien = rng.chance(0.3);

  // Atmosphere glow
  elements.push(createCircle(planetX, planetY, planetR * 1.12, isAlien ? '#44AA66' : '#4488CC', { layer: 1, opacity: 0.08, filter: 'url(#bgBlur)' }));
  elements.push(createCircle(planetX, planetY, planetR * 1.06, isAlien ? '#55BB77' : '#5599DD', { layer: 1, opacity: 0.12, filter: 'url(#bgBlur)' }));

  // Planet body
  elements.push(createCircle(planetX, planetY, planetR, isAlien ? '#336644' : 'url(#earthGrad)', { layer: 1, category: 'planet', modifiable: true, id: uid('planet') }));

  // Continents
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const angle = rng.nextFloat(0, Math.PI * 2);
    const dist = rng.nextFloat(0, planetR * 0.6);
    const cx = planetX + Math.cos(angle) * dist;
    const cy = planetY + Math.sin(angle) * dist;
    const cs = rng.nextFloat(planetR * 0.1, planetR * 0.25);
    const cc = isAlien ? rng.pick(['#AA4466', '#884488', '#CC6633']) : rng.pick(['#2D8B4E', '#3A7D44', '#228B22']);
    const cPath = `M${cx - cs},${cy} Q${cx - cs * 0.5},${cy - cs * 0.8} ${cx + cs * 0.3},${cy - cs * 0.5} Q${cx + cs},${cy - cs * 0.2} ${cx + cs * 0.8},${cy + cs * 0.3} Q${cx + cs * 0.3},${cy + cs * 0.7} ${cx - cs * 0.2},${cy + cs * 0.5} Q${cx - cs * 0.8},${cy + cs * 0.3} ${cx - cs},${cy} Z`;
    elements.push(createPath(cx, cy, cPath, cc, { layer: 1, opacity: 0.6 }));
  }

  // Cloud wisps
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const angle = rng.nextFloat(0, Math.PI * 2);
    const dist = rng.nextFloat(planetR * 0.1, planetR * 0.6);
    elements.push(createEllipse(planetX + Math.cos(angle) * dist, planetY + Math.sin(angle) * dist, rng.nextFloat(planetR * 0.08, planetR * 0.2), rng.nextFloat(planetR * 0.03, planetR * 0.06), '#FFFFFF', { layer: 1, opacity: 0.15 }));
  }

  // ════════════════════════════════════════════
  //  LAYER 1 — Lens flare from sun
  // ════════════════════════════════════════════

  const flareSide = planetSide === 'bottomLeft' ? 'right' : 'left';
  const flareX = flareSide === 'left' ? -w * 0.1 : w * 1.1;
  const flareY = rng.nextFloat(h * 0.2, h * 0.5);
  elements.push(createCircle(flareX, flareY, w * 0.3, 'url(#sunFlare)', { layer: 1, category: 'flare', modifiable: false }));
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const t = (i + 1) * 0.2;
    elements.push(createCircle(flareX + (w / 2 - flareX) * t, flareY + (h / 2 - flareY) * t, rng.nextFloat(3, 10), '#FFEE88', { layer: 1, opacity: rng.nextFloat(0.05, 0.12) }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Space Station structure
  // ════════════════════════════════════════════

  const stationCX = w * rng.nextFloat(0.38, 0.62);
  const stationCY = h * rng.nextFloat(0.32, 0.48);

  // Main habitat module
  const habW = w * 0.22;
  const habH = h * 0.1;
  const habX = stationCX - habW / 2;
  const habY = stationCY - habH / 2;
  elements.push(stationModule(habX, habY, habW, habH, rng));
  elements.push(createCircle(habX, stationCY, habH / 2, '#5A6A7A', { layer: 2, stroke: '#4A6A8A', strokeWidth: 1 }));
  elements.push(createCircle(habX + habW, stationCY, habH / 2, '#5A6A7A', { layer: 2, stroke: '#4A6A8A', strokeWidth: 1 }));

  // Secondary module (vertical)
  const secW = w * 0.06;
  const secH = h * 0.18;
  const secX = stationCX - secW / 2;
  const secY = stationCY - secH / 2;
  elements.push(stationModule(secX, secY, secW, secH, rng));

  // Module connectors
  const connSize = Math.min(secW, habH) * 0.4;
  elements.push(createRect(stationCX - connSize / 2, habY - connSize * 0.5, connSize, connSize, '#7A8A9A', { layer: 2, stroke: '#5A6A7A', strokeWidth: 1 }));
  elements.push(createRect(stationCX - connSize / 2, habY + habH - connSize * 0.5, connSize, connSize, '#7A8A9A', { layer: 2, stroke: '#5A6A7A', strokeWidth: 1 }));

  // Solar Panel Arrays
  const panelW = w * 0.14;
  const panelH = h * 0.06;

  // Left truss + panels
  const leftTrussX2 = habX - panelW - w * 0.04;
  elements.push(createLine(habX, stationCY, leftTrussX2 + panelW, stationCY, '#6A7A8A', { strokeWidth: 3, layer: 2 }));
  for (let i = 0; i < 5; i++) {
    const tx = leftTrussX2 + panelW + i * ((habX - leftTrussX2 - panelW) / 5);
    elements.push(createLine(tx, stationCY - 3, tx + 6, stationCY + 3, '#5A6A7A', { strokeWidth: 0.8, layer: 2, opacity: 0.6 }));
  }
  elements.push(solarPanel(leftTrussX2, stationCY - panelH - 4, panelW, panelH, rng));
  elements.push(solarPanel(leftTrussX2, stationCY + 4, panelW, panelH, rng));

  // Right truss + panels
  const rightTrussX2 = habX + habW + w * 0.04;
  elements.push(createLine(habX + habW, stationCY, rightTrussX2, stationCY, '#6A7A8A', { strokeWidth: 3, layer: 2 }));
  for (let i = 0; i < 5; i++) {
    const tx = habX + habW + i * ((rightTrussX2 - habX - habW) / 5);
    elements.push(createLine(tx, stationCY - 3, tx + 6, stationCY + 3, '#5A6A7A', { strokeWidth: 0.8, layer: 2, opacity: 0.6 }));
  }
  elements.push(solarPanel(rightTrussX2, stationCY - panelH - 4, panelW, panelH, rng));
  elements.push(solarPanel(rightTrussX2, stationCY + 4, panelW, panelH, rng));

  // Observation Windows
  const windowCount = rng.nextInt(5, 7);
  const windowSpacing = habW / (windowCount + 1);
  for (let i = 0; i < windowCount; i++) {
    const wx = habX + windowSpacing * (i + 1);
    const wr = rng.nextFloat(3, 5);
    elements.push(createCircle(wx, stationCY, wr * 2.5, 'url(#windowGlow)', { layer: 2, opacity: 0.5 }));
    elements.push(createCircle(wx, stationCY, wr, '#00DDEE', { layer: 2, category: 'window', modifiable: true, stroke: '#4A6A8A', strokeWidth: 1, id: uid('win') }));
    elements.push(createCircle(wx - wr * 0.25, stationCY - wr * 0.25, wr * 0.3, '#AAFFFF', { layer: 2, opacity: 0.5 }));
  }

  // Antenna dish
  elements.push(createLine(stationCX, secY, stationCX, secY - h * 0.08, '#8899AA', { strokeWidth: 2, layer: 2 }));
  const dishR = w * 0.025;
  const dishPath = `M${stationCX - dishR},${secY - h * 0.08} Q${stationCX},${secY - h * 0.08 - dishR * 1.2} ${stationCX + dishR},${secY - h * 0.08}`;
  elements.push(createPath(stationCX, secY, dishPath, '#AABBCC', { layer: 2, category: 'antenna', modifiable: true, stroke: '#8899AA', strokeWidth: 1, id: uid('dish') }));
  elements.push(createCircle(stationCX, secY - h * 0.08 - dishR * 0.3, dishR * 0.2, '#CCDDEE', { layer: 2 }));

  // Communication signals
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const sigR = dishR * (2.5 + i * 1.8);
    const sigY = secY - h * 0.08 - dishR * 0.3;
    elements.push(createPath(stationCX, sigY, `M${stationCX - sigR * 0.7},${sigY - sigR * 0.7} A${sigR},${sigR} 0 0,1 ${stationCX + sigR * 0.7},${sigY - sigR * 0.7}`, 'none', {
      stroke: '#44DDFF', strokeWidth: 0.8, layer: 3, opacity: 0.3 - i * 0.06,
    }));
  }

  // Docking port
  const dockY = secY + secH;
  elements.push(createRect(stationCX - w * 0.015, dockY, w * 0.03, h * 0.03, '#6A7A8A', { layer: 2, stroke: '#4A5A6A', strokeWidth: 1 }));
  elements.push(createCircle(stationCX, dockY + h * 0.03, w * 0.02, 'none', { layer: 2, stroke: '#8899AA', strokeWidth: 1.5 }));

  // Warning lights
  const warningPositions = [
    { x: habX + habW * 0.05, y: habY - 2 },
    { x: habX + habW * 0.95, y: habY - 2 },
    { x: stationCX, y: secY - 2 },
    { x: leftTrussX2 + panelW / 2, y: stationCY - panelH - 6 },
    { x: rightTrussX2 + panelW / 2, y: stationCY - panelH - 6 },
  ];
  for (const pos of warningPositions) {
    elements.push(createCircle(pos.x, pos.y, 2, '#FF2222', { layer: 3, category: 'light', modifiable: true, opacity: rng.nextFloat(0.6, 1.0), id: uid('warn') }));
  }

  // Station name text
  elements.push(createText(habX + habW * 0.3, stationCY + habH * 0.15, stationName, '#AACCEE', {
    layer: 3, category: 'text', modifiable: true, id: uid('name'), fontSize: Math.max(7, habH * 0.22),
  }));

  // ════════════════════════════════════════════
  //  LAYER 3 — Orbiting satellite
  // ════════════════════════════════════════════

  elements.push(satellite(rng.nextFloat(w * 0.05, w * 0.25), rng.nextFloat(h * 0.08, h * 0.3), rng.nextFloat(25, 40), rng));

  // ════════════════════════════════════════════
  //  LAYER 3 — Space debris / asteroids
  // ════════════════════════════════════════════

  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const dx = rng.nextFloat(10, w - 10);
    const dy = rng.nextFloat(10, h - 10);
    const ds = rng.nextFloat(3, 10);
    const debrisColor = rng.pick(['#554433', '#665544', '#776655', '#887766']);
    const aPath = `M${dx - ds},${dy + ds * 0.2} Q${dx - ds * 0.8},${dy - ds * 0.6} ${dx - ds * 0.2},${dy - ds} Q${dx + ds * 0.5},${dy - ds * 0.8} ${dx + ds},${dy - ds * 0.1} Q${dx + ds * 0.7},${dy + ds * 0.6} ${dx + ds * 0.1},${dy + ds * 0.8} Q${dx - ds * 0.4},${dy + ds * 0.7} ${dx - ds},${dy + ds * 0.2} Z`;
    elements.push(createPath(dx, dy, aPath, debrisColor, { layer: 3, category: 'debris', modifiable: true, opacity: rng.nextFloat(0.5, 0.8), id: uid('debris') }));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Comet (optional)
  // ════════════════════════════════════════════

  if (rng.chance(0.65)) {
    const cometStartX = rng.nextFloat(w * 0.1, w * 0.5);
    const cometStartY = rng.nextFloat(0, h * 0.2);
    const cometAngle = rng.nextFloat(0.3, 0.8);
    const cometLen = rng.nextFloat(w * 0.08, w * 0.15);
    const cometEndX = cometStartX + Math.cos(cometAngle) * cometLen;
    const cometEndY = cometStartY + Math.sin(cometAngle) * cometLen;
    const tailPath = `M${cometEndX},${cometEndY} L${cometStartX + (cometEndX - cometStartX) * 0.1 + 3},${cometStartY + (cometEndY - cometStartY) * 0.1 - 1} L${cometStartX},${cometStartY} L${cometStartX + (cometEndX - cometStartX) * 0.1 - 3},${cometStartY + (cometEndY - cometStartY) * 0.1 + 1} Z`;
    elements.push(createPath(cometStartX, cometStartY, tailPath, '#FFFFCC', { layer: 3, opacity: 0.15 }));
    elements.push(createCircle(cometStartX, cometStartY, 2.5, '#FFFFEE', { layer: 3, category: 'comet', modifiable: true, opacity: 0.9, id: uid('comet'), filter: 'url(#warmGlow)' }));
    elements.push(createCircle(cometStartX, cometStartY, 5, '#FFFFCC', { layer: 3, opacity: 0.2 }));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Astronaut (optional)
  // ════════════════════════════════════════════

  if (rng.chance(0.55)) {
    elements.push(astronaut(
      stationCX + rng.nextFloat(w * 0.08, w * 0.15) * rng.pick([-1, 1]),
      stationCY + rng.nextFloat(-h * 0.12, -h * 0.04),
      rng.nextFloat(28, 40), rng,
    ));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Supply capsule (optional)
  // ════════════════════════════════════════════

  if (rng.chance(0.5)) {
    elements.push(supplyCapsule(
      stationCX + rng.nextFloat(-w * 0.05, w * 0.05),
      dockY + h * 0.08 + rng.nextFloat(0, h * 0.06),
      rng.nextFloat(22, 35), rng,
    ));
  }

  // ════════════════════════════════════════════
  //  LAYER 0 — Distant star clusters
  // ════════════════════════════════════════════

  for (let i = 0; i < rng.nextInt(15, 25); i++) {
    elements.push(createCircle(rng.nextFloat(0, w), rng.nextFloat(0, h), rng.nextFloat(0.2, 0.8), '#AABBDD', {
      layer: 0, category: 'dust', modifiable: false, opacity: rng.nextFloat(0.1, 0.3),
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 4 — Edge vignette
  // ════════════════════════════════════════════

  elements.push(createRect(0, 0, w, h * 0.06, '#000010', { layer: 4, category: 'vignette', modifiable: false, opacity: 0.4 }));
  elements.push(createRect(0, h * 0.94, w, h * 0.06, '#000010', { layer: 4, category: 'vignette', modifiable: false, opacity: 0.3 }));

  return { elements, defs };
}
