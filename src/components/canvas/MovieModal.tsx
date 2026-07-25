"use client";

import { useEffect, useRef, useState } from "react";
import type { ArtEngine } from "@/engine/ArtEngine";
import { createBrush } from "@/engine/brushes";
import { smearSegment } from "@/engine/tools/SmudgeTool";
import { drawStampOnCtx, getStamp } from "@/engine/tools/StampTool";
import { drawTextOnCtx } from "@/engine/tools/TextInsert";
import { floodFill } from "@/engine/brushes/FillTool";
import { mulberry32 } from "@/engine/types";
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
  if (stroke.extra?.layerDelete) {
    // 레이어 삭제: 히스토리 1커맨드 = 로그 1항목 정합용 자리표시(재생 캔버스는 단일
    // 합성이라 레이어 개념이 없다). 그리는 것 없이 넘어간다.
    return;
  }
  if (stroke.extra?.stamp) {
    // 뚝딱그림 스탬프: progress 100%에서 한 번에(스케치 획들 뒤에 "뿅" 등장)
    if (progress < 1) return;
    const st = stroke.extra.stamp as { id: string; cx: number; cy: number; size: number };
    const def = getStamp(st.id);
    if (def) drawStampOnCtx(ctx, def, st.cx, st.cy, st.size, stroke.settings.color);
    return;
  }
  if (stroke.extra?.text) {
    // 글씨: 스탬프와 같이 progress 100%에서 한 번에 등장
    if (progress < 1) return;
    const tx = stroke.extra.text as {
      value: string;
      family: string;
      outline?: { color: { r: number; g: number; b: number }; ratio: number } | null;
      cx: number;
      cy: number;
      size: number;
    };
    drawTextOnCtx(
      ctx,
      { value: tx.value, family: tx.family, outline: tx.outline ?? null },
      tx.cx,
      tx.cy,
      tx.size,
      stroke.settings.color,
    );
    return;
  }
  if (stroke.extra?.clear) {
    // 전체 지우기: progress 100%에서 흰 종이로(재생 캔버스는 단일 합성이라 근사)
    if (progress < 1) return;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    return;
  }
  if (stroke.extra?.fill) {
    // 페인트통 재생: 전체 다시 채우기(간이 — progress 100%에서만)
    if (progress < 1) return;
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const p = stroke.points[0];
    floodFill(img.data, canvas.width, canvas.height, p.x, p.y, stroke.settings.color, { tolerance: 32 });
    ctx.putImageData(img, 0, 0);
    return;
  }
  if (stroke.extra?.shape) {
    // QuickShape: 엔진(applyQuickShape)과 동일한 폴리라인 스트로크로 재생
    const pts = stroke.points.slice(0, Math.max(2, Math.ceil(stroke.points.length * progress)));
    const c = stroke.settings.color;
    ctx.save();
    ctx.strokeStyle = `rgb(${c.r},${c.g},${c.b})`;
    ctx.globalAlpha = stroke.settings.opacity;
    ctx.lineWidth = stroke.settings.size;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (stroke.brush === "smudge") {
    // 번짐: 엔진과 동일한 smearSegment로 재생(레이어 직접 편집 도구)
    const pts = stroke.points.slice(0, Math.max(2, Math.ceil(stroke.points.length * progress)));
    let prev = { x: pts[0].x, y: pts[0].y };
    for (let i = 1; i < pts.length; i++) {
      prev = smearSegment(ctx, prev, pts[i], stroke.settings.size * 1.6, stroke.settings.opacity);
    }
    return;
  }
  // 시드 고정 — 같은 스트로크의 prefix를 progress 스텝마다 다시 그리므로, 브러시가
  // Math.random()이면(글리터 입자 등) 스텝마다 배치가 달라져 이전 스텝 위에 누적된다
  // (에디터보다 훨씬 빽빽·재생마다 다름 — 교차검증 발견). 같은 시드면 동일 위치에 덮여 무해.
  const brush = createBrush(stroke.brush, mulberry32(7));
  const pts = stroke.points.slice(0, Math.max(2, Math.ceil(stroke.points.length * progress)));
  if (pts.length < 1) return;
  const color = stroke.settings.color;
  ctx.save();
  ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
  if (stroke.brush === "eraser") ctx.globalCompositeOperation = "destination-out";
  else if (stroke.brush === "marker") ctx.globalCompositeOperation = "darken";
  else if (stroke.brush === "watercolor") ctx.globalCompositeOperation = "multiply";
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
    if (d.tip === "sparkle" && d.size > 6) {
      // 글리터 별 글린트 — 원으로 그리면 "기포"가 된다(에디터와 동일한 지각 원리)
      const r2 = d.size / 2;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rotation);
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const a0 = (k * Math.PI) / 2;
        ctx.moveTo(0, 0);
        // 갈래: 끝점 + 양옆 짧은 허리(오목한 4각 별)
        ctx.lineTo(Math.cos(a0 - 0.35) * r2 * 0.18, Math.sin(a0 - 0.35) * r2 * 0.18);
        ctx.lineTo(Math.cos(a0) * r2, Math.sin(a0) * r2);
        ctx.lineTo(Math.cos(a0 + 0.35) * r2 * 0.18, Math.sin(a0 + 0.35) * r2 * 0.18);
        ctx.closePath();
      }
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, r2 * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
