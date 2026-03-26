'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  GameState, GameSettings, UserProfile, SceneTheme, Scene,
  ClickResult, GameResult, DIFFICULTY_CONFIGS, Achievement,
} from '../engine/types';
import { SceneGenerator } from '../engine/scene-generator';
import { DailyChallenge } from '../engine/daily-challenge';
import { IMPLEMENTED_THEMES } from '../scenes/index';
import { checkAchievements } from '../engine/achievements';
import { soundManager, SfxType } from '../audio/sound-manager';

interface GameStore {
  gameState: GameState | null;
  userProfile: UserProfile;
  settings: GameSettings;
  newAchievements: Achievement[];
  lastGameResult: GameResult | null;

  startGame: (theme: SceneTheme, difficulty: string, seed?: number) => void;
  startDailyChallenge: () => void;
  startRandomGame: () => void;
  handleClick: (x: number, y: number, side: 'left' | 'right') => ClickResult;
  useHint: () => { x: number; y: number } | null;
  pauseGame: () => void;
  resumeGame: () => void;
  updateElapsedTime: (t: number) => void;
  completeGame: () => void;
  updateSettings: (s: Partial<GameSettings>) => void;
  clearNewAchievements: () => void;
  resetProfile: () => void;
}

const defaultProfile: UserProfile = {
  totalGamesPlayed: 0,
  totalDifferencesFound: 0,
  bestTime: {},
  currentStreak: 0,
  longestStreak: 0,
  level: 1,
  experience: 0,
  achievements: [],
  unlockedThemes: [SceneTheme.CITY_STREET, SceneTheme.FOREST_CLEARING, SceneTheme.BEACH_SUNSET],
  dailyChallengeHistory: [],
  lastPlayDate: '',
};

const defaultSettings: GameSettings = {
  soundEnabled: true,
  musicEnabled: false,
  musicVolume: 0.3,
  sfxVolume: 0.6,
  showTimer: true,
  difficulty: 'medium',
  language: 'ko',
  highContrast: false,
  zoomEnabled: true,
  darkMode: false,
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      gameState: null,
      userProfile: defaultProfile,
      settings: defaultSettings,
      newAchievements: [],
      lastGameResult: null,

      startGame: (theme, difficulty, seed) => {
        const s = seed ?? Math.floor(Math.random() * 1000000);
        const gen = new SceneGenerator(s, theme, difficulty);
        const scene = gen.generate();
        const config = DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS.medium;

        set({
          gameState: {
            scene,
            foundDifferences: [],
            remainingHints: config.hintCount,
            startTime: Date.now(),
            elapsedTime: 0,
            score: 0,
            combo: 0,
            maxCombo: 0,
            mistakes: 0,
            lives: config.lives,
            maxLives: config.lives,
            isComplete: false,
            isPaused: false,
          },
          lastGameResult: null,
        });

        // Unlock theme
        const profile = get().userProfile;
        if (!profile.unlockedThemes.includes(theme)) {
          set({ userProfile: { ...profile, unlockedThemes: [...profile.unlockedThemes, theme] } });
        }
      },

      startDailyChallenge: () => {
        const scene = DailyChallenge.generateDailyScene();
        const config = DIFFICULTY_CONFIGS[DailyChallenge.getTodayDifficulty()];

        set({
          gameState: {
            scene,
            foundDifferences: [],
            remainingHints: config.hintCount,
            startTime: Date.now(),
            elapsedTime: 0,
            score: 0,
            combo: 0,
            maxCombo: 0,
            mistakes: 0,
            lives: config.lives,
            maxLives: config.lives,
            isComplete: false,
            isPaused: false,
          },
          lastGameResult: null,
        });
      },

      startRandomGame: () => {
        const theme = IMPLEMENTED_THEMES[Math.floor(Math.random() * IMPLEMENTED_THEMES.length)];
        get().startGame(theme, get().settings.difficulty);
      },

      handleClick: (x, y) => {
        const gs = get().gameState;
        if (!gs || gs.isComplete || gs.isPaused) return { hit: false, score: 0, combo: 0 };

        // Check against differences
        for (const diff of gs.scene.differences) {
          if (gs.foundDifferences.includes(diff.id)) continue;

          const ha = diff.hitArea;
          if (x >= ha.x && x <= ha.x + ha.width && y >= ha.y && y <= ha.y + ha.height) {
            const newCombo = gs.combo + 1;
            const comboBonus = newCombo > 1 ? newCombo * 50 : 0;
            const scoreAdd = 100 + comboBonus;
            const newFound = [...gs.foundDifferences, diff.id];
            const isComplete = newFound.length >= gs.scene.differenceCount;

            soundManager.playSfx(newCombo > 2 ? SfxType.COMBO : SfxType.CLICK_CORRECT);

            set({
              gameState: {
                ...gs,
                foundDifferences: newFound,
                combo: newCombo,
                maxCombo: Math.max(gs.maxCombo, newCombo),
                score: gs.score + scoreAdd,
                isComplete,
              },
            });

            if (isComplete) {
              setTimeout(() => get().completeGame(), 500);
            }

            return { hit: true, difference: diff, score: scoreAdd, combo: newCombo };
          }
        }

        // Miss - lose a life
        const newLives = gs.lives - 1;
        soundManager.playSfx(SfxType.CLICK_WRONG);

        if (newLives <= 0) {
          // Out of lives - game over
          set({
            gameState: {
              ...gs,
              combo: 0,
              mistakes: gs.mistakes + 1,
              lives: 0,
              score: Math.max(0, gs.score - 30),
              isComplete: true,
              gameOverReason: 'out_of_lives',
            },
          });
          setTimeout(() => get().completeGame(), 500);
        } else {
          set({
            gameState: {
              ...gs,
              combo: 0,
              mistakes: gs.mistakes + 1,
              lives: newLives,
              score: Math.max(0, gs.score - 30),
            },
          });
        }

        return { hit: false, score: -30, combo: 0 };
      },

      useHint: () => {
        const gs = get().gameState;
        if (!gs || gs.remainingHints <= 0) return null;

        const unfound = gs.scene.differences.filter(d => !gs.foundDifferences.includes(d.id));
        if (unfound.length === 0) return null;

        soundManager.playSfx(SfxType.HINT_USED);
        const hint = unfound[0];
        set({
          gameState: { ...gs, remainingHints: gs.remainingHints - 1 },
        });

        return {
          x: hint.hitArea.x + hint.hitArea.width / 2,
          y: hint.hitArea.y + hint.hitArea.height / 2,
        };
      },

      pauseGame: () => {
        const gs = get().gameState;
        if (gs) set({ gameState: { ...gs, isPaused: true } });
      },

      resumeGame: () => {
        const gs = get().gameState;
        if (gs) set({ gameState: { ...gs, isPaused: false } });
      },

      updateElapsedTime: (t) => {
        const gs = get().gameState;
        if (gs && !gs.isPaused && !gs.isComplete) {
          set({ gameState: { ...gs, elapsedTime: t } });
        }
      },

      completeGame: () => {
        const gs = get().gameState;
        if (!gs) return;

        // Determine game over reason
        const reason: 'cleared' | 'out_of_lives' | 'time_up' =
          gs.gameOverReason === 'out_of_lives' ? 'out_of_lives'
          : gs.scene.timeLimit && gs.elapsedTime >= gs.scene.timeLimit ? 'time_up'
          : 'cleared';

        const time = gs.elapsedTime;
        const perfect = gs.mistakes === 0 && reason === 'cleared';
        const timeBonus = reason === 'cleared' && gs.scene.timeLimit ? Math.max(0, (gs.scene.timeLimit - time) * 10) : 0;
        const diffMultiplier = gs.scene.difficulty === 'expert' ? 3 : gs.scene.difficulty === 'hard' ? 2 : gs.scene.difficulty === 'medium' ? 1.5 : 1;
        const perfectBonus = perfect ? 500 : 0;
        const totalScore = Math.round((gs.score + timeBonus + perfectBonus) * diffMultiplier);

        const scorePercent = totalScore / ((gs.scene.differenceCount * 100 + 500) * diffMultiplier);
        const grade = scorePercent >= 0.9 ? 'S' : scorePercent >= 0.8 ? 'A' : scorePercent >= 0.7 ? 'B' : scorePercent >= 0.6 ? 'C' : 'D';

        const result: GameResult = {
          score: totalScore,
          time,
          differencesFound: gs.foundDifferences.length,
          totalDifferences: gs.scene.differenceCount,
          maxCombo: gs.maxCombo,
          mistakes: gs.mistakes,
          difficulty: gs.scene.difficulty,
          theme: gs.scene.theme,
          perfect,
          grade,
          gameOverReason: reason,
        };

        soundManager.playSfx(reason !== 'cleared' ? SfxType.CLICK_WRONG : perfect ? SfxType.PERFECT : SfxType.GAME_COMPLETE);

        // Update profile
        const profile = { ...get().userProfile };
        profile.totalGamesPlayed += 1;
        profile.totalDifferencesFound += gs.foundDifferences.length;
        profile.experience += totalScore;
        profile.level = Math.floor(profile.experience / 1000) + 1;

        const themeKey = gs.scene.theme;
        if (!profile.bestTime[themeKey] || time < profile.bestTime[themeKey]) {
          profile.bestTime[themeKey] = time;
        }

        // Streak
        const today = new Date().toISOString().split('T')[0];
        if (profile.lastPlayDate !== today) {
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
          if (profile.lastPlayDate === yesterday) {
            profile.currentStreak += 1;
          } else {
            profile.currentStreak = 1;
          }
          profile.longestStreak = Math.max(profile.longestStreak, profile.currentStreak);
          profile.lastPlayDate = today;
        }

        // Check achievements
        const newAch = checkAchievements(profile, result);
        if (newAch.length > 0) {
          soundManager.playSfx(SfxType.ACHIEVEMENT);
          profile.achievements = [...profile.achievements, ...newAch];
        }

        set({
          gameState: { ...gs, isComplete: true, score: totalScore, gameOverReason: reason },
          userProfile: profile,
          lastGameResult: result,
          newAchievements: newAch,
        });
      },

      updateSettings: (s) => {
        const settings = { ...get().settings, ...s };
        set({ settings });
        soundManager.setEnabled(settings.soundEnabled);
        soundManager.setMusicEnabled(settings.musicEnabled);
        soundManager.setSfxVolume(settings.sfxVolume);
        soundManager.setMusicVolume(settings.musicVolume);
      },

      clearNewAchievements: () => set({ newAchievements: [] }),

      resetProfile: () => set({ userProfile: defaultProfile }),
    }),
    {
      name: 'diffhunt-storage',
      partialize: (state) => ({
        userProfile: state.userProfile,
        settings: state.settings,
      }),
    }
  )
);
