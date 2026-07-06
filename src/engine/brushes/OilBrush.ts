import { BrushBase } from "./BrushBase";

/**
 * 유화붓: 굵고(1.25배) 완전 불투명 — 대비 강한 bristle 팁이 스트로크 방향(스무딩된 각도)을
 * 따라 회전해 붓결 스트릭이 이어지고, endStroke에서 종이 결이 배어난다.
 */
export class OilBrush extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "oil",
        tip: "bristle",
        sizeScale: 1.5, // 유화는 넓은 붓이 기본 — 기본 굵기에서도 붓결이 보일 폭 확보
        spacing: 0.05,
        flow: 1,
        jitter: 0.015,
        sizePressure: 0.45,
        alphaPressure: 0.1, // 유화 물감은 불투명 — 0.35는 마우스 필압(속도 0.35~0.85)에서
        // dab 알파 0.77까지 떨어져 겹친 획이 진해짐(i-scream 비교 실측). 마른 끝은 fringe 담당
        minSizeRatio: 0.6,
        composite: "source-over",
        rotationFollowsStroke: true,
        paperGrain: 0.38, // 캔버스 결이 배어나되 진행방향 붓결을 덮지 않게(0.6은 격자가 결을 가림, 0.45는 격자가 붓결과 경합 — 실측)
        strokeBlend: "wash", // 겹침 포화 방지 → 붓결이 획 전체에 보존
        washOpacity: 1,
        fringe: 0.9, // 획 양끝 마른 붓털 트레일
        flecks: 0.55, // 흰 점은 거의 안 느껴질 만큼만(사용자 실측) — 질감 주역은 streaks
        grainLift: true, // 유화 물감은 불투명 — 결은 구멍이 아니라 흰 캔버스 배어남(겹침 진해짐 방지)
        streaks: 0.55, // 붓 방향 밝은 스트릭 — MAX에서 살아남아 덧칠 내부에도 붓결 유지(i-scream)
      },
      rng,
    );
  }
}
