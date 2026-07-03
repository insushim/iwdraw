/*
 * 아트온 도구 아이콘 13종 생성 — codex imagegen(gpt-5.5, effort low), 스타일 레퍼런스 체인.
 * ⚠️ 프롬프트는 반드시 stdin으로 전달(positional 인자는 codex-cli가 무시하고 stdin 대기 → 8분 hang 실측).
 * hang 방어: 8분 SIGKILL + killed면 1회만 재시도. 재개 멱등: 기존 원본 있으면 skip.
 * 사용법: OUT_DIR=<원본출력> PUB_DIR=<public/icons/tools> node scripts/gen-tool-icons.mjs
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUT = process.env.OUT_DIR; // 1024 원본
const PUB = process.env.PUB_DIR; // 256 웹 출력
if (!OUT || !PUB) {
  console.error("사용법: OUT_DIR=<원본출력> PUB_DIR=<public/icons/tools> node scripts/gen-tool-icons.mjs");
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });
mkdirSync(PUB, { recursive: true });

const SALT = `arton-icons-${Date.now()}`;
const STYLE =
  "cute flat sticker-style app icon, rounded chunky shapes, thick soft dark-brown (#2D2A26) outline, " +
  "warm pastel palette (coral #FF7A59, sky blue #5BB8F5, sunny yellow #FFC84A, leaf green #7BC96F), " +
  "subtle top-left soft lighting, single centered object filling ~70% of frame, " +
  "TRANSPARENT background (no backdrop, no card, no circle behind), no text, no letters, " +
  "for a children's digital art app toolbar";
const NEG =
  "NOT photorealistic, NOT 3D render, NOT comic panel, NOT historical drama, NOT anime character, " +
  "NOT white background, NOT gradient backdrop, no watermark, no border frame";

const ICONS = [
  ["pencil", "a yellow wooden pencil with pink eraser cap, tip pointing down-left"],
  ["crayon", "a red wax crayon with paper wrapper label, slightly tilted"],
  ["marker", "a single sky-blue felt-tip marker pen with darker blue chisel tip"],
  ["watercolor", "a watercolor paintbrush with wooden handle and a big shiny blue water droplet at the bristle tip"],
  ["oil", "a flat oil paintbrush loaded with thick coral-orange paint, one thick curved paint smear below it"],
  ["airbrush", "a small round silver spray nozzle emitting a cone of soft blue mist dots to the right"],
  ["oilpastel", "an orange oil pastel stick with rounded worn tip and one soft orange smudge stroke"],
  ["glow", "a glowing golden four-pointed sparkle star with soft radiant halo and two tiny sparkles"],
  ["rainbow", "a cheerful rainbow arc with red, yellow and blue bands, tiny white cloud at each end"],
  ["eraser", "a pink rubber eraser with white sleeve band, slightly tilted, two small motion lines"],
  ["fill", "a tilted metal paint bucket pouring glossy blue paint forming a small puddle"],
  ["palette", "an artist's wooden paint palette with four paint blobs (coral, yellow, sky blue, green) and a thumb hole"],
  ["coloring", "a simple heart outline half colored-in with green crayon strokes, other half still white"],
];

/** codex exec — 프롬프트 stdin, 8분 하드킬. 반환 {ok, killed} */
function codexGen(prompt, refs, addDir) {
  return new Promise((resolve) => {
    const args = [
      "exec", "-m", "gpt-5.5", "--full-auto",
      "-c", 'model_reasoning_effort="low"',
      "--add-dir", addDir, "--skip-git-repo-check",
    ];
    for (const r of refs) args.push("-i", r);
    const child = spawn("codex", args, { stdio: ["pipe", "ignore", "pipe"] });
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGKILL");
    }, 480000);
    let err = "";
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, killed, err: err.slice(0, 200) });
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

const okOnes = [];
for (const [id] of ICONS) {
  const p = path.join(OUT, `${id}.png`);
  if (existsSync(p) && statSync(p).size > 10000) okOnes.push(p);
}

for (const [id, desc] of ICONS) {
  const out = path.join(OUT, `${id}.png`);
  if (existsSync(out) && statSync(out).size > 10000) {
    console.log(`SKIP ${id} (있음)`);
    await sharp(out).resize(256, 256, { fit: "inside" }).png().toFile(path.join(PUB, `${id}.png`));
    continue;
  }
  const refs = [];
  if (okOnes[0]) refs.push(okOnes[0]); // 스타일 앵커
  if (okOnes.length > 1) refs.push(okOnes[okOnes.length - 1]); // 직전 컷
  const prompt = `$imagegen 다음 조건으로 이미지 1장 생성 후 저장.
[unique:${SALT}]
프롬프트: ${desc}, ${STYLE}. ${refs.length ? "EXACTLY match the reference images' style, outline thickness, palette and lighting (NO style drift)." : ""} NEGATIVE: ${NEG}
저장 경로: ${out}
해상도: 1024x1024, transparent background PNG`;

  let done = false;
  for (let attempt = 0; attempt < 3 && !done; attempt++) {
    const r = await codexGen(prompt, refs, OUT);
    done = existsSync(out) && statSync(out).size > 10000;
    if (!done) {
      console.error(`[${id}] attempt ${attempt} 실패 killed=${r.killed} ${r.err}`);
      if (r.killed && attempt >= 1) break; // 타임아웃 재시도 캡
    }
  }
  if (done) {
    okOnes.push(out);
    await sharp(out).resize(256, 256, { fit: "inside" }).png().toFile(path.join(PUB, `${id}.png`));
    console.log(`OK ${id}`);
  } else {
    console.log(`FAIL ${id}`);
  }
}
console.log(`done: ${okOnes.length}/${ICONS.length}`);
