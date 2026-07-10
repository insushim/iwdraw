"use client";

import { useEffect } from "react";

/*
 * 라우트 레벨 크래시 화면 — 페이지 컴포넌트가 렌더/마운트 중 던지면 여기로.
 * 첫 크래시는 구버전 SW·캐시가 원인일 확률이 높아 자동 정리 후 1회 재시도
 * (global-error.tsx와 같은 정책 — 그림 자동저장 데이터는 보존).
 */

const HEAL_KEY = "arton.selfheal";

async function cleanSwAndCaches(): Promise<void> {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    /* 통과 */
  }
  try {
    const keys = (await caches?.keys?.()) ?? [];
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch {
    /* 통과 */
  }
}

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    try {
      if (!sessionStorage.getItem(HEAL_KEY)) {
        sessionStorage.setItem(HEAL_KEY, "1");
        void cleanSwAndCaches().then(() => location.reload());
      }
    } catch {
      /* 통과 */
    }
  }, []);

  return (
    <main
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#3d3a34",
      }}
    >
      <div style={{ textAlign: "center", padding: 24, maxWidth: 480 }}>
        <div style={{ fontSize: 48 }}>🎨</div>
        <h1 style={{ fontSize: 20, margin: "12px 0 8px" }}>앗, 문제가 생겼어요</h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 16px" }}>
          다시 열어 보세요. 그린 그림은 자동저장에 남아 있어요.
        </p>
        <button
          onClick={() => {
            try {
              sessionStorage.removeItem(HEAL_KEY);
            } catch {
              /* 통과 */
            }
            reset();
          }}
          style={{
            padding: "10px 24px",
            borderRadius: 12,
            border: "none",
            background: "#ff7a59",
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          다시 열기
        </button>
        <p
          style={{
            marginTop: 20,
            fontSize: 11,
            color: "#8a857c",
            wordBreak: "break-all",
            whiteSpace: "pre-wrap",
            textAlign: "left",
            background: "#f3ecdf",
            borderRadius: 8,
            padding: 10,
          }}
        >
          {String(error?.message ?? error)}
          {error?.digest ? `\ndigest: ${error.digest}` : ""}
        </p>
      </div>
    </main>
  );
}
