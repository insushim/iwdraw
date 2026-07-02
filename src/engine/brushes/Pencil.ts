import { BrushBase } from "./BrushBase";

/** 연필: 종이결 텍스처(grain 팁) + 필압→진하기 위주, 크기 변화는 작게 */
export class Pencil extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "pencil",
        tip: "grain",
        spacing: 0.12,
        flow: 0.55,
        jitter: 0.04,
        sizePressure: 0.25,
        alphaPressure: 0.75,
        minSizeRatio: 0.7,
        composite: "source-over",
      },
      rng,
    );
  }
}
