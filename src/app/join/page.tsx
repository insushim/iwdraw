import { Suspense } from "react";
import { JoinClient } from "./join-client";

export const metadata = { title: "학급 입장" };

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="grid h-dvh place-items-center font-display text-ink-soft">준비 중…</div>}>
      <JoinClient />
    </Suspense>
  );
}
