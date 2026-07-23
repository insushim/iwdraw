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

describe("StrokeRecorder 언두 커서 (무비 최종 프레임 = 현재 캔버스)", () => {
  it("undo하면 getLog에서 제외되고 redo로 복귀", () => {
    const r = new StrokeRecorder();
    r.record(stroke(0));
    r.record(stroke(1));
    r.record(stroke(2));
    r.undo();
    expect(r.getLog().length).toBe(2);
    r.undo();
    expect(r.getLog().length).toBe(1);
    r.redo();
    expect(r.getLog().length).toBe(2);
    r.redo();
    expect(r.getLog().length).toBe(3);
    r.redo(); // 초과 redo는 no-op
    expect(r.getLog().length).toBe(3);
  });

  it("언두 상태에서 새 획을 기록하면 redo 꼬리를 버린다(히스토리 분기 폐기와 동일)", () => {
    const r = new StrokeRecorder();
    r.record(stroke(0));
    r.record(stroke(1));
    r.undo();
    r.record(stroke(7));
    const log = r.getLog();
    expect(log.length).toBe(2);
    expect(log[1].points[0].x).toBe(7); // 1은 사라지고 7이 대체
    r.redo(); // 꼬리가 없으니 no-op
    expect(r.getLog().length).toBe(2);
  });

  it("로그 밖 언두(캡 축출 뒤 깊은 undo)는 부채로 세고 redo가 먼저 상환한다", () => {
    // 히스토리는 로그 캡(3MB)과 독립으로 더 깊이 undo될 수 있다 — 부채를 안 세면
    // redo가 로그와 한 칸씩 어긋난다(교차검증 발견)
    const r = new StrokeRecorder();
    r.record(stroke(0));
    r.record(stroke(1));
    r.undo();
    r.undo();
    r.undo(); // 로그 밖 — 부채 1
    expect(r.getLog().length).toBe(0);
    r.redo(); // 부채 상환 — 커서 그대로
    expect(r.getLog().length).toBe(0);
    r.redo();
    expect(r.getLog().length).toBe(1);
    r.redo();
    expect(r.getLog().length).toBe(2);
  });

  it("serialize는 활성 구간만 저장하고 load 후 커서는 끝", () => {
    const r = new StrokeRecorder();
    r.record(stroke(0));
    r.record(stroke(1));
    r.undo();
    const json = r.serialize();
    const r2 = new StrokeRecorder();
    r2.load(json);
    expect(r2.getLog().length).toBe(1);
    r2.redo(); // 언두분은 저장 안 됨 — no-op
    expect(r2.getLog().length).toBe(1);
  });

  it("dropLast는 언두 꼬리를 먼저 버리고 활성 꼬리를 제거", () => {
    const r = new StrokeRecorder();
    r.record(stroke(0));
    r.record(stroke(1));
    r.record(stroke(2));
    r.undo(); // 활성 [0,1]
    r.dropLast(1); // 활성 [0]
    expect(r.getLog().length).toBe(1);
    expect(r.getLog()[0].points[0].x).toBe(0);
  });
});

describe("StrokeRecorder.rescale (복원 시 캔버스 크기 변화 정합)", () => {
  it("점·굵기·스탬프 파라미터에 배율+오프셋 적용", () => {
    const r = new StrokeRecorder();
    r.record(stroke(100));
    r.record({ ...stroke(9), brush: "stamp", extra: { stamp: { id: "fish", cx: 200, cy: 100, size: 80 } } });
    r.rescale(0.5, 10, 20);
    const log = r.getLog();
    expect(log[0].points[0].x).toBe(60); // 100*0.5+10
    expect(log[0].points[0].y).toBe(70); // 100*0.5+20
    expect(log[0].settings.size).toBe(5);
    const st = log[1].extra?.stamp as { cx: number; cy: number; size: number };
    expect(st.cx).toBe(110);
    expect(st.cy).toBe(70);
    expect(st.size).toBe(40);
  });

  it("항등 변환은 no-op", () => {
    const r = new StrokeRecorder();
    r.record(stroke(3));
    r.rescale(1, 0, 0);
    expect(r.getLog()[0].points[0].x).toBe(3);
  });
});

describe("StrokeRecorder.load 상한 집행", () => {
  it("3MB 초과 로그를 로드하면 오래된 획부터 버린다(자동저장 재비대 방지)", () => {
    const big = (id: number): RecordedStroke => ({
      ...stroke(id),
      points: Array.from({ length: 40000 }, (_, i) => ({ x: i + id, y: i, pressure: 1, t: i })),
    });
    const r = new StrokeRecorder();
    r.record(big(1));
    // record 캡을 피해서 직접 초과 JSON을 구성(구버전 저장분 시뮬레이션)
    const json = `[${JSON.stringify(big(1))},${JSON.stringify(big(2))}]`;
    expect(json.length).toBeGreaterThan(3 * 1024 * 1024);
    const r2 = new StrokeRecorder();
    r2.load(json);
    expect(r2.getLog().length).toBe(1);
    expect(r2.getLog()[0].points[0].x).toBe(2); // 최신(2)이 남는다
    expect(r2.serialize().length).toBeLessThanOrEqual(3 * 1024 * 1024 + 2);
  });
});
