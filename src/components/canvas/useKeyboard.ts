"use client";

import { useEffect } from "react";
import { useEditor } from "@/store/editor";
import type { BrushId } from "@/engine/types";

/* 접근성: 키보드 단축키(B 브러시, E 지우개, Z undo, Y redo 등) */
const KEY_BRUSH: Record<string, BrushId> = {
  b: "pencil",
  e: "eraser",
  m: "marker",
  w: "watercolor",
  o: "oil",
  g: "glow",
  r: "rainbow",
  f: "fill",
};

export function useKeyboard() {
  const store = useEditor;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const s = store.getState();
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();

      if (mod && k === "z") {
        e.preventDefault();
        e.shiftKey ? s.redo() : s.undo();
        return;
      }
      if (mod && k === "y") {
        e.preventDefault();
        s.redo();
        return;
      }
      if (!mod && KEY_BRUSH[k]) {
        e.preventDefault();
        s.setBrush(KEY_BRUSH[k]);
        return;
      }
      if (k === "[") s.setSize(Math.max(1, s.size - 2));
      if (k === "]") s.setSize(Math.min(128, s.size + 2));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [store]);
}
