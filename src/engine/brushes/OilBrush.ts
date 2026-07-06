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
        sizePressure: 0.28, // i-scream 유화는 획 폭이 거의 일정 — 속도 필압 출렁임 완화(0.45는 ±13%)
        alphaPressure: 0.1, // 유화 물감은 불투명 — 0.35는 마우스 필압(속도 0.35~0.85)에서
        // dab 알파 0.77까지 떨어져 겹친 획이 진해짐(i-scream 비교 실측). 마른 끝은 fringe 담당
        minSizeRatio: 0.6,
        composite: "source-over",
        rotationFollowsStroke: true,
        paperGrain: 0.38, // 캔버스 결이 배어나되 진행방향 붓결을 덮지 않게(0.6은 격자가 결을 가림, 0.45는 격자가 붓결과 경합 — 실측)
        strokeBlend: "wash", // 겹침 포화 방지 → 붓결이 획 전체에 보존
        washOpacity: 1,
        // fringe(양끝 트레일 dab) 금지 — 불투명 물감에선 꼬리 dab이 캡 경계 밖에 걸려
        // "물감 점"으로 읽힘(2026-07-06 산포 축소 후에도 재발, 사용자 실측 2회 → 기능 off).
        // 붓끝 갈라짐은 팁의 좌우 지터(jl/jr)·가장자리 폴오프·스트릭이 담당
        // ⚠️ 고립된 흰 점(fleck) 금지 — 캔버스 고정 점은 붓 방향과 무관해 "인위적"으로
        // 읽힌다(2026-07-06 사용자 실측 3회 수렴, 기능 제거). 질감은 streaks+직조 백화 전담
        grainLift: true, // 유화 물감은 불투명 — 결은 구멍이 아니라 흰 캔버스 배어남(겹침 진해짐 방지)
        streaks: 0.55, // 붓 방향 밝은 스트릭 — MAX에서 살아남아 덧칠 내부에도 붓결 유지(i-scream)
      },
      rng,
    );
  }
}
