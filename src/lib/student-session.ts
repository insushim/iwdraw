"use client";

/*
 * 학생 세션(로그인 없음) — join-class Edge Function이 발급한 커스텀 JWT를 sessionStorage에 보관.
 * 개인정보 없음: 닉네임·학급명·토큰만. 탭을 닫으면 사라진다(sessionStorage).
 */
export interface StudentSession {
  token: string; // 커스텀 JWT (class_id/student_id/room claim)
  studentId: string;
  classId: string;
  className: string;
  nickname: string;
  classCode: string;
  room?: string;
}

const KEY = "arton.student";

export function getStudentSession(): StudentSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as StudentSession;
    if (!s.token || !s.studentId) return null;
    return s;
  } catch {
    return null;
  }
}

export function setStudentSession(s: StudentSession): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(s));
}

export function clearStudentSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}

/* ── 기기별 "이 학급에서 마지막으로 쓴 별명" 기억(localStorage — 탭 닫아도 유지) ──
 * 서버는 같은 (학급, 별명) 재입장을 같은 학생으로 잇지만, 아이가 별명을 까먹고
 * 매번 새로 만들면 학급 학생 수가 계속 늘어난다(2026-07-09 사용자 보고).
 * 학급 코드별로 마지막 별명을 저장해 재입장 기본값으로 쓴다.
 * 웨일북은 공유 기기 — 강제하진 않고 기본값+경고로 유도(다른 아이는 🎲로 변경). */

const NICK_KEY = "arton.lastNick.v1";
const NICK_MAX_CLASSES = 8;

type NickMemory = Record<string, { nickname: string; at: number }>;

function readNickMemory(): NickMemory {
  try {
    const parsed = JSON.parse(localStorage.getItem(NICK_KEY) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** 이 기기에서 해당 학급 코드로 마지막에 쓴 별명(없으면 null) */
export function getRememberedNickname(code: string): string | null {
  if (typeof window === "undefined") return null;
  const n = readNickMemory()[code]?.nickname;
  return typeof n === "string" && n.length > 0 ? n : null;
}

/** 입장 성공 시 호출 — 학급 코드별 최신 별명 저장(오래된 학급은 밀어낸다) */
export function rememberNickname(code: string, nickname: string): void {
  if (typeof window === "undefined") return;
  const mem = readNickMemory();
  delete mem[code]; // 재삽입 = 키 순서를 맨 뒤로(같은 ms 다발 저장의 타이브레이크)
  mem[code] = { nickname, at: Date.now() };
  // 오래된 것부터 오름차순(안정 정렬 — at이 같으면 먼저 삽입된 쪽이 앞) → 앞에서 밀어낸다
  const codes = Object.keys(mem).sort((a, b) => mem[a].at - mem[b].at);
  for (const c of codes.slice(0, Math.max(0, codes.length - NICK_MAX_CLASSES))) delete mem[c];
  try {
    localStorage.setItem(NICK_KEY, JSON.stringify(mem));
  } catch {
    // 저장 불가(프라이빗 모드 등) — 기억만 포기, 입장은 정상
  }
}
