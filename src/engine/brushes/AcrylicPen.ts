import { BrushBase } from "./BrushBase";

/**
 * 아크릴펜(아크릴 물감 마카): 완전 불투명한 물감이 얹히는 펜.
 * 다른 도구와의 구분점 —
 *  · 마커: 반투명(darken) → 검은 선 위에 노랑을 칠해도 선이 비친다.
 *  · 아크릴펜: 불투명(source-over) → 어두운 색 위에 밝은 색이 그대로 덮인다(포스터·간판 글씨).
 *  · 유화붓: 붓결(bristle 스트릭)·젖은 물감 섞임 → 펜이 아니라 붓.
 * 촉은 둥글고 굵기가 거의 일정(필압 반응 최소), 마른 뒤의 매트한 물감 면을 종이 결 살짝 + 얕은
 * 임파스토(가장자리 두께감)로 표현한다.
 *
 * ⚠️ 성능: wetMix(밑색 샘플링)·강한 streaks처럼 dab마다 픽셀을 읽는 기능은 쓰지 않는다 —
 * 저사양 기기(웨일북) 렉의 원인이 되는 경로를 늘리지 않기 위해서(2026-07-14 사용자 요청).
 * 기존 dab 파이프라인만 사용하므로 마커·사인펜과 프레임 비용이 같다.
 */
export class AcrylicPen extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "acrylic",
        tip: "hard", // 가장자리가 또렷한 둥근 촉(물감 마카)
        sizeScale: 0.95, // 사인펜(0.55)보다 굵고 마커(1.05)보다 살짝 가늘게
        spacing: 0.05,
        flow: 1,
        jitter: 0.01,
        sizePressure: 0.12, // 펜이라 눌러도 굵기 변화 최소
        alphaPressure: 0.05, // 물감은 불투명 — 속도가 빨라도 옅어지지 않는다
        minSizeRatio: 0.88,
        composite: "source-over", // 덮어쓰기 = 어두운 밑색 위에도 밝은 색이 그대로 얹힌다
        strokeBlend: "wash", // 한 획 안 자기 교차 자국 없음(균일한 물감 면)
        washOpacity: 1,
        paperGrain: 0.1, // 마른 아크릴의 아주 옅은 결(유화 0.38처럼 캔버스가 드러나지 않게)
        thinGrain: 0.04, // 물감 마카 = 균일한 선
        speedAlpha: 0.08, // 물감 마카 = 거의 균일
      },
      rng,
    );
  }
}
