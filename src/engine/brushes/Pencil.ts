import { BrushBase } from "./BrushBase";

/** 연필: 가는 흑연 선(sizeScale 0.45) + 종이결 텍스처 — 필압은 진하기 위주 */
export class Pencil extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "pencil",
        tip: "grain",
        sizeScale: 0.45,
        spacing: 0.09,
        flow: 1, // 0.8은 진하기 100%에서도 연함(2026-07-06 사용자 실측)
        jitter: 0.03,
        sizePressure: 0.3,
        alphaPressure: 0.6, // 필압 반응은 남기되 빠른 획(저필압)이 반투명해지는 낙폭 축소
        minSizeRatio: 0.7,
        composite: "source-over",
      },
      rng,
    );
  }
}
