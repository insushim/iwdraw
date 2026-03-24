import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createPath, createCoral,
  createSeaweed, createFish, createRock,
} from '../engine/primitives';

export function generateUnderwaterReef(rng: SeededRandom, w: number, h: number): SVGElementData[] {
  const elements: SVGElementData[] = [];

  // Water background gradient (dark at top, lighter at bottom)
  elements.push(createRect(0, 0, w, h * 0.3, '#0A1929', { layer: 0, category: 'water', modifiable: false }));
  elements.push(createRect(0, h * 0.3, w, h * 0.3, '#0D47A1', { layer: 0, category: 'water', modifiable: false, opacity: 0.8 }));
  elements.push(createRect(0, h * 0.6, w, h * 0.2, '#1565C0', { layer: 0, category: 'water', modifiable: false, opacity: 0.7 }));

  // Light rays from surface
  for (let i = 0; i < rng.nextInt(3, 5); i++) {
    const rx = rng.nextFloat(w * 0.1, w * 0.9);
    const rayPath = `M${rx},0 L${rx - 30},${h * 0.6} L${rx + 20},${h * 0.6} L${rx + 10},0 Z`;
    elements.push(createPath(0, 0, rayPath, '#4FC3F7', { layer: 0, category: 'light', modifiable: false, opacity: 0.08 }));
  }

  // Sandy bottom
  const sandPath = `M0,${h * 0.8} Q${w * 0.2},${h * 0.78} ${w * 0.4},${h * 0.82} Q${w * 0.6},${h * 0.77} ${w * 0.8},${h * 0.81} Q${w * 0.9},${h * 0.79} ${w},${h * 0.8} L${w},${h} L0,${h} Z`;
  elements.push(createPath(0, 0, sandPath, '#F0E68C', { layer: 1, category: 'sand', modifiable: false, opacity: 0.6 }));

  // Rocks on bottom
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    elements.push(createRock(rng.nextFloat(20, w - 20), rng.nextFloat(h * 0.78, h * 0.92), rng.nextFloat(20, 45), rng));
  }

  // Coral formations
  for (let i = 0; i < rng.nextInt(4, 8); i++) {
    elements.push(createCoral(rng.nextFloat(30, w - 30), rng.nextFloat(h * 0.7, h * 0.95), rng.nextFloat(30, 60), rng));
  }

  // Seaweed
  for (let i = 0; i < rng.nextInt(5, 10); i++) {
    elements.push(createSeaweed(rng.nextFloat(20, w - 20), h * rng.nextFloat(0.85, 0.98), rng.nextFloat(50, 120), rng));
  }

  // Fish schools
  for (let i = 0; i < rng.nextInt(6, 12); i++) {
    elements.push(createFish(rng.nextFloat(30, w - 30), rng.nextFloat(h * 0.15, h * 0.75), rng.nextFloat(15, 30), rng));
  }

  // Jellyfish
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    const jx = rng.nextFloat(50, w - 50);
    const jy = rng.nextFloat(h * 0.1, h * 0.5);
    const jSize = rng.nextFloat(15, 25);
    const jColor = rng.pick(['#E040FB', '#FF80AB', '#B388FF', '#82B1FF']);
    // Bell
    const bellPath = `M${jx - jSize},${jy} Q${jx - jSize},${jy - jSize * 1.2} ${jx},${jy - jSize * 1.3} Q${jx + jSize},${jy - jSize * 1.2} ${jx + jSize},${jy} Z`;
    elements.push(createPath(jx, jy, bellPath, jColor, { layer: 3, category: 'jellyfish', modifiable: true, opacity: 0.5 }));
    // Tentacles
    for (let t = 0; t < 4; t++) {
      const tx = jx - jSize * 0.6 + t * jSize * 0.4;
      const tentacle = `M${tx},${jy} Q${tx + rng.nextFloat(-10, 10)},${jy + jSize} ${tx + rng.nextFloat(-5, 5)},${jy + jSize * 1.5}`;
      elements.push(createPath(jx, jy, tentacle, 'none', { stroke: jColor, strokeWidth: 1.5, layer: 3, category: 'jellyfish', modifiable: false, opacity: 0.4 }));
    }
  }

  // Bubbles
  for (let i = 0; i < rng.nextInt(8, 15); i++) {
    const bSize = rng.nextFloat(3, 10);
    elements.push(createCircle(
      rng.nextFloat(10, w - 10),
      rng.nextFloat(h * 0.1, h * 0.8),
      bSize,
      '#B3E5FC',
      { layer: 4, category: 'bubble', modifiable: true, opacity: rng.nextFloat(0.2, 0.5) }
    ));
  }

  // Shells on sand
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    const sx = rng.nextFloat(50, w - 50);
    const sy = rng.nextFloat(h * 0.82, h * 0.95);
    const shellColor = rng.pick(['#FFF8E1', '#FFCCBC', '#F8BBD0', '#CFD8DC']);
    const shellPath = `M${sx},${sy} Q${sx - 8},${sy - 10} ${sx},${sy - 12} Q${sx + 8},${sy - 10} ${sx},${sy} Z`;
    elements.push(createPath(sx, sy, shellPath, shellColor, { layer: 3, category: 'shell', modifiable: true }));
  }

  // Starfish
  if (rng.chance(0.6)) {
    const stx = rng.nextFloat(80, w - 80);
    const sty = rng.nextFloat(h * 0.85, h * 0.95);
    const stColor = rng.pick(['#FF7043', '#FFB74D', '#FF8A80']);
    let starD = '';
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 12 : 5;
      const angle = (i * Math.PI / 5) - Math.PI / 2;
      const px = stx + Math.cos(angle) * r;
      const py = sty + Math.sin(angle) * r;
      starD += `${i === 0 ? 'M' : 'L'}${px},${py} `;
    }
    starD += 'Z';
    elements.push(createPath(stx, sty, starD, stColor, { layer: 3, category: 'starfish', modifiable: true }));
  }

  return elements;
}
