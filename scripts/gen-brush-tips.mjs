/*
 * 브러시 팁 알파맵 생성 — codex imagegen(gpt-5.5). 유화 bristle 스탬프 3변형.
 * 검은 배경 + 흰 붓결(luminance→alpha 변환은 런타임 tipLoader가 수행).
 * ⚠️ 프롬프트는 반드시 stdin(positional은 codex-cli가 무시 → hang).
 * 사용법: OUT_DIR=<출력> node scripts/gen-brush-tips.mjs
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";

const OUT = process.env.OUT_DIR;
if (!OUT) {
  console.error("사용법: OUT_DIR=<출력> node scripts/gen-brush-tips.mjs");
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const SALT = `arton-tips-${Date.now()}`;
const VARIANTS = [
  ["bristle-a", "a single stamp footprint of a wide flat oil-paint brush pressed once on canvas, seen from directly above"],
  ["bristle-b", "a single short horizontal dry-brush drag mark from a coarse hog-hair oil brush, individual bristle trails visible"],
  ["bristle-c", "a single dense oil paint bristle brush dab, thick parallel horizontal bristle streaks with tiny gaps between hairs"],
];
const STYLE =
  "STRICTLY grayscale alpha texture map: pure black background, crisp WHITE bristle streaks. " +
  "Streaks run HORIZONTALLY, mostly solid white (opaque paint) with thin black gaps between bristle hairs, " +
  "ragged irregular left and right ends (individual hair trails of different lengths), " +
  "shape roughly fits inside a centered circle occupying 80% of the frame, " +
  "clear pure-black margin on all four edges, no gray haze, high contrast, no color, no text";

function codexGen(prompt) {
  return new Promise((resolve) => {
    const child = spawn(
      "codex",
      ["exec", "-m", "gpt-5.5", "--full-auto", "-c", 'model_reasoning_effort="low"', "--add-dir", OUT, "--skip-git-repo-check"],
      { stdio: ["pipe", "ignore", "pipe"] },
    );
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

let ok = 0;
for (const [id, desc] of VARIANTS) {
  const out = path.join(OUT, `${id}.png`);
  if (existsSync(out) && statSync(out).size > 10000) {
    console.log(`SKIP ${id}`);
    ok++;
    continue;
  }
  const prompt = `$imagegen 다음 조건으로 이미지 1장 생성 후 저장.
[unique:${SALT}]
프롬프트: ${desc}. ${STYLE}
저장 경로: ${out}
해상도: 1024x1024`;
  let done = false;
  for (let attempt = 0; attempt < 3 && !done; attempt++) {
    const r = await codexGen(prompt);
    done = existsSync(out) && statSync(out).size > 10000;
    if (!done) {
      console.error(`[${id}] attempt ${attempt} 실패 killed=${r.killed} ${r.err}`);
      if (r.killed && attempt >= 1) break;
    }
  }
  console.log(done ? `OK ${id}` : `FAIL ${id}`);
  if (done) ok++;
}
console.log(`done: ${ok}/${VARIANTS.length}`);
