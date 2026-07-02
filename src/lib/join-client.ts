"use client";

import { setStudentSession, type StudentSession } from "./student-session";
import { hasBackend } from "./backend";
import { apiFetch } from "./api";

/*
 * /api/join 호출 — 코드 검증 + 학생 생성 + 커스텀 JWT 발급.
 * 서버(Worker)가 rate limit·브루트포스 방어를 담당(DESIGN-REVIEW A2).
 */
export interface JoinResult {
  ok: boolean;
  error?: string;
  session?: StudentSession;
}

export async function joinClass(code: string, nickname: string): Promise<JoinResult> {
  if (!hasBackend()) {
    return { ok: false, error: "offline" };
  }
  try {
    const res = await apiFetch("/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, nickname }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const map: Record<string, string> = {
        invalid_code: "학급 코드를 다시 확인해 주세요",
        inactive: "지금은 입장할 수 없는 학급이에요",
        rate_limited: "잠시 후 다시 시도해 주세요",
        bad_nickname: "다른 닉네임을 써 주세요",
        full: "학급 정원이 가득 찼어요",
      };
      return { ok: false, error: map[data.error as string] ?? "입장에 실패했어요" };
    }
    const session: StudentSession = {
      token: data.token,
      studentId: data.studentId,
      classId: data.classId,
      className: data.className,
      nickname: data.nickname,
      classCode: code,
    };
    setStudentSession(session);
    return { ok: true, session };
  } catch {
    return { ok: false, error: "네트워크 오류예요" };
  }
}
