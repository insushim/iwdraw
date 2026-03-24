import { SVGElementData, Difference, DifferenceType, DifficultyConfig, Scene } from './types';
import { SeededRandom } from './random';

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

    const count = Math.min(this.config.differenceCount, modifiable.length);
    const shuffled = this.rng.shuffle(modifiable);
    const selected = this.selectSpread(shuffled, count);
    const differences: Difference[] = [];

    for (let i = 0; i < selected.length; i++) {
      const el = selected[i];
      const availTypes = this.config.differenceTypes;
      const diffType = this.rng.pick(availTypes);
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
    const minDist = 60;

    for (const el of elements) {
      if (selected.length >= count) break;
      const tooClose = selected.some(s => {
        const dx = s.x - el.x;
        const dy = s.y - el.y;
        return Math.sqrt(dx * dx + dy * dy) < minDist;
      });
      if (!tooClose) selected.push(el);
    }

    // Fill remaining if needed
    if (selected.length < count) {
      for (const el of elements) {
        if (selected.length >= count) break;
        if (!selected.includes(el)) selected.push(el);
      }
    }

    return selected;
  }

  private getHitArea(el: SVGElementData): { x: number; y: number; width: number; height: number } {
    const pad = 15;
    const w = el.width || el.radius ? (el.radius! * 2) : 30;
    const h = el.height || el.radius ? (el.radius! * 2) : 30;
    return {
      x: el.x - pad - (w / 2),
      y: el.y - pad - (h / 2),
      width: w + pad * 2,
      height: h + pad * 2,
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
        const original = el.fill;
        let modified: string;
        if (this.config.colorSimilarity > 0.6) {
          // Similar color - shift hue slightly
          const hue = this.rng.nextInt(-30, 30);
          modified = this.shiftColor(original, hue);
        } else {
          modified = this.rng.nextColor();
        }
        return { id, elementId: el.id, type, description: '색상이 변경됨', difficulty, originalValue: original, modifiedValue: modified, hitArea };
      }

      case DifferenceType.ELEMENT_REMOVED:
        return { id, elementId: el.id, type, description: '요소가 제거됨', difficulty, originalValue: el, modifiedValue: null, hitArea };

      case DifferenceType.ELEMENT_ADDED: {
        const newEl: Partial<SVGElementData> = {
          type: 'circle',
          x: el.x + this.rng.nextFloat(-20, 20),
          y: el.y + this.rng.nextFloat(-20, 20),
          radius: this.rng.nextFloat(5, 15),
          fill: this.rng.nextColor(),
        };
        return { id, elementId: el.id, type, description: '새 요소가 추가됨', difficulty, originalValue: null, modifiedValue: newEl, hitArea };
      }

      case DifferenceType.SIZE_CHANGE: {
        const scale = difficulty === 'easy' || difficulty === 'medium'
          ? this.rng.nextFloat(1.3, 1.6)
          : this.rng.nextFloat(1.1, 1.2);
        return { id, elementId: el.id, type, description: '크기가 변경됨', difficulty, originalValue: 1, modifiedValue: scale, hitArea };
      }

      case DifferenceType.POSITION_SHIFT: {
        const shift = difficulty === 'easy' || difficulty === 'medium'
          ? this.rng.nextFloat(20, 40)
          : this.rng.nextFloat(8, 18);
        const dx = this.rng.chance(0.5) ? shift : -shift;
        const dy = this.rng.chance(0.5) ? shift * 0.5 : -shift * 0.5;
        return { id, elementId: el.id, type, description: '위치가 이동됨', difficulty, originalValue: { x: 0, y: 0 }, modifiedValue: { x: dx, y: dy }, hitArea: { ...hitArea, x: hitArea.x + dx, y: hitArea.y + dy } };
      }

      case DifferenceType.ROTATION_CHANGE: {
        const angle = this.rng.nextFloat(30, 180);
        return { id, elementId: el.id, type, description: '회전됨', difficulty, originalValue: 0, modifiedValue: angle, hitArea };
      }

      case DifferenceType.OPACITY_CHANGE: {
        const original = el.opacity ?? 1;
        const modified = Math.max(0.2, original - this.rng.nextFloat(0.2, 0.5));
        return { id, elementId: el.id, type, description: '투명도가 변경됨', difficulty, originalValue: original, modifiedValue: modified, hitArea };
      }

      case DifferenceType.MIRROR_FLIP:
        return { id, elementId: el.id, type, description: '좌우 반전됨', difficulty, originalValue: 1, modifiedValue: -1, hitArea };

      case DifferenceType.DETAIL_REMOVED:
        return { id, elementId: el.id, type, description: '세부 요소가 제거됨', difficulty, originalValue: el, modifiedValue: null, hitArea };

      case DifferenceType.DETAIL_ADDED: {
        return { id, elementId: el.id, type, description: '세부 요소가 추가됨', difficulty, originalValue: null, modifiedValue: { type: 'circle', radius: 4, fill: this.rng.nextColor() }, hitArea };
      }

      default:
        // Fallback to color change
        return { id, elementId: el.id, type: DifferenceType.COLOR_CHANGE, description: '색상이 변경됨', difficulty, originalValue: el.fill, modifiedValue: this.rng.nextColor(), hitArea };
    }
  }

  private shiftColor(color: string, hueShift: number): string {
    // Simple color shift - generate a new color nearby
    if (color.startsWith('hsl')) {
      const match = color.match(/hsl\((\d+)/);
      if (match) {
        const h = (parseInt(match[1]) + hueShift + 360) % 360;
        return color.replace(/hsl\(\d+/, `hsl(${h}`);
      }
    }
    // For hex/named colors, just generate a new random one
    return this.rng.nextColor();
  }
}
