import type { QuickShapeKind, StrokePoint } from "../types";

/*
 * QuickShape: 스트로크 끝을 800ms 홀드하면 손그림을 도형으로 스냅.
 * 판별은 순수 기하 — 시작/끝 근접도(닫힘), 종횡비, 볼록껍질 꼭짓점 수, 대칭성.
 */

export const QUICKSHAPE_HOLD_MS = 800;

export interface ShapeResult {
  kind: QuickShapeKind;
  /** 렌더용 정규화 폴리라인(닫힌 도형은 첫 점=끝 점) */
  points: { x: number; y: number }[];
}

interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  cx: number;
  cy: number;
  w: number;
  h: number;
}

function bbox(pts: StrokePoint[]): BBox {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    w: Math.max(1, maxX - minX),
    h: Math.max(1, maxY - minY),
  };
}

function pathLength(pts: StrokePoint[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return len;
}

/** 스트로크를 도형으로 인식. 못 하면 null(원래 스트로크 유지). */
export function detectShape(pts: StrokePoint[]): ShapeResult | null {
  if (pts.length < 6) return null;
  const b = bbox(pts);
  const start = pts[0];
  const endPt = pts[pts.length - 1];
  const closeDist = Math.hypot(endPt.x - start.x, endPt.y - start.y);
  const diag = Math.hypot(b.w, b.h);
  const closed = closeDist < diag * 0.25;

  if (!closed) {
    // 열린 선 → 직선인지 확인(경로/직선거리 비 ≈ 1)
    const straight = pathLength(pts) / Math.max(1, Math.hypot(endPt.x - start.x, endPt.y - start.y));
    if (straight < 1.15) {
      return { kind: "line", points: [{ x: start.x, y: start.y }, { x: endPt.x, y: endPt.y }] };
    }
    return null;
  }

  // 닫힌 도형: 중심에서 각 점까지 반지름 변동으로 원 판별
  const radii = pts.map((p) => Math.hypot(p.x - b.cx, p.y - b.cy));
  const rMean = radii.reduce((a, c) => a + c, 0) / radii.length;
  const rVar =
    radii.reduce((a, c) => a + (c - rMean) * (c - rMean), 0) / radii.length;
  const rCv = Math.sqrt(rVar) / Math.max(1, rMean); // 변동계수

  // 볼록 꼭짓점(방향 급변) 개수
  const corners = countCorners(pts);

  if (rCv < 0.14 && corners <= 2) {
    return { kind: "circle", points: sampleCircle(b.cx, b.cy, (b.w + b.h) / 4, b.w / b.h) };
  }
  if (corners === 3) return { kind: "triangle", points: regularPoly(b, 3, -Math.PI / 2) };
  if (corners === 4) return { kind: "rect", points: rectPoints(b) };
  // 별/하트는 오목(반지름 진동) 특징으로 구분
  if (isStarLike(radii, rMean)) return { kind: "star", points: starPoints(b) };
  if (corners <= 6) return { kind: "heart", points: heartPoints(b) };
  return null;
}

function countCorners(pts: StrokePoint[]): number {
  let corners = 0;
  const step = Math.max(1, Math.floor(pts.length / 48));
  let prevAngle: number | null = null;
  for (let i = step; i < pts.length - step; i += step) {
    const a = pts[i - step];
    const b = pts[i];
    const c = pts[i + step];
    const ang = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x);
    const norm = Math.abs(Math.atan2(Math.sin(ang), Math.cos(ang)));
    if (norm > 0.9) {
      if (prevAngle === null || i - prevAngle > step * 2) corners++;
      prevAngle = i;
    }
  }
  return corners;
}

function isStarLike(radii: number[], rMean: number): boolean {
  let crossings = 0;
  let above = radii[0] > rMean;
  for (let i = 1; i < radii.length; i++) {
    const nowAbove = radii[i] > rMean;
    if (nowAbove !== above) {
      crossings++;
      above = nowAbove;
    }
  }
  return crossings >= 8; // 5각 별이면 안/밖 진동 10회
}

function sampleCircle(cx: number, cy: number, r: number, aspect: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const rx = r * Math.sqrt(aspect);
  const ry = r / Math.sqrt(aspect);
  for (let i = 0; i <= 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(t) * rx, y: cy + Math.sin(t) * ry });
  }
  return pts;
}

function rectPoints(b: BBox): { x: number; y: number }[] {
  return [
    { x: b.minX, y: b.minY },
    { x: b.maxX, y: b.minY },
    { x: b.maxX, y: b.maxY },
    { x: b.minX, y: b.maxY },
    { x: b.minX, y: b.minY },
  ];
}

function regularPoly(b: BBox, n: number, rot: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const t = rot + (i / n) * Math.PI * 2;
    pts.push({ x: b.cx + (Math.cos(t) * b.w) / 2, y: b.cy + (Math.sin(t) * b.h) / 2 });
  }
  return pts;
}

function starPoints(b: BBox): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const spikes = 5;
  for (let i = 0; i <= spikes * 2; i++) {
    const t = -Math.PI / 2 + (i / (spikes * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? 0.5 : 0.22;
    pts.push({ x: b.cx + Math.cos(t) * b.w * rr, y: b.cy + Math.sin(t) * b.h * rr });
  }
  return pts;
}

function heartPoints(b: BBox): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push({ x: b.cx + (x / 32) * b.w, y: b.cy - (y / 32) * b.h });
  }
  return pts;
}
