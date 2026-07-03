"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArtonLogo } from "@/components/arton-logo";
import { Chip } from "@/components/ui";
import { photoToLineart, photoToUnderlay } from "@/lib/photo-to-lineart";
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
  const [converting, setConverting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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

  // 가져온 이미지 → 시작 방식 선택 모달(자동 선따기 vs 옅은 밑그림 위에 직접 선따기)
  const [pending, setPending] = useState<{ file: File | Blob; url: string } | null>(null);

  const openImage = (file: File | Blob) => {
    if (!file.type.startsWith("image/")) return;
    setError(null);
    setPending((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { file, url: URL.createObjectURL(file) };
    });
  };

  // 붙여넣기(Ctrl+V)로 이미지 가져오기 — 구글 등에서 이미지 복사 후 바로 붙여넣는 흐름
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      const f = item?.getAsFile();
      if (f) {
        e.preventDefault();
        openImage(f);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const startWith = async (kind: "lineart" | "underlay") => {
    if (!pending) return;
    setConverting(true);
    setError(null);
    try {
      const blob =
        kind === "lineart" ? await photoToLineart(pending.file) : await photoToUnderlay(pending.file);
      const dataUrl = await blobToDataUrl(blob);
      sessionStorage.setItem("arton.customLineart", dataUrl);
      URL.revokeObjectURL(pending.url);
      setPending(null);
      router.push("/draw?template=custom&mode=coloring");
    } catch {
      setError("사진을 도안으로 바꾸지 못했어요. 다른 사진을 써 보세요.");
    } finally {
      setConverting(false);
    }
  };

  return (
    <main
      className="min-h-dvh"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) openImage(f);
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
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) openImage(f);
              e.target.value = "";
            }}
          />
          {/* 버튼 2개는 같은 높이·수직 중앙 정렬(inline-flex h-11) — a/button 베이스라인 어긋남 방지 */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={converting}
            className="pressable touch-target inline-flex h-11 items-center justify-center rounded-card bg-sky px-4 font-display text-white shadow-soft disabled:opacity-60"
          >
            {converting ? "변환 중…" : "📷 내 사진·그림으로"}
          </button>
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
                <Link
                  key={`${it.theme}/${it.id}`}
                  href={`/draw?template=${encodeURIComponent(it.image)}&mode=coloring`}
                  className="pressable group overflow-hidden rounded-card bg-paper shadow-soft"
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
              ))}
            </div>
          </>
        )}
      </div>

      {/* 가져온 이미지 → 시작 방식 선택 */}
      {pending && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4"
          onClick={() => {
            URL.revokeObjectURL(pending.url);
            setPending(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg rounded-bubble bg-paper p-6 shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-xl text-ink">이 그림으로 어떻게 시작할까요?</h2>
            <div className="mt-4 grid place-items-center rounded-card bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pending.url} alt="가져온 그림" className="max-h-56 w-auto rounded-lg" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => startWith("lineart")}
                disabled={converting}
                className="pressable rounded-card bg-sky px-4 py-4 text-left text-white shadow-soft disabled:opacity-60"
              >
                <span className="font-display text-lg">✏️ 자동 선따기</span>
                <span className="mt-1 block text-sm text-white/85">
                  윤곽선 도안으로 바꿔서 색칠해요
                </span>
              </button>
              <button
                onClick={() => startWith("underlay")}
                disabled={converting}
                className="pressable rounded-card bg-coral px-4 py-4 text-left text-white shadow-soft disabled:opacity-60"
              >
                <span className="font-display text-lg">🖊️ 밑그림 따라 그리기</span>
                <span className="mt-1 block text-sm text-white/85">
                  옅게 깔린 그림 위에 내가 직접 선을 따요
                </span>
              </button>
            </div>
            <p className="mt-4 text-xs text-ink-faint">
              인터넷에서 받은 그림은 연습용으로만 써요. 그린 작품을 학급 밖에 공개하거나 팔면 안
              돼요.
            </p>
            <button
              onClick={() => {
                URL.revokeObjectURL(pending.url);
                setPending(null);
              }}
              className="pressable mt-3 w-full rounded-card bg-cream px-4 py-2 font-semibold text-ink-soft"
            >
              {converting ? "변환 중…" : "취소"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("읽기 실패"));
    r.readAsDataURL(blob);
  });
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
