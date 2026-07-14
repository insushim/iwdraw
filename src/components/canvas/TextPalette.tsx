"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor } from "@/store/editor";
import { TEXT_FONTS } from "@/lib/fonts";
import type { RGB } from "@/engine/types";

/** 테두리 두께(글자 높이 대비) — 저학년도 고르기 쉽게 3단계만 */
const OUTLINE_STEPS = [
  { id: "thin", label: "얇게", ratio: 0.035 },
  { id: "mid", label: "보통", ratio: 0.07 },
  { id: "thick", label: "굵게", ratio: 0.12 },
];

/** 테두리 색 — 글자와 대비가 확실한 또렷한 색만(회갈·회색처럼 흐린 색은 테두리로 안 보인다) */
const OUTLINE_COLORS: RGB[] = [
  { r: 255, g: 255, b: 255 }, // 흰색
  { r: 45, g: 42, b: 38 }, // 검정(잉크)
  { r: 255, g: 80, b: 86 }, // 빨강
  { r: 255, g: 160, b: 60 }, // 주황
  { r: 255, g: 214, b: 82 }, // 노랑
  { r: 90, g: 200, b: 120 }, // 초록
  { r: 91, g: 184, b: 245 }, // 하늘
  { r: 70, g: 100, b: 220 }, // 파랑
  { r: 175, g: 110, b: 230 }, // 보라
  { r: 255, g: 140, b: 190 }, // 분홍
];

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
  const [outlineOn, setOutlineOn] = useState(false);
  const [outlineColor, setOutlineColor] = useState<RGB>({ r: 255, g: 255, b: 255 });
  const [outlineStep, setOutlineStep] = useState(OUTLINE_STEPS[1]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  if (!open) return null;
  const ink = `rgb(${color.r},${color.g},${color.b})`;
  const font = TEXT_FONTS.find((f) => f.id === fontId) ?? TEXT_FONTS[0];

  const outlineCss = `rgb(${outlineColor.r},${outlineColor.g},${outlineColor.b})`;
  const submit = () => {
    const v = value.trim();
    if (!v) return;
    insertText(v, font.family, outlineOn ? { color: outlineColor, ratio: outlineStep.ratio } : null);
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
          rows={3}
          placeholder="여기에 글씨를 써요 (엔터를 누르면 줄이 바뀌어요)"
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

        {/* 테두리 — 글자 둘레에 다른 색 선을 두른다(밝은 배경 위 흰 글씨도 잘 보이게) */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-faint">테두리</span>
            <button
              onClick={() => setOutlineOn((v) => !v)}
              aria-pressed={outlineOn}
              aria-label="테두리 켜기"
              className={`pressable rounded-full px-3 py-1 text-[11px] font-bold ${
                outlineOn ? "bg-leaf text-white" : "bg-cream-deep text-ink-faint"
              }`}
            >
              {outlineOn ? "켬" : "끔"}
            </button>
          </div>
          {outlineOn && (
            <div className="mt-1 space-y-1.5">
              <div className="flex flex-wrap gap-1.5">
                {OUTLINE_COLORS.map((c, i) => {
                  const css = `rgb(${c.r},${c.g},${c.b})`;
                  const active =
                    c.r === outlineColor.r && c.g === outlineColor.g && c.b === outlineColor.b;
                  return (
                    <button
                      key={i}
                      onClick={() => setOutlineColor(c)}
                      aria-pressed={active}
                      aria-label={`테두리 색 ${i + 1}`}
                      className={`pressable h-8 w-8 rounded-full border-2 ${
                        active ? "border-sky ring-2 ring-sky" : "border-cream-deep"
                      }`}
                      style={{ background: css }}
                    />
                  );
                })}
              </div>
              <div className="grid grid-cols-3 gap-1">
                {OUTLINE_STEPS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setOutlineStep(s)}
                    aria-pressed={outlineStep.id === s.id}
                    aria-label={`테두리 ${s.label}`}
                    className={`pressable rounded-xl py-1.5 text-[11px] font-semibold ${
                      outlineStep.id === s.id
                        ? "bg-sky-soft text-sky-deep ring-2 ring-sky"
                        : "bg-cream text-ink-soft hover:bg-cream-deep"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 미리보기 — 실제 캔버스에 들어갈 모습(색·글꼴·테두리 그대로) */}
        <div className="grid min-h-[64px] place-items-center rounded-2xl bg-cream px-3 py-2">
          <span
            className={`${font.className} whitespace-pre-wrap text-center text-3xl leading-tight`}
            style={{
              color: ink,
              // paint-order로 테두리를 글자 뒤에 깔아야 캔버스 결과와 같아진다
              WebkitTextStrokeWidth: outlineOn ? `${outlineStep.ratio * 2 * 30}px` : undefined,
              WebkitTextStrokeColor: outlineOn ? outlineCss : undefined,
              paintOrder: "stroke fill",
            }}
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
