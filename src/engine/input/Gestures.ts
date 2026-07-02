/*
 * Gestures: 멀티터치 제스처 인식.
 * - 두 손가락 핀치/팬 → 줌·이동
 * - 두 손가락 탭(짧게) → undo
 * - 세 손가락 탭 → redo
 */
export interface GestureCallbacks {
  onTransform(delta: { scale: number; dx: number; dy: number; cx: number; cy: number }): void;
  onUndo(): void;
  onRedo(): void;
}

interface Snapshot {
  cx: number;
  cy: number;
  dist: number;
}

const TAP_MS = 220;
const TAP_MOVE_TOL = 12;

export class Gestures {
  private prev: Snapshot | null = null;
  private startTime = 0;
  private maxPointers = 0;
  private totalMove = 0;
  private startCentroid = { x: 0, y: 0 };

  constructor(private readonly cb: GestureCallbacks) {}

  private centroid(pts: { clientX: number; clientY: number }[]): { x: number; y: number } {
    const x = pts.reduce((a, p) => a + p.clientX, 0) / pts.length;
    const y = pts.reduce((a, p) => a + p.clientY, 0) / pts.length;
    return { x, y };
  }

  private spread(pts: { clientX: number; clientY: number }[], c: { x: number; y: number }): number {
    return pts.reduce((a, p) => a + Math.hypot(p.clientX - c.x, p.clientY - c.y), 0) / pts.length;
  }

  update(
    pointers: { clientX: number; clientY: number }[],
    phase: "start" | "move" | "end",
    now: number,
  ): void {
    if (phase === "start") {
      this.startTime = now;
      this.maxPointers = pointers.length;
      this.totalMove = 0;
      this.startCentroid = this.centroid(pointers);
      const c = this.startCentroid;
      this.prev = { cx: c.x, cy: c.y, dist: this.spread(pointers, c) };
      return;
    }

    if (phase === "move") {
      this.maxPointers = Math.max(this.maxPointers, pointers.length);
      if (pointers.length < 2 || !this.prev) return;
      const c = this.centroid(pointers);
      const dist = this.spread(pointers, c);
      this.totalMove += Math.hypot(c.x - this.prev.cx, c.y - this.prev.cy);
      const scale = this.prev.dist > 0 ? dist / this.prev.dist : 1;
      this.cb.onTransform({
        scale,
        dx: c.x - this.prev.cx,
        dy: c.y - this.prev.cy,
        cx: c.x,
        cy: c.y,
      });
      this.prev = { cx: c.x, cy: c.y, dist };
      return;
    }

    // end (모든 손가락 뗄 때만 최종 판정)
    if (phase === "end" && pointers.length === 0) {
      const dur = now - this.startTime;
      const isTap = dur < TAP_MS && this.totalMove < TAP_MOVE_TOL;
      if (isTap && this.maxPointers === 2) this.cb.onUndo();
      else if (isTap && this.maxPointers >= 3) this.cb.onRedo();
      this.prev = null;
      this.maxPointers = 0;
    }
  }
}
