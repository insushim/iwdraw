import { SVGElementData, SceneTheme } from '../engine/types';
import { SeededRandom } from '../engine/random';
import { generateCityStreet } from './city-street';
import { generateForestClearing } from './forest-clearing';
import { generateCozyLivingRoom } from './cozy-living-room';
import { generateUnderwaterReef } from './underwater-reef';
import { generateBeachSunset } from './beach-sunset';
import { generateGenericScene } from './generic-scenes';

type SceneGeneratorFn = (rng: SeededRandom, w: number, h: number) => SVGElementData[];

const generators: Partial<Record<SceneTheme, SceneGeneratorFn>> = {
  [SceneTheme.CITY_STREET]: generateCityStreet,
  [SceneTheme.FOREST_CLEARING]: generateForestClearing,
  [SceneTheme.COZY_LIVING_ROOM]: generateCozyLivingRoom,
  [SceneTheme.UNDERWATER_REEF]: generateUnderwaterReef,
  [SceneTheme.BEACH_SUNSET]: generateBeachSunset,
};

export function getSceneGenerator(theme: SceneTheme): SceneGeneratorFn {
  return generators[theme] || ((rng, w, h) => generateGenericScene(theme, rng, w, h));
}
