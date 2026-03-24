import { Scene, SceneTheme, THEME_INFO, DIFFICULTY_CONFIGS } from './types';
import { SeededRandom } from './random';
import { DifferenceGenerator } from './difference-generator';
import { resetId } from './primitives';
import { getSceneGenerator } from '../scenes';

export class SceneGenerator {
  private seed: number;
  private theme: SceneTheme;
  private difficulty: string;
  private rng: SeededRandom;

  constructor(seed: number, theme: SceneTheme, difficulty: string = 'medium') {
    this.seed = seed;
    this.theme = theme;
    this.difficulty = difficulty;
    this.rng = new SeededRandom(seed);
  }

  generate(): Scene {
    resetId();
    const width = 800;
    const height = 600;
    const config = DIFFICULTY_CONFIGS[this.difficulty] || DIFFICULTY_CONFIGS.medium;

    const generator = getSceneGenerator(this.theme);
    const output = generator(this.rng, width, height);

    const info = THEME_INFO[this.theme];
    const diffLabel = config.differenceCount <= 3 ? 'easy' as const : config.differenceCount <= 5 ? 'medium' as const : config.differenceCount <= 7 ? 'hard' as const : 'expert' as const;

    const scene: Scene = {
      id: `scene_${this.seed}_${this.theme}`,
      seed: this.seed,
      theme: this.theme,
      width,
      height,
      backgroundColor: '#87CEEB',
      elements: output.elements,
      svgDefs: output.defs,
      differences: [],
      difficulty: diffLabel,
      differenceCount: config.differenceCount,
      timeLimit: config.timeLimit ?? undefined,
      metadata: { title: info.title, description: info.description, category: info.category },
    };

    const diffGen = new DifferenceGenerator(scene, config, new SeededRandom(this.seed + 1000));
    scene.differences = diffGen.generateDifferences();
    scene.differenceCount = scene.differences.length;

    return scene;
  }
}
