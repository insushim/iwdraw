import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

/*
 * 팜 리젝션(2026-07-14 사용자 요청 — 웨일북에서 아이들이 손을 대고 그린다).
 *  ① 펜으로 그리는 중 손바닥이 닿아도 획이 끊기거나 손바닥 자국이 남으면 안 된다.
 *  ② 펜을 안 쓰는 상태에서는 어떤 터치도 막지 않는다 — 접촉 면적이 커도 그려지고, 두 손가락
 *     확대도 그대로 된다(2026-07-14 실측 회귀: 접촉 면적 규칙이 웨일북의 보통 손가락까지
 *     손바닥으로 오판해 그리기·확대가 전멸했다. 그 규칙은 폐기).
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

test("펜을 쓴 직후 닿는 손은 무시된다(획 뒤 손바닥 자국 없음)", async ({ page }) => {
  await setup(page);
  await page.evaluate(async () => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const r = el.getBoundingClientRect();
    const ev = (type: string, x: number, y: number, o: { pointerId: number; pointerType: string }) =>
      el.dispatchEvent(
        new PointerEvent(type, {
          pointerId: o.pointerId,
          pointerType: o.pointerType,
          isPrimary: true,
          clientX: r.left + x,
          clientY: r.top + y,
          pressure: type === "pointerup" ? 0 : 0.7,
          width: 30,
          height: 30,
          buttons: type === "pointerup" ? 0 : 1,
          bubbles: true,
        }),
      );
    const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));
    const pen = { pointerId: 11, pointerType: "pen" };
    const hand = { pointerId: 12, pointerType: "touch" };
    // 펜으로 짧게 긋고 뗀다
    ev("pointerdown", 80, 60, pen);
    for (let i = 1; i <= 8; i++) {
      ev("pointermove", 80 + i * 15, 60, pen);
      await wait(8);
    }
    ev("pointerup", 200, 60, pen);
    // 뗀 직후(잠금 시간 내) 손이 캔버스 아래쪽에 닿는다 → 자국이 남으면 안 된다
    ev("pointerdown", r.width * 0.5, r.height * 0.8, hand);
    for (let i = 1; i <= 10; i++) {
      ev("pointermove", r.width * 0.5 + i * 12, r.height * 0.8, hand);
      await wait(8);
    }
    ev("pointerup", r.width * 0.5 + 120, r.height * 0.8, hand);
    await wait(400);
  });

  const palmInk = await page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const d = el
      .getContext("2d")!
      .getImageData(0, Math.round(el.height * 0.7), el.width, Math.round(el.height * 0.25)).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 200) n++;
    return n;
  });
  expect(palmInk).toBe(0);
});

test("펜이 없으면 접촉 면적이 큰 터치도 그대로 그려진다(웨일북 회귀)", async ({ page }) => {
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
          width: 80, // 웨일북은 보통 손가락도 이만큼 크게 보고한다
          height: 70,
          buttons: type === "pointerup" ? 0 : 1,
          bubbles: true,
        }),
      );
    const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));
    ev("pointerdown", 100, 100);
    for (let i = 1; i <= 15; i++) {
      ev("pointermove", 100 + i * 20, 100 + i * 5);
      await wait(8);
    }
    ev("pointerup", 400, 180);
    await wait(400);
  });
  expect(await ink(page)).toBeGreaterThan(before + 100);
});

test("펜이 없으면 두 손가락 확대가 동작한다(핀치 회귀)", async ({ page }) => {
  await setup(page);
  const scale = await page.evaluate(async () => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const r = el.getBoundingClientRect();
    const ev = (type: string, id: number, x: number, y: number) =>
      el.dispatchEvent(
        new PointerEvent(type, {
          pointerId: id,
          pointerType: "touch",
          isPrimary: id === 21,
          clientX: r.left + x,
          clientY: r.top + y,
          pressure: type === "pointerup" ? 0 : 0.5,
          width: 60,
          height: 55,
          buttons: type === "pointerup" ? 0 : 1,
          bubbles: true,
        }),
      );
    const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));
    const cx = r.width / 2;
    const cy = r.height / 2;
    ev("pointerdown", 21, cx - 40, cy);
    ev("pointerdown", 22, cx + 40, cy);
    await wait(16);
    for (let i = 1; i <= 12; i++) {
      const d = 40 + i * 12;
      ev("pointermove", 21, cx - d, cy);
      ev("pointermove", 22, cx + d, cy);
      await wait(16);
    }
    ev("pointerup", 21, cx - 184, cy);
    ev("pointerup", 22, cx + 184, cy);
    await wait(200);
    return (window as unknown as { __artonEngine: { view: { scale: number } } }).__artonEngine.view
      .scale;
  });
  expect(scale).toBeGreaterThan(1.3);
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
