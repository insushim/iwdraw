/*
 * AutoSave: IndexedDB에 5초 디바운스로 캔버스 상태 저장 + 복구.
 * 브라우저 API 결합 모듈 — 순수 로직 아님(테스트는 fake-indexeddb 또는 E2E).
 */
const DB_NAME = "arton";
const STORE = "autosave";
const KEY = "current";

export interface SavedState {
  savedAt: number;
  width: number;
  height: number;
  mode: string;
  /** 레이어별 PNG blob(합성 전 원본 보존) */
  layers: { id: string; name: string; visible: boolean; opacity: number; blend: string; png: Blob }[];
  /** 무비 모드용 스트로크 로그 JSON */
  recorder: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB 미지원"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class AutoSave {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs: number;
  private pending: (() => SavedState) | null = null;
  private saving = false;

  constructor(debounceMs = 5000) {
    this.debounceMs = debounceMs;
  }

  /** 상태 스냅샷 팩토리를 등록 — 디바운스 후 1회만 실제 저장 */
  schedule(snapshot: () => SavedState): void {
    this.pending = snapshot;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), this.debounceMs);
  }

  async flush(): Promise<void> {
    if (!this.pending || this.saving) return;
    this.saving = true;
    const snap = this.pending;
    this.pending = null;
    try {
      const state = snap();
      const db = await openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(state, KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch {
      /* 저장 실패는 조용히 무시(다음 디바운스에서 재시도) */
    } finally {
      this.saving = false;
    }
  }

  async restore(): Promise<SavedState | null> {
    try {
      const db = await openDb();
      const state = await new Promise<SavedState | null>((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(KEY);
        req.onsuccess = () => resolve((req.result as SavedState) ?? null);
        req.onerror = () => reject(req.error);
      });
      db.close();
      return state;
    } catch {
      return null;
    }
  }

  async purge(): Promise<void> {
    try {
      const db = await openDb();
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
      db.close();
    } catch {
      /* noop */
    }
  }

  destroy(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
