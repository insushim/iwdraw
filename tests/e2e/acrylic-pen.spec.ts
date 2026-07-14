import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });
test.setTimeout(120_000);

/*
 * 아크릴펜(2026-07-14 요청). 핵심 성질:
 *  ① 불투명 — 어두운 색 위에 밝은 색을 그으면 밑색이 비치지 않고 덮인다(마커는 비친다).
 *  ② 균일 — 같은 색을 여러 번 덧그어도 얼룩·경계가 생기지 않는다.
 *  ③ 가벼움 — dab마다 픽셀을 읽는 기능(젖은 물감 섞임 등) 없음 → 프레임 비용이 마커급.
 */
async function setup(page: import("@playwright/test").Page, brush: string, size = 40) {
  await page.goto("/draw?mode=sketch&backend=gl");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: brush, exact: true }).click();
  await page.getByLabel("브러시 굵기", { exact: true }).fill(String(size));
}

async function stroke(page: import("@playwright/test").Page, y: number) {
  const box = (await page.getByLabel("그림 캔버스").boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * y);
  await page.mouse.down();
  for (let k = 1; k <= 15; k++)
    await page.mouse.move(box.x + box.width * (0.2 + 0.6 * (k / 15)), box.y + box.height * y);
  await page.mouse.up();
  await page.waitForTimeout(250);
}

/** 획이 지나간 자리의 평균 색 */
async function bandColor(page: import("@playwright/test").Page, y: number) {
  return page.evaluate((fy) => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const yy = Math.round(el.height * fy);
    const d = el
      .getContext("2d")!
      .getImageData(Math.round(el.width * 0.35), yy - 3, Math.round(el.width * 0.3), 6).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      r += d[i];
      g += d[i + 1];
      b += d[i + 2];
      n++;
    }
    return { r: r / n, g: g / n, b: b / n };
  }, y);
}

test("아크릴펜은 어두운 밑색을 덮는다(마커는 비친다)", async ({ page }) => {
  // 1) 검은 획 위에 노란 아크릴펜
  await setup(page, "아크릴펜", 50);
  await page.getByRole("button", { name: "색 1", exact: true }).click(); // 잉크(검정)
  await stroke(page, 0.35);
  await page.getByRole("button", { name: "색 9", exact: true }).click(); // 밝은 색(노랑 계열)
  const light = await page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    return el.width; // 색 확인용 더미(색은 아래 커버 판정으로 대체)
  });
  expect(light).toBeGreaterThan(0);
  await stroke(page, 0.35); // 같은 자리에 덧칠
  const acrylic = await bandColor(page, 0.35);

  // 2) 같은 순서를 마커로
  await setup(page, "마커", 50);
  await page.getByRole("button", { name: "색 1", exact: true }).click();
  await stroke(page, 0.35);
  await page.getByRole("button", { name: "색 9", exact: true }).click();
  await stroke(page, 0.35);
  const marker = await bandColor(page, 0.35);

  const lum = (c: { r: number; g: number; b: number }) => (c.r + c.g + c.b) / 3;
  console.log("COVER", JSON.stringify({ acrylic, marker }));
  // 아크릴펜으로 덮은 자리는 밝다(밑색 안 비침), 마커는 검정이 비쳐 어둡다
  expect(lum(acrylic), "아크릴펜은 밑색을 덮어 밝아야 한다").toBeGreaterThan(150);
  expect(lum(acrylic) - lum(marker), "마커보다 확실히 밝게 덮여야 한다").toBeGreaterThan(60);
});

test("같은 색을 덧그어도 얼룩·경계가 생기지 않는다", async ({ page }) => {
  await setup(page, "아크릴펜", 40);
  await page.getByRole("button", { name: "색 14", exact: true }).click();
  await stroke(page, 0.4);
  const once = await bandColor(page, 0.4);
  for (let i = 0; i < 3; i++) await stroke(page, 0.4); // 세 번 더 덧칠
  const many = await bandColor(page, 0.4);
  const diff =
    Math.abs(once.r - many.r) + Math.abs(once.g - many.g) + Math.abs(once.b - many.b);
  console.log("REPAINT", JSON.stringify({ once, many, diff: Math.round(diff) }));
  expect(diff, "덧칠해도 색이 진해지거나 얼룩지지 않아야 한다").toBeLessThan(24);
});

test("최소 굵기에서도 끊기지 않는다", async ({ page }) => {
  await setup(page, "아크릴펜", 1);
  await page.getByRole("button", { name: "색 1", exact: true }).click();
  await stroke(page, 0.5);
  const gaps = await page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const d = el.getContext("2d")!.getImageData(0, 0, el.width, el.height).data;
    const x0 = Math.round(el.width * 0.25);
    const x1 = Math.round(el.width * 0.75);
    let miss = 0;
    for (let x = x0; x < x1; x++) {
      let hit = false;
      for (let y = Math.round(el.height * 0.44); y < Math.round(el.height * 0.56); y++) {
        if (d[(y * el.width + x) * 4] < 200) {
          hit = true;
          break;
        }
      }
      if (!hit) miss++;
    }
    return miss;
  });
  console.log("MIN-SIZE gaps", gaps);
  expect(gaps, "획 중간에 빈 열(끊김)이 없어야 한다").toBeLessThan(3);
});
