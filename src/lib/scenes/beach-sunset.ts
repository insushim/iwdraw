import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createPath, createCloud, createTree,
  createBird, createRock,
} from '../engine/primitives';

export function generateBeachSunset(rng: SeededRandom, w: number, h: number): SVGElementData[] {
  const elements: SVGElementData[] = [];

  // Sky gradient - sunset
  elements.push(createRect(0, 0, w, h * 0.15, '#1A237E', { layer: 0, category: 'sky', modifiable: false }));
  elements.push(createRect(0, h * 0.15, w, h * 0.15, '#FF6F00', { layer: 0, category: 'sky', modifiable: false, opacity: 0.7 }));
  elements.push(createRect(0, h * 0.3, w, h * 0.15, '#FF8F00', { layer: 0, category: 'sky', modifiable: false, opacity: 0.8 }));
  elements.push(createRect(0, h * 0.4, w, h * 0.1, '#FFB300', { layer: 0, category: 'sky', modifiable: false, opacity: 0.6 }));

  // Sun
  elements.push(createCircle(w * 0.5, h * 0.35, 40, '#FF6D00', { layer: 0, category: 'sun', modifiable: true, opacity: 0.9 }));
  elements.push(createCircle(w * 0.5, h * 0.35, 50, '#FFB74D', { layer: 0, category: 'sun', modifiable: false, opacity: 0.3 }));

  // Clouds
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(createCloud(rng.nextFloat(30, w - 80), rng.nextFloat(20, h * 0.2), rng.nextFloat(40, 70), rng));
  }

  // Ocean
  elements.push(createRect(0, h * 0.48, w, h * 0.22, '#0277BD', { layer: 1, category: 'ocean', modifiable: false }));
  // Sun reflection on water
  for (let i = 0; i < 5; i++) {
    const ry = h * 0.5 + i * 12;
    elements.push(createRect(w * 0.4 - i * 15, ry, w * 0.2 + i * 30, 3, '#FFD54F', {
      layer: 1, category: 'reflection', modifiable: false, opacity: 0.4 - i * 0.06,
    }));
  }
  // Waves
  for (let i = 0; i < 4; i++) {
    const wy = h * 0.65 + i * 8;
    const wavePath = `M0,${wy} Q${w * 0.15},${wy - 4} ${w * 0.3},${wy} Q${w * 0.45},${wy + 4} ${w * 0.6},${wy} Q${w * 0.75},${wy - 4} ${w * 0.9},${wy} L${w},${wy}`;
    elements.push(createPath(0, 0, wavePath, 'none', { stroke: '#BBDEFB', strokeWidth: 2, layer: 1, category: 'wave', modifiable: false, opacity: 0.5 }));
  }

  // Beach sand
  const sandPath = `M0,${h * 0.68} Q${w * 0.3},${h * 0.66} ${w * 0.5},${h * 0.7} Q${w * 0.7},${h * 0.67} ${w},${h * 0.69} L${w},${h} L0,${h} Z`;
  elements.push(createPath(0, 0, sandPath, '#F9E4B7', { layer: 1, category: 'sand', modifiable: false }));

  // Palm trees
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    elements.push(createTree(rng.nextFloat(40, w - 60), h * 0.69, 'palm', rng.nextFloat(80, 120), rng));
  }

  // Beach umbrella
  if (rng.chance(0.7)) {
    const ux = rng.nextFloat(w * 0.2, w * 0.7);
    const uy = h * 0.7;
    elements.push(createRect(ux, uy - 60, 3, 62, '#8D6E63', { layer: 2, category: 'umbrella', modifiable: false }));
    const umbrellaColor = rng.pick(['#F44336', '#2196F3', '#FF9800', '#4CAF50']);
    const umbPath = `M${ux - 30},${uy - 58} Q${ux},${uy - 80} ${ux + 30},${uy - 58} Z`;
    elements.push(createPath(ux, uy, umbPath, umbrellaColor, { layer: 2, category: 'umbrella', modifiable: true }));
  }

  // Beach towel
  if (rng.chance(0.6)) {
    const tx = rng.nextFloat(w * 0.3, w * 0.6);
    elements.push(createRect(tx, h * 0.74, 50, 25, rng.nextColor([0, 360], [60, 80], [55, 70]), {
      layer: 2, category: 'towel', modifiable: true, rotation: rng.nextFloat(-10, 10),
    }));
  }

  // Rocks
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(createRock(rng.nextFloat(20, w - 20), rng.nextFloat(h * 0.72, h * 0.9), rng.nextFloat(15, 30), rng));
  }

  // Seashells
  for (let i = 0; i < rng.nextInt(2, 5); i++) {
    const sx = rng.nextFloat(30, w - 30);
    const sy = rng.nextFloat(h * 0.75, h * 0.9);
    elements.push(createCircle(sx, sy, rng.nextFloat(3, 6), rng.pick(['#FFF8E1', '#FFCCBC', '#F8BBD0']), {
      layer: 3, category: 'shell', modifiable: true,
    }));
  }

  // Birds in sky
  for (let i = 0; i < rng.nextInt(2, 5); i++) {
    elements.push(createBird(rng.nextFloat(40, w - 40), rng.nextFloat(h * 0.05, h * 0.3), true, rng));
  }

  // Sandcastle (optional)
  if (rng.chance(0.4)) {
    const cx = rng.nextFloat(w * 0.3, w * 0.6);
    const cy = h * 0.82;
    elements.push(createRect(cx, cy - 20, 30, 20, '#E8C170', { layer: 3, category: 'sandcastle', modifiable: true }));
    elements.push(createRect(cx + 5, cy - 30, 8, 12, '#E8C170', { layer: 3, category: 'sandcastle', modifiable: true }));
    elements.push(createRect(cx + 17, cy - 30, 8, 12, '#E8C170', { layer: 3, category: 'sandcastle', modifiable: true }));
  }

  // Boat on ocean (optional)
  if (rng.chance(0.5)) {
    const bx = rng.nextFloat(w * 0.1, w * 0.8);
    const by = h * 0.55;
    elements.push(createPath(bx, by, `M${bx},${by} L${bx - 15},${by + 10} L${bx + 25},${by + 10} Z`, '#8D6E63', { layer: 2, category: 'boat', modifiable: true }));
    elements.push(createRect(bx + 3, by - 20, 2, 22, '#5D4037', { layer: 2, category: 'boat', modifiable: false }));
    elements.push(createPath(bx, by, `M${bx + 5},${by - 18} L${bx + 5},${by - 2} L${bx + 18},${by - 10} Z`, '#FFF', { layer: 2, category: 'boat', modifiable: true }));
  }

  return elements;
}
