import { SVGElementData, SceneTheme } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createPath, createCloud, createTree,
  createFlower, createBird, createButterfly, createFish, createStar,
  createMoon, createMountain, createRock, createHouse, createCar,
  createLamp, createPerson, createBench, createFence, createPottedPlant,
  createBookshelf, createTable, createClock, createPicture, createRug,
  createCushion, createVase, createCoral, createSeaweed, createMushroom,
} from '../engine/primitives';

// Theme recipes: each defines layers of elements to generate
interface ThemeRecipe {
  bgColor: (rng: SeededRandom) => string;
  layers: ((rng: SeededRandom, w: number, h: number) => SVGElementData[])[];
}

const recipes: Partial<Record<SceneTheme, ThemeRecipe>> = {
  [SceneTheme.MOUNTAIN_LAKE]: {
    bgColor: () => '#87CEEB',
    layers: [
      // Sky + clouds
      (rng, w, h) => {
        const els: SVGElementData[] = [createRect(0, 0, w, h * 0.5, '#87CEEB', { layer: 0, category: 'sky', modifiable: false })];
        for (let i = 0; i < rng.nextInt(2, 4); i++) els.push(createCloud(rng.nextFloat(30, w - 80), rng.nextFloat(20, h * 0.15), rng.nextFloat(40, 60), rng));
        return els;
      },
      // Mountains
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        for (let i = 0; i < rng.nextInt(3, 5); i++) els.push(createMountain(rng.nextFloat(-80, w * 0.7), h * 0.5, rng.nextFloat(200, 400), rng.nextFloat(100, 200), rng));
        return els;
      },
      // Lake
      (rng, w, h) => {
        const lake = `M0,${h * 0.5} Q${w * 0.25},${h * 0.48} ${w * 0.5},${h * 0.5} Q${w * 0.75},${h * 0.52} ${w},${h * 0.5} L${w},${h * 0.7} Q${w * 0.5},${h * 0.72} 0,${h * 0.7} Z`;
        return [createPath(0, 0, lake, '#4FC3F7', { layer: 1, category: 'lake', modifiable: true, opacity: 0.7 })];
      },
      // Shore + trees
      (rng, w, h) => {
        const els: SVGElementData[] = [createRect(0, h * 0.68, w, h * 0.32, '#4CAF50', { layer: 1, category: 'ground', modifiable: false })];
        for (let i = 0; i < rng.nextInt(3, 6); i++) els.push(createTree(rng.nextFloat(20, w - 40), h * 0.68, rng.pick(['pine', 'oak']), rng.nextFloat(60, 100), rng));
        for (let i = 0; i < rng.nextInt(2, 4); i++) els.push(createRock(rng.nextFloat(30, w - 30), rng.nextFloat(h * 0.72, h * 0.9), rng.nextFloat(15, 30), rng));
        return els;
      },
      // Details
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        for (let i = 0; i < rng.nextInt(2, 5); i++) els.push(createFlower(rng.nextFloat(30, w - 30), rng.nextFloat(h * 0.75, h * 0.95), rng.pick(['daisy', 'tulip']), rng.nextFloat(15, 25), rng));
        for (let i = 0; i < rng.nextInt(1, 3); i++) els.push(createBird(rng.nextFloat(50, w - 50), rng.nextFloat(20, h * 0.3), true, rng));
        els.push(createCircle(w * 0.85, h * 0.08, 28, '#FFD700', { layer: 0, category: 'sun', modifiable: true, opacity: 0.9 }));
        return els;
      },
    ],
  },

  [SceneTheme.CHERRY_BLOSSOM]: {
    bgColor: () => '#FFE4E1',
    layers: [
      (rng, w, h) => [createRect(0, 0, w, h * 0.55, '#FFB7C5', { layer: 0, category: 'sky', modifiable: false, opacity: 0.4 }), createRect(0, 0, w, h * 0.3, '#87CEEB', { layer: 0, category: 'sky', modifiable: false })],
      (rng, w, h) => {
        const els: SVGElementData[] = [createRect(0, h * 0.55, w, h * 0.45, '#8FBC8F', { layer: 1, category: 'ground', modifiable: false })];
        // Path
        elements: els.push(createRect(w * 0.2, h * 0.6, w * 0.6, h * 0.08, '#D2B48C', { layer: 1, category: 'path', modifiable: false }));
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        for (let i = 0; i < rng.nextInt(4, 7); i++) els.push(createTree(rng.nextFloat(30, w - 40), h * 0.55, 'cherry', rng.nextFloat(80, 130), rng));
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        // Falling petals
        for (let i = 0; i < rng.nextInt(15, 25); i++) {
          els.push(createCircle(rng.nextFloat(0, w), rng.nextFloat(h * 0.1, h * 0.8), rng.nextFloat(2, 5), '#FFB7C5', { layer: 4, category: 'petal', modifiable: true, opacity: rng.nextFloat(0.3, 0.7) }));
        }
        if (rng.chance(0.6)) els.push(createBench(rng.nextFloat(w * 0.2, w * 0.6), h * 0.63, rng));
        for (let i = 0; i < rng.nextInt(1, 3); i++) els.push(createPerson(rng.nextFloat(80, w - 80), h * 0.62, rng));
        for (let i = 0; i < rng.nextInt(1, 3); i++) els.push(createBird(rng.nextFloat(40, w - 40), rng.nextFloat(20, h * 0.3), true, rng));
        return els;
      },
    ],
  },

  [SceneTheme.AUTUMN_PARK]: {
    bgColor: () => '#FFF8E1',
    layers: [
      (rng, w, h) => [createRect(0, 0, w, h * 0.55, '#87CEEB', { layer: 0, category: 'sky', modifiable: false })],
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        for (let i = 0; i < rng.nextInt(2, 3); i++) els.push(createCloud(rng.nextFloat(30, w - 60), rng.nextFloat(20, h * 0.15), rng.nextFloat(40, 60), rng));
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [createRect(0, h * 0.55, w, h * 0.45, '#8B6914', { layer: 1, category: 'ground', modifiable: false, opacity: 0.7 })];
        els.push(createRect(w * 0.15, h * 0.62, w * 0.7, h * 0.06, '#A0855A', { layer: 1, category: 'path', modifiable: false }));
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        for (let i = 0; i < rng.nextInt(4, 7); i++) els.push(createTree(rng.nextFloat(20, w - 40), h * 0.55, rng.pick(['oak', 'willow']), rng.nextFloat(80, 120), rng));
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        for (let i = 0; i < rng.nextInt(10, 20); i++) {
          els.push(createCircle(rng.nextFloat(0, w), rng.nextFloat(h * 0.3, h * 0.95), rng.nextFloat(3, 8), rng.pick(['#FF6F00', '#FF8F00', '#E65100', '#BF360C', '#FFD54F']), { layer: 4, category: 'leaf', modifiable: true, opacity: rng.nextFloat(0.5, 0.9) }));
        }
        if (rng.chance(0.7)) els.push(createBench(rng.nextFloat(w * 0.2, w * 0.6), h * 0.6, rng));
        for (let i = 0; i < rng.nextInt(1, 3); i++) els.push(createPerson(rng.nextFloat(60, w - 60), h * 0.6, rng));
        els.push(createLamp(rng.nextFloat(w * 0.2, w * 0.8), h * 0.55, 'street', rng));
        return els;
      },
    ],
  },

  [SceneTheme.SNOWY_VILLAGE]: {
    bgColor: () => '#E3F2FD',
    layers: [
      (rng, w, h) => [createRect(0, 0, w, h * 0.5, '#B3E5FC', { layer: 0, category: 'sky', modifiable: false })],
      (rng, w, h) => {
        const els: SVGElementData[] = [createRect(0, h * 0.5, w, h * 0.5, '#FAFAFA', { layer: 1, category: 'snow', modifiable: false })];
        for (let i = 0; i < rng.nextInt(2, 4); i++) els.push(createMountain(rng.nextFloat(-50, w * 0.5), h * 0.5, rng.nextFloat(200, 350), rng.nextFloat(80, 140), rng));
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        for (let i = 0; i < rng.nextInt(2, 4); i++) els.push(createHouse(80 + i * rng.nextFloat(160, 220), h * 0.65, rng.pick(['traditional', 'cabin']), rng.nextFloat(80, 110), rng));
        for (let i = 0; i < rng.nextInt(2, 4); i++) els.push(createTree(rng.nextFloat(20, w - 30), h * 0.6, 'pine', rng.nextFloat(50, 90), rng));
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        // Snowflakes
        for (let i = 0; i < rng.nextInt(15, 30); i++) {
          els.push(createCircle(rng.nextFloat(0, w), rng.nextFloat(0, h), rng.nextFloat(2, 5), '#FFF', { layer: 4, category: 'snowflake', modifiable: true, opacity: rng.nextFloat(0.4, 0.9) }));
        }
        if (rng.chance(0.5)) els.push(createPerson(rng.nextFloat(100, w - 100), h * 0.7, rng));
        els.push(createLamp(rng.nextFloat(w * 0.3, w * 0.7), h * 0.6, 'street', rng));
        return els;
      },
    ],
  },

  [SceneTheme.CAFE_INTERIOR]: {
    bgColor: () => '#FFF8E1',
    layers: [
      (rng, w, h) => {
        const wall = rng.pick(['#8D6E63', '#A1887F', '#D7CCC8', '#BCAAA4']);
        return [createRect(0, 0, w, h * 0.65, wall, { layer: 0, category: 'wall', modifiable: false }), createRect(0, h * 0.65, w, h * 0.35, '#5D4037', { layer: 0, category: 'floor', modifiable: false })];
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        // Menu board
        els.push(createRect(w * 0.3, h * 0.05, w * 0.4, h * 0.2, '#37474F', { layer: 1, category: 'board', modifiable: true, stroke: '#5D4037', strokeWidth: 3 }));
        // Window
        els.push(createRect(w * 0.02, h * 0.05, w * 0.2, h * 0.3, '#87CEEB', { layer: 1, category: 'window', modifiable: true, stroke: '#FFF', strokeWidth: 3 }));
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        // Counter
        els.push(createRect(w * 0.55, h * 0.35, w * 0.4, h * 0.08, '#5D4037', { layer: 2, category: 'counter', modifiable: false }));
        els.push(createRect(w * 0.55, h * 0.43, w * 0.4, h * 0.22, '#6D4C41', { layer: 2, category: 'counter', modifiable: false }));
        // Tables
        for (let i = 0; i < rng.nextInt(2, 4); i++) {
          els.push(createTable(w * 0.05 + i * w * 0.18, h * 0.55, w * 0.12, h * 0.12, rng));
          // Cup on table
          els.push(createCircle(w * 0.11 + i * w * 0.18, h * 0.54, 5, '#FFF', { layer: 3, category: 'cup', modifiable: true, stroke: '#999', strokeWidth: 1 }));
        }
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        for (let i = 0; i < rng.nextInt(1, 3); i++) els.push(createPottedPlant(rng.nextFloat(w * 0.05, w * 0.9), h * 0.63, rng.nextFloat(25, 40), rng));
        for (let i = 0; i < rng.nextInt(1, 2); i++) els.push(createPicture(rng.nextFloat(w * 0.1, w * 0.8), rng.nextFloat(h * 0.02, h * 0.2), rng.nextFloat(40, 55), rng.nextFloat(30, 40), rng));
        els.push(createClock(w * 0.8, h * 0.1, 15, rng));
        return els;
      },
    ],
  },

  [SceneTheme.SPACE_STATION]: {
    bgColor: () => '#000',
    layers: [
      (rng, w, h) => {
        const els: SVGElementData[] = [createRect(0, 0, w, h, '#0A0A20', { layer: 0, category: 'space', modifiable: false })];
        for (let i = 0; i < rng.nextInt(30, 60); i++) els.push(createCircle(rng.nextFloat(0, w), rng.nextFloat(0, h), rng.nextFloat(1, 3), '#FFF', { layer: 0, category: 'star', modifiable: true, opacity: rng.nextFloat(0.3, 1) }));
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        // Planet
        els.push(createCircle(rng.nextFloat(w * 0.1, w * 0.3), rng.nextFloat(h * 0.1, h * 0.4), rng.nextFloat(30, 60), rng.pick(['#E65100', '#1565C0', '#2E7D32', '#6A1B9A']), { layer: 1, category: 'planet', modifiable: true, opacity: 0.8 }));
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        // Station body
        els.push(createRect(w * 0.2, h * 0.35, w * 0.6, h * 0.3, '#455A64', { layer: 2, category: 'station', modifiable: false, stroke: '#78909C', strokeWidth: 2 }));
        // Solar panels
        els.push(createRect(w * 0.02, h * 0.42, w * 0.18, h * 0.08, '#1565C0', { layer: 2, category: 'panel', modifiable: true }));
        els.push(createRect(w * 0.8, h * 0.42, w * 0.18, h * 0.08, '#1565C0', { layer: 2, category: 'panel', modifiable: true }));
        // Windows
        for (let i = 0; i < 4; i++) {
          els.push(createCircle(w * 0.3 + i * w * 0.1, h * 0.5, 12, '#4FC3F7', { layer: 2, category: 'window', modifiable: true, opacity: 0.7 }));
        }
        // Antenna
        els.push(createRect(w * 0.49, h * 0.2, 3, h * 0.15, '#90A4AE', { layer: 2, category: 'antenna', modifiable: true }));
        els.push(createCircle(w * 0.5, h * 0.18, 8, '#EF5350', { layer: 2, category: 'antenna', modifiable: true }));
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        // Nebula
        els.push(createCircle(rng.nextFloat(w * 0.5, w * 0.9), rng.nextFloat(h * 0.1, h * 0.3), rng.nextFloat(40, 80), rng.pick(['#CE93D8', '#F48FB1', '#80DEEA']), { layer: 0, category: 'nebula', modifiable: true, opacity: 0.15 }));
        return els;
      },
    ],
  },

  [SceneTheme.HALLOWEEN_NIGHT]: {
    bgColor: () => '#1A0A2E',
    layers: [
      (rng, w, h) => {
        const els: SVGElementData[] = [createRect(0, 0, w, h * 0.6, '#1A0A2E', { layer: 0, category: 'sky', modifiable: false })];
        elements: els.push(createMoon(w * 0.75, h * 0.12, 30, rng));
        for (let i = 0; i < rng.nextInt(10, 20); i++) els.push(createStar(rng.nextFloat(10, w - 10), rng.nextFloat(5, h * 0.3), rng.nextFloat(2, 4), rng));
        return els;
      },
      (rng, w, h) => [createRect(0, h * 0.6, w, h * 0.4, '#1B5E20', { layer: 1, category: 'ground', modifiable: false, opacity: 0.5 })],
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        // Spooky house
        els.push(createHouse(w * 0.3, h * 0.6, 'traditional', 140, rng));
        // Dead trees
        for (let i = 0; i < rng.nextInt(2, 4); i++) els.push(createTree(rng.nextFloat(20, w - 30), h * 0.6, 'willow', rng.nextFloat(70, 100), rng));
        // Pumpkins
        for (let i = 0; i < rng.nextInt(2, 5); i++) {
          const px = rng.nextFloat(40, w - 40);
          const py = rng.nextFloat(h * 0.7, h * 0.9);
          els.push(createCircle(px, py, rng.nextFloat(10, 18), '#FF6D00', { layer: 3, category: 'pumpkin', modifiable: true }));
          // Face
          els.push(createPath(px, py, `M${px - 4},${py - 3} L${px - 2},${py - 5} L${px},${py - 3} Z`, '#333', { layer: 3, category: 'pumpkin', modifiable: false }));
          els.push(createPath(px, py, `M${px + 2},${py - 3} L${px + 4},${py - 5} L${px + 6},${py - 3} Z`, '#333', { layer: 3, category: 'pumpkin', modifiable: false }));
        }
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        // Bats
        for (let i = 0; i < rng.nextInt(3, 6); i++) {
          const bx = rng.nextFloat(20, w - 20);
          const by = rng.nextFloat(h * 0.1, h * 0.4);
          els.push(createBird(bx, by, true, rng));
        }
        // Ghost (optional)
        if (rng.chance(0.5)) {
          const gx = rng.nextFloat(w * 0.5, w * 0.8);
          const gy = rng.nextFloat(h * 0.3, h * 0.5);
          els.push(createPath(gx, gy, `M${gx},${gy - 20} Q${gx - 15},${gy - 25} ${gx - 12},${gy} Q${gx - 8},${gy + 5} ${gx - 5},${gy + 2} Q${gx},${gy + 8} ${gx + 5},${gy + 2} Q${gx + 8},${gy + 5} ${gx + 12},${gy} Q${gx + 15},${gy - 25} ${gx},${gy - 20} Z`, '#FFF', { layer: 3, category: 'ghost', modifiable: true, opacity: 0.7 }));
        }
        return els;
      },
    ],
  },

  [SceneTheme.CHRISTMAS_SCENE]: {
    bgColor: () => '#E3F2FD',
    layers: [
      (rng, w, h) => {
        const els: SVGElementData[] = [createRect(0, 0, w, h * 0.5, '#1565C0', { layer: 0, category: 'sky', modifiable: false })];
        for (let i = 0; i < rng.nextInt(5, 15); i++) els.push(createStar(rng.nextFloat(10, w - 10), rng.nextFloat(5, h * 0.25), rng.nextFloat(2, 5), rng));
        return els;
      },
      (rng, w, h) => [createRect(0, h * 0.5, w, h * 0.5, '#E8EAF6', { layer: 1, category: 'snow', modifiable: false })],
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        els.push(createHouse(w * 0.35, h * 0.5, 'traditional', 120, rng));
        // Christmas tree
        for (let i = 0; i < rng.nextInt(2, 4); i++) {
          const tx = rng.nextFloat(40, w - 60);
          els.push(createTree(tx, h * 0.55, 'pine', rng.nextFloat(70, 100), rng));
          // Ornaments
          for (let j = 0; j < rng.nextInt(2, 5); j++) {
            els.push(createCircle(tx + rng.nextFloat(-15, 15), h * 0.55 - rng.nextFloat(20, 60), 4, rng.pick(['#F44336', '#FFD700', '#2196F3', '#FF9800']), { layer: 3, category: 'ornament', modifiable: true }));
          }
        }
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        // Snowman
        if (rng.chance(0.7)) {
          const sx = rng.nextFloat(w * 0.1, w * 0.3);
          const sy = h * 0.7;
          els.push(createCircle(sx, sy, 20, '#FFF', { layer: 3, category: 'snowman', modifiable: true, stroke: '#CCC', strokeWidth: 1 }));
          els.push(createCircle(sx, sy - 28, 14, '#FFF', { layer: 3, category: 'snowman', modifiable: true, stroke: '#CCC', strokeWidth: 1 }));
          els.push(createCircle(sx, sy - 47, 10, '#FFF', { layer: 3, category: 'snowman', modifiable: true, stroke: '#CCC', strokeWidth: 1 }));
          // Carrot nose
          els.push(createPath(sx, sy, `M${sx},${sy - 47} L${sx + 10},${sy - 45}`, 'none', { stroke: '#FF6D00', strokeWidth: 3, layer: 3, category: 'snowman', modifiable: true }));
        }
        // Snowflakes
        for (let i = 0; i < rng.nextInt(15, 25); i++) els.push(createCircle(rng.nextFloat(0, w), rng.nextFloat(0, h), rng.nextFloat(2, 5), '#FFF', { layer: 4, category: 'snowflake', modifiable: true, opacity: rng.nextFloat(0.4, 0.9) }));
        return els;
      },
    ],
  },

  [SceneTheme.FAIRY_GARDEN]: {
    bgColor: () => '#E8F5E9',
    layers: [
      (rng, w, h) => [createRect(0, 0, w, h * 0.5, rng.nextHSL([260, 290], [30, 50], [60, 75]), { layer: 0, category: 'sky', modifiable: false })],
      (rng, w, h) => {
        const els: SVGElementData[] = [createRect(0, h * 0.5, w, h * 0.5, '#66BB6A', { layer: 1, category: 'ground', modifiable: false })];
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        // Magical mushrooms (big)
        for (let i = 0; i < rng.nextInt(3, 6); i++) els.push(createMushroom(rng.nextFloat(30, w - 30), rng.nextFloat(h * 0.55, h * 0.85), rng.nextFloat(25, 50), rng));
        // Giant flowers
        for (let i = 0; i < rng.nextInt(4, 8); i++) els.push(createFlower(rng.nextFloat(20, w - 20), rng.nextFloat(h * 0.5, h * 0.9), rng.pick(['daisy', 'tulip', 'rose', 'sunflower']), rng.nextFloat(30, 50), rng));
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        // Fireflies / sparkles
        for (let i = 0; i < rng.nextInt(10, 20); i++) {
          els.push(createCircle(rng.nextFloat(10, w - 10), rng.nextFloat(h * 0.1, h * 0.8), rng.nextFloat(2, 5), '#FFEB3B', { layer: 4, category: 'sparkle', modifiable: true, opacity: rng.nextFloat(0.3, 0.8) }));
        }
        for (let i = 0; i < rng.nextInt(2, 5); i++) els.push(createButterfly(rng.nextFloat(50, w - 50), rng.nextFloat(h * 0.2, h * 0.6), rng.nextFloat(15, 25), rng));
        return els;
      },
    ],
  },
};

// Generic generator that works for any theme not specifically defined
function generateGenericScene(theme: SceneTheme, rng: SeededRandom, w: number, h: number): SVGElementData[] {
  const recipe = recipes[theme];
  if (recipe) {
    const elements: SVGElementData[] = [];
    for (const layerFn of recipe.layers) {
      elements.push(...layerFn(rng, w, h));
    }
    return elements;
  }

  // Fallback: generate a nature-like scene
  return generateFallbackScene(rng, w, h);
}

function generateFallbackScene(rng: SeededRandom, w: number, h: number): SVGElementData[] {
  const elements: SVGElementData[] = [];

  // Sky
  elements.push(createRect(0, 0, w, h * 0.55, '#87CEEB', { layer: 0, category: 'sky', modifiable: false }));
  for (let i = 0; i < rng.nextInt(2, 4); i++) elements.push(createCloud(rng.nextFloat(30, w - 80), rng.nextFloat(20, h * 0.15), rng.nextFloat(40, 60), rng));
  elements.push(createCircle(w * 0.85, h * 0.1, 25, '#FFD700', { layer: 0, category: 'sun', modifiable: true }));

  // Ground
  elements.push(createRect(0, h * 0.55, w, h * 0.45, '#4CAF50', { layer: 1, category: 'ground', modifiable: false }));

  // Trees
  for (let i = 0; i < rng.nextInt(3, 6); i++) {
    elements.push(createTree(rng.nextFloat(20, w - 40), h * 0.55, rng.pick(['pine', 'oak', 'cherry', 'willow']), rng.nextFloat(60, 100), rng));
  }

  // Flowers
  for (let i = 0; i < rng.nextInt(3, 7); i++) {
    elements.push(createFlower(rng.nextFloat(30, w - 30), rng.nextFloat(h * 0.6, h * 0.9), rng.pick(['daisy', 'tulip', 'rose', 'sunflower']), rng.nextFloat(15, 30), rng));
  }

  // Rocks
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    elements.push(createRock(rng.nextFloat(30, w - 30), rng.nextFloat(h * 0.65, h * 0.85), rng.nextFloat(15, 25), rng));
  }

  // Birds
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    elements.push(createBird(rng.nextFloat(40, w - 40), rng.nextFloat(20, h * 0.3), true, rng));
  }

  // Butterflies
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    elements.push(createButterfly(rng.nextFloat(50, w - 50), rng.nextFloat(h * 0.3, h * 0.6), rng.nextFloat(12, 18), rng));
  }

  // Optional house
  if (rng.chance(0.5)) {
    elements.push(createHouse(rng.nextFloat(w * 0.2, w * 0.6), h * 0.55, rng.pick(['modern', 'traditional', 'cabin']), rng.nextFloat(80, 120), rng));
  }

  // Optional fence
  if (rng.chance(0.4)) {
    elements.push(createFence(rng.nextFloat(50, w * 0.3), h * 0.58, rng.nextFloat(80, 150), rng));
  }

  return elements;
}

export { generateGenericScene };
