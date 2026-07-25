import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

/*
 * 굵기 슬라이더가 선형 1~128이라 실사용 구간(1~30)이 트랙의 23%에 뭉쳐 있었다
 * (2026-07-25 조작 실측 — 3과 8을 손가락으로 갈라내기 어렵다).
 * 제곱 매핑으로 트랙 절반이 1~33을 담당한다.
 *
 * ⚠️ "브러시 굵기"는 이제 숫자 입력이다(슬라이더 값은 위치라서 굵기가 아니다).
 *   기존 34곳의 fill("16")/inputValue()는 그대로 굵기를 뜻한다 — 오히려 정확해졌다.
 */
test("굵기 슬라이더가 얇은 쪽에 트랙을 더 준다", async ({ page }) => {
  await page.goto("/draw?mode=sketch&backend=gl");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);

  const num = page.getByLabel("브러시 굵기", { exact: true });
  const slider = page.getByLabel("브러시 굵기 슬라이더", { exact: true });
  const max = Number(await slider.getAttribute("max"));

  // 숫자로 굵기를 정하면 슬라이더는 그 굵기의 "위치"를 가리킨다
  await num.fill("8");
  await page.waitForTimeout(80);
  const at8 = Number(await slider.inputValue()) / max;
  await num.fill("33");
  await page.waitForTimeout(80);
  const at33 = Number(await slider.inputValue()) / max;
  console.log("SLIDER-POS", JSON.stringify({ at8, at33 }));
  // 선형이었다면 8 → 0.055, 33 → 0.25. 제곱 매핑이면 8 → 0.23, 33 → 0.5
  expect(at8, "굵기 8의 트랙 위치").toBeGreaterThan(0.15);
  expect(at33, "굵기 33의 트랙 위치(트랙 절반쯤)").toBeGreaterThan(0.42);
  expect(at33).toBeLessThan(0.58);

  // 슬라이더를 트랙 절반으로 옮기면 30대 굵기
  await slider.fill(String(Math.round(max / 2)));
  await page.waitForTimeout(80);
  expect(Number(await num.inputValue())).toBeGreaterThan(25);
  expect(Number(await num.inputValue())).toBeLessThan(40);

  // 양 끝은 정확히 1과 128
  await slider.fill("0");
  await page.waitForTimeout(80);
  expect(await num.inputValue()).toBe("1");
  await slider.fill(String(max));
  await page.waitForTimeout(80);
  expect(await num.inputValue()).toBe("128");

  // 화살표 키는 위치 1칸이 아니라 굵기 1칸(얇은 쪽에서 위치 1칸은 변화 0)
  await num.fill("4");
  await page.waitForTimeout(80);
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(80);
  expect(await num.inputValue()).toBe("5");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(80);
  expect(await num.inputValue()).toBe("3");
});
