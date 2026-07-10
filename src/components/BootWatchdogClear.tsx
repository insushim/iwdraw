"use client";

import { useEffect } from "react";

/*
 * 부트 워치독 해제 — layout.tsx의 인라인 워치독(React 밖)과 짝.
 * 이 컴포넌트가 마운트됐다 = JS 번들이 정상 로드·하이드레이션됨이므로
 * 워치독 타이머를 끄고 1회권 플래그를 재장전한다.
 * (이후의 렌더 크래시는 error.tsx/global-error.tsx의 자가치유가 담당)
 */
export function BootWatchdogClear() {
  useEffect(() => {
    const w = window as unknown as { __artonBoot?: ReturnType<typeof setTimeout> };
    if (w.__artonBoot) clearTimeout(w.__artonBoot);
    try {
      sessionStorage.removeItem("arton.selfheal.boot");
    } catch {
      /* 통과 */
    }
  }, []);
  return null;
}
