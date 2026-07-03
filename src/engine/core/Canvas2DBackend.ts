import type { BackendCaps, Dab, RGB } from "../types";
import { getTipCanvas, getTipEpoch, type RendererBackend, type StrokeContext } from "./backend";
import { applyPaperGrain, applyWetEdge } from "./paper";
import type { TipKind } from "../brushes/BrushBase";

/*
 * Canvas2DBackend: 크롬북 저사양/WebGL2 미지원 폴백.
 * 임시 스트로크 버퍼에 dab을 찍고, endStroke에서 레이어에 1회 합성(스트로크 내 겹침 방지).
 */
export class Canvas2DBackend implements RendererBackend {
  readonly caps: BackendCaps = { webgl2: false };

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

  private tipEpoch = -1;
  private preparedCache = new Map<TipKind, { mul: HTMLCanvasElement; light: HTMLCanvasElement }>();

  /** 셰이드 인코딩 → 2D용 파생 캔버스: mul(어두운 밴드 회색), light(밝은 밴드 알파) */
  private preparedTip(kind: TipKind, tip: HTMLCanvasElement) {
    let p = this.preparedCache.get(kind);
    if (p) return p;
    const w = tip.width;
    const h = tip.height;
    const src = tip.getContext("2d")!.getImageData(0, 0, w, h);
    const mulImg = new ImageData(w, h);
    const lightImg = new ImageData(w, h);
    for (let i = 0; i < src.data.length; i += 4) {
      const r = src.data[i] / 255;
      const a = src.data[i + 3];
      const dAmt = r >= 0.62 ? ((1 - r) / 0.38) * 0.3 : 0;
      const lAmt = r < 0.55 ? ((0.55 - r) / 0.55) * 0.45 : 0;
      const mv = Math.round(255 * (1 - dAmt));
      mulImg.data[i] = mulImg.data[i + 1] = mulImg.data[i + 2] = mv;
      mulImg.data[i + 3] = a;
      lightImg.data[i] = lightImg.data[i + 1] = lightImg.data[i + 2] = 255;
      lightImg.data[i + 3] = Math.round(a * lAmt);
    }
    const mk = (img: ImageData) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d")!.putImageData(img, 0, 0);
      return c;
    };
    p = { mul: mk(mulImg), light: mk(lightImg) };
    this.preparedCache.set(kind, p);
    return p;
  }

  private tip(kind: TipKind): HTMLCanvasElement {
    // AI 알파맵이 늦게 로드되면 epoch가 올라간다 → 팁·틴트 캐시 전체 무효화
    const epoch = getTipEpoch();
    if (epoch !== this.tipEpoch) {
      this.tipCache.clear();
      this.tintCache.clear();
      this.preparedCache.clear();
      this.tipEpoch = epoch;
    }
    let t = this.tipCache.get(kind);
    if (!t) {
      t = getTipCanvas(kind);
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
      // multiply 틴트: 팁의 밝기(셰이드 채널)가 물감 색의 명암으로 살아남는다(임파스토 줄무늬).
      // source-in은 밝기를 버리고 균일 색으로 채워 질감이 평평해진다.
      // 셰이드 인코딩(r 0.62~1=어두운 밴드, 0~0.55=밝은 밴드)을 2D에서 재현:
      // 어두운 밴드는 multiply, 밝은 밴드는 screen(흰쪽) — GL 셰이더와 동일 규칙
      const { mul, light } = this.preparedTip(kind, tip);
      cx.drawImage(mul, 0, 0);
      cx.globalCompositeOperation = "multiply";
      cx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
      cx.fillRect(0, 0, c.width, c.height);
      cx.globalCompositeOperation = "destination-in";
      cx.drawImage(tip, 0, 0);
      cx.globalCompositeOperation = "screen";
      cx.drawImage(light, 0, 0);
      cx.globalCompositeOperation = "destination-in";
      cx.drawImage(tip, 0, 0);
      cx.globalCompositeOperation = "source-over";
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
    // wash(MAX) 근사: Canvas2D엔 max 블렌드가 없어 source-over 누적을 쓴다.
    // 팁이 near-binary(스트릭≈1, 골≈0)라 over 누적≈union≈max로 질감이 유지되고,
    // 진하기는 strokeOpacity로 합성 시 1회 적용된다(실측: strokes-2d 스크린샷 검증).
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

  private liveBuf: CanvasRenderingContext2D | null = null;

  presentStroke(target: CanvasRenderingContext2D): void {
    if (!this.ctx) return;
    // 지우개는 레이어에 직접 그려져 이미 실시간으로 보임
    if (this.ctx.composite === "destination-out") return;
    // 종이 결을 프리뷰에도 실시간 적용("떼는 순간 질감이 생기는" 이질감 제거)
    let src: HTMLCanvasElement = this.strokeBuf;
    if (this.ctx.paperGrain > 0) {
      if (!this.liveBuf) {
        const c = document.createElement("canvas");
        c.width = this.width;
        c.height = this.height;
        this.liveBuf = c.getContext("2d")!;
      }
      this.liveBuf.clearRect(0, 0, this.width, this.height);
      this.liveBuf.drawImage(this.strokeBuf, 0, 0);
      applyPaperGrain(this.liveBuf, this.width, this.height, this.ctx.paperGrain, this.ctx.paperKind);
      src = this.liveBuf.canvas;
    }
    target.save();
    target.globalAlpha = this.ctx.strokeOpacity; // wash 획 전체 불투명도(프리뷰=최종)
    target.globalCompositeOperation =
      this.ctx.composite === "multiply"
        ? "multiply"
        : this.ctx.composite === "lighter"
          ? "lighter"
          : "source-over";
    target.drawImage(src, 0, 0);
    target.restore();
  }

  endStroke(): void {
    if (!this.ctx || !this.layerCtx) return;
    if (this.ctx.composite === "destination-out") {
      this.ctx = null;
      return; // 지우개는 이미 레이어에 직접 반영됨
    }
    // wet edge(실루엣 가장자리 안료 몰림) → 종이 결 침식 순서로 후처리
    if (this.ctx.wetEdge > 0) {
      applyWetEdge(this.strokeCtx, this.width, this.height, this.ctx.wetEdge);
    }
    if (this.ctx.paperGrain > 0) {
      applyPaperGrain(this.strokeCtx, this.width, this.height, this.ctx.paperGrain, this.ctx.paperKind);
    }
    // 스트로크 버퍼를 레이어에 1회 합성 — 브러시 composite 반영(라이브 프리뷰와 동일해야 함)
    this.layerCtx.save();
    this.layerCtx.globalAlpha = this.ctx.strokeOpacity;
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
