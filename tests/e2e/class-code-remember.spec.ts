import { test, expect } from "@playwright/test";

/*
 * 학급 코드는 localStorage(arton.lastCode.v1)에 저장된다 — 기기를 껐다 켜도 남는다.
 * (sessionStorage인 학생 토큰과 달리, 코드·별명은 기기에 남아 재입장 시 자동으로 채워진다.)
 * 브라우저 암호매니저 자동완성은 일부러 막아 뒀으므로(입장 화면이 로그인 폼으로 오인됨)
 * 이 localStorage 경로가 유일한 자동완성 수단 — 회귀하면 아이가 매번 6자리를 다시 친다.
 */
test("기기를 껐다 켜도 학급 코드가 자동으로 채워진다", async ({ page }) => {
  // "지난번 입장" 상태를 만든다(브라우저 재시작 후에도 localStorage는 남는다)
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("arton.lastCode.v1", "ABC234");
    localStorage.setItem(
      "arton.lastNick.v1",
      JSON.stringify({ ABC234: { nickname: "용감한 여우", at: Date.now() } }),
    );
    sessionStorage.clear(); // 브라우저 종료 = 세션 스토리지 소멸
  });

  // 첫 화면(랜딩)의 코드 입력란이 자동으로 채워져야 한다
  await page.goto("/");
  await expect(page.locator("#class-code")).toHaveValue("ABC234", { timeout: 5000 });

  // /join 화면도 마찬가지(코드 → 별명 단계에서 지난 별명이 기본값)
  await page.goto("/join");
  const joinCode = page.locator("input").first();
  await expect(joinCode).toHaveValue("ABC234", { timeout: 5000 });
});
