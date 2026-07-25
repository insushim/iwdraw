import { BrushBase } from "./BrushBase";

/** 무지개: 이동 거리에 따라 hue가 빠르게 도는 라운드 브러시 */
export class RainbowBrush extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "rainbow",
        tip: "hard",
        sizeScale: 1.0,
        spacing: 0.07,
        flow: 0.9,
        jitter: 0,
        sizePressure: 0.5,
        alphaPressure: 0.15,
        minSizeRatio: 0.6,
        composite: "source-over",
        dynamicHue: true,
        thinGrain: 0.06,
      },
      rng,
    );
  }
}
