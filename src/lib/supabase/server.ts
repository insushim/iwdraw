import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasSupabase } from "./config";

/* 서버 컴포넌트/라우트용 Supabase 클라이언트(교사 세션 쿠키 기반). 미설정 시 null. */
export async function getSupabaseServer(): Promise<SupabaseClient | null> {
  if (!hasSupabase()) return null;
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            /* 서버 컴포넌트에서 set 불가한 경우 무시(미들웨어가 갱신) */
          }
        },
      },
    },
  );
}

export { hasSupabase };
