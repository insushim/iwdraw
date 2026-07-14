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
    } else if (e.pointerType === "pen" && e.pressure > 0) {
      pressure = e.pressure; // 스타일러스: 실제 필압
    } else {
      // 마우스/손가락: 속도 기반 필압 시뮬(EMA) — 느리면 굵고 진하게
      const prev = this.lastMove;
      if (prev && e.timeStamp > prev.t) {
        const d = Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
        const v = d / (e.timeStamp - prev.t); // px/ms
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
