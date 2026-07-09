import { describe, expect, it } from "vitest";
import {
  preparePointCloud,
  recognizeAgainst,
  SUGGEST_MIN_SCORE,
  type Pt,
  type SketchTemplate,
} from "@/engine/recognizer/SketchMatch";
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
