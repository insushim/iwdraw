import { BrushBase } from "./BrushBase";
import type { Dab, StrokePoint } from "../types";
import { clamp } from "../types";

/**
 * 수채붓: 크고(1.9배) 옅은 wet 팁의 반투명 dab을 "점점이" 누적(buildup).
 * i-scream 원본의 붓자국은 에어스프레이처럼 낱낱의 dab이 이어진 질감이다 —
 * wash(MAX)는 획 전체가 균일한 단일 리본이 되어 붓 질감이 죽는다(2026-07-10 사용자
 * 실측, 원본 대비). dab 겹침 부위가 진해지는 buildup이 원본의 생성 방식과 같다.
 * 물 양·진하기는 알파가 아니라 "물감 농도"(흰색 희석)로 표현한다 — 아래 makeDab 참조.
 * 획 간 겹침 폭주는 glaze 합성(compositeGlaze)이 bound하므로 획 내 반투명·질감은 자유.
 */
export class WatercolorBrush extends BrushBase {
  /** BrushBase.rng는 private — dab 질감 편차용 자체 참조 */
  private rng2: () => number;

  constructor(rng?: () => number) {
    super(
      {
        id: "watercolor",
        tip: "wet",
        // 팁 플래토 0.8 기준 보정(체감 획 폭 유지, 2026-07-10 팁 재작업 2차)
        sizeScale: 1.9,
        // dab이 낱낱이 보이는 점점이 간격 — 0.15는 연속 리본(붓자국 소멸),
        // 0.4는 동전 찍은 듯 기계적(실측+codex 비전: 반복이 규칙적) — 겹침·지터로 흩뜨림
        spacing: 0.24,
        // 반투명 dab 누적: 중심선 ~3겹 → 유효 α ~0.75, 외곽 1겹 = 농담 트레일
        flow: 0.38,
        jitter: 0.07,
        sizePressure: 0.3, // 굵기 변동 크면 획 머리가 볼록해진다 — 워시는 폭이 고른 게 자연스럽다
        alphaPressure: 0.12,
        minSizeRatio: 0.5,
        // glaze: 겹침이 multiply로 점진 누적, 획³에서 포화(전수검수: 원본은 6~8겹 포화).
        // darken(min) 수렴=겹침 0(플랫 마커), 순수 multiply=무한 어두워짐(얼룩) — 둘 다 실측 실패.
        composite: "glaze",
        paperGrain: 0.09, // 종이 결 흰 리프트 소폭(codex 비전: 원본은 종이결이 더 남음) — 0.18은 점 노이즈(실측)
        strokeBlend: "buildup",
        washOpacity: 1,
        opacityAsDilution: true, // 진하기 슬라이더도 알파가 아니라 희석으로(아래 makeDab)
        // 농담 구름: 전수검수 — 원본 내부 변동의 60~70%가 90~300px 구름형(진폭 10~20%p),
        // 백화보다 "안료 고임(진해짐)"이 주력(셰이더에서 비대칭 처리).
        washCloud: 0.4,
        // 가장자리 스밈: dab 알파<1 영역을 캔버스 고정 노이즈로 침식. buildup에서는
        // dab 전면(α~0.5)에 걸리므로 wash 시절 0.85는 과침식 — 절반으로.
        edgeNoise: 0.45,
        // 전수검수: 진한 테는 둘레의 20~35%에만 4~9% — 균일 테는 스티커/마커로 읽힘.
        wetEdge: 0.22,
      },
      rng,
    );
    this.rng2 = rng ?? Math.random;
  }

  protected override makeDab(p: StrokePoint, angle: number): Dab {
    const dab = super.makeDab(p, angle);
    const w = this.settings.waterAmount;
    dab.size *= 1 + w * 0.35; // 물이 많을수록 넓게 퍼진다
    // 물 양·진하기 → 물감 농도(흰색 희석). 전수검수(2026-07-10): 원본 한 획 유효 농도
    // 12~18%. buildup 유효 α ~0.8을 감안해 wash 시절(base 0.32+0.68w)보다 살짝 진하게 —
    // 시각 농도 = α × (1−희석색) 이 동일해지는 지점. 히스토그램(p5/p95)으로 재보정.
    const base = Math.min(0.88, 0.26 + w * 0.68);
    // 안료 고갈 드리프트: 획을 따라 농도가 완만한 랜덤워크(원본의 "붓자국 트레일").
    // p.t 기반 결정론(두 사인 합성 의사 랜덤워크), 글레이즈 바닥이 폭주를 막는다.
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
    // buildup의 super는 알파에 진하기(opacity)를 곱한다 — 수채는 진하기를 희석으로
    // 소비하므로(위 density) 알파는 flow·필압만으로 직접 계산(이중 적용 방지).
    const pr = clamp(p.pressure, 0, 1);
    const alphaK = 1 - this.cfg.alphaPressure * (1 - pr);
    // per-dab 물 고임/마름 편차 — 점점이 질감의 핵심. dab 단위 랜덤이어도 안전:
    // 획 간 겹침은 glaze가 bound하고, 획 내 누적은 over 블렌드라 수렴 강박이 없다.
    dab.alpha = clamp(this.cfg.flow * alphaK * (0.65 + this.rng2() * 0.65), 0.05, 1);
    dab.size *= 0.78 + this.rng2() * 0.42; // dab 크기 편차 — 규칙적 반복 흩뜨림(codex 비전 제안 35~50%)
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
