import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

/*
 * 세로형 태블릿에서 캔버스가 우표만 해지던 문제(2026-07-25 실측).
 * 좌·중·우 3열 레이아웃 분기가 "폭 768px 이상"뿐이라, 아이패드 세로(820×1180)는
 * md를 넘어서 3열이 되고 도구레일(150)+우패널(264)을 뺀 나머지만 캔버스가 됐다
 *   → 310×233 = 화면 면적의 7.5%. 세로로 쌓으면 703×527 = 38%.
 * 그래서 분기 기준에 종횡비를 넣었다(globals.css의 rail/stack 커스텀 배리언트).
 *
 * 함께 잡힌 것: 스택 레이아웃에서 도구 레일이 shrink-0이라 자기 폭(1224px)만큼
 * 부풀어 "페이지"가 옆으로 스크롤됐다(캔버스까지 밀림). 헤더도 같은 이유로 넘쳤다.
 */
const VIEWS = [
  { w: 820, h: 1180, tag: "아이패드 세로", minArea: 0.25 },
  { w: 768, h: 1024, tag: "작은 태블릿 세로", minArea: 0.18 },
  { w: 912, h: 1368, tag: "서피스 세로", minArea: 0.3 },
  // 종횡비가 정확히 0.8 — 경계를 "이상"으로 잡으면 이 흔한 세로 태블릿이 3열로 떨어진다
  { w: 1024, h: 1280, tag: "아이패드 프로 세로", minArea: 0.28 },
  { w: 1366, h: 768, tag: "웨일북 가로", minArea: 0.4 },
  { w: 1024, h: 768, tag: "아이패드 가로", minArea: 0.2 },
];

for (const v of VIEWS) {
  test(`${v.tag}(${v.w}×${v.h}): 캔버스가 충분히 크고 페이지가 옆으로 안 밀린다`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: v.w, height: v.h });
    await page.goto("/draw?mode=sketch&backend=gl");
    const canvas = page.getByLabel("그림 캔버스");
    await canvas.waitFor();
    const fresh = page.getByRole("button", { name: /새로 시작/ });
    if (await fresh.isVisible().catch(() => false)) await fresh.click();
    await page.waitForTimeout(400);

    const m = await page.evaluate(() => {
      const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
      const r = el.getBoundingClientRect();
      const de = document.documentElement;
      return {
        w: r.width,
        h: r.height,
        scrollW: de.scrollWidth,
        clientW: de.clientWidth,
      };
    });
    const area = (m.w * m.h) / (v.w * v.h);
    expect(area, `캔버스 면적비 ${area.toFixed(3)} (${Math.round(m.w)}×${Math.round(m.h)})`,).toBeGreaterThan(v.minArea);
    expect(m.scrollW, "가로 페이지 스크롤이 생기면 안 된다").toBeLessThanOrEqual(m.clientW + 1);
  });
}

test("좁은 화면(390px)에서도 페이지가 옆으로 밀리지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/draw?mode=sketch&backend=gl");
  await page.getByLabel("그림 캔버스").waitFor();
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
  expect(m.scrollW).toBeLessThanOrEqual(m.clientW + 1);
});

/* 에디터 밖 화면들도 좁은 폭에서 페이지가 옆으로 밀리면 안 된다
 * (실측: /coloring 390px에서 "📷 내 사진·그림으로" 버튼이 +62px 넘쳤다). */
for (const route of ["/", "/coloring", "/join", "/teacher"]) {
  for (const width of [390, 712]) {
    test(`${route} ${width}px: 페이지가 옆으로 안 밀린다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(route);
      await page.waitForTimeout(900);
      const m = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      }));
      expect(m.scrollW, `${route} @${width}`).toBeLessThanOrEqual(m.clientW + 1);
    });
  }
}
