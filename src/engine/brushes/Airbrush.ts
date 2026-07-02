import { BrushBase } from "./BrushBase";

/** 에어브러시: 가우시안 분사(soft 팁 + 낮은 flow + 촘촘한 spacing) */
export class Airbrush extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "airbrush",
        tip: "soft",
        spacing: 0.06,
        flow: 0.06,
        jitter: 0.15,
        sizePressure: 0.3,
        alphaPressure: 0.6,
        minSizeRatio: 0.8,
        composite: "source-over",
      },
      rng,
    );
  }
}
