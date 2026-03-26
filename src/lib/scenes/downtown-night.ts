import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import { createRect, createCircle, createEllipse, createPath, createLine, createGroup } from '../engine/primitives';
import {
  combineDefs, nightDefs, nightSkyGradient, linearGradient, radialGradient,
  lampGlowGradient, softGlow, dropShadow,
} from './svg-effects';
import {
  detailedStar, detailedPerson, detailedLamp, resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'dn') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

export function generateDowntownNight(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  // === SVG Defs ===
  const defs = combineDefs(
    nightDefs(),
    nightSkyGradient('skyGrad'),
    linearGradient('roadGrad', [
      { offset: '0%', color: '#1A1A24' },
      { offset: '50%', color: '#222233' },
      { offset: '100%', color: '#1A1A24' },
    ]),
    linearGradient('sidewalkGrad', [
      { offset: '0%', color: '#3A3845' },
      { offset: '100%', color: '#2E2D38' },
    ]),
    linearGradient('reflectionGrad', [
      { offset: '0%', color: '#222233', opacity: 0.9 },
      { offset: '100%', color: '#1A1A24', opacity: 0.4 },
    ]),
    lampGlowGradient('streetGlow', '#FFD54F'),
    radialGradient('neonGlow', [
      { offset: '0%', color: '#FF00FF', opacity: 0.6 },
      { offset: '100%', color: '#FF00FF', opacity: 0 },
    ]),
    radialGradient('moonGlow', [
      { offset: '0%', color: '#E8E8FF', opacity: 0.8 },
      { offset: '40%', color: '#B0B8D0', opacity: 0.3 },
      { offset: '100%', color: '#B0B8D0', opacity: 0 },
    ]),
    softGlow('neonFilter', 6, '#FF00FF'),
    softGlow('blueNeon', 6, '#00BFFF'),
    softGlow('redNeon', 5, '#FF3333'),
    dropShadow('carShadow', 3, 4, 5, 'rgba(0,0,0,0.6)'),
  );

  // ════════════════════════════════════════════
  //  LAYER 0 — Night sky
  // ════════════════════════════════════════════
  elements.push(createRect(0, 0, w, h * 0.45, 'url(#skyGrad)', { layer: 0, category: 'sky', modifiable: false }));

  // Stars
  for (let i = 0; i < rng.nextInt(30, 50); i++) {
    const sx = rng.nextFloat(10, w - 10);
    const sy = rng.nextFloat(5, h * 0.28);
    const sr = rng.nextFloat(0.4, 1.8);
    elements.push(createCircle(sx, sy, sr, rng.pick(['#FFF', '#FFFDE0', '#E0E8FF']), {
      layer: 0, category: 'star', modifiable: false, opacity: rng.nextFloat(0.3, 1),
    }));
  }

  // Detailed modifiable stars
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    elements.push(detailedStar(rng.nextFloat(30, w - 30), rng.nextFloat(10, h * 0.2), rng.nextFloat(3, 6), rng));
  }

  // Moon
  const moonX = rng.nextFloat(w * 0.7, w * 0.9);
  const moonY = rng.nextFloat(h * 0.06, h * 0.14);
  const moonR = rng.nextFloat(18, 26);
  // Moon glow
  elements.push(createCircle(moonX, moonY, moonR * 3, 'url(#moonGlow)', {
    layer: 0, category: 'glow', modifiable: false, opacity: 0.5,
  }));
  // Moon body (crescent)
  const moonD = `M${moonX},${moonY - moonR} A${moonR},${moonR} 0 1,1 ${moonX},${moonY + moonR} A${moonR * 0.65},${moonR} 0 1,0 ${moonX},${moonY - moonR} Z`;
  elements.push(createPath(moonX, moonY, moonD, '#FFF8DC', {
    layer: 0, category: 'moon', modifiable: true, id: uid('moon'), opacity: 0.95,
  }));

  // ════════════════════════════════════════════
  //  LAYER 1 — City skyline silhouette (far)
  // ════════════════════════════════════════════
  const skylineY = h * 0.45;
  for (let i = 0; i < rng.nextInt(10, 14); i++) {
    const bx = i * (w / 12) + rng.nextFloat(-8, 8);
    const bh = rng.nextFloat(80, 200);
    const bw = rng.nextFloat(30, 70);
    elements.push(createRect(bx, skylineY - bh, bw, bh, '#0D0D18', {
      layer: 1, category: 'building', modifiable: false, filter: 'url(#bgBlur)',
    }));
    // Lit windows in far buildings
    for (let wy = 10; wy < bh - 12; wy += rng.nextFloat(12, 18)) {
      for (let wx = 4; wx < bw - 6; wx += rng.nextFloat(8, 14)) {
        if (rng.chance(0.45)) {
          const winColor = rng.pick(['#FFD54F', '#FFF3B0', '#FFE082', '#FFCC80']);
          elements.push(createRect(bx + wx, skylineY - bh + wy, 4, 5, winColor, {
            layer: 1, category: 'window', modifiable: false, opacity: rng.nextFloat(0.2, 0.7),
          }));
        }
      }
    }
  }

  // ════════════════════════════════════════════
  //  LAYER 1 — Ground structure
  // ════════════════════════════════════════════
  // Sidewalk top
  elements.push(createRect(0, h * 0.42, w, h * 0.12, 'url(#sidewalkGrad)', {
    layer: 1, category: 'sidewalk', modifiable: false,
  }));
  // Curb
  elements.push(createRect(0, h * 0.54, w, 3, '#555', { layer: 1, category: 'curb', modifiable: false }));

  // Road
  elements.push(createRect(0, h * 0.543, w, h * 0.2, 'url(#roadGrad)', {
    layer: 1, category: 'road', modifiable: false,
  }));
  // Center dashes
  for (let lx = 15; lx < w; lx += 45) {
    elements.push(createRect(lx, h * 0.64, 22, 3, '#FFD740', {
      layer: 1, category: 'roadline', modifiable: false, opacity: 0.5,
    }));
  }

  // Wet road reflections
  elements.push(createRect(0, h * 0.68, w, h * 0.063, 'url(#reflectionGrad)', {
    layer: 1, category: 'reflection', modifiable: false, opacity: 0.3,
  }));
  // Puddle reflections of neon
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    const px = rng.nextFloat(50, w - 50);
    const pw = rng.nextFloat(30, 60);
    const neonColor = rng.pick(['#FF00FF', '#00BFFF', '#FF3333', '#00FF88', '#FFD700']);
    elements.push(createEllipse(px, h * 0.70, pw, 4, neonColor, {
      layer: 1, category: 'reflection', modifiable: false, opacity: rng.nextFloat(0.08, 0.2),
    }));
  }

  // Bottom curb
  elements.push(createRect(0, h * 0.743, w, 3, '#555', { layer: 1, category: 'curb', modifiable: false }));
  // Sidewalk bottom
  elements.push(createRect(0, h * 0.746, w, h * 0.254, 'url(#sidewalkGrad)', {
    layer: 1, category: 'sidewalk', modifiable: false,
  }));

  // ════════════════════════════════════════════
  //  LAYER 2 — Near buildings with neon signs
  // ════════════════════════════════════════════
  const buildingCount = rng.nextInt(3, 5);
  for (let i = 0; i < buildingCount; i++) {
    const bx = 10 + i * (w / buildingCount) + rng.nextFloat(-10, 10);
    const bw = rng.nextFloat(80, 140);
    const bh = rng.nextFloat(120, 200);
    const baseY = h * 0.42;
    const buildColor = rng.pick(['#1A1828', '#1E1E30', '#222238', '#181825']);
    const children: SVGElementData[] = [];

    // Building body
    children.push(createRect(bx, baseY - bh, bw, bh, buildColor, { layer: 2 }));
    // Building edge highlight
    children.push(createLine(bx, baseY - bh, bx, baseY, '#444', { strokeWidth: 1, layer: 2, opacity: 0.4 }));
    children.push(createLine(bx + bw, baseY - bh, bx + bw, baseY, '#333', { strokeWidth: 1, layer: 2, opacity: 0.3 }));

    // Windows (some lit)
    for (let wy = 12; wy < bh - 15; wy += rng.nextFloat(16, 22)) {
      for (let wx = 8; wx < bw - 10; wx += rng.nextFloat(14, 20)) {
        if (rng.chance(0.5)) {
          const litColor = rng.pick(['#FFD54F', '#FFF3B0', '#80C0FF', '#FFE082']);
          children.push(createRect(bx + wx, baseY - bh + wy, 7, 9, litColor, {
            layer: 2, opacity: rng.nextFloat(0.3, 0.8),
          }));
        } else {
          children.push(createRect(bx + wx, baseY - bh + wy, 7, 9, '#111', {
            layer: 2, opacity: 0.5,
          }));
        }
      }
    }

    elements.push(createGroup(bx, baseY, children, {
      layer: 2, category: 'building', modifiable: true, id: uid('bld'),
    }));

    // Neon sign on some buildings
    if (rng.chance(0.7)) {
      const signX = bx + bw * 0.15;
      const signY = baseY - bh * 0.6;
      const signW = bw * 0.7;
      const signH = rng.nextFloat(18, 28);
      const neonColor = rng.pick(['#FF00FF', '#00BFFF', '#FF3333', '#00FF88', '#FFD700']);
      const filterName = neonColor === '#FF00FF' ? 'neonFilter' : neonColor === '#00BFFF' ? 'blueNeon' : 'redNeon';

      // Sign background
      elements.push(createRect(signX, signY, signW, signH, '#111', {
        layer: 2, category: 'sign', modifiable: false, opacity: 0.8,
      }));
      // Neon outline
      elements.push(createRect(signX + 2, signY + 2, signW - 4, signH - 4, 'none', {
        layer: 2, category: 'sign', modifiable: true, id: uid('neon'),
        stroke: neonColor, strokeWidth: 2, filter: `url(#${filterName})`,
      }));
      // Neon glow circle
      elements.push(createCircle(signX + signW / 2, signY + signH / 2, signW * 0.4, neonColor, {
        layer: 2, category: 'glow', modifiable: false, opacity: 0.08,
      }));
    }
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Street lamps with glow
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const lx = 50 + i * rng.nextFloat(150, 220);
    if (lx > w - 40) continue;
    const lampEl = detailedLamp(lx, h * 0.42, rng.nextFloat(55, 75), rng);
    elements.push(lampEl);
    // Lamp glow
    elements.push(createCircle(lx, h * 0.42 - 50, 45, 'url(#streetGlow)', {
      layer: 2, category: 'glow', modifiable: false, opacity: 0.5,
    }));
    // Light cone on ground
    elements.push(createEllipse(lx, h * 0.42, 40, 8, '#FFD54F', {
      layer: 1, category: 'glow', modifiable: false, opacity: 0.12,
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Cars and taxis
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const cx = rng.nextFloat(20, w - 80);
    const cy = h * 0.68;
    const isTaxi = rng.chance(0.4);
    const carColor = isTaxi ? '#FFD700' : rng.nextColor([0, 360], [50, 80], [35, 55]);
    const carW = rng.nextFloat(50, 70);
    const carH = rng.nextFloat(16, 22);
    const facingLeft = rng.chance(0.5);
    const children: SVGElementData[] = [];

    // Car body
    const bodyD = `M${cx},${cy + carH * 0.3} L${cx},${cy} Q${cx},${cy - carH * 0.1} ${cx + 4},${cy - carH * 0.1} L${cx + carW - 4},${cy - carH * 0.1} Q${cx + carW},${cy - carH * 0.1} ${cx + carW},${cy} L${cx + carW},${cy + carH * 0.3} Z`;
    children.push(createPath(cx, cy, bodyD, carColor, { layer: 2 }));

    // Cabin
    const cabD = `M${cx + carW * 0.2},${cy - carH * 0.1} Q${cx + carW * 0.22},${cy - carH * 0.8} ${cx + carW * 0.3},${cy - carH * 0.85} L${cx + carW * 0.7},${cy - carH * 0.85} Q${cx + carW * 0.78},${cy - carH * 0.8} ${cx + carW * 0.8},${cy - carH * 0.1} Z`;
    children.push(createPath(cx, cy, cabD, carColor, { layer: 2, opacity: 0.9 }));

    // Windows
    children.push(createRect(cx + carW * 0.24, cy - carH * 0.75, carW * 0.22, carH * 0.55, '#1A2040', { layer: 2, opacity: 0.7 }));
    children.push(createRect(cx + carW * 0.52, cy - carH * 0.75, carW * 0.22, carH * 0.55, '#1A2040', { layer: 2, opacity: 0.7 }));

    // Wheels
    children.push(createCircle(cx + carW * 0.2, cy + carH * 0.35, carH * 0.32, '#111', { layer: 2 }));
    children.push(createCircle(cx + carW * 0.2, cy + carH * 0.35, carH * 0.14, '#444', { layer: 2 }));
    children.push(createCircle(cx + carW * 0.8, cy + carH * 0.35, carH * 0.32, '#111', { layer: 2 }));
    children.push(createCircle(cx + carW * 0.8, cy + carH * 0.35, carH * 0.14, '#444', { layer: 2 }));

    // Headlights (bright at night)
    const frontX = facingLeft ? cx : cx + carW;
    const rearX = facingLeft ? cx + carW : cx;
    children.push(createCircle(frontX, cy + carH * 0.1, 3.5, '#FFFF88', { layer: 2, opacity: 0.95 }));
    children.push(createCircle(frontX, cy + carH * 0.1, 12, '#FFFF88', { layer: 2, opacity: 0.1 }));
    // Taillights
    children.push(createCircle(rearX, cy + carH * 0.1, 2.5, '#FF2222', { layer: 2, opacity: 0.9 }));

    // Taxi sign on top
    if (isTaxi) {
      children.push(createRect(cx + carW * 0.4, cy - carH * 0.95, carW * 0.2, carH * 0.12, '#FFFF00', { layer: 2, opacity: 0.9 }));
    }

    elements.push(createGroup(cx, cy, children, {
      layer: 2, category: 'car', modifiable: true, id: uid('car'), filter: 'url(#carShadow)',
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Fire hydrant
  // ════════════════════════════════════════════
  if (rng.chance(0.7)) {
    const hx = rng.nextFloat(60, w - 60);
    const hy = h * 0.42;
    const hChildren: SVGElementData[] = [];
    hChildren.push(createRect(hx - 5, hy - 22, 10, 22, '#CC2222', { layer: 2 }));
    hChildren.push(createRect(hx - 7, hy - 18, 14, 4, '#AA1111', { layer: 2 }));
    hChildren.push(createEllipse(hx, hy - 22, 6, 3, '#DD3333', { layer: 2 }));
    elements.push(createGroup(hx, hy, hChildren, {
      layer: 2, category: 'hydrant', modifiable: true, id: uid('hyd'),
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Trash can
  // ════════════════════════════════════════════
  if (rng.chance(0.6)) {
    const tx = rng.nextFloat(50, w - 50);
    const ty = h * 0.42;
    const tChildren: SVGElementData[] = [];
    tChildren.push(createRect(tx - 8, ty - 30, 16, 30, '#555', { layer: 2 }));
    tChildren.push(createRect(tx - 10, ty - 32, 20, 4, '#666', { layer: 2 }));
    tChildren.push(createLine(tx - 4, ty - 20, tx - 4, ty - 6, '#444', { strokeWidth: 1, layer: 2 }));
    tChildren.push(createLine(tx + 4, ty - 20, tx + 4, ty - 6, '#444', { strokeWidth: 1, layer: 2 }));
    elements.push(createGroup(tx, ty, tChildren, {
      layer: 2, category: 'trashcan', modifiable: true, id: uid('trash'),
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Pedestrians
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(4, 7); i++) {
    const onTop = rng.chance(0.5);
    const px = rng.nextFloat(30, w - 30);
    const py = onTop ? h * 0.50 : h * 0.82;
    elements.push(detailedPerson(px, py, rng.nextFloat(25, 35), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Crosswalk
  // ════════════════════════════════════════════
  const cwX = rng.nextFloat(w * 0.3, w * 0.6);
  for (let i = 0; i < 6; i++) {
    elements.push(createRect(cwX + i * 13, h * 0.55, 8, h * 0.19, '#FFF', {
      layer: 1, category: 'crosswalk', modifiable: false, opacity: 0.35,
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Manhole covers
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    const mx = rng.nextFloat(w * 0.15, w * 0.85);
    elements.push(createCircle(mx, h * 0.65, 7, '#2A2A35', {
      layer: 1, category: 'manhole', modifiable: true, id: uid('mh'),
      stroke: '#444', strokeWidth: 1.5,
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 4 — Atmospheric particles
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(12, 20); i++) {
    elements.push(createCircle(rng.nextFloat(0, w), rng.nextFloat(0, h), rng.nextFloat(0.3, 1.2), '#FFF', {
      layer: 4, category: 'particle', modifiable: false, opacity: rng.nextFloat(0.02, 0.08),
    }));
  }

  return { elements, defs };
}
