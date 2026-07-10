import { BrushBase } from "./BrushBase";
import type { Dab, StrokePoint } from "../types";

/**
 * 수채붓: 크고(1.8배) 옅은 wet 팁 + 종이 결 침식 + 마름 가장자리(wet edge).
 * 물 양·진하기는 알파가 아니라 "물감 농도"(흰색 희석)로 표현한다 — 아래 makeDab 참조.
 */
export class WatercolorBrush extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "watercolor",
        tip: "wet",
        // 팁 플래토 0.8 기준 보정(체감 획 폭 유지, 2026-07-10 팁 재작업 2차)
        sizeScale: 1.9,
        spacing: 0.15,
        flow: 1,
        jitter: 0.02,
        sizePressure: 0.3, // 굵기 변동 크면 획 머리가 볼록해진다 — 워시는 폭이 고른 게 자연스럽다
        // 필압→알파 변동 최소화 — 획마다 알파가 다르면 겹침 수렴이 깨져 경계 단차가 남는다
        alphaPressure: 0.08,
        minSizeRatio: 0.5,
        // glaze: 겹침이 multiply로 점진 누적, 획⁴에서 포화(전수검수: 원본은 6~8겹 포화).
        // darken(min) 수렴=겹침 0(플랫 마커), 순수 multiply=무한 어두워짐(얼룩) — 둘 다 실측 실패.
        composite: "glaze",
        paperGrain: 0.07, // 모래알 반점 억제 — 0.18도 클로즈업에서 점 노이즈로 읽힘(2026-07-10 2차). 수채감은 농담 구름·가장자리 스밈이 담당
        strokeBlend: "wash", // 획 내부 균일(겹침 스캘럽 제거)
        // ⚠️ washOpacity·알파로 옅음을 만들면 안 된다 — 획 전체 알파가 1 미만이면
        // darken이어도 겹칠 때마다 min 쪽으로 한 스텝씩 어두워져 획 경계가 얼룩으로
        // 남는다(2026-07-10 사용자 실측, i-scream 대비 어색). 옅음은 전부 색 희석이 담당.
        washOpacity: 1,
        opacityAsDilution: true, // 진하기 슬라이더도 알파가 아니라 희석으로(아래 makeDab)
        // 농담 구름: 전수검수 — 원본 내부 변동의 60~70%가 90~300px 구름형(진폭 10~20%p),
        // 백화보다 "안료 고임(진해짐)"이 주력(셰이더에서 비대칭 처리 — 어두운 색의 흰
        // 얼룩은 지운 자국으로 읽혀 luma 비례로만 백화).
        washCloud: 0.4,
        // 가장자리 스밈: 넓은 팁 폴오프(알파<1 영역)를 캔버스 고정 노이즈로 침식 —
        // 딱딱한 스티커 테두리 대신 종이에 스며든 실루엣(i-scream 수채의 핵심 인상)
        edgeNoise: 0.85,
        // 전수검수: 진한 테는 둘레의 20~35%에만 4~9% — 균일 테는 스티커/마커로 읽힘.
        // 노이즈 변조 링(applyWetEdge)이 선택성을 담당하므로 전체 강도는 낮게.
        wetEdge: 0.22,
      },
      rng,
    );
  }

  protected override makeDab(p: StrokePoint, angle: number): Dab {
    const dab = super.makeDab(p, angle);
    const w = this.settings.waterAmount;
    dab.size *= 1 + w * 0.35; // 물이 많을수록 넓게 퍼진다
    // 물 양·진하기 → 물감 농도(흰색 희석). 전수검수(2026-07-10): 원본 한 획 유효 농도
    // 12~18% — 우리 이전 값(기본 물 60%에서 ~43%)은 2배 이상 진해 겹침 누적 여지가
    // 없었다("연한 마커"의 절반은 이것). 물 0%=진한 안료(~64%), 60%=워시(~22%), 100%=아주 옅게.
    // (0.36+0.7w는 원본보다 중·저명도 16~18 밝음 — codex 최종 비교 판정으로 소폭 하향)
    const base = Math.min(0.85, 0.32 + w * 0.68);
    // 안료 고갈 드리프트: 획을 따라 농도가 완만한 랜덤워크(원본의 "붓자국 트레일" —
    // 전수검수: 획별 buildup 45~55% + 획 내 고갈 25~35%가 붓자국의 정체). p.t 기반
    // 결정론(두 사인 합성 의사 랜덤워크), 글레이즈 바닥·스냅 클램프가 폭주를 막는다.
    const drift =
      Math.sin(p.t * 0.004 + this.strokeSeed) * 0.5 + Math.sin(p.t * 0.0016 + this.strokeSeed * 2.7) * 0.5;
    const dilute = Math.min(0.9, Math.max(0.1, base + drift * 0.08));
    const density = (1 - dilute) * this.settings.opacity;
    const c = this.settings.color;
    dab.color = {
      r: Math.round(255 - (255 - c.r) * density),
      g: Math.round(255 - (255 - c.g) * density),
      b: Math.round(255 - (255 - c.b) * density),
    };
    // 팁 플래토(0.94)×필압 잔변동을 뚫고 획 내부 알파를 1로 포화 — 셰이더/2D가 클램프.
    // 내부가 1이어야 획 내부가 균일하고(dab 자국 없음) 옅음은 전부 색 희석이 담당한다.
    dab.alpha = Math.min(1.6, dab.alpha * 1.35);
    return dab;
  }

  /** 획별 시드 — 안료 고갈 랜덤워크의 위상(같은 획 안에선 결정론, 획마다 다름) */
  private strokeSeed = 1.7;

  override begin(p: StrokePoint, settings: Parameters<BrushBase["begin"]>[1]): Dab[] {
    // p.t(타임스탬프)로 획마다 위상을 바꾼다 — Math.random 없이 결정론적 다양성
    this.strokeSeed = (p.t % 10000) * 0.00063;
    return super.begin(p, settings);
  }
}
