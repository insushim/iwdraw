import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });
test.setTimeout(120_000);

/*
 * 스타일러스 실필압 회귀 가드 (2026-07-29 폰 실사용 제보: "아주 천천히 그으면 점선").
 *
 * 원인은 PointerHandler의 필압 분기였다 — 조건이 `e.pointerType === "pen" && e.pressure > 0`
 * 이라, 펜이 약한 접촉에서 **간헐적으로 0을 보고**하면 그 순간만 조용히 속도 기반 필압
 * 시뮬로 폴백했다. 시뮬값은 **느릴수록 커져서 최대 0.85** — 실필압 0.1대의 옅은 획 위에
 * 진한 점이 규칙적으로 찍힌다(= 점선). 빠르게 그으면 시뮬값이 0.35~0.5로 내려와
 * 실필압과 비슷해지므로 증상이 사라진다("천천히 그을 때만"의 정체).
 *
 * 여기서 재는 것:
 *  ① 필압 0이 섞여도 획이 달라지지 않는다(폴백 금지) — 이게 점선의 직접 원인
 *  ② 살살 그은 선도 보인다(실필압 하한 사상) — 안 보이는 선은 결국 끊긴 선으로 읽힌다
 *  ③ 그래도 필압 표현력은 남는다(세게 = 확실히 진하게)
 */

type Stat = { peak: number; cv: number; gaps: number };

test("펜 실필압: 0이 섞여도 획이 흔들리지 않고, 약한 필압도 보인다", async ({ page }) => {
  await page.goto("/draw?mode=sketch&backend=gl");
  const canvas = page.getByLabel("그림 캔버스");
  await canvas.waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "색 1", exact: true }).click();
  await page.getByRole("button", { name: "연필", exact: true }).click();
  await page.getByLabel("브러시 굵기", { exact: true }).fill("3");

  /*
   * 실제 시간 간격으로 페이지 안에서 포인터 이벤트를 쏜다 — page.mouse로는 pointerType도
   * pressure도 지정할 수 없고, 이벤트 간격이 77~150ms로 벌어져 "천천히"를 못 만든다.
   * dropZero = 3번에 1번 pressure 0(약한 접촉에서 펜이 실제로 하는 짓).
   */
  const stroke = (yFrac: number, pressure: number, dropZero: boolean, delay: number) =>
    page.evaluate(
      async ({ yFrac, pressure, dropZero, delay }) => {
        const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
        const r = el.getBoundingClientRect();
        const y = r.top + r.height * yFrac;
        const x0 = r.left + r.width * 0.15;
        const x1 = r.left + r.width * 0.85;
        const steps = 60;
        const fire = (type: string, x: number, buttons: number, pr: number) =>
          el.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              cancelable: true,
              pointerId: 3,
              isPrimary: true,
              pointerType: "pen",
              buttons,
              pressure: pr,
              clientX: x,
              clientY: y,
            }),
          );
        fire("pointerdown", x0, 1, pressure);
        for (let k = 1; k <= steps; k++) {
          await new Promise((res) => setTimeout(res, delay));
          fire("pointermove", x0 + ((x1 - x0) * k) / steps, 1, dropZero && k % 3 === 0 ? 0 : pressure);
        }
        fire("pointerup", x1, 0, 0);
      },
      { yFrac, pressure, dropZero, delay },
    );

  const measure = (rows: { name: string; yFrac: number }[]) =>
    page.evaluate((rows: { name: string; yFrac: number }[]) => {
      const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
      const W = el.width;
      const H = el.height;
      const img = el.getContext("2d")!.getImageData(0, 0, W, H).data;
      const lum = (i: number) => 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2];
      let bg = 0;
      let n = 0;
      for (let y = 2; y < H; y += 7)
        for (let x = 2; x < 20; x += 3) {
          bg += lum((y * W + x) * 4);
          n++;
        }
      bg /= n;
      const out: Record<string, { peak: number; cv: number; gaps: number }> = {};
      for (const r of rows) {
        const cy = Math.round(H * r.yFrac);
        const half = Math.round(H * 0.04);
        const peaks: number[] = [];
        for (let x = Math.round(W * 0.25); x < Math.round(W * 0.75); x++) {
          let mx = 0;
          for (let y = cy - half; y <= cy + half; y++)
            mx = Math.max(mx, Math.max(0, (bg - lum((y * W + x) * 4)) / bg));
          peaks.push(mx);
        }
        const m = peaks.reduce((s, v) => s + v, 0) / peaks.length;
        const sd = Math.sqrt(peaks.reduce((s, v) => s + (v - m) ** 2, 0) / peaks.length);
        out[r.name] = {
          peak: +m.toFixed(3),
          cv: +(sd / Math.max(1e-6, m)).toFixed(3),
          gaps: peaks.filter((v) => v < 0.02).length,
        };
      }
      return out;
    }, rows);

  // 아주 천천히(이벤트 간격 40ms) — 폴백 시뮬값이 최대(0.85)로 붙는 조건
  await stroke(0.25, 0.12, false, 40); // A: 약한 실필압, 0 없음
  await stroke(0.5, 0.12, true, 40); // B: 같은 필압인데 3번에 1번 0 보고
  await stroke(0.75, 0.9, false, 40); // C: 세게 누른 획
  await page.waitForTimeout(200);
  const m: Record<string, Stat> = await measure([
    { name: "A", yFrac: 0.25 },
    { name: "B", yFrac: 0.5 },
    { name: "C", yFrac: 0.75 },
  ]);
  console.log("PEN-PRESSURE", JSON.stringify(m));

  // ① 핵심 — pressure 0이 섞여도 획이 사실상 같아야 한다.
  //    수정 전 실측(폰 뷰포트): A peak 0.200/cv 0.108 vs B peak 0.257/cv 0.170(+57%).
  //    폴백이 살아나면 B가 A보다 진해지고 열별 농도 변동이 뛴다.
  expect(Math.abs(m.B.peak - m.A.peak) / m.A.peak, "필압 0 섞인 획의 농도 차이").toBeLessThan(0.12);
  expect(m.B.cv, "필압 0 섞인 획의 열별 농도 변동(점선성)").toBeLessThan(0.13);
  expect(m.A.gaps + m.B.gaps, "끊긴 열").toBe(0);

  // ② 살살 그어도 보이는 선(실필압 하한 사상). 수정 전 0.20 → 후 0.28(폰 백킹 실측)
  expect(m.A.peak, "약한 실필압 획의 농도").toBeGreaterThan(0.22);

  // ③ 그래도 필압 표현력은 남는다 — 세게 누르면 확실히 진하다
  expect(m.C.peak / m.A.peak, "센 필압/약한 필압 농도비").toBeGreaterThan(1.25);
});
