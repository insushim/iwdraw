"use client";

import { useEffect, useRef, useState } from "react";
import type { ArtEngine } from "@/engine/ArtEngine";
import { CollabSession, type RemoteStrokeMeta } from "@/lib/collab";

export interface Peer {
  id: string;
  nickname: string;
  color: string;
}
export interface Cursor {
  userId: string;
  nickname: string;
  x: number;
  y: number;
  color: string;
  t: number;
}

/*
 * 커서는 React state로 올리지 않는다 — **외부 store로 빼서 CollabOverlay만 구독**한다.
 *
 * 예전엔 커서 좌표를 useCollab의 useState에 담았다. 그러면 친구 한 명이 붓을 움직일 때마다
 * (송신 상한 ~16Hz) Editor가 통째로 리렌더된다 — 헤더·브러시바·색 팔레트·레이어 패널·
 * 스탬프 팔레트까지 전부. 4명이 같이 그리면 초당 60회가 넘고, 그 리렌더가 내가 그리는 획의
 * rAF 프레임을 잡아먹는다(웨일북에서 "함께 그리기만 하면 렉" — 2026-08-25 제보).
 * 이제 리렌더 범위는 커서 몇 개짜리 CollabOverlay 하나로 끝난다.
 */
export interface CursorStore {
  subscribe: (cb: () => void) => () => void;
  getSnapshot: () => Record<string, Cursor>;
}

const EMPTY_CURSORS: Record<string, Cursor> = {};

/* 협동 세션을 엔진에 연결 — 로컬 스트로크 송신 + 원격 스트로크 렌더 + 커서 */
export function useCollab(engine: ArtEngine | null, room: string | undefined) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [locked, setLocked] = useState(false);
  const [kicked, setKicked] = useState(false);
  const [connected, setConnected] = useState(false);
  const sessionRef = useRef<CollabSession | null>(null);
  const strokeIdRef = useRef(0);

  // 커서 store — 컴포넌트 수명 내내 같은 객체(구독자가 재구독하지 않도록)
  const cursorsRef = useRef<Record<string, Cursor>>(EMPTY_CURSORS);
  const listenersRef = useRef<Set<() => void>>(new Set());
  const storeRef = useRef<CursorStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = {
      subscribe: (cb) => {
        listenersRef.current.add(cb);
        return () => {
          listenersRef.current.delete(cb);
        };
      },
      getSnapshot: () => cursorsRef.current,
    };
  }
  const cursorStore = storeRef.current;

  useEffect(() => {
    if (!engine || !room) return;
    let disposed = false;
    const peerColors = new Map<string, string>();

    // 알림은 프레임당 1회로 묶는다 — 4명이 동시에 움직여도 오버레이 리렌더는 60Hz 상한
    let notifyRaf = 0;
    const notify = () => {
      if (notifyRaf) return;
      notifyRaf = requestAnimationFrame(() => {
        notifyRaf = 0;
        for (const l of listenersRef.current) l();
      });
    };

    const session = new CollabSession(
      room,
      {
        onRemoteStroke: (meta: RemoteStrokeMeta, points) => {
          engine.applyRemoteStroke(
            {
              brush: meta.brush,
              color: meta.color,
              size: meta.size,
              opacity: meta.opacity,
              water: meta.water,
              symmetry: meta.symmetry,
            },
            points,
            meta.userId,
          );
        },
        onPeersChange: (p) => {
          p.forEach((x) => peerColors.set(x.id, x.color));
          setPeers(p);
        },
        onCursor: (userId, nickname, x, y) => {
          cursorsRef.current = {
            ...cursorsRef.current,
            [userId]: {
              userId,
              nickname,
              x,
              y,
              color: peerColors.get(userId) ?? "#5BB8F5",
              t: performance.now(),
            },
          };
          notify();
        },
        onKicked: () => setKicked(true),
        onLocked: setLocked,
      },
      engine.width,
      engine.height,
    );

    // 로컬 스트로크 송신
    const offStroke = engine.on("strokeCommitted", (s) => {
      session.sendStroke(
        {
          brush: s.brush,
          color: s.color,
          size: s.size,
          opacity: s.opacity,
          water: s.water,
          symmetry: s.symmetry,
          strokeId: strokeIdRef.current++,
        },
        s.points,
      );
    });
    const offCursor = engine.on("pointerMoved", ({ x, y }) => session.sendCursor(x, y));

    session.connect().then((ok) => {
      if (!disposed) {
        setConnected(ok);
        sessionRef.current = session;
      }
    });

    // 오래된 커서 정리 — 실제로 지울 게 있을 때만 스냅샷을 갈아 끼운다
    // (매초 새 객체를 만들면 아무도 안 움직여도 오버레이가 매초 리렌더된다)
    const cleaner = setInterval(() => {
      const now = performance.now();
      const prev = cursorsRef.current;
      const keys = Object.keys(prev);
      const stale = keys.filter((k) => now - prev[k].t >= 3000);
      if (stale.length === 0) return;
      const next: Record<string, Cursor> = {};
      for (const k of keys) if (now - prev[k].t < 3000) next[k] = prev[k];
      cursorsRef.current = next;
      notify();
    }, 1000);

    return () => {
      disposed = true;
      offStroke();
      offCursor();
      clearInterval(cleaner);
      if (notifyRaf) cancelAnimationFrame(notifyRaf);
      session.disconnect();
      sessionRef.current = null;
      cursorsRef.current = EMPTY_CURSORS;
      for (const l of listenersRef.current) l();
    };
  }, [engine, room]);

  return { peers, cursorStore, locked, kicked, connected };
}
