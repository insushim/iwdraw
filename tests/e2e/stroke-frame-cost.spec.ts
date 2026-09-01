import { test, expect } from "@playwright/test";

/*
 * 웨일북(저사양) 단독 그리기 렉 계측 하네스 — 2026-09-01 사용자 보고
 * "혼자 그려도 그리다 보면 렉이 걸린다".
 *
 * DPR 강등이 이미 끝난 상태(백킹 1)에서도 **획 중 프레임 간격**이 얼마나 되는지 잰다.
 * 렉 판정은 사용자 체감과 같은 축(프레임 간격)으로 — JS 합성 시간은 Canvas2D 비동기
 * 큐잉 때문에 백프레셔를 못 본다(2026-07-23 실측).
 *
 * 게이트가 아니라 **계측**이 목적이라 수치는 콘솔로 뽑고 느슨한 상한만 단언한다.
 */
test.use({
  launchOptions: { args: ["--enable-unsafe-swiftshader"] },
  deviceScaleFactor: 1,
  viewport: { width: 1366, height: 768 },
});
test.setTimeout(180_000);

const RATE = Number(process.env.STROKE_RATE ?? 6);

for (const backend of (process.env.STROKE_BACKENDS ?? "gl,2d").split(",")) {
  test(`획 중 프레임 간격 — ${backend} · ${process.env.STROKE_BRUSH ?? "연필"} · CPU ${RATE}배`, async ({ page }) => {
    const cdp = await page.context().newCDPSession(page);
    await page.goto(`/draw?mode=sketch&backend=${backend}`);
    await page.getByLabel("그림 캔버스").waitFor();
    const fresh = page.getByRole("button", { name: /새로 시작/ });
    if (await fresh.isVisible().catch(() => false)) await fresh.click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: process.env.STROKE_BRUSH ?? "연필", exact: true }).click();
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: RATE });

    const r = await page.evaluate(async () => {
      const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
      const rect = el.getBoundingClientRect();
      const frames: number[] = [];
      let last = performance.now();
      let run = true;
      const tick = () => {
        const now = performance.now();
        frames.push(now - last);
        last = now;
        if (run) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      const fire = (type: string, x: number, y: number) =>
        el.dispatchEvent(
          new PointerEvent(type, {
            pointerId: 1,
            pointerType: "touch",
            isPrimary: true,
            clientX: rect.left + x,
            clientY: rect.top + y,
            pressure: 0.6,
            buttons: type === "pointerup" ? 0 : 1,
            bubbles: true,
            cancelable: true,
          }),
        );
      const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));
      await wait(500);
      frames.length = 0;
      // 실제 아이 획처럼 — 짧은 구간을 여러 번(획당 40점, 8획)
      for (let s = 0; s < 8; s++) {
        const y0 = 40 + s * 30;
        fire("pointerdown", 40, y0);
        for (let i = 1; i <= 40; i++) {
          fire("pointermove", 40 + (i / 40) * (rect.width - 80), y0 + Math.sin(i / 5) * 20);
          await wait(8);
        }
        fire("pointerup", rect.width - 40, y0);
        await wait(50);
      }
      run = false;
      const eng = (window as unknown as { __artonEngine?: { cmDpr?: number } }).__artonEngine;
      const sorted = frames.slice().sort((a, b) => a - b);
      const q = (p: number) => Math.round(sorted[Math.floor(sorted.length * p)] ?? 0);
      const backingW = (
        document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement
      ).width;
      void eng;
      return {
        n: frames.length,
        median: q(0.5),
        p75: q(0.75),
        p90: q(0.9),
        max: Math.round(sorted[sorted.length - 1] ?? 0),
        backingW,
      };
    });
    console.log("STROKE-COST", JSON.stringify({ backend, brush: process.env.STROKE_BRUSH ?? "연필", rate: RATE, ...r }));
    expect(r.n, "프레임 표본").toBeGreaterThan(20);
  });
}
