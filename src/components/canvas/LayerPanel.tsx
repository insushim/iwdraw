"use client";

import { useState } from "react";
import { useEditor } from "@/store/editor";
import type { BlendMode } from "@/engine/types";
import { Icon } from "./icons";

const BLENDS: { id: BlendMode; label: string }[] = [
  { id: "normal", label: "보통" },
  { id: "multiply", label: "곱하기" },
  { id: "screen", label: "스크린" },
  { id: "overlay", label: "오버레이" },
];

/* 우측 접이식 레이어 패널 */
export function LayerPanel() {
  const layers = useEditor((s) => s.layers);
  const activeId = useEditor((s) => s.activeLayerId);
  const addLayer = useEditor((s) => s.addLayer);
  const removeLayer = useEditor((s) => s.removeLayer);
  const setActive = useEditor((s) => s.setActiveLayer);
  const setVisible = useEditor((s) => s.setLayerVisible);
  const setOpacity = useEditor((s) => s.setLayerOpacity);
  const setBlend = useEditor((s) => s.setLayerBlend);
  const [open, setOpen] = useState(false);

  const drawable = layers.filter((l) => !l.isLineart && !l.isBase);

  return (
    <div className="rounded-card bg-paper shadow-soft">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="pressable flex w-full items-center gap-2 rounded-card px-3 py-2 font-display text-base text-ink"
      >
        <Icon name="layers" className="h-6 w-6" />
        <span>레이어</span>
        <span className="rounded-full bg-cream px-2 py-0.5 text-xs font-bold text-ink-soft">
          {drawable.length}
        </span>
        <span className={`ml-auto text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="space-y-2 border-t border-cream-deep p-3">
          {[...layers].reverse().map((l) => {
            const active = l.id === activeId;
            const locked = l.isLineart || l.isBase;
            return (
              <div
                key={l.id}
                className={`rounded-2xl border p-2 ${
                  active ? "border-coral bg-coral-soft" : "border-cream-deep bg-cream"
                } ${locked ? "opacity-90" : ""}`}
              >
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setVisible(l.id, !l.visible)}
                    aria-label={l.visible ? "숨기기" : "보이기"}
                    className="pressable rounded-lg p-1"
                  >
                    <Icon name={l.visible ? "eye" : "eyeOff"} className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => !locked && setActive(l.id)}
                    className="flex-1 truncate text-left text-sm font-semibold text-ink"
                    disabled={locked}
                  >
                    {l.name}
                    {l.isLineart && <span className="ml-1 text-xs text-ink-faint">(도안·잠금)</span>}
                    {l.isBase && <span className="ml-1 text-xs text-ink-faint">(원본·잠금)</span>}
                  </button>
                  {!locked && drawable.length > 1 && (
                    <button
                      onClick={() => removeLayer(l.id)}
                      aria-label="레이어 삭제"
                      className="pressable rounded-lg p-1"
                    >
                      <Icon name="trash" className="h-5 w-5" />
                    </button>
                  )}
                </div>
                {!locked && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(l.opacity * 100)}
                      onChange={(e) => setOpacity(l.id, +e.target.value / 100)}
                      aria-label={`${l.name} 투명도`}
                      className="h-3 flex-1 cursor-pointer appearance-none rounded-full bg-cream-deep accent-sky"
                    />
                    <select
                      value={l.blend}
                      onChange={(e) => setBlend(l.id, e.target.value as BlendMode)}
                      aria-label={`${l.name} 블렌드 모드`}
                      className="rounded-lg border border-cream-deep bg-paper px-1.5 py-1 text-xs"
                    >
                      {BLENDS.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
          <button
            onClick={addLayer}
            disabled={drawable.length >= 8}
            className="pressable flex w-full items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-ink-faint py-2 text-sm font-semibold text-ink-soft disabled:opacity-40"
          >
            <Icon name="plus" className="h-4 w-4 text-ink-soft" />새 레이어
          </button>
        </div>
      )}
    </div>
  );
}
