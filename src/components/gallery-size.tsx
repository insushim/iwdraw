"use client";

import { useState } from "react";

/*
 * 갤러리 작품 크기 조절 — 학생·교사 갤러리 공용.
 * 크게 = 전자칠판/감상용, 작게 = 한눈에 훑기. 선택은 localStorage로 기억.
 */

export type GallerySize = "sm" | "md" | "lg";

/** 크기별 그리드 열 — 클수록 열이 적다 */
export const GALLERY_GRID: Record<GallerySize, string> = {
  sm: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6",
  md: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  lg: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
};

const STORAGE_KEY = "arton.gallerySize";

export function useGallerySize(): [GallerySize, (s: GallerySize) => void] {
  const [size, setSize] = useState<GallerySize>(() => {
    if (typeof window === "undefined") return "md";
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "sm" || saved === "md" || saved === "lg" ? saved : "md";
  });
  const update = (s: GallerySize) => {
    setSize(s);
    try {
      localStorage.setItem(STORAGE_KEY, s);
    } catch {
      /* 사생활 모드 등 저장 불가 — 세션 내 상태만 유지 */
    }
  };
  return [size, update];
}

const LABELS: { id: GallerySize; label: string }[] = [
  { id: "sm", label: "작게" },
  { id: "md", label: "보통" },
  { id: "lg", label: "크게" },
];

export function GallerySizeControl({
  size,
  onChange,
}: {
  size: GallerySize;
  onChange: (s: GallerySize) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-paper p-1 shadow-soft" role="group" aria-label="작품 크기">
      {LABELS.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          aria-pressed={size === o.id}
          className={`pressable rounded-full px-3 py-1.5 text-sm font-semibold ${
            size === o.id ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
