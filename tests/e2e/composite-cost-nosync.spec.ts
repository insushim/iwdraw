import { test, expect } from "@playwright/test";

test.use({
  launchOptions: { args: ["--enable-unsafe-swiftshader"] },
  deviceScaleFactor: 2,
  viewport: { width: 1366, height: 768 },
});
test.setTimeout(180_000);

/*
 * 회귀 가드(2026-07-23): "동기화 지점 없는 브러시"의 DPR 강등.
 * Canvas2D 명령은 비동기 큐잉이라 JS 측 합성 시간(performance.now 차)이 실제 래스터
 * 비용을 반영하지 못한다. paperGrain 등 동기화 지점이 있는 크레용은 강등이 발동했지만,
 * 에어브러시·글로우·무지개·글리터처럼 순수 drawImage만 쓰는 브러시는 EMA가 영영 임계를
 * 못 넘어 dpr2 백킹인 채 초당 2프레임(471ms)이었다(웨일북 실증상). 연속 합성 프레임
 * 간격을 보조 신호로 쓰는 수정의 회귀 테스트 — composite-cost.spec.ts(크레용)와 쌍.
 */
test("동기화 지점 없는 브러시(에어브러시)도 저사양·DPR2에서 강등된다", async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await page.goto("/draw?mode=sketch&backend=2d");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "에어브러시", exact: true }).click();
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

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
    for (let s = 0; s < 3; s++) {
      const y0 = 40 + s * 40;
      fire("pointerdown", 20, y0);
      for (let i = 1; i <= 40; i++) {
        fire("pointermove", 20 + (i / 40) * (rect.width - 40), y0 + Math.sin(i / 6) * 30);
        await wait(16);
      }
      fire("pointerup", rect.width - 20, y0);
      await wait(60);
    }
    run = false;
    const backing = { w: el.width, h: el.height };
    const sorted = frames.slice(4).sort((a, b) => a - b);
    const p = (q: number) => Math.round(sorted[Math.floor(sorted.length * q)] ?? 0);
    return { backing, frames: sorted.length, median: p(0.5), p90: p(0.9), p99: p(0.99) };
  });

  console.log("COMPOSITE-NOSYNC", JSON.stringify(r));
  expect(r.backing.w, "JS 시간에 안 잡히는 브러시도 백킹이 강등돼야 한다").toBeLessThanOrEqual(1536);
  expect(r.median, "획 중 프레임 간격 중앙값(ms)").toBeLessThan(60);
  expect(r.p90, "상위 10% 프레임 간격(ms)").toBeLessThan(90);
});
