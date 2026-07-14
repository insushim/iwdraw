import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });
test.setTimeout(120_000);

/*
 * 선따기 선 굵기·연결성 실측(2026-07-14 사용자 요청: "선을 조금 더 얇게, 대신 잘 보이고 끊기면 안 됨").
 *  · 굵기  = 잉크 픽셀 / 가로 방향 선 조각 수 = 평균 선 폭(px)
 *  · 진하기 = 잉크 비율(너무 낮으면 안 보인다)
 *  · 끊김  = 8이웃 연결 성분 수(늘어나면 선이 조각났다는 뜻)
 */
test("선따기 선: 얇지만 잘 보이고 끊기지 않는다", async ({ page }) => {
  await page.goto("/draw?mode=sketch");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);

  // 사진 가져오기 → 자동 선따기.
  // 입력 = 아이가 찍을 법한 합성 사진(색면 + 부드러운 그라데이션 + 가는 선). 저장소 이미지(og.png)는
  // 검은 면적이 커서 "선 폭" 측정이 오염된다.
  await page.getByRole("button", { name: /불러오기/ }).click();
  await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 900;
    c.height = 700;
    const x = c.getContext("2d")!;
    const g = x.createLinearGradient(0, 0, 0, 700);
    g.addColorStop(0, "#cfe8ff");
    g.addColorStop(1, "#fdf6e3");
    x.fillStyle = g;
    x.fillRect(0, 0, 900, 700);
    x.fillStyle = "#7ec850"; // 잔디
    x.fillRect(0, 520, 900, 180);
    x.fillStyle = "#f2b134"; // 집 벽
    x.fillRect(280, 280, 320, 240);
    x.fillStyle = "#e2574c"; // 지붕
    x.beginPath();
    x.moveTo(250, 285);
    x.lineTo(440, 160);
    x.lineTo(630, 285);
    x.closePath();
    x.fill();
    x.fillStyle = "#8ec5f0"; // 창문
    x.fillRect(330, 330, 90, 80);
    x.fillRect(470, 330, 90, 80);
    x.fillStyle = "#f7e967"; // 해
    x.beginPath();
    x.arc(760, 130, 70, 0, Math.PI * 2);
    x.fill();
    x.strokeStyle = "#5a3a1e"; // 나무 줄기(가는 선)
    x.lineWidth = 6;
    x.beginPath();
    x.moveTo(140, 520);
    x.lineTo(140, 380);
    x.stroke();
    const blob = await new Promise<Blob>((res) => c.toBlob((b) => res(b!), "image/png"));
    const file = new File([blob], "photo.png", { type: "image/png" });
    const dt = new DataTransfer();
    dt.items.add(file);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.getByRole("button", { name: /자동 선따기/ }).click();
  await page.getByLabel("그림 캔버스").waitFor();
  await page.waitForTimeout(2500); // 변환 + 도안 로드

  const m = await page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const w = el.width;
    const h = el.height;
    const d = el.getContext("2d")!.getImageData(0, 0, w, h).data;
    const ink = new Uint8Array(w * h);
    let inkN = 0;
    for (let i = 0; i < w * h; i++) {
      if (d[i * 4] < 150) {
        ink[i] = 1;
        inkN++;
      }
    }
    /* 선 폭 = 픽셀마다 (가로 런 길이, 세로 런 길이) 중 짧은 쪽 → 그 중앙값.
     * 가로 엣지는 가로 런이 수백 px이므로 한 방향만 재면 굵기가 부풀려진다. */
    const runH = new Uint16Array(w * h);
    const runV = new Uint16Array(w * h);
    for (let y = 0; y < h; y++) {
      let x = 0;
      while (x < w) {
        if (!ink[y * w + x]) {
          x++;
          continue;
        }
        let e = x;
        while (e < w && ink[y * w + e]) e++;
        for (let k = x; k < e; k++) runH[y * w + k] = e - x;
        x = e;
      }
    }
    for (let x = 0; x < w; x++) {
      let y = 0;
      while (y < h) {
        if (!ink[y * w + x]) {
          y++;
          continue;
        }
        let e = y;
        while (e < h && ink[e * w + x]) e++;
        for (let k = y; k < e; k++) runV[k * w + x] = e - y;
        y = e;
      }
    }
    const widths: number[] = [];
    for (let i = 0; i < w * h; i++)
      if (ink[i]) widths.push(Math.min(runH[i], runV[i]));
    widths.sort((a, b) => a - b);
    const medW = widths.length ? widths[Math.floor(widths.length / 2)] : 0;
    // 8이웃 연결 성분 수(4px 이하 티끌은 제외 — 노이즈)
    const seen = new Uint8Array(w * h);
    let comps = 0;
    const stack: number[] = [];
    for (let i = 0; i < w * h; i++) {
      if (!ink[i] || seen[i]) continue;
      let size = 0;
      stack.push(i);
      seen[i] = 1;
      while (stack.length) {
        const p = stack.pop()!;
        size++;
        const x = p % w;
        const y = (p / w) | 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const q = ny * w + nx;
            if (ink[q] && !seen[q]) {
              seen[q] = 1;
              stack.push(q);
            }
          }
      }
      if (size > 4) comps++;
    }
    return {
      inkPct: Math.round((inkN / (w * h)) * 10000) / 100,
      thickness: medW,
      comps,
    };
  });

  console.log("LINEART", JSON.stringify(m));
  /* 개선 전(단일 임계값 + 반강도 팽창): 선 폭 중앙값 16px · 잉크 4.53% · 성분 4개
   * 개선 후(비최대 억제 + 이력 임계값 + 한 겹 옅은 덧대기): 선 폭 5px · 잉크 1.49% · 성분 4개
   * = 3배 얇아졌는데 선은 끊기지 않았다(성분 수 그대로). */
  expect(m.inkPct, "선이 보여야 한다(잉크 비율 %)").toBeGreaterThan(0.7);
  expect(m.thickness, "선 폭 중앙값(px) — 얇아야 한다").toBeLessThanOrEqual(6);
  expect(m.thickness, "선이 사라지면 안 된다").toBeGreaterThan(1);
  expect(m.comps, "연결 성분 수 — 늘면 선이 조각난 것").toBeLessThan(20);
});
