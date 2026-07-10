/*
 * 떠 있는 스탬프 변형의 순수 기하 — 이동/크기조절 히트테스트와 좌표 계산.
 * ArtEngine에서 분리해 브라우저 없이 단위 테스트할 수 있게 한다(캔버스 미의존).
 * 모든 좌표는 캔버스 좌표계(width×height). scale = view.scale(줌 배율).
 */

export interface PendingBox {
  cx: number;
  cy: number;
  size: number;
}

export type PendingHit = "resize" | "move" | null;

/** 포인터가 모서리 핸들 위(→resize)·몸통 안(→move)·바깥(null) 중 어디인지.
 *  handleHitPx = 화면상 히트 반경(px), scale로 나눠 캔버스 좌표 반경으로 변환. */
export function hitPending(
  px: number,
  py: number,
  b: PendingBox,
  scale: number,
  handleHitPx: number,
): PendingHit {
  const half = b.size / 2;
  const hit = handleHitPx / Math.max(scale, 1e-6);
  const corners: [number, number][] = [
    [b.cx - half, b.cy - half],
    [b.cx + half, b.cy - half],
    [b.cx + half, b.cy + half],
    [b.cx - half, b.cy + half],
  ];
  if (corners.some(([hx, hy]) => Math.hypot(px - hx, py - hy) <= hit)) return "resize";
  if (px >= b.cx - half && px <= b.cx + half && py >= b.cy - half && py <= b.cy + half) return "move";
  return null;
}

/** 이동 — 드래그 시작점 대비 이동량을 시작 중심에 더하고 캔버스 안으로 클램프 */
export function movePending(
  startCx: number,
  startCy: number,
  startPx: number,
  startPy: number,
  px: number,
  py: number,
  width: number,
  height: number,
): { cx: number; cy: number } {
  const cx = Math.min(Math.max(startCx + (px - startPx), 0), width);
  const cy = Math.min(Math.max(startCy + (py - startPy), 0), height);
  return { cx, cy };
}

/** 크기조절 — 중심 고정, 포인터~중심 체비쇼프 거리의 2배가 한 변(min/max 클램프) */
export function resizePending(
  cx: number,
  cy: number,
  px: number,
  py: number,
  min: number,
  max: number,
): number {
  const half = Math.max(Math.abs(px - cx), Math.abs(py - cy));
  return Math.min(Math.max(half * 2, min), max);
}

/** 커밋 tile 영역 = (옮겨진)스탬프 bbox ∪ 원래 스케치 bbox + 외곽선 여유, 캔버스로 클램프 */
export function commitRegion(
  cx: number,
  cy: number,
  size: number,
  origin: { minX: number; minY: number; maxX: number; maxY: number } | null,
  width: number,
  height: number,
  margin = 12,
): { x: number; y: number; w: number; h: number } {
  const half = size / 2 + margin;
  let minX = cx - half,
    minY = cy - half,
    maxX = cx + half,
    maxY = cy + half;
  if (origin) {
    minX = Math.min(minX, origin.minX);
    minY = Math.min(minY, origin.minY);
    maxX = Math.max(maxX, origin.maxX);
    maxY = Math.max(maxY, origin.maxY);
  }
  const x = Math.max(0, Math.floor(minX));
  const y = Math.max(0, Math.floor(minY));
  const w = Math.min(width - x, Math.ceil(maxX - x));
  const h = Math.min(height - y, Math.ceil(maxY - y));
  return { x, y, w, h };
}
