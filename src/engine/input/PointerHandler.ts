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

export class PointerHandler {
  private active = new Map<number, PointerEvent>();
  private drawing = false;
  private drawingPointerId = -1;
  /** 속도 기반 필압 시뮬 상태(마우스·손가락) */
  private lastMove: { x: number; y: number; t: number } | null = null;
  private speedEma = 0;
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
    if (e.pointerType === "pen" && e.pressure > 0) {
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
    this.el.setPointerCapture?.(e.pointerId);
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
