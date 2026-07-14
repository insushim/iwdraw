import { test } from "@playwright/test";

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

  await page.goto("/draw?mode=sketch");
  await page.getByLabel("그림 캔버스").waitFor();
  await page.waitForTimeout(500);

  const modes = ["수채화", "유화", "색칠하기", "스케치"];
  for (let round = 0; round < 5; round++) {
    for (const m of modes) {
      await page.getByRole("tab", { name: new RegExp(m) }).click();
      await page.waitForTimeout(400);
    }
    const gl = await page.evaluate(
      () => (window as unknown as { __gl: { created: number; lost: number; alive: number } }).__gl,
    );
    console.log("GL", round, JSON.stringify(gl));
  }
});
