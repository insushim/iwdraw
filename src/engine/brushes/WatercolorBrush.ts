import { BrushBase } from "./BrushBase";
import type { Dab, StrokePoint } from "../types";

/**
 * 수채붓: 크고(1.8배) 옅은 wet 팁(가장자리 안료 몰림 베이크) + 종이 결 침식.
 * 물 양 슬라이더: 물이 많을수록 더 넓게 퍼지고 옅어진다.
 */
export class WatercolorBrush extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "watercolor",
        tip: "wet",
        sizeScale: 1.8,
        spacing: 0.15,
        flow: 0.16,
        jitter: 0.02,
        sizePressure: 0.5,
        alphaPressure: 0.5,
        minSizeRatio: 0.5,
        composite: "multiply",
        paperGrain: 0.4,
      },
      rng,
    );
  }

  protected override makeDab(p: StrokePoint, angle: number): Dab {
    const dab = super.makeDab(p, angle);
    // 물 양 매핑: 많이 적실수록 넓게 퍼지고 옅게
    const w = this.settings.waterAmount;
    dab.size *= 1 + w * 0.35;
    dab.alpha *= 1.15 - w * 0.55;
    return dab;
  }
}
