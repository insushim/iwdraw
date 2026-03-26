import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath, createLine, createGroup,
} from '../engine/primitives';
import {
  combineDefs, outdoorDefs, skyGradient, groundGradient,
  linearGradient, radialGradient, sunGlowGradient,
  dropShadow, gaussianBlur,
} from './svg-effects';
import {
  detailedTree, detailedCloud, detailedRock, detailedBird, detailedFence, detailedFlower,
  resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'ff') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// ── Red Barn ─────────────────────────────────────────────────────
function barn(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const barnRed = '#B71C1C';
  const barnDark = '#8B1A1A';
  const roofGray = '#616161';
  const trim = '#FFF8E1';

  // Shadow
  children.push(createEllipse(x, y + s * 0.02, s * 0.4, s * 0.06, 'rgba(0,0,0,0.1)', { layer: 2 }));

  // Main body
  children.push(createRect(x - s * 0.3, y - s * 0.5, s * 0.6, s * 0.5, barnRed, { layer: 2 }));
  // Trim lines
  children.push(createLine(x - s * 0.3, y - s * 0.25, x + s * 0.3, y - s * 0.25, trim, { strokeWidth: 1.5, layer: 2, opacity: 0.7 }));
  children.push(createLine(x, y - s * 0.5, x, y, trim, { strokeWidth: 1.5, layer: 2, opacity: 0.5 }));

  // Barn door
  children.push(createRect(x - s * 0.1, y - s * 0.3, s * 0.2, s * 0.3, barnDark, { layer: 2 }));
  // Door X pattern
  children.push(createLine(x - s * 0.1, y - s * 0.3, x + s * 0.1, y, trim, { strokeWidth: 1, layer: 2, opacity: 0.4 }));
  children.push(createLine(x + s * 0.1, y - s * 0.3, x - s * 0.1, y, trim, { strokeWidth: 1, layer: 2, opacity: 0.4 }));

  // Hay loft window
  children.push(createPath(x, y, `M${x - s * 0.06},${y - s * 0.42} L${x},${y - s * 0.48} L${x + s * 0.06},${y - s * 0.42} Z`, trim, { layer: 2, opacity: 0.5 }));
  children.push(createPath(x, y, `M${x - s * 0.04},${y - s * 0.42} L${x},${y - s * 0.46} L${x + s * 0.04},${y - s * 0.42} Z`, '#4E342E', { layer: 2 }));

  // Gambrel roof
  const roofPath = `M${x - s * 0.35},${y - s * 0.5} L${x - s * 0.2},${y - s * 0.72} L${x},${y - s * 0.82} L${x + s * 0.2},${y - s * 0.72} L${x + s * 0.35},${y - s * 0.5} Z`;
  children.push(createPath(x, y, roofPath, roofGray, { layer: 2 }));
  // Roof highlight
  children.push(createPath(x, y, `M${x - s * 0.2},${y - s * 0.72} L${x},${y - s * 0.82} L${x + s * 0.2},${y - s * 0.72}`, 'none', { stroke: '#9E9E9E', strokeWidth: 1, layer: 2, opacity: 0.5 }));

  // Weather vane on top
  children.push(createLine(x, y - s * 0.82, x, y - s * 0.95, '#424242', { strokeWidth: 1.5, layer: 2 }));
  children.push(createPath(x, y, `M${x - s * 0.04},${y - s * 0.92} L${x + s * 0.06},${y - s * 0.95} L${x + s * 0.06},${y - s * 0.92} Z`, '#FFD700', { layer: 2 }));

  // Side window
  children.push(createRect(x + s * 0.15, y - s * 0.42, s * 0.08, s * 0.08, '#BBDEFB', { layer: 2, stroke: trim, strokeWidth: 1 }));

  return createGroup(x, y, children, { layer: 2, category: 'barn', modifiable: true, id: uid('barn'), filter: 'url(#shadow)' });
}

// ── Silo ─────────────────────────────────────────────────────────
function silo(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const color = rng.pick(['#BDBDBD', '#9E9E9E', '#E0E0E0']);
  const darkColor = '#757575';

  // Shadow
  children.push(createEllipse(x, y + s * 0.02, s * 0.1, s * 0.03, 'rgba(0,0,0,0.1)', { layer: 2 }));

  // Body
  children.push(createRect(x - s * 0.08, y - s * 0.7, s * 0.16, s * 0.7, color, { layer: 2 }));
  // Bands
  for (let i = 0; i < 4; i++) {
    const by = y - s * 0.1 - i * s * 0.16;
    children.push(createLine(x - s * 0.08, by, x + s * 0.08, by, darkColor, { strokeWidth: 1, layer: 2, opacity: 0.4 }));
  }

  // Dome top
  children.push(createPath(x, y, `M${x - s * 0.08},${y - s * 0.7} Q${x},${y - s * 0.85} ${x + s * 0.08},${y - s * 0.7}`, darkColor, { layer: 2 }));
  // Highlight
  children.push(createRect(x - s * 0.04, y - s * 0.65, s * 0.03, s * 0.55, '#FFF', { layer: 2, opacity: 0.15 }));

  return createGroup(x, y, children, { layer: 2, category: 'silo', modifiable: true, id: uid('silo'), filter: 'url(#shadow)' });
}

// ── Cow ──────────────────────────────────────────────────────────
function cow(x: number, y: number, size: number, rng: SeededRandom, facing = 1): SVGElementData {
  const s = size;
  const f = facing;
  const children: SVGElementData[] = [];
  const bodyColor = '#FAFAFA';
  const spots = '#2E2E2E';

  // Shadow
  children.push(createEllipse(x, y + s * 0.02, s * 0.2, s * 0.04, 'rgba(0,0,0,0.08)', { layer: 2 }));

  // Legs
  children.push(createRect(x + f * s * 0.08, y - s * 0.22, s * 0.03, s * 0.22, '#FFF', { layer: 2 }));
  children.push(createRect(x + f * s * 0.14, y - s * 0.22, s * 0.03, s * 0.22, '#F5F5F5', { layer: 2 }));
  children.push(createRect(x - f * s * 0.1, y - s * 0.22, s * 0.03, s * 0.22, '#FFF', { layer: 2 }));
  children.push(createRect(x - f * s * 0.05, y - s * 0.22, s * 0.03, s * 0.22, '#F5F5F5', { layer: 2 }));

  // Body
  children.push(createEllipse(x, y - s * 0.3, s * 0.2, s * 0.12, bodyColor, { layer: 2 }));

  // Spots
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    children.push(createEllipse(
      x + rng.nextFloat(-s * 0.12, s * 0.12),
      y - s * 0.3 + rng.nextFloat(-s * 0.06, s * 0.06),
      rng.nextFloat(s * 0.03, s * 0.06),
      rng.nextFloat(s * 0.02, s * 0.04),
      spots, { layer: 2, opacity: 0.8 },
    ));
  }

  // Head
  children.push(createCircle(x + f * s * 0.2, y - s * 0.32, s * 0.07, bodyColor, { layer: 2 }));
  // Snout
  children.push(createEllipse(x + f * s * 0.26, y - s * 0.3, s * 0.035, s * 0.025, '#FFCCBC', { layer: 2 }));
  // Eye
  children.push(createCircle(x + f * s * 0.22, y - s * 0.35, s * 0.012, '#222', { layer: 2 }));
  // Ears
  children.push(createEllipse(x + f * s * 0.17, y - s * 0.38, s * 0.025, s * 0.015, bodyColor, { layer: 2, rotation: f * -20 }));
  // Horns
  children.push(createLine(x + f * s * 0.18, y - s * 0.38, x + f * s * 0.16, y - s * 0.44, '#E0E0E0', { strokeWidth: 1.5, layer: 2 }));
  children.push(createLine(x + f * s * 0.22, y - s * 0.38, x + f * s * 0.24, y - s * 0.44, '#E0E0E0', { strokeWidth: 1.5, layer: 2 }));

  // Tail
  children.push(createPath(x, y, `M${x - f * s * 0.2},${y - s * 0.32} Q${x - f * s * 0.28},${y - s * 0.38} ${x - f * s * 0.25},${y - s * 0.28}`, 'none', { stroke: bodyColor, strokeWidth: 1.5, layer: 2 }));

  // Udder
  children.push(createEllipse(x, y - s * 0.2, s * 0.04, s * 0.03, '#FFCCBC', { layer: 2, opacity: 0.8 }));

  return createGroup(x, y, children, { layer: 2, category: 'cow', modifiable: true, id: uid('cow') });
}

// ── Chicken ──────────────────────────────────────────────────────
function chicken(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const bodyColor = rng.pick(['#FFFFFF', '#F5DEB3', '#D2691E', '#8B4513']);

  // Body
  children.push(createEllipse(x, y - s * 0.12, s * 0.08, s * 0.07, bodyColor, { layer: 2 }));
  // Head
  children.push(createCircle(x + s * 0.08, y - s * 0.2, s * 0.04, bodyColor, { layer: 2 }));
  // Comb
  children.push(createPath(x, y, `M${x + s * 0.07},${y - s * 0.24} L${x + s * 0.08},${y - s * 0.29} L${x + s * 0.09},${y - s * 0.24} L${x + s * 0.1},${y - s * 0.27} L${x + s * 0.11},${y - s * 0.24}`, '#F44336', { layer: 2 }));
  // Beak
  children.push(createPath(x, y, `M${x + s * 0.11},${y - s * 0.2} L${x + s * 0.14},${y - s * 0.19} L${x + s * 0.11},${y - s * 0.18}`, '#FF8F00', { layer: 2 }));
  // Eye
  children.push(createCircle(x + s * 0.09, y - s * 0.21, s * 0.008, '#111', { layer: 2 }));
  // Wattle
  children.push(createEllipse(x + s * 0.1, y - s * 0.17, s * 0.01, s * 0.015, '#F44336', { layer: 2 }));
  // Legs
  children.push(createLine(x - s * 0.02, y - s * 0.05, x - s * 0.02, y, '#FF8F00', { strokeWidth: 1, layer: 2 }));
  children.push(createLine(x + s * 0.02, y - s * 0.05, x + s * 0.02, y, '#FF8F00', { strokeWidth: 1, layer: 2 }));
  // Tail
  children.push(createPath(x, y, `M${x - s * 0.08},${y - s * 0.14} Q${x - s * 0.14},${y - s * 0.22} ${x - s * 0.1},${y - s * 0.25}`, 'none', { stroke: bodyColor, strokeWidth: 2, layer: 2 }));

  return createGroup(x, y, children, { layer: 2, category: 'chicken', modifiable: true, id: uid('chick') });
}

// ── Tractor ──────────────────────────────────────────────────────
function tractor(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const bodyColor = rng.pick(['#C62828', '#2E7D32', '#1565C0']);
  const metalColor = '#616161';

  // Shadow
  children.push(createEllipse(x, y + s * 0.02, s * 0.3, s * 0.05, 'rgba(0,0,0,0.12)', { layer: 2 }));

  // Back large wheel
  children.push(createCircle(x - s * 0.12, y - s * 0.12, s * 0.14, '#1a1a1a', { layer: 2 }));
  children.push(createCircle(x - s * 0.12, y - s * 0.12, s * 0.1, '#333', { layer: 2 }));
  children.push(createCircle(x - s * 0.12, y - s * 0.12, s * 0.04, metalColor, { layer: 2 }));
  // Wheel spokes
  for (let i = 0; i < 6; i++) {
    const angle = i * 60 * Math.PI / 180;
    children.push(createLine(
      x - s * 0.12 + Math.cos(angle) * s * 0.04,
      y - s * 0.12 + Math.sin(angle) * s * 0.04,
      x - s * 0.12 + Math.cos(angle) * s * 0.09,
      y - s * 0.12 + Math.sin(angle) * s * 0.09,
      metalColor, { strokeWidth: 1, layer: 2, opacity: 0.6 },
    ));
  }

  // Front small wheel
  children.push(createCircle(x + s * 0.2, y - s * 0.06, s * 0.08, '#1a1a1a', { layer: 2 }));
  children.push(createCircle(x + s * 0.2, y - s * 0.06, s * 0.055, '#333', { layer: 2 }));
  children.push(createCircle(x + s * 0.2, y - s * 0.06, s * 0.02, metalColor, { layer: 2 }));

  // Body/chassis
  children.push(createRect(x - s * 0.05, y - s * 0.32, s * 0.22, s * 0.15, bodyColor, { layer: 2 }));
  // Hood
  children.push(createRect(x + s * 0.08, y - s * 0.25, s * 0.18, s * 0.1, bodyColor, { layer: 2 }));
  // Grille
  children.push(createRect(x + s * 0.24, y - s * 0.24, s * 0.03, s * 0.08, metalColor, { layer: 2 }));

  // Cab roof
  children.push(createRect(x - s * 0.06, y - s * 0.42, s * 0.16, s * 0.03, metalColor, { layer: 2 }));
  // Cab window
  children.push(createRect(x - s * 0.03, y - s * 0.39, s * 0.1, s * 0.07, '#BBDEFB', { layer: 2, opacity: 0.7 }));

  // Exhaust pipe
  children.push(createRect(x + s * 0.12, y - s * 0.42, s * 0.02, s * 0.12, '#424242', { layer: 2 }));
  // Smoke puffs
  children.push(createCircle(x + s * 0.13, y - s * 0.44, s * 0.02, '#BDBDBD', { layer: 2, opacity: 0.4 }));
  children.push(createCircle(x + s * 0.14, y - s * 0.48, s * 0.025, '#E0E0E0', { layer: 2, opacity: 0.25 }));

  // Steering wheel (visible through window)
  children.push(createCircle(x + s * 0.04, y - s * 0.34, s * 0.015, '#333', { layer: 2, opacity: 0.5 }));

  return createGroup(x, y, children, { layer: 2, category: 'tractor', modifiable: true, id: uid('tractor'), filter: 'url(#shadow)' });
}

// ── Scarecrow ────────────────────────────────────────────────────
function scarecrow(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const shirtColor = rng.pick(['#F44336', '#4CAF50', '#2196F3', '#FF9800']);
  const pantsColor = rng.pick(['#5D4037', '#3E2723', '#1565C0']);
  const hatColor = rng.pick(['#5D4037', '#3E2723', '#8B4513']);
  const strawColor = '#F9A825';

  // Pole
  children.push(createLine(x, y, x, y - s * 0.9, '#5D4037', { strokeWidth: 3, layer: 2 }));
  // Cross beam
  children.push(createLine(x - s * 0.25, y - s * 0.6, x + s * 0.25, y - s * 0.6, '#5D4037', { strokeWidth: 2.5, layer: 2 }));

  // Shirt body
  children.push(createRect(x - s * 0.1, y - s * 0.7, s * 0.2, s * 0.25, shirtColor, { layer: 2 }));
  // Patches
  children.push(createRect(x - s * 0.06, y - s * 0.58, s * 0.06, s * 0.06, rng.pick(['#FFEB3B', '#8BC34A', '#FF5722']), { layer: 2, opacity: 0.7 }));

  // Sleeves
  children.push(createRect(x - s * 0.25, y - s * 0.65, s * 0.15, s * 0.08, shirtColor, { layer: 2 }));
  children.push(createRect(x + s * 0.1, y - s * 0.65, s * 0.15, s * 0.08, shirtColor, { layer: 2 }));

  // Straw poking out
  for (let i = 0; i < 4; i++) {
    const sx = x - s * 0.25 + rng.nextFloat(-s * 0.02, s * 0.02);
    children.push(createLine(sx, y - s * 0.62, sx - s * 0.04, y - s * 0.58 + rng.nextFloat(-s * 0.03, s * 0.03), strawColor, { strokeWidth: 1, layer: 2 }));
    const sx2 = x + s * 0.25 + rng.nextFloat(-s * 0.02, s * 0.02);
    children.push(createLine(sx2, y - s * 0.62, sx2 + s * 0.04, y - s * 0.58 + rng.nextFloat(-s * 0.03, s * 0.03), strawColor, { strokeWidth: 1, layer: 2 }));
  }

  // Pants
  children.push(createRect(x - s * 0.08, y - s * 0.45, s * 0.07, s * 0.2, pantsColor, { layer: 2 }));
  children.push(createRect(x + s * 0.01, y - s * 0.45, s * 0.07, s * 0.2, pantsColor, { layer: 2 }));

  // Head
  children.push(createCircle(x, y - s * 0.8, s * 0.08, '#F9A825', { layer: 2 }));
  // Face
  children.push(createCircle(x - s * 0.025, y - s * 0.82, s * 0.012, '#111', { layer: 2 }));
  children.push(createCircle(x + s * 0.025, y - s * 0.82, s * 0.012, '#111', { layer: 2 }));
  children.push(createPath(x, y, `M${x - s * 0.02},${y - s * 0.77} Q${x},${y - s * 0.74} ${x + s * 0.02},${y - s * 0.77}`, 'none', { stroke: '#111', strokeWidth: 1.2, layer: 2 }));

  // Hat
  children.push(createRect(x - s * 0.11, y - s * 0.9, s * 0.22, s * 0.03, hatColor, { layer: 2 }));
  children.push(createRect(x - s * 0.07, y - s * 1.02, s * 0.14, s * 0.12, hatColor, { layer: 2 }));

  return createGroup(x, y, children, { layer: 2, category: 'scarecrow', modifiable: true, id: uid('scarecrow'), filter: 'url(#shadow)' });
}

// ── Windmill ─────────────────────────────────────────────────────
function windmill(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];

  // Shadow
  children.push(createEllipse(x, y + s * 0.02, s * 0.12, s * 0.04, 'rgba(0,0,0,0.1)', { layer: 2 }));

  // Tower (tapered)
  children.push(createPath(x, y, `M${x - s * 0.08},${y} L${x - s * 0.05},${y - s * 0.65} L${x + s * 0.05},${y - s * 0.65} L${x + s * 0.08},${y} Z`, '#E0E0E0', { layer: 2 }));
  // Door
  children.push(createPath(x, y, `M${x - s * 0.025},${y} L${x - s * 0.02},${y - s * 0.1} Q${x},${y - s * 0.13} ${x + s * 0.02},${y - s * 0.1} L${x + s * 0.025},${y} Z`, '#5D4037', { layer: 2 }));

  // Cap
  children.push(createPath(x, y, `M${x - s * 0.06},${y - s * 0.65} Q${x},${y - s * 0.78} ${x + s * 0.06},${y - s * 0.65}`, '#616161', { layer: 2 }));

  // Blades (4)
  const bladeLen = s * 0.35;
  const hubX = x;
  const hubY = y - s * 0.68;
  const rotation = rng.nextFloat(0, 90);
  for (let i = 0; i < 4; i++) {
    const angle = (rotation + i * 90) * Math.PI / 180;
    const bx = hubX + Math.cos(angle) * bladeLen;
    const by = hubY + Math.sin(angle) * bladeLen;
    children.push(createLine(hubX, hubY, bx, by, '#5D4037', { strokeWidth: 2, layer: 2 }));
    // Blade sail
    const perpAngle = angle + Math.PI / 2;
    const sw = s * 0.04;
    const midX = (hubX + bx) / 2;
    const midY = (hubY + by) / 2;
    children.push(createPath(x, y,
      `M${hubX + Math.cos(angle) * s * 0.06},${hubY + Math.sin(angle) * s * 0.06} ` +
      `L${midX + Math.cos(perpAngle) * sw},${midY + Math.sin(perpAngle) * sw} ` +
      `L${bx},${by} ` +
      `L${midX - Math.cos(perpAngle) * sw * 0.3},${midY - Math.sin(perpAngle) * sw * 0.3} Z`,
      '#FFF8E1', { layer: 2, opacity: 0.7 },
    ));
  }
  // Hub
  children.push(createCircle(hubX, hubY, s * 0.025, '#424242', { layer: 2 }));

  return createGroup(x, y, children, { layer: 2, category: 'windmill', modifiable: true, id: uid('windmill'), filter: 'url(#shadow)' });
}

// ── Hay Bale ─────────────────────────────────────────────────────
function hayBale(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const hayColor = rng.pick(['#F9A825', '#FBC02D', '#E8A317']);
  const darkHay = '#C68400';

  // Shadow
  children.push(createEllipse(x, y + s * 0.02, s * 0.14, s * 0.04, 'rgba(0,0,0,0.1)', { layer: 2 }));

  // Main body (cylinder from side)
  children.push(createEllipse(x, y - s * 0.1, s * 0.12, s * 0.1, hayColor, { layer: 2 }));
  // Face circle pattern
  children.push(createCircle(x, y - s * 0.1, s * 0.09, darkHay, { layer: 2, opacity: 0.2 }));
  children.push(createCircle(x, y - s * 0.1, s * 0.06, darkHay, { layer: 2, opacity: 0.15 }));
  children.push(createCircle(x, y - s * 0.1, s * 0.03, darkHay, { layer: 2, opacity: 0.1 }));

  // Straw strands
  for (let i = 0; i < 3; i++) {
    const angle = rng.nextFloat(0, Math.PI * 2);
    const r = s * rng.nextFloat(0.08, 0.11);
    children.push(createLine(
      x + Math.cos(angle) * r * 0.5, y - s * 0.1 + Math.sin(angle) * r * 0.5,
      x + Math.cos(angle) * r * 1.1, y - s * 0.1 + Math.sin(angle) * r * 1.1,
      '#E8A317', { strokeWidth: 0.5, layer: 2, opacity: 0.4 },
    ));
  }

  return createGroup(x, y, children, { layer: 2, category: 'haybale', modifiable: true, id: uid('hay') });
}

// ── Farmhouse ────────────────────────────────────────────────────
function farmhouse(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const wallColor = '#FFF8E1';
  const roofColor = rng.pick(['#5D4037', '#795548', '#4E342E']);

  // Shadow
  children.push(createEllipse(x, y + s * 0.02, s * 0.3, s * 0.05, 'rgba(0,0,0,0.1)', { layer: 2 }));

  // Main body
  children.push(createRect(x - s * 0.25, y - s * 0.4, s * 0.5, s * 0.4, wallColor, { layer: 2, stroke: '#D7CCC8', strokeWidth: 0.5 }));

  // Roof
  children.push(createPath(x, y, `M${x - s * 0.3},${y - s * 0.4} L${x},${y - s * 0.65} L${x + s * 0.3},${y - s * 0.4} Z`, roofColor, { layer: 2 }));

  // Chimney
  children.push(createRect(x + s * 0.1, y - s * 0.62, s * 0.06, s * 0.15, '#795548', { layer: 2 }));

  // Door
  children.push(createRect(x - s * 0.05, y - s * 0.2, s * 0.1, s * 0.2, '#5D4037', { layer: 2 }));
  children.push(createCircle(x + s * 0.03, y - s * 0.1, s * 0.008, '#FFD700', { layer: 2 }));

  // Windows
  children.push(createRect(x - s * 0.2, y - s * 0.32, s * 0.08, s * 0.08, '#BBDEFB', { layer: 2, stroke: '#FFF', strokeWidth: 1 }));
  children.push(createRect(x + s * 0.12, y - s * 0.32, s * 0.08, s * 0.08, '#BBDEFB', { layer: 2, stroke: '#FFF', strokeWidth: 1 }));
  // Window crosses
  children.push(createLine(x - s * 0.16, y - s * 0.32, x - s * 0.16, y - s * 0.24, '#FFF', { strokeWidth: 0.8, layer: 2 }));
  children.push(createLine(x - s * 0.2, y - s * 0.28, x - s * 0.12, y - s * 0.28, '#FFF', { strokeWidth: 0.8, layer: 2 }));

  return createGroup(x, y, children, { layer: 2, category: 'house', modifiable: true, id: uid('house'), filter: 'url(#shadow)' });
}

export function generateFarmField(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  // === SVG DEFS ===
  const defs = combineDefs(
    outdoorDefs(),
    skyGradient('farmSky', '#1976D2', '#64B5F6', '#B3E5FC'),
    groundGradient('grassGrad', '#4CAF50', '#2E7D32'),
    sunGlowGradient('sunGlow'),
    linearGradient('dirtPath', [
      { offset: '0%', color: '#8D6E63' },
      { offset: '100%', color: '#6D4C41' },
    ]),
    linearGradient('fieldGreen1', [
      { offset: '0%', color: '#66BB6A' },
      { offset: '100%', color: '#43A047' },
    ]),
    linearGradient('fieldGreen2', [
      { offset: '0%', color: '#81C784' },
      { offset: '100%', color: '#4CAF50' },
    ]),
    linearGradient('fieldBrown', [
      { offset: '0%', color: '#8D6E63' },
      { offset: '50%', color: '#795548' },
      { offset: '100%', color: '#6D4C41' },
    ]),
    dropShadow('buildingShadow', 3, 5, 4, 'rgba(0,0,0,0.2)'),
    gaussianBlur('distantBlur', 2),
  );

  // ════════════════════════════════════════
  // LAYER 0: Sky
  // ════════════════════════════════════════
  elements.push(createRect(0, 0, w, h * 0.45, 'url(#farmSky)', { layer: 0, category: 'sky', modifiable: false, id: uid('sky') }));

  // Sun
  const sunX = w * rng.nextFloat(0.65, 0.85);
  const sunY = h * 0.1;
  elements.push(createCircle(sunX, sunY, 45, 'url(#sunGlow)', { layer: 0, category: 'sun', modifiable: false, filter: 'url(#glow)' }));
  elements.push(createCircle(sunX, sunY, 20, '#FFF9C4', { layer: 0, category: 'sun', modifiable: true, id: uid('sun') }));

  // Clouds
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const cloud = detailedCloud(rng.nextFloat(30, w - 80), rng.nextFloat(h * 0.04, h * 0.2), rng.nextFloat(30, 60), rng);
    cloud.modifiable = true;
    cloud.id = uid('cloud');
    elements.push(cloud);
  }

  // ════════════════════════════════════════
  // LAYER 1: Rolling hills background
  // ════════════════════════════════════════
  const hillY = h * 0.42;
  let hillPath = `M0,${hillY + 10}`;
  for (let i = 0; i < 5; i++) {
    const hx = (i + 0.5) * w / 5;
    const hex = (i + 1) * w / 5;
    hillPath += ` Q${hx},${hillY - rng.nextFloat(10, 30)} ${hex},${hillY + rng.nextFloat(-5, 5)}`;
  }
  hillPath += ` L${w},${h} L0,${h} Z`;
  elements.push(createPath(0, 0, hillPath, 'url(#grassGrad)', { layer: 1, category: 'ground', modifiable: false, id: uid('ground') }));

  // Distant tree line
  for (let i = 0; i < rng.nextInt(4, 6); i++) {
    const tx = rng.nextFloat(20, w - 30);
    const ty = hillY + rng.nextFloat(-10, 5);
    const tree = detailedTree(tx, ty, rng.pick(['oak', 'pine'] as const), rng.nextFloat(25, 40), rng);
    tree.filter = 'url(#distantBlur)';
    tree.opacity = 0.6;
    elements.push(tree);
  }

  // ════════════════════════════════════════
  // LAYER 1: Crop field rows
  // ════════════════════════════════════════
  const fieldTop = h * 0.5;
  const fieldBottom = h * 0.75;
  const fieldLeft = w * 0.05;
  const fieldRight = w * 0.55;

  // Field background
  elements.push(createRect(fieldLeft, fieldTop, fieldRight - fieldLeft, fieldBottom - fieldTop, 'url(#fieldBrown)', { layer: 1, category: 'field', modifiable: false }));

  // Crop rows
  const rowCount = rng.nextInt(8, 12);
  for (let i = 0; i < rowCount; i++) {
    const ry = fieldTop + (i + 0.5) * (fieldBottom - fieldTop) / rowCount;
    const rowColor = i % 2 === 0 ? 'url(#fieldGreen1)' : 'url(#fieldGreen2)';
    elements.push(createRect(fieldLeft, ry, fieldRight - fieldLeft, (fieldBottom - fieldTop) / rowCount * 0.5, rowColor, {
      layer: 1, category: 'crop', modifiable: false, opacity: 0.7,
    }));
    // Crop details
    for (let j = 0; j < rng.nextInt(8, 15); j++) {
      const cx = fieldLeft + j * (fieldRight - fieldLeft) / 14 + rng.nextFloat(-3, 3);
      const cy = ry + rng.nextFloat(-2, 2);
      elements.push(createLine(cx, cy, cx + rng.nextFloat(-2, 2), cy - rng.nextFloat(4, 8), '#388E3C', { strokeWidth: 1, layer: 1, category: 'crop', modifiable: false, opacity: 0.5 }));
    }
  }

  // ════════════════════════════════════════
  // LAYER 1: Dirt path
  // ════════════════════════════════════════
  const pathStartX = w * 0.5;
  const pathEndX = w * 0.85;
  const pathY = h * 0.72;
  const pathW = 25;
  const dirtPath = `M${pathStartX},${pathY - pathW / 2} Q${(pathStartX + pathEndX) / 2},${pathY - pathW / 2 - 8} ${pathEndX},${h * 0.65} L${pathEndX},${h * 0.65 + pathW} Q${(pathStartX + pathEndX) / 2},${pathY + pathW / 2 + 5} ${pathStartX},${pathY + pathW / 2} Z`;
  elements.push(createPath(0, 0, dirtPath, 'url(#dirtPath)', { layer: 1, category: 'path', modifiable: false }));

  // ════════════════════════════════════════
  // LAYER 2: Red Barn
  // ════════════════════════════════════════
  elements.push(barn(w * rng.nextFloat(0.62, 0.72), h * rng.nextFloat(0.52, 0.58), rng.nextFloat(65, 85), rng));

  // ════════════════════════════════════════
  // LAYER 2: Silo next to barn
  // ════════════════════════════════════════
  elements.push(silo(w * rng.nextFloat(0.78, 0.85), h * rng.nextFloat(0.52, 0.58), rng.nextFloat(55, 70), rng));

  // ════════════════════════════════════════
  // LAYER 2: Farmhouse
  // ════════════════════════════════════════
  elements.push(farmhouse(w * rng.nextFloat(0.82, 0.92), h * rng.nextFloat(0.6, 0.68), rng.nextFloat(50, 65), rng));

  // ════════════════════════════════════════
  // LAYER 2: Fence along field
  // ════════════════════════════════════════
  const fence = detailedFence(w * 0.03, h * 0.73, w * 0.5, rng.nextFloat(18, 25), rng);
  fence.modifiable = true;
  fence.id = uid('fence');
  elements.push(fence);

  // ════════════════════════════════════════
  // LAYER 2: Windmill
  // ════════════════════════════════════════
  elements.push(windmill(w * rng.nextFloat(0.15, 0.3), h * rng.nextFloat(0.48, 0.56), rng.nextFloat(50, 70), rng));

  // ════════════════════════════════════════
  // LAYER 2: Cows (2-3)
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 3); i++) {
    const cx = rng.nextFloat(w * 0.55, w * 0.9);
    const cy = rng.nextFloat(h * 0.68, h * 0.82);
    elements.push(cow(cx, cy, rng.nextFloat(35, 50), rng, rng.chance(0.5) ? 1 : -1));
  }

  // ════════════════════════════════════════
  // LAYER 2: Chickens (3-5)
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const cx = rng.nextFloat(w * 0.5, w * 0.85);
    const cy = rng.nextFloat(h * 0.7, h * 0.85);
    elements.push(chicken(cx, cy, rng.nextFloat(15, 25), rng));
  }

  // ════════════════════════════════════════
  // LAYER 2: Tractor
  // ════════════════════════════════════════
  elements.push(tractor(w * rng.nextFloat(0.2, 0.4), h * rng.nextFloat(0.72, 0.8), rng.nextFloat(55, 75), rng));

  // ════════════════════════════════════════
  // LAYER 2: Scarecrow in field
  // ════════════════════════════════════════
  elements.push(scarecrow(w * rng.nextFloat(0.25, 0.45), h * rng.nextFloat(0.55, 0.65), rng.nextFloat(50, 65), rng));

  // ════════════════════════════════════════
  // LAYER 2: Hay bales (3-5)
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    elements.push(hayBale(
      rng.nextFloat(w * 0.05, w * 0.5),
      rng.nextFloat(h * 0.75, h * 0.88),
      rng.nextFloat(18, 28),
      rng,
    ));
  }

  // ════════════════════════════════════════
  // LAYER 2: Trees around buildings
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 3); i++) {
    const tree = detailedTree(rng.nextFloat(w * 0.7, w * 0.95), h * rng.nextFloat(0.55, 0.65), 'oak', rng.nextFloat(50, 70), rng);
    tree.filter = 'url(#shadow)';
    tree.modifiable = true;
    tree.id = uid('tree');
    elements.push(tree);
  }

  // ════════════════════════════════════════
  // LAYER 2: Flowers near farmhouse
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const flower = detailedFlower(rng.nextFloat(w * 0.75, w * 0.95), rng.nextFloat(h * 0.68, h * 0.76), rng.pick(['daisy', 'tulip', 'sunflower'] as const), rng.nextFloat(8, 14), rng);
    flower.modifiable = true;
    flower.id = uid('flower');
    elements.push(flower);
  }

  // ════════════════════════════════════════
  // LAYER 3: Birds
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const bird = detailedBird(rng.nextFloat(20, w - 20), rng.nextFloat(h * 0.05, h * 0.25), true, rng);
    bird.modifiable = true;
    bird.id = uid('bird');
    elements.push(bird);
  }

  // ════════════════════════════════════════
  // LAYER 3: Rocks
  // ════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const rock = detailedRock(rng.nextFloat(10, w - 10), rng.nextFloat(h * 0.6, h * 0.88), rng.nextFloat(6, 14), rng);
    rock.filter = 'url(#softShadow)';
    elements.push(rock);
  }

  // Foreground grass tufts
  for (let i = 0; i < rng.nextInt(6, 10); i++) {
    const gx = rng.nextFloat(5, w - 5);
    const gy = rng.nextFloat(h * 0.85, h - 3);
    const grassPath = `M${gx},${gy} Q${gx - 3},${gy - 10} ${gx - 5},${gy - 15} M${gx},${gy} Q${gx + 1},${gy - 12} ${gx + 4},${gy - 16} M${gx},${gy} Q${gx + 4},${gy - 8} ${gx + 7},${gy - 12}`;
    elements.push(createPath(0, 0, grassPath, 'none', {
      stroke: rng.pick(['#388E3C', '#43A047', '#2E7D32']),
      strokeWidth: 1.5, layer: 3, category: 'grass', modifiable: false, opacity: 0.6,
    }));
  }

  return { elements, defs };
}
