import { BrushBase, softFloorSize } from "./BrushBase";
import type { Dab, StrokePoint } from "../types";

/**
 * 붓펜(먹붓): 한국 서예 붓의 먹 표현.
 * - 필압·속도 → 굵기가 크게 출렁(sizePressure 0.85) = 삐침·파임의 캘리그래피 획
 * - 꾹 누르면 갈필 골까지 포화된 진한 먹, 살짝·빠르게 스치면 골이 드러나는 갈필(비백)
 * - 획 양끝은 fringe 테이퍼(붓끝이 모이며 갈라지는 마른 꼬리)
 * - wetEdge로 실루엣 가장자리에 먹이 몰리는 번짐 테
 */
export class InkBrush extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "inkbrush",
        tip: "ink",
        sizeScale: 1.15,
        spacing: 0.07, // 골이 이어지도록 촘촘히(유화 bristle과 같은 원리)
        flow: 1,
        jitter: 0.012,
        sizePressure: 0.85, // 붓은 필압·속도에 굵기가 민감 — 캘리그래피 획의 핵심
        alphaPressure: 0, // 알파는 아래 makeDab이 필압으로 직접(골 포화 제어)
        minSizeRatio: 0.12, // 붓끝만 닿으면 아주 가늘게
        composite: "source-over",
        rotationFollowsStroke: true, // 갈필 골이 획 방향을 따라 이어진다
        paperGrain: 0.24, // 화선지 스밈 — 알파 침식(grainLift=false)
        strokeBlend: "wash", // 획 내부 균일 + 골 질감 보존(겹침 포화 방지)
        washOpacity: 1, // 먹은 불투명 — 알파 낮으면 겹침 단차(수채 교훈)
        wetEdge: 0.4, // 마르며 가장자리에 먹 몰림(번짐 테)
        fringe: 0.85, // 양끝 마른 붓털 테이퍼
        // 얇은 획에서는 갈필 골(팁 9px+ 필요)이 씻겨 사라진다 — 길이 방향 먹 농담으로 환산
        thinGrain: 0.7,
        // 붓은 굵지만 붓끝은 가장 가는 선을 낸다 — sizeScale 유도값(2.98)은 삐침을 뭉갠다
        minLinePx: 2.2,
      },
      rng,
    );
  }

  protected override makeDab(p: StrokePoint, angle: number): Dab {
    const dab = super.makeDab(p, angle);
    const pr = Math.min(1, Math.max(0, p.pressure));
    // 필압 → 골 포화: 마우스 필압 스팬(0.35~0.85)에서도 대비가 나게 스팬을 넓게.
    // 스치면(0.35) 알파 ~1.05 → 골 노출(갈필), 꾹(0.85~1)이면 1.55~1.7 → 골 포화(진한 먹).
    // ⚠️ super가 계산한 알파를 통째로 덮어쓰므로 얇은 획의 길이 방향 농담(thinGrainK)을
    //    여기서 다시 곱해야 한다 — 안 곱하면 가는 붓펜만 갈필 없이 균일해진다.
    dab.alpha = (0.7 + pr * 1.0) * this.thinGrainK;
    // 굵기도 필압(=마우스는 속도)에 한 번 더 반응 — 빠른 삐침이 확실히 가늘어지게.
    // sizePressure만으로는 마우스 필압 스팬(0.35~0.85)에서 변화가 밋밋하다(실측).
    // ⚠️ 하한 재적용 필수: BrushBase가 보장한 크기에 이 배율(0.45~1.15)을 다시 곱하면
    //   굵기 1에서 dab이 0.6px가 되어 서브픽셀로 증발한다 — 빠르게 그은 얇은 획이
    //   점선이 되거나 아예 안 그려진다(2026-07-13 사용자 실측·e2e 재현).
    //   하드 max가 아니라 softFloorSize여야 필압에 따른 굵기 출렁(캘리그래피)이 하한
    //   부근에서도 살아남는다 — 하드 클램프는 얇은 붓펜을 균일 폭 사인펜으로 만든다.
    //   ⚠️ 압축은 한 번만: super가 이미 압축한 값에 배율을 곱해 다시 압축하면 필압 굵기
    //   폭이 이중으로 좁아진다(실측 굵기 4에서 잉크 변동 texCV 0.205→0.118). 원(raw)
    //   크기에서 배율까지 곱한 뒤 한 번만 압축한다.
    const c = this.cfg;
    const sizeK = Math.max(c.minSizeRatio, 1 - c.sizePressure * (1 - pr));
    const raw = this.settings.size * c.sizeScale * sizeK * (0.45 + pr * 0.7);
    dab.size = softFloorSize(raw, this.minDabPx);
    return dab;
  }
}
