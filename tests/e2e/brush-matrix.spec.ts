import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });
test.setTimeout(180_000);

/*
 * 브러시 전수 격자 게이트 — "새 브러시를 추가하면 자동으로 검증 대상이 된다".
 *
 * 지금까지는 브러시마다 사람이 스펙을 따로 썼다(new-brushes·acrylic-pen·crayon-color·
 * glitter-pen…). 그래서 새 도구를 추가하고 스펙을 안 쓰면 **그 도구에는 게이트가 아예
 * 없다**. 여기서는 도구 팔레트(role=toolbar)를 그대로 순회하므로 BRUSH_META에 한 줄만
 * 추가해도 자동으로 끌려 들어온다.
 *
 * 재는 것 — 어떤 브러시든 지켜야 하는 최소 계약 두 개:
 *   ① 끊기지 않는다(획 구간에 잉크 없는 열이 없다)
 *   ② 굵기를 올리면 굵어진다(슬라이더 죽은 구간 없음)
 * 도구 고유의 룩(질감·색·번짐)은 각 브러시 전용 스펙이 계속 담당한다.
 *
 * Procreate Brush Studio / MyPaint 설정 체계를 참고해 "브러시가 갖춰야 할 계약"을
 * 코드 밖(테스트)에 둔 것 — 새 브러시의 값을 고를 때 이 격자 출력이 기준표가 된다.
 */

/** 획을 그리지 않거나(선택·채우기) 잉크가 아닌(지우개·번짐) 도구 */
const NOT_A_STROKE = ["클릭", "페인트통", "스포이트", "지우개", "번짐"];

type Stat = { peak: number; w10: number; gaps: number };

async function openEditor(page: import("@playwright/test").Page) {
  await page.goto("/draw?mode=sketch&backend=gl");
  const canvas = page.getByLabel("그림 캔버스");
  await canvas.waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "색 1", exact: true }).click();
  return canvas;
}

/** 획 단면 — 농도(peak) · 폭(w10) · 끊긴 열(gaps) */
function measure(page: import("@playwright/test").Page, rows: { name: string; yFrac: number }[]) {
  return page.evaluate((rows) => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const img = el.getContext("2d")!.getImageData(0, 0, el.width, el.height).data;
    const W = el.width;
    const H = el.height;
    const lum = (i: number) => 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2];
    let bgSum = 0;
    let bgN = 0;
    for (let y = 2; y < H; y += 7)
      for (let x = 2; x < 20; x += 3) {
        bgSum += lum((y * W + x) * 4);
        bgN++;
      }
    const bg = bgSum / bgN;
    const out: Record<string, { peak: number; w10: number; gaps: number }> = {};
    for (const r of rows) {
      const cy = Math.round(H * r.yFrac);
      const half = Math.round(H * 0.045);
      const peaks: number[] = [];
      const widths: number[] = [];
      for (let x = Math.round(W * 0.2); x < Math.round(W * 0.8); x++) {
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
      const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
      out[r.name] = {
        peak: +mean(peaks).toFixed(3),
        w10: +mean(widths).toFixed(2),
        // 에어브러시처럼 아주 옅은 도구까지 담으려고 임계는 낮게(0.02) — "아예 안 찍힌 열"만 센다
        gaps: peaks.filter((v) => v < 0.02).length,
      };
    }
    return out;
  }, rows);
}

test("모든 브러시: 끊기지 않고, 굵기를 올리면 굵어진다", async ({ page }) => {
  const canvas = await openEditor(page);
  const box = (await canvas.boundingBox())!;

  const stroke = async (yFrac: number) => {
    const y = box.y + box.height * yFrac;
    const x0 = box.x + box.width * 0.12;
    const x1 = box.x + box.width * 0.88;
    await page.mouse.move(x0, y);
    await page.mouse.down();
    for (let k = 1; k <= 30; k++) await page.mouse.move(x0 + (x1 - x0) * (k / 30), y);
    await page.mouse.up();
    await page.waitForTimeout(120);
  };
  const clear = async () => {
    await page.getByRole("button", { name: "전체 지우기" }).click();
    await page.getByRole("button", { name: "정말 지울래요" }).click();
    await page.waitForTimeout(200);
  };

  // 팔레트를 그대로 읽는다 — 새 브러시가 늘면 여기서 자동으로 늘어난다
  const labels = (
    await page.getByRole("toolbar", { name: "그리기 도구" }).getByRole("button").all()
  ).map((b) => b.getAttribute("aria-label"));
  const names = (await Promise.all(labels)).filter(
    (n): n is string => !!n && !NOT_A_STROKE.includes(n),
  );
  expect(names.length, "획을 긋는 브러시 수").toBeGreaterThan(8);

  const matrix: Record<string, { thin: Stat; thick: Stat }> = {};
  for (const name of names) {
    await page.getByRole("button", { name, exact: true }).click();
    await page.getByLabel("브러시 굵기", { exact: true }).fill("2");
    await stroke(0.3);
    await page.getByLabel("브러시 굵기", { exact: true }).fill("12");
    await stroke(0.68);
    await page.waitForTimeout(150);
    const m = await measure(page, [
      { name: "thin", yFrac: 0.3 },
      { name: "thick", yFrac: 0.68 },
    ]);
    matrix[name] = { thin: m["thin"], thick: m["thick"] };
    await clear();
  }
  console.log("BRUSH-MATRIX", JSON.stringify(matrix));

  for (const name of names) {
    const { thin, thick } = matrix[name];
    // ① 끊김 — 얇게 그어도 획이 점선이 되면 안 된다
    expect(thin.gaps, `${name} 굵기2 끊긴 열`).toBeLessThan(5);
    expect(thick.gaps, `${name} 굵기12 끊긴 열`).toBeLessThan(5);
    // ② 굵기 단조 — 하한 압축(softFloorSize)이 깨지면 여기서 걸린다
    expect(thick.w10, `${name} 굵기12 폭 > 굵기2 폭`).toBeGreaterThan(thin.w10 + 0.5);
    // 아예 안 그려지는 브러시(설정 오타로 alpha 0 등)를 잡는 최소 잉크
    expect(thin.peak, `${name} 굵기2 농도`).toBeGreaterThan(0.02);
  }
});

/*
 * 속도 반응 — "필압 없는 기기에서 도구를 가르는 축".
 *
 * 웨일북·크롬북·마우스·손가락은 필압이 오지 않는다. 그래서 얇은 굵기에서 폭이 하한에
 * 눌리는 순간 도구를 구별할 근거가 사라진다(2026-07-25 사용자 지적의 잔여분).
 * cfg.speedAlpha/speedSize/speedSpacing은 그 자리를 메우는 축이다 —
 * 사인펜은 잉크가 못 따라와 옅고 끊기고, 마커는 잉크가 풍부해 거의 그대로.
 *
 * 이 게이트가 지키는 것은 "속도에 반응한다"가 아니라 **"브러시마다 다르게 반응한다"**.
 */
test("속도 반응이 브러시마다 다르다(필압 없는 기기의 개성 축)", async ({ page }) => {
  const canvas = await openEditor(page);
  const box = (await canvas.boundingBox())!;

  /*
   * ⚠️ page.mouse.move로는 "빠른 획"을 만들 수 없다 — CDP 왕복 때문에 가장 빠르게 보내도
   * 이벤트 간격이 77~150ms(실측), 즉 0.25px/ms로 사람이 천천히 긋는 속도보다 느리다.
   * 그래서 포인터 이벤트를 페이지 안에서 직접 발사한다(합성 이벤트여도 그리기는 정상 —
   * PointerHandler.capture가 합성 포인터의 캡처 실패를 이미 무시한다).
   * 지연 2ms ≈ 13px/ms(빠른 손), 120ms ≈ 0.2px/ms(또박또박).
   */
  const stroke = (yFrac: number, delay: number) =>
    page.evaluate(
      async ({ yFrac, delay }) => {
        const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
        const r = el.getBoundingClientRect();
        const y = r.top + r.height * yFrac;
        const x0 = r.left + r.width * 0.15;
        const x1 = r.left + r.width * 0.85;
        const fire = (type: string, x: number, buttons: number) =>
          el.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              cancelable: true,
              pointerId: 1,
              isPrimary: true,
              pointerType: "mouse",
              buttons,
              clientX: x,
              clientY: y,
            }),
          );
        fire("pointerdown", x0, 1);
        for (let k = 1; k <= 24; k++) {
          fire("pointermove", x0 + (x1 - x0) * (k / 24), 1);
          await new Promise((res) => setTimeout(res, delay));
        }
        fire("pointerup", x1, 0);
      },
      { yFrac, delay },
    );
  const clear = async () => {
    await page.getByRole("button", { name: "전체 지우기" }).click();
    await page.getByRole("button", { name: "정말 지울래요" }).click();
    await page.waitForTimeout(200);
  };

  const BRUSHES = ["사인펜", "마커", "연필", "크레용"];
  const ratio: Record<string, number> = {};
  const raw: Record<string, { slow: number; fast: number }> = {};
  for (const name of BRUSHES) {
    await page.getByRole("button", { name, exact: true }).click();
    await page.getByLabel("브러시 굵기", { exact: true }).fill("3");
    await stroke(0.3, 120); // 또박또박
    await stroke(0.68, 2); // 빠르게
    await page.waitForTimeout(200);
    const m = await measure(page, [
      { name: "slow", yFrac: 0.3 },
      { name: "fast", yFrac: 0.68 },
    ]);
    // 잉크량 대리 지표 = 평균 농도 × 폭
    const ink = (s: Stat) => s.peak * Math.max(0.5, s.w10);
    raw[name] = { slow: +ink(m["slow"]).toFixed(3), fast: +ink(m["fast"]).toFixed(3) };
    ratio[name] = +(ink(m["fast"]) / ink(m["slow"])).toFixed(3);
    await clear();
  }
  console.log("SPEED-RESPONSE", JSON.stringify({ ratio, raw }));

  // 마커는 잉크가 풍부해 속도와 거의 무관해야 한다(speedAlpha 0.1)
  expect(ratio["마커"], "마커 빠름/느림 잉크비").toBeGreaterThan(0.82);
  // 사인펜은 눈에 띄게 옅어져야 한다(speedAlpha 0.32 + speedSpacing 0.22)
  expect(ratio["사인펜"], "사인펜 빠름/느림 잉크비").toBeLessThan(0.9);
  // 핵심 — 두 도구의 반응이 실제로 갈린다. speed* 값을 0으로 되돌리면 이 줄이 깨진다.
  expect(
    ratio["마커"] - ratio["사인펜"],
    `속도 반응 차이(마커 ${ratio["마커"]} vs 사인펜 ${ratio["사인펜"]})`,
  ).toBeGreaterThan(0.05);
});
