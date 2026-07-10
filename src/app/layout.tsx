import type { Metadata, Viewport } from "next";
import { Jua } from "next/font/google";
import { BootWatchdogClear } from "@/components/BootWatchdogClear";
import "./globals.css";

const jua = Jua({
  weight: "400",
  variable: "--font-jua",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "아트온 ArtON — 학교 수업에 딱 맞춘 디지털 미술 놀이터",
    template: "%s | 아트온 ArtON",
  },
  description:
    "설치·로그인 없이 학급 코드로 바로 참여하는 초등 교실용 디지털 스케치 & 색칠 웹앱. 진짜 물감처럼 번지는 수채화, 두께감 있는 유화, 저작권 걱정 없는 자체 제작 도안.",
  applicationName: "아트온 ArtON",
  keywords: ["아트온", "ArtON", "초등 미술", "디지털 드로잉", "색칠공부", "iw corp"],
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "아트온", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "아트온 ArtON — 디지털 미술 놀이터",
    description: "설치·로그인 없이 바로 그리고 색칠하는 초등 교실용 미술 웹앱.",
    images: ["/og.png"],
    type: "website",
    locale: "ko_KR",
  },
};

export const viewport: Viewport = {
  themeColor: "#fbf7f0",
  width: "device-width",
  initialScale: 1,
  // 캔버스 앱: 핀치줌은 엔진 제스처가 처리하므로 페이지 줌은 잠금
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
          crossOrigin="anonymous"
        />
        {/* 부트 워치독(React 밖) — 배포로 구버전 청크가 404 나면 React가 아예 못 떠서
            에러 바운더리도 실행되지 않고 Suspense 폴백/흰 화면만 남는다(2026-07-10 실측:
            배포 직후 새로고침 = 흰 화면). 8초 내 하이드레이션(BootWatchdogClear 마운트)이
            없으면 SW·캐시를 정리하고 1회만 자동 새로고침(그림 IndexedDB는 보존). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  function heal(){
    try{sessionStorage.setItem("arton.selfheal.boot","1")}catch(e){}
    var p=[];
    try{if(navigator.serviceWorker&&navigator.serviceWorker.getRegistrations){p.push(navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){return r.unregister()}))}))}}catch(e){}
    try{if(window.caches){p.push(caches.keys().then(function(ks){return Promise.all(ks.map(function(k){return caches.delete(k)}))}))}}catch(e){}
    Promise.all(p).catch(function(){}).then(function(){location.reload()});
  }
  try{if(sessionStorage.getItem("arton.selfheal.boot"))return}catch(e){}
  window.__artonBoot=setTimeout(heal,8000);
})();`,
          }}
        />
      </head>
      <body className={`${jua.variable} antialiased`}>
        <BootWatchdogClear />
        {children}
      </body>
    </html>
  );
}
