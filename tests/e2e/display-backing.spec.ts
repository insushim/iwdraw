import { test, expect } from "@playwright/test";

/*
 * 표시 캔버스 백킹이 화면이 실제로 가진 물리 픽셀을 크게 넘지 않는가 (2026-07-29).
 *
 * 예전엔 백킹을 "논리 캔버스 크기 × initialDpr(최대 2)"로 잡았다. 폰(뷰포트 844×390,
 * dpr 3)에서 캔버스 요소는 CSS 387px = 물리 1160px인데 백킹은 **3072px**이었다.
 *   · 합성 비용은 백킹 **면적**에 비례한다 — 매 프레임 clear + 레이어 blit + 흰 배경 fill +
 *     종이결 multiply를 필요량의 7배 면적에 했다(폰 렉의 큰 몫).
 *   · 화면에 보여줄 수 없는 해상도라 선명도 이득은 0인데, 브라우저가 2.65배로 되축소하며
 *     얇은 획을 갉아먹는다.
 * 지금은 요소의 물리 픽셀에 맞춘다(하한 = 논리 해상도).
 *
 * ⚠️ 이 스펙만 deviceScaleFactor를 3으로 쓴다 — dpr 1인 기본 프로젝트에서는 애초에
 * 과할당이 일어나지 않아 회귀를 못 잡는다.
 */
test.use({
  launchOptions: { args: ["--enable-unsafe-swiftshader"] },
  viewport: { width: 844, height: 390 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

test("폰: 표시 백킹이 화면 물리 픽셀을 과하게 넘지 않는다", async ({ page }) => {
  await page.goto("/draw?mode=sketch&backend=gl");
  const canvas = page.getByLabel("그림 캔버스");
  await canvas.waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(400);

  const m = await page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const r = el.getBoundingClientRect();
    return {
      backing: el.width * el.height,
      physical: r.width * devicePixelRatio * r.height * devicePixelRatio,
      backingW: el.width,
      cssW: +r.width.toFixed(1),
      dpr: devicePixelRatio,
    };
  });
  console.log("DISPLAY-BACKING", JSON.stringify(m));

  // 수정 전 실측: 백킹 3072×2304(7.08M) vs 물리 1160×870(1.01M) = 7.0배
  // 수정 후: 1536×1152(1.77M) = 1.75배(논리 해상도 하한에 걸린 값)
  expect(m.backing / m.physical, "백킹/물리 픽셀 면적비").toBeLessThan(2.5);
  // 반대로 너무 줄여서 흐릿해지지도 않아야 한다 — 논리 해상도 아래로는 안 내려간다
  expect(m.backingW, "백킹 폭(논리 해상도 하한)").toBeGreaterThanOrEqual(1536);

  // 백킹을 줄여도 실제로 그려져야 한다(합성 변환이 dpr과 맞물려 있다)
  const box = (await canvas.boundingBox())!;
  const y = box.y + box.height * 0.5;
  await page.mouse.move(box.x + box.width * 0.2, y);
  await page.mouse.down();
  for (let k = 1; k <= 12; k++)
    await page.mouse.move(box.x + box.width * (0.2 + 0.6 * (k / 12)), y);
  await page.mouse.up();
  await page.waitForTimeout(250);
  const ink = await page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const d = el.getContext("2d")!.getImageData(0, 0, el.width, el.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4 * 37) if (Math.min(d[i], d[i + 1], d[i + 2]) < 200) n++;
    return n;
  });
  expect(ink, "획 픽셀").toBeGreaterThan(0);
});
