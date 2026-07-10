import { BrushBase } from "./BrushBase";
import type { Dab, StrokePoint } from "../types";

/**
 * 붓펜(먹붓): 한국 서예 붓의 먹 표현.
 * - 필압·속도 → 굵기가 크게 출렁(sizePressure 0.85) = 삐침·파임의 캘리그래피 획
 * - 꾹 누르면 갈필 골까지 포화된 진한 먹, 살짝·빠르게 스치면 골이 드러나는 갈필(비백)
 * - 획 양끝은 fringe 테이퍼(붓끝이 모이며 갈라지는 마른 꼬리)
 * - wetEdge로 실루엣 가장자리에 먹이 몰리는 번짐 테
 */
export class InkBrush extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "inkbrush",
        tip: "ink",
        sizeScale: 1.15,
        spacing: 0.07, // 골이 이어지도록 촘촘히(유화 bristle과 같은 원리)
        flow: 1,
        jitter: 0.012,
        sizePressure: 0.85, // 붓은 필압·속도에 굵기가 민감 — 캘리그래피 획의 핵심
        alphaPressure: 0, // 알파는 아래 makeDab이 필압으로 직접(골 포화 제어)
        minSizeRatio: 0.12, // 붓끝만 닿으면 아주 가늘게
        composite: "source-over",
        rotationFollowsStroke: true, // 갈필 골이 획 방향을 따라 이어진다
        paperGrain: 0.24, // 화선지 스밈 — 알파 침식(grainLift=false)
        strokeBlend: "wash", // 획 내부 균일 + 골 질감 보존(겹침 포화 방지)
        washOpacity: 1, // 먹은 불투명 — 알파 낮으면 겹침 단차(수채 교훈)
        wetEdge: 0.4, // 마르며 가장자리에 먹 몰림(번짐 테)
        fringe: 0.85, // 양끝 마른 붓털 테이퍼
      },
      rng,
    );
  }

  protected override makeDab(p: StrokePoint, angle: number): Dab {
    const dab = super.makeDab(p, angle);
    const pr = Math.min(1, Math.max(0, p.pressure));
    // 필압 → 골 포화: 마우스 필압 스팬(0.35~0.85)에서도 대비가 나게 스팬을 넓게.
    // 스치면(0.35) 알파 ~1.05 → 골 노출(갈필), 꾹(0.85~1)이면 1.55~1.7 → 골 포화(진한 먹).
    dab.alpha = 0.7 + pr * 1.0;
    // 굵기도 필압(=마우스는 속도)에 한 번 더 반응 — 빠른 삐침이 확실히 가늘어지게.
    // sizePressure만으로는 마우스 필압 스팬(0.35~0.85)에서 변화가 밋밋하다(실측).
    dab.size *= 0.45 + pr * 0.7;
    return dab;
  }
}
