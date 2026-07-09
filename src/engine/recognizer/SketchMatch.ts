import { STAMPS, getStamp, type StampDef } from "../tools/StampTool";
import type { SketchSuggestion } from "../types";
import { EXTRA_SKETCH_VARIANTS } from "./extra-templates";

/*
 * 뚝딱그림(SketchSuggest) 인식 코어 — $P 포인트클라우드 매칭.
 * 러프 스케치(스트로크 점 구름)를 스탬프 40종 템플릿과 비교해 후보를 낸다.
 * 획 순서·방향·개수 무관(점 구름), ML·네트워크 없음 — 웨일북에서도 수 ms.
 * 템플릿 3원: ① StampTool SVG path 샘플링 ② 손그림 변형 표본(extra-templates)
 * ③ 아이가 수락한 스케치를 기기별 localStorage에 적립(쓸수록 그 아이 스타일에 적응).
 * 같은 스탬프에 표본이 여러 개면 최고점만 취한다.
 */

export interface Pt {
  x: number;
  y: number;
}

/** 정규화 후 점 개수 — 템플릿·스케치 동일해야 그리디 매칭이 성립 */
const N = 48;
/** 이 점수 미만이면 후보로 안 띄움(오탐이 아이 흐름을 끊는 게 최악) */
export const SUGGEST_MIN_SCORE = 0.42;
export const SUGGEST_TOP = 3;

/* ── 전처리: 리샘플 → 원점 이동 → 등비 스케일 ── */

function resample(points: Pt[], n: number): Pt[] {
  if (points.length === 0) return [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  if (total < 1e-6) return new Array(n).fill(points[0]);
  const seg = total / (n - 1);
  const out: Pt[] = [{ ...points[0] }];
  let acc = 0;
  let prev = points[0];
  for (let i = 1; i < points.length && out.length < n; ) {
    const cur = points[i];
    const d = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    if (acc + d >= seg && d > 1e-9) {
      const t = (seg - acc) / d;
      const q = { x: prev.x + t * (cur.x - prev.x), y: prev.y + t * (cur.y - prev.y) };
      out.push(q);
      prev = q; // 같은 세그먼트에서 계속 뽑는다
      acc = 0;
    } else {
      acc += d;
      prev = cur;
      i++;
    }
  }
  while (out.length < n) out.push({ ...points[points.length - 1] });
  return out;
}

/**
 * 획별로 길이 비례 리샘플해 정확히 n점으로 — 획 사이를 이어붙여 리샘플하면
 * 펜을 뗀 구간이 가짜 선분으로 들어가 멀티스트로크 도형이 오인식된다(교차검증 발견).
 */
function resampleStrokes(strokes: Pt[][], n: number): Pt[] {
  const valid = strokes.filter((s) => s.length > 0);
  if (valid.length === 0) return [];
  const lens = valid.map((s) => {
    let l = 0;
    for (let i = 1; i < s.length; i++) l += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
    return l;
  });
  const total = lens.reduce((a, c) => a + c, 0);
  if (total < 1e-6) return new Array(n).fill(valid[0][0]);
  // 길이 비례 배분(최소 2점) 후 합이 정확히 n이 되도록 큰 획부터 보정
  const counts = lens.map((l) => Math.max(2, Math.round((l / total) * n)));
  let sum = counts.reduce((a, c) => a + c, 0);
  while (sum !== n) {
    const dir = sum > n ? -1 : 1;
    let idx = 0;
    for (let i = 1; i < counts.length; i++) if (counts[i] > counts[idx]) idx = i;
    if (dir < 0 && counts[idx] <= 2) break; // 전부 최소치 — n보다 약간 많아도 무해
    counts[idx] += dir;
    sum += dir;
  }
  return valid.flatMap((s, i) => resample(s, counts[i]));
}

/** 중심 원점 + 최장변 1로 등비 스케일(종횡비 보존 — 원/사각 구분 유지) */
function normalize(points: Pt[]): Pt[] {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity,
    cx = 0,
    cy = 0;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
    cx += p.x;
    cy += p.y;
  }
  cx /= points.length;
  cy /= points.length;
  const s = Math.max(maxX - minX, maxY - minY, 1e-6);
  return points.map((p) => ({ x: (p.x - cx) / s, y: (p.y - cy) / s }));
}

/** 획 배열 → 정규화 점 구름(정확히 N점, 획 경계 보존) */
export function preparePointCloud(strokes: Pt[][]): Pt[] {
  return normalize(resampleStrokes(strokes, N));
}

/* ── $P 그리디 클라우드 매칭 ── */

/** 한 방향 그리디 매칭 비용(가중 평균 거리). start = 시작 인덱스(여러 시작점 시도용) */
function cloudCost(a: Pt[], b: Pt[], start: number): number {
  const n = a.length;
  const matched = new Array<boolean>(n).fill(false);
  let sum = 0;
  let i = start;
  do {
    let best = Infinity;
    let bestJ = -1;
    for (let j = 0; j < n; j++) {
      if (matched[j]) continue;
      const d = Math.hypot(a[i].x - b[j].x, a[i].y - b[j].y);
      if (d < best) {
        best = d;
        bestJ = j;
      }
    }
    matched[bestJ] = true;
    // 초반 매칭에 가중치(원 논문의 confidence weight)
    const w = 1 - ((i - start + n) % n) / n;
    sum += w * best;
    i = (i + 1) % n;
  } while (i !== start);
  return sum;
}

/** 양방향 + √n개 시작점 중 최소 — 정규화 좌표계 평균거리 스케일 (테스트용 export) */
export function cloudDistance(a: Pt[], b: Pt[]): number {
  // 구성상 둘 다 N점이지만, 어긋나면 그리디가 undefined를 밟는다 — 짧은 쪽 기준 방어
  if (a.length !== b.length) {
    const m = Math.min(a.length, b.length);
    a = a.slice(0, m);
    b = b.slice(0, m);
  }
  const n = a.length;
  const step = Math.max(1, Math.floor(Math.sqrt(n)));
  let min = Infinity;
  for (let s = 0; s < n; s += step) {
    min = Math.min(min, cloudCost(a, b, s), cloudCost(b, a, s));
  }
  // cloudCost는 가중치 합(∑w ≈ n/2 + …)이라 점수화 전에 n으로 정규화
  return min / n;
}

/* ── 템플릿: StampTool SVG → 점 구름 (브라우저에서 lazy 1회 빌드) ── */

let templates: SketchTemplate[] | null = null;

/** SVG path별 점 배열 샘플링(path = 획 취급 — 사이를 잇는 가짜 선분 방지) */
function sampleStampStrokes(def: StampDef, n: number): Pt[][] {
  const NS = "http://www.w3.org/2000/svg";
  const els = def.paths.map((p) => {
    const el = document.createElementNS(NS, "path");
    el.setAttribute("d", p.d);
    return el;
  });
  const lens = els.map((el) => {
    try {
      return el.getTotalLength();
    } catch {
      return 0;
    }
  });
  const total = lens.reduce((a, c) => a + c, 0);
  if (total < 1e-6) return [];
  return els.map((el, k) => {
    const cnt = Math.max(2, Math.round((lens[k] / total) * n));
    const pts: Pt[] = [];
    for (let i = 0; i < cnt; i++) {
      const q = el.getPointAtLength((i / (cnt - 1)) * lens[k]);
      pts.push({ x: q.x, y: q.y });
    }
    return pts;
  });
}

function buildTemplates(): SketchTemplate[] {
  if (templates) return templates;
  // SSR/비브라우저: 캐시에 넣지 말 것 — 빈 배열을 캐시하면 이후 브라우저에서도
  // 영원히 무력화된다(교차검증 발견)
  if (typeof document === "undefined") return [];
  const built: SketchTemplate[] = [];
  for (const def of STAMPS) {
    const strokes = sampleStampStrokes(def, 96);
    if (strokes.flat().length < 8) continue;
    built.push({ stampId: def.id, label: def.label, cloud: preparePointCloud(strokes) });
  }
  // 손그림 변형 표본 — SVG와 달리 순수 데이터라 DOM 불필요
  for (const v of EXTRA_SKETCH_VARIANTS) {
    const label = getStamp(v.stampId)?.label;
    if (!label) continue;
    built.push({ stampId: v.stampId, label, cloud: preparePointCloud(v.strokes) });
  }
  templates = built;
  return templates;
}

/* ── 개인 학습 템플릿: 수락한 스케치를 그 기기의 표본으로 적립 ──
 * 아이 그림은 어디에도 전송하지 않는다 — localStorage에 정규화 점 구름만 저장. */

const LEARN_KEY = "arton.sketchLearn.v1";
/** 스탬프당 최근 수락 표본 수(FIFO) — 40스탬프 × 3 × 48점 ≈ 수십 KB 상한 */
const LEARN_MAX_PER_STAMP = 3;

type LearnStore = Record<string, number[][]>; // stampId → [x0,y0,x1,y1,…] 플랫 배열들

let personal: SketchTemplate[] | null = null;

function readLearnStore(): LearnStore {
  try {
    const raw = localStorage.getItem(LEARN_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function unflatten(flat: number[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) out.push({ x: flat[i], y: flat[i + 1] });
  return out;
}

function loadPersonalTemplates(): SketchTemplate[] {
  if (personal) return personal;
  if (typeof localStorage === "undefined") return [];
  const out: SketchTemplate[] = [];
  for (const [stampId, clouds] of Object.entries(readLearnStore())) {
    const label = getStamp(stampId)?.label;
    if (!label || !Array.isArray(clouds)) continue;
    for (const flat of clouds) {
      if (!Array.isArray(flat) || flat.length < 16 || flat.some((n) => typeof n !== "number")) continue;
      out.push({ stampId, label, cloud: unflatten(flat) });
    }
  }
  personal = out;
  return personal;
}

/** 제안 수락 시 호출 — 이 스케치를 해당 스탬프의 개인 표본으로 저장(근사 중복은 스킵) */
export function learnAccepted(stampId: string, rawStrokes: Pt[][]): void {
  if (typeof localStorage === "undefined" || !getStamp(stampId)) return;
  const cloud = preparePointCloud(rawStrokes);
  if (cloud.length < 8) return;
  const store = readLearnStore();
  const list = Array.isArray(store[stampId]) ? store[stampId] : [];
  for (const flat of list) {
    if (Array.isArray(flat) && cloudDistance(cloud, unflatten(flat)) < 0.05) return; // 이미 비슷한 표본
  }
  list.push(cloud.flatMap((p) => [Math.round(p.x * 1000) / 1000, Math.round(p.y * 1000) / 1000]));
  while (list.length > LEARN_MAX_PER_STAMP) list.shift();
  store[stampId] = list;
  try {
    localStorage.setItem(LEARN_KEY, JSON.stringify(store));
  } catch {
    // 사파리 프라이빗 모드 등 — 학습만 포기, 인식은 정상
  }
  personal = null; // 다음 인식 때 재로드
}

/* ── 공개 API ── */

export interface SketchTemplate {
  stampId: string;
  label: string;
  /** preparePointCloud를 거친 정규화 점 구름 */
  cloud: Pt[];
}

/** 템플릿 주입형 인식(테스트·확장용) — recognizeSketch의 본체 */
export function recognizeAgainst(rawStrokes: Pt[][], tmpls: SketchTemplate[]): SketchSuggestion[] {
  if (rawStrokes.reduce((a, s) => a + s.length, 0) < 8) return [];
  const cloud = preparePointCloud(rawStrokes);
  // 스탬프당 표본이 여러 개(SVG·손그림 변형·개인 학습) — 최고점 하나만 남긴다
  const best = new Map<string, SketchSuggestion>();
  for (const t of tmpls) {
    const d = cloudDistance(cloud, t.cloud);
    // 정규화 공간 평균거리 → 점수. 완전일치 d≈0, 무관 d≈0.5+
    const score = Math.max(0, 1 - d * 2.2);
    const prev = best.get(t.stampId);
    if (!prev || score > prev.score) best.set(t.stampId, { stampId: t.stampId, label: t.label, score });
  }
  const results = [...best.values()].sort((a, b) => b.score - a.score);
  return results.slice(0, SUGGEST_TOP).filter((r) => r.score >= SUGGEST_MIN_SCORE);
}

/**
 * 스케치(획 배열) → 상위 후보. 점수 하한 미달이면 빈 배열.
 * 계산량: ~75템플릿(SVG 40+변형 33+개인 ≤120) × √48 시작점 × 48² 그리디 ≈ 수 ms
 * (스트로크 종료 후 debounce idle에서만 호출)
 */
export function recognizeSketch(rawStrokes: Pt[][]): SketchSuggestion[] {
  return recognizeAgainst(rawStrokes, [...buildTemplates(), ...loadPersonalTemplates()]);
}
