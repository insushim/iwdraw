"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { QrCode } from "@/components/QrCode";
import {
  createClass,
  listClasses,
  regenerateCode,
  toggleClassActive,
  type ClassRow,
} from "@/lib/teacher-api";
import { ClassGallery } from "./class-gallery";
import { AssignmentModal } from "./assignment-modal";

/* 교사 대시보드: 학급 목록·생성·코드/QR·갤러리·도안 배포 */
export function TeacherDashboard({ onSignOut }: { onSignOut: () => void }) {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [big, setBig] = useState<ClassRow | null>(null);
  const [galleryOf, setGalleryOf] = useState<ClassRow | null>(null);
  const [assignOf, setAssignOf] = useState<ClassRow | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    void refresh();
  }, []);

  const refresh = async () => {
    setLoading(true);
    setClasses(await listClasses());
    setLoading(false);
  };

  const add = async () => {
    setCreating(true);
    const c = await createClass(name);
    setCreating(false);
    setName("");
    if (c) {
      await refresh();
      setBig(c);
    }
  };

  if (galleryOf) {
    return <ClassGallery klass={galleryOf} onBack={() => setGalleryOf(null)} />;
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">내 학급</h1>
        <button onClick={onSignOut} className="text-sm text-ink-faint hover:text-ink-soft">
          로그아웃
        </button>
      </div>

      {/* 학급 생성 */}
      <Card className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="학급 이름 (예: 3학년 2반)"
            className="flex-1 rounded-card border-2 border-cream-deep bg-cream px-4 py-3 text-ink focus:border-sky"
          />
          <Button onClick={add} disabled={creating} tone="leaf">
            {creating ? "만드는 중…" : "＋ 학급 만들기"}
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="text-center text-ink-faint">불러오는 중…</div>
      ) : classes.length === 0 ? (
        <Card className="text-center text-ink-soft">
          아직 학급이 없어요. 위에서 학급을 만들어 보세요.
        </Card>
      ) : (
        <div className="grid gap-4">
          {classes.map((c) => (
            <Card key={c.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-xl text-ink">{c.name}</h2>
                    {!c.is_active && (
                      <span className="rounded-full bg-cream-deep px-2 py-0.5 text-xs text-ink-soft">비활성</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">학생 {c.student_count ?? 0}명</p>
                </div>
                <div className="text-right">
                  <div className="font-display text-3xl tracking-widest text-coral">{c.code}</div>
                  <p className="text-xs text-ink-faint">입장 코드</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="md" tone="sky" onClick={() => setBig(c)}>
                  📺 큰 화면으로 보여주기
                </Button>
                <Button size="md" tone="ghost" onClick={() => setGalleryOf(c)}>
                  🖼️ 갤러리
                </Button>
                <Button size="md" tone="ghost" onClick={() => setAssignOf(c)}>
                  📋 도안 배포
                </Button>
                <Button
                  size="md"
                  tone="ghost"
                  onClick={async () => {
                    const nc = await regenerateCode(c.id);
                    if (nc) refresh();
                  }}
                >
                  🔄 코드 새로 발급
                </Button>
                <Button
                  size="md"
                  tone="ghost"
                  onClick={async () => {
                    await toggleClassActive(c.id, !c.is_active);
                    refresh();
                  }}
                >
                  {c.is_active ? "⏸️ 잠그기" : "▶️ 열기"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-sm text-ink-faint">
        도안 관리는 <Link href="/coloring" className="underline">색칠 도안</Link>에서, 요금제는{" "}
        <Link href="/pricing" className="underline">여기</Link>에서 볼 수 있어요.
      </p>

      {/* 전자칠판 대형 표시 */}
      {big && <BigCodeModal klass={big} origin={origin} onClose={() => setBig(null)} />}
      {/* 도안 배포 */}
      {assignOf && <AssignmentModal klass={assignOf} onClose={() => setAssignOf(null)} />}
    </div>
  );
}

function BigCodeModal({
  klass,
  origin,
  onClose,
}: {
  klass: ClassRow;
  origin: string;
  onClose: () => void;
}) {
  const joinUrl = `${origin}/join?code=${klass.code}`;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="rounded-bubble bg-paper p-10 text-center shadow-lift" onClick={(e) => e.stopPropagation()}>
        <p className="font-display text-2xl text-ink-soft">{klass.name}</p>
        <p className="mt-4 text-ink-soft">아트온에 접속해서 코드를 입력하세요</p>
        <div className="my-6 font-display text-8xl tracking-[0.2em] text-coral">{klass.code}</div>
        <div className="flex justify-center">
          <QrCode value={joinUrl} size={240} />
        </div>
        <p className="mt-4 text-ink-faint">{origin.replace(/^https?:\/\//, "")}/join</p>
        <button
          onClick={onClose}
          className="pressable mt-8 rounded-card bg-ink px-8 py-3 font-display text-white"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
