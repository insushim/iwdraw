import { test, expect } from "@playwright/test";

/*
 * 되돌리기가 자동저장에 반영되는가 (2026-09-01 코드 점검에서 발견).
 * undo/redo·전체 지우기는 히스토리와 화면만 바꾸고 `scheduleAutoSave()`를 부르지 않았다 —
 * 획을 긋고 되돌린 뒤 그대로 두면 자동저장은 **되돌리기 전** 상태에 머물러, 새로고침 후
 * [이어 그리기]가 지운 획을 되살린다(아이 입장에선 "지웠는데 다시 나타남").
 */
test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });
test.setTimeout(120_000);

async function ink(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const { data } = el.getContext("2d")!.getImageData(0, 0, el.width, el.height);
    let n = 0;
    for (let i = 0; i < data.length; i += 4)
      if (data[i + 3] > 20 && (data[i] + data[i + 1] + data[i + 2]) / 3 < 200) n++;
    return +(n / (data.length / 4)).toFixed(4);
  });
}

async function stroke(page: import("@playwright/test").Page, yRatio: number) {
  await page.evaluate((yr) => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const r = el.getBoundingClientRect();
    const fire = (type: string, x: number, y: number) =>
      el.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true,
          clientX: r.left + x,
          clientY: r.top + y,
          pressure: 0.6,
          buttons: type === "pointerup" ? 0 : 1,
          bubbles: true,
          cancelable: true,
        }),
      );
    const y = r.height * yr;
    fire("pointerdown", r.width * 0.15, y);
    for (let i = 1; i <= 24; i++) fire("pointermove", r.width * (0.15 + 0.7 * (i / 24)), y);
    fire("pointerup", r.width * 0.85, y);
  }, yRatio);
  await page.waitForTimeout(250);
}

test("되돌리기 상태가 자동저장에 반영된다", async ({ page }) => {
  await page.goto("/draw?mode=sketch&backend=gl");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: "새로 시작" });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(400);

  await stroke(page, 0.3);
  const one = await ink(page);
  await stroke(page, 0.6);
  const two = await ink(page);
  expect(two, "두 번째 획이 더 진해야 한다").toBeGreaterThan(one);

  /* ⚠️ 되돌리기 **전에** 자동저장을 한 번 끝내 둔다 — 안 그러면 직전 획이 걸어 둔 예약이
   * 되돌리기 뒤에 발화해서 우연히 올바른 상태가 저장되고, 결함이 가려진다(실측: 수정 전
   * 코드로도 통과했다). 결함은 "마지막 저장이 끝난 뒤에 되돌린" 순간에만 드러난다. */
  await page.waitForTimeout(7000);

  await page.getByRole("button", { name: "되돌리기" }).click();
  await page.waitForTimeout(400);
  const undone = await ink(page);
  expect(Math.abs(undone - one), "되돌리기 후 = 획 1개 상태").toBeLessThan(0.0015);

  // 자동저장 max-wait(15초) 통과 — 되돌리기가 예약을 걸지 않으면 여기서 아무 일도 안 일어난다
  await page.waitForTimeout(17_000);

  await page.reload();
  await page.getByLabel("그림 캔버스").waitFor();
  const cont = page.getByRole("button", { name: "이어 그리기" });
  await cont.waitFor({ timeout: 10_000 });
  await cont.click();
  await page.waitForTimeout(1200);
  const restored = await ink(page);
  console.log("UNDO-AUTOSAVE", { one, two, undone, restored });
  expect(Math.abs(restored - undone), "복원본은 되돌린 상태여야 한다").toBeLessThan(0.0015);
});
