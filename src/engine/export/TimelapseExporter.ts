import type { RecordedStroke } from "../types";

/*
 * TimelapseExporter: StrokeRecorder 로그를 재생(무비 모드) + WebM 녹화.
 * 재생 콜백(replayStroke)은 ArtEngine이 제공 — 로그의 스트로크를 순서대로 다시 그린다.
 */
export interface ReplayHandle {
  /** 한 스트로크를 즉시 그림(애니메이션은 상위에서 rAF로 분할) */
  replayStroke(stroke: RecordedStroke, progress: number): void;
  clearCanvas(): void;
  /** 표시 캔버스(녹화 대상) */
  displayCanvas: HTMLCanvasElement;
}

export type MovieSpeed = 1 | 2 | 4;

/**
 * 무비 모드 재생 — 스트로크를 시간축에 맞춰 점진적으로 그림.
 * onFrame은 진행률(0~1)을 알려 UI 진행바를 갱신.
 */
export async function playMovie(
  strokes: readonly RecordedStroke[],
  handle: ReplayHandle,
  speed: MovieSpeed,
  onFrame?: (progress: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  handle.clearCanvas();
  if (strokes.length === 0) return;

  const total = strokes.length;
  for (let i = 0; i < total; i++) {
    if (signal?.aborted) return;
    // 스트로크 내부도 부드럽게: 점 수에 비례한 짧은 애니메이션
    const stroke = strokes[i];
    const steps = Math.max(1, Math.min(8, Math.floor(stroke.points.length / 6)));
    for (let s = 1; s <= steps; s++) {
      if (signal?.aborted) return;
      handle.replayStroke(stroke, s / steps);
      onFrame?.((i + s / steps) / total);
      await delay(Math.max(8, 40 / speed));
    }
  }
  onFrame?.(1);
}

/** 표시 캔버스를 WebM으로 녹화하며 무비 재생 → Blob 반환 */
export async function recordMovie(
  strokes: readonly RecordedStroke[],
  handle: ReplayHandle,
  speed: MovieSpeed,
  onFrame?: (progress: number) => void,
): Promise<Blob> {
  const stream = handle.displayCanvas.captureStream(30);
  const mime = pickMime();
  const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime || "video/webm" }));
  });

  recorder.start();
  await playMovie(strokes, handle, speed, onFrame);
  // 마지막 프레임 여운
  await delay(400);
  recorder.stop();
  return done;
}

function pickMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
