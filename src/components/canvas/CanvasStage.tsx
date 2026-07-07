"use client";

import { useEffect, useRef, useState } from "react";
import { ArtEngine } from "@/engine/ArtEngine";
import { useEditor } from "@/store/editor";
import type { Mode } from "@/engine/types";
import { fitAspectHelper } from "@/lib/aspect";

/*
 * CanvasStage: 실제 캔버스 DOM을 만들고 ArtEngine을 마운트한다.
 * 캔버스 해상도는 "도안 비율"에 맞춰 결정한다(세로 도안 → 세로 캔버스).
 * 폰(세로)에선 꽉 차고, 크롬북(가로)에선 색칠지처럼 가운데 세로로 표시 — 도안 재생성 불필요.
 * 빈 캔버스는 orientation(가로/세로)으로 결정.
 * 바깥은 어두운 작업대(bg), 종이(캔버스)만 하얗게 — 그릴 수 있는 영역이 한눈에 보인다.
 */
export interface CanvasStageProps {
  /** 색칠 모드 초기 도안 URL */
  lineartSrc?: string;
  /** 그대로 이어 그리기 — 변환 없이 그림 레이어에 까는 원본 이미지 */
  baseSrc?: string;
  /** 초기 모드(랜딩에서 ?mode=... 로 진입) */
  initialMode?: Mode;
  /** 빈 캔버스 방향 */
  orientation?: "landscape" | "portrait";
  onEngineReady?: (engine: ArtEngine) => void;
}

const fitCanvasSize = fitAspectHelper;

function loadImageSize(src: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img.naturalWidth / img.naturalHeight || 1);
    img.onerror = () => resolve(4 / 3);
    img.src = src;
  });
}

export function CanvasStage({
  lineartSrc,
  baseSrc,
  initialMode,
  orientation = "landscape",
  onEngineReady,
}: CanvasStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ArtEngine | null>(null);
  const attach = useEditor((s) => s.attach);
  const detach = useEditor((s) => s.detach);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  // 1단계: 캔버스 크기 결정(도안 비율 또는 방향)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let aspect: number;
      if (lineartSrc) aspect = await loadImageSize(lineartSrc);
      else if (baseSrc) aspect = await loadImageSize(baseSrc);
      else aspect = orientation === "portrait" ? 1152 / 1536 : 1536 / 1152;
      if (!cancelled) setSize(fitCanvasSize(aspect));
    })();
    return () => {
      cancelled = true;
    };
  }, [lineartSrc, baseSrc, orientation]);

  // 2단계: 크기 확정 후 엔진 마운트
  useEffect(() => {
    const el = canvasRef.current;
    if (!el || !size) return;
    // QA용 백엔드 강제(?backend=2d|gl) — gl은 headless 테스트에서 SwiftShader 허용
    const param = new URLSearchParams(window.location.search).get("backend");
    const backendOverride = param === "2d" || param === "gl" ? param : undefined;
    const engine = new ArtEngine({
      width: size.width,
      height: size.height,
      display: el,
      backendOverride,
    });
    engineRef.current = engine;
    attach(engine);
    const store = useEditor.getState();
    if (lineartSrc) {
      store.setMode("coloring");
      void engine.loadLineart(lineartSrc);
    } else if (baseSrc) {
      // 그대로 이어 그리기 — 원본을 그림 레이어에 깔고 자유 그리기 모드
      if (initialMode) store.setMode(initialMode);
      void engine.loadBaseImage(baseSrc);
    } else if (initialMode) {
      store.setMode(initialMode);
    }
    onEngineReady?.(engine);
    return () => {
      detach();
      engine.destroy();
      engineRef.current = null;
    };
    // size 확정 시 1회 마운트
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-card bg-cream-deep/60 p-2 md:p-4">
      {size && (
        <canvas
          ref={canvasRef}
          width={size.width}
          height={size.height}
          className="canvas-surface h-auto max-h-full w-auto max-w-full rounded-md bg-white shadow-lift"
          style={{ aspectRatio: `${size.width}/${size.height}`, touchAction: "none" }}
          aria-label="그림 캔버스"
        />
      )}
    </div>
  );
}
