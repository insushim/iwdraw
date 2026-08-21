/*
 * Gestures: 멀티터치 제스처 인식.
 * - 두 손가락 핀치/팬 → 줌·이동
 * - 두 손가락 탭(짧게) → undo
 * - 세 손가락 탭 → redo
 */
/** start = 제스처 시작 · restart = 손가락 추가로 기준만 다시 잡음 · move · end · cancel */
export type GesturePhase = "start" | "restart" | "move" | "end" | "cancel";

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
/* 손가락 사이 거리의 하한(px, 중심까지의 반경 — 두 손가락이면 간격의 절반).
 * 엄지·검지를 붙인 채 시작하면 기준 거리가 3~5px이라 조금만 벌려도 배율이 수십 배로
 * 튀었다(2026-08-21 재현: 3px에서 시작 → 한 번에 상한 8배).
 * ⚠️ 처음 24로 잡았더니 이번엔 **좁게 잡은 핀치를 죽였다** — 간격 48px 미만이 전부 하한에
 * 묶여 초반이 안 먹었다(교차검증 지적 → 실측: 간격 40→100px 이 2.50배가 아니라 2.08배).
 * 12(=간격 24px)면 아이가 좁게 잡아도 살아 있고, 붙여 시작한 폭주는 여전히 막힌다. */
const MIN_SPREAD = 12;
/* 한 프레임에 허용하는 배율 변화. 손가락 하나가 순간 이동(터치 재인식·좌표 튐)해도
 * 화면이 한 번에 날아가지 않게 잡아 준다. */
const MAX_STEP = 1.6;

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
    const raw = pts.reduce((a, p) => a + Math.hypot(p.clientX - c.x, p.clientY - c.y), 0) / pts.length;
    return Math.max(MIN_SPREAD, raw);
  }

  update(
    pointers: { clientX: number; clientY: number }[],
    phase: GesturePhase,
    now: number,
  ): void {
    /* 브라우저가 취소한 입력(pointercancel)은 "뗀 것"이 아니다 — 탭으로 판정하면
     * 창 전환·시스템 제스처가 되돌리기를 발동시킨다. 상태만 비운다. */
    if (phase === "cancel") {
      this.prev = null;
      this.maxPointers = 0;
      this.totalMove = 0;
      return;
    }
    /* restart = 진행 중인 제스처에 손가락이 하나 더 얹혔다. 기준 거리·중심만 다시 잡고
     * (안 그러면 화면이 튄다) 탭 판정에 쓰는 시각·이동량은 이어간다 — 예전엔 이때도 start를
     * 보내 startTime과 totalMove가 리셋됐고, 긴 제스처가 막판에 "짧은 탭"으로 둔갑했다. */
    if (phase === "start" || phase === "restart") {
      const c = this.centroid(pointers);
      this.prev = { cx: c.x, cy: c.y, dist: this.spread(pointers, c) };
      this.maxPointers = Math.max(phase === "restart" ? this.maxPointers : 0, pointers.length);
      if (phase === "start") {
        this.startTime = now;
        this.totalMove = 0;
        this.startCentroid = c;
      }
      return;
    }

    if (phase === "move") {
      this.maxPointers = Math.max(this.maxPointers, pointers.length);
      if (pointers.length < 2 || !this.prev) return;
      const c = this.centroid(pointers);
      const dist = this.spread(pointers, c);
      /* 벌린 양도 "움직임"으로 센다. 중심을 고정한 채 대칭으로 벌리는 핀치는 centroid가
       * 거의 안 움직여서, 이동량만 세면 220ms 안에 끝낸 확대가 **탭으로 오인**돼 되돌리기가
       * 같이 발동했다 — 방금 그린 획이 사라진다(2026-08-21 재현: 획 568픽셀 → 0, 배율 4.67). */
      this.totalMove +=
        Math.hypot(c.x - this.prev.cx, c.y - this.prev.cy) + Math.abs(dist - this.prev.dist);
      const ratio = this.prev.dist > 0 ? dist / this.prev.dist : 1;
      const scale = Math.min(MAX_STEP, Math.max(1 / MAX_STEP, ratio));
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
