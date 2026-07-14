import { test, expect } from "@playwright/test";

/*
 * 좁은 화면(웨일북)에서 헤더 버튼이 세로로 길쭉해지던 문제(2026-07-14 사용자 실측).
 * 한글 라벨은 글자 단위로 접히기 때문에, flex가 버튼을 눌러 폭이 좁아지면 "불 / 러 / 오 / 기"로
 * 접혀 버튼 높이가 몇 배가 된다. 여러 폭에서 헤더 버튼 높이가 한 줄 높이를 넘지 않아야 한다.
 */
for (const width of [1024, 1280, 1366]) {
  test(`${width}px 폭에서 헤더 버튼이 한 줄 높이를 유지한다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 768 });
    await page.goto("/draw?mode=sketch");
    await page.getByLabel("그림 캔버스").waitFor();
    await page.waitForTimeout(300);

    const tall = await page.evaluate(() => {
      const header = document.querySelector("header")!;
      const bad: { label: string; h: number }[] = [];
      for (const el of header.querySelectorAll("button, a")) {
        const h = el.getBoundingClientRect().height;
        if (h > 56) bad.push({ label: (el.textContent ?? "").trim().slice(0, 12), h: Math.round(h) });
      }
      return bad;
    });

    expect(tall, `세로로 늘어난 버튼: ${JSON.stringify(tall)}`).toEqual([]);
  });
}
