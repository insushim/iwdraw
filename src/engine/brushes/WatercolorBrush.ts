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
        // 간격 사슬 실패 이력 양쪽: 0.24~0.4 성긴 간격 + 큰 크기편차 = "점점점 에어브러시
        // 사슬"(2026-07-10 사용자 실측), wash(MAX) 시절 0.15 = 균일 리본. 정답은
        // 촘촘한 간격(연속 획) + 질감은 dab이 아니라 획 방향 붓결(streaks)로.
        spacing: 0.13,
        // 반투명 dab 누적: 중심선 ~6겹 → 유효 α ~0.7, 외곽은 옅게 = 자연스러운 농담
        // (edgeNoise 전면 침식 제거 후 유효 α가 올라 0.22→0.18 보정 — 원본 한 획 12~18%)
        flow: 0.18,
        jitter: 0.03,
        sizePressure: 0.3, // 굵기 변동 크면 획 머리가 볼록해진다 — 워시는 폭이 고른 게 자연스럽다
        alphaPressure: 0.12,
        minSizeRatio: 0.5,
        // 붓결: 팁 스트릭 맵이 획 진행 방향을 따라 이어지도록 회전 추종(유화·붓펜과 동일 원리)
        rotationFollowsStroke: true,
        streaks: 0.32,
        // glaze: 겹침이 multiply로 점진 누적, 획³에서 포화(전수검수: 원본은 6~8겹 포화).
        // darken(min) 수렴=겹침 0(플랫 마커), 순수 multiply=무한 어두워짐(얼룩) — 둘 다 실측 실패.
        composite: "glaze",
        // 종이결 이빨 — ⚠️ cotton 결은 1~2px 초고주파라 buildup 누적(획 내 6겹+)에서
        // 침식이 복리로 쌓여 "점" 반점이 된다(0.12, 물양 낮은 진한 칠에서 사용자 실측
        // 2026-07-10 "점이 보여 거슬려"; 0.04에도 잔점 지적 2026-07-11 → 0.02).
        // i-scream 원본엔 granulation이 거의 없다 — 내부 질감은 washCloud 구름·
        // 붓결 streaks·안료고갈 드리프트가 담당.
        paperGrain: 0.02,
        strokeBlend: "buildup",
        washOpacity: 1,
        opacityAsDilution: true, // 진하기 슬라이더도 알파가 아니라 희석으로(아래 makeDab)
        // 농담 구름: 전수검수 — 원본 내부 변동의 60~70%가 90~300px 구름형(진폭 10~20%p),
        // 백화보다 "안료 고임(진해짐)"이 주력(셰이더에서 비대칭 처리).
        // 큰 물번짐·안료고임 상향(codex 비전 2차) — 0.5 실패 이력은 구 대칭 공식(어두운 색
        // 흰 얼룩)이고 현행은 고임 주력 비대칭이라 0.48까지 안전
        washCloud: 0.48,
        // 가장자리 스밈: dab 알파<1 영역을 캔버스 고정 노이즈로 침식. buildup에서는
        // dab 전면(α~0.5)에 걸리므로 wash 시절 0.85는 과침식. 0.45는 실루엣이 너무
        // 균일하게 흐림(codex 비전 2차) — 불규칙 파단 강화
        edgeNoise: 0.62,
        // 전수검수: 진한 테는 둘레의 20~35%에만 4~9% — 균일 테는 스티커/마커로 읽힘.
        wetEdge: 0.22,
      },
      rng,
    );
    this.rng2 = rng ?? Math.random;
  }

  /** 뭉게 실루엣용 거리 누적(획 시작에서 리셋) — 벌지·로브 위상은 시간이 아니라
   * 이동 거리 기반(속도 무관, codex 교차설계 2026-07-11) */
  private dabDist = 0;
  private lastDab: { x: number; y: number } | null = null;
  private sinceLobe = 0;

  protected override makeDab(p: StrokePoint, angle: number): Dab {
    const dab = super.makeDab(p, angle);
    const w = this.settings.waterAmount;
    dab.size *= 1 + w * 0.35; // 물이 많을수록 넓게 퍼진다

    // ── 뭉게 실루엣(2026-07-11 사용자: "테두리가 너무 균일") ──
    // 원본(i-scream)의 워시는 폭이 저주파로 크게 출렁이고 둘레에 둥근 로브가 겹친
    // 콜리플라워 실루엣. ① 크기 벌지 + ② 중심 횡변위를 서로 다른 위상의 저주파로
    // 주면 좌/우 가장자리가 독립적으로 출렁인다(대칭이면 "숨 쉬는 리본").
    // 주기 3.4×/5.6×size 두 사인 합성, 결정론(strokeSeed) — 랜덤 노이즈는 지저분.
    if (this.lastDab) this.dabDist += Math.hypot(p.x - this.lastDab.x, p.y - this.lastDab.y);
    this.lastDab = { x: p.x, y: p.y };
    const sz = dab.size;
    const d = this.dabDist;
    const bulge =
      Math.sin(d / (sz * 0.44) + this.strokeSeed * 9) * 0.6 +
      Math.sin(d / (sz * 0.73) + this.strokeSeed * 23) * 0.4;
    dab.size *= 1 + (0.16 + 0.2 * w) * bulge;
    const shift =
      Math.sin(d / (sz * 0.61) + this.strokeSeed * 41) * 0.5 +
      Math.sin(d / (sz * 1.05) + this.strokeSeed * 67) * 0.5;
    const px = -Math.sin(angle);
    const py = Math.cos(angle);
    const shiftAmp = sz * 0.11 * shift;
    dab.x += px * shiftAmp;
    dab.y += py * shiftAmp;
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
    // per-dab 물 고임/마름 편차 — dab 단위 랜덤이어도 안전: 획 간 겹침은 glaze가
    // bound하고, 획 내 누적은 over 블렌드라 수렴 강박이 없다.
    // ⚠️ 편차 과대(알파 ±33%·크기 ±42%) + 성긴 간격 = "점점점 사슬"(2026-07-10 실측)
    // — 촘촘한 간격에선 소폭이면 충분(질감 주력은 붓결 streaks·안료고갈 드리프트).
    dab.alpha = clamp(this.cfg.flow * alphaK * (0.8 + this.rng2() * 0.4), 0.05, 1);
    dab.size *= 0.94 + this.rng2() * 0.12;
    return dab;
  }

  /** 획별 시드 — 안료 고갈 랜덤워크의 위상(같은 획 안에선 결정론, 획마다 다름) */
  private strokeSeed = 1.7;

  override begin(p: StrokePoint, settings: Parameters<BrushBase["begin"]>[1]): Dab[] {
    // p.t(타임스탬프)로 획마다 위상을 바꾼다 — Math.random 없이 결정론적 다양성
    this.strokeSeed = (p.t % 10000) * 0.00063;
    this.dabDist = 0;
    this.lastDab = null;
    this.sinceLobe = 0;
    return super.begin(p, settings);
  }

  /** 뭉게 로브: 본획 둘레에 반쯤 묻힌 "묽은 물" 위성 dab(콜리플라워 실루엣의 둥근 혹).
   * ⚠️ 안전 조건(점점점 사슬·잉크 방울 재발 방지, codex 교차설계):
   *  · 오프셋 ≤ 0.36×size — 본획과 60~80% 겹쳐 "가장자리를 밀어내는 혹"으로만 읽힘
   *  · 색은 본획보다 묽게(흰색 쪽 30%), 알파 0.42× — 물이 번진 자국이지 새 물감이 아님
   *  · 빈도는 거리 기반(1.15×size마다 확률) + 좌/우 랜덤 — 규칙 배열은 기계적 */
  override move(p: StrokePoint): Dab[] {
    const dabs = super.move(p);
    if (!dabs.length) return dabs;
    const w = this.settings.waterAmount;
    const out: Dab[] = [];
    for (const dab of dabs) {
      out.push(dab);
      this.sinceLobe += dab.size * this.cfg.spacing; // dab 간격 ≈ size×spacing
      if (this.sinceLobe < dab.size * 0.85) continue;
      this.sinceLobe = 0;
      if (this.rng2() >= 0.28 + 0.25 * w) continue;
      const side = this.rng2() < 0.5 ? -1 : 1;
      // 오프셋 상한 0.28×size — 본획이 얇아진 구간(벌지 골)에서도 로브가 떨어져
      // "잉크 방울"로 읽히지 않게(v2 렌더 실측: 0.34는 반쯤 분리된 혹 발생)
      const off = dab.size * (0.18 + 0.16 * w);
      const px = -Math.sin(dab.rotation);
      const py = Math.cos(dab.rotation);
      const c = dab.color!;
      // 원본 로브는 본획과 같은 톤의 "둥근 혹" — 너무 옅으면(α0.42×·백화30%) 로브가
      // 안개로 뭉개져 경계가 사라진다(1차 렌더 실측) → 같은 톤에 가깝게, 살짝만 묽게
      out.push({
        x: dab.x + px * off * side,
        y: dab.y + py * off * side,
        size: dab.size * (0.68 + 0.27 * w),
        alpha: Math.max(0.04, dab.alpha * 0.75),
        rotation: dab.rotation,
        color: {
          r: Math.round(c.r + (255 - c.r) * 0.12),
          g: Math.round(c.g + (255 - c.g) * 0.12),
          b: Math.round(c.b + (255 - c.b) * 0.12),
        },
      });
    }
    return out;
  }
}
