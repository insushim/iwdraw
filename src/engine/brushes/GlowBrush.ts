import { BrushBase } from "./BrushBase";

/** 글로우/네온: 넓은(1.6배) soft + additive(lighter) 합성 — 겹칠수록 빛나는 효과 */
export class GlowBrush extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "glow",
        tip: "soft",
        sizeScale: 1.6,
        spacing: 0.09,
        flow: 0.22,
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
