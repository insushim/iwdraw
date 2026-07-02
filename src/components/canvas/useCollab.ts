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

/* 협동 세션을 엔진에 연결 — 로컬 스트로크 송신 + 원격 스트로크 렌더 + 커서 */
export function useCollab(engine: ArtEngine | null, room: string | undefined) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [cursors, setCursors] = useState<Record<string, Cursor>>({});
  const [locked, setLocked] = useState(false);
  const [kicked, setKicked] = useState(false);
  const [connected, setConnected] = useState(false);
  const sessionRef = useRef<CollabSession | null>(null);
  const strokeIdRef = useRef(0);

  useEffect(() => {
    if (!engine || !room) return;
    let disposed = false;
    const peerColors = new Map<string, string>();

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
          setCursors((prev) => ({
            ...prev,
            [userId]: { userId, nickname, x, y, color: peerColors.get(userId) ?? "#5BB8F5", t: performance.now() },
          }));
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

    // 오래된 커서 정리
    const cleaner = setInterval(() => {
      setCursors((prev) => {
        const now = performance.now();
        const next: Record<string, Cursor> = {};
        for (const [k, c] of Object.entries(prev)) if (now - c.t < 3000) next[k] = c;
        return next;
      });
    }, 1000);

    return () => {
      disposed = true;
      offStroke();
      offCursor();
      clearInterval(cleaner);
      session.disconnect();
      sessionRef.current = null;
    };
  }, [engine, room]);

  return { peers, cursors, locked, kicked, connected };
}
