import type { StrokePoint, SymmetryMode } from "../types";

/*
 * 대칭 그리기: 한 점을 대칭축 기준으로 미러링해 여러 개로 복제.
 * 세로(vertical): 좌우 대칭 / 가로(horizontal): 상하 / 4방(quad): 상하좌우 4장.
 */
export function mirrorPoint(
  p: StrokePoint,
  mode: SymmetryMode,
  width: number,
  height: number,
): StrokePoint[] {
  const cx = width / 2;
  const cy = height / 2;
  const base = { ...p };
  switch (mode) {
    case "none":
      return [base];
    case "vertical":
      return [base, { ...p, x: 2 * cx - p.x }];
    case "horizontal":
      return [base, { ...p, y: 2 * cy - p.y }];
    case "quad":
      return [
        base,
        { ...p, x: 2 * cx - p.x },
        { ...p, y: 2 * cy - p.y },
        { ...p, x: 2 * cx - p.x, y: 2 * cy - p.y },
      ];
    default:
      return [base];
  }
}
