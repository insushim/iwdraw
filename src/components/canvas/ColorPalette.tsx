"use client";

import { useState } from "react";
import { useEditor } from "@/store/editor";
import { PALETTE_24, PALETTE_CVD, hsvToRgb, rgbToHsv, rgbEq } from "@/lib/palette";
import { rgbToCss, type RGB } from "@/engine/types";

/* 색상: 24색 + HSV 피커 + 스포이드 + 최근 8색 + 색약 팔레트 토글 */
export function ColorPalette() {
  const color = useEditor((s) => s.color);
  const setColor = useEditor((s) => s.setColor);
  const recent = useEditor((s) => s.recentColors);
  const [cvd, setCvd] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const palette = cvd ? PALETTE_CVD : PALETTE_24;

  return (
    <div className="rounded-card bg-paper p-3 shadow-soft">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-display text-base text-ink">색</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCvd((v) => !v)}
            aria-pressed={cvd}
            className="pressable rounded-full px-2 py-1 text-xs font-semibold text-ink-soft hover:bg-cream"
            title="색약 친화 팔레트"
          >
            👓 색약
          </button>
          <button
            onClick={() => setShowPicker((v) => !v)}
            aria-pressed={showPicker}
            className="pressable rounded-full px-2 py-1 text-xs font-semibold text-ink-soft hover:bg-cream"
          >
            🎯 직접
          </button>
        </div>
      </div>

      <div className="grid grid-cols-8 gap-1.5">
        {palette.map((c, i) => {
          const active = rgbEq(c, color);
          return (
            <button
              key={i}
              onClick={() => setColor(c)}
              aria-label={`색 ${i + 1}`}
              aria-pressed={active}
              className={`aspect-square rounded-lg border transition-transform active:scale-90 ${
                active ? "ring-2 ring-ink ring-offset-1" : "border-cream-deep"
              }`}
              style={{ background: rgbToCss(c) }}
            />
          );
        })}
      </div>

      {showPicker && <HsvPicker value={color} onChange={setColor} />}

      {recent.length > 0 && (
        <div className="mt-3">
          <span className="text-xs text-ink-faint">최근 색</span>
          <div className="mt-1 flex gap-1.5">
            {recent.map((c, i) => (
              <button
                key={i}
                onClick={() => setColor(c)}
                aria-label={`최근 색 ${i + 1}`}
                className="h-6 w-6 rounded-md border border-cream-deep transition-transform active:scale-90"
                style={{ background: rgbToCss(c) }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HsvPicker({ value, onChange }: { value: RGB; onChange: (c: RGB) => void }) {
  const { h, s, v } = rgbToHsv(value);
  return (
    <div className="mt-3 space-y-2">
      <label className="block text-xs text-ink-faint">
        색상
        <input
          type="range"
          min={0}
          max={360}
          value={Math.round(h)}
          onChange={(e) => onChange(hsvToRgb(+e.target.value, s || 1, v || 1))}
          className="mt-1 h-3 w-full cursor-pointer appearance-none rounded-full"
          style={{
            background:
              "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)",
          }}
        />
      </label>
      <label className="block text-xs text-ink-faint">
        진하기
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(s * 100)}
          onChange={(e) => onChange(hsvToRgb(h, +e.target.value / 100, v || 1))}
          className="mt-1 h-3 w-full cursor-pointer appearance-none rounded-full bg-cream-deep"
        />
      </label>
      <label className="block text-xs text-ink-faint">
        밝기
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(v * 100)}
          onChange={(e) => onChange(hsvToRgb(h, s, +e.target.value / 100))}
          className="mt-1 h-3 w-full cursor-pointer appearance-none rounded-full bg-cream-deep"
        />
      </label>
    </div>
  );
}
