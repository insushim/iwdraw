import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  learnAccepted,
  preparePointCloud,
  recognizeAgainst,
  recognizeSketch,
  SUGGEST_MIN_SCORE,
  type Pt,
  type SketchTemplate,
} from "@/engine/recognizer/SketchMatch";
import { EXTRA_SKETCH_VARIANTS } from "@/engine/recognizer/extra-templates";
import { getStamp } from "@/engine/tools/StampTool";
import { mulberry32 } from "@/engine/types";

/*
 * 뚝딱그림 $P 매칭 수치 스모크 — DOM 없이 합성 템플릿 주입으로
 * "비슷한 건 붙고, 다른 건 떨어진다"를 결정적으로 검증한다.
 */

function circle(cx: number, cy: number, r: number, n = 64): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return { x: cx + Math.cos(t) * r, y: cy + Math.sin(t) * r };
  });
}

function star(cx: number, cy: number, r: number, n = 60): Pt[] {
  const pts: Pt[] = [];
  const spikes = 5;
  for (let i = 0; i <= spikes * 2; i++) {
    const t = -Math.PI / 2 + (i / (spikes * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push({ x: cx + Math.cos(t) * rr, y: cy + Math.sin(t) * rr });
  }
  // 꼭짓점 사이 보간해 점 밀도 확보
  const dense: Pt[] = [];
  for (let i = 1; i < pts.length; i++) {
    for (let k = 0; k < n / (spikes * 2); k++) {
      const t = k / (n / (spikes * 2));
      dense.push({
        x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t,
        y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t,
      });
    }
  }
  return dense;
}

function square(cx: number, cy: number, half: number, n = 64): Pt[] {
  const corners = [
    { x: cx - half, y: cy - half },
    { x: cx + half, y: cy - half },
    { x: cx + half, y: cy + half },
    { x: cx - half, y: cy + half },
    { x: cx - half, y: cy - half },
  ];
  const out: Pt[] = [];
  for (let i = 1; i < corners.length; i++) {
    for (let k = 0; k < n / 4; k++) {
      const t = k / (n / 4);
      out.push({
        x: corners[i - 1].x + (corners[i].x - corners[i - 1].x) * t,
        y: corners[i - 1].y + (corners[i].y - corners[i - 1].y) * t,
      });
    }
  }
  return out;
}

function jitter(pts: Pt[], amount: number, seed = 7): Pt[] {
  const rnd = mulberry32(seed);
  return pts.map((p) => ({
    x: p.x + (rnd() - 0.5) * amount,
    y: p.y + (rnd() - 0.5) * amount,
  }));
}

const TEMPLATES: SketchTemplate[] = [
  { stampId: "circle", label: "원", cloud: preparePointCloud([circle(0, 0, 10)]) },
  { stampId: "star", label: "별", cloud: preparePointCloud([star(0, 0, 10)]) },
  { stampId: "square", label: "네모", cloud: preparePointCloud([square(0, 0, 10)]) },
];

describe("SketchMatch $P 매칭", () => {
  it("점이 8개 미만이면 후보 없음", () => {
    expect(recognizeAgainst([circle(0, 0, 10, 5)], TEMPLATES)).toEqual([]);
  });

  it("삐뚤한 원(지터 15%)은 원으로 1등 + 하한 통과", () => {
    // 반지름 60, 지터 ±9px — 아이 손그림 수준의 흔들림
    const sketch = jitter(circle(200, 200, 60), 18);
    const out = recognizeAgainst([sketch], TEMPLATES);
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].stampId).toBe("circle");
    expect(out[0].score).toBeGreaterThanOrEqual(SUGGEST_MIN_SCORE);
  });

  it("삐뚤한 별은 별로 1등", () => {
    const sketch = jitter(star(300, 150, 80), 16, 11);
    const out = recognizeAgainst([sketch], TEMPLATES);
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].stampId).toBe("star");
  });

  it("네모는 원보다 네모에 확실히 가깝다", () => {
    const sketch = jitter(square(100, 100, 50), 10, 3);
    const out = recognizeAgainst([sketch], TEMPLATES);
    expect(out[0].stampId).toBe("square");
    const circleCand = out.find((c) => c.stampId === "circle");
    if (circleCand) expect(out[0].score).toBeGreaterThan(circleCand.score);
  });

  it("4획으로 나눠 그린 네모도 네모로 1등(멀티스트로크 — 획 사이 가짜 선분 없음)", () => {
    // 변 4개를 각각 별도 획으로, 획 순서도 뒤섞고 방향도 제각각
    const side = (a: Pt, b: Pt, n = 16): Pt[] =>
      Array.from({ length: n }, (_, i) => ({
        x: a.x + ((b.x - a.x) * i) / (n - 1),
        y: a.y + ((b.y - a.y) * i) / (n - 1),
      }));
    const s = 60;
    const strokes = [
      side({ x: 100 + s, y: 100 }, { x: 100, y: 100 }), // 윗변(역방향)
      side({ x: 100, y: 100 + s }, { x: 100 + s, y: 100 + s }), // 아랫변
      side({ x: 100, y: 100 }, { x: 100, y: 100 + s }), // 좌변
      side({ x: 100 + s, y: 100 + s }, { x: 100 + s, y: 100 }), // 우변(역방향)
    ].map((st, i) => jitter(st, 6, i + 20));
    const out = recognizeAgainst(strokes, TEMPLATES);
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].stampId).toBe("square");
    expect(out[0].score).toBeGreaterThanOrEqual(SUGGEST_MIN_SCORE);
  });

  it("크기·위치가 달라도 같은 결과(정규화 불변)", () => {
    const small = recognizeAgainst([jitter(circle(50, 50, 12), 3, 5)], TEMPLATES);
    const big = recognizeAgainst([jitter(circle(900, 700, 300), 75, 5)], TEMPLATES);
    expect(small[0]?.stampId).toBe("circle");
    expect(big[0]?.stampId).toBe("circle");
  });

  it("무작위 낙서는 깨끗한 원 매칭보다 점수가 낮다", () => {
    const rnd = mulberry32(42);
    const scribble: Pt[] = Array.from({ length: 80 }, () => ({
      x: rnd() * 200,
      y: rnd() * 200,
    }));
    const clean = recognizeAgainst([circle(0, 0, 50)], TEMPLATES);
    const noisy = recognizeAgainst([scribble], TEMPLATES);
    const noisyBest = noisy[0]?.score ?? 0;
    expect(clean[0].score).toBeGreaterThan(noisyBest);
  });
});

/* ── 손그림 변형 템플릿(웨일북 실측: 집→사과/유령/풍선 오제안 재현·수정) ── */

/** 꼭짓점 리스트 → 보간된 한 획 */
function polyStroke(pts: [number, number][], close = false, perEdge = 14): Pt[] {
  const v = close ? [...pts, pts[0]] : pts;
  const out: Pt[] = [];
  for (let i = 1; i < v.length; i++) {
    for (let k = 0; k < perEdge; k++) {
      const t = k / perEdge;
      out.push({
        x: v[i - 1][0] + (v[i][0] - v[i - 1][0]) * t,
        y: v[i - 1][1] + (v[i][1] - v[i - 1][1]) * t,
      });
    }
  }
  out.push({ x: v[v.length - 1][0], y: v[v.length - 1][1] });
  return out;
}

/** 실서비스와 같은 손그림 변형 풀(SVG 템플릿은 DOM 필요라 테스트에선 변형만) */
const VARIANT_POOL: SketchTemplate[] = EXTRA_SKETCH_VARIANTS.map((v) => ({
  stampId: v.stampId,
  label: getStamp(v.stampId)?.label ?? v.stampId,
  cloud: preparePointCloud(v.strokes),
}));

describe("손그림 변형 템플릿", () => {
  it("모든 변형의 stampId가 실제 스탬프를 가리킨다(라벨 누락 방지)", () => {
    for (const v of EXTRA_SKETCH_VARIANTS) {
      expect(getStamp(v.stampId), `unknown stampId: ${v.stampId}`).toBeTruthy();
    }
  });

  it("세모지붕+네모몸통 2획 집 → 집이 1등", () => {
    const roof = jitter(polyStroke([[60, 140], [120, 60], [180, 140]], true), 8, 31);
    const body = jitter(polyStroke([[70, 140], [70, 240], [170, 240], [170, 140]], true), 8, 32);
    const out = recognizeAgainst([roof, body], VARIANT_POOL);
    expect(out[0]?.stampId).toBe("house");
    expect(out[0].score).toBeGreaterThanOrEqual(SUGGEST_MIN_SCORE);
  });

  it("사다리꼴 지붕 집(웨일북 스타일)도 집이 1등", () => {
    const roof = jitter(polyStroke([[75, 100], [95, 48], [145, 48], [165, 100]], true), 7, 41);
    const body = jitter(polyStroke([[85, 100], [85, 225], [155, 225], [155, 100]], true), 7, 42);
    const out = recognizeAgainst([roof, body], VARIANT_POOL);
    expect(out[0]?.stampId).toBe("house");
  });

  it("같은 스탬프의 표본이 여러 개여도 후보엔 스탬프당 1개(최고점)만", () => {
    const houseCount = EXTRA_SKETCH_VARIANTS.filter((v) => v.stampId === "house").length;
    expect(houseCount).toBeGreaterThan(1); // 전제: 집 변형이 복수
    const pentagon = polyStroke([[10, 45], [50, 8], [90, 45], [90, 95], [10, 95]], true);
    const out = recognizeAgainst([pentagon], VARIANT_POOL);
    expect(out.filter((c) => c.stampId === "house")).toHaveLength(1);
  });
});

/* ── 개인 학습(수락한 스케치 적립 — localStorage) ── */

describe("개인 학습 템플릿", () => {
  const mem = new Map<string, string>();
  beforeAll(() => {
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    });
  });
  afterAll(() => vi.unstubAllGlobals());

  // 변형 풀에 없는 독특한 모양(나선) — 학습 전엔 못 맞추고, 학습 후엔 맞춰야 한다
  function spiral(seed: number): Pt[] {
    const rnd = mulberry32(seed);
    return Array.from({ length: 90 }, (_, i) => {
      const t = (i / 90) * Math.PI * 5;
      const r = 10 + t * 9;
      return {
        x: 200 + Math.cos(t) * r + (rnd() - 0.5) * 6,
        y: 200 + Math.sin(t) * r + (rnd() - 0.5) * 6,
      };
    });
  }

  it("수락 학습 후, 같은 스타일 스케치가 그 스탬프로 인식된다", () => {
    // node 환경: buildTemplates는 DOM이 없어 빈 배열 → 개인 표본만으로 인식 확인
    learnAccepted("planet", [spiral(1)]);
    const out = recognizeSketch([spiral(2)]); // 다른 지터의 같은 나선
    expect(out[0]?.stampId).toBe("planet");
    expect(out[0].score).toBeGreaterThanOrEqual(SUGGEST_MIN_SCORE);
  });

  it("근사 중복 표본은 다시 저장하지 않고, 스탬프당 상한(3)을 지킨다", () => {
    learnAccepted("planet", [spiral(1)]); // 사실상 같은 구름 — 스킵돼야 함
    const store = JSON.parse(mem.get("arton.sketchLearn.v1") ?? "{}");
    expect(store.planet).toHaveLength(1);
    for (let s = 10; s < 20; s++) {
      // 서로 다른 모양 10개를 계속 수락해도 최근 3개만 유지
      const rnd = mulberry32(s);
      const blob = Array.from({ length: 60 }, (_, i) => ({
        x: Math.cos((i / 60) * Math.PI * 2) * (40 + rnd() * 30),
        y: Math.sin((i / 60) * Math.PI * 2) * (40 + rnd() * 30),
      }));
      learnAccepted("planet", [blob]);
    }
    const after = JSON.parse(mem.get("arton.sketchLearn.v1") ?? "{}");
    expect(after.planet.length).toBeLessThanOrEqual(3);
  });

  it("없는 스탬프 id는 저장하지 않는다", () => {
    learnAccepted("nope", [spiral(3)]);
    const store = JSON.parse(mem.get("arton.sketchLearn.v1") ?? "{}");
    expect(store.nope).toBeUndefined();
  });
});
