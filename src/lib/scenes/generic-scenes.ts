import { SVGElementData, SceneTheme } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createPath, createEllipse,
  createStar, createMoon,
} from '../engine/primitives';
import {
  detailedTree, detailedCloud, detailedFlower, detailedRock,
  detailedBird, detailedHouse, detailedPerson, detailedBench,
  detailedFence, detailedMushroom, detailedButterfly,
} from './svg-components';

// ─── Helper: organic ground with grass tufts ─────────────────
function richGround(rng: SeededRandom, w: number, h: number, groundY: number, baseColor: string): SVGElementData[] {
  const els: SVGElementData[] = [];
  const curvePath = `M0,${groundY} Q${w * 0.15},${groundY - 8} ${w * 0.3},${groundY + 3} Q${w * 0.5},${groundY - 5} ${w * 0.7},${groundY + 4} Q${w * 0.85},${groundY - 3} ${w},${groundY + 2} L${w},${h} L0,${h} Z`;
  els.push(createPath(0, 0, curvePath, baseColor, { layer: 1, category: 'ground', modifiable: false }));
  els.push(createRect(0, groundY + (h - groundY) * 0.5, w, (h - groundY) * 0.5, darken(baseColor), { layer: 1, category: 'ground', modifiable: false, opacity: 0.5 }));
  for (let i = 0; i < 18; i++) {
    const gx = rng.nextFloat(5, w - 5);
    const gy = rng.nextFloat(groundY + 5, h - 10);
    const grassPath = `M${gx},${gy} Q${gx - 2},${gy - rng.nextFloat(8, 18)} ${gx - 3},${gy - rng.nextFloat(12, 22)} M${gx},${gy} Q${gx + 1},${gy - rng.nextFloat(10, 20)} ${gx + 3},${gy - rng.nextFloat(14, 24)} M${gx},${gy} Q${gx + 4},${gy - rng.nextFloat(8, 15)} ${gx + 6},${gy - rng.nextFloat(10, 18)}`;
    els.push(createPath(gx, gy, grassPath, 'none', { stroke: darken(baseColor), strokeWidth: 1, layer: 4, category: 'grass', modifiable: false, opacity: 0.35 }));
  }
  return els;
}

function darken(color: string): string {
  if (color.startsWith('hsl')) {
    return color.replace(/(\d+)%\)/, (_, l) => `${Math.max(0, parseInt(l) - 15)}%)`);
  }
  return color;
}

// ─── Helper: rich sky with sun/moon and clouds ───────────────
function richSky(rng: SeededRandom, w: number, h: number, skyH: number, isNight = false): SVGElementData[] {
  const els: SVGElementData[] = [];
  if (!isNight) {
    // Sun with glow layers
    const sunX = rng.nextFloat(w * 0.6, w * 0.9);
    const sunY = rng.nextFloat(skyH * 0.1, skyH * 0.3);
    els.push(createCircle(sunX, sunY, 45, '#FFF9C4', { layer: 0, category: 'sun', modifiable: false, opacity: 0.15 }));
    els.push(createCircle(sunX, sunY, 30, '#FFE082', { layer: 0, category: 'sun', modifiable: false, opacity: 0.3 }));
    els.push(createCircle(sunX, sunY, 18, '#FFD54F', { layer: 0, category: 'sun', modifiable: true, opacity: 0.9 }));
    // Detailed clouds
    for (let i = 0; i < rng.nextInt(3, 6); i++) {
      els.push(detailedCloud(rng.nextFloat(20, w - 80), rng.nextFloat(skyH * 0.05, skyH * 0.4), rng.nextFloat(40, 80), rng));
    }
  } else {
    // Moon
    els.push(createMoon(rng.nextFloat(w * 0.6, w * 0.85), rng.nextFloat(skyH * 0.08, skyH * 0.25), 22, rng));
    // Stars
    for (let i = 0; i < rng.nextInt(20, 35); i++) {
      els.push(createStar(rng.nextFloat(5, w - 5), rng.nextFloat(5, skyH * 0.5), rng.nextFloat(1.5, 4), rng));
    }
    // Wispy clouds
    for (let i = 0; i < rng.nextInt(1, 3); i++) {
      els.push(detailedCloud(rng.nextFloat(20, w - 100), rng.nextFloat(skyH * 0.1, skyH * 0.3), rng.nextFloat(50, 90), rng));
    }
  }
  return els;
}

// ─── Fallback scene for themes without dedicated generators ──
function generateFallbackScene(rng: SeededRandom, w: number, h: number): SVGElementData[] {
  const elements: SVGElementData[] = [];
  const groundY = h * 0.52;

  // Sky background (uses gradient from defs injected by index.ts)
  elements.push(createRect(0, 0, w, groundY, 'url(#skyGrad)', { layer: 0, category: 'sky', modifiable: false }));
  elements.push(...richSky(rng, w, h, groundY));

  // Ground with gradient
  elements.push(createRect(0, groundY - 5, w, h - groundY + 5, 'url(#groundGrad)', { layer: 1, category: 'ground', modifiable: false }));
  elements.push(...richGround(rng, w, h, groundY, '#43A047'));

  // Distant mountains (background, with blur)
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    const mx = rng.nextFloat(-50, w * 0.5);
    const mw = rng.nextFloat(250, 400);
    const mh = rng.nextFloat(80, 150);
    elements.push(createPath(mx, groundY,
      `M${mx},${groundY} L${mx + mw * 0.4},${groundY - mh} L${mx + mw * 0.6},${groundY - mh * 0.8} L${mx + mw},${groundY} Z`,
      `hsl(${rng.nextInt(200, 230)}, ${rng.nextInt(15, 30)}%, ${rng.nextInt(45, 60)}%)`,
      { layer: 1, category: 'mountain', modifiable: false, opacity: 0.5, filter: 'url(#bgBlur)' }));
  }

  // Detailed trees
  for (let i = 0; i < rng.nextInt(5, 9); i++) {
    elements.push(detailedTree(rng.nextFloat(10, w - 30), groundY, rng.pick(['pine', 'oak', 'cherry', 'willow']), rng.nextFloat(60, 110), rng));
  }

  // Detailed flowers
  for (let i = 0; i < rng.nextInt(5, 10); i++) {
    elements.push(detailedFlower(rng.nextFloat(20, w - 20), rng.nextFloat(groundY + 10, h - 15), rng.pick(['daisy', 'tulip', 'rose', 'sunflower']), rng.nextFloat(15, 30), rng));
  }

  // Detailed rocks with shadow
  for (let i = 0; i < rng.nextInt(2, 5); i++) {
    const rock = detailedRock(rng.nextFloat(20, w - 20), rng.nextFloat(groundY + 15, h * 0.85), rng.nextFloat(15, 28), rng);
    rock.filter = 'url(#softShadow)';
    elements.push(rock);
  }

  // Birds in sky
  for (let i = 0; i < rng.nextInt(2, 5); i++) {
    elements.push(detailedBird(rng.nextFloat(30, w - 30), rng.nextFloat(15, groundY * 0.4), true, rng));
  }

  // Butterflies
  for (let i = 0; i < rng.nextInt(1, 4); i++) {
    elements.push(detailedButterfly(rng.nextFloat(40, w - 40), rng.nextFloat(groundY * 0.3, groundY), rng.nextFloat(12, 22), rng));
  }

  // House with shadow
  if (rng.chance(0.6)) {
    const house = detailedHouse(rng.nextFloat(w * 0.15, w * 0.5), groundY - rng.nextFloat(50, 80), rng.nextFloat(80, 110), rng.nextFloat(70, 100), rng);
    house.filter = 'url(#shadow)';
    elements.push(house);
  }

  // Fence
  if (rng.chance(0.5)) {
    elements.push(detailedFence(rng.nextFloat(30, w * 0.35), groundY + 3, rng.nextFloat(80, 150), rng.nextFloat(30, 40), rng));
  }

  // People
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    elements.push(detailedPerson(rng.nextFloat(60, w - 60), groundY + 2, rng.nextFloat(40, 55), rng));
  }

  // Bench
  if (rng.chance(0.4)) {
    elements.push(detailedBench(rng.nextFloat(w * 0.2, w * 0.7), groundY, rng.nextFloat(35, 50), rng));
  }

  // Mushrooms
  for (let i = 0; i < rng.nextInt(0, 3); i++) {
    elements.push(detailedMushroom(rng.nextFloat(30, w - 30), rng.nextFloat(groundY + 10, h * 0.85), rng.nextFloat(15, 25), rng));
  }

  // Atmospheric haze at horizon
  elements.push(createEllipse(w / 2, groundY, w * 0.6, 15, '#B0D4F1', { layer: 1, category: 'haze', modifiable: false, opacity: 0.15 }));

  return elements;
}

function generateGenericScene(theme: SceneTheme, rng: SeededRandom, w: number, h: number): SVGElementData[] {
  // All themes without dedicated generators use the enhanced fallback
  return generateFallbackScene(rng, w, h);
}

export { generateGenericScene };
