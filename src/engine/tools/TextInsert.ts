import { rgbToCss, type RGB } from "../types";

/*
 * 글씨 넣기 — 캔버스에 텍스트를 래스터화한다(스탬프와 같은 "떠 있는 배치" 파이프라인).
 * size = 글자 높이(px). 여러 줄은 \n. 프리뷰와 커밋이 같은 함수를 쓰므로 보이는 대로 굳는다.
 */
export interface TextItem {
  /** 넣을 글 (여러 줄은 \n) */
  value: string;
  /** CSS font-family 문자열(next/font가 준 실제 패밀리명) */
  family: string;
  /** 테두리(외곽선) — 없으면 글자만. 두께는 글자 높이에 비례해 크기를 바꿔도 비율이 유지된다 */
  outline?: { color: RGB; /** 글자 높이 대비 두께(0~0.2) */ ratio: number } | null;
}

const LINE_H = 1.28;

/** 줄 나누기 — 앞뒤의 빈 줄만 버리고 가운데 빈 줄(일부러 띄운 간격)은 살린다 */
function lines(value: string): string[] {
  const ls = value.split("\n");
  while (ls.length > 1 && ls[0].trim() === "") ls.shift();
  while (ls.length > 1 && ls[ls.length - 1].trim() === "") ls.pop();
  return ls;
}

function setFont(ctx: CanvasRenderingContext2D, item: TextItem, size: number): void {
  ctx.font = `${Math.max(4, Math.round(size))}px ${item.family}, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
}

/** 글자 상자 가로/세로 비율(w/h) — 떠 있는 배치의 히트박스·크기조절에 쓴다 */
export function textAspect(
  ctx: CanvasRenderingContext2D,
  item: TextItem,
  size: number,
): number {
  setFont(ctx, item, size);
  const ls = lines(item.value);
  const w = Math.max(1, ...ls.map((l) => ctx.measureText(l).width));
  const h = Math.max(1, ls.length * size * LINE_H);
  return w / h;
}

/** 프리뷰·커밋 공용 — 중심(cx,cy)에 글자 높이 size로 그린다 */
export function drawTextOnCtx(
  ctx: CanvasRenderingContext2D,
  item: TextItem,
  cx: number,
  cy: number,
  size: number,
  ink: RGB,
): void {
  const ls = lines(item.value);
  if (ls.length === 0) return;
  ctx.save();
  setFont(ctx, item, size);
  const step = size * LINE_H;
  const top = cy - ((ls.length - 1) * step) / 2;
  // 테두리 먼저(글자 뒤로 깔리게) — 획을 굵게 그리면 글자 바깥으로 반만 삐져나온다
  const ol = item.outline;
  if (ol && ol.ratio > 0) {
    ctx.strokeStyle = rgbToCss(ol.color);
    ctx.lineWidth = Math.max(1, size * ol.ratio * 2); // 절반이 바깥 = 실제 테두리 두께
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    for (let i = 0; i < ls.length; i++) ctx.strokeText(ls[i], cx, top + i * step);
  }
  ctx.fillStyle = rgbToCss(ink);
  for (let i = 0; i < ls.length; i++) ctx.fillText(ls[i], cx, top + i * step);
  ctx.restore();
}

/** 글꼴이 실제로 로드된 뒤에 그려야 폴백(고딕)으로 굳는 사고가 없다 */
export async function ensureFontReady(item: TextItem, size: number): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await document.fonts.load(`${Math.round(size)}px ${item.family}`, item.value.slice(0, 40));
    await document.fonts.ready;
  } catch {
    /* 로드 실패 — 폴백 글꼴로 그린다 */
  }
}
