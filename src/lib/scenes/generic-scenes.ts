import { SVGElementData, SceneTheme } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createPath, createCloud, createTree,
  createFlower, createBird, createButterfly, createFish, createStar,
  createMoon, createMountain, createRock, createHouse, createCar,
  createLamp, createPerson, createBench, createFence, createPottedPlant,
  createBookshelf, createTable, createClock, createPicture, createRug,
  createCushion, createVase, createCoral, createSeaweed, createMushroom,
  createEllipse, createPolygon,
} from '../engine/primitives';

// Helper: create a filled ground with grass texture
function richGround(rng: SeededRandom, w: number, h: number, groundY: number, baseColor: string): SVGElementData[] {
  const els: SVGElementData[] = [];
  const curvePath = `M0,${groundY} Q${w * 0.15},${groundY - 8} ${w * 0.3},${groundY + 3} Q${w * 0.5},${groundY - 5} ${w * 0.7},${groundY + 4} Q${w * 0.85},${groundY - 3} ${w},${groundY + 2} L${w},${h} L0,${h} Z`;
  els.push(createPath(0, 0, curvePath, baseColor, { layer: 1, category: 'ground', modifiable: false }));
  // Darker bottom
  els.push(createRect(0, groundY + (h - groundY) * 0.5, w, (h - groundY) * 0.5, darken(baseColor), { layer: 1, category: 'ground', modifiable: false, opacity: 0.5 }));
  // Grass tufts
  for (let i = 0; i < 15; i++) {
    const gx = rng.nextFloat(5, w - 5);
    const gy = rng.nextFloat(groundY + 5, h - 10);
    const grassPath = `M${gx},${gy} L${gx - 3},${gy - rng.nextFloat(8, 18)} M${gx},${gy} L${gx + 2},${gy - rng.nextFloat(10, 20)} M${gx},${gy} L${gx + 5},${gy - rng.nextFloat(8, 15)}`;
    els.push(createPath(gx, gy, grassPath, 'none', { stroke: darken(baseColor), strokeWidth: 1.5, layer: 4, category: 'grass', modifiable: false, opacity: 0.4 }));
  }
  return els;
}

function darken(color: string): string {
  if (color.startsWith('hsl')) {
    return color.replace(/(\d+)%\)/, (_, l) => `${Math.max(0, parseInt(l) - 15)}%)`);
  }
  return color;
}

// Rich sky with gradient simulation
function richSky(rng: SeededRandom, w: number, h: number, skyH: number, topColor: string, bottomColor: string, isNight = false): SVGElementData[] {
  const els: SVGElementData[] = [];
  const bands = 4;
  for (let i = 0; i < bands; i++) {
    const y = (i / bands) * skyH;
    const bh = skyH / bands + 2;
    const opacity = 1 - (i * 0.15);
    els.push(createRect(0, y, w, bh, i < bands / 2 ? topColor : bottomColor, { layer: 0, category: 'sky', modifiable: false, opacity }));
  }
  if (!isNight) {
    // Sun with glow
    const sunX = rng.nextFloat(w * 0.6, w * 0.9);
    const sunY = rng.nextFloat(skyH * 0.1, skyH * 0.3);
    els.push(createCircle(sunX, sunY, 40, '#FFF9C4', { layer: 0, category: 'sun', modifiable: false, opacity: 0.2 }));
    els.push(createCircle(sunX, sunY, 25, '#FFD54F', { layer: 0, category: 'sun', modifiable: true, opacity: 0.9 }));
    // Clouds
    for (let i = 0; i < rng.nextInt(3, 6); i++) {
      els.push(createCloud(rng.nextFloat(20, w - 80), rng.nextFloat(skyH * 0.05, skyH * 0.4), rng.nextFloat(40, 80), rng));
    }
  } else {
    // Moon + stars
    els.push(createMoon(rng.nextFloat(w * 0.6, w * 0.85), rng.nextFloat(skyH * 0.08, skyH * 0.25), 22, rng));
    for (let i = 0; i < rng.nextInt(15, 30); i++) {
      els.push(createStar(rng.nextFloat(5, w - 5), rng.nextFloat(5, skyH * 0.5), rng.nextFloat(1.5, 4), rng));
    }
  }
  return els;
}

type LayerFn = (rng: SeededRandom, w: number, h: number) => SVGElementData[];

interface ThemeRecipe {
  layers: LayerFn[];
}

const recipes: Partial<Record<SceneTheme, ThemeRecipe>> = {
  [SceneTheme.MOUNTAIN_LAKE]: {
    layers: [
      (rng, w, h) => richSky(rng, w, h, h * 0.45, '#4FC3F7', '#B3E5FC'),
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        for (let i = 0; i < rng.nextInt(3, 5); i++) els.push(createMountain(rng.nextFloat(-100, w * 0.6), h * 0.45, rng.nextFloat(250, 400), rng.nextFloat(100, 200), rng));
        return els;
      },
      (rng, w, h) => {
        // Lake
        const lake = `M${w * 0.05},${h * 0.48} Q${w * 0.25},${h * 0.44} ${w * 0.5},${h * 0.47} Q${w * 0.75},${h * 0.5} ${w * 0.95},${h * 0.47} L${w * 0.95},${h * 0.65} Q${w * 0.5},${h * 0.68} ${w * 0.05},${h * 0.65} Z`;
        return [
          createPath(0, 0, lake, '#29B6F6', { layer: 1, category: 'lake', modifiable: true, opacity: 0.7 }),
          createPath(0, 0, lake, '#4FC3F7', { layer: 1, category: 'lake', modifiable: false, opacity: 0.3 }),
        ];
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        els.push(...richGround(rng, w, h, h * 0.63, '#388E3C'));
        for (let i = 0; i < rng.nextInt(5, 9); i++) els.push(createTree(rng.nextFloat(10, w - 30), h * 0.63, rng.pick(['pine', 'oak', 'pine']), rng.nextFloat(60, 110), rng));
        for (let i = 0; i < rng.nextInt(3, 6); i++) els.push(createRock(rng.nextFloat(20, w - 20), rng.nextFloat(h * 0.66, h * 0.85), rng.nextFloat(12, 28), rng));
        for (let i = 0; i < rng.nextInt(4, 8); i++) els.push(createFlower(rng.nextFloat(20, w - 20), rng.nextFloat(h * 0.68, h * 0.95), rng.pick(['daisy', 'tulip']), rng.nextFloat(12, 22), rng));
        for (let i = 0; i < rng.nextInt(2, 4); i++) els.push(createBird(rng.nextFloat(40, w - 40), rng.nextFloat(20, h * 0.3), true, rng));
        if (rng.chance(0.5)) els.push(createBench(rng.nextFloat(w * 0.2, w * 0.7), h * 0.66, rng));
        if (rng.chance(0.5)) els.push(createPerson(rng.nextFloat(100, w - 100), h * 0.66, rng));
        return els;
      },
    ],
  },

  [SceneTheme.CHERRY_BLOSSOM]: {
    layers: [
      (rng, w, h) => richSky(rng, w, h, h * 0.5, '#81D4FA', '#E1BEE7'),
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        els.push(...richGround(rng, w, h, h * 0.52, '#66BB6A'));
        els.push(createRect(w * 0.15, h * 0.58, w * 0.7, h * 0.06, '#BCAAA4', { layer: 1, category: 'path', modifiable: false }));
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        for (let i = 0; i < rng.nextInt(5, 8); i++) els.push(createTree(rng.nextFloat(15, w - 30), h * 0.52, 'cherry', rng.nextFloat(90, 140), rng));
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        for (let i = 0; i < rng.nextInt(25, 40); i++) {
          els.push(createCircle(rng.nextFloat(0, w), rng.nextFloat(h * 0.05, h * 0.85), rng.nextFloat(2, 6), rng.pick(['#FFB7C5', '#FFC1CC', '#FFD1DC', '#FFAEB9']), { layer: 4, category: 'petal', modifiable: true, opacity: rng.nextFloat(0.3, 0.8) }));
        }
        if (rng.chance(0.8)) els.push(createBench(rng.nextFloat(w * 0.2, w * 0.6), h * 0.58, rng));
        for (let i = 0; i < rng.nextInt(1, 4); i++) els.push(createPerson(rng.nextFloat(60, w - 60), h * 0.58, rng));
        for (let i = 0; i < rng.nextInt(1, 3); i++) els.push(createBird(rng.nextFloat(30, w - 30), rng.nextFloat(15, h * 0.3), true, rng));
        for (let i = 0; i < rng.nextInt(2, 5); i++) els.push(createButterfly(rng.nextFloat(50, w - 50), rng.nextFloat(h * 0.2, h * 0.55), rng.nextFloat(12, 20), rng));
        els.push(createLamp(rng.nextFloat(w * 0.15, w * 0.85), h * 0.52, 'garden', rng));
        return els;
      },
    ],
  },

  [SceneTheme.AUTUMN_PARK]: {
    layers: [
      (rng, w, h) => richSky(rng, w, h, h * 0.5, '#90CAF9', '#FFE0B2'),
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        els.push(...richGround(rng, w, h, h * 0.52, '#8D6E63'));
        els.push(createRect(w * 0.1, h * 0.58, w * 0.8, h * 0.05, '#A1887F', { layer: 1, category: 'path', modifiable: false }));
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        for (let i = 0; i < rng.nextInt(5, 8); i++) els.push(createTree(rng.nextFloat(10, w - 30), h * 0.52, rng.pick(['oak', 'willow', 'oak']), rng.nextFloat(80, 130), rng));
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        // Falling leaves
        for (let i = 0; i < rng.nextInt(20, 35); i++) {
          els.push(createCircle(rng.nextFloat(0, w), rng.nextFloat(h * 0.15, h * 0.95), rng.nextFloat(3, 8), rng.pick(['#FF6F00', '#FF8F00', '#E65100', '#BF360C', '#FFD54F', '#F57F17']), { layer: 4, category: 'leaf', modifiable: true, opacity: rng.nextFloat(0.4, 0.9) }));
        }
        if (rng.chance(0.8)) els.push(createBench(rng.nextFloat(w * 0.2, w * 0.6), h * 0.56, rng));
        for (let i = 0; i < rng.nextInt(2, 4); i++) els.push(createPerson(rng.nextFloat(60, w - 60), h * 0.57, rng));
        els.push(createLamp(rng.nextFloat(w * 0.2, w * 0.8), h * 0.52, 'street', rng));
        for (let i = 0; i < rng.nextInt(2, 4); i++) els.push(createRock(rng.nextFloat(20, w - 20), rng.nextFloat(h * 0.65, h * 0.85), rng.nextFloat(10, 20), rng));
        if (rng.chance(0.5)) els.push(createFence(rng.nextFloat(30, w * 0.3), h * 0.55, rng.nextFloat(80, 140), rng));
        return els;
      },
    ],
  },

  [SceneTheme.SNOWY_VILLAGE]: {
    layers: [
      (rng, w, h) => richSky(rng, w, h, h * 0.45, '#78909C', '#B0BEC5'),
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        // Mountains
        for (let i = 0; i < rng.nextInt(2, 4); i++) els.push(createMountain(rng.nextFloat(-80, w * 0.5), h * 0.45, rng.nextFloat(220, 380), rng.nextFloat(90, 160), rng));
        // Snow ground
        const snowPath = `M0,${h * 0.48} Q${w * 0.2},${h * 0.44} ${w * 0.4},${h * 0.47} Q${w * 0.6},${h * 0.43} ${w * 0.8},${h * 0.46} Q${w * 0.9},${h * 0.44} ${w},${h * 0.47} L${w},${h} L0,${h} Z`;
        els.push(createPath(0, 0, snowPath, '#ECEFF1', { layer: 1, category: 'snow', modifiable: false }));
        els.push(createRect(0, h * 0.7, w, h * 0.3, '#E0E0E0', { layer: 1, category: 'snow', modifiable: false, opacity: 0.5 }));
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        // Houses - 3 to 4, well-spaced
        const houseCount = rng.nextInt(3, 4);
        for (let i = 0; i < houseCount; i++) {
          const hx = 40 + i * (w / houseCount) + rng.nextFloat(-20, 20);
          els.push(createHouse(hx, h * 0.58, rng.pick(['traditional', 'cabin', 'traditional']), rng.nextFloat(90, 120), rng));
        }
        // Pine trees - many!
        for (let i = 0; i < rng.nextInt(5, 9); i++) {
          els.push(createTree(rng.nextFloat(10, w - 25), rng.nextFloat(h * 0.5, h * 0.6), 'pine', rng.nextFloat(50, 100), rng));
        }
        // Street lamps
        for (let i = 0; i < rng.nextInt(2, 4); i++) {
          els.push(createLamp(rng.nextFloat(w * 0.1, w * 0.9), h * 0.52, 'street', rng));
        }
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        // Snowman
        if (rng.chance(0.8)) {
          const sx = rng.nextFloat(w * 0.1, w * 0.35);
          const sy = h * 0.62;
          els.push(createCircle(sx, sy, 18, '#FAFAFA', { layer: 3, category: 'snowman', modifiable: true, stroke: '#B0BEC5', strokeWidth: 1 }));
          els.push(createCircle(sx, sy - 25, 13, '#FAFAFA', { layer: 3, category: 'snowman', modifiable: true, stroke: '#B0BEC5', strokeWidth: 1 }));
          els.push(createCircle(sx, sy - 42, 9, '#FAFAFA', { layer: 3, category: 'snowman', modifiable: true, stroke: '#B0BEC5', strokeWidth: 1 }));
          els.push(createPath(sx, sy, `M${sx},${sy - 42} L${sx + 10},${sy - 40}`, 'none', { stroke: '#FF6D00', strokeWidth: 3, layer: 3, category: 'snowman', modifiable: true }));
          // Eyes + buttons
          els.push(createCircle(sx - 3, sy - 44, 1.5, '#333', { layer: 3, category: 'snowman', modifiable: false }));
          els.push(createCircle(sx + 3, sy - 44, 1.5, '#333', { layer: 3, category: 'snowman', modifiable: false }));
          els.push(createCircle(sx, sy - 28, 2, '#333', { layer: 3, category: 'snowman', modifiable: false }));
          els.push(createCircle(sx, sy - 22, 2, '#333', { layer: 3, category: 'snowman', modifiable: false }));
        }
        // People
        for (let i = 0; i < rng.nextInt(1, 3); i++) els.push(createPerson(rng.nextFloat(80, w - 80), h * 0.58, rng));
        // Fence
        if (rng.chance(0.5)) els.push(createFence(rng.nextFloat(50, w * 0.4), h * 0.55, rng.nextFloat(80, 140), rng));
        // Snowflakes - LOTS
        for (let i = 0; i < rng.nextInt(30, 50); i++) {
          els.push(createCircle(rng.nextFloat(0, w), rng.nextFloat(0, h), rng.nextFloat(2, 5), '#FFF', { layer: 4, category: 'snowflake', modifiable: true, opacity: rng.nextFloat(0.3, 0.9) }));
        }
        return els;
      },
    ],
  },

  [SceneTheme.CAFE_INTERIOR]: {
    layers: [
      (rng, w, h) => {
        const wall = rng.pick(['#5D4037', '#795548', '#6D4C41', '#4E342E']);
        return [
          createRect(0, 0, w, h * 0.62, wall, { layer: 0, category: 'wall', modifiable: false }),
          createRect(0, h * 0.62, w, h * 0.38, '#3E2723', { layer: 0, category: 'floor', modifiable: false }),
          // Wainscoting
          createRect(0, h * 0.45, w, h * 0.17, '#4E342E', { layer: 0, category: 'wall', modifiable: false, opacity: 0.6 }),
          createRect(0, h * 0.45, w, 3, '#6D4C41', { layer: 0, category: 'wall', modifiable: false }),
        ];
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        // Menu board
        els.push(createRect(w * 0.28, h * 0.04, w * 0.44, h * 0.18, '#263238', { layer: 1, category: 'board', modifiable: true, stroke: '#5D4037', strokeWidth: 4 }));
        // Menu text lines
        for (let i = 0; i < 3; i++) els.push(createRect(w * 0.32, h * 0.08 + i * 14, w * 0.36, 3, '#FFF', { layer: 1, category: 'board', modifiable: false, opacity: 0.3 }));
        // Window
        els.push(createRect(w * 0.02, h * 0.04, w * 0.2, h * 0.28, '#4FC3F7', { layer: 1, category: 'window', modifiable: true, stroke: '#8D6E63', strokeWidth: 4, opacity: 0.7 }));
        // Curtain
        els.push(createRect(w * 0.02, h * 0.04, w * 0.2, h * 0.06, rng.nextColor([0, 360], [30, 50], [55, 70]), { layer: 1, category: 'curtain', modifiable: true }));
        // Shelves with bottles
        els.push(createRect(w * 0.78, h * 0.04, w * 0.2, h * 0.35, '#4E342E', { layer: 1, category: 'shelf', modifiable: false, stroke: '#3E2723', strokeWidth: 2 }));
        for (let s = 0; s < 3; s++) {
          const sy = h * 0.08 + s * h * 0.1;
          els.push(createRect(w * 0.78, sy, w * 0.2, 2, '#6D4C41', { layer: 1, category: 'shelf', modifiable: false }));
          for (let b = 0; b < rng.nextInt(3, 6); b++) {
            const bx = w * 0.8 + b * 12;
            els.push(createRect(bx, sy - rng.nextFloat(15, 25), 6, rng.nextFloat(15, 25), rng.nextColor([0, 360], [40, 80], [30, 55]), { layer: 1, category: 'bottle', modifiable: true }));
          }
        }
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        // Counter
        els.push(createRect(w * 0.45, h * 0.38, w * 0.52, h * 0.06, '#5D4037', { layer: 2, category: 'counter', modifiable: false }));
        els.push(createRect(w * 0.45, h * 0.44, w * 0.52, h * 0.18, '#4E342E', { layer: 2, category: 'counter', modifiable: false }));
        // Tables with chairs
        for (let i = 0; i < rng.nextInt(3, 5); i++) {
          const tx = w * 0.03 + i * w * 0.16;
          els.push(createTable(tx, h * 0.55, w * 0.1, h * 0.1, rng));
          // Cup
          els.push(createCircle(tx + w * 0.05, h * 0.54, 5, '#FFF8E1', { layer: 3, category: 'cup', modifiable: true, stroke: '#8D6E63', strokeWidth: 1 }));
          // Chair outlines
          els.push(createRect(tx - 3, h * 0.58, 8, 12, '#5D4037', { layer: 2, category: 'chair', modifiable: false }));
          els.push(createRect(tx + w * 0.08, h * 0.58, 8, 12, '#5D4037', { layer: 2, category: 'chair', modifiable: false }));
        }
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        for (let i = 0; i < rng.nextInt(2, 4); i++) els.push(createPottedPlant(rng.nextFloat(w * 0.02, w * 0.95), h * 0.6, rng.nextFloat(25, 40), rng));
        for (let i = 0; i < rng.nextInt(1, 3); i++) els.push(createPicture(rng.nextFloat(w * 0.05, w * 0.7), rng.nextFloat(h * 0.02, h * 0.2), rng.nextFloat(40, 60), rng.nextFloat(30, 40), rng));
        els.push(createClock(w * 0.75, h * 0.1, 15, rng));
        // Ceiling lights
        for (let i = 0; i < rng.nextInt(2, 4); i++) {
          const lx = w * 0.15 + i * w * 0.25;
          els.push(createCircle(lx, h * 0.01, 12, '#FFF9C4', { layer: 0, category: 'light', modifiable: true, opacity: 0.6 }));
          els.push(createRect(lx - 1, 0, 2, h * 0.01, '#999', { layer: 0, category: 'light', modifiable: false }));
        }
        return els;
      },
    ],
  },

  [SceneTheme.SPACE_STATION]: {
    layers: [
      (rng, w, h) => {
        const els: SVGElementData[] = [createRect(0, 0, w, h, '#050520', { layer: 0, category: 'space', modifiable: false })];
        for (let i = 0; i < rng.nextInt(50, 80); i++) els.push(createCircle(rng.nextFloat(0, w), rng.nextFloat(0, h), rng.nextFloat(0.5, 3), '#FFF', { layer: 0, category: 'star', modifiable: true, opacity: rng.nextFloat(0.2, 1) }));
        // Nebula clouds
        for (let i = 0; i < rng.nextInt(2, 4); i++) {
          els.push(createCircle(rng.nextFloat(0, w), rng.nextFloat(0, h), rng.nextFloat(50, 120), rng.pick(['#7B1FA2', '#E91E63', '#00BCD4', '#3F51B5']), { layer: 0, category: 'nebula', modifiable: false, opacity: rng.nextFloat(0.04, 0.1) }));
        }
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        // Planet
        const px = rng.nextFloat(w * 0.05, w * 0.3);
        const py = rng.nextFloat(h * 0.05, h * 0.35);
        const pr = rng.nextFloat(35, 70);
        els.push(createCircle(px, py, pr, rng.pick(['#EF6C00', '#1565C0', '#2E7D32', '#6A1B9A', '#D84315']), { layer: 1, category: 'planet', modifiable: true, opacity: 0.85 }));
        // Planet ring
        if (rng.chance(0.5)) {
          els.push(createEllipse(px, py, pr * 1.5, pr * 0.3, 'none', { layer: 1, category: 'planet', modifiable: false, stroke: '#FFF', strokeWidth: 2, opacity: 0.3 }));
        }
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        // Station body
        els.push(createRect(w * 0.15, h * 0.35, w * 0.7, h * 0.3, '#37474F', { layer: 2, category: 'station', modifiable: false, stroke: '#546E7A', strokeWidth: 2 }));
        // Solar panels
        els.push(createRect(w * 0.01, h * 0.42, w * 0.14, h * 0.08, '#0D47A1', { layer: 2, category: 'panel', modifiable: true, stroke: '#1565C0', strokeWidth: 1 }));
        els.push(createRect(w * 0.85, h * 0.42, w * 0.14, h * 0.08, '#0D47A1', { layer: 2, category: 'panel', modifiable: true, stroke: '#1565C0', strokeWidth: 1 }));
        // Panel grid
        for (let p = 0; p < 3; p++) {
          els.push(createRect(w * 0.01 + p * w * 0.047, h * 0.42, 1, h * 0.08, '#1565C0', { layer: 2, category: 'panel', modifiable: false, opacity: 0.5 }));
          els.push(createRect(w * 0.85 + p * w * 0.047, h * 0.42, 1, h * 0.08, '#1565C0', { layer: 2, category: 'panel', modifiable: false, opacity: 0.5 }));
        }
        // Connectors
        els.push(createRect(w * 0.14, h * 0.45, w * 0.01, h * 0.02, '#78909C', { layer: 2, category: 'station', modifiable: false }));
        els.push(createRect(w * 0.85, h * 0.45, w * 0.01, h * 0.02, '#78909C', { layer: 2, category: 'station', modifiable: false }));
        // Windows
        for (let i = 0; i < 5; i++) {
          els.push(createCircle(w * 0.25 + i * w * 0.1, h * 0.5, 10, '#4DD0E1', { layer: 2, category: 'window', modifiable: true, opacity: 0.7, stroke: '#546E7A', strokeWidth: 2 }));
        }
        // Antenna
        els.push(createRect(w * 0.495, h * 0.2, 3, h * 0.15, '#90A4AE', { layer: 2, category: 'antenna', modifiable: true }));
        els.push(createCircle(w * 0.497, h * 0.18, 8, '#F44336', { layer: 2, category: 'antenna', modifiable: true }));
        // Docking port
        els.push(createRect(w * 0.47, h * 0.65, w * 0.06, h * 0.06, '#455A64', { layer: 2, category: 'station', modifiable: true, stroke: '#546E7A', strokeWidth: 1 }));
        return els;
      },
    ],
  },

  [SceneTheme.HALLOWEEN_NIGHT]: {
    layers: [
      (rng, w, h) => richSky(rng, w, h, h * 0.55, '#1A0A2E', '#2E1052', true),
      (rng, w, h) => richGround(rng, w, h, h * 0.55, '#1B5E20'),
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        els.push(createHouse(w * 0.25, h * 0.55, 'traditional', 140, rng));
        for (let i = 0; i < rng.nextInt(3, 5); i++) els.push(createTree(rng.nextFloat(10, w - 25), h * 0.55, 'willow', rng.nextFloat(70, 110), rng));
        // Pumpkins
        for (let i = 0; i < rng.nextInt(3, 6); i++) {
          const px = rng.nextFloat(30, w - 30);
          const py = rng.nextFloat(h * 0.62, h * 0.88);
          const ps = rng.nextFloat(10, 18);
          els.push(createCircle(px, py, ps, '#FF6D00', { layer: 3, category: 'pumpkin', modifiable: true }));
          els.push(createPath(px, py, `M${px - 3},${py - ps * 0.2} L${px - 1},${py - ps * 0.5} L${px + 1},${py - ps * 0.2} Z`, '#333', { layer: 3, category: 'pumpkin', modifiable: false }));
          els.push(createPath(px, py, `M${px + 2},${py - ps * 0.2} L${px + 4},${py - ps * 0.5} L${px + 6},${py - ps * 0.2} Z`, '#333', { layer: 3, category: 'pumpkin', modifiable: false }));
          els.push(createPath(px, py, `M${px - 4},${py + ps * 0.15} Q${px},${py + ps * 0.3} ${px + 4},${py + ps * 0.15}`, 'none', { stroke: '#333', strokeWidth: 2, layer: 3, category: 'pumpkin', modifiable: false }));
        }
        els.push(createFence(rng.nextFloat(30, w * 0.3), h * 0.58, rng.nextFloat(100, 180), rng));
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        for (let i = 0; i < rng.nextInt(4, 7); i++) els.push(createBird(rng.nextFloat(20, w - 20), rng.nextFloat(h * 0.05, h * 0.35), true, rng));
        // Ghost
        if (rng.chance(0.6)) {
          const gx = rng.nextFloat(w * 0.5, w * 0.85);
          const gy = rng.nextFloat(h * 0.2, h * 0.45);
          els.push(createPath(gx, gy, `M${gx},${gy - 25} Q${gx - 18},${gy - 30} ${gx - 15},${gy} Q${gx - 8},${gy + 8} ${gx - 5},${gy + 3} Q${gx},${gy + 10} ${gx + 5},${gy + 3} Q${gx + 8},${gy + 8} ${gx + 15},${gy} Q${gx + 18},${gy - 30} ${gx},${gy - 25} Z`, '#FFF', { layer: 3, category: 'ghost', modifiable: true, opacity: 0.65 }));
          els.push(createCircle(gx - 4, gy - 18, 2.5, '#333', { layer: 3, category: 'ghost', modifiable: false }));
          els.push(createCircle(gx + 4, gy - 18, 2.5, '#333', { layer: 3, category: 'ghost', modifiable: false }));
        }
        return els;
      },
    ],
  },

  [SceneTheme.CHRISTMAS_SCENE]: {
    layers: [
      (rng, w, h) => richSky(rng, w, h, h * 0.45, '#0D47A1', '#1565C0', true),
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        const snowPath = `M0,${h * 0.45} Q${w * 0.2},${h * 0.42} ${w * 0.5},${h * 0.46} Q${w * 0.8},${h * 0.43} ${w},${h * 0.45} L${w},${h} L0,${h} Z`;
        els.push(createPath(0, 0, snowPath, '#E8EAF6', { layer: 1, category: 'snow', modifiable: false }));
        els.push(createRect(0, h * 0.7, w, h * 0.3, '#C5CAE9', { layer: 1, category: 'snow', modifiable: false, opacity: 0.3 }));
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        els.push(createHouse(w * 0.3, h * 0.48, 'traditional', 130, rng));
        for (let i = 0; i < rng.nextInt(4, 7); i++) {
          const tx = rng.nextFloat(20, w - 40);
          els.push(createTree(tx, h * 0.5, 'pine', rng.nextFloat(65, 100), rng));
          // Ornaments on trees
          for (let j = 0; j < rng.nextInt(3, 6); j++) {
            els.push(createCircle(tx + rng.nextFloat(-15, 15), h * 0.5 - rng.nextFloat(15, 60), 3.5, rng.pick(['#F44336', '#FFD700', '#2196F3', '#FF9800', '#E91E63']), { layer: 3, category: 'ornament', modifiable: true }));
          }
        }
        // Star on tree
        els.push(createStar(w * 0.5, h * 0.3, 8, rng));
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        // Snowman
        const sx = rng.nextFloat(w * 0.06, w * 0.25);
        const sy = h * 0.6;
        els.push(createCircle(sx, sy, 20, '#FAFAFA', { layer: 3, category: 'snowman', modifiable: true, stroke: '#B0BEC5', strokeWidth: 1 }));
        els.push(createCircle(sx, sy - 28, 14, '#FAFAFA', { layer: 3, category: 'snowman', modifiable: true, stroke: '#B0BEC5', strokeWidth: 1 }));
        els.push(createCircle(sx, sy - 47, 10, '#FAFAFA', { layer: 3, category: 'snowman', modifiable: true, stroke: '#B0BEC5', strokeWidth: 1 }));
        // Snowflakes
        for (let i = 0; i < rng.nextInt(25, 40); i++) els.push(createCircle(rng.nextFloat(0, w), rng.nextFloat(0, h), rng.nextFloat(2, 5), '#FFF', { layer: 4, category: 'snowflake', modifiable: true, opacity: rng.nextFloat(0.3, 0.9) }));
        // People
        for (let i = 0; i < rng.nextInt(1, 3); i++) els.push(createPerson(rng.nextFloat(80, w - 80), h * 0.55, rng));
        els.push(createLamp(rng.nextFloat(w * 0.15, w * 0.85), h * 0.48, 'street', rng));
        return els;
      },
    ],
  },

  [SceneTheme.FAIRY_GARDEN]: {
    layers: [
      (rng, w, h) => richSky(rng, w, h, h * 0.48, '#7E57C2', '#CE93D8'),
      (rng, w, h) => richGround(rng, w, h, h * 0.48, '#43A047'),
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        for (let i = 0; i < rng.nextInt(4, 7); i++) els.push(createMushroom(rng.nextFloat(20, w - 20), rng.nextFloat(h * 0.52, h * 0.88), rng.nextFloat(25, 55), rng));
        for (let i = 0; i < rng.nextInt(6, 10); i++) els.push(createFlower(rng.nextFloat(15, w - 15), rng.nextFloat(h * 0.5, h * 0.92), rng.pick(['daisy', 'tulip', 'rose', 'sunflower']), rng.nextFloat(25, 50), rng));
        return els;
      },
      (rng, w, h) => {
        const els: SVGElementData[] = [];
        for (let i = 0; i < rng.nextInt(20, 35); i++) {
          els.push(createCircle(rng.nextFloat(5, w - 5), rng.nextFloat(h * 0.05, h * 0.85), rng.nextFloat(2, 6), rng.pick(['#FFEB3B', '#FFF59D', '#FFD600']), { layer: 4, category: 'sparkle', modifiable: true, opacity: rng.nextFloat(0.3, 0.85) }));
        }
        for (let i = 0; i < rng.nextInt(3, 6); i++) els.push(createButterfly(rng.nextFloat(40, w - 40), rng.nextFloat(h * 0.15, h * 0.6), rng.nextFloat(15, 28), rng));
        for (let i = 0; i < rng.nextInt(2, 4); i++) els.push(createRock(rng.nextFloat(30, w - 30), rng.nextFloat(h * 0.6, h * 0.85), rng.nextFloat(15, 30), rng));
        return els;
      },
    ],
  },
};

function generateGenericScene(theme: SceneTheme, rng: SeededRandom, w: number, h: number): SVGElementData[] {
  const recipe = recipes[theme];
  if (recipe) {
    const elements: SVGElementData[] = [];
    for (const layerFn of recipe.layers) {
      elements.push(...layerFn(rng, w, h));
    }
    return elements;
  }
  return generateFallbackScene(rng, w, h);
}

function generateFallbackScene(rng: SeededRandom, w: number, h: number): SVGElementData[] {
  const elements: SVGElementData[] = [];
  const groundY = h * 0.52;

  // Rich sky
  elements.push(...richSky(rng, w, h, groundY, '#64B5F6', '#BBDEFB'));
  // Rich ground
  elements.push(...richGround(rng, w, h, groundY, '#43A047'));

  // Trees - lots
  for (let i = 0; i < rng.nextInt(5, 8); i++) {
    elements.push(createTree(rng.nextFloat(10, w - 30), groundY, rng.pick(['pine', 'oak', 'cherry', 'willow']), rng.nextFloat(60, 110), rng));
  }

  // Flowers
  for (let i = 0; i < rng.nextInt(5, 10); i++) {
    elements.push(createFlower(rng.nextFloat(20, w - 20), rng.nextFloat(groundY + 10, h - 15), rng.pick(['daisy', 'tulip', 'rose', 'sunflower']), rng.nextFloat(15, 30), rng));
  }

  // Rocks
  for (let i = 0; i < rng.nextInt(2, 5); i++) {
    elements.push(createRock(rng.nextFloat(20, w - 20), rng.nextFloat(groundY + 15, h * 0.85), rng.nextFloat(15, 28), rng));
  }

  // Birds
  for (let i = 0; i < rng.nextInt(2, 4); i++) {
    elements.push(createBird(rng.nextFloat(30, w - 30), rng.nextFloat(15, groundY * 0.5), true, rng));
  }

  // Butterflies
  for (let i = 0; i < rng.nextInt(1, 4); i++) {
    elements.push(createButterfly(rng.nextFloat(40, w - 40), rng.nextFloat(groundY * 0.3, groundY), rng.nextFloat(12, 22), rng));
  }

  // House
  if (rng.chance(0.6)) {
    elements.push(createHouse(rng.nextFloat(w * 0.15, w * 0.5), groundY, rng.pick(['modern', 'traditional', 'cabin']), rng.nextFloat(90, 130), rng));
  }

  // Fence
  if (rng.chance(0.5)) {
    elements.push(createFence(rng.nextFloat(30, w * 0.35), groundY + 3, rng.nextFloat(80, 150), rng));
  }

  // People
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    elements.push(createPerson(rng.nextFloat(60, w - 60), groundY + 2, rng));
  }

  // Mushrooms
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    elements.push(createMushroom(rng.nextFloat(30, w - 30), rng.nextFloat(groundY + 10, h * 0.85), rng.nextFloat(15, 25), rng));
  }

  return elements;
}

export { generateGenericScene };
