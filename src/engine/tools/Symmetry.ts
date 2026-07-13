import type { StrokePoint, SymmetryMode } from "../types";

/*
 * 대칭 그리기: 한 점을 대칭축 기준으로 미러링해 여러 개로 복제.
 * 세로(vertical): 좌우 대칭 / 가로(horizontal): 상하 / 4방(quad): 상하좌우 4장.
 * 축은 캔버스 중앙 고정이 아니라 사용자가 드래그로 옮길 수 있다(2026-07-13 요청) —
 * 호출부가 축 좌표(캔버스 좌표계)를 넘긴다.
 */
export function mirrorPoint(
  p: StrokePoint,
  mode: SymmetryMode,
  axisX: number,
  axisY: number,
): StrokePoint[] {
  const base = { ...p };
  switch (mode) {
    case "none":
      return [base];
    case "vertical":
      return [base, { ...p, x: 2 * axisX - p.x }];
    case "horizontal":
      return [base, { ...p, y: 2 * axisY - p.y }];
    case "quad":
      return [
        base,
        { ...p, x: 2 * axisX - p.x },
        { ...p, y: 2 * axisY - p.y },
        { ...p, x: 2 * axisX - p.x, y: 2 * axisY - p.y },
      ];
    default:
      return [base];
  }
}
