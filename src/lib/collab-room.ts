import { CLASS_CODE_ALPHABET } from "./class-code";

/*
 * 모둠(협동) 방 코드 — 아이가 친구에게 불러줄 짧은 코드.
 * 실제 서버 방 이름(Durable Object 이름)은 학급 코드로 접두어를 붙여 반별로 격리한다:
 * 다른 반이 우연히 같은 4자리를 써도 방이 섞이지 않는다. 아이에게는 짧은 코드만 보여준다.
 *
 * 예) 학급 ABCD23 · 방 K7MN  →  서버 방 이름 "ABCD23~K7MN"
 *     학급 없는 게스트        →  서버 방 이름 "g~K7MN"
 */
export const ROOM_CODE_LEN = 4;
const SEP = "~";
const GUEST_PREFIX = "g";

/** 헷갈리는 글자(0/O·1/I 등)를 뺀 학급코드 알파벳을 그대로 재사용 */
export function randomRoomCode(): string {
  const n = CLASS_CODE_ALPHABET.length;
  let out = "";
  // 브라우저 런타임 — crypto 우선, 없으면 Math.random 폴백
  const buf =
    typeof crypto !== "undefined" && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint32Array(ROOM_CODE_LEN))
      : null;
  for (let i = 0; i < ROOM_CODE_LEN; i++) {
    const r = buf ? buf[i] % n : Math.floor(Math.random() * n);
    out += CLASS_CODE_ALPHABET[r];
  }
  return out;
}

/** 사용자가 친구에게 부르는 짧은 코드 → 정규화(대문자·유효 글자만·길이 컷) */
export function normalizeRoomCode(raw: string): string {
  return raw
    .toUpperCase()
    .split("")
    .filter((ch) => CLASS_CODE_ALPHABET.includes(ch))
    .join("")
    .slice(0, ROOM_CODE_LEN);
}

export function isValidRoomCode(code: string): boolean {
  return normalizeRoomCode(code).length === ROOM_CODE_LEN;
}

/** 짧은 코드 + (있으면)학급코드 → 서버 방 이름 */
export function roomNameFor(classCode: string | undefined, shortCode: string): string {
  const prefix = classCode ? classCode.toUpperCase() : GUEST_PREFIX;
  return `${prefix}${SEP}${normalizeRoomCode(shortCode)}`;
}

/** 서버 방 이름 → 아이에게 보여줄 짧은 코드(접두어 제거) */
export function shortCodeFromRoom(room: string): string {
  const i = room.indexOf(SEP);
  return i >= 0 ? room.slice(i + 1) : room;
}

/*
 * 학급 "다 같이 그리기" 방 — 학급 코드에서 결정론적으로 정한 고정 방(저장 불필요).
 * 교사(대시보드 버튼)와 그 반 학생(우리 반 다 같이)이 아무 코드도 입력하지 않고 같은 방에 모인다.
 * 짧은 코드 = 학급 코드 앞 ROOM_CODE_LEN글자(그 반만의 값이라 다른 반과 안 겹친다).
 */
export function classRoomCode(classCode: string): string {
  return normalizeRoomCode(classCode.slice(0, ROOM_CODE_LEN));
}
export function classRoomName(classCode: string): string {
  return roomNameFor(classCode, classRoomCode(classCode));
}
