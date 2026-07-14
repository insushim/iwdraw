"use client";

import { useEditor } from "@/store/editor";

/*
 * 떠 있는 스탬프 배치 바 — 캔버스 상단 중앙 플로팅(제안 바 자리).
 * 스탬프가 "아직 안 굳은" 상태일 때 표시: 캔버스에서 끌어 옮기고 모서리로 크기를 바꾼 뒤
 * ✓ 확인으로 굳히거나 ✕ 취소한다. (취소하면 원래 그림이 그대로 남는다)
 */
export function PendingStampBar() {
  const pending = useEditor((s) => s.pending);
  const commit = useEditor((s) => s.commitPending);
  const cancel = useEditor((s) => s.cancelPending);

  if (!pending) return null;

  return (
    <div
      className="absolute left-1/2 top-3 z-20 flex max-w-[94%] -translate-x-1/2 items-center gap-2 rounded-full bg-paper px-3 py-1.5 shadow-lift"
      role="dialog"
      aria-label="놓기"
    >
      <span className="whitespace-nowrap text-sm font-semibold text-ink-soft">
        ✋ 끌어서 옮기고, 모서리로 크기 조절
      </span>
      <button
        onClick={cancel}
        aria-label="놓기 취소"
        title="아니에요, 내 그림 그대로 둘래요"
        className="pressable touch-target grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream text-ink-soft hover:bg-cream-deep"
      >
        ✕
      </button>
      <button
        onClick={commit}
        aria-label="놓기 확인"
        title="여기에 놓기"
        className="pressable touch-target flex h-10 shrink-0 items-center gap-1 rounded-full bg-leaf px-4 font-display text-sm font-bold text-white"
      >
        ✓ 여기 놓기
      </button>
    </div>
  );
}
