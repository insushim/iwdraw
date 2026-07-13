/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

/*
 * Serwist 서비스 워커(next-pwa 후계). App Router 호환.
 * 오프라인 캔버스: 앱 셸 + 도안 매니페스트 캐시. 업로드 큐는 앱(IndexedDB)에서 처리.
 */
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  // ⚠️ fallbacks(/draw) 제거(2026-07-10): output:"export"에선 프리캐시 매니페스트에
  // HTML이 아예 안 들어가서 matchPrecache("/draw")가 항상 undefined — 죽은 설정이었고,
  // 오프라인 폴백이 필요해지면 HTML을 명시적으로 프리캐시에 추가한 뒤 되살릴 것.
});

/*
 * 새 SW가 활성화되면 런타임 캐시를 전부 비운다(프리캐시는 Serwist가 자체 관리).
 * 배포하면 청크 파일명이 바뀌는데, 런타임 캐시에 남은 "구버전 HTML"이 네트워크 지연 등으로
 * 다시 서빙되면 그 HTML이 가리키는 청크는 이미 서버에 없어 404 → React가 아예 못 뜨고
 * 흰 화면이 된다(2026-07-13 사용자 실측: 그리다 새로고침 = 흰 화면).
 * 오프라인 캐시는 새 버전으로 다시 쌓이므로 손해는 없다.
 */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.includes("precache")).map((k) => caches.delete(k))),
      )
      .catch(() => undefined),
  );
});

serwist.addEventListeners();
