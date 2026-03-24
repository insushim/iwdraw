import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createPottedPlant, createBookshelf,
  createTable, createClock, createPicture, createRug, createCushion,
  createVase, createLamp,
} from '../engine/primitives';

export function generateCozyLivingRoom(rng: SeededRandom, w: number, h: number): SVGElementData[] {
  const elements: SVGElementData[] = [];
  const wallColor = rng.pick(['#F5E6D3', '#E8D5B7', '#FFF8DC', '#FAEBD7', '#F0E68C', '#D4E6B5']);
  const floorColor = rng.pick(['#DEB887', '#D2B48C', '#C4A882', '#8B7355']);

  // Wall
  elements.push(createRect(0, 0, w, h * 0.7, wallColor, { layer: 0, category: 'wall', modifiable: false }));
  // Wallpaper accent line
  elements.push(createRect(0, h * 0.35, w, 3, rng.nextHSL([30, 50], [20, 40], [60, 75]), { layer: 0, category: 'wall', modifiable: false, opacity: 0.4 }));

  // Floor
  elements.push(createRect(0, h * 0.7, w, h * 0.3, floorColor, { layer: 0, category: 'floor', modifiable: false }));
  // Floor boards
  for (let i = 0; i < 8; i++) {
    elements.push(createRect(i * (w / 8), h * 0.7, 1, h * 0.3, '#A0855A', { layer: 0, category: 'floor', modifiable: false, opacity: 0.3 }));
  }

  // Baseboard
  elements.push(createRect(0, h * 0.68, w, h * 0.03, '#F5DEB3', { layer: 1, category: 'wall', modifiable: false }));

  // Window
  const windowX = rng.nextFloat(w * 0.55, w * 0.7);
  elements.push(createRect(windowX, h * 0.08, w * 0.2, h * 0.35, '#87CEEB', { layer: 1, category: 'window', modifiable: true, stroke: '#FFF', strokeWidth: 4 }));
  elements.push(createRect(windowX + w * 0.1 - 1, h * 0.08, 2, h * 0.35, '#FFF', { layer: 1, category: 'window', modifiable: false }));
  elements.push(createRect(windowX, h * 0.08 + h * 0.175 - 1, w * 0.2, 2, '#FFF', { layer: 1, category: 'window', modifiable: false }));
  // Curtains
  const curtainColor = rng.nextColor([0, 360], [30, 60], [60, 80]);
  elements.push(createRect(windowX - 15, h * 0.05, 18, h * 0.42, curtainColor, { layer: 1, category: 'curtain', modifiable: true }));
  elements.push(createRect(windowX + w * 0.2 - 3, h * 0.05, 18, h * 0.42, curtainColor, { layer: 1, category: 'curtain', modifiable: true }));

  // Rug
  elements.push(createRug(w * 0.2, h * 0.75, w * 0.5, h * 0.15, rng));

  // Sofa
  const sofaColor = rng.pick(['#4A6741', '#8B4513', '#4169E1', '#A0522D', '#6B4226', '#CD853F']);
  const sofaX = w * 0.15;
  const sofaY = h * 0.5;
  elements.push(createRect(sofaX, sofaY, w * 0.4, h * 0.2, sofaColor, { layer: 2, category: 'sofa', modifiable: true }));
  elements.push(createRect(sofaX, sofaY - h * 0.1, w * 0.4, h * 0.1, sofaColor, { layer: 2, category: 'sofa', modifiable: false, opacity: 0.85 }));
  // Sofa arms
  elements.push(createRect(sofaX - 10, sofaY - h * 0.05, 12, h * 0.25, sofaColor, { layer: 2, category: 'sofa', modifiable: false, opacity: 0.9 }));
  elements.push(createRect(sofaX + w * 0.4 - 2, sofaY - h * 0.05, 12, h * 0.25, sofaColor, { layer: 2, category: 'sofa', modifiable: false, opacity: 0.9 }));

  // Cushions
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(createCushion(sofaX + 15 + i * 55, sofaY + 5, rng.nextFloat(25, 35), rng));
  }

  // Coffee table
  elements.push(createTable(w * 0.3, h * 0.72, w * 0.2, h * 0.1, rng));

  // Items on table
  if (rng.chance(0.7)) {
    elements.push(createVase(w * 0.35, h * 0.7, rng.nextFloat(25, 35), rng));
  }
  if (rng.chance(0.6)) {
    // Cup
    elements.push(createRect(w * 0.42, h * 0.71, 10, 8, '#FFF', { layer: 3, category: 'cup', modifiable: true, stroke: '#999', strokeWidth: 1 }));
  }
  if (rng.chance(0.5)) {
    // Remote
    elements.push(createRect(w * 0.38, h * 0.72, 20, 6, '#333', { layer: 3, category: 'remote', modifiable: true }));
  }

  // Bookshelf
  if (rng.chance(0.7)) {
    elements.push(createBookshelf(w * 0.02, h * 0.15, w * 0.12, h * 0.53, rng));
  }

  // TV or Picture
  if (rng.chance(0.5)) {
    // TV
    elements.push(createRect(w * 0.65, h * 0.25, w * 0.18, h * 0.2, '#111', { layer: 2, category: 'tv', modifiable: true }));
    elements.push(createRect(w * 0.655, h * 0.255, w * 0.17, h * 0.19, '#222', { layer: 2, category: 'tv', modifiable: false }));
    elements.push(createRect(w * 0.73, h * 0.45, w * 0.02, h * 0.05, '#333', { layer: 2, category: 'tv', modifiable: false }));
    elements.push(createRect(w * 0.69, h * 0.5, w * 0.1, h * 0.02, '#333', { layer: 2, category: 'tv', modifiable: false }));
  }

  // Wall pictures
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    elements.push(createPicture(rng.nextFloat(w * 0.2, w * 0.7), rng.nextFloat(h * 0.05, h * 0.25), rng.nextFloat(50, 70), rng.nextFloat(35, 50), rng));
  }

  // Clock
  elements.push(createClock(w * 0.5, h * 0.15, 20, rng));

  // Plants
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    elements.push(createPottedPlant(rng.nextFloat(w * 0.05, w * 0.9), h * 0.68, rng.nextFloat(30, 50), rng));
  }

  // Lamp
  elements.push(createLamp(rng.chance(0.5) ? w * 0.05 : w * 0.9, h * 0.25, 'garden', rng));

  // Cat on sofa (optional)
  if (rng.chance(0.4)) {
    const catColor = rng.pick(['#FF8C00', '#333', '#FFF', '#808080']);
    const cx = sofaX + w * 0.3;
    const cy = sofaY - 5;
    elements.push(createCircle(cx, cy - 8, 7, catColor, { layer: 3, category: 'cat', modifiable: true }));
    elements.push(createCircle(cx, cy, 10, catColor, { layer: 3, category: 'cat', modifiable: false }));
  }

  return elements;
}
