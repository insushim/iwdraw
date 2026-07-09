import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getRememberedNickname, rememberNickname } from "@/lib/student-session";

/* 기기별 학급 별명 기억(localStorage) — 재입장 시 같은 학생으로 이어지게 하는 핵심.
 * 테스트 환경엔 localStorage가 없어 Map 기반 목으로 대체. */

const KEY = "arton.lastNick.v1";
const mem = new Map<string, string>();

describe("별명 기억(rememberNickname)", () => {
  beforeAll(() => {
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    });
    // student-session은 window 가드가 있어 window도 필요
    if (typeof window === "undefined") vi.stubGlobal("window", {});
  });
  afterAll(() => vi.unstubAllGlobals());
  beforeEach(() => mem.clear());

  it("저장한 학급 코드로 그대로 꺼내진다", () => {
    rememberNickname("ABC123", "보라코알라6");
    expect(getRememberedNickname("ABC123")).toBe("보라코알라6");
    expect(getRememberedNickname("ZZZ999")).toBeNull();
  });

  it("같은 학급에 다시 저장하면 최신 별명으로 덮인다", () => {
    rememberNickname("ABC123", "옛별명");
    rememberNickname("ABC123", "새별명");
    expect(getRememberedNickname("ABC123")).toBe("새별명");
  });

  it("학급 8개 상한 — 가장 오래된 학급부터 밀려난다", () => {
    for (let i = 0; i < 9; i++) rememberNickname(`CODE0${i}`, `별명${i}`);
    expect(getRememberedNickname("CODE00")).toBeNull(); // 첫 학급 밀림
    expect(getRememberedNickname("CODE08")).toBe("별명8");
    expect(Object.keys(JSON.parse(mem.get(KEY)!))).toHaveLength(8);
  });

  it("저장소가 손상돼도 조용히 빈 상태로 동작", () => {
    mem.set(KEY, "{broken json");
    expect(getRememberedNickname("ABC123")).toBeNull();
    rememberNickname("ABC123", "복구별명"); // 손상 위에 정상 저장
    expect(getRememberedNickname("ABC123")).toBe("복구별명");
  });
});
