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

/*
 * 무지개: 색이 dab 단위로 이어져야 한다.
 * 개선 전에는 hue를 "포인터 세그먼트"마다 갱신해서(≈15px) 같은 색 dab이 뭉치고
 * 경계마다 dab 원호가 그대로 보였다 = 구슬 목걸이(2026-07-25 3배 확대 실측).
 */
test("무지개: 색이 구슬처럼 뚝뚝 끊기지 않고 이어진다", async ({ page }) => {
  await setup(page);
  await page.getByRole("button", { name: "무지개", exact: true }).click();
  await page.getByLabel("브러시 굵기", { exact: true }).fill("20");
  const box = (await page.getByLabel("그림 캔버스").boundingBox())!;
  const y = box.y + box.height * 0.4;
  await page.mouse.move(box.x + box.width * 0.12, y);
  await page.mouse.down();
  // 포인터 이벤트를 성기게(30개) — 세그먼트 단위 갱신이면 여기서 색 계단이 드러난다
  for (let k = 1; k <= 30; k++)
    await page.mouse.move(box.x + box.width * (0.12 + 0.76 * (k / 30)), y);
  await page.mouse.up();
  await page.waitForTimeout(400);

  const hue = await page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const img = el.getContext("2d")!.getImageData(0, 0, el.width, el.height).data;
    const W = el.width;
    const cy = Math.round(el.height * 0.4);
    const hues: number[] = [];
    for (let x = Math.round(W * 0.2); x < Math.round(W * 0.8); x++) {
      const i = (cy * W + x) * 4;
      const r = img[i] / 255, g = img[i + 1] / 255, b = img[i + 2] / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
      if (d < 0.15) continue; // 무채색(획 밖) 제외
      let h = 0;
      if (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      hues.push(((h * 60) % 360 + 360) % 360);
    }
    // 인접 칼럼 hue 차(원형)
    const step: number[] = [];
    for (let i = 1; i < hues.length; i++) {
      let d = Math.abs(hues[i] - hues[i - 1]);
      if (d > 180) d = 360 - d;
      step.push(d);
    }
    step.sort((a, b) => a - b);
    return {
      n: hues.length,
      median: +(step[Math.floor(step.length / 2)] ?? 0).toFixed(3),
      p99: +(step[Math.floor(step.length * 0.99)] ?? 0).toFixed(3),
      span: +(Math.max(...hues) - Math.min(...hues)).toFixed(0),
    };
  });
  console.log("RAINBOW-HUE", JSON.stringify(hue));
  expect(hue.n, "무지개 획 픽셀").toBeGreaterThan(200);
  // 계단(세그먼트 경계의 색 점프)이 없어야 한다 — 세그먼트 갱신 시절엔 p99가 10°를 넘었다
  expect(hue.p99, "인접 칼럼 hue 점프(99%)").toBeLessThan(6);
  // 그러면서도 획 전체로는 색이 충분히 돈다(무지개다운 변화)
  expect(hue.span, "획 전체 hue 변화폭").toBeGreaterThan(120);
});
