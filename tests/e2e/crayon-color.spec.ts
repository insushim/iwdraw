import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

/*
 * 크레용 색 정확도 회귀 테스트.
 * 팁의 셰이드 채널(RGB)은 알파 0 픽셀에서 0(검정)이라, LINEAR·밉맵 필터가 이웃과 섞으면
 * 셰이더의 f(=t.r)가 0쪽으로 끌려 col*f가 검게 죽는다. 성긴 입자 팁(rough=크레용)은
 * 텍셀 대부분이 알파 0 → 밝은 노랑이 올리브빛으로 탁해졌다(2026-07-13 사용자 실측).
 * 팔레트 노랑(255,200,74)으로 그은 획의 평균색이 팔레트 색에서 크게 벗어나지 않아야 한다.
 */
test("크레용 획의 색이 고른 팔레트 색과 일치한다", async ({ page }) => {
  await page.goto("/draw?mode=sketch&backend=gl");
  const canvas = page.getByLabel("그림 캔버스");
  await canvas.waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);

  await page.getByRole("button", { name: "크레용", exact: true }).click();
  await page.getByRole("button", { name: "색 8", exact: true }).click(); // 노랑 255,200,74
  await page.getByLabel("브러시 굵기", { exact: true }).fill("28");

  const box = (await canvas.boundingBox())!;
  const x = box.x + box.width * 0.5;
  await page.mouse.move(x, box.y + box.height * 0.2);
  await page.mouse.down();
  for (let k = 1; k <= 30; k++)
    await page.mouse.move(x, box.y + box.height * (0.2 + 0.6 * (k / 30)));
  await page.mouse.up();
  await page.waitForTimeout(600);

  const mean = await page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const ctx = el.getContext("2d")!;
    const cx = Math.round(el.width * 0.5);
    let r = 0, g = 0, b = 0, n = 0;
    for (let fy = 0.3; fy <= 0.7; fy += 0.01) {
      const y = Math.round(el.height * fy);
      const d = ctx.getImageData(cx - 40, y, 80, 1).data;
      for (let i = 0; i < 80; i++) {
        const R = d[i * 4], G = d[i * 4 + 1], B = d[i * 4 + 2];
        // 획 내부만: 종이(거의 흰색)와 완전 투명 제외
        if (B < 205 && R > 60) { r += R; g += G; b += B; n++; }
      }
    }
    return { rgb: [Math.round(r / n), Math.round(g / n), Math.round(b / n)], n };
  });

  console.log("크레용 평균색", mean.rgb, "픽셀", mean.n);
  expect(mean.n).toBeGreaterThan(500);
  // 팔레트 노랑(255,200,74). 종이 결·가장자리 폴오프로 흰색이 섞여 밝아지는 것은 정상이지만
  // (B가 오른다), 검정이 섞이면 R·G가 먼저 무너진다.
  // 수정 전 실측 [217,189,125] → 수정 후 [255,219,136] (획 내부 픽셀은 255,212,114).
  expect(mean.rgb[0]).toBeGreaterThan(248); // R — 검정 혼입 시 가장 먼저 깎인다
  expect(mean.rgb[1]).toBeGreaterThan(200); // G
  expect(mean.rgb[2]).toBeLessThan(160); // B — 흰색 혼입 허용치
});
