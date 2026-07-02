import type { Metadata } from "next";
import Link from "next/link";
import { ArtonLogo } from "@/components/arton-logo";
import { Chip } from "@/components/ui";

export const metadata: Metadata = {
  title: "요금제",
  description: "무료로 학급 1개, 학생 30명까지. Pro로 더 많은 학급과 협동 캔버스를.",
};

const TOSS_ENABLED = !!process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

const FREE = [
  "학급 1개",
  "학생 30명",
  "기본 도안 30장",
  "스케치·수채화·유화·색칠 4모드",
  "학급 갤러리 · 작품 승인",
];
const PRO = [
  "학급 5개",
  "학생 200명",
  "도안 1,000장 전체",
  "타임랩스(무비) 내보내기",
  "모둠 협동 캔버스",
  "작품집 A4 인쇄",
];

export default function PricingPage() {
  return (
    <main className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/">
          <ArtonLogo className="h-9" />
        </Link>
        <Link href="/teacher" className="pressable rounded-card bg-ink px-5 py-2.5 font-display text-white shadow-soft">
          교사 시작하기
        </Link>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-center font-display text-4xl text-ink">요금제</h1>
        <p className="mt-3 text-center text-ink-soft">
          그리기와 색칠은 <b className="text-ink">언제나 무료</b>예요. 학급 관리가 필요할 때만
          가입하세요.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {/* Free */}
          <div className="rounded-bubble bg-paper p-8 shadow-soft">
            <Chip tone="leaf">무료</Chip>
            <div className="mt-4 font-display text-4xl text-ink">0원</div>
            <p className="mt-1 text-ink-soft">모든 선생님께 기본 제공</p>
            <ul className="mt-6 space-y-3">
              {FREE.map((f) => (
                <li key={f} className="flex items-center gap-2 text-ink">
                  <span className="text-leaf">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/teacher"
              className="pressable mt-8 block rounded-card bg-leaf py-3 text-center font-display text-white shadow-soft"
            >
              무료로 시작하기
            </Link>
          </div>

          {/* Pro */}
          <div className="relative rounded-bubble bg-ink p-8 text-white shadow-lift">
            <Chip tone="coral">Pro</Chip>
            <div className="mt-4 font-display text-4xl">
              월 4,900원
            </div>
            <p className="mt-1 text-white/70">더 많은 학급과 협동 기능</p>
            <ul className="mt-6 space-y-3">
              {PRO.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-sun">★</span>
                  {f}
                </li>
              ))}
            </ul>
            {TOSS_ENABLED ? (
              <Link
                href="/teacher?upgrade=1"
                className="pressable mt-8 block rounded-card bg-coral py-3 text-center font-display shadow-soft"
              >
                Pro 시작하기
              </Link>
            ) : (
              <div className="mt-8">
                <button
                  disabled
                  className="w-full cursor-not-allowed rounded-card bg-white/15 py-3 text-center font-display text-white/60"
                >
                  결제 준비 중
                </button>
                <p className="mt-2 text-center text-xs text-white/50">
                  곧 토스페이먼츠로 결제할 수 있어요. 학교 예산(S2B) 구매는 문의해 주세요.
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-ink-faint">
          학생은 언제나 로그인·결제 없이 참여해요. 개인정보(이름·이메일 등)는 수집하지 않습니다.
        </p>
      </div>
    </main>
  );
}
