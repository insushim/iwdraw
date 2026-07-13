"use client";

import { useEditor } from "@/store/editor";
import { getStamp, type StampDef } from "@/engine/tools/StampTool";

/*
 * 뚝딱그림 제안 바 — 캔버스 상단 중앙 플로팅.
 * 스케치 인식 후보(최대 5개)를 스탬프 미리보기로 보여주고,
 * 탭하면 스케치가 그 스탬프로 뿅 바뀐다(자동 교체 없음 — 아이가 직접 선택).
 * 좁은 화면은 가로 스크롤(max-w + overflow-x).
 */
export function SuggestBar() {
  const suggestions = useEditor((s) => s.suggestions);
  const accept = useEditor((s) => s.acceptSuggestion);
  const dismiss = useEditor((s) => s.dismissSuggestion);
  const color = useEditor((s) => s.color); // 미리보기 = 실제 찍힐 색(잉크 폴백 path)

  if (suggestions.length === 0) return null;

  return (
    <div
      className="absolute left-1/2 top-3 z-10 flex max-w-[92%] -translate-x-1/2 items-center gap-1.5 overflow-x-auto rounded-full bg-paper px-3 py-1.5 shadow-lift"
      role="dialog"
      aria-label="뚝딱그림 제안"
    >
      <span className="hidden whitespace-nowrap text-sm font-semibold text-ink-soft sm:block">
        ✨ 혹시 이거예요?
      </span>
      {suggestions.map((sug) => {
        const def = getStamp(sug.stampId);
        if (!def) return null;
        return (
          <button
            key={sug.stampId}
            onClick={() => accept(sug.stampId)}
            title={`${withRo(sug.label)} 뚝딱 바꾸기`}
            aria-label={`${withRo(sug.label)} 바꾸기`}
            className="pressable touch-target flex shrink-0 flex-col items-center rounded-2xl bg-cream px-2.5 py-1 hover:bg-cream-deep"
          >
            <StampPreview def={def} ink={`rgb(${color.r},${color.g},${color.b})`} className="h-8 w-8" />
            <span className="text-[10px] font-semibold text-ink-soft">{sug.label}</span>
          </button>
        );
      })}
      <button
        onClick={dismiss}
        aria-label="제안 닫기"
        title="아니에요, 내 그림 그대로 둘래요"
        className="pressable touch-target grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-faint hover:bg-cream"
      >
        ✕
      </button>
    </div>
  );
}

/** 받침 유무에 맞는 "로/으로" 조사 — 저학년이 읽는 문구라 기계식 "(으)로"를 피한다 */
function withRo(word: string): string {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return `${word}로`;
  const jong = (last - 0xac00) % 28;
  // 받침 없음 또는 ㄹ받침(8) → "로", 그 외 → "으로"
  return jong === 0 || jong === 8 ? `${word}로` : `${word}으로`;
}

/** 스탬프 SVG 미리보기 — drawStampOnCtx와 같은 규칙(선화만, 색은 아이가 칠한다) */
function StampPreview({ def, ink, className }: { def: StampDef; ink: string; className?: string }) {
  return (
    <svg viewBox="-1 -1 26 26" className={className} aria-hidden>
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
