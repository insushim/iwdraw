"use client";

import { create } from "zustand";
import type { ArtEngine } from "@/engine/ArtEngine";
import type { BlendMode, BrushId, LayerInfo, Mode, RGB, SymmetryMode } from "@/engine/types";

/*
 * 에디터 스토어: ArtEngine(비-React)과 UI를 잇는 브리지.
 * 엔진 이벤트를 구독해 UI 상태를 미러링하고, UI 액션은 엔진 메서드를 호출한다.
 */

export interface EditorState {
  engine: ArtEngine | null;
  ready: boolean;

  mode: Mode;
  brush: BrushId;
  color: RGB;
  recentColors: RGB[];
  size: number;
  opacity: number;
  water: number;
  stabilize: number;
  symmetry: SymmetryMode;
  quickShape: boolean;
  juniorMode: boolean;

  canUndo: boolean;
  canRedo: boolean;
  layers: LayerInfo[];
  activeLayerId: string;

  latencyMs: number;
  usingWebGL2: boolean;
  restoreAvailable: number | null;

  // ── 바인딩 ──
  attach: (engine: ArtEngine) => void;
  detach: () => void;

  // ── 액션 ──
  setMode: (m: Mode) => void;
  setBrush: (b: BrushId) => void;
  setColor: (c: RGB) => void;
  setSize: (n: number) => void;
  setOpacity: (n: number) => void;
  setWater: (n: number) => void;
  setStabilize: (n: number) => void;
  setSymmetry: (m: SymmetryMode) => void;
  toggleQuickShape: () => void;
  toggleJunior: () => void;
  undo: () => void;
  redo: () => void;
  clearActive: () => void;
  addLayer: () => void;
  removeLayer: (id: string) => void;
  setActiveLayer: (id: string) => void;
  setLayerVisible: (id: string, v: boolean) => void;
  setLayerOpacity: (id: string, o: number) => void;
  setLayerBlend: (id: string, b: BlendMode) => void;
  dismissRestore: () => void;
}

let unsub: Array<() => void> = [];

const DEFAULT_PALETTE_INK: RGB = { r: 45, g: 42, b: 38 };

export const useEditor = create<EditorState>((set, get) => ({
  engine: null,
  ready: false,
  mode: "sketch",
  brush: "pencil",
  color: DEFAULT_PALETTE_INK,
  recentColors: [],
  size: 18,
  opacity: 1,
  water: 0.6,
  stabilize: 3,
  symmetry: "none",
  quickShape: false,
  juniorMode: false,
  canUndo: false,
  canRedo: false,
  layers: [],
  activeLayerId: "",
  latencyMs: 0,
  usingWebGL2: false,
  restoreAvailable: null,

  attach: (engine) => {
    unsub.forEach((u) => u());
    unsub = [
      engine.on("historyChange", ({ canUndo, canRedo }) => set({ canUndo, canRedo })),
      engine.on("layersChange", ({ layers, activeId }) =>
        set({ layers, activeLayerId: activeId }),
      ),
      engine.on("strokeLatency", ({ ms }) => set({ latencyMs: Math.round(ms) })),
      engine.on("restoreAvailable", ({ savedAt }) => set({ restoreAvailable: savedAt })),
    ];
    set({ engine, ready: true, usingWebGL2: engine.usingWebGL2 });
    void engine.checkRestore();
  },

  detach: () => {
    unsub.forEach((u) => u());
    unsub = [];
    set({ engine: null, ready: false, layers: [] });
  },

  setMode: (m) => {
    get().engine?.setMode(m);
    // 모드 전환 시 엔진이 기본 브러시를 바꾸므로 미러링
    const eng = get().engine;
    set({ mode: m, brush: eng?.brushId ?? get().brush });
  },
  setBrush: (b) => {
    get().engine?.setBrush(b);
    set({ brush: b });
  },
  setColor: (c) => {
    get().engine?.setColor(c);
    set((s) => {
      const key = (x: RGB) => `${x.r},${x.g},${x.b}`;
      const recent = [c, ...s.recentColors.filter((r) => key(r) !== key(c))].slice(0, 8);
      return { color: c, recentColors: recent };
    });
  },
  setSize: (n) => {
    get().engine?.setSize(n);
    set({ size: n });
  },
  setOpacity: (n) => {
    get().engine?.setOpacity(n);
    set({ opacity: n });
  },
  setWater: (n) => {
    get().engine?.setWater(n);
    set({ water: n });
  },
  setStabilize: (n) => {
    get().engine?.setStabilize(n);
    set({ stabilize: n });
  },
  setSymmetry: (m) => {
    get().engine?.setSymmetry(m);
    set({ symmetry: m });
  },
  toggleQuickShape: () => {
    const q = !get().quickShape;
    get().engine?.setQuickShape(q);
    set({ quickShape: q });
  },
  toggleJunior: () => set((s) => ({ juniorMode: !s.juniorMode })),
  undo: () => get().engine?.undo(),
  redo: () => get().engine?.redo(),
  clearActive: () => get().engine?.clearActiveLayer(),
  addLayer: () => get().engine?.addLayer(),
  removeLayer: (id) => get().engine?.removeLayer(id),
  setActiveLayer: (id) => get().engine?.setActiveLayer(id),
  setLayerVisible: (id, v) => get().engine?.setLayerVisible(id, v),
  setLayerOpacity: (id, o) => get().engine?.setLayerOpacity(id, o),
  setLayerBlend: (id, b) => get().engine?.setLayerBlend(id, b),
  dismissRestore: () => {
    void get().engine?.discardRestore();
    set({ restoreAvailable: null });
  },
}));
