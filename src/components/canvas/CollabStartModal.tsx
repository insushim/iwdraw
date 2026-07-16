"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getStudentSession } from "@/lib/student-session";
import { useEditor } from "@/store/editor";
import {
  ROOM_CODE_LEN,
  randomRoomCode,
  normalizeRoomCode,
  isValidRoomCode,
  roomNameFor,
} from "@/lib/collab-room";

/*
 * 모둠(함께 그리기) 시작 창 — 학급에 들어온 학생(또는 게스트)이 직접 방을 만들거나 친구 방에 들어간다.
 *  · 새 방 만들기 → 짧은 코드 자동 생성 → 협동 캔버스로 이동. 그 코드를 친구에게 불러주면 된다.
 *  · 친구 방 들어가기 → 친구가 부른 짧은 코드를 입력 → 같은 캔버스로 이동.
 * 서버 방 이름은 학급 코드로 접두어를 붙여 반별 격리(같은 4자리라도 다른 반과 안 섞인다).
 */
export function CollabStartModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const mode = useEditor((s) => s.mode);
  const session = getStudentSession();
  const classCode = session?.classCode;
  const [join, setJoin] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const go = (shortCode: string) => {
    const room = roomNameFor(classCode, shortCode);
    // 새로 마운트되도록 v(진입 토큰)도 넘긴다 — 같은 화면에서 방으로 갈아탈 때 확실히 재연결
    router.push(`/draw?room=${encodeURIComponent(room)}&mode=${mode}&v=collab-${shortCode}`);
    onClose();
  };

  const create = () => go(randomRoomCode());
  const enter = () => {
    if (!isValidRoomCode(code)) {
      setError(`코드는 ${ROOM_CODE_LEN}글자예요`);
      return;
    }
    go(code);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="함께 그리기"
    >
      <div
        className="w-full max-w-sm rounded-bubble bg-paper p-5 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="font-display text-xl text-ink">👥 함께 그리기</span>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="pressable touch-target grid h-10 w-10 place-items-center rounded-full bg-cream text-ink-soft hover:bg-cream-deep"
          >
            ✕
          </button>
        </div>

        {!join ? (
          <div className="space-y-2.5">
            <button
              onClick={create}
              className="pressable touch-target w-full rounded-2xl bg-leaf py-3 font-display text-base font-bold text-white"
            >
              🎨 새 모둠 방 만들기
            </button>
            <button
              onClick={() => {
                setJoin(true);
                setError(null);
              }}
              className="pressable touch-target w-full rounded-2xl bg-cream py-3 font-display text-base font-semibold text-ink-soft hover:bg-cream-deep"
            >
              🔑 친구 방 들어가기
            </button>
            <p className="pt-1 text-center text-[12px] leading-snug text-ink-faint">
              방을 만들면 짧은 코드가 나와요. 친구에게 불러주면 같이 그릴 수 있어요.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-ink-soft">
              친구가 알려준 방 코드
            </label>
            <input
              value={code}
              onChange={(e) => {
                setCode(normalizeRoomCode(e.target.value));
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && enter()}
              autoFocus
              inputMode="text"
              autoCapitalize="characters"
              placeholder={"".padStart(ROOM_CODE_LEN, "•")}
              aria-label="방 코드"
              className="w-full rounded-2xl border-2 border-cream-deep bg-cream px-3 py-3 text-center font-display text-2xl tracking-[0.3em] text-ink outline-none focus:border-sky"
            />
            {error && <p className="text-center text-sm font-semibold text-danger">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setJoin(false)}
                className="pressable touch-target flex-1 rounded-2xl bg-cream py-3 text-sm font-semibold text-ink-soft"
              >
                뒤로
              </button>
              <button
                onClick={enter}
                disabled={!isValidRoomCode(code)}
                className="pressable touch-target flex-[2] rounded-2xl bg-leaf py-3 font-display text-base font-bold text-white disabled:opacity-40"
              >
                들어가기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
