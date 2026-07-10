import { BrushBase } from "./BrushBase";
import type { Dab, StrokePoint } from "../types";

/**
 * 수채붓: 크고(1.8배) 옅은 wet 팁 + 종이 결 침식 + 마름 가장자리(wet edge).
 * 물 양·진하기는 알파가 아니라 "물감 농도"(흰색 희석)로 표현한다 — 아래 makeDab 참조.
 */
export class WatercolorBrush extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "watercolor",
        tip: "wet",
        sizeScale: 1.8,
        spacing: 0.15,
        flow: 1,
        jitter: 0.02,
        sizePressure: 0.3, // 굵기 변동 크면 획 머리가 볼록해진다 — 워시는 폭이 고른 게 자연스럽다
        // 필압→알파 변동 최소화 — 획마다 알파가 다르면 겹침 수렴이 깨져 경계 단차가 남는다
        alphaPressure: 0.08,
        minSizeRatio: 0.5,
        // darken(채널별 min): 같은 색·같은 농도의 겹침은 그 색으로 정확히 "수렴"한다.
        // multiply는 겹칠 때마다 어두워져 얼룩(2026-07-09 실측, e2e watercolor-mottle).
        composite: "darken",
        paperGrain: 0.18, // granulation 최소화 — 0.32도 클로즈업에서 마커+모래알로 읽힘(2026-07-10). 수채감은 농담 구름이 담당
        strokeBlend: "wash", // 획 내부 균일(겹침 스캘럽 제거)
        // ⚠️ washOpacity·알파로 옅음을 만들면 안 된다 — 획 전체 알파가 1 미만이면
        // darken이어도 겹칠 때마다 min 쪽으로 한 스텝씩 어두워져 획 경계가 얼룩으로
        // 남는다(2026-07-10 사용자 실측, i-scream 대비 어색). 옅음은 전부 색 희석이 담당.
        washOpacity: 1,
        opacityAsDilution: true, // 진하기 슬라이더도 알파가 아니라 희석으로(아래 makeDab)
        // 농담 구름: 완전 균일 워시는 "연한 마커"로 읽힌다(2026-07-10 사용자 실측).
        // 캔버스 고정 저주파 색 요동이라 겹침 수렴은 유지하면서 수채 특유의 불균일만 살림.
        washCloud: 0.34,
        wetEdge: 0.35, // 실루엣 가장자리 안료 몰림 — 0.75는 획마다 테가 얼룩처럼 보임(실측)
      },
      rng,
    );
  }

  protected override makeDab(p: StrokePoint, angle: number): Dab {
    const dab = super.makeDab(p, angle);
    const w = this.settings.waterAmount;
    dab.size *= 1 + w * 0.35; // 물이 많을수록 넓게 퍼진다
    // 물 양·진하기 → 물감 농도(흰색 희석). 알파(<1)로 하면 겹침마다 어두워지는
    // 단차가 생기므로, 같은 설정의 획은 어디서 겹쳐도 같은 색이 되게 색 자체를 희석.
    // 스팬은 기존 알파 매핑의 체감과 맞춤: 물 0%=진한 안료(~70%), 100%=옅은 워시(~25%).
    const dilute = Math.min(0.8, 0.3 + w * 0.45);
    const density = (1 - dilute) * this.settings.opacity;
    const c = this.settings.color;
    dab.color = {
      r: Math.round(255 - (255 - c.r) * density),
      g: Math.round(255 - (255 - c.g) * density),
      b: Math.round(255 - (255 - c.b) * density),
    };
    // 팁 플래토(0.94)×필압 잔변동을 뚫고 획 내부 알파를 1로 포화 — 셰이더/2D가 클램프.
    // 내부가 1이어야 겹침이 darken min으로 수렴한다(0.9면 여전히 겹침 단차).
    dab.alpha = Math.min(1.6, dab.alpha * 1.35);
    return dab;
  }
}
