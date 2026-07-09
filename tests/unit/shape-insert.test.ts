import { describe, expect, it } from "vitest";
import { densifyShape, shapeInsertPoints } from "@/engine/tools/ShapeInsert";

/* 도형 삽입(드래그 배치) 기하 — 순수 함수라 DOM 없이 검증 */

function bbox(pts: { x: number; y: number }[]) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

describe("shapeInsertPoints", () => {
  it("직선: 수평에 가까우면(±7°) 수평으로 스냅", () => {
    const [a, b] = shapeInsertPoints("line", 10, 100, 300, 110); // 기울기 ~2°
    expect(a.y).toBe(100);
    expect(b.y).toBe(100); // y가 시작점으로 스냅
    expect(b.x).toBe(300);
  });

  it("직선: 수직에 가까우면 수직 스냅, 대각선은 그대로", () => {
    const [, v] = shapeInsertPoints("line", 100, 10, 108, 300);
    expect(v.x).toBe(100);
    const [, d] = shapeInsertPoints("line", 0, 0, 100, 100); // 45°
    expect(d.x).toBe(100);
    expect(d.y).toBe(100);
  });

  it("네모: 드래그 방향과 무관하게 bbox 모서리 4개 + 닫힘", () => {
    const pts = shapeInsertPoints("rect", 200, 150, 50, 30); // 우하→좌상 드래그
    expect(pts).toHaveLength(5);
    expect(pts[0]).toEqual({ x: 50, y: 30 });
    expect(pts[2]).toEqual({ x: 200, y: 150 });
    expect(pts[4]).toEqual(pts[0]);
  });

  it.each(["ellipse", "triangle", "star", "heart"] as const)(
    "%s: 드래그 영역에 정확히 꼭 맞는다",
    (kind) => {
      const pts = shapeInsertPoints(kind, 20, 40, 220, 160);
      const b = bbox(pts);
      expect(b.minX).toBeCloseTo(20, 4);
      expect(b.minY).toBeCloseTo(40, 4);
      expect(b.maxX).toBeCloseTo(220, 4);
      expect(b.maxY).toBeCloseTo(160, 4);
    },
  );

  it("별: 꼭짓점 11개(5뾰족 + 닫힘), 하트: 시작=끝(닫힘)", () => {
    expect(shapeInsertPoints("star", 0, 0, 100, 100)).toHaveLength(11);
    const h = shapeInsertPoints("heart", 0, 0, 100, 100);
    expect(h[0].x).toBeCloseTo(h[h.length - 1].x, 4);
    expect(h[0].y).toBeCloseTo(h[h.length - 1].y, 4);
  });
});

describe("densifyShape", () => {
  it("모든 인접 점 간격이 step 이하(브러시 dab 매끈)", () => {
    const pts = densifyShape(shapeInsertPoints("rect", 0, 0, 300, 200), 3);
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      expect(d).toBeLessThanOrEqual(3 + 1e-9);
    }
    // 시작/끝 보존
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[pts.length - 1].x).toBeCloseTo(0);
    expect(pts[pts.length - 1].y).toBeCloseTo(0);
  });
});
