import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

/*
 * 마커: 같은 색을 여러 번 덧칠해도 dab 실루엣(둥근 사각형 테두리)이 보이면 안 된다.
 * 팁의 셰이드 채널이 dab 가장자리에서 검게 죽으면(빈 텍셀 RGB=0) 획끼리의 darken(min)이
 * 그 어두운 테를 보존해 "클릭할 때마다 동그라미가 보인다"(2026-07-13 사용자 실측).
 * 겹쳐 칠한 영역의 명도 편차(표준편차)로 테두리 잔상을 잡는다.
 */
test("마커를 같은 색으로 덧칠해도 dab 테두리가 남지 않는다", async ({ page }) => {
  await page.goto("/draw?mode=sketch&backend=gl");
  const canvas = page.getByLabel("그림 캔버스");
  await canvas.waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);

  await page.getByRole("button", { name: "마커", exact: true }).click();
  await page.getByRole("button", { name: "색 11", exact: true }).click();
  await page.getByLabel("브러시 굵기", { exact: true }).fill("50");

  const box = (await canvas.boundingBox())!;
  // 같은 영역을 방향만 바꿔 5번 덧칠(아이들이 색칠하는 방식)
  for (let s = 0; s < 5; s++) {
    const y = box.y + box.height * (0.35 + s * 0.02);
    await page.mouse.move(box.x + box.width * 0.35, y);
    await page.mouse.down();
    for (let k = 1; k <= 20; k++)
      await page.mouse.move(box.x + box.width * (0.35 + 0.3 * (k / 20)), y + (s % 2 ? 4 : -4));
    await page.mouse.up();
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(500);

  const stat = await page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const ctx = el.getContext("2d")!;
    // 덧칠 영역 한복판(모든 획이 확실히 덮은 구간)만 — 실루엣 가장자리는 제외
    const x0 = Math.round(el.width * 0.42);
    const y0 = Math.round(el.height * 0.38);
    const d = ctx.getImageData(x0, y0, Math.round(el.width * 0.14), Math.round(el.height * 0.02)).data;
    const lum: number[] = [];
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 250) continue;
      lum.push(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    }
    const m = lum.reduce((a, b) => a + b, 0) / lum.length;
    const sd = Math.sqrt(lum.reduce((a, b) => a + (b - m) * (b - m), 0) / lum.length);
    return { mean: Math.round(m), sd: Math.round(sd * 10) / 10, n: lum.length, min: Math.round(Math.min(...lum)) };
  });

  console.log("마커 덧칠 영역", stat);
  expect(stat.n).toBeGreaterThan(500);
  // 같은 색 덧칠 = 균일해야 한다. dab 테두리가 남으면 편차가 커진다.
  expect(stat.sd).toBeLessThan(4);
  // 가장 어두운 픽셀도 평균에서 크게 벗어나지 않아야(테두리 = 국소 암부)
  expect(stat.mean - stat.min).toBeLessThan(14);
});
