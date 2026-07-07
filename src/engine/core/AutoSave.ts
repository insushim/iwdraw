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
  /** 레이어별 PNG blob(합성 전 원본 보존). isLineart/isBase는 복원 시 역할(잠금·위치·blend) 재현용 */
  layers: {
    id: string;
    name: string;
    visible: boolean;
    opacity: number;
    blend: string;
    isLineart?: boolean;
    isBase?: boolean;
    png: Blob;
  }[];
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
  private readonly maxWaitMs: number;
  private pending: (() => SavedState) | null = null;
  private saving = false;
  /** 첫 schedule 시각 — 디바운스가 계속 리셋돼도 maxWait을 넘기면 강제 플러시 */
  private pendingSince = 0;

  constructor(debounceMs = 5000, maxWaitMs = 15000) {
    this.debounceMs = debounceMs;
    this.maxWaitMs = maxWaitMs;
  }

  /** 상태 스냅샷 팩토리를 등록 — 디바운스 후 1회만 실제 저장 */
  schedule(snapshot: () => SavedState): void {
    if (!this.pending) this.pendingSince = Date.now();
    this.pending = snapshot;
    if (this.timer) clearTimeout(this.timer);
    // 쉼 없이 그리면 디바운스가 무한 리셋 → 세션 내내 저장 0회(실측: 웨일북 화면 꺼짐 통유실).
    // 대기 시작 후 maxWait을 넘기면 디바운스를 무시하고 즉시 저장.
    const elapsed = Date.now() - this.pendingSince;
    const delay = elapsed >= this.maxWaitMs ? 0 : Math.min(this.debounceMs, this.maxWaitMs - elapsed);
    this.timer = setTimeout(() => void this.flush(), delay);
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
