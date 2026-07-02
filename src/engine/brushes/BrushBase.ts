import {
  clamp,
  dist,
  type BrushId,
  type BrushSettings,
  type Dab,
  type RGB,
  type StrokePoint,
} from "../types";

/** 브러시 팁 종류 — 백엔드가 이 키로 스탬프 텍스처를 준비한다 */
export type TipKind = "soft" | "hard" | "grain" | "rough" | "chunk" | "bristle" | "flat";

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
  /** 이동 거리에 따라 hue 회전(무지개) */
  dynamicHue: boolean;
  /** settings.waterAmount를 dab.water로 전달(수채) */
  carriesWater: boolean;
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
  dynamicHue: false,
  carriesWater: false,
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
    return [this.makeDab(p, 0)];
  }

  move(p: StrokePoint): Dab[] {
    if (!this.last) return [];
    const from = this.last;
    const segLen = dist(from.x, from.y, p.x, p.y);
    if (segLen === 0) return [];

    const step = Math.max(1, this.settings.size * this.cfg.sizeScale * this.cfg.spacing);
    const dabs: Dab[] = [];
    const angle = Math.atan2(p.y - from.y, p.x - from.x);

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
    this.last = null;
    return [];
  }

  protected makeDab(p: StrokePoint, angle: number): Dab {
    const c = this.cfg;
    const s = this.settings;
    const pr = clamp(p.pressure, 0, 1);
    const base = s.size * c.sizeScale;

    const sizeK = 1 - c.sizePressure * (1 - pr);
    const size = Math.max(1, base * Math.max(c.minSizeRatio, sizeK));
    const alphaK = 1 - c.alphaPressure * (1 - pr);
    const alpha = clamp(c.flow * s.opacity * alphaK, 0.01, 1);

    const j = c.jitter * base;
    const dab: Dab = {
      x: p.x + (j ? (this.rng() - 0.5) * j : 0),
      y: p.y + (j ? (this.rng() - 0.5) * j : 0),
      size,
      alpha,
      rotation: c.rotationFollowsStroke ? angle : this.rng() * Math.PI * 2,
    };
    if (c.dynamicHue) {
      dab.color = hslToRgb((this.traveled / 340) % 1, 0.9, 0.55);
    }
    if (c.carriesWater) {
      dab.water = s.waterAmount;
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
