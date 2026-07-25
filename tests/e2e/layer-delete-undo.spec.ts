import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

/*
 * 레이어 삭제 되돌리기 — 2026-07-25 실측 결함.
 * 삭제가 히스토리에 안 남아서 ① 그 레이어의 그림이 영영 사라지고
 * ② 그 레이어에 그렸던 획 커맨드가 화면에 없는 캔버스를 되돌리느라
 * "되돌리기를 눌러도 아무 일이 없다가 그 다음 눌렀을 때 남의 레이어 획이
 * 사라지는" 상태가 됐다(휴지통 아이콘엔 확인 창도 없다).
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

async function stroke(page: import("@playwright/test").Page, yFrac: number) {
  const box = (await page.getByLabel("그림 캔버스").boundingBox())!;
  const y = box.y + box.height * yFrac;
  await page.mouse.move(box.x + box.width * 0.2, y);
  await page.mouse.down();
  for (let k = 1; k <= 20; k++)
    await page.mouse.move(box.x + box.width * (0.2 + 0.6 * (k / 20)), y);
  await page.mouse.up();
  await page.waitForTimeout(180);
}

test("삭제한 레이어는 되돌리기로 그림째 돌아온다", async ({ page }) => {
  await page.goto("/draw?mode=sketch&backend=gl");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "색 1", exact: true }).click();
  await page.getByRole("button", { name: "연필", exact: true }).click();
  await page.getByLabel("브러시 굵기", { exact: true }).fill("20");

  await stroke(page, 0.3);
  const one = await ink(page);

  await page.getByRole("button", { name: /레이어/ }).first().click();
  await page.getByRole("button", { name: /새 레이어/ }).click();
  await page.waitForTimeout(150);
  await stroke(page, 0.6);
  const two = await ink(page);
  expect(two, "레이어 2에 획을 더하면 잉크가 는다").toBeGreaterThan(one * 1.5);

  await page.getByRole("button", { name: "레이어 삭제" }).first().click();
  await page.waitForTimeout(250);
  expect(await ink(page), "삭제 직후엔 레이어 1만 남는다").toBeLessThan(two * 0.75);

  // 되돌리기 1번 = 레이어가 그림째 복귀 (예전엔 아무 변화 없었다)
  await page.getByRole("button", { name: /되돌리기/, exact: false }).first().click();
  await page.waitForTimeout(250);
  expect(await ink(page), "되돌리기 1번에 삭제한 레이어가 그림째 돌아온다").toBeGreaterThan(
    two * 0.9,
  );
  await expect(page.getByRole("button", { name: "레이어 삭제" })).toHaveCount(2);

  // 다시하기 = 다시 삭제
  await page.getByRole("button", { name: "다시 실행" }).click();
  await page.waitForTimeout(250);
  expect(await ink(page), "다시하기로 삭제가 재적용된다").toBeLessThan(two * 0.75);
});

/*
 * 히스토리 1커맨드 = 무비 로그 1항목(언두 커서 1:1 불변식).
 * 레이어 삭제를 히스토리에만 넣고 로그에 자리표시를 안 넣으면 커서가 한 칸 밀려,
 * 삭제를 되돌린 뒤 무비가 "마지막 획 하나 빠진" 상태로 재생된다.
 */
test("레이어 삭제를 되돌려도 무비가 현재 캔버스와 맞는다", async ({ page }) => {
  await page.goto("/draw?mode=sketch&backend=gl");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "색 1", exact: true }).click();
  await page.getByRole("button", { name: "마커", exact: true }).click();
  await page.getByLabel("브러시 굵기", { exact: true }).fill("24");

  await stroke(page, 0.3); // 레이어 1
  await page.getByRole("button", { name: /레이어/ }).first().click();
  await page.getByRole("button", { name: /새 레이어/ }).click();
  await page.waitForTimeout(150);
  await stroke(page, 0.5); // 레이어 2
  await stroke(page, 0.7); // 레이어 2

  await page.getByRole("button", { name: "레이어 삭제" }).first().click();
  await page.waitForTimeout(250);
  // 되돌리기 = 레이어 복귀. 이 시점 캔버스에는 세 획이 모두 있다.
  await page.getByRole("button", { name: "되돌리기" }).click();
  await page.waitForTimeout(300);

  await page.getByRole("button", { name: /무비/ }).click();
  await page.getByRole("button", { name: "4배속" }).click();
  await page.getByRole("button", { name: /재생/ }).click();
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll("button")).some((b) =>
        b.textContent?.includes("▶ 재생"),
      ),
    { timeout: 60000 },
  );
  const bands = await page.evaluate(() => {
    const cv = document.querySelector('[role="dialog"] canvas') as HTMLCanvasElement;
    const ctx = cv.getContext("2d")!;
    const out: Record<string, number> = {};
    for (const [name, yr] of [
      ["y30", 0.3],
      ["y50", 0.5],
      ["y70", 0.7],
    ] as const) {
      const d = ctx.getImageData(
        Math.round(cv.width * 0.25),
        Math.round(cv.height * yr) - 5,
        Math.round(cv.width * 0.4),
        11,
      ).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4)
        if (d[i + 3] > 200 && 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] < 200) n++;
      out[name] = n;
    }
    return out;
  });
  console.log("MOVIE-AFTER-LAYER-UNDO", JSON.stringify(bands));
  // 커서가 밀리면 마지막 획(y70)이 재생에서 빠진다
  expect(bands.y30, "첫 획").toBeGreaterThan(300);
  expect(bands.y50, "둘째 획").toBeGreaterThan(300);
  expect(bands.y70, "셋째 획(커서가 밀리면 사라진다)").toBeGreaterThan(300);
});
