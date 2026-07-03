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
        flow: 1,
        jitter: 0,
        sizePressure: 0.05,
        alphaPressure: 0.05,
        minSizeRatio: 0.95,
        composite: "multiply",
        rotationFollowsStroke: true,
        tipAngleOffset: Math.PI / 2, // 납작촉을 진행방향과 수직으로 → 어느 방향이든 넓은 획
        strokeBlend: "wash", // 한 획 안은 균일한 잉크(겹침 얼룩 없음), 획끼리는 multiply로 진해짐
        washOpacity: 0.6,
      },
      rng,
    );
  }
}
