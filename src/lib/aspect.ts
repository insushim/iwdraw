/* 캔버스 크기 산출(순수 로직, 테스트 가능) — CanvasStage/엔진 공용 */
export const CANVAS_MAX_LONG = 1536;
export const CANVAS_MAX_AREA = 1536 * 1152; // ≈ 1.77M px

export function fitAspectHelper(aspect: number): { width: number; height: number } {
  let w: number, h: number;
  if (aspect >= 1) {
    w = CANVAS_MAX_LONG;
    h = Math.round(CANVAS_MAX_LONG / aspect);
  } else {
    h = CANVAS_MAX_LONG;
    w = Math.round(CANVAS_MAX_LONG * aspect);
  }
  const area = w * h;
  if (area > CANVAS_MAX_AREA) {
    const k = Math.sqrt(CANVAS_MAX_AREA / area);
    w = Math.round(w * k);
    h = Math.round(h * k);
  }
  return { width: w - (w % 2), height: h - (h % 2) };
}
