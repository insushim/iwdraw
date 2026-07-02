import { BrushBase } from "./BrushBase";

/**
 * 유화붓: 굵고(1.25배) 완전 불투명 — 대비 강한 bristle 팁이 스트로크 방향을 따라 회전해
 * 붓결 스트릭이 확실히 남는다.
 * - WebGL2 백엔드: heightmap 임파스토 + 캔버스에 남은 색과 혼색(smudge pickup 30%)
 * - Canvas2D 폴백: 불투명 bristle 스탬프(질감 유지, 라이팅 생략)
 */
export class OilBrush extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "oil",
        tip: "bristle",
        sizeScale: 1.25,
        spacing: 0.08,
        flow: 1,
        jitter: 0.02,
        sizePressure: 0.45,
        alphaPressure: 0.1,
        minSizeRatio: 0.6,
        composite: "source-over",
        rotationFollowsStroke: true,
      },
      rng,
    );
  }
}
