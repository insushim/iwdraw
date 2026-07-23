import { test, expect, type Page } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

/*
 * 무비 모드 정합: 재생 최종 프레임 = 현재 캔버스 상태.
 * 언두한 획이 로그에 남아 재생되던 버그 회귀 가드(2026-07-23 사용자
 * "무비가 지금 현재 상태까지 안보여주네" — 언두 커서 도입으로 수정).
 */
async function drawLine(page: Page, box: { x: number; y: number; width: number; height: number }, y: number) {
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * y);
  await page.mouse.down();
  for (let k = 1; k <= 15; k++)
    await page.mouse.move(box.x + box.width * (0.2 + 0.5 * (k / 15)), box.y + box.height * y);
  await page.mouse.up();
  await page.waitForTimeout(150);
}

async function playAndSample(page: Page) {
  await page.getByRole("button", { name: /무비/ }).click();
  await page.getByRole("button", { name: "4배속" }).click();
  await page.getByRole("button", { name: /재생/ }).click();
  await page.waitForFunction(
    () => Array.from(document.querySelectorAll("button")).some((b) => b.textContent?.includes("▶ 재생")),
    { timeout: 60000 },
  );
  return page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]')!;
    const cv = dlg.querySelector("canvas") as HTMLCanvasElement;
    const ctx = cv.getContext("2d")!;
    const bands: Record<string, number> = {};
    for (const [name, yr] of [["y30", 0.3], ["y50", 0.5], ["y70", 0.7]] as const) {
      const d = ctx.getImageData(
        Math.round(cv.width * 0.25),
        Math.round(cv.height * yr) - 5,
        Math.round(cv.width * 0.4),
        11,
      ).data;
      let ink = 0;
      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        if (d[i + 3] > 200 && lum < 200) ink++;
      }
      bands[name] = ink;
    }
    return bands;
  });
}

test("언두한 획은 무비 재생에서 제외된다", async ({ page }) => {
  await page.goto("/draw?mode=sketch");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);
  const box = (await page.getByLabel("그림 캔버스").boundingBox())!;
  await drawLine(page, box, 0.3);
  await drawLine(page, box, 0.5);
  await drawLine(page, box, 0.7);
  await page.getByRole("button", { name: /되돌리기|실행 취소/ }).click();
  await page.waitForTimeout(200);
  const bands = await playAndSample(page);
  expect(bands.y30).toBeGreaterThan(500); // 남은 획은 재생됨
  expect(bands.y50).toBeGreaterThan(500);
  expect(bands.y70).toBe(0); // 언두한 획은 재생 안 됨
});
