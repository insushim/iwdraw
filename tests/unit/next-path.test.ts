import { describe, it, expect } from "vitest";
import { safeNextPath } from "@/lib/next-path";

describe("safeNextPath", () => {
  it("같은 출처의 경로는 그대로 통과한다", () => {
    expect(safeNextPath("/draw")).toBe("/draw");
    expect(safeNextPath("/draw?mode=color&v=3")).toBe("/draw?mode=color&v=3");
    expect(safeNextPath("/coloring#hero")).toBe("/coloring#hero");
  });

  it("없거나 빈 값이면 기본 경로", () => {
    expect(safeNextPath(null)).toBe("/draw");
    expect(safeNextPath("")).toBe("/draw");
    expect(safeNextPath(undefined, "/")).toBe("/");
  });

  it("외부로 나가는 모양은 전부 거절한다", () => {
    // 백슬래시는 브라우저가 `/` 로 정규화 → `//evil.example` = 프로토콜 상대 URL
    expect(safeNextPath("/\\evil.example")).toBe("/draw");
    expect(safeNextPath("//evil.example")).toBe("/draw");
    expect(safeNextPath("https://evil.example/draw")).toBe("/draw");
    expect(safeNextPath("javascript:alert(1)")).toBe("/draw");
    expect(safeNextPath("draw")).toBe("/draw"); // 상대 경로
    expect(safeNextPath("/draw\nHost: evil")).toBe("/draw"); // 제어문자
  });
});
