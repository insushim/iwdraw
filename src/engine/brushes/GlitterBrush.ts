import { BrushBase, MIN_DAB_PX } from "./BrushBase";
import { clamp, dist, type Dab, type RGB, type StrokePoint } from "../types";

/**
 * 반짝이(글리터) 펜: 진한 젤 잉크 리본 + 그 위에 흩뿌려진 밝은 반짝 입자.
 *
 * 구현 원칙(웨일북 저사양 호환이 1급 요구):
 * - 애니메이션·셰이더 추가 없음 — 기존 dab 파이프라인만 사용(무지개 dab.color 오버라이드와
 *   동일 경로라 GL/Canvas2D 양쪽·undo·협동·프리뷰=최종이 전부 공짜로 성립).
 * - buildup + source-over + 알파 1(불투명): 같은 색 겹침 얼룩 없음(불투명이라 수렴 걱정 無).
 * - 반짝 입자는 "이미 지나간 자리"(진행 반대쪽 한 dab 뒤)에 찍는다 — 앞에 찍으면
 *   다음 베이스 dab들이 그대로 덮어 획 꼬리만 반짝이는 버그가 된다.
 * - 입자 수는 이동 거리 기반 예산(획 폭의 0.38배마다 1개) — dab 수 폭증 방지(성능 캡).
 */
export class GlitterBrush extends BrushBase {
  /** BrushBase.rng가 private이라 같은 생성자 인자를 자체 필드로도 보관(동일 함수 참조).
   * ⚠️ 협동·무비 재생은 seed 없이 브러시를 재생성하므로 입자 배치가 재생마다 달라진다 —
   * 수채 dab 편차·무지개와 동일한 수용된 한계(반짝임의 "느낌"은 동일, 픽셀 위치만 상이). */
  private rng2: () => number;
  /** 입자 예산 누적 거리 */
  private sparkleResidual = 0;
  private prevPt: StrokePoint | null = null;
  private totalLen = 0;
  /** 마지막 세그먼트의 진행 각 — end()의 끝 입자 산포축이 실제 획 방향을 따르게 */
  private lastAngle = 0;
  /** 브러시색당 입자 이산 팔레트(캐시) — 색이 바뀔 때만 재생성 */
  private paletteCache: RGB[] | null = null;
  private paletteKey = "";

  constructor(rng?: () => number) {
    super(
      {
        id: "glitter",
        tip: "hard", // 또렷한 젤 잉크 리본(입자가 얹힐 무대)
        sizeScale: 0.8, // 사인펜(0.55)과 마커(1.05) 사이 — 젤펜 굵기
        spacing: 0.09,
        flow: 1,
        jitter: 0,
        sizePressure: 0.15, // 젤펜은 눌러도 굵기가 거의 안 변한다
        alphaPressure: 0,
        minSizeRatio: 0.9,
        composite: "source-over", // 불투명 잉크 — 입자(밝은 색)가 위에 얹혀야 하므로 darken 금지
      },
      rng,
    );
    this.rng2 = rng ?? Math.random;
  }

  override begin(p: StrokePoint, settings: Parameters<BrushBase["begin"]>[1]): Dab[] {
    this.sparkleResidual = 0;
    this.prevPt = p;
    this.totalLen = 0;
    this.lastAngle = 0;
    return super.begin(p, settings);
  }

  override move(p: StrokePoint): Dab[] {
    const from = this.prevPt;
    const dabs = super.move(p);
    // begin() 없이 불린 비정상 시퀀스 — 부모처럼 no-op(prevPt를 여기서 세팅하면
    // settings 미할당 상태의 end()가 TypeError를 낸다. prevPt는 begin에서만).
    if (!from) return dabs;
    const segLen = dist(from.x, from.y, p.x, p.y);
    if (segLen === 0) return dabs;

    const size = Math.max(MIN_DAB_PX, this.settings.size * this.cfg.sizeScale);
    const angle = Math.atan2(p.y - from.y, p.x - from.x);
    this.lastAngle = angle;
    this.totalLen += segLen;
    this.sparkleResidual += segLen;

    // 획 폭 0.2배마다 입자 1개 — 촘촘하되 베이스 dab 수(spacing 0.09)의 절반 수준(성능 캡).
    // 이벤트당 상한 10개: 포인터가 한 이벤트에 크게 점프해도(저사양 이벤트 배칭) 입자가
    // 한 프레임에 수십 개 몰리지 않게 — 초과분 예산은 버린다(밀도 일관 유지).
    const budgetStep = Math.max(2, size * 0.2);
    let sparkleCount = 0;
    while (this.sparkleResidual >= budgetStep && sparkleCount < 10) {
      this.sparkleResidual -= budgetStep;
      sparkleCount++;
      // 획 머리 밖으로 나가지 않게 — 지나온 길이 안에서만 뒤로 물러난다.
      // 역추적은 현재 세그먼트의 직선 각도만 쓰므로, 급회전 직후 짧은 세그먼트에서
      // 세그먼트 시작점을 크게 넘으면 코너 안쪽 리본 밖으로 튄다 → 살짝 너머까지만 허용.
      const back = Math.min(this.totalLen, segLen + size * 0.3, size * (0.5 + this.rng2() * 1.1));
      if (back < size * 0.4) continue; // 아직 리본이 안 깔린 곳 = 튄 방울로 보임 → 스킵
      dabs.push(this.sparkleDab(p, angle, back, size));
    }
    if (this.sparkleResidual >= budgetStep) this.sparkleResidual = 0; // 캡 초과 예산 폐기
    this.prevPt = p;
    return dabs;
  }

  override end(): Dab[] {
    const out = super.end();
    // 획 끝(탭 점 포함)에도 반짝 한두 개 — 점만 찍어도 반짝이 펜답게
    if (this.prevPt) {
      const size = Math.max(MIN_DAB_PX, this.settings.size * this.cfg.sizeScale);
      // 산포축이 실제 진행 방향을 따라야 대각선 획 끝에서 입자가 리본 밖으로 안 튄다
      out.push(this.sparkleDab(this.prevPt, this.lastAngle, 0, size));
      if (this.totalLen > size) out.push(this.sparkleDab(this.prevPt, this.lastAngle, size * 0.4, size));
    }
    this.prevPt = null;
    return out;
  }

  /**
   * 브러시색당 입자 이산 팔레트(≤12색): 순백 글린트 + 하이라이트 3단 + 무지개 틴트 4종
   * (+ 밝은 색 획에만 다크 스펙 2단). 순백·하이라이트를 중복 배치해 출현 빈도에 가중.
   */
  private palette(): RGB[] {
    const c = this.settings.color;
    const key = `${c.r},${c.g},${c.b}`;
    if (this.paletteCache && this.paletteKey === key) return this.paletteCache;
    const lift = (t: number): RGB => ({
      r: Math.round(c.r + (255 - c.r) * t),
      g: Math.round(c.g + (255 - c.g) * t),
      b: Math.round(c.b + (255 - c.b) * t),
    });
    const tint = (dr: number, dg: number, db: number): RGB => {
      const h = lift(0.75);
      return {
        r: clamp(h.r + dr, 0, 255),
        g: clamp(h.g + dg, 0, 255),
        b: clamp(h.b + db, 0, 255),
      };
    };
    const white: RGB = { r: 255, g: 255, b: 255 };
    const out: RGB[] = [
      white,
      white, // 순백 글린트 가중 ×2
      lift(0.65),
      lift(0.8),
      lift(0.95),
      lift(0.8), // 하이라이트 가중
      tint(28, -6, 10), // 핑크빛
      tint(20, 16, -14), // 금빛
      tint(-16, 12, 24), // 하늘빛
      tint(6, -12, 28), // 보랏빛
    ];
    const lum = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
    if (lum > 140) {
      // 밝은 색 획 전용 다크 스펙 — 흰 입자가 묻히는 자리를 어두운 은박이 채운다
      out.push(
        { r: Math.round(c.r * 0.5), g: Math.round(c.g * 0.5), b: Math.round(c.b * 0.5) },
        { r: Math.round(c.r * 0.35), g: Math.round(c.g * 0.35), b: Math.round(c.b * 0.35) },
      );
    }
    this.paletteCache = out;
    this.paletteKey = key;
    return out;
  }

  /** 반짝 입자 1개 — 진행 반대쪽 back px 뒤, 획 폭 안 수직 산포 */
  private sparkleDab(p: StrokePoint, angle: number, back: number, size: number): Dab {
    const r = this.rng2;
    // 획 폭 안(±0.3)으로 제한 — 밖으로 나가면 "잉크 튄 방울"(fringe 실패 이력과 동일)
    const lateral = (r() - 0.5) * 2 * 0.3 * size;
    const px = -Math.sin(angle);
    const py = Math.cos(angle);
    // 입자 색 = 브러시색당 "이산 팔레트"에서 뽑는다(연속 랜덤 금지).
    // ⚠️ Canvas2D 폴백의 tinted() 캐시가 정확한 RGB를 키로 쓰므로, dab마다 연속 랜덤 색이면
    // 캐시 미스 100% → 매 dab 팁 캔버스 재생성 → 웨일북 렉(실측: 크레용 27ms vs 471ms).
    // 유화 드리프트의 "색 4단계 양자화" 교훈과 같은 함정 — 팔레트 크기 ≤12로 캐시가 즉시 포화된다.
    const pal = this.palette();
    const color = pal[Math.floor(r() * pal.length)];
    // 크기 이중 분포: 대부분 잔입자 + 가끔(18%) 큰 글린트 — 실물 글리터의 성단 느낌
    const big = r() < 0.18;
    const sizeK = big ? 0.24 + r() * 0.12 : 0.12 + r() * 0.1;
    return {
      x: p.x - Math.cos(angle) * back + px * lateral,
      y: p.y - Math.sin(angle) * back + py * lateral,
      // 최소 2.4px(서브픽셀 증발 방지 — MIN_DAB_PX 불변식)
      size: Math.max(MIN_DAB_PX, size * sizeK),
      // 진하기 슬라이더를 입자에도 반영 — 옅게 그린 리본 위에 입자만 쨍하면 이질적
      alpha: clamp((0.85 + r() * 0.15) * this.settings.opacity, 0.05, 1),
      rotation: 0, // 소형 hard dab — 회전 무의미(ROT_JITTER_MIN_PX 취지와 동일)
      color,
    };
  }
}
