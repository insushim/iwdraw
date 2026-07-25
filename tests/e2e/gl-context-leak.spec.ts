import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });
test.setTimeout(180_000);

/*
 * 진단: 모드 전환·재마운트가 반복될 때 WebGL2 컨텍스트가 쌓이는가?
 * 브라우저는 탭당 컨텍스트 수(~16)를 넘기면 오래된 것을 강제로 잃게 만든다 →
 * CanvasManager가 Canvas2D로 폴백 → 급격한 렉(재시작하면 회복 = 사용자 증상과 일치).
 */
test("모드 전환 반복 시 GL 컨텍스트/폴백 상태", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as {
      __gl: { created: number; lost: number; alive: number };
    };
    w.__gl = { created: 0, lost: 0, alive: 0 };
    const orig = HTMLCanvasElement.prototype.getContext;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]): any {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = (orig as any).call(this, type, ...rest);
      if (type === "webgl2" && ctx) {
        w.__gl.created++;
        w.__gl.alive++;
        this.addEventListener("webglcontextlost", () => {
          w.__gl.lost++;
          w.__gl.alive--;
        });
      }
      return ctx;
    };
  });

  // ?backend=gl — 헤드리스는 SwiftShader라 기본 경로가 GL을 거부(폴백)한다.
  // 강제하지 않으면 컨텍스트가 1개도 안 만들어져 누수 진단 자체가 무의미해진다.
  await page.goto("/draw?mode=sketch&backend=gl");
  await page.getByLabel("그림 캔버스").waitFor();
  await page.waitForTimeout(500);

  // ⚠️ "색칠하기"는 제외 — 도안이 없으면 /coloring(도안 고르기)으로 **이동**한다(ModeTabs 설계).
  // 에디터를 떠나 버려 다음 탭 클릭이 영원히 대기했다(2026-07-25까지 이 스펙이 매번 3분
  // 타임아웃으로 실패 중이었다 = 컨텍스트 누수 진단이 사실상 꺼져 있었음).
  const modes = ["수채화", "유화", "스케치"];
  let last = { created: 0, lost: 0, alive: 0 };
  for (let round = 0; round < 5; round++) {
    for (const m of modes) {
      await page.getByRole("tab", { name: new RegExp(m) }).click();
      await page.waitForTimeout(400);
    }
    const gl = await page.evaluate(
      () => (window as unknown as { __gl: { created: number; lost: number; alive: number } }).__gl,
    );
    console.log("GL", round, JSON.stringify(gl));
    last = gl;
  }
  // 살아 있는 컨텍스트가 라운드마다 쌓이면 브라우저 상한(~16)에 걸려 강제 로스트 →
  // Canvas2D 폴백 → "쓰다 보면 렉이 걸리고 재시작하면 낫는다"(사용자 증상)
  expect(last.alive, "살아 있는 WebGL2 컨텍스트").toBeLessThan(4);
  expect(last.lost, "강제 컨텍스트 로스트").toBeLessThan(3);
});
