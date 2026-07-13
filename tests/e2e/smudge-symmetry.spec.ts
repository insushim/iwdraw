import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

/*
 * 번짐(smudge)은 dab 파이프라인이 아니라 레이어를 직접 문지르므로 대칭 복제가 빠져 있었다
 * → 데칼코마니에서 번짐만 한쪽에만 먹었다(2026-07-13 사용자 실측).
 * 좌우 대칭을 켜고 왼쪽 절반만 문질렀을 때 오른쪽 절반도 함께 바뀌는지 픽셀로 확인한다.
 */
test("데칼코마니(좌우 대칭)에서 번짐이 반대쪽에도 적용된다", async ({ page }) => {
  await page.goto("/draw?mode=sketch&backend=gl");
  const canvas = page.getByLabel("그림 캔버스");
  await canvas.waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);

  const box = (await canvas.boundingBox())!;

  // ① 대칭을 켜고 굵은 획 — 좌우 양쪽에 같은 그림이 생긴다
  await page.getByRole("button", { name: "좌우", exact: true }).click();
  await page.getByRole("button", { name: "마커", exact: true }).click();
  await page.getByRole("button", { name: "색 1", exact: true }).click();
  await page.getByLabel("브러시 굵기", { exact: true }).fill("40");
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.3);
  await page.mouse.down();
  for (let k = 1; k <= 20; k++)
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * (0.3 + 0.4 * (k / 20)));
  await page.mouse.up();
  await page.waitForTimeout(400);

  const snap = async () => {
    return page.evaluate(() => {
      const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
      const ctx = el.getContext("2d")!;
      // 오른쪽(대칭으로 복제된) 획 주변 영역
      const x = Math.round(el.width * 0.68);
      const y = Math.round(el.height * 0.38);
      const w = Math.round(el.width * 0.14);
      const h = Math.round(el.height * 0.2);
      return Array.from(ctx.getImageData(x, y, w, h).data);
    });
  };

  const before = await snap();

  // ② 왼쪽 획만 문지른다(번짐 붓, 획을 가로지르게)
  await page.getByRole("button", { name: "번짐", exact: true }).click();
  await page.getByLabel("브러시 굵기", { exact: true }).fill("40");
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.45);
  await page.mouse.down();
  for (let k = 1; k <= 20; k++)
    await page.mouse.move(box.x + box.width * (0.2 + 0.12 * (k / 20)), box.y + box.height * 0.45);
  await page.mouse.up();
  await page.waitForTimeout(500);

  const after = await snap();

  let changed = 0;
  for (let i = 0; i < before.length; i += 4) {
    if (Math.abs(before[i] - after[i]) > 8 || Math.abs(before[i + 3] - after[i + 3]) > 8) changed++;
  }
  console.log("SMUDGE-SYM: 반대쪽 변화 픽셀", changed);
  // 대칭 번짐이 없으면 0에 가깝다(수정 전 실측 0)
  expect(changed).toBeGreaterThan(200);
});
