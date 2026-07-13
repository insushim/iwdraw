import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

/*
 * 붓펜 얇은 획 연속성 회귀(2026-07-13 사용자 실측: "가장 얇은 굵기로 그으면 끊긴다").
 * 원인 = 화선지 종이 결(paperGrain 0.24) 침식이 1px 획의 알파를 통째로 갉아 점선화.
 * 굵기 1로 가로 획을 긋고, 획 경로를 x축으로 스캔해 "칠해진 열"의 비율을 잰다.
 */
test("붓펜 굵기 1 획이 끊기지 않는다", async ({ page }) => {
  await page.goto("/draw?mode=sketch&backend=gl");
  const canvas = page.getByLabel("그림 캔버스");
  await canvas.waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);

  await page.getByRole("button", { name: "붓펜", exact: true }).click();
  await page.getByLabel("브러시 굵기", { exact: true }).fill("1");
  const box = (await canvas.boundingBox())!;
  const y = box.y + box.height * 0.5;
  // 빠른 획 — 마우스는 "속도=필압"이라 빠르게 그으면 굵기·알파가 최소로 떨어진다
  // (사용자 재현 조건). 스텝을 크게 잡아 빠른 이동을 흉내낸다.
  await page.mouse.move(box.x + box.width * 0.15, y);
  await page.mouse.down();
  for (let k = 1; k <= 8; k++)
    await page.mouse.move(box.x + box.width * (0.15 + 0.7 * (k / 8)), y);
  await page.mouse.up();
  await page.waitForTimeout(400);

  // 획 경로 x 구간에서, 각 열(±8px 세로 밴드)에 잉크 픽셀이 있는지 — 커버리지
  const cov = await page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const ctx = el.getContext("2d")!;
    const y0 = Math.round(el.height * 0.5) - 10;
    const x0 = Math.round(el.width * 0.2);
    const w = Math.round(el.width * 0.6);
    const d = ctx.getImageData(x0, y0, w, 20).data;
    let filled = 0;
    for (let x = 0; x < w; x++) {
      let hit = false;
      for (let y = 0; y < 20; y++) {
        const i = (y * w + x) * 4;
        if (d[i] < 245) { hit = true; break; } // 잉크(얇은 획은 회색)
      }
      if (hit) filled++;
    }
    return filled / w;
  });
  console.log(`INKTHIN: 커버리지=${(cov * 100).toFixed(1)}%`);
  // 끊김(점선) 시 60~80%대, 연속이면 ~100%
  expect(cov, "얇은 붓펜 획의 연속 커버리지").toBeGreaterThan(0.97);
});
