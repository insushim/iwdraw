import { BrushBase } from "./BrushBase";

/**
 * 색연필: 연필과 같은 입자결이지만 색이 옅게 얹혀 겹칠수록 진해진다(레이어링).
 * 크레용과의 구분점 — 크레용은 왁스가 두껍게 덮이고(flow 0.9) 결이 굵다면,
 * 색연필은 한 번에 옅게(flow 0.5) 얹혀 여러 번 문질러 색을 쌓는 도구다.
 * 종이 결이 또렷이 드러나 아이들이 아는 "색칠공부 색연필" 질감이 된다.
 */
export class ColorPencil extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "colorpencil",
        tip: "rough", // 색심 입자(크레용과 같은 입자 팁이지만 훨씬 가늘게 씀)
        sizeScale: 0.85, // 입자 팁은 가장자리가 옅어 체감 폭이 좁다 — 배율로 보정(육안 실측)
        spacing: 0.07,
        flow: 1, // 획 버퍼 안은 꽉 — 옅기는 washOpacity가 담당한다(아래)
        jitter: 0.05,
        sizePressure: 0.4,
        alphaPressure: 0.55, // 살살 그으면 옅고 꾹 누르면 진한, 색연필의 핵심 반응
        minSizeRatio: 0.65,
        composite: "source-over", // 획끼리는 buildup — 문지를수록 진해진다
        // ⚠️ 한 획 안은 wash(균일), 획끼리만 겹침 — buildup으로 두면 획 내부의 dab 겹침이
        // 먼저 포화돼(1회칠에 이미 진함) "겹쳐 쌓는" 색연필의 정체성이 사라진다(실측: 1회 vs 3회 Δ6).
        strokeBlend: "wash",
        washOpacity: 0.78, // 1회칠 = 반투명 한 겹(진하기 슬라이더와 곱해진다)
        rotationFollowsStroke: true,
        paperGrain: 0.35, // 심이 종이 요철 봉우리에만 묻는 색연필 특유의 흰 틈
        // 얇은 획에서는 그 흰 틈이 획 폭 안에 못 들어간다 → 길이 방향 농담으로 환산
        thinGrain: 0.62,
        speedAlpha: 0.18, // 연필과 같은 계열이되 심이 무르니 낙폭은 작게
      },
      rng,
    );
  }
}
