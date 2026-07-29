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

type Stat = { peak: number; cv: number; gaps: number; w: number; wcv: number };

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
      const out: Record<string, { peak: number; cv: number; gaps: number; w: number; wcv: number }> =
        {};
      for (const r of rows) {
        const cy = Math.round(H * r.yFrac);
        const half = Math.round(H * 0.04);
        const peaks: number[] = [];
        const widths: number[] = [];
        for (let x = Math.round(W * 0.25); x < Math.round(W * 0.75); x++) {
          let mx = 0;
          let w = 0;
          for (let y = cy - half; y <= cy + half; y++) {
            const v = Math.max(0, (bg - lum((y * W + x) * 4)) / bg);
            if (v > mx) mx = v;
            if (v >= 0.1) w++;
          }
          peaks.push(mx);
          widths.push(w);
        }
        const stat = (a: number[]) => {
          const m = a.reduce((s, v) => s + v, 0) / a.length;
          const sd = Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length);
          return { m, cv: sd / Math.max(1e-6, m) };
        };
        const p = stat(peaks);
        const w = stat(widths);
        out[r.name] = {
          peak: +p.m.toFixed(3),
          cv: +p.cv.toFixed(3),
          gaps: peaks.filter((v) => v < 0.02).length,
          w: +w.m.toFixed(2),
          wcv: +w.cv.toFixed(3),
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

  // ② 살살 그어도 보이는 선(실필압 하한 사상). 실측: 사상 없을 때 0.178 → 사상 후 0.22
  expect(m.A.peak, "약한 실필압 획의 농도").toBeGreaterThan(0.20);

  // ③ 그래도 필압 표현력은 남는다 — 세게 누르면 확실히 진하다
  expect(m.C.peak / m.A.peak, "센 필압/약한 필압 농도비").toBeGreaterThan(1.25);

  /*
   * ④ 붓펜(필압에 가장 민감한 도구)으로 dropout을 다시 본다.
   * 붓펜은 필압이 굵기에 두 번 곱해져(sizePressure 0.85 × (0.45+pr·0.7)), 필압 0을
   * 그대로 받으면 **획 굵기가 규칙적으로 잘록해진다** — 농도만 보는 위 게이트는 이걸
   * 못 잡는다(2026-07-29 교차검증 지적). 접촉 중 0은 센서 dropout으로 보고 직전 필압을
   * 유지하는지 여기서 확인한다.
   */
  await page.getByRole("button", { name: "전체 지우기" }).click();
  await page.getByRole("button", { name: "정말 지울래요" }).click();
  await page.waitForTimeout(250);
  await page.getByRole("button", { name: "붓펜", exact: true }).click();
  await page.getByLabel("브러시 굵기", { exact: true }).fill("25");
  await stroke(0.3, 0.12, false, 40); // D: dropout 없음
  await stroke(0.7, 0.12, true, 40); // E: 3번에 1번 필압 0
  await page.waitForTimeout(200);
  const ink: Record<string, Stat> = await measure([
    { name: "D", yFrac: 0.3 },
    { name: "E", yFrac: 0.7 },
  ]);
  console.log("PEN-INKBRUSH", JSON.stringify(ink));
  expect(Math.abs(ink.E.w - ink.D.w) / ink.D.w, "붓펜 dropout 획의 굵기 차이").toBeLessThan(0.1);
  expect(ink.E.wcv, "붓펜 dropout 획의 굵기 요동").toBeLessThan(ink.D.wcv + 0.05);

  /*
   * ⑤ 붓펜의 **필압 폭 범위**를 잠근다.
   * 실필압 하한 사상(penPressure)은 "안 보이는 선"을 막는 대신 가장 약한 접촉의 선을
   * 굵게 만든다 — 교차검증에서 두 계열이 "붓펜 삐침이 죽는다"고 지적한 트레이드오프다.
   * 하한을 0.25 → 0.15로 낮춰 수용했지만, 누군가 다시 올리면 여기서 걸린다.
   * 재는 것 = "살짝 댄 획"과 "꾹 누른 획"의 폭이 충분히 벌어지는가.
   *
   * 실측한 트레이드오프(2026-07-29 A/B, 붓펜 굵기25):
   *   사상 없음: 약필압 폭 3.00 · 센필압 28.05 → 폭비 9.4배 (대신 연필 약필압 획이 안 보임)
   *   사상 적용: 4.90 · 29.0 → 폭비 5.9배 (연필 약필압 농도 0.18 → 0.22)
   * 즉 가장 가는 갈필이 63% 굵어진 대신 표현 범위는 6배가 남았다. 게이트 2.2는 그 절반 아래.
   */
  await page.getByRole("button", { name: "전체 지우기" }).click();
  await page.getByRole("button", { name: "정말 지울래요" }).click();
  await page.waitForTimeout(250);
  await stroke(0.3, 0.04, false, 20); // F: 붓끝만 스친 갈필
  await stroke(0.7, 0.95, false, 20); // G: 꾹 누른 획
  await page.waitForTimeout(200);
  const range: Record<string, Stat> = await measure([
    { name: "F", yFrac: 0.3 },
    { name: "G", yFrac: 0.7 },
  ]);
  console.log("PEN-INK-RANGE", JSON.stringify(range));
  expect(range.G.w / range.F.w, "붓펜 센필압/약필압 폭비").toBeGreaterThan(2.2);
});
