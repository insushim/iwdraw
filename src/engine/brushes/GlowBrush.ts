import { BrushBase } from "./BrushBase";

/** 글로우/네온: additive(lighter) 합성 — 겹칠수록 빛나는 효과 */
export class GlowBrush extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "glow",
        tip: "soft",
        spacing: 0.1,
        flow: 0.35,
        jitter: 0,
        sizePressure: 0.4,
        alphaPressure: 0.4,
        minSizeRatio: 0.6,
        composite: "lighter",
      },
      rng,
    );
  }
}
