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
  /**
   * 진행 중 스트로크를 표시 캔버스에 라이브 프리뷰로 그린다(매 composite 프레임).
   * 스트로크가 없으면 no-op. endStroke 전에도 획이 즉시 보이게 하는 핵심.
   * 지우개(destination-out) 처리는 구현체별로 다르다 —
   * Canvas2DBackend는 레이어에 직접 지워 이미 반영되므로 no-op,
   * WebGL2Backend는 스트로크 버퍼를 매 프레임 destination-out으로 합성한다.
   */
  presentStroke(target: CanvasRenderingContext2D): void;
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
    case "grain": {
      // 연필 흑연결: 아주 작은 입자를 촘촘히 — 가장자리로 갈수록 희박
      ctx.clearRect(0, 0, size, size);
      const dots = Math.floor(size * size * 0.09);
      for (let i = 0; i < dots; i++) {
        const a = Math.random() * Math.PI * 2;
        const rad = Math.sqrt(Math.random()) * r;
        const x = r + Math.cos(a) * rad;
        const y = r + Math.sin(a) * rad;
        const fall = Math.pow(1 - rad / r, 0.6);
        ctx.fillStyle = `rgba(255,255,255,${fall * (0.5 + Math.random() * 0.5)})`;
        ctx.fillRect(x, y, 1.1, 1.1);
      }
      break;
    }
    case "rough": {
      // 크레용 왁스: 굵고 성긴 덩어리 입자 — 종이 요철에 왁스가 묻는 느낌
      ctx.clearRect(0, 0, size, size);
      const clumps = Math.floor(size * size * 0.018);
      for (let i = 0; i < clumps; i++) {
        const a = Math.random() * Math.PI * 2;
        const rad = Math.sqrt(Math.random()) * r * 0.95;
        const x = r + Math.cos(a) * rad;
        const y = r + Math.sin(a) * rad;
        const fall = 1 - rad / r;
        const s = 2 + Math.random() * 4;
        ctx.fillStyle = `rgba(255,255,255,${fall * (0.35 + Math.random() * 0.65)})`;
        ctx.beginPath();
        ctx.arc(x, y, s / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "chunk": {
      // 오일파스텔: 거의 꽉 찬 중심 + 부슬거리는 가장자리 — 진하고 크리미
      ctx.clearRect(0, 0, size, size);
      const g = ctx.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, "rgba(255,255,255,0.95)");
      g.addColorStop(0.65, "rgba(255,255,255,0.9)");
      g.addColorStop(0.85, "rgba(255,255,255,0.35)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(r, r, r, 0, Math.PI * 2);
      ctx.fill();
      // 가장자리 입자
      for (let i = 0; i < 140; i++) {
        const a = Math.random() * Math.PI * 2;
        const rad = r * (0.7 + Math.random() * 0.3);
        ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.5})`;
        ctx.fillRect(r + Math.cos(a) * rad, r + Math.sin(a) * rad, 2.2, 2.2);
      }
      break;
    }
    case "flat": {
      // 마커 납작촉: 가로로 긴 라운드 사각 — 스트로크 방향으로 회전해 챠콜펜 느낌
      ctx.clearRect(0, 0, size, size);
      const w = size * 0.92;
      const h = size * 0.46;
      const x = (size - w) / 2;
      const y = (size - h) / 2;
      const rr = h / 2;
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.lineTo(x + w - rr, y);
      ctx.arc(x + w - rr, y + rr, rr, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(x + rr, y + h);
      ctx.arc(x + rr, y + rr, rr, Math.PI / 2, (Math.PI * 3) / 2);
      ctx.fill();
      break;
    }
    case "bristle": {
      // 유화 붓결: 대비 강한 가로 스트릭 + 사이사이 빈 골 — 붓자국이 확실히 남게
      ctx.clearRect(0, 0, size, size);
      const lines = 11;
      for (let i = 0; i < lines; i++) {
        const y = ((i + 0.5) / lines) * size + (Math.random() - 0.5) * 4;
        if (Math.random() < 0.18) continue; // 빈 골(붓털 사이 틈)
        const alpha = 0.45 + Math.random() * 0.55;
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 2 + Math.random() * 3.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        const half = Math.sqrt(Math.max(0, r * r - (y - r) * (y - r)));
        const jl = Math.random() * 6;
        const jr = Math.random() * 6;
        ctx.moveTo(r - half + jl, y);
        ctx.lineTo(r + half - jr, y);
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
