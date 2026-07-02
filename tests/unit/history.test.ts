import { describe, it, expect } from "vitest";
import { History, type Command } from "@/engine/core/History";

function makeCmd(state: { v: number }, to: number, cost = 100): Command {
  const from = state.v;
  return {
    cost,
    apply: () => {
      state.v = to;
    },
    revert: () => {
      state.v = from;
    },
  };
}

describe("History", () => {
  it("undo/redo가 상태를 왕복시킨다", () => {
    const s = { v: 0 };
    const h = new History(10);
    s.v = 1;
    h.push(makeCmd({ v: 0 }, 1));
    s.v = 2;
    h.push(makeCmd({ v: 1 }, 2));

    expect(h.canUndo).toBe(true);
    // 위 makeCmd는 별도 state 참조라 실제 왕복 검증은 공유 state로
  });

  it("공유 상태에서 undo/redo 정확", () => {
    const s = { v: 0 };
    const h = new History(10);
    const push = (to: number) => {
      const from = s.v;
      s.v = to;
      h.push({ cost: 10, apply: () => (s.v = to), revert: () => (s.v = from) });
    };
    push(1);
    push(2);
    push(3);
    expect(s.v).toBe(3);
    h.undo();
    expect(s.v).toBe(2);
    h.undo();
    expect(s.v).toBe(1);
    h.redo();
    expect(s.v).toBe(2);
    // 새 커맨드는 redo 스택 비움
    push(9);
    expect(h.canRedo).toBe(false);
    expect(s.v).toBe(9);
  });

  it("단계 상한을 넘으면 오래된 것부터 버린다", () => {
    const h = new History(3);
    const disposed: number[] = [];
    for (let i = 0; i < 5; i++) {
      h.push({ cost: 10, apply: () => {}, revert: () => {}, dispose: () => disposed.push(i) });
    }
    // 0,1 이 밀려남
    expect(disposed).toEqual([0, 1]);
  });

  it("메모리 예산 초과 시에도 오래된 것부터 버린다", () => {
    const h = new History(100, 250);
    const disposed: number[] = [];
    for (let i = 0; i < 4; i++) {
      h.push({ cost: 100, apply: () => {}, revert: () => {}, dispose: () => disposed.push(i) });
    }
    // 400 > 250 → 최소 1장 유지하며 오래된 것 제거
    expect(disposed.length).toBeGreaterThan(0);
    expect(disposed[0]).toBe(0);
  });
});
