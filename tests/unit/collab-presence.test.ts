import { describe, it, expect } from "vitest";

/*
 * presence 카운트 누적 버그(2026-07-16): 나갔다 들어오면 인원수가 계속 쌓였다.
 * 서버(worker/collab.ts)의 peers()는 userId 단위로 dedup해야 한다 —
 * 같은 사람의 유령 소켓이 겹쳐도, 한 사람이 여러 탭을 열어도 1명.
 * DO 자체는 miniflare가 있어야 돌지만, 핵심 dedup 규칙은 순수 로직이라 여기서 고정한다.
 */

interface Attachment {
  userId: string;
  nickname: string;
  color: string;
}

// worker/collab.ts peers()와 동일한 규칙(userId 단위 dedup)
function peersOf(sockets: Attachment[]): { id: string; nickname: string }[] {
  const byId = new Map<string, { id: string; nickname: string }>();
  for (const a of sockets) {
    if (a.userId) byId.set(a.userId, { id: a.userId, nickname: a.nickname });
  }
  return [...byId.values()];
}

describe("협동 presence dedup", () => {
  it("같은 userId의 유령 소켓이 겹쳐도 1명으로 센다", () => {
    // 교사(teacher-room)가 재입장해 이전 소켓이 아직 안 닫힌 상태
    const sockets: Attachment[] = [
      { userId: "teacher-r", nickname: "선생님", color: "#000" }, // 유령(옛 소켓)
      { userId: "teacher-r", nickname: "선생님", color: "#000" }, // 새 소켓
      { userId: "s1", nickname: "별명이", color: "#111" },
    ];
    expect(peersOf(sockets)).toHaveLength(2); // 소켓은 3개지만 사람은 2명
  });

  it("서로 다른 사람은 각각 센다", () => {
    const sockets: Attachment[] = [
      { userId: "teacher-r", nickname: "선생님", color: "#000" },
      { userId: "s1", nickname: "가", color: "#111" },
      { userId: "s2", nickname: "나", color: "#222" },
    ];
    expect(peersOf(sockets)).toHaveLength(3);
  });

  it("userId 없는(hello 전) 소켓은 세지 않는다", () => {
    const sockets: Attachment[] = [
      { userId: "", nickname: "손님", color: "#000" },
      { userId: "s1", nickname: "가", color: "#111" },
    ];
    expect(peersOf(sockets)).toHaveLength(1);
  });
});
