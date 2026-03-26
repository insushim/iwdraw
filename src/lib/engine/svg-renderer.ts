import { SVGElementData, Difference, DifferenceType } from './types';

export class SVGRenderer {
  static renderToString(elements: SVGElementData[], width: number, height: number, defs?: string): string {
    const sorted = [...elements].sort((a, b) => a.layer - b.layer);
    const inner = sorted.map(el => this.renderElement(el)).join('\n');
    const defsStr = defs ? `<defs>${defs}</defs>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width:100%;height:100%;display:block">${defsStr}${inner}</svg>`;
  }

  static renderElement(el: SVGElementData): string {
    const attrs = this.commonAttrs(el);

    switch (el.type) {
      case 'rect':
        return `<rect x="${el.x}" y="${el.y}" width="${el.width || 0}" height="${el.height || 0}" rx="${el.rx || 0}" ry="${el.ry || 0}" ${attrs}/>`;
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
        const filter = el.filter ? ` filter="${el.filter}"` : '';
        const clipPathAttr = el.clipPath ? ` clip-path="${el.clipPath}"` : '';
        return `<g${transform}${opacity}${filter}${clipPathAttr} data-id="${el.id}">${childrenStr}</g>`;
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
    if (el.filter) parts.push(`filter="${el.filter}"`);
    if (el.clipPath) parts.push(`clip-path="${el.clipPath}"`);
    parts.push(`data-id="${el.id}"`);
    return parts.join(' ');
  }

  private static escapeXml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  static renderModifiedScene(elements: SVGElementData[], differences: Difference[], width: number, height: number, defs?: string): string {
    const modified = this.applyDifferences(JSON.parse(JSON.stringify(elements)), differences);
    return this.renderToString(modified, width, height, defs);
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
        if (el) this.applyColorToElement(el, diff.modifiedValue as string);
        break;
      case DifferenceType.ELEMENT_REMOVED:
        this.removeElement(elements, diff.elementId);
        break;
      case DifferenceType.ELEMENT_ADDED: {
        const newEl = diff.modifiedValue as Partial<SVGElementData>;
        if (newEl) {
          elements.push({
            id: `added_${diff.id}`, type: (newEl.type as SVGElementData['type']) || 'circle',
            x: newEl.x || diff.hitArea.x + diff.hitArea.width / 2,
            y: newEl.y || diff.hitArea.y + diff.hitArea.height / 2,
            radius: newEl.radius || 8, fill: newEl.fill || '#FF0000',
            layer: 3, category: 'added', modifiable: false,
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
          if (el.children) for (const c of el.children) { if (c.width) c.width *= scale; if (c.height) c.height *= scale; if (c.radius) c.radius *= scale; }
        }
        break;
      case DifferenceType.POSITION_SHIFT:
        if (el) {
          const shift = diff.modifiedValue as { x: number; y: number };
          el.x += shift.x; el.y += shift.y;
          if (el.children) for (const c of el.children) { c.x += shift.x; c.y += shift.y; }
        }
        break;
      case DifferenceType.ROTATION_CHANGE:
        if (el) el.rotation = diff.modifiedValue as number;
        break;
      case DifferenceType.OPACITY_CHANGE:
        if (el) el.opacity = diff.modifiedValue as number;
        break;
      case DifferenceType.MIRROR_FLIP:
        if (el) { const cx = el.x + (el.width ? el.width / 2 : 0); el.transform = `translate(${cx * 2}, 0) scale(-1, 1)`; }
        break;
      case DifferenceType.DETAIL_REMOVED:
        if (el && el.children && el.children.length > 1) el.children.pop();
        break;
      case DifferenceType.DETAIL_ADDED:
        if (el) {
          const detail = diff.modifiedValue as { type: string; radius: number; fill: string };
          if (!el.children) el.children = [];
          el.children.push({ id: `detail_${diff.id}`, type: 'circle', x: el.x + 10, y: el.y - 10, radius: detail?.radius || 6, fill: detail?.fill || '#FF0000', layer: el.layer, category: 'detail', modifiable: false });
        }
        break;
      default:
        if (el) this.applyColorToElement(el, diff.modifiedValue as string);
    }
  }

  private static applyColorToElement(el: SVGElementData, color: string): void {
    if (el.fill && el.fill !== 'none' && !el.fill.startsWith('url(')) el.fill = color;
    if (el.children && el.children.length > 0) {
      for (const child of el.children) {
        if (child.fill && child.fill !== 'none' && !child.fill.startsWith('url(')) { child.fill = color; break; }
      }
    }
  }

  static findElement(elements: SVGElementData[], id: string): SVGElementData | null {
    for (const el of elements) {
      if (el.id === id) return el;
      if (el.children) { const found = this.findElement(el.children, id); if (found) return found; }
    }
    return null;
  }

  private static removeElement(elements: SVGElementData[], id: string): boolean {
    for (let i = 0; i < elements.length; i++) {
      if (elements[i].id === id) { elements.splice(i, 1); return true; }
      if (elements[i].children) { if (this.removeElement(elements[i].children!, id)) return true; }
    }
    return false;
  }

  static getBoundingBox(el: SVGElementData): { x: number; y: number; width: number; height: number } {
    if (el.type === 'group' && el.children && el.children.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const child of el.children) {
        const bb = this.getBoundingBox(child);
        minX = Math.min(minX, bb.x); minY = Math.min(minY, bb.y);
        maxX = Math.max(maxX, bb.x + bb.width); maxY = Math.max(maxY, bb.y + bb.height);
      }
      if (minX === Infinity) return { x: el.x - 20, y: el.y - 20, width: 40, height: 40 };
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    switch (el.type) {
      case 'rect': return { x: el.x, y: el.y, width: el.width || 0, height: el.height || 0 };
      case 'circle': return { x: el.x - (el.radius || 0), y: el.y - (el.radius || 0), width: (el.radius || 0) * 2, height: (el.radius || 0) * 2 };
      case 'ellipse': return { x: el.x - (el.rx || 0), y: el.y - (el.ry || 0), width: (el.rx || 0) * 2, height: (el.ry || 0) * 2 };
      default: return { x: el.x - 20, y: el.y - 20, width: 40, height: 40 };
    }
  }
}
