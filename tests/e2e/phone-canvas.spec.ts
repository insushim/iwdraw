import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

/*
 * 폰에서 실제로 그림을 그릴 수 있는가 (2026-07-28 사용자 제보 회귀 가드).
 *
 * 증상: 폰에서 캔버스가 되돌리기 버튼만 들어가는 얇은 띠였다. 가로로 눕혀도 마찬가지.
 * 원인: 우측 패널이 shrink-0이라 **자기 내용 높이(≈420px)를 그대로 가져가고**
 *   캔버스(flex-1)는 남는 걸 받는데 폰에서는 남는 게 0이었다. 게다가 가로 폰은
 *   폭이 800px대라 rail(≥768px) 조건에 걸려버려 데스크톱용 3열(레일 150 + 패널 264)이
 *   들어가면서 더 눌렸다.
 * 수정: rail에 min-height 560 추가(가로 폰 배제) + compact(가로비≥1 & 높이<560) 3열 압축
 *   + 세로 스택에서는 패널 높이를 40dvh로 제한.
 *
 * 여기서 재는 것은 "레이아웃이 예쁜가"가 아니라 **그릴 수 있는가** —
 * 캔버스 실측 크기와, 실제로 획을 그어 잉크가 남는지.
 */

/*
 * 게이트 값은 수정 전/후 실측 사이에 둔다(수정을 되돌리면 반드시 실패하도록).
 *   844×390  수정 전 334×251 → 후 387×290
 *   740×360  수정 전 **캔버스를 찾지 못함**(측정 실패) → 후 352×264
 *   390×844  수정 전 277×207 → 후 350×263
 * ⚠️ 캔버스는 4:3 비율이라 폭·높이 중 짧은 쪽에 묶인다 — 세로 폰에서 높이 330 같은 값은
 *   폭 440을 요구해서 애초에 불가능하다. 게이트는 "실제로 가능한 최대치"를 기준으로.
 */
const PHONES = [
  { name: "가로 폰 844×390", w: 844, h: 390, minW: 360, minH: 270 },
  { name: "가로 폰 740×360", w: 740, h: 360, minW: 330, minH: 240 },
  { name: "세로 폰 390×844", w: 390, h: 844, minW: 330, minH: 240 },
];

for (const p of PHONES) {
  test(`${p.name}: 캔버스가 그릴 수 있는 크기다`, async ({ page }) => {
    await page.setViewportSize({ width: p.w, height: p.h });
    await page.goto("/draw?mode=sketch&backend=gl");
    const canvas = page.getByLabel("그림 캔버스");
    await canvas.waitFor();
    const fresh = page.getByRole("button", { name: /새로 시작/ });
    if (await fresh.isVisible().catch(() => false)) await fresh.click();
    await page.waitForTimeout(300);

    const box = (await canvas.boundingBox())!;
    console.log(`PHONE ${p.name}`, JSON.stringify({ w: +box.width.toFixed(0), h: +box.height.toFixed(0) }));
    // 수정 전 실측: 가로 폰에서 높이 60px 안팎(되돌리기 버튼만 들어가는 띠)
    expect(box.width, `${p.name} 캔버스 폭`).toBeGreaterThan(p.minW);
    expect(box.height, `${p.name} 캔버스 높이`).toBeGreaterThan(p.minH);
    // 캔버스가 화면 밖으로 나가면 안 된다(가로 스크롤로 밀려난 채 "크다"고 나오는 경우 차단)
    expect(box.y + box.height, `${p.name} 캔버스 아래끝`).toBeLessThanOrEqual(p.h + 1);
    expect(box.x + box.width, `${p.name} 캔버스 오른끝`).toBeLessThanOrEqual(p.w + 1);

    // 실제로 그어서 잉크가 남는지 — 크기만 맞고 못 그리면 의미가 없다
    await page.getByRole("button", { name: "마커", exact: true }).click();
    await page.getByRole("button", { name: "색 1", exact: true }).click();
    const y = box.y + box.height * 0.5;
    await page.mouse.move(box.x + box.width * 0.2, y);
    await page.mouse.down();
    for (let k = 1; k <= 12; k++) await page.mouse.move(box.x + box.width * (0.2 + 0.6 * (k / 12)), y);
    await page.mouse.up();
    await page.waitForTimeout(250);

    const ink = await page.evaluate(() => {
      const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
      const d = el.getContext("2d")!.getImageData(0, 0, el.width, el.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4 * 53)
        if (Math.min(d[i], d[i + 1], d[i + 2]) < 200) n++;
      return n;
    });
    expect(ink, `${p.name} 획 픽셀`).toBeGreaterThan(0);

    // 페이지 자체가 밀리면 안 된다 — shrink-0 요소가 넘치면 캔버스까지 옆으로 끌려간다
    // (세로 태블릿에서 이미 한 번 겪은 실패 계열)
    const overflow = await page.evaluate(() => ({
      x: document.documentElement.scrollWidth - window.innerWidth,
      y: document.documentElement.scrollHeight - window.innerHeight,
    }));
    expect(overflow.x, `${p.name} 가로 넘침`).toBeLessThanOrEqual(1);
    expect(overflow.y, `${p.name} 세로 넘침`).toBeLessThanOrEqual(1);
  });
}

test("가로 폰: 도구 팔레트와 설정 패널을 모두 쓸 수 있다", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/draw?mode=sketch&backend=gl");
  const canvas = page.getByLabel("그림 캔버스");
  await canvas.waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);

  // 도구 팔레트: 세로 스크롤로 끝 도구까지 닿는다(가로 폰은 2열 세로 그리드)
  const toolbar = page.getByRole("toolbar", { name: "그리기 도구" });
  const eraser = toolbar.getByRole("button", { name: "지우개", exact: true });
  await eraser.scrollIntoViewIfNeeded();
  await expect(eraser).toBeVisible();
  await eraser.click();
  await expect(eraser).toHaveAttribute("aria-pressed", "true");

  // 설정 패널: 굵기 입력이 실제로 조작된다(패널이 화면 밖으로 잘리면 실패)
  const size = page.getByLabel("브러시 굵기", { exact: true });
  await size.scrollIntoViewIfNeeded();
  await size.fill("30");
  await expect(size).toHaveValue("30");

  // 조작 후에도 캔버스는 그대로 화면 안에 있다
  const box = (await canvas.boundingBox())!;
  expect(box.height, "조작 후 캔버스 높이").toBeGreaterThan(270);
  expect(box.y + box.height, "조작 후 캔버스 아래끝").toBeLessThanOrEqual(391);
});
