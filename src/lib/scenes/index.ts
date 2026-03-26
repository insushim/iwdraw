import { SVGElementData, SceneTheme } from '../engine/types';
import { SeededRandom } from '../engine/random';
import { combineDefs, daySkyGradient, groundGradient, sunGlowGradient, outdoorDefs } from './svg-effects';

// All dedicated scene imports
import { generateCityStreet } from './city-street';
import { generateForestClearing } from './forest-clearing';
import { generateCozyLivingRoom } from './cozy-living-room';
import { generateUnderwaterReef } from './underwater-reef';
import { generateBeachSunset } from './beach-sunset';
import { generateSnowyVillage } from './snowy-village';
import { generateMountainLake } from './mountain-lake';
import { generateHalloweenNight } from './halloween-night';
import { generateChristmasScene } from './christmas-scene';
import { generateFairyGarden } from './fairy-garden';
import { generateSpaceStation } from './space-station';
import { generateCafeInterior } from './cafe-interior';
import { generateCherryBlossom } from './cherry-blossom';
import { generateAutumnPark } from './autumn-park';
import { generateGenericScene } from './generic-scenes';

export interface SceneOutput {
  elements: SVGElementData[];
  defs?: string;
}

type SceneGeneratorFn = (rng: SeededRandom, w: number, h: number) => SceneOutput;

function autoWrap(fn: (rng: SeededRandom, w: number, h: number) => SVGElementData[] | SceneOutput): SceneGeneratorFn {
  return (rng, w, h) => {
    const result = fn(rng, w, h);
    if (Array.isArray(result)) return { elements: result };
    return result as SceneOutput;
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const generators: Partial<Record<SceneTheme, SceneGeneratorFn>> = {
  [SceneTheme.CITY_STREET]: autoWrap(generateCityStreet as any),
  [SceneTheme.FOREST_CLEARING]: autoWrap(generateForestClearing as any),
  [SceneTheme.COZY_LIVING_ROOM]: autoWrap(generateCozyLivingRoom as any),
  [SceneTheme.UNDERWATER_REEF]: autoWrap(generateUnderwaterReef as any),
  [SceneTheme.BEACH_SUNSET]: autoWrap(generateBeachSunset as any),
  [SceneTheme.SNOWY_VILLAGE]: autoWrap(generateSnowyVillage as any),
  [SceneTheme.MOUNTAIN_LAKE]: autoWrap(generateMountainLake as any),
  [SceneTheme.HALLOWEEN_NIGHT]: autoWrap(generateHalloweenNight as any),
  [SceneTheme.CHRISTMAS_SCENE]: autoWrap(generateChristmasScene as any),
  [SceneTheme.FAIRY_GARDEN]: autoWrap(generateFairyGarden as any),
  [SceneTheme.SPACE_STATION]: autoWrap(generateSpaceStation as any),
  [SceneTheme.CAFE_INTERIOR]: autoWrap(generateCafeInterior as any),
  [SceneTheme.CHERRY_BLOSSOM]: autoWrap(generateCherryBlossom as any),
  [SceneTheme.AUTUMN_PARK]: autoWrap(generateAutumnPark as any),
};

/** Themes that have dedicated scene generators (not generic fallback) */
export const IMPLEMENTED_THEMES: SceneTheme[] = Object.keys(generators) as SceneTheme[];

export function getSceneGenerator(theme: SceneTheme): SceneGeneratorFn {
  return generators[theme] || ((rng, w, h) => {
    const els = generateGenericScene(theme, rng, w, h);
    const defs = combineDefs(
      daySkyGradient('skyGrad'),
      groundGradient('groundGrad'),
      sunGlowGradient('sunGlow'),
      outdoorDefs(),
    );
    return { elements: els, defs };
  });
}
