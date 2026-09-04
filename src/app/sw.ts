/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, NetworkOnly, StaleWhileRevalidate, ExpirationPlugin } from "serwist";

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

const TEMPLATE_MANIFEST_URL = "/templates/manifest.json";
const VERSION_URL = "/version.json";

// ⚠️ 도안 목록(manifest.json)·버전표식(version.json)은 precache에서 제외한다(2026-07-21).
// precache에 넣으면 배포 후에도 옛 SW가 옛 파일을 계속 서빙 → ① 명화/도안을 새로 추가해도
// "그대로"(사용자 실측: 명화 82종 배포했는데 안 보임) ② version.json이 옛 빌드ID를 줘서
// 낡은 코드 자가치유(layout 인라인)가 영영 안 터짐. 아래 NetworkFirst로 온라인=항상 최신,
// 오프라인=마지막 캐시 폴백.
/* ⚠️ 웹폰트 조각도 제외한다(2026-09-02 실측). 한글 서브셋이 546개 woff2 = 4.49MB 로,
 * 프리캐시 6.09MB 의 74%를 혼자 차지했다. 프리캐시는 SW 설치 때 **전부** 받으므로 첫 방문이
 * 그만큼 느려지는데, 실제로 쓰이는 조각은 화면에 뜬 글자에 해당하는 몇 개뿐이다.
 * 아래 static-font-assets(SWR, maxEntries 64) 로 내려 "쓴 것만" 캐시한다.
 * 확장자로만 거른다 — media/ 디렉터리를 통째로 빼면 나중에 비폰트 자산이 들어왔을 때
 * 오프라인 복구가 조용히 깨진다(교차검증 codex). */
const FONT_RE = /\.(?:woff2?|ttf|otf)$/i;

/* ⚠️ 색칠 도안(1346장)도 제외한다 — 여기가 진짜 폭탄이었다(2026-09-02 실측).
 * 프리캐시 매니페스트가 137.6MB 였고 그중 도안이 130.7MB 다. 프리캐시는 SW 설치 때
 * **전부** 받으므로, 처음 들어온 아이의 웨일북이 배경에서 130MB 를 빨아들이고 있었다는 뜻이다
 * (학교 공유망에선 한 반이 동시에 이걸 한다). 실제로 필요한 건 아이가 고른 도안 한 장뿐이다.
 * 아래 template-thumbs / template-images 런타임 규칙(SWR)이 "연 것만" 캐시한다. */
const precacheEntries = (self.__SW_MANIFEST ?? []).filter((e) => {
  const url = typeof e === "string" ? e : e.url;
  const path = url.split("?")[0];
  return (
    !url.includes(TEMPLATE_MANIFEST_URL) &&
    !url.includes(VERSION_URL) &&
    !FONT_RE.test(path) &&
    !path.startsWith("/templates/")
  );
});

const serwist = new Serwist({
  precacheEntries,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // 도안 목록은 항상 네트워크 우선(오프라인 시에만 캐시) — 배포 즉시 반영
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && url.pathname === TEMPLATE_MANIFEST_URL,
      handler: new NetworkFirst({
        cacheName: "template-manifest",
        networkTimeoutSeconds: 4,
        plugins: [new ExpirationPlugin({ maxEntries: 2, maxAgeSeconds: 86400 })],
      }),
    },
    {
      // 버전표식도 항상 네트워크 우선 — 낡은 코드 자가치유가 최신 빌드ID를 봐야 한다
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname === VERSION_URL,
      handler: new NetworkFirst({
        cacheName: "app-version",
        networkTimeoutSeconds: 4,
        plugins: [new ExpirationPlugin({ maxEntries: 2, maxAgeSeconds: 86400 })],
      }),
    },
    /* ⚠️ 아래 커스텀 규칙은 **전부 defaultCache 앞**에 있어야 한다 — 순서가 곧 우선순위라
     * defaultCache 의 넓은 규칙(apis·static-image-assets·static-font-assets)이 먼저
     * 잡으면 여기 규칙들이 그대로 휴면한다(교차검증 Grok). */
    {
      // 학생 작품 파일은 절대 캐시하지 않는다 — 공유 웨일북에서 다음 아이가 앞 아이의
      // 그림을 오프라인으로 다시 꺼내 볼 수 있게 된다. defaultCache 의 `apis` 규칙
      // (NetworkFirst)이 먼저 잡으면 그렇게 된다.
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname === "/api/student/file",
      handler: new NetworkOnly(),
    },
    {
      // 색칠 도안 썸네일 — 갤러리 격자에 1000장 넘게 뜬다. 원본과 버킷을 나눠야
      // 서로를 밀어내지 않는다(한 버킷이면 원본 몇 장이 썸네일 전부를 축출한다).
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && url.pathname.startsWith("/templates/_thumbs/"),
      handler: new StaleWhileRevalidate({
        cacheName: "template-thumbs",
        plugins: [new ExpirationPlugin({ maxEntries: 1500, maxAgeSeconds: 30 * 86400 })],
      }),
    },
    {
      // 도안 원본(색칠하러 실제로 연 것만) — 크고 수가 적다
      matcher: ({ url, sameOrigin }) =>
        sameOrigin &&
        url.pathname.startsWith("/templates/") &&
        !url.pathname.startsWith("/templates/_thumbs/") &&
        url.pathname !== TEMPLATE_MANIFEST_URL,
      handler: new StaleWhileRevalidate({
        cacheName: "template-images",
        plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 86400 })],
      }),
    },
    {
      // 폰트: 프리캐시에서 뺀 대신 쓴 조각만 캐시한다. 기본값 maxEntries 4 로는
      // 한글 서브셋(한 화면에 여러 조각)이 서로를 계속 밀어내 매번 다시 받는다.
      matcher: ({ url }) => FONT_RE.test(url.pathname),
      handler: new StaleWhileRevalidate({
        cacheName: "static-font-assets",
        plugins: [
          new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 30 * 86400, maxAgeFrom: "last-used" }),
        ],
      }),
    },
    ...defaultCache,
  ],
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
/* 배포를 넘겨도 살려 두는 캐시 — 내용이 경로에 묶여 있어 낡아도 위험하지 않고(SWR 이
 * 배경에서 갱신한다), 지우면 한 반이 동시에 다시 받는다.
 *   · static-font-assets — 파일명에 해시가 박혀 있어 애초에 낡을 수가 없다
 *   · template-thumbs / template-images — 도안 그림. 같은 경로의 그림이 바뀌어도
 *     한 번은 옛 그림, 그다음엔 새 그림(SWR). 흰 화면 같은 사고와 무관하다.
 * 반대로 HTML·JS 계열(defaultCache 의 pages·static-js…)은 계속 지운다 — 낡은 HTML 이
 * 이미 없는 청크를 가리키면 React 가 아예 못 뜨고 흰 화면이 된다(위 주석의 사고). */
const KEEP_ACROSS_DEPLOY = ["precache", "static-font-assets", "template-thumbs", "template-images"];

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !KEEP_ACROSS_DEPLOY.some((keep) => k.includes(keep)))
            .map((k) => caches.delete(k)),
        ),
      )
      .catch(() => undefined),
  );
});

serwist.addEventListeners();
