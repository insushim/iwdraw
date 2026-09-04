/*
 * 입장 후 되돌아갈 경로(`?next=`)를 검증한다 — 오픈 리다이렉트 차단.
 *
 * `startsWith("/")` 만으로는 뚫린다: `/\evil.example` 는 슬래시로 시작하지만 브라우저가
 * `\` 를 `/` 로 정규화해 `//evil.example` = 프로토콜 상대 URL 이 되어 외부로 나간다
 * (2026-09-02 교차검증 codex+Gemini). 그래서 문자 검사와 URL 파싱을 둘 다 통과해야 한다.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/draw"): string {
  if (!next) return fallback;
  // 같은 출처의 절대 경로만 — `//`(프로토콜 상대)·`\`(정규화 우회)·제어문자 전부 거절
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.includes("\\")) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(next)) return fallback;
  try {
    const origin = typeof location !== "undefined" ? location.origin : "https://arton.invalid";
    const u = new URL(next, origin);
    if (u.origin !== origin) return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
