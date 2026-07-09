"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
import { ArtonLogo } from "@/components/arton-logo";
import { CLASS_CODE_LENGTH, hasHangul, isValidClassCode, normalizeClassCode } from "@/lib/class-code";
import { suggestNickname, validateNickname } from "@/lib/nickname";
import { joinClass } from "@/lib/join-client";
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

  useEffect(() => {
    if (step === "nickname" && !nickname) setNickname(suggestNickname());
  }, [step, nickname]);

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
              {error && <p className="mt-3 text-center text-sm font-semibold text-danger">{error}</p>}
              <Button onClick={enter} disabled={busy} size="lg" tone="leaf" className="mt-6 w-full">
                {busy ? "입장 중…" : "그리러 가기 🎨"}
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
