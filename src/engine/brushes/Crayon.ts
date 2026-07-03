import { BrushBase } from "./BrushBase";

/** 크레용: 굵고 거친 왁스 입자(rough 팁) + 흔들림 — 결이 스트로크 방향을 따름 */
export class Crayon extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "crayon",
        tip: "rough",
        sizeScale: 1.0,
        spacing: 0.14,
        flow: 0.72,
        jitter: 0.13,
        sizePressure: 0.35,
        alphaPressure: 0.5,
        minSizeRatio: 0.6,
        composite: "source-over",
        rotationFollowsStroke: true,
        paperGrain: 0.3,
      },
      rng,
    );
  }
}
