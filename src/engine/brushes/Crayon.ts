import { BrushBase } from "./BrushBase";

/** 크레용: 굵고 거친 왁스 입자(rough 팁) + 흔들림 — 결이 스트로크 방향을 따름 */
export class Crayon extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "crayon",
        tip: "rough",
        sizeScale: 1.0,
        spacing: 0.14,
        flow: 0.9, // 진하기 100%에서 왁스답게 채도 꽉 차게(0.72는 연필과 구분 안 됨 — 사용자 실측)
        jitter: 0.13,
        sizePressure: 0.35,
        alphaPressure: 0.5,
        minSizeRatio: 0.6,
        composite: "source-over",
        rotationFollowsStroke: true,
        paperGrain: 0.5, // 왁스가 종이 요철 골을 건너뛰는 크레용 특유의 흰 틈 — 연필과의 질감 구분점
        // 실물 크레용은 가는 선일수록 왁스가 끊긴다 — 얇은 획 정체성 중 가장 강한 값
        thinGrain: 0.85,
        // 왁스는 농도보다 "결이 끊기는" 쪽으로 반응한다 — 간격을 벌린다
        speedSpacing: 0.28,
        speedAlpha: 0.08,
      },
      rng,
    );
  }
}
