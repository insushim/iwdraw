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
import { generateDowntownNight } from './downtown-night';
import { generateSuburbanHouse } from './suburban-house';
import { generateAncientRuins } from './ancient-ruins';
import { generateMedievalCastle } from './medieval-castle';
import { generateJapaneseTemple } from './japanese-temple';
import { generateDesertOasis } from './desert-oasis';
import { generateTropicalIsland } from './tropical-island';
import { generateFarmField } from './farm-field';
import { generateSpringFestival } from './spring-festival';
import { generateWinterWonderland } from './winter-wonderland';
import { generateKitchenTable } from './kitchen-table';
import { generateLibraryStudy } from './library-study';
import { generateKidsRoom } from './kids-room';
import { generateClassroom } from './classroom';
import { generateMusicStudio } from './music-studio';
import { generateMarketStall } from './market-stall';
import { generatePlayground } from './playground';
import { generateHarborDock } from './harbor-dock';
import { generateTrainStation } from './train-station';
import { generateBakeryShop } from './bakery-shop';
import { generateDragonLair } from './dragon-lair';
import { generateSteampunkWorkshop } from './steampunk-workshop';
import { generateAquarium } from './aquarium';
import { generateZooEnclosure } from './zoo-enclosure';
import { generateFlowerShop } from './flower-shop';
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
  [SceneTheme.DOWNTOWN_NIGHT]: autoWrap(generateDowntownNight as any),
  [SceneTheme.SUBURBAN_HOUSE]: autoWrap(generateSuburbanHouse as any),
  [SceneTheme.ANCIENT_RUINS]: autoWrap(generateAncientRuins as any),
  [SceneTheme.MEDIEVAL_CASTLE]: autoWrap(generateMedievalCastle as any),
  [SceneTheme.JAPANESE_TEMPLE]: autoWrap(generateJapaneseTemple as any),
  [SceneTheme.DESERT_OASIS]: autoWrap(generateDesertOasis as any),
  [SceneTheme.TROPICAL_ISLAND]: autoWrap(generateTropicalIsland as any),
  [SceneTheme.FARM_FIELD]: autoWrap(generateFarmField as any),
  [SceneTheme.SPRING_FESTIVAL]: autoWrap(generateSpringFestival as any),
  [SceneTheme.WINTER_WONDERLAND]: autoWrap(generateWinterWonderland as any),
  [SceneTheme.KITCHEN_TABLE]: autoWrap(generateKitchenTable as any),
  [SceneTheme.LIBRARY_STUDY]: autoWrap(generateLibraryStudy as any),
  [SceneTheme.KIDS_ROOM]: autoWrap(generateKidsRoom as any),
  [SceneTheme.CLASSROOM]: autoWrap(generateClassroom as any),
  [SceneTheme.MUSIC_STUDIO]: autoWrap(generateMusicStudio as any),
  [SceneTheme.MARKET_STALL]: autoWrap(generateMarketStall as any),
  [SceneTheme.PLAYGROUND]: autoWrap(generatePlayground as any),
  [SceneTheme.HARBOR_DOCK]: autoWrap(generateHarborDock as any),
  [SceneTheme.TRAIN_STATION]: autoWrap(generateTrainStation as any),
  [SceneTheme.BAKERY_SHOP]: autoWrap(generateBakeryShop as any),
  [SceneTheme.DRAGON_LAIR]: autoWrap(generateDragonLair as any),
  [SceneTheme.STEAMPUNK_WORKSHOP]: autoWrap(generateSteampunkWorkshop as any),
  [SceneTheme.AQUARIUM]: autoWrap(generateAquarium as any),
  [SceneTheme.ZOO_ENCLOSURE]: autoWrap(generateZooEnclosure as any),
  [SceneTheme.FLOWER_SHOP]: autoWrap(generateFlowerShop as any),
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
