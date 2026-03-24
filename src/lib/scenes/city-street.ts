import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath, createCloud, createStar, createMoon,
  createTree, createHouse, createCar, createLamp, createBird,
  createPerson, createBench, createFence, createGroup,
} from '../engine/primitives';

let _uid = 0;
function uid(p = 'cs') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

export function generateCityStreet(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  const elements: SVGElementData[] = [];
  const timeOfDay = rng.pick(['day', 'sunset', 'night'] as const);

  // === SVG DEFS ===
  const skyColors: Record<string, [string, string, string]> = {
    day: ['#4A90D9', '#7AB8E0', '#B0D4F1'],
    sunset: ['#1A1040', '#C44D2C', '#FFB347'],
    night: ['#0A0A20', '#151540', '#1E2060'],
  };
  const [skyTop, skyMid, skyBot] = skyColors[timeOfDay];

  const defs = `
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${skyTop}"/>
      <stop offset="50%" stop-color="${skyMid}"/>
      <stop offset="100%" stop-color="${skyBot}"/>
    </linearGradient>
    <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3A3A3A"/>
      <stop offset="100%" stop-color="#2A2A2A"/>
    </linearGradient>
    <linearGradient id="sidewalkGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#C0B8A8"/>
      <stop offset="100%" stop-color="#A89888"/>
    </linearGradient>
    <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFD54F" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#FFD54F" stop-opacity="0"/>
    </radialGradient>
  `;

  // Sky
  elements.push(createRect(0, 0, w, h * 0.55, 'url(#skyGrad)', { layer: 0, category: 'sky', modifiable: false }));

  // Clouds or stars/moon
  if (timeOfDay !== 'night') {
    for (let i = 0; i < rng.nextInt(3, 6); i++) {
      elements.push(createCloud(rng.nextFloat(20, w - 80), rng.nextFloat(20, h * 0.2), rng.nextFloat(45, 85), rng));
    }
  } else {
    for (let i = 0; i < rng.nextInt(15, 30); i++) {
      elements.push(createStar(rng.nextFloat(10, w - 10), rng.nextFloat(5, h * 0.25), rng.nextFloat(1.5, 4), rng));
    }
    elements.push(createMoon(w * 0.82, h * 0.1, 22, rng));
  }

  // Far buildings silhouette (8-12)
  for (let i = 0; i < rng.nextInt(8, 12); i++) {
    const bx = i * (w / 10) + rng.nextFloat(-10, 10);
    const bh = rng.nextFloat(60, 160);
    const bw = rng.nextFloat(35, 65);
    const shade = timeOfDay === 'night' ? '#0D0D1A' : rng.nextHSL([200, 240], [10, 25], [45, 60]);
    elements.push(createRect(bx, h * 0.55 - bh, bw, bh, shade, { layer: 1, category: 'building', modifiable: false }));
    // Windows
    if (timeOfDay === 'night' || timeOfDay === 'sunset') {
      for (let wy = 8; wy < bh - 10; wy += 15) {
        for (let wx = 5; wx < bw - 8; wx += 12) {
          if (rng.chance(0.55)) {
            elements.push(createRect(bx + wx, h * 0.55 - bh + wy, 5, 7, '#FFD54F', {
              layer: 1, category: 'window', modifiable: true, opacity: rng.nextFloat(0.3, 0.85),
            }));
          }
        }
      }
    }
  }

  // Sidewalk top
  elements.push(createRect(0, h * 0.52, w, h * 0.13, 'url(#sidewalkGrad)', { layer: 1, category: 'sidewalk', modifiable: false }));
  // Curb
  elements.push(createRect(0, h * 0.65, w, 3, '#888', { layer: 1, category: 'curb', modifiable: false }));

  // Road
  elements.push(createRect(0, h * 0.653, w, h * 0.17, 'url(#roadGrad)', { layer: 1, category: 'road', modifiable: false }));
  // Center line
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

  // Near buildings (2-4)
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const bx = 30 + i * rng.nextFloat(180, 250);
    elements.push(createHouse(bx, h * 0.52, rng.pick(['modern', 'traditional', 'apartment']), rng.nextFloat(100, 145), rng));
  }

  // Street lamps with glow
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const lx = 80 + i * rng.nextFloat(180, 280);
    elements.push(createLamp(lx, h * 0.52, 'street', rng));
    // Glow circle
    if (timeOfDay === 'night' || timeOfDay === 'sunset') {
      elements.push(createCircle(lx, h * 0.52 - 82, 40, 'url(#lampGlow)', { layer: 2, category: 'glow', modifiable: false, opacity: 0.6 }));
    }
  }

  // Street trees
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(createTree(rng.nextFloat(30, w - 60), h * 0.52, rng.pick(['oak', 'cherry']), rng.nextFloat(60, 95), rng));
  }

  // Cars on road
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(createCar(rng.nextFloat(50, w - 100), h * 0.8, rng.pick(['sedan', 'truck', 'bus', 'sedan']), rng));
  }

  // Pedestrians on sidewalks
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    const onTop = rng.chance(0.5);
    elements.push(createPerson(rng.nextFloat(30, w - 30), onTop ? h * 0.6 : h * 0.88, rng));
  }

  // Props
  if (rng.chance(0.7)) elements.push(createBench(rng.nextFloat(80, w - 80), h * 0.6, rng));
  if (rng.chance(0.5)) elements.push(createFence(rng.nextFloat(30, w * 0.3), h * 0.54, rng.nextFloat(60, 120), rng));

  // Crosswalk
  const cwX = rng.nextFloat(w * 0.3, w * 0.7);
  for (let i = 0; i < 6; i++) {
    elements.push(createRect(cwX + i * 12, h * 0.66, 8, h * 0.16, '#FFF', { layer: 1, category: 'crosswalk', modifiable: false, opacity: 0.6 }));
  }

  // Traffic light
  const tlX = cwX - 15;
  elements.push(createRect(tlX, h * 0.35, 6, h * 0.17, '#333', { layer: 2, category: 'signal', modifiable: false }));
  elements.push(createRect(tlX - 5, h * 0.32, 16, 28, '#222', { layer: 2, category: 'signal', modifiable: true, id: uid('tl') }));
  const activeLight = rng.pick(['red', 'yellow', 'green']);
  elements.push(createCircle(tlX + 3, h * 0.335, 3, activeLight === 'red' ? '#FF0000' : '#440000', { layer: 2, category: 'signal', modifiable: true, id: uid('tl') }));
  elements.push(createCircle(tlX + 3, h * 0.345, 3, activeLight === 'yellow' ? '#FFFF00' : '#444400', { layer: 2, category: 'signal', modifiable: false }));
  elements.push(createCircle(tlX + 3, h * 0.355, 3, activeLight === 'green' ? '#00FF00' : '#004400', { layer: 2, category: 'signal', modifiable: false }));

  // Birds
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(createBird(rng.nextFloat(30, w - 30), rng.nextFloat(20, h * 0.2), true, rng));
  }

  // Manhole cover on road
  if (rng.chance(0.5)) {
    const mx = rng.nextFloat(w * 0.2, w * 0.8);
    elements.push(createCircle(mx, h * 0.75, 8, '#333', { layer: 1, category: 'manhole', modifiable: true, stroke: '#555', strokeWidth: 1.5, id: uid('mh') }));
  }

  return { elements, defs };
}
