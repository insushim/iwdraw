import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });
test.setTimeout(120_000);

/*
 * "한참 쓰다 보면 어느 순간 선이 아예 안 나온다"(2026-07-14 웨일북 실사용).
 * 저사양 기기는 메모리 압박이 오면 크롬이 WebGL 컨텍스트를 강제로 뺏는다(context lost).
 * 우리 엔진은 1회 재생성 → 재로스면 Canvas2D 핫스왑으로 살아남아야 한다.
 * 여기서 컨텍스트를 강제로 잃게 만들고, 그 뒤에도 획이 그려지는지 실측한다.
 */
async function ink(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const d = el.getContext("2d")!.getImageData(0, 0, el.width, el.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 16) if (d[i] < 200) n++;
    return n;
  });
}

async function stroke(page: import("@playwright/test").Page, y: number) {
  const box = (await page.getByLabel("그림 캔버스").boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * y);
  await page.mouse.down();
  for (let k = 1; k <= 12; k++)
    await page.mouse.move(box.x + box.width * (0.15 + 0.7 * (k / 12)), box.y + box.height * y);
  await page.mouse.up();
  await page.waitForTimeout(250);
}

test("GPU 컨텍스트를 잃어도 계속 그려진다(2번 잃으면 Canvas2D로 살아남음)", async ({ page }) => {
  // 엔진이 만드는 webgl2 컨텍스트를 전부 붙잡아 둔다 — 강제로 잃게 만들기 위해
  await page.addInitScript(() => {
    const w = window as unknown as { __gl: WebGL2RenderingContext[] };
    w.__gl = [];
    const orig = HTMLCanvasElement.prototype.getContext;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, t: string, ...r: unknown[]): any {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = (orig as any).call(this, t, ...r);
      if (t === "webgl2" && ctx) w.__gl.push(ctx);
      return ctx;
    };
  });

  await page.goto("/draw?mode=sketch&backend=gl");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "마커", exact: true }).click();
  await page.getByLabel("브러시 굵기", { exact: true }).fill("30");

  await stroke(page, 0.25);
  const afterFirst = await ink(page);
  expect(afterFirst, "평소엔 그려진다").toBeGreaterThan(100);

  const loseAll = () =>
    page.evaluate(() => {
      const w = window as unknown as { __gl: WebGL2RenderingContext[] };
      let n = 0;
      for (const gl of w.__gl) {
        const ext = gl.getExtension("WEBGL_lose_context");
        if (ext && !gl.isContextLost()) {
          ext.loseContext();
          n++;
        }
      }
      return n;
    });

  // 1차 로스 → 엔진이 GL을 다시 만든다
  expect(await loseAll()).toBeGreaterThan(0);
  await page.waitForTimeout(800);
  await stroke(page, 0.45);
  const afterLoss1 = await ink(page);
  console.log("LOSS1", { afterFirst, afterLoss1 });
  expect(afterLoss1, "컨텍스트 1회 로스 후에도 새 획이 그려져야 한다").toBeGreaterThan(afterFirst + 100);

  // 2차 로스 → Canvas2D 핫스왑
  await loseAll();
  await page.waitForTimeout(800);
  await stroke(page, 0.65);
  const afterLoss2 = await ink(page);
  console.log("LOSS2", { afterLoss1, afterLoss2 });
  expect(afterLoss2, "2회 로스(=Canvas2D 폴백) 후에도 새 획이 그려져야 한다").toBeGreaterThan(
    afterLoss1 + 100,
  );

  // 그리고 이전 획들이 지워지지 않아야 한다(레이어는 2D 캔버스라 살아있어야 함)
  const rows = await page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const ctx = el.getContext("2d")!;
    const has = (fy: number) => {
      const y = Math.round(el.height * fy);
      const d = ctx.getImageData(0, y - 12, el.width, 24).data;
      for (let i = 0; i < d.length; i += 4) if (d[i] < 200) return true;
      return false;
    };
    return { top: has(0.25), mid: has(0.45), bot: has(0.65) };
  });
  console.log("ROWS", JSON.stringify(rows));
  expect(rows, "로스 전에 그린 획이 남아 있어야 한다").toEqual({ top: true, mid: true, bot: true });
});
