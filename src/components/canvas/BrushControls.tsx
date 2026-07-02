"use client";

import { useEditor } from "@/store/editor";
import { rgbToCss } from "@/engine/types";
import { BRUSH_SIZE_SCALE } from "@/engine/brushes";

/* 브러시 크기(큰 슬라이더+실시간 미리보기 원) + 모드별 물양/보정 슬라이더 */
export function BrushControls() {
  const size = useEditor((s) => s.size);
  const setSize = useEditor((s) => s.setSize);
  const opacity = useEditor((s) => s.opacity);
  const setOpacity = useEditor((s) => s.setOpacity);
  const water = useEditor((s) => s.water);
  const setWater = useEditor((s) => s.setWater);
  const stabilize = useEditor((s) => s.stabilize);
  const setStabilize = useEditor((s) => s.setStabilize);
  const color = useEditor((s) => s.color);
  const mode = useEditor((s) => s.mode);
  const brush = useEditor((s) => s.brush);

  const preview = Math.max(4, Math.min(60, size * (BRUSH_SIZE_SCALE[brush] ?? 1)));

  return (
    <div className="rounded-card bg-paper p-3 shadow-soft">
      <div className="flex items-center gap-3">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-cream"
          aria-hidden="true"
        >
          <span
            className="rounded-full"
            style={{
              width: preview,
              height: preview,
              background: brush === "eraser" ? "#d9d2c6" : rgbToCss(color),
            }}
          />
        </div>
        <label className="flex-1 text-sm text-ink-soft">
          굵기 <span className="font-semibold text-ink">{Math.round(size)}</span>
          <input
            type="range"
            min={1}
            max={128}
            value={size}
            onChange={(e) => setSize(+e.target.value)}
            aria-label="브러시 굵기"
            className="mt-1 h-4 w-full cursor-pointer appearance-none rounded-full bg-cream-deep accent-coral"
          />
        </label>
      </div>

      <label className="mt-3 block text-sm text-ink-soft">
        진하기 <span className="font-semibold text-ink">{Math.round(opacity * 100)}%</span>
        <input
          type="range"
          min={5}
          max={100}
          value={Math.round(opacity * 100)}
          onChange={(e) => setOpacity(+e.target.value / 100)}
          aria-label="진하기"
          className="mt-1 h-4 w-full cursor-pointer appearance-none rounded-full bg-cream-deep accent-sky"
        />
      </label>

      {mode === "watercolor" && (
        <label className="mt-3 block text-sm text-ink-soft">
          💧 물 양 <span className="font-semibold text-ink">{Math.round(water * 100)}%</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(water * 100)}
            onChange={(e) => setWater(+e.target.value / 100)}
            aria-label="물 양"
            className="mt-1 h-4 w-full cursor-pointer appearance-none rounded-full bg-sky-soft accent-sky"
          />
        </label>
      )}

      <label className="mt-3 block text-sm text-ink-soft">
        ✋ 손떨림 보정 <span className="font-semibold text-ink">{stabilize}</span>
        <input
          type="range"
          min={0}
          max={10}
          value={stabilize}
          onChange={(e) => setStabilize(+e.target.value)}
          aria-label="손떨림 보정 강도"
          className="mt-1 h-4 w-full cursor-pointer appearance-none rounded-full bg-cream-deep accent-leaf"
        />
      </label>
    </div>
  );
}
