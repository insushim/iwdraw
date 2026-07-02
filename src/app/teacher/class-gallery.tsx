"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { renderPrintSheet, type PrintItem } from "@/engine/export/PrintSheet";
import {
  approveArtwork,
  listArtworks,
  signedUrl,
  type ArtworkRow,
  type ClassRow,
} from "@/lib/teacher-api";

/* 학급 갤러리: 작품 승인/반려 + 작품집 A4 인쇄 */
export function ClassGallery({ klass, onBack }: { klass: ClassRow; onBack: () => void }) {
  const [items, setItems] = useState<ArtworkRow[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [printing, setPrinting] = useState(false);

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

  const shown = items.filter((a) =>
    filter === "all" ? true : filter === "pending" ? !a.is_approved : a.is_approved,
  );

  const printApproved = async () => {
    setPrinting(true);
    try {
      const approved = items.filter((a) => a.is_approved);
      const printItems: PrintItem[] = [];
      for (const a of approved) {
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
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="pressable rounded-card px-2 text-xl" aria-label="뒤로">
          ← {klass.name}
        </button>
        <Button size="md" tone="sky" onClick={printApproved} disabled={printing}>
          {printing ? "준비 중…" : "🖨️ 작품집 인쇄"}
        </Button>
      </div>

      <div className="mb-4 flex gap-2">
        {(["all", "pending", "approved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`pressable rounded-full px-4 py-2 text-sm font-semibold ${
              filter === f ? "bg-ink text-white" : "bg-paper text-ink-soft shadow-soft"
            }`}
          >
            {f === "all" ? "전체" : f === "pending" ? "승인 대기" : "전시 중"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-ink-faint">불러오는 중…</div>
      ) : shown.length === 0 ? (
        <div className="rounded-card bg-paper p-8 text-center text-ink-soft shadow-soft">
          아직 작품이 없어요.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((a) => (
            <div key={a.id} className="overflow-hidden rounded-card bg-paper shadow-soft">
              <div className="aspect-square bg-cream">
                {urls[a.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urls[a.id]} alt={`${a.nickname ?? "학생"} 작품`} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full animate-pulse bg-cream-deep" />
                )}
              </div>
              <div className="p-2">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-semibold text-ink">{a.nickname ?? "학생"}</span>
                  <span className="text-xs text-ink-faint">❤ {a.like_count}</span>
                </div>
                <button
                  onClick={async () => {
                    await approveArtwork(a.id, !a.is_approved);
                    refresh();
                  }}
                  className={`pressable mt-2 w-full rounded-lg py-1.5 text-sm font-semibold ${
                    a.is_approved ? "bg-leaf-soft text-leaf-deep" : "bg-coral text-white"
                  }`}
                >
                  {a.is_approved ? "✓ 전시 중 (숨기기)" : "전시 승인"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
