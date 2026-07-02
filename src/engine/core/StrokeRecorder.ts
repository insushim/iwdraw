import type { RecordedStroke } from "../types";

/*
 * StrokeRecorder: 타임랩스/무비 모드용. 스트로크·액션을 시간순으로 기록.
 * 재생 시 TimelapseExporter가 이 로그를 순서대로 엔진에 재적용한다.
 */
export class StrokeRecorder {
  private log: RecordedStroke[] = [];
  private enabled = true;

  record(stroke: RecordedStroke): void {
    if (this.enabled) this.log.push(stroke);
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  getLog(): readonly RecordedStroke[] {
    return this.log;
  }

  /** 전체 그리기 소요 시간(ms) — 첫 점 ~ 마지막 점 */
  get durationMs(): number {
    let min = Infinity;
    let max = -Infinity;
    for (const s of this.log) {
      for (const p of s.points) {
        if (p.t < min) min = p.t;
        if (p.t > max) max = p.t;
      }
    }
    return max > min ? max - min : 0;
  }

  clear(): void {
    this.log = [];
  }

  serialize(): string {
    return JSON.stringify(this.log);
  }

  load(json: string): void {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) this.log = parsed;
    } catch {
      /* 손상된 로그는 무시 */
    }
  }
}
