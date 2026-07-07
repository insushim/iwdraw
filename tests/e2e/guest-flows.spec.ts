import { test, expect } from "@playwright/test";

/*
 * 게스트 핵심 경로 E2E (로그인 없이 누구나 사용).
 * 백엔드 없이 동작하는 경로만 검증 — Supabase 필요한 협동/제출은 별도.
 */

test("랜딩: 바로 그리기·색칠하기 진입점이 보인다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /바로 그리기/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /색칠하기/ }).first()).toBeVisible();
  await expect(page.getByText(/설치도 로그인도 필요 없어요/)).toBeVisible();
});

test("바로 그리기: 캔버스와 도구가 뜨고 실제로 획을 그을 수 있다", async ({ page }) => {
  await page.goto("/draw?mode=sketch");
  const canvas = page.getByLabel("그림 캔버스");
  await expect(canvas).toBeVisible();
  // 도구 막대 존재
  await expect(page.getByRole("button", { name: "연필" })).toBeVisible();
  await expect(page.getByRole("button", { name: "수채붓" })).toBeVisible();

  // 캔버스에 드래그로 획 긋기
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, { steps: 12 });
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.4, { steps: 8 });
    await page.mouse.up();
  }
  // 획을 그으면 되돌리기 버튼이 활성화된다
  await expect(page.getByRole("button", { name: "되돌리기" })).toBeEnabled();
});

test("색칠 갤러리: 도안 목록이 로드되고 카테고리 필터가 동작한다", async ({ page }) => {
  await page.goto("/coloring");
  await expect(page.getByRole("heading", { name: /색칠할 도안을 골라요/ })).toBeVisible();
  // 도안 이미지가 하나 이상 로드
  const firstImg = page.locator('img[alt$="색칠 도안"]').first();
  await expect(firstImg).toBeVisible({ timeout: 15000 });
  // 카테고리 필터
  await page.getByRole("button", { name: /동물/ }).first().click();
  await expect(firstImg).toBeVisible();
});

test("색칠: 도안을 고르면 색칠 모드 캔버스가 열린다", async ({ page }) => {
  await page.goto("/coloring");
  const firstCard = page.locator('a[href*="mode=coloring"]').first();
  await expect(firstCard).toBeVisible({ timeout: 15000 });
  await firstCard.click();
  await expect(page).toHaveURL(/\/draw\?template=/);
  // 색칠 모드 탭이 선택됨
  await expect(page.getByRole("tab", { name: /색칠하기/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("그림 캔버스")).toBeVisible();
});

test("저학년 모드: 도구가 6종으로 줄어든다", async ({ page }) => {
  await page.goto("/draw");
  const junior = page.getByRole("button", { name: /저학년/ });
  await junior.click();
  // 유화붓(고학년 전용)은 저학년 모드에서 숨겨짐
  await expect(page.getByRole("button", { name: "유화붓" })).toHaveCount(0);
  // 연필은 여전히 있음
  await expect(page.getByRole("button", { name: "연필" })).toBeVisible();
});

test("빈 캔버스: 가로/세로 방향을 바꿀 수 있다", async ({ page }) => {
  await page.goto("/draw");
  const toggle = page.getByRole("button", { name: "캔버스 방향 바꾸기" });
  await expect(toggle).toBeVisible();
  await toggle.click();
  // 라벨 텍스트는 lg 미만에서 숨겨지므로(hidden lg:inline) 실제 캔버스 방향으로 검증
  const canvas = page.getByLabel("그림 캔버스");
  await expect(async () => {
    const box = await canvas.boundingBox();
    expect(box && box.height > box.width).toBe(true);
  }).toPass();
});

test("요금제: 무료/Pro 카드가 보인다", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByText("0원", { exact: true })).toBeVisible();
  await expect(page.getByText("월 4,900원", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "요금제" })).toBeVisible();
});
