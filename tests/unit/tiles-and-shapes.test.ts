import { describe, it, expect } from "vitest";
import { tilesForRect, copyTiles, TILE } from "@/engine/core/tiles";
import { detectShape } from "@/engine/tools/QuickShape";
import { mirrorPoint } from "@/engine/tools/Symmetry";
import { normalizeClassCode, isValidClassCode } from "@/lib/class-code";
import { hslToRgb } from "@/engine/brushes/BrushBase";
import { encodeStroke, decodeStroke } from "@/lib/stroke-codec";
import type { StrokePoint } from "@/engine/types";

describe("tiles", () => {
  it("영역을 덮는 타일만 반환", () => {
    const tiles = tilesForRect(10, 10, 20, 20, 1024, 1024);
    expect(tiles).toHaveLength(1);
    expect(tiles[0].x).toBe(0);
    expect(tiles[0].w).toBe(TILE);
  });

  it("경계를 넘는 영역은 여러 타일", () => {
    const tiles = tilesForRect(TILE - 5, 0, 10, 10, 1024, 1024);
    expect(tiles.length).toBe(2);
  });

  it("copyTiles가 정확한 픽셀을 떠낸다", () => {
    const w = TILE * 2;
    const h = TILE;
    const data = new Uint8ClampedArray(w * h * 4);
    // (5,5) 픽셀을 빨강
    const p = (5 * w + 5) * 4;
    data[p] = 255;
    data[p + 3] = 255;
    const tiles = tilesForRect(0, 0, TILE, TILE, w, h);
    const snaps = copyTiles(data, w, tiles);
    const sp = (5 * TILE + 5) * 4;
    expect(snaps[0][sp]).toBe(255);
  });
});

describe("QuickShape.detectShape", () => {
  it("직선 인식", () => {
    const pts: StrokePoint[] = [];
    for (let i = 0; i <= 20; i++) pts.push({ x: i * 5, y: 0, pressure: 0.5, t: i });
    const shape = detectShape(pts);
    expect(shape?.kind).toBe("line");
  });

  it("원 인식(닫힌 원형)", () => {
    const pts: StrokePoint[] = [];
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      pts.push({ x: 100 + Math.cos(a) * 50, y: 100 + Math.sin(a) * 50, pressure: 0.5, t: i });
    }
    const shape = detectShape(pts);
    expect(shape?.kind).toBe("circle");
  });

  it("점이 너무 적으면 null", () => {
    expect(detectShape([{ x: 0, y: 0, pressure: 1, t: 0 }])).toBeNull();
  });

  // 손그림 도형 시뮬레이터: 꼭짓점에서 시작하는 닫힌 다각형(이음새 오프바이원 회귀 방지)
  function polygon(nSides: number, jitter = 0): StrokePoint[] {
    const cx = 200,
      cy = 200,
      R = 120,
      rot = -Math.PI / 2,
      perEdge = 14;
    const corners = Array.from({ length: nSides }, (_, i) => {
      const a = rot + (i / nSides) * Math.PI * 2;
      return { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R };
    });
    const pts: StrokePoint[] = [];
    for (let i = 0; i < nSides; i++) {
      const A = corners[i];
      const B = corners[(i + 1) % nSides];
      for (let k = 0; k < perEdge; k++) {
        const t = k / perEdge;
        pts.push({
          x: A.x + (B.x - A.x) * t + (((i * 7 + k) % 5) - 2) * 0.2 * jitter,
          y: A.y + (B.y - A.y) * t + (((i * 3 + k) % 5) - 2) * 0.2 * jitter,
          pressure: 0.5,
          t: pts.length,
        });
      }
    }
    pts.push({ x: corners[0].x, y: corners[0].y, pressure: 0.5, t: pts.length });
    return pts;
  }

  it("삼각형 인식(꼭짓점에서 시작 — 이음새 포함)", () => {
    expect(detectShape(polygon(3))?.kind).toBe("triangle");
    expect(detectShape(polygon(3, 4))?.kind).toBe("triangle");
  });

  it("사각형 인식", () => {
    expect(detectShape(polygon(4))?.kind).toBe("rect");
    expect(detectShape(polygon(4, 4))?.kind).toBe("rect");
  });

  it("하트 인식(오목 상단 홈 → 삼각형으로 오인 금지)", () => {
    const pts: StrokePoint[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = (i / 60) * Math.PI * 2;
      const x = 16 * Math.sin(t) ** 3;
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      pts.push({ x: 200 + x * 6, y: 200 - y * 6, pressure: 0.5, t: i });
    }
    expect(detectShape(pts)?.kind).toBe("heart");
  });

  it("별 인식(5각)", () => {
    const raw: { x: number; y: number }[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      const rr = i % 2 === 0 ? 120 : 50;
      raw.push({ x: 200 + Math.cos(t) * rr, y: 200 + Math.sin(t) * rr });
    }
    const pts: StrokePoint[] = [];
    for (let i = 0; i < raw.length - 1; i++) {
      for (let k = 0; k < 6; k++) {
        const t = k / 6;
        pts.push({
          x: raw[i].x + (raw[i + 1].x - raw[i].x) * t,
          y: raw[i].y + (raw[i + 1].y - raw[i].y) * t,
          pressure: 0.5,
          t: pts.length,
        });
      }
    }
    pts.push({ x: raw[0].x, y: raw[0].y, pressure: 0.5, t: pts.length });
    expect(detectShape(pts)?.kind).toBe("star");
  });
});

describe("Symmetry.mirrorPoint", () => {
  const p: StrokePoint = { x: 10, y: 20, pressure: 1, t: 0 };
  it("none은 원본만", () => {
    expect(mirrorPoint(p, "none", 100, 100)).toHaveLength(1);
  });
  it("vertical은 좌우 2개", () => {
    const r = mirrorPoint(p, "vertical", 100, 100);
    expect(r).toHaveLength(2);
    expect(r[1].x).toBe(90);
    expect(r[1].y).toBe(20);
  });
  it("quad는 4개", () => {
    const r = mirrorPoint(p, "quad", 100, 100);
    expect(r).toHaveLength(4);
    expect(r[3]).toMatchObject({ x: 90, y: 80 });
  });
});

describe("class-code", () => {
  it("혼동 문자를 제거하고 대문자화", () => {
    expect(normalizeClassCode("ab-c1o2")).toBe("ABC2"); // 1,O 제거
  });
  it("6자리 유효성", () => {
    expect(isValidClassCode("ABCDEF")).toBe(true);
    expect(isValidClassCode("ABC12")).toBe(false); // 5자리
    expect(isValidClassCode("ABC1EF")).toBe(false); // 1은 문자셋 아님
  });
});

describe("hslToRgb", () => {
  it("빨강(h=0)", () => {
    const c = hslToRgb(0, 1, 0.5);
    expect(c.r).toBeGreaterThan(240);
    expect(c.g).toBeLessThan(15);
  });
});

describe("stroke-codec (협동 delta encoding)", () => {
  it("인코드→디코드 왕복이 좌표를 보존", () => {
    const pts: StrokePoint[] = [
      { x: 10.2, y: 20.7, pressure: 0.5, t: 0 },
      { x: 15.9, y: 25.1, pressure: 0.7, t: 16 },
      { x: 30.3, y: 40.4, pressure: 0.6, t: 32 },
    ];
    const enc = encodeStroke(pts);
    const dec = decodeStroke(enc);
    expect(dec).toHaveLength(3);
    // 0.1px 이내(Float32 델타 양자화 허용)
    for (let i = 0; i < pts.length; i++) {
      expect(Math.abs(dec[i].x - pts[i].x)).toBeLessThan(0.2);
      expect(Math.abs(dec[i].y - pts[i].y)).toBeLessThan(0.2);
      expect(Math.abs(dec[i].pressure - pts[i].pressure)).toBeLessThan(0.02);
    }
  });

  it("base64 문자열이라 broadcast 가능", () => {
    const enc = encodeStroke([{ x: 1, y: 2, pressure: 1, t: 0 }]);
    expect(typeof enc).toBe("string");
    expect(enc.length).toBeGreaterThan(0);
  });
});
