"use client";

import { forwardRef, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { photoToLineart, photoToUnderlay } from "@/lib/photo-to-lineart";

/*
 * 내 사진·그림 가져오기 — 파일 선택 → 시작 방식 모달(자동 선따기/밑그림/그대로 이어 그리기)
 * → 클라이언트 변환 → /draw 이동. 색칠 갤러리 헤더와 에디터 헤더가 공유한다.
 * 변환은 전부 브라우저(Canvas)에서 — 사진이 서버로 올라가지 않는다.
 */

export interface PhotoImportHandle {
  /** 드래그앤드롭·붙여넣기로 받은 파일 열기 */
  openFile: (file: File | Blob) => void;
  openPicker: () => void;
}

interface PhotoImportProps {
  /** 트리거 버튼 렌더러 — 없으면 버튼 없이 ref로만 연다 */
  renderButton?: (openPicker: () => void, converting: boolean) => ReactNode;
  onError?: (message: string) => void;
}

export const PhotoImport = forwardRef<PhotoImportHandle, PhotoImportProps>(function PhotoImport(
  { renderButton, onError },
  ref,
) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [converting, setConverting] = useState(false);
  const [pending, setPending] = useState<{ file: File | Blob; url: string } | null>(null);

  const openFile = (file: File | Blob) => {
    if (!file.type.startsWith("image/")) return;
    setPending((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { file, url: URL.createObjectURL(file) };
    });
  };
  const openPicker = () => fileRef.current?.click();
  useImperativeHandle(ref, () => ({ openFile, openPicker }));

  const closePending = () => {
    if (pending) URL.revokeObjectURL(pending.url);
    setPending(null);
  };

  const startWith = async (kind: "lineart" | "underlay" | "continue") => {
    if (!pending) return;
    setConverting(true);
    try {
      // 매 진입마다 고유 토큰(v) — 같은 URL 재진입 시 캔버스 강제 재마운트(라우터 캐시 방지)
      const v = Date.now().toString(36);
      if (kind === "continue") {
        const dataUrl = await blobToDataUrl(pending.file);
        sessionStorage.setItem("arton.customBase", dataUrl);
        closePending();
        router.push(`/draw?base=custom&v=${v}`);
        return;
      }
      const blob =
        kind === "lineart" ? await photoToLineart(pending.file) : await photoToUnderlay(pending.file);
      const dataUrl = await blobToDataUrl(blob);
      sessionStorage.setItem("arton.customLineart", dataUrl);
      closePending();
      router.push(`/draw?template=custom&mode=coloring&v=${v}`);
    } catch {
      onError?.("사진을 도안으로 바꾸지 못했어요. 다른 사진을 써 보세요.");
    } finally {
      setConverting(false);
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) openFile(f);
          e.target.value = "";
        }}
      />
      {renderButton?.(openPicker, converting)}

      {/* 가져온 이미지 → 시작 방식 선택 */}
      {pending && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4"
          onClick={closePending}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg rounded-bubble bg-paper p-6 shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-xl text-ink">이 그림으로 어떻게 시작할까요?</h2>
            <div className="mt-4 grid place-items-center rounded-card bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pending.url} alt="가져온 그림" className="max-h-56 w-auto rounded-lg" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <button
                onClick={() => startWith("lineart")}
                disabled={converting}
                className="pressable rounded-card bg-sky px-4 py-4 text-left text-white shadow-soft disabled:opacity-60"
              >
                <span className="font-display text-lg">✏️ 자동 선따기</span>
                <span className="mt-1 block text-sm text-white/85">
                  윤곽선 도안으로 바꿔서 색칠해요
                </span>
              </button>
              <button
                onClick={() => startWith("underlay")}
                disabled={converting}
                className="pressable rounded-card bg-coral px-4 py-4 text-left text-white shadow-soft disabled:opacity-60"
              >
                <span className="font-display text-lg">🖊️ 밑그림 따라 그리기</span>
                <span className="mt-1 block text-sm text-white/85">
                  옅게 깔린 그림 위에 내가 직접 선을 따요
                </span>
              </button>
              <button
                onClick={() => startWith("continue")}
                disabled={converting}
                className="pressable rounded-card bg-leaf px-4 py-4 text-left text-white shadow-soft disabled:opacity-60"
              >
                <span className="font-display text-lg">🎨 그대로 이어 그리기</span>
                <span className="mt-1 block text-sm text-white/85">
                  그리던 그림을 그대로 불러와 계속 그려요
                </span>
              </button>
            </div>
            <p className="mt-4 text-xs text-ink-faint">
              지금 캔버스에 그리던 그림은 사라져요. 인터넷에서 받은 그림은 연습용으로만 써요 —
              그린 작품을 학급 밖에 공개하거나 팔면 안 돼요.
            </p>
            <button
              onClick={closePending}
              className="pressable mt-3 w-full rounded-card bg-cream px-4 py-2 font-semibold text-ink-soft"
            >
              {converting ? "변환 중…" : "취소"}
            </button>
          </div>
        </div>
      )}
    </>
  );
});

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
