import Link from "next/link";
import { ArtonLogo } from "@/components/arton-logo";
import { hasBackend } from "@/lib/backend";
import { TeacherAuth } from "./teacher-auth";

export const metadata = { title: "교사 대시보드" };

export default function TeacherPage() {
  const configured = hasBackend();

  return (
    <main className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/">
          <ArtonLogo className="h-9" />
        </Link>
        <Link href="/pricing" className="text-ink-soft hover:text-ink">
          요금제
        </Link>
      </header>

      <div className="mx-auto max-w-md px-6 py-12">
        {configured ? (
          <TeacherAuth />
        ) : (
          <div className="rounded-bubble bg-paper p-8 text-center shadow-soft">
            <div className="text-5xl">🏫</div>
            <h1 className="mt-4 font-display text-2xl text-ink">교사 기능 준비 중</h1>
            <p className="mt-3 text-ink-soft">
              학급 관리·갤러리·작품집 인쇄는 서비스 연결 후 사용할 수 있어요. 지금도 그리기와
              색칠은 로그인 없이 바로 쓸 수 있습니다.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link href="/draw" className="pressable rounded-card bg-coral py-3 font-display text-white shadow-soft">
                🎨 바로 그리기
              </Link>
              <Link href="/coloring" className="pressable rounded-card bg-leaf py-3 font-display text-white shadow-soft">
                🖍️ 색칠하기
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
