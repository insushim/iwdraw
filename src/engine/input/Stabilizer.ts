import type { StrokePoint } from "../types";

/*
 * Stabilizer: 손떨림 보정 강도 0~10.
 * perfect-freehand의 streamline과 별개로, 입력 단계에서 지수 이동평균으로 커서를 따라가게 한다.
 * (강도가 클수록 커서를 늦게 따라가 매끄러움 ↑, 반응성 ↓)
 */
export class Stabilizer {
  private cur: StrokePoint | null = null;
  private alpha = 1;

  /** 강도 0~10 → EMA 계수(0.15~1) */
  setStrength(strength: number): void {
    const s = Math.max(0, Math.min(10, strength));
    this.alpha = 1 - (s / 10) * 0.85;
  }

  begin(p: StrokePoint): StrokePoint {
    this.cur = { ...p };
    return this.cur;
  }

  push(p: StrokePoint): StrokePoint {
    if (!this.cur) return this.begin(p);
    const a = this.alpha;
    this.cur = {
      x: this.cur.x + (p.x - this.cur.x) * a,
      y: this.cur.y + (p.y - this.cur.y) * a,
      pressure: this.cur.pressure + (p.pressure - this.cur.pressure) * a,
      t: p.t,
      tiltX: p.tiltX,
      tiltY: p.tiltY,
    };
    return { ...this.cur };
  }

  /** 스트로크 끝: 남은 보정 지연을 실제 커서로 수렴시키는 마지막 점 */
  end(target: StrokePoint): StrokePoint {
    this.cur = null;
    return target;
  }
}

/** streamline(perfect-freehand) 값으로 매핑 — 강도 0~10 → 0~0.7 */
export function strengthToStreamline(strength: number): number {
  return (Math.max(0, Math.min(10, strength)) / 10) * 0.7;
}
