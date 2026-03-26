import { Scene, SceneTheme, DIFFICULTY_CONFIGS } from './types';
import { SceneGenerator } from './scene-generator';
import { IMPLEMENTED_THEMES } from '../scenes/index';

export class DailyChallenge {
  static getTodaySeed(): number {
    const now = new Date();
    return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  }

  static getTodayTheme(): SceneTheme {
    const seed = this.getTodaySeed();
    return IMPLEMENTED_THEMES[seed % IMPLEMENTED_THEMES.length];
  }

  static getTodayDifficulty(): string {
    const day = new Date().getDay();
    if (day === 0 || day === 6) return 'hard';
    if (day >= 4) return 'hard';
    return 'medium';
  }

  static generateDailyScene(): Scene {
    const seed = this.getTodaySeed();
    const theme = this.getTodayTheme();
    const difficulty = this.getTodayDifficulty();
    const generator = new SceneGenerator(seed, theme, difficulty);
    return generator.generate();
  }

  static getTodayDateString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  static getNextChallengeTime(): number {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return tomorrow.getTime() - now.getTime();
  }
}
