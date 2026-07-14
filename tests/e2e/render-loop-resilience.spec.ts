import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });
test.setTimeout(90_000);

/*
 * "한참 쓰다 보면 선이 아예 안 나온다"(웨일북 2026-07-14).
 * 렌더 루프 안에서 예외가 한 번이라도 나면 rAF 재예약에 도달하지 못해 루프가 영구 정지했다
 * → 화면이 굳고 그려도 아무것도 안 보인다(브라우저 재시작해야 회복 = 사용자 증상).
 * 합성 도중 예외를 강제로 주입하고, 그 뒤에도 계속 그려지는지 실측한다.
 */
test("합성 중 예외가 나도 렌더 루프가 죽지 않는다", async ({ page }) => {
  await page.goto("/draw?mode=sketch&backend=gl");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "마커", exact: true }).click();
  await page.getByLabel("브러시 굵기", { exact: true }).fill("30");

  /* 화면 상태: 흰 종이가 보이는지(=합성이 살아 있는지) + 잉크 픽셀 수.
   * 알파만 보면 안 된다 — 루프가 죽으면 표시 캔버스가 clear된 채 남아 "투명"이 되는데,
   * 투명(r=0)을 검은 잉크로 세면 오히려 잉크가 폭증한 것처럼 보인다(오판). */
  const state = async (): Promise<{ ink: number; whitePct: number }> =>
    page.evaluate(() => {
      const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
      const d = el.getContext("2d")!.getImageData(0, 0, el.width, el.height).data;
      let ink = 0;
      let white = 0;
      let n = 0;
      for (let i = 0; i < d.length; i += 16) {
        n++;
        const opaque = d[i + 3] > 250;
        if (opaque && d[i] > 200) white++;
        else if (opaque && d[i] < 200) ink++;
      }
      return { ink, whitePct: white / n };
    });
  const stroke = async (y: number) => {
    const box = (await page.getByLabel("그림 캔버스").boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * y);
    await page.mouse.down();
    for (let k = 1; k <= 12; k++)
      await page.mouse.move(box.x + box.width * (0.15 + 0.7 * (k / 12)), box.y + box.height * y);
    await page.mouse.up();
    await page.waitForTimeout(250);
  };

  await stroke(0.3);
  const base = await state();
  expect(base.ink).toBeGreaterThan(100);
  expect(base.whitePct).toBeGreaterThan(0.5);

  // 표시 캔버스 합성에서 5프레임 동안 예외를 던진다(일시적 GPU/메모리 오류 흉내)
  await page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const ctx = el.getContext("2d")!;
    let left = 5;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orig = (ctx as any).drawImage.bind(ctx);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ctx as any).drawImage = (...a: unknown[]) => {
      if (left-- > 0) throw new Error("합성 실패(주입)");
      return orig(...a);
    };
  });
  await page.waitForTimeout(400);

  // 예외가 지나간 뒤에도 새 획이 그려져야 한다
  await stroke(0.6);
  const after = await state();
  console.log("RESILIENCE", JSON.stringify({ base, after }));
  // 루프가 죽으면 표시 캔버스가 clear된 채 굳는다 → 흰 종이가 사라진다
  expect(after.whitePct, "화면이 살아 있어야 한다(흰 종이가 보임)").toBeGreaterThan(0.5);
  expect(after.ink, "예외 이후에도 새 획이 그려져야 한다").toBeGreaterThan(base.ink + 100);
});
