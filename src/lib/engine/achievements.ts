import { Achievement, UserProfile, GameResult } from './types';

export const ACHIEVEMENTS_LIST: Omit<Achievement, 'unlockedAt' | 'progress'>[] = [
  { id: 'first_game', title: '첫 발걸음', description: '첫 게임 완료', icon: '🎮', requirement: 1 },
  { id: 'games_10', title: '입문자', description: '10게임 완료', icon: '🌟', requirement: 10 },
  { id: 'games_50', title: '관찰자', description: '50게임 완료', icon: '👀', requirement: 50 },
  { id: 'games_100', title: '탐정', description: '100게임 완료', icon: '🔍', requirement: 100 },
  { id: 'games_500', title: '감식관', description: '500게임 완료', icon: '🕵️', requirement: 500 },
  { id: 'diff_100', title: '차이점 헌터', description: '차이점 100개 발견', icon: '🎯', requirement: 100 },
  { id: 'diff_1000', title: '차이점 마스터', description: '차이점 1000개 발견', icon: '💎', requirement: 1000 },
  { id: 'speed_demon', title: '스피드 데몬', description: '30초 이내 게임 완료', icon: '⚡', requirement: 1 },
  { id: 'combo_5', title: '콤보 스타터', description: '5콤보 달성', icon: '🔥', requirement: 5 },
  { id: 'combo_10', title: '콤보 마스터', description: '10콤보 달성', icon: '💥', requirement: 10 },
  { id: 'perfect', title: '퍼펙트!', description: '실수 없이 게임 완료', icon: '✨', requirement: 1 },
  { id: 'perfect_10', title: '퍼펙트 마스터', description: '퍼펙트 10회 달성', icon: '🏆', requirement: 10 },
  { id: 'expert_clear', title: '전문가', description: 'Expert 난이도 클리어', icon: '🧠', requirement: 1 },
  { id: 'streak_7', title: '일주일 연속', description: '7일 연속 데일리 챌린지', icon: '📅', requirement: 7 },
  { id: 'streak_30', title: '한 달 연속', description: '30일 연속 데일리 챌린지', icon: '🗓️', requirement: 30 },
  { id: 'explorer_10', title: '탐험가', description: '10개 테마 플레이', icon: '🗺️', requirement: 10 },
  { id: 'no_hints', title: '자력 해결', description: '힌트 없이 Hard 클리어', icon: '💪', requirement: 1 },
];

export function checkAchievements(profile: UserProfile, result?: GameResult): Achievement[] {
  const newlyUnlocked: Achievement[] = [];
  const now = new Date().toISOString();

  for (const def of ACHIEVEMENTS_LIST) {
    const existing = profile.achievements.find(a => a.id === def.id);
    if (existing?.unlockedAt) continue;

    let progress = 0;

    switch (def.id) {
      case 'first_game':
      case 'games_10':
      case 'games_50':
      case 'games_100':
      case 'games_500':
        progress = profile.totalGamesPlayed;
        break;
      case 'diff_100':
      case 'diff_1000':
        progress = profile.totalDifferencesFound;
        break;
      case 'speed_demon':
        progress = result && result.time <= 30 ? 1 : 0;
        break;
      case 'combo_5':
        progress = result ? result.maxCombo : 0;
        break;
      case 'combo_10':
        progress = result ? result.maxCombo : 0;
        break;
      case 'perfect':
        progress = result?.perfect ? 1 : 0;
        break;
      case 'perfect_10':
        progress = profile.achievements.filter(a => a.id === 'perfect' && a.unlockedAt).length + (result?.perfect ? 1 : 0);
        break;
      case 'expert_clear':
        progress = result?.difficulty === 'expert' ? 1 : 0;
        break;
      case 'streak_7':
      case 'streak_30':
        progress = profile.currentStreak;
        break;
      case 'explorer_10':
        progress = profile.unlockedThemes.length;
        break;
      case 'no_hints':
        progress = result?.difficulty === 'hard' && result.perfect ? 1 : 0;
        break;
      default:
        progress = 0;
    }

    if (progress >= def.requirement) {
      newlyUnlocked.push({
        ...def,
        progress: def.requirement,
        unlockedAt: now,
      });
    }
  }

  return newlyUnlocked;
}
