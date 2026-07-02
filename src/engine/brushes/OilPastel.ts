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
        flow: 0.95,
        jitter: 0.1,
        sizePressure: 0.4,
        alphaPressure: 0.25,
        minSizeRatio: 0.65,
        composite: "source-over",
        rotationFollowsStroke: true,
      },
      rng,
    );
  }
}
