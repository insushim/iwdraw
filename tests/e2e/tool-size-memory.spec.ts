import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });
test.setTimeout(90_000);

/*
 * 지우개·번짐 굵기 개별 기억(2026-07-14 요청: "매번 다시 맞추기 불편하네").
 * 그림 붓들끼리는 굵기를 공유하고, 지우개·번짐은 각자 값을 따로 기억한다.
 */
test("지우개·번짐은 굵기를 따로 기억하고, 그림 붓은 공유한다", async ({ page }) => {
  await page.goto("/draw?mode=sketch&backend=gl");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(300);

  const slider = page.getByLabel("브러시 굵기", { exact: true });
  const pick = (name: string) => page.getByRole("button", { name, exact: true }).click();
  const size = async () => (await slider.inputValue()).trim();

  // 그림 붓: 연필 12
  await pick("연필");
  await slider.fill("12");
  expect(await size()).toBe("12");

  // 지우개는 자기 굵기(기본 34)로 들어오고, 60으로 바꿔도 연필에 영향 없음
  await pick("지우개");
  expect(await size(), "지우개는 그림 붓 굵기를 물려받지 않는다").toBe("34");
  await slider.fill("60");

  await pick("연필");
  expect(await size(), "연필은 아까 쓰던 12 그대로").toBe("12");

  await pick("마커"); // 그림 붓끼리는 굵기 공유
  expect(await size(), "그림 붓끼리는 공용 굵기").toBe("12");
  await slider.fill("28");

  await pick("지우개");
  expect(await size(), "지우개는 자기가 쓰던 60을 기억").toBe("60");

  // 번짐도 따로
  await pick("번짐");
  expect(await size(), "번짐도 자기 굵기(기본 34)").toBe("34");
  await slider.fill("50");

  await pick("지우개");
  expect(await size(), "번짐 변경이 지우개를 건드리지 않는다").toBe("60");
  await pick("번짐");
  expect(await size()).toBe("50");
  await pick("연필");
  expect(await size(), "그림 붓은 마커에서 바꾼 28 유지").toBe("28");
});
