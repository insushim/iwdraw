import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

/*
 * 최소 굵기(1)에서 모든 펜이 끊기고 계단이 진다는 사용자 실측(2026-07-13).
 * 대각선 획을 긋고 ① 획이 지나간 행 중 "빈 행"(끊김) ② 계단 폭(행별 채색 폭의 편차)을 잰다.
 * 서브픽셀 dab은 래스터에서 통째로 증발하거나 1px 점으로 찍혀 계단이 된다.
 */
const BRUSHES = ["연필", "색연필", "크레용", "사인펜", "마커", "붓펜"];

test("최소 굵기에서도 획이 끊기지 않고 부드럽다", async ({ page }) => {
  await page.goto("/draw?mode=sketch&backend=gl");
  const canvas = page.getByLabel("그림 캔버스");
  await canvas.waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "색 1", exact: true }).click();

  const box = (await canvas.boundingBox())!;
  const report: Record<string, { gaps: number; cov: number }> = {};

  for (const name of BRUSHES) {
    await page.getByRole("button", { name, exact: true }).click();
    await page.getByLabel("브러시 굵기", { exact: true }).fill("1");
    // 완만한 대각선 — 계단이 가장 잘 드러나는 각도
    await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.3);
    await page.mouse.down();
    for (let k = 1; k <= 40; k++) {
      await page.mouse.move(
        box.x + box.width * (0.15 + 0.7 * (k / 40)),
        box.y + box.height * (0.3 + 0.35 * (k / 40)),
      );
    }
    await page.mouse.up();
    await page.waitForTimeout(400);

    const stat = await page.evaluate(() => {
      const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
      const ctx = el.getContext("2d")!;
      const x0 = Math.round(el.width * 0.2);
      const w = Math.round(el.width * 0.6);
      const img = ctx.getImageData(x0, 0, w, el.height).data;
      // 열(column)마다 칠해진 픽셀 수 — 대각선이므로 모든 열이 획을 지난다
      let empty = 0;
      let cov = 0;
      for (let x = 0; x < w; x++) {
        let painted = 0;
        for (let y = 0; y < el.height; y++) {
          const i = (y * w + x) * 4;
          // 백지(≈흰색)와 구분 — 어떤 색이든 칠해졌으면 밝기가 떨어진다
          if (img[i] < 235 || img[i + 1] < 235 || img[i + 2] < 235) painted++;
        }
        if (painted === 0) empty++;
        cov += painted;
      }
      return { gaps: empty, cov: Math.round((cov / w) * 10) / 10 };
    });
    report[name] = stat;
    // 다음 브러시를 위해 캔버스 비우기
    await page.getByRole("button", { name: "전체 지우기" }).click();
    await page.getByRole("button", { name: "정말 지울래요" }).click();
    await page.waitForTimeout(250);
  }

  console.log("MINSIZE", JSON.stringify(report));
  for (const [name, s] of Object.entries(report)) {
    // 끊김(획이 지나간 열인데 아무것도 안 칠해진 열)이 없어야 한다
    expect(s.gaps, `${name} 끊긴 열`).toBeLessThan(3);
    // 열당 평균 두께가 1.4px 이상 = 안티에일리어싱이 살아 있는 선(1px 점선은 계단)
    expect(s.cov, `${name} 열당 두께`).toBeGreaterThan(1.4);
  }
});
