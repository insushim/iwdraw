import { SVGElementData } from './types';
import { SeededRandom } from './random';

type Opts = Partial<Pick<SVGElementData, 'stroke' | 'strokeWidth' | 'opacity' | 'rotation' | 'transform' | 'layer' | 'category' | 'modifiable' | 'id'>>;

let _id = 0;
function uid(prefix = 'el'): string {
  return `${prefix}_${++_id}_${Date.now().toString(36)}`;
}
export function resetId() { _id = 0; }

function base(type: SVGElementData['type'], x: number, y: number, fill: string, opts: Opts = {}): SVGElementData {
  return {
    id: opts.id || uid(type),
    type,
    x,
    y,
    fill,
    layer: opts.layer ?? 0,
    category: opts.category ?? 'misc',
    modifiable: opts.modifiable ?? false,
    stroke: opts.stroke,
    strokeWidth: opts.strokeWidth,
    opacity: opts.opacity,
    rotation: opts.rotation,
    transform: opts.transform,
  };
}

// Basic shapes
export function createRect(x: number, y: number, w: number, h: number, fill: string, opts: Opts = {}): SVGElementData {
  return { ...base('rect', x, y, fill, opts), width: w, height: h };
}

export function createCircle(x: number, y: number, r: number, fill: string, opts: Opts = {}): SVGElementData {
  return { ...base('circle', x, y, fill, opts), radius: r };
}

export function createEllipse(x: number, y: number, rx: number, ry: number, fill: string, opts: Opts = {}): SVGElementData {
  return { ...base('ellipse', x, y, fill, opts), rx, ry };
}

export function createPolygon(x: number, y: number, points: string, fill: string, opts: Opts = {}): SVGElementData {
  return { ...base('polygon', x, y, fill, opts), points };
}

export function createPath(x: number, y: number, d: string, fill: string, opts: Opts = {}): SVGElementData {
  return { ...base('path', x, y, fill, opts), d };
}

export function createText(x: number, y: number, text: string, fill: string, opts: Opts & { fontSize?: number; fontFamily?: string } = {}): SVGElementData {
  return { ...base('text', x, y, fill, opts), text, fontSize: opts.fontSize ?? 14, fontFamily: opts.fontFamily };
}

export function createGroup(x: number, y: number, children: SVGElementData[], opts: Opts = {}): SVGElementData {
  return { ...base('group', x, y, 'none', opts), children };
}

export function createLine(x1: number, y1: number, x2: number, y2: number, stroke: string, opts: Opts = {}): SVGElementData {
  return { ...base('line', x1, y1, 'none', { ...opts, stroke, strokeWidth: opts.strokeWidth ?? 2 }), x1, y1, x2, y2 };
}

// Complex: Trees
export function createTree(x: number, y: number, type: 'pine' | 'oak' | 'palm' | 'cherry' | 'willow', size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const trunkColor = rng.pick(['#8B4513', '#6B3410', '#7B3F00', '#5C3317']);

  switch (type) {
    case 'pine': {
      children.push(createRect(x - s * 0.06, y - s * 0.1, s * 0.12, s * 0.4, trunkColor, { layer: 2 }));
      for (let i = 0; i < 3; i++) {
        const w = s * (0.5 - i * 0.1);
        const ty = y - s * 0.1 - i * s * 0.25;
        children.push(createPolygon(x, ty, `${x},${ty - s * 0.2} ${x - w / 2},${ty + s * 0.1} ${x + w / 2},${ty + s * 0.1}`,
          rng.nextHSL([100, 140], [40, 70], [25, 40]), { layer: 2 }));
      }
      break;
    }
    case 'oak': {
      children.push(createRect(x - s * 0.08, y - s * 0.15, s * 0.16, s * 0.5, trunkColor, { layer: 2 }));
      const crownColor = rng.nextHSL([90, 140], [40, 60], [30, 50]);
      children.push(createCircle(x, y - s * 0.45, s * 0.3, crownColor, { layer: 2 }));
      children.push(createCircle(x - s * 0.15, y - s * 0.35, s * 0.2, crownColor, { layer: 2, opacity: 0.9 }));
      children.push(createCircle(x + s * 0.15, y - s * 0.35, s * 0.2, crownColor, { layer: 2, opacity: 0.9 }));
      break;
    }
    case 'palm': {
      const trunkPath = `M${x},${y} Q${x + s * 0.1},${y - s * 0.3} ${x + s * 0.05},${y - s * 0.6}`;
      children.push(createPath(x, y, trunkPath, 'none', { stroke: trunkColor, strokeWidth: s * 0.08, layer: 2 }));
      const leafColor = rng.nextHSL([100, 130], [50, 70], [30, 45]);
      for (let i = 0; i < 5; i++) {
        const angle = (i * 72 - 36) * Math.PI / 180;
        const lx = x + s * 0.05 + Math.cos(angle) * s * 0.3;
        const ly = y - s * 0.6 + Math.sin(angle) * s * 0.15;
        const leafPath = `M${x + s * 0.05},${y - s * 0.6} Q${(x + s * 0.05 + lx) / 2},${(y - s * 0.6 + ly) / 2 - s * 0.1} ${lx},${ly}`;
        children.push(createPath(x, y, leafPath, 'none', { stroke: leafColor, strokeWidth: s * 0.04, layer: 2 }));
      }
      break;
    }
    case 'cherry': {
      children.push(createRect(x - s * 0.06, y - s * 0.1, s * 0.12, s * 0.4, trunkColor, { layer: 2 }));
      const pink = rng.nextHSL([330, 350], [60, 80], [70, 85]);
      children.push(createCircle(x, y - s * 0.4, s * 0.28, pink, { layer: 2, opacity: 0.85 }));
      children.push(createCircle(x - s * 0.18, y - s * 0.3, s * 0.18, pink, { layer: 2, opacity: 0.8 }));
      children.push(createCircle(x + s * 0.18, y - s * 0.3, s * 0.18, pink, { layer: 2, opacity: 0.8 }));
      for (let i = 0; i < 4; i++) {
        children.push(createCircle(x + rng.nextFloat(-s * 0.3, s * 0.3), y - rng.nextFloat(s * 0.2, s * 0.5), s * 0.02, '#FFB7C5', { layer: 4, opacity: 0.7 }));
      }
      break;
    }
    case 'willow': {
      children.push(createRect(x - s * 0.07, y - s * 0.1, s * 0.14, s * 0.45, trunkColor, { layer: 2 }));
      const willowGreen = rng.nextHSL([90, 120], [40, 60], [35, 50]);
      for (let i = 0; i < 8; i++) {
        const bx = x + rng.nextFloat(-s * 0.25, s * 0.25);
        const by = y - s * 0.45;
        const endY = y + rng.nextFloat(-s * 0.05, s * 0.15);
        const cp = bx + rng.nextFloat(-s * 0.1, s * 0.1);
        const branchPath = `M${bx},${by} Q${cp},${(by + endY) / 2} ${bx + rng.nextFloat(-s * 0.05, s * 0.05)},${endY}`;
        children.push(createPath(x, y, branchPath, 'none', { stroke: willowGreen, strokeWidth: s * 0.02, layer: 2, opacity: 0.7 }));
      }
      break;
    }
  }

  return createGroup(x, y, children, { layer: 2, category: 'tree', modifiable: true, id: uid('tree') });
}

// Flower
export function createFlower(x: number, y: number, type: 'daisy' | 'tulip' | 'rose' | 'sunflower', size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const stemColor = rng.nextHSL([100, 130], [40, 60], [30, 45]);

  children.push(createLine(x, y, x, y - s * 0.5, stemColor, { strokeWidth: s * 0.04, layer: 3 }));

  switch (type) {
    case 'daisy': {
      const petalCount = rng.nextInt(6, 10);
      for (let i = 0; i < petalCount; i++) {
        const angle = (i * 360 / petalCount) * Math.PI / 180;
        const px = x + Math.cos(angle) * s * 0.15;
        const py = y - s * 0.5 + Math.sin(angle) * s * 0.15;
        children.push(createEllipse(px, py, s * 0.08, s * 0.04, 'white', { rotation: i * 360 / petalCount, layer: 3 }));
      }
      children.push(createCircle(x, y - s * 0.5, s * 0.06, '#FFD700', { layer: 3 }));
      break;
    }
    case 'tulip': {
      const tulipColor = rng.pick(['#FF4444', '#FF69B4', '#FFD700', '#FF6347', '#DA70D6']);
      const td = `M${x - s * 0.1},${y - s * 0.45} Q${x - s * 0.12},${y - s * 0.65} ${x},${y - s * 0.7} Q${x + s * 0.12},${y - s * 0.65} ${x + s * 0.1},${y - s * 0.45} Z`;
      children.push(createPath(x, y, td, tulipColor, { layer: 3 }));
      break;
    }
    case 'rose': {
      const roseColor = rng.pick(['#DC143C', '#FF1493', '#C71585', '#FF69B4']);
      for (let i = 0; i < 4; i++) {
        const r = s * (0.12 - i * 0.02);
        const angle = i * 60;
        children.push(createCircle(x + Math.cos(angle * Math.PI / 180) * s * 0.02, y - s * 0.5 + Math.sin(angle * Math.PI / 180) * s * 0.02, r, roseColor, { layer: 3, opacity: 0.8 + i * 0.05 }));
      }
      break;
    }
    case 'sunflower': {
      children.push(createCircle(x, y - s * 0.5, s * 0.1, '#5C3317', { layer: 3 }));
      for (let i = 0; i < 12; i++) {
        const angle = (i * 30) * Math.PI / 180;
        const px = x + Math.cos(angle) * s * 0.18;
        const py = y - s * 0.5 + Math.sin(angle) * s * 0.18;
        children.push(createEllipse(px, py, s * 0.08, s * 0.035, '#FFD700', { rotation: i * 30, layer: 3 }));
      }
      break;
    }
  }

  return createGroup(x, y, children, { layer: 3, category: 'flower', modifiable: true, id: uid('flower') });
}

// Cloud
export function createCloud(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const count = rng.nextInt(3, 5);
  const color = rng.pick(['#FFFFFF', '#F8F8FF', '#F0F8FF']);

  for (let i = 0; i < count; i++) {
    const cx = x + (i - count / 2) * s * 0.3;
    const cy = y + rng.nextFloat(-s * 0.1, s * 0.1);
    const r = s * rng.nextFloat(0.2, 0.35);
    children.push(createCircle(cx, cy, r, color, { layer: 0, opacity: 0.85 }));
  }

  return createGroup(x, y, children, { layer: 0, category: 'cloud', modifiable: true, id: uid('cloud'), opacity: 0.9 });
}

// Mountain
export function createMountain(x: number, y: number, width: number, height: number, rng: SeededRandom): SVGElementData {
  const color = rng.nextHSL([200, 230], [15, 30], [35, 55]);
  const pts = `${x},${y} ${x + width / 2},${y - height} ${x + width},${y}`;
  const children: SVGElementData[] = [
    createPolygon(x, y, pts, color, { layer: 1 }),
  ];
  if (rng.chance(0.6)) {
    const snowPts = `${x + width * 0.35},${y - height * 0.7} ${x + width / 2},${y - height} ${x + width * 0.65},${y - height * 0.7}`;
    children.push(createPolygon(x, y, snowPts, '#FAFAFA', { layer: 1, opacity: 0.9 }));
  }
  return createGroup(x, y, children, { layer: 1, category: 'mountain', modifiable: false, id: uid('mtn') });
}

// Star
export function createStar(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const pts = 5;
  let d = '';
  for (let i = 0; i < pts * 2; i++) {
    const r = i % 2 === 0 ? size : size * 0.4;
    const angle = (i * Math.PI / pts) - Math.PI / 2;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    d += `${i === 0 ? 'M' : 'L'}${px},${py} `;
  }
  d += 'Z';
  return createPath(x, y, d, rng.pick(['#FFD700', '#FFF8DC', '#FFFACD']), { layer: 0, category: 'star', modifiable: true, id: uid('star'), opacity: rng.nextFloat(0.5, 1) });
}

// Moon
export function createMoon(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const d = `M${x},${y - size} A${size},${size} 0 1,1 ${x},${y + size} A${size * 0.7},${size} 0 1,0 ${x},${y - size} Z`;
  return createPath(x, y, d, '#FFF8DC', { layer: 0, category: 'moon', modifiable: true, id: uid('moon'), opacity: 0.95 });
}

// House
export function createHouse(x: number, y: number, style: 'modern' | 'traditional' | 'cabin' | 'apartment', size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [];
  const wallColor = rng.pick(['#F5DEB3', '#D2B48C', '#E8D5B7', '#FFF8DC', '#FFE4C4', '#DCDCDC', '#F0E68C']);

  switch (style) {
    case 'modern': {
      children.push(createRect(x, y - s * 0.6, s, s * 0.6, wallColor, { layer: 2 }));
      children.push(createRect(x + s * 0.1, y - s * 0.5, s * 0.35, s * 0.3, '#87CEEB', { layer: 2, opacity: 0.6, stroke: '#666', strokeWidth: 1 }));
      children.push(createRect(x + s * 0.55, y - s * 0.5, s * 0.35, s * 0.3, '#87CEEB', { layer: 2, opacity: 0.6, stroke: '#666', strokeWidth: 1 }));
      children.push(createRect(x + s * 0.35, y - s * 0.18, s * 0.3, s * 0.18, '#8B4513', { layer: 2 }));
      break;
    }
    case 'traditional': {
      children.push(createRect(x, y - s * 0.5, s, s * 0.5, wallColor, { layer: 2 }));
      const roofPts = `${x - s * 0.1},${y - s * 0.5} ${x + s / 2},${y - s * 0.85} ${x + s + s * 0.1},${y - s * 0.5}`;
      children.push(createPolygon(x, y, roofPts, rng.pick(['#8B0000', '#A0522D', '#654321', '#2F4F4F']), { layer: 2 }));
      children.push(createRect(x + s * 0.15, y - s * 0.4, s * 0.15, s * 0.15, '#87CEEB', { layer: 2, stroke: '#555', strokeWidth: 1 }));
      children.push(createRect(x + s * 0.7, y - s * 0.4, s * 0.15, s * 0.15, '#87CEEB', { layer: 2, stroke: '#555', strokeWidth: 1 }));
      children.push(createRect(x + s * 0.4, y - s * 0.3, s * 0.2, s * 0.3, '#6B3410', { layer: 2 }));
      if (rng.chance(0.7)) {
        children.push(createRect(x + s * 0.75, y - s * 0.85, s * 0.1, s * 0.2, '#696969', { layer: 2 }));
      }
      break;
    }
    case 'cabin': {
      children.push(createRect(x, y - s * 0.45, s, s * 0.45, '#8B6914', { layer: 2, stroke: '#5C3317', strokeWidth: 2 }));
      for (let i = 0; i < 6; i++) {
        children.push(createLine(x, y - s * 0.45 + i * s * 0.075, x + s, y - s * 0.45 + i * s * 0.075, '#5C3317', { strokeWidth: 1, layer: 2 }));
      }
      const roofPts = `${x - s * 0.08},${y - s * 0.45} ${x + s / 2},${y - s * 0.75} ${x + s + s * 0.08},${y - s * 0.45}`;
      children.push(createPolygon(x, y, roofPts, '#654321', { layer: 2 }));
      children.push(createRect(x + s * 0.35, y - s * 0.3, s * 0.3, s * 0.3, '#6B3410', { layer: 2 }));
      break;
    }
    case 'apartment': {
      const floors = rng.nextInt(3, 5);
      const h = s * 0.2 * floors;
      children.push(createRect(x, y - h, s, h, wallColor, { layer: 2, stroke: '#999', strokeWidth: 1 }));
      for (let f = 0; f < floors; f++) {
        for (let w = 0; w < 3; w++) {
          const wx = x + s * 0.1 + w * s * 0.3;
          const wy = y - h + f * s * 0.2 + s * 0.05;
          const lit = rng.chance(0.6);
          children.push(createRect(wx, wy, s * 0.18, s * 0.12, lit ? '#FFD700' : '#4682B4', { layer: 2, opacity: lit ? 0.8 : 0.4, stroke: '#555', strokeWidth: 1 }));
        }
      }
      break;
    }
  }

  return createGroup(x, y, children, { layer: 2, category: 'building', modifiable: true, id: uid('house') });
}

// Car
export function createCar(x: number, y: number, type: 'sedan' | 'truck' | 'bus' | 'bicycle', rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const carColor = rng.nextColor([0, 360], [50, 80], [40, 60]);

  switch (type) {
    case 'sedan': {
      children.push(createRect(x, y - 20, 60, 20, carColor, { layer: 3 }));
      children.push(createRect(x + 10, y - 35, 40, 15, carColor, { layer: 3 }));
      children.push(createRect(x + 15, y - 33, 15, 11, '#87CEEB', { layer: 3, opacity: 0.6 }));
      children.push(createRect(x + 33, y - 33, 15, 11, '#87CEEB', { layer: 3, opacity: 0.6 }));
      children.push(createCircle(x + 15, y, 6, '#333', { layer: 3 }));
      children.push(createCircle(x + 45, y, 6, '#333', { layer: 3 }));
      break;
    }
    case 'truck': {
      children.push(createRect(x, y - 25, 35, 25, carColor, { layer: 3 }));
      children.push(createRect(x + 35, y - 35, 30, 35, '#F5F5DC', { layer: 3, stroke: '#999', strokeWidth: 1 }));
      children.push(createRect(x + 5, y - 20, 12, 10, '#87CEEB', { layer: 3, opacity: 0.6 }));
      children.push(createCircle(x + 15, y, 7, '#333', { layer: 3 }));
      children.push(createCircle(x + 55, y, 7, '#333', { layer: 3 }));
      break;
    }
    case 'bus': {
      children.push(createRect(x, y - 35, 80, 35, rng.pick(['#FFD700', '#FF6347', '#4169E1']), { layer: 3 }));
      for (let i = 0; i < 5; i++) {
        children.push(createRect(x + 5 + i * 15, y - 30, 10, 12, '#87CEEB', { layer: 3, opacity: 0.6 }));
      }
      children.push(createCircle(x + 18, y, 7, '#333', { layer: 3 }));
      children.push(createCircle(x + 62, y, 7, '#333', { layer: 3 }));
      break;
    }
    case 'bicycle': {
      children.push(createCircle(x, y, 10, 'none', { stroke: '#333', strokeWidth: 2, layer: 3 }));
      children.push(createCircle(x + 30, y, 10, 'none', { stroke: '#333', strokeWidth: 2, layer: 3 }));
      const frame = `M${x},${y} L${x + 15},${y - 15} L${x + 30},${y} M${x + 15},${y - 15} L${x + 15},${y - 5}`;
      children.push(createPath(x, y, frame, 'none', { stroke: carColor, strokeWidth: 2, layer: 3 }));
      break;
    }
  }

  return createGroup(x, y, children, { layer: 3, category: 'vehicle', modifiable: true, id: uid('car') });
}

// Lamp
export function createLamp(x: number, y: number, type: 'street' | 'garden', rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  if (type === 'street') {
    children.push(createRect(x - 2, y - 80, 4, 80, '#555', { layer: 2 }));
    children.push(createRect(x - 10, y - 85, 20, 8, '#444', { layer: 2 }));
    children.push(createCircle(x, y - 82, 5, '#FFD700', { layer: 2, opacity: 0.8 }));
  } else {
    children.push(createRect(x - 1.5, y - 40, 3, 40, '#8B7355', { layer: 2 }));
    children.push(createCircle(x, y - 42, 6, '#FFFACD', { layer: 2, opacity: 0.7 }));
  }
  return createGroup(x, y, children, { layer: 2, category: 'lamp', modifiable: true, id: uid('lamp') });
}

// Bird
export function createBird(x: number, y: number, flying: boolean, rng: SeededRandom): SVGElementData {
  const color = rng.pick(['#333', '#8B4513', '#4169E1', '#DC143C', '#FF8C00']);
  if (flying) {
    const d = `M${x - 8},${y} Q${x - 4},${y - 6} ${x},${y} Q${x + 4},${y - 6} ${x + 8},${y}`;
    return createPath(x, y, d, 'none', { stroke: color, strokeWidth: 2, layer: 4, category: 'bird', modifiable: true, id: uid('bird') });
  }
  const children: SVGElementData[] = [
    createCircle(x, y - 5, 4, color, { layer: 3 }),
    createEllipse(x, y, 6, 4, color, { layer: 3 }),
    createPolygon(x, y, `${x + 4},${y - 5} ${x + 8},${y - 4} ${x + 4},${y - 3}`, '#FF8C00', { layer: 3 }),
  ];
  return createGroup(x, y, children, { layer: 3, category: 'bird', modifiable: true, id: uid('bird') });
}

// Fish
export function createFish(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const color = rng.nextColor([0, 360], [60, 90], [50, 70]);
  const children: SVGElementData[] = [
    createEllipse(x, y, s * 0.5, s * 0.25, color, { layer: 3 }),
    createPolygon(x, y, `${x + s * 0.4},${y} ${x + s * 0.65},${y - s * 0.15} ${x + s * 0.65},${y + s * 0.15}`, color, { layer: 3 }),
    createCircle(x - s * 0.2, y - s * 0.05, s * 0.05, '#333', { layer: 3 }),
  ];
  return createGroup(x, y, children, { layer: 3, category: 'fish', modifiable: true, id: uid('fish') });
}

// Butterfly
export function createButterfly(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const wingColor = rng.nextColor([0, 360], [60, 90], [55, 75]);
  const children: SVGElementData[] = [
    createEllipse(x - s * 0.15, y - s * 0.05, s * 0.15, s * 0.1, wingColor, { layer: 4, opacity: 0.8 }),
    createEllipse(x + s * 0.15, y - s * 0.05, s * 0.15, s * 0.1, wingColor, { layer: 4, opacity: 0.8 }),
    createEllipse(x - s * 0.12, y + s * 0.08, s * 0.1, s * 0.07, wingColor, { layer: 4, opacity: 0.7 }),
    createEllipse(x + s * 0.12, y + s * 0.08, s * 0.1, s * 0.07, wingColor, { layer: 4, opacity: 0.7 }),
    createRect(x - 1, y - s * 0.1, 2, s * 0.25, '#333', { layer: 4 }),
  ];
  return createGroup(x, y, children, { layer: 4, category: 'butterfly', modifiable: true, id: uid('bfly') });
}

// Person (simple)
export function createPerson(x: number, y: number, rng: SeededRandom): SVGElementData {
  const skinColor = rng.pick(['#FDBCB4', '#D2996C', '#8D5524', '#C68642']);
  const clothColor = rng.nextColor([0, 360], [40, 70], [40, 65]);
  const children: SVGElementData[] = [
    createCircle(x, y - 28, 6, skinColor, { layer: 3 }),
    createRect(x - 6, y - 22, 12, 16, clothColor, { layer: 3 }),
    createRect(x - 4, y - 6, 3, 12, rng.pick(['#333', '#444', '#1E3A5F']), { layer: 3 }),
    createRect(x + 1, y - 6, 3, 12, rng.pick(['#333', '#444', '#1E3A5F']), { layer: 3 }),
  ];
  return createGroup(x, y, children, { layer: 3, category: 'person', modifiable: true, id: uid('person') });
}

// Bench
export function createBench(x: number, y: number, rng: SeededRandom): SVGElementData {
  const woodColor = rng.pick(['#8B6914', '#A0522D', '#6B3410']);
  const children: SVGElementData[] = [
    createRect(x, y - 12, 40, 4, woodColor, { layer: 3 }),
    createRect(x, y - 20, 40, 3, woodColor, { layer: 3 }),
    createRect(x + 3, y - 12, 3, 12, '#555', { layer: 3 }),
    createRect(x + 34, y - 12, 3, 12, '#555', { layer: 3 }),
  ];
  return createGroup(x, y, children, { layer: 3, category: 'bench', modifiable: true, id: uid('bench') });
}

// Furniture helpers
export function createTable(x: number, y: number, w: number, h: number, rng: SeededRandom): SVGElementData {
  const color = rng.pick(['#8B6914', '#A0522D', '#6B3410', '#DEB887']);
  const children: SVGElementData[] = [
    createRect(x, y, w, h * 0.15, color, { layer: 2 }),
    createRect(x + w * 0.1, y + h * 0.15, w * 0.05, h * 0.85, color, { layer: 2 }),
    createRect(x + w * 0.85, y + h * 0.15, w * 0.05, h * 0.85, color, { layer: 2 }),
  ];
  return createGroup(x, y, children, { layer: 2, category: 'furniture', modifiable: true, id: uid('table') });
}

export function createBookshelf(x: number, y: number, w: number, h: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [
    createRect(x, y, w, h, '#6B3410', { layer: 2, stroke: '#5C3317', strokeWidth: 1 }),
  ];
  const shelves = 4;
  for (let s = 0; s < shelves; s++) {
    const sy = y + s * (h / shelves);
    children.push(createRect(x, sy, w, 3, '#5C3317', { layer: 2 }));
    const books = rng.nextInt(3, 6);
    for (let b = 0; b < books; b++) {
      const bw = rng.nextFloat(w * 0.08, w * 0.15);
      const bh = rng.nextFloat(h / shelves * 0.5, h / shelves * 0.85);
      const bx = x + 3 + b * (w / books);
      children.push(createRect(bx, sy + (h / shelves) - bh, bw, bh - 3, rng.nextColor([0, 360], [40, 80], [30, 60]), { layer: 2 }));
    }
  }
  return createGroup(x, y, children, { layer: 2, category: 'furniture', modifiable: true, id: uid('bookshelf') });
}

export function createPottedPlant(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const children: SVGElementData[] = [
    createRect(x - s * 0.15, y - s * 0.2, s * 0.3, s * 0.2, rng.pick(['#A0522D', '#8B4513', '#D2691E']), { layer: 3 }),
    createCircle(x, y - s * 0.35, s * 0.2, rng.nextHSL([90, 140], [40, 60], [30, 50]), { layer: 3 }),
    createCircle(x - s * 0.1, y - s * 0.28, s * 0.12, rng.nextHSL([90, 140], [40, 60], [35, 50]), { layer: 3 }),
    createCircle(x + s * 0.1, y - s * 0.28, s * 0.12, rng.nextHSL([90, 140], [40, 60], [35, 50]), { layer: 3 }),
  ];
  return createGroup(x, y, children, { layer: 3, category: 'plant', modifiable: true, id: uid('plant') });
}

export function createClock(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const h = rng.nextInt(1, 12);
  const m = rng.nextInt(0, 11) * 5;
  const hAngle = (h * 30 + m * 0.5 - 90) * Math.PI / 180;
  const mAngle = (m * 6 - 90) * Math.PI / 180;
  const children: SVGElementData[] = [
    createCircle(x, y, s, '#FFFFF0', { layer: 3, stroke: '#333', strokeWidth: 2 }),
    createLine(x, y, x + Math.cos(hAngle) * s * 0.5, y + Math.sin(hAngle) * s * 0.5, '#333', { strokeWidth: 3, layer: 3 }),
    createLine(x, y, x + Math.cos(mAngle) * s * 0.7, y + Math.sin(mAngle) * s * 0.7, '#333', { strokeWidth: 2, layer: 3 }),
    createCircle(x, y, s * 0.06, '#333', { layer: 3 }),
  ];
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 - 90) * Math.PI / 180;
    children.push(createCircle(x + Math.cos(a) * s * 0.85, y + Math.sin(a) * s * 0.85, s * 0.04, '#333', { layer: 3 }));
  }
  return createGroup(x, y, children, { layer: 3, category: 'clock', modifiable: true, id: uid('clock') });
}

export function createPicture(x: number, y: number, w: number, h: number, rng: SeededRandom): SVGElementData {
  const frameColor = rng.pick(['#8B6914', '#333', '#C0C0C0', '#DAA520']);
  const bgColor = rng.nextColor([0, 360], [20, 50], [70, 90]);
  const children: SVGElementData[] = [
    createRect(x, y, w, h, frameColor, { layer: 3 }),
    createRect(x + 3, y + 3, w - 6, h - 6, bgColor, { layer: 3 }),
  ];
  if (rng.chance(0.5)) {
    children.push(createCircle(x + w * 0.7, y + h * 0.3, Math.min(w, h) * 0.1, '#FFD700', { layer: 3 }));
    children.push(createPolygon(x, y, `${x + 3},${y + h - 3} ${x + w * 0.3},${y + h * 0.5} ${x + w * 0.6},${y + h * 0.7} ${x + w - 3},${y + h - 3}`, rng.nextHSL([90, 140], [30, 50], [35, 50]), { layer: 3 }));
  }
  return createGroup(x, y, children, { layer: 3, category: 'picture', modifiable: true, id: uid('pic') });
}

export function createRug(x: number, y: number, w: number, h: number, rng: SeededRandom): SVGElementData {
  const color = rng.nextColor([0, 360], [40, 70], [40, 60]);
  const borderColor = rng.nextColor([0, 360], [30, 60], [30, 50]);
  const children: SVGElementData[] = [
    createRect(x, y, w, h, color, { layer: 1 }),
    createRect(x + 4, y + 4, w - 8, h - 8, borderColor, { layer: 1, opacity: 0.3 }),
  ];
  return createGroup(x, y, children, { layer: 1, category: 'rug', modifiable: true, id: uid('rug') });
}

export function createCushion(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const color = rng.nextColor([0, 360], [50, 80], [50, 70]);
  return createRect(x, y, size, size, color, { layer: 3, category: 'cushion', modifiable: true, id: uid('cushion') });
}

export function createVase(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const color = rng.nextColor([0, 360], [40, 70], [40, 65]);
  const d = `M${x - s * 0.15},${y} L${x - s * 0.2},${y - s * 0.3} Q${x - s * 0.25},${y - s * 0.6} ${x - s * 0.08},${y - s * 0.7} L${x + s * 0.08},${y - s * 0.7} Q${x + s * 0.25},${y - s * 0.6} ${x + s * 0.2},${y - s * 0.3} L${x + s * 0.15},${y} Z`;
  return createPath(x, y, d, color, { layer: 3, category: 'vase', modifiable: true, id: uid('vase') });
}

// Coral for underwater
export function createCoral(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const color = rng.pick(['#FF6B6B', '#FF8E53', '#FFA07A', '#FF69B4', '#DA70D6', '#E040FB']);
  const children: SVGElementData[] = [];
  const branches = rng.nextInt(3, 6);
  for (let i = 0; i < branches; i++) {
    const bx = x + rng.nextFloat(-s * 0.3, s * 0.3);
    const bh = rng.nextFloat(s * 0.3, s * 0.8);
    const d = `M${bx},${y} Q${bx + rng.nextFloat(-s * 0.2, s * 0.2)},${y - bh * 0.5} ${bx + rng.nextFloat(-s * 0.1, s * 0.1)},${y - bh}`;
    children.push(createPath(x, y, d, 'none', { stroke: color, strokeWidth: s * 0.06, layer: 2 }));
    children.push(createCircle(bx + rng.nextFloat(-s * 0.1, s * 0.1), y - bh, s * 0.06, color, { layer: 2 }));
  }
  return createGroup(x, y, children, { layer: 2, category: 'coral', modifiable: true, id: uid('coral') });
}

// Seaweed
export function createSeaweed(x: number, y: number, height: number, rng: SeededRandom): SVGElementData {
  const color = rng.nextHSL([100, 150], [40, 60], [25, 40]);
  const d = `M${x},${y} Q${x + rng.nextFloat(-10, 10)},${y - height * 0.33} ${x + rng.nextFloat(-5, 5)},${y - height * 0.66} Q${x + rng.nextFloat(-10, 10)},${y - height * 0.83} ${x},${y - height}`;
  return createPath(x, y, d, 'none', { stroke: color, strokeWidth: 4, layer: 2, category: 'seaweed', modifiable: true, id: uid('weed') });
}

// Mushroom
export function createMushroom(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const capColor = rng.pick(['#FF4444', '#8B4513', '#FFD700', '#FF6347']);
  const children: SVGElementData[] = [
    createRect(x - s * 0.06, y - s * 0.3, s * 0.12, s * 0.3, '#F5DEB3', { layer: 3 }),
    createEllipse(x, y - s * 0.3, s * 0.2, s * 0.12, capColor, { layer: 3 }),
  ];
  if (capColor === '#FF4444' && rng.chance(0.7)) {
    for (let i = 0; i < 3; i++) {
      children.push(createCircle(x + rng.nextFloat(-s * 0.12, s * 0.12), y - s * 0.32 + rng.nextFloat(-s * 0.05, s * 0.05), s * 0.03, '#FFFFFF', { layer: 3 }));
    }
  }
  return createGroup(x, y, children, { layer: 3, category: 'mushroom', modifiable: true, id: uid('mush') });
}

// Rock
export function createRock(x: number, y: number, size: number, rng: SeededRandom): SVGElementData {
  const s = size;
  const color = rng.nextHSL([0, 30], [5, 15], [45, 65]);
  const d = `M${x - s * 0.3},${y} Q${x - s * 0.35},${y - s * 0.2} ${x - s * 0.15},${y - s * 0.35} Q${x},${y - s * 0.4} ${x + s * 0.15},${y - s * 0.3} Q${x + s * 0.35},${y - s * 0.15} ${x + s * 0.3},${y} Z`;
  return createPath(x, y, d, color, { layer: 2, category: 'rock', modifiable: true, id: uid('rock') });
}

// Fence
export function createFence(x: number, y: number, width: number, rng: SeededRandom): SVGElementData {
  const children: SVGElementData[] = [];
  const color = rng.pick(['#DEB887', '#8B7355', '#FFFFFF']);
  const posts = Math.floor(width / 20);
  children.push(createRect(x, y - 15, width, 3, color, { layer: 2 }));
  children.push(createRect(x, y - 8, width, 3, color, { layer: 2 }));
  for (let i = 0; i <= posts; i++) {
    children.push(createRect(x + i * 20, y - 20, 3, 20, color, { layer: 2 }));
  }
  return createGroup(x, y, children, { layer: 2, category: 'fence', modifiable: true, id: uid('fence') });
}
