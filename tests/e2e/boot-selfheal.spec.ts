import { test, expect } from "@playwright/test";

/*
 * 흰 화면 방어 회귀 테스트.
 * 배포 직후 구버전 청크가 404가 나면 React가 아예 못 뜨고(에러 바운더리도 안 돈다)
 * 흰 화면만 남는다(2026-07-10·07-13 사용자 실측). 청크 404를 인위적으로 만들어
 *  ① 즉시 자가복구(SW·캐시 정리 후 재로드)가 돌고,
 *  ② 그래도 못 뜨면 흰 화면이 아니라 "다시 불러오기" 안내 화면이 뜨는지 확인한다.
 */
test("청크가 404여도 흰 화면 대신 안내 화면이 뜬다", async ({ page }) => {
  // 앱 청크를 계속 404로 — 자가복구(재로드)로도 살아나지 못하는 최악의 경우
  await page.route("**/_next/static/chunks/**", (r) => r.fulfill({ status: 404, body: "" }));

  await page.goto("/draw?mode=sketch");
  // 복구 2회 시도 후 안내 화면 — 재로드가 끼므로 넉넉히 기다린다
  const msg = page.locator("#arton-boot-msg");
  await expect(msg).toBeVisible({ timeout: 30_000 });
  await expect(msg).toContainText("불러오");
  // 아이가 손쓸 수 있는 버튼이 있어야 한다
  await expect(page.getByRole("button", { name: "다시 불러오기" })).toBeVisible({ timeout: 30_000 });
});

test("정상 로드에서는 안내 화면이 뜨지 않는다", async ({ page }) => {
  await page.goto("/draw?mode=sketch");
  await page.getByLabel("그림 캔버스").waitFor();
  await page.waitForTimeout(4000); // 느린 로딩 안내(3.5초)가 뜨는지까지 확인
  await expect(page.locator("#arton-boot-msg")).toHaveCount(0);
});
