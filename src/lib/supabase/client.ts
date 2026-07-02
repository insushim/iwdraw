"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasSupabase } from "./config";

/*
 * 브라우저용 Supabase 클라이언트. 환경변수 없으면 null(로컬/무료 오프라인 모드).
 * 학생 커스텀 JWT는 accessToken 옵션으로 주입한다(DESIGN-REVIEW A1).
 */
export { hasSupabase };

let cached: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient | null {
  if (!hasSupabase()) return null;
  if (cached) return cached;
  cached = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return cached;
}
