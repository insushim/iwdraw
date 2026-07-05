import { BrushBase } from "./BrushBase";

/**
 * 글로우/네온: 넓은(1.6배) soft 팁 + wash(MAX) 누적 + lighter 합성.
 * 획 안은 wash로 균일(네온 튜브) — buildup+additive는 모서리·자기교차·획 머리마다
 * dab이 몰려 흰 핫스팟이 생긴다(실측). "겹칠수록 빛나는" 효과는 획과 획 사이의
 * lighter 레이어 합성이 담당한다.
 */
export class GlowBrush extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "glow",
        tip: "glow", // 전용 단면: 솔리드 코어 + 넓은 할로
        sizeScale: 1.9, // 할로가 팁 반지름의 바깥 58%라 체감 코어 굵기 보상

        spacing: 0.09,
        flow: 1, // wash: 팁 그라디언트가 그대로 튜브 단면(중심 코어+할로)
        jitter: 0,
        sizePressure: 0.4,
        alphaPressure: 0.4,
        minSizeRatio: 0.6,
        composite: "lighter",
        strokeBlend: "wash",
        washOpacity: 0.9,
      },
      rng,
    );
  }
}
