"use client";

import { useEffect, useRef, useState } from "react";
import type { ArtEngine } from "@/engine/ArtEngine";
import { createBrush } from "@/engine/brushes";
import { floodFill } from "@/engine/brushes/FillTool";
import { playMovie, recordMovie, type MovieSpeed, type ReplayHandle } from "@/engine/export/TimelapseExporter";
import { Button } from "@/components/ui";
import type { RecordedStroke } from "@/engine/types";

/*
 * 무비 모드: 내 그림이 그려지는 과정을 재생/녹화.
 * 별도 재생 캔버스에서 StrokeRecorder 로그를 순서대로 다시 그린다(원본 훼손 없음).
 */
export function MovieModal({ engine, onClose }: { engine: ArtEngine; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [speed, setSpeed] = useState<MovieSpeed>(2);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const strokes = engine.getRecorder().getLog();
  const empty = strokes.length === 0;

  const makeHandle = (): ReplayHandle | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d")!;
    return {
      displayCanvas: canvas,
      clearCanvas: () => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      },
      replayStroke: (stroke: RecordedStroke, prog: number) => replayOne(ctx, canvas, stroke, prog),
    };
  };

  const play = async () => {
    const handle = makeHandle();
    if (!handle) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setPlaying(true);
    await playMovie(strokes, handle, speed, setProgress, abortRef.current.signal);
    setPlaying(false);
  };

  const record = async () => {
    const handle = makeHandle();
    if (!handle) return;
    setRecording(true);
    try {
      const blob = await recordMovie(strokes, handle, speed, setProgress);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `arton-movie-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setRecording(false);
    }
  };

  useEffect(() => {
    // 초기 캔버스 배치: 엔진 비율 맞춤
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = engine.width;
      canvas.height = engine.height;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    return () => abortRef.current?.abort();
  }, [engine.width, engine.height]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-bubble bg-paper p-6 shadow-lift">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl text-ink">🎬 무비 모드</h2>
          <button onClick={onClose} className="pressable touch-target text-xl" aria-label="닫기">
            ✕
          </button>
        </div>

        {empty ? (
          <p className="py-10 text-center text-ink-soft">아직 그린 그림이 없어요. 먼저 그림을 그려 보세요!</p>
        ) : (
          <>
            <div className="overflow-hidden rounded-card border border-cream-deep bg-white">
              <canvas ref={canvasRef} className="h-auto w-full" style={{ aspectRatio: `${engine.width}/${engine.height}` }} />
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-cream-deep">
              <div className="h-full bg-coral transition-[width]" style={{ width: `${progress * 100}%` }} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex gap-1.5">
                {([1, 2, 4] as MovieSpeed[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    aria-pressed={speed === s}
                    className={`pressable rounded-full px-3 py-1.5 text-sm font-semibold ${
                      speed === s ? "bg-sky text-white" : "bg-cream text-ink-soft"
                    }`}
                  >
                    {s}배속
                  </button>
                ))}
              </div>
              <div className="flex-1" />
              <Button onClick={play} disabled={playing || recording} tone="sky">
                {playing ? "재생 중…" : "▶ 재생"}
              </Button>
              <Button onClick={record} disabled={playing || recording} tone="coral">
                {recording ? "저장 중…" : "⬇ 영상 저장"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* 재생 캔버스에 스트로크 하나를 progress(0~1)만큼 그린다 */
function replayOne(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  stroke: RecordedStroke,
  progress: number,
) {
  if (stroke.extra?.fill) {
    // 페인트통 재생: 전체 다시 채우기(간이 — progress 100%에서만)
    if (progress < 1) return;
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const p = stroke.points[0];
    floodFill(img.data, canvas.width, canvas.height, p.x, p.y, stroke.settings.color, { tolerance: 32 });
    ctx.putImageData(img, 0, 0);
    return;
  }
  const brush = createBrush(stroke.brush);
  const pts = stroke.points.slice(0, Math.max(2, Math.ceil(stroke.points.length * progress)));
  if (pts.length < 1) return;
  const color = stroke.settings.color;
  ctx.save();
  ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
  if (stroke.brush === "eraser") ctx.globalCompositeOperation = "destination-out";
  else if (stroke.brush === "marker" || stroke.brush === "watercolor") ctx.globalCompositeOperation = "multiply";
  else if (stroke.brush === "glow") ctx.globalCompositeOperation = "lighter";

  let dabs = brush.begin(pts[0], stroke.settings);
  for (let i = 1; i < pts.length; i++) dabs = dabs.concat(brush.move(pts[i]));
  dabs = dabs.concat(brush.end()); // rotationFollows 브러시의 보류 첫 dab(탭 점) 회수
  // wash 브러시는 flow=1(진하기는 합성 시 1회)이라 재생 시 washOpacity를 반영해야 비슷한 농도
  const washK =
    brush.cfg.strokeBlend === "wash" ? brush.cfg.washOpacity * stroke.settings.opacity : 1;
  for (const d of dabs) {
    ctx.globalAlpha = d.alpha * washK;
    const c = d.color ?? color;
    ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
