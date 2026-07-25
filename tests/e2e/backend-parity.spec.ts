import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

/*
 * WebGL2 경로와 Canvas2D 폴백(웨일북·저사양 크롬북)이 "같은 그림"을 그려야 한다.
 *
 * 2026-07-25 실측으로 드러난 폴백 결함 2종:
 *  ① 어두운 색 틴트가 폴라리티 반대(팁 몸통을 밝힘) + destination-in 이중 적용(알파 a→a²)
 *     → 검은 획이 GL보다 2.3배 옅었다(연필 굵기 16 peak 2D 0.287 vs GL 0.675).
 *  ② 128px 입자 팁을 2~3px로 한 번에 축소 → 샘플이 팁 구멍에 떨어져 획이 증발
 *     (굵기 2 연필: 빈 열 36개 = 점선).
 * 둘 다 저사양 기기 사용자만 겪는 결함이라 눈에 안 띈 채 남아 있었다.
 */
const BRUSHES = ["연필", "크레용", "마커"];

async function drawAndMeasure(page: import("@playwright/test").Page, backend: string) {
  await page.goto(`/draw?mode=sketch&backend=${backend}`);
  const canvas = page.getByLabel("그림 캔버스");
  await canvas.waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "색 1", exact: true }).click();
  const box = (await canvas.boundingBox())!;

  const rows: { name: string; yFrac: number }[] = [];
  for (let i = 0; i < BRUSHES.length; i++) {
    const yFrac = 0.2 + i * 0.25;
    await page.getByRole("button", { name: BRUSHES[i], exact: true }).click();
    await page.getByLabel("브러시 굵기", { exact: true }).fill("16");
    await page.waitForTimeout(60);
    const y = box.y + box.height * yFrac;
    await page.mouse.move(box.x + box.width * 0.15, y);
    await page.mouse.down();
    for (let k = 1; k <= 25; k++)
      await page.mouse.move(box.x + box.width * (0.15 + 0.6 * (k / 25)), y);
    await page.mouse.up();
    await page.waitForTimeout(120);
    rows.push({ name: BRUSHES[i], yFrac });
  }
  await page.waitForTimeout(300);

  return page.evaluate((rows) => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const img = el.getContext("2d")!.getImageData(0, 0, el.width, el.height).data;
    const W = el.width;
    const H = el.height;
    const out: Record<string, { peak: number; gaps: number }> = {};
    for (const r of rows) {
      const cy = Math.round(H * r.yFrac);
      const half = 30;
      const peaks: number[] = [];
      for (let x = Math.round(W * 0.25); x < Math.round(W * 0.7); x++) {
        let p = 0;
        for (let y = cy - half; y <= cy + half; y++) {
          const i = (y * W + x) * 4;
          const a = Math.max(
            0,
            1 - (0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2]) / 255,
          );
          if (a > p) p = a;
        }
        peaks.push(p);
      }
      out[r.name] = {
        peak: +(peaks.reduce((a, b) => a + b, 0) / peaks.length).toFixed(3),
        gaps: peaks.filter((v) => v < 0.05).length,
      };
    }
    return out;
  }, rows);
}

test("Canvas2D 폴백이 WebGL과 같은 진하기로 그린다", async ({ page }) => {
  const gl = await drawAndMeasure(page, "gl");
  const d2 = await drawAndMeasure(page, "2d");
  console.log("PARITY", JSON.stringify({ gl, d2 }));

  for (const b of BRUSHES) {
    expect(gl[b].gaps, `${b} GL 끊긴 열`).toBeLessThan(3);
    expect(d2[b].gaps, `${b} 2D 끊긴 열`).toBeLessThan(3);
    const ratio = d2[b].peak / (gl[b].peak || 1);
    // 폴백이 절반으로 옅어지거나(수정 전 연필 0.43) 반대로 과하게 진해지면 실패
    expect(ratio, `${b} 2D/GL 진하기비`).toBeGreaterThan(0.75);
    expect(ratio, `${b} 2D/GL 진하기비 상한`).toBeLessThan(1.3);
  }
});

test("얇은 획도 폴백에서 끊기지 않는다", async ({ page }) => {
  await page.goto("/draw?mode=sketch&backend=2d");
  const canvas = page.getByLabel("그림 캔버스");
  await canvas.waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "색 1", exact: true }).click();
  const box = (await canvas.boundingBox())!;

  const names = ["연필", "색연필", "크레용"];
  const rows: { name: string; yFrac: number }[] = [];
  for (let i = 0; i < names.length; i++) {
    const yFrac = 0.2 + i * 0.25;
    await page.getByRole("button", { name: names[i], exact: true }).click();
    await page.getByLabel("브러시 굵기", { exact: true }).fill("2");
    await page.waitForTimeout(60);
    const y = box.y + box.height * yFrac;
    await page.mouse.move(box.x + box.width * 0.15, y);
    await page.mouse.down();
    for (let k = 1; k <= 25; k++)
      await page.mouse.move(box.x + box.width * (0.15 + 0.6 * (k / 25)), y);
    await page.mouse.up();
    await page.waitForTimeout(120);
    rows.push({ name: names[i], yFrac });
  }
  await page.waitForTimeout(300);

  const stat = await page.evaluate((rows) => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const img = el.getContext("2d")!.getImageData(0, 0, el.width, el.height).data;
    const W = el.width;
    const H = el.height;
    const out: Record<string, number> = {};
    for (const r of rows) {
      const cy = Math.round(H * r.yFrac);
      let gaps = 0;
      for (let x = Math.round(W * 0.25); x < Math.round(W * 0.7); x++) {
        let any = false;
        for (let y = cy - 20; y <= cy + 20; y++) {
          const i = (y * W + x) * 4;
          if (img[i] < 246 || img[i + 1] < 246 || img[i + 2] < 246) {
            any = true;
            break;
          }
        }
        if (!any) gaps++;
      }
      out[r.name] = gaps;
    }
    return out;
  }, rows);

  console.log("2D-THIN-GAPS", JSON.stringify(stat));
  // 수정 전 연필 굵기 2 = 빈 열 36개(점선). 밉맵 도입 후 0.
  for (const n of names) expect(stat[n], `${n} 2D 얇은 획 끊긴 열`).toBeLessThan(3);
});
