import { BrushBase } from "./BrushBase";

/** 무지개: 이동 거리에 따라 hue가 도는 라운드 브러시 */
export class RainbowBrush extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "rainbow",
        tip: "hard",
        spacing: 0.08,
        flow: 0.9,
        jitter: 0,
        sizePressure: 0.5,
        alphaPressure: 0.2,
        minSizeRatio: 0.6,
        composite: "source-over",
        dynamicHue: true,
      },
      rng,
    );
  }
}
