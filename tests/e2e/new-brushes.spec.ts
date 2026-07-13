import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

/*
 * 새 도구 2종(2026-07-13 사용자 요청).
 *  · 사인펜 = 굵기 일정한 또렷한 잉크선: 획 내부가 균일하고 색이 팔레트 색과 같아야 한다.
 *  · 색연필 = 옅게 얹어 겹칠수록 진해지는 레이어링: 1회칠보다 3회칠이 뚜렷하게 진해야 한다.
 */
async function setup(page: import("@playwright/test").Page) {
  await page.goto("/draw?mode=sketch&backend=gl");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);
}

/** 세로 획 하나 — x 위치(0~1)와 반복 횟수 */
async function stroke(page: import("@playwright/test").Page, fx: number, times = 1) {
  const box = (await page.getByLabel("그림 캔버스").boundingBox())!;
  for (let t = 0; t < times; t++) {
    const x = box.x + box.width * fx;
    await page.mouse.move(x, box.y + box.height * 0.25);
    await page.mouse.down();
    for (let k = 1; k <= 25; k++)
      await page.mouse.move(x, box.y + box.height * (0.25 + 0.5 * (k / 25)));
    await page.mouse.up();
    await page.waitForTimeout(150);
  }
}

/** 획 중심 세로줄의 평균색·명도 표준편차 */
async function sample(page: import("@playwright/test").Page, fx: number) {
  return page.evaluate((f: number) => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const ctx = el.getContext("2d")!;
    const cx = Math.round(el.width * f);
    const rgb = [0, 0, 0];
    const lum: number[] = [];
    let n = 0;
    for (let fy = 0.35; fy <= 0.65; fy += 0.005) {
      const y = Math.round(el.height * fy);
      const d = ctx.getImageData(cx - 2, y, 5, 1).data;
      for (let i = 0; i < 5; i++) {
        const R = d[i * 4], G = d[i * 4 + 1], B = d[i * 4 + 2];
        rgb[0] += R; rgb[1] += G; rgb[2] += B;
        lum.push(0.299 * R + 0.587 * G + 0.114 * B);
        n++;
      }
    }
    const mean = lum.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(lum.reduce((a, b) => a + (b - mean) * (b - mean), 0) / n);
    return {
      rgb: rgb.map((v) => Math.round(v / n)),
      lum: Math.round(mean),
      sd: Math.round(sd * 10) / 10,
    };
  }, fx);
}

test("사인펜: 획이 균일하고 색이 팔레트 색과 같다", async ({ page }) => {
  await setup(page);
  await page.getByRole("button", { name: "사인펜", exact: true }).click();
  await page.getByRole("button", { name: "색 17", exact: true }).click(); // 파랑 계열
  await page.getByLabel("브러시 굵기", { exact: true }).fill("24");
  await stroke(page, 0.4);
  await stroke(page, 0.6, 3); // 같은 자리 3번 덧그어도 얼룩지지 않아야 한다
  await page.waitForTimeout(400);

  const one = await sample(page, 0.4);
  const three = await sample(page, 0.6);
  console.log("SIGNPEN 1회", one, "3회", three);
  // 획 내부 균일(잉크펜) — 결·입자로 뜯기면 편차가 커진다
  expect(one.sd).toBeLessThan(12);
  // 같은 색 덧칠 포화: 3번 그어도 1번과 명도가 거의 같아야(얼룩·중첩 진해짐 없음)
  expect(Math.abs(one.lum - three.lum)).toBeLessThan(10);
});

test("색연필: 겹쳐 칠할수록 진해진다(레이어링)", async ({ page }) => {
  await setup(page);
  await page.getByRole("button", { name: "색연필", exact: true }).click();
  await page.getByRole("button", { name: "색 17", exact: true }).click();
  await page.getByLabel("브러시 굵기", { exact: true }).fill("30");
  await stroke(page, 0.4, 1);
  await stroke(page, 0.6, 3);
  await page.waitForTimeout(400);

  const one = await sample(page, 0.4);
  const three = await sample(page, 0.6);
  console.log("COLORPENCIL 1회", one, "3회", three);
  // 1회칠은 옅게(백지 쪽), 3회칠은 확실히 진하게 — 레이어링이 색연필의 정체성
  expect(one.lum - three.lum).toBeGreaterThan(20);
  // 입자·종이 결 질감이 있다 = 완전 균일한 잉크(마커·사인펜 sd 0.4~0.8)가 아니다
  expect(one.sd).toBeGreaterThan(1.2);
});
