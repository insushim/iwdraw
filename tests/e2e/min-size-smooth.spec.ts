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
  const report: Record<string, { gaps: number; cov: number; sd: number }> = {};

  for (const name of BRUSHES) {
    await page.getByRole("button", { name, exact: true }).click();
    await page.getByLabel("브러시 굵기", { exact: true }).fill("1");
    // ① 완만한 대각선 — 끊김(빈 열)이 가장 잘 드러나는 각도
    await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.3);
    await page.mouse.down();
    for (let k = 1; k <= 40; k++) {
      await page.mouse.move(
        box.x + box.width * (0.15 + 0.7 * (k / 40)),
        box.y + box.height * (0.3 + 0.35 * (k / 40)),
      );
    }
    await page.mouse.up();
    await page.waitForTimeout(200);
    // ② 수평선 3줄 — 두께가 일정해야 한다. dab마다 굵기가 오르내리면 톱니("구불구불").
    //    톱니는 획 중심의 서브픽셀 위치에 따라 드러나기도, 숨기도 한다(실측) → 0.33px씩
    //    어긋난 3줄을 긋고 그중 최악(최대 편차)으로 판정한다.
    for (const dy of [0, 0.33, 0.66]) {
      const y = box.y + box.height * 0.78 + dy + Math.round(dy) * 0;
      const yy = y + [0, 12, 24][[0, 0.33, 0.66].indexOf(dy)];
      await page.mouse.move(box.x + box.width * 0.15, yy);
      await page.mouse.down();
      for (let k = 1; k <= 40; k++)
        await page.mouse.move(box.x + box.width * (0.15 + 0.7 * (k / 40)), yy);
      await page.mouse.up();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);

    const stat = await page.evaluate(() => {
      const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
      const ctx = el.getContext("2d")!;
      const x0 = Math.round(el.width * 0.2);
      const w = Math.round(el.width * 0.6);
      const painted = (x: number, y: number, img: Uint8ClampedArray, w: number) => {
        const i = (y * w + x) * 4;
        return img[i] < 235 || img[i + 1] < 235 || img[i + 2] < 235;
      };
      // ① 대각선 구간(위쪽 절반): 끊긴 열 세기
      const hDiag = Math.round(el.height * 0.7);
      const diag = ctx.getImageData(x0, 0, w, hDiag).data;
      let empty = 0;
      let cov = 0;
      for (let x = 0; x < w; x++) {
        let n = 0;
        for (let y = 0; y < hDiag; y++) if (painted(x, y, diag, w)) n++;
        if (n === 0) empty++;
        cov += n;
      }
      // ② 수평선 구간(아래쪽): 열별 두께의 표준편차 = 톱니 지표
      const y0 = Math.round(el.height * 0.72);
      const hLine = el.height - y0;
      const line = ctx.getImageData(x0, y0, w, hLine).data;
      // 열별 "윗변 위치"(획의 첫 칠해진 픽셀 y) — 톱니 = 이 값이 열마다 1px씩 오르내리는 것.
      // 잉크량·이진 카운트는 톱니를 평균 내 버려 못 잡는다(실측: 회전 on/off 차이 0.02).
      // 3줄이 한 crop 안에 있으므로 줄별로 나눠(빈 행으로 구분) 각각의 편차를 재고 최악을 쓴다.
      const rows: number[][] = [];
      for (let x = 0; x < w; x++) {
        const edges: number[] = [];
        let prevPainted = false;
        for (let y = 0; y < hLine; y++) {
          const p = painted(x, y, line, w);
          if (p && !prevPainted) edges.push(y); // 각 줄의 윗변
          prevPainted = p;
        }
        edges.forEach((e, i) => {
          (rows[i] ??= []).push(e);
        });
      }
      let worst = 0;
      for (const r of rows) {
        if (r.length < w * 0.9) continue; // 그 줄이 crop 전체를 지나지 않으면 무시
        const m = r.reduce((a, b) => a + b, 0) / r.length;
        const sd = Math.sqrt(r.reduce((a, b) => a + (b - m) * (b - m), 0) / r.length);
        worst = Math.max(worst, sd);
      }
      return {
        gaps: empty,
        cov: Math.round((cov / w) * 10) / 10,
        sd: Math.round(worst * 100) / 100,
      };
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
    // 수평선인데 열마다 두께가 오르내리면 톱니로 보인다 — dab 무작위 회전이 원인이었다
    // 수평선인데 윗변이 열마다 오르내리면 톱니("구불구불")로 보인다.
    // 원인 = dab마다 팁 쿼드를 무작위 회전 → 얇은 획에서 텍셀 커버리지가 dab마다 달라짐.
    // 수정 전 실측: 연필 0.5 · 사인펜 0.36 / 수정 후: 전 브러시 0
    expect(s.sd, `${name} 수평선 윗변 편차(톱니)`).toBeLessThan(0.2);
  }
});
