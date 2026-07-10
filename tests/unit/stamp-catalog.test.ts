import { describe, expect, it } from "vitest";
import { STAMPS, groupedStamps, STAMP_CATEGORIES } from "@/engine/tools/StampTool";
import { EXTRA_SKETCH_VARIANTS } from "@/engine/recognizer/extra-templates";

/* 스탬프 카탈로그 264종 — 팔레트 분류 완전성 + 인식 스코핑 불변식 가드. */

describe("스탬프 카탈로그", () => {
  it("264종이고 id가 유일하다", () => {
    expect(STAMPS.length).toBe(264);
    const ids = new Set(STAMPS.map((s) => s.id));
    expect(ids.size).toBe(264); // 중복 id 없음
  });

  it("모든 스탬프가 팔레트 카테고리로 분류된다(‘기타’ 잔여 없음)", () => {
    const groups = groupedStamps();
    const total = groups.reduce((a, g) => a + g.stamps.length, 0);
    expect(total).toBe(STAMPS.length); // 누락 없이 전부 그룹에 들어감
    expect(groups.some((g) => g.cat === "기타")).toBe(false); // 미분류 없음
    for (const g of groups) expect(STAMP_CATEGORIES).toContain(g.cat as (typeof STAMP_CATEGORIES)[number]);
  });

  it("SVG fill:\"none\" path는 선화 전용(drawStampOnCtx가 채움 스킵) — 채움색 오염 방지", () => {
    // fill:"none"이 있으면 그 값이 유효한 무효화 신호여야 한다(빈 문자열 등 금지)
    for (const s of STAMPS) {
      for (const p of s.paths) {
        if (p.fill !== undefined) expect(p.fill.length, `${s.id}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("인식 스코핑 — 정확도 우선(신규 132종은 인식 제외, cat 유무로 구분)", () => {
  const variantIds = new Set(EXTRA_SKETCH_VARIANTS.map((v) => v.stampId));

  it("변형 표본은 실제 스탬프 id만 참조한다", () => {
    const stampIds = new Set(STAMPS.map((s) => s.id));
    for (const id of variantIds) expect(stampIds.has(id), `변형 id ${id}`).toBe(true);
  });

  it("원본 132종은 cat 미지정(인식 대상), 신규 132종은 cat 지정(인식 제외)", () => {
    // buildTemplates는 def.cat이 있으면 인식 템플릿에서 제외한다 — 이 불변식이 깨지면
    // 264종 전부가 인식 후보가 돼 오탐이 급증한다.
    const original = STAMPS.slice(0, 132);
    const added = STAMPS.slice(132);
    expect(original.length).toBe(132);
    expect(added.length).toBe(132);
    expect(original.filter((s) => s.cat).map((s) => s.id), "원본에 cat이 붙으면 인식 누락").toEqual([]);
    expect(added.filter((s) => !s.cat).map((s) => s.id), "신규에 cat이 없으면 인식 오탐↑").toEqual([]);
  });

  it("신규 스탬프는 인식 변형 표본도 없다(팔레트 전용)", () => {
    const leaked = STAMPS.slice(132).filter((s) => variantIds.has(s.id)).map((s) => s.id);
    expect(leaked).toEqual([]);
  });
});
