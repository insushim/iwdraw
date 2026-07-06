import { test, expect } from "@playwright/test";

/*
 * 페인트통 × 도안 경계 회귀 테스트.
 * 색칠 도안을 연 뒤 다른 모드 탭(유화)으로 전환해도 페인트통은 도안 선을 벽으로
 * 삼아야 한다 — mode==="coloring" 조건이던 시절엔 전환 시 전체가 칠해졌다(2026-07-06 실측).
 */
test("도안 위 페인트통은 모드 전환 후에도 선을 넘지 않는다", async ({ page }) => {
  const tpl = encodeURIComponent("/templates/fruits_veggies/fruits_veggies_high_08.webp");
  await page.goto(`/draw?template=${tpl}&mode=coloring`);
  // Next dev 모드의 데브툴 배지(nextjs-portal)가 좌하단 페인트통 버튼을 덮는다 — 제거
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  const canvas = page.getByLabel("그림 캔버스");
  await canvas.waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  // 도안 로드 대기(라인아트가 그려질 때까지)
  await page.waitForTimeout(1500);

  // 유화 모드로 전환(도안은 유지된 채 브러시 모드만 변경)
  await page.getByRole("tab", { name: "유화" }).click();
  await page.waitForTimeout(300);

  await page.getByRole("button", { name: "페인트통", exact: true }).click();
  await page.getByRole("button", { name: "색 5", exact: true }).click(); // 빨강 229,72,77

  const box = (await canvas.boundingBox())!;
  // 외곽 배경(도안 테두리 안, 물체 밖) — 가장 큰 닫힌 영역이라 정상/버그 판별력이 큼
  await page.mouse.click(box.x + box.width * 0.12, box.y + box.height * 0.92);
  await page.waitForTimeout(600);

  // 캔버스에서 빨강 픽셀 비율 측정 — 선을 넘으면 거의 전체(>0.8), 정상이면 국소 영역
  const redFrac = await page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const ctx = el.getContext("2d")!;
    const d = ctx.getImageData(0, 0, el.width, el.height).data;
    let red = 0, total = 0;
    for (let i = 0; i < d.length; i += 16) { // 4픽셀 간격 샘플
      total++;
      if (Math.abs(d[i] - 229) < 40 && Math.abs(d[i + 1] - 72) < 40 && Math.abs(d[i + 2] - 77) < 40) red++;
    }
    return red / total;
  });
  console.log("RED FRACTION:", redFrac.toFixed(4));
  // 외곽 배경만 채우면 캔버스의 일부(실측 ~0.2±) — 선을 넘으면 물체 내부까지 ≈0.9+
  expect(redFrac, "칠해진 비율(선 넘으면 ≈1)").toBeLessThan(0.8);
  expect(redFrac, "페인트통이 실제로 동작").toBeGreaterThan(0.02);
});
