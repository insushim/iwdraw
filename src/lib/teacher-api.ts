"use client";

import { getSupabaseBrowser } from "@/lib/supabase/client";
import { CLASS_CODE_ALPHABET, CLASS_CODE_LENGTH } from "@/lib/class-code";

/* 교사 데이터 액세스 — RLS로 자기 학급만 접근 가능(서버 강제). */

export interface ClassRow {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
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
  created_at: string;
  nickname?: string;
}

function genCode(): string {
  let c = "";
  const arr = new Uint32Array(CLASS_CODE_LENGTH);
  crypto.getRandomValues(arr);
  for (let i = 0; i < CLASS_CODE_LENGTH; i++) {
    c += CLASS_CODE_ALPHABET[arr[i] % CLASS_CODE_ALPHABET.length];
  }
  return c;
}

export async function listClasses(): Promise<ClassRow[]> {
  const sb = getSupabaseBrowser();
  if (!sb) return [];
  const { data, error } = await sb
    .from("classes")
    .select("id, name, code, is_active, created_at, students(count)")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((c: Record<string, unknown>) => ({
    id: c.id as string,
    name: c.name as string,
    code: c.code as string,
    is_active: c.is_active as boolean,
    created_at: c.created_at as string,
    student_count: Array.isArray(c.students) ? (c.students[0] as { count: number })?.count ?? 0 : 0,
  }));
}

export async function createClass(name: string): Promise<ClassRow | null> {
  const sb = getSupabaseBrowser();
  if (!sb) return null;
  const { data: userData } = await sb.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;

  // 코드 충돌 시 재시도(unique 제약)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genCode();
    const { data, error } = await sb
      .from("classes")
      .insert({ teacher_id: uid, name: name.trim() || "우리 반", code })
      .select("id, name, code, is_active, created_at")
      .single();
    if (!error && data) return { ...(data as ClassRow), student_count: 0 };
    if (error && !/duplicate|unique/i.test(error.message)) return null;
  }
  return null;
}

export async function toggleClassActive(id: string, active: boolean): Promise<void> {
  await getSupabaseBrowser()?.from("classes").update({ is_active: active }).eq("id", id);
}

export async function regenerateCode(id: string): Promise<string | null> {
  const sb = getSupabaseBrowser();
  if (!sb) return null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genCode();
    const { error } = await sb.from("classes").update({ code }).eq("id", id);
    if (!error) return code;
    if (!/duplicate|unique/i.test(error.message)) return null;
  }
  return null;
}

export async function listArtworks(classId: string): Promise<ArtworkRow[]> {
  const sb = getSupabaseBrowser();
  if (!sb) return [];
  const { data } = await sb
    .from("artworks")
    .select("id, student_id, mode, thumb_path, image_path, is_approved, like_count, created_at, students(nickname)")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });
  if (!data) return [];
  return data.map((a: Record<string, unknown>) => ({
    id: a.id as string,
    student_id: a.student_id as string,
    mode: a.mode as string,
    thumb_path: a.thumb_path as string,
    image_path: a.image_path as string,
    is_approved: a.is_approved as boolean,
    like_count: a.like_count as number,
    created_at: a.created_at as string,
    nickname: (a.students as { nickname: string } | null)?.nickname,
  }));
}

export async function approveArtwork(id: string, approved: boolean): Promise<void> {
  await getSupabaseBrowser()?.from("artworks").update({ is_approved: approved }).eq("id", id);
}

export async function signedUrl(path: string): Promise<string | null> {
  const sb = getSupabaseBrowser();
  if (!sb) return null;
  const { data } = await sb.storage.from("artworks").createSignedUrl(path, 60 * 30);
  return data?.signedUrl ?? null;
}
