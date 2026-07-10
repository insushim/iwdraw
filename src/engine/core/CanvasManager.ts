import type { RendererBackend } from "./backend";
import { Canvas2DBackend } from "./Canvas2DBackend";
import { tryCreateWebGL2Backend, WebGL2Backend } from "./WebGL2Backend";

/*
 * CanvasManager: 렌더 백엔드 선택(WebGL2 우선, 실패 시 Canvas2D 폴백) + 표시 캔버스 관리.
 * GL 컨텍스트 로스(화면 꺼짐→GPU 리셋 등) 시 WebGL2 재생성 1회 → 재로스면 Canvas2D 핫스왑.
 * 그림 데이터는 전부 레이어(2D 캔버스)에 있어 스왑해도 유실 없음 — 진행 중이던 획만 끊긴다.
 */
export class CanvasManager {
  readonly display: HTMLCanvasElement;
  readonly displayCtx: CanvasRenderingContext2D;
  backend: RendererBackend;
  private lostCount = 0;
  private onSwap?: () => void;

  constructor(
    readonly width: number,
    readonly height: number,
    display?: HTMLCanvasElement,
    forceCanvas2D = false,
    allowSoftwareGL = false,
    /** 표시 캔버스 백킹 배율(레티나 선명도) — 레이어·백엔드는 논리 해상도 유지.
     * 확대(줌) 시 1536px 논리 캔버스가 CSS로 재확대되며 생기던 계단 완화(2026-07-10). */
    readonly dpr = 1,
  ) {
    this.display = display ?? document.createElement("canvas");
    this.display.width = Math.round(width * dpr);
    this.display.height = Math.round(height * dpr);
    this.displayCtx = this.display.getContext("2d")!;

    this.backend = forceCanvas2D
      ? new Canvas2DBackend(width, height)
      : tryCreateWebGL2Backend(width, height, allowSoftwareGL) ?? new Canvas2DBackend(width, height);
    this.armLossHandler();
  }

  get usingWebGL2(): boolean {
    return this.backend.caps.webgl2;
  }

  /** 백엔드 핫스왑(로스 복구/다운그레이드) 후 알림 — 엔진이 재합성한다 */
  onDowngradeToCanvas2D(cb: () => void): void {
    this.onSwap = cb;
  }

  private armLossHandler(): void {
    if (this.backend instanceof WebGL2Backend) this.backend.onContextLost(this.handleLost);
  }

  private handleLost = () => {
    this.lostCount++;
    this.backend.dispose();
    const fresh = this.lostCount < 2 ? tryCreateWebGL2Backend(this.width, this.height) : null;
    this.backend = fresh ?? new Canvas2DBackend(this.width, this.height);
    this.armLossHandler();
    this.onSwap?.();
  };

  destroy(): void {
    this.backend.dispose();
  }
}
