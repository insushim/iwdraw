"use client";

import { getStudentSession } from "./student-session";
import { hasBackend } from "./backend";
import { apiFetch } from "./api";

/*
 * 학생 데이터 액세스 — Bearer JWT(학생 세션)로 자기 학급만 접근.
 * <img>는 Authorization 헤더를 못 보내므로 이미지는 fetch→blob URL로 로드한다.
 */

export interface GalleryItem {
  id: string;
  mode: string;
  thumb_path: string;
  image_path: string;
  like_count: number;
  created_at: number;
  nickname: string;
  liked: boolean;
  mine: boolean;
  /** false = 본인 작품이지만 아직 선생님 승인 대기 */
  is_approved: boolean;
}

export interface Assignment {
  id: string;
  template_id: string;
  title: string;
  image: string;
  note: string;
  created_at: number;
}

function authHeaders(): Record<string, string> | null {
  const s = getStudentSession();
  if (!s) return null;
  return { Authorization: `Bearer ${s.token}` };
}

/** null = 오류(토큰 만료 등 — 재입장 안내), [] = 정말로 전시작 없음 */
export async function listClassGallery(): Promise<GalleryItem[] | null> {
  const h = authHeaders();
  if (!hasBackend() || !h) return null;
  try {
    const res = await apiFetch("/student/gallery", { headers: h });
    if (!res.ok) return null;
    return (await res.json()) as GalleryItem[];
  } catch {
    return null;
  }
}

export async function toggleLike(
  artworkId: string,
): Promise<{ liked: boolean; like_count: number } | null> {
  const h = authHeaders();
  if (!hasBackend() || !h) return null;
  try {
    const res = await apiFetch(`/student/artworks/${artworkId}/like`, { method: "POST", headers: h });
    if (!res.ok) return null;
    return (await res.json()) as { liked: boolean; like_count: number };
  } catch {
    return null;
  }
}

export async function getAssignment(): Promise<Assignment | null> {
  const h = authHeaders();
  if (!hasBackend() || !h) return null;
  try {
    const res = await apiFetch("/student/assignment", { headers: h });
    if (!res.ok) return null;
    const data = (await res.json()) as { assignment: Assignment | null };
    return data.assignment;
  } catch {
    return null;
  }
}

// blob URL 캐시 — 같은 썸네일 재fetch 방지(학급 갤러리 ≤200장).
// 학생이 바뀌면(같은 탭에서 재입장) 이전 학생 것을 재사용하지 않도록 소유자 기준으로
// 전체 revoke 후 비운다(메모리 해제 겸 권한 경계 유지).
const blobCache = new Map<string, string>();
let blobCacheOwner: string | null = null;

export async function fetchStudentImage(path: string): Promise<string | null> {
  const h = authHeaders();
  if (!hasBackend() || !h) return null;
  const owner = getStudentSession()?.studentId ?? null;
  if (owner !== blobCacheOwner) {
    for (const url of blobCache.values()) URL.revokeObjectURL(url);
    blobCache.clear();
    blobCacheOwner = owner;
  }
  const cached = blobCache.get(path);
  if (cached) return cached;
  try {
    const res = await apiFetch(`/student/file?path=${encodeURIComponent(path)}`, { headers: h });
    if (!res.ok) return null;
    const url = URL.createObjectURL(await res.blob());
    blobCache.set(path, url);
    return url;
  } catch {
    return null;
  }
}
