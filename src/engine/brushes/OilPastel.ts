import { BrushBase } from "./BrushBase";

/** 오일파스텔: 굵고(1.3배) 크리미한 덩어리(chunk 팁) — 크레용보다 진하고 부드럽게 뭉개짐 */
export class OilPastel extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "oilpastel",
        tip: "chunk",
        sizeScale: 1.3,
        spacing: 0.12,
        flow: 1,
        jitter: 0.06,
        sizePressure: 0.4,
        alphaPressure: 0.25,
        minSizeRatio: 0.65,
        composite: "source-over",
        rotationFollowsStroke: true,
        paperGrain: 0.25,
        strokeBlend: "wash", // 크리미한 덩어리 질감이 획 전체에 유지
        washOpacity: 1,
      },
      rng,
    );
  }
}
