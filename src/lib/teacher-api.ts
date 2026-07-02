"use client";

import { hasBackend } from "./backend";
import { apiFetch } from "./api";

/* 교사 데이터 액세스 — Worker(/api)가 세션 쿠키로 자기 학급만 접근 강제. */

export interface ClassRow {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: number;
  student_count?: number;
}

export interface ArtworkRow {
  id: string;
  student_id: string;
  mode: string;
  thumb_path: string;
  image_path: string;
  is_approved: boolean;
  like_count: number;
  created_at: number;
  nickname?: string;
}

export async function listClasses(): Promise<ClassRow[]> {
  if (!hasBackend()) return [];
  try {
    const res = await apiFetch("/classes");
    if (!res.ok) return [];
    return (await res.json()) as ClassRow[];
  } catch {
    return [];
  }
}

export async function createClass(name: string): Promise<ClassRow | null> {
  if (!hasBackend()) return null;
  try {
    const res = await apiFetch("/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() || "우리 반" }),
    });
    if (!res.ok) return null;
    return (await res.json()) as ClassRow;
  } catch {
    return null;
  }
}

export async function toggleClassActive(id: string, active: boolean): Promise<void> {
  if (!hasBackend()) return;
  try {
    await apiFetch(`/classes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: active }),
    });
  } catch {
    /* 네트워크 오류 무시(UI는 다음 새로고침에 복원) */
  }
}

export async function regenerateCode(id: string): Promise<string | null> {
  if (!hasBackend()) return null;
  try {
    const res = await apiFetch(`/classes/${id}/code`, { method: "POST" });
    if (!res.ok) return null;
    const data = (await res.json()) as { code?: string };
    return data.code ?? null;
  } catch {
    return null;
  }
}

export async function listArtworks(classId: string): Promise<ArtworkRow[]> {
  if (!hasBackend()) return [];
  try {
    const res = await apiFetch(`/classes/${classId}/artworks`);
    if (!res.ok) return [];
    return (await res.json()) as ArtworkRow[];
  } catch {
    return [];
  }
}

export async function approveArtwork(id: string, approved: boolean): Promise<void> {
  if (!hasBackend()) return;
  try {
    await apiFetch(`/artworks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_approved: approved }),
    });
  } catch {
    /* 네트워크 오류 무시 */
  }
}

/* 작품 이미지 URL — same-origin Worker가 교사 쿠키로 소유 검증 후 R2에서 스트리밍.
 * <img src>로 쓰면 same-origin이라 세션 쿠키가 자동 전송된다(Supabase signed URL 대체). */
export async function signedUrl(path: string): Promise<string | null> {
  if (!hasBackend()) return null;
  return `/api/artwork/file?path=${encodeURIComponent(path)}`;
}
