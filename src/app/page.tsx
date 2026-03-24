'use client';

import { useGameStore } from '@/lib/store/game-store';
import { useTranslation } from '@/lib/i18n';
import { SceneTheme, THEME_INFO } from '@/lib/engine/types';
import { DailyChallenge } from '@/lib/engine/daily-challenge';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';

const CATEGORIES = ['all', 'city', 'nature', 'indoor', 'fantasy', 'daily', 'season'] as const;
const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const;

export default function Home() {
  const router = useRouter();
  const { userProfile, settings, startGame, startDailyChallenge, startRandomGame, updateSettings } = useGameStore();
  const { t } = useTranslation(settings.language);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState(settings.difficulty);

  const todayTheme = useMemo(() => DailyChallenge.getTodayTheme(), []);
  const todayInfo = THEME_INFO[todayTheme];
  const todayPlayed = userProfile.dailyChallengeHistory.some(d => d.date === DailyChallenge.getTodayDateString());

  const themes = useMemo(() => {
    return Object.values(SceneTheme)
      .filter(th => selectedCategory === 'all' || THEME_INFO[th].category === selectedCategory);
  }, [selectedCategory]);

  const handleDailyChallenge = () => {
    startDailyChallenge();
    router.push('/game');
  };

  const handleQuickPlay = () => {
    updateSettings({ difficulty: selectedDifficulty });
    startRandomGame();
    router.push('/game');
  };

  const handleThemeSelect = (theme: SceneTheme) => {
    updateSettings({ difficulty: selectedDifficulty });
    startGame(theme, selectedDifficulty);
    router.push('/game');
  };

  return (
    <div className={settings.darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="max-w-2xl mx-auto px-4 pb-24">
          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="pt-8 pb-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white text-2xl shadow-lg">
                🔍
              </div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent">
                {t.title}
              </h1>
            </div>
            <p className="text-[var(--color-text-secondary)]">{t.subtitle}</p>
          </motion.div>

          {/* Daily Challenge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="mb-6 p-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={handleDailyChallenge}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm opacity-80">{t.daily_challenge}</div>
                <div className="text-xl font-bold">{todayInfo.title}</div>
              </div>
              <div className="text-3xl">📅</div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span>🔥 {t.streak}: {userProfile.currentStreak}{t.days}</span>
              <span>🎮 Lv.{userProfile.level}</span>
            </div>
            {todayPlayed && (
              <div className="mt-2 text-xs opacity-70 bg-white/20 rounded-lg px-3 py-1 inline-block">
                ✅ {t.daily_already}
              </div>
            )}
          </motion.div>

          {/* Difficulty + Quick Play */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              {DIFFICULTIES.map(d => (
                <button
                  key={d}
                  onClick={() => setSelectedDifficulty(d)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition ${
                    selectedDifficulty === d
                      ? 'bg-[var(--color-primary)] text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-[var(--color-text-secondary)] hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {t.difficulty[d as keyof typeof t.difficulty]}
                </button>
              ))}
            </div>
            <button onClick={handleQuickPlay} className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:opacity-90 transition">
              🎲 {t.quick_play}
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-4 gap-2 mb-6">
            <MiniStat icon="🎮" value={userProfile.totalGamesPlayed} label={t.total_games} />
            <MiniStat icon="🎯" value={userProfile.totalDifferencesFound} label={t.total_found} />
            <MiniStat icon="🔥" value={userProfile.longestStreak} label={t.best_streak} />
            <MiniStat icon="⭐" value={userProfile.level} label={t.level} />
          </motion.div>

          {/* Theme Gallery */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <h2 className="text-lg font-bold mb-3">{t.themes}</h2>
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition ${
                    selectedCategory === cat
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-[var(--color-text-secondary)]'
                  }`}
                >
                  {t.category[cat as keyof typeof t.category] || cat}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {themes.map((theme, i) => {
                const info = THEME_INFO[theme];
                return (
                  <motion.button
                    key={theme}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => handleThemeSelect(theme)}
                    className="group p-4 bg-[var(--color-surface)] rounded-2xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-800 text-left transition-all hover:scale-[1.03]"
                  >
                    <div className="w-full h-20 rounded-xl bg-gradient-to-br from-indigo-100 to-pink-100 dark:from-indigo-900/30 dark:to-pink-900/30 mb-2 flex items-center justify-center text-3xl">
                      {getCategoryEmoji(info.category)}
                    </div>
                    <div className="font-bold text-sm truncate">{info.title}</div>
                    <div className="text-xs text-[var(--color-text-secondary)] truncate">{info.description}</div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Bottom nav */}
        <div className="fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-gray-200 dark:border-gray-800 shadow-lg z-50">
          <div className="max-w-2xl mx-auto flex items-center justify-around py-2">
            <NavBtn icon="🏠" label="홈" active />
            <NavBtn icon="🏆" label={t.achievements} onClick={() => router.push('/daily')} />
            <NavBtn icon="⚙️" label={t.settings} onClick={() => router.push('/daily?tab=settings')} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="p-3 bg-[var(--color-surface)] rounded-xl shadow-sm text-center border border-gray-100 dark:border-gray-800">
      <div className="text-lg">{icon}</div>
      <div className="font-bold text-lg">{value.toLocaleString()}</div>
      <div className="text-[10px] text-[var(--color-text-secondary)] truncate">{label}</div>
    </div>
  );
}

function NavBtn({ icon, label, active, onClick }: { icon: string; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-0.5 px-4 py-1 ${active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
      <span className="text-xl">{icon}</span>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = { city: '🏙️', nature: '🌲', indoor: '🏠', fantasy: '🔮', daily: '🛒', season: '🎄' };
  return map[category] || '🎨';
}
