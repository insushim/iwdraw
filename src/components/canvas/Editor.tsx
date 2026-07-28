"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ArtEngine } from "@/engine/ArtEngine";
import { useEditor } from "@/store/editor";
import { exportPng, exportWebp, exportThumb } from "@/engine/export/PngExporter";
import { CanvasStage } from "./CanvasStage";
import { ModeTabs } from "./ModeTabs";
import { BrushBar } from "./BrushBar";
import { ColorPalette } from "./ColorPalette";
import { BrushControls } from "./BrushControls";
import { LayerPanel } from "./LayerPanel";
import { ActionRail } from "./ActionRail";
import { useKeyboard } from "./useKeyboard";
import { MovieModal } from "./MovieModal";
import { CollabStartModal } from "./CollabStartModal";
import { shortCodeFromRoom } from "@/lib/collab-room";
import { useCollab } from "./useCollab";
import { CollabOverlay } from "./CollabOverlay";
import { SuggestBar } from "./SuggestBar";
import { PendingStampBar } from "./PendingStampBar";
import { StampPalette } from "./StampPalette";
import { TextPalette } from "./TextPalette";
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
  /**
   * 저장 콜백(학생 작품 제출) — 없으면 로컬 다운로드.
   * draftId = 이 그리기 세션의 익명 토큰. 서버가 같은 토큰의 자기 행을 덮어써 갤러리에 최신본만 남긴다.
   */
  onSave?: (image: Blob, thumb: Blob, draftId?: string) => Promise<{ id: string } | null | void> | void;
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
/** 그리기 세션마다 발급하는 dedup 토큰(작품 id 아님·서버에 노출 안 되는 랜덤값). 구형 웹뷰 폴백 포함. */
function genDraftId(): string {
  try {
    const u = globalThis.crypto?.randomUUID?.();
    if (u) return u;
    // randomUUID가 없는 구형 웹뷰(비보안 컨텍스트 등) — getRandomValues는 대개 살아있다.
    const b = globalThis.crypto?.getRandomValues?.(new Uint8Array(16));
    if (b) return Array.from(b, (n) => n.toString(16).padStart(2, "0")).join("");
  } catch {
    /* 폴백 */
  }
  // 최후 폴백. draft 토큰은 남의 작품을 지우지 못하고(자기 행 덮어쓰기뿐) 어떤 API로도 노출되지
  // 않지만, 추측 저항성이 낮으면 같은 학생 명의로 재입장한 사람이 충돌을 노릴 수 있어 폭을 넓힌다.
  return `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`;
}

/* 마지막으로 "제출한" 그림의 draft 토큰을 자동저장(이어그리기)과 짝지어 보관한다.
 * 새로고침·탭 크래시 후 [이어그리기]로 돌아온 그림은 같은 작품이므로, 그때만 이 토큰을 되살려
 * 서버가 갤러리의 그 행을 덮어쓰게 한다. 반대로 단순 재마운트(가로/세로 전환 등)에는 항상
 * 새 토큰을 쓴다 — 빈 캔버스에 그린 다른 그림이 옛 작품을 덮어쓰는 사고가 유실보다 나쁘기 때문. */
const DRAFT_KEY = "arton.draftId";
function rememberDraft(id: string | null): void {
  try {
    if (id) localStorage.setItem(DRAFT_KEY, id);
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* 사생활 보호 모드 등 — dedup만 포기하고 저장은 정상 동작 */
  }
}
function recallDraft(): string | null {
  try {
    return localStorage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
}

export function Editor({ lineartSrc, baseSrc, navKey, initialMode, room, onSave, who, backHref = "/", galleryHref }: EditorProps) {
  useKeyboard();
  const editorRef = useRef<HTMLDivElement>(null);
  // 캔버스 밖(툴바·여백)에서 시작한 ctrl+wheel(트랙패드 핀치/마우스 줌)은 브라우저 페이지
  // 줌을 걸어 새로고침해도 확대가 안 풀린다(JS로 페이지 줌 리셋 불가) — 에디터 전역 차단.
  // 캔버스 위 줌은 CanvasStage가 앱 뷰 줌으로 처리(새로고침 시 리셋). 여기선 막기만 한다.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const block = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };
    el.addEventListener("wheel", block, { passive: false });
    return () => el.removeEventListener("wheel", block);
  }, []);
  const engineRef = useRef<ArtEngine | null>(null);
  const [engine, setEngine] = useState<ArtEngine | null>(null);
  // dedup: 같은 그림을 여러 번 저장하면(중간 저장→완성 저장) 갤러리에 최신본만 남긴다.
  // 이 그리기 세션의 익명 토큰 — 저장 때 서버로 보내면 서버가 같은 토큰의 자기 행을 덮어쓴다.
  // 새 그림(리셋)·다른 도안 진입 시 새 토큰으로 갈려, 진짜 다른 작품은 별개로 남는다.
  const draftIdRef = useRef<string>(genDraftId());
  const collab = useCollab(engine, room);
  const mode = useEditor((s) => s.mode);
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
    // 새 그림 = 새 그리기 세션 → 다음 저장은 별개 작품(이어그리기 짝도 끊는다)
    draftIdRef.current = genDraftId();
    rememberDraft(null);
    newDrawing();
  };
  const setSuggestSuppressed = useEditor((s) => s.setSuggestSuppressed);
  // 협동 방: 뚝딱그림 수락(undo×k+스탬프)이 원격에 전파되지 않아 캔버스가 갈라진다 — 방에선 잠금
  useEffect(() => {
    setSuggestSuppressed(!!room);
    return () => setSuggestSuppressed(false);
  }, [room, engine, setSuggestSuppressed]);
  // 정상 마운트 = 자가치유 1회권 재장전(global-error/error.tsx의 크래시 자동 복구용)
  useEffect(() => {
    try {
      sessionStorage.removeItem("arton.selfheal");
    } catch {
      /* 통과 */
    }
  }, []);
  const canUndo = useEditor((s) => s.canUndo);
  const canRedo = useEditor((s) => s.canRedo);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
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
  /* 방향 전환은 캔버스를 새로 만든다 = 그림이 통째로 사라지고 되돌리기도 안 된다.
   * 경고가 title 툴팁뿐이라 터치 기기(웨일북·태블릿)에선 아예 볼 수 없었다 —
   * "새 그림"과 같은 2단계 확인으로 통일. 빈 캔버스면 잃을 게 없으니 바로 바꾼다. */
  const [confirmRotate, setConfirmRotate] = useState(false);
  const rotateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleRotate = () => {
    const flip = () => setOrientation((o) => (o === "landscape" ? "portrait" : "landscape"));
    if (rotateTimer.current) clearTimeout(rotateTimer.current);
    if (!confirmRotate && engineRef.current?.hasArtwork()) {
      setConfirmRotate(true);
      rotateTimer.current = setTimeout(() => setConfirmRotate(false), 3000);
      return;
    }
    setConfirmRotate(false);
    flip();
  };
  useEffect(() => () => void (rotateTimer.current && clearTimeout(rotateTimer.current)), []);
  const [showMovie, setShowMovie] = useState(false);
  const [showCollab, setShowCollab] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  /* 저장은 두 갈래 — 학급으로 입장했어도 "내 컴퓨터에 저장"은 늘 쓸 수 있어야 한다
   * (2026-07-13 사용자 요청: 갤러리 제출과 파일 저장은 별개의 일). */
  const handleExport = useCallback(
    async (mode: "submit" | "download") => {
      const engine = engineRef.current;
      if (!engine || saving || downloading) return;
      const submit = mode === "submit" && !!onSave;
      if (submit) setSaving(true);
      else setDownloading(true);
      try {
        const layers = engine.getLayers();
        // ⚠️ draft 토큰은 인코딩(await) 전에 캡처한다 — 인코딩 중 "새 그림"·재마운트가 일어나면
        //    ref는 새 세션 토큰으로 갈리는데, 지금 내보내는 픽셀은 그 전 그림이다. 나중에 읽으면
        //    서로 다른 두 작품이 같은 토큰을 공유해 앞 작품이 덮어써진다(2026-07-22 교차검증).
        const draftId = draftIdRef.current;
        if (submit) {
          // 갤러리 제출(R2 누적) = webp 원본 — 무료 스토리지 한도를 6~7배 더 버틴다.
          const image = await exportWebp(layers, engine.width, engine.height);
          const thumb = await exportThumb(layers, engine.width, engine.height);
          // 같은 그림 재저장이면 같은 draft 토큰으로 → 서버가 자기 행을 덮어써 최신본만 남김.
          await onSave!(image, thumb, draftId);
          // 이 그림 = 갤러리의 그 행. 이어그리기로 돌아오면 되살린다. 저장 도중 새 그림으로
          // 갈렸다면 자동저장은 이미 다른 그림이므로 짝을 갱신하지 않는다.
          if (draftIdRef.current === draftId) rememberDraft(draftId);
          setSaved(true);
          setTimeout(() => setSaved(false), 3500); // 제출 안내 문구가 길어 읽을 시간 확보
        } else {
          // 내 컴퓨터에 저장 = 무손실 PNG 유지(아이 소장·인쇄·구형 PC 호환).
          const png = await exportPng(layers, engine.width, engine.height, {
            background: true,
            scale: 1,
          });
          const url = URL.createObjectURL(png);
          const a = document.createElement("a");
          a.href = url;
          a.download = `arton-${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
          setDownloaded(true);
          setTimeout(() => setDownloaded(false), 2500);
        }
      } catch {
        // 제출 실패(네트워크·잠긴 학급 403·과속 429) — 아이에게도 알려야 재시도한다
        setSaveError(true);
        setTimeout(() => setSaveError(false), 3500);
      } finally {
        setSaving(false);
        setDownloading(false);
      }
    },
    [onSave, saving, downloading],
  );

  // shrink-0: 헤더가 좁아지면 flex가 버튼을 눌러 라벨이 접힌다(웨일북에서 버튼이 세로로 길쭉)
  const iconBtn =
    "pressable touch-target flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-paper px-3 py-2 text-sm font-semibold text-ink-soft shadow-soft";

  return (
    // editor-no-pinch: 데스크톱 크로뮴(웨일북)은 뷰포트 메타 줌 잠금을 무시 — 툴바·여백에서
    // 시작한 핀치가 "브라우저 페이지 줌"을 걸면 캔버스(touch-action:none) 위 핀치로는 못 되돌려
    // 갇힌다(2026-07-07 실사용 보고). 에디터 전역에서 핀치줌 제스처 자체를 차단.
    <div ref={editorRef} className="editor-no-pinch flex h-dvh flex-col bg-cream">
      {/* ── 상단바: 모드 탭이 중앙, 저장이 가장 눈에 띄게 ── */}
      {/* overflow-x-auto: 버튼은 전부 shrink-0(라벨이 글자 단위로 접히는 걸 막으려고)이라
          좁은 화면에선 헤더가 넘친다. 그대로 두면 넘치는 게 "페이지"라서 캔버스까지 옆으로
          밀려 흔들린다 — 넘침은 헤더 안에서만 흡수한다(2026-07-25 실측: 390px에서 저장 버튼이
          화면 밖 x=406). */}
      <header className="flex shrink-0 items-center gap-2 overflow-x-auto px-3 py-2 compact:gap-1 compact:px-2 compact:py-1">
        <Link href={backHref} className="pressable touch-target grid place-items-center rounded-full bg-paper px-3 text-xl shadow-soft" aria-label="나가기">
          ←
        </Link>
        <span className="hidden xl:block">
          <ArtonLogo className="h-8" />
        </span>
        {who && (
          <span className="hidden rounded-full bg-paper px-3 py-1 text-sm font-semibold text-ink-soft shadow-soft xl:block">
            {who}
          </span>
        )}
        {galleryHref && (
          <Link
            href={galleryHref}
            className="pressable touch-target hidden items-center gap-1 rounded-full bg-paper px-3 py-1 text-sm font-semibold text-ink-soft shadow-soft sm:flex"
          >
            🖼️ <span className="hidden xl:inline">우리 반 갤러리</span>
          </Link>
        )}
        {room ? (
          <span
            className="flex items-center gap-1.5 rounded-full bg-berry-soft px-3 py-1 text-sm font-semibold text-berry"
            title="이 코드를 친구에게 알려주면 같이 그릴 수 있어요"
          >
            👥 {collab.connected ? `${collab.peers.length + 1}명` : "연결 중…"}
            <span className="rounded-full bg-white/70 px-2 py-0.5 font-display tracking-widest text-berry">
              {shortCodeFromRoom(room)}
            </span>
            <Link
              href={`/draw?mode=${mode}`}
              title="모둠에서 나가 혼자 그리기"
              aria-label="모둠 나가기"
              className="pressable ml-0.5 rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold text-berry hover:bg-white"
            >
              나가기
            </Link>
          </span>
        ) : (
          <button
            onClick={() => setShowCollab(true)}
            className="pressable flex items-center gap-1 rounded-full bg-berry-soft px-3 py-1 text-sm font-semibold text-berry hover:bg-berry-soft/80"
            aria-label="함께 그리기"
            title="친구들과 한 캔버스에 같이 그려요"
          >
            👥 <span className="hidden xl:inline">함께 그리기</span>
          </button>
        )}

        {/* ⚠️ 이 칸은 절대 줄어들면 안 된다(flex: 1 0 auto) — 줄어들면 모드 탭이 자기 칸
            밖으로 흘러 좌우 버튼 위를 덮는다. 실측: 협동 방에서 "모둠 나가기"가 연필
            아이콘에 가려 클릭 자체가 안 됐다(= 방에서 나갈 방법이 없음, 2026-07-25).
            min-w-0(줄어듦) 도, flex-1 기본값(basis 0 + shrink 1) 도 안 된다.
            넘치는 건 헤더의 가로 스크롤이 받는다. */}
        <div className="flex flex-[1_0_auto] justify-center">
          <ModeTabs hasLineart={!!lineartSrc} />
        </div>

        {/* 도안·이어그리기 원본이 있으면 캔버스 비율이 그 그림에 묶여 있어 방향 전환이
            아무 일도 하지 않는다(CanvasStage가 이미지 비율을 쓴다) — 라벨만 가로↔세로로
            바뀌는 죽은 버튼이었다(2026-07-25). 아예 감춘다. */}
        {!lineartSrc && !baseSrc && (
          <button
            onClick={handleRotate}
            className={
              confirmRotate
                ? "pressable touch-target flex items-center gap-1 rounded-full bg-berry px-3 py-2 text-sm font-semibold text-white shadow-soft"
                : iconBtn
            }
            title="캔버스 방향 바꾸기 (그림이 지워져요)"
            aria-label="캔버스 방향 바꾸기"
          >
            <Icon name="rotate" className="h-5 w-5" />
            <span className={confirmRotate ? "" : "hidden xl:inline"}>
              {confirmRotate ? "지워요?" : orientation === "landscape" ? "가로" : "세로"}
            </span>
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
          <span className={confirmNew ? "" : "hidden xl:inline"}>
            {confirmNew ? "정말요?" : "새 그림"}
          </span>
        </button>
        {/* 그림 불러오기 — 협동 방에서는 숨김(가져오면 방을 떠나게 되어 혼란).
            "사진"은 무슨 기능인지 헷갈린다는 실사용 피드백(2026-07-13) → "불러오기" */}
        {!room && (
          <PhotoImport
            renderButton={(openPicker, converting) => (
              <button
                onClick={openPicker}
                disabled={converting}
                className={iconBtn}
                aria-label="그림·사진 불러오기"
                title="내 기기에 있는 그림이나 사진을 불러와서 선따기·이어 그리기"
              >
                📂
                <span className="hidden xl:inline">{converting ? "변환 중…" : "불러오기"}</span>
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
          <span className="hidden xl:inline">무비</span>
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
          <span className="hidden xl:inline">저학년</span>
        </button>
        {/* 학급으로 입장했어도 파일 저장은 따로 쓸 수 있어야 한다(사용자 요청 2026-07-13) */}
        {submits && (
          <button
            onClick={() => handleExport("download")}
            disabled={downloading}
            className={iconBtn}
            aria-label="내 컴퓨터에 저장"
            title="그림을 그림 파일(PNG)로 내 기기에 저장해요"
          >
            <Icon name="save" className="h-5 w-5" />
            <span className="hidden xl:inline">{downloading ? "저장 중…" : "내 기기에 저장"}</span>
          </button>
        )}
        <button
          onClick={() => handleExport(submits ? "submit" : "download")}
          disabled={saving || (!submits && downloading)}
          className="pressable touch-target flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-coral px-5 py-2.5 font-display text-white shadow-soft disabled:opacity-60"
          aria-label={submits ? "우리 반 갤러리에 보내기" : "저장하기"}
          title={
            submits ? "우리 반 갤러리에 바로 전시돼요" : "그림을 그림 파일(PNG)로 저장해요"
          }
        >
          {submits ? (
            <span className="text-lg leading-none">🖼️</span>
          ) : (
            <Icon name="save" className="h-5 w-5" />
          )}
          {submits
            ? saving
              ? "보내는 중…"
              : "갤러리로 보내기"
            : downloading
              ? "저장 중…"
              : "저장"}
        </button>
      </header>

      {/* 복구 배너 */}
      {restoreAt && (
        <RestoreBanner
          savedAt={restoreAt}
          onRestore={() => {
            // 되살린 그림은 저장했던 그 작품 — 짝지어둔 draft 토큰을 되살려 갤러리에 중복으로
            // 쌓이지 않게 한다(없으면 그냥 새 작품으로 남는다).
            const prev = recallDraft();
            if (prev) draftIdRef.current = prev;
            void engineRef.current?.restore();
          }}
          onDismiss={dismissRestore}
        />
      )}

      {/* ── 본체: 좌 도구 레일 · 캔버스 · 우 패널 ── */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-3 compact:flex-row compact:gap-1.5 compact:px-2 compact:pb-2 rail:flex-row">
        <div className="order-2 flex min-h-0 min-w-0 shrink-0 compact:order-1 rail:order-1">
          <BrushBar />
        </div>

        {/* 중앙: 캔버스 + 플로팅 되돌리기/다시 */}
        <div className="relative order-1 min-h-0 flex-1 compact:order-2 rail:order-2">
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
              // 재마운트(다른 도안·재진입·가로세로 전환)는 빈 캔버스로 시작한다 → 항상 새 토큰.
              // 이어그리기로 되살린 경우에만 RestoreBanner가 옛 토큰을 되돌려준다.
              draftIdRef.current = genDraftId();
            }}
          />
          <SuggestBar />
          <PendingStampBar />
          <div className="absolute bottom-3 left-3 z-10 flex gap-2 compact:bottom-1.5 compact:left-1.5 compact:gap-1.5">
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
        {/* ⚠️ max-h-[40dvh]는 **세로 스택에서만** 걸리는 안전장치 — 패널은 shrink-0이라
            제한이 없으면 자기 내용 높이(≈420px)를 그대로 가져가고 캔버스가 0이 된다
            (2026-07-28 세로 폰 제보: 되돌리기 버튼만 있는 얇은 띠가 캔버스였다).
            3열(rail·compact)에서는 세로로 스크롤하면 되므로 제한을 푼다. */}
        <div className="order-3 flex max-h-[40dvh] min-h-0 min-w-0 shrink-0 items-stretch gap-1 compact:max-h-none rail:max-h-none">
          <button
            onClick={() => setPanelOpen((v) => !v)}
            aria-expanded={panelOpen}
            aria-label={panelOpen ? "도구 패널 접기" : "도구 패널 펼치기"}
            title={panelOpen ? "도구 패널 접기 — 캔버스를 더 넓게" : "도구 패널 펼치기"}
            /* ⚠️ compact(가로 폰)에는 내보내지 않는다 — 그 화면에서 캔버스는 **높이에 묶여**
               있어서 패널을 접어도 커지지 않는다(실측 387 → 387). 눌러도 아무 변화가 없는
               버튼은 아이에게 혼란만 준다. rail(넉넉한 화면)에서만 실제로 넓어진다. */
            className="pressable hidden w-5 shrink-0 items-center justify-center self-center rounded-full bg-paper py-6 text-xs text-ink-faint shadow-soft hover:text-ink rail:flex"
          >
            {panelOpen ? "▸" : "◂"}
          </button>
          {panelOpen && (
            // 우측 패널은 모든 화면에서 1열 — 2열(xl)은 시선이 갈라져 불편(2026-07-10
            // 사용자 실측). 모바일은 기존대로 가로 스크롤 1줄(contents로 흐름 유지).
            <div className="flex min-w-0 gap-1.5 overflow-x-auto overflow-y-auto compact:w-[228px] compact:shrink-0 compact:flex-col compact:overflow-x-hidden rail:w-[264px] rail:shrink-0 rail:flex-col rail:overflow-x-hidden">
              <ColorPalette />
              <BrushControls />
              <ActionRail />
              <LayerPanel />
            </div>
          )}
        </div>
      </div>

      {showSubmitHint && !saving && !saved && (
        <Toast>🖼️ 다 그리면 &ldquo;갤러리로 보내기&rdquo; — 파일로 갖고 싶으면 &ldquo;내 기기에 저장&rdquo;</Toast>
      )}
      {saveError && <Toast>😢 저장하지 못했어요 — 잠시 후 다시 눌러 주세요</Toast>}
      {saving && <Toast>우리 반 갤러리로 보내는 중…</Toast>}
      {downloading && <Toast>내 기기에 저장하는 중…</Toast>}
      {saved && (
        <Toast tone="leaf">
          {submits ? "✅ 우리 반 갤러리에 전시했어요! 갤러리에서 확인해 보세요" : "✅ 저장했어요!"}
        </Toast>
      )}
      {downloaded && <Toast tone="leaf">✅ 내 기기에 그림 파일로 저장했어요</Toast>}
      {showMovie && engineRef.current && (
        <MovieModal engine={engineRef.current} onClose={() => setShowMovie(false)} />
      )}
      {showCollab && <CollabStartModal onClose={() => setShowCollab(false)} />}
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
      <TextPalette />
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
