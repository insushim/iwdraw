import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });
test.setTimeout(90_000);

/*
 * 레이어 순서 드래그(2026-07-14 요청). 손잡이(⠿)를 끌어 위아래로 옮기면 순서가 바뀌고,
 * 화면 합성(누가 위에 덮이는지)도 즉시 따라와야 한다.
 * 같은 자리에 레이어1=빨강, 레이어2=파랑을 칠해두고, 순서를 뒤집으면 보이는 색이 바뀐다.
 */
test("손잡이를 끌면 레이어 순서와 덮이는 색이 바뀐다", async ({ page }) => {
  await page.goto("/draw?mode=sketch&backend=gl");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);

  const paint = async (colorBtn: string) => {
    await page.getByRole("button", { name: colorBtn, exact: true }).click();
    const box = (await page.getByLabel("그림 캔버스").boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.5);
    await page.mouse.down();
    for (let k = 1; k <= 10; k++)
      await page.mouse.move(box.x + box.width * (0.35 + 0.3 * (k / 10)), box.y + box.height * 0.5);
    await page.mouse.up();
    await page.waitForTimeout(200);
  };
  /** 획 자리의 대표 색 */
  const centerColor = async () =>
    page.evaluate(() => {
      const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
      const d = el
        .getContext("2d")!
        .getImageData(Math.round(el.width * 0.5), Math.round(el.height * 0.5), 1, 1).data;
      return { r: d[0], g: d[1], b: d[2] };
    });

  await page.getByRole("button", { name: "마커", exact: true }).click();
  await page.getByLabel("브러시 굵기", { exact: true }).fill("50");

  // 레이어 1에 빨강
  await paint("색 5");
  // 레이어 2(새 레이어)에 파랑 — 같은 자리를 덮는다
  await page.getByRole("button", { name: /^레이어/ }).click(); // 패널 열기
  await page.getByRole("button", { name: "새 레이어" }).click();
  await page.waitForTimeout(200);
  await paint("색 14");

  const order = async () =>
    page.evaluate(() => [...document.querySelectorAll("[data-layer-id]")].map((e) => (e.textContent || "").slice(0, 10)));
  console.log("ORDER before", await order());
  const top = await centerColor();
  console.log("TOP(파랑이 위)", JSON.stringify(top));
  expect(top.b, "새 레이어(파랑)가 위에 보인다").toBeGreaterThan(top.r);

  // 위쪽 줄(레이어 2)의 손잡이를 잡고 아래 줄로 끌어내린다
  const rows = page.locator("[data-layer-id]");
  const handle = rows.nth(0).getByRole("button", { name: /순서 바꾸기/ });
  await handle.scrollIntoViewIfNeeded(); // 우측 패널이 길어 화면 밖으로 밀려 있을 수 있다
  await page.waitForTimeout(200);
  const from = (await handle.boundingBox())!;
  const lowerRow = (await rows.nth(1).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  const ty = lowerRow.y + lowerRow.height / 2;
  const sy = from.y + from.height / 2;
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(from.x + from.width / 2, sy + (ty - sy) * (i / 8));
    await page.waitForTimeout(40);
  }
  await page.mouse.up();
  await page.waitForTimeout(400);

  console.log("ORDER after", await order());
  const after = await centerColor();
  console.log("AFTER(빨강이 위)", JSON.stringify(after));
  expect(after.r, "순서를 바꾸면 빨강이 위로 올라와 보인다").toBeGreaterThan(after.b);
});
