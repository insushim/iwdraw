"use client";

import { getStudentSession } from "@/lib/student-session";
import { hasBackend } from "@/lib/backend";
import { encodeStroke, decodeStroke } from "@/lib/stroke-codec";
import type { BrushId, RGB, StrokePoint, SymmetryMode } from "@/engine/types";

/*
 * 협동 캔버스 (DESIGN-REVIEW A3) — Cloudflare Durable Object WebSocket 백엔드.
 *  - 스트로크는 종료 시 배치 전송(포인트 단위 X), Float32 delta + base64(stroke-codec)
 *  - presence: 서버가 peer 목록(닉네임/색)을 join/leave 시 브로드캐스트
 *  - 수신측은 좌표 범위·이벤트율 검증 후 렌더(악성 스트림 방어)
 *  - self 제외는 서버(broadcast except sender)가 담당
 * 프로토콜(양방향 JSON {event,payload}): hello / stroke / cursor / control / peers
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
  private ws: WebSocket | null = null;
  private userId: string;
  private nickname: string;
  private color: string;
  private recvTimestamps = new Map<string, number[]>();
  active = false;

  constructor(
    private readonly room: string,
    private readonly cb: CollabCallbacks,
    private readonly canvasW: number,
    private readonly canvasH: number,
  ) {
    const session = getStudentSession();
    // 교사가 대시보드에서 연 방(?as=teacher)이면 참가자 이름을 '선생님'으로 — 학생 세션이 없다
    const asTeacher =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("as") === "teacher";
    this.userId = session?.studentId ?? (asTeacher ? `teacher-${Math.floor(performance.now())}` : `guest-${Math.floor(performance.now())}`);
    this.nickname = session?.nickname ?? (asTeacher ? "선생님" : "손님");
    this.color = pickColor(this.userId);
  }

  async connect(): Promise<boolean> {
    if (!hasBackend() || typeof window === "undefined") return false;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${window.location.host}/api/collab/${encodeURIComponent(this.room)}`;

    return new Promise<boolean>((resolve) => {
      let settled = false;
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch {
        resolve(false);
        return;
      }

      ws.onopen = () => {
        this.ws = ws;
        this.active = true;
        ws.send(
          JSON.stringify({
            event: "hello",
            payload: { userId: this.userId, nickname: this.nickname, color: this.color },
          }),
        );
        if (!settled) {
          settled = true;
          resolve(true);
        }
      };

      ws.onmessage = (e) => {
        let m: { event?: string; payload?: unknown };
        try {
          m = JSON.parse(typeof e.data === "string" ? e.data : "");
        } catch {
          return;
        }
        this.dispatch(m.event, m.payload);
      };

      ws.onerror = () => {
        if (!settled) {
          settled = true;
          resolve(false);
        }
      };

      ws.onclose = () => {
        this.active = false;
      };
    });
  }

  private dispatch(event: string | undefined, payload: unknown): void {
    switch (event) {
      case "stroke":
        this.handleStroke(payload);
        break;
      case "cursor": {
        const p = payload as { userId: string; nickname: string; x: number; y: number };
        if (p && p.userId !== this.userId) this.cb.onCursor(p.userId, p.nickname, p.x, p.y);
        break;
      }
      case "control": {
        const p = payload as { type: string; target?: string; locked?: boolean };
        if (p?.type === "kick" && p.target === this.userId) this.cb.onKicked();
        if (p?.type === "lock") this.cb.onLocked(!!p.locked);
        break;
      }
      case "peers": {
        const peers = (payload as { id: string; nickname: string; color: string }[]) ?? [];
        this.cb.onPeersChange(peers);
        break;
      }
    }
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

  private send(event: string, payload: unknown): void {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ event, payload }));
  }

  sendStroke(meta: Omit<RemoteStrokeMeta, "userId" | "nickname">, points: StrokePoint[]): void {
    this.send("stroke", {
      meta: { ...meta, userId: this.userId, nickname: this.nickname },
      data: encodeStroke(points),
    });
  }

  private lastCursor = 0;
  sendCursor(x: number, y: number): void {
    const now = performance.now();
    if (now - this.lastCursor < 60) return; // ~16Hz 상한
    this.lastCursor = now;
    this.send("cursor", { userId: this.userId, nickname: this.nickname, x, y });
  }

  /** 방장 전용: 강퇴/잠금 */
  sendControl(type: "kick" | "lock", opts: { target?: string; locked?: boolean }): void {
    this.send("control", { type, ...opts });
  }

  disconnect(): void {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        /* noop */
      }
      this.ws = null;
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
