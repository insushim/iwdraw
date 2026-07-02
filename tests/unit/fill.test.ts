import { describe, it, expect } from "vitest";
import { floodFill, buildBarrierFromLineart } from "@/engine/brushes/FillTool";

/** w×h RGBA 버퍼를 특정 색으로 채워 생성 */
function makeBuffer(w: number, h: number, fill: [number, number, number, number]): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    buf[i * 4] = fill[0];
    buf[i * 4 + 1] = fill[1];
    buf[i * 4 + 2] = fill[2];
    buf[i * 4 + 3] = fill[3];
  }
  return buf;
}

function at(buf: Uint8ClampedArray, w: number, x: number, y: number) {
  const p = (y * w + x) * 4;
  return [buf[p], buf[p + 1], buf[p + 2], buf[p + 3]];
}

describe("floodFill", () => {
  it("빈 캔버스를 전부 채운다", () => {
    const w = 20,
      h = 20;
    const buf = makeBuffer(w, h, [255, 255, 255, 255]);
    const res = floodFill(buf, w, h, 10, 10, { r: 255, g: 0, b: 0 });
    expect(res.changed).toBe(true);
    expect(at(buf, w, 0, 0)).toEqual([255, 0, 0, 255]);
    expect(at(buf, w, 19, 19)).toEqual([255, 0, 0, 255]);
  });

  it("이미 목표색이면 no-op", () => {
    const w = 10,
      h = 10;
    const buf = makeBuffer(w, h, [255, 0, 0, 255]);
    const res = floodFill(buf, w, h, 5, 5, { r: 255, g: 0, b: 0 });
    expect(res.changed).toBe(false);
  });

  it("벽(barrier) 밖으로 새지 않는다 — 색칠 경계 잠금", () => {
    const w = 21,
      h = 21;
    const buf = makeBuffer(w, h, [255, 255, 255, 255]);
    // 중앙 세로 벽으로 좌/우 분리
    const barrier = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) barrier[y * w + 10] = 1;
    const res = floodFill(buf, w, h, 3, 10, { r: 0, g: 0, b: 255 }, { barrier });
    expect(res.changed).toBe(true);
    // 왼쪽은 파랑
    expect(at(buf, w, 3, 10)).toEqual([0, 0, 255, 255]);
    // 오른쪽(벽 너머)은 흰색 유지
    expect(at(buf, w, 15, 10)).toEqual([255, 255, 255, 255]);
    // 벽 자체는 안 칠해짐
    expect(at(buf, w, 10, 10)).toEqual([255, 255, 255, 255]);
  });

  it("벽 위를 시드로 찍으면 no-op", () => {
    const w = 10,
      h = 10;
    const buf = makeBuffer(w, h, [255, 255, 255, 255]);
    const barrier = new Uint8Array(w * h);
    barrier[5 * w + 5] = 1;
    const res = floodFill(buf, w, h, 5, 5, { r: 1, g: 2, b: 3 }, { barrier });
    expect(res.changed).toBe(false);
  });

  it("tolerance 밖 색 경계에서 멈춘다", () => {
    const w = 10,
      h = 1;
    const buf = makeBuffer(w, h, [255, 255, 255, 255]);
    // x>=5 을 검정으로
    for (let x = 5; x < w; x++) {
      const p = x * 4;
      buf[p] = buf[p + 1] = buf[p + 2] = 0;
    }
    const res = floodFill(buf, w, h, 0, 0, { r: 255, g: 0, b: 0 }, { tolerance: 32 });
    expect(res.changed).toBe(true);
    expect(at(buf, w, 4, 0)).toEqual([255, 0, 0, 255]);
    // 검정 영역은 유지(단, AA 팽창 1px 예외로 x=5는 칠해질 수 있음 → x=7 검사)
    expect(at(buf, w, 7, 0)).toEqual([0, 0, 0, 255]);
  });
});

describe("buildBarrierFromLineart", () => {
  it("불투명한 어두운 픽셀을 벽으로 인식한다", () => {
    const w = 4,
      h = 1;
    const px = new Uint8ClampedArray(w * h * 4);
    // 0: 검정 불투명(벽), 1: 흰색 불투명(비벽), 2: 투명(비벽), 3: 검정 반투명(경계)
    px.set([0, 0, 0, 255], 0);
    px.set([255, 255, 255, 255], 4);
    px.set([0, 0, 0, 0], 8);
    px.set([0, 0, 0, 255], 12);
    const barrier = buildBarrierFromLineart(px, w, h);
    expect(barrier[0]).toBe(1);
    expect(barrier[1]).toBe(0);
    expect(barrier[2]).toBe(0);
    expect(barrier[3]).toBe(1);
  });
});
