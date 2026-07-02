import { BrushBase } from "./BrushBase";

/**
 * 수채붓: 크고(1.8배) 매우 옅은 soft 워시 — dab에 물(water)을 실어 보낸다.
 * - WebGL2 백엔드: wetMap에 물+안료 주입 → 셀 오토마타 확산·edge darkening (render/WatercolorSim)
 * - Canvas2D 폴백: 확산 생략, multiply 반투명 브러시로 자연 다운그레이드
 */
export class WatercolorBrush extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "watercolor",
        tip: "soft",
        sizeScale: 1.8,
        spacing: 0.18,
        flow: 0.14,
        jitter: 0.02,
        sizePressure: 0.5,
        alphaPressure: 0.5,
        minSizeRatio: 0.5,
        composite: "multiply",
        carriesWater: true,
      },
      rng,
    );
  }
}
