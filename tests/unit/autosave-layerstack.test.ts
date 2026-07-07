import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AutoSave, type SavedState } from "@/engine/core/AutoSave";
import { LayerStack } from "@/engine/core/LayerStack";

const fakeState = (): SavedState => ({
  savedAt: Date.now(),
  width: 10,
  height: 10,
  mode: "free",
  layers: [],
  recorder: "[]",
});

describe("AutoSave max-wait", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("디바운스가 계속 리셋돼도 maxWait을 넘기면 강제 플러시된다", async () => {
    const as = new AutoSave(5000, 15000);
    const flush = vi.spyOn(as, "flush").mockResolvedValue();
    // 3초 간격으로 계속 그리기 — 종전 디바운스-only 구현이면 flush가 영원히 안 불림
    for (let t = 0; t < 6; t++) {
      as.schedule(fakeState);
      await vi.advanceTimersByTimeAsync(3000);
    }
    // 15초(maxWait) 경과 시점 안에서 최소 1회 플러시
    expect(flush).toHaveBeenCalled();
    as.destroy();
  });

  it("한가할 땐 디바운스대로 1회만 저장한다", async () => {
    const as = new AutoSave(5000, 15000);
    const flush = vi.spyOn(as, "flush").mockResolvedValue();
    as.schedule(fakeState);
    await vi.advanceTimersByTimeAsync(5001);
    expect(flush).toHaveBeenCalledTimes(1);
    as.destroy();
  });
});

describe("LayerStack 원본(base) 잠금 레이어", () => {
  it("base는 항상 최하단, 활성 선택·삭제 불가, 중복 생성 안 됨", () => {
    const stack = new LayerStack(10, 10);
    const drawingId = stack.activeId;
    const base = stack.addBase();
    expect(stack.list[0].id).toBe(base.id); // 최하단
    expect(stack.activeId).toBe(drawingId); // 활성 레이어 유지 → 지우개는 base를 못 건드림
    stack.setActive(base.id);
    expect(stack.activeId).toBe(drawingId); // 선택 불가
    expect(stack.removeLayer(base.id)).toBe(false); // 삭제 불가
    expect(stack.addBase().id).toBe(base.id); // 멱등
  });

  it("일반 레이어를 base 아래로 reorder할 수 없다", () => {
    const stack = new LayerStack(10, 10);
    stack.addBase();
    const extra = stack.addLayer("레이어 2")!;
    stack.reorder(extra.id, 0);
    expect(stack.list[0].isBase).toBe(true); // base가 여전히 맨 아래
  });

  it("clearAll은 base를 지우지 않는다(잠금)", () => {
    const stack = new LayerStack(10, 10);
    const base = stack.addBase();
    // jsdom엔 2D 컨텍스트가 없어 스텁으로 대체
    const calls: string[] = [];
    for (const l of stack.list)
      l.ctx = { clearRect: () => calls.push(l.id) } as unknown as CanvasRenderingContext2D;
    stack.clearAll();
    expect(calls).not.toContain(base.id);
    expect(calls.length).toBe(stack.list.length - 1); // 나머지는 전부 지워짐
  });
});
