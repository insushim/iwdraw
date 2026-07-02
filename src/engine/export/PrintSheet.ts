/*
 * PrintSheet: A4 세로 인쇄 레이아웃(이름표 포함). 교사 작품집 인쇄용.
 * 여러 작품을 격자로 배치한 인쇄용 캔버스(고해상도)를 만든다.
 */
export interface PrintItem {
  image: HTMLImageElement | HTMLCanvasElement;
  nickname: string;
}

export interface PrintSheetOptions {
  /** A4 210x297mm → 300dpi 기준 픽셀 */
  dpi?: number;
  cols?: number;
  rows?: number;
  title?: string;
}

const MM = { w: 210, h: 297 };

export function renderPrintSheet(items: PrintItem[], opts: PrintSheetOptions = {}): HTMLCanvasElement {
  const dpi = opts.dpi ?? 200;
  const cols = opts.cols ?? 2;
  const rows = opts.rows ?? 3;
  const pxW = Math.round((MM.w / 25.4) * dpi);
  const pxH = Math.round((MM.h / 25.4) * dpi);

  const canvas = document.createElement("canvas");
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, pxW, pxH);

  const margin = Math.round(pxW * 0.05);
  const headerH = opts.title ? Math.round(pxH * 0.06) : 0;
  if (opts.title) {
    ctx.fillStyle = "#2D2A26";
    ctx.font = `bold ${Math.round(headerH * 0.6)}px "Jua", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(opts.title, pxW / 2, margin + headerH * 0.4);
  }

  const gridTop = margin + headerH;
  const cellW = (pxW - margin * 2) / cols;
  const cellH = (pxH - gridTop - margin) / rows;
  const labelH = Math.round(cellH * 0.12);
  const pad = Math.round(cellW * 0.04);

  const perPage = cols * rows;
  const page = items.slice(0, perPage);

  page.forEach((item, i) => {
    const cx = margin + (i % cols) * cellW;
    const cy = gridTop + Math.floor(i / cols) * cellH;

    // 이미지 영역(비율 유지)
    const areaW = cellW - pad * 2;
    const areaH = cellH - labelH - pad * 2;
    const iw = item.image.width;
    const ih = item.image.height;
    const scale = Math.min(areaW / iw, areaH / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(item.image, cx + pad + (areaW - dw) / 2, cy + pad + (areaH - dh) / 2, dw, dh);

    // 테두리
    ctx.strokeStyle = "#F3ECDF";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx + pad, cy + pad, areaW, areaH);

    // 이름표
    ctx.fillStyle = "#6B645B";
    ctx.font = `${Math.round(labelH * 0.7)}px "Jua", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(item.nickname, cx + cellW / 2, cy + cellH - labelH / 2 - pad, areaW);
  });

  return canvas;
}
