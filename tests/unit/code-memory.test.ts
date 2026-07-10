import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getRememberedClassCode, rememberClassCode } from "@/lib/student-session";

/* 기기별 마지막 학급 코드 기억(localStorage) — 재입장 시 입장 화면 코드 입력란을
 * 자동으로 채워 매번 6자리를 다시 치지 않게 한다(웨일북 공유 기기).
 * 테스트 환경엔 localStorage가 없어 Map 기반 목으로 대체. */

const KEY = "arton.lastCode.v1";
const mem = new Map<string, string>();

describe("학급 코드 기억(rememberClassCode)", () => {
  beforeAll(() => {
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    });
    if (typeof window === "undefined") vi.stubGlobal("window", {});
  });
  afterAll(() => vi.unstubAllGlobals());
  beforeEach(() => mem.clear());

  it("저장한 코드를 그대로 꺼낸다", () => {
    expect(getRememberedClassCode()).toBeNull();
    rememberClassCode("ABC123");
    expect(getRememberedClassCode()).toBe("ABC123");
    expect(mem.get(KEY)).toBe("ABC123");
  });

  it("다시 저장하면 최신 코드로 덮인다", () => {
    rememberClassCode("ABC123");
    rememberClassCode("XYZ789");
    expect(getRememberedClassCode()).toBe("XYZ789");
  });

  it("빈 값이 저장돼 있으면 null로 취급한다", () => {
    mem.set(KEY, "");
    expect(getRememberedClassCode()).toBeNull();
  });
});
