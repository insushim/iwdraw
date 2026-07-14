import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

/*
 * undo 정확성 — 성능 개선(전체 캔버스 스냅샷 → 더티 타일/copy-on-write)이 되돌리기를
 * 깨뜨리지 않는지. 특히 지우개·번짐은 레이어를 실시간으로 고치므로 "고치기 전" 픽셀을
 * 반드시 고치기 직전에 확보해야 한다(뒤에 복사하면 이미 지워진 상태가 undo 대상이 된다).
 */
async function fingerprint(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const d = el.getContext("2d")!.getImageData(0, 0, el.width, el.height).data;
    let sum = 0;
    let ink = 0;
    for (let i = 0; i < d.length; i += 64) {
      sum = (sum + d[i] * 31 + d[i + 1] * 7 + d[i + 2] * 3 + d[i + 3]) % 1e9;
      if (d[i + 3] > 8) ink++;
    }
    return { sum, ink };
  });
}

async function stroke(page: import("@playwright/test").Page, y: number, x0 = 0.2, x1 = 0.8) {
  const box = (await page.getByLabel("그림 캔버스").boundingBox())!;
  await page.mouse.move(box.x + box.width * x0, box.y + box.height * y);
  await page.mouse.down();
  for (let k = 1; k <= 20; k++)
    await page.mouse.move(
      box.x + box.width * (x0 + (x1 - x0) * (k / 20)),
      box.y + box.height * (y + 0.03 * Math.sin(k)),
    );
  await page.mouse.up();
  await page.waitForTimeout(200);
}

for (const tool of ["지우개", "번짐"]) {
  test(`${tool} 획을 되돌리면 원래 그림으로 정확히 돌아온다`, async ({ page }) => {
    await page.goto("/draw?mode=sketch&backend=gl");
    await page.getByLabel("그림 캔버스").waitFor();
    const fresh = page.getByRole("button", { name: /새로 시작/ });
    if (await fresh.isVisible().catch(() => false)) await fresh.click();
    await page.waitForTimeout(300);

    // 밑그림 몇 획
    await page.getByRole("button", { name: "마커", exact: true }).click();
    await page.getByRole("button", { name: "색 5", exact: true }).click();
    await page.getByLabel("브러시 굵기", { exact: true }).fill("40");
    await stroke(page, 0.35);
    await stroke(page, 0.5);
    await page.waitForTimeout(300);
    const before = await fingerprint(page);

    // 그 위를 지우거나 문지른다
    await page.getByRole("button", { name: tool, exact: true }).click();
    await page.getByLabel("브러시 굵기", { exact: true }).fill("40");
    await stroke(page, 0.42, 0.3, 0.7);
    await page.waitForTimeout(300);
    const after = await fingerprint(page);
    expect(after.sum, `${tool}이 실제로 픽셀을 바꿔야 한다`).not.toBe(before.sum);

    // 되돌리기 → 원본과 완전히 같아야 한다
    await page.getByRole("button", { name: "되돌리기" }).click();
    await page.waitForTimeout(400);
    const undone = await fingerprint(page);
    expect(undone.sum).toBe(before.sum);
    expect(undone.ink).toBe(before.ink);
  });
}

test("여러 획을 연속으로 되돌리고 다시 실행해도 픽셀이 일치한다", async ({ page }) => {
  await page.goto("/draw?mode=sketch&backend=gl");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "크레용", exact: true }).click();
  await page.getByLabel("브러시 굵기", { exact: true }).fill("30");

  await stroke(page, 0.3);
  const s1 = await fingerprint(page);
  await stroke(page, 0.5);
  await stroke(page, 0.7);
  const s3 = await fingerprint(page);

  const undo = page.getByRole("button", { name: "되돌리기" });
  const redo = page.getByRole("button", { name: "다시 실행" });
  await undo.click();
  await undo.click();
  await page.waitForTimeout(400);
  expect((await fingerprint(page)).sum).toBe(s1.sum);
  await redo.click();
  await redo.click();
  await page.waitForTimeout(400);
  expect((await fingerprint(page)).sum).toBe(s3.sum);
});
