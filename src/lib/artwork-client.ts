"use client";

import { getStudentSession } from "./student-session";

/*
 * 작품 제출 — submit-artwork Edge Function 경유(DESIGN-REVIEW A1).
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
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) {
    // 무료/오프라인 모드: 제출 대신 로컬 저장 신호
    return null;
  }

  const form = new FormData();
  form.append("mode", input.mode);
  form.append("image", input.png, "artwork.png");
  form.append("thumb", input.thumb, "thumb.webp");
  if (input.timelapse) form.append("timelapse", input.timelapse, "timelapse.webm");

  const res = await fetch(`${base}/functions/v1/submit-artwork`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.token}` },
    body: form,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`작품 제출 실패 (${res.status}): ${msg}`);
  }
  return (await res.json()) as { id: string };
}
