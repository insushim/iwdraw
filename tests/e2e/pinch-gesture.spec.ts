import { test, expect, type Page, type CDPSession } from "@playwright/test";

/*
 * 두 손가락 확대·축소 회귀 가드 — "손가락으로 확대가 됐다 안됐다" (2026-08-21 사용자 보고).
 *
 * 합성 PointerEvent가 아니라 CDP 실터치(Input.dispatchTouchEvent)로 보낸다. 포인터 캡처·
 * boundary event·touch-action까지 브라우저 파이프라인을 그대로 타야 이 결함들이 재현된다.
 *
 * 재현된 원인 셋(전부 수정 전 실측):
 *  ① 두 손가락 중 하나가 종이 밖(툴바·팔레트·여백)에 닿으면 핀치가 성립하지 않고 남은
 *     손가락이 그리기로 처리됐다 — 배율 1.00 · 획 픽셀 412(= 확대 대신 낙서).
 *  ② 펜을 쓴 직후 1.2초(팜 잠금) 동안 손가락 확대가 통째로 씹혔다 — 0.1초 뒤 1.00 / 1.5초 뒤 4.00.
 *  ③ 두 손가락 탭(되돌리기)은 "손가락이 0개인 end"가 영영 오지 않아 한 번도 발동하지 않았다.
 * 그리고 ①을 고치며 낸 회귀: 캔버스 **위에** 떠 있는 되돌리기 버튼이 좌표상 종이 안이라
 * 버튼을 누를 때마다 그 아래에 점이 찍혔다 → 마지막 테스트가 그 자리를 잠근다.
 */
test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] }, hasTouch: true });

type Ctx = { cdp: CDPSession };
const ctx = new WeakMap<Page, Ctx>();
const wait = (p: Page, ms: number) => p.waitForTimeout(ms);

async function setup(page: Page) {
  await page.goto("/draw?mode=sketch&backend=gl");
  await page.getByLabel("그림 캔버스").waitFor();
  const fresh = page.getByRole("button", { name: /새로 시작/ });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  await wait(page, 300);
}
async function box(page: Page) {
  const b = await page.getByLabel("그림 캔버스").boundingBox();
  if (!b) throw new Error("캔버스를 찾지 못했다");
  return b;
}
async function scale(page: Page) {
  return page.evaluate(
    () => (window as unknown as { __artonEngine: { view: { scale: number } } }).__artonEngine.view.scale,
  );
}
/** 캔버스에 칠해진 픽셀 수 */
async function ink(page: Page) {
  return page.evaluate(() => {
    const el = document.querySelector('canvas[aria-label="그림 캔버스"]') as HTMLCanvasElement;
    const d = el.getContext("2d")!.getImageData(0, 0, el.width, el.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 16) if (d[i] < 200) n++;
    return n;
  });
}
type Pt = { x: number; y: number; id: number };
type TouchType = "touchStart" | "touchMove" | "touchEnd" | "touchCancel";
async function touch(page: Page, type: TouchType, pts: Pt[]) {
  await ctx.get(page)!.cdp.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: pts.map((p) => ({ x: p.x, y: p.y, id: p.id, radiusX: 25, radiusY: 25, force: 0.6 })),
  });
}
type MouseType = "mousePressed" | "mouseMoved" | "mouseReleased";
/** 진짜 스타일러스(pointerType=pen)로 보낸다 — 팜 잠금은 이 경로에서만 걸린다 */
async function pen(page: Page, type: MouseType, x: number, y: number) {
  await ctx.get(page)!.cdp.send("Input.dispatchMouseEvent", {
    type,
    x,
    y,
    button: "left",
    buttons: type === "mouseReleased" ? 0 : 1,
    pointerType: "pen",
    force: type === "mouseReleased" ? 0 : 0.6,
  });
}

test.beforeEach(async ({ page, context }) => {
  ctx.set(page, { cdp: await context.newCDPSession(page) });
});

test("두 손가락 중 하나가 종이 밖에 닿아도 확대된다(획으로 새지 않는다)", async ({ page }) => {
  await setup(page);
  const b = await box(page);
  const cy = b.y + b.height / 2;
  const inX = b.x + b.width - 40;
  // 종이 밖에서 "조작 요소가 아닌" 지점을 찾는다 — 레이아웃(폰·태블릿·크롬북)마다 다르다
  const out = await page.evaluate((r) => {
    const isCtl = (el: Element | null) =>
      !el || el.closest("button, a, input, select, textarea, label, [role]") !== null;
    /* 캔버스 좌우 여백만 후보로 둔다. 위·아래는 헤더·팔레트라 touch-action: pan-x pan-y —
     * 브라우저가 그 손가락을 스크롤 제스처로 가져가 앱에는 도달조차 하지 않는다(실측). */
    for (const p of [
      { x: r.x + r.w + 14, y: r.y + r.h / 2 },
      { x: r.x - 14, y: r.y + r.h / 2 },
      { x: r.x + r.w + 30, y: r.y + r.h / 2 },
      { x: r.x - 30, y: r.y + r.h / 2 },
    ]) {
      if (p.x < 2 || p.y < 2 || p.x > innerWidth - 2 || p.y > innerHeight - 2) continue;
      const el = document.elementFromPoint(p.x, p.y);
      const canvas = document.querySelector('canvas[aria-label="그림 캔버스"]')!;
      if (el === canvas || canvas.contains(el)) continue;
      if (!isCtl(el)) return p;
    }
    return null;
  }, { x: b.x, y: b.y, w: b.width, h: b.height });
  test.skip(out === null, "이 레이아웃에는 종이 밖 빈 지점이 없다");

  await touch(page, "touchStart", [
    { x: inX, y: cy, id: 1 },
    { x: out!.x, y: out!.y, id: 2 },
  ]);
  for (let i = 1; i <= 12; i++) {
    await touch(page, "touchMove", [
      { x: inX - i * 10, y: cy, id: 1 },
      { x: out!.x, y: out!.y, id: 2 },
    ]);
    await wait(page, 16);
  }
  await touch(page, "touchEnd", []);
  await wait(page, 200);
  expect(await scale(page), "종이 밖 손가락이 섞여도 확대는 된다").toBeGreaterThan(1.5);
  expect(await ink(page), "핀치가 획으로 새면 안 된다").toBe(0);
});

test("펜을 쓴 직후에도 두 손가락 확대가 된다(팜 잠금이 핀치를 막지 않는다)", async ({ page }) => {
  await setup(page);
  const b = await box(page);
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  // 펜으로 짧게 긋고 뗀다
  await pen(page, "mousePressed", b.x + 60, b.y + 60);
  for (let i = 1; i <= 6; i++) {
    await pen(page, "mouseMoved", b.x + 60 + i * 12, b.y + 60);
    await wait(page, 10);
  }
  await pen(page, "mouseReleased", b.x + 132, b.y + 60);
  await wait(page, 100); // 잠금(1.2초) 한복판 — 아이는 펜을 놓자마자 손으로 확대한다

  await touch(page, "touchStart", [
    { x: cx - 40, y: cy, id: 1 },
    { x: cx + 40, y: cy, id: 2 },
  ]);
  for (let i = 1; i <= 12; i++) {
    const d = 40 + i * 10;
    await touch(page, "touchMove", [
      { x: cx - d, y: cy, id: 1 },
      { x: cx + d, y: cy, id: 2 },
    ]);
    await wait(page, 16);
  }
  await touch(page, "touchEnd", []);
  await wait(page, 200);
  expect(await scale(page)).toBeGreaterThan(1.5);
});

test("손가락을 하나씩 시차를 두고 대고 떼도 확대된다(실제 사람 손)", async ({ page }) => {
  await setup(page);
  const b = await box(page);
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  await touch(page, "touchStart", [{ x: cx - 40, y: cy, id: 1 }]);
  await wait(page, 80);
  await touch(page, "touchMove", [{ x: cx - 44, y: cy + 3, id: 1 }]);
  await wait(page, 20);
  await touch(page, "touchStart", [
    { x: cx - 44, y: cy + 3, id: 1 },
    { x: cx + 40, y: cy, id: 2 },
  ]);
  for (let i = 1; i <= 12; i++) {
    const d = 40 + i * 10;
    await touch(page, "touchMove", [
      { x: cx - d, y: cy, id: 1 },
      { x: cx + d, y: cy, id: 2 },
    ]);
    await wait(page, 16);
  }
  await touch(page, "touchEnd", [{ x: cx + 160, y: cy, id: 2 }]); // 한 손가락 먼저
  await wait(page, 60);
  await touch(page, "touchEnd", []);
  await wait(page, 200);
  expect(await scale(page)).toBeGreaterThan(1.3);
  expect(await ink(page), "첫 손가락이 점을 남기면 안 된다").toBe(0);
});

test("오므렸다 다시 벌리기를 반복해도 매번 먹힌다", async ({ page }) => {
  await setup(page);
  const b = await box(page);
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  const pinch = async (id0: number) => {
    await touch(page, "touchStart", [{ x: cx - 40, y: cy, id: id0 }]);
    await wait(page, 40);
    await touch(page, "touchStart", [
      { x: cx - 40, y: cy, id: id0 },
      { x: cx + 40, y: cy, id: id0 + 1 },
    ]);
    for (let i = 1; i <= 8; i++) {
      const d = 40 + i * 10;
      await touch(page, "touchMove", [
        { x: cx - d, y: cy, id: id0 },
        { x: cx + d, y: cy, id: id0 + 1 },
      ]);
      await wait(page, 16);
    }
    await touch(page, "touchEnd", [{ x: cx + 120, y: cy, id: id0 + 1 }]);
    await wait(page, 50);
    await touch(page, "touchEnd", []);
    await wait(page, 150);
  };
  await pinch(1);
  const s1 = await scale(page);
  await pinch(11);
  const s2 = await scale(page);
  expect(s1).toBeGreaterThan(1.2);
  expect(s2, "두 번째 핀치도 이어서 먹혀야 한다").toBeGreaterThan(s1 * 1.15);
  expect(await ink(page)).toBe(0);
});

test("손가락을 붙여서 시작해도 배율이 폭주하지 않는다", async ({ page }) => {
  await setup(page);
  const b = await box(page);
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  // 엄지·검지를 거의 붙인 채 시작(간격 6px) → 40px까지만 벌린다.
  // 기준 거리에 하한이 없으면 이것만으로 상한(8배)까지 튄다.
  await touch(page, "touchStart", [
    { x: cx - 3, y: cy, id: 1 },
    { x: cx + 3, y: cy, id: 2 },
  ]);
  for (let i = 1; i <= 10; i++) {
    const d = 3 + i * 1.7;
    await touch(page, "touchMove", [
      { x: cx - d, y: cy, id: 1 },
      { x: cx + d, y: cy, id: 2 },
    ]);
    await wait(page, 16);
  }
  await touch(page, "touchEnd", []);
  await wait(page, 200);
  expect(await scale(page), "조금 벌린 만큼만 커져야 한다").toBeLessThan(2);
});

test("두 손가락으로 콕 두드리면 되돌리기가 된다", async ({ page }) => {
  await setup(page);
  const b = await box(page);
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  // 한 손가락으로 획 하나
  await touch(page, "touchStart", [{ x: b.x + 60, y: b.y + 60, id: 5 }]);
  for (let i = 1; i <= 10; i++) {
    await touch(page, "touchMove", [{ x: b.x + 60 + i * 15, y: b.y + 60 + i * 6, id: 5 }]);
    await wait(page, 16);
  }
  await touch(page, "touchEnd", []);
  await wait(page, 250);
  const drawn = await ink(page);
  expect(drawn, "먼저 획이 그려져 있어야 한다").toBeGreaterThan(100);

  await touch(page, "touchStart", [
    { x: cx - 40, y: cy, id: 6 },
    { x: cx + 40, y: cy, id: 7 },
  ]);
  await wait(page, 60);
  await touch(page, "touchEnd", [{ x: cx + 40, y: cy, id: 7 }]);
  await touch(page, "touchEnd", []);
  await wait(page, 500);
  expect(await ink(page), "두 손가락 탭이 획을 되돌려야 한다").toBeLessThan(drawn * 0.2);
});

test("캔버스 위에 떠 있는 버튼을 눌러도 그 아래 종이에 획이 안 생긴다", async ({ page }) => {
  await setup(page);
  // 되돌리기·다시실행 버튼은 캔버스 **위에** 떠 있다 — 좌표로만 판정하면 누를 때마다 점이 찍힌다
  let overlapped = false;
  for (const name of ["되돌리기", "다시 실행"]) {
    const btn = page.getByRole("button", { name, exact: true });
    const bb = await btn.boundingBox();
    if (!bb) continue;
    const cb = await box(page);
    const overlaps =
      bb.x >= cb.x && bb.x <= cb.x + cb.width && bb.y >= cb.y && bb.y <= cb.y + cb.height;
    if (!overlaps) continue; // 레이아웃에 따라 버튼이 종이 밖에 놓이기도 한다
    overlapped = true;
    await btn.click({ force: true });
    await wait(page, 120);
  }
  test.skip(!overlapped, "이 레이아웃에선 버튼이 종이 위에 겹치지 않는다");
  expect(await ink(page), "버튼 클릭이 종이에 자국을 남기면 안 된다").toBe(0);
});

test("종이에 손을 얹은 채 툴바 버튼을 눌러도 그리던 획이 살아남는다", async ({ page }) => {
  await setup(page);
  const b = await box(page);
  const y = b.y + b.height * 0.4;
  // 손가락 1로 획을 긋는 중
  await touch(page, "touchStart", [{ x: b.x + 60, y, id: 1 }]);
  for (let i = 1; i <= 12; i++) {
    await touch(page, "touchMove", [{ x: b.x + 60 + i * 14, y, id: 1 }]);
    await wait(page, 16);
  }
  // 다른 손으로 색을 바꾼다 — 이 손가락을 핀치로 오해하면 그리던 획이 취소된다
  const swatch = page.getByRole("button", { name: "색 3", exact: true });
  const sb = await swatch.boundingBox();
  expect(sb, "색 버튼을 찾아야 한다").not.toBeNull();
  const sx = sb!.x + sb!.width / 2;
  const sy = sb!.y + sb!.height / 2;
  await touch(page, "touchStart", [
    { x: b.x + 60 + 12 * 14, y, id: 1 },
    { x: sx, y: sy, id: 2 },
  ]);
  await wait(page, 40);
  await touch(page, "touchEnd", [{ x: b.x + 60 + 12 * 14, y, id: 1 }]);
  await wait(page, 40);
  for (let i = 13; i <= 20; i++) {
    await touch(page, "touchMove", [{ x: b.x + 60 + i * 14, y, id: 1 }]);
    await wait(page, 16);
  }
  await touch(page, "touchEnd", []);
  await wait(page, 300);
  expect(await ink(page), "그리던 획이 취소되면 안 된다").toBeGreaterThan(100);
  expect(await scale(page), "버튼 터치가 확대를 걸면 안 된다").toBeCloseTo(1, 1);
});

/* 펜을 뗀 신호(pointerup·pointercancel)가 유실되는 기기가 있다 — 앱 전환, 펜이 화면 밖으로
 * 이탈, 배터리 끊김. 그러면 "펜이 닿아 있다"가 영구 고착돼 그 뒤 모든 터치가 손바닥으로
 * 버려진다: 확대도 그리기도 세션이 끝날 때까지 죽는다(수정 전 실측 배율 1.00 · 획 0픽셀). */
test("펜을 뗀 신호가 유실돼도 잠시 뒤 손가락이 되살아난다", async ({ page }) => {
  await setup(page);
  const b = await box(page);
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  // 펜을 대고 긋다가 **떼지 않는다**
  await pen(page, "mousePressed", b.x + 60, b.y + 60);
  await pen(page, "mouseMoved", b.x + 120, b.y + 60);
  await wait(page, 3500); // 고착 방어(3초)를 넘긴다

  await touch(page, "touchStart", [
    { x: cx - 40, y: cy, id: 1 },
    { x: cx + 40, y: cy, id: 2 },
  ]);
  for (let i = 1; i <= 12; i++) {
    const d = 40 + i * 10;
    await touch(page, "touchMove", [
      { x: cx - d, y: cy, id: 1 },
      { x: cx + d, y: cy, id: 2 },
    ]);
    await wait(page, 16);
  }
  await touch(page, "touchEnd", []);
  await wait(page, 200);
  expect(await scale(page), "펜 신호가 유실돼도 손가락 확대는 되살아나야 한다").toBeGreaterThan(1.5);
});

test("탭이 숨겨졌다 돌아오면 유령 포인터가 남지 않는다", async ({ page }) => {
  await setup(page);
  const b = await box(page);
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  await pen(page, "mousePressed", b.x + 60, b.y + 60); // 펜을 댄 채로
  await pen(page, "mouseMoved", b.x + 120, b.y + 60);

  // 탭이 숨겨졌다 돌아온다(headless에선 실제 탭 전환이 안 되므로 같은 신호를 직접 만든다)
  await page.evaluate(() => {
    const orig = Object.getOwnPropertyDescriptor(Document.prototype, "visibilityState");
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    if (orig) Object.defineProperty(document, "visibilityState", orig);
    else delete (document as unknown as Record<string, unknown>).visibilityState;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await wait(page, 100);

  // 잠금 시간(1.2초)이 지나기 전에 바로 확대를 시도한다 — 상태가 비워졌으면 즉시 먹혀야 한다
  await touch(page, "touchStart", [
    { x: cx - 40, y: cy, id: 1 },
    { x: cx + 40, y: cy, id: 2 },
  ]);
  for (let i = 1; i <= 12; i++) {
    const d = 40 + i * 10;
    await touch(page, "touchMove", [
      { x: cx - d, y: cy, id: 1 },
      { x: cx + d, y: cy, id: 2 },
    ]);
    await wait(page, 16);
  }
  await touch(page, "touchEnd", []);
  await wait(page, 200);
  expect(await scale(page), "탭이 숨겨진 뒤에도 손가락 확대가 되어야 한다").toBeGreaterThan(1.5);
});

/* 두 번째 손가락이 팜 잠금(1.2초)을 넘겨 도착하는 느린 핀치. 승격 판정이 잠금 분기 안에만
 * 있으면 여기서 승격을 건너뛰고 단독 포인터로 그리기가 시작된다 — 확대하려던 손이 낙서를
 * 남긴다(교차검증 지적 → 수정 전 실측: 배율 1.00 · 획 547픽셀). */
test("두 번째 손가락이 늦게 도착한 핀치도 낙서가 되지 않는다", async ({ page }) => {
  await setup(page);
  const b = await box(page);
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  await pen(page, "mousePressed", b.x + 60, b.y + 60);
  await pen(page, "mouseMoved", b.x + 100, b.y + 60);
  await pen(page, "mouseReleased", b.x + 100, b.y + 60);
  await wait(page, 100);
  await touch(page, "touchStart", [{ x: cx - 40, y: cy, id: 1 }]); // 잠금 안에 닿은 첫 손가락
  await wait(page, 1400); // 잠금이 만료되도록 기다린다
  await touch(page, "touchStart", [
    { x: cx - 40, y: cy, id: 1 },
    { x: cx + 40, y: cy, id: 2 },
  ]);
  for (let i = 1; i <= 12; i++) {
    const d = 40 + i * 10;
    await touch(page, "touchMove", [
      { x: cx - d, y: cy, id: 1 },
      { x: cx + d, y: cy, id: 2 },
    ]);
    await wait(page, 16);
  }
  await touch(page, "touchEnd", []);
  await wait(page, 300);
  expect(await scale(page), "늦게 온 두 번째 손가락도 핀치로 받아야 한다").toBeGreaterThan(1.5);
  expect(await ink(page), "확대하려던 손이 획을 남기면 안 된다").toBe(0);
});

/* 컬러휠은 <canvas>라 "버튼·입력" 화이트리스트에 걸리지 않는다. 그리는 도중 다른 손으로
 * 색을 고를 때 그 손가락이 핀치의 절반으로 오인되면, 진행 중인 획이 통째로 취소된다
 * (교차검증에서 jsdom 실측으로 지목). 시간 창 + role 마커 두 겹으로 막는다. */
test("그리는 도중 다른 손으로 컬러휠을 만져도 획이 살아남는다", async ({ page }) => {
  await setup(page);
  // 컬러휠은 "직접" 토글로 열린다
  const toggle = page.getByTitle("원하는 색 직접 만들기");
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.click();
    await wait(page, 200);
  }
  const wheel = page.getByLabel(/컬러휠/);
  const shown = (await wheel.count()) > 0 && (await wheel.isVisible().catch(() => false));
  test.skip(!shown, "이 레이아웃에는 컬러휠이 보이지 않는다");
  const wb = (await wheel.boundingBox())!;
  const b = await box(page);
  const y = b.y + b.height * 0.4;
  await touch(page, "touchStart", [{ x: b.x + 60, y, id: 1 }]);
  for (let i = 1; i <= 12; i++) {
    await touch(page, "touchMove", [{ x: b.x + 60 + i * 14, y, id: 1 }]);
    await wait(page, 16);
  }
  // 다른 손으로 컬러휠을 짚는다
  await touch(page, "touchStart", [
    { x: b.x + 60 + 12 * 14, y, id: 1 },
    { x: wb.x + wb.width / 2, y: wb.y + wb.height / 2, id: 2 },
  ]);
  await wait(page, 40);
  await touch(page, "touchEnd", [{ x: b.x + 60 + 12 * 14, y, id: 1 }]);
  await wait(page, 40);
  for (let i = 13; i <= 20; i++) {
    await touch(page, "touchMove", [{ x: b.x + 60 + i * 14, y, id: 1 }]);
    await wait(page, 16);
  }
  await touch(page, "touchEnd", []);
  await wait(page, 300);
  expect(await ink(page), "그리던 획이 취소되면 안 된다").toBeGreaterThan(100);
  expect(await scale(page), "컬러휠 터치가 확대를 걸면 안 된다").toBeCloseTo(1, 1);
});
