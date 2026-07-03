import { setTipOverride } from "./backend";
import type { TipKind } from "../brushes/BrushBase";

/*
 * AI 생성 브러시 팁 알파맵 로더.
 * public/brush-tips/<kind>.png = 검은 배경 + 흰 붓결 → luminance를 알파로 변환해
 * 프로시저럴 팁을 대체한다. 로드 실패/미존재 시 조용히 프로시저럴 유지(폴백).
 */

const TIP_FILES: Partial<Record<TipKind, string>> = {
  bristle: "/brush-tips/bristle.png",
};

/** luminance→alpha 변환 + 노이즈 플로어 컷 + 원형 클램프(텍스처 가장자리 번짐 방지) */
function toAlphaMap(img: HTMLImageElement, size = 256): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, size, size);
  const d = ctx.getImageData(0, 0, size, size);
  const px = d.data;
  const r = size / 2;
  const FLOOR = 24; // 생성 이미지의 "거의 검정" 노이즈 제거(없으면 획이 사각 리본이 됨)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const lum = Math.max(px[i], px[i + 1], px[i + 2]);
      let a = lum <= FLOOR ? 0 : ((lum - FLOOR) / (255 - FLOOR)) * (px[i + 3] / 255) * 255;
      // CLAMP_TO_EDGE 스머 방지: 반지름 0.94~1.0 구간에서 페이드아웃
      const dn = Math.hypot(x - r + 0.5, y - r + 0.5) / r;
      if (dn > 1) a = 0;
      else if (dn > 0.94) a *= 1 - (dn - 0.94) / 0.06;
      px[i] = px[i + 1] = px[i + 2] = 255;
      px[i + 3] = a;
    }
  }
  ctx.putImageData(d, 0, 0);
  return c;
}

let started = false;

/** 앱 수명당 1회 — 엔진 생성 시 호출. 로드 완료 시 epoch가 올라가 백엔드 캐시가 갱신된다. */
export function loadTipOverrides(): void {
  if (started || typeof document === "undefined") return;
  started = true;
  for (const [kind, url] of Object.entries(TIP_FILES) as [TipKind, string][]) {
    const img = new Image();
    img.onload = () => {
      try {
        setTipOverride(kind, toAlphaMap(img));
      } catch {
        // tainted canvas 등 getImageData 실패 → 프로시저럴 폴백 유지
      }
    };
    img.src = url; // onerror 무시 → 프로시저럴 폴백 유지
  }
}
