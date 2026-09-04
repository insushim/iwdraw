/*
 * 도구 아이콘을 96px WebP 로 재출력한다(1회성 스크립트, 결과물은 커밋).
 *
 * 원본 PNG 는 256px·36~69KB 인데 화면에서는 20~24px 로만 그린다 — 14장에 660KB 를 쓰고 있었다.
 * 96px 면 3x DPR 에서도 선명하고(24px × 3 = 72px), 알파를 보존하는 WebP 로 내보내면
 * 한 자릿수 KB 로 떨어진다. SVG 폴백 경로(ToolIcon 의 onError)는 그대로 둔다.
 *
 * 실행: node scripts/gen-tool-icons.mjs
 */
import { readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const DIR = path.join(process.cwd(), "public", "icons", "tools");
const SIZE = 96;

const files = (await readdir(DIR)).filter((f) => f.endsWith(".png"));
let before = 0;
let after = 0;
for (const f of files) {
  const src = path.join(DIR, f);
  before += (await stat(src)).size;
  const out = await sharp(src)
    .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 85, alphaQuality: 100 })
    .toBuffer();
  const dst = src.replace(/\.png$/, ".webp");
  await writeFile(dst, out);
  after += out.length;
  console.log(`${f} → ${path.basename(dst)}  ${(out.length / 1024).toFixed(1)}KB`);
}
console.log(`합계 ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB`);
