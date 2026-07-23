import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

/*
 * 반짝이(글리터) 펜: 진한 잉크 리본 + 밝은 반짝 입자.
 *  · 리본이 실제로 그려져야 하고(잉크 존재), 그 안에 브러시색보다 확연히 밝은
 *    입자 픽셀이 흩어져 있어야 한다(명도 분산) — 입자가 베이스에 덮이면 실패.
 *  · GL과 Canvas2D(웨일북 폴백) 양쪽에서 동일하게 성립해야 한다.
 */
async function run(page: import("@playwright/test").Page, backend: "gl" | "2d") {
  await page.goto(`/draw?mode=sketch&backend=${backend}`);
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);

  await page.getByRole("button", { name: "반짝이", exact: true }).click();
  await page.getByLabel("브러시 굵기", { exact: true }).fill("28");

  const box = (await page.getByLabel("그림 캔버스").boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
  await page.mouse.down();
  for (let k = 1; k <= 30; k++)
    await page.mouse.move(box.x + box.width * (0.2 + 0.6 * (k / 30)), box.y + box.height * 0.5);
  await page.mouse.up();
  await page.waitForTimeout(400);

  return page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const ctx = el.getContext("2d")!;
    // 획 중심 가로 밴드(굵기 안쪽)만 샘플
    const y0 = Math.round(el.height * 0.5) - 4;
    const x0 = Math.round(el.width * 0.25);
    const w = Math.round(el.width * 0.5);
    const d = ctx.getImageData(x0, y0, w, 9).data;
    let ink = 0;
    let bright = 0;
    const lums: number[] = [];
    for (let i = 0; i < d.length; i += 4) {
      const R = d[i], G = d[i + 1], B = d[i + 2];
      const lum = 0.299 * R + 0.587 * G + 0.114 * B;
      // 흰 종이(크림 배경 ~245)는 제외하고 잉크 픽셀만
      if (lum < 235) {
        ink++;
        lums.push(lum);
        if (lum > 140) bright++; // 기본 잉크(어두운 색)보다 확연히 밝음 = 반짝 입자
      }
    }
    const mean = lums.reduce((a, b) => a + b, 0) / Math.max(1, lums.length);
    const sd = Math.sqrt(lums.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, lums.length));
    return { ink, bright, sd: Math.round(sd * 10) / 10 };
  });
}

test("반짝이펜(GL): 리본 + 밝은 입자", async ({ page }) => {
  const r = await run(page, "gl");
  expect(r.ink).toBeGreaterThan(500); // 리본이 실제로 그려짐
  expect(r.bright).toBeGreaterThan(30); // 반짝 입자가 살아 있음(베이스에 덮이지 않음)
  expect(r.sd).toBeGreaterThan(12); // 균일 리본이 아니라 입자 요철이 있음
});

test("반짝이펜(Canvas2D 폴백): 웨일북 경로에서도 동일", async ({ page }) => {
  const r = await run(page, "2d");
  expect(r.ink).toBeGreaterThan(500);
  expect(r.bright).toBeGreaterThan(30);
  expect(r.sd).toBeGreaterThan(12);
});
