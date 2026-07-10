"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
import { ArtonLogo } from "@/components/arton-logo";
import { CLASS_CODE_LENGTH, hasHangul, isValidClassCode, normalizeClassCode } from "@/lib/class-code";
import { suggestNickname, validateNickname } from "@/lib/nickname";
import { joinClass } from "@/lib/join-client";
import { getRememberedClassCode, getRememberedNickname } from "@/lib/student-session";
import { hasBackend } from "@/lib/backend";

type Step = "code" | "nickname";

export function JoinClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState(normalizeClassCode(params.get("code") ?? ""));
  const [step, setStep] = useState<Step>(isValidClassCode(normalizeClassCode(params.get("code") ?? "")) ? "nickname" : "code");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // 한글 IME 감지 — 코드 문자셋이 영문·숫자뿐이라 한글은 조용히 걸러진다(한/영 전환 안내)
  const [imeWarn, setImeWarn] = useState(false);
  // 이 기기에서 이 학급에 마지막으로 쓴 별명 — 있으면 기본값(같은 학생으로 이어짐).
  // 별명을 까먹고 매번 새로 만들면 학급 학생 수가 계속 늘어난다(2026-07-09 보고)
  const [savedNick, setSavedNick] = useState<string | null>(null);

  // 마운트 후 1회: URL로 넘어온 코드가 없으면 이 기기에서 마지막에 쓴 학급 코드를
  // 입력란에 자동으로 채운다(웨일북 재입장 편의 — 매번 6자리 재입력 방지).
  // localStorage는 서버에 없어 hydration 불일치를 피하려 초기값이 아닌 effect에서 읽는다.
  useEffect(() => {
    if (params.get("code")) return; // URL 코드가 우선
    const remembered = getRememberedClassCode();
    if (remembered && !code) setCode(normalizeClassCode(remembered));
    // 마운트 시 1회만 — 사용자가 지운 코드를 다시 채우지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step !== "nickname") return;
    const saved = isValidClassCode(code) ? getRememberedNickname(code) : null;
    setSavedNick(saved);
    if (!nickname) setNickname(saved ?? suggestNickname());
  }, [step, code, nickname]);

  const enter = async () => {
    const v = validateNickname(nickname);
    if (!v.ok) {
      setError(v.reason ?? "닉네임을 확인해 주세요");
      return;
    }
    setError(null);
    setBusy(true);
    if (!hasBackend()) {
      // 오프라인/데모 모드: 백엔드 없이 캔버스 체험(작품 저장은 로컬 다운로드)
      router.push("/draw");
      return;
    }
    const res = await joinClass(code, nickname.trim());
    setBusy(false);
    if (res.ok) router.push("/draw");
    else setError(res.error ?? "입장에 실패했어요");
  };

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <ArtonLogo className="h-12" />
        </div>

        <div className="rounded-bubble bg-paper p-8 shadow-lift">
          {step === "code" ? (
            <>
              <h1 className="text-center font-display text-2xl text-ink">학급 코드를 입력해요</h1>
              <p className="mt-2 text-center text-ink-soft">선생님이 알려준 6자리 코드예요.</p>
              <input
                value={code}
                onChange={(e) => {
                  setImeWarn(hasHangul(e.target.value));
                  setCode(normalizeClassCode(e.target.value));
                }}
                onKeyDown={(e) => e.key === "Enter" && isValidClassCode(code) && setStep("nickname")}
                placeholder="ABC123"
                autoFocus
                aria-label="학급 코드"
                maxLength={CLASS_CODE_LENGTH}
                // 브라우저 암호 자동완성/저장 제안 억제 — 학급 코드는 자격증명이 아니다
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
                className="mt-6 w-full rounded-card border-2 border-cream-deep bg-cream px-5 py-4 text-center font-display text-3xl tracking-[0.3em] text-ink placeholder:tracking-normal placeholder:text-ink-faint focus:border-sky"
              />
              {imeWarn && (
                <p className="mt-3 text-center text-sm font-semibold text-coral" role="status">
                  ⌨️ 한글로는 쓸 수 없어요 — <b>한/영 키</b>를 눌러 영어로 바꿔 주세요!
                </p>
              )}
              <Button
                onClick={() => setStep("nickname")}
                disabled={!isValidClassCode(code)}
                size="lg"
                className="mt-6 w-full"
              >
                다음
              </Button>
            </>
          ) : (
            <>
              <h1 className="text-center font-display text-2xl text-ink">어떤 이름으로 그릴까요?</h1>
              <p className="mt-2 text-center text-ink-soft">
                실명 말고 재미있는 별명을 써요. 개인정보는 받지 않아요.
              </p>
              <div className="mt-6 flex gap-2">
                <input
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && enter()}
                  aria-label="닉네임"
                  maxLength={12}
                  autoFocus
                  // 별명은 개인정보·자격증명이 아니다 — 이름/암호 자동완성 제안 억제
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                  className="w-full rounded-card border-2 border-cream-deep bg-cream px-5 py-3 text-center font-display text-xl text-ink focus:border-sky"
                />
                <button
                  onClick={() => setNickname(suggestNickname())}
                  aria-label="다른 별명 추천"
                  className="pressable touch-target shrink-0 rounded-card bg-sun-soft px-4 text-2xl"
                  title="다른 별명"
                >
                  🎲
                </button>
              </div>
              {/* 별명 기억 안내 — 같은 별명 = 같은 학생으로 이어짐 */}
              {savedNick && nickname.trim() === savedNick && (
                <p className="mt-3 rounded-card bg-leaf-soft px-3 py-2 text-center text-sm font-semibold text-leaf-deep" role="status">
                  🧢 지난번에 이 별명으로 들어왔어요 — 그대로 들어가면 내 작품이 이어져요!
                </p>
              )}
              {savedNick && nickname.trim() !== savedNick && (
                <div className="mt-3 rounded-card bg-sun-soft px-3 py-2 text-center text-sm" role="status">
                  <p className="font-semibold text-ink">
                    ⚠️ 지난번 별명은 <b>{savedNick}</b>이에요. 새 별명으로 들어가면{" "}
                    <b>새 학생으로 등록</b>돼요!
                  </p>
                  <button
                    onClick={() => {
                      setNickname(savedNick);
                      setError(null);
                    }}
                    className="pressable mt-1.5 rounded-full bg-paper px-3 py-1 text-sm font-bold text-leaf-deep shadow-soft"
                  >
                    지난번 별명({savedNick}) 쓰기
                  </button>
                </div>
              )}
              {error && <p className="mt-3 text-center text-sm font-semibold text-danger">{error}</p>}
              <Button onClick={enter} disabled={busy} size="lg" tone="leaf" className="mt-6 w-full">
                {busy ? "입장 중…" : savedNick && nickname.trim() === savedNick ? "이어서 그리러 가기 🎨" : "그리러 가기 🎨"}
              </Button>
              <button
                onClick={() => setStep("code")}
                className="mt-3 w-full text-center text-sm text-ink-faint hover:text-ink-soft"
              >
                ← 코드 다시 입력
              </button>
            </>
          )}
        </div>

        {!hasBackend() && (
          <p className="mt-4 text-center text-xs text-ink-faint">
            체험 모드예요 — 학급 연결 없이 캔버스를 사용할 수 있어요.
          </p>
        )}
      </div>
    </main>
  );
}
