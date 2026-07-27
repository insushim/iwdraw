import { BrushBase } from "./BrushBase";

/**
 * 마커: 납작촉(flat 팁)이 스트로크 방향으로 회전 — 방향 따라 굵기가 변하는 챠콜펜 느낌.
 * 겹침은 darken 포화(1~2겹 진해진 뒤 멈춤 — 실제 마커), 필압 영향은 거의 없음(균일 잉크).
 */
export class Marker extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "marker",
        tip: "flat",
        sizeScale: 1.05,
        spacing: 0.04,
        flow: 1,
        jitter: 0,
        sizePressure: 0.05,
        alphaPressure: 0.05,
        minSizeRatio: 0.95,
        // darken(포화형): multiply는 겹칠수록 무한히 어두워져 "중첩 버그"로 읽힘
        // (2026-07-07 사용자 실측). darken은 같은 색 1~2겹 후 포화 = 실제 마커,
        // 다른 색 겹침은 어두운 쪽으로 자연 혼색.
        composite: "darken",
        rotationFollowsStroke: true,
        tipAngleOffset: Math.PI / 2, // 납작촉을 진행방향과 수직으로 → 어느 방향이든 넓은 획
        strokeBlend: "wash", // 한 획 안은 균일한 잉크(겹침 얼룩 없음), 획끼리는 darken 포화
        thinGrain: 0.03, // 잉크 = 균일
        speedAlpha: 0.1, // 잉크가 풍부해 거의 균일(사인펜과의 대비점)
        washOpacity: 1, // 진하기 100% = 같은 색 겹침 완전 균일(낙서 채우기 얼룩 제거, 2026-07-07 실측
        // 0.85→낙차 32, 0.93→17). 반투명 레이어링은 진하기 슬라이더를 낮추면 여전히 가능
      },
      rng,
    );
  }
}
