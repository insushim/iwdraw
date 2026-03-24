import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createCloud, createStar, createMoon,
  createTree, createHouse, createCar, createLamp, createBird,
  createPerson, createBench, createFence,
} from '../engine/primitives';

export function generateCityStreet(rng: SeededRandom, w: number, h: number): SVGElementData[] {
  const elements: SVGElementData[] = [];
  const timeOfDay = rng.pick(['day', 'sunset', 'night'] as const);

  // Sky
  const skyColors: Record<string, string> = {
    day: '#87CEEB',
    sunset: '#FF7F50',
    night: '#191970',
  };
  elements.push(createRect(0, 0, w, h * 0.6, skyColors[timeOfDay], { layer: 0, category: 'sky', modifiable: false }));

  // Clouds or stars
  if (timeOfDay !== 'night') {
    for (let i = 0; i < rng.nextInt(2, 5); i++) {
      elements.push(createCloud(rng.nextFloat(50, w - 100), rng.nextFloat(30, h * 0.2), rng.nextFloat(40, 80), rng));
    }
  } else {
    for (let i = 0; i < rng.nextInt(10, 20); i++) {
      elements.push(createStar(rng.nextFloat(20, w - 20), rng.nextFloat(10, h * 0.25), rng.nextFloat(2, 5), rng));
    }
    elements.push(createMoon(w * 0.8, h * 0.12, 25, rng));
  }

  // Far buildings silhouette
  for (let i = 0; i < rng.nextInt(5, 9); i++) {
    const bx = i * (w / 8) + rng.nextFloat(-10, 10);
    const bh = rng.nextFloat(60, 140);
    const bw = rng.nextFloat(40, 70);
    const shade = timeOfDay === 'night' ? '#1a1a2e' : rng.nextHSL([200, 230], [10, 25], [50, 65]);
    elements.push(createRect(bx, h * 0.6 - bh, bw, bh, shade, { layer: 1, category: 'building', modifiable: false }));
    if (timeOfDay === 'night') {
      for (let wy = 0; wy < bh - 15; wy += 18) {
        for (let wx = 8; wx < bw - 8; wx += 14) {
          if (rng.chance(0.5)) {
            elements.push(createRect(bx + wx, h * 0.6 - bh + wy + 5, 6, 8, '#FFD700', { layer: 1, category: 'window', modifiable: true, opacity: rng.nextFloat(0.4, 0.9) }));
          }
        }
      }
    }
  }

  // Sidewalk top
  elements.push(createRect(0, h * 0.55, w, h * 0.12, '#B0B0B0', { layer: 1, category: 'sidewalk', modifiable: false }));
  // Road
  elements.push(createRect(0, h * 0.67, w, h * 0.16, '#444', { layer: 1, category: 'road', modifiable: false }));
  // Road center lines
  for (let lx = 20; lx < w; lx += 50) {
    elements.push(createRect(lx, h * 0.748, 25, 3, '#FFD700', { layer: 1, category: 'roadline', modifiable: false, opacity: 0.8 }));
  }
  // Sidewalk bottom
  elements.push(createRect(0, h * 0.83, w, h * 0.17, '#B0B0B0', { layer: 1, category: 'sidewalk', modifiable: false }));

  // Near buildings
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const bx = 50 + i * rng.nextFloat(180, 250);
    elements.push(createHouse(bx, h * 0.6, rng.pick(['modern', 'traditional', 'apartment']), rng.nextFloat(100, 140), rng));
  }

  // Street lamps
  for (let i = 0; i < rng.nextInt(2, 3); i++) {
    elements.push(createLamp(100 + i * rng.nextFloat(200, 300), h * 0.6, 'street', rng));
  }

  // Street trees
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    elements.push(createTree(rng.nextFloat(50, w - 80), h * 0.6, rng.pick(['oak', 'cherry']), rng.nextFloat(60, 90), rng));
  }

  // Cars
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    elements.push(createCar(rng.nextFloat(80, w - 120), h * 0.83, rng.pick(['sedan', 'truck', 'bus']), rng));
  }

  // Pedestrians
  for (let i = 0; i < rng.nextInt(2, 5); i++) {
    elements.push(createPerson(rng.nextFloat(40, w - 40), h * 0.67, rng));
  }

  // Props
  if (rng.chance(0.7)) elements.push(createBench(rng.nextFloat(100, w - 100), h * 0.68, rng));
  if (rng.chance(0.5)) elements.push(createFence(rng.nextFloat(50, w / 2), h * 0.62, rng.nextFloat(60, 120), rng));

  // Birds
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    elements.push(createBird(rng.nextFloat(50, w - 50), rng.nextFloat(30, h * 0.25), true, rng));
  }

  return elements;
}
