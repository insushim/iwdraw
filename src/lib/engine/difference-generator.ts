import { SVGElementData, Difference, DifferenceType, DifficultyConfig, Scene } from './types';
import { SeededRandom } from './random';
import { SVGRenderer } from './svg-renderer';

// Highly contrasting color pairs for easy visibility
const COLOR_PAIRS: [string, string][] = [
  ['#FF0000', '#0066FF'],
  ['#FFD700', '#6B21A8'],
  ['#00CC00', '#FF4444'],
  ['#FF6600', '#0099CC'],
  ['#FF1493', '#00AA00'],
  ['#4169E1', '#FF8C00'],
  ['#8B0000', '#00CED1'],
  ['#228B22', '#DC143C'],
];

export class DifferenceGenerator {
  private scene: Scene;
  private config: DifficultyConfig;
  private rng: SeededRandom;

  constructor(scene: Scene, config: DifficultyConfig, rng: SeededRandom) {
    this.scene = scene;
    this.config = config;
    this.rng = rng;
  }

  generateDifferences(): Difference[] {
    const modifiable = this.getAllModifiable(this.scene.elements);
    if (modifiable.length === 0) return [];

    // Filter to only elements with reasonable visual size
    const viable = modifiable.filter(el => {
      const bb = SVGRenderer.getBoundingBox(el);
      return bb.width > 8 && bb.height > 8;
    });

    if (viable.length === 0) return [];

    const count = Math.min(this.config.differenceCount, viable.length);
    const shuffled = this.rng.shuffle(viable);
    const selected = this.selectSpread(shuffled, count);
    const differences: Difference[] = [];

    for (let i = 0; i < selected.length; i++) {
      const el = selected[i];
      // Prefer COLOR_CHANGE and ELEMENT_REMOVED - most visible
      const preferredTypes = [
        DifferenceType.COLOR_CHANGE,
        DifferenceType.COLOR_CHANGE,
        DifferenceType.ELEMENT_REMOVED,
        DifferenceType.SIZE_CHANGE,
        DifferenceType.POSITION_SHIFT,
      ];
      const availTypes = this.config.differenceTypes;
      const pool = preferredTypes.filter(t => availTypes.includes(t));
      const diffType = pool.length > 0 ? this.rng.pick(pool) : this.rng.pick(availTypes);
      const diff = this.createDifference(el, diffType, i);
      if (diff) differences.push(diff);
    }

    return differences;
  }

  private getAllModifiable(elements: SVGElementData[]): SVGElementData[] {
    const result: SVGElementData[] = [];
    for (const el of elements) {
      if (el.modifiable) result.push(el);
      if (el.children) {
        result.push(...this.getAllModifiable(el.children));
      }
    }
    return result;
  }

  private selectSpread(elements: SVGElementData[], count: number): SVGElementData[] {
    if (elements.length <= count) return elements;
    const selected: SVGElementData[] = [];
    const minDist = 40; // Reduced to allow more hits

    for (const el of elements) {
      if (selected.length >= count) break;
      const bb = SVGRenderer.getBoundingBox(el);
      const cx = bb.x + bb.width / 2;
      const cy = bb.y + bb.height / 2;
      const tooClose = selected.some(s => {
        const sbb = SVGRenderer.getBoundingBox(s);
        const scx = sbb.x + sbb.width / 2;
        const scy = sbb.y + sbb.height / 2;
        const dx = scx - cx;
        const dy = scy - cy;
        return Math.sqrt(dx * dx + dy * dy) < minDist;
      });
      if (!tooClose) selected.push(el);
    }

    if (selected.length < count) {
      for (const el of elements) {
        if (selected.length >= count) break;
        if (!selected.includes(el)) selected.push(el);
      }
    }

    return selected;
  }

  // FIXED: Compute proper hitArea using bounding box with generous padding
  private getHitArea(el: SVGElementData): { x: number; y: number; width: number; height: number } {
    const bb = SVGRenderer.getBoundingBox(el);
    const pad = 25; // generous padding for easier clicking
    const minSize = 50; // minimum hit area size

    const w = Math.max(bb.width + pad * 2, minSize);
    const h = Math.max(bb.height + pad * 2, minSize);

    return {
      x: bb.x + bb.width / 2 - w / 2,
      y: bb.y + bb.height / 2 - h / 2,
      width: w,
      height: h,
    };
  }

  private getDifficultyLabel(): 'easy' | 'medium' | 'hard' | 'expert' {
    if (this.config.differenceCount <= 3) return 'easy';
    if (this.config.differenceCount <= 5) return 'medium';
    if (this.config.differenceCount <= 7) return 'hard';
    return 'expert';
  }

  private createDifference(el: SVGElementData, type: DifferenceType, idx: number): Difference | null {
    const id = `diff_${idx}`;
    const difficulty = this.getDifficultyLabel();
    const hitArea = this.getHitArea(el);

    switch (type) {
      case DifferenceType.COLOR_CHANGE: {
        const original = el.fill || '#888888';
        // Use highly contrasting colors for visibility
        const pair = this.rng.pick(COLOR_PAIRS);
        const modified = original === pair[0] ? pair[1] : pair[this.rng.nextInt(0, 1)];
        return { id, elementId: el.id, type, description: '색상이 변경됨', difficulty, originalValue: original, modifiedValue: modified, hitArea };
      }

      case DifferenceType.ELEMENT_REMOVED:
        return { id, elementId: el.id, type, description: '요소가 제거됨', difficulty, originalValue: el, modifiedValue: null, hitArea };

      case DifferenceType.ELEMENT_ADDED: {
        const bb = SVGRenderer.getBoundingBox(el);
        const newEl: Partial<SVGElementData> = {
          type: 'circle',
          x: bb.x + bb.width / 2 + this.rng.nextFloat(-15, 15),
          y: bb.y + bb.height / 2 + this.rng.nextFloat(-15, 15),
          radius: this.rng.nextFloat(8, 18),
          fill: this.rng.nextColor(),
        };
        return { id, elementId: el.id, type, description: '새 요소가 추가됨', difficulty, originalValue: null, modifiedValue: newEl, hitArea };
      }

      case DifferenceType.SIZE_CHANGE: {
        const scale = difficulty === 'easy' || difficulty === 'medium'
          ? this.rng.nextFloat(1.4, 1.8)
          : this.rng.nextFloat(1.15, 1.3);
        return { id, elementId: el.id, type, description: '크기가 변경됨', difficulty, originalValue: 1, modifiedValue: scale, hitArea };
      }

      case DifferenceType.POSITION_SHIFT: {
        const shift = difficulty === 'easy' || difficulty === 'medium'
          ? this.rng.nextFloat(25, 45)
          : this.rng.nextFloat(12, 22);
        const dx = this.rng.chance(0.5) ? shift : -shift;
        const dy = this.rng.chance(0.5) ? shift * 0.5 : -shift * 0.5;
        const shiftedHitArea = { ...hitArea };
        // For position shift, hitArea is at BOTH original and shifted position
        shiftedHitArea.x = Math.min(hitArea.x, hitArea.x + dx) - 10;
        shiftedHitArea.y = Math.min(hitArea.y, hitArea.y + dy) - 10;
        shiftedHitArea.width = hitArea.width + Math.abs(dx) + 20;
        shiftedHitArea.height = hitArea.height + Math.abs(dy) + 20;
        return { id, elementId: el.id, type, description: '위치가 이동됨', difficulty, originalValue: { x: 0, y: 0 }, modifiedValue: { x: dx, y: dy }, hitArea: shiftedHitArea };
      }

      case DifferenceType.ROTATION_CHANGE: {
        const angle = this.rng.nextFloat(45, 180);
        return { id, elementId: el.id, type, description: '회전됨', difficulty, originalValue: 0, modifiedValue: angle, hitArea };
      }

      case DifferenceType.OPACITY_CHANGE: {
        const original = el.opacity ?? 1;
        const modified = Math.max(0.15, original - this.rng.nextFloat(0.3, 0.6));
        return { id, elementId: el.id, type, description: '투명도가 변경됨', difficulty, originalValue: original, modifiedValue: modified, hitArea };
      }

      case DifferenceType.MIRROR_FLIP:
        return { id, elementId: el.id, type, description: '좌우 반전됨', difficulty, originalValue: 1, modifiedValue: -1, hitArea };

      case DifferenceType.DETAIL_REMOVED:
        return { id, elementId: el.id, type, description: '세부 요소가 제거됨', difficulty, originalValue: el, modifiedValue: null, hitArea };

      case DifferenceType.DETAIL_ADDED: {
        return { id, elementId: el.id, type, description: '세부 요소가 추가됨', difficulty, originalValue: null, modifiedValue: { type: 'circle', radius: 6, fill: this.rng.nextColor() }, hitArea };
      }

      default:
        // Fallback to color change
        const pair = this.rng.pick(COLOR_PAIRS);
        return { id, elementId: el.id, type: DifferenceType.COLOR_CHANGE, description: '색상이 변경됨', difficulty, originalValue: el.fill, modifiedValue: pair[0], hitArea };
    }
  }
}
