import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import { createRect, createCircle, createEllipse, createPath, createLine, createGroup } from '../engine/primitives';
import {
  combineDefs, outdoorDefs, skyGradient, linearGradient, radialGradient,
  groundGradient, dropShadow, gaussianBlur, softGlow,
} from './svg-effects';
import {
  detailedTree, detailedCloud, detailedRock, detailedBird,
  detailedFlower, resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'jt') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

// Helper: torii gate
function toriiGate(x: number, y: number, gateW: number, gateH: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const red = rng.pick(['#CC2222', '#BB1111', '#DD3333']);
  const darkRed = '#881111';
  const pillarW = gateW * 0.06;

  // Ground shadow
  children.push(createEllipse(x + gateW / 2, y + 3, gateW * 0.45, 5, 'rgba(0,0,0,0.12)', { layer: 1 }));

  // Left pillar
  children.push(createRect(x + gateW * 0.12 - pillarW / 2, y - gateH, pillarW, gateH, red, { layer: 2 }));
  // Right pillar
  children.push(createRect(x + gateW * 0.88 - pillarW / 2, y - gateH, pillarW, gateH, red, { layer: 2 }));

  // Pillar feet (wider bases)
  children.push(createRect(x + gateW * 0.12 - pillarW * 0.8, y - pillarW, pillarW * 1.6, pillarW, darkRed, { layer: 2 }));
  children.push(createRect(x + gateW * 0.88 - pillarW * 0.8, y - pillarW, pillarW * 1.6, pillarW, darkRed, { layer: 2 }));

  // Top beam (kasagi) - curved
  const kasagiY = y - gateH;
  const overhang = gateW * 0.1;
  const kasagiD = `M${x - overhang},${kasagiY + 3} Q${x + gateW / 2},${kasagiY - 8} ${x + gateW + overhang},${kasagiY + 3} L${x + gateW + overhang},${kasagiY + 8} Q${x + gateW / 2},${kasagiY - 3} ${x - overhang},${kasagiY + 8} Z`;
  children.push(createPath(x, kasagiY, kasagiD, red, { layer: 2 }));

  // Lower beam (nuki) - straight
  const nukiY = kasagiY + gateH * 0.25;
  children.push(createRect(x + gateW * 0.05, nukiY, gateW * 0.9, pillarW * 0.7, red, { layer: 2 }));

  // Top beam end tips (curved upwards)
  children.push(createPath(x, kasagiY, `M${x - overhang - 5},${kasagiY + 5} Q${x - overhang},${kasagiY - 2} ${x - overhang + 3},${kasagiY + 3}`, 'none', { stroke: darkRed, strokeWidth: 3, layer: 2 }));
  children.push(createPath(x, kasagiY, `M${x + gateW + overhang + 5},${kasagiY + 5} Q${x + gateW + overhang},${kasagiY - 2} ${x + gateW + overhang - 3},${kasagiY + 3}`, 'none', { stroke: darkRed, strokeWidth: 3, layer: 2 }));

  return createGroup(x, y, children, { layer: 2, category: 'torii', modifiable: true, id: uid('torii'), filter: 'url(#shadow)' });
}

// Helper: stone lantern (ishidoro)
function stoneLantern(x: number, y: number, s: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const stoneColor = '#A0A098';
  const stoneDark = '#808078';
  const stoneLight = '#C0C0B8';

  // Ground shadow
  children.push(createEllipse(x, y + 2, s * 0.25, 3, 'rgba(0,0,0,0.1)', { layer: 1 }));

  // Base
  children.push(createRect(x - s * 0.2, y - s * 0.08, s * 0.4, s * 0.08, stoneDark, { layer: 2 }));

  // Post
  children.push(createRect(x - s * 0.06, y - s * 0.45, s * 0.12, s * 0.37, stoneColor, { layer: 2 }));

  // Fire box (wider)
  children.push(createRect(x - s * 0.18, y - s * 0.6, s * 0.36, s * 0.15, stoneColor, { layer: 2 }));
  // Fire box window (opening)
  children.push(createRect(x - s * 0.08, y - s * 0.57, s * 0.16, s * 0.09, '#3A2A1A', { layer: 2 }));
  // Glow inside
  children.push(createCircle(x, y - s * 0.52, s * 0.06, '#FFD700', { layer: 2, opacity: 0.3 }));

  // Roof (kasa)
  const roofD = `M${x - s * 0.28},${y - s * 0.6} L${x},${y - s * 0.82} L${x + s * 0.28},${y - s * 0.6} Z`;
  children.push(createPath(x, y, roofD, stoneDark, { layer: 2 }));
  // Roof edge highlight
  children.push(createLine(x - s * 0.25, y - s * 0.61, x, y - s * 0.8, stoneLight, { strokeWidth: 1, layer: 2, opacity: 0.4 }));

  // Top finial
  children.push(createCircle(x, y - s * 0.85, s * 0.04, stoneColor, { layer: 2 }));

  return createGroup(x, y, children, { layer: 2, category: 'lantern', modifiable: true, id: uid('lan') });
}

// Helper: koi fish
function koiFish(x: number, y: number, s: number, rng: SeededRandom, dir: number): SVGElementData {
  const children: SVGElementData[] = [];
  const baseColor = rng.pick(['#FF4500', '#FF8C00', '#FFD700', '#FFFFFF']);
  const spotColor = rng.pick(['#FF0000', '#FF6600', '#222']);

  // Body
  const bodyD = `M${x - s * 0.4 * dir},${y} Q${x - s * 0.2 * dir},${y - s * 0.15} ${x},${y - s * 0.05} Q${x + s * 0.2 * dir},${y + s * 0.05} ${x + s * 0.35 * dir},${y} Q${x + s * 0.2 * dir},${y - s * 0.05} ${x},${y + s * 0.05} Q${x - s * 0.2 * dir},${y + s * 0.15} ${x - s * 0.4 * dir},${y} Z`;
  children.push(createPath(x, y, bodyD, baseColor, { layer: 3, opacity: 0.85 }));

  // Spots
  if (rng.chance(0.6)) {
    children.push(createCircle(x - s * 0.1 * dir, y - s * 0.02, s * 0.06, spotColor, { layer: 3, opacity: 0.6 }));
    children.push(createCircle(x + s * 0.08 * dir, y + s * 0.02, s * 0.05, spotColor, { layer: 3, opacity: 0.5 }));
  }

  // Tail
  const tailD = `M${x + s * 0.35 * dir},${y} Q${x + s * 0.5 * dir},${y - s * 0.12} ${x + s * 0.55 * dir},${y - s * 0.15} M${x + s * 0.35 * dir},${y} Q${x + s * 0.5 * dir},${y + s * 0.12} ${x + s * 0.55 * dir},${y + s * 0.15}`;
  children.push(createPath(x, y, tailD, 'none', { stroke: baseColor, strokeWidth: s * 0.04, layer: 3, opacity: 0.7 }));

  // Eye
  children.push(createCircle(x - s * 0.3 * dir, y - s * 0.03, s * 0.025, '#111', { layer: 3 }));

  return createGroup(x, y, children, { layer: 3, category: 'koi', modifiable: true, id: uid('koi') });
}

// Helper: zen garden ripple
function zenRipple(cx: number, cy: number, r: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const ringR = r + i * 8;
    children.push(createCircle(cx, cy, ringR, 'none', {
      layer: 1, stroke: '#C0B8A0', strokeWidth: 0.8, opacity: 0.3 - i * 0.05,
    }));
  }
  // Center stone
  children.push(createEllipse(cx, cy, r * 0.6, r * 0.4, '#8A8078', { layer: 1 }));

  return createGroup(cx, cy, children, { layer: 1, category: 'zen', modifiable: true, id: uid('zen') });
}

export function generateJapaneseTemple(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  // === SVG Defs ===
  const defs = combineDefs(
    outdoorDefs(),
    skyGradient('skyGrad', '#88B8E0', '#A8D0F0', '#D0E8FF'),
    groundGradient('groundGrad', '#4A7A3A', '#3A6A28'),
    linearGradient('pondGrad', [
      { offset: '0%', color: '#3A8AAA' },
      { offset: '50%', color: '#2A7090' },
      { offset: '100%', color: '#3A8AAA' },
    ]),
    linearGradient('sandGardGrad', [
      { offset: '0%', color: '#E8E0D0' },
      { offset: '100%', color: '#D8D0C0' },
    ]),
    linearGradient('woodGrad', [
      { offset: '0%', color: '#8B5E3C' },
      { offset: '100%', color: '#6B4226' },
    ]),
    linearGradient('roofGrad', [
      { offset: '0%', color: '#3A3A3A' },
      { offset: '50%', color: '#2A2A2A' },
      { offset: '100%', color: '#3A3A3A' },
    ]),
    radialGradient('pondShine', [
      { offset: '0%', color: '#FFFFFF', opacity: 0.2 },
      { offset: '100%', color: '#FFFFFF', opacity: 0 },
    ]),
    dropShadow('templeShadow', 3, 5, 4, 'rgba(0,0,0,0.2)'),
    softGlow('cherryGlow', 4, '#FFB7C5'),
    gaussianBlur('distantBlur', 2),
  );

  // ════════════════════════════════════════════
  //  LAYER 0 — Sky
  // ════════════════════════════════════════════
  elements.push(createRect(0, 0, w, h * 0.5, 'url(#skyGrad)', { layer: 0, category: 'sky', modifiable: false }));

  // Distant mountains
  const mt1D = `M0,${h * 0.42} Q${w * 0.15},${h * 0.25} ${w * 0.3},${h * 0.3} Q${w * 0.4},${h * 0.22} ${w * 0.55},${h * 0.32} L${w * 0.55},${h * 0.5} L0,${h * 0.5} Z`;
  elements.push(createPath(0, h * 0.42, mt1D, '#7A9A70', { layer: 0, category: 'mountain', modifiable: false, opacity: 0.4, filter: 'url(#distantBlur)' }));
  const mt2D = `M${w * 0.4},${h * 0.45} Q${w * 0.55},${h * 0.28} ${w * 0.7},${h * 0.35} Q${w * 0.85},${h * 0.26} ${w},${h * 0.38} L${w},${h * 0.5} L${w * 0.4},${h * 0.5} Z`;
  elements.push(createPath(w * 0.4, h * 0.45, mt2D, '#6A8A60', { layer: 0, category: 'mountain', modifiable: false, opacity: 0.35, filter: 'url(#distantBlur)' }));

  // Clouds
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(detailedCloud(rng.nextFloat(30, w - 80), rng.nextFloat(15, h * 0.18), rng.nextFloat(40, 70), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 1 — Ground
  // ════════════════════════════════════════════
  elements.push(createRect(0, h * 0.48, w, h * 0.52, 'url(#groundGrad)', { layer: 1, category: 'ground', modifiable: false }));

  // Zen garden area (left side)
  elements.push(createEllipse(w * 0.18, h * 0.72, 110, 55, 'url(#sandGardGrad)', { layer: 1, category: 'garden', modifiable: false }));
  // Raked lines
  for (let r = 0; r < 8; r++) {
    const ry = h * 0.72 - 40 + r * 10;
    elements.push(createPath(0, ry,
      `M${w * 0.08},${ry} Q${w * 0.14},${ry + rng.nextFloat(-2, 2)} ${w * 0.18},${ry} Q${w * 0.22},${ry + rng.nextFloat(-2, 2)} ${w * 0.28},${ry}`,
      'none', { layer: 1, category: 'garden', modifiable: false, stroke: '#C8C0A8', strokeWidth: 0.6, opacity: 0.4 }));
  }
  // Zen rocks with ripples
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const zx = w * 0.12 + rng.nextFloat(0, w * 0.12);
    const zy = h * 0.68 + rng.nextFloat(0, 15);
    elements.push(zenRipple(zx, zy, rng.nextFloat(5, 10), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Temple building
  // ════════════════════════════════════════════
  const templeX = w * 0.35;
  const templeY = h * 0.48;
  const templeW = 220;
  const templeH = 150;
  const templeChildren: SVGElementData[] = [];

  // Raised platform
  templeChildren.push(createRect(templeX - 15, templeY - 8, templeW + 30, 12, '#888', { layer: 2 }));
  templeChildren.push(createRect(templeX - 10, templeY - 14, templeW + 20, 8, '#999', { layer: 2 }));

  // Temple body (wood)
  templeChildren.push(createRect(templeX, templeY - templeH * 0.55, templeW, templeH * 0.42, 'url(#woodGrad)', { layer: 2 }));

  // Pillars
  const pillarCount = 6;
  for (let p = 0; p < pillarCount; p++) {
    const px = templeX + p * (templeW / (pillarCount - 1));
    templeChildren.push(createRect(px - 3, templeY - templeH * 0.55, 6, templeH * 0.42, '#7A4A2A', { layer: 2, opacity: 0.8 }));
  }

  // Doors/panels
  templeChildren.push(createRect(templeX + templeW * 0.35, templeY - templeH * 0.5, templeW * 0.12, templeH * 0.36, '#5A3A1A', { layer: 2 }));
  templeChildren.push(createRect(templeX + templeW * 0.53, templeY - templeH * 0.5, templeW * 0.12, templeH * 0.36, '#5A3A1A', { layer: 2 }));

  // Shoji screen (paper panels)
  templeChildren.push(createRect(templeX + 10, templeY - templeH * 0.48, templeW * 0.25, templeH * 0.34, '#F5F0E0', { layer: 2, opacity: 0.7 }));
  // Grid lines on shoji
  for (let sg = 0; sg < 3; sg++) {
    templeChildren.push(createLine(templeX + 10 + sg * templeW * 0.08, templeY - templeH * 0.48, templeX + 10 + sg * templeW * 0.08, templeY - templeH * 0.14, '#C0B8A0', { strokeWidth: 0.5, layer: 2, opacity: 0.5 }));
  }

  // Main roof - curved (irimoya)
  const roofOverhang = 30;
  const roofD = `M${templeX - roofOverhang},${templeY - templeH * 0.55} ` +
    `Q${templeX - roofOverhang - 5},${templeY - templeH * 0.58} ${templeX - roofOverhang - 8},${templeY - templeH * 0.56} ` +
    `Q${templeX + templeW * 0.2},${templeY - templeH * 0.85} ${templeX + templeW * 0.5},${templeY - templeH} ` +
    `Q${templeX + templeW * 0.8},${templeY - templeH * 0.85} ${templeX + templeW + roofOverhang + 8},${templeY - templeH * 0.56} ` +
    `Q${templeX + templeW + roofOverhang + 5},${templeY - templeH * 0.58} ${templeX + templeW + roofOverhang},${templeY - templeH * 0.55} Z`;
  templeChildren.push(createPath(templeX, templeY, roofD, 'url(#roofGrad)', { layer: 2 }));

  // Roof ridge ornament
  templeChildren.push(createCircle(templeX + templeW * 0.5, templeY - templeH + 2, 5, '#DAA520', { layer: 2 }));

  // Roof tile lines
  for (let t = 1; t <= 3; t++) {
    const tY = templeY - templeH * (0.55 + t * 0.11);
    const tLeft = templeX - roofOverhang + t * 25;
    const tRight = templeX + templeW + roofOverhang - t * 25;
    templeChildren.push(createLine(tLeft, tY, tRight, tY, '#222', { strokeWidth: 0.8, layer: 2, opacity: 0.3 }));
  }

  elements.push(createGroup(templeX, templeY, templeChildren, {
    layer: 2, category: 'temple', modifiable: true, id: uid('temple'), filter: 'url(#templeShadow)',
  }));

  // ════════════════════════════════════════════
  //  LAYER 2 — Torii gate
  // ════════════════════════════════════════════
  const toriiX = rng.nextFloat(w * 0.05, w * 0.2);
  const toriiY = h * 0.52;
  elements.push(toriiGate(toriiX, toriiY, rng.nextFloat(60, 80), rng.nextFloat(60, 80), rng));

  // Stone path leading to torii
  for (let sp = 0; sp < rng.nextInt(5, 8); sp++) {
    const spx = toriiX + 30 + sp * rng.nextFloat(15, 25);
    const spy = toriiY + sp * rng.nextFloat(4, 8);
    elements.push(createEllipse(spx, spy, rng.nextFloat(6, 10), rng.nextFloat(3, 5), '#8A8078', {
      layer: 1, category: 'stone', modifiable: false, opacity: 0.7,
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Cherry blossom trees
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const tx = rng.nextFloat(20, w - 40);
    const ty = h * 0.50 + rng.nextFloat(-5, 10);
    elements.push(detailedTree(tx, ty, 'cherry', rng.nextFloat(55, 90), rng));
  }

  // Falling petals
  for (let i = 0; i < rng.nextInt(10, 20); i++) {
    const px = rng.nextFloat(10, w - 10);
    const py = rng.nextFloat(h * 0.1, h * 0.55);
    const petalD = `M${px},${py} Q${px - 3},${py - 2} ${px - 1},${py - 4} Q${px + 2},${py - 3} ${px},${py} Z`;
    elements.push(createPath(px, py, petalD, rng.pick(['#FFB7C5', '#FFC0CB', '#FFD1DC']), {
      layer: 4, category: 'petal', modifiable: false, opacity: rng.nextFloat(0.3, 0.7),
      rotation: rng.nextFloat(0, 360),
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Stone lanterns
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const lx = rng.nextFloat(40, w - 40);
    const ly = h * 0.52 + rng.nextFloat(0, 10);
    elements.push(stoneLantern(lx, ly, rng.nextFloat(28, 40), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Koi pond
  // ════════════════════════════════════════════
  const pondCX = w * 0.72;
  const pondCY = h * 0.68;
  const pondRX = rng.nextFloat(60, 85);
  const pondRY = rng.nextFloat(35, 50);

  // Pond shape
  elements.push(createEllipse(pondCX, pondCY, pondRX, pondRY, 'url(#pondGrad)', {
    layer: 1, category: 'pond', modifiable: false,
  }));
  // Pond edge stones
  for (let pe = 0; pe < 12; pe++) {
    const angle = (pe / 12) * Math.PI * 2;
    const pex = pondCX + Math.cos(angle) * (pondRX + rng.nextFloat(2, 8));
    const pey = pondCY + Math.sin(angle) * (pondRY + rng.nextFloat(2, 6));
    elements.push(createEllipse(pex, pey, rng.nextFloat(5, 10), rng.nextFloat(3, 6), '#7A7068', {
      layer: 1, category: 'stone', modifiable: false, opacity: 0.7,
    }));
  }
  // Water reflection
  elements.push(createEllipse(pondCX - 15, pondCY - 8, 25, 10, 'url(#pondShine)', {
    layer: 2, category: 'reflection', modifiable: false, opacity: 0.5,
  }));
  // Lily pads
  for (let lp = 0; lp < rng.nextInt(2, 5); lp++) {
    const lpx = pondCX + rng.nextFloat(-pondRX * 0.6, pondRX * 0.6);
    const lpy = pondCY + rng.nextFloat(-pondRY * 0.5, pondRY * 0.5);
    elements.push(createCircle(lpx, lpy, rng.nextFloat(4, 8), '#3A8A3A', {
      layer: 2, category: 'lily', modifiable: true, id: uid('lily'), opacity: 0.7,
    }));
  }
  // Koi fish
  for (let k = 0; k < rng.nextInt(2, 4); k++) {
    const kx = pondCX + rng.nextFloat(-pondRX * 0.5, pondRX * 0.5);
    const ky = pondCY + rng.nextFloat(-pondRY * 0.4, pondRY * 0.4);
    elements.push(koiFish(kx, ky, rng.nextFloat(12, 20), rng, rng.chance(0.5) ? 1 : -1));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Wooden bridge over pond
  // ════════════════════════════════════════════
  const bridgeStartX = pondCX - pondRX - 10;
  const bridgeEndX = pondCX + pondRX + 10;
  const bridgeY = pondCY - 3;
  const bridgeChildren: SVGElementData[] = [];

  // Bridge arch
  const bridgeD = `M${bridgeStartX},${bridgeY + 8} Q${pondCX},${bridgeY - 18} ${bridgeEndX},${bridgeY + 8}`;
  bridgeChildren.push(createPath(bridgeStartX, bridgeY, bridgeD, 'none', { stroke: '#6B3A1A', strokeWidth: 6, layer: 2 }));
  // Railings
  bridgeChildren.push(createPath(bridgeStartX, bridgeY,
    `M${bridgeStartX + 5},${bridgeY + 2} Q${pondCX},${bridgeY - 25} ${bridgeEndX - 5},${bridgeY + 2}`,
    'none', { stroke: '#8B5A3C', strokeWidth: 2.5, layer: 2 }));
  // Railing posts
  for (let rp = 0; rp < 5; rp++) {
    const t = rp / 4;
    const rpx = bridgeStartX + 5 + t * (bridgeEndX - bridgeStartX - 10);
    const rpy = bridgeY + 5 - Math.sin(t * Math.PI) * 20;
    bridgeChildren.push(createLine(rpx, rpy + 8, rpx, rpy - 4, '#7A4A2A', { strokeWidth: 2, layer: 2, opacity: 0.8 }));
  }
  // Planks
  for (let bp = 0; bp < 8; bp++) {
    const t = bp / 7;
    const bpx = bridgeStartX + 8 + t * (bridgeEndX - bridgeStartX - 16);
    const bpy = bridgeY + 6 - Math.sin(t * Math.PI) * 18;
    bridgeChildren.push(createRect(bpx - 1, bpy, 4, 6, '#8B6E4E', { layer: 2, opacity: 0.6 }));
  }

  elements.push(createGroup(bridgeStartX, bridgeY, bridgeChildren, {
    layer: 2, category: 'bridge', modifiable: true, id: uid('bridge'), filter: 'url(#shadow)',
  }));

  // ════════════════════════════════════════════
  //  LAYER 3 — Flowers
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    elements.push(detailedFlower(rng.nextFloat(20, w - 20), h * 0.50 + rng.nextFloat(0, 8), rng.pick(['daisy', 'tulip', 'rose']), rng.nextFloat(10, 18), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Rocks
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    elements.push(detailedRock(rng.nextFloat(20, w - 20), h * 0.52 + rng.nextFloat(5, 30), rng.nextFloat(6, 14), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 4 — Birds
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(detailedBird(rng.nextFloat(40, w - 40), rng.nextFloat(20, h * 0.25), true, rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 4 — Atmospheric particles
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(8, 14); i++) {
    elements.push(createCircle(rng.nextFloat(0, w), rng.nextFloat(0, h * 0.5), rng.nextFloat(0.3, 1.2), '#FFF', {
      layer: 4, category: 'particle', modifiable: false, opacity: rng.nextFloat(0.03, 0.12),
    }));
  }

  return { elements, defs };
}
