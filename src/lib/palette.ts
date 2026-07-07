import type { RGB } from "@/engine/types";

/** 기본 24색 팔레트 — 아이들이 자주 쓰는 밝고 선명한 색 */
// 유채색 밝기(V) +12% (2026-07-07 사용자 요청 '더 밝게') — 무채색(잉크·회색·흰·먹색)은 유지
export const PALETTE_24: RGB[] = [
  { r: 45, g: 42, b: 38 }, // 잉크
  { r: 120, g: 110, b: 100 }, // 회갈
  { r: 180, g: 180, b: 180 }, // 회색
  { r: 255, g: 255, b: 255 }, // 흰색
  { r: 255, g: 80, b: 86 }, // 빨강
  { r: 255, g: 122, b: 89 }, // 코랄
  { r: 255, g: 154, b: 60 }, // 주황
  { r: 255, g: 200, b: 74 }, // 노랑
  { r: 255, g: 232, b: 133 }, // 연노랑
  { r: 138, g: 225, b: 124 }, // 잎초록
  { r: 106, g: 196, b: 93 }, // 진초록
  { r: 67, g: 157, b: 134 }, // 청록
  { r: 95, g: 192, b: 255 }, // 하늘
  { r: 68, g: 174, b: 251 }, // 파랑
  { r: 67, g: 101, b: 224 }, // 남색
  { r: 206, g: 134, b: 251 }, // 보라
  { r: 240, g: 146, b: 213 }, // 자주
  { r: 255, g: 170, b: 200 }, // 분홍
  { r: 168, g: 112, b: 67 }, // 갈색
  { r: 123, g: 78, b: 45 }, // 진갈
  { r: 235, g: 202, b: 157 }, // 살구
  { r: 255, g: 224, b: 189 }, // 살색
  { r: 40, g: 40, b: 50 }, // 먹색
  { r: 22, g: 67, b: 101 }, // 진남
];

/** 색약 친화 팔레트(Okabe-Ito 계열, 접근성 옵션) */
export const PALETTE_CVD: RGB[] = [
  { r: 0, g: 0, b: 0 },
  { r: 230, g: 159, b: 0 },
  { r: 86, g: 180, b: 233 },
  { r: 0, g: 158, b: 115 },
  { r: 240, g: 228, b: 66 },
  { r: 0, g: 114, b: 178 },
  { r: 213, g: 94, b: 0 },
  { r: 204, g: 121, b: 167 },
  { r: 255, g: 255, b: 255 },
  { r: 120, g: 120, b: 120 },
];

export function rgbEq(a: RGB, b: RGB): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b;
}

/** HSV → RGB (색상 피커용) */
export function hsvToRgb(h: number, s: number, v: number): RGB {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function rgbToHsv({ r, g, b }: RGB): { h: number; s: number; v: number } {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn),
    min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}
