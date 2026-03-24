import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: 'DiffHunt - 무한 틀린그림찾기 | 매일 새로운 퍼즐',
  description: '무한히 생성되는 틀린그림찾기! 매일 새로운 데일리 챌린지, 40가지+ 테마, 업적 시스템. 무료 웹 게임.',
  keywords: ['틀린그림찾기', 'spot the difference', '퍼즐게임', '두뇌게임'],
  openGraph: {
    title: 'DiffHunt - 무한 틀린그림찾기',
    description: '무한히 생성되는 틀린그림찾기! 매일 새로운 퍼즐.',
    type: 'website',
    locale: 'ko_KR',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#6366F1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
