"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { CLASS_CODE_LENGTH, normalizeClassCode } from "@/lib/class-code";

/* 랜딩·/join 공용: 학급 코드 6자리 입력 폼 */
export function JoinCodeForm({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const ready = code.length === CLASS_CODE_LENGTH;

  return (
    <form
      className="flex gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) router.push(`/join?code=${code}`);
      }}
    >
      <label className="sr-only" htmlFor="class-code">
        학급 코드 6자리
      </label>
      <input
        id="class-code"
        value={code}
        onChange={(e) => setCode(normalizeClassCode(e.target.value))}
        placeholder="학급 코드 6자리"
        inputMode="text"
        autoComplete="off"
        autoCapitalize="characters"
        autoFocus={autoFocus}
        maxLength={CLASS_CODE_LENGTH}
        className="touch-target w-full rounded-card border-2 border-cream-deep bg-paper px-5 py-3 text-center font-display text-2xl tracking-[0.35em] text-ink placeholder:tracking-normal placeholder:text-base placeholder:text-ink-faint focus:border-sky"
      />
      <Button
        type="submit"
        size="lg"
        disabled={!ready}
        aria-label="학급 코드로 입장하기"
        className="shrink-0 whitespace-nowrap px-6"
      >
        입장
      </Button>
    </form>
  );
}
