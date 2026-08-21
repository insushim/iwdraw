import { describe, it, expect } from "vitest";
import { Gestures } from "@/engine/input/Gestures";

/*
 * 제스처 판정 — 특히 "두 손가락 탭 = 되돌리기"가 실제 확대와 섞이지 않는지.
 * e2e(CDP)로는 프레임당 왕복이 50ms라 220ms 안에 끝나는 핀치를 만들 수 없어서
 * 여기서 시간축을 직접 준다.
 */
function rig() {
  const log = { transforms: 0, undo: 0, redo: 0, lastScale: 1 };
  const g = new Gestures({
    onTransform: (d) => {
      log.transforms++;
      log.lastScale *= d.scale;
    },
    onUndo: () => log.undo++,
    onRedo: () => log.redo++,
  });
  return { g, log };
}
const pair = (half: number) => [
  { clientX: 500 - half, clientY: 400 },
  { clientX: 500 + half, clientY: 400 },
];

describe("두 손가락 탭 판정", () => {
  it("제자리에서 콕 두드리면 되돌리기", () => {
    const { g, log } = rig();
    g.update(pair(40), "start", 0);
    g.update(pair(41), "move", 40);
    g.update([], "end", 120);
    expect(log.undo).toBe(1);
  });

  it("중심을 고정한 채 빠르게 벌린 확대는 탭이 아니다", () => {
    // 대칭 핀치는 중심이 거의 안 움직인다 — 이동량만 세면 220ms 안의 확대가 탭으로 오인돼
    // 방금 그린 획이 되돌려진다
    const { g, log } = rig();
    g.update(pair(30), "start", 0);
    g.update(pair(70), "move", 50);
    g.update(pair(120), "move", 100);
    g.update(pair(170), "move", 150);
    g.update([], "end", 200); // 220ms 안에 끝난 빠른 핀치
    expect(log.lastScale, "실제로 확대가 일어났다").toBeGreaterThan(1.5);
    expect(log.undo, "확대를 탭으로 오인하면 안 된다").toBe(0);
  });

  it("세 손가락 탭은 다시 실행", () => {
    const { g, log } = rig();
    g.update([...pair(40), { clientX: 500, clientY: 470 }], "start", 0);
    g.update([], "end", 120);
    expect(log.redo).toBe(1);
    expect(log.undo).toBe(0);
  });

  it("브라우저가 취소한 입력(cancel)은 탭으로 세지 않는다", () => {
    const { g, log } = rig();
    g.update(pair(40), "start", 0);
    g.update([], "cancel", 100);
    expect(log.undo).toBe(0);
    expect(log.redo).toBe(0);
  });

  it("긴 제스처 도중 손가락이 하나 더 얹혀도 탭으로 둔갑하지 않는다", () => {
    // restart 는 기준 거리만 다시 잡고 시작 시각·이동량은 이어가야 한다
    const { g, log } = rig();
    g.update(pair(40), "start", 0);
    g.update(pair(90), "move", 200);
    g.update(pair(140), "move", 400);
    g.update([...pair(140), { clientX: 500, clientY: 470 }], "restart", 600);
    g.update([], "end", 640); // restart 로부터는 40ms뿐이지만 제스처 전체는 640ms
    expect(log.undo).toBe(0);
    expect(log.redo).toBe(0);
  });
});

describe("배율 계산", () => {
  it("좁게 잡은 핀치도 벌린 만큼 확대된다", () => {
    // 간격 40px(반경 20) → 100px(반경 50) = 2.5배. 하한이 과하면 여기가 죽는다.
    const { g, log } = rig();
    g.update(pair(20), "start", 0);
    for (let i = 1; i <= 10; i++) g.update(pair(20 + i * 3), "move", i * 16);
    expect(log.lastScale).toBeGreaterThan(2.2);
    expect(log.lastScale).toBeLessThan(2.8);
  });

  it("손가락을 붙여서 시작해도 배율이 폭주하지 않는다", () => {
    // 간격 6px(반경 3) → 40px(반경 20). 하한이 없으면 6.7배로 튄다.
    const { g, log } = rig();
    g.update(pair(3), "start", 0);
    for (let i = 1; i <= 10; i++) g.update(pair(3 + i * 1.7), "move", i * 16);
    expect(log.lastScale).toBeLessThan(2);
  });
});
