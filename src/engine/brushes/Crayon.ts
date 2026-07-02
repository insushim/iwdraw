import { BrushBase } from "./BrushBase";

/** 크레용: 거친 입자 스탬프(rough 팁), 왁스 질감 — 결이 스트로크 방향을 따름 */
export class Crayon extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "crayon",
        tip: "rough",
        spacing: 0.15,
        flow: 0.8,
        jitter: 0.08,
        sizePressure: 0.35,
        alphaPressure: 0.5,
        minSizeRatio: 0.6,
        composite: "source-over",
        rotationFollowsStroke: true,
      },
      rng,
    );
  }
}
