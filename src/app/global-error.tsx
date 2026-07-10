"use client";

import { useEffect, useState } from "react";

/*
 * 루트 크래시 화면 — 에러 바운더리가 없으면 클라이언트 크래시 시 크림색 빈 화면만
 * 남는다(2026-07-10 사용자 실측: "그리다 새로고침하면 이 화면만"). 두 단계로 대응:
 *  1) 첫 크래시: 구버전 서비스워커·캐시가 원인일 확률이 높으므로 SW 등록 해제 +
 *     캐시 전체 삭제 후 1회 자동 새로고침(sessionStorage 플래그로 루프 방지).
 *     그림 데이터(IndexedDB 자동저장)는 건드리지 않는다.
 *  2) 자가치유 후에도 크래시: 에러 내용을 보여주는 수동 복구 화면(원인 보고용).
 */

const HEAL_KEY = "arton.selfheal";

async function cleanSwAndCaches(): Promise<void> {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    /* 지원 안 하면 통과 */
  }
  try {
    const keys = (await caches?.keys?.()) ?? [];
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch {
    /* 통과 */
  }
}

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  const [healing, setHealing] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!sessionStorage.getItem(HEAL_KEY)) {
          sessionStorage.setItem(HEAL_KEY, "1");
          await cleanSwAndCaches();
          location.reload();
          return;
        }
      } catch {
        /* sessionStorage 불가 등 — 수동 화면으로 */
      }
      if (alive) setHealing(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fbf7f0",
          fontFamily: "system-ui, sans-serif",
          color: "#3d3a34",
        }}
      >
        <div style={{ textAlign: "center", padding: 24, maxWidth: 480 }}>
          <div style={{ fontSize: 48 }}>🎨</div>
          <h1 style={{ fontSize: 20, margin: "12px 0 8px" }}>
            {healing ? "화면을 정리하고 있어요…" : "앗, 문제가 생겼어요"}
          </h1>
          {!healing && (
            <>
              <p style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 16px" }}>
                아래 버튼을 눌러 다시 열어 보세요. 그린 그림은 자동저장에 남아 있어요.
              </p>
              <button
                onClick={async () => {
                  await cleanSwAndCaches();
                  try {
                    sessionStorage.removeItem(HEAL_KEY);
                  } catch {
                    /* 통과 */
                  }
                  location.href = "/draw";
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
                {/* 선생님 보고용 — 이 내용을 알려주시면 빠르게 고칠 수 있어요 */}
                {String(error?.message ?? error)}
                {error?.digest ? `\ndigest: ${error.digest}` : ""}
              </p>
            </>
          )}
        </div>
      </body>
    </html>
  );
}
