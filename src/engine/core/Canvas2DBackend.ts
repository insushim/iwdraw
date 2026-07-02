import type { BackendCaps, Dab, RGB } from "../types";
import { makeTipCanvas, type RendererBackend, type StrokeContext } from "./backend";
import type { TipKind } from "../brushes/BrushBase";

/*
 * Canvas2DBackend: 크롬북 저사양/WebGL2 미지원 폴백.
 * 임시 스트로크 버퍼에 dab을 찍고, endStroke에서 레이어에 1회 합성(스트로크 내 겹침 방지).
 * 수채 확산·유화 heightmap 라이팅은 생략(caps=false) — multiply/불투명으로 자연 다운그레이드.
 */
export class Canvas2DBackend implements RendererBackend {
  readonly caps: BackendCaps = { webgl2: false, wetSim: false, heightmap: false };

  private strokeBuf: HTMLCanvasElement;
  private strokeCtx: CanvasRenderingContext2D;
  private tipCache = new Map<TipKind, HTMLCanvasElement>();
  private tintCache = new Map<string, HTMLCanvasElement>();
  private ctx: StrokeContext | null = null;
  private layerCtx: CanvasRenderingContext2D | null = null;

  constructor(
    private readonly width: number,
    private readonly height: number,
  ) {
    this.strokeBuf = document.createElement("canvas");
    this.strokeBuf.width = width;
    this.strokeBuf.height = height;
    this.strokeCtx = this.strokeBuf.getContext("2d")!;
  }

  private tip(kind: TipKind): HTMLCanvasElement {
    let t = this.tipCache.get(kind);
    if (!t) {
      t = makeTipCanvas(kind);
      this.tipCache.set(kind, t);
    }
    return t;
  }

  /** 팁을 색으로 틴트한 스탬프(색상별 캐시) */
  private tinted(kind: TipKind, color: RGB): HTMLCanvasElement {
    const key = `${kind}:${color.r},${color.g},${color.b}`;
    let c = this.tintCache.get(key);
    if (!c) {
      const tip = this.tip(kind);
      c = document.createElement("canvas");
      c.width = tip.width;
      c.height = tip.height;
      const cx = c.getContext("2d")!;
      cx.drawImage(tip, 0, 0);
      cx.globalCompositeOperation = "source-in";
      cx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
      cx.fillRect(0, 0, c.width, c.height);
      this.tintCache.set(key, c);
      // 캐시 폭주 방지
      if (this.tintCache.size > 48) {
        const first = this.tintCache.keys().next().value;
        if (first) this.tintCache.delete(first);
      }
    }
    return c;
  }

  beginStroke(ctx: StrokeContext): void {
    this.ctx = ctx;
    this.layerCtx = (ctx.layerCanvas as HTMLCanvasElement).getContext("2d");
    this.strokeCtx.clearRect(0, 0, this.width, this.height);
    // 지우개는 스트로크 버퍼가 아니라 레이어에 직접(destination-out)
  }

  drawDabs(dabs: Dab[]): void {
    if (!this.ctx) return;
    const eraser = this.ctx.composite === "destination-out";
    const target = eraser ? this.layerCtx! : this.strokeCtx;
    if (eraser) target.save();
    for (const dab of dabs) {
      const color = dab.color ?? this.ctx.color;
      const stamp = this.tinted(this.ctx.tip, color);
      const s = dab.size;
      target.save();
      target.globalAlpha = dab.alpha;
      if (eraser) {
        target.globalCompositeOperation = "destination-out";
      } else if (this.ctx.composite === "lighter") {
        target.globalCompositeOperation = "lighter";
      }
      target.translate(dab.x, dab.y);
      target.rotate(dab.rotation);
      target.drawImage(stamp, -s / 2, -s / 2, s, s);
      target.restore();
    }
    if (eraser) target.restore();
  }

  presentStroke(target: CanvasRenderingContext2D): void {
    if (!this.ctx) return;
    // 지우개는 레이어에 직접 그려져 이미 실시간으로 보임
    if (this.ctx.composite === "destination-out") return;
    target.save();
    target.globalCompositeOperation =
      this.ctx.composite === "multiply"
        ? "multiply"
        : this.ctx.composite === "lighter"
          ? "lighter"
          : "source-over";
    target.drawImage(this.strokeBuf, 0, 0);
    target.restore();
  }

  endStroke(): void {
    if (!this.ctx || !this.layerCtx) return;
    if (this.ctx.composite === "destination-out") {
      this.ctx = null;
      return; // 지우개는 이미 레이어에 직접 반영됨
    }
    // 스트로크 버퍼를 레이어에 1회 합성 — 브러시 composite 반영(라이브 프리뷰와 동일해야 함)
    this.layerCtx.save();
    this.layerCtx.globalCompositeOperation =
      this.ctx.composite === "multiply"
        ? "multiply"
        : this.ctx.composite === "lighter"
          ? "lighter"
          : "source-over";
    this.layerCtx.drawImage(this.strokeBuf, 0, 0);
    this.layerCtx.restore();
    this.ctx = null;
  }

  tick(): boolean {
    return false; // 시간 진행 시뮬 없음
  }

  dispose(): void {
    this.tipCache.clear();
    this.tintCache.clear();
  }
}
