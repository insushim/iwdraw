"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import type { ArtEngine } from "@/engine/ArtEngine";
import { useEditor } from "@/store/editor";
import { exportPng, exportThumb } from "@/engine/export/PngExporter";
import { CanvasStage } from "./CanvasStage";
import { ModeTabs } from "./ModeTabs";
import { BrushBar } from "./BrushBar";
import { ColorPalette } from "./ColorPalette";
import { BrushControls } from "./BrushControls";
import { LayerPanel } from "./LayerPanel";
import { ActionRail } from "./ActionRail";
import { useKeyboard } from "./useKeyboard";
import { MovieModal } from "./MovieModal";
import { useCollab } from "./useCollab";
import { CollabOverlay } from "./CollabOverlay";
import { ArtonLogo } from "@/components/arton-logo";

export interface EditorProps {
  lineartSrc?: string;
  initialMode?: import("@/engine/types").Mode;
  /** 협동 방 코드 */
  room?: string;
  /** 저장 콜백(학생 작품 제출) — 없으면 로컬 다운로드 */
  onSave?: (png: Blob, thumb: Blob) => Promise<void> | void;
  /** 상단에 표시할 닉네임/학급 */
  who?: string;
  backHref?: string;
}

export function Editor({ lineartSrc, initialMode, room, onSave, who, backHref = "/" }: EditorProps) {
  useKeyboard();
  const engineRef = useRef<ArtEngine | null>(null);
  const [engine, setEngine] = useState<ArtEngine | null>(null);
  const collab = useCollab(engine, room);
  const juniorMode = useEditor((s) => s.juniorMode);
  const toggleJunior = useEditor((s) => s.toggleJunior);
  const latency = useEditor((s) => s.latencyMs);
  const restoreAt = useEditor((s) => s.restoreAvailable);
  const dismissRestore = useEditor((s) => s.dismissRestore);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [showMovie, setShowMovie] = useState(false);

  const handleExport = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || saving) return;
    setSaving(true);
    try {
      const layers = engine.getLayers();
      const png = await exportPng(layers, engine.width, engine.height, {
        background: true,
        scale: 1,
      });
      const thumb = await exportThumb(layers, engine.width, engine.height);
      if (onSave) {
        await onSave(png, thumb);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        const url = URL.createObjectURL(png);
        const a = document.createElement("a");
        a.href = url;
        a.download = `arton-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setSaving(false);
    }
  }, [onSave, saving]);

  return (
    <div className="flex h-dvh flex-col bg-cream">
      {/* 상단바 */}
      <header className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="flex items-center gap-3">
          <Link href={backHref} className="pressable touch-target rounded-card px-2 text-xl" aria-label="나가기">
            ←
          </Link>
          <ArtonLogo className="h-8" />
          {who && <span className="hidden rounded-full bg-paper px-3 py-1 text-sm font-semibold text-ink-soft shadow-soft sm:block">{who}</span>}
          {room && (
            <span className="flex items-center gap-1 rounded-full bg-berry-soft px-3 py-1 text-sm font-semibold text-berry" title="함께 그리는 친구">
              👥 {collab.connected ? `${collab.peers.length + 1}명` : "연결 중…"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!lineartSrc && (
            <button
              onClick={() =>
                setOrientation((o) => (o === "landscape" ? "portrait" : "landscape"))
              }
              className="pressable touch-target rounded-card bg-paper px-3 py-2 text-sm font-semibold text-ink-soft shadow-soft"
              title="캔버스 방향 바꾸기 (그림이 지워져요)"
              aria-label="캔버스 방향 바꾸기"
            >
              {orientation === "landscape" ? "🖼️ 가로" : "📄 세로"}
            </button>
          )}
          {latency > 0 && (
            <span
              className={`hidden rounded-full px-2 py-1 text-xs md:block ${
                latency < 40 ? "bg-leaf-soft text-leaf-deep" : "bg-sun-soft text-ink-soft"
              }`}
              title="스트로크 지연"
            >
              {latency}ms
            </span>
          )}
          <button
            onClick={() => setShowMovie(true)}
            className="pressable touch-target rounded-card bg-paper px-3 py-2 text-sm font-semibold text-ink-soft shadow-soft"
            aria-label="무비 모드"
            title="그려지는 과정 재생"
          >
            🎬 무비
          </button>
          <button
            onClick={toggleJunior}
            aria-pressed={juniorMode}
            className={`pressable touch-target rounded-card px-3 py-2 text-sm font-semibold ${
              juniorMode ? "bg-leaf text-white" : "bg-paper text-ink-soft shadow-soft"
            }`}
          >
            {juniorMode ? "🧸 저학년 켬" : "🧸 저학년"}
          </button>
        </div>
      </header>

      {/* 복구 배너 */}
      {restoreAt && (
        <RestoreBanner savedAt={restoreAt} onRestore={() => engineRef.current?.restore()} onDismiss={dismissRestore} />
      )}

      {/* 모드 탭 */}
      <div className="px-3 pb-2">
        <ModeTabs />
      </div>

      {/* 본체: 좌 도구 · 캔버스 · 우 액션/레이어 */}
      <div className="flex min-h-0 flex-1 gap-2 px-3 pb-2 max-md:flex-col">
        {/* 좌: 도구 막대(데스크톱 세로, 모바일 하단) */}
        <div className="order-2 flex shrink-0 overflow-x-auto md:order-1 md:flex-col">
          <BrushBar />
        </div>

        {/* 중앙: 캔버스 */}
        <div className="order-1 min-h-0 flex-1 md:order-2">
          <div className="relative h-full w-full">
            <CanvasStage
              key={lineartSrc ? `t:${lineartSrc}` : `o:${orientation}`}
              lineartSrc={lineartSrc}
              initialMode={initialMode}
              orientation={orientation}
              onEngineReady={(e) => {
                engineRef.current = e;
                setEngine(e);
              }}
            />
            {room && <CollabOverlay cursors={collab.cursors} engine={engine} />}
          </div>
        </div>

        {/* 우: 액션 + 색 + 컨트롤 + 레이어 */}
        <div className="order-3 flex shrink-0 gap-2 overflow-y-auto md:w-72 md:flex-col">
          <ActionRail onExport={handleExport} />
          <div className="flex-1 space-y-2 md:flex-none">
            <ColorPalette />
            <BrushControls />
            <LayerPanel />
          </div>
        </div>
      </div>

      {saving && <Toast>저장 중…</Toast>}
      {saved && <Toast tone="leaf">✅ 저장했어요!</Toast>}
      {showMovie && engineRef.current && (
        <MovieModal engine={engineRef.current} onClose={() => setShowMovie(false)} />
      )}
      {room && collab.kicked && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-6">
          <div className="rounded-bubble bg-paper p-8 text-center shadow-lift">
            <div className="text-5xl">👋</div>
            <p className="mt-4 font-display text-xl text-ink">협동 캔버스에서 나왔어요</p>
            <a href={backHref} className="pressable mt-6 inline-block rounded-card bg-coral px-6 py-3 font-display text-white">
              돌아가기
            </a>
          </div>
        </div>
      )}
      {room && collab.locked && (
        <Toast tone="ink">🔒 선생님이 캔버스를 잠갔어요</Toast>
      )}
    </div>
  );
}

function RestoreBanner({
  savedAt,
  onRestore,
  onDismiss,
}: {
  savedAt: number;
  onRestore: () => void;
  onDismiss: () => void;
}) {
  const mins = Math.round((Date.now() - savedAt) / 60000);
  return (
    <div className="mx-3 mb-2 flex items-center justify-between gap-2 rounded-card bg-sky-soft px-4 py-2 text-sm text-sky-deep">
      <span>이어서 그릴 그림이 있어요 ({mins < 1 ? "방금" : `${mins}분 전`}).</span>
      <div className="flex gap-2">
        <button onClick={onRestore} className="pressable rounded-full bg-sky px-3 py-1 font-semibold text-white">
          이어 그리기
        </button>
        <button onClick={onDismiss} className="pressable rounded-full px-3 py-1 font-semibold text-ink-soft">
          새로 시작
        </button>
      </div>
    </div>
  );
}

function Toast({ children, tone = "ink" }: { children: React.ReactNode; tone?: "ink" | "leaf" }) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full px-6 py-3 font-display text-white shadow-lift ${
        tone === "leaf" ? "bg-leaf" : "bg-ink"
      }`}
      role="status"
    >
      {children}
    </div>
  );
}
