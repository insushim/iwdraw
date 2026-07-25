import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

/*
 * 되돌릴 수 없이 그림을 지우는 버튼은 전부 2단계 확인을 거쳐야 한다.
 * 2026-07-25 실측: "캔버스 방향 바꾸기"만 확인이 없었다. 경고는 title 툴팁뿐이라
 * 터치 기기(웨일북·태블릿)에선 볼 방법이 아예 없었고, 되돌리기도 안 된다
 * ("새 그림"·"전체 지우기"는 둘 다 확인이 있다 — 가장 크게 잃는 버튼만 무방비였다).
 *
 * 같이 잡힌 결함: 재마운트(방향 전환) 후 스토어의 canUndo/canRedo가 앞 엔진 값으로
 * 남아, 되돌리기 버튼이 켜진 채 눌러도 아무 일도 안 일어났다.
 */
async function ink(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const d = el.getContext("2d")!.getImageData(0, 0, el.width, el.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 64) if (d[i] < 200) n++;
    return n;
  });
}

async function drawOne(page: import("@playwright/test").Page) {
  const box = (await page.getByLabel("그림 캔버스").boundingBox())!;
  const y = box.y + box.height * 0.4;
  await page.mouse.move(box.x + box.width * 0.2, y);
  await page.mouse.down();
  for (let k = 1; k <= 20; k++)
    await page.mouse.move(box.x + box.width * (0.2 + 0.6 * (k / 20)), y);
  await page.mouse.up();
  await page.waitForTimeout(200);
}

test("그린 뒤 방향 바꾸기는 한 번 눌러선 안 지워진다(2단계 확인)", async ({ page }) => {
  await page.goto("/draw?mode=sketch&backend=gl");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "색 1", exact: true }).click();
  await page.getByRole("button", { name: "연필", exact: true }).click();
  await page.getByLabel("브러시 굵기", { exact: true }).fill("22");
  await drawOne(page);
  const before = await ink(page);
  expect(before).toBeGreaterThan(50);

  const rotate = page.getByRole("button", { name: "캔버스 방향 바꾸기" });
  await rotate.click();
  await page.waitForTimeout(900);
  expect(await ink(page), "첫 클릭은 확인만 — 그림은 그대로").toBe(before);
  await expect(rotate).toHaveText(/지워요/);

  // 두 번째 클릭 = 실행
  await rotate.click();
  await page.waitForTimeout(1200);
  const canvas = page.getByLabel("그림 캔버스");
  await expect(async () => {
    const box = (await canvas.boundingBox())!;
    expect(box.height > box.width).toBe(true);
  }).toPass();
  expect(await ink(page), "확인 뒤에는 실제로 새 캔버스").toBe(0);

  // 재마운트 후 되돌리기 버튼은 꺼져 있어야 한다(앞 엔진 상태 잔류 금지)
  await expect(page.getByRole("button", { name: "되돌리기" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "다시 실행" })).toBeDisabled();
});

test("빈 캔버스는 확인 없이 바로 방향이 바뀐다", async ({ page }) => {
  await page.goto("/draw?mode=sketch&backend=gl");
  const canvas = page.getByLabel("그림 캔버스");
  await canvas.waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "캔버스 방향 바꾸기" }).click();
  await expect(async () => {
    const box = (await canvas.boundingBox())!;
    expect(box.height > box.width).toBe(true);
  }).toPass();
});
