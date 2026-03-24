import { Scene, SceneTheme, DifficultyConfig, THEME_INFO, DIFFICULTY_CONFIGS } from './types';
import { SeededRandom } from './random';
import { DifferenceGenerator } from './difference-generator';
import { resetId } from './primitives';
import { getSceneGenerator } from '../scenes';

export class SceneGenerator {
  private seed: number;
  private theme: SceneTheme;
  private difficulty: DifficultyConfig;
  private rng: SeededRandom;

  constructor(seed: number, theme: SceneTheme, difficulty: string = 'medium') {
    this.seed = seed;
    this.theme = theme;
    this.difficulty = DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS.medium;
    this.rng = new SeededRandom(seed);
  }

  generate(): Scene {
    resetId();
    const width = 800;
    const height = 600;

    const generator = getSceneGenerator(this.theme);
    const elements = generator(this.rng, width, height);

    const info = THEME_INFO[this.theme];

    const scene: Scene = {
      id: `scene_${this.seed}_${this.theme}`,
      seed: this.seed,
      theme: this.theme,
      width,
      height,
      backgroundColor: '#87CEEB',
      elements,
      differences: [],
      difficulty: this.getDifficultyLabel(),
      differenceCount: this.difficulty.differenceCount,
      timeLimit: this.difficulty.timeLimit ?? undefined,
      metadata: {
        title: info.title,
        description: info.description,
        category: info.category,
      },
    };

    // Generate differences
    const diffGen = new DifferenceGenerator(scene, this.difficulty, new SeededRandom(this.seed + 1000));
    scene.differences = diffGen.generateDifferences();
    scene.differenceCount = scene.differences.length;

    return scene;
  }

  private getDifficultyLabel(): 'easy' | 'medium' | 'hard' | 'expert' {
    if (this.difficulty.differenceCount <= 3) return 'easy';
    if (this.difficulty.differenceCount <= 5) return 'medium';
    if (this.difficulty.differenceCount <= 7) return 'hard';
    return 'expert';
  }
}
