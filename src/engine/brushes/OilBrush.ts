import { BrushBase } from "./BrushBase";

/**
 * 유화붓: 굵고(1.25배) 완전 불투명 — 대비 강한 bristle 팁이 스트로크 방향(스무딩된 각도)을
 * 따라 회전해 붓결 스트릭이 이어지고, endStroke에서 종이 결이 배어난다.
 */
export class OilBrush extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "oil",
        tip: "bristle",
        sizeScale: 1.5, // 유화는 넓은 붓이 기본 — 기본 굵기에서도 붓결이 보일 폭 확보
        spacing: 0.05,
        flow: 1,
        jitter: 0.015,
        sizePressure: 0.45,
        alphaPressure: 0.35, // wash에서 필압 낮은 구간=마른 붓자국(끝 갈라짐)
        minSizeRatio: 0.6,
        composite: "source-over",
        rotationFollowsStroke: true,
        paperGrain: 0.5,
        strokeBlend: "wash", // 겹침 포화 방지 → 붓결이 획 전체에 보존
        washOpacity: 1,
      },
      rng,
    );
  }
}
