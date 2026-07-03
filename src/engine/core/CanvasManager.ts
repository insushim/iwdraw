import type { RendererBackend } from "./backend";
import { Canvas2DBackend } from "./Canvas2DBackend";
import { tryCreateWebGL2Backend } from "./WebGL2Backend";

/*
 * CanvasManager: 렌더 백엔드 선택(WebGL2 우선, 실패 시 Canvas2D 폴백) + 표시 캔버스 관리.
 * 컨텍스트 로스트 2회 시 Canvas2D로 핫스왑한다.
 */
export class CanvasManager {
  readonly display: HTMLCanvasElement;
  readonly displayCtx: CanvasRenderingContext2D;
  backend: RendererBackend;
  private lostCount = 0;
  private onDowngrade?: () => void;

  constructor(
    readonly width: number,
    readonly height: number,
    display?: HTMLCanvasElement,
    forceCanvas2D = false,
    allowSoftwareGL = false,
  ) {
    this.display = display ?? document.createElement("canvas");
    this.display.width = width;
    this.display.height = height;
    this.displayCtx = this.display.getContext("2d")!;

    this.backend = forceCanvas2D
      ? new Canvas2DBackend(width, height)
      : tryCreateWebGL2Backend(width, height, allowSoftwareGL) ?? new Canvas2DBackend(width, height);

    this.display.addEventListener("webglcontextlost", this.handleLost as EventListener);
  }

  get usingWebGL2(): boolean {
    return this.backend.caps.webgl2;
  }

  onDowngradeToCanvas2D(cb: () => void): void {
    this.onDowngrade = cb;
  }

  private handleLost = (e: Event) => {
    e.preventDefault();
    this.lostCount++;
    if (this.lostCount >= 2 && this.backend.caps.webgl2) {
      this.backend.dispose();
      this.backend = new Canvas2DBackend(this.width, this.height);
      this.onDowngrade?.();
    }
  };

  destroy(): void {
    this.display.removeEventListener("webglcontextlost", this.handleLost as EventListener);
    this.backend.dispose();
  }
}
