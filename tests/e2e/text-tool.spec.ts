import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });
test.setTimeout(90_000);

/*
 * 글씨 넣기(2026-07-14 요청): 타이핑 → 글꼴 선택 → 캔버스에 떠 있는 상태로 들어오고,
 * 끌어 옮기고 크기를 바꾼 뒤 ✓로 굳는다. 되돌리기 1번에 원래대로.
 */
async function ink(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const d = el.getContext("2d")!.getImageData(0, 0, el.width, el.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 8) if (d[i] < 200) n++;
    return n;
  });
}

async function setup(page: import("@playwright/test").Page) {
  await page.goto("/draw?mode=sketch&backend=gl");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);
}

async function insert(page: import("@playwright/test").Page, text: string, fontLabel?: string) {
  await page.getByRole("button", { name: "글씨 넣기" }).click();
  await page.getByLabel("넣을 글").fill(text);
  if (fontLabel) await page.getByRole("button", { name: `글씨체 ${fontLabel}` }).click();
  await page.getByRole("button", { name: "캔버스에 넣기" }).click();
  await page.waitForTimeout(700); // 글꼴 로드 + 프리뷰
}

test("글씨를 넣고 확인하면 캔버스에 굳고, 되돌리기로 사라진다", async ({ page }) => {
  await setup(page);
  const before = await ink(page);

  await insert(page, "안녕 ArtON");
  // 아직 확정 전 — 확인 바가 떠 있다
  await expect(page.getByRole("button", { name: /놓기 확인|여기 놓기/ })).toBeVisible();
  await page.getByRole("button", { name: /놓기 확인|여기 놓기/ }).click();
  await page.waitForTimeout(500);

  const after = await ink(page);
  expect(after, "글씨가 캔버스에 그려져야 한다").toBeGreaterThan(before + 300);

  await page.getByRole("button", { name: "되돌리기" }).click();
  await page.waitForTimeout(500);
  expect(await ink(page), "되돌리기 1번이면 글씨가 사라진다").toBeLessThan(before + 100);
});

test("글꼴을 바꾸면 그려지는 모양이 달라진다", async ({ page }) => {
  await setup(page);

  const shot = async () =>
    page.evaluate(() => {
      const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
      const d = el.getContext("2d")!.getImageData(0, 0, el.width, el.height).data;
      let sum = 0;
      let n = 0;
      for (let i = 0; i < d.length; i += 8) {
        if (d[i] < 200) {
          n++;
          sum = (sum + i) % 1e9;
        }
      }
      return { n, sum };
    });

  await insert(page, "가나다 ABC", "동글");
  await page.getByRole("button", { name: /놓기 확인|여기 놓기/ }).click();
  await page.waitForTimeout(400);
  const a = await shot();

  await page.getByRole("button", { name: "되돌리기" }).click();
  await page.waitForTimeout(300);

  await insert(page, "가나다 ABC", "제목"); // Black Han Sans — 훨씬 굵다
  await page.getByRole("button", { name: /놓기 확인|여기 놓기/ }).click();
  await page.waitForTimeout(400);
  const b = await shot();

  console.log("FONT", JSON.stringify({ a, b }));
  expect(Math.abs(b.n - a.n), "글꼴이 다르면 칠해진 픽셀 수가 달라야 한다").toBeGreaterThan(200);
});

test("엔터로 줄을 바꾸면 두 줄로 들어간다", async ({ page }) => {
  await setup(page);

  /** 잉크의 세로 높이(캔버스 대비 비율) */
  const inkHeight = async () =>
    page.evaluate(() => {
      const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
      const d = el.getContext("2d")!.getImageData(0, 0, el.width, el.height).data;
      let minY = 1e9;
      let maxY = -1;
      for (let y = 0; y < el.height; y++)
        for (let x = 0; x < el.width; x += 2) {
          if (d[(y * el.width + x) * 4] < 200) {
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            break;
          }
        }
      return maxY < 0 ? 0 : (maxY - minY) / el.height;
    });

  await insert(page, "가나다");
  await page.getByRole("button", { name: /놓기 확인|여기 놓기/ }).click();
  await page.waitForTimeout(400);
  const one = await inkHeight();
  await page.getByRole("button", { name: "되돌리기" }).click();
  await page.waitForTimeout(300);

  // 엔터 = 줄바꿈(넣기가 아니라)
  await page.getByRole("button", { name: "글씨 넣기" }).click();
  const box = page.getByLabel("넣을 글");
  await box.click();
  await box.type("가나다");
  await page.keyboard.press("Enter");
  await box.type("라마바");
  await expect(box).toHaveValue("가나다\n라마바"); // 엔터로 창이 닫히지 않았다
  await page.getByRole("button", { name: "캔버스에 넣기" }).click();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: /놓기 확인|여기 놓기/ }).click();
  await page.waitForTimeout(400);
  const two = await inkHeight();

  console.log("LINES", JSON.stringify({ one, two }));
  expect(two, "두 줄은 한 줄보다 훨씬 높아야 한다").toBeGreaterThan(one * 1.6);
});

test("테두리를 켜면 고른 색으로 글자 둘레가 둘러진다", async ({ page }) => {
  await setup(page);
  // 흰 글씨 + 빨간 테두리: 테두리를 안 켜면 흰 캔버스에 흰 글씨라 아무것도 안 보인다
  await page.getByRole("button", { name: "색 4", exact: true }).click(); // 흰색
  await page.getByRole("button", { name: "글씨 넣기" }).click();
  await page.getByLabel("넣을 글").fill("테두리");
  await page.getByRole("button", { name: "테두리 켜기" }).click();
  await page.getByRole("button", { name: "테두리 굵게" }).click();
  // 테두리 색 = 팔레트 두 번째(잉크)가 아니라 눈에 띄는 색으로: 3번째 버튼
  await page.getByRole("button", { name: "테두리 색 3", exact: true }).click();
  await page.getByRole("button", { name: "캔버스에 넣기" }).click();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /놓기 확인|여기 놓기/ }).click();
  await page.waitForTimeout(500);

  const m = await page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const d = el.getContext("2d")!.getImageData(0, 0, el.width, el.height).data;
    let colored = 0; // 흰색도 배경도 아닌 픽셀 = 테두리
    for (let i = 0; i < d.length; i += 16) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      if (Math.max(r, g, b) - Math.min(r, g, b) > 40) colored++;
    }
    return colored;
  });
  console.log("OUTLINE", m);
  expect(m, "테두리 색 픽셀이 있어야 한다(흰 글씨는 테두리 없이는 안 보인다)").toBeGreaterThan(200);
});

test("넣은 글씨를 끌어서 옮길 수 있다", async ({ page }) => {
  await setup(page);
  await insert(page, "위치");

  const box = (await page.getByLabel("그림 캔버스").boundingBox())!;
  // 가운데(글씨 위)에서 아래로 끈다
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.78, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: /놓기 확인|여기 놓기/ }).click();
  await page.waitForTimeout(500);

  const cy = await page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const d = el.getContext("2d")!.getImageData(0, 0, el.width, el.height).data;
    let sy = 0;
    let n = 0;
    for (let y = 0; y < el.height; y += 2)
      for (let x = 0; x < el.width; x += 2) {
        if (d[(y * el.width + x) * 4] < 200) {
          sy += y;
          n++;
        }
      }
    return n ? sy / n / el.height : -1;
  });
  console.log("MOVED cy", cy);
  expect(cy, "아래로 끌었으면 글씨 중심이 캔버스 아래쪽에 있어야 한다").toBeGreaterThan(0.62);
});
