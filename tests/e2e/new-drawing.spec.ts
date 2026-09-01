import { test, expect } from "@playwright/test";

/*
 * "새 그림"(정말요? 2단계 확인)이 실제로 빈 종이를 내놓는지 — 사용자 보고 2026-09-01:
 * "새로 그리기를 누르면 정말요? 나오는데 새로운 그림판이 안 나온다".
 * 잉크 비율을 픽셀로 실측한다(표시 캔버스 = 종이 + 레이어 합성).
 */
test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

async function inkRatio(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const ctx = el.getContext("2d")!;
    const { data } = ctx.getImageData(0, 0, el.width, el.height);
    let ink = 0;
    for (let i = 0; i < data.length; i += 4) {
      // 알파가 있고 충분히 어두운 픽셀만 잉크로 센다(흰 종이·종이결 제외)
      if (data[i + 3] > 20 && (data[i] + data[i + 1] + data[i + 2]) / 3 < 200) ink++;
    }
    return ink / (data.length / 4);
  });
}

async function drawStroke(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const r = el.getBoundingClientRect();
    const fire = (type: string, x: number, y: number) =>
      el.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true,
          clientX: r.left + x,
          clientY: r.top + y,
          pressure: 0.6,
          buttons: type === "pointerup" ? 0 : 1,
          bubbles: true,
          cancelable: true,
        }),
      );
    fire("pointerdown", r.width * 0.2, r.height * 0.3);
    for (let i = 1; i <= 30; i++)
      fire("pointermove", r.width * (0.2 + 0.6 * (i / 30)), r.height * (0.3 + 0.4 * (i / 30)));
    fire("pointerup", r.width * 0.8, r.height * 0.7);
  });
  await page.waitForTimeout(300);
}

async function clickNewDrawing(page: import("@playwright/test").Page) {
  const btn = page.getByRole("button", { name: "새 그림" });
  await btn.click();
  await expect(page.getByText("정말요?")).toBeVisible();
  await btn.click();
  await page.waitForTimeout(600);
}

test("빈 종이에서 새 그림 = 그림이 지워진다", async ({ page }) => {
  await page.goto("/draw?mode=sketch&backend=gl");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(400);
  const empty = await inkRatio(page);
  await drawStroke(page);
  const drawn = await inkRatio(page);
  expect(drawn, "획이 그려져야 한다").toBeGreaterThan(empty + 0.002);
  await clickNewDrawing(page);
  const after = await inkRatio(page);
  console.log("NEW-DRAWING blank", { empty, drawn, after });
  expect(after, "새 그림 후 빈 종이").toBeLessThan(empty + 0.001);
});

test("도안(색칠)에서 새 그림 = 도안까지 걷어낸 빈 종이가 나온다", async ({ page }) => {
  await page.goto(
    `/draw?template=${encodeURIComponent("/templates/animals/animals_high_01.webp")}&mode=coloring&backend=gl`,
  );
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(1500); // 도안 로드
  const base = await inkRatio(page);
  expect(base, "도안 선이 보여야 한다").toBeGreaterThan(0.002);
  await drawStroke(page);
  await clickNewDrawing(page);
  await page.waitForTimeout(800); // 캔버스 재마운트
  const after = await inkRatio(page);
  console.log("NEW-DRAWING coloring", { base, after });
  /* 도안을 남기면 화면이 하나도 안 바뀌어 "새로운 그림판이 안 나온다"가 된다
   * (2026-09-01 제보). 도안 유지 + 색칠만 지우기는 [전체 지우기]가 담당한다. */
  expect(after, "새 그림 후에는 도안도 없다").toBeLessThan(0.001);
  // 새로고침해도 도안이 되살아나지 않게 주소에서 도안 파라미터를 뗀다
  expect(page.url()).not.toContain("template=");
  /* 캔버스를 새로 마운트하는 경로라, 언마운트 flush 가 방금 지운 상태를 다시 써 넣으면
   * 새 캔버스가 **빈 그림으로** [이어 그리기]를 권한다(2026-09-01 교차검증 지적). */
  await page.waitForTimeout(600);
  expect(
    await page.getByRole("button", { name: "이어 그리기" }).count(),
    "새 그림 직후에 이어그리기 배너가 뜨면 안 된다",
  ).toBe(0);
  // 도안을 뗐으면 가로/세로 버튼이 다시 살아나야 한다(key에 방향이 빠지면 죽은 버튼이 된다)
  await expect(page.getByRole("button", { name: "캔버스 방향 바꾸기" })).toBeVisible();
  /* 새로고침 뒤에도 되살아나지 않아야 진짜 지운 것이다 — 언마운트 flush 가 방금 지운 상태를
   * 다시 써 넣는 경로가 여기서만 드러난다(2026-09-01 교차검증 지적). */
  await page.reload();
  await page.getByLabel("그림 캔버스").waitFor();
  await page.waitForTimeout(1200);
  expect(
    await page.getByRole("button", { name: "이어 그리기" }).count(),
    "새로고침 후에도 지운 그림이 되살아나면 안 된다",
  ).toBe(0);
  expect(await inkRatio(page), "새로고침 후에도 빈 종이").toBeLessThan(0.001);
});

test("이어그리기 원본(사진)에서도 새 그림 = 빈 종이", async ({ page }) => {
  await page.goto("/draw?mode=sketch&backend=gl");
  await page.getByLabel("그림 캔버스").waitFor();
  // 검은 사각형 원본을 sessionStorage에 심고 ?base=custom 으로 재진입
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 400;
    c.height = 300;
    const x = c.getContext("2d")!;
    x.fillStyle = "#222";
    x.fillRect(0, 0, 400, 300);
    const url = c.toDataURL("image/png");
    sessionStorage.setItem("arton.customBase", url);
    return url;
  });
  expect(dataUrl.length).toBeGreaterThan(100);
  await page.goto("/draw?base=custom&mode=sketch&backend=gl");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(1200);
  const withBase = await inkRatio(page);
  expect(withBase, "깔아 놓은 원본이 보여야 한다").toBeGreaterThan(0.5);
  await clickNewDrawing(page);
  await page.waitForTimeout(800);
  const after = await inkRatio(page);
  console.log("NEW-DRAWING base", { withBase, after });
  expect(after, "새 그림 후 빈 종이").toBeLessThan(0.001);
});
