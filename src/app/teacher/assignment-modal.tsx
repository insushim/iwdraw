"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui";
import {
  clearClassAssignment,
  getClassAssignment,
  setClassAssignment,
  type AssignmentRow,
  type ClassRow,
} from "@/lib/teacher-api";
import {
  GRADE_LABEL,
  loadTemplateManifest,
  type TemplateItem,
  type TemplateManifest,
} from "@/lib/templates";

/*
 * 도안 배포 모달 — 정적 도안 목록에서 골라 학급에 배포한다.
 * 배포하면 학생이 /draw에 들어올 때 "선생님이 내주신 도안" 배너가 뜬다.
 */
export function AssignmentModal({ klass, onClose }: { klass: ClassRow; onClose: () => void }) {
  const [manifest, setManifest] = useState<TemplateManifest | null>(null);
  const [manifestError, setManifestError] = useState(false);
  const [current, setCurrent] = useState<AssignmentRow | null>(null);
  const [cat, setCat] = useState<string>("all");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void loadTemplateManifest()
      .then(setManifest)
      .catch(() => setManifestError(true));
    void getClassAssignment(klass.id).then((a) => {
      setCurrent(a);
      setLoaded(true);
    });
  }, [klass.id]);

  const items = useMemo(() => {
    if (!manifest) return [];
    const out: (TemplateItem & { theme: string })[] = [];
    for (const t of Object.values(manifest.themes)) {
      if (cat !== "all" && t.category !== cat) continue;
      for (const it of t.items) out.push({ ...it, theme: t.theme });
    }
    return out;
  }, [manifest, cat]);

  const assign = async (it: TemplateItem) => {
    setBusy(true);
    const ok = await setClassAssignment(klass.id, {
      template_id: it.id,
      title: it.title,
      image: it.image,
      note: note.trim(),
    });
    setBusy(false);
    if (ok) {
      setCurrent(await getClassAssignment(klass.id));
      setNote(""); // 다음 배포에 이전 안내문이 남지 않게
    }
  };

  const unassign = async () => {
    setBusy(true);
    await clearClassAssignment(klass.id);
    setCurrent(null);
    setBusy(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-bubble bg-paper shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-cream-deep px-5 py-4">
          <h2 className="font-display text-xl text-ink">📋 {klass.name} 도안 배포</h2>
          <button onClick={onClose} className="pressable rounded-full px-2 text-xl text-ink-faint" aria-label="닫기">
            ✕
          </button>
        </div>

        {/* 현재 배포 상태 */}
        <div className="border-b border-cream-deep bg-cream px-5 py-3">
          {!loaded ? (
            <p className="text-sm text-ink-faint">불러오는 중…</p>
          ) : current ? (
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-card bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={current.image} alt="" className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">
                  지금 배포 중: {current.title || current.template_id}
                </p>
                {current.note && <p className="truncate text-sm text-ink-soft">{current.note}</p>}
              </div>
              <Button size="md" tone="ghost" onClick={unassign} disabled={busy}>
                배포 해제
              </Button>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">
              아직 배포한 도안이 없어요. 아래에서 골라 배포하면 학생 화면에 안내가 떠요.
            </p>
          )}
        </div>

        {/* 안내 문구(선택) */}
        <div className="border-b border-cream-deep px-5 py-3">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 60))}
            placeholder="한 줄 안내 (예: 오늘은 명화 따라 그리기!)"
            className="w-full rounded-card border-2 border-cream-deep bg-cream px-3 py-2 text-sm text-ink focus:border-sky"
          />
        </div>

        {/* 카테고리 필터 */}
        <div className="flex flex-wrap gap-2 px-5 py-3">
          <CatChip active={cat === "all"} onClick={() => setCat("all")}>
            전체
          </CatChip>
          {manifest?.categories.map((c) => (
            <CatChip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
              {c.emoji} {c.title}
            </CatChip>
          ))}
        </div>

        {/* 도안 그리드 */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {manifestError ? (
            <p className="py-10 text-center text-ink-soft">
              도안 목록을 불러오지 못했어요. 잠시 후 다시 열어 주세요.
            </p>
          ) : !manifest ? (
            <p className="py-10 text-center text-ink-faint">도안 목록을 불러오는 중…</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {items.map((it) => (
                <button
                  key={`${it.theme}/${it.id}`}
                  onClick={() => assign(it)}
                  disabled={busy}
                  className={`pressable overflow-hidden rounded-card bg-white text-left shadow-soft ${
                    current?.template_id === it.id ? "ring-4 ring-coral" : ""
                  }`}
                >
                  <div className="aspect-square bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.image} alt={it.title} loading="lazy" className="h-full w-full object-contain" />
                  </div>
                  <div className="px-2 py-1.5">
                    <p className="truncate text-xs font-semibold text-ink">{it.title}</p>
                    <p className="text-[10px] text-ink-faint">{GRADE_LABEL[it.grade]}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CatChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`pressable rounded-full px-3 py-1 text-sm font-semibold ${
        active ? "bg-ink text-white" : "bg-cream text-ink-soft"
      }`}
    >
      {children}
    </button>
  );
}
