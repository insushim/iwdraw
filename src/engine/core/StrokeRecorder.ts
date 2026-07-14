import type { RecordedStroke } from "../types";

/*
 * StrokeRecorder: 타임랩스/무비 모드용. 스트로크·액션을 시간순으로 기록.
 * 재생 시 TimelapseExporter가 이 로그를 순서대로 엔진에 재적용한다.
 */
export class StrokeRecorder {
  private log: RecordedStroke[] = [];
  private enabled = true;
  /* 획별 JSON 조각 캐시 — 자동저장(5~15초마다)이 전체 로그를 JSON.stringify 하면
   * 비용이 세션 길이에 비례해 커진다(긴 수업 후반부 렉, 2026-07-14). 새 획만 직렬화하고
   * 저장 시에는 이어붙이기만 한다. */
  private parts: string[] = [];
  private bytes = 0;
  /* 로그 상한 — 무비 로그는 세션 내내 무한히 쌓이고 자동저장 때마다 IndexedDB에 통째로
   * 들어간다. 상한을 넘으면 가장 오래된 획부터 버린다(무비는 최근 구간부터 재생). */
  private static readonly MAX_BYTES = 3 * 1024 * 1024;

  record(stroke: RecordedStroke): void {
    if (!this.enabled) return;
    const json = JSON.stringify(stroke);
    this.log.push(stroke);
    this.parts.push(json);
    this.bytes += json.length;
    while (this.bytes > StrokeRecorder.MAX_BYTES && this.log.length > 1) {
      this.bytes -= this.parts[0].length;
      this.parts.shift();
      this.log.shift();
    }
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  getLog(): readonly RecordedStroke[] {
    return this.log;
  }

  /** 최근 n개 항목 제거 — 뚝딱그림이 스케치 획을 스탬프로 치환할 때 재생 로그도 함께 정리 */
  dropLast(n: number): void {
    if (n > 0) {
      this.log.length = Math.max(0, this.log.length - n);
      this.parts.length = this.log.length;
      this.bytes = this.parts.reduce((a, p) => a + p.length, 0);
    }
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
    this.parts = [];
    this.bytes = 0;
  }

  serialize(): string {
    return `[${this.parts.join(",")}]`;
  }

  load(json: string): void {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        this.log = parsed;
        this.parts = parsed.map((s) => JSON.stringify(s));
        this.bytes = this.parts.reduce((a, p) => a + p.length, 0);
      }
    } catch {
      /* 손상된 로그는 무시 */
    }
  }
}
