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
import { Icon } from "./icons";

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

/*
 * 에디터 레이아웃: 캔버스가 주인공.
 *  헤더 = 뒤로 · 로고 · [모드 탭] · 방향/무비/저학년 · 저장(주요 버튼)
 *  본체 = 좌 도구 레일(세로) · 캔버스(플로팅 되돌리기/다시) · 우 색/굵기/마법/레이어
 */
export function Editor({ lineartSrc, initialMode, room, onSave, who, backHref = "/" }: EditorProps) {
  useKeyboard();
  const engineRef = useRef<ArtEngine | null>(null);
  const [engine, setEngine] = useState<ArtEngine | null>(null);
  const collab = useCollab(engine, room);
  const juniorMode = useEditor((s) => s.juniorMode);
  const toggleJunior = useEditor((s) => s.toggleJunior);
  const restoreAt = useEditor((s) => s.restoreAvailable);
  const dismissRestore = useEditor((s) => s.dismissRestore);
  const newDrawing = useEditor((s) => s.newDrawing);
  // 새 그림 2단계 확인(아동 오조작 방지): 첫 클릭 → "정말요?" 3초, 그 안에 재클릭 시 실행
  const [confirmNew, setConfirmNew] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleNewDrawing = () => {
    if (!confirmNew) {
      setConfirmNew(true);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirmNew(false), 3000);
      return;
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setConfirmNew(false);
    newDrawing();
  };
  const canUndo = useEditor((s) => s.canUndo);
  const canRedo = useEditor((s) => s.canRedo);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [showMovie, setShowMovie] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

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

  const iconBtn =
    "pressable touch-target flex items-center justify-center gap-1 rounded-full bg-paper px-3 py-2 text-sm font-semibold text-ink-soft shadow-soft";

  return (
    <div className="flex h-dvh flex-col bg-cream">
      {/* ── 상단바: 모드 탭이 중앙, 저장이 가장 눈에 띄게 ── */}
      <header className="flex items-center gap-2 px-3 py-2">
        <Link href={backHref} className="pressable touch-target grid place-items-center rounded-full bg-paper px-3 text-xl shadow-soft" aria-label="나가기">
          ←
        </Link>
        <span className="hidden xl:block">
          <ArtonLogo className="h-8" />
        </span>
        {who && (
          <span className="hidden rounded-full bg-paper px-3 py-1 text-sm font-semibold text-ink-soft shadow-soft lg:block">
            {who}
          </span>
        )}
        {room && (
          <span className="flex items-center gap-1 rounded-full bg-berry-soft px-3 py-1 text-sm font-semibold text-berry" title="함께 그리는 친구">
            👥 {collab.connected ? `${collab.peers.length + 1}명` : "연결 중…"}
          </span>
        )}

        <div className="flex flex-1 justify-center">
          <ModeTabs hasLineart={!!lineartSrc} />
        </div>

        {!lineartSrc && (
          <button
            onClick={() => setOrientation((o) => (o === "landscape" ? "portrait" : "landscape"))}
            className={iconBtn}
            title="캔버스 방향 바꾸기 (그림이 지워져요)"
            aria-label="캔버스 방향 바꾸기"
          >
            <Icon name="rotate" className="h-5 w-5" />
            <span className="hidden lg:inline">{orientation === "landscape" ? "가로" : "세로"}</span>
          </button>
        )}
        <button
          onClick={handleNewDrawing}
          className={
            confirmNew
              ? "pressable touch-target flex items-center gap-1 rounded-full bg-berry px-3 py-2 text-sm font-semibold text-white shadow-soft"
              : iconBtn
          }
          aria-label="새 그림"
          title="새 그림: 지금 그림을 지우고 처음부터"
        >
          <Icon name="plus" className="h-5 w-5" />
          <span className={confirmNew ? "" : "hidden lg:inline"}>
            {confirmNew ? "정말요?" : "새 그림"}
          </span>
        </button>
        <button
          onClick={() => setShowMovie(true)}
          className={iconBtn}
          aria-label="무비 모드"
          title="그려지는 과정 재생"
        >
          <Icon name="movie" className="h-5 w-5" />
          <span className="hidden lg:inline">무비</span>
        </button>
        <button
          onClick={toggleJunior}
          aria-pressed={juniorMode}
          aria-label="저학년 모드"
          title="저학년 모드: 도구를 쉬운 것만 보여줘요"
          className={`pressable touch-target flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold ${
            juniorMode ? "bg-leaf text-white shadow-soft" : "bg-paper text-ink-soft shadow-soft"
          }`}
        >
          <Icon name="junior" className="h-5 w-5" />
          <span className="hidden lg:inline">저학년</span>
        </button>
        <button
          onClick={handleExport}
          disabled={saving}
          className="pressable touch-target flex items-center gap-1.5 rounded-full bg-coral px-5 py-2.5 font-display text-white shadow-soft disabled:opacity-60"
          aria-label="저장하기"
        >
          <Icon name="save" className="h-5 w-5" />
          {saving ? "저장 중…" : "저장"}
        </button>
      </header>

      {/* 복구 배너 */}
      {restoreAt && (
        <RestoreBanner savedAt={restoreAt} onRestore={() => engineRef.current?.restore()} onDismiss={dismissRestore} />
      )}

      {/* ── 본체: 좌 도구 레일 · 캔버스 · 우 패널 ── */}
      <div className="flex min-h-0 flex-1 gap-2 px-3 pb-3 max-md:flex-col">
        <div className="order-2 flex min-h-0 shrink-0 md:order-1">
          <BrushBar />
        </div>

        {/* 중앙: 캔버스 + 플로팅 되돌리기/다시 */}
        <div className="relative order-1 min-h-0 flex-1 md:order-2">
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
          <div className="absolute bottom-3 left-3 z-10 flex gap-2">
            <button
              onClick={undo}
              disabled={!canUndo}
              aria-label="되돌리기"
              title="되돌리기 (Ctrl+Z)"
              className="pressable grid h-12 w-12 place-items-center rounded-full bg-paper shadow-lift disabled:opacity-35"
            >
              <Icon name="undo" className="h-6 w-6" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              aria-label="다시 실행"
              title="다시 실행 (Ctrl+Shift+Z)"
              className="pressable grid h-12 w-12 place-items-center rounded-full bg-paper shadow-lift disabled:opacity-35"
            >
              <Icon name="redo" className="h-6 w-6" />
            </button>
          </div>
          {room && <CollabOverlay cursors={collab.cursors} engine={engine} />}
        </div>

        {/* 우측: 색 → 굵기 → 마법 도구 → 레이어 (접으면 캔버스 풀폭) */}
        <div className="order-3 flex min-h-0 shrink-0 items-stretch gap-1">
          <button
            onClick={() => setPanelOpen((v) => !v)}
            aria-expanded={panelOpen}
            aria-label={panelOpen ? "도구 패널 접기" : "도구 패널 펼치기"}
            title={panelOpen ? "도구 패널 접기 — 캔버스를 더 넓게" : "도구 패널 펼치기"}
            className="pressable hidden w-5 shrink-0 items-center justify-center self-center rounded-full bg-paper py-6 text-xs text-ink-faint shadow-soft hover:text-ink md:flex"
          >
            {panelOpen ? "▸" : "◂"}
          </button>
          {panelOpen && (
            <div className="flex shrink-0 gap-2 overflow-y-auto max-md:overflow-x-auto md:w-[264px] md:flex-col">
              <ColorPalette />
              <BrushControls />
              <ActionRail />
              <LayerPanel />
            </div>
          )}
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
