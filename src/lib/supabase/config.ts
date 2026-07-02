/* 서버·클라이언트 공용: Supabase 설정 여부(환경변수만 읽음, "use client" 아님) */
export function hasSupabase(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
