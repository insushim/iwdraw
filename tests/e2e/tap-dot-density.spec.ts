import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

/*
 * "콕 찍은 점"이 획보다 훨씬 흐린 문제(2026-07-25 전수 시트 검수) 회귀 가드.
 *
 * 획은 한 점 위로 dab이 1/spacing겹씩 지나가며 쌓이는데 탭은 1겹뿐이었다.
 * 개선 전 실측(탭 최대농도 ÷ 획 최대농도): 연필 0.27 · 수채붓 0.26 · 크레용 0.52
 * (= 눈·점·별을 찍어도 거의 안 보임). 개선 후: 연필 0.90 · 크레용 0.87 · 수채붓 0.64.
 * 잉크 매체(사인펜·마커·유화붓)는 원래 0.99라 변화 없음 = 회귀 감시 대상.
 */
const BRUSHES = ["연필", "크레용", "사인펜", "마커"];

test("콕 찍은 점이 획과 비슷한 진하기로 나온다", async ({ page }) => {
  await page.goto("/draw?mode=sketch&backend=gl");
  const canvas = page.getByLabel("그림 캔버스");
  await canvas.waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "색 1", exact: true }).click();
  const box = (await canvas.boundingBox())!;

  const report: Record<string, { stroke: number; tap: number; ratio: number }> = {};
  for (const b of BRUSHES) {
    await page.getByRole("button", { name: b, exact: true }).click();
    await page.getByLabel("브러시 굵기", { exact: true }).fill("20");
    await page.waitForTimeout(60);

    const y = box.y + box.height * 0.3;
    await page.mouse.move(box.x + box.width * 0.15, y);
    await page.mouse.down();
    for (let k = 1; k <= 25; k++)
      await page.mouse.move(box.x + box.width * (0.15 + 0.5 * (k / 25)), y);
    await page.mouse.up();
    await page.waitForTimeout(150);

    // 제자리 탭(누르고 바로 뗌) — 아이들이 눈·점·별을 찍는 조작
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.65);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(250);

    const m = await page.evaluate(() => {
      const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
      const img = el.getContext("2d")!.getImageData(0, 0, el.width, el.height).data;
      const W = el.width;
      const H = el.height;
      const peak = (x0: number, x1: number, y0: number, y1: number) => {
        let p = 0;
        for (let y = y0; y < y1; y++)
          for (let x = x0; x < x1; x++) {
            const i = (y * W + x) * 4;
            const a = Math.max(
              0,
              1 - (0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2]) / 255,
            );
            if (a > p) p = a;
          }
        return +p.toFixed(3);
      };
      return {
        stroke: peak(
          Math.round(W * 0.25),
          Math.round(W * 0.55),
          Math.round(H * 0.26),
          Math.round(H * 0.34),
        ),
        tap: peak(
          Math.round(W * 0.35),
          Math.round(W * 0.45),
          Math.round(H * 0.6),
          Math.round(H * 0.7),
        ),
      };
    });
    report[b] = { ...m, ratio: +(m.tap / (m.stroke || 1)).toFixed(2) };

    await page.getByRole("button", { name: "전체 지우기" }).click();
    await page.getByRole("button", { name: "정말 지울래요" }).click();
    await page.waitForTimeout(200);
  }

  console.log("TAP-DENSITY", JSON.stringify(report));
  for (const b of BRUSHES) {
    // 탭이 획보다 눈에 띄게 흐리면 "점이 안 찍힌다"로 읽힌다(개선 전 연필 0.27)
    expect(report[b].ratio, `${b} 탭/획 농도비`).toBeGreaterThan(0.75);
    // 반대로 탭이 획보다 진해지면 겹쳐찍기 과다(같은 자리 누적 폭주)
    expect(report[b].ratio, `${b} 탭/획 농도비 상한`).toBeLessThan(1.15);
  }
});
