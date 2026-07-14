import { test } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });
test.setTimeout(180_000);

/*
 * 진단: 재마운트(선따기·사진 가져오기·방향 전환)를 반복하면 캔버스 백킹 스토어가 얼마나 남는가?
 * 레이어 캔버스는 1536×1152×4B ≈ 7MB. LayerStack.destroy()가 배열만 비우면 GC 전까지
 * RAM/GPU에 그대로 남는다 → 저사양 웨일북(4GB)에서 누적 → 렉(브라우저 재시작하면 회복).
 * GC를 강제한 뒤 살아있는 캔버스의 총 픽셀 바이트를 잰다.
 */
test("재마운트 반복 후 살아있는 캔버스 메모리", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __cv: WeakRef<HTMLCanvasElement>[] };
    w.__cv = [];
    const orig = document.createElement.bind(document);
    document.createElement = ((tag: string, ...rest: unknown[]) => {
      const el = orig(tag as "canvas", ...(rest as []));
      if (tag === "canvas") w.__cv.push(new WeakRef(el as HTMLCanvasElement));
      return el;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
  });

  const cdp = await page.context().newCDPSession(page);
  await page.goto("/draw?mode=sketch&backend=gl");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);

  const stroke = async () => {
    const box = (await page.getByLabel("그림 캔버스").boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.4);
    await page.mouse.down();
    for (let k = 1; k <= 10; k++)
      await page.mouse.move(box.x + box.width * (0.2 + 0.5 * (k / 10)), box.y + box.height * 0.5);
    await page.mouse.up();
    await page.waitForTimeout(120);
  };

  const measure = async (tag: string) => {
    await cdp.send("HeapProfiler.collectGarbage");
    await page.waitForTimeout(300);
    const m = await page.evaluate(() => {
      const w = window as unknown as { __cv: WeakRef<HTMLCanvasElement>[] };
      let alive = 0;
      let bytes = 0;
      let big = 0;
      for (const ref of w.__cv) {
        const c = ref.deref();
        if (!c) continue;
        alive++;
        const b = c.width * c.height * 4;
        bytes += b;
        if (b > 1_000_000) big++;
      }
      return { created: w.__cv.length, alive, mb: Math.round(bytes / 1e5) / 10, big };
    });
    console.log("MEM", tag, JSON.stringify(m));
    return m;
  };

  await stroke();
  await measure("초기");

  // 방향 전환 = 엔진 재마운트(선따기·사진 가져오기와 같은 경로)
  for (let i = 1; i <= 6; i++) {
    await page.getByRole("button", { name: "캔버스 방향 바꾸기" }).click();
    await page.getByLabel("그림 캔버스").waitFor();
    await page.waitForTimeout(400);
    await stroke();
    if (i % 2 === 0) await measure(`재마운트×${i}`);
  }
});
