"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArtonLogo } from "@/components/arton-logo";
import { Chip } from "@/components/ui";
import { PhotoImport, type PhotoImportHandle } from "@/components/photo-import";
import { printImageA4 } from "@/lib/print";
import {
  GRADE_LABEL,
  loadTemplateManifest,
  type TemplateItem,
  type TemplateManifest,
} from "@/lib/templates";

type Grade = "all" | "low" | "mid" | "high";

export function ColoringGallery() {
  const [manifest, setManifest] = useState<TemplateManifest | null>(null);
  const [cat, setCat] = useState<string>("all");
  const [grade, setGrade] = useState<Grade>("all");
  const [error, setError] = useState<string | null>(null);
  const photoRef = useRef<PhotoImportHandle>(null);

  useEffect(() => {
    loadTemplateManifest().then(setManifest).catch((e) => setError(String(e.message ?? e)));
  }, []);

  const themes = useMemo(() => {
    if (!manifest) return [];
    return Object.values(manifest.themes).filter(
      (t) => cat === "all" || t.category === cat,
    );
  }, [manifest, cat]);

  const items = useMemo(() => {
    const out: (TemplateItem & { theme: string })[] = [];
    for (const t of themes) {
      for (const it of t.items) {
        if (grade === "all" || it.grade === grade) out.push({ ...it, theme: t.theme });
      }
    }
    return out;
  }, [themes, grade]);

  // 붙여넣기(Ctrl+V)로 이미지 가져오기 — 구글 등에서 이미지 복사 후 바로 붙여넣는 흐름
  // (시작 방식 모달·변환·이동은 PhotoImport 공용 컴포넌트가 담당)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      const f = item?.getAsFile();
      if (f) {
        e.preventDefault();
        setError(null);
        photoRef.current?.openFile(f);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  return (
    <main
      className="min-h-dvh"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) {
          setError(null);
          photoRef.current?.openFile(f);
        }
      }}
    >
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-cream-deep bg-cream/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/" className="pressable touch-target rounded-card px-2 text-xl" aria-label="홈으로">
            ←
          </Link>
          <ArtonLogo className="h-8" />
        </div>
        <div className="flex items-center gap-2">
          {/* 버튼 2개는 같은 높이·수직 중앙 정렬(inline-flex h-11) — a/button 베이스라인 어긋남 방지 */}
          <PhotoImport
            ref={photoRef}
            onError={setError}
            renderButton={(openPicker, converting) => (
              <button
                onClick={openPicker}
                disabled={converting}
                className="pressable touch-target inline-flex h-11 items-center justify-center rounded-card bg-sky px-4 font-display text-white shadow-soft disabled:opacity-60"
              >
                {converting ? "변환 중…" : "📷 내 사진·그림으로"}
              </button>
            )}
          />
          <Link
            href="/draw"
            className="pressable touch-target inline-flex h-11 items-center justify-center rounded-card bg-coral px-4 font-display text-white shadow-soft"
          >
            빈 캔버스
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="font-display text-3xl text-ink">색칠할 도안을 골라요 🖍️</h1>
        <p className="mt-2 text-ink-soft">
          로그인 없이 바로 색칠할 수 있어요. 직접 만든 도안 1,000여 장과 저작권이 만료된
          명화(반 고흐·모네·김홍도…)라 마음껏 써도 괜찮아요. 내가 받은 그림 파일을 이 화면에
          끌어다 놓거나 붙여넣기(Ctrl+V)하면 도안으로 만들어 그릴 수도 있어요.
        </p>

        {/* 카테고리 필터 */}
        <div className="mt-5 flex flex-wrap gap-2">
          <FilterChip active={cat === "all"} onClick={() => setCat("all")}>
            전체
          </FilterChip>
          {manifest?.categories.map((c) => (
            <FilterChip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
              {c.emoji} {c.title}
            </FilterChip>
          ))}
        </div>

        {/* 난이도 필터 */}
        <div className="mt-3 flex flex-wrap gap-2">
          {(["all", "low", "mid", "high"] as Grade[]).map((g) => (
            <FilterChip key={g} active={grade === g} onClick={() => setGrade(g)} small>
              {g === "all" ? "모든 학년" : GRADE_LABEL[g]}
            </FilterChip>
          ))}
        </div>

        {error && <p className="mt-8 text-danger">{error}</p>}

        {!manifest && !error && (
          <div className="mt-16 text-center text-ink-faint">도안을 불러오는 중…</div>
        )}

        {manifest && (
          <>
            <p className="mt-5 text-sm text-ink-faint">{items.length}장</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {items.map((it) => (
                <div
                  key={`${it.theme}/${it.id}`}
                  className="group relative overflow-hidden rounded-card bg-paper shadow-soft"
                >
                  <Link
                    href={`/draw?template=${encodeURIComponent(it.image)}&mode=coloring`}
                    className="pressable block"
                  >
                    <div className="aspect-square overflow-hidden bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={it.image}
                        alt={`${it.title} 색칠 도안`}
                        loading="lazy"
                        className="h-full w-full object-contain transition-transform group-hover:scale-105"
                      />
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="truncate text-sm font-semibold text-ink">{it.title}</span>
                      <Chip tone={it.grade === "high" ? "coral" : it.grade === "mid" ? "sun" : "leaf"}>
                        {GRADE_LABEL[it.grade]}
                      </Chip>
                    </div>
                  </Link>
                  {/* 도안 바로 인쇄(빈 라인아트를 A4로) — 색칠 대신 종이에 인쇄해 크레파스로 칠할 때 */}
                  <button
                    type="button"
                    onClick={() => printImageA4(it.image, it.title)}
                    aria-label={`${it.title} 도안 인쇄`}
                    title="이 도안 인쇄"
                    className="pressable absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-lg shadow-soft backdrop-blur transition-colors hover:bg-white"
                  >
                    🖨️
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

    </main>
  );
}

function FilterChip({
  children,
  active,
  onClick,
  small,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`pressable rounded-full font-semibold transition-colors ${
        small ? "px-3 py-1 text-sm" : "px-4 py-2"
      } ${active ? "bg-ink text-white" : "bg-paper text-ink-soft shadow-soft hover:text-ink"}`}
    >
      {children}
    </button>
  );
}
