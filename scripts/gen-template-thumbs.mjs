/*
 * 색칠 도안 썸네일 생성기 — public/templates/_thumbs/<theme>/<id>.webp (320px, q80).
 *
 * 왜: 갤러리 격자는 카드 한 변이 200px 남짓인데 원본(1024px 급)을 그대로 걸고 있었다.
 * 한 화면에 1344장이면 콜드 전송이 6MB 를 넘는다. 썸네일은 장당 한 자릿수 KB 다.
 *
 * 멱등: 이미 있고 원본보다 새 썸네일은 건너뛴다. manifest.json 의 각 item 에 `thumb`,
 * 각 theme 에 `coverThumb` 를 채워 넣는다.
 *
 * ⚠️ import-iwart-templates.mjs 는 iwart 테마의 items 를 통째로 다시 만든다 = thumb 필드가
 *    날아간다. 도안을 새로 들여오면 **이 스크립트를 다시 돌려라**(빠지면 갤러리가 원본으로
 *    폴백해 그냥 무거워질 뿐, 깨지지는 않는다).
 *
 * 실행: node scripts/gen-template-thumbs.mjs
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const PUB = path.join(ROOT, "public");
const MANIFEST = path.join(PUB, "templates", "manifest.json");
const THUMB_DIR = path.join(PUB, "templates", "_thumbs");
const SIZE = 320;

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
let made = 0, skipped = 0, missing = 0, srcBytes = 0, outBytes = 0;
const broken = [];

for (const theme of Object.values(manifest.themes)) {
  const dir = path.join(THUMB_DIR, theme.theme);
  mkdirSync(dir, { recursive: true });
  for (const it of theme.items) {
    const src = path.join(PUB, it.image.replace(/^\//, ""));
    if (!existsSync(src)) { missing++; continue; }
    const dst = path.join(dir, `${it.id}.webp`);
    const rel = `/templates/_thumbs/${theme.theme}/${it.id}.webp`;
    if (existsSync(dst) && statSync(dst).mtimeMs >= statSync(src).mtimeMs) {
      skipped++;
    } else {
      try {
        const buf = await sharp(src)
          .resize(SIZE, SIZE, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        writeFileSync(dst, buf);
        made++;
      } catch (e) {
        // 원본이 깨졌거나 0바이트 — 한 장 때문에 1300장 생성이 멈추면 안 된다.
        // 썸네일이 없으면 갤러리는 원본으로 폴백한다(무거워질 뿐 안 깨진다).
        broken.push(`${it.image} (${e.message})`);
        continue;
      }
    }
    srcBytes += statSync(src).size;
    outBytes += statSync(dst).size;
    it.thumb = rel;
  }
  // 테마 커버도 썸네일로 — 첫 화면(테마 격자)이 여기만 쓴다
  const coverItem = theme.items.find((i) => i.image === theme.cover) ?? theme.items[0];
  theme.coverThumb = coverItem?.thumb ?? null;
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
console.log(
  `썸네일 ${made}장 생성 · ${skipped}장 재사용 · 원본없음 ${missing}\n` +
    `원본 ${(srcBytes / 1e6).toFixed(1)}MB → 썸네일 ${(outBytes / 1e6).toFixed(1)}MB`,
);
if (broken.length) {
  console.warn(`\n⚠️ 원본이 깨진 도안 ${broken.length}장 — 갤러리에 깨진 카드로 보인다:`);
  for (const b of broken) console.warn(`   ${b}`);
}
