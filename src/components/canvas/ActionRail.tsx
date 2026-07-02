"use client";

import { useState } from "react";
import { useEditor } from "@/store/editor";
import type { SymmetryMode } from "@/engine/types";

const SYMS: { id: SymmetryMode; label: string; icon: string }[] = [
  { id: "none", label: "대칭 없음", icon: "⬛" },
  { id: "vertical", label: "좌우 대칭", icon: "◐" },
  { id: "horizontal", label: "상하 대칭", icon: "◒" },
  { id: "quad", label: "4방 대칭", icon: "✤" },
];

export function ActionRail({ onExport }: { onExport?: () => void }) {
  const canUndo = useEditor((s) => s.canUndo);
  const canRedo = useEditor((s) => s.canRedo);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const clearActive = useEditor((s) => s.clearActive);
  const symmetry = useEditor((s) => s.symmetry);
  const setSymmetry = useEditor((s) => s.setSymmetry);
  const quickShape = useEditor((s) => s.quickShape);
  const toggleQuickShape = useEditor((s) => s.toggleQuickShape);
  const [confirmClear, setConfirmClear] = useState(false);

  const btn =
    "pressable touch-target flex flex-col items-center justify-center gap-0.5 rounded-[14px] px-2 py-1.5 text-[11px] font-semibold";

  return (
    <div className="flex flex-col gap-1.5 rounded-card bg-paper p-2 shadow-soft">
      <button onClick={undo} disabled={!canUndo} className={`${btn} disabled:opacity-30 hover:bg-cream`} aria-label="되돌리기">
        <span className="text-xl">↩️</span>되돌리기
      </button>
      <button onClick={redo} disabled={!canRedo} className={`${btn} disabled:opacity-30 hover:bg-cream`} aria-label="다시 실행">
        <span className="text-xl">↪️</span>다시
      </button>

      <div className="my-1 h-px bg-cream-deep" />

      <button
        onClick={toggleQuickShape}
        aria-pressed={quickShape}
        className={`${btn} ${quickShape ? "bg-sky-soft text-sky-deep" : "hover:bg-cream"}`}
        title="스트로크를 도형으로 자동 보정"
      >
        <span className="text-xl">⭐</span>도형보정
      </button>

      <details className="rounded-[14px]">
        <summary className={`${btn} cursor-pointer list-none hover:bg-cream`}>
          <span className="text-xl">{SYMS.find((x) => x.id === symmetry)?.icon}</span>대칭
        </summary>
        <div className="mt-1 flex flex-col gap-1">
          {SYMS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSymmetry(s.id)}
              aria-pressed={symmetry === s.id}
              className={`rounded-lg px-2 py-1 text-xs ${
                symmetry === s.id ? "bg-sky text-white" : "hover:bg-cream"
              }`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </details>

      <div className="my-1 h-px bg-cream-deep" />

      {onExport && (
        <button onClick={onExport} className={`${btn} hover:bg-cream`} aria-label="저장하기">
          <span className="text-xl">💾</span>저장
        </button>
      )}

      {confirmClear ? (
        <div className="flex flex-col gap-1">
          <button
            onClick={() => {
              clearActive();
              setConfirmClear(false);
            }}
            className={`${btn} bg-danger text-white`}
          >
            정말 지울까요?
          </button>
          <button onClick={() => setConfirmClear(false)} className={`${btn} hover:bg-cream`}>
            취소
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmClear(true)}
          className={`${btn} text-danger hover:bg-danger-soft`}
          aria-label="전체 지우기"
        >
          <span className="text-xl">🧹</span>전체지우기
        </button>
      )}
    </div>
  );
}
