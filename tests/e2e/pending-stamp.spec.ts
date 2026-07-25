import { test, expect } from "@playwright/test";

/*
 * 떠 있는 스탬프(그림 도장) 배치 회귀 테스트.
 * 팔레트에서 스탬프를 고르면 "떠 있는" 상태로 나타나고,
 *  - 확인(여기 놓기) → 실제로 캔버스에 잉크가 찍힌다(preview==final)
 *  - 취소 → 캔버스는 그대로(레이어 무변경)
 *  - 옮긴 뒤 확인 → 옮긴 쪽(왼위)에 잉크가 몰린다(이동 반영)
 */

async function openEditor(page: import("@playwright/test").Page) {
  await page.goto("/draw");
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  const canvas = page.getByLabel("그림 캔버스");
  await canvas.waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);
  return canvas;
}

/** 캔버스에서 어두운(잉크) 픽셀 비율 — 흰 종이 위 스탬프 윤곽/채움 검출 */
async function inkFrac(page: import("@playwright/test").Page, quadrant?: "tl" | "br") {
  return page.evaluate((quad) => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const ctx = el.getContext("2d")!;
    const W = el.width,
      H = el.height;
    const x0 = quad === "br" ? Math.floor(W / 2) : 0;
    const y0 = quad === "br" ? Math.floor(H / 2) : 0;
    const x1 = quad === "tl" ? Math.floor(W / 2) : W;
    const y1 = quad === "tl" ? Math.floor(H / 2) : H;
    const d = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    let ink = 0,
      total = 0;
    for (let i = 0; i < d.length; i += 16) {
      total++;
      // 어두운 픽셀(윤곽선 #2D2A26 등) — 흰 종이(≈255)와 대비
      if (d[i] < 160 && d[i + 1] < 160 && d[i + 2] < 160) ink++;
    }
    return ink / total;
  }, quadrant);
}

test("팔레트로 스탬프를 골라 확인하면 캔버스에 찍힌다", async ({ page }) => {
  const canvas = await openEditor(page);
  const before = await inkFrac(page);

  await page.getByRole("button", { name: /그림 도장/ }).click();
  // 팔레트 첫 스탬프 선택(aria-label "…넣기")
  await page.getByRole("button", { name: /넣기$/ }).first().click();

  // 떠 있는 배치 바 표시
  await expect(page.getByRole("button", { name: "놓기 확인" })).toBeVisible();

  await page.getByRole("button", { name: "놓기 확인" }).click();
  await expect(page.getByRole("button", { name: "놓기 확인" })).toHaveCount(0);
  await page.waitForTimeout(200);

  const after = await inkFrac(page);
  expect(after, "확인 후 잉크가 늘어야 함").toBeGreaterThan(before + 0.002);
  await expect(canvas).toBeVisible();
});

test("취소하면 캔버스는 그대로", async ({ page }) => {
  await openEditor(page);
  const before = await inkFrac(page);

  await page.getByRole("button", { name: /그림 도장/ }).click();
  await page.getByRole("button", { name: /넣기$/ }).first().click();
  await expect(page.getByRole("button", { name: "놓기 취소" })).toBeVisible();
  await page.getByRole("button", { name: "놓기 취소" }).click();
  await expect(page.getByRole("button", { name: "놓기 취소" })).toHaveCount(0);
  await page.waitForTimeout(200);

  const after = await inkFrac(page);
  expect(Math.abs(after - before), "취소 후 잉크 변화 없음").toBeLessThan(0.002);
});

test("떠 있는 스탬프를 왼위로 옮기면 그쪽에 찍힌다", async ({ page }) => {
  const canvas = await openEditor(page);
  await page.getByRole("button", { name: /그림 도장/ }).click();
  await page.getByRole("button", { name: /넣기$/ }).first().click();
  await expect(page.getByRole("button", { name: "놓기 확인" })).toBeVisible();

  const box = (await canvas.boundingBox())!;
  // 중심(스탬프 몸통) 잡고 → 왼위 사분면으로 드래그
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.28, box.y + box.height * 0.28, { steps: 8 });
  await page.mouse.up();

  await page.getByRole("button", { name: "놓기 확인" }).click();
  await page.waitForTimeout(200);

  const tl = await inkFrac(page, "tl");
  const br = await inkFrac(page, "br");
  expect(tl, "왼위 사분면에 잉크").toBeGreaterThan(0.002);
  expect(tl, "왼위가 오른아래보다 잉크 많음(이동 반영)").toBeGreaterThan(br);
});
