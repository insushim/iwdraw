"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Button, TextInput } from "@/components/ui";
import { TeacherDashboard } from "./teacher-dashboard";

/* 교사 인증: 이메일 매직링크. 로그인되면 대시보드 표시. */
export function TeacherAuth() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb) {
      setAuthed(false);
      return;
    }
    sb.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => setAuthed(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  const sendLink = async () => {
    const sb = getSupabaseBrowser();
    if (!sb) return;
    setBusy(true);
    setError(null);
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/teacher` },
    });
    setBusy(false);
    if (error) setError("메일 전송에 실패했어요. 이메일을 확인해 주세요.");
    else setSent(true);
  };

  const signOut = async () => {
    await getSupabaseBrowser()?.auth.signOut();
    setAuthed(false);
    router.refresh();
  };

  if (authed === null) {
    return <div className="text-center text-ink-faint">확인 중…</div>;
  }
  if (authed) return <TeacherDashboard onSignOut={signOut} />;

  return (
    <div className="rounded-bubble bg-paper p-8 shadow-soft">
      <h1 className="text-center font-display text-2xl text-ink">선생님, 환영해요</h1>
      <p className="mt-2 text-center text-ink-soft">이메일로 로그인 링크를 보내드려요.</p>
      {sent ? (
        <div className="mt-6 rounded-card bg-leaf-soft p-4 text-center text-leaf-deep">
          📬 <b>{email}</b>로 로그인 링크를 보냈어요. 메일함을 확인해 주세요.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <TextInput
            type="email"
            placeholder="이메일 주소"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && email.includes("@") && sendLink()}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button onClick={sendLink} disabled={busy || !email.includes("@")} className="w-full">
            {busy ? "보내는 중…" : "로그인 링크 받기"}
          </Button>
        </div>
      )}
    </div>
  );
}
