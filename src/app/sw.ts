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

serwist.addEventListeners();
