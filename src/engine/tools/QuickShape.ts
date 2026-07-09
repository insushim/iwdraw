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
    // 열린 선 → 직선 판정은 두 지표 병행(2026-07-09 실사용 "직선이 안 됨" 보고):
    //  · 경로/직선거리 비 — 1.15는 아이 손떨림이 통과 못 함 → 1.4로 완화
    //  · 현(chord)에서의 최대 수직 이탈/길이 — 반원 호(경로비 1.11)가 직선으로 새는 걸 차단
    const direct = Math.max(1, Math.hypot(endPt.x - start.x, endPt.y - start.y));
    const straight = pathLength(pts) / direct;
    if (straight < 1.4 && maxChordDeviation(pts, start, endPt) / direct < 0.12) {
      return { kind: "line", points: [{ x: start.x, y: start.y }, { x: endPt.x, y: endPt.y }] };
    }
    return null;
  }

  // 닫힌 도형 — 등간격 재샘플 + 이동평균 스무딩 후 분석(지터가 만든 가짜 꼭짓점·오목 제거).
  // 재샘플은 시작=끝 이음새(seam) 꼭짓점 오프바이원도 방지.
  const rs = smoothClosed(resampleClosed(pts, 64));
  const radii = rs.map((p) => Math.hypot(p.x - b.cx, p.y - b.cy));
  const rMean = radii.reduce((a, c) => a + c, 0) / radii.length;
  const rVar = radii.reduce((a, c) => a + (c - rMean) * (c - rMean), 0) / radii.length;
  const rCv = Math.sqrt(rVar) / Math.max(1, rMean); // 변동계수
  let rMin = Infinity;
  let rMax = 0;
  for (const r of radii) {
    if (r < rMin) rMin = r;
    if (r > rMax) rMax = r;
  }
  const amplitude = (rMax - rMin) / Math.max(1, rMean); // 별 0.8±, 사각형 0.34±
  const crossings = crossingsCyclic(radii, rMean); // 5각 별=10, 사각형=8
  const corners = countCornersCyclic(rs);
  const conc = concavity(rs);

  if (rCv < 0.14 && corners <= 2) {
    return { kind: "circle", points: sampleCircle(b.cx, b.cy, (b.w + b.h) / 4, b.w / b.h) };
  }
  // 별 = 강한 반지름 진동 "그리고" 깊은 진폭. 사각형도 진동 8회라 crossings만으론
  // 별로 오인된다(2026-07-09 실사용 보고 "사각형 그리면 별") — 진폭 이중 게이트로 분리.
  if (crossings >= 9 && amplitude >= 0.4) return { kind: "star", points: starPoints(b) };
  // 하트 = 캐치올이 아니라 "지배적인 깊은 오목 노치"(상단 홈)가 있어야 한다 —
  // 변이 살짝 굽은 삼각형/낙서가 하트로 둔갑하던 문제의 정공법.
  // 클러스터 개수 대신 지배도(≥70%)를 본다: 손그림엔 자잘한 노이즈 오목이 늘 따라온다.
  if (conc.maxCluster >= 0.9 && conc.maxCluster >= conc.total * 0.7 && corners <= 6) {
    return { kind: "heart", points: heartPoints(b) };
  }
  // 별·하트를 먼저 걸렀으니 꼭짓점 수만으로 확정(볼록 전제는 변 휨 손그림이 통과 못 해 폐기)
  if (corners === 3) return { kind: "triangle", points: regularPoly(b, 3, -Math.PI / 2) };
  if (corners === 4) return { kind: "rect", points: rectPoints(b) };
  return null; // 애매한 낙서는 원본 유지(하트 남발 금지)
}

/** 현(시작→끝 직선)에서 가장 먼 점의 수직 거리 — 호/커브가 직선으로 새는 것 차단 */
function maxChordDeviation(pts: StrokePoint[], a: StrokePoint, bp: StrokePoint): number {
  const dx = bp.x - a.x;
  const dy = bp.y - a.y;
  const len = Math.max(1e-6, Math.hypot(dx, dy));
  let max = 0;
  for (const p of pts) {
    const d = Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
    if (d > max) max = d;
  }
  return max;
}

/** 닫힌 윤곽 이동평균(±1) — 지터가 만든 가짜 꼭짓점·가짜 오목을 죽인다 */
function smoothClosed(rs: { x: number; y: number }[]): { x: number; y: number }[] {
  const n = rs.length;
  if (n < 8) return rs;
  return rs.map((_, i) => {
    const a = rs[(i - 1 + n) % n];
    const c = rs[(i + 1) % n];
    return { x: (a.x + rs[i].x + c.x) / 3, y: (a.y + rs[i].y + c.y) / 3 };
  });
}

/** 반지름이 평균선을 넘나드는 횟수(순환) — 별 스파이크 진동 지표 */
function crossingsCyclic(radii: number[], rMean: number): number {
  let crossings = 0;
  let above = radii[radii.length - 1] > rMean;
  for (const r of radii) {
    const nowAbove = r > rMean;
    if (nowAbove !== above) {
      crossings++;
      above = nowAbove;
    }
  }
  return crossings;
}

/**
 * 오목(회전 방향 반대) 분석 — 클러스터별 누적 각으로 "하트 노치" 같은
 * 단일 깊은 오목과, 변 휨이 만드는 여러 얕은 오목을 구분한다.
 */
function concavity(rs: { x: number; y: number }[]): { total: number; clusters: number; maxCluster: number } {
  const n = rs.length;
  if (n < 6) return { total: 0, clusters: 0, maxCluster: 0 };
  let area = 0;
  for (let i = 0; i < n; i++) {
    const p = rs[i];
    const q = rs[(i + 1) % n];
    area += p.x * q.y - q.x * p.y;
  }
  const orient = Math.sign(area) || 1;
  const k = Math.max(2, Math.round(n / 16));
  const conc: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const a = rs[(i - k + n) % n];
    const b = rs[i];
    const c = rs[(i + k) % n];
    const raw = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x);
    const ang = Math.atan2(Math.sin(raw), Math.cos(raw));
    // 얕은 굴곡(변 휨·지터)은 무시 — 진짜 노치만 집계
    if (Math.sign(ang) === -orient && Math.abs(ang) > 0.12) conc[i] = Math.abs(ang);
  }
  // 순환 클러스터 집계(이음새에서 갈라지지 않게 비-오목 지점부터 시작)
  const s = conc.findIndex((v) => v === 0);
  if (s === -1) return { total: conc.reduce((a, c) => a + c, 0), clusters: 1, maxCluster: conc.reduce((a, c) => a + c, 0) };
  let total = 0;
  let clusters = 0;
  let maxCluster = 0;
  let cur = 0;
  for (let j = 0; j < n; j++) {
    const v = conc[(s + j) % n];
    if (v > 0) {
      if (cur === 0) clusters++;
      cur += v;
      total += v;
      if (cur > maxCluster) maxCluster = cur;
    } else cur = 0;
  }
  return { total, clusters, maxCluster };
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
