"use client";

import { useEditor } from "@/store/editor";
import type { Mode } from "@/engine/types";

const MODES: { id: Mode; label: string; emoji: string; tone: string }[] = [
  { id: "sketch", label: "스케치", emoji: "✏️", tone: "bg-sun-soft" },
  { id: "watercolor", label: "수채화", emoji: "💧", tone: "bg-sky-soft" },
  { id: "oil", label: "유화", emoji: "🎨", tone: "bg-coral-soft" },
  { id: "coloring", label: "색칠하기", emoji: "🖍️", tone: "bg-leaf-soft" },
];

const COLORING_STEPS = ["① 도안 고르기", "② 색칠하기", "③ 배경 꾸미기"];

export function ModeTabs() {
  const mode = useEditor((s) => s.mode);
  const setMode = useEditor((s) => s.setMode);

  return (
    <div className="flex flex-col gap-2">
      <div role="tablist" aria-label="그리기 모드" className="flex gap-1.5 rounded-card bg-paper p-1.5 shadow-soft">
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              role="tab"
              aria-selected={active}
              onClick={() => setMode(m.id)}
              className={`pressable touch-target flex items-center gap-1.5 rounded-[14px] px-3 py-2 font-display text-base transition-colors ${
                active ? `${m.tone} text-ink shadow-soft` : "text-ink-soft hover:bg-cream"
              }`}
            >
              <span className="text-xl">{m.emoji}</span>
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          );
        })}
      </div>
      {mode === "coloring" && (
        <div className="flex items-center gap-2 self-start rounded-full bg-leaf-soft px-3 py-1 text-sm font-semibold text-leaf-deep">
          {COLORING_STEPS.map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              {i > 0 && <span className="text-leaf">›</span>}
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
