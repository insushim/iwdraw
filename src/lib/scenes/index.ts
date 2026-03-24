import { SVGElementData, SceneTheme } from '../engine/types';
import { SeededRandom } from '../engine/random';
import { generateCityStreet } from './city-street';
import { generateForestClearing } from './forest-clearing';
import { generateCozyLivingRoom } from './cozy-living-room';
import { generateUnderwaterReef } from './underwater-reef';
import { generateBeachSunset } from './beach-sunset';
import { generateGenericScene } from './generic-scenes';

export interface SceneOutput {
  elements: SVGElementData[];
  defs?: string;
}

type SceneGeneratorFn = (rng: SeededRandom, w: number, h: number) => SceneOutput;

// Wrap generators that return plain elements array
function wrap(fn: (rng: SeededRandom, w: number, h: number) => SVGElementData[]): SceneGeneratorFn {
  return (rng, w, h) => ({ elements: fn(rng, w, h) });
}

// Wrap generators that might return either format
function autoWrap(fn: (rng: SeededRandom, w: number, h: number) => SVGElementData[] | SceneOutput): SceneGeneratorFn {
  return (rng, w, h) => {
    const result = fn(rng, w, h);
    if (Array.isArray(result)) return { elements: result };
    return result as SceneOutput;
  };
}

const generators: Partial<Record<SceneTheme, SceneGeneratorFn>> = {
  [SceneTheme.CITY_STREET]: autoWrap(generateCityStreet as any),
  [SceneTheme.FOREST_CLEARING]: autoWrap(generateForestClearing as any),
  [SceneTheme.COZY_LIVING_ROOM]: autoWrap(generateCozyLivingRoom as any),
  [SceneTheme.UNDERWATER_REEF]: autoWrap(generateUnderwaterReef as any),
  [SceneTheme.BEACH_SUNSET]: autoWrap(generateBeachSunset as any),
};

export function getSceneGenerator(theme: SceneTheme): SceneGeneratorFn {
  return generators[theme] || ((rng, w, h) => ({ elements: generateGenericScene(theme, rng, w, h) }));
}
