import { BrushBase } from "./BrushBase";

/** 에어브러시: 아주 넓고(2.5배) 아주 옅은 가우시안 분사 + 큰 흔들림 — 스프레이 안개 */
export class Airbrush extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "airbrush",
        tip: "soft",
        sizeScale: 2.5,
        spacing: 0.05,
        flow: 0.035,
        jitter: 0.35,
        sizePressure: 0.3,
        alphaPressure: 0.6,
        minSizeRatio: 0.8,
        composite: "source-over",
      },
      rng,
    );
  }
}
