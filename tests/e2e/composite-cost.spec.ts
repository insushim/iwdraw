import { test, expect } from "@playwright/test";

test.use({
  launchOptions: { args: ["--enable-unsafe-swiftshader"] },
  deviceScaleFactor: 2, // 웨일북: DPR 2 → 표시 캔버스 백킹 4배
  viewport: { width: 1366, height: 768 },
});
test.setTimeout(180_000);

/*
 * 웨일북 렉의 유력 원인 실측(2026-07-14): 표시 캔버스 DPR 백킹(커밋 465806d) 이후
 * 매 프레임 합성이 백킹 해상도(=논리×dpr²)에서 clear + 레이어 blit + 흰 배경 fill +
 * 종이결 multiply를 전부 수행한다. 저사양 GPU에서 프레임당 수십 ms.
 * 획을 긋는 동안의 평균 프레임 간격(=렉 체감)을 잰다. 낮을수록 좋다.
 */
test("저사양(CPU 4배 스로틀)·DPR2에서 획 중 프레임 비용", async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await page.goto("/draw?mode=sketch&backend=2d");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "크레용", exact: true }).click();
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

  console.log("COMPOSITE", JSON.stringify(r));
  /* 개선 전(DPR2 백킹 고정): 백킹 3072×2304 · 프레임 간격 중앙값 471ms(초당 2프레임).
   * 개선 후(느리면 백킹 1로 자동 강등): 백킹 1536×1152 · 중앙값 29ms.
   * ※ 이 하네스는 소프트웨어 GPU(SwiftShader)+CPU 4배 스로틀이라 실제 웨일북보다 가혹하다. */
  expect(r.backing.w, "느린 기기에서 표시 백킹이 논리 해상도로 강등돼야 한다").toBeLessThanOrEqual(
    1536,
  );
  expect(r.median, "획 중 프레임 간격 중앙값(ms)").toBeLessThan(60);
  expect(r.p90, "상위 10% 프레임 간격(ms)").toBeLessThan(90);
});
