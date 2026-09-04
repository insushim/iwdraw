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

/*
 * 학급 코드로 입장하면 헤더에 항목이 두 개 더 붙는다(닉네임·학급 칩 + 우리 반 갤러리).
 * 라벨 표시를 뷰포트 폭(xl=1280)으로만 정하던 시절엔 이 조합이 1366px에서 1541px를
 * 요구해 넘쳤고, 넘친 만큼 flex가 남은 항목을 눌러 한글이 **글자 단위로 접혔다** —
 * 닉네임 칩이 36×208px 세로 막대가 됐다(2026-08-25 사용자 제보 "탭 글씨 정렬이 어색해").
 * 이제 헤더가 실측으로 라벨을 접으므로, 어느 폭에서도 세로로 늘어난 항목이 없어야 한다.
 */
for (const width of [1024, 1280, 1366, 1920]) {
  test(`${width}px 학급 입장 헤더가 세로로 접히지 않는다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await page.evaluate(() =>
      sessionStorage.setItem(
        "arton.student",
        JSON.stringify({
          token: "t",
          studentId: "s1",
          classId: "c1",
          className: "3학년 2반",
          nickname: "초록거북",
          classCode: "ABC123",
        }),
      ),
    );
    await page.goto("/draw?mode=sketch");
    await page.getByLabel("그림 캔버스").waitFor();
    await page.waitForTimeout(400);

    const r = await page.evaluate(() => {
      const header = document.querySelector("header")!;
      const tall: { label: string; h: number; w: number }[] = [];
      for (const el of header.querySelectorAll("button, a, span")) {
        const b = el.getBoundingClientRect();
        if (b.height > 56) {
          tall.push({ label: (el.textContent ?? "").trim().slice(0, 12), h: Math.round(b.height), w: Math.round(b.width) });
        }
      }
      return { tall, scrollW: header.scrollWidth, clientW: header.clientWidth };
    });

    expect(r.tall, `세로로 접힌 항목: ${JSON.stringify(r.tall)}`).toEqual([]);
    // 1024px 이상에서는 라벨을 접어서라도 가로 넘침이 없어야 한다(저장 버튼이 화면 밖으로 밀리면 저장 불가)
    expect(r.scrollW, "헤더 가로 넘침").toBeLessThanOrEqual(r.clientW + 1);
  });
}

/*
 * 측정 가드(2026-09-02)가 리사이즈를 삼키지 않는지.
 * 헤더 측정은 "dataset 쓰기 → scrollWidth 읽기"를 최대 3번 반복하는 강제 리플로라
 * 매 렌더 돌면 비싸다. 그래서 직전과 같은 상태(폭·항목수·텍스트)면 건너뛰게 했는데,
 * **창을 줄이는 것**은 텍스트도 항목 수도 그대로라 가드에 걸려 라벨이 펼쳐진 채 굳을 수 있다.
 * ResizeObserver 경로는 가드를 우회해야 한다.
 */
test("창을 좁히면 헤더 라벨이 그때그때 다시 접힌다", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 800 });
  await page.goto("/draw?mode=sketch");
  await page.getByLabel("그림 캔버스").waitFor();
  await page.waitForTimeout(300);

  const labels = () => page.locator("header").getAttribute("data-labels");
  expect(await labels()).toBe("on"); // 넓으면 전부 켬

  await page.setViewportSize({ width: 900, height: 800 });
  await page.waitForTimeout(400);
  expect(await labels(), "좁혔는데 라벨이 켜진 채로 굳었다 = 가드가 리사이즈를 삼켰다").not.toBe("on");

  // 다시 넓히면 되돌아온다
  await page.setViewportSize({ width: 1920, height: 800 });
  await page.waitForTimeout(400);
  expect(await labels()).toBe("on");

  // 어느 단계에서도 세로로 늘어난 항목이 없어야 한다
  const tall = await page.evaluate(() =>
    [...document.querySelector("header")!.querySelectorAll("button, a")]
      .filter((el) => el.getBoundingClientRect().height > 56).length,
  );
  expect(tall).toBe(0);
});
