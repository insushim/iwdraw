"use client";

import { useEditor } from "@/store/editor";
import { BRUSH_META } from "@/engine/brushes";
import type { BrushId } from "@/engine/types";

/* 좌측 세로 도구 막대 — 실물 이모지 아이콘 + 한글 레이블 병기. 저학년 모드는 6종. */
export function BrushBar() {
  const brush = useEditor((s) => s.brush);
  const setBrush = useEditor((s) => s.setBrush);
  const junior = useEditor((s) => s.juniorMode);
  const mode = useEditor((s) => s.mode);

  const tools: { id: BrushId; label: string; emoji: string }[] = [
    ...BRUSH_META.filter((b) => (junior ? b.junior : true)).map((b) => ({
      id: b.id,
      label: b.label,
      emoji: b.emoji,
    })),
    { id: "fill", label: "페인트통", emoji: "🪣" },
  ];

  return (
    <div
      className={`flex gap-2 rounded-card bg-paper p-2 shadow-soft ${junior ? "text-lg" : ""}`}
      role="toolbar"
      aria-label="그리기 도구"
    >
      {tools.map((t) => {
        const active = brush === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setBrush(t.id)}
            aria-pressed={active}
            aria-label={t.label}
            title={t.label}
            className={`pressable touch-target flex flex-col items-center justify-center gap-0.5 rounded-[14px] px-2 ${
              junior ? "min-w-16" : "min-w-14"
            } ${active ? "bg-coral-soft ring-2 ring-coral" : "hover:bg-cream"}`}
          >
            <span className={junior ? "text-3xl" : "text-2xl"}>{t.emoji}</span>
            <span className="text-[11px] font-semibold text-ink-soft">{t.label}</span>
          </button>
        );
      })}
      {mode === "coloring" && (
        <span className="ml-1 hidden max-w-40 items-center text-xs text-ink-faint md:flex">
          색칠 모드에서 페인트통은 선 밖으로 안 나가요
        </span>
      )}
    </div>
  );
}
