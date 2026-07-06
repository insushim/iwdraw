import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

/*
 * 유화 굵기별 색 일관성 회귀 테스트.
 * <40px는 bristle-bold LOD, ≥40px는 fine bristle(AI 맵) — 두 팁의 평균 셰이드가
 * 어긋나면 굵기 슬라이더만 움직여도 색이 변한다(2026-07-06 사용자 실측: R 254 vs 220).
 * 같은 노랑을 4가지 굵기로 칠하고 획 내부 중앙값 RGB의 채널별 편차를 단언한다.
 */
test("유화 굵기(LOD 경계)에 따라 색이 달라지지 않는다", async ({ page }) => {
  await page.goto("/draw?mode=oil&backend=gl");
  const canvas = page.getByLabel("그림 캔버스");
  await canvas.waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);

  await page.getByRole("button", { name: "유화붓", exact: true }).click();
  await page.getByRole("button", { name: "색 8", exact: true }).click(); // 노랑 255,200,74

  const box = (await canvas.boundingBox())!;
  const sizeSlider = page.getByLabel("브러시 굵기");
  // 15→22px(bold), 24→36px(bold), 30→45px(fine), 60→90px(fine)
  const cases: Array<[number, number]> = [
    [15, 0.15],
    [24, 0.35],
    [30, 0.55],
    [60, 0.8],
  ];
  for (const [sz, fx] of cases) {
    await sizeSlider.fill(String(sz));
    const x = box.x + box.width * fx;
    await page.mouse.move(x, box.y + box.height * 0.15);
    await page.mouse.down();
    for (let k = 1; k <= 30; k++)
      await page.mouse.move(x, box.y + box.height * (0.15 + 0.6 * (k / 30)));
    await page.mouse.up();
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(500);

  const medians = await page.evaluate((fxs: number[]) => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const ctx = el.getContext("2d")!;
    return fxs.map((fx) => {
      const cx = Math.round(el.width * fx);
      // 획 중앙 세로 구간에서 넓게 샘플 → 채널별 중앙값(붓결 줄무늬·종이결 무시한 대표색)
      const rs: number[] = [], gs: number[] = [], bs: number[] = [];
      for (let fy = 0.25; fy <= 0.65; fy += 0.01) {
        const y = Math.round(el.height * fy);
        const d = ctx.getImageData(cx - 3, y, 7, 1).data;
        for (let i = 0; i < 7; i++) {
          rs.push(d[i * 4]); gs.push(d[i * 4 + 1]); bs.push(d[i * 4 + 2]);
        }
      }
      const med = (a: number[]) => a.sort((p, q) => p - q)[Math.floor(a.length / 2)];
      return [med(rs), med(gs), med(bs)] as const;
    });
  }, cases.map((c) => c[1]));

  console.log("OILCOLOR:", cases.map(([sz], i) => `굵기${sz}=rgb(${medians[i].join(",")})`).join("  "));
  // 채널별 최대-최소 편차 — 버그 시 R 편차 34, 정상 수렴 후 ≤7(SwiftShader 실측 여유 +5)
  for (let ch = 0; ch < 3; ch++) {
    const vals = medians.map((m) => m[ch]);
    expect(Math.max(...vals) - Math.min(...vals), `채널 ${"RGB"[ch]} 편차`).toBeLessThanOrEqual(12);
  }
});
