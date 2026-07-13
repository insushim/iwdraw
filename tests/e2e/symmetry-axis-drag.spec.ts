import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

/*
 * 데칼코마니 대칭축 드래그(2026-07-13 사용자 요청).
 * 세로 대칭에서 축을 왼쪽으로 옮긴 뒤 획을 그으면, 거울 획이 "옮긴 축" 기준으로
 * 반사돼야 한다(중앙 기준이면 반사 위치가 달라진다).
 */
test("대칭축을 드래그로 옮기면 거울 획이 새 축 기준으로 반사된다", async ({ page }) => {
  await page.goto("/draw?mode=sketch&backend=gl");
  const canvas = page.getByLabel("그림 캔버스");
  await canvas.waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);

  await page.getByRole("button", { name: "좌우", exact: true }).click();
  await page.getByRole("button", { name: "마커", exact: true }).click();
  await page.getByLabel("브러시 굵기", { exact: true }).fill("20");

  const box = (await canvas.boundingBox())!;
  const X = (fx: number) => box.x + box.width * fx;
  const Y = (fy: number) => box.y + box.height * fy;

  // 축(중앙 0.5)을 잡아 0.35로 끌어옮긴다 — 핸들은 세로선 중앙(y=0.5)
  await page.mouse.move(X(0.5), Y(0.5));
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) await page.mouse.move(X(0.5 - 0.015 * k), Y(0.5));
  await page.mouse.up();
  await page.waitForTimeout(200);

  // 새 축(0.35) 왼쪽에 짧은 세로 획 — 거울은 축 오른쪽 대칭 위치(0.35+0.10=0.45 부근)
  await page.mouse.move(X(0.25), Y(0.25));
  await page.mouse.down();
  for (let k = 1; k <= 12; k++) await page.mouse.move(X(0.25), Y(0.25 + 0.01 * k));
  await page.mouse.up();
  await page.waitForTimeout(400);

  // 획이 있는 x 위치를 찾는다(가이드선/핸들은 표시 전용이라 레이어엔 없지만, 표시
  // 캔버스를 읽으므로 y=0.3 밴드만 스캔 — 핸들은 y=0.5라 안 걸린다)
  const cols = await page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const ctx = el.getContext("2d")!;
    const y = Math.round(el.height * 0.3);
    const d = ctx.getImageData(0, y - 3, el.width, 6).data;
    const hit: number[] = [];
    for (let x = 0; x < el.width; x++) {
      let dark = false;
      for (let yy = 0; yy < 6; yy++) if (d[(yy * el.width + x) * 4] < 120) dark = true;
      if (dark) hit.push(x / el.width);
    }
    // 연속 구간을 묶어 중심 반환
    const groups: number[][] = [];
    for (const h of hit) {
      const g = groups[groups.length - 1];
      if (g && h - g[g.length - 1] < 0.01) g.push(h);
      else groups.push([h]);
    }
    return groups.map((g) => g.reduce((a, b) => a + b, 0) / g.length);
  });
  console.log("SYMAXIS: 획 중심 x비율 =", cols.map((c) => c.toFixed(3)).join(", "));
  expect(cols.length, "원본+거울 2개 획").toBe(2);
  const axis = (cols[0] + cols[1]) / 2;
  // 옮긴 축(0.35) 기준으로 반사됐어야 한다 — 중앙(0.5) 기준이면 axis≈0.5로 나온다
  expect(axis, "두 획의 중점 = 실제 대칭축").toBeLessThan(0.40);
  expect(axis, "두 획의 중점 = 실제 대칭축").toBeGreaterThan(0.30);
});
