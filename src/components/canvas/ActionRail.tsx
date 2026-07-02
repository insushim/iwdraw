"use client";

import { useState } from "react";
import { useEditor } from "@/store/editor";
import type { SymmetryMode } from "@/engine/types";
import { Icon, type IconName } from "./icons";

const SYMS: { id: SymmetryMode; label: string; icon: IconName }[] = [
  { id: "none", label: "없음", icon: "symNone" },
  { id: "vertical", label: "좌우", icon: "symVertical" },
  { id: "horizontal", label: "상하", icon: "symHorizontal" },
  { id: "quad", label: "4방", icon: "symQuad" },
];

/*
 * 보조 도구 패널(우측): 도형보정 · 대칭 · 전체 지우기.
 * (되돌리기/다시는 캔버스 위 플로팅 버튼, 저장은 헤더로 이동)
 */
export function ActionRail() {
  const clearActive = useEditor((s) => s.clearActive);
  const symmetry = useEditor((s) => s.symmetry);
  const setSymmetry = useEditor((s) => s.setSymmetry);
  const quickShape = useEditor((s) => s.quickShape);
  const toggleQuickShape = useEditor((s) => s.toggleQuickShape);
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="rounded-card bg-paper p-3 shadow-soft">
      <span className="font-display text-base text-ink">마법 도구</span>

      {/* 도형보정 */}
      <button
        onClick={toggleQuickShape}
        aria-pressed={quickShape}
        title="삐뚤게 그려도 반듯한 도형으로 바꿔줘요"
        className={`pressable mt-2 flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold ${
          quickShape ? "bg-sky-soft text-sky-deep ring-2 ring-sky" : "bg-cream text-ink-soft hover:bg-cream-deep"
        }`}
      >
        <Icon name="shapes" className="h-6 w-6" />
        도형 반듯하게
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${
            quickShape ? "bg-sky text-white" : "bg-cream-deep text-ink-faint"
          }`}
        >
          {quickShape ? "켬" : "끔"}
        </span>
      </button>

      {/* 대칭 */}
      <div className="mt-2">
        <span className="text-xs font-semibold text-ink-faint">데칼코마니(대칭)</span>
        <div className="mt-1 grid grid-cols-4 gap-1">
          {SYMS.map((s) => {
            const active = symmetry === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSymmetry(s.id)}
                aria-pressed={active}
                title={`${s.label} 대칭`}
                className={`pressable flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold ${
                  active ? "bg-berry-soft text-berry ring-2 ring-berry" : "bg-cream text-ink-soft hover:bg-cream-deep"
                }`}
              >
                <Icon name={s.icon} className="h-5 w-5" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 전체 지우기 */}
      <div className="mt-3 border-t border-cream-deep pt-2">
        {confirmClear ? (
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                clearActive();
                setConfirmClear(false);
              }}
              className="pressable flex-1 rounded-xl bg-danger py-2 text-sm font-bold text-white"
            >
              정말 지울래요
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="pressable flex-1 rounded-xl bg-cream py-2 text-sm font-semibold text-ink-soft"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            aria-label="전체 지우기"
            className="pressable flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold text-danger hover:bg-danger-soft"
          >
            <Icon name="trash" className="h-5 w-5" />
            전체 지우기
          </button>
        )}
      </div>
    </div>
  );
}
