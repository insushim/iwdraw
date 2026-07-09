/* 학급/협동방 코드 규칙 — 혼동 문자(0,O,1,I,L) 제외 31자 × 6자리 ≈ 8.9억 조합 */
export const CLASS_CODE_LENGTH = 6;
export const CLASS_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const VALID = new RegExp(`^[${CLASS_CODE_ALPHABET}]{${CLASS_CODE_LENGTH}}$`);

/** 입력값을 코드 문자셋으로 정규화(대문자화, 허용 외 문자 제거) */
export function normalizeClassCode(raw: string): string {
  return raw
    .toUpperCase()
    .split("")
    .filter((ch) => CLASS_CODE_ALPHABET.includes(ch))
    .join("")
    .slice(0, CLASS_CODE_LENGTH);
}

export function isValidClassCode(code: string): boolean {
  return VALID.test(code);
}

/** 한글 입력 감지 — 코드 입력칸에서 한글은 조용히 걸러지므로(normalize) 안내가 필요하다 */
export function hasHangul(raw: string): boolean {
  return /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(raw);
}
