import type { StrokePoint } from "../types";
import type { GesturePhase } from "./Gestures";

/*
 * PointerHandler: Pointer Events → StrokePoint. 필압(pressure)·coalesced events 처리.
 * 펜(스타일러스)은 실제 필압, 마우스·손가락은 속도 기반 필압 시뮬 —
 * 천천히 그으면 눌러 그리듯 굵고 진하게, 빠르면 가늘게(획 끝 테이퍼가 자연히 생김).
 * 캔버스 좌표계로 변환(디바이스 픽셀 비율 반영)은 호출측(ArtEngine)이 매핑 함수 주입.
 *
 * 이벤트는 캔버스가 아니라 **작업대(surface = 캔버스를 감싸는 칸)** 에서 받는다.
 * 캔버스는 도안 비율에 맞춰 fit되므로 사방에 여백이 남는데, 캔버스에만 리스너를 달면
 * 두 손가락 중 하나가 그 여백에 닿는 순간 핀치가 성립하지 않았다 — 남은 한 손가락이
 * 그리기로 처리돼 **확대 대신 낙서**가 됐다(2026-08-21 재현: 배율 1.00 · 획 픽셀 412).
 * 그리기 자체는 여전히 캔버스 안에서 시작한 포인터만 한다(아래 canvasHit).
 */
export interface PointerCallbacks {
  onDown(p: StrokePoint, e: PointerEvent): void;
  onMove(points: StrokePoint[], e: PointerEvent): void;
  onUp(p: StrokePoint, e: PointerEvent): void;
  /** 진행 중 획 폐기 — 두 번째 손가락(핀치 의도) 감지 시. 커밋(onUp)하면 첫
   * 손가락의 점/짧은 획이 캔버스에 남는다(웨일북 실측 2026-07-07) */
  onCancel(): void;
  /** 멀티터치 → 제스처로 위임할지 판단(두 손가락 이상) */
  onGesture(active: PointerEvent[], e: PointerEvent, phase: GesturePhase): void;
}

export type ToLocal = (clientX: number, clientY: number) => { x: number; y: number };

/*
 * 팜 리젝션(2026-07-14 사용자 요청 — 웨일북에서 아이들이 손을 대고 그린다).
 * 규칙은 **하나뿐**: 펜이 화면에 실제로 닿아 있거나 뗀 직후(PEN_LOCKOUT_MS) 들어오는 touch는
 * 손바닥으로 보고 버린다. 펜을 안 쓰는 아이의 손가락 그리기·두 손가락 확대는 전혀 건드리지 않는다.
 *
 * ⚠️ 접촉 면적(e.width/e.height) 규칙은 2026-07-14 실측으로 폐기했다 — 웨일북 터치스크린은
 * 보통 손가락 접촉도 큰 값으로 보고해서 모든 터치가 손바닥으로 오판됐다(그리기·핀치 전멸).
 * 펜 호버(화면에 안 닿은 상태)도 잠금 트리거로 쓰지 않는다 — 펜이 근처에 있기만 해도 손이 죽는다.
 *
 * ⚠️ 잠금 구간의 **두 손가락**은 손바닥이 아니다(2026-08-21 "확대가 됐다 안됐다" 재현):
 * 펜을 놓자마자 손으로 확대하면 1.2초 동안 통째로 씹혔다(실측: 펜 뗀 0.1초 뒤 핀치 배율 1.00,
 * 1.5초 뒤 4.00). 그래서 잠금 중 터치는 즉시 버리지 않고 **보류**했다가, 펜이 실제로 닿아
 * 있지 않은 상태에서 두 번째 손가락이 오면 둘 다 제스처로 승격한다. 뷰 변형은 획을 남기지
 * 않으므로 승격이 빗나가도 캔버스는 더러워지지 않는다. 펜 접촉 중(penDown)에는 승격하지
 * 않는다 — 그때 들어오는 여러 점은 진짜 손바닥이다.
 */
const PEN_LOCKOUT_MS = 1200;
/* 펜이 "닿아 있다"고 본 뒤 이만큼 아무 펜 이벤트도 없으면 뗀 것으로 친다.
 * pointerup·pointercancel이 유실되면(앱 전환, 펜이 화면 밖으로 이탈, 배터리 끊김)
 * penDown이 영구 고착돼 그 뒤 모든 터치가 손바닥으로 버려진다 — 확대도 그리기도 세션이
 * 끝날 때까지 죽는다(2026-08-21 실측: 펜 up 유실 후 배율 1.00 · 손가락 획 0픽셀).
 * 펜이 실제로 닿아 있으면 움직임마다 이벤트가 들어와 이 시간이 갱신되므로 오작동하지 않는다. */
const PEN_STALE_MS = 3000;
/* 팜으로 보류한 터치를 "핀치의 절반"으로 인정해 주는 시간. 이걸 넘도록 두 번째 손가락이
 * 오지 않으면 보류는 후보에서 내려간다 — 무기한 붙들면 얹힌 손바닥 하나 때문에 그 뒤 모든
 * 단일 터치가 확대로 해석된다. */
const PALM_HOLD_MS = 1500;
/* 종이 밖에 닿은 손가락을 "핀치의 나머지 절반"으로 받아 주는 시간 창(첫 접촉 기준).
 * 핀치는 두 손가락이 거의 동시에 내려오지만, 한참 그리다가 다른 손으로 색을 고르는 건
 * 한참 뒤다 — 이 시간차가 둘을 가른다. 요소 종류(isControl)로만 가르려 하면 role 없는
 * 커스텀 위젯(예: 컬러휠 canvas)을 놓쳐 그리던 획이 통째로 취소된다(교차검증 지적). */
const PINCH_JOIN_MS = 400;

/** 펜이 화면에 닿아 있는가(호버 아님) — buttons 비트 or 필압 */
function penIsContacting(e: PointerEvent): boolean {
  return e.pointerType === "pen" && (e.buttons & 1) !== 0;
}

/**
 * 스타일러스 실필압(0~1) → 브러시가 기대하는 필압 범위로 사상.
 *
 * ⚠️ 실기기 필압의 **약한 쪽**이 문제였다(2026-07-29 폰 실사용 제보: "천천히 그으면 점선").
 * ① 아이가 살살 그으면 S펜·애플펜슬은 0.05~0.2를 보고한다. 브러시 값들은 마우스·손가락
 *    시뮬 필압(0.35~0.85)을 기준으로 튜닝돼 있어서, 실필압 0.12면 연필 알파가 0.49배로
 *    떨어진다 — 백킹 실측 peak 0.36(시뮬) vs **0.20**(실필압 0.12). 폰 화면에서 폭 2px
 *    선의 농도가 절반이 되면 종이 결·길이 방향 농담의 골이 시각 임계 아래로 내려가
 *    "끊긴 선"으로 보인다.
 * ② 게다가 펜은 접촉이 약하면 **pressure 0을 간헐적으로 보고**한다. 옛 조건
 *    `e.pressure > 0`은 그 순간만 속도 시뮬로 폴백했는데, 시뮬값은 **느릴수록 커져서
 *    최대 0.85** — 즉 옅은 획 위에 진한 점이 규칙적으로 찍힌다(= 점선). 빠르게 그으면
 *    시뮬값이 0.35~0.5로 내려와 실필압과 비슷해져 증상이 사라진다("천천히 그을 때만"의 정체).
 *    실측: 열별 농도 변동계수 cv 0.108(실필압 고정) → 0.17(필압 0 간헐).
 *
 * 그래서 ① 기기가 실필압을 보고하는 펜이면 그 뒤로는 끝까지 실필압 경로를 쓰고(폴백 금지),
 * 접촉 중 들어온 0은 **센서 dropout**으로 보아 직전 유효 필압을 유지하며,
 * ② 하한 0.15·감마 0.75로 사상해 살살 그은 선도 보이게 한다.
 *
 * 사상 값 감각: raw 0.12 → 0.32, 0.3 → 0.49, 0.6 → 0.73, 1 → 1.0.
 * 즉 실기기의 "약하게"가 시뮬 하한(0.35) 언저리에 오도록 맞춘 것이고, 그보다 더 약한
 * 접촉(raw<0.1)은 시뮬로는 낼 수 없던 0.15~0.3 구간에 들어간다 — 표현 범위는 넓어진다.
 * ⚠️ 하한을 0.25로 잡았더니 붓펜(필압이 굵기에 두 번 곱해진다)에서 raw 0.12의 크기 계수가
 * 0.135 → 0.377(2.8배)로 뛰어 삐침이 죽었다(2026-07-29 교차검증 지적, 두 계열 합의).
 * 0.15면 2.1배로 줄어든다. 여기서 막으려는 건 "가는 선"이 아니라 "안 보이는 선"이다.
 */
function penPressure(raw: number): number {
  const p = raw <= 0 ? 0 : raw >= 1 ? 1 : raw;
  return 0.15 + 0.85 * Math.pow(p, 0.75);
}

export class PointerHandler {
  private active = new Map<number, PointerEvent>();
  /** 마지막 펜 입력 시각(e.timeStamp 기준) */
  private lastPenTs = -Infinity;
  private penDown = false;
  /** 팜으로 판단해 버린 포인터 — move/up도 무시해야 한다 */
  private rejected = new Set<number>();
  /** 팜으로 보류 중인 터치(펜 잠금 구간) — 두 번째 손가락이 오면 핀치로 승격한다 */
  private palmPending = new Map<number, { e: PointerEvent; since: number }>();
  /** 화면에 아무것도 안 닿은 상태에서 첫 접촉이 들어온 시각 — 핀치 합류 창의 기준 */
  private firstContactTs = -Infinity;
  /** 제스처가 진행 중인가 — 마지막 손가락을 뗄 때 "end"를 반드시 보내려고 둔다.
   * 없으면 active.size로만 판정하게 되는데, 두 손가락을 하나씩 떼면 마지막 하나를 뗄 때
   * size가 이미 1이라 end가 영영 안 나갔다(= 두 손가락 탭 되돌리기가 죽어 있었다). */
  private gestureActive = false;

  /** 펜이 지금 화면에 닿아 있는가 — 고착 방어(PEN_STALE_MS)를 통과한 penDown만 인정 */
  private penIsDown(now: number): boolean {
    return this.penDown && now - this.lastPenTs < PEN_STALE_MS;
  }

  /** 펜이 "쓰이는 중"인가 — 펜이 닿아 있거나 방금까지 썼다 */
  private penInUse(now: number): boolean {
    return this.penIsDown(now) || now - this.lastPenTs < PEN_LOCKOUT_MS;
  }

  /** 이 포인터를 손바닥으로 보고 버릴까 — 펜이 닿아 있는 동안의 touch만 */
  private isPalm(e: PointerEvent): boolean {
    return e.pointerType === "touch" && this.penInUse(e.timeStamp);
  }
  private drawing = false;
  private drawingPointerId = -1;
  /** 속도 기반 필압 시뮬 상태(마우스·손가락) */
  private lastMove: { x: number; y: number; t: number } | null = null;
  private speedEma = 0;
  /** 이 기기의 펜이 실필압(>0)을 보고한 적이 있는가 — penPressure 주석 참조.
   * 한 번이라도 봤으면 이후로는 0이 와도 실필압으로 받는다(시뮬로 튀면 진한 점이 찍힌다).
   * 세션 단위인 이유: 필압 지원 여부는 기기 특성이라 획마다 바뀌지 않는다. 획 단위로 재판정하면
   * "펜을 내려놓는 순간 pressure 0으로 시작하는 획"이 매번 시뮬로 새어 같은 증상이 남는다.
   * ⚠️ 알려진 한계(교차검증에서 두 계열이 같이 지적, 발생 확률 낮다고 판단해 수용): 필압을
   * 딱 한 번만 오보고하는 펜이면 이후 0들이 계속 실필압으로 해석된다. 반대 방향 오류
   * (=원래 결함: 진한 점이 찍힘)가 훨씬 눈에 띄므로 이쪽으로 치우치게 둔다. */
  private penPressureSeen = false;
  /** 접촉 중 마지막으로 들어온 유효(>0) 실필압 — dropout(0) 구간에 이 값을 유지한다 */
  private lastPenRaw = 0;
  /** 필압 반영(펜 실필압 + 마우스/손가락 속도 시뮬) on/off — off면 균일 획 */
  private pressureEnabled = true;

  setPressureEnabled(on: boolean): void {
    this.pressureEnabled = on;
  }
  /** 그리던 포인터의 마지막 점 — 멀티터치 전환 시 두 번째 손가락 좌표로 점프 커밋되는 것 방지 */
  private lastDrawPoint: StrokePoint | null = null;

  /** 이벤트를 받는 요소(작업대). 지정하지 않으면 캔버스 자신 */
  private readonly surface: HTMLElement;
  private readonly root: Window;

  constructor(
    private readonly el: HTMLElement,
    private readonly toLocal: ToLocal,
    private readonly cb: PointerCallbacks,
    surface?: HTMLElement,
  ) {
    this.surface = surface ?? el;
    /* 창 전체에서 받는다(캡처 단계). 캔버스에만 달면 두 손가락 중 하나가 종이 밖 —
     * 작업대 여백은 8px뿐이라 실제로는 툴바·색 팔레트 — 에 닿는 순간 핀치가 성립하지
     * 않고 남은 손가락이 그리기로 처리됐다(2026-08-21 재현: 배율 1.00 · 획 픽셀 412).
     * 작업대 밖에서 시작한 포인터는 "종이 위에 이미 손가락이 있고, 그 직후(PINCH_JOIN_MS)"
     * 일 때만 받아들인다. preventDefault는 어디서도 하지 않으므로 버튼 자체는 정상 동작하지만,
     * 편입되는 순간 그리던 획은 제스처로 전환되며 취소된다 — 그래서 시간 창과 isControl 두
     * 겹으로 거른다(isControl은 태그·role 화이트리스트라 새 커스텀 위젯을 놓칠 수 있다). */
    this.root = this.surface.ownerDocument?.defaultView ?? window;
    this.root.addEventListener("pointerdown", this.handleDown, true);
    this.root.addEventListener("pointermove", this.handleMove, true);
    this.root.addEventListener("pointerup", this.handleUp, true);
    this.root.addEventListener("pointercancel", this.handleUp, true);
    // leave는 버블링하지 않는다 — 마우스가 작업대를 벗어나면 획을 끝내려고 여기 남긴다
    this.surface.addEventListener("pointerleave", this.handleUp);
    this.surface.ownerDocument?.addEventListener("visibilitychange", this.handleHide);
  }

  /* 탭이 숨겨지는 순간 포인터 상태를 비운다. 앱을 전환하면 pointerup이 안 오는 기기가 있어
   * 유령 포인터(특히 penDown)가 남고, 돌아와서 손가락이 안 먹는다. */
  private handleHide = (): void => {
    if (this.surface.ownerDocument?.visibilityState !== "hidden") return;
    this.active.clear();
    this.palmPending.clear();
    this.rejected.clear();
    this.penDown = false;
    this.lastPenTs = -Infinity;
    this.firstContactTs = -Infinity;
    // 다음 제스처의 "start"가 Gestures를 다시 기준화한다 — 여기서 end를 쏘면 탭으로 오인돼
    // 되돌리기가 발동할 수 있다
    this.gestureActive = false;
    if (this.drawing) {
      this.drawing = false;
      this.drawingPointerId = -1;
      this.cb.onCancel();
    }
  };

  /** 이 포인터가 캔버스(종이) 위에 있는가 — 그리기 시작은 여기서만 */
  private canvasHit(e: PointerEvent): boolean {
    const r = this.el.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  }

  /* 작업대(캔버스+여백) 안에서 시작한 포인터인가.
   * ⚠️ 좌표로 판정하면 안 된다 — 되돌리기·다시실행 버튼과 제안 바는 캔버스 **위에** 떠 있어서
   * 좌표상으로는 종이 안이다. 좌표만 봤더니 버튼을 누를 때마다 그 아래 종이에 점이 찍혔다
   * (2026-08-21 실측: undo 후 픽셀이 원본과 불일치 175741693 vs 175804757). 실제로 이벤트가
   * 어느 요소에서 났는지로 판정한다. */
  private onSurface(e: PointerEvent): boolean {
    const t = e.target as Node | null;
    return t !== null && this.surface.contains(t);
  }

  /* 누르려는 의도가 분명한 조작 요소인가. 종이 밖 손가락을 핀치로 끌어올 때 이걸 걸러야
   * "한 손으로 그리면서 다른 손으로 색을 바꾸는" 조작에서 그리던 획이 취소되지 않는다.
   * 핀치가 실제로 새어나가던 자리(작업대 여백·캔버스 둘레)는 조작 요소가 아니라 그대로 잡힌다. */
  private isControl(t: Node | null): boolean {
    return (
      t instanceof Element &&
      t.closest("button, a, input, select, textarea, label, [role='button'], [role='slider']") !== null
    );
  }

  private toStrokePoint(e: PointerEvent): StrokePoint {
    const { x, y } = this.toLocal(e.clientX, e.clientY);
    let pressure: number;
    if (!this.pressureEnabled) {
      pressure = 0.7; // 균일 획(필압 끔) — 웨일북처럼 펜 필압이 안 오는 기기 대응
    } else if (e.pointerType === "pen" && (e.pressure > 0 || this.penPressureSeen)) {
      if (e.pressure > 0) {
        this.penPressureSeen = true;
        this.lastPenRaw = e.pressure;
      }
      /* 접촉 중 0 = 센서 dropout이지 "펜을 뗐다"가 아니다 → 직전 유효 필압을 유지한다.
       * 0을 그대로 사상하면(=하한 0.15) 획에 규칙적인 잘록함이 남는다 — 원래 결함의
       * 작은 판본이다. 필압이 굵기에 두 번 곱해지는 붓펜에서만 드러나므로 농도 게이트로는
       * 안 잡힌다(2026-07-29 교차검증 지적 → A/B 실측: 붓펜 굵기25·필압 0.12·3이벤트마다 0
       * 에서 평균 획 폭 7.00 → 5.86, 폭 요동 0 → 0.162. 유지하면 7.00/0). */
      pressure = penPressure(e.pressure > 0 ? e.pressure : this.lastPenRaw);
    } else {
      // 마우스/손가락: 속도 기반 필압 시뮬(EMA) — 느리면 굵고 진하게
      const prev = this.lastMove;
      if (prev && e.timeStamp > prev.t) {
        const d = Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
        /* dt 하한 4ms — coalesced 하위 이벤트는 한 프레임 안에 여러 개가 몰려 들어오고
         * 타임스탬프가 거의 붙어 있을 수 있다. 그대로 나누면 v가 순간 폭증해 필압이
         * 하한(0.35)까지 떨어졌다 돌아오는 "옅은 자국"이 생긴다. 정상 간격(8~16ms)에서는
         * 이 하한이 걸리지 않으므로 거동 변화 없음.
         * ⚠️ 실기기 재현은 못 했다(합성 이벤트로는 이 조건이 안 만들어진다) — 교차검증에서
         * 나온 가설에 대한 **방어적 하한**이지 확인된 결함의 수정이 아니다. */
        const v = d / Math.max(4, e.timeStamp - prev.t); // px/ms
        this.speedEma += (v - this.speedEma) * 0.3;
      }
      pressure = Math.min(0.85, Math.max(0.35, 0.85 - this.speedEma * 0.22));
    }
    this.lastMove = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    return {
      x,
      y,
      pressure,
      t: e.timeStamp,
      tiltX: e.tiltX,
      tiltY: e.tiltY,
    };
  }

  private handleDown = (e: PointerEvent) => {
    if (!this.onSurface(e)) {
      /* 작업대 밖(툴바·팔레트·여백)에서 시작한 포인터. 종이 위에 이미 손가락이 있을
       * 때만 핀치의 나머지 절반으로 받아들인다 — 그 밖에는 앱의 평범한 조작이다. */
      if (e.pointerType !== "touch") return;
      if (this.active.size === 0 && this.palmPending.size === 0) return;
      if (this.isControl(e.target as Node | null)) return; // 버튼을 누르려는 손가락이다
      if (e.timeStamp - this.firstContactTs > PINCH_JOIN_MS) return; // 조작이지 핀치가 아니다
    }
    if (this.active.size === 0 && this.palmPending.size === 0) this.firstContactTs = e.timeStamp;
    if (e.pointerType === "pen") {
      this.penDown = true;
      this.lastPenTs = e.timeStamp;
    } else if (e.pointerType === "touch") {
      this.expirePalmPending(e.timeStamp);
      /* 보류해 둔 손가락이 아직 화면에 있는데 두 번째가 왔다 = 핀치다. **잠금 구간 밖이어도**
       * 승격한다 — 이 판정을 isPalm 분기 안에 두었더니, 두 번째 손가락이 잠금(1.2초)을 넘겨
       * 도착하면 승격 자체를 건너뛰고 단독 포인터로 그리기가 시작됐다(교차검증 지적 →
       * 실측 재현: 배율 1.00 · 획 547픽셀. 확대하려던 손이 낙서를 남긴다). */
      if (!this.penIsDown(e.timeStamp) && this.palmPending.size === 1) {
        this.promotePalmToGesture(e);
        return;
      }
      if (this.isPalm(e)) {
        /* 잠금 구간의 첫 터치: 펜이 실제로 닿아 있으면 손바닥 확정이라 어차피 승격되지 않고,
         * 그렇지 않으면(펜을 방금 뗀 직후) 두 번째 손가락을 기다린다. */
        this.palmPending.set(e.pointerId, { e, since: e.timeStamp });
        this.rejected.add(e.pointerId); // 손바닥 — 그리기·제스처 어디에도 참여시키지 않는다
        return;
      }
    }
    if (this.onSurface(e)) this.capture(e.pointerId); // 밖의 포인터를 캡처하면 버튼이 이벤트를 잃는다
    this.active.set(e.pointerId, e);

    if (this.active.size >= 2) {
      // 멀티터치 → 제스처. 진행 중 스트로크는 "폐기" — 첫 손가락은 핀치의 절반이지
      // 그리기 의도가 아니다. 커밋하면 점이 찍힌다(웨일북 두 손가락 확대 실측).
      if (this.drawing) {
        this.drawing = false;
        this.drawingPointerId = -1;
        this.cb.onCancel();
      }
      const phase = this.gestureActive ? "restart" : "start";
      this.gestureActive = true;
      this.cb.onGesture([...this.active.values()], e, phase);
      return;
    }

    /* 작업대 여백·캔버스 위 UI에 닿은 첫 손가락은 제스처 후보로만 붙잡아 둔다 — 여기서
     * 그리기를 시작하면 종이 밖에서 시작한 획이 생긴다. 두 번째 손가락이 오면 위 분기가 받는다. */
    if (!this.onSurface(e) || !this.canvasHit(e)) return;

    this.drawing = true;
    this.drawingPointerId = e.pointerId;
    this.lastMove = null;
    // dropout 유지값은 획 단위 — 앞 획의 세기가 다음 획 머리로 새면 안 된다
    this.lastPenRaw = 0;
    // 0으로 시작하면 첫 dab이 최대 필압(0.85)이라 획 머리에 블롭이 생긴다
    // → 중간 속도로 시작해 느리면 자연스럽게 굵어지게
    this.speedEma = 1.1;
    const p = this.toStrokePoint(e);
    this.lastDrawPoint = p;
    this.cb.onDown(p, e);
  };

  private handleMove = (e: PointerEvent) => {
    if (penIsContacting(e)) this.lastPenTs = e.timeStamp; // 호버는 무시 — 펜이 근처에 있다고 손을 막지 않는다
    if (this.rejected.has(e.pointerId)) {
      // 보류 중이면 최신 좌표는 따라간다 — 승격되는 순간 핀치 기준점이 옛 자리면 화면이 튄다
      const held = this.palmPending.get(e.pointerId);
      if (held) this.palmPending.set(e.pointerId, { e, since: held.since });
      return;
    }
    /* 펜을 대는 순간 이미 닿아 있던 손가락(=손바닥)도 즉시 버린다 — 손이 먼저 닿는 게 보통.
     * 단 **제스처로 승격된 손가락은 면제**한다: 잠금 구간이 1.2초라 승격 직후의 move가
     * 전부 여기서 다시 버려져 핀치가 그대로 증발했다(2026-08-21 실측 — 승격을 넣고도
     * 펜 뗀 0.1초 뒤 배율이 1.00 그대로였던 이유). 펜이 실제로 닿아 있는 동안(penDown)은
     * 진짜 손바닥이므로 제스처 중이라도 버린다. */
    if (
      e.pointerType === "touch" &&
      this.penInUse(e.timeStamp) &&
      this.active.has(e.pointerId) &&
      (this.penIsDown(e.timeStamp) || !this.gestureActive)
    ) {
      this.dropPointer(e);
      return;
    }
    if (this.active.has(e.pointerId)) this.active.set(e.pointerId, e);

    if (this.active.size >= 2) {
      this.cb.onGesture([...this.active.values()], e, "move");
      return;
    }
    if (!this.drawing || e.pointerId !== this.drawingPointerId) return;

    // coalesced events로 고주파 입력 복원(지원 시), 미지원(구형 Safari)은 단일
    const raw =
      typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
    const events = raw.length > 0 ? raw : [e];
    const points = events.map((ev) => this.toStrokePoint(ev));
    this.lastDrawPoint = points[points.length - 1];
    this.cb.onMove(points, e);
  };

  private handleUp = (e: PointerEvent) => {
    if (e.pointerType === "pen") {
      this.penDown = false;
      this.lastPenTs = e.timeStamp;
    }
    this.palmPending.delete(e.pointerId);
    if (this.rejected.delete(e.pointerId)) return; // 버린 손바닥 — 커밋하지 않는다
    this.active.delete(e.pointerId);
    this.release(e.pointerId);

    if (this.gestureActive) {
      /* 손가락이 하나도 안 남았을 때만 "end" — Gestures가 탭(되돌리기/다시)을 그 시점에
       * 판정한다. 예전엔 직전 active.size로 판정해 마지막 하나를 뗄 때 end가 안 나갔다. */
      const rest = [...this.active.values()];
      // 브라우저가 취소한 입력은 "뗀 것"이 아니다 — 탭으로 세면 되돌리기가 오발동한다
      const phase = rest.length >= 2 ? "move" : e.type === "pointercancel" ? "cancel" : "end";
      this.cb.onGesture(rest, e, phase);
      if (rest.length === 0) this.gestureActive = false;
      return;
    }
    if (this.drawing && e.pointerId === this.drawingPointerId) {
      this.drawing = false;
      this.drawingPointerId = -1;
      this.cb.onUp(this.toStrokePoint(e), e);
    }
  };

  /* 포인터 캡처는 실패할 수 있다(이미 뗀 포인터, 합성 이벤트 등) — 던지면 그 아래
   * 그리기 로직이 통째로 실행되지 않는다. 캡처 실패는 무시하고 그리기는 계속한다. */
  private capture(id: number): void {
    try {
      this.surface.setPointerCapture?.(id);
    } catch {
      /* 캡처 실패 — 그리기에는 영향 없음 */
    }
  }
  private release(id: number): void {
    try {
      this.surface.releasePointerCapture?.(id);
    } catch {
      /* 이미 해제됨 */
    }
  }

  /** 오래 붙들고 있던 보류는 핀치 후보에서 내린다(rejected 로는 남겨 획을 만들지 않는다) */
  private expirePalmPending(now: number): void {
    for (const [id, held] of this.palmPending) {
      if (now - held.since > PALM_HOLD_MS) this.palmPending.delete(id);
    }
  }

  /** 보류해 둔 팜 터치들 + 방금 들어온 터치를 함께 핀치로 승격한다(펜 잠금 구간의 두 손가락) */
  private promotePalmToGesture(e: PointerEvent): void {
    for (const [id, held] of this.palmPending) {
      this.rejected.delete(id);
      if (this.onSurface(held.e)) this.capture(id);
      this.active.set(id, held.e);
    }
    this.palmPending.clear();
    if (this.onSurface(e)) this.capture(e.pointerId);
    this.active.set(e.pointerId, e);
    if (this.drawing) {
      this.drawing = false;
      this.drawingPointerId = -1;
      this.cb.onCancel();
    }
    const phase = this.gestureActive ? "restart" : "start";
    this.gestureActive = true;
    this.cb.onGesture([...this.active.values()], e, phase);
  }

  /** 진행 중이던 포인터를 팜으로 재분류해 버린다(그리던 획은 폐기 — 점 찍힘 방지) */
  private dropPointer(e: PointerEvent): void {
    this.active.delete(e.pointerId);
    this.rejected.add(e.pointerId);
    this.release(e.pointerId);
    if (this.drawing && e.pointerId === this.drawingPointerId) {
      this.drawing = false;
      this.drawingPointerId = -1;
      this.cb.onCancel();
    }
    // 제스처 중이던 손가락이 빠졌다 — 남은 점이 2 미만이면 제스처를 닫는다(상태가 반쯤 열린 채
    // 남으면 다음 핀치의 기준 거리가 옛 값이라 화면이 튄다)
    if (this.gestureActive && this.active.size < 2) {
      this.cb.onGesture([...this.active.values()], e, "end");
      if (this.active.size === 0) this.gestureActive = false;
    }
  }

  destroy(): void {
    this.root.removeEventListener("pointerdown", this.handleDown, true);
    this.root.removeEventListener("pointermove", this.handleMove, true);
    this.root.removeEventListener("pointerup", this.handleUp, true);
    this.root.removeEventListener("pointercancel", this.handleUp, true);
    this.surface.removeEventListener("pointerleave", this.handleUp);
    this.surface.ownerDocument?.removeEventListener("visibilitychange", this.handleHide);
    this.active.clear();
    this.rejected.clear();
    this.palmPending.clear();
  }
}
