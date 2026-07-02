"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { getStudentSession } from "@/lib/student-session";
import { encodeStroke, decodeStroke } from "@/lib/stroke-codec";
import type { BrushId, RGB, StrokePoint, SymmetryMode } from "@/engine/types";

/*
 * 협동 캔버스 (DESIGN-REVIEW A3):
 *  - 스트로크는 종료 시 배치 전송(Realtime 처리량 한계 대비, 포인트 단위 X)
 *  - Float32 delta + base64 인코딩(stroke-codec)
 *  - presence로 닉네임 커서 표시
 *  - 수신측은 좌표 범위·이벤트율 검증 후 렌더(악성 스트림 방어)
 */

export interface RemoteStrokeMeta {
  brush: BrushId;
  color: RGB;
  size: number;
  opacity: number;
  water: number;
  symmetry: SymmetryMode;
  userId: string;
  nickname: string;
  strokeId: number;
}

export interface CollabCallbacks {
  onRemoteStroke: (meta: RemoteStrokeMeta, points: StrokePoint[]) => void;
  onPeersChange: (peers: { id: string; nickname: string; color: string }[]) => void;
  onCursor: (userId: string, nickname: string, x: number, y: number) => void;
  /** 방장(교사)이 강퇴/잠금 */
  onKicked: () => void;
  onLocked: (locked: boolean) => void;
}

const MAX_EVENTS_PER_SEC = 40; // 수신측 악성 스트림 상한

export class CollabSession {
  private channel: RealtimeChannel | null = null;
  private userId: string;
  private nickname: string;
  private recvTimestamps = new Map<string, number[]>();
  active = false;

  constructor(
    private readonly room: string,
    private readonly cb: CollabCallbacks,
    private readonly canvasW: number,
    private readonly canvasH: number,
  ) {
    const session = getStudentSession();
    this.userId = session?.studentId ?? `guest-${Math.floor(performance.now())}`;
    this.nickname = session?.nickname ?? "손님";
  }

  async connect(): Promise<boolean> {
    const sb = getSupabaseBrowser();
    if (!sb) return false;
    const color = pickColor(this.userId);
    const ch = sb.channel(`collab:${this.room}`, {
      config: { broadcast: { self: false, ack: false }, presence: { key: this.userId } },
    });

    ch.on("broadcast", { event: "stroke" }, ({ payload }) => this.handleStroke(payload));
    ch.on("broadcast", { event: "cursor" }, ({ payload }) => {
      const p = payload as { userId: string; nickname: string; x: number; y: number };
      if (p.userId !== this.userId) this.cb.onCursor(p.userId, p.nickname, p.x, p.y);
    });
    ch.on("broadcast", { event: "control" }, ({ payload }) => {
      const p = payload as { type: string; target?: string; locked?: boolean };
      if (p.type === "kick" && p.target === this.userId) this.cb.onKicked();
      if (p.type === "lock") this.cb.onLocked(!!p.locked);
    });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<{ nickname: string; color: string }>();
      const peers = Object.entries(state).map(([id, metas]) => ({
        id,
        nickname: metas[0]?.nickname ?? "손님",
        color: metas[0]?.color ?? "#5BB8F5",
      }));
      this.cb.onPeersChange(peers);
    });

    await new Promise<void>((resolve) => {
      ch.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void ch.track({ nickname: this.nickname, color });
          resolve();
        }
      });
    });
    this.channel = ch;
    this.active = true;
    return true;
  }

  private handleStroke(payload: unknown): void {
    const p = payload as { meta: RemoteStrokeMeta; data: string };
    if (!p?.meta || !p.data) return;
    // 이벤트율 제한(악성 스트림 방어)
    const now = performance.now();
    const arr = this.recvTimestamps.get(p.meta.userId) ?? [];
    const recent = arr.filter((t) => now - t < 1000);
    if (recent.length >= MAX_EVENTS_PER_SEC) return;
    recent.push(now);
    this.recvTimestamps.set(p.meta.userId, recent);

    const points = decodeStroke(p.data).filter(
      (pt) => pt.x >= -50 && pt.y >= -50 && pt.x <= this.canvasW + 50 && pt.y <= this.canvasH + 50,
    );
    if (points.length === 0) return;
    this.cb.onRemoteStroke(p.meta, points);
  }

  sendStroke(meta: Omit<RemoteStrokeMeta, "userId" | "nickname">, points: StrokePoint[]): void {
    if (!this.channel) return;
    void this.channel.send({
      type: "broadcast",
      event: "stroke",
      payload: {
        meta: { ...meta, userId: this.userId, nickname: this.nickname },
        data: encodeStroke(points),
      },
    });
  }

  private lastCursor = 0;
  sendCursor(x: number, y: number): void {
    if (!this.channel) return;
    const now = performance.now();
    if (now - this.lastCursor < 60) return; // ~16Hz 상한
    this.lastCursor = now;
    void this.channel.send({
      type: "broadcast",
      event: "cursor",
      payload: { userId: this.userId, nickname: this.nickname, x, y },
    });
  }

  /** 방장 전용: 강퇴/잠금 */
  sendControl(type: "kick" | "lock", opts: { target?: string; locked?: boolean }): void {
    if (!this.channel) return;
    void this.channel.send({ type: "broadcast", event: "control", payload: { type, ...opts } });
  }

  disconnect(): void {
    if (this.channel) {
      void this.channel.unsubscribe();
      this.channel = null;
    }
    this.active = false;
  }
}

const COLORS = ["#FF7A59", "#5BB8F5", "#7BC96F", "#FFC84A", "#B878E0", "#E5484D"];
function pickColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}
