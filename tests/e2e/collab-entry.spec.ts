import { test, expect } from "@playwright/test";

/*
 * 모둠(함께 그리기) 진입 UI(2026-07-16 요청: 학생이 직접 방을 만들고 코드로 들어가게).
 * 실시간 동기화(WebSocket)는 worker Durable Object가 필요해 이 하네스(next dev)에선 못 켠다 —
 * 여기서는 "방을 만들고/코드로 들어가고/나가는" 진입 흐름과 공유 코드 노출만 검증한다.
 */
test("함께 그리기: 새 방을 만들면 방 코드가 뜨고, 나가면 혼자 그리기로 돌아온다", async ({
  page,
}) => {
  await page.goto("/draw?mode=sketch");
  await page.getByLabel("그림 캔버스").waitFor();

  // 방에 있지 않을 땐 "함께 그리기" 버튼이 보인다
  const start = page.getByRole("button", { name: "함께 그리기" });
  await expect(start).toBeVisible();
  await start.click();

  // 새 모둠 방 만들기 → 협동 캔버스로 이동
  await page.getByRole("button", { name: /새 모둠 방 만들기/ }).click();
  await page.waitForURL(/room=/);

  // 헤더에 공유용 방 코드(4글자)가 뜬다
  const url = new URL(page.url());
  const room = url.searchParams.get("room")!;
  const shortCode = room.split("~")[1];
  expect(shortCode).toMatch(/^[A-Z0-9]{4}$/);
  await expect(page.getByText(shortCode, { exact: false })).toBeVisible();

  // 나가기 → room 없는 주소로 돌아오고 "함께 그리기" 버튼이 다시 보인다
  await page.getByRole("link", { name: "모둠 나가기" }).click();
  await page.waitForURL((u) => !u.searchParams.has("room"));
  await expect(page.getByRole("button", { name: "함께 그리기" })).toBeVisible();
});

test("함께 그리기: 친구 방 코드를 입력해 들어간다", async ({ page }) => {
  await page.goto("/draw?mode=sketch");
  await page.getByLabel("그림 캔버스").waitFor();
  await page.getByRole("button", { name: "함께 그리기" }).click();

  await page.getByRole("button", { name: /친구 방 들어가기/ }).click();
  const input = page.getByLabel("방 코드");
  await input.fill("k7mn"); // 소문자로 입력해도
  await expect(input).toHaveValue("K7MN"); // 대문자로 정규화된다
  await page.getByRole("button", { name: "들어가기" }).click();

  await page.waitForURL(/room=/);
  expect(new URL(page.url()).searchParams.get("room")).toContain("K7MN");
  await expect(page.getByText("K7MN", { exact: false })).toBeVisible();
});
