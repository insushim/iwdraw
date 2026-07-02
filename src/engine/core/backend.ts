import type { BackendCaps, BlendMode, Dab, RGB } from "../types";
import type { TipKind, DabComposite } from "../brushes/BrushBase";

/*
 * RendererBackend: 브러시가 만든 백엔드 독립 Dab 스트림을 래스터화하는 추상.
 * WebGL2Backend와 Canvas2DBackend가 이 인터페이스를 구현 → 브러시는 백엔드를 모른다.
 * (DESIGN-REVIEW C: WebGL2/Canvas2D 이중 렌더패스 추상화)
 */

export interface StrokeContext {
  layerCanvas: HTMLCanvasElement | OffscreenCanvas;
  tip: TipKind;
  composite: DabComposite;
  color: RGB;
  /** 수채 모드 여부 — 백엔드가 wet 시뮬 사용 결정 */
  watercolor: boolean;
  /** 유화 모드 여부 — heightmap 사용 결정 */
  oil: boolean;
}

export interface RendererBackend {
  readonly caps: BackendCaps;
  /** 스트로크 시작 — 백엔드가 임시 버퍼/셰이더 준비 */
  beginStroke(ctx: StrokeContext): void;
  /** Dab 배치 렌더 */
  drawDabs(dabs: Dab[]): void;
  /** 스트로크 종료 — 임시 버퍼를 레이어에 합성, 수채는 확산 마무리 */
  endStroke(): void;
  /** rAF마다: 수채 확산 등 시간 진행 시뮬 1틱. 변경 있으면 true */
  tick(dtMs: number): boolean;
  dispose(): void;
}

/** 팁 종류 → 방사형 그라디언트 스탬프(공용, Canvas2D/WebGL 텍스처 소스) */
export function makeTipCanvas(tip: TipKind, size = 128): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const r = size / 2;

  switch (tip) {
    case "soft": {
      const g = ctx.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.7, "rgba(255,255,255,0.6)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      break;
    }
    case "hard": {
      const g = ctx.createRadialGradient(r, r, r * 0.8, r, r, r);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(r, r, r, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "grain":
    case "rough":
    case "chunk": {
      // 입자 텍스처: 원 안에 랜덤 점(연필결/크레용/파스텔)
      const density = tip === "grain" ? 0.35 : tip === "rough" ? 0.5 : 0.7;
      ctx.fillStyle = "rgba(255,255,255,0)";
      ctx.fillRect(0, 0, size, size);
      const dots = Math.floor(size * size * density * 0.12);
      for (let i = 0; i < dots; i++) {
        const a = Math.random() * Math.PI * 2;
        const rad = Math.random() * r;
        const x = r + Math.cos(a) * rad;
        const y = r + Math.sin(a) * rad;
        const fall = 1 - rad / r;
        ctx.fillStyle = `rgba(255,255,255,${fall * (0.4 + Math.random() * 0.6)})`;
        const s = tip === "chunk" ? 2.4 : 1.3;
        ctx.fillRect(x, y, s, s);
      }
      break;
    }
    case "bristle": {
      // 유화 붓결: 가로 스트릭
      ctx.clearRect(0, 0, size, size);
      const lines = 14;
      for (let i = 0; i < lines; i++) {
        const y = (i / lines) * size + (Math.random() - 0.5) * 3;
        const alpha = 0.3 + Math.random() * 0.7;
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.beginPath();
        const dx = r - Math.sqrt(Math.max(0, r * r - (y - r) * (y - r)));
        ctx.moveTo(dx, y);
        ctx.lineTo(size - dx, y);
        ctx.stroke();
      }
      break;
    }
  }
  return c;
}

export function blendToComposite(blend: BlendMode): GlobalCompositeOperation {
  switch (blend) {
    case "multiply":
      return "multiply";
    case "screen":
      return "screen";
    case "overlay":
      return "overlay";
    default:
      return "source-over";
  }
}
