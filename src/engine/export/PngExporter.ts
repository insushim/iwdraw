import type { LayerStack } from "../core/LayerStack";

/*
 * PngExporter: 레이어 합성 결과를 PNG로. 투명/배경 포함, 해상도 1x/2x.
 *
 * ⚠️ 배경은 반드시 합성 "뒤에" destination-over로 깔아야 한다.
 * LayerStack.composite()가 첫 줄에서 target을 clearRect 하기 때문에, 먼저 채운
 * 배경은 통째로 지워진다 — 2026-07-25 실측: 저장한 PNG의 98.7%가 알파 0(완전 투명)
 * 이었다. 투명 배경은 뷰어·인쇄에 따라 검게 나와 "저장했는데 배경이 까매요"가 된다.
 *
 * 종이 색은 화면과 같은 흰색(#ffffff). 예전 크림(#FBF7F0)은 화면 종이(실측 평균
 * 255,255,255)보다 눈에 띄게 누렜다. 종이 결(paper tint)은 화면 전용 — 내보내기엔
 * 넣지 않는다(기존 설계 유지).
 */
const PAPER = "#ffffff";

/** 합성 결과 아래에 종이를 깐다(합성이 target을 지우므로 순서가 중요) */
function layOnPaper(
  ctx: CanvasRenderingContext2D,
  layers: LayerStack,
  width: number,
  height: number,
  color: string | null,
): void {
  layers.composite(ctx);
  if (!color) return;
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";
}
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
  layOnPaper(ctx, layers, width, height, opts.background ? (opts.backgroundColor ?? PAPER) : null);
  return new Promise((resolve, reject) => {
    out.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG 인코딩 실패"))), "image/png");
  });
}

/**
 * R2 저장용 원본(webp 손실압축). 무손실 PNG 대비 색칠 완성작 기준 약 6~7배 작아
 * 무료 스토리지 한도를 그만큼 더 버틴다(육안 차이 거의 없음). 배경은 항상 불투명(흰 종이).
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
  layOnPaper(ctx, layers, width, height, PAPER);
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
  ctx.scale(scale, scale);
  layOnPaper(ctx, layers, width, height, PAPER);
  return new Promise((resolve, reject) => {
    out.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("썸네일 인코딩 실패"))),
      "image/webp",
      0.82,
    );
  });
}
