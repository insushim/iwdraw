'use client';

import { useGameStore } from '@/lib/store/game-store';
import { useTranslation } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const gradeColors: Record<string, string> = {
  S: 'from-amber-400 to-yellow-300',
  A: 'from-indigo-500 to-blue-400',
  B: 'from-green-500 to-emerald-400',
  C: 'from-gray-500 to-gray-400',
  D: 'from-red-500 to-red-400',
};

export default function GameResult() {
  const { lastGameResult, newAchievements, clearNewAchievements, startRandomGame } = useGameStore();
  const { t } = useTranslation(useGameStore.getState().settings.language);
  const router = useRouter();
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (!lastGameResult) return;
    let current = 0;
    const target = lastGameResult.score;
    const step = Math.max(1, Math.floor(target / 60));
    const interval = setInterval(() => {
      current = Math.min(current + step, target);
      setDisplayScore(current);
      if (current >= target) clearInterval(interval);
    }, 16);
    return () => clearInterval(interval);
  }, [lastGameResult]);

  if (!lastGameResult) return null;

  const r = lastGameResult;
  const gradeClass = gradeColors[r.grade] || gradeColors.C;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg)]"
    >
      <div className="w-full max-w-md bg-[var(--color-surface)] rounded-3xl shadow-xl p-6 space-y-6">
        {/* Grade */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
            transition={{ type: 'spring', delay: 0.2 }}
            className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br ${gradeClass} text-white text-5xl font-black shadow-lg`}
          >
            {r.grade}
          </motion.div>
          <p className="mt-2 text-lg font-medium text-[var(--color-text-secondary)]">
            {t.grade_text[r.grade as keyof typeof t.grade_text]}
          </p>
        </div>

        {/* Score */}
        <div className="text-center">
          <div className="text-4xl font-black text-[var(--color-primary)]">
            {displayScore.toLocaleString()}
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">{t.score}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label={t.time} value={formatTime(r.time)} icon="⏱️" />
          <StatCard label={t.differences_found} value={`${r.differencesFound}/${r.totalDifferences}`} icon="🎯" />
          <StatCard label={t.max_combo} value={`${r.maxCombo}x`} icon="🔥" />
          <StatCard label={t.mistakes} value={`${r.mistakes}`} icon="❌" />
        </div>

        {/* Perfect badge */}
        {r.perfect && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-center py-2 bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-xl"
          >
            <span className="text-2xl">✨</span>
            <span className="ml-2 text-lg font-bold text-amber-700 dark:text-amber-300">{t.perfect}</span>
          </motion.div>
        )}

        {/* New achievements */}
        <AnimatePresence>
          {newAchievements.length > 0 && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-2">
              <h3 className="text-sm font-bold text-[var(--color-text-secondary)]">🏆 {t.achievements}</h3>
              {newAchievements.map((ach, i) => (
                <motion.div
                  key={ach.id}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.15 }}
                  className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl"
                >
                  <span className="text-2xl">{ach.icon}</span>
                  <div>
                    <div className="font-bold text-sm">{ach.title}</div>
                    <div className="text-xs text-[var(--color-text-secondary)]">{ach.description}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              clearNewAchievements();
              startRandomGame();
            }}
            className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl font-bold text-lg hover:opacity-90 transition"
          >
            {t.next_game}
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => {
                clearNewAchievements();
                const gs = useGameStore.getState().gameState;
                if (gs) {
                  useGameStore.getState().startGame(gs.scene.theme, gs.scene.difficulty);
                }
              }}
              className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              {t.retry}
            </button>
            <button
              onClick={() => { clearNewAchievements(); router.push('/'); }}
              className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              {t.home}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
      <span className="text-lg">{icon}</span>
      <div>
        <div className="text-xs text-[var(--color-text-secondary)]">{label}</div>
        <div className="font-bold">{value}</div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
