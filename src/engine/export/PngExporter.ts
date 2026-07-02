import type { LayerStack } from "../core/LayerStack";

/*
 * PngExporter: 레이어 합성 결과를 PNG로. 투명/배경 포함, 해상도 1x/2x.
 */
export interface PngOptions {
  /** true면 크림색 배경, false면 투명 */
  background: boolean;
  scale: 1 | 2;
  backgroundColor?: string;
}

export function exportPng(
  layers: LayerStack,
  width: number,
  height: number,
  opts: PngOptions,
): Promise<Blob> {
  const out = document.createElement("canvas");
  out.width = width * opts.scale;
  out.height = height * opts.scale;
  const ctx = out.getContext("2d")!;
  ctx.scale(opts.scale, opts.scale);
  if (opts.background) {
    ctx.fillStyle = opts.backgroundColor ?? "#FBF7F0";
    ctx.fillRect(0, 0, width, height);
  }
  layers.composite(ctx);
  return new Promise((resolve, reject) => {
    out.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG 인코딩 실패"))), "image/png");
  });
}

/** 갤러리용 썸네일(webp 우선, 폴백 png) */
export function exportThumb(
  layers: LayerStack,
  width: number,
  height: number,
  maxSize = 400,
): Promise<Blob> {
  const scale = Math.min(1, maxSize / Math.max(width, height));
  const out = document.createElement("canvas");
  out.width = Math.round(width * scale);
  out.height = Math.round(height * scale);
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#FBF7F0";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.scale(scale, scale);
  layers.composite(ctx);
  return new Promise((resolve, reject) => {
    out.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("썸네일 인코딩 실패"))),
      "image/webp",
      0.82,
    );
  });
}
