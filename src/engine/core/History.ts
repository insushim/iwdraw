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

export class History {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private readonly limit: number;
  private readonly maxBytes: number;
  private bytes = 0;

  constructor(limit = 50, maxBytes = 300 * 1024 * 1024) {
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
