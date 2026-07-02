/* 백엔드(Cloudflare Worker /api) 활성 여부. 빌드타임 환경변수로 결정.
 * NEXT_PUBLIC_HAS_BACKEND=1 → 교사/학생/협동 기능 켜짐(CF 배포).
 * 미설정 → 게스트 모드(그리기·색칠·무비·사진→도안만, 백엔드 없이 동작).
 * (구 hasSupabase() 대체 — same-origin Worker라 URL 불필요.) */
export function hasBackend(): boolean {
  return process.env.NEXT_PUBLIC_HAS_BACKEND === "1";
}
