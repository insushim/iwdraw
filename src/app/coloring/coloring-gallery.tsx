"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArtonLogo } from "@/components/arton-logo";
import { Chip } from "@/components/ui";
import { photoToLineart } from "@/lib/photo-to-lineart";
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

  const onPhoto = async (file: File) => {
    setConverting(true);
    setError(null);
    try {
      const blob = await photoToLineart(file);
      const dataUrl = await blobToDataUrl(blob);
      sessionStorage.setItem("arton.customLineart", dataUrl);
      router.push("/draw?template=custom&mode=coloring");
    } catch {
      setError("사진을 도안으로 바꾸지 못했어요. 다른 사진을 써 보세요.");
    } finally {
      setConverting(false);
    }
  };

  return (
    <main className="min-h-dvh">
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
              if (f) void onPhoto(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={converting}
            className="pressable touch-target rounded-card bg-sky px-4 py-2 font-display text-white shadow-soft disabled:opacity-60"
          >
            {converting ? "변환 중…" : "📷 내 사진으로"}
          </button>
          <Link
            href="/draw"
            className="pressable touch-target rounded-card bg-coral px-4 py-2 font-display text-white shadow-soft"
          >
            빈 캔버스
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="font-display text-3xl text-ink">색칠할 도안을 골라요 🖍️</h1>
        <p className="mt-2 text-ink-soft">
          로그인 없이 바로 색칠할 수 있어요. 직접 만든 도안 1,000여 장과 저작권이 만료된
          명화(반 고흐·모네·김홍도…)라 마음껏 써도 괜찮아요.
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
