import { test, expect } from "@playwright/test";

// Q2 검증: /coloring에서 Ctrl+V 붙여넣기와 드래그드롭이 시작방식 모달을 여는가
test("붙여넣기(Ctrl+V)로 이미지가 도안 시작 모달을 연다", async ({ page }) => {
  await page.goto("/coloring");
  await page.getByText("색칠할 도안을 골라요").waitFor();
  // 클립보드에 이미지가 있는 paste 이벤트를 합성해 window에 디스패치
  await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 300; c.height = 200;
    const x = c.getContext("2d")!;
    x.fillStyle = "#c0392b"; x.fillRect(0, 0, 300, 200);
    const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/png"));
    const file = new File([blob], "paste.png", { type: "image/png" });
    const dt = new DataTransfer();
    dt.items.add(file);
    const ev = new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true });
    window.dispatchEvent(ev);
  });
  await expect(page.getByText("이 그림으로 어떻게 시작할까요?")).toBeVisible();
});

test("드래그드롭으로 이미지가 도안 시작 모달을 연다", async ({ page }) => {
  await page.goto("/coloring");
  await page.getByText("색칠할 도안을 골라요").waitFor();
  await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 300; c.height = 200;
    const x = c.getContext("2d")!;
    x.fillStyle = "#2980b9"; x.fillRect(0, 0, 300, 200);
    const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/png"));
    const file = new File([blob], "drop.png", { type: "image/png" });
    const dt = new DataTransfer();
    dt.items.add(file);
    const main = document.querySelector("main")!;
    main.dispatchEvent(new DragEvent("dragover", { dataTransfer: dt, bubbles: true, cancelable: true }));
    main.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }));
  });
  await expect(page.getByText("이 그림으로 어떻게 시작할까요?")).toBeVisible();
});
