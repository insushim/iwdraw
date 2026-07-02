"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button, TextInput } from "@/components/ui";
import { TeacherDashboard } from "./teacher-dashboard";

/* 교사 인증: 이메일+비밀번호(Worker+D1, PBKDF2). 로그인되면 대시보드 표시. */
export function TeacherAuth() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    apiFetch("/teacher/me")
      .then((res) => setAuthed(res.ok))
      .catch(() => setAuthed(false));
  }, []);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const path = mode === "login" ? "/teacher/login" : "/teacher/signup";
      const body: Record<string, string> = { email: email.trim(), password };
      if (mode === "signup") body.name = name.trim() || "선생님";
      const res = await apiFetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setAuthed(true);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      const map: Record<string, string> = {
        invalid_email: "이메일 형식을 확인해 주세요",
        weak_password: "비밀번호는 8자 이상이어야 해요",
        email_taken: "이미 가입된 이메일이에요. 로그인해 주세요.",
        invalid_credentials: "이메일 또는 비밀번호가 맞지 않아요",
      };
      setError(map[data.error ?? ""] ?? "문제가 생겼어요. 다시 시도해 주세요.");
    } catch {
      setError("네트워크 오류예요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await apiFetch("/teacher/logout", { method: "POST" }).catch(() => {});
    setAuthed(false);
    router.refresh();
  };

  if (authed === null) {
    return <div className="text-center text-ink-faint">확인 중…</div>;
  }
  if (authed) return <TeacherDashboard onSignOut={signOut} />;

  const canSubmit = email.includes("@") && password.length >= 8 && !busy;

  return (
    <div className="rounded-bubble bg-paper p-8 shadow-soft">
      <h1 className="text-center font-display text-2xl text-ink">
        {mode === "login" ? "선생님, 환영해요" : "선생님 회원가입"}
      </h1>
      <p className="mt-2 text-center text-ink-soft">
        {mode === "login" ? "이메일과 비밀번호로 로그인해요." : "이메일과 비밀번호로 가입해요."}
      </p>

      <div className="mt-6 space-y-3">
        {mode === "signup" && (
          <TextInput
            type="text"
            placeholder="이름 (예: 김선생)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <TextInput
          type="email"
          placeholder="이메일 주소"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <TextInput
          type="password"
          placeholder="비밀번호 (8자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          onKeyDown={(e) => e.key === "Enter" && canSubmit && submit()}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button onClick={submit} disabled={!canSubmit} className="w-full">
          {busy ? "잠시만요…" : mode === "login" ? "로그인" : "회원가입"}
        </Button>
      </div>

      <button
        type="button"
        className="mt-4 w-full text-center text-sm text-ink-soft hover:text-ink"
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setError(null);
        }}
      >
        {mode === "login" ? "처음이세요? 회원가입" : "이미 계정이 있으세요? 로그인"}
      </button>
    </div>
  );
}
