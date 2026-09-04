/* 정적 도안 매니페스트 타입 + 로더 (로그인 없이 게스트가 색칠) */
export interface TemplateItem {
  id: string;
  title: string;
  grade: "low" | "mid" | "high";
  /** 색칠 캔버스로 넘길 원본(고해상 라인아트). 인쇄도 이걸 쓴다. */
  image: string;
  /** 격자용 320px 썸네일(scripts/gen-template-thumbs.mjs). 없으면 원본으로 폴백. */
  thumb?: string;
}
export interface TemplateTheme {
  theme: string;
  title: string;
  category: string;
  count: number;
  cover: string | null;
  /** 테마 격자(첫 화면)가 쓰는 커버 썸네일 — 없으면 cover 원본으로 폴백 */
  coverThumb?: string | null;
  items: TemplateItem[];
}
export interface TemplateCategory {
  id: string;
  title: string;
  emoji: string;
  themes: string[];
  partial: boolean;
}
export interface TemplateManifest {
  categories: TemplateCategory[];
  themes: Record<string, TemplateTheme>;
  generatedFrom: string;
}

let cache: TemplateManifest | null = null;

export async function loadTemplateManifest(): Promise<TemplateManifest> {
  if (cache) return cache;
  const res = await fetch("/templates/manifest.json");
  if (!res.ok) throw new Error("도안 목록을 불러오지 못했어요");
  cache = (await res.json()) as TemplateManifest;
  return cache;
}

export const GRADE_LABEL: Record<TemplateItem["grade"], string> = {
  low: "저학년",
  mid: "중학년",
  high: "고학년",
};
