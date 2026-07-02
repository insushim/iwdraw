import { BrushBase } from "./BrushBase";

/** 오일파스텔: 뭉개지는 두꺼운 입자(chunk 팁) — 크레용보다 부드럽고 진함 */
export class OilPastel extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "oilpastel",
        tip: "chunk",
        spacing: 0.13,
        flow: 0.9,
        jitter: 0.06,
        sizePressure: 0.4,
        alphaPressure: 0.3,
        minSizeRatio: 0.65,
        composite: "source-over",
        rotationFollowsStroke: true,
      },
      rng,
    );
  }
}
