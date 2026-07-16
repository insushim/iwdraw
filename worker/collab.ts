// CollabRoom — 방(code)별 Durable Object. Supabase Realtime broadcast/presence 대체.
// WebSocket Hibernation API 사용(유휴 시 과금 0). 클라이언트 collab.ts와 프로토콜 1:1.
//
// 프로토콜(양방향 JSON): { event, payload }
//  - hello   : payload {userId, nickname, color}  — 접속 직후 1회. presence 등록.
//  - stroke  : payload {meta, data}               — 완성된 스트로크(base64). 타인에게 relay.
//  - cursor  : payload {userId, nickname, x, y}   — 커서 위치(throttle). relay.
//  - control : payload {type:"kick"|"lock", target?, locked?} — relay.
//  - peers   : payload PeerInfo[]  (서버→클라, join/leave 시 갱신)
import type { Env } from "./types";

interface Attachment {
  userId: string;
  nickname: string;
  color: string;
}
interface PeerInfo {
  id: string;
  nickname: string;
  color: string;
}

const MAX_EVENTS_PER_SEC = 40;
const MAX_MSG_BYTES = 64 * 1024; // 메시지 크기 상한(DoS 증폭 방어). stroke base64는 이보다 훨씬 작음.

export class CollabRoom {
  private state: DurableObjectState;
  // 소켓별 수신 rate limit 윈도우(인메모리, hibernation 시 리셋 — fail-open 허용)
  private recvWindows = new Map<WebSocket, number[]>();

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
  }

  async fetch(_req: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ userId: "", nickname: "", color: "#000000" } satisfies Attachment);
    return new Response(null, { status: 101, webSocket: client });
  }

  // presence = userId 단위(소켓 단위 X). 같은 사람이 재접속해 유령 소켓이 잠깐 겹쳐도,
  // 또는 한 사람이 여러 탭을 열어도 1명으로 센다 — 재입장 시 숫자가 누적되지 않도록.
  private peers(exclude?: WebSocket): PeerInfo[] {
    const byId = new Map<string, PeerInfo>();
    for (const ws of this.state.getWebSockets()) {
      if (ws === exclude) continue;
      const a = ws.deserializeAttachment() as Attachment | null;
      if (a && a.userId) byId.set(a.userId, { id: a.userId, nickname: a.nickname, color: a.color });
    }
    return [...byId.values()];
  }

  // 같은 userId의 옛 소켓을 능동적으로 닫는다(keep = 방금 hello 보낸 새 소켓).
  // hibernation·비정상 종료로 close 이벤트가 지연돼 남는 유령 소켓을 즉시 제거.
  private evictStale(userId: string, keep: WebSocket): void {
    if (!userId) return;
    for (const ws of this.state.getWebSockets()) {
      if (ws === keep) continue;
      const a = ws.deserializeAttachment() as Attachment | null;
      if (a?.userId === userId) {
        this.recvWindows.delete(ws);
        try {
          ws.close(1000, "replaced");
        } catch {
          /* 이미 닫힌 소켓 무시 */
        }
      }
    }
  }

  private broadcast(obj: unknown, except?: WebSocket): void {
    const msg = JSON.stringify(obj);
    for (const ws of this.state.getWebSockets()) {
      if (ws === except) continue;
      try {
        ws.send(msg);
      } catch {
        /* 닫히는 소켓 무시 */
      }
    }
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    // 메시지 크기 상한(DoS 증폭 방어) — parse 전에 차단
    const size = typeof message === "string" ? message.length : message.byteLength;
    if (size > MAX_MSG_BYTES) return;

    let m: { event?: string; payload?: any };
    try {
      m = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message));
    } catch {
      return;
    }
    const event = m.event;
    const payload = m.payload;

    if (event === "hello") {
      const att: Attachment = {
        userId: String(payload?.userId ?? "").slice(0, 64),
        nickname: String(payload?.nickname ?? "손님").slice(0, 24),
        color: String(payload?.color ?? "#000000").slice(0, 16),
      };
      ws.serializeAttachment(att);
      // 같은 신원의 유령 소켓을 먼저 축출 → 재입장해도 1명으로 유지
      this.evictStale(att.userId, ws);
      this.broadcast({ event: "peers", payload: this.peers() });
      return;
    }

    // 서버측 rate limit(40/s per socket) — 클라 수신 rate limit과 이중.
    const now = Date.now();
    let win = this.recvWindows.get(ws);
    if (!win) {
      win = [];
      this.recvWindows.set(ws, win);
    }
    while (win.length && now - win[0] > 1000) win.shift();
    if (win.length >= MAX_EVENTS_PER_SEC) return;
    win.push(now);

    // control(kick/lock)은 서버가 발신자의 host 권한을 검증할 수 없어(게스트 우선 = room 공개)
    // 무권한 강퇴/잠금 악용 벡터가 됨. host 식별 체계가 없는 현 단계에선 relay하지 않는다.
    // stroke/cursor만 중계(self 제외 = broadcast self:false와 동일).
    if (event === "stroke" || event === "cursor") {
      this.broadcast({ event, payload }, ws);
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.recvWindows.delete(ws);
    // 닫히는 소켓 제외한 peer 목록 브로드캐스트
    this.broadcast({ event: "peers", payload: this.peers(ws) }, ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.recvWindows.delete(ws);
    // error 후 close가 오지 않는 경로 대비 — 유령 peer 방지 위해 presence 갱신
    this.broadcast({ event: "peers", payload: this.peers(ws) }, ws);
  }
}
