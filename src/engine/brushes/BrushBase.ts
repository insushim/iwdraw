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
  | "ink"
  | "glow"
  | "sparkle";

/**
 * dab 최소 지름(px) — 이보다 작으면 래스터에서 서브픽셀이 돼 획이 통째로 증발하거나
 * 1px 점으로 찍혀 "끊긴 계단"이 된다(2026-07-13 사용자 실측, 굵기 1에서 연필 36열·
 * 사인펜 41열이 빈 열). 2.4px면 팁의 알파 폴오프가 2~3픽셀에 걸쳐 안티에일리어싱이 살아난다.
 * 얇은 획은 "가늘게" 보여야지 "끊겨" 보이면 안 된다 — 지각상 하한이 곧 최소 굵기.
 */
export const MIN_DAB_PX = 2.4;

/** 어떤 브러시도 이보다 얇게는 못 찍는 절대 하한(px) — 팁 폴오프 2px = 안티에일리어싱 생존선 */
export const ABS_MIN_DAB_PX = 2.0;

/**
 * 브러시별 "그을 수 있는 가장 가는 선"(px) — sizeScale에서 유도.
 *
 * ⚠️ 하드 클램프 하나(MIN_DAB_PX)로 전 브러시를 같은 폭에 눌러버리면 굵기 1~4에서
 * 연필=색연필=사인펜=마커=유화붓이 **완전히 같은 헤어라인**이 된다(2026-07-25 계측:
 * 굵기 1에서 사인펜 peak 0.605/ink 1.77 vs 아크릴펜 0.607/1.76 — 차이 0.3%).
 * 굵기가 얇아질수록 도구 특성이 사라진다는 사용자 지적의 1차 원인.
 * 실물도 도구마다 최소 선 폭이 다르다(샤프심 0.5mm vs 크레용·마커 납작촉 vs 유화붓) —
 * 얇은 쪽 하한을 sizeScale에 비례시켜 굵기 1에서도 "연필은 가늘고 유화붓은 굵다"를 남긴다.
 * 지수 0.45 = 폭 비율을 압축(마커가 연필의 2.3배가 아니라 1.45배)해 "굵기 1인데 뚱뚱함"을 방지.
 */
export function minDabPxFor(sizeScale: number): number {
  return clamp(ABS_MIN_DAB_PX * Math.pow(sizeScale / 0.45, 0.45), ABS_MIN_DAB_PX, 4.2);
}

/**
 * 하한 부근의 부드러운 압축 — `Math.max(floor, raw)`는 굵기 슬라이더에 **죽은 구간**을
 * 만든다(연필 sizeScale 0.45 → 굵기 1·2·3·4가 raw 0.45~1.8로 전부 하한에 걸려 같은 획.
 * 2026-07-25 계측: 연필 굵기 1/2/4의 peak 0.341/0.333/0.332 = 무변화).
 * [0, floor×1.6] 구간을 [floor, floor×1.6]로 선형 압축해 단조성(굵기를 올리면 굵어진다)과
 * 브러시 간 순서를 함께 보존한다.
 */
export function softFloorSize(raw: number, floor: number): number {
  const knee = floor * 1.6;
  return raw >= knee ? raw : floor + (knee - floor) * (raw / knee);
}

/**
 * 이 폭(px) 미만에서는 2D 질감(종이 결·붓결)이 획 안에 들어가지 못한다 —
 * 폭 2~4px 획은 결 한 칸이 획을 통째로 관통하거나(끊김) 아예 안 보인다.
 * 대신 질감을 "획 길이 방향 농담"으로 환산한다(cfg.thinGrain).
 */
export const THIN_TEX_PX = 9;

/**
 * dab 무작위 회전을 쓰는 최소 지름(px). 이보다 작으면 회전을 고정한다.
 * 입자 팁의 패턴이 반복돼 보이지 않게 dab마다 무작위로 회전시키는데(rotationFollowsStroke가
 * 아닌 브러시), 얇은 획에서는 회전한 정사각 쿼드의 텍셀 커버리지가 dab마다 달라져
 * 획 두께가 1px씩 오르내린다 = 톱니·"구불구불"(2026-07-13 사용자 실측, 사인펜 굵기 1).
 * 8px 미만에서는 회전을 고정 — 그 크기에선 팁 패턴 반복이 눈에 띄지도 않는다.
 */
export const ROT_JITTER_MIN_PX = 8;

/** 백엔드 합성 힌트 (Canvas2D globalCompositeOperation과 호환) */
export type DabComposite =
  | "source-over"
  | "multiply"
  | "darken"
  | "lighter"
  | "destination-out"
  /** 수채 글레이징: 겹침 1단계는 multiply로 진해지고, 2겹부터는 바닥(획색²)에서 포화.
   * result = min(기존, max(기존×획, 획²)) — 겹침이 "보이되" 얼룩 폭주는 차단. */
  | "glaze";

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
  /**
   * 진하기 슬라이더를 strokeOpacity(알파)가 아니라 브러시가 직접 색 희석으로 소비(수채).
   * 알파 <1 이면 darken이어도 겹칠 때마다 한 스텝씩 어두워져 겹침 경계가 얼룩이 된다.
   */
  opacityAsDilution: boolean;
  /** 수채 농담 구름(캔버스 고정 저주파 색 요동) 강도 0~1 — GL 전용 */
  washCloud: number;
  /** 가장자리 요철 0~1 — 알파<1인 팁 폴오프 영역만 캔버스 고정 노이즈로 침식(수채 스밈).
   * 내부(알파=1)는 불변이라 겹침 darken 수렴을 깨지 않는다 — GL 전용 */
  edgeNoise: number;
  /** 획 실루엣 가장자리 안료 몰림 0~1(수채 wet edge) — endStroke 후처리 */
  wetEdge: number;
  /** 임파스토 릴리프 0~1(유화) — 실루엣 좌상단 하이라이트/우하단 그림자, endStroke 후처리 */
  impasto: number;
  /** 획 시작·끝의 마른 붓털 트레일 강도 0~1(유화) — 진행 방향으로 저알파 fringe dab */
  fringe: number;
  /** 종이 결을 알파 침식 대신 "색 백화"(흰 캔버스가 물감에 배어남)로 — 획 불투명 유지.
   * 불투명 매체(유화)용: 알파 침식이면 겹친 획이 진해져 반투명 마커로 읽힌다(i-scream 대비 실측) */
  grainLift: boolean;
  /** 붓 방향 밝은 스트릭(마른 붓털 하이라이트) 강도 0~1 — bristle 계열 전용, GL 셰이더 lift */
  streaks: number;
  /**
   * 젖은 물감 섞임(wet mixing) 강도 0~1(유화) — 획이 밑색(활성 레이어의 기존 물감)을
   * 붓에 묻혀 와 색이 섞인다(i-scream 유화 실측: 노랑이 청록 위를 지나면 황록으로,
   * 벗어나면 서서히 원색 회복. 2026-07-10 사용자 요청). 값은 "원색이 밑색 쪽으로
   * 끌려갈 수 있는 최대 비율"(캡) — 1이어도 carried가 원색을 완전히 잠식하지 않는다.
   * 엔진이 baseSampler를 주입할 때만 동작(빈 종이·미주입 시 원색 그대로).
   */
  wetMix: number;
  /**
   * 얇은 획(THIN_TEX_PX 미만)에서 획을 "따라" 흐르는 농담 0~1 — 가는 선의 질감 정체성.
   *
   * 폭이 2~4px이면 종이 결·붓결·팁 무늬가 획 폭 안에 들어가지 않아 모든 도구가 같은
   * 헤어라인이 된다(2026-07-25 사용자 지적·계측). 실물의 가는 선도 질감이 '가로 결'이
   * 아니라 **길이 방향 농담**으로 나타난다 — 연필은 종이 결을 타고 옅어졌다 진해지고,
   * 크레용은 왁스가 끊기고, 사인펜·마커는 끝까지 균일하다. 그 차이를 그대로 옮긴 값.
   * 저주파(파장 15~35px) 사인 합성이라 얼룩이 아니라 "손맛"으로 읽힌다.
   */
  thinGrain: number;
  /** 최소 선 폭(px) 직접 지정 — 0이면 sizeScale에서 유도(minDabPxFor).
   * 붓펜처럼 굵은 붓이지만 붓끝은 아주 가는 도구, 지우개처럼 정밀도가 사실성보다 중요한
   * 도구를 위한 예외 창구. */
  minLinePx: number;
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
  opacityAsDilution: false,
  washCloud: 0,
  edgeNoise: 0,
  wetEdge: 0,
  impasto: 0,
  fringe: 0,
  grainLift: false,
  streaks: 0,
  wetMix: 0,
  thinGrain: 0,
  minLinePx: 0,
};

/**
 * 모든 스트로크형 브러시의 공통 구현.
 * 입력 점(보정 후)을 받아 등간격 Dab 스트림을 생성한다 — 순수 로직, DOM/GL 비의존.
 */
export class BrushBase {
  readonly cfg: BrushConfig;
  /** 이 브러시가 그을 수 있는 가장 가는 선(px) — 도구별로 다르다(minDabPxFor 참조) */
  readonly minDabPx: number;
  protected settings!: BrushSettings;
  private last: StrokePoint | null = null;
  /** 다음 dab까지 남은 거리 */
  private residual = 0;
  private traveled = 0;
  /** 지금 만드는 dab의 획 시작점부터의 호 길이(px) — 길이 방향 농담·hue의 위상 */
  private arc = 0;
  /** 획별 위상(결정론 — 같은 획을 다시 재생하면 같은 무늬) */
  private grainSeed = 0;
  /** 직전 makeDab이 적용한 길이 방향 농담 계수 — 알파를 직접 쓰는 서브클래스(붓펜)가 곱한다 */
  protected thinGrainK = 1;
  /** 결 방향 스무딩(EMA) — dab별 각도 점프가 만드는 줄무늬(마커/유화) 방지 */
  private smoothedAngle: number | null = null;
  /** rotationFollows 브러시의 첫 dab — 방향을 알 수 없어 첫 move까지 보류(시작 블롭 방지) */
  private pendingBegin: StrokePoint | null = null;
  private rng: () => number;

  /** 엔진 주입(wetMix>0일 때): 활성 레이어 밑색 샘플(반경 r 평균). null = 빈 종이.
   * 획 시작 시점의 레이어 미러를 읽으므로 획 도중 자기 물감과는 안 섞인다(의도). */
  baseSampler: ((x: number, y: number, r: number) => RGB | null) | null = null;
  /** 붓에 묻은 물감 — 원색에서 시작해 지나간 밑색 쪽으로 지수 수렴(거리 정규화) */
  private carried: RGB | null = null;
  private lastSampleVal: RGB | null = null;
  private sinceSample = Infinity;

  constructor(cfg: Partial<BrushConfig> & Pick<BrushConfig, "id" | "tip">, rng?: () => number) {
    this.cfg = { ...DEFAULTS, ...cfg };
    this.rng = rng ?? Math.random;
    this.minDabPx = this.cfg.minLinePx || minDabPxFor(this.cfg.sizeScale);
  }

  /** 굵기 슬라이더 값 → 이 브러시가 실제로 찍는 dab 지름(px). UI 미리보기도 이걸 쓴다 */
  strokePx(size: number): number {
    return softFloorSize(size * this.cfg.sizeScale, this.minDabPx);
  }

  get id(): BrushId {
    return this.cfg.id;
  }

  begin(p: StrokePoint, settings: BrushSettings): Dab[] {
    this.settings = settings;
    this.last = p;
    this.residual = 0;
    this.traveled = 0;
    this.arc = 0;
    /* 획마다 다른 위상 — Math.random 금지(무비 재생·협동에서 같은 획이 다르게 그려진다).
     * 시각(p.t)도 쓰지 않는다: 위상이 실행마다 달라져 "같은 조작 → 같은 그림"이 깨지고,
     * 얇은 획의 결 굵기가 실행마다 오르내려 회귀 테스트가 무작위로 빨개졌다
     * (2026-07-25 실측: 색연필·붓펜의 윗변 편차가 실행마다 0~0.25). 시작 좌표만으로
     * 정하면 자리가 다르면 결도 다르고, 같은 자리 같은 획은 항상 같게 재현된다. */
    this.grainSeed = (p.x % 733) * 0.0031 + (p.y % 577) * 0.0047;
    this.smoothedAngle = null;
    // wet mixing: 붓을 대는 순간부터 밑색을 살짝 묻힌다(반 지름만큼 문지른 셈)
    this.carried = { ...settings.color };
    this.lastSampleVal = null;
    this.sinceSample = Infinity;
    this.updateCarried(p, settings.size * this.cfg.sizeScale * 0.5);
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

    // 간격은 "실제로 찍히는" dab 지름(최소 지름 반영) 기준 — 굵기 1에서 step 1px·dab 1px면
    // 점이 띄엄띄엄 찍혀 끊긴다. 하한 0.6px로 촘촘히 겹쳐 연속선이 되게 한다.
    const dabDia = this.strokePx(this.settings.size);
    const step = Math.max(0.6, dabDia * this.cfg.spacing);
    const dabs: Dab[] = [];
    const angle = this.smoothAngle(Math.atan2(p.y - from.y, p.x - from.x));
    this.updateCarried(p, segLen);

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
      this.arc = this.traveled + offset;
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
    // "제자리 탭" 판정은 이동 0이 아니라 dab 지름의 1/4 이하 — 손가락·마우스로 콕 찍으면
    // 1~2px은 흔들린다. 그 미세 이동 때문에 탭 보강이 빠지면 "가끔만 점이 흐리다"가 된다.
    const at = this.pendingBegin ?? this.last;
    const tapAt = at && this.traveled <= this.strokePx(this.settings.size) * 0.25 ? at : null;
    if (tapAt) {
      out.push(...this.tapDabs(tapAt));
    } else if (this.last && this.smoothedAngle !== null) {
      // 획 꼬리의 마른 붓털 트레일(진행 방향)
      out.push(...this.fringeDabs(this.last, this.smoothedAngle, 1));
    }
    this.pendingBegin = null;
    this.last = null;
    return out;
  }

  /**
   * 제자리 탭(점 찍기) 보강 — 획과 같은 농도가 나오도록 같은 자리에 dab을 더 겹친다.
   *
   * 획은 한 점 위로 dab이 1/spacing겹(연필 11겹)씩 지나가며 쌓이는데 탭은 1겹뿐이다.
   * 그래서 ① buildup 매체(연필·크레용·수채)는 점만 유독 흐리고 ② wash 매체도 팁의
   * 성긴 구멍이 그대로 남아 얼룩진 점이 된다(2026-07-25 전수 시트 검수: 연필·색연필·
   * 크레용의 탭이 획보다 훨씬 옅어 거의 안 보임). 아이들은 눈·코·별·물방울을 콕콕
   * 찍는 용도로 탭을 많이 쓴다 — "찍으면 획과 같은 진하기의 점"이 기대 동작.
   *
   * ⚠️ 지우개(destination-out)는 제외 — 알파 1이라 이미 한 겹으로 다 지워지는데 겹치면
   *    팁 폴오프까지 파고들어 지운 자국이 의도보다 커진다.
   */
  private tapDabs(p: StrokePoint): Dab[] {
    if (this.cfg.composite === "destination-out") return [];
    const layers = clamp(Math.round(0.55 / Math.max(0.02, this.cfg.spacing)), 1, 8);
    const out: Dab[] = [];
    // 입자 팁(연필 grain·크레용/색연필 rough)은 겹만 쌓아선 소용없다 — 같은 구멍이 같은 자리에
    // 겹치기 때문. 겹마다 팁을 돌려 찍어야 구멍이 메워진다. 반대로 납작촉(마커)·둥근촉
    // (사인펜)은 돌리면 촉 모양이 뭉개지므로 각도 고정.
    // ⚠️ 붓털(bristle)·덩어리(chunk) 팁은 제외 — 이들은 원래도 탭이 진했고(농도비 0.98),
    //    돌려 찍으면 실루엣이 톱니바퀴 모양으로 뭉친다(2026-07-25 확대 실측).
    const t = this.cfg.tip;
    const spin = t === "rough" || t === "grain";
    // begin()(또는 위의 pendingBegin)이 이미 1겹 찍었으므로 나머지만.
    // 각도는 0 기준 — makeDab이 rotationFollows 브러시에 tipAngleOffset을 스스로 더한다(이중 가산 금지)
    for (let i = 1; i < layers; i++) {
      out.push(this.makeDab(p, spin ? (i / layers) * Math.PI * 2 : 0));
    }
    return out;
  }

  /** 획 양끝의 마른 붓 테이퍼 — 진행 방향(dir=+1 꼬리, -1 머리)으로 좁아지는 dab 체인.
   * ⚠️ 수직 산포는 ±0.1 이하로: 물감이 불투명해진 뒤로는 흩어진 소형 dab이 본획에서
   * 떨어져 "잉크 튄 방울"로 읽힌다(2026-07-06 사용자 실측 — 반투명 시절의 ±0.3 산포 유산).
   * 체인이 이어지도록 인접 dab 반지름 합 > 간격 유지. 알파를 크게 낮추면 유령 캡(실측) */
  private fringeDabs(p: StrokePoint, angle: number, dir: 1 | -1): Dab[] {
    const c = this.cfg;
    if (!c.fringe) return [];
    // 실제로 찍히는 지름 기준 — 얇은 획에서 raw(0.5px)로 오프셋을 잡으면 테이퍼 체인이
    // 본획 안에 전부 겹쳐 사라진다(하한 압축 도입 후 정합)
    const base = this.strokePx(this.settings.size);
    const steps: Array<[number, number, number, number]> = [
      // [진행 오프셋, 크기 배율, 알파 배율, 수직 산포(±size 비율)]
      [0.1, 0.62, 0.95, 0.03],
      [0.22, 0.4, 0.9, 0.05],
      [0.32, 0.26, 0.85, 0.07],
      [0.4, 0.16, 0.8, 0.08],
      [0.46, 0.1, 0.75, 0.09],
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

  /** 붓에 묻은 물감을 원색 쪽 기준으로 갱신 — 거리/브러시지름 정규화 지수 수렴(프레임률 독립) */
  private updateCarried(p: StrokePoint, distPx: number): void {
    if (!(this.cfg.wetMix > 0) || !this.baseSampler || !this.carried) return;
    const dia = Math.max(4, this.settings.size * this.cfg.sizeScale);
    // 샘플은 0.2지름 이동마다(밑색은 저주파) — 나머지 구간은 마지막 샘플로 수렴만 진행
    this.sinceSample += distPx;
    if (this.sinceSample >= Math.max(3, dia * 0.2)) {
      this.lastSampleVal = this.baseSampler(p.x, p.y, dia * 0.35);
      this.sinceSample = 0;
    }
    const s = this.lastSampleVal;
    // 픽업(밑색 위, 한 지름 이동에 ~67% 수렴)은 빠르게, 회복(빈 종이)은 서서히 —
    // i-scream 실측: 밑색을 벗어나면 원색이 점진 회복
    const target = s ?? this.settings.color;
    const t = 1 - Math.exp(-(s ? 1.1 : 0.33) * (distPx / dia));
    this.carried.r += (target.r - this.carried.r) * t;
    this.carried.g += (target.g - this.carried.g) * t;
    this.carried.b += (target.b - this.carried.b) * t;
  }

  /** 이 dab이 쓸 물감 색 — 원색↔carried를 wetMix 캡으로 혼합(원색이 완전히 잠식되지 않게) */
  protected paintColor(): RGB {
    const m = this.cfg.wetMix;
    if (!(m > 0) || !this.carried || !this.baseSampler) return this.settings.color;
    const c = this.settings.color;
    const w = this.carried;
    return {
      r: Math.round(c.r + (w.r - c.r) * m),
      g: Math.round(c.g + (w.g - c.g) * m),
      b: Math.round(c.b + (w.b - c.b) * m),
    };
  }

  /**
   * 얇은 획의 길이 방향 농담 계수(0~1) — 굵은 획에서는 항상 1(기존 룩 불변).
   *
   * 파장 15~37px 사인 2개의 합성이라 "얼룩"이 아니라 결을 타는 손맛으로 읽힌다.
   * buildup(연필·크레용)은 겹친 dab이 알파를 다시 채워 넣으므로(4겹이면 0.35도 0.82로
   * 복원) wash보다 훨씬 깊게 변조해야 같은 체감이 나온다 — 블렌드별 깊이 분리 필수.
   */
  private thinGrainFactor(basePx: number): number {
    const g = this.cfg.thinGrain;
    if (!(g > 0)) return (this.thinGrainK = 1);
    const thin = 1 - Math.min(1, basePx / THIN_TEX_PX);
    if (thin <= 0) return (this.thinGrainK = 1);
    const a = this.arc;
    const n =
      Math.sin(a * 0.41 + this.grainSeed * 6.3) * 0.5 +
      Math.sin(a * 0.17 + this.grainSeed * 11.7 + 1.9) * 0.5; // -1~1
    const dip = 0.5 - 0.5 * n; // 0(진함)~1(옅음)
    const depth = g * thin * (this.cfg.strokeBlend === "wash" ? 0.5 : 0.95);
    // ⚠️ 평균 보존 필수: (1 - depth·dip)만 쓰면 dip 평균이 0.5라 획 전체가 그만큼 옅어진다
    //    — "연필이 흐려졌다"가 되는 지름길(1차 구현 실측: 연필 peak 0.34→0.23).
    //    평균 1로 정규화하면 밝은 구간은 원래 농도, 어두운 구간은 더 진해 대비만 생긴다.
    return (this.thinGrainK = Math.max(0.06, (1 - depth * dip) / (1 - depth * 0.5)));
  }

  protected makeDab(p: StrokePoint, angle: number): Dab {
    const c = this.cfg;
    const s = this.settings;
    const pr = clamp(p.pressure, 0, 1);
    const base = s.size * c.sizeScale;

    const sizeK = 1 - c.sizePressure * (1 - pr);
    const size = softFloorSize(base * Math.max(c.minSizeRatio, sizeK), this.minDabPx);
    const alphaK = 1 - c.alphaPressure * (1 - pr);
    // wash는 진하기(opacity)를 dab이 아니라 스트로크 합성 시 1회 적용(strokeOpacity)
    const alpha = clamp(
      // 길이 방향 농담은 "실제로 그려지는 폭" 기준 — 2D 결이 들어갈 자리가 없을 때만 켠다
      c.flow * (c.strokeBlend === "wash" ? 1 : s.opacity) * alphaK * this.thinGrainFactor(size),
      0.01,
      1,
    );

    const j = c.jitter * base;
    const dab: Dab = {
      x: p.x + (j ? (this.rng() - 0.5) * j : 0),
      y: p.y + (j ? (this.rng() - 0.5) * j : 0),
      size,
      alpha,
      rotation: c.rotationFollowsStroke
        ? angle + c.tipAngleOffset
        : size >= ROT_JITTER_MIN_PX
          ? this.rng() * Math.PI * 2
          : 0,
    };
    if (c.dynamicHue) {
      // ⚠️ traveled(세그먼트 끝에서만 갱신)가 아니라 arc(dab별 호 길이) — 세그먼트 단위로
      // 색을 바꾸면 포인터 이벤트 간격(≈15px)마다 같은 색 dab이 뭉쳐 "구슬 목걸이"가 된다
      // (2026-07-25 3배 확대 실측: 색 경계마다 dab 원호가 그대로 보임).
      dab.color = hslToRgb((this.arc / 340) % 1, 0.9, 0.55);
    } else if (c.wetMix > 0 && this.baseSampler) {
      dab.color = this.paintColor();
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
