"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Editor } from "@/components/canvas/Editor";
import { getStudentSession } from "@/lib/student-session";
import { submitArtwork } from "@/lib/artwork-client";
import type { Mode } from "@/engine/types";

const MODES: Mode[] = ["sketch", "watercolor", "oil", "coloring"];

/*
 * /draw — 메인 캔버스.
 *  ?template=<path> 색칠 도안, ?mode=<mode>, ?room=<code> 협동(협동은 Phase6 CollabEditor로 위임)
 * 학생 세션이 있으면 저장 시 작품 제출, 없으면(교사 미리보기) 로컬 다운로드.
 */
export function DrawClient() {
  const params = useSearchParams();
  const templateParam = params.get("template") ?? undefined;
  // 사진→도안 변환본은 sessionStorage에 저장됨(게스트, 백엔드 불필요)
  const template =
    templateParam === "custom" && typeof window !== "undefined"
      ? sessionStorage.getItem("arton.customLineart") ?? undefined
      : templateParam;
  const modeParam = params.get("mode");
  const initialMode = MODES.includes(modeParam as Mode) ? (modeParam as Mode) : undefined;
  const room = params.get("room") ?? undefined;
  const session = getStudentSession();

  const handleSave = useCallback(
    async (png: Blob, thumb: Blob) => {
      if (!session) {
        // 학생 세션 없음 → 로컬 다운로드로 폴백
        const url = URL.createObjectURL(png);
        const a = document.createElement("a");
        a.href = url;
        a.download = `arton-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      await submitArtwork({
        png,
        thumb,
        mode: (params.get("mode") as string) ?? "sketch",
      });
    },
    [session, params],
  );

  return (
    <Editor
      lineartSrc={template}
      initialMode={initialMode}
      room={room}
      onSave={session ? handleSave : undefined}
      who={session ? `${session.nickname} · ${session.className}` : undefined}
      backHref={template ? "/coloring" : "/"}
    />
  );
}
