import { test, expect } from "@playwright/test";
test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

/*
 * 데스크톱 트랙패드/마우스 줌(ctrl+wheel)이 브라우저 페이지 줌을 걸면 새로고침해도
 * 확대가 안 풀린다(JS로 페이지 줌 리셋 불가) — 2026-07-23 사용자 "새로고침해도 확대,
 * 헷갈림". 캔버스가 이를 가로채 앱 뷰 줌으로 돌리므로 새로고침 시 리셋된다.
 */
test("ctrl+wheel = 앱 뷰 줌(페이지 줌 아님) + 새로고침 시 리셋", async ({ page }) => {
  await page.goto("/draw?mode=sketch");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);
  const box = (await page.getByLabel("그림 캔버스").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.down("Control");
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, -40);
    await page.waitForTimeout(30);
  }
  await page.keyboard.up("Control");
  await page.waitForTimeout(200);
  const scaleAfter = await page.evaluate(() => (window as any).__artonEngine?.view?.scale ?? 1);
  const pageZoom = await page.evaluate(() => window.visualViewport?.scale ?? 1);
  expect(scaleAfter).toBeGreaterThan(1); // 앱 뷰 확대
  expect(pageZoom).toBeCloseTo(1, 1); // 브라우저 페이지 줌 미발동

  await page.reload();
  await page.getByLabel("그림 캔버스").waitFor();
  await page.waitForTimeout(400);
  const scaleReload = await page.evaluate(() => (window as any).__artonEngine?.view?.scale ?? 1);
  expect(scaleReload).toBe(1); // 새로고침 = 원래 크기
});
