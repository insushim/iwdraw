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

  // 등간격 재샘플(닫힌 윤곽) 후 순환 꼭짓점 계산 —
  // 시작=끝 이음새(seam)의 꼭짓점까지 세어 삼각형/사각형이 하나씩 밀리는 오프바이원 방지.
  const rs = resampleClosed(pts, 64);
  const corners = countCornersCyclic(rs);
  const convex = isConvexish(rs);

  if (rCv < 0.14 && corners <= 2) {
    return { kind: "circle", points: sampleCircle(b.cx, b.cy, (b.w + b.h) / 4, b.w / b.h) };
  }
  // 볼록한 3/4각만 삼각형·사각형(사각형도 반지름 진동 8회라 별 판정보다 먼저 확정).
  // 오목하면(하트 상단 홈·별 스파이크) 넘어간다.
  if (convex && corners === 3) return { kind: "triangle", points: regularPoly(b, 3, -Math.PI / 2) };
  if (convex && corners === 4) return { kind: "rect", points: rectPoints(b) };
  // 별은 오목 + 반지름 진동이 강함
  if (isStarLike(radii, rMean)) return { kind: "star", points: starPoints(b) };
  // 오목하거나 꼭짓점이 애매한 닫힌 도형 → 하트
  if (!convex || corners <= 6) return { kind: "heart", points: heartPoints(b) };
  return null;
}

/** 닫힌 스트로크를 둘레를 따라 n개로 등간격 재샘플(첫 점부터 다시 첫 점까지). */
function resampleClosed(pts: StrokePoint[], n: number): { x: number; y: number }[] {
  const path = pts.map((p) => ({ x: p.x, y: p.y }));
  const first = path[0];
  const last = path[path.length - 1];
  if (Math.hypot(first.x - last.x, first.y - last.y) > 1e-6) path.push({ x: first.x, y: first.y });
  let total = 0;
  for (let i = 1; i < path.length; i++) total += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  if (total < 1e-6) return [first];
  const seg = total / n;
  const out: { x: number; y: number }[] = [{ x: first.x, y: first.y }];
  let cur = path[0];
  let idx = 1;
  let acc = 0;
  let target = seg;
  while (out.length < n && idx < path.length) {
    const nx = path[idx];
    const segLen = Math.hypot(nx.x - cur.x, nx.y - cur.y);
    if (acc + segLen >= target) {
      const t = segLen < 1e-9 ? 0 : (target - acc) / segLen;
      out.push({ x: cur.x + (nx.x - cur.x) * t, y: cur.y + (nx.y - cur.y) * t });
      target += seg;
    } else {
      acc += segLen;
      cur = nx;
      idx++;
    }
  }
  return out;
}

/** 순환(wrap-around) 방향 급변 클러스터 수 = 꼭짓점 수. 이음새 꼭짓점도 포함. */
function countCornersCyclic(rs: { x: number; y: number }[], thresh = 0.85): number {
  const n = rs.length;
  if (n < 6) return 0;
  const k = Math.max(2, Math.round(n / 16));
  const flag: boolean[] = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    const a = rs[(i - k + n) % n];
    const b = rs[i];
    const c = rs[(i + k) % n];
    const raw = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x);
    if (Math.abs(Math.atan2(Math.sin(raw), Math.cos(raw))) > thresh) flag[i] = true;
  }
  const s = flag.indexOf(false);
  if (s === -1) return 1; // 전부 급변 = 퇴화, 1로 취급
  let count = 0;
  let run = false;
  for (let j = 0; j < n; j++) {
    const idx = (s + j) % n;
    if (flag[idx]) {
      if (!run) count++;
      run = true;
    } else run = false;
  }
  return count;
}

/** 오목 회전각 누적이 작으면 볼록(삼각형·사각형). 하트 상단 홈은 큰 오목 → false. */
function isConvexish(rs: { x: number; y: number }[]): boolean {
  const n = rs.length;
  if (n < 6) return true;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const p = rs[i];
    const q = rs[(i + 1) % n];
    area += p.x * q.y - q.x * p.y;
  }
  const orient = Math.sign(area) || 1;
  const k = Math.max(2, Math.round(n / 16));
  let concave = 0;
  for (let i = 0; i < n; i++) {
    const a = rs[(i - k + n) % n];
    const b = rs[i];
    const c = rs[(i + k) % n];
    const raw = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x);
    const ang = Math.atan2(Math.sin(raw), Math.cos(raw));
    if (Math.sign(ang) === -orient) concave += Math.abs(ang);
  }
  return concave < 1.2; // rad — 손떨림 여유는 두되 하트 홈은 확실히 초과
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
