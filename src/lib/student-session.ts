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
