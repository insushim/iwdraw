import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

/*
 * 저장한 그림에 종이가 없던 문제(2026-07-25 실측).
 * exportPng/exportWebp/exportThumb는 배경을 먼저 칠하고 layers.composite()를 불렀는데,
 * composite()의 첫 줄이 target을 clearRect 한다 → 배경이 통째로 지워졌다.
 * 결과: 내려받은 PNG의 98.7%가 알파 0(완전 투명). 투명 배경은 뷰어·인쇄에 따라
 * 검게 나와 "저장했는데 배경이 까매요"가 된다. 갤러리 webp·썸네일도 같은 경로였다.
 * 배경은 합성 "뒤에" destination-over로 깔아야 한다.
 */
test("내려받은 그림에는 화면과 같은 흰 종이가 깔려 있다", async ({ page }) => {
  await page.goto("/draw?mode=sketch&backend=gl");
  const canvas = page.getByLabel("그림 캔버스");
  await canvas.waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(400);

  const box = (await canvas.boundingBox())!;
  await page.getByRole("button", { name: "마커", exact: true }).click();
  await page.getByLabel("브러시 굵기", { exact: true }).fill("40");
  await page.getByRole("button", { name: "색 1", exact: true }).click();
  const y = box.y + box.height * 0.7;
  await page.mouse.move(box.x + box.width * 0.2, y);
  await page.mouse.down();
  for (let k = 1; k <= 20; k++)
    await page.mouse.move(box.x + box.width * (0.2 + 0.6 * (k / 20)), y);
  await page.mouse.up();
  await page.waitForTimeout(300);

  // 화면의 종이 색
  const screenPaper = await page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const d = el.getContext("2d")!.getImageData(0, 0, el.width, el.height).data;
    const i = (Math.round(el.height * 0.3) * el.width + Math.round(el.width * 0.5)) * 4;
    return [d[i], d[i + 1], d[i + 2]];
  });

  const download = await Promise.all([
    page.waitForEvent("download", { timeout: 30000 }),
    page.getByRole("button", { name: /저장/ }).first().click(),
  ]).then(([d]) => d);
  const path = await download.path();
  const b64 = readFileSync(path!).toString("base64");

  const saved = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const cx = c.getContext("2d")!;
    cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, c.width, c.height).data;
    let opaque = 0;
    let ink = 0;
    let n = 0;
    // 종이(destination-over)만 확인하면 "흰 종이 한 장"도 통과한다 — 획이 저장본에
    // 살아 있는지 같은 주사에서 함께 센다(합성 순서를 또 뒤집으면 이번엔 획이 사라진다).
    for (let i = 0; i < d.length; i += 4 * 97) {
      n++;
      if (d[i + 3] > 250) opaque++;
      if (Math.min(d[i], d[i + 1], d[i + 2]) < 200) ink++;
    }
    const i = (Math.round(c.height * 0.3) * c.width + Math.round(c.width * 0.5)) * 4;
    return {
      opaqueFrac: opaque / n,
      paper: [d[i], d[i + 1], d[i + 2]],
      alpha: d[i + 3],
      inkFrac: ink / n,
    };
  }, b64);

  console.log("EXPORT-PAPER", JSON.stringify({ screenPaper, saved }));
  // 수정 전: 0.013 (거의 전부 투명)
  expect(saved.opaqueFrac, "저장본에서 불투명한 픽셀 비율").toBeGreaterThan(0.99);
  expect(saved.alpha, "종이 자리의 알파").toBeGreaterThan(250);
  // 폭 40 마커로 캔버스 가로 60%를 그었다 = 화면에서 대략 2%. 종이에 묻혀 사라지면 0.
  expect(saved.inkFrac, "저장본에서 획이 차지하는 비율").toBeGreaterThan(0.005);
  // 화면 종이와 저장본 종이가 같은 색이어야 한다(예전 크림 #FBF7F0은 눈에 띄게 누렜다)
  const dist = Math.hypot(
    saved.paper[0] - screenPaper[0],
    saved.paper[1] - screenPaper[1],
    saved.paper[2] - screenPaper[2],
  );
  expect(dist, `화면 ${screenPaper} vs 저장본 ${saved.paper}`).toBeLessThan(8);
});
