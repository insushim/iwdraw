"use client";

import { getStudentSession, setStudentSession } from "./student-session";
import { apiFetch } from "./api";

/*
 * 학생 토큰 자동 갱신(2026-07-13 사용자 실측: "작업하다 갑자기 학급 코드 연결이
 * 끊겼습니다 — 다시 접속해 달라고 뜨고 그리던 게 사라졌다").
 *
 * 학생 JWT는 6시간짜리인데 갱신 경로가 없어, 만료 순간부터 모든 요청이 401이 되고
 * 아이는 저장조차 못 한 채 재입장 화면으로 밀려났다. 학생 세션에는 학급 코드와
 * 별명이 남아 있으므로(서버는 같은 (학급, 별명)을 같은 학생으로 잇는다) 조용히
 * 재입장해 새 토큰을 받아오면 아이 입장에서는 끊김 자체가 없다.
 *
 * 동시에 여러 요청이 401을 받아도 재입장은 1회만(inflight 공유).
 */

let inflight: Promise<boolean> | null = null;

/** 저장된 학급 코드·별명으로 조용히 재입장해 토큰을 갱신. 성공 시 true */
export async function refreshStudentToken(): Promise<boolean> {
  if (inflight) return inflight;
  const s = getStudentSession();
  if (!s?.classCode || !s.nickname) return false;
  inflight = (async () => {
    try {
      const res = await apiFetch("/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: s.classCode, nickname: s.nickname }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as {
        token?: string;
        studentId?: string;
        classId?: string;
        className?: string;
        nickname?: string;
      };
      if (!data.token || !data.studentId) return false;
      setStudentSession({
        ...s,
        token: data.token,
        studentId: data.studentId,
        classId: data.classId ?? s.classId,
        className: data.className ?? s.className,
        nickname: data.nickname ?? s.nickname,
      });
      return true;
    } catch {
      return false;
    } finally {
      // 다음 만료 때 다시 시도할 수 있게 해제(성공/실패 무관)
      setTimeout(() => {
        inflight = null;
      }, 0);
    }
  })();
  return inflight;
}

/**
 * 학생 인증이 필요한 요청 — 401이면 토큰을 갱신해 1회 재시도한다.
 * run(headers)는 매번 최신 Authorization 헤더를 받아 요청을 수행한다.
 */
export async function withStudentAuth(
  run: (headers: Record<string, string>) => Promise<Response>,
): Promise<Response | null> {
  const s = getStudentSession();
  if (!s) return null;
  let res = await run({ Authorization: `Bearer ${s.token}` });
  if (res.status !== 401) return res;
  if (!(await refreshStudentToken())) return res; // 갱신 실패 → 원래 401 그대로
  const s2 = getStudentSession();
  if (!s2) return res;
  res = await run({ Authorization: `Bearer ${s2.token}` });
  return res;
}
