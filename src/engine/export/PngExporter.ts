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

/**
 * R2 저장용 원본(webp 손실압축). 무손실 PNG 대비 색칠 완성작 기준 약 6~7배 작아
 * 무료 스토리지 한도를 그만큼 더 버틴다(육안 차이 거의 없음). 배경은 항상 불투명(크림).
 * 아동 소장용 "내 컴퓨터에 저장"은 여전히 exportPng(PNG)로 — 화질·구형 PC 호환 유지.
 */
export function exportWebp(
  layers: LayerStack,
  width: number,
  height: number,
  quality = 0.9,
): Promise<Blob> {
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#FBF7F0";
  ctx.fillRect(0, 0, width, height);
  layers.composite(ctx);
  return new Promise((resolve, reject) => {
    out.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("WebP 인코딩 실패"))),
      "image/webp",
      quality,
    );
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
