/* same-origin Worker API(/api/*) fetch 헬퍼. 교사 세션 쿠키를 위해 credentials 포함. */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`/api${path}`, { credentials: "include", ...init });
}
