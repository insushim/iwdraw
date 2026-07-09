import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

/*
 * 수채 겹침 칠 얼룩 회귀 테스트(2026-07-09 사용자 실측: 나무 수관이 얼룩덜룩).
 * 원인 = multiply 합성: 획이 겹칠 때마다 곱셈으로 어두워져 동심원 단차(얼룩).
 * 수정 = darken(채널별 min): 같은 색 겹침은 그 색으로 수렴 → 균일 워시.
 * 낙서 8회 겹침 후 획 내부 픽셀의 채널 표준편차를 단언(multiply였을 때 G std 71 실측,
 * darken 26 실측 — 임계 45).
 */
test("수채 겹침 칠이 얼룩(동심원 단차) 없이 균일하다", async ({ page }) => {
  await page.goto("/draw?mode=watercolor&backend=gl");
  const canvas = page.getByLabel("그림 캔버스");
  await canvas.waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);

  await page.getByRole("button", { name: "수채붓", exact: true }).click();
  await page.getByRole("button", { name: "색 11", exact: true }).click(); // 진초록 106,196,93

  const box = (await canvas.boundingBox())!;
  const sizeSlider = page.getByLabel("브러시 굵기", { exact: true });
  await sizeSlider.fill("40");

  // 나무 수관처럼: 원형 낙서로 넓은 영역을 마구 겹쳐 칠한다(아이 칠하기 재현)
  const cx = box.x + box.width * 0.5;
  const cy = box.y + box.height * 0.4;
  const R = box.height * 0.22;
  for (let s = 0; s < 8; s++) {
    // 나선형 낙서 한 획 — 시작 각도를 바꿔 겹침이 무작위로 쌓이게
    const a0 = (s / 8) * Math.PI * 2;
    await page.mouse.move(cx + Math.cos(a0) * R * 0.3, cy + Math.sin(a0) * R * 0.3);
    await page.mouse.down();
    for (let k = 1; k <= 60; k++) {
      const t = k / 60;
      const a = a0 + t * Math.PI * 5;
      const r = R * (0.15 + 0.85 * t);
      await page.mouse.move(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8);
    }
    await page.mouse.up();
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(700);

  // 칠 영역 중앙을 확대 캡처
  await page.screenshot({
    path: "test-results/watercolor-full.png",
    clip: { x: box.x + box.width * 0.2, y: box.y + box.height * 0.15, width: box.width * 0.6, height: box.height * 0.5 },
  });

  // 균일도 측정: 획 내부(초록) 픽셀만의 채널별 표준편차 — 얼룩(단차)일수록 크다
  const stats = await page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const ctx = el.getContext("2d")!;
    const x0 = Math.round(el.width * 0.3);
    const y0 = Math.round(el.height * 0.3);
    const w = Math.round(el.width * 0.4);
    const h = Math.round(el.height * 0.3);
    const d = ctx.getImageData(x0, y0, w, h).data;
    const px: number[][] = [[], [], []];
    for (let i = 0; i < d.length; i += 4) {
      // 종이(흰) 제외: 초록 획 내부만
      if (d[i + 1] > d[i] + 15 && d[i + 1] > d[i + 2] + 15) {
        px[0].push(d[i]);
        px[1].push(d[i + 1]);
        px[2].push(d[i + 2]);
      }
    }
    return px.map((vals) => {
      const mean = vals.reduce((a, c) => a + c, 0) / Math.max(1, vals.length);
      const varSum = vals.reduce((a, c) => a + (c - mean) ** 2, 0);
      return { mean: Math.round(mean), std: Math.round(Math.sqrt(varSum / Math.max(1, vals.length))), n: vals.length };
    });
  });
  console.log("WCMOTTLE:", JSON.stringify(stats));
  expect(stats[1].n).toBeGreaterThan(10000); // 칠이 실제로 됐는지
  // multiply(얼룩) G std 실측 ~50+, darken(균일) ~15 안팎 — 여유 두고 45
  expect(stats[1].std, "겹침 칠 G채널 표준편차(얼룩 지표)").toBeLessThanOrEqual(45);
});
