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
import { drawPaperTint } from "./core/paper";
import { tilesForRect, copyTiles, TileSnapshotCommand, type TileRect } from "./core/tiles";
import type { Layer } from "./core/LayerStack";
import { BrushBase, createBrush } from "./brushes";
import { buildBarrierFromLineart, floodFill } from "./brushes/FillTool";
import { PointerHandler } from "./input/PointerHandler";
import { Gestures } from "./input/Gestures";
import { Stabilizer, strengthToStreamline } from "./input/Stabilizer";
import { mirrorPoint } from "./tools/Symmetry";
import { detectShape, QUICKSHAPE_HOLD_MS } from "./tools/QuickShape";
import type { StrokeContext } from "./core/backend";
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
        onGesture: (active, _e, phase) =>
          this.gestures.update(
            active.map((a) => ({ clientX: a.clientX, clientY: a.clientY })),
            phase,
            performance.now(),
          ),
      },
    );

    this.startLoop();
    this.emitLayers();
    this.emitHistory();
  }

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
    const newScale = clamp(this.view.scale * scale, 0.5, 8);
    // 핀치 중심 고정
    this.view.ox = px - ((px - this.view.ox) * newScale) / this.view.scale + dx;
    this.view.oy = py - ((py - this.view.oy) * newScale) / this.view.scale + dy;
    this.view.scale = newScale;
    this.requestComposite();
  }

  resetView(): void {
    this.view = { scale: 1, ox: 0, oy: 0 };
    this.requestComposite();
  }

  /* ── 브러시/모드 설정 ── */
  setMode(mode: Mode): void {
    this.mode = mode;
    // 모드별 기본 브러시
    const def: Record<Mode, BrushId> = {
      sketch: "pencil",
      watercolor: "watercolor",
      oil: "oil",
      coloring: "crayon",
    };
    this.setBrush(def[mode]);
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
  }
  setQuickShape(on: boolean): void {
    this.quickShapeEnabled = on;
  }

  /* ── 스트로크 파이프라인 ── */
  private brushContext(): StrokeContext {
    const brush = this.brush!;
    const wash = brush.cfg.strokeBlend === "wash";
    return {
      layerCanvas: this.layers.active.canvas,
      tip: brush.cfg.tip,
      composite: brush.cfg.composite,
      color: this.settings.color,
      paperGrain: brush.cfg.paperGrain,
      wash,
      strokeOpacity: wash ? clamp(brush.cfg.washOpacity * this.settings.opacity, 0, 1) : 1,
      wetEdge: brush.cfg.wetEdge,
    };
  }

  private strokeBegin(p: StrokePoint): void {
    if (this.replaying) return;
    // 페인트통(fill)은 클릭 1회 처리
    if (this.brushId === "fill") {
      this.doFill(p);
      return;
    }
    this.brush = createBrush(this.brushId);
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
    if (!this.brush || this.replaying) return;
    this.clearHold();
    const sp = this.stabilizer.push(p);
    this.curPoints.push(sp);
    this.paintDabs(this.brush.move(sp), sp);
    this.paintDabs(this.brush.end(), sp); // 탭 시 보류된 첫 dab(점 찍기)

    // QuickShape: 홀드 없이 뗐어도 도형성 강하면 스냅(옵션 시)
    let recorded = false;
    if (this.quickShapeEnabled) {
      const shape = detectShape(this.curPoints);
      if (shape) {
        this.applyQuickShape(shape.kind, shape.points);
        recorded = true;
      }
    }

    // 합성 직전 스냅샷(레이어는 아직 미변경 상태)
    if (!this.beforeFull) this.beforeFull = this.snapshotActiveLayer();
    this.cm.backend.endStroke();
    this.finalizeStroke(recorded);
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
    const ctx: StrokeContext = {
      layerCanvas: layer.canvas,
      tip: brush.cfg.tip,
      composite: brush.cfg.composite,
      color: meta.color,
      paperGrain: brush.cfg.paperGrain,
      wash: remoteWash,
      strokeOpacity: remoteWash ? clamp(brush.cfg.washOpacity * meta.opacity, 0, 1) : 1,
      wetEdge: brush.cfg.wetEdge,
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

  private applyQuickShape(kind: QuickShapeKind, points: { x: number; y: number }[]): void {
    // 레이어에 직접 그리기 전에 undo용 before 확보(홀드 타이머로 스트로크 중간에도 옴)
    if (!this.beforeFull) this.beforeFull = this.snapshotActiveLayer();
    const ctx = this.layers.active.ctx;
    // 임시 스트로크 취소: 마지막 finalize 전이므로 레이어에 이미 그려진 임시 dab을 덮어야 함.
    // 간단화를 위해 현재 스트로크 영역을 before로 복원 후 도형을 그린다.
    ctx.save();
    ctx.strokeStyle = `rgb(${this.settings.color.r},${this.settings.color.g},${this.settings.color.b})`;
    ctx.lineWidth = this.settings.size;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
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
    if (this.mode === "coloring" && lineart) {
      const la = lineart.ctx.getImageData(0, 0, this.width, this.height);
      barrier = buildBarrierFromLineart(la.data, this.width, this.height);
    }
    // before 스냅샷(전체 → 타일)
    const beforeFull = new Uint8ClampedArray(img.data);
    const res = floodFill(img.data, this.width, this.height, p.x, p.y, this.settings.color, {
      tolerance: 32,
      barrier,
    });
    if (!res.changed || !res.dirty) return;
    layer.ctx.putImageData(img, 0, 0);

    const tiles = tilesForRect(res.dirty.x, res.dirty.y, res.dirty.w, res.dirty.h, this.width, this.height);
    const after = copyTiles(img.data, this.width, tiles);
    const before = copyTiles(beforeFull, this.width, tiles);
    this.pushTileCommand(layer, tiles, before, after);
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
    if (this.history.undo()) {
      this.requestComposite();
      this.emitHistory();
    }
  }
  redo(): void {
    if (this.history.redo()) {
      this.requestComposite();
      this.emitHistory();
    }
  }

  clearActiveLayer(): void {
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

  /* ── 레이어 API(UI가 호출) ── */
  addLayer(): void {
    if (this.layers.addLayer()) this.emitLayers();
  }
  removeLayer(id: string): void {
    if (this.layers.removeLayer(id)) {
      this.emitLayers();
      this.requestComposite();
    }
  }
  setActiveLayer(id: string): void {
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
    // 종이 배경은 맨 뒤에 깐다(destination-over) — 지우개 프리뷰가 종이까지 뚫지 않게.
    // 린넨 결 → 흰 종이 순서(표시 전용, PNG 내보내기엔 미포함)
    ctx.globalCompositeOperation = "destination-over";
    drawPaperTint(ctx, this.width, this.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.globalCompositeOperation = "source-over";
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
    const state = await this.autosave.restore();
    if (!state) return false;
    for (const saved of state.layers) {
      const layer =
        this.layers.list.find((l) => l.id === saved.id) ?? this.layers.addLayer(saved.name);
      if (!layer) continue;
      const img = await blobToImage(saved.png);
      layer.ctx.clearRect(0, 0, this.width, this.height);
      layer.ctx.drawImage(img, 0, 0);
      this.layers.setVisible(layer.id, saved.visible);
      this.layers.setOpacity(layer.id, saved.opacity);
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
    this.pointer.destroy();
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
