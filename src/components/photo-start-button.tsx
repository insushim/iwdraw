"use client";

import { PhotoImport } from "@/components/photo-import";

/*
 * "내 사진·그림으로 그리기" 시작 버튼 — 서버 컴포넌트(랜딩)에서 쓰기 위한 클라이언트 껍데기.
 * 실제 동작(파일 선택 → 선따기/밑그림/이어 그리기 고르기 → /draw 이동)은 PhotoImport가 한다.
 */
export function PhotoStartButton({ className }: { className?: string }) {
  return (
    <PhotoImport
      renderButton={(openPicker, converting) => (
        <button
          onClick={openPicker}
          disabled={converting}
          className={
            className ??
            "pressable touch-target inline-flex items-center gap-2 rounded-card bg-sky px-7 py-4 font-display text-lg text-white shadow-soft disabled:opacity-60"
          }
        >
          📷 {converting ? "변환 중…" : "내 사진으로"}
        </button>
      )}
    />
  );
}
