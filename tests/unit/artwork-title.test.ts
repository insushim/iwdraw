import { describe, it, expect } from "vitest";
import { sanitizeTitle } from "../../worker/lib/title";

/*
 * 작품 제목은 아이가 직접 쓰는 자유 문자열이라 서버가 단일 관문에서 정규화한다.
 * (표시는 전부 React 텍스트 노드라 이스케이프는 프레임워크가 하고, 여기선 길이·문자만 본다.)
 */
describe("sanitizeTitle", () => {
  it("앞뒤 공백을 떼고 그대로 돌려준다", () => {
    expect(sanitizeTitle("  우리 강아지  ")).toBe("우리 강아지");
  });

  it("빈 제목·공백만은 null(제목 없음)", () => {
    expect(sanitizeTitle("")).toBeNull();
    expect(sanitizeTitle("   ")).toBeNull();
    expect(sanitizeTitle("\n\t")).toBeNull();
  });

  it("줄바꿈·제어문자는 공백으로 접는다(갤러리 카드가 깨지지 않게)", () => {
    expect(sanitizeTitle("봄\n\n소풍")).toBe("봄 소풍");
  });

  it("30자에서 자른다", () => {
    const long = "가".repeat(50);
    expect(sanitizeTitle(long)).toHaveLength(30);
  });

  it("이모지·특수문자는 그대로 둔다(아이 표현을 뺏지 않는다)", () => {
    expect(sanitizeTitle("🐶 강아지 <3 & 나")).toBe("🐶 강아지 <3 & 나");
  });

  it("눈에 안 보이는 폭 0 문자만 있으면 제목 없음", () => {
    expect(sanitizeTitle("\u200b\u200b")).toBeNull();
    expect(sanitizeTitle("\ufeff 봄 \u200b")).toBe("봄");
  });

  it("30자 컷이 이모지를 반으로 쪼개지 않는다", () => {
    const t = sanitizeTitle("가".repeat(29) + "🐶")!;
    expect(Array.from(t)).toHaveLength(30);
    expect(t.endsWith("🐶"), "서로게이트가 잘려 �가 남으면 안 된다").toBe(true);
  });
});
