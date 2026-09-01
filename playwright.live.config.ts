// 배포본(라이브 URL) 검증용 설정 — 기본 설정과 다른 점은 webServer가 없다는 것뿐이다.
//
// 왜 별도 파일인가: 기본 playwright.config.ts의 webServer는 E2E_BASE_URL을 줘도
// http://localhost:3000이 뜰 때까지 기다린다(dev 서버가 다른 포트로 뜨면 2분 뒤 타임아웃).
// 배포 검증은 로컬 서버가 필요 없으므로 아예 떼어낸다.
//
// 사용:
//   npx playwright test --config=playwright.live.config.ts --project=desktop-chrome
//   E2E_BASE_URL=https://내-미리보기.workers.dev npx playwright test --config=playwright.live.config.ts
//
// ⚠️ 갤러리 제출(D1·R2 쓰기)을 하는 스펙은 없다 — 실서버 데이터를 오염시키지 않는다.
//    쓰기 스펙을 새로 만들면 반드시 이 설정에서 제외할 것.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  /* 실서버에 쓰기를 시도하는 스펙은 제외한다(위 ⚠️ 규약).
   * artwork-title: 가짜 학생 세션으로 [갤러리에 보내기]를 누른다 — 토큰이 가짜라 401로 막혀
   * 실제로 쓰이지는 않지만, "라이브에 제출을 시도하는 스펙"을 여기 두지 않는다는 규약이 우선이다. */
  testIgnore: ["**/artwork-title.spec.ts"],
  timeout: 90_000,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "https://arton.simssijjang.workers.dev",
    trace: "off",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } },
    { name: "tablet", use: { ...devices["Galaxy Tab S4"], browserName: "chromium" } },
  ],
});
