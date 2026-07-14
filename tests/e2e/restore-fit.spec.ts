import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });
test.setTimeout(90_000);

/*
 * "이어 그리기" 복원이 확대(=좌상단만 보임)되는 버그(2026-07-14 사용자 실측).
 * 저장 당시 캔버스 크기와 다시 들어온 캔버스 크기가 다르면(선따기는 원본 사진 비율로
 * 캔버스를 잡는다) 저장 PNG를 1:1로 그려 잘려 나갔다. 비율 유지 축소·중앙 정렬이어야 한다.
 *
 * 재현: 가로 캔버스에서 획 → 자동저장 → 새로고침 → 세로로 전환(캔버스 크기 달라짐) →
 * "이어 그리기". 복원된 그림은 캔버스 중앙에 있어야 하고 잘리면 안 된다.
 */
async function inkBox(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const d = el.getContext("2d")!.getImageData(0, 0, el.width, el.height).data;
    let minX = 1e9,
      maxX = -1,
      minY = 1e9,
      maxY = -1,
      n = 0;
    for (let y = 0; y < el.height; y += 2) {
      for (let x = 0; x < el.width; x += 2) {
        if (d[(y * el.width + x) * 4] < 200) {
          n++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    return { n, minX, maxX, minY, maxY, w: el.width, h: el.height };
  });
}

test("캔버스 크기가 달라져도 이어 그리기가 잘리거나 확대되지 않는다", async ({ page }) => {
  await page.goto("/draw?mode=sketch&backend=gl");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);

  // 가로 캔버스에 화면 폭을 가로지르는 획(세로 중앙)
  await page.getByRole("button", { name: "마커", exact: true }).click();
  await page.getByLabel("브러시 굵기", { exact: true }).fill("40");
  const box = (await page.getByLabel("그림 캔버스").boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.08, box.y + box.height * 0.5);
  await page.mouse.down();
  for (let k = 1; k <= 20; k++)
    await page.mouse.move(box.x + box.width * (0.08 + 0.84 * (k / 20)), box.y + box.height * 0.5);
  await page.mouse.up();
  await page.waitForTimeout(600);

  // 자동저장 플러시(탭 숨김 훅)
  await page.evaluate(async () => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    await new Promise((r) => setTimeout(r, 900));
  });

  // 새로고침 → 세로로 전환(캔버스 크기가 저장 때와 달라진다) → 이어 그리기
  await page.reload();
  await page.getByLabel("그림 캔버스").waitFor();
  await page.getByRole("button", { name: "캔버스 방향 바꾸기" }).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "이어 그리기", exact: true }).click();
  await page.waitForTimeout(900);

  const b = await inkBox(page);
  console.log("RESTORE", JSON.stringify(b));
  expect(b.n, "복원된 그림이 있어야 한다").toBeGreaterThan(200);
  // 세로 중앙에 있어야 한다(1:1로 그리면 위쪽으로 치우친다)
  const cy = (b.minY + b.maxY) / 2 / b.h;
  expect(cy).toBeGreaterThan(0.42);
  expect(cy).toBeLessThan(0.58);
  // 좌우가 잘리지 않아야 한다(비율 유지 축소면 양쪽에 여백이 남거나 딱 맞는다)
  expect(b.maxX).toBeLessThan(b.w - 1);
});
