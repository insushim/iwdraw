import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // 개발 중 SW 비활성(캐시로 인한 혼란 방지)
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  images: {
    // Supabase Storage 서명 URL 등 원격 이미지 허용(설정 시)
    remotePatterns: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? [{ protocol: "https", hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname }]
      : [],
  },
};

export default withSerwist(nextConfig);
