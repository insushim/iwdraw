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
