"use client";

import { useEffect, useState } from "react";
import { useEditor } from "@/store/editor";
import { rgbToCss } from "@/engine/types";
import { BRUSH_SIZE_SCALE } from "@/engine/brushes";

const SIZE_MIN = 1;
const SIZE_MAX = 128;

/* 브러시 크기(큰 슬라이더+숫자 입력+실시간 미리보기 원) + 모드별 물양/보정 슬라이더 */
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
  const pressureOn = useEditor((s) => s.pressureOn);
  const togglePressure = useEditor((s) => s.togglePressure);

  const preview = Math.max(4, Math.min(60, size * (BRUSH_SIZE_SCALE[brush] ?? 1)));

  // 숫자 입력은 타이핑 중 빈 값/미완성 값을 허용해야 해서 로컬 텍스트로 들고,
  // 유효한 값일 때만 즉시 반영. 슬라이더 등 외부 변경은 동기화.
  const [sizeText, setSizeText] = useState(String(Math.round(size)));
  useEffect(() => setSizeText(String(Math.round(size))), [size]);
  const commitSize = (raw: string) => {
    if (raw.trim() === "") return; // 지우고 다시 입력하는 중 — Number("")===0이라 1로 튀는 사고 방지
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n)) return;
    setSize(Math.max(SIZE_MIN, Math.min(SIZE_MAX, n)));
  };
  const nudgeSize = (d: number) => {
    const next = Math.max(SIZE_MIN, Math.min(SIZE_MAX, Math.round(size) + d));
    setSize(next);
    setSizeText(String(next)); // effect 동기화는 한 프레임 늦어 연타 시 표시가 밀린다
  };

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
        <div className="flex-1 text-sm text-ink-soft">
          <div className="flex items-center gap-1">
            <span>굵기</span>
            <button
              onClick={() => nudgeSize(-1)}
              aria-label="굵기 1 줄이기"
              className="pressable ml-auto grid h-7 w-7 place-items-center rounded-full bg-cream text-base font-bold text-ink"
            >
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={SIZE_MIN}
              max={SIZE_MAX}
              value={sizeText}
              onChange={(e) => {
                setSizeText(e.target.value);
                commitSize(e.target.value);
              }}
              onBlur={() => setSizeText(String(Math.round(size)))}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              aria-label="브러시 굵기 숫자 입력"
              className="h-7 w-14 rounded-lg border border-cream-deep bg-paper text-center font-semibold text-ink [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              onClick={() => nudgeSize(1)}
              aria-label="굵기 1 늘리기"
              className="pressable grid h-7 w-7 place-items-center rounded-full bg-cream text-base font-bold text-ink"
            >
              +
            </button>
          </div>
          <input
            type="range"
            min={SIZE_MIN}
            max={SIZE_MAX}
            value={size}
            onChange={(e) => setSize(+e.target.value)}
            aria-label="브러시 굵기"
            className="mt-1 h-4 w-full cursor-pointer appearance-none rounded-full bg-cream-deep accent-coral"
          />
        </div>
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

      {/* 필압: 펜 실필압 + 마우스/손가락 속도 시뮬. 필압이 안 오는 기기(웨일북 등)는 끄면 균일 획 */}
      <div className="mt-3 flex items-center justify-between text-sm text-ink-soft">
        <span>✍️ 필압 (누르는 세기·속도 반영)</span>
        <button
          onClick={togglePressure}
          role="switch"
          aria-checked={pressureOn}
          aria-label="필압 켜기/끄기"
          className={`pressable relative h-6 w-11 rounded-full transition-colors ${
            pressureOn ? "bg-leaf" : "bg-cream-deep"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              pressureOn ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
