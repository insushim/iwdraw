"use client";

import { getStudentSession } from "./student-session";
import { hasBackend } from "./backend";
import { apiFetch } from "./api";
import { withStudentAuth } from "./student-auth";

/*
 * 작품 제출 — /api/artwork(Worker) 경유(DESIGN-REVIEW A1).
 * 클라이언트는 class_id/student_id를 보내지 않는다. 서버가 JWT claim에서 읽어 삽입한다.
 */
export interface SubmitArtworkInput {
  png: Blob;
  thumb: Blob;
  mode: string;
  timelapse?: Blob;
}

export async function submitArtwork(input: SubmitArtworkInput): Promise<{ id: string } | null> {
  const session = getStudentSession();
  if (!session) throw new Error("학생 세션이 없습니다");
  if (!hasBackend()) {
    // 게스트/오프라인 모드: 제출 대신 로컬 저장 신호
    return null;
  }

  const form = new FormData();
  form.append("mode", input.mode);
  form.append("image", input.png, "artwork.png");
  form.append("thumb", input.thumb, "thumb.webp");
  if (input.timelapse) form.append("timelapse", input.timelapse, "timelapse.webm");

  // 401(6시간 토큰 만료)이면 조용히 재입장 후 1회 재시도 — 저장 순간 세션이 끊겨
  // 그림을 못 내던 사고 방지(2026-07-13 사용자 실측). FormData는 재사용 가능.
  const res = await withStudentAuth((h) => apiFetch("/artwork", { method: "POST", headers: h, body: form }));
  if (!res) throw new Error("학생 세션이 없습니다");
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`작품 제출 실패 (${res.status}): ${msg}`);
  }
  return (await res.json()) as { id: string };
}
