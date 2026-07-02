import type { StrokePoint } from "../types";

/*
 * PointerHandler: Pointer Events → StrokePoint. 필압(pressure)·coalesced events 처리.
 * 마우스는 pressure 0.5 고정 → 브러시가 simulatePressure로 보완.
 * 캔버스 좌표계로 변환(디바이스 픽셀 비율 반영)은 호출측(ArtEngine)이 매핑 함수 주입.
 */
export interface PointerCallbacks {
  onDown(p: StrokePoint, e: PointerEvent): void;
  onMove(points: StrokePoint[], e: PointerEvent): void;
  onUp(p: StrokePoint, e: PointerEvent): void;
  /** 멀티터치 → 제스처로 위임할지 판단(두 손가락 이상) */
  onGesture(active: PointerEvent[], e: PointerEvent, phase: "start" | "move" | "end"): void;
}

export type ToLocal = (clientX: number, clientY: number) => { x: number; y: number };

export class PointerHandler {
  private active = new Map<number, PointerEvent>();
  private drawing = false;
  private drawingPointerId = -1;

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
    // 마우스는 버튼 눌림 시 pressure 0 보고 → 0.5로 정규화
    const pressure =
      e.pointerType === "mouse" ? 0.5 : e.pressure > 0 ? e.pressure : 0.5;
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
    this.el.setPointerCapture?.(e.pointerId);
    this.active.set(e.pointerId, e);

    if (this.active.size >= 2) {
      // 멀티터치 → 제스처. 진행 중 스트로크는 취소.
      if (this.drawing) {
        this.drawing = false;
        this.cb.onUp(this.toStrokePoint(e), e);
      }
      this.cb.onGesture([...this.active.values()], e, "start");
      return;
    }

    this.drawing = true;
    this.drawingPointerId = e.pointerId;
    this.cb.onDown(this.toStrokePoint(e), e);
  };

  private handleMove = (e: PointerEvent) => {
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
    this.cb.onMove(events.map((ev) => this.toStrokePoint(ev)), e);
  };

  private handleUp = (e: PointerEvent) => {
    const wasMulti = this.active.size >= 2;
    this.active.delete(e.pointerId);
    this.el.releasePointerCapture?.(e.pointerId);

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

  destroy(): void {
    this.el.removeEventListener("pointerdown", this.handleDown);
    this.el.removeEventListener("pointermove", this.handleMove);
    this.el.removeEventListener("pointerup", this.handleUp);
    this.el.removeEventListener("pointercancel", this.handleUp);
    this.el.removeEventListener("pointerleave", this.handleUp);
    this.active.clear();
  }
}
