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

/*
 * 글씨 글꼴 짝(2026-09-04). TextPalette 를 지연 로딩으로 돌리면서 한글 웹폰트 6종의
 * @font-face 도 그 청크로 따라갔다. 무비는 글씨 획을 drawTextOnCtx 로 **다시 그리므로**,
 * 재생 시점에 글꼴이 없으면 캔버스의 글씨와 무비의 글씨가 서로 다른 글꼴이 된다.
 * MovieModal 이 재생 직전에 글꼴을 확보하는지를 "두 캔버스의 글씨 잉크가 비슷한가"로 본다.
 *
 * ⚠️ "새로고침 복구 직후 바로 무비"는 스펙으로 못 만든다 — 복구는 래스터라 획 로그가 없고,
 *    무비에 재생할 것 자체가 없다(무비 레코더의 알려진 한계). 코드 쪽 방어는 남겨 둔다.
 */
test("무비 재생의 글씨가 캔버스의 글씨와 같은 글꼴로 그려진다", async ({ page }) => {
  await page.goto("/draw?mode=sketch");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);

  await page.getByRole("button", { name: "글씨 넣기" }).click();
  await page.getByLabel("넣을 글").fill("안녕");
  await page.getByRole("button", { name: "글씨체 연필" }).click();
  await page.getByRole("button", { name: "캔버스에 넣기" }).click();
  await page.waitForTimeout(900); // 글꼴 로드 + 프리뷰
  await page.getByRole("button", { name: "놓기 확인" }).click();
  await page.waitForTimeout(400);

  const inkOf = (sel: string) =>
    page.evaluate((s) => {
      const cv = document.querySelector(s) as HTMLCanvasElement;
      const ctx = cv.getContext("2d")!;
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        if (d[i + 3] > 200 && lum < 200) n++;
      }
      return n / (cv.width * cv.height);
    }, sel);

  const onCanvas = await inkOf('canvas[aria-label="그림 캔버스"]');
  expect(onCanvas, "캔버스에 글씨가 없다 = 앞 단계가 실패").toBeGreaterThan(0);

  await page.getByRole("button", { name: /무비/ }).click();
  await page.getByRole("button", { name: "4배속" }).click();
  await page.getByRole("button", { name: /재생/ }).click();
  await page.waitForFunction(
    () => Array.from(document.querySelectorAll("button")).some((b) => b.textContent?.includes("▶ 재생")),
    { timeout: 60000 },
  );
  const onMovie = await inkOf('[role="dialog"] canvas');
  const ratio = onMovie / onCanvas;
  console.log("MOVIE-TEXT-INK", { onCanvas, onMovie, ratio });
  expect(ratio, `무비의 글씨 잉크 비율이 캔버스와 크게 다르다(${ratio.toFixed(2)}) = 다른 글꼴로 그려졌을 가능성`).toBeGreaterThan(0.55);
  expect(ratio).toBeLessThan(1.8);
});
