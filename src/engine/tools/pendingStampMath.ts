/*
 * 떠 있는 스탬프 변형의 순수 기하 — 이동/크기조절 히트테스트와 좌표 계산.
 * ArtEngine에서 분리해 브라우저 없이 단위 테스트할 수 있게 한다(캔버스 미의존).
 * 모든 좌표는 캔버스 좌표계(width×height). scale = view.scale(줌 배율).
 */

export interface PendingBox {
  cx: number;
  cy: number;
  /** 세로 크기(px). 가로는 size × aspect — 글씨는 가로로 길다(스탬프는 aspect=1) */
  size: number;
  aspect?: number;
}

export type PendingHit = "resize" | "move" | null;

/** 상자의 반너비/반높이 — aspect(가로/세로)가 없으면 정사각(스탬프) */
export function pendingHalf(b: PendingBox): { hw: number; hh: number } {
  const a = b.aspect && b.aspect > 0 ? b.aspect : 1;
  return { hw: (b.size * a) / 2, hh: b.size / 2 };
}

/** 포인터가 모서리 핸들 위(→resize)·몸통 안(→move)·바깥(null) 중 어디인지.
 *  handleHitPx = 화면상 히트 반경(px), scale로 나눠 캔버스 좌표 반경으로 변환. */
export function hitPending(
  px: number,
  py: number,
  b: PendingBox,
  scale: number,
  handleHitPx: number,
): PendingHit {
  const { hw, hh } = pendingHalf(b);
  const hit = handleHitPx / Math.max(scale, 1e-6);
  const corners: [number, number][] = [
    [b.cx - hw, b.cy - hh],
    [b.cx + hw, b.cy - hh],
    [b.cx + hw, b.cy + hh],
    [b.cx - hw, b.cy + hh],
  ];
  if (corners.some(([hx, hy]) => Math.hypot(px - hx, py - hy) <= hit)) return "resize";
  if (px >= b.cx - hw && px <= b.cx + hw && py >= b.cy - hh && py <= b.cy + hh) return "move";
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

/** 크기조절 — 중심 고정. 세로 크기(size)를 돌려준다. aspect가 있으면 가로 드래그도
 *  같은 비율로 환산해 반영한다(글씨: 옆으로 끌어도 커진다). */
export function resizePending(
  cx: number,
  cy: number,
  px: number,
  py: number,
  min: number,
  max: number,
  aspect = 1,
): number {
  const a = aspect > 0 ? aspect : 1;
  const half = Math.max(Math.abs(py - cy), Math.abs(px - cx) / a);
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
  aspect = 1,
): { x: number; y: number; w: number; h: number } {
  const half = size / 2 + margin;
  const halfW = (size * (aspect > 0 ? aspect : 1)) / 2 + margin;
  let minX = cx - halfW,
    minY = cy - half,
    maxX = cx + halfW,
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
