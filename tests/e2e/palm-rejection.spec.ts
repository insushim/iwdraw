import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

/*
 * 팜 리젝션(2026-07-14 사용자 요청 — 웨일북에서 아이들이 손을 대고 그린다).
 *  ① 펜으로 그리는 중 손바닥이 닿아도 획이 끊기거나 손바닥 자국이 남으면 안 된다.
 *  ② 접촉 면적이 큰 터치(손바닥)는 혼자 닿아도 그려지면 안 된다.
 *  ③ 펜을 쓰지 않는 아이의 보통 손가락 터치는 지금처럼 그려져야 한다(과잉 차단 금지).
 */
async function setup(page: import("@playwright/test").Page) {
  await page.goto("/draw?mode=sketch&backend=gl");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "마커", exact: true }).click();
  await page.getByRole("button", { name: "색 1", exact: true }).click();
  await page.getByLabel("브러시 굵기", { exact: true }).fill("30");
}

/** 캔버스에 칠해진 픽셀 수 */
async function ink(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const d = el.getContext("2d")!.getImageData(0, 0, el.width, el.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 16) if (d[i] < 200) n++;
    return n;
  });
}

test("펜으로 그리는 중 손바닥이 닿아도 획이 끊기지 않는다", async ({ page }) => {
  await setup(page);
  await page.evaluate(async () => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const r = el.getBoundingClientRect();
    const ev = (
      type: string,
      x: number,
      y: number,
      o: { pointerId: number; pointerType: string; width?: number; height?: number },
    ) =>
      el.dispatchEvent(
        new PointerEvent(type, {
          pointerId: o.pointerId,
          pointerType: o.pointerType,
          isPrimary: o.pointerId === 1,
          clientX: r.left + x,
          clientY: r.top + y,
          pressure: type === "pointerup" ? 0 : 0.6,
          width: o.width ?? 1,
          height: o.height ?? 1,
          buttons: type === "pointerup" ? 0 : 1,
          bubbles: true,
          cancelable: true,
        }),
      );
    const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));
    const pen = { pointerId: 1, pointerType: "pen" };
    const palm = { pointerId: 2, pointerType: "touch", width: 70, height: 60 };

    ev("pointerdown", 60, r.height * 0.4, pen);
    for (let i = 1; i <= 20; i++) {
      ev("pointermove", 60 + i * ((r.width - 120) / 40), r.height * 0.4, pen);
      if (i === 5) {
        // 획 도중 손바닥이 닿았다 떨어진다
        ev("pointerdown", r.width * 0.5, r.height * 0.75, palm);
        ev("pointermove", r.width * 0.5 + 30, r.height * 0.75, palm);
      }
      if (i === 12) ev("pointerup", r.width * 0.5 + 30, r.height * 0.75, palm);
      await wait(8);
    }
    for (let i = 21; i <= 40; i++) {
      ev("pointermove", 60 + i * ((r.width - 120) / 40), r.height * 0.4, pen);
      await wait(8);
    }
    ev("pointerup", r.width - 60, r.height * 0.4, pen);
    await wait(400);
  });

  const stat = await page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const ctx = el.getContext("2d")!;
    // 펜 획이 지나간 띠(가로) — 전 구간이 이어져 있어야 한다(중간에 취소됐으면 뒷부분이 빈다)
    const y = Math.round(el.height * 0.4);
    const band = ctx.getImageData(0, y - 10, el.width, 20).data;
    const cols = new Set<number>();
    for (let x = 0; x < el.width; x++) {
      for (let dy = 0; dy < 20; dy++) {
        if (band[(dy * el.width + x) * 4] < 200) {
          cols.add(x);
          break;
        }
      }
    }
    // 손바닥이 닿은 자리(아래쪽)에 자국이 남았는지
    const palmArea = ctx.getImageData(
      Math.round(el.width * 0.4),
      Math.round(el.height * 0.7),
      Math.round(el.width * 0.25),
      Math.round(el.height * 0.12),
    ).data;
    let palmInk = 0;
    for (let i = 0; i < palmArea.length; i += 4) if (palmArea[i] < 200) palmInk++;
    return { penCols: cols.size, palmInk, width: el.width };
  });

  console.log("PALM", JSON.stringify(stat));
  // 펜 획이 캔버스 폭의 대부분을 지나간다 = 손바닥 때문에 중간에 취소되지 않았다
  expect(stat.penCols).toBeGreaterThan(stat.width * 0.6);
  // 손바닥 자국은 없어야 한다
  expect(stat.palmInk).toBe(0);
});

test("손바닥(넓은 접촉)만 닿으면 아무것도 그려지지 않는다", async ({ page }) => {
  await setup(page);
  const before = await ink(page);
  await page.evaluate(async () => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const r = el.getBoundingClientRect();
    const ev = (type: string, x: number, y: number) =>
      el.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 3,
          pointerType: "touch",
          isPrimary: true,
          clientX: r.left + x,
          clientY: r.top + y,
          pressure: 0.7,
          width: 80,
          height: 70,
          buttons: type === "pointerup" ? 0 : 1,
          bubbles: true,
        }),
      );
    ev("pointerdown", 100, 100);
    for (let i = 1; i <= 15; i++) ev("pointermove", 100 + i * 20, 100 + i * 5);
    ev("pointerup", 400, 180);
    await new Promise((res) => setTimeout(res, 400));
  });
  expect(await ink(page)).toBe(before);
});

test("보통 손가락 터치는 그대로 그려진다(과잉 차단 금지)", async ({ page }) => {
  await setup(page);
  const before = await ink(page);
  await page.evaluate(async () => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const r = el.getBoundingClientRect();
    const ev = (type: string, x: number, y: number) =>
      el.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 4,
          pointerType: "touch",
          isPrimary: true,
          clientX: r.left + x,
          clientY: r.top + y,
          pressure: 0.7,
          width: 24, // 아이 손가락
          height: 26,
          buttons: type === "pointerup" ? 0 : 1,
          bubbles: true,
        }),
      );
    const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));
    ev("pointerdown", 100, 120);
    for (let i = 1; i <= 15; i++) {
      ev("pointermove", 100 + i * 25, 120 + i * 6);
      await wait(8);
    }
    ev("pointerup", 475, 210);
    await wait(400);
  });
  expect(await ink(page)).toBeGreaterThan(before + 100);
});
