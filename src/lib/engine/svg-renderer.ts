import { SVGElementData, Difference, DifferenceType } from './types';

export class SVGRenderer {
  static renderToString(elements: SVGElementData[], width: number, height: number): string {
    const sorted = [...elements].sort((a, b) => a.layer - b.layer);
    const inner = sorted.map(el => this.renderElement(el)).join('\n');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${inner}</svg>`;
  }

  static renderElement(el: SVGElementData): string {
    const attrs = this.commonAttrs(el);

    switch (el.type) {
      case 'rect':
        return `<rect x="${el.x}" y="${el.y}" width="${el.width || 0}" height="${el.height || 0}" ${attrs}/>`;

      case 'circle':
        return `<circle cx="${el.x}" cy="${el.y}" r="${el.radius || 0}" ${attrs}/>`;

      case 'ellipse':
        return `<ellipse cx="${el.x}" cy="${el.y}" rx="${el.rx || 0}" ry="${el.ry || 0}" ${attrs}/>`;

      case 'polygon':
        return `<polygon points="${el.points || ''}" ${attrs}/>`;

      case 'path':
        return `<path d="${el.d || ''}" ${attrs}/>`;

      case 'text':
        return `<text x="${el.x}" y="${el.y}" font-size="${el.fontSize || 14}" ${attrs}>${this.escapeXml(el.text || '')}</text>`;

      case 'line':
        return `<line x1="${el.x1 ?? el.x}" y1="${el.y1 ?? el.y}" x2="${el.x2 || 0}" y2="${el.y2 || 0}" ${attrs}/>`;

      case 'group': {
        const childrenStr = (el.children || []).map(c => this.renderElement(c)).join('\n');
        const transform = el.transform ? ` transform="${el.transform}"` : '';
        const opacity = el.opacity !== undefined ? ` opacity="${el.opacity}"` : '';
        return `<g${transform}${opacity} data-id="${el.id}">${childrenStr}</g>`;
      }

      default:
        return '';
    }
  }

  private static commonAttrs(el: SVGElementData): string {
    const parts: string[] = [];
    if (el.fill && el.fill !== 'none' && el.type !== 'line') parts.push(`fill="${el.fill}"`);
    else if (el.type === 'line' || el.type === 'path') parts.push(`fill="${el.fill || 'none'}"`);
    if (el.stroke) parts.push(`stroke="${el.stroke}"`);
    if (el.strokeWidth) parts.push(`stroke-width="${el.strokeWidth}"`);
    if (el.opacity !== undefined && el.type !== 'group') parts.push(`opacity="${el.opacity}"`);
    if (el.rotation) {
      const cx = el.x + (el.width ? el.width / 2 : 0);
      const cy = el.y + (el.height ? el.height / 2 : 0);
      parts.push(`transform="rotate(${el.rotation}, ${cx}, ${cy})"`);
    } else if (el.transform) {
      parts.push(`transform="${el.transform}"`);
    }
    parts.push(`data-id="${el.id}"`);
    return parts.join(' ');
  }

  private static escapeXml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  static renderModifiedScene(elements: SVGElementData[], differences: Difference[], width: number, height: number): string {
    const modified = this.applyDifferences(JSON.parse(JSON.stringify(elements)), differences);
    return this.renderToString(modified, width, height);
  }

  static applyDifferences(elements: SVGElementData[], differences: Difference[]): SVGElementData[] {
    for (const diff of differences) {
      this.applyDifference(elements, diff);
    }
    return elements;
  }

  private static applyDifference(elements: SVGElementData[], diff: Difference): void {
    const el = this.findElement(elements, diff.elementId);
    if (!el && diff.type !== DifferenceType.ELEMENT_ADDED) return;

    switch (diff.type) {
      case DifferenceType.COLOR_CHANGE:
        if (el) el.fill = diff.modifiedValue as string;
        break;

      case DifferenceType.ELEMENT_REMOVED:
        this.removeElement(elements, diff.elementId);
        break;

      case DifferenceType.ELEMENT_ADDED: {
        const newEl = diff.modifiedValue as Partial<SVGElementData>;
        if (newEl) {
          elements.push({
            id: `added_${diff.id}`,
            type: (newEl.type as SVGElementData['type']) || 'circle',
            x: newEl.x || diff.hitArea.x + diff.hitArea.width / 2,
            y: newEl.y || diff.hitArea.y + diff.hitArea.height / 2,
            radius: newEl.radius || 5,
            fill: newEl.fill || '#FF0000',
            layer: 3,
            category: 'added',
            modifiable: false,
          });
        }
        break;
      }

      case DifferenceType.SIZE_CHANGE:
        if (el) {
          const scale = diff.modifiedValue as number;
          if (el.width) el.width *= scale;
          if (el.height) el.height *= scale;
          if (el.radius) el.radius *= scale;
          if (el.rx) el.rx *= scale;
          if (el.ry) el.ry *= scale;
        }
        break;

      case DifferenceType.POSITION_SHIFT:
        if (el) {
          const shift = diff.modifiedValue as { x: number; y: number };
          el.x += shift.x;
          el.y += shift.y;
        }
        break;

      case DifferenceType.ROTATION_CHANGE:
        if (el) el.rotation = diff.modifiedValue as number;
        break;

      case DifferenceType.OPACITY_CHANGE:
        if (el) el.opacity = diff.modifiedValue as number;
        break;

      case DifferenceType.MIRROR_FLIP:
        if (el) {
          const cx = el.x + (el.width ? el.width / 2 : 0);
          const cy = el.y + (el.height ? el.height / 2 : 0);
          el.transform = `scale(-1, 1) translate(${-2 * cx}, 0)`;
        }
        break;

      case DifferenceType.DETAIL_REMOVED:
        if (el && el.children && el.children.length > 0) {
          el.children.pop();
        }
        break;

      case DifferenceType.DETAIL_ADDED:
        if (el) {
          const detail = diff.modifiedValue as { type: string; radius: number; fill: string };
          if (!el.children) el.children = [];
          el.children.push({
            id: `detail_${diff.id}`,
            type: 'circle',
            x: el.x + 5,
            y: el.y - 5,
            radius: detail?.radius || 4,
            fill: detail?.fill || '#FF0000',
            layer: el.layer,
            category: 'detail',
            modifiable: false,
          });
        }
        break;

      default:
        if (el) el.fill = diff.modifiedValue as string;
    }
  }

  private static findElement(elements: SVGElementData[], id: string): SVGElementData | null {
    for (const el of elements) {
      if (el.id === id) return el;
      if (el.children) {
        const found = this.findElement(el.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  private static removeElement(elements: SVGElementData[], id: string): boolean {
    for (let i = 0; i < elements.length; i++) {
      if (elements[i].id === id) {
        elements.splice(i, 1);
        return true;
      }
      if (elements[i].children) {
        if (this.removeElement(elements[i].children!, id)) return true;
      }
    }
    return false;
  }
}
