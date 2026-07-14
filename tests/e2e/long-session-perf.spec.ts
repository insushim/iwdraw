import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader", "--js-flags=--expose-gc"] } });
test.setTimeout(300_000);

/*
 * 웨일북 렉 재현 하네스(2026-07-14 사용자 보고: "작업하다 보면 렉이 걸리고, 브라우저를
 * 껐다 켜면 괜찮아진다" = 세션이 길어질수록 나빠지는 누적형 = 누수/무한 증가).
 * 실제 수업처럼 긴 획(80점)을 수백 개 긋고 구간마다 ① JS 힙 ② 프레임 멈춤(롱태스크)
 * ③ 자동저장 소요를 잰다. 입력은 페이지 안에서 직접 PointerEvent를 쏴 빠르게 진행한다.
 */
const BLOCKS = 6;
const STROKES_PER_BLOCK = 40;

test("긴 세션에서 힙·멈춤이 계속 증가하지 않는다", async ({ page }) => {
  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 }); // 웨일북급 저사양

  await page.goto("/draw?mode=sketch&backend=gl");
  const canvas = page.getByLabel("그림 캔버스");
  await canvas.waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: process.env.PERF_BRUSH ?? "크레용", exact: true }).click();

  await page.evaluate(() => {
    const w = window as unknown as { __long: number[] };
    w.__long = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) w.__long.push(Math.round(e.duration));
    }).observe({ entryTypes: ["longtask"] });
  });

  const marks: { strokes: number; heapMB: number; longMax: number; longSum: number }[] = [];

  for (let b = 0; b < BLOCKS; b++) {
    const mark = await page.evaluate(
      async ([count, seed]: [number, number]) => {
        const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
        const r = el.getBoundingClientRect();
        const w = window as unknown as { __long: number[] };
        w.__long.length = 0;
        const fire = (type: string, x: number, y: number) =>
          el.dispatchEvent(
            new PointerEvent(type, {
              pointerId: 1,
              pointerType: "mouse",
              isPrimary: true,
              clientX: r.left + x,
              clientY: r.top + y,
              pressure: 0.5,
              buttons: type === "pointerup" ? 0 : 1,
              bubbles: true,
              cancelable: true,
            }),
          );
        const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));
        for (let s = 0; s < count; s++) {
          const k = (seed + s) % 7;
          const y0 = 30 + ((s * 37) % (r.height - 60));
          fire("pointerdown", 20, y0);
          for (let i = 1; i <= 80; i++) {
            // 실제 아이 획처럼 길고 구불구불하게(80점)
            const t = i / 80;
            fire(
              "pointermove",
              20 + t * (r.width - 40),
              y0 + Math.sin(t * 6 + k) * 40,
            );
          }
          fire("pointerup", r.width - 20, y0);
          await wait(16); // 프레임 진행
        }
        await wait(7000); // 자동저장(5초 디바운스 + max-wait) 통과
        const m = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
        const longs = w.__long.slice();
        return {
          heapMB: m ? Math.round(m.usedJSHeapSize / 1e6) : -1,
          longMax: longs.length ? Math.max(...longs) : 0,
          longSum: longs.reduce((a, x) => a + x, 0),
        };
      },
      [STROKES_PER_BLOCK, b] as [number, number],
    );
    marks.push({ strokes: (b + 1) * STROKES_PER_BLOCK, ...mark });
    console.log("PERF", JSON.stringify(marks[marks.length - 1]));
  }

  console.log("PERF-ALL", JSON.stringify(marks));
  const first = marks[0]; // 첫 구간은 워밍업(청크 로드·셰이더 컴파일)이라 제외
  const steady = marks.slice(1);
  const worstSum = Math.max(...steady.map((m) => m.longSum));
  const worstMax = Math.max(...steady.map((m) => m.longMax));
  const lastHeap = marks[marks.length - 1].heapMB;

  // ① 힙이 계속 불어나면 누수 — "브라우저를 껐다 켜야 낫는" 렉의 정체
  expect(lastHeap, "힙(MB)").toBeLessThan(first.heapMB * 1.6 + 60);
  // ② 프레임 멈춤 — 4배 스로틀(웨일북급)에서도 한 구간(40획)의 멈춤 총합이 이 선을 넘으면
  //    체감 렉. 개선 전 실측: 크레용 2400ms · 지우개 1300ms → 개선 후 100~460ms · 100~300ms
  //    (전 캔버스 리드백 제거 · 지우개/번짐 COW · 자동저장 비동기 인코딩 · 무비로그 캐시)
  expect(worstSum, "멈춤 총합(ms)").toBeLessThan(900);
  expect(worstMax, "최장 멈춤(ms)").toBeLessThan(120);
});
