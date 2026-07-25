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
/* rate 20 = "아주 느린 기기"에서도 강등이 되는지(추가 커버리지).
 *
 * ⚠️ 정직하게 적어 둔다: 이 케이스는 "고정 1.2초 창" 사각지대를 **재현하지 못한다**.
 * rate 20에서도 rAF gap 중앙값이 174ms라 3개가 1.2초 안에 들어가서, 수정 전 코드로
 * 되돌려도 통과한다(2026-07-25 실측). CDP 스로틀은 JS만 늦추고 래스터는 안 늦추기 때문.
 * 사각지대는 gap ≥ 600ms에서만 생기고, 그건 산술적 사실이다 — 3개의 최소 간격이 2×gap
 * 이므로 2×gap ≥ 1200ms면 창 안에 절대 못 들어온다. 실제로 개발 머신 부하가 겹쳐 gap
 * 중앙값이 778ms가 된 실행에서 백킹이 3072인 채 획 3개가 끝나는 걸 관측했고, 그래서
 * 창을 gap 크기에 비례시켰다(ArtEngine.trackLagGap). */
for (const rate of [4, 20]) {
test(`동기화 지점 없는 브러시(에어브러시)도 저사양(CPU ${rate}배)·DPR2에서 강등된다`, async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await page.goto("/draw?mode=sketch&backend=2d");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "에어브러시", exact: true }).click();
  await cdp.send("Emulation.setCPUThrottlingRate", { rate });

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
    return { backing, frames: sorted.length, median: p(0.5), p75: p(0.75), p90: p(0.9), p99: p(0.99), slowFrac: +(sorted.filter((v) => v > 90).length / sorted.length).toFixed(3) };
  });

  console.log("COMPOSITE-NOSYNC", JSON.stringify(r));
  expect(r.backing.w, "JS 시간에 안 잡히는 브러시도 백킹이 강등돼야 한다").toBeLessThanOrEqual(1536);
  expect(r.median, "획 중 프레임 간격 중앙값(ms)").toBeLessThan(rate * 25);
  /* ⚠️ p90이 아니라 p75다. 셋을 갈라야 하는데 p90으로는 못 가른다(2026-07-25 실측):
   *     정상(강등 O)      median 21 · p75 22  · p90 27  · slowFrac 0.05
   *     강등 실패(버그)   median 480 · p75 521 · p90 539 · slowFrac 0.51  ← backing 3072
   *     개발 머신 부하    median 21~25 · p90 807~981                      ← backing 1536
   *   부하는 "소수 프레임만 1초씩" 튀어 p90을 강등 실패보다 더 나쁘게 만든다(코드를 전부
   *   stash한 기준 코드도 p90 807로 실패했다). 반면 강등 실패의 실제 증상은 "전 프레임이
   *   480ms"라 p75·median에 그대로 드러난다. 그래서 상위 꼬리 대신 p75를 본다. */
  expect(r.p75, "프레임 간격 상위 25%(ms)").toBeLessThan(rate * 40);
});
}
