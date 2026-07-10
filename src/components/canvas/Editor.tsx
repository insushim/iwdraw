"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { SuggestBar } from "./SuggestBar";
import { PendingStampBar } from "./PendingStampBar";
import { StampPalette } from "./StampPalette";
import { PhotoImport } from "@/components/photo-import";
import { ArtonLogo } from "@/components/arton-logo";
import { Icon } from "./icons";

export interface EditorProps {
  lineartSrc?: string;
  /** 그대로 이어 그리기 — 변환 없이 그림 레이어에 까는 원본 이미지 */
  baseSrc?: string;
  /** 진입마다 고유한 토큰(URL의 ?v=) — 같은 커스텀 이미지 URL 재진입 시 강제 재마운트용 */
  navKey?: string;
  initialMode?: import("@/engine/types").Mode;
  /** 협동 방 코드 */
  room?: string;
  /** 저장 콜백(학생 작품 제출) — 없으면 로컬 다운로드 */
  onSave?: (png: Blob, thumb: Blob) => Promise<void> | void;
  /** 상단에 표시할 닉네임/학급 */
  who?: string;
  backHref?: string;
  /** 학생 세션이 있을 때 학급 갤러리 링크 */
  galleryHref?: string;
}

/*
 * 에디터 레이아웃: 캔버스가 주인공.
 *  헤더 = 뒤로 · 로고 · [모드 탭] · 방향/무비/저학년 · 저장(주요 버튼)
 *  본체 = 좌 도구 레일(세로) · 캔버스(플로팅 되돌리기/다시) · 우 색/굵기/마법/레이어
 */
export function Editor({ lineartSrc, baseSrc, navKey, initialMode, room, onSave, who, backHref = "/", galleryHref }: EditorProps) {
  useKeyboard();
  const engineRef = useRef<ArtEngine | null>(null);
  const [engine, setEngine] = useState<ArtEngine | null>(null);
  const collab = useCollab(engine, room);
  const juniorMode = useEditor((s) => s.juniorMode);
  const toggleJunior = useEditor((s) => s.toggleJunior);
  const restoreAt = useEditor((s) => s.restoreAvailable);
  const dismissRestore = useEditor((s) => s.dismissRestore);
  const viewScale = useEditor((s) => s.viewScale);
  const resetView = useEditor((s) => s.resetView);
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
  const setSuggestSuppressed = useEditor((s) => s.setSuggestSuppressed);
  // 협동 방: 뚝딱그림 수락(undo×k+스탬프)이 원격에 전파되지 않아 캔버스가 갈라진다 — 방에선 잠금
  useEffect(() => {
    setSuggestSuppressed(!!room);
    return () => setSuggestSuppressed(false);
  }, [room, engine, setSuggestSuppressed]);
  const canUndo = useEditor((s) => s.canUndo);
  const canRedo = useEditor((s) => s.canRedo);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  // onSave가 있다 = 학급 코드로 입장한 학생 세션 — 저장이 곧 학급 갤러리 제출
  const submits = !!onSave;
  // 첫 진입 1회 안내(세션당) — 터치 기기는 저장 버튼 툴팁을 볼 수 없다
  const [showSubmitHint, setShowSubmitHint] = useState(false);
  useEffect(() => {
    if (!submits || sessionStorage.getItem("arton.submitHint")) return;
    sessionStorage.setItem("arton.submitHint", "1");
    setShowSubmitHint(true);
    const t = setTimeout(() => setShowSubmitHint(false), 6000);
    return () => clearTimeout(t);
  }, [submits]);
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
        setTimeout(() => setSaved(false), 3500); // 제출 안내 문구가 길어 읽을 시간 확보
      } else {
        const url = URL.createObjectURL(png);
        const a = document.createElement("a");
        a.href = url;
        a.download = `arton-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // 제출 실패(네트워크·잠긴 학급 403·과속 429) — 아이에게도 알려야 재시도한다
      setSaveError(true);
      setTimeout(() => setSaveError(false), 3500);
    } finally {
      setSaving(false);
    }
  }, [onSave, saving]);

  const iconBtn =
    "pressable touch-target flex items-center justify-center gap-1 rounded-full bg-paper px-3 py-2 text-sm font-semibold text-ink-soft shadow-soft";

  return (
    // editor-no-pinch: 데스크톱 크로뮴(웨일북)은 뷰포트 메타 줌 잠금을 무시 — 툴바·여백에서
    // 시작한 핀치가 "브라우저 페이지 줌"을 걸면 캔버스(touch-action:none) 위 핀치로는 못 되돌려
    // 갇힌다(2026-07-07 실사용 보고). 에디터 전역에서 핀치줌 제스처 자체를 차단.
    <div className="editor-no-pinch flex h-dvh flex-col bg-cream">
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
        {galleryHref && (
          <Link
            href={galleryHref}
            className="pressable touch-target hidden items-center gap-1 rounded-full bg-paper px-3 py-1 text-sm font-semibold text-ink-soft shadow-soft sm:flex"
          >
            🖼️ <span className="hidden lg:inline">우리 반 갤러리</span>
          </Link>
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
        {/* 내 사진·그림 가져오기 — 협동 방에서는 숨김(가져오면 방을 떠나게 되어 혼란) */}
        {!room && (
          <PhotoImport
            renderButton={(openPicker, converting) => (
              <button
                onClick={openPicker}
                disabled={converting}
                className={iconBtn}
                aria-label="내 사진·그림 가져오기"
                title="사진이나 그림을 가져와서 선따기·이어 그리기"
              >
                📷
                <span className="hidden lg:inline">{converting ? "변환 중…" : "사진"}</span>
              </button>
            )}
          />
        )}
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
          title={
            submits ? "저장하면 우리 반 갤러리에 바로 전시돼요" : "그림을 파일로 저장해요"
          }
        >
          <Icon name="save" className="h-5 w-5" />
          {saving ? (submits ? "제출 중…" : "저장 중…") : "저장"}
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
            // navKey(진입 고유 토큰)가 있으면 그것으로 key 고정 — 커스텀 이미지는 dataURL 앞부분이
            // 같아(같은 크기) slice(0,64) 충돌 → 2회차 재마운트 실패하던 버그의 근본 수정.
            key={
              navKey
                ? `v:${navKey}`
                : lineartSrc
                  ? `t:${lineartSrc}`
                  : baseSrc
                    ? `b:${baseSrc.slice(0, 64)}`
                    : `o:${orientation}`
            }
            lineartSrc={lineartSrc}
            baseSrc={baseSrc}
            initialMode={initialMode}
            orientation={orientation}
            onEngineReady={(e) => {
              engineRef.current = e;
              setEngine(e);
            }}
          />
          <SuggestBar />
          <PendingStampBar />
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
            {viewScale > 1.01 && (
              <button
                onClick={resetView}
                aria-label="화면 맞춤"
                title="확대 풀고 화면에 맞추기"
                className="pressable flex h-12 items-center gap-1 rounded-full bg-sky px-4 font-display text-sm text-white shadow-lift"
              >
                🔍 화면 맞춤 ×{viewScale.toFixed(1)}
              </button>
            )}
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
            // 넓은 화면(xl+)에선 2열로 펼쳐 색·굵기·마법도구·레이어를 스크롤 없이 한눈에.
            // 좁은 화면은 기존대로 1열(md) / 가로 스크롤(모바일). 2열 wrapper는 모바일에서
            // contents로 사라져 원래 1줄 흐름을 유지한다.
            <div className="flex shrink-0 gap-2 overflow-y-auto max-md:overflow-x-auto md:w-[264px] md:flex-col md:overflow-x-hidden xl:w-[500px] xl:flex-row xl:overflow-y-hidden">
              <div className="flex shrink-0 flex-col gap-2 max-md:contents xl:flex-1 xl:overflow-y-auto">
                <ColorPalette />
                <BrushControls />
              </div>
              <div className="flex shrink-0 flex-col gap-2 max-md:contents xl:flex-1 xl:overflow-y-auto">
                <ActionRail />
                <LayerPanel />
              </div>
            </div>
          )}
        </div>
      </div>

      {showSubmitHint && !saving && !saved && (
        <Toast>💾 다 그리고 저장을 누르면 우리 반 갤러리에 제출돼요</Toast>
      )}
      {saveError && <Toast>😢 저장하지 못했어요 — 잠시 후 다시 눌러 주세요</Toast>}
      {saving && <Toast>{submits ? "우리 반 갤러리로 보내는 중…" : "저장 중…"}</Toast>}
      {saved && (
        <Toast tone="leaf">
          {submits ? "✅ 우리 반 갤러리에 전시했어요! 갤러리에서 확인해 보세요" : "✅ 저장했어요!"}
        </Toast>
      )}
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
      <StampPalette />
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
