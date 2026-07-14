/*
 * History: Command 패턴 undo/redo 50단계.
 * DESIGN-REVIEW A4 — 전체 픽셀 스냅샷이 아니라 레이어별 256px 더티 타일만 보관.
 * 각 커맨드는 apply()/revert()를 스스로 알고, 대용량 타일 비트맵은 커맨드가 소유한다.
 */

export interface Command {
  /** 대략적 메모리(byte) — 예산 관리용 */
  cost: number;
  apply(): void;
  revert(): void;
  /** 리소스 해제(비트맵 등) */
  dispose?(): void;
}

/**
 * 기기 사정에 맞춘 undo 메모리 예산.
 * 타일 스냅샷은 캔버스 픽셀(JS 힙 밖) — 300MB 고정 예산은 웨일북(4GB, 통합 GPU)에서
 * 메모리 압박 → GC·스왑 → "쓰다 보면 렉, 브라우저 껐다 켜면 회복"의 주범이 된다.
 * 되돌리기 단계 수(50)는 유지하되 바이트 예산으로 오래된 것부터 밀어낸다.
 */
export function historyBudgetBytes(): number {
  const mem =
    typeof navigator !== "undefined"
      ? (navigator as unknown as { deviceMemory?: number }).deviceMemory
      : undefined;
  const MB = 1024 * 1024;
  if (!mem) return 128 * MB; // 미상(사파리 등) — 중간값
  if (mem <= 2) return 32 * MB;
  if (mem <= 4) return 64 * MB; // 웨일북급
  if (mem <= 8) return 128 * MB;
  return 256 * MB;
}

export class History {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private readonly limit: number;
  private readonly maxBytes: number;
  private bytes = 0;

  constructor(limit = 50, maxBytes = historyBudgetBytes()) {
    this.limit = limit;
    this.maxBytes = maxBytes;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** 이미 실행된 변경을 커맨드로 기록(apply는 부르지 않음 — 이미 적용됨) */
  push(cmd: Command): void {
    this.undoStack.push(cmd);
    this.bytes += cmd.cost;
    this.clearRedo();
    // 단계 수 + 메모리 예산 이중 상한
    while (
      this.undoStack.length > this.limit ||
      (this.bytes > this.maxBytes && this.undoStack.length > 1)
    ) {
      const dropped = this.undoStack.shift();
      if (dropped) {
        this.bytes -= dropped.cost;
        dropped.dispose?.();
      }
    }
  }

  undo(): boolean {
    const cmd = this.undoStack.pop();
    if (!cmd) return false;
    cmd.revert();
    this.bytes -= cmd.cost;
    this.redoStack.push(cmd);
    return true;
  }

  redo(): boolean {
    const cmd = this.redoStack.pop();
    if (!cmd) return false;
    cmd.apply();
    this.bytes += cmd.cost;
    this.undoStack.push(cmd);
    return true;
  }

  private clearRedo(): void {
    for (const c of this.redoStack) c.dispose?.();
    this.redoStack = [];
  }

  clear(): void {
    for (const c of this.undoStack) c.dispose?.();
    this.clearRedo();
    this.undoStack = [];
    this.bytes = 0;
  }
}
