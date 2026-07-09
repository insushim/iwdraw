"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { renderPrintSheet, type PrintItem } from "@/engine/export/PrintSheet";
import { printImageA4, downloadImage } from "@/lib/print";
import { groupByDay } from "@/lib/day-group";
import { GALLERY_GRID, GallerySizeControl, useGallerySize } from "@/components/gallery-size";
import {
  deleteArtwork,
  listArtworks,
  signedUrl,
  type ArtworkRow,
  type ClassRow,
} from "@/lib/teacher-api";

/* 학급 갤러리: 날짜별 작품 목록 + 필요 없는 작품 삭제(큐레이션) + 작품집 A4 인쇄.
 * 승인 게이트는 2026-07-09 비활성(제출 즉시 전시) — 되살리려면 worker INSERT의
 * is_approved와 이 화면의 승인 UI(approveArtwork, git 이력 참조)를 복원. */
export function ClassGallery({ klass, onBack }: { klass: ClassRow; onBack: () => void }) {
  const [items, setItems] = useState<ArtworkRow[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  // 삭제 2단계 확인(오조작 방지): 첫 클릭 → "정말요?" 3초, 그 안에 재클릭 시 실행
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [size, setSize] = useGallerySize();

  const askDelete = async (a: ArtworkRow) => {
    if (confirmDel !== a.id) {
      setConfirmDel(a.id);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirmDel(null), 3000);
      return;
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setConfirmDel(null);
    setDeleting(a.id);
    const ok = await deleteArtwork(a.id);
    setDeleting(null);
    if (ok) {
      setItems((prev) => prev.filter((x) => x.id !== a.id));
    } else {
      // 실패(네트워크·스토리지)를 조용히 삼키면 교사가 이유 없이 재시도만 반복한다
      setDelError(true);
      setTimeout(() => setDelError(false), 3500);
    }
  };
  const [delError, setDelError] = useState(false);
  const [dlError, setDlError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await listArtworks(klass.id);
    setItems(list);
    setLoading(false);
    // 썸네일 서명 URL 병렬 로드
    const entries = await Promise.all(
      list.map(async (a) => [a.id, (await signedUrl(a.thumb_path)) ?? ""] as const),
    );
    setUrls(Object.fromEntries(entries));
  }, [klass.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // 언마운트 시 삭제 확인 타이머 정리
  useEffect(
    () => () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    },
    [],
  );

  const dayGroups = groupByDay(items, (a) => a.created_at);

  const printAll = async () => {
    setPrinting(true);
    try {
      const printItems: PrintItem[] = [];
      for (const a of items) {
        const url = (await signedUrl(a.image_path)) ?? urls[a.id];
        if (!url) continue;
        const img = await loadImg(url);
        printItems.push({ image: img, nickname: a.nickname ?? "학생" });
      }
      if (printItems.length === 0) return;
      const canvas = renderPrintSheet(printItems, { title: klass.name, cols: 2, rows: 3 });
      const win = window.open("");
      if (win) {
        win.document.write(
          `<img src="${canvas.toDataURL("image/png")}" style="width:100%" onload="print()"/>`,
        );
      }
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="pressable rounded-card px-2 text-xl" aria-label="뒤로">
          ← {klass.name}
        </button>
        <div className="flex items-center gap-2">
          <GallerySizeControl size={size} onChange={setSize} />
          <Button size="md" tone="sky" onClick={printAll} disabled={printing}>
            {printing ? "준비 중…" : "🖨️ 작품집 인쇄"}
          </Button>
        </div>
      </div>

      {delError && (
        <p className="mb-3 rounded-card bg-danger-soft px-4 py-2 text-sm font-semibold text-danger" role="status">
          작품을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      )}
      {dlError && (
        <p className="mb-3 rounded-card bg-danger-soft px-4 py-2 text-sm font-semibold text-danger" role="status">
          작품을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      )}

      {/* 삭제 임박(30일 이내) 안내 — 작품집 인쇄로 남기도록 유도 */}
      {(() => {
        const soon = items.filter(
          (a) => a.expires_at != null && a.expires_at - Date.now() <= 30 * 86400000,
        ).length;
        if (soon === 0) return null;
        return (
          <div className="mb-4 rounded-card border-2 border-sun bg-sun-soft px-4 py-3 text-sm text-ink">
            🗓️ 이 학급에 곧 삭제될 작품이 <b>{soon}점</b> 있어요. 작품은 만든 지 6개월(180일)이
            지나면 자동 삭제돼요. 위 <b>🖨️ 작품집 인쇄</b> 또는 작품별 인쇄로 남겨 두세요.
          </div>
        );
      })()}

      {loading ? (
        <div className="text-center text-ink-faint">불러오는 중…</div>
      ) : items.length === 0 ? (
        <div className="rounded-card bg-paper p-8 text-center text-ink-soft shadow-soft">
          아직 작품이 없어요.
        </div>
      ) : (
        dayGroups.map((g) => (
          <section key={g.key} className="mb-6">
            <h2 className="mb-2 flex items-center gap-2 font-display text-lg text-ink">
              📅 {g.label}
              <span className="text-sm font-normal text-ink-faint">{g.items.length}점</span>
            </h2>
            <div className={`grid gap-3 ${GALLERY_GRID[size]}`}>
              {g.items.map((a) => (
            <div key={a.id} className="group relative overflow-hidden rounded-card bg-paper shadow-soft">
              <div className="aspect-square bg-cream">
                {urls[a.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urls[a.id]} alt={`${a.nickname ?? "학생"} 작품`} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full animate-pulse bg-cream-deep" />
                )}
              </div>
              {/* 삭제 임박 배지(30일 이내) */}
              {(() => {
                const d =
                  a.expires_at != null
                    ? Math.ceil((a.expires_at - Date.now()) / 86400000)
                    : Infinity;
                if (d > 30) return null;
                return (
                  <span className="absolute left-2 top-2 rounded-full bg-sun px-2 py-0.5 text-xs font-bold text-ink shadow-soft">
                    🗓️ {d <= 0 ? "곧 삭제" : `${d}일 후 삭제`}
                  </span>
                );
              })()}
              {/* 작품 저장(다운로드) · 인쇄 — 원본 해상도 */}
              <div className="absolute right-2 top-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    const url = (await signedUrl(a.image_path)) ?? urls[a.id];
                    const base = `${a.nickname ?? "학생"}_${dayStamp(a.created_at)}`;
                    if (url) {
                      const ok = await downloadImage(url, base);
                      if (!ok) {
                        setDelError(false);
                        setDlError(true);
                        setTimeout(() => setDlError(false), 3500);
                      }
                    }
                  }}
                  aria-label={`${a.nickname ?? "학생"} 작품 저장`}
                  title="이 작품 저장(다운로드)"
                  className="pressable grid h-9 w-9 place-items-center rounded-full bg-white/90 text-lg shadow-soft backdrop-blur transition-colors hover:bg-white"
                >
                  ⬇️
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const url = (await signedUrl(a.image_path)) ?? urls[a.id];
                    if (url) printImageA4(url, a.nickname ?? "학생");
                  }}
                  aria-label={`${a.nickname ?? "학생"} 작품 인쇄`}
                  title="이 작품 인쇄"
                  className="pressable grid h-9 w-9 place-items-center rounded-full bg-white/90 text-lg shadow-soft backdrop-blur transition-colors hover:bg-white"
                >
                  🖨️
                </button>
              </div>
              <div className="p-2">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-semibold text-ink">{a.nickname ?? "학생"}</span>
                  <span className="text-xs text-ink-faint">❤ {a.like_count}</span>
                </div>
                <button
                  onClick={() => askDelete(a)}
                  disabled={deleting === a.id}
                  className={`pressable mt-2 w-full rounded-lg py-1.5 text-sm font-semibold disabled:opacity-60 ${
                    confirmDel === a.id
                      ? "bg-danger text-white"
                      : "bg-cream text-ink-soft hover:bg-danger-soft hover:text-danger"
                  }`}
                >
                  {deleting === a.id
                    ? "삭제 중…"
                    : confirmDel === a.id
                      ? "정말 삭제할까요?"
                      : "🗑 삭제"}
                </button>
              </div>
            </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

/** 다운로드 파일명용 날짜 도장(YYYY-MM-DD) */
function dayStamp(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지 로드 실패"));
    img.src = url;
  });
}
