#!/usr/bin/env node
/* 아트온 로고(붓+팔레트 모티프) SVG → 파비콘/PWA/OG 아이콘 래스터화(sharp) */
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUB = join(ROOT, "public");
mkdirSync(join(PUB, "icons"), { recursive: true });

// 배경 있는 앱 아이콘용 SVG(둥근 크림 배경 + 팔레트/붓)
const iconSvg = (bg = true) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  ${bg ? '<rect width="512" height="512" rx="112" fill="#FBF7F0"/>' : ""}
  <g transform="translate(96,96) scale(6.67)">
    <path d="M24 4C12.4 4 4 12.6 4 23.4 4 34.2 12.8 42 24 42c2.6 0 4.4-1.8 4.4-4 0-1.1-.4-2-1.1-2.8-.6-.8-1-1.6-1-2.6 0-2.2 1.8-4 4-4h4.4C39.9 28.6 44 24.4 44 19 44 10.6 35.6 4 24 4Z" fill="#FF7A59"/>
    <circle cx="15" cy="18" r="3.4" fill="#FBF7F0"/>
    <circle cx="24" cy="13" r="3.4" fill="#FFC84A"/>
    <circle cx="33" cy="18" r="3.4" fill="#5BB8F5"/>
    <circle cx="13" cy="28" r="3.4" fill="#7BC96F"/>
    <path d="M40.5 30.5 30 41c-1.6 1.6-4.2 1.6-5.7 0-1.6-1.6-1.6-4.2 0-5.7L34.8 24.8Z" fill="#2D2A26"/>
    <path d="M40.5 30.5 44 27l-3.2-3.2-3.5 3.5Z" fill="#B878E0"/>
  </g>
</svg>`;

// OG 이미지(1200x630)
const ogSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#FBF7F0"/>
  <g transform="translate(120,175) scale(5.8)">
    <path d="M24 4C12.4 4 4 12.6 4 23.4 4 34.2 12.8 42 24 42c2.6 0 4.4-1.8 4.4-4 0-1.1-.4-2-1.1-2.8-.6-.8-1-1.6-1-2.6 0-2.2 1.8-4 4-4h4.4C39.9 28.6 44 24.4 44 19 44 10.6 35.6 4 24 4Z" fill="#FF7A59"/>
    <circle cx="15" cy="18" r="3.4" fill="#FBF7F0"/><circle cx="24" cy="13" r="3.4" fill="#FFC84A"/>
    <circle cx="33" cy="18" r="3.4" fill="#5BB8F5"/><circle cx="13" cy="28" r="3.4" fill="#7BC96F"/>
    <path d="M40.5 30.5 30 41c-1.6 1.6-4.2 1.6-5.7 0-1.6-1.6-1.6-4.2 0-5.7L34.8 24.8Z" fill="#2D2A26"/>
    <path d="M40.5 30.5 44 27l-3.2-3.2-3.5 3.5Z" fill="#B878E0"/>
  </g>
  <text x="480" y="290" font-family="sans-serif" font-size="88" font-weight="800" fill="#2D2A26">아트온 ArtON</text>
  <text x="482" y="370" font-family="sans-serif" font-size="40" fill="#6B645B">학교 수업에 딱 맞춘 디지털 미술 놀이터</text>
  <text x="482" y="430" font-family="sans-serif" font-size="32" fill="#FF7A59">설치·로그인 없이 바로 그리고 색칠해요</text>
</svg>`;

async function main() {
  const buf = Buffer.from(iconSvg(true));
  const bufBare = Buffer.from(iconSvg(false));

  await sharp(buf).resize(512, 512).png().toFile(join(PUB, "icons", "icon-512.png"));
  await sharp(buf).resize(192, 192).png().toFile(join(PUB, "icons", "icon-192.png"));
  await sharp(buf).resize(180, 180).png().toFile(join(PUB, "icons", "apple-touch-icon.png"));
  await sharp(bufBare).resize(512, 512).png().toFile(join(PUB, "icons", "maskable-512.png"));
  await sharp(buf).resize(32, 32).png().toFile(join(PUB, "favicon.png"));
  // favicon.ico (multi-size는 생략, 16/32 png로 대체 + ico 단일)
  await sharp(buf).resize(48, 48).png().toFile(join(PUB, "icons", "favicon-48.png"));
  writeFileSync(join(PUB, "icon.svg"), iconSvg(true));
  await sharp(Buffer.from(ogSvg)).resize(1200, 630).png().toFile(join(PUB, "og.png"));

  console.log("✅ 아이콘 생성: icon-512/192, apple-touch, maskable, favicon, og");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
