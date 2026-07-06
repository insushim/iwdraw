import {
  clamp,
  dist,
  type BrushId,
  type BrushSettings,
  type Dab,
  type RGB,
  type StrokePoint,
} from "../types";

/** 브러시 팁 종류 — 백엔드가 이 키로 스탬프 텍스처를 준비한다.
 * bristle-bold = 작은 획용 LOD(붓털 적고 굵게) — 미세 골은 dab이 작아지면 축소로 사라진다 */
export type TipKind =
  | "soft"
  | "hard"
  | "grain"
  | "rough"
  | "chunk"
  | "bristle"
  | "bristle-bold"
  | "flat"
  | "wet"
  | "glow";

/** 백엔드 합성 힌트 (Canvas2D globalCompositeOperation과 호환) */
export type DabComposite = "source-over" | "multiply" | "lighter" | "destination-out";

export interface BrushConfig {
  id: BrushId;
  tip: TipKind;
  /**
   * 같은 '굵기' 슬라이더에서 브러시별 실제 픽셀 크기 배율.
   * 연필(0.45)은 가늘게, 에어브러시(2.5)는 넓게 — 도구 간 체감 차이의 핵심.
   */
  sizeScale: number;
  /** dab 간 간격 = size × spacing */
  spacing: number;
  /** dab 1개 알파 기본값(누적되어 진해짐) */
  flow: number;
  /** 위치 흔들림 = size × jitter */
  jitter: number;
  /** 필압→크기 반영도 0~1 */
  sizePressure: number;
  /** 필압→알파 반영도 0~1 */
  alphaPressure: number;
  /** 필압 최저일 때 크기 하한 비율 */
  minSizeRatio: number;
  composite: DabComposite;
  /** 스트로크 진행 방향으로 팁 회전(유화 bristle, 크레용 결) */
  rotationFollowsStroke: boolean;
  /** 진행 방향 대비 팁 각도 오프셋(rad) — 마커 납작촉을 진행방향과 수직으로(넓은 획) */
  tipAngleOffset: number;
  /** 종이 결 침식 강도 0~1 — endStroke에서 스트로크에 캔버스 질감이 배게 한다 */
  paperGrain: number;
  /** 이동 거리에 따라 hue 회전(무지개) */
  dynamicHue: boolean;
  /**
   * 스트로크 내 겹침 누적 방식.
   * buildup = 겹칠수록 진해짐(연필·크레용·에어브러시).
   * wash = 픽셀별 최대 알파만 유지 → 팁의 붓결/워시 질감이 획 전체에 보존(유화·수채·마커).
   *        획 전체 불투명도는 washOpacity×진하기로 합성 시 1회 적용.
   */
  strokeBlend: "buildup" | "wash";
  /** wash 모드에서 스트로크 전체에 적용되는 기본 불투명도(진하기 슬라이더와 곱) */
  washOpacity: number;
  /** 획 실루엣 가장자리 안료 몰림 0~1(수채 wet edge) — endStroke 후처리 */
  wetEdge: number;
  /** 획 시작·끝의 마른 붓털 트레일 강도 0~1(유화) — 진행 방향으로 저알파 fringe dab */
  fringe: number;
  /** 종이 결을 알파 침식 대신 "색 백화"(흰 캔버스가 물감에 배어남)로 — 획 불투명 유지.
   * 불투명 매체(유화)용: 알파 침식이면 겹친 획이 진해져 반투명 마커로 읽힌다(i-scream 대비 실측) */
  grainLift: boolean;
  /** 붓 방향 밝은 스트릭(마른 붓털 하이라이트) 강도 0~1 — bristle 계열 전용, GL 셰이더 lift */
  streaks: number;
}

const DEFAULTS: Omit<BrushConfig, "id" | "tip"> = {
  sizeScale: 1,
  spacing: 0.18,
  flow: 0.7,
  jitter: 0,
  sizePressure: 0.7,
  alphaPressure: 0.4,
  minSizeRatio: 0.35,
  composite: "source-over",
  rotationFollowsStroke: false,
  tipAngleOffset: 0,
  paperGrain: 0,
  dynamicHue: false,
  strokeBlend: "buildup",
  washOpacity: 1,
  wetEdge: 0,
  fringe: 0,
  grainLift: false,
  streaks: 0,
};

/**
 * 모든 스트로크형 브러시의 공통 구현.
 * 입력 점(보정 후)을 받아 등간격 Dab 스트림을 생성한다 — 순수 로직, DOM/GL 비의존.
 */
export class BrushBase {
  readonly cfg: BrushConfig;
  protected settings!: BrushSettings;
  private last: StrokePoint | null = null;
  /** 다음 dab까지 남은 거리 */
  private residual = 0;
  private traveled = 0;
  /** 결 방향 스무딩(EMA) — dab별 각도 점프가 만드는 줄무늬(마커/유화) 방지 */
  private smoothedAngle: number | null = null;
  /** rotationFollows 브러시의 첫 dab — 방향을 알 수 없어 첫 move까지 보류(시작 블롭 방지) */
  private pendingBegin: StrokePoint | null = null;
  private rng: () => number;

  constructor(cfg: Partial<BrushConfig> & Pick<BrushConfig, "id" | "tip">, rng?: () => number) {
    this.cfg = { ...DEFAULTS, ...cfg };
    this.rng = rng ?? Math.random;
  }

  get id(): BrushId {
    return this.cfg.id;
  }

  begin(p: StrokePoint, settings: BrushSettings): Dab[] {
    this.settings = settings;
    this.last = p;
    this.residual = 0;
    this.traveled = 0;
    this.smoothedAngle = null;
    if (this.cfg.rotationFollowsStroke) {
      // 방향이 정해지기 전 각도 0으로 찍으면 세로획 머리에 가로 블롭이 생긴다 → 보류
      this.pendingBegin = p;
      return [];
    }
    return [this.makeDab(p, 0)];
  }

  move(p: StrokePoint): Dab[] {
    if (!this.last) return [];
    const from = this.last;
    const segLen = dist(from.x, from.y, p.x, p.y);
    // segLen 0(중복 좌표)이면 방향을 알 수 없어 pendingBegin 소비도 다음 유효
    // 세그먼트(또는 end() 안전망)까지 지연한다 — 의도된 동작
    if (segLen === 0) return [];

    const step = Math.max(1, this.settings.size * this.cfg.sizeScale * this.cfg.spacing);
    const dabs: Dab[] = [];
    const angle = this.smoothAngle(Math.atan2(p.y - from.y, p.x - from.x));

    if (this.pendingBegin) {
      // 획 머리의 마른 붓털 트레일(진행 반대 방향) — 방향이 확정된 지금 찍는다
      dabs.push(...this.fringeDabs(this.pendingBegin, angle, -1));
      dabs.push(this.makeDab(this.pendingBegin, angle)); // 보류했던 첫 dab을 실제 방향으로
      this.pendingBegin = null;
    }

    let offset = step - this.residual;
    while (offset <= segLen) {
      const k = offset / segLen;
      const ip: StrokePoint = {
        x: from.x + (p.x - from.x) * k,
        y: from.y + (p.y - from.y) * k,
        pressure: from.pressure + (p.pressure - from.pressure) * k,
        t: from.t + (p.t - from.t) * k,
      };
      dabs.push(this.makeDab(ip, angle));
      offset += step;
    }
    this.residual = segLen - (offset - step);
    this.traveled += segLen;
    this.last = p;
    return dabs;
  }

  end(): Dab[] {
    // 탭(이동 없이 뗌)이면 보류된 첫 dab을 지금이라도 찍는다 — 점 찍기 보장
    const out = this.pendingBegin ? [this.makeDab(this.pendingBegin, 0)] : [];
    // 획 꼬리의 마른 붓털 트레일(진행 방향)
    if (!this.pendingBegin && this.last && this.smoothedAngle !== null) {
      out.push(...this.fringeDabs(this.last, this.smoothedAngle, 1));
    }
    this.pendingBegin = null;
    this.last = null;
    return out;
  }

  /** 획 양끝의 마른 붓 테이퍼 — 진행 방향(dir=+1 꼬리, -1 머리)으로 좁아지며
   * "흩어지는" dab. 일직선 정렬 테이퍼는 끝이 매끈한 캡이 된다 — 작은 점들을
   * 수직으로 흩뿌려 사이사이 종이가 비치는 마른 붓끝(흰 점)을 만든다(i-scream 참조).
   * 알파를 크게 낮추면 유령 같은 반투명 캡(실측) — 크기 축소+산포가 정답 */
  private fringeDabs(p: StrokePoint, angle: number, dir: 1 | -1): Dab[] {
    const c = this.cfg;
    if (!c.fringe) return [];
    const base = this.settings.size * c.sizeScale;
    const steps: Array<[number, number, number, number]> = [
      // [진행 오프셋, 크기 배율, 알파 배율, 수직 산포(±size 비율)]
      [0.1, 0.62, 0.95, 0.06],
      [0.22, 0.4, 0.9, 0.14],
      [0.32, 0.26, 0.85, 0.2],
      [0.42, 0.15, 0.8, 0.26],
      [0.5, 0.09, 0.75, 0.3],
    ];
    const px = -Math.sin(angle); // 진행 수직 방향
    const py = Math.cos(angle);
    const out: Dab[] = [];
    for (const [off, sz, al, scatter] of steps) {
      const d = this.makeDab(p, angle);
      const lateral = (this.rng() - 0.5) * 2 * scatter * base;
      d.x += Math.cos(angle) * dir * base * off + px * lateral;
      d.y += Math.sin(angle) * dir * base * off + py * lateral;
      d.size *= sz;
      d.alpha = Math.max(0.01, d.alpha * c.fringe * al);
      out.push(d);
    }
    return out;
  }

  /** 세그먼트 각도의 언랩 EMA — 짧은 세그먼트의 각도 잡음을 흡수해 결이 이어지게 */
  private smoothAngle(raw: number): number {
    if (this.smoothedAngle === null) {
      this.smoothedAngle = raw;
      return raw;
    }
    let d = raw - this.smoothedAngle;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.smoothedAngle += d * 0.3;
    return this.smoothedAngle;
  }

  protected makeDab(p: StrokePoint, angle: number): Dab {
    const c = this.cfg;
    const s = this.settings;
    const pr = clamp(p.pressure, 0, 1);
    const base = s.size * c.sizeScale;

    const sizeK = 1 - c.sizePressure * (1 - pr);
    const size = Math.max(1, base * Math.max(c.minSizeRatio, sizeK));
    const alphaK = 1 - c.alphaPressure * (1 - pr);
    // wash는 진하기(opacity)를 dab이 아니라 스트로크 합성 시 1회 적용(strokeOpacity)
    const alpha = clamp(c.flow * (c.strokeBlend === "wash" ? 1 : s.opacity) * alphaK, 0.01, 1);

    const j = c.jitter * base;
    const dab: Dab = {
      x: p.x + (j ? (this.rng() - 0.5) * j : 0),
      y: p.y + (j ? (this.rng() - 0.5) * j : 0),
      size,
      alpha,
      rotation: c.rotationFollowsStroke ? angle + c.tipAngleOffset : this.rng() * Math.PI * 2,
    };
    if (c.dynamicHue) {
      dab.color = hslToRgb((this.traveled / 340) % 1, 0.9, 0.55);
    }
    return dab;
  }
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return { r: f(0), g: f(8), b: f(4) };
}
