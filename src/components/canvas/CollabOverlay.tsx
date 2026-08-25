"use client";

import { useSyncExternalStore } from "react";
import type { ArtEngine } from "@/engine/ArtEngine";
import type { CursorStore } from "./useCollab";

const EMPTY = {};

/* 협동 캔버스 위에 친구들의 커서+닉네임을 표시 (캔버스 좌표 → 화면 %)
 *
 * 커서는 Editor의 state가 아니라 useCollab의 외부 store에서 직접 구독한다 —
 * 친구가 붓을 움직일 때 리렌더되는 건 이 컴포넌트뿐이다(웨일북 협동 렉의 주범이 
 * Editor 전체 리렌더였다, 2026-08-25). */
export function CollabOverlay({
  cursorStore,
  engine,
}: {
  cursorStore: CursorStore;
  engine: ArtEngine | null;
}) {
  const cursors = useSyncExternalStore(
    cursorStore.subscribe,
    cursorStore.getSnapshot,
    () => EMPTY as ReturnType<CursorStore["getSnapshot"]>,
  );
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
            /* transition 없음(의도) — left/top 트랜지션은 애니메이션이 도는 내내 커서 수만큼
               60Hz로 레이아웃을 다시 잡는다. 좌표는 어차피 초당 ~16번만 오므로 보간 이득보다
               저사양 기기(웨일북)에서 획이 끊기는 손해가 컸다. */
            className="absolute -translate-x-1 -translate-y-1"
            style={{ left: `${(c.x / engine.width) * 100}%`, top: `${(c.y / engine.height) * 100}%` }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,.3))" }}>
              <path d="M2 2l6 14 2.2-5.6L16 8z" fill={c.color} stroke="#fff" strokeWidth="1.2" />
            </svg>
            <span
              className="ml-3 -mt-1 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold text-white"
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
