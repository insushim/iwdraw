import { test, expect } from "@playwright/test";

/*
 * 작품 제목(2026-09-01 요청: "학생들이 자기가 그린 작품에 제목을 달 수 있게").
 * 학급으로 입장한 학생만 제목을 묻는다(저장 = 갤러리 제출). 백엔드 없이도 UI 경로는
 * 전부 도는데, 제출이 로컬 저장으로 폴백되기 때문이다(hasBackend()=false).
 */
test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

const FAKE_SESSION = {
  token: "test.token.value",
  studentId: "stu-test",
  classId: "cls-test",
  className: "테스트반",
  nickname: "테스트",
  classCode: "TEST12",
};

async function enterAsStudent(page: import("@playwright/test").Page) {
  await page.addInitScript((s) => {
    sessionStorage.setItem("arton.student", JSON.stringify(s));
  }, FAKE_SESSION);
  await page.goto("/draw?mode=sketch&backend=2d");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: "새로 시작" });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(400);
}

test("학급 제출은 저장 전에 제목을 묻고, 건너뛸 수도 있다", async ({ page }) => {
  await enterAsStudent(page);
  // 학급으로 들어왔으니 저장 버튼은 "갤러리에 보내기"
  await page.getByRole("button", { name: "우리 반 갤러리에 보내기" }).click();
  const dialog = page.getByRole("dialog", { name: "그림 제목 정하기" });
  await expect(dialog, "저장을 누르면 제목 창이 먼저 뜬다").toBeVisible();

  // 30자 상한 — 아이가 아무리 길게 써도 카드가 깨지지 않는다
  const input = page.getByLabel("그림 제목", { exact: true });
  await input.fill("가".repeat(50));
  expect((await input.inputValue()).length, "입력 자체가 30자에서 막힌다").toBe(30);

  await input.fill("우리 강아지");
  await page.getByRole("button", { name: "이 제목으로 저장" }).click();
  await expect(dialog).toBeHidden();

  // 다시 저장하면 방금 쓴 제목이 그대로 채워져 있다(재저장마다 다시 쓰게 하지 않는다)
  await page.getByRole("button", { name: "우리 반 갤러리에 보내기" }).click();
  await expect(page.getByLabel("그림 제목", { exact: true })).toHaveValue("우리 강아지");

  // [그냥 저장]도 항상 있어야 한다 — 제목을 강제하면 저장이 막히는 아이가 생긴다
  await page.getByRole("button", { name: "그냥 저장" }).click();
  await expect(page.getByRole("dialog", { name: "그림 제목 정하기" })).toBeHidden();
});

test("혼자 그리기(학급 아님)에서는 제목을 묻지 않는다", async ({ page }) => {
  await page.goto("/draw?mode=sketch&backend=2d");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: "새로 시작" });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "저장하기" }).click();
  await page.waitForTimeout(500);
  expect(
    await page.getByRole("dialog", { name: "그림 제목 정하기" }).count(),
    "게스트 저장은 파일 다운로드라 제목 개념이 없다",
  ).toBe(0);
});
