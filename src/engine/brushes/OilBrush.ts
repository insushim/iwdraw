import { BrushBase } from "./BrushBase";

/**
 * 유화붓: bristle 팁이 스트로크 방향을 따라 회전 — 붓결 스트릭.
 * - WebGL2 백엔드: heightmap 임파스토 + 캔버스에 남은 색과 혼색(smudge pickup 30%) (render/OilSim)
 * - Canvas2D 폴백: 불투명 bristle 스탬프(질감 유지, 라이팅 생략)
 */
export class OilBrush extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "oil",
        tip: "bristle",
        spacing: 0.1,
        flow: 0.95,
        jitter: 0.02,
        sizePressure: 0.45,
        alphaPressure: 0.15,
        minSizeRatio: 0.6,
        composite: "source-over",
        rotationFollowsStroke: true,
      },
      rng,
    );
  }
}
