"use client";

import { useMemo, useState } from "react";
import { useEditor } from "@/store/editor";
import { groupedStamps, type StampDef } from "@/engine/tools/StampTool";

/*
 * 그림 도장(스탬프) 팔레트 — 264종을 카테고리별로 훑어보고 직접 골라 넣는다.
 * 인식(뚝딱그림)에 안 걸려도 원하는 그림을 바로 찾을 수 있는 통로.
 * 고르면 캔버스 중앙에 "떠 있는" 상태로 삽입되고, 끌어 옮기고 크기를 바꾼 뒤 확인한다.
 */
export function StampPalette() {
  const open = useEditor((s) => s.stampPaletteOpen);
  const setOpen = useEditor((s) => s.setStampPaletteOpen);
  const insert = useEditor((s) => s.insertStamp);
  const color = useEditor((s) => s.color);
  const [q, setQ] = useState("");

  const groups = useMemo(() => groupedStamps(), []);
  const query = q.trim();
  const filtered = useMemo(() => {
    if (!query) return groups;
    return groups
      .map((g) => ({ ...g, stamps: g.stamps.filter((s) => s.label.includes(query)) }))
      .filter((g) => g.stamps.length > 0);
  }, [groups, query]);

  if (!open) return null;
  const ink = `rgb(${color.r},${color.g},${color.b})`;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-ink/50 sm:place-items-center"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="그림 도장 고르기"
    >
      <div
        className="flex max-h-[85dvh] w-full max-w-3xl flex-col rounded-t-bubble bg-paper shadow-lift sm:rounded-bubble"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-cream-deep px-4 py-3">
          <span className="font-display text-lg text-ink">🧸 그림 도장</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름으로 찾기 (예: 고양이)"
            aria-label="스탬프 이름으로 찾기"
            className="ml-2 min-w-0 flex-1 rounded-card border-2 border-cream-deep bg-cream px-3 py-1.5 text-sm text-ink focus:border-sky"
          />
          <button
            onClick={() => setOpen(false)}
            aria-label="닫기"
            className="pressable grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-faint hover:bg-cream"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-ink-faint">찾는 그림이 없어요.</p>
          ) : (
            filtered.map((g) => (
              <section key={g.cat} className="mb-4">
                <h3 className="mb-1.5 text-sm font-bold text-ink-soft">{g.cat}</h3>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {g.stamps.map((def) => (
                    <button
                      key={def.id}
                      onClick={() => insert(def.id)}
                      title={`${def.label} 넣기`}
                      aria-label={`${def.label} 넣기`}
                      className="pressable flex flex-col items-center gap-0.5 rounded-2xl bg-cream p-1.5 hover:bg-cream-deep"
                    >
                      <StampThumb def={def} ink={ink} />
                      <span className="w-full truncate text-center text-[10px] font-semibold text-ink-soft">
                        {def.label}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/** 팔레트 썸네일 — drawStampOnCtx와 같은 규칙(선화만, 색은 아이가 칠한다) */
function StampThumb({ def, ink }: { def: StampDef; ink: string }) {
  return (
    <svg viewBox="-1 -1 26 26" className="h-9 w-9" aria-hidden>
      {def.paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill="none"
          stroke={ink}
          strokeWidth="1.3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
