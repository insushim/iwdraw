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
        flow: 0.8,
        jitter: 0.03,
        sizePressure: 0.3,
        alphaPressure: 0.75,
        minSizeRatio: 0.7,
        composite: "source-over",
      },
      rng,
    );
  }
}
