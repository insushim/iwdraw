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
  await expect(page.getByRole("button", { name: "연필", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "수채붓", exact: true })).toBeVisible();

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

/* 색칠 갤러리는 2단계다(2026-09-04): 첫 화면 = 주제 격자, 주제를 눌러야 그 안의 도안.
 * 예전엔 1344장을 한꺼번에 걸어 DOM 1만 노드·콜드 6MB 였다. */
test("색칠 갤러리: 주제 격자가 뜨고 카테고리 필터가 동작한다", async ({ page }) => {
  await page.goto("/coloring");
  await expect(page.getByRole("heading", { name: /색칠할 도안을 골라요/ })).toBeVisible();
  const themes = page.getByTestId("theme-card");
  await expect(themes.first()).toBeVisible({ timeout: 15000 });
  const all = await themes.count();
  // 카테고리 필터를 걸면 주제 수가 줄어든다
  await page.getByRole("button", { name: /동물/ }).first().click();
  await expect(themes.first()).toBeVisible();
  expect(await themes.count()).toBeLessThan(all);
});

test("색칠: 주제 → 도안을 고르면 색칠 모드 캔버스가 열린다", async ({ page }) => {
  await page.goto("/coloring");
  await page.getByTestId("theme-card").first().click({ timeout: 15000 });
  const firstCard = page.locator('a[href*="mode=coloring"]').first();
  await expect(firstCard).toBeVisible({ timeout: 15000 });
  await firstCard.click();
  await expect(page).toHaveURL(/\/draw\?template=/);
  // 색칠 모드 탭이 선택됨
  await expect(page.getByRole("tab", { name: /색칠하기/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("그림 캔버스")).toBeVisible();
});

test("저학년 모드: 쉬운 도구만 남는다", async ({ page }) => {
  await page.goto("/draw");
  const junior = page.getByRole("button", { name: /저학년/ });
  await junior.click();
  // 유화붓·붓펜(고학년 전용)은 저학년 모드에서 숨겨짐
  await expect(page.getByRole("button", { name: "유화붓" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "붓펜" })).toHaveCount(0);
  // 학교에서 늘 쓰는 도구(연필·색연필·사인펜)는 남는다
  await expect(page.getByRole("button", { name: "연필", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "색연필", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "사인펜", exact: true })).toBeVisible();
});

/* 저학년 모드로 들어갈 때 지금 든 도구가 목록에서 사라지면(유화붓 등) 버튼은 없는데
 * 엔진은 계속 그 붓으로 그렸다 = 선택된 도구가 하나도 없어 보이고, 아이는 무엇으로
 * 그리는지 알 수도 되돌릴 수도 없었다(2026-07-25 실측). 연필로 되돌린다. */
test("저학년 모드: 숨겨지는 도구를 들고 있었으면 연필로 바뀐다", async ({ page }) => {
  await page.goto("/draw");
  await page.getByRole("button", { name: "유화붓", exact: true }).click();
  await expect(page.getByRole("button", { name: "유화붓", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: /저학년/ }).click();
  await expect(page.getByRole("button", { name: "유화붓" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "연필", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("빈 캔버스: 가로/세로 방향을 바꿀 수 있다", async ({ page }) => {
  await page.goto("/draw");
  const toggle = page.getByRole("button", { name: "캔버스 방향 바꾸기" });
  await expect(toggle).toBeVisible();
  await toggle.click();
  // 라벨 텍스트는 xl 미만에서 숨겨지므로(hidden xl:inline) 실제 캔버스 방향으로 검증
  const canvas = page.getByLabel("그림 캔버스");
  await expect(async () => {
    const box = await canvas.boundingBox();
    expect(box && box.height > box.width).toBe(true);
  }).toPass();
});

// 요금제 라우트는 유료화 보류로 숨김(src/app/_pricing) — 복원 시 test.skip 해제(2026-07-09)
test.skip("요금제: 무료/Pro 카드가 보인다", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByText("0원", { exact: true })).toBeVisible();
  await expect(page.getByText("월 4,900원", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "요금제" })).toBeVisible();
});

// 회귀: 이어그리기 두 번째 진입이 무반응이던 버그(2026-07-08). 같은 크기 이미지의
// dataURL 앞부분이 같아 CanvasStage key가 충돌 → 재마운트 실패. 진입마다 고유 v 토큰으로 수정.
test("이어그리기: 두 번 연속 진입해도 매번 새 캔버스로 열린다", async ({ page }) => {
  await page.goto("/coloring");
  // 같은 400x300 PNG 두 장(내용만 다름) → 구버전이면 key 충돌
  const [a, b] = await page.evaluate(() => {
    const mk = (bg: string) => {
      const c = document.createElement("canvas");
      c.width = 400;
      c.height = 300;
      const x = c.getContext("2d")!;
      x.fillStyle = bg;
      x.fillRect(0, 0, 400, 300);
      return c.toDataURL("image/png");
    };
    return [mk("#dd3333"), mk("#22aa22")];
  });
  const dataUrlToBuf = (d: string) => Buffer.from(d.split(",")[1], "base64");

  const continueWith = async (dataUrl: string) => {
    await page.setInputFiles('input[type="file"]', {
      name: "cont.png",
      mimeType: "image/png",
      buffer: dataUrlToBuf(dataUrl),
    });
    await page.getByRole("button", { name: /그대로 이어 그리기/ }).click();
    await page.waitForURL(/\/draw\?base=custom/);
    return new URL(page.url()).searchParams.get("v");
  };
  const bgColor = async () => {
    await expect(page.getByLabel("그림 캔버스")).toBeVisible();
    await page.waitForTimeout(700);
    return page.getByLabel("그림 캔버스").evaluate((c: HTMLCanvasElement) => {
      const g = document.createElement("canvas");
      g.width = c.width;
      g.height = c.height;
      const x = g.getContext("2d")!;
      x.drawImage(c, 0, 0);
      const d = x.getImageData(Math.floor(c.width / 2), Math.floor(c.height / 2), 1, 1).data;
      return { r: d[0], g: d[1], b: d[2] };
    });
  };

  const v1 = await continueWith(a);
  const c1 = await bgColor();
  expect(c1.r).toBeGreaterThan(150); // 빨강 A

  await page.goBack();
  // 헤더 버튼으로 특정한다 — 도안 그리드 안에도 같은 이름의 카드가 생겼다(2026-08-25)
  await expect(page.getByRole("button", { name: "내 사진·그림으로 도안 만들기" })).toBeVisible();

  const v2 = await continueWith(b);
  const c2 = await bgColor();
  expect(c2.g).toBeGreaterThan(120); // 초록 B — 두 번째도 새 이미지 로드
  expect(c2.r).toBeLessThan(150);

  // 진입마다 고유 토큰 → 항상 새 네비게이션/재마운트 보장(수정의 핵심)
  expect(v1).toBeTruthy();
  expect(v2).toBeTruthy();
  expect(v1).not.toBe(v2);
});

/*
 * 색칠 갤러리가 한 화면에 거는 카드 수 상한(2026-09-04).
 * 예전엔 필터에 걸린 도안을 전부 걸어 기본 화면이 1344장·DOM 1만 노드였다.
 * "더 보기" 증분은 늘기만 하고 줄지 않아 결국 제자리로 돌아온다 — 주제를 먼저 고르게 했다.
 */
test("색칠 갤러리: 어떤 화면에서도 카드가 상한을 넘지 않는다", async ({ page }) => {
  await page.goto("/coloring");
  await expect(page.getByTestId("theme-card").first()).toBeVisible({ timeout: 15000 });

  const count = async () => page.locator("img").count();
  expect(await count(), "첫 화면(주제 격자)").toBeLessThanOrEqual(121);

  // 가장 큰 주제(명화 122장)를 열어도 상한 안
  await page.getByRole("button", { name: /명화|Masters/ }).first().click().catch(() => {});
  const biggest = page.getByTestId("theme-card").first();
  await biggest.click();
  await expect(page.locator('a[href*="mode=coloring"]').first()).toBeVisible({ timeout: 15000 });
  expect(await count(), "주제를 연 화면").toBeLessThanOrEqual(121);

  const dom = await page.evaluate(() => document.querySelectorAll("*").length);
  expect(dom, "DOM 요소 수").toBeLessThan(2000);
});
