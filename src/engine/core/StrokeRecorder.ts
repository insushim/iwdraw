import type { RecordedStroke } from "../types";

/*
 * StrokeRecorder: 타임랩스/무비 모드용. 스트로크·액션을 시간순으로 기록.
 * 재생 시 TimelapseExporter가 이 로그를 순서대로 엔진에 재적용한다.
 *
 * 언두 커서: 되돌린 획이 로그에 남으면 무비 최종 프레임 ≠ 현재 캔버스
 * (2026-07-23 사용자 실측 "무비가 지금 현재 상태까지 안보여주네"). 히스토리
 * 커맨드(pushTileCommand)와 로그 항목은 1:1이므로, undo/redo 성공 시 커서만
 * 옮기면 정합이 유지된다. 언두 상태에서 새 획을 기록하면 히스토리처럼 redo
 * 꼬리를 버린다.
 */
export class StrokeRecorder {
  private log: RecordedStroke[] = [];
  private enabled = true;
  /* 획별 JSON 조각 캐시 — 자동저장(5~15초마다)이 전체 로그를 JSON.stringify 하면
   * 비용이 세션 길이에 비례해 커진다(긴 수업 후반부 렉, 2026-07-14). 새 획만 직렬화하고
   * 저장 시에는 이어붙이기만 한다. */
  private parts: string[] = [];
  private bytes = 0;
  /** log[0..cursor)만 활성 — 그 뒤는 언두된 획(redo 대기) */
  private cursor = 0;
  /** 로그 밖 언두 횟수 — 3MB 캡이 앞을 버린 뒤에도 히스토리는 더 깊이 undo될 수 있다.
   * 세지 않으면 redo가 로그와 한 칸씩 어긋난다(교차검증 발견: 캡 축출↔커서 크로스토크) */
  private underflow = 0;
  /* 로그 상한 — 무비 로그는 세션 내내 무한히 쌓이고 자동저장 때마다 IndexedDB에 통째로
   * 들어간다. 상한을 넘으면 가장 오래된 획부터 버린다(무비는 최근 구간부터 재생). */
  private static readonly MAX_BYTES = 3 * 1024 * 1024;

  record(stroke: RecordedStroke): void {
    if (!this.enabled) return;
    this.underflow = 0; // 새 기록 = 히스토리 분기 폐기 — 로그 밖 언두 부채도 소멸
    this.truncateRedoTail();
    const json = JSON.stringify(stroke);
    this.log.push(stroke);
    this.parts.push(json);
    this.bytes += json.length;
    this.cursor = this.log.length;
    while (this.bytes > StrokeRecorder.MAX_BYTES && this.log.length > 1) {
      this.bytes -= this.parts[0].length;
      this.parts.shift();
      this.log.shift();
      this.cursor = Math.max(0, this.cursor - 1);
    }
  }

  /** 되돌리기 — 히스토리 undo가 성공했을 때만 호출(1:1 정합) */
  undo(): void {
    if (this.cursor > 0) this.cursor--;
    else this.underflow++;
  }

  /** 다시하기 — 히스토리 redo가 성공했을 때만 호출 */
  redo(): void {
    if (this.underflow > 0) this.underflow--;
    else if (this.cursor < this.log.length) this.cursor++;
  }

  /** 언두된 redo 꼬리 폐기 — 새 기록·dropLast 전에 호출(히스토리의 분기 폐기와 동일) */
  private truncateRedoTail(): void {
    if (this.cursor < this.log.length) {
      for (let i = this.cursor; i < this.parts.length; i++) this.bytes -= this.parts[i].length;
      this.log.length = this.cursor;
      this.parts.length = this.cursor;
    }
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  getLog(): readonly RecordedStroke[] {
    return this.cursor === this.log.length ? this.log : this.log.slice(0, this.cursor);
  }

  /** 최근 n개 항목 제거 — 뚝딱그림이 스케치 획을 스탬프로 치환할 때 재생 로그도 함께 정리 */
  dropLast(n: number): void {
    if (n > 0) {
      this.truncateRedoTail();
      this.log.length = Math.max(0, this.log.length - n);
      this.parts.length = this.log.length;
      this.bytes = this.parts.reduce((a, p) => a + p.length, 0);
      this.cursor = this.log.length;
    }
  }

  /** 전체 그리기 소요 시간(ms) — 첫 점 ~ 마지막 점(활성 구간만) */
  get durationMs(): number {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < this.cursor; i++) {
      for (const p of this.log[i].points) {
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
    this.cursor = 0;
    this.underflow = 0;
  }

  serialize(): string {
    // 활성 구간만 저장 — 언두된 획을 되살릴 히스토리는 어차피 저장되지 않는다
    return `[${this.parts.slice(0, this.cursor).join(",")}]`;
  }

  load(json: string): void {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        // 손상 항목 방어 — [null]·[{}] 등이 들어오면 durationMs/rescale/재생에서 예외
        this.log = parsed.filter(
          (s): s is RecordedStroke =>
            !!s && typeof s === "object" && Array.isArray((s as RecordedStroke).points),
        );
        this.parts = parsed.map((s) => JSON.stringify(s));
        this.bytes = this.parts.reduce((a, p) => a + p.length, 0);
        // record()와 동일한 상한 집행 — 초과 로그를 그대로 두면 다음 자동저장이
        // 초과 크기 그대로 IndexedDB에 재저장된다(교차검증 발견)
        while (this.bytes > StrokeRecorder.MAX_BYTES && this.log.length > 1) {
          this.bytes -= this.parts[0].length;
          this.parts.shift();
          this.log.shift();
        }
        this.cursor = this.log.length;
        this.underflow = 0;
      }
    } catch {
      /* 손상된 로그는 무시 */
    }
  }

  /**
   * 좌표 일괄 변환 — 복원 시 저장 당시 캔버스 크기 ≠ 지금 크기일 때 픽셀은
   * contain-축소되는데 로그 좌표가 원좌표면 무비 획이 엉뚱한 곳(화면 밖)에 재생된다.
   * 픽셀과 동일한 배율·오프셋을 점·굵기·스탬프 파라미터에 적용한다.
   */
  rescale(k: number, dx: number, dy: number): void {
    if (k === 1 && dx === 0 && dy === 0) return;
    for (const s of this.log) {
      for (const p of s.points) {
        p.x = p.x * k + dx;
        p.y = p.y * k + dy;
      }
      s.settings = { ...s.settings, size: s.settings.size * k };
      const ex = s.extra as
        | { stamp?: { cx: number; cy: number; size: number }; text?: { cx: number; cy: number; size: number } }
        | undefined;
      const st = ex?.stamp ?? ex?.text;
      if (st) {
        st.cx = st.cx * k + dx;
        st.cy = st.cy * k + dy;
        st.size *= k;
      }
    }
    this.parts = this.log.map((s) => JSON.stringify(s));
    this.bytes = this.parts.reduce((a, p) => a + p.length, 0);
  }
}
