import { test, expect } from "@playwright/test";

/*
 * 저장 갈래(2026-07-13 사용자 요청): 학급 코드로 입장했어도 "내 기기에 저장"이 따로 있어야 한다.
 *  · 손님(학급 없음) = 저장 버튼 하나(파일 다운로드)
 *  · 학생(학급 세션) = 갤러리로 보내기(주 버튼) + 내 기기에 저장(보조 버튼)
 */
test("손님은 저장 버튼 하나만 보인다", async ({ page }) => {
  await page.goto("/draw?mode=sketch");
  await page.getByLabel("그림 캔버스").waitFor();
  await expect(page.getByRole("button", { name: "저장하기" })).toBeVisible();
  await expect(page.getByRole("button", { name: "내 컴퓨터에 저장" })).toHaveCount(0);
});

test("학급으로 입장하면 갤러리 보내기와 내 기기 저장이 둘 다 있다", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    sessionStorage.setItem(
      "arton.student",
      JSON.stringify({
        token: "test.token.value",
        studentId: "s1",
        classId: "c1",
        className: "1학년 1반",
        nickname: "용감한 여우",
        classCode: "ABC234",
      }),
    );
  });
  await page.goto("/draw?mode=sketch");
  await page.getByLabel("그림 캔버스").waitFor();
  await expect(page.getByRole("button", { name: "우리 반 갤러리에 보내기" })).toBeVisible();
  await expect(page.getByRole("button", { name: "내 컴퓨터에 저장" })).toBeVisible();
});
