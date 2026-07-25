import { BrushBase } from "./BrushBase";

/**
 * 사인펜(수성 펠트펜): 굵기가 거의 일정한 또렷한 선 + 꽉 찬 잉크.
 * 마커와의 구분점 — 마커는 납작촉(방향에 따라 굵기가 변함, 넓은 면 칠하기),
 * 사인펜은 둥근 촉의 가는 선(글씨·테두리·만화 선). 필압 반응은 거의 없다(균일 잉크).
 * 겹침은 마커와 같은 darken 포화(같은 색을 여러 번 그어도 얼룩지지 않는다).
 */
export class SignPen extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "signpen",
        tip: "hard", // 가장자리가 또렷한 둥근 촉(연필의 입자결과 대비)
        sizeScale: 0.55, // 연필(0.45)보다 살짝 굵고 마커(1.05)보다 훨씬 가늘게
        spacing: 0.05,
        flow: 1,
        jitter: 0,
        sizePressure: 0.08, // 잉크펜은 눌러도 굵기가 거의 안 변한다
        alphaPressure: 0.08,
        minSizeRatio: 0.92,
        composite: "darken", // 같은 색 겹침 포화(multiply면 겹칠수록 무한히 진해져 얼룩)
        strokeBlend: "wash", // 한 획 안은 균일한 잉크(자기 교차 자국 없음)
        washOpacity: 1,
        paperGrain: 0.05, // 종이 결은 아주 살짝만(펠트펜은 잉크가 결을 메운다)
        thinGrain: 0.05, // 잉크펜 = 가늘어도 끝까지 균일(연필·크레용과의 대비점)
      },
      rng,
    );
  }
}
