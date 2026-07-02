import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // 개발 중 SW 비활성(캐시로 인한 혼란 방지)
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Cloudflare Workers Static Assets로 배포: 순수 정적 사이트로 export.
  // 앱에 서버 코드(API route·server action·미들웨어)가 없어 export가 가능하다.
  output: "export",
  images: {
    // 정적 export에서는 Next 이미지 최적화 서버가 없으므로 비활성.
    // 작품 이미지는 same-origin Worker(/api/artwork/file)에서 <img>로 직접 서빙.
    unoptimized: true,
  },
};

export default withSerwist(nextConfig);
