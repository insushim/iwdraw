"use client";

import { useState } from "react";
import { useEditor } from "@/store/editor";
import { PALETTE_24, PALETTE_CVD, hsvToRgb, rgbToHsv, rgbEq } from "@/lib/palette";
import { rgbToCss, type RGB } from "@/engine/types";
import { Icon } from "./icons";

/* 색상: 지금 색 크게 + 24색 동그라미 + HSV 피커 + 최근 8색 + 색약 팔레트 토글 */
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
        <div className="flex items-center gap-2">
          <span
            role="img"
            className="h-7 w-7 rounded-full ring-2 ring-cream-deep"
            style={{ background: rgbToCss(color) }}
            aria-label="지금 고른 색"
          />
          <span className="font-display text-base text-ink">색</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCvd((v) => !v)}
            aria-pressed={cvd}
            className={`pressable flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
              cvd ? "bg-sky-soft text-sky-deep" : "text-ink-soft hover:bg-cream"
            }`}
            title="색약 친화 팔레트"
          >
            <Icon name="glasses" className="h-4 w-4" />
            색약
          </button>
          <button
            onClick={() => setShowPicker((v) => !v)}
            aria-pressed={showPicker}
            className={`pressable flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
              showPicker ? "bg-coral-soft text-coral-deep" : "text-ink-soft hover:bg-cream"
            }`}
            title="원하는 색 직접 만들기"
          >
            <Icon name="picker" className="h-4 w-4" />
            직접
          </button>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {palette.map((c, i) => {
          const active = rgbEq(c, color);
          return (
            <button
              key={i}
              onClick={() => setColor(c)}
              aria-label={`색 ${i + 1}`}
              aria-pressed={active}
              className={`aspect-square rounded-full transition-transform active:scale-90 ${
                active
                  ? "scale-110 ring-[2.5px] ring-ink ring-offset-2 ring-offset-paper"
                  : "ring-1 ring-black/10 hover:scale-105"
              }`}
              style={{ background: rgbToCss(c) }}
            />
          );
        })}
      </div>

      {showPicker && <HsvPicker value={color} onChange={setColor} />}

      {recent.length > 0 && (
        <div className="mt-3">
          <span className="text-xs font-semibold text-ink-faint">최근 쓴 색</span>
          <div className="mt-1 flex gap-1.5">
            {recent.map((c, i) => (
              <button
                key={i}
                onClick={() => setColor(c)}
                aria-label={`최근 색 ${i + 1}`}
                className="h-6 w-6 rounded-full ring-1 ring-black/10 transition-transform active:scale-90 hover:scale-105"
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
    <div className="mt-3 space-y-2 rounded-2xl bg-cream p-2.5">
      <label className="block text-xs font-semibold text-ink-soft">
        색깔
        <input
          type="range"
          min={0}
          max={360}
          value={Math.round(h)}
          onChange={(e) => onChange(hsvToRgb(+e.target.value, s || 1, v || 1))}
          className="mt-1 h-3.5 w-full cursor-pointer appearance-none rounded-full"
          style={{
            background:
              "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)",
          }}
        />
      </label>
      <label className="block text-xs font-semibold text-ink-soft">
        쨍하기
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(s * 100)}
          onChange={(e) => onChange(hsvToRgb(h, +e.target.value / 100, v || 1))}
          className="mt-1 h-3.5 w-full cursor-pointer appearance-none rounded-full accent-coral"
          style={{
            background: `linear-gradient(to right, ${rgbToCss(hsvToRgb(h, 0, v || 1))}, ${rgbToCss(hsvToRgb(h, 1, v || 1))})`,
          }}
        />
      </label>
      <label className="block text-xs font-semibold text-ink-soft">
        밝기
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(v * 100)}
          onChange={(e) => onChange(hsvToRgb(h, s, +e.target.value / 100))}
          className="mt-1 h-3.5 w-full cursor-pointer appearance-none rounded-full accent-coral"
          style={{
            background: `linear-gradient(to right, #000, ${rgbToCss(hsvToRgb(h, s, 1))})`,
          }}
        />
      </label>
    </div>
  );
}
