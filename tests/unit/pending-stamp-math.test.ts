import { describe, expect, it } from "vitest";
import {
  hitPending,
  movePending,
  resizePending,
  commitRegion,
} from "@/engine/tools/pendingStampMath";

/* 떠 있는 스탬프 변형 기하 — 이동/크기조절 히트테스트·좌표 계산(순수 함수). */

const box = { cx: 200, cy: 200, size: 100 }; // 모서리 = (150,150)~(250,250)

describe("hitPending — 히트 영역 판정", () => {
  it("모서리 근처는 resize", () => {
    expect(hitPending(150, 150, box, 1, 24)).toBe("resize");
    expect(hitPending(250, 250, box, 1, 24)).toBe("resize");
    expect(hitPending(160, 158, box, 1, 24)).toBe("resize"); // 히트 반경 24 안
  });
  it("몸통 안쪽(모서리에서 먼 곳)은 move", () => {
    expect(hitPending(200, 200, box, 1, 24)).toBe("move"); // 중심
    expect(hitPending(210, 195, box, 1, 24)).toBe("move");
  });
  it("바깥은 null", () => {
    expect(hitPending(400, 400, box, 1, 24)).toBeNull();
    expect(hitPending(120, 120, box, 1, 24)).toBeNull();
  });
  it("줌 배율이 크면 히트 반경(캔버스 좌표)이 줄어든다", () => {
    // 화면 24px는 scale=4에선 캔버스 6px — (156,156)은 모서리(150,150)에서 8.5px라 밖
    expect(hitPending(156, 156, box, 4, 24)).not.toBe("resize");
    expect(hitPending(156, 156, box, 1, 24)).toBe("resize"); // scale=1이면 반경 24라 안
  });
});

describe("movePending — 이동", () => {
  it("드래그 이동량만큼 중심이 옮겨진다", () => {
    expect(movePending(200, 200, 100, 100, 130, 90, 1000, 1000)).toEqual({ cx: 230, cy: 190 });
  });
  it("캔버스 밖으로는 클램프", () => {
    expect(movePending(50, 50, 100, 100, 40, 40, 1000, 1000)).toEqual({ cx: 0, cy: 0 });
    expect(movePending(990, 990, 100, 100, 200, 200, 1000, 1000)).toEqual({ cx: 1000, cy: 1000 });
  });
});

describe("resizePending — 중심 고정 크기조절", () => {
  it("포인터~중심 체비쇼프 거리의 2배가 한 변", () => {
    expect(resizePending(200, 200, 260, 230, 40, 800)).toBe(120); // max(60,30)*2
    expect(resizePending(200, 200, 220, 290, 40, 800)).toBe(180); // max(20,90)*2
  });
  it("최소/최대 클램프", () => {
    expect(resizePending(200, 200, 205, 205, 40, 800)).toBe(40); // 10*2=20 < 40
    expect(resizePending(200, 200, 900, 900, 40, 800)).toBe(800); // 상한
  });
});

describe("commitRegion — 커밋 tile 영역", () => {
  it("스탬프만 있으면 스탬프 bbox + 여유", () => {
    const r = commitRegion(200, 200, 100, null, 1000, 1000, 12);
    // half = 50+12 = 62 → 138..262
    expect(r).toEqual({ x: 138, y: 138, w: 124, h: 124 });
  });
  it("원래 스케치 bbox와 합집합(멀리 옮겨도 원본을 지우도록)", () => {
    const origin = { minX: 10, minY: 10, maxX: 60, maxY: 60 };
    const r = commitRegion(500, 500, 100, origin, 1000, 1000, 12);
    expect(r.x).toBe(10); // 원본 왼위 포함
    expect(r.y).toBe(10);
    expect(r.x + r.w).toBeGreaterThanOrEqual(562); // 스탬프 오른아래(500+62)까지
  });
  it("캔버스 경계로 클램프(음수 시작·초과 폭 없음)", () => {
    const r = commitRegion(10, 10, 100, null, 1000, 1000, 12);
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
    expect(r.w).toBeGreaterThan(0);
  });
});
