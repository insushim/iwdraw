import { describe, expect, it } from "vitest";
import { StrokeRecorder } from "@/engine/core/StrokeRecorder";
import type { RecordedStroke } from "@/engine/types";

function stroke(id: number): RecordedStroke {
  return {
    brush: "pencil",
    settings: { size: 10, opacity: 1, color: { r: 0, g: 0, b: 0 }, waterAmount: 0, stabilize: 0 },
    layerId: "L1",
    points: [{ x: id, y: id, pressure: 1, t: id }],
    symmetry: "none",
  };
}

describe("StrokeRecorder.dropLast (뚝딱그림 치환 시 재생 로그 정리)", () => {
  it("최근 n개만 제거하고 앞은 보존", () => {
    const r = new StrokeRecorder();
    for (let i = 0; i < 5; i++) r.record(stroke(i));
    r.dropLast(3); // 스케치 3획 치환 시나리오
    const log = r.getLog();
    expect(log.length).toBe(2);
    expect(log[1].points[0].x).toBe(1); // 0,1만 남음
  });

  it("로그보다 큰 n·0·음수에도 안전", () => {
    const r = new StrokeRecorder();
    r.record(stroke(0));
    r.dropLast(0);
    expect(r.getLog().length).toBe(1);
    r.dropLast(-2);
    expect(r.getLog().length).toBe(1);
    r.dropLast(99);
    expect(r.getLog().length).toBe(0);
  });

  it("치환 시나리오: 스케치 k개 drop 후 stamp 기록 → 로그 최종 상태가 실제 캔버스와 일치", () => {
    const r = new StrokeRecorder();
    r.record(stroke(1)); // 이전 그림
    r.record(stroke(2)); // 스케치 획 1
    r.record(stroke(3)); // 스케치 획 2
    r.dropLast(2);
    r.record({ ...stroke(9), brush: "stamp", extra: { stamp: { id: "fish", cx: 0, cy: 0, size: 100 } } });
    const log = r.getLog();
    expect(log.length).toBe(2);
    expect(log[0].points[0].x).toBe(1);
    expect(log[1].brush).toBe("stamp");
    expect(log[1].extra?.stamp).toBeTruthy();
  });
});
