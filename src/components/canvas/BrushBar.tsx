"use client";

import { useEditor } from "@/store/editor";
import { BRUSH_META } from "@/engine/brushes";
import type { BrushId } from "@/engine/types";
import { ToolIcon, type IconName } from "./icons";

/* 도구 → 아이콘 명시 매핑: BrushId와 IconName 유니언이 별개라 캐스트 대신 컴파일 안전하게 */
const BRUSH_ICON: Partial<Record<BrushId, IconName>> = {
  pencil: "pencil",
  crayon: "crayon",
  marker: "marker",
  watercolor: "watercolor",
  oil: "oil",
  airbrush: "airbrush",
  oilpastel: "oilpastel",
  glow: "glow",
  rainbow: "rainbow",
  smudge: "smudge",
  eraser: "eraser",
  fill: "fill",
  eyedropper: "picker",
};

/*
 * 도구 레일 — 데스크톱은 좌측 세로 1열, 모바일은 하단 가로 스크롤.
 * (세로 1열이어야 캔버스가 화면을 최대한 차지한다)
 */
export function BrushBar() {
  const brush = useEditor((s) => s.brush);
  const setBrush = useEditor((s) => s.setBrush);
  const junior = useEditor((s) => s.juniorMode);

  const tools: { id: BrushId; label: string }[] = [
    ...BRUSH_META.filter((b) => (junior ? b.junior : true)).map((b) => ({
      id: b.id,
      label: b.label,
    })),
    { id: "fill", label: "페인트통" },
    { id: "eyedropper", label: "스포이트" },
  ];

  return (
    <div
      className="flex shrink-0 gap-1 overflow-x-auto rounded-card bg-paper p-1.5 shadow-soft md:w-[76px] md:flex-col md:overflow-y-auto md:overflow-x-hidden"
      role="toolbar"
      aria-label="그리기 도구"
      aria-orientation="vertical"
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
            className={`pressable flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 max-md:min-w-[60px] ${
              active
                ? "bg-coral-soft shadow-soft ring-2 ring-coral"
                : "hover:bg-cream"
            }`}
          >
            <ToolIcon name={BRUSH_ICON[t.id] ?? "pencil"} className={junior ? "h-9 w-9" : "h-8 w-8"} />
            <span
              className={`text-[10px] font-semibold leading-tight ${
                active ? "text-coral-deep" : "text-ink-soft"
              }`}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
