import { BrushBase } from "./BrushBase";

/**
 * 마커: 납작촉(flat 팁)이 스트로크 방향으로 회전 — 방향 따라 굵기가 변하는 챠콜펜 느낌.
 * 반투명 multiply라 겹칠수록 진해지고, 필압 영향은 거의 없음(균일 잉크).
 */
export class Marker extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "marker",
        tip: "flat",
        sizeScale: 1.05,
        spacing: 0.04,
        flow: 0.42,
        jitter: 0,
        sizePressure: 0.05,
        alphaPressure: 0.05,
        minSizeRatio: 0.95,
        composite: "multiply",
        rotationFollowsStroke: true,
      },
      rng,
    );
  }
}
