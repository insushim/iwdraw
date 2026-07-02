"use client";

import type { ArtEngine } from "@/engine/ArtEngine";
import type { Cursor } from "./useCollab";

/* 협동 캔버스 위에 친구들의 커서+닉네임을 표시 (캔버스 좌표 → 화면 %) */
export function CollabOverlay({
  cursors,
  engine,
}: {
  cursors: Record<string, Cursor>;
  engine: ArtEngine | null;
}) {
  if (!engine) return null;
  const list = Object.values(cursors);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div
        className="relative"
        style={{ aspectRatio: `${engine.width}/${engine.height}`, height: "100%", maxWidth: "100%" }}
      >
        {list.map((c) => (
          <div
            key={c.userId}
            className="absolute -translate-x-1 -translate-y-1 transition-[left,top] duration-75"
            style={{ left: `${(c.x / engine.width) * 100}%`, top: `${(c.y / engine.height) * 100}%` }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,.3))" }}>
              <path d="M2 2l6 14 2.2-5.6L16 8z" fill={c.color} stroke="#fff" strokeWidth="1.2" />
            </svg>
            <span
              className="ml-3 -mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold text-white"
              style={{ background: c.color }}
            >
              {c.nickname}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
