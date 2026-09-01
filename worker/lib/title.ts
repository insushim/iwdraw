/** 학생이 붙인 그림 제목 정규화 — 서버측 단일 관문(클라 입력을 그대로 믿지 않는다).
 *  · 제어문자·줄바꿈 → 공백으로 접는다(갤러리 카드가 세로로 터지지 않게)
 *  · **폭 0 문자·방향 제어문자 제거** — 눈에는 빈 제목인데 null 로 정규화되지 않아
 *    "제목 있음"으로 취급되던 구멍(2026-09-01 교차검증 지적)
 *  · 30자 컷은 **코드포인트 단위** — UTF-16 인덱스로 자르면 29자 뒤 이모지가 서로게이트
 *    중간에서 잘려 깨진 글자(�)가 남는다(같은 지적)
 * 표시는 전부 React 텍스트 노드라 이스케이프는 프레임워크가 하고, 여기선 길이·문자만 본다. */
export const TITLE_MAX = 30;

export function sanitizeTitle(raw: string): string | null {
  const cleaned = raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[\u200b-\u200f\u2028\u2029\u202a-\u202e\u2060\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const t = Array.from(cleaned).slice(0, TITLE_MAX).join("").trim();
  return t.length > 0 ? t : null;
}
