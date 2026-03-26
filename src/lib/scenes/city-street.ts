import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import { createRect, createCircle, createEllipse, createPath, createLine, createGroup } from '../engine/primitives';
import {
  combineDefs, outdoorDefs, skyGradient, linearGradient, radialGradient,
  lampGlowGradient, groundGradient, brickPattern,
} from './svg-effects';
import {
  detailedTree, detailedCloud, detailedRock, detailedBird,
  detailedPerson, detailedHouse, detailedLamp, detailedBench,
  detailedFlower, resetComponentId,
} from './svg-components';

let _uid = 0;
function uid(p = 'cs') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

export function generateCityStreet(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];
  const timeOfDay = rng.pick(['day', 'sunset', 'night'] as const);

  // === Color palette ===
  const skyColors: Record<string, [string, string, string]> = {
    day: ['#4A90D9', '#7AB8E0', '#B0D4F1'],
    sunset: ['#1A1040', '#C44D2C', '#FFB347'],
    night: ['#0A0A20', '#151540', '#1E2060'],
  };
  const [skyTop, skyMid, skyBot] = skyColors[timeOfDay];

  // === SVG Defs ===
  const defs = combineDefs(
    outdoorDefs(),
    skyGradient('skyGrad', skyTop, skyMid, skyBot),
    linearGradient('roadGrad', [
      { offset: '0%', color: '#3A3A3A' },
      { offset: '100%', color: '#2A2A2A' },
    ]),
    linearGradient('sidewalkGrad', [
      { offset: '0%', color: '#C0B8A8' },
      { offset: '100%', color: '#A89888' },
    ]),
    lampGlowGradient('streetGlow', '#FFD54F'),
    groundGradient('parkGrad', '#4A7C3F', '#2D5A27'),
    brickPattern('brickPat'),
  );

  // ════════════════════════════════════════════
  //  LAYER 0 — Sky
  // ════════════════════════════════════════════
  elements.push(createRect(0, 0, w, h * 0.55, 'url(#skyGrad)', { layer: 0, category: 'sky', modifiable: false }));

  // Clouds or stars/moon
  if (timeOfDay !== 'night') {
    for (let i = 0; i < rng.nextInt(3, 6); i++) {
      elements.push(detailedCloud(rng.nextFloat(20, w - 80), rng.nextFloat(20, h * 0.2), rng.nextFloat(45, 85), rng));
    }
  } else {
    // Stars
    for (let i = 0; i < rng.nextInt(25, 40); i++) {
      const sx = rng.nextFloat(10, w - 10);
      const sy = rng.nextFloat(5, h * 0.3);
      const sr = rng.nextFloat(0.5, 2);
      elements.push(createCircle(sx, sy, sr, rng.pick(['#FFF', '#FFFDE0', '#E0E8FF']), {
        layer: 0, category: 'star', modifiable: false, opacity: rng.nextFloat(0.3, 1),
      }));
    }
    // Moon
    const moonX = w * 0.82;
    const moonY = h * 0.1;
    const moonR = 22;
    const moonD = `M${moonX},${moonY - moonR} A${moonR},${moonR} 0 1,1 ${moonX},${moonY + moonR} A${moonR * 0.7},${moonR} 0 1,0 ${moonX},${moonY - moonR} Z`;
    elements.push(createPath(moonX, moonY, moonD, '#FFF8DC', { layer: 0, category: 'moon', modifiable: true, id: uid('moon'), opacity: 0.9 }));
    elements.push(createCircle(moonX, moonY, moonR * 2, '#FFF8DC', { layer: 0, category: 'moon', modifiable: false, opacity: 0.06 }));
  }

  // ════════════════════════════════════════════
  //  LAYER 1 — Far buildings silhouette (8-12)
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(8, 12); i++) {
    const bx = i * (w / 10) + rng.nextFloat(-10, 10);
    const bh = rng.nextFloat(60, 160);
    const bw = rng.nextFloat(35, 65);
    const shade = timeOfDay === 'night' ? '#0D0D1A' : rng.nextHSL([200, 240], [10, 25], [45, 60]);
    elements.push(createRect(bx, h * 0.55 - bh, bw, bh, shade, {
      layer: 1, category: 'building', modifiable: false, filter: 'url(#bgBlur)',
    }));
    // Windows
    if (timeOfDay === 'night' || timeOfDay === 'sunset') {
      for (let wy = 8; wy < bh - 10; wy += 15) {
        for (let wx = 5; wx < bw - 8; wx += 12) {
          if (rng.chance(0.55)) {
            elements.push(createRect(bx + wx, h * 0.55 - bh + wy, 5, 7, '#FFD54F', {
              layer: 1, category: 'window', modifiable: true, opacity: rng.nextFloat(0.3, 0.85), id: uid('win'),
            }));
          }
        }
      }
    }
  }

  // ════════════════════════════════════════════
  //  LAYER 1 — Sidewalk, road structure
  // ════════════════════════════════════════════

  // Sidewalk top
  elements.push(createRect(0, h * 0.52, w, h * 0.13, 'url(#sidewalkGrad)', { layer: 1, category: 'sidewalk', modifiable: false }));
  // Curb
  elements.push(createRect(0, h * 0.65, w, 3, '#888', { layer: 1, category: 'curb', modifiable: false }));

  // Road
  elements.push(createRect(0, h * 0.653, w, h * 0.17, 'url(#roadGrad)', { layer: 1, category: 'road', modifiable: false }));
  // Center line dashes
  for (let lx = 15; lx < w; lx += 45) {
    elements.push(createRect(lx, h * 0.735, 22, 3, '#FFD740', { layer: 1, category: 'roadline', modifiable: false, opacity: 0.7 }));
  }
  // Edge lines
  elements.push(createRect(0, h * 0.66, w, 2, '#FFF', { layer: 1, category: 'roadline', modifiable: false, opacity: 0.3 }));
  elements.push(createRect(0, h * 0.82, w, 2, '#FFF', { layer: 1, category: 'roadline', modifiable: false, opacity: 0.3 }));

  // Sidewalk bottom
  elements.push(createRect(0, h * 0.823, w, h * 0.177, 'url(#sidewalkGrad)', { layer: 1, category: 'sidewalk', modifiable: false }));
  // Curb bottom
  elements.push(createRect(0, h * 0.823, w, 3, '#888', { layer: 1, category: 'curb', modifiable: false }));

  // ════════════════════════════════════════════
  //  LAYER 2 — Near buildings
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const bx = 30 + i * rng.nextFloat(180, 250);
    elements.push(detailedHouse(bx, h * 0.52, rng.nextFloat(100, 145), rng.nextFloat(90, 140), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Street lamps with glow
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const lx = 80 + i * rng.nextFloat(180, 280);
    const lampEl = detailedLamp(lx, h * 0.52, rng.nextFloat(60, 80), rng);
    elements.push(lampEl);
    if (timeOfDay === 'night' || timeOfDay === 'sunset') {
      elements.push(createCircle(lx, h * 0.52 - 55, 40, 'url(#streetGlow)', {
        layer: 2, category: 'glow', modifiable: false, opacity: 0.6,
      }));
    }
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Street trees
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const treeEl = detailedTree(rng.nextFloat(30, w - 60), h * 0.52, rng.pick(['oak', 'cherry']), rng.nextFloat(60, 95), rng);
    elements.push(treeEl);
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Cars on road
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const cx = rng.nextFloat(50, w - 100);
    const cy = h * 0.78;
    const carColor = rng.nextColor([0, 360], [50, 80], [40, 60]);
    const carW = rng.nextFloat(50, 70);
    const carH = rng.nextFloat(18, 25);
    const children: SVGElementData[] = [];
    // Body
    children.push(createRect(cx, cy, carW, carH, carColor, { layer: 2 }));
    // Roof/cabin
    children.push(createRect(cx + carW * 0.2, cy - carH * 0.6, carW * 0.55, carH * 0.6, carColor, { layer: 2, opacity: 0.85 }));
    // Windows
    children.push(createRect(cx + carW * 0.22, cy - carH * 0.55, carW * 0.22, carH * 0.45, '#AAD4F5', { layer: 2, opacity: 0.7 }));
    children.push(createRect(cx + carW * 0.48, cy - carH * 0.55, carW * 0.22, carH * 0.45, '#AAD4F5', { layer: 2, opacity: 0.7 }));
    // Wheels
    children.push(createCircle(cx + carW * 0.2, cy + carH, carH * 0.35, '#222', { layer: 2 }));
    children.push(createCircle(cx + carW * 0.2, cy + carH, carH * 0.15, '#666', { layer: 2 }));
    children.push(createCircle(cx + carW * 0.8, cy + carH, carH * 0.35, '#222', { layer: 2 }));
    children.push(createCircle(cx + carW * 0.8, cy + carH, carH * 0.15, '#666', { layer: 2 }));
    // Headlight / taillight
    children.push(createCircle(cx, cy + carH * 0.3, 3, '#FFD54F', { layer: 2, opacity: 0.8 }));
    children.push(createCircle(cx + carW, cy + carH * 0.3, 3, '#FF3333', { layer: 2, opacity: 0.8 }));
    elements.push(createGroup(cx, cy, children, {
      layer: 2, category: 'car', modifiable: true, id: uid('car'), filter: 'url(#shadow)',
    }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Crosswalk
  // ════════════════════════════════════════════
  const cwX = rng.nextFloat(w * 0.3, w * 0.7);
  for (let i = 0; i < 6; i++) {
    elements.push(createRect(cwX + i * 12, h * 0.66, 8, h * 0.16, '#FFF', { layer: 1, category: 'crosswalk', modifiable: false, opacity: 0.6 }));
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Traffic light
  // ════════════════════════════════════════════
  const tlX = cwX - 15;
  elements.push(createRect(tlX, h * 0.35, 6, h * 0.17, '#333', { layer: 2, category: 'signal', modifiable: false }));
  elements.push(createRect(tlX - 5, h * 0.32, 16, 28, '#222', { layer: 2, category: 'signal', modifiable: true, id: uid('tl'), filter: 'url(#shadow)' }));
  const activeLight = rng.pick(['red', 'yellow', 'green']);
  elements.push(createCircle(tlX + 3, h * 0.335, 3, activeLight === 'red' ? '#FF0000' : '#440000', { layer: 2, category: 'signal', modifiable: true, id: uid('tl') }));
  elements.push(createCircle(tlX + 3, h * 0.345, 3, activeLight === 'yellow' ? '#FFFF00' : '#444400', { layer: 2, category: 'signal', modifiable: false }));
  elements.push(createCircle(tlX + 3, h * 0.355, 3, activeLight === 'green' ? '#00FF00' : '#004400', { layer: 2, category: 'signal', modifiable: false }));

  // ════════════════════════════════════════════
  //  LAYER 3 — Pedestrians on sidewalks
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(4, 7); i++) {
    const onTop = rng.chance(0.5);
    const px = rng.nextFloat(30, w - 30);
    const py = onTop ? h * 0.6 : h * 0.88;
    elements.push(detailedPerson(px, py, rng.nextFloat(28, 38), rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Props (bench, rocks, flowers)
  // ════════════════════════════════════════════
  if (rng.chance(0.7)) {
    elements.push(detailedBench(rng.nextFloat(80, w - 80), h * 0.6, rng.nextFloat(35, 50), rng));
  }
  // Small rocks/planters near sidewalk
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(detailedRock(rng.nextFloat(20, w - 20), h * 0.91, rng.nextFloat(8, 16), rng));
  }
  // Flowers in planters
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    elements.push(detailedFlower(
      rng.nextFloat(20, w - 20),
      h * 0.53 + rng.nextFloat(-3, 3),
      rng.pick(['daisy', 'tulip', 'rose', 'sunflower']),
      rng.nextFloat(12, 20), rng,
    ));
  }

  // Manhole cover on road
  if (rng.chance(0.5)) {
    const mx = rng.nextFloat(w * 0.2, w * 0.8);
    elements.push(createCircle(mx, h * 0.75, 8, '#333', { layer: 1, category: 'manhole', modifiable: true, stroke: '#555', strokeWidth: 1.5, id: uid('mh') }));
  }

  // ════════════════════════════════════════════
  //  LAYER 4 — Birds
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(2, 5); i++) {
    elements.push(detailedBird(rng.nextFloat(30, w - 30), rng.nextFloat(20, h * 0.25), true, rng));
  }

  // ════════════════════════════════════════════
  //  LAYER 4 — Atmospheric dust particles
  // ════════════════════════════════════════════
  for (let i = 0; i < rng.nextInt(10, 20); i++) {
    elements.push(createCircle(rng.nextFloat(0, w), rng.nextFloat(0, h * 0.55), rng.nextFloat(0.3, 1.5), '#FFF', {
      layer: 4, category: 'particle', modifiable: false, opacity: rng.nextFloat(0.03, 0.12),
    }));
  }

  return { elements, defs };
}
