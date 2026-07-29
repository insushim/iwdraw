import type { StrokePoint } from "../types";

/*
 * PointerHandler: Pointer Events → StrokePoint. 필압(pressure)·coalesced events 처리.
 * 펜(스타일러스)은 실제 필압, 마우스·손가락은 속도 기반 필압 시뮬 —
 * 천천히 그으면 눌러 그리듯 굵고 진하게, 빠르면 가늘게(획 끝 테이퍼가 자연히 생김).
 * 캔버스 좌표계로 변환(디바이스 픽셀 비율 반영)은 호출측(ArtEngine)이 매핑 함수 주입.
 */
export interface PointerCallbacks {
  onDown(p: StrokePoint, e: PointerEvent): void;
  onMove(points: StrokePoint[], e: PointerEvent): void;
  onUp(p: StrokePoint, e: PointerEvent): void;
  /** 진행 중 획 폐기 — 두 번째 손가락(핀치 의도) 감지 시. 커밋(onUp)하면 첫
   * 손가락의 점/짧은 획이 캔버스에 남는다(웨일북 실측 2026-07-07) */
  onCancel(): void;
  /** 멀티터치 → 제스처로 위임할지 판단(두 손가락 이상) */
  onGesture(active: PointerEvent[], e: PointerEvent, phase: "start" | "move" | "end"): void;
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
 */
const PEN_LOCKOUT_MS = 1200;

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

  /** 펜이 "쓰이는 중"인가 — 펜이 닿아 있거나 방금까지 썼다 */
  private penInUse(now: number): boolean {
    return this.penDown || now - this.lastPenTs < PEN_LOCKOUT_MS;
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

  constructor(
    private readonly el: HTMLElement,
    private readonly toLocal: ToLocal,
    private readonly cb: PointerCallbacks,
  ) {
    el.addEventListener("pointerdown", this.handleDown);
    el.addEventListener("pointermove", this.handleMove);
    el.addEventListener("pointerup", this.handleUp);
    el.addEventListener("pointercancel", this.handleUp);
    el.addEventListener("pointerleave", this.handleUp);
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
    if (e.pointerType === "pen") {
      this.penDown = true;
      this.lastPenTs = e.timeStamp;
    } else if (this.isPalm(e)) {
      this.rejected.add(e.pointerId); // 손바닥 — 그리기·제스처 어디에도 참여시키지 않는다
      return;
    }
    this.capture(e.pointerId);
    this.active.set(e.pointerId, e);

    if (this.active.size >= 2) {
      // 멀티터치 → 제스처. 진행 중 스트로크는 "폐기" — 첫 손가락은 핀치의 절반이지
      // 그리기 의도가 아니다. 커밋하면 점이 찍힌다(웨일북 두 손가락 확대 실측).
      if (this.drawing) {
        this.drawing = false;
        this.drawingPointerId = -1;
        this.cb.onCancel();
      }
      this.cb.onGesture([...this.active.values()], e, "start");
      return;
    }

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
    if (this.rejected.has(e.pointerId)) return;
    // 펜을 대는 순간 이미 닿아 있던 손가락(=손바닥)도 즉시 버린다 — 손이 먼저 닿는 게 보통
    if (e.pointerType === "touch" && this.penInUse(e.timeStamp) && this.active.has(e.pointerId)) {
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
    if (this.rejected.delete(e.pointerId)) return; // 버린 손바닥 — 커밋하지 않는다
    const wasMulti = this.active.size >= 2;
    this.active.delete(e.pointerId);
    this.release(e.pointerId);

    if (wasMulti) {
      this.cb.onGesture([...this.active.values()], e, this.active.size >= 2 ? "move" : "end");
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
      this.el.setPointerCapture?.(id);
    } catch {
      /* 캡처 실패 — 그리기에는 영향 없음 */
    }
  }
  private release(id: number): void {
    try {
      this.el.releasePointerCapture?.(id);
    } catch {
      /* 이미 해제됨 */
    }
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
  }

  destroy(): void {
    this.el.removeEventListener("pointerdown", this.handleDown);
    this.el.removeEventListener("pointermove", this.handleMove);
    this.el.removeEventListener("pointerup", this.handleUp);
    this.el.removeEventListener("pointercancel", this.handleUp);
    this.el.removeEventListener("pointerleave", this.handleUp);
    this.active.clear();
    this.rejected.clear();
  }
}
