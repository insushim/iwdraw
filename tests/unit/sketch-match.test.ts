import { describe, expect, it } from "vitest";
import {
  preparePointCloud,
  recognizeAgainst,
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

/** 타원 호 점열(extra-templates의 arc와 동일 규칙) */
function arcPts(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 20): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });
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

  it("확장 카테고리: 눈사람(원 2단)·아이스크림(콘+스쿱)·도넛(이중 원)이 각각 1등", () => {
    const circleStroke = (cx: number, cy: number, r: number, seed: number) =>
      jitter(
        Array.from({ length: 40 }, (_, i) => {
          const t = (i / 40) * Math.PI * 2;
          return { x: cx + Math.cos(t) * r, y: cy + Math.sin(t) * r };
        }),
        r * 0.12,
        seed,
      );
    const snowman = [circleStroke(150, 80, 45, 51), circleStroke(150, 195, 72, 52)];
    expect(recognizeAgainst(snowman, VARIANT_POOL)[0]?.stampId).toBe("snowman");

    const cone = jitter(polyStroke([[100, 120], [200, 120], [150, 260]], true), 7, 53);
    const scoop = circleStroke(150, 85, 58, 54);
    expect(recognizeAgainst([cone, scoop], VARIANT_POOL)[0]?.stampId).toBe("icecream");

    const donut = [circleStroke(150, 150, 90, 55), circleStroke(150, 150, 32, 56)];
    expect(recognizeAgainst(donut, VARIANT_POOL)[0]?.stampId).toBe("donut");
  });

  it("막대 사람(머리 원+몸통·팔다리 선)이 사람으로 1등", () => {
    const head = jitter(
      Array.from({ length: 30 }, (_, i) => {
        const t = (i / 30) * Math.PI * 2;
        return { x: 150 + Math.cos(t) * 28, y: 50 + Math.sin(t) * 28 };
      }),
      4,
      61,
    );
    const strokes = [
      head,
      jitter(polyStroke([[150, 78], [150, 170]]), 4, 62), // 몸통
      jitter(polyStroke([[150, 105], [95, 140]]), 4, 63), // 팔
      jitter(polyStroke([[150, 105], [205, 140]]), 4, 64),
      jitter(polyStroke([[150, 170], [110, 250]]), 4, 65), // 다리
      jitter(polyStroke([[150, 170], [190, 250]]), 4, 66),
    ];
    expect(recognizeAgainst(strokes, VARIANT_POOL)[0]?.stampId).toBe("person");
  });

  it("3차 확장 대표 소재가 132종 중 상위 후보로 인식된다(유사형태 충돌 점검)", () => {
    // 각 소재의 대표 스케치를 지터해 표본과 다르게 — 상위 3위 안에 정답이 있으면 통과
    const near = (kind: string, strokes: Pt[][], seed: number) => {
      const jittered = strokes.map((s, i) => jitter(s, 6, seed + i));
      const out = recognizeAgainst(jittered, VARIANT_POOL);
      const rank = out.findIndex((c) => c.stampId === kind);
      expect(rank, `${kind} not in top: ${out.map((c) => c.stampId).join(",")}`).toBeGreaterThanOrEqual(0);
      expect(rank, `${kind} rank ${rank}`).toBeLessThan(3);
    };
    const circleAt = (cx: number, cy: number, r: number) =>
      Array.from({ length: 32 }, (_, i) => {
        const t = (i / 32) * Math.PI * 2;
        return { x: cx + Math.cos(t) * r, y: cy + Math.sin(t) * r };
      });
    // 거미: 몸 원 + 다리 8
    near(
      "spider",
      [
        circleAt(50, 52, 18),
        polyStroke([[32, 46], [8, 34]]),
        polyStroke([[32, 52], [6, 54]]),
        polyStroke([[32, 58], [10, 74]]),
        polyStroke([[34, 64], [22, 88]]),
        polyStroke([[68, 46], [92, 34]]),
        polyStroke([[68, 52], [94, 54]]),
        polyStroke([[68, 58], [90, 74]]),
        polyStroke([[66, 64], [78, 88]]),
      ],
      101,
    );
    // 자전거: 바퀴 두 원 + 프레임
    near(
      "bicycle",
      [circleAt(24, 66, 20), circleAt(76, 66, 20), polyStroke([[24, 66], [42, 30], [66, 30], [76, 66], [42, 30]])],
      110,
    );
    // 햄버거: 층 구조
    near(
      "hamburger",
      [
        [...arcPts(50, 34, 40, 22, Math.PI, Math.PI * 2, 16)],
        polyStroke([[10, 44], [90, 44]]),
        polyStroke([[12, 56], [88, 56]]),
        [...arcPts(50, 66, 38, 14, 0, Math.PI, 14), ...polyStroke([[88, 66], [12, 66]])],
      ],
      120,
    );
    // 텐트: 삼각 + 입구
    near("tent", [polyStroke([[50, 12], [12, 88], [88, 88]], true), polyStroke([[50, 40], [38, 88], [62, 88]], true)], 130);
  });

  it("같은 스탬프의 표본이 여러 개여도 후보엔 스탬프당 1개(최고점)만", () => {
    const houseCount = EXTRA_SKETCH_VARIANTS.filter((v) => v.stampId === "house").length;
    expect(houseCount).toBeGreaterThan(1); // 전제: 집 변형이 복수
    const pentagon = polyStroke([[10, 45], [50, 8], [90, 45], [90, 95], [10, 95]], true);
    const out = recognizeAgainst([pentagon], VARIANT_POOL);
    expect(out.filter((c) => c.stampId === "house")).toHaveLength(1);
  });
});
