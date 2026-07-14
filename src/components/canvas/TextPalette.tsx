"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor } from "@/store/editor";
import { TEXT_FONTS } from "@/lib/fonts";

/*
 * 글씨 넣기 창 — 글을 치고 글꼴을 고르면 캔버스 가운데에 "떠 있는" 상태로 들어간다.
 * 그다음은 스탬프와 같다: 끌어서 옮기고 모서리로 크기를 바꾼 뒤 ✓로 굳힌다.
 * 색은 지금 고른 팔레트 색을 그대로 쓴다(따로 고를 것을 줄여 저학년도 헤매지 않게).
 * 글꼴은 전부 오픈 폰트 라이선스(저작권 걱정 없음), 한글·영문 모두 된다.
 */
export function TextPalette() {
  const open = useEditor((s) => s.textPaletteOpen);
  const setOpen = useEditor((s) => s.setTextPaletteOpen);
  const insertText = useEditor((s) => s.insertText);
  const color = useEditor((s) => s.color);
  const [value, setValue] = useState("");
  const [fontId, setFontId] = useState(TEXT_FONTS[0].id);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  if (!open) return null;
  const ink = `rgb(${color.r},${color.g},${color.b})`;
  const font = TEXT_FONTS.find((f) => f.id === fontId) ?? TEXT_FONTS[0];

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    insertText(v, font.family);
    setValue("");
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-ink/50 sm:place-items-center"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="글씨 넣기"
    >
      <div
        className="flex w-full max-w-xl flex-col gap-3 rounded-t-bubble bg-paper p-4 shadow-lift sm:rounded-bubble"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="font-display text-lg text-ink">✏️ 글씨 넣기</span>
          <button
            onClick={() => setOpen(false)}
            aria-label="닫기"
            className="pressable touch-target grid h-10 w-10 place-items-center rounded-full bg-cream text-ink-soft hover:bg-cream-deep"
          >
            ✕
          </button>
        </div>

        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, 60))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          placeholder="여기에 글씨를 써요 (한글·영어 모두 돼요)"
          aria-label="넣을 글"
          className="w-full resize-none rounded-2xl border-2 border-cream-deep bg-cream px-3 py-2 text-lg text-ink outline-none focus:border-sky"
        />

        <div>
          <span className="text-xs font-semibold text-ink-faint">글씨체</span>
          <div className="mt-1 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            {TEXT_FONTS.map((f) => {
              const active = f.id === fontId;
              return (
                <button
                  key={f.id}
                  onClick={() => setFontId(f.id)}
                  aria-pressed={active}
                  aria-label={`글씨체 ${f.label}`}
                  className={`pressable flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-semibold ${
                    active
                      ? "bg-sky-soft text-sky-deep ring-2 ring-sky"
                      : "bg-cream text-ink-soft hover:bg-cream-deep"
                  }`}
                >
                  <span className={`${f.className} text-xl leading-none`}>가A</span>
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 미리보기 — 실제 캔버스에 들어갈 모습(색·글꼴 그대로) */}
        <div className="grid min-h-[64px] place-items-center rounded-2xl bg-cream px-3 py-2">
          <span
            className={`${font.className} whitespace-pre-wrap text-center text-3xl leading-tight`}
            style={{ color: ink }}
          >
            {value || "미리보기"}
          </span>
        </div>

        <button
          onClick={submit}
          disabled={!value.trim()}
          className="pressable touch-target w-full rounded-2xl bg-leaf py-3 font-display text-base font-bold text-white disabled:opacity-40"
        >
          캔버스에 넣기
        </button>
        <p className="text-center text-[11px] text-ink-faint">
          넣은 뒤 끌어서 옮기고, 모서리를 잡아 크기를 바꿔요.
        </p>
      </div>
    </div>
  );
}
