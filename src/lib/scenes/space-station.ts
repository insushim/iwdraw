import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath,
  createLine, createGroup, createText,
} from '../engine/primitives';

let _uid = 0;
function uid(p = 'ss') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// Detailed space station module
function stationModule(x: number, y: number, w: number, h: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  // Hull
  children.push(createRect(x, y, w, h, 'url(#panelGrad)', { layer: 2, stroke: '#4A6A8A', strokeWidth: 1.5 }));
  // Hull panel lines
  const panels = rng.nextInt(3, 5);
  for (let i = 1; i < panels; i++) {
    const lx = x + i * (w / panels);
    children.push(createLine(lx, y, lx, y + h, '#3A5A7A', { strokeWidth: 0.8, layer: 2, opacity: 0.5 }));
  }
  // Hull horizontal seam
  children.push(createLine(x, y + h / 2, x + w, y + h / 2, '#3A5A7A', { strokeWidth: 0.5, layer: 2, opacity: 0.4 }));
  return createGroup(x, y, children, { layer: 2, category: 'station', modifiable: false });
}

// Solar panel array
function solarPanel(x: number, y: number, w: number, h: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  // Panel frame
  children.push(createRect(x, y, w, h, '#1A2A4A', { layer: 2, stroke: '#3A5A7A', strokeWidth: 1 }));
  // Cell grid
  const cols = Math.floor(w / 8);
  const rows = Math.floor(h / 6);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = x + 2 + c * (w / cols);
      const cy = y + 2 + r * (h / rows);
      const cellW = (w / cols) - 2;
      const cellH = (h / rows) - 2;
      children.push(createRect(cx, cy, cellW, cellH, rng.chance(0.5) ? '#1B3F6F' : '#1A3565', {
        layer: 2, opacity: rng.nextFloat(0.7, 0.95),
      }));
    }
  }
  return createGroup(x, y, children, { layer: 2, category: 'solar', modifiable: true, id: uid('solar') });
}

// Small satellite
function satellite(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  // Body
  children.push(createRect(x - s * 0.15, y - s * 0.1, s * 0.3, s * 0.2, '#8899AA', { layer: 3, stroke: '#667788', strokeWidth: 0.8 }));
  // Solar wings
  children.push(createRect(x - s * 0.5, y - s * 0.06, s * 0.3, s * 0.12, '#1A3565', { layer: 3, stroke: '#3A5A7A', strokeWidth: 0.5 }));
  children.push(createRect(x + s * 0.2, y - s * 0.06, s * 0.3, s * 0.12, '#1A3565', { layer: 3, stroke: '#3A5A7A', strokeWidth: 0.5 }));
  // Antenna
  children.push(createLine(x, y - s * 0.1, x, y - s * 0.25, '#AABBCC', { strokeWidth: 0.8, layer: 3 }));
  children.push(createCircle(x, y - s * 0.27, s * 0.03, '#CCDDEE', { layer: 3 }));
  // Blinking light
  children.push(createCircle(x + s * 0.1, y - s * 0.1, s * 0.02, '#FF3333', { layer: 3, opacity: 0.9 }));
  return createGroup(x, y, children, { layer: 3, category: 'satellite', modifiable: true, id: uid('sat') });
}

// Astronaut on EVA
function astronaut(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  // Helmet (rounded)
  children.push(createCircle(x, y - s * 0.35, s * 0.18, '#EEEEFF', { layer: 3, stroke: '#AABBCC', strokeWidth: 1 }));
  // Visor
  children.push(createCircle(x, y - s * 0.35, s * 0.12, '#224466', { layer: 3, opacity: 0.8 }));
  // Visor reflection
  children.push(createCircle(x - s * 0.04, y - s * 0.38, s * 0.04, '#6699CC', { layer: 3, opacity: 0.5 }));
  // Suit body
  children.push(createRect(x - s * 0.14, y - s * 0.18, s * 0.28, s * 0.3, '#EEEEFF', { layer: 3, stroke: '#AABBCC', strokeWidth: 0.8 }));
  // Backpack (life support)
  children.push(createRect(x + s * 0.14, y - s * 0.16, s * 0.1, s * 0.25, '#CCCCDD', { layer: 3 }));
  // Arms
  children.push(createLine(x - s * 0.14, y - s * 0.12, x - s * 0.28, y - s * 0.02, '#EEEEFF', { strokeWidth: s * 0.06, layer: 3 }));
  children.push(createLine(x + s * 0.14, y - s * 0.12, x + s * 0.28, y - s * 0.22, '#EEEEFF', { strokeWidth: s * 0.06, layer: 3 }));
  // Legs
  children.push(createLine(x - s * 0.06, y + s * 0.12, x - s * 0.1, y + s * 0.3, '#EEEEFF', { strokeWidth: s * 0.06, layer: 3 }));
  children.push(createLine(x + s * 0.06, y + s * 0.12, x + s * 0.1, y + s * 0.28, '#EEEEFF', { strokeWidth: s * 0.06, layer: 3 }));
  // Tether line
  children.push(createPath(x, y, `M${x + s * 0.24},${y - s * 0.16} Q${x + s * 0.5},${y - s * 0.3} ${x + s * 0.6},${y - s * 0.5}`, 'none', { stroke: '#FFDD44', strokeWidth: 1, layer: 3, opacity: 0.7 }));
  return createGroup(x, y, children, { layer: 3, category: 'astronaut', modifiable: true, id: uid('astro') });
}

// Supply capsule
function supplyCapsule(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  // Body (cylindrical shape)
  children.push(createRect(x - s * 0.12, y - s * 0.25, s * 0.24, s * 0.5, '#AAB0B8', { layer: 3, stroke: '#778899', strokeWidth: 1 }));
  // Nose cone
  const nosePath = `M${x - s * 0.12},${y - s * 0.25} L${x},${y - s * 0.4} L${x + s * 0.12},${y - s * 0.25} Z`;
  children.push(createPath(x, y, nosePath, '#8899AA', { layer: 3 }));
  // Thruster
  children.push(createRect(x - s * 0.08, y + s * 0.25, s * 0.16, s * 0.06, '#556677', { layer: 3 }));
  // Thruster flame
  const flamePath = `M${x - s * 0.06},${y + s * 0.31} L${x},${y + s * 0.48} L${x + s * 0.06},${y + s * 0.31}`;
  children.push(createPath(x, y, flamePath, '#FF8800', { layer: 3, opacity: 0.6 }));
  children.push(createPath(x, y, `M${x - s * 0.03},${y + s * 0.31} L${x},${y + s * 0.42} L${x + s * 0.03},${y + s * 0.31}`, '#FFDD44', { layer: 3, opacity: 0.5 }));
  // Side panels
  children.push(createRect(x - s * 0.16, y - s * 0.1, s * 0.04, s * 0.12, '#1A3565', { layer: 3 }));
  children.push(createRect(x + s * 0.12, y - s * 0.1, s * 0.04, s * 0.12, '#1A3565', { layer: 3 }));
  return createGroup(x, y, children, { layer: 3, category: 'capsule', modifiable: true, id: uid('cap') });
}

export function generateSpaceStation(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  const elements: SVGElementData[] = [];

  // ── Color palette ──
  const nebulaHue1 = rng.nextInt(260, 320);
  const nebulaHue2 = rng.nextInt(180, 260);
  const stationName = rng.pick(['ISS-2', 'ORION-7', 'ATLAS-3', 'NOVA-1', 'KEPLER-5']);

  // ── SVG Defs ──
  const defs = `
    <linearGradient id="spaceGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#020010"/>
      <stop offset="30%" stop-color="#050520"/>
      <stop offset="60%" stop-color="#080830"/>
      <stop offset="100%" stop-color="#0A0A3A"/>
    </linearGradient>
    <radialGradient id="nebulaGrad1" cx="30%" cy="40%" r="50%">
      <stop offset="0%" stop-color="hsl(${nebulaHue1}, 60%, 50%)" stop-opacity="0.08"/>
      <stop offset="60%" stop-color="hsl(${nebulaHue1}, 50%, 40%)" stop-opacity="0.03"/>
      <stop offset="100%" stop-color="hsl(${nebulaHue1}, 40%, 30%)" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="nebulaGrad2" cx="70%" cy="60%" r="45%">
      <stop offset="0%" stop-color="hsl(${nebulaHue2}, 50%, 55%)" stop-opacity="0.06"/>
      <stop offset="70%" stop-color="hsl(${nebulaHue2}, 40%, 40%)" stop-opacity="0.02"/>
      <stop offset="100%" stop-color="hsl(${nebulaHue2}, 30%, 30%)" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="panelGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#6A7A8A"/>
      <stop offset="50%" stop-color="#4A5A6A"/>
      <stop offset="100%" stop-color="#3A4A5A"/>
    </linearGradient>
    <radialGradient id="windowGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00FFFF" stop-opacity="0.9"/>
      <stop offset="60%" stop-color="#00CCDD" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#009999" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="earthGrad" cx="40%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#4488CC"/>
      <stop offset="30%" stop-color="#2266AA"/>
      <stop offset="60%" stop-color="#225588"/>
      <stop offset="100%" stop-color="#113355"/>
    </radialGradient>
    <radialGradient id="sunFlare" cx="0%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#FFFFEE" stop-opacity="0.25"/>
      <stop offset="40%" stop-color="#FFEE88" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#FFDD44" stop-opacity="0"/>
    </radialGradient>
    <filter id="glowFilter">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  `;

  // ════════════════════════════════════════════
  //  LAYER 0 — Deep space background
  // ════════════════════════════════════════════

  elements.push(createRect(0, 0, w, h, 'url(#spaceGrad)', { layer: 0, category: 'space', modifiable: false, id: uid('bg') }));

  // ════════════════════════════════════════════
  //  LAYER 0 — Nebula clouds (2-3)
  // ════════════════════════════════════════════

  elements.push(createCircle(w * 0.3, h * 0.4, w * 0.45, 'url(#nebulaGrad1)', { layer: 0, category: 'nebula', modifiable: false, opacity: 1, id: uid('neb') }));
  elements.push(createCircle(w * 0.7, h * 0.6, w * 0.4, 'url(#nebulaGrad2)', { layer: 0, category: 'nebula', modifiable: false, opacity: 1, id: uid('neb') }));
  if (rng.chance(0.6)) {
    const nHue = rng.nextInt(150, 200);
    elements.push(createEllipse(w * rng.nextFloat(0.2, 0.8), h * rng.nextFloat(0.1, 0.5), w * 0.3, h * 0.15, `hsla(${nHue}, 40%, 50%, 0.04)`, { layer: 0, category: 'nebula', modifiable: false, id: uid('neb') }));
  }

  // ════════════════════════════════════════════
  //  LAYER 0 — Starfield (60-100 stars)
  // ════════════════════════════════════════════

  const starCount = rng.nextInt(60, 100);
  for (let i = 0; i < starCount; i++) {
    const sx = rng.nextFloat(0, w);
    const sy = rng.nextFloat(0, h);
    const sr = rng.nextFloat(0.3, 2.0);
    const brightness = rng.nextFloat(0.3, 1.0);
    const starColor = rng.pick(['#FFFFFF', '#FFFDE0', '#E0E8FF', '#FFE8D0', '#D0E8FF']);
    elements.push(createCircle(sx, sy, sr, starColor, {
      layer: 0, category: 'star', modifiable: false, opacity: brightness, id: uid('star'),
    }));
  }

  // Brighter accent stars with cross rays (3-6)
  const accentStars = rng.nextInt(3, 6);
  for (let i = 0; i < accentStars; i++) {
    const sx = rng.nextFloat(20, w - 20);
    const sy = rng.nextFloat(10, h - 10);
    const sr = rng.nextFloat(1.5, 3);
    const rayLen = sr * rng.nextFloat(3, 6);
    elements.push(createCircle(sx, sy, sr, '#FFFFFF', { layer: 0, category: 'star', modifiable: false, opacity: 0.9, id: uid('bstar') }));
    // Cross rays
    elements.push(createLine(sx - rayLen, sy, sx + rayLen, sy, '#FFFFFF', { strokeWidth: 0.5, layer: 0, category: 'star', modifiable: false, opacity: 0.4, id: uid('ray') }));
    elements.push(createLine(sx, sy - rayLen, sx, sy + rayLen, '#FFFFFF', { strokeWidth: 0.5, layer: 0, category: 'star', modifiable: false, opacity: 0.4, id: uid('ray') }));
  }

  // ════════════════════════════════════════════
  //  LAYER 1 — Planet (Earth-like or alien)
  // ════════════════════════════════════════════

  const planetSide = rng.pick(['bottomLeft', 'bottomRight'] as const);
  const planetR = rng.nextFloat(w * 0.25, w * 0.35);
  const planetX = planetSide === 'bottomLeft' ? rng.nextFloat(-planetR * 0.3, w * 0.25) : rng.nextFloat(w * 0.75, w + planetR * 0.3);
  const planetY = rng.nextFloat(h * 0.65, h + planetR * 0.2);
  const isAlien = rng.chance(0.3);

  // Atmosphere glow (larger circle behind planet)
  elements.push(createCircle(planetX, planetY, planetR * 1.12, isAlien ? '#44AA66' : '#4488CC', {
    layer: 1, category: 'planet', modifiable: false, opacity: 0.08, id: uid('atmo'),
  }));
  elements.push(createCircle(planetX, planetY, planetR * 1.06, isAlien ? '#55BB77' : '#5599DD', {
    layer: 1, category: 'planet', modifiable: false, opacity: 0.12, id: uid('atmo'),
  }));

  // Planet body
  elements.push(createCircle(planetX, planetY, planetR, isAlien ? '#336644' : 'url(#earthGrad)', {
    layer: 1, category: 'planet', modifiable: true, id: uid('planet'),
  }));

  // Continent shapes (3-5 organic paths on planet surface)
  const continents = rng.nextInt(3, 5);
  for (let i = 0; i < continents; i++) {
    const angle = rng.nextFloat(0, Math.PI * 2);
    const dist = rng.nextFloat(0, planetR * 0.6);
    const cx = planetX + Math.cos(angle) * dist;
    const cy = planetY + Math.sin(angle) * dist;
    const cs = rng.nextFloat(planetR * 0.1, planetR * 0.25);
    const continentColor = isAlien ? rng.pick(['#AA4466', '#884488', '#CC6633']) : rng.pick(['#2D8B4E', '#3A7D44', '#228B22']);
    const cPath = `M${cx - cs},${cy} Q${cx - cs * 0.5},${cy - cs * 0.8} ${cx + cs * 0.3},${cy - cs * 0.5} Q${cx + cs},${cy - cs * 0.2} ${cx + cs * 0.8},${cy + cs * 0.3} Q${cx + cs * 0.3},${cy + cs * 0.7} ${cx - cs * 0.2},${cy + cs * 0.5} Q${cx - cs * 0.8},${cy + cs * 0.3} ${cx - cs},${cy} Z`;
    elements.push(createPath(cx, cy, cPath, continentColor, {
      layer: 1, category: 'planet', modifiable: false, opacity: 0.6, id: uid('cont'),
    }));
  }

  // Cloud wisps on planet
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const angle = rng.nextFloat(0, Math.PI * 2);
    const dist = rng.nextFloat(planetR * 0.1, planetR * 0.6);
    const cx = planetX + Math.cos(angle) * dist;
    const cy = planetY + Math.sin(angle) * dist;
    elements.push(createEllipse(cx, cy, rng.nextFloat(planetR * 0.08, planetR * 0.2), rng.nextFloat(planetR * 0.03, planetR * 0.06), '#FFFFFF', {
      layer: 1, category: 'planet', modifiable: false, opacity: 0.15, id: uid('pcloud'),
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 1 — Lens flare from sun (edge)
  // ════════════════════════════════════════════

  const flareSide = planetSide === 'bottomLeft' ? 'right' : 'left';
  const flareX = flareSide === 'left' ? -w * 0.1 : w * 1.1;
  const flareY = rng.nextFloat(h * 0.2, h * 0.5);
  elements.push(createCircle(flareX, flareY, w * 0.3, 'url(#sunFlare)', {
    layer: 1, category: 'flare', modifiable: false, opacity: 1, id: uid('flare'),
  }));
  // Secondary lens flare artifacts (small circles along a line)
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const t = (i + 1) * 0.2;
    const fx = flareX + (w / 2 - flareX) * t;
    const fy = flareY + (h / 2 - flareY) * t;
    const fr = rng.nextFloat(3, 10);
    elements.push(createCircle(fx, fy, fr, '#FFEE88', {
      layer: 1, category: 'flare', modifiable: false, opacity: rng.nextFloat(0.05, 0.12), id: uid('flare'),
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Space Station structure
  // ════════════════════════════════════════════

  const stationCX = w * rng.nextFloat(0.38, 0.62);
  const stationCY = h * rng.nextFloat(0.32, 0.48);

  // === Main habitat module ===
  const habW = w * 0.22;
  const habH = h * 0.1;
  const habX = stationCX - habW / 2;
  const habY = stationCY - habH / 2;

  elements.push(stationModule(habX, habY, habW, habH, rng));
  // Rounded end caps (circles on left and right)
  elements.push(createCircle(habX, stationCY, habH / 2, '#5A6A7A', { layer: 2, category: 'station', modifiable: false, stroke: '#4A6A8A', strokeWidth: 1, id: uid('cap') }));
  elements.push(createCircle(habX + habW, stationCY, habH / 2, '#5A6A7A', { layer: 2, category: 'station', modifiable: false, stroke: '#4A6A8A', strokeWidth: 1, id: uid('cap') }));

  // === Secondary module (perpendicular / vertical) ===
  const secW = w * 0.06;
  const secH = h * 0.18;
  const secX = stationCX - secW / 2;
  const secY = stationCY - secH / 2;
  elements.push(stationModule(secX, secY, secW, secH, rng));

  // Module connectors (small rects at intersections)
  const connSize = Math.min(secW, habH) * 0.4;
  elements.push(createRect(stationCX - connSize / 2, habY - connSize * 0.5, connSize, connSize, '#7A8A9A', {
    layer: 2, category: 'station', modifiable: false, stroke: '#5A6A7A', strokeWidth: 1, id: uid('conn'),
  }));
  elements.push(createRect(stationCX - connSize / 2, habY + habH - connSize * 0.5, connSize, connSize, '#7A8A9A', {
    layer: 2, category: 'station', modifiable: false, stroke: '#5A6A7A', strokeWidth: 1, id: uid('conn'),
  }));

  // === Solar Panel Arrays (left and right) ===
  const panelW = w * 0.14;
  const panelH = h * 0.06;

  // Left truss beam
  const leftTrussX1 = habX;
  const leftTrussX2 = habX - panelW - w * 0.04;
  elements.push(createLine(leftTrussX1, stationCY, leftTrussX2 + panelW, stationCY, '#6A7A8A', {
    strokeWidth: 3, layer: 2, category: 'station', modifiable: false, id: uid('truss'),
  }));
  // Left truss cross-beams
  const trussSegs = 5;
  for (let i = 0; i < trussSegs; i++) {
    const tx = leftTrussX2 + panelW + i * ((leftTrussX1 - leftTrussX2 - panelW) / trussSegs);
    elements.push(createLine(tx, stationCY - 3, tx + 6, stationCY + 3, '#5A6A7A', { strokeWidth: 0.8, layer: 2, opacity: 0.6 }));
  }

  // Left solar panels (top and bottom)
  elements.push(solarPanel(leftTrussX2, stationCY - panelH - 4, panelW, panelH, rng));
  elements.push(solarPanel(leftTrussX2, stationCY + 4, panelW, panelH, rng));

  // Right truss beam
  const rightTrussX1 = habX + habW;
  const rightTrussX2 = habX + habW + w * 0.04;
  elements.push(createLine(rightTrussX1, stationCY, rightTrussX2, stationCY, '#6A7A8A', {
    strokeWidth: 3, layer: 2, category: 'station', modifiable: false, id: uid('truss'),
  }));
  for (let i = 0; i < trussSegs; i++) {
    const tx = rightTrussX1 + i * ((rightTrussX2 - rightTrussX1) / trussSegs);
    elements.push(createLine(tx, stationCY - 3, tx + 6, stationCY + 3, '#5A6A7A', { strokeWidth: 0.8, layer: 2, opacity: 0.6 }));
  }

  // Right solar panels
  elements.push(solarPanel(rightTrussX2, stationCY - panelH - 4, panelW, panelH, rng));
  elements.push(solarPanel(rightTrussX2, stationCY + 4, panelW, panelH, rng));

  // === Observation Windows (5-7) with cyan glow ===
  const windowCount = rng.nextInt(5, 7);
  const windowSpacing = habW / (windowCount + 1);
  for (let i = 0; i < windowCount; i++) {
    const wx = habX + windowSpacing * (i + 1);
    const wy = stationCY;
    const wr = rng.nextFloat(3, 5);
    // Glow behind window
    elements.push(createCircle(wx, wy, wr * 2.5, 'url(#windowGlow)', {
      layer: 2, category: 'window', modifiable: false, opacity: 0.5, id: uid('wglow'),
    }));
    // Window
    elements.push(createCircle(wx, wy, wr, '#00DDEE', {
      layer: 2, category: 'window', modifiable: true, stroke: '#4A6A8A', strokeWidth: 1, id: uid('win'),
    }));
    // Window highlight
    elements.push(createCircle(wx - wr * 0.25, wy - wr * 0.25, wr * 0.3, '#AAFFFF', {
      layer: 2, category: 'window', modifiable: false, opacity: 0.5, id: uid('whl'),
    }));
  }

  // === Antenna dish on top ===
  const antennaX = stationCX;
  const antennaY = secY;
  // Antenna mast
  elements.push(createLine(antennaX, antennaY, antennaX, antennaY - h * 0.08, '#8899AA', {
    strokeWidth: 2, layer: 2, category: 'antenna', modifiable: false, id: uid('mast'),
  }));
  // Dish
  const dishR = w * 0.025;
  const dishPath = `M${antennaX - dishR},${antennaY - h * 0.08} Q${antennaX},${antennaY - h * 0.08 - dishR * 1.2} ${antennaX + dishR},${antennaY - h * 0.08}`;
  elements.push(createPath(antennaX, antennaY, dishPath, '#AABBCC', {
    layer: 2, category: 'antenna', modifiable: true, stroke: '#8899AA', strokeWidth: 1, id: uid('dish'),
  }));
  // Dish feed
  elements.push(createCircle(antennaX, antennaY - h * 0.08 - dishR * 0.3, dishR * 0.2, '#CCDDEE', {
    layer: 2, category: 'antenna', modifiable: false, id: uid('feed'),
  }));

  // Communication signals (curved dashed arcs from antenna)
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const sigR = dishR * (2.5 + i * 1.8);
    const sigY = antennaY - h * 0.08 - dishR * 0.3;
    const arcPath = `M${antennaX - sigR * 0.7},${sigY - sigR * 0.7} A${sigR},${sigR} 0 0,1 ${antennaX + sigR * 0.7},${sigY - sigR * 0.7}`;
    elements.push(createPath(antennaX, sigY, arcPath, 'none', {
      stroke: '#44DDFF', strokeWidth: 0.8, layer: 3, category: 'signal', modifiable: false, opacity: 0.3 - i * 0.06, id: uid('sig'),
    }));
  }

  // === Docking port at bottom ===
  const dockY = secY + secH;
  elements.push(createRect(stationCX - w * 0.015, dockY, w * 0.03, h * 0.03, '#6A7A8A', {
    layer: 2, category: 'station', modifiable: false, stroke: '#4A5A6A', strokeWidth: 1, id: uid('dock'),
  }));
  // Docking ring
  elements.push(createCircle(stationCX, dockY + h * 0.03, w * 0.02, 'none', {
    layer: 2, category: 'station', modifiable: false, stroke: '#8899AA', strokeWidth: 1.5, id: uid('dring'),
  }));

  // === Warning lights (small red circles) ===
  const warningPositions = [
    { x: habX + habW * 0.05, y: habY - 2 },
    { x: habX + habW * 0.95, y: habY - 2 },
    { x: stationCX, y: secY - 2 },
    { x: leftTrussX2 + panelW / 2, y: stationCY - panelH - 6 },
    { x: rightTrussX2 + panelW / 2, y: stationCY - panelH - 6 },
  ];
  for (const pos of warningPositions) {
    elements.push(createCircle(pos.x, pos.y, 2, '#FF2222', {
      layer: 3, category: 'light', modifiable: true, opacity: rng.nextFloat(0.6, 1.0), id: uid('warn'),
    }));
  }

  // === Station name text ===
  elements.push(createText(habX + habW * 0.3, stationCY + habH * 0.15, stationName, '#AACCEE', {
    layer: 3, category: 'text', modifiable: true, id: uid('name'), fontSize: Math.max(7, habH * 0.22),
  }));

  // ════════════════════════════════════════════
  //  LAYER 3 — Orbiting satellite
  // ════════════════════════════════════════════

  const satX = rng.nextFloat(w * 0.05, w * 0.25);
  const satY = rng.nextFloat(h * 0.08, h * 0.3);
  elements.push(satellite(satX, satY, rng.nextFloat(25, 40), rng));

  // ════════════════════════════════════════════
  //  LAYER 3 — Space debris / asteroids (3-5)
  // ════════════════════════════════════════════

  const debrisCount = rng.nextInt(3, 5);
  for (let i = 0; i < debrisCount; i++) {
    const dx = rng.nextFloat(10, w - 10);
    const dy = rng.nextFloat(10, h - 10);
    const ds = rng.nextFloat(3, 10);
    const debrisColor = rng.pick(['#554433', '#665544', '#776655', '#887766']);
    // Irregular asteroid shape
    const aPath = `M${dx - ds},${dy + ds * 0.2} Q${dx - ds * 0.8},${dy - ds * 0.6} ${dx - ds * 0.2},${dy - ds} Q${dx + ds * 0.5},${dy - ds * 0.8} ${dx + ds},${dy - ds * 0.1} Q${dx + ds * 0.7},${dy + ds * 0.6} ${dx + ds * 0.1},${dy + ds * 0.8} Q${dx - ds * 0.4},${dy + ds * 0.7} ${dx - ds},${dy + ds * 0.2} Z`;
    elements.push(createPath(dx, dy, aPath, debrisColor, {
      layer: 3, category: 'debris', modifiable: true, opacity: rng.nextFloat(0.5, 0.8), id: uid('debris'),
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Comet / shooting star (optional)
  // ════════════════════════════════════════════

  if (rng.chance(0.65)) {
    const cometStartX = rng.nextFloat(w * 0.1, w * 0.5);
    const cometStartY = rng.nextFloat(0, h * 0.2);
    const cometAngle = rng.nextFloat(0.3, 0.8);
    const cometLen = rng.nextFloat(w * 0.08, w * 0.15);
    const cometEndX = cometStartX + Math.cos(cometAngle) * cometLen;
    const cometEndY = cometStartY + Math.sin(cometAngle) * cometLen;

    // Comet tail (wider at start, narrowing)
    const tailPath = `M${cometEndX},${cometEndY} L${cometStartX + (cometEndX - cometStartX) * 0.1 + 3},${cometStartY + (cometEndY - cometStartY) * 0.1 - 1} L${cometStartX},${cometStartY} L${cometStartX + (cometEndX - cometStartX) * 0.1 - 3},${cometStartY + (cometEndY - cometStartY) * 0.1 + 1} Z`;
    elements.push(createPath(cometStartX, cometStartY, tailPath, '#FFFFCC', {
      layer: 3, category: 'comet', modifiable: false, opacity: 0.15, id: uid('ctail'),
    }));
    // Comet head
    elements.push(createCircle(cometStartX, cometStartY, 2.5, '#FFFFEE', {
      layer: 3, category: 'comet', modifiable: true, opacity: 0.9, id: uid('comet'),
    }));
    elements.push(createCircle(cometStartX, cometStartY, 5, '#FFFFCC', {
      layer: 3, category: 'comet', modifiable: false, opacity: 0.2, id: uid('cglow'),
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Astronaut on spacewalk (optional)
  // ════════════════════════════════════════════

  if (rng.chance(0.55)) {
    const astroX = stationCX + rng.nextFloat(w * 0.08, w * 0.15) * rng.pick([-1, 1]);
    const astroY = stationCY + rng.nextFloat(-h * 0.12, -h * 0.04);
    elements.push(astronaut(astroX, astroY, rng.nextFloat(28, 40), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Supply capsule approaching (optional)
  // ════════════════════════════════════════════

  if (rng.chance(0.5)) {
    const capX = stationCX + rng.nextFloat(-w * 0.05, w * 0.05);
    const capY = dockY + h * 0.08 + rng.nextFloat(0, h * 0.06);
    elements.push(supplyCapsule(capX, capY, rng.nextFloat(22, 35), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 4 — Distant star clusters (tiny dots, background depth)
  // ════════════════════════════════════════════

  for (let i = 0; i < rng.nextInt(15, 25); i++) {
    const cx = rng.nextFloat(0, w);
    const cy = rng.nextFloat(0, h);
    elements.push(createCircle(cx, cy, rng.nextFloat(0.2, 0.8), '#AABBDD', {
      layer: 0, category: 'dust', modifiable: false, opacity: rng.nextFloat(0.1, 0.3), id: uid('dust'),
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 4 — Edge vignette (darkening edges)
  // ════════════════════════════════════════════

  elements.push(createRect(0, 0, w, h * 0.06, '#000010', { layer: 4, category: 'vignette', modifiable: false, opacity: 0.4, id: uid('vig') }));
  elements.push(createRect(0, h * 0.94, w, h * 0.06, '#000010', { layer: 4, category: 'vignette', modifiable: false, opacity: 0.3, id: uid('vig') }));

  return { elements, defs };
}
