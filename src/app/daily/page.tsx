'use client';

import { useGameStore } from '@/lib/store/game-store';
import { useTranslation } from '@/lib/i18n';
import { ACHIEVEMENTS_LIST } from '@/lib/engine/achievements';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function DailyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userProfile, settings, updateSettings, resetProfile } = useGameStore();
  const { t } = useTranslation(settings.language);
  const initialTab = searchParams.get('tab') || 'achievements';
  const [tab, setTab] = useState<'achievements' | 'settings'>(initialTab as 'achievements' | 'settings');

  return (
    <div className={settings.darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => router.push('/')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              ← {t.back}
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setTab('achievements')}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition ${tab === 'achievements' ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
              >
                🏆 {t.achievements}
              </button>
              <button
                onClick={() => setTab('settings')}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition ${tab === 'settings' ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
              >
                ⚙️ {t.settings}
              </button>
            </div>
          </div>

          {tab === 'achievements' && (
            <div className="grid grid-cols-1 gap-3">
              {ACHIEVEMENTS_LIST.map((ach, i) => {
                const unlocked = userProfile.achievements.find(a => a.id === ach.id);
                return (
                  <motion.div
                    key={ach.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition ${
                      unlocked?.unlockedAt
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60'
                    }`}
                  >
                    <div className="text-3xl">{ach.icon}</div>
                    <div className="flex-1">
                      <div className="font-bold">{ach.title}</div>
                      <div className="text-sm text-[var(--color-text-secondary)]">{ach.description}</div>
                    </div>
                    {unlocked?.unlockedAt && (
                      <div className="text-xs text-green-600 dark:text-green-400 font-medium">✅</div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {tab === 'settings' && (
            <div className="space-y-4">
              <ToggleSetting label={t.sound} value={settings.soundEnabled} onChange={v => updateSettings({ soundEnabled: v })} />
              <ToggleSetting label={t.music} value={settings.musicEnabled} onChange={v => updateSettings({ musicEnabled: v })} />
              <ToggleSetting label={t.timer_display} value={settings.showTimer} onChange={v => updateSettings({ showTimer: v })} />
              <ToggleSetting label={t.dark_mode} value={settings.darkMode} onChange={v => updateSettings({ darkMode: v })} />

              <div className="p-4 bg-[var(--color-surface)] rounded-2xl border border-gray-200 dark:border-gray-700">
                <div className="text-sm font-bold mb-2">{t.language}</div>
                <div className="flex gap-2">
                  {(['ko', 'en', 'ja'] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => updateSettings({ language: lang })}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                        settings.language === lang ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-100 dark:bg-gray-800'
                      }`}
                    >
                      {lang === 'ko' ? '한국어' : lang === 'en' ? 'English' : '日本語'}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => { if (confirm(t.reset_confirm)) resetProfile(); }}
                className="w-full py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition"
              >
                {t.reset_data}
              </button>

              <div className="text-center text-xs text-[var(--color-text-secondary)] pt-4">
                DiffHunt v1.0 | SVG Procedural Generation Engine<br />
                Made with ❤️
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DailyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <DailyPageContent />
    </Suspense>
  );
}

function ToggleSetting({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-4 bg-[var(--color-surface)] rounded-2xl border border-gray-200 dark:border-gray-700">
      <span className="font-medium">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-12 h-7 rounded-full transition ${value ? 'bg-[var(--color-primary)]' : 'bg-gray-300 dark:bg-gray-600'}`}
      >
        <div className={`w-5 h-5 rounded-full bg-white shadow transition transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}
