import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createCloud, createTree, createFlower,
  createBird, createButterfly, createMushroom, createRock, createMountain,
  createPath,
} from '../engine/primitives';

export function generateForestClearing(rng: SeededRandom, w: number, h: number): SVGElementData[] {
  const elements: SVGElementData[] = [];

  // Sky gradient
  elements.push(createRect(0, 0, w, h * 0.55, '#87CEEB', { layer: 0, category: 'sky', modifiable: false }));
  elements.push(createRect(0, h * 0.35, w, h * 0.2, '#A8D8EA', { layer: 0, category: 'sky', modifiable: false, opacity: 0.5 }));

  // Clouds
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(createCloud(rng.nextFloat(30, w - 80), rng.nextFloat(20, h * 0.2), rng.nextFloat(40, 70), rng));
  }

  // Distant mountains
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(createMountain(rng.nextFloat(-50, w * 0.7), h * 0.55, rng.nextFloat(200, 350), rng.nextFloat(80, 150), rng));
  }

  // Ground - grass
  const groundPath = `M0,${h * 0.55} Q${w * 0.25},${h * 0.52} ${w * 0.5},${h * 0.54} Q${w * 0.75},${h * 0.56} ${w},${h * 0.53} L${w},${h} L0,${h} Z`;
  elements.push(createPath(0, 0, groundPath, '#4CAF50', { layer: 1, category: 'ground', modifiable: false }));
  elements.push(createRect(0, h * 0.7, w, h * 0.3, '#3E8E41', { layer: 1, category: 'ground', modifiable: false }));

  // Stream (optional)
  if (rng.chance(0.5)) {
    const streamPath = `M${w * 0.3},${h * 0.55} Q${w * 0.35},${h * 0.65} ${w * 0.4},${h * 0.7} Q${w * 0.5},${h * 0.78} ${w * 0.6},${h * 0.85} Q${w * 0.7},${h * 0.92} ${w * 0.8},${h}`;
    elements.push(createPath(0, 0, streamPath, 'none', { stroke: '#64B5F6', strokeWidth: 12, layer: 1, category: 'stream', modifiable: true, opacity: 0.7 }));
    elements.push(createPath(0, 0, streamPath, 'none', { stroke: '#90CAF9', strokeWidth: 6, layer: 1, category: 'stream', modifiable: false, opacity: 0.5 }));
  }

  // Background trees (darker, smaller)
  for (let i = 0; i < rng.nextInt(4, 7); i++) {
    const tx = rng.nextFloat(20, w - 40);
    elements.push(createTree(tx, h * 0.55, rng.pick(['pine', 'oak', 'willow']), rng.nextFloat(80, 130), rng));
  }

  // Rocks
  for (let i = 0; i < rng.nextInt(2, 5); i++) {
    elements.push(createRock(rng.nextFloat(50, w - 50), rng.nextFloat(h * 0.6, h * 0.85), rng.nextFloat(15, 30), rng));
  }

  // Log
  if (rng.chance(0.6)) {
    const lx = rng.nextFloat(100, w - 200);
    const ly = rng.nextFloat(h * 0.65, h * 0.8);
    elements.push(createRect(lx, ly, 80, 15, '#8B6914', { layer: 2, category: 'log', modifiable: true, stroke: '#6B3410', strokeWidth: 1 }));
    elements.push(createCircle(lx, ly + 7, 8, '#A0522D', { layer: 2, category: 'log', modifiable: false }));
    elements.push(createCircle(lx + 80, ly + 7, 8, '#A0522D', { layer: 2, category: 'log', modifiable: false }));
  }

  // Flowers
  for (let i = 0; i < rng.nextInt(4, 8); i++) {
    elements.push(createFlower(rng.nextFloat(30, w - 30), rng.nextFloat(h * 0.6, h * 0.92), rng.pick(['daisy', 'tulip', 'rose', 'sunflower']), rng.nextFloat(20, 35), rng));
  }

  // Mushrooms
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    elements.push(createMushroom(rng.nextFloat(50, w - 50), rng.nextFloat(h * 0.7, h * 0.9), rng.nextFloat(15, 25), rng));
  }

  // Animals
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    elements.push(createBird(rng.nextFloat(50, w - 50), rng.nextFloat(30, h * 0.35), true, rng));
  }
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    elements.push(createButterfly(rng.nextFloat(80, w - 80), rng.nextFloat(h * 0.4, h * 0.7), rng.nextFloat(12, 20), rng));
  }

  // Foreground grass tufts
  for (let i = 0; i < 8; i++) {
    const gx = rng.nextFloat(0, w);
    const gy = rng.nextFloat(h * 0.85, h * 0.98);
    const grassPath = `M${gx},${gy} L${gx - 3},${gy - 12} M${gx},${gy} L${gx + 2},${gy - 15} M${gx},${gy} L${gx + 5},${gy - 10}`;
    elements.push(createPath(gx, gy, grassPath, 'none', { stroke: '#2E7D32', strokeWidth: 2, layer: 4, category: 'grass', modifiable: false }));
  }

  // Sun
  elements.push(createCircle(w * 0.85, h * 0.1, 30, '#FFD700', { layer: 0, category: 'sun', modifiable: true, opacity: 0.9 }));

  return elements;
}
