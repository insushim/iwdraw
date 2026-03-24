// SVG 요소 타입
export interface SVGElementData {
  id: string;
  type: 'rect' | 'circle' | 'ellipse' | 'polygon' | 'path' | 'text' | 'group' | 'line';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  rx?: number;
  ry?: number;
  points?: string;
  d?: string;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
  transform?: string;
  children?: SVGElementData[];
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  layer: number;
  category: string;
  modifiable: boolean;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

export enum DifferenceType {
  COLOR_CHANGE = 'color_change',
  ELEMENT_REMOVED = 'element_removed',
  ELEMENT_ADDED = 'element_added',
  SIZE_CHANGE = 'size_change',
  POSITION_SHIFT = 'position_shift',
  ROTATION_CHANGE = 'rotation_change',
  PATTERN_CHANGE = 'pattern_change',
  TEXT_CHANGE = 'text_change',
  SHAPE_MORPH = 'shape_morph',
  OPACITY_CHANGE = 'opacity_change',
  MIRROR_FLIP = 'mirror_flip',
  DETAIL_ADDED = 'detail_added',
  DETAIL_REMOVED = 'detail_removed',
  LAYER_SWAP = 'layer_swap',
}

export interface Difference {
  id: string;
  elementId: string;
  type: DifferenceType;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  originalValue: unknown;
  modifiedValue: unknown;
  hitArea: { x: number; y: number; width: number; height: number };
}

export enum SceneTheme {
  CITY_STREET = 'city_street',
  DOWNTOWN_NIGHT = 'downtown_night',
  SUBURBAN_HOUSE = 'suburban_house',
  ANCIENT_RUINS = 'ancient_ruins',
  MEDIEVAL_CASTLE = 'medieval_castle',
  JAPANESE_TEMPLE = 'japanese_temple',
  FOREST_CLEARING = 'forest_clearing',
  MOUNTAIN_LAKE = 'mountain_lake',
  BEACH_SUNSET = 'beach_sunset',
  DESERT_OASIS = 'desert_oasis',
  SNOWY_VILLAGE = 'snowy_village',
  TROPICAL_ISLAND = 'tropical_island',
  CHERRY_BLOSSOM = 'cherry_blossom',
  AUTUMN_PARK = 'autumn_park',
  COZY_LIVING_ROOM = 'cozy_living_room',
  KITCHEN_TABLE = 'kitchen_table',
  LIBRARY_STUDY = 'library_study',
  KIDS_ROOM = 'kids_room',
  CAFE_INTERIOR = 'cafe_interior',
  CLASSROOM = 'classroom',
  SPACE_STATION = 'space_station',
  UNDERWATER_REEF = 'underwater_reef',
  FAIRY_GARDEN = 'fairy_garden',
  DRAGON_LAIR = 'dragon_lair',
  STEAMPUNK_WORKSHOP = 'steampunk_workshop',
  MARKET_STALL = 'market_stall',
  PLAYGROUND = 'playground',
  FARM_FIELD = 'farm_field',
  HARBOR_DOCK = 'harbor_dock',
  TRAIN_STATION = 'train_station',
  BAKERY_SHOP = 'bakery_shop',
  FLOWER_SHOP = 'flower_shop',
  AQUARIUM = 'aquarium',
  ZOO_ENCLOSURE = 'zoo_enclosure',
  MUSIC_STUDIO = 'music_studio',
  CHRISTMAS_SCENE = 'christmas_scene',
  HALLOWEEN_NIGHT = 'halloween_night',
  SPRING_FESTIVAL = 'spring_festival',
  WINTER_WONDERLAND = 'winter_wonderland',
}

export interface Scene {
  id: string;
  seed: number;
  theme: SceneTheme;
  width: number;
  height: number;
  backgroundColor: string;
  elements: SVGElementData[];
  differences: Difference[];
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  differenceCount: number;
  timeLimit?: number;
  metadata: {
    title: string;
    description: string;
    category: string;
  };
}

export interface DifficultyConfig {
  differenceCount: number;
  timeLimit: number | null;
  hintCount: number;
  differenceTypes: DifferenceType[];
  minDifferenceSize: number;
  colorSimilarity: number;
}

export interface GameState {
  scene: Scene;
  foundDifferences: string[];
  remainingHints: number;
  startTime: number;
  elapsedTime: number;
  score: number;
  combo: number;
  maxCombo: number;
  mistakes: number;
  isComplete: boolean;
  isPaused: boolean;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  showTimer: boolean;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  language: 'ko' | 'en' | 'ja';
  highContrast: boolean;
  zoomEnabled: boolean;
  darkMode: boolean;
}

export interface UserProfile {
  totalGamesPlayed: number;
  totalDifferencesFound: number;
  bestTime: Record<string, number>;
  currentStreak: number;
  longestStreak: number;
  level: number;
  experience: number;
  achievements: Achievement[];
  unlockedThemes: SceneTheme[];
  dailyChallengeHistory: DailyResult[];
  lastPlayDate: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  progress: number;
  requirement: number;
}

export interface DailyResult {
  date: string;
  score: number;
  time: number;
  rank?: number;
}

export interface ClickResult {
  hit: boolean;
  difference?: Difference;
  score: number;
  combo: number;
}

export interface GameResult {
  score: number;
  time: number;
  differencesFound: number;
  totalDifferences: number;
  maxCombo: number;
  mistakes: number;
  difficulty: string;
  theme: SceneTheme;
  perfect: boolean;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
}

export const DIFFICULTY_CONFIGS: Record<string, DifficultyConfig> = {
  easy: {
    differenceCount: 3,
    timeLimit: null,
    hintCount: 5,
    differenceTypes: [
      DifferenceType.COLOR_CHANGE,
      DifferenceType.ELEMENT_REMOVED,
      DifferenceType.SIZE_CHANGE,
    ],
    minDifferenceSize: 30,
    colorSimilarity: 0.3,
  },
  medium: {
    differenceCount: 5,
    timeLimit: 120,
    hintCount: 3,
    differenceTypes: [
      DifferenceType.COLOR_CHANGE,
      DifferenceType.ELEMENT_REMOVED,
      DifferenceType.SIZE_CHANGE,
      DifferenceType.POSITION_SHIFT,
      DifferenceType.ELEMENT_ADDED,
      DifferenceType.ROTATION_CHANGE,
    ],
    minDifferenceSize: 20,
    colorSimilarity: 0.5,
  },
  hard: {
    differenceCount: 7,
    timeLimit: 90,
    hintCount: 1,
    differenceTypes: [
      DifferenceType.COLOR_CHANGE,
      DifferenceType.ELEMENT_REMOVED,
      DifferenceType.SIZE_CHANGE,
      DifferenceType.POSITION_SHIFT,
      DifferenceType.ELEMENT_ADDED,
      DifferenceType.ROTATION_CHANGE,
      DifferenceType.PATTERN_CHANGE,
      DifferenceType.TEXT_CHANGE,
      DifferenceType.SHAPE_MORPH,
      DifferenceType.DETAIL_ADDED,
      DifferenceType.DETAIL_REMOVED,
    ],
    minDifferenceSize: 15,
    colorSimilarity: 0.7,
  },
  expert: {
    differenceCount: 10,
    timeLimit: 60,
    hintCount: 0,
    differenceTypes: Object.values(DifferenceType),
    minDifferenceSize: 10,
    colorSimilarity: 0.85,
  },
};

export const THEME_INFO: Record<SceneTheme, { title: string; category: string; description: string }> = {
  [SceneTheme.CITY_STREET]: { title: '도시 거리', category: 'city', description: '활기찬 도시 거리 풍경' },
  [SceneTheme.DOWNTOWN_NIGHT]: { title: '도심 야경', category: 'city', description: '화려한 도심 야경' },
  [SceneTheme.SUBURBAN_HOUSE]: { title: '교외 주택', category: 'city', description: '조용한 교외 마을' },
  [SceneTheme.ANCIENT_RUINS]: { title: '고대 유적', category: 'city', description: '신비로운 고대 유적지' },
  [SceneTheme.MEDIEVAL_CASTLE]: { title: '중세 성', category: 'city', description: '웅장한 중세 성' },
  [SceneTheme.JAPANESE_TEMPLE]: { title: '일본 사원', category: 'city', description: '고즈넉한 일본 사원' },
  [SceneTheme.FOREST_CLEARING]: { title: '숲속 공터', category: 'nature', description: '평화로운 숲속 공터' },
  [SceneTheme.MOUNTAIN_LAKE]: { title: '산속 호수', category: 'nature', description: '고요한 산속 호수' },
  [SceneTheme.BEACH_SUNSET]: { title: '해변 석양', category: 'nature', description: '아름다운 해변 석양' },
  [SceneTheme.DESERT_OASIS]: { title: '사막 오아시스', category: 'nature', description: '사막의 오아시스' },
  [SceneTheme.SNOWY_VILLAGE]: { title: '눈 덮인 마을', category: 'nature', description: '새하얀 눈 마을' },
  [SceneTheme.TROPICAL_ISLAND]: { title: '열대 섬', category: 'nature', description: '푸른 열대 섬' },
  [SceneTheme.CHERRY_BLOSSOM]: { title: '벚꽃', category: 'nature', description: '만개한 벚꽃길' },
  [SceneTheme.AUTUMN_PARK]: { title: '가을 공원', category: 'nature', description: '단풍이 물든 공원' },
  [SceneTheme.COZY_LIVING_ROOM]: { title: '아늑한 거실', category: 'indoor', description: '따뜻한 거실' },
  [SceneTheme.KITCHEN_TABLE]: { title: '부엌', category: 'indoor', description: '정겨운 부엌 풍경' },
  [SceneTheme.LIBRARY_STUDY]: { title: '서재', category: 'indoor', description: '고요한 서재' },
  [SceneTheme.KIDS_ROOM]: { title: '아이 방', category: 'indoor', description: '알록달록 아이 방' },
  [SceneTheme.CAFE_INTERIOR]: { title: '카페', category: 'indoor', description: '분위기 좋은 카페' },
  [SceneTheme.CLASSROOM]: { title: '교실', category: 'indoor', description: '학교 교실' },
  [SceneTheme.SPACE_STATION]: { title: '우주 정거장', category: 'fantasy', description: '미래의 우주 정거장' },
  [SceneTheme.UNDERWATER_REEF]: { title: '산호초', category: 'fantasy', description: '아름다운 바닷속' },
  [SceneTheme.FAIRY_GARDEN]: { title: '요정 정원', category: 'fantasy', description: '마법의 요정 정원' },
  [SceneTheme.DRAGON_LAIR]: { title: '용의 둥지', category: 'fantasy', description: '전설의 용 둥지' },
  [SceneTheme.STEAMPUNK_WORKSHOP]: { title: '스팀펑크 공방', category: 'fantasy', description: '기계 가득한 공방' },
  [SceneTheme.MARKET_STALL]: { title: '시장', category: 'daily', description: '활기찬 전통 시장' },
  [SceneTheme.PLAYGROUND]: { title: '놀이터', category: 'daily', description: '즐거운 놀이터' },
  [SceneTheme.FARM_FIELD]: { title: '농장', category: 'daily', description: '넓은 농장 들판' },
  [SceneTheme.HARBOR_DOCK]: { title: '항구', category: 'daily', description: '바다가 보이는 항구' },
  [SceneTheme.TRAIN_STATION]: { title: '기차역', category: 'daily', description: '복고풍 기차역' },
  [SceneTheme.BAKERY_SHOP]: { title: '빵집', category: 'daily', description: '갓 구운 빵 향기' },
  [SceneTheme.FLOWER_SHOP]: { title: '꽃집', category: 'daily', description: '꽃으로 가득한 가게' },
  [SceneTheme.AQUARIUM]: { title: '아쿠아리움', category: 'daily', description: '다양한 해양 생물' },
  [SceneTheme.ZOO_ENCLOSURE]: { title: '동물원', category: 'daily', description: '귀여운 동물 친구들' },
  [SceneTheme.MUSIC_STUDIO]: { title: '음악 스튜디오', category: 'daily', description: '악기가 가득한 공간' },
  [SceneTheme.CHRISTMAS_SCENE]: { title: '크리스마스', category: 'season', description: '따뜻한 크리스마스' },
  [SceneTheme.HALLOWEEN_NIGHT]: { title: '할로윈', category: 'season', description: '으스스한 할로윈 밤' },
  [SceneTheme.SPRING_FESTIVAL]: { title: '봄 축제', category: 'season', description: '화사한 봄 축제' },
  [SceneTheme.WINTER_WONDERLAND]: { title: '겨울 왕국', category: 'season', description: '마법 같은 겨울' },
};
