import { Suspense } from "react";
import { DrawClient } from "./draw-client";

export const metadata = { title: "그리기" };

export default function DrawPage() {
  return (
    <Suspense fallback={<div className="grid h-dvh place-items-center font-display text-ink-soft">캔버스를 준비하고 있어요…</div>}>
      <DrawClient />
    </Suspense>
  );
}
