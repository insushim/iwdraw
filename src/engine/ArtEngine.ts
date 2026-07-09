import { getStroke } from "perfect-freehand";
import {
  clamp,
  hexToRgb,
  type BrushId,
  type BrushSettings,
  type EngineEventName,
  type EngineEvents,
  type EngineListener,
  type LayerInfo,
  type Mode,
  type QuickShapeKind,
  type RecordedStroke,
  type RGB,
  type StrokePoint,
  type SymmetryMode,
} from "./types";
import { CanvasManager } from "./core/CanvasManager";
import { LayerStack } from "./core/LayerStack";
import { History } from "./core/History";
import { StrokeRecorder } from "./core/StrokeRecorder";
import { AutoSave, type SavedState } from "./core/AutoSave";
import { smearSegment } from "./tools/SmudgeTool";
import { drawPaperTint, type PaperKind } from "./core/paper";
import { tilesForRect, copyTiles, TileSnapshotCommand, type TileRect } from "./core/tiles";
import type { Layer } from "./core/LayerStack";
import { BrushBase, createBrush } from "./brushes";
import { buildBarrierFromLineart, floodFill } from "./brushes/FillTool";
import { PointerHandler } from "./input/PointerHandler";
import { Gestures } from "./input/Gestures";
import { Stabilizer, strengthToStreamline } from "./input/Stabilizer";
import { mirrorPoint } from "./tools/Symmetry";
import { detectShape, QUICKSHAPE_HOLD_MS } from "./tools/QuickShape";
import { drawStampOnCtx, getStamp } from "./tools/StampTool";
import { recognizeSketch } from "./recognizer/SketchMatch";
import type { StrokeContext } from "./core/backend";
import { blendToComposite } from "./core/backend";
import type { TipKind } from "./brushes/BrushBase";
import { loadTipOverrides } from "./core/tipLoader";

/*
 * ArtEngine: 브라우저 캔버스 위에서 모든 조각을 조율하는 중심.
 * React 비의존 — on/emit 이벤트로 Zustand 스토어가 구독한다(DESIGN-REVIEW B: 엔진↔React 브리지).
 */

export interface EngineOptions {
  width: number;
  height: number;
  display: HTMLCanvasElement;
  forceCanvas2D?: boolean;
  /** QA용 백엔드 강제(?backend=2d|gl) — gl은 소프트웨어 렌더러도 허용 */
  backendOverride?: "2d" | "gl";
  /** 무비 재현성용 시드 */
  seed?: number;
}

const DEFAULT_SETTINGS: BrushSettings = {
  size: 18,
  opacity: 1,
  color: { r: 45, g: 42, b: 38 },
  waterAmount: 0.6,
  stabilize: 3,
};

export class ArtEngine {
  readonly width: number;
  readonly height: number;
  private cm: CanvasManager;
  private layers: LayerStack;
  private history: History;
  private recorder: StrokeRecorder;
  private autosave: AutoSave;
  private pointer: PointerHandler;
  private gestures: Gestures;
  private stabilizer = new Stabilizer();

  private listeners = new Map<EngineEventName, Set<(p: unknown) => void>>();

  mode: Mode = "sketch";
  brushId: BrushId = "pencil";
  settings: BrushSettings = { ...DEFAULT_SETTINGS };
  symmetry: SymmetryMode = "none";
  quickShapeEnabled = false;
  /** 뚝딱그림(스케치 인식 → 스탬프 제안) — 색칠 모드에선 자동 비활성 */
  sketchSuggestEnabled = true;

  private brush: BrushBase | null = null;
  private curPoints: StrokePoint[] = [];
  private strokeStartTs = 0;
  private firstDabLatency = -1;
  private strokeBBox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  /** 스트로크 시작 전 활성 레이어 픽셀 스냅샷(undo용 before 소스) */
  private beforeFull: Uint8ClampedArray | null = null;
  private holdTimer: ReturnType<typeof setTimeout> | null = null;

  // 뷰 변환(줌/팬)
  view = { scale: 1, ox: 0, oy: 0 };
  private rafId = 0;
  private needsComposite = false;
  private lastTick = 0;
  private replaying = false;

  constructor(opts: EngineOptions) {
    this.width = opts.width;
    this.height = opts.height;
    this.cm = new CanvasManager(
      opts.width,
      opts.height,
      opts.display,
      opts.forceCanvas2D || opts.backendOverride === "2d",
      opts.backendOverride === "gl",
    );
    this.layers = new LayerStack(opts.width, opts.height);
    this.history = new History(50);
    this.recorder = new StrokeRecorder();
    this.autosave = new AutoSave(5000);
    this.stabilizer.setStrength(this.settings.stabilize);
    loadTipOverrides(); // AI 팁 알파맵 비동기 로드(실패 시 프로시저럴 폴백)

    this.cm.onDowngradeToCanvas2D(() => this.requestComposite());

    this.gestures = new Gestures({
      onTransform: ({ scale, dx, dy, cx, cy }) => this.applyTransform(scale, dx, dy, cx, cy),
      onUndo: () => this.undo(),
      onRedo: () => this.redo(),
    });

    this.pointer = new PointerHandler(
      opts.display,
      (clientX, clientY) => this.toCanvas(clientX, clientY, opts.display),
      {
        onDown: (p) => this.strokeBegin(p),
        onMove: (pts) => this.strokeMove(pts),
        onUp: (p) => this.strokeEnd(p),
        onCancel: () => this.strokeCancel(),
        onGesture: (active, _e, phase) =>
          this.gestures.update(
            active.map((a) => ({ clientX: a.clientX, clientY: a.clientY })),
            phase,
            performance.now(),
          ),
      },
    );

    // 탭 숨김/닫힘 시 디바운스 대기 중인 자동저장 즉시 플러시 — 마지막 획 후 5초 안에
    // 닫으면 최근 획이 유실되던 구멍(2026-07-07). pagehide는 모바일 사파리 포함 최후 보루
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.flushAutoSave);
      window.addEventListener("pagehide", this.flushAutoSave);
    }

    this.startLoop();
    this.emitLayers();
    this.emitHistory();
  }

  private flushAutoSave = (): void => {
    if (document.visibilityState === "hidden") void this.autosave.flush();
  };

  /* ── 이벤트 브리지 ── */
  on<K extends EngineEventName>(name: K, fn: EngineListener<K>): () => void {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    const set = this.listeners.get(name)!;
    set.add(fn as (p: unknown) => void);
    return () => set.delete(fn as (p: unknown) => void);
  }
  private emit<K extends EngineEventName>(name: K, payload: EngineEvents[K]): void {
    this.listeners.get(name)?.forEach((fn) => fn(payload));
  }
  private emitLayers(): void {
    this.emit("layersChange", { layers: this.layers.info, activeId: this.layers.activeId });
  }
  private emitHistory(): void {
    this.emit("historyChange", { canUndo: this.history.canUndo, canRedo: this.history.canRedo });
  }

  /* ── 좌표 변환 ── */
  private toCanvas(clientX: number, clientY: number, el: HTMLElement): { x: number; y: number } {
    const rect = el.getBoundingClientRect();
    // 화면 요소 크기 → 캔버스 내부 해상도, 이후 뷰 변환 역적용
    const nx = ((clientX - rect.left) / rect.width) * this.width;
    const ny = ((clientY - rect.top) / rect.height) * this.height;
    return {
      x: (nx - this.view.ox) / this.view.scale,
      y: (ny - this.view.oy) / this.view.scale,
    };
  }

  private applyTransform(scale: number, dx: number, dy: number, cx: number, cy: number): void {
    const rect = this.cm.display.getBoundingClientRect();
    const px = ((cx - rect.left) / rect.width) * this.width;
    const py = ((cy - rect.top) / rect.height) * this.height;
    // 최소 1배(화면 맞춤): 1 미만이면 캔버스 밖 흰 영역이 생기는데, 사용자는 그걸
    // 종이로 알고 칠한다 — "축소하면 화면 밖은 색칠이 안 됨" 리포트(2026-07-07 웨일북)
    const newScale = clamp(this.view.scale * scale, 1, 8);
    // 핀치 중심 고정
    this.view.ox = px - ((px - this.view.ox) * newScale) / this.view.scale + dx;
    this.view.oy = py - ((py - this.view.oy) * newScale) / this.view.scale + dy;
    this.view.scale = newScale;
    // 팬 클램프: 캔버스 가장자리가 뷰포트 안으로 들어오지 못하게(빈 흰 영역 방지)
    this.view.ox = clamp(this.view.ox, this.width * (1 - newScale), 0);
    this.view.oy = clamp(this.view.oy, this.height * (1 - newScale), 0);
    this.emit("viewChange", { scale: newScale });
    this.requestComposite();
  }

  resetView(): void {
    this.view = { scale: 1, ox: 0, oy: 0 };
    this.emit("viewChange", { scale: 1 });
    this.requestComposite();
  }

  /* ── 브러시/모드 설정 ── */
  setMode(mode: Mode): void {
    this.resetSuggest();
    this.mode = mode;
    // 모드별 기본 브러시
    const def: Record<Mode, BrushId> = {
      sketch: "pencil",
      watercolor: "watercolor",
      oil: "oil",
      coloring: "crayon",
    };
    this.setBrush(def[mode]);
    this.requestComposite(); // 모드=종이(캔버스) 변경 — 즉시 다시 그려야 탭 클릭에 바로 반응
  }
  setBrush(id: BrushId): void {
    this.brushId = id;
  }
  setColor(rgb: RGB | string): void {
    this.settings.color = typeof rgb === "string" ? hexToRgb(rgb) : rgb;
  }
  setSize(size: number): void {
    this.settings.size = clamp(size, 1, 128);
  }
  setOpacity(o: number): void {
    this.settings.opacity = clamp(o, 0, 1);
  }
  setWater(w: number): void {
    this.settings.waterAmount = clamp(w, 0, 1);
  }
  setStabilize(s: number): void {
    this.settings.stabilize = clamp(s, 0, 10);
    this.stabilizer.setStrength(this.settings.stabilize);
  }
  setSymmetry(m: SymmetryMode): void {
    this.symmetry = m;
    this.requestComposite(); // 가이드선 즉시 표시/제거
  }
  setSketchSuggest(on: boolean): void {
    this.sketchSuggestEnabled = on;
    if (!on) this.resetSuggest();
  }
  /** 협동 세션 억제 — 수락(undo×k+스탬프)이 원격에 전파될 수 없어 캔버스가 갈라진다.
   * 스트로크 프로토콜에 치환 명령이 생기기 전까지 협동 방에서는 기능 자체를 잠근다. */
  setSuggestSuppressed(on: boolean): void {
    this.suggestSuppressed = on;
    if (on) this.resetSuggest();
  }
  private suggestSuppressed = false;
  setQuickShape(on: boolean): void {
    this.quickShapeEnabled = on;
  }
  setPressureEnabled(on: boolean): void {
    this.pointer.setPressureEnabled(on);
  }

  /* ── 스트로크 파이프라인 ── */
  /** 모드가 캔버스(종이)를 결정 — 유화=린넨천, 수채=수채용지, 그 외=매끈한 도화지 */
  private paperKindForMode(): PaperKind {
    return this.mode === "oil" ? "linen" : this.mode === "watercolor" ? "cotton" : "smooth";
  }

  private brushContext(): StrokeContext {
    const brush = this.brush!;
    const wash = brush.cfg.strokeBlend === "wash";
    // 작은 유화 획은 bold 붓결 LOD — fine 맵의 미세 골은 dab 축소 시 서브픽셀로 사라진다
    const pxSize = this.settings.size * brush.cfg.sizeScale;
    const tip: TipKind =
      brush.cfg.tip === "bristle" && pxSize < 40 ? "bristle-bold" : brush.cfg.tip;
    return {
      layerCanvas: this.layers.active.canvas,
      tip,
      composite: brush.cfg.composite,
      color: this.settings.color,
      paperGrain: brush.cfg.paperGrain,
      wash,
      strokeOpacity: wash ? clamp(brush.cfg.washOpacity * this.settings.opacity, 0, 1) : 1,
      wetEdge: brush.cfg.wetEdge,
      grainLift: brush.cfg.grainLift,
      streaks: brush.cfg.streaks,
      paperKind: this.paperKindForMode(),
    };
  }

  private strokeBegin(p: StrokePoint): void {
    if (this.replaying) return;
    // 페인트통(fill)은 클릭 1회 처리
    if (this.brushId === "fill") {
      this.doFill(p);
      return;
    }
    // 번짐(스머지)은 dab 파이프라인이 아니라 레이어 직접 편집
    if (this.brushId === "smudge") {
      this.smudgeBegin(p);
      return;
    }
    // 스포이트: 탭 지점의 화면 색을 찍어 알린다(그리지 않음)
    if (this.brushId === "eyedropper") {
      this.emit("colorPicked", { color: this.pickColor(p.x, p.y) });
      return;
    }
    this.brush = createBrush(this.brushId);
    this.quickShapeApplied = false;
    this.curPoints = [this.stabilizer.begin(p)];
    this.strokeStartTs = performance.now();
    this.firstDabLatency = -1;
    this.strokeBBox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    // undo용 before 스냅샷 — destination-out(지우개류)만 여기서(레이어에 직접 그리는 백엔드가 있음).
    // 다른 브러시는 endStroke 합성 직전까지 레이어가 안 변하므로 그때 캡처
    // (스트로크 시작 시 7MB getImageData 동기 readback 히치 제거).
    this.beforeFull =
      this.brush.cfg.composite === "destination-out" ? this.snapshotActiveLayer() : null;

    this.cm.backend.beginStroke(this.brushContext());
    const dabs = this.brush.begin(this.curPoints[0], this.settings);
    this.paintDabs(dabs, this.curPoints[0]);
    this.armQuickShapeHold();
  }

  private strokeMove(points: StrokePoint[]): void {
    if (this.smudging) {
      this.smudgeMove(points);
      return;
    }
    if (!this.brush || this.replaying) return;
    let lastSp: StrokePoint | null = null;
    for (const raw of points) {
      const sp = this.stabilizer.push(raw);
      this.curPoints.push(sp);
      const dabs = this.brush.move(sp);
      this.paintDabs(dabs, sp);
      if (dabs.length) this.armQuickShapeHold();
      lastSp = sp;
    }
    if (lastSp) this.emit("pointerMoved", { x: lastSp.x, y: lastSp.y });
    this.requestComposite();
  }

  private strokeEnd(p: StrokePoint): void {
    if (this.smudging) {
      this.smudgeEnd(p);
      return;
    }
    if (!this.brush || this.replaying) return;
    this.clearHold();
    const sp = this.stabilizer.push(p);
    this.curPoints.push(sp);
    this.paintDabs(this.brush.move(sp), sp);
    this.paintDabs(this.brush.end(), sp); // 탭 시 보류된 첫 dab(점 찍기)

    // QuickShape: 홀드 없이 뗐어도 도형성 강하면 스냅(옵션 시, 홀드로 이미 스냅됐으면 재감지 안 함)
    if (this.quickShapeEnabled && !this.quickShapeApplied) {
      const shape = detectShape(this.curPoints);
      if (shape) this.applyQuickShape(shape.kind, shape.points);
    }

    // 합성 직전 스냅샷(레이어는 아직 미변경 상태)
    if (!this.beforeFull) this.beforeFull = this.snapshotActiveLayer();
    if (this.quickShapeApplied) {
      // 도형이 프리핸드를 "대체"한다 — 프리핸드 스트로크 버퍼를 합성하면
      // 원본 쪽만 이중으로 진해진다(데칼코마니 실측 버그). 버퍼는 폐기.
      this.cm.backend.cancelStroke();
    } else {
      this.cm.backend.endStroke();
    }
    this.finalizeStroke(this.quickShapeApplied);
  }

  /** 진행 중 획 폐기(핀치 진입 등) — 레이어·히스토리·레코더에 아무것도 남기지 않는다.
   * ⚠️ Canvas2D 폴백의 지우개(레이어 직접)는 취소 불가 — 그 경우 이미 지운 만큼은 남는다 */
  private strokeCancel(): void {
    if (this.replaying) return;
    if (!this.brush && !this.smudging) return;
    this.clearHold();
    // 레이어를 직접 고치는 도구(번짐, Canvas2D 지우개)는 begin 스냅샷으로 원복
    if (this.beforeFull && (this.smudging || this.brush?.cfg.composite === "destination-out")) {
      this.layers.active.ctx.putImageData(
        new ImageData(this.beforeFull.slice(), this.width, this.height),
        0,
        0,
      );
    }
    this.cm.backend.cancelStroke();
    this.brush = null;
    this.smudging = false;
    this.smudgeLast = null;
    this.curPoints = [];
    this.beforeFull = null;
    this.quickShapeApplied = false;
    this.requestComposite(); // 라이브 프리뷰에 떠 있던 획 지우기
  }

  /* ── 번짐(스머지) — 레이어 픽셀을 문질러 끌고 간다(SmudgeTool 공용 헬퍼) ── */
  private smudging = false;
  private smudgeLast: { x: number; y: number } | null = null;

  private smudgeSize(): number {
    return this.settings.size * 1.6; // 문지름 폭은 넉넉하게(손가락 체감)
  }

  private smudgeBegin(p: StrokePoint): void {
    this.smudging = true;
    this.smudgeLast = { x: p.x, y: p.y };
    this.curPoints = [p];
    this.beforeFull = this.snapshotActiveLayer(); // 직접 편집이라 undo 스냅샷은 시작 시
    this.strokeBBox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  }

  private smudgeMove(points: StrokePoint[]): void {
    if (!this.smudgeLast) return;
    const ctx = this.layers.active.ctx;
    for (const p of points) {
      this.curPoints.push(p);
      this.smudgeLast = smearSegment(
        ctx,
        this.smudgeLast,
        p,
        this.smudgeSize(),
        this.settings.opacity,
        (x, y, d) => this.trackDirty(x, y, d),
      );
    }
    this.requestComposite();
  }

  private smudgeEnd(p: StrokePoint): void {
    this.resetSuggest(); // smudge도 히스토리 push — 그룹 불변식 유지
    this.smudgeMove([p]);
    this.smudging = false;
    this.smudgeLast = null;
    const bb = this.strokeBBox;
    if (isFinite(bb.minX) && this.beforeFull) {
      const layer = this.layers.active;
      const x = Math.max(0, Math.floor(bb.minX));
      const y = Math.max(0, Math.floor(bb.minY));
      const w = Math.min(this.width - x, Math.ceil(bb.maxX - x));
      const h = Math.min(this.height - y, Math.ceil(bb.maxY - y));
      const tiles = tilesForRect(x, y, w, h, this.width, this.height);
      const after = copyTiles(layer.ctx.getImageData(0, 0, this.width, this.height).data, this.width, tiles);
      const before = copyTiles(this.beforeFull, this.width, tiles);
      this.pushTileCommand(layer, tiles, before, after);
      // 무비 재생용 기록(재생도 같은 smearSegment 사용). 협동 브로드캐스트는 안 함 —
      // 원격 레이어 분리 구조에서 남의 픽셀을 문지를 수 없다(의도).
      this.recorder.record({
        brush: this.brushId,
        settings: { ...this.settings },
        layerId: layer.id,
        points: this.curPoints,
        symmetry: this.symmetry,
      });
    }
    this.beforeFull = null;
    this.curPoints = [];
    this.scheduleAutoSave();
  }

  /** 스포이트 — 보이는 레이어들을 흰 종이 위에 합성한 색(종이 결 틴트는 제외: 그리기 색 기준) */
  private pickCtx: CanvasRenderingContext2D | null = null;

  private pickColor(x: number, y: number): RGB {
    if (!this.pickCtx) {
      const c = document.createElement("canvas");
      c.width = c.height = 1;
      this.pickCtx = c.getContext("2d", { willReadFrequently: true })!;
    }
    const ctx = this.pickCtx;
    const sx = Math.max(0, Math.min(this.width - 1, Math.round(x)));
    const sy = Math.max(0, Math.min(this.height - 1, Math.round(y)));
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 1, 1);
    for (const layer of this.layers.list) {
      if (!layer.visible) continue;
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = blendToComposite(layer.blend);
      ctx.drawImage(layer.canvas, sx, sy, 1, 1, 0, 0, 1, 1);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2] };
  }

  private snapshotActiveLayer(): Uint8ClampedArray {
    return new Uint8ClampedArray(
      this.layers.active.ctx.getImageData(0, 0, this.width, this.height).data,
    );
  }

  /** 라이브 프리뷰용 스크래치 캔버스(지연 생성, 스트로크 중에만 사용) */
  private scratch: CanvasRenderingContext2D | null = null;
  private previewScratchCtx(): CanvasRenderingContext2D {
    if (!this.scratch) {
      const c = document.createElement("canvas");
      c.width = this.width;
      c.height = this.height;
      this.scratch = c.getContext("2d")!;
    }
    return this.scratch;
  }

  private paintDabs(dabs: ReturnType<BrushBase["begin"]>, center: StrokePoint): void {
    if (!dabs.length) return;
    if (this.firstDabLatency < 0) {
      this.firstDabLatency = performance.now() - this.strokeStartTs;
      this.emit("strokeLatency", { ms: this.firstDabLatency });
    }
    // 대칭 복제
    const all =
      this.symmetry === "none"
        ? dabs
        : dabs.flatMap((d) =>
            mirrorPoint(
              { x: d.x, y: d.y, pressure: 1, t: center.t },
              this.symmetry,
              this.width,
              this.height,
            ).map((m) => ({ ...d, x: m.x, y: m.y })),
          );
    this.cm.backend.drawDabs(all);
    for (const d of all) this.trackDirty(d.x, d.y, d.size);
    this.requestComposite();
  }

  private trackDirty(x: number, y: number, size: number): void {
    const r = size / 2 + 2;
    this.strokeBBox.minX = Math.min(this.strokeBBox.minX, x - r);
    this.strokeBBox.minY = Math.min(this.strokeBBox.minY, y - r);
    this.strokeBBox.maxX = Math.max(this.strokeBBox.maxX, x + r);
    this.strokeBBox.maxY = Math.max(this.strokeBBox.maxY, y + r);
  }

  /** 스트로크 종료 후 더티 타일 before/after를 커맨드로 기록 */
  private finalizeStroke(alreadyRecorded: boolean): void {
    const bb = this.strokeBBox;
    const layer = this.layers.active;
    if (!isFinite(bb.minX) || !this.beforeFull) {
      this.beforeFull = null;
      this.brush = null;
      return;
    }
    const x = Math.max(0, Math.floor(bb.minX));
    const y = Math.max(0, Math.floor(bb.minY));
    const w = Math.min(this.width - x, Math.ceil(bb.maxX - x));
    const h = Math.min(this.height - y, Math.ceil(bb.maxY - y));
    const tiles = tilesForRect(x, y, w, h, this.width, this.height);
    const after = copyTiles(
      layer.ctx.getImageData(0, 0, this.width, this.height).data,
      this.width,
      tiles,
    );
    const before = copyTiles(this.beforeFull, this.width, tiles);
    this.beforeFull = null;
    this.pushTileCommand(layer, tiles, before, after);

    if (!alreadyRecorded) {
      this.recorder.record({
        brush: this.brushId,
        settings: { ...this.settings },
        layerId: layer.id,
        points: this.curPoints,
        symmetry: this.symmetry,
      });
    }
    // 협동 전송용 방출(로컬 스트로크만)
    this.emit("strokeCommitted", {
      brush: this.brushId,
      color: this.settings.color,
      size: this.settings.size,
      opacity: this.settings.opacity,
      water: this.settings.waterAmount,
      symmetry: this.symmetry,
      points: this.curPoints,
    });
    if (this.brushId !== "eraser") this.emit("colorUsed", { color: this.settings.color });
    // 뚝딱그림 그룹 추적 — brush/curPoints 소거 전에, 이 획의 더티 bbox와 함께
    this.trackSuggest(alreadyRecorded, { minX: x, minY: y, maxX: x + w, maxY: y + h });
    this.brush = null;
    this.curPoints = [];
    this.scheduleAutoSave();
  }

  /**
   * 원격 스트로크를 전용 레이어에 렌더(협동). History/Recorder에 안 쌓임 → 내 undo가
   * 남의 스트로크를 지우지 않음(DESIGN-REVIEW: 협동 undo = 자기 스트로크만).
   */
  applyRemoteStroke(
    meta: { brush: BrushId; color: RGB; size: number; opacity: number; water: number; symmetry: SymmetryMode },
    points: StrokePoint[],
    userId: string,
  ): void {
    if (points.length === 0) return;
    const layer = this.remoteLayer(userId);
    const brush = createBrush(meta.brush);
    // 원격 payload는 신뢰 불가 — 범위를 로컬 UI와 동일하게 클램프(음수 알파/거대 dab 방어)
    const settings: BrushSettings = {
      size: clamp(meta.size, 1, 128),
      opacity: clamp(meta.opacity, 0, 1),
      color: meta.color,
      waterAmount: clamp(meta.water, 0, 1),
      stabilize: 0,
    };
    const remoteWash = brush.cfg.strokeBlend === "wash";
    const remotePx = settings.size * brush.cfg.sizeScale;
    const ctx: StrokeContext = {
      layerCanvas: layer.canvas,
      tip: brush.cfg.tip === "bristle" && remotePx < 40 ? "bristle-bold" : brush.cfg.tip,
      composite: brush.cfg.composite,
      color: meta.color,
      paperGrain: brush.cfg.paperGrain,
      wash: remoteWash,
      strokeOpacity: remoteWash ? clamp(brush.cfg.washOpacity * meta.opacity, 0, 1) : 1,
      wetEdge: brush.cfg.wetEdge,
      grainLift: brush.cfg.grainLift,
      streaks: brush.cfg.streaks,
      paperKind: this.paperKindForMode(),
    };
    this.cm.backend.beginStroke(ctx);
    let dabs = brush.begin(points[0], settings);
    for (let i = 1; i < points.length; i++) dabs = dabs.concat(brush.move(points[i]));
    dabs = dabs.concat(brush.end()); // rotationFollows 브러시의 보류 dab 회수
    this.cm.backend.drawDabs(dabs);
    this.cm.backend.endStroke();
    this.requestComposite();
  }

  private remoteLayers = new Map<string, Layer>();
  private remoteLayer(userId: string): Layer {
    let l = this.remoteLayers.get(userId);
    if (!l) {
      l = this.layers.addLayer(`협동:${userId.slice(0, 4)}`) ?? this.layers.active;
      this.remoteLayers.set(userId, l);
      this.emitLayers();
    }
    return l;
  }

  /** 더티 타일을 특정 레이어 캔버스에 되쓰는 커맨드 생성 */
  private pushTileCommand(
    layer: Layer,
    tiles: TileRect[],
    before: Uint8ClampedArray[],
    after: Uint8ClampedArray[],
  ): void {
    const blit = (ts: TileRect[], snaps: Uint8ClampedArray[]) => {
      ts.forEach((t, i) => {
        const img = new ImageData(snaps[i].slice(), t.w, t.h);
        layer.ctx.putImageData(img, t.x, t.y);
      });
      this.requestComposite();
      this.emitHistory();
    };
    this.history.push(new TileSnapshotCommand(tiles, before, after, blit));
    this.emitHistory();
  }

  /* ── 뚝딱그림(스케치 인식 → 스탬프 제안) ──
   * 연속된 그리기 스트로크를 공간 근접으로 묶고, 700ms 쉬면 $P 인식 후 후보를 emit.
   * 수락 = before 스냅샷 → 그룹 스트로크 k개 history.undo(스케치 픽셀 원복) → 스탬프
   * 그리기 → 커맨드 1개 push. push가 redo 스택(undo된 k개)을 폐기하므로 되돌리기
   * 1번에 "스탬프 ↔ 스케치"가 원자적으로 오간다.
   * 그룹 불변식: suggestStrokes는 항상 히스토리 스택 최상단 k개 커맨드와 1:1 —
   * 다른 종류의 push(fill·smudge·clear·QuickShape)나 undo/redo/레이어·모드 변경은 전부 리셋. */
  private suggestStrokes: { x: number; y: number }[][] = [];
  private suggestBBox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  private suggestLayerId: string | null = null;
  private suggestTimer: ReturnType<typeof setTimeout> | null = null;
  /** 그룹 상한 — 이보다 길면 채색/낙서로 보고 제안 중단 */
  private static readonly SUGGEST_MAX_STROKES = 12;
  private static readonly SUGGEST_DEBOUNCE_MS = 700;
  /** 그룹 합류 판정 여유(px) — 획끼리 이만큼 떨어져도 같은 그림으로 취급 */
  private static readonly SUGGEST_JOIN_PAD = 60;

  private resetSuggest(): void {
    if (this.suggestTimer) {
      clearTimeout(this.suggestTimer);
      this.suggestTimer = null;
    }
    if (this.suggestStrokes.length || this.suggestLayerId) {
      this.emit("suggestReady", { candidates: [] });
    }
    this.suggestStrokes = [];
    this.suggestLayerId = null;
    this.suggestBBox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  }

  /** finalizeStroke에서 호출(curPoints 소거 전) — bb = 이 획의 더티 bbox */
  private trackSuggest(
    quickShaped: boolean,
    bb: { minX: number; minY: number; maxX: number; maxY: number },
  ): void {
    const drawing =
      this.brushId !== "eraser" && this.brush?.cfg.composite !== "destination-out";
    if (
      !this.sketchSuggestEnabled ||
      this.suggestSuppressed || // 협동 방 — 치환이 원격에 전파 안 됨
      this.mode === "coloring" || // 색칠 중 제안은 소음
      this.symmetry !== "none" || // 데칼코마니: 미러 획까지 bbox에 잡혀 교체가 어긋난다
      quickShaped || // 이미 도형으로 스냅됨
      !drawing ||
      this.replaying
    ) {
      this.resetSuggest();
      return;
    }
    const layerId = this.layers.active.id;
    const joined =
      this.suggestStrokes.length > 0 &&
      this.suggestLayerId === layerId &&
      bb.minX - ArtEngine.SUGGEST_JOIN_PAD < this.suggestBBox.maxX &&
      bb.maxX + ArtEngine.SUGGEST_JOIN_PAD > this.suggestBBox.minX &&
      bb.minY - ArtEngine.SUGGEST_JOIN_PAD < this.suggestBBox.maxY &&
      bb.maxY + ArtEngine.SUGGEST_JOIN_PAD > this.suggestBBox.minY;
    if (!joined) this.resetSuggest();
    // 멀리서 새 획 = 새 그림의 시작(리셋 후 곧바로 새 그룹)
    const step = Math.max(1, Math.ceil(this.curPoints.length / 128));
    this.suggestStrokes.push(
      this.curPoints.filter((_, i) => i % step === 0).map((p) => ({ x: p.x, y: p.y })),
    );
    this.suggestLayerId = layerId;
    this.suggestBBox.minX = Math.min(this.suggestBBox.minX, bb.minX);
    this.suggestBBox.minY = Math.min(this.suggestBBox.minY, bb.minY);
    this.suggestBBox.maxX = Math.max(this.suggestBBox.maxX, bb.maxX);
    this.suggestBBox.maxY = Math.max(this.suggestBBox.maxY, bb.maxY);
    if (this.suggestStrokes.length > ArtEngine.SUGGEST_MAX_STROKES) {
      this.resetSuggest();
      return;
    }
    if (this.suggestTimer) clearTimeout(this.suggestTimer);
    this.suggestTimer = setTimeout(() => {
      this.suggestTimer = null;
      const candidates = recognizeSketch(this.suggestStrokes);
      this.emit("suggestReady", { candidates });
    }, ArtEngine.SUGGEST_DEBOUNCE_MS);
  }

  /** 제안 수락 — 그룹 스케치를 스탬프로 원자 교체(되돌리기 1번에 복귀) */
  acceptSuggestion(stampId: string): void {
    if (this.brush || this.smudging || this.replaying) return; // 획 진행 중 금지
    const k = this.suggestStrokes.length;
    const def = getStamp(stampId);
    if (!k || !def || this.layers.active.id !== this.suggestLayerId) {
      this.resetSuggest();
      return;
    }
    const layer = this.layers.active;
    const bb = this.suggestBBox;
    const cx = clamp((bb.minX + bb.maxX) / 2, 0, this.width);
    const cy = clamp((bb.minY + bb.maxY) / 2, 0, this.height);
    const size = clamp(
      (bb.maxX - bb.minX + (bb.maxY - bb.minY)) / 2,
      48,
      Math.min(this.width, this.height),
    );
    // 스케치와 스탬프 영역의 합집합 + 여유(외곽선 두께)
    const half = size / 2 + 12;
    const x = Math.max(0, Math.floor(Math.min(bb.minX, cx - half)));
    const y = Math.max(0, Math.floor(Math.min(bb.minY, cy - half)));
    const w = Math.min(this.width - x, Math.ceil(Math.max(bb.maxX, cx + half) - x));
    const h = Math.min(this.height - y, Math.ceil(Math.max(bb.maxY, cy + half) - y));
    if (w <= 0 || h <= 0) {
      this.resetSuggest();
      return;
    }
    const tiles = tilesForRect(x, y, w, h, this.width, this.height);
    const before = copyTiles(
      layer.ctx.getImageData(0, 0, this.width, this.height).data,
      this.width,
      tiles,
    );
    // 그룹 불변식 덕에 최상단 k개 = 정확히 이 스케치의 획들
    for (let i = 0; i < k; i++) {
      if (!this.history.undo()) break; // 불변식이 깨졌어도 before/after 스냅샷은 자기일관
    }
    drawStampOnCtx(layer.ctx, def, cx, cy, size, this.settings.color);
    const after = copyTiles(
      layer.ctx.getImageData(0, 0, this.width, this.height).data,
      this.width,
      tiles,
    );
    this.pushTileCommand(layer, tiles, before, after);
    // 무비 재생은 로그를 누적으로만 다시 그린다 — 치환된 스케치 획을 지우지 않으면
    // 재생 최종 프레임에 낙서 잔상이 남아 실제 그림과 달라진다(교차검증 합의 발견)
    this.recorder.dropLast(k);
    this.recorder.record({
      brush: "stamp",
      settings: { ...this.settings },
      layerId: layer.id,
      points: [{ x: cx, y: cy, pressure: 1, t: performance.now() }],
      symmetry: "none",
      extra: { stamp: { id: stampId, cx, cy, size } },
    });
    this.resetSuggest();
    this.requestComposite();
    this.scheduleAutoSave();
  }

  dismissSuggestion(): void {
    this.resetSuggest();
  }

  /* ── QuickShape 홀드 ── */
  private armQuickShapeHold(): void {
    if (!this.quickShapeEnabled) return;
    this.clearHold();
    this.holdTimer = setTimeout(() => {
      const shape = detectShape(this.curPoints);
      if (shape && this.brush) {
        this.applyQuickShape(shape.kind, shape.points);
      }
    }, QUICKSHAPE_HOLD_MS);
  }
  private clearHold(): void {
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }

  private quickShapeApplied = false;

  private applyQuickShape(kind: QuickShapeKind, points: { x: number; y: number }[]): void {
    // 지우개(destination-out)는 레이어에 직접 그려 프리핸드 취소가 불가 + 색선 도형이
    // 나가면 안 됨 — QuickShape 미적용
    if (this.brush?.cfg.composite === "destination-out") return;
    // 레이어에 직접 그리기 전에 undo용 before 확보(홀드 타이머로 스트로크 중간에도 옴)
    if (!this.beforeFull) this.beforeFull = this.snapshotActiveLayer();
    // 도형이 프리핸드를 대체 — 진행 중이던 스트로크 버퍼는 폐기(합성 금지)
    this.cm.backend.cancelStroke();
    const ctx = this.layers.active.ctx;
    // 대칭(데칼코마니) 복제: 프리핸드 dab처럼 도형 폴리라인도 축마다 그린다
    const variants =
      this.symmetry === "none"
        ? [points]
        : (() => {
            const per = points.map((p) =>
              mirrorPoint({ x: p.x, y: p.y, pressure: 1, t: 0 }, this.symmetry, this.width, this.height),
            );
            return per[0].map((_, k) => per.map((mp) => mp[k]));
          })();
    ctx.save();
    ctx.strokeStyle = `rgb(${this.settings.color.r},${this.settings.color.g},${this.settings.color.b})`;
    ctx.globalAlpha = this.settings.opacity;
    ctx.lineWidth = this.settings.size;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (const poly of variants) {
      ctx.beginPath();
      poly.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
      for (const p of poly) this.trackDirty(p.x, p.y, this.settings.size);
    }
    ctx.restore();
    this.quickShapeApplied = true;
    this.clearHold();
    this.emit("quickShapeApplied", { kind });
    this.requestComposite();
  }

  /* ── 페인트통 ── */
  private doFill(p: StrokePoint): void {
    const layer = this.layers.active;
    const img = layer.ctx.getImageData(0, 0, this.width, this.height);
    let barrier: Uint8Array | null = null;
    const lineart = this.layers.lineart;
    // 도안이 있으면 모드와 무관하게 선을 벽으로 — 색칠 도안을 열고 스케치/유화 탭으로
    // 전환해도 페인트통이 선을 넘으면 안 된다(mode==="coloring" 조건이던 실측 버그)
    if (lineart) {
      const la = lineart.ctx.getImageData(0, 0, this.width, this.height);
      barrier = buildBarrierFromLineart(la.data, this.width, this.height);
    }
    // before 스냅샷(전체 → 타일)
    const beforeFull = new Uint8ClampedArray(img.data);
    const res = floodFill(img.data, this.width, this.height, p.x, p.y, this.settings.color, {
      tolerance: 32,
      barrier,
    });
    if (!res.changed || !res.dirty) return; // 픽셀 무변경 — 제안 그룹도 건드리지 않는다
    this.resetSuggest(); // fill이 히스토리에 push되기 전 — 그룹 불변식 유지
    layer.ctx.putImageData(img, 0, 0);

    const tiles = tilesForRect(res.dirty.x, res.dirty.y, res.dirty.w, res.dirty.h, this.width, this.height);
    const after = copyTiles(img.data, this.width, tiles);
    const before = copyTiles(beforeFull, this.width, tiles);
    this.pushTileCommand(layer, tiles, before, after);
    this.emit("colorUsed", { color: this.settings.color });
    this.recorder.record({
      brush: "fill",
      settings: { ...this.settings },
      layerId: layer.id,
      points: [p],
      symmetry: "none",
      extra: { fill: true },
    });
    this.requestComposite();
    this.scheduleAutoSave();
  }

  /* ── 히스토리 ── */
  undo(): void {
    this.resetSuggest(); // 그룹↔히스토리 최상단 k개 대응이 깨진다
    if (this.history.undo()) {
      this.requestComposite();
      this.emitHistory();
    }
  }
  redo(): void {
    this.resetSuggest();
    if (this.history.redo()) {
      this.requestComposite();
      this.emitHistory();
    }
  }

  clearActiveLayer(): void {
    this.resetSuggest(); // clear도 히스토리 push — 그룹 불변식 유지
    const layer = this.layers.active;
    const beforeFull = new Uint8ClampedArray(
      layer.ctx.getImageData(0, 0, this.width, this.height).data,
    );
    const tiles = tilesForRect(0, 0, this.width, this.height, this.width, this.height);
    const before = copyTiles(beforeFull, this.width, tiles);
    this.layers.clearActive();
    const after = copyTiles(
      layer.ctx.getImageData(0, 0, this.width, this.height).data,
      this.width,
      tiles,
    );
    this.pushTileCommand(layer, tiles, before, after);
    this.requestComposite();
  }

  /** 새 그림: 그리기 레이어를 1장으로 줄여 비우고 히스토리·기록·자동저장 초기화(도안·원본은 유지) */
  newDrawing(): void {
    this.resetSuggest();
    const drawables = this.layers.info.filter((l) => !l.isLineart && !l.isBase);
    for (const l of drawables.slice(1)) this.layers.removeLayer(l.id);
    const first = this.layers.info.find((l) => !l.isLineart && !l.isBase);
    if (first) {
      this.layers.setActive(first.id);
      this.layers.setVisible(first.id, true);
      this.layers.setOpacity(first.id, 1);
      this.layers.clearActive();
    }
    this.history.clear();
    this.recorder.clear();
    void this.autosave.purge();
    this.emitLayers();
    this.emitHistory();
    this.requestComposite();
  }

  /* ── 레이어 API(UI가 호출) ── */
  addLayer(): void {
    if (this.layers.addLayer()) {
      this.resetSuggest(); // 활성 레이어가 새 레이어로 바뀐다 — 명시적 리셋
      this.emitLayers();
    }
  }
  removeLayer(id: string): void {
    if (this.layers.removeLayer(id)) {
      this.resetSuggest();
      this.emitLayers();
      this.requestComposite();
    }
  }
  setActiveLayer(id: string): void {
    this.resetSuggest(); // 그룹은 단일 레이어 전제
    this.layers.setActive(id);
    this.emitLayers();
  }
  setLayerVisible(id: string, v: boolean): void {
    this.layers.setVisible(id, v);
    this.emitLayers();
    this.requestComposite();
  }
  setLayerOpacity(id: string, o: number): void {
    this.layers.setOpacity(id, o);
    this.emitLayers(); // 스토어 미러 갱신 — 컨트롤드 슬라이더가 따라오도록
    this.requestComposite();
  }
  setLayerBlend(id: string, b: LayerInfo["blend"]): void {
    this.layers.setBlend(id, b);
    this.emitLayers();
    this.requestComposite();
  }

  /** 색칠 모드: 라인아트 이미지를 잠금 레이어로 로드 */
  async loadLineart(src: string): Promise<void> {
    const img = await loadImage(src);
    let la = this.layers.lineart;
    if (!la) la = this.layers.addLayer("도안", true)!;
    la.ctx.clearRect(0, 0, this.width, this.height);
    // 비율 유지 중앙 배치
    const scale = Math.min(this.width / img.width, this.height / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    la.ctx.drawImage(img, (this.width - dw) / 2, (this.height - dh) / 2, dw, dh);
    this.emitLayers();
    this.requestComposite();
  }

  /**
   * 이미지를 잠금 원본 레이어(최하단)에 깔기 — "그대로 이어 그리기"(내 작업 이어서).
   * 그리기 레이어에 깔면 지우개가 원본(도안 포함)까지 뚫어버린다(실사용 보고 2026-07-07)
   * — 원본은 별도 잠금 레이어, 이번 세션 획만 그리기 레이어에.
   */
  async loadBaseImage(src: string): Promise<void> {
    const img = await loadImage(src);
    const layer = this.layers.addBase();
    layer.ctx.clearRect(0, 0, this.width, this.height);
    const scale = Math.min(this.width / img.width, this.height / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    layer.ctx.drawImage(img, (this.width - dw) / 2, (this.height - dh) / 2, dw, dh);
    this.emitLayers();
    this.requestComposite();
    // 여기서 scheduleAutoSave 금지 — 재진입 직후 초기 로드가 이전 저장본(복구 배너 대상)을
    // 원본만 있는 상태로 덮어쓴다. 저장은 사용자의 실제 획(endStroke 등)부터.
  }

  /* ── 렌더 루프 ── */
  private requestComposite(): void {
    this.needsComposite = true;
  }
  private startLoop(): void {
    const loop = (ts: number) => {
      const dt = this.lastTick ? ts - this.lastTick : 16;
      this.lastTick = ts;
      // 수채/유화 시간 진행 시뮬
      const changed = this.cm.backend.tick(dt);
      if (changed) this.needsComposite = true;
      if (this.needsComposite) {
        this.compositeNow();
        this.needsComposite = false;
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private compositeNow(): void {
    const ctx = this.cm.displayCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.setTransform(this.view.scale, 0, 0, this.view.scale, this.view.ox, this.view.oy);
    // 진행 중 스트로크는 활성 레이어와 스크래치에서 먼저 합성해 정확히 프리뷰 —
    // 지우개가 아래 레이어를 뚫어 보이지 않고, 레이어 opacity/blend도 그대로 반영
    this.layers.composite(ctx, (c, layer) => {
      if (!this.brush) {
        c.drawImage(layer.canvas, 0, 0);
        return;
      }
      const s = this.previewScratchCtx();
      s.clearRect(0, 0, this.width, this.height);
      s.drawImage(layer.canvas, 0, 0);
      this.cm.backend.presentStroke(s);
      c.drawImage(s.canvas, 0, 0);
    });
    // 흰 종이는 맨 뒤(destination-over), 종이 결은 맨 위 multiply(표시 전용, 내보내기 미포함).
    // 결을 위에 곱해야 ① 도안(불투명 흰 배경)이 결을 덮지 않고 ② 물감 위로도
    // 캔버스 요철이 비쳐 "종이에 앉은" 질감이 난다(i-scream 방식).
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.globalCompositeOperation = "multiply";
    drawPaperTint(ctx, this.width, this.height, this.paperKindForMode());
    ctx.globalCompositeOperation = "source-over";
    // 데칼코마니 가이드(표시 전용 — 내보내기·저장엔 미포함): 대칭축을 연한 점선으로.
    // 어느 선을 기준으로 접히는지 보여야 아이가 대칭을 이해하고 그린다(2026-07-09 요청).
    if (this.symmetry !== "none") {
      ctx.save();
      ctx.strokeStyle = "rgba(91,184,245,0.45)"; // sky 톤
      ctx.lineWidth = 2 / this.view.scale; // 줌과 무관하게 화면상 2px
      ctx.setLineDash([10 / this.view.scale, 8 / this.view.scale]);
      ctx.beginPath();
      if (this.symmetry === "vertical" || this.symmetry === "quad") {
        ctx.moveTo(this.width / 2, 0);
        ctx.lineTo(this.width / 2, this.height);
      }
      if (this.symmetry === "horizontal" || this.symmetry === "quad") {
        ctx.moveTo(0, this.height / 2);
        ctx.lineTo(this.width, this.height / 2);
      }
      ctx.stroke();
      ctx.restore();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.emit("dirty", {});
  }

  /* ── AutoSave ── */
  private scheduleAutoSave(): void {
    this.autosave.schedule(() => this.snapshotState());
  }
  private snapshotState(): SavedState {
    return {
      savedAt: Date.now(),
      width: this.width,
      height: this.height,
      mode: this.mode,
      layers: this.layers.list.map((l) => ({
        id: l.id,
        name: l.name,
        visible: l.visible,
        opacity: l.opacity,
        blend: l.blend,
        isLineart: l.isLineart,
        isBase: l.isBase,
        png: dataURLToBlobSync(l.canvas.toDataURL("image/png")),
      })),
      recorder: this.recorder.serialize(),
    };
  }
  async checkRestore(): Promise<number | null> {
    const state = await this.autosave.restore();
    if (state && Date.now() - state.savedAt < 1000 * 60 * 60 * 24) {
      this.emit("restoreAvailable", { savedAt: state.savedAt });
      return state.savedAt;
    }
    return null;
  }
  async restore(): Promise<boolean> {
    this.resetSuggest(); // 히스토리 없는 픽셀 대체 — 그룹 무효
    const state = await this.autosave.restore();
    if (!state) return false;
    for (const saved of state.layers) {
      // 역할(도안/원본)로 먼저 매칭 — 재마운트로 id가 바뀌어도 잠금 레이어가
      // 일반 레이어로 둔갑해 지우개에 뚫리는 사고 방지
      const layer = saved.isLineart
        ? (this.layers.lineart ?? this.layers.addLayer(saved.name, true))
        : saved.isBase
          ? this.layers.addBase(saved.name)
          : (this.layers.list.find((l) => l.id === saved.id && !l.isLineart && !l.isBase) ??
            this.layers.addLayer(saved.name));
      if (!layer) continue;
      const img = await blobToImage(saved.png);
      layer.ctx.clearRect(0, 0, this.width, this.height);
      layer.ctx.drawImage(img, 0, 0);
      this.layers.setVisible(layer.id, saved.visible);
      this.layers.setOpacity(layer.id, saved.opacity);
      this.layers.setBlend(layer.id, saved.blend as LayerInfo["blend"]);
    }
    this.recorder.load(state.recorder);
    this.emitLayers();
    this.requestComposite();
    return true;
  }
  async discardRestore(): Promise<void> {
    await this.autosave.purge();
  }

  /* ── 무비/내보내기 ── */
  getRecorder(): StrokeRecorder {
    return this.recorder;
  }
  getLayers(): LayerStack {
    return this.layers;
  }
  get usingWebGL2(): boolean {
    return this.cm.usingWebGL2;
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.clearHold();
    if (this.suggestTimer) {
      clearTimeout(this.suggestTimer);
      this.suggestTimer = null;
    }
    this.pointer.destroy();
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.flushAutoSave);
      window.removeEventListener("pagehide", this.flushAutoSave);
    }
    void this.autosave.flush(); // 재마운트(가로/세로 전환 등) 시점의 대기분도 보존
    this.autosave.destroy();
    this.cm.destroy();
    this.layers.destroy();
    this.history.clear();
    this.listeners.clear();
  }
}

/* ── 헬퍼 ── */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`이미지 로드 실패: ${src}`));
    img.src = src;
  });
}
function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("blob 이미지 로드 실패"));
    };
    img.src = url;
  });
}
function dataURLToBlobSync(dataURL: string): Blob {
  const [head, body] = dataURL.split(",");
  const mime = /:(.*?);/.exec(head)?.[1] ?? "image/png";
  const bin = atob(body);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** perfect-freehand 외곽선 → Path2D 문자열(대체 렌더용, 벡터 미리보기) */
export function strokeToPath(points: StrokePoint[], size: number, stabilize: number): string {
  const outline = getStroke(
    points.map((p) => [p.x, p.y, p.pressure]),
    {
      size,
      thinning: 0.6,
      smoothing: 0.5,
      streamline: strengthToStreamline(stabilize),
      simulatePressure: false,
      last: true,
    },
  );
  if (!outline.length) return "";
  const d = outline.reduce(
    (acc, [x, y], i) => acc + (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`),
    "",
  );
  return d + " Z";
}
