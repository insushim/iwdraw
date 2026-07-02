import { BrushBase } from "./BrushBase";

/** 지우개: destination-out — 활성 레이어만 지운다 */
export class Eraser extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "eraser",
        tip: "hard",
        spacing: 0.08,
        flow: 1,
        jitter: 0,
        sizePressure: 0.3,
        alphaPressure: 0,
        minSizeRatio: 0.7,
        composite: "destination-out",
      },
      rng,
    );
  }
}
