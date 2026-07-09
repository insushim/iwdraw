/*
 * 뚝딱그림 손그림 변형 템플릿 — 아이가 "실제로 그리는 방식"의 윤곽선 표본.
 * 스탬프 SVG는 문·눈 같은 내부 디테일이 들어가 아이의 단순 윤곽과 어긋난다
 * (웨일북 실측: 집을 그렸는데 사과/유령/풍선 제안). 같은 stampId에 복수 표본을
 * 두고 인식기가 스탬프별 최고점만 취한다($P 다중 템플릿 표준 기법).
 * 좌표는 0~100 임의 공간 — preparePointCloud가 정규화하므로 축척 무관.
 * 꼭짓점만 있으면 된다(리샘플이 선분을 보간).
 */

interface P {
  x: number;
  y: number;
}

export interface SketchVariant {
  stampId: string;
  strokes: P[][];
}

/* ── 도형 헬퍼 ── */

function poly(pts: [number, number][], close = false): P[] {
  const out = pts.map(([x, y]) => ({ x, y }));
  if (close && pts.length > 1) out.push({ x: pts[0][0], y: pts[0][1] });
  return out;
}

function line(x0: number, y0: number, x1: number, y1: number): P[] {
  return [
    { x: x0, y: y0 },
    { x: x1, y: y1 },
  ];
}

/** 타원 호. a0→a1 라디안(캔버스 y-아래 기준 — π..2π가 위쪽 반원) */
function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 20): P[] {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  return out;
}

function circle(cx: number, cy: number, r: number, n = 28): P[] {
  return arc(cx, cy, r, r, 0, Math.PI * 2, n);
}

const TAU = Math.PI * 2;

/** 심장 파라메트릭(손그림 하트에 가까움) — 한 획 */
function heartStroke(): P[] {
  const out: P[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = (i / 40) * TAU;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    out.push({ x: 50 + x * 2.6, y: 50 - y * 2.6 });
  }
  return out;
}

/* ── 변형 표본 ── */

export const EXTRA_SKETCH_VARIANTS: SketchVariant[] = [
  // 집: ① 오각형 한 획 ② 세모지붕+네모몸통 ③ 사다리꼴지붕+몸통(웨일북 실측 스타일)
  { stampId: "house", strokes: [poly([[10, 45], [50, 8], [90, 45], [90, 95], [10, 95]], true)] },
  {
    stampId: "house",
    strokes: [
      poly([[10, 45], [50, 8], [90, 45]], true),
      poly([[16, 45], [16, 95], [84, 95], [84, 45]], true),
    ],
  },
  {
    stampId: "house",
    strokes: [
      poly([[18, 40], [34, 10], [66, 10], [82, 40]], true),
      poly([[25, 40], [25, 95], [75, 95], [75, 40]], true),
    ],
  },
  // 세로로 긴 집(정규화가 종횡비를 보존해 납작 변형만으론 못 잡음 — 눈사람과 혼동 실측)
  {
    stampId: "house",
    strokes: [
      poly([[24, 30], [34, 6], [66, 6], [76, 30]], true),
      poly([[30, 30], [30, 96], [70, 96], [70, 30]], true),
    ],
  },
  // 나무: 세모수관+기둥 / 뭉게수관+기둥
  {
    stampId: "tree",
    strokes: [
      poly([[50, 5], [20, 62], [80, 62]], true),
      poly([[44, 62], [44, 95], [56, 95], [56, 62]]),
    ],
  },
  {
    stampId: "tree",
    strokes: [circle(50, 32, 27), line(42, 58, 42, 95), line(58, 58, 58, 95)],
  },
  // 해: 동그라미 + 8방향 짧은 빛살
  {
    stampId: "sun",
    strokes: [
      circle(50, 50, 22),
      ...Array.from({ length: 8 }, (_, k) => {
        const a = (k / 8) * TAU;
        return line(
          50 + 30 * Math.cos(a),
          50 + 30 * Math.sin(a),
          50 + 45 * Math.cos(a),
          50 + 45 * Math.sin(a),
        );
      }),
    ],
  },
  // 꽃: 가운데 원 + 꽃잎 원 6개 / 꽃+줄기
  {
    stampId: "flower",
    strokes: [
      circle(50, 50, 11),
      ...Array.from({ length: 6 }, (_, k) => {
        const a = (k / 6) * TAU;
        return circle(50 + 23 * Math.cos(a), 50 + 23 * Math.sin(a), 12, 20);
      }),
    ],
  },
  {
    stampId: "flower",
    strokes: [
      circle(50, 28, 8),
      ...Array.from({ length: 5 }, (_, k) => {
        const a = (k / 5) * TAU - Math.PI / 2;
        return circle(50 + 17 * Math.cos(a), 28 + 17 * Math.sin(a), 9, 18);
      }),
      line(50, 53, 50, 95),
    ],
  },
  // 물고기: 타원몸통+세모꼬리 / 한 획 윤곽
  {
    stampId: "fish",
    strokes: [
      arc(45, 50, 32, 18, 0, TAU),
      poly([[74, 50], [94, 34], [94, 66]], true),
    ],
  },
  {
    stampId: "fish",
    strokes: [
      poly(
        [[8, 50], [30, 32], [58, 30], [76, 44], [92, 32], [92, 68], [76, 56], [58, 70], [30, 68]],
        true,
      ),
    ],
  },
  // 자동차: 윤곽 한 획 + 바퀴 2 / 상자+지붕+바퀴
  {
    stampId: "car",
    strokes: [
      poly([[5, 70], [5, 55], [22, 52], [32, 36], [66, 36], [76, 52], [95, 55], [95, 70]], true),
      circle(28, 72, 9, 20),
      circle(72, 72, 9, 20),
    ],
  },
  {
    stampId: "car",
    strokes: [
      poly([[5, 55], [95, 55], [95, 75], [5, 75]], true),
      poly([[28, 55], [35, 35], [65, 35], [72, 55]]),
      circle(28, 78, 8, 20),
      circle(72, 78, 8, 20),
    ],
  },
  // 별: 교차형 별(한붓그리기 별 — 아이들 표준)
  { stampId: "star", strokes: [poly([[50, 8], [71, 92], [4, 40], [96, 40], [29, 92]], true)] },
  // 하트: 파라메트릭 한 획
  { stampId: "heart", strokes: [heartStroke()] },
  // 사과: 동그라미 + 꼭지
  { stampId: "apple", strokes: [circle(50, 57, 33), line(50, 24, 57, 6)] },
  // 우산: 반원 지붕 + 자루 + 갈고리
  {
    stampId: "umbrella",
    strokes: [
      [...arc(50, 45, 42, 36, Math.PI, TAU), ...poly([[92, 45], [8, 45]])],
      [...line(50, 45, 50, 88), ...arc(43, 88, 7, 7, 0, Math.PI)],
    ],
  },
  // 달: 초승달(바깥 호 + 안쪽 호 한 획)
  {
    stampId: "moon",
    strokes: [
      [
        ...arc(50, 50, 40, 40, -Math.PI * 0.42, Math.PI * 0.42 + Math.PI, 26),
        ...arc(66, 50, 30, 30, Math.PI * 1.42, Math.PI * 0.58, 22),
      ],
    ],
  },
  // 구름: 혹 3개 + 바닥
  {
    stampId: "cloud",
    strokes: [
      [
        ...arc(28, 60, 14, 14, Math.PI * 0.75, Math.PI * 1.85, 12),
        ...arc(50, 50, 17, 17, Math.PI * 1.05, Math.PI * 1.95, 14),
        ...arc(72, 58, 13, 13, Math.PI * 1.15, Math.PI * 2.25, 12),
        ...poly([[83, 68], [15, 68]]),
      ],
    ],
  },
  // 나비: 몸통 + 날개 원 2 / 날개 4
  {
    stampId: "butterfly",
    strokes: [line(50, 15, 50, 88), circle(29, 45, 20), circle(71, 45, 20)],
  },
  {
    stampId: "butterfly",
    strokes: [
      line(50, 12, 50, 90),
      circle(31, 36, 16, 20),
      circle(69, 36, 16, 20),
      circle(34, 68, 12, 18),
      circle(66, 68, 12, 18),
    ],
  },
  // 유령: 돔 + 물결 바닥 한 획
  {
    stampId: "ghost",
    strokes: [
      [
        ...arc(50, 42, 32, 34, Math.PI, TAU, 20),
        ...poly([[82, 80], [71, 68], [61, 82], [50, 68], [39, 82], [29, 68], [18, 80], [18, 42]]),
      ],
    ],
  },
  // 로켓: 윤곽 + 동그란 창
  {
    stampId: "rocket",
    strokes: [
      poly(
        [[50, 4], [64, 22], [64, 62], [80, 84], [64, 78], [57, 94], [43, 94], [36, 78], [20, 84], [36, 62], [36, 22]],
        true,
      ),
      circle(50, 36, 9, 18),
    ],
  },
  // 웃음: 얼굴 원 + 눈 2 + 입 호
  {
    stampId: "smile",
    strokes: [
      circle(50, 50, 40),
      circle(35, 40, 3, 10),
      circle(65, 40, 3, 10),
      arc(50, 52, 21, 21, Math.PI * 0.15, Math.PI * 0.85, 14),
    ],
  },
  // 번개: 윤곽 / 지그재그 한 줄
  {
    stampId: "lightning",
    strokes: [poly([[55, 4], [28, 52], [46, 52], [24, 96], [72, 40], [52, 40], [74, 4]], true)],
  },
  { stampId: "lightning", strokes: [poly([[60, 4], [34, 54], [56, 54], [38, 96]])] },
  // 연: 마름모 + 꼬리
  {
    stampId: "kite",
    strokes: [
      poly([[50, 4], [86, 40], [50, 74], [14, 40]], true),
      poly([[50, 74], [56, 82], [45, 89], [53, 96]]),
    ],
  },
  // 눈송이: 교차선 3개
  {
    stampId: "snowflake",
    strokes: [line(50, 5, 50, 95), line(11, 27, 89, 73), line(89, 27, 11, 73)],
  },
  // 무지개: 동심 호 3개
  {
    stampId: "rainbow",
    strokes: [
      arc(50, 88, 46, 46, Math.PI, TAU),
      arc(50, 88, 33, 33, Math.PI, TAU),
      arc(50, 88, 20, 20, Math.PI, TAU),
    ],
  },
  // 새: 갈매기 v자 호 2개
  {
    stampId: "bird",
    strokes: [
      arc(33, 52, 16, 13, Math.PI * 1.1, Math.PI * 1.9, 12),
      arc(67, 52, 16, 13, Math.PI * 1.1, Math.PI * 1.9, 12),
    ],
  },
  // 케이크: 상자 + 초 3개
  {
    stampId: "cake",
    strokes: [
      poly([[15, 50], [85, 50], [85, 90], [15, 90]], true),
      line(30, 50, 30, 30),
      line(50, 50, 50, 28),
      line(70, 50, 70, 30),
    ],
  },
  // 선물: 몸통 + 뚜껑 + 세로 리본
  {
    stampId: "gift",
    strokes: [
      poly([[15, 40], [85, 40], [85, 92], [15, 92]], true),
      poly([[10, 26], [90, 26], [90, 40], [10, 40]], true),
      line(50, 26, 50, 92),
    ],
  },
  // 음표: 머리 원 + 기둥 + 깃발
  {
    stampId: "music",
    strokes: [circle(36, 78, 11, 18), line(47, 76, 47, 12), poly([[47, 12], [64, 20], [58, 38]])],
  },
  // 보석: 윤곽 + 가로선
  {
    stampId: "diamond",
    strokes: [poly([[30, 12], [70, 12], [92, 40], [50, 92], [8, 40]], true), line(8, 40, 92, 40)],
  },
  // 반짝(4방 별)
  {
    stampId: "star4",
    strokes: [
      poly([[50, 4], [59, 41], [96, 50], [59, 59], [50, 96], [41, 59], [4, 50], [41, 41]], true),
    ],
  },
  // 풍선: 동그라미 + 줄
  { stampId: "balloon", strokes: [circle(50, 34, 28), line(50, 62, 47, 96)] },

  /* ── 2026-07-09 확장 42종의 손그림 표본 ── */
  // 고양이: 얼굴 원 + 세모 귀 2 (+수염 변형)
  {
    stampId: "cat",
    strokes: [circle(50, 58, 32), poly([[26, 34], [18, 6], [44, 28]]), poly([[74, 34], [82, 6], [56, 28]])],
  },
  {
    stampId: "cat",
    strokes: [
      circle(50, 58, 32),
      poly([[26, 34], [18, 6], [44, 28]]),
      poly([[74, 34], [82, 6], [56, 28]]),
      line(8, 55, 26, 58),
      line(8, 68, 26, 66),
      line(92, 55, 74, 58),
      line(92, 68, 74, 66),
    ],
  },
  // 강아지: 얼굴 원 + 늘어진 귀(옆 타원)
  {
    stampId: "dog",
    strokes: [
      circle(50, 52, 32),
      arc(19, 52, 9, 20, Math.PI * 0.4, Math.PI * 1.6, 14),
      arc(81, 52, 9, 20, -Math.PI * 0.6, Math.PI * 0.6, 14),
    ],
  },
  // 토끼: 얼굴 원 + 긴 귀 타원 2
  {
    stampId: "rabbit",
    strokes: [circle(50, 68, 27), arc(38, 24, 9, 23, 0, TAU, 18), arc(62, 24, 9, 23, 0, TAU, 18)],
  },
  // 곰: 얼굴 원 + 동그란 귀 2
  { stampId: "bear", strokes: [circle(50, 58, 32), circle(25, 27, 11, 16), circle(75, 27, 11, 16)] },
  // 돼지: 얼굴 원 + 코 타원 + 세모 귀
  {
    stampId: "pig",
    strokes: [
      circle(50, 55, 32),
      arc(50, 60, 11, 7, 0, TAU, 16),
      poly([[28, 30], [22, 12], [42, 24]]),
      poly([[72, 30], [78, 12], [58, 24]]),
    ],
  },
  // 개구리: 넓적 타원 + 튀어나온 눈 2
  {
    stampId: "frog",
    strokes: [arc(50, 62, 36, 26, 0, TAU, 30), circle(34, 30, 11, 16), circle(66, 30, 11, 16)],
  },
  // 오리: 머리 원 + 몸통 타원 + 부리
  {
    stampId: "duck",
    strokes: [
      circle(30, 32, 15, 20),
      arc(56, 66, 30, 19, 0, TAU, 26),
      poly([[15, 30], [4, 34], [15, 39]]),
    ],
  },
  // 펭귄: 세로 타원 몸 + 안쪽 배 타원
  {
    stampId: "penguin",
    strokes: [arc(50, 52, 26, 40, 0, TAU, 32), arc(50, 62, 15, 25, 0, TAU, 22)],
  },
  // 거북이: 돔 등딱지 + 바닥선 + 머리 + 다리
  {
    stampId: "turtle",
    strokes: [
      [...arc(48, 62, 34, 26, Math.PI, TAU, 18), ...poly([[82, 62], [14, 62]])],
      circle(90, 58, 8, 14),
      line(28, 62, 24, 80),
      line(62, 62, 66, 80),
    ],
  },
  // 달팽이: 껍데기 원 + 몸통 바닥 + 더듬이
  {
    stampId: "snail",
    strokes: [
      circle(56, 42, 26),
      poly([[6, 82], [12, 70], [30, 68], [88, 74], [88, 82], [6, 82]]),
      line(14, 68, 8, 50),
      line(24, 67, 22, 48),
    ],
  },
  // 무당벌레: 원 + 세로 중앙선 + 점 4
  {
    stampId: "ladybug",
    strokes: [
      circle(50, 55, 32),
      line(50, 23, 50, 87),
      circle(36, 44, 5, 10),
      circle(64, 44, 5, 10),
      circle(38, 68, 5, 10),
      circle(62, 68, 5, 10),
    ],
  },
  // 꿀벌: 가로 타원 + 줄무늬 + 날개 원
  {
    stampId: "bee",
    strokes: [
      arc(50, 58, 32, 23, 0, TAU, 28),
      line(38, 36, 38, 80),
      line(52, 35, 52, 81),
      line(66, 38, 66, 78),
      circle(35, 20, 12, 16),
      circle(65, 20, 12, 16),
    ],
  },
  // 문어: 돔 머리 + 구불 다리 선들
  {
    stampId: "octopus",
    strokes: [
      [...arc(50, 42, 32, 32, Math.PI, TAU, 20), ...poly([[82, 42], [82, 58]]), ...poly([[18, 58], [18, 42]])],
      poly([[24, 58], [20, 78], [28, 92]]),
      poly([[41, 60], [39, 80], [45, 94]]),
      poly([[59, 60], [61, 80], [55, 94]]),
      poly([[76, 58], [80, 78], [72, 92]]),
    ],
  },
  // 고래: 몸통 blob + 꼬리 + 물줄기
  {
    stampId: "whale",
    strokes: [
      poly(
        [[8, 55], [20, 38], [45, 30], [68, 34], [80, 45], [92, 34], [90, 55], [80, 62], [60, 72], [30, 72], [12, 65]],
        true,
      ),
      line(30, 30, 30, 12),
    ],
  },
  // 게: 몸통 타원 + 집게 원 + 다리 선
  {
    stampId: "crab",
    strokes: [
      arc(50, 58, 26, 19, 0, TAU, 24),
      circle(18, 30, 10, 14),
      circle(82, 30, 10, 14),
      line(30, 44, 22, 38),
      line(70, 44, 78, 38),
      line(28, 68, 12, 80),
      line(38, 74, 28, 90),
      line(72, 68, 88, 80),
      line(62, 74, 72, 90),
    ],
  },
  // 병아리: 원 + 부리 세모 + 다리
  {
    stampId: "chick",
    strokes: [
      circle(52, 50, 34),
      poly([[18, 46], [6, 52], [18, 58]]),
      line(42, 84, 40, 96),
      line(62, 84, 64, 96),
    ],
  },
  // 비행기: 종이비행기 / 몸통+양날개
  {
    stampId: "airplane",
    strokes: [poly([[95, 10], [5, 46], [42, 56], [52, 90], [64, 60], [95, 10]])],
  },
  {
    stampId: "airplane",
    strokes: [
      arc(50, 50, 38, 12, 0, TAU, 26),
      poly([[45, 40], [30, 10], [58, 40]]),
      poly([[45, 60], [30, 90], [58, 60]]),
    ],
  },
  // 돛단배: 사다리꼴 배 + 돛대 + 세모 돛
  {
    stampId: "boat",
    strokes: [
      poly([[10, 68], [90, 68], [76, 90], [24, 90]], true),
      line(50, 68, 50, 8),
      poly([[52, 12], [84, 60], [52, 60]], true),
    ],
  },
  // 버스: 큰 네모 + 창문 + 바퀴
  {
    stampId: "bus",
    strokes: [
      poly([[8, 25], [92, 25], [92, 75], [8, 75]], true),
      poly([[16, 34], [34, 34], [34, 52], [16, 52]], true),
      poly([[58, 34], [76, 34], [76, 52], [58, 52]], true),
      circle(26, 82, 9, 14),
      circle(74, 82, 9, 14),
    ],
  },
  // 기차: 기관차 네모 + 객차 네모 + 굴뚝 + 바퀴
  {
    stampId: "train",
    strokes: [
      poly([[6, 40], [38, 40], [38, 78], [6, 78]], true),
      poly([[44, 52], [92, 52], [92, 78], [44, 78]], true),
      poly([[14, 40], [14, 24], [26, 24], [26, 40]]),
      circle(20, 85, 7, 12),
      circle(58, 85, 7, 12),
      circle(80, 85, 7, 12),
    ],
  },
  // 아이스크림: 세모 콘(아래 뾰족) + 스쿱 원 (+2단 변형)
  { stampId: "icecream", strokes: [poly([[28, 42], [72, 42], [50, 95]], true), circle(50, 28, 24)] },
  {
    stampId: "icecream",
    strokes: [poly([[30, 52], [70, 52], [50, 96]], true), circle(50, 40, 20, 22), circle(50, 16, 15, 18)],
  },
  // 피자: 아래 뾰족 세모 + 윗변 호
  {
    stampId: "pizza",
    strokes: [
      [...arc(50, 30, 42, 22, Math.PI * 1.05, Math.PI * 1.95, 16), ...poly([[90, 24], [50, 95], [10, 24]])],
    ],
  },
  // 도넛: 큰 원 + 안 원
  { stampId: "donut", strokes: [circle(50, 50, 40), circle(50, 50, 14, 18)] },
  // 컵케이크: 사다리꼴 컵 + 돔 크림
  {
    stampId: "cupcake",
    strokes: [
      poly([[26, 52], [74, 52], [66, 92], [34, 92]], true),
      [...arc(50, 50, 32, 30, Math.PI, TAU, 18), ...poly([[82, 50], [18, 50]])],
    ],
  },
  // 딸기: 아래 뾰족 방울 + 꼭지
  {
    stampId: "strawberry",
    strokes: [
      poly([[50, 18], [76, 26], [82, 46], [66, 76], [50, 92], [34, 76], [18, 46], [24, 26]], true),
      poly([[38, 16], [50, 6], [62, 16]]),
    ],
  },
  // 바나나: 초승달 두 호
  {
    stampId: "banana",
    strokes: [
      [
        ...arc(30, 30, 62, 62, Math.PI * 0.15, Math.PI * 0.48, 18),
        ...arc(45, 18, 52, 52, Math.PI * 0.52, Math.PI * 0.18, 16),
      ],
    ],
  },
  // 포도: 작은 원 뭉치 + 줄기
  {
    stampId: "grape",
    strokes: [
      circle(38, 34, 11, 14),
      circle(62, 34, 11, 14),
      circle(26, 54, 11, 14),
      circle(50, 54, 11, 14),
      circle(74, 54, 11, 14),
      circle(38, 74, 11, 14),
      circle(62, 74, 11, 14),
      circle(50, 90, 10, 14),
      line(50, 23, 50, 6),
    ],
  },
  // 당근: 긴 세모(아래 뾰족) + 잎 선
  {
    stampId: "carrot",
    strokes: [
      poly([[36, 26], [64, 26], [52, 95]], true),
      line(50, 26, 42, 6),
      line(50, 26, 52, 4),
      line(50, 26, 62, 8),
    ],
  },
  // 수박: 반원 + 현
  {
    stampId: "watermelon",
    strokes: [[...arc(50, 40, 42, 42, 0, Math.PI, 24), ...poly([[8, 40], [92, 40]])]],
  },
  // 사람: 막대 인간 (+네모 몸통 변형)
  {
    stampId: "person",
    strokes: [
      circle(50, 16, 12, 18),
      line(50, 28, 50, 62),
      line(50, 38, 26, 52),
      line(50, 38, 74, 52),
      line(50, 62, 32, 94),
      line(50, 62, 68, 94),
    ],
  },
  {
    stampId: "person",
    strokes: [
      circle(50, 14, 11, 16),
      poly([[38, 26], [62, 26], [62, 62], [38, 62]], true),
      line(38, 32, 22, 50),
      line(62, 32, 78, 50),
      line(43, 62, 40, 94),
      line(57, 62, 60, 94),
    ],
  },
  // 로봇: 네모 머리 + 네모 몸 + 안테나 + 팔다리
  {
    stampId: "robot",
    strokes: [
      poly([[30, 18], [70, 18], [70, 46], [30, 46]], true),
      poly([[26, 50], [74, 50], [74, 78], [26, 78]], true),
      line(50, 18, 50, 6),
      line(26, 56, 10, 66),
      line(74, 56, 90, 66),
      line(38, 78, 38, 94),
      line(62, 78, 62, 94),
    ],
  },
  // 눈사람: 원 2단 (+3단 변형)
  { stampId: "snowman", strokes: [circle(50, 26, 18, 22), circle(50, 66, 28)] },
  {
    stampId: "snowman",
    strokes: [circle(50, 16, 12, 16), circle(50, 44, 17, 20), circle(50, 78, 21, 24)],
  },
  // 연필: 길쭉한 네모 + 뾰족 심
  {
    stampId: "pencil",
    strokes: [poly([[40, 8], [60, 8], [60, 70], [40, 70]], true), poly([[40, 70], [50, 94], [60, 70]])],
  },
  // 책: 펼친 책(가운데 골 + 양쪽 페이지)
  {
    stampId: "book",
    strokes: [
      poly([[50, 20], [10, 10], [10, 78], [50, 88], [90, 78], [90, 10], [50, 20]]),
      line(50, 20, 50, 88),
    ],
  },
  // 시계: 원 + 바늘 2
  { stampId: "clock", strokes: [circle(50, 50, 40), line(50, 50, 50, 24), line(50, 50, 68, 58)] },
  // 주스: 사다리꼴 컵 + 빨대
  {
    stampId: "cup",
    strokes: [poly([[24, 24], [76, 24], [68, 92], [32, 92]], true), line(60, 24, 76, 4)],
  },
  // 모자: 돔 + 넓은 챙
  {
    stampId: "hat",
    strokes: [
      [...arc(50, 55, 25, 32, Math.PI, TAU, 18), ...poly([[75, 55], [25, 55]])],
      arc(50, 58, 46, 10, 0, TAU, 26),
    ],
  },
  // 안경: 원 2 + 다리
  {
    stampId: "glasses",
    strokes: [circle(28, 52, 20, 22), circle(72, 52, 20, 22), line(48, 50, 52, 50)],
  },
  // 축구공: 원 + 오각형
  {
    stampId: "soccer",
    strokes: [
      circle(50, 50, 40),
      poly([[50, 32], [66, 44], [60, 62], [40, 62], [34, 44]], true),
    ],
  },
  // 산: 지그재그 봉우리
  { stampId: "mountain", strokes: [poly([[4, 88], [34, 22], [52, 58], [68, 32], [96, 88]], true)] },
  // 선인장: 세로 기둥 + 양팔
  {
    stampId: "cactus",
    strokes: [
      poly([[42, 10], [58, 10], [58, 92], [42, 92]], true),
      poly([[42, 42], [20, 42], [20, 22]]),
      poly([[58, 56], [80, 56], [80, 34]]),
    ],
  },
  // 종: 종 몸통 + 추
  {
    stampId: "bell",
    strokes: [
      [
        ...arc(50, 42, 28, 34, Math.PI, TAU, 18),
        ...poly([[78, 42], [80, 68], [92, 80], [8, 80], [20, 68], [22, 42]]),
      ],
      circle(50, 88, 6, 10),
    ],
  },

  /* ── 2026-07-09 3차 확장 50종의 손그림 표본 ── */
  // 사자: 갈기(톱니 큰 원) + 얼굴 원
  {
    stampId: "lion",
    strokes: [
      Array.from({ length: 25 }, (_, i) => {
        const a = (i / 24) * TAU;
        const r = i % 2 === 0 ? 46 : 34;
        return { x: 50 + Math.cos(a) * r, y: 50 + Math.sin(a) * r };
      }),
      circle(50, 50, 26),
    ],
  },
  // 호랑이: 얼굴 원 + 귀 2 + 줄무늬
  {
    stampId: "tiger",
    strokes: [
      circle(50, 54, 32),
      poly([[26, 30], [20, 8], [40, 26]]),
      poly([[74, 30], [80, 8], [60, 26]]),
      line(50, 22, 50, 36),
      line(30, 40, 38, 44),
      line(70, 40, 62, 44),
    ],
  },
  // 코끼리: 머리+몸 덩어리 + 늘어진 코 + 큰 귀
  {
    stampId: "elephant",
    strokes: [
      [...arc(42, 45, 34, 30, Math.PI * 0.5, Math.PI * 2.1, 20), ...poly([[42, 15], [42, 88], [16, 88]])],
      arc(20, 50, 16, 20, Math.PI * 0.5, Math.PI * 1.5, 12),
      [...poly([[70, 55], [74, 78], [66, 92]])],
    ],
  },
  // 기린: 긴 목 + 작은 머리 + 다리
  {
    stampId: "giraffe",
    strokes: [
      poly([[40, 30], [40, 60], [30, 60], [30, 95]]),
      poly([[60, 30], [60, 60], [70, 60], [70, 95]]),
      poly([[40, 60], [60, 60]]),
      circle(48, 16, 13, 16),
      line(42, 6, 40, 0),
      line(54, 6, 56, 0),
    ],
  },
  // 원숭이: 얼굴 원 + 귀 두 원 + 속얼굴
  {
    stampId: "monkey",
    strokes: [circle(50, 52, 30), circle(20, 40, 13, 16), circle(80, 40, 13, 16), arc(50, 56, 18, 16, 0, Math.PI, 14)],
  },
  // 판다: 얼굴 원 + 귀 두 원 + 눈 얼룩
  {
    stampId: "panda",
    strokes: [
      circle(50, 54, 30),
      circle(24, 26, 12, 16),
      circle(76, 26, 12, 16),
      circle(38, 50, 8, 12),
      circle(62, 50, 8, 12),
    ],
  },
  // 여우: 뾰족 얼굴(역삼각) + 귀 2
  {
    stampId: "fox",
    strokes: [
      poly([[16, 38], [50, 30], [84, 38], [50, 82]], true),
      poly([[16, 38], [8, 8], [34, 30]]),
      poly([[84, 38], [92, 8], [66, 30]]),
    ],
  },
  // 사슴: 얼굴 + 뿔(가지)
  {
    stampId: "deer",
    strokes: [
      arc(50, 55, 24, 30, 0, TAU, 24),
      [...poly([[38, 30], [34, 6]]), ...line(34, 16, 24, 10), ...line(34, 12, 26, 4)],
      [...poly([[62, 30], [66, 6]]), ...line(66, 16, 76, 10), ...line(66, 12, 74, 4)],
    ],
  },
  // 하마: 넓적 얼굴 + 콧구멍 2
  {
    stampId: "hippo",
    strokes: [arc(50, 52, 36, 30, 0, TAU, 26), circle(38, 46, 5, 10), circle(62, 46, 5, 10)],
  },
  // 다람쥐: 몸 + 큰 꼬리 곡선
  {
    stampId: "squirrel",
    strokes: [
      arc(40, 55, 20, 26, 0, TAU, 20),
      [...arc(70, 50, 26, 34, Math.PI * 0.3, Math.PI * 1.7, 18)],
    ],
  },
  // 부엉이: 몸 타원 + 눈 두 원 + 귀깃
  {
    stampId: "owl",
    strokes: [
      arc(50, 54, 30, 36, 0, TAU, 26),
      circle(38, 44, 12, 16),
      circle(62, 44, 12, 16),
      poly([[26, 24], [32, 12], [40, 26]]),
      poly([[74, 24], [68, 12], [60, 26]]),
    ],
  },
  // 뱀: 구불구불 한 획 + 혀
  {
    stampId: "snake",
    strokes: [
      [
        ...arc(70, 25, 18, 18, Math.PI * 1.5, Math.PI * 0.5, 14),
        ...arc(52, 40, 18, 15, Math.PI * 1.5, Math.PI * 0.5, 12),
        ...arc(34, 58, 20, 18, Math.PI * 0.5, Math.PI * 1.5, 14),
        ...poly([[34, 76], [70, 88], [16, 92]]),
      ],
    ],
  },
  // 공룡: 몸통 + 긴 목 + 등 삼각 + 다리
  {
    stampId: "dinosaur",
    strokes: [
      [
        ...poly([[10, 78], [18, 55], [30, 48]]),
        ...arc(48, 30, 22, 20, Math.PI, TAU * 0.75, 12),
        ...poly([[66, 24], [78, 40], [66, 58], [78, 72], [55, 66]]),
      ],
      poly([[30, 78], [30, 92]]),
      poly([[55, 66], [55, 92]]),
    ],
  },
  // 돌고래: 유선형 몸 + 등지느러미 + 꼬리
  {
    stampId: "dolphin",
    strokes: [
      [
        ...arc(45, 55, 40, 22, Math.PI, TAU * 0.9, 18),
        ...poly([[80, 48], [95, 34], [92, 60], [78, 62]]),
        ...arc(45, 55, 38, 20, TAU * 0.9, Math.PI, 16),
      ],
      poly([[40, 34], [50, 16], [58, 36]]),
    ],
  },
  // 상어: 유선형 + 뾰족 등지느러미 + 꼬리
  {
    stampId: "shark",
    strokes: [
      [
        ...arc(45, 52, 40, 24, Math.PI, TAU, 16),
        ...poly([[85, 52], [96, 38], [94, 66]]),
        ...arc(45, 52, 38, 22, TAU, Math.PI, 14),
      ],
      poly([[42, 28], [52, 6], [58, 30]]),
    ],
  },
  // 불가사리: 5각 별(통통)
  {
    stampId: "starfish",
    strokes: [
      Array.from({ length: 11 }, (_, i) => {
        const a = -Math.PI / 2 + (i / 10) * TAU;
        const r = i % 2 === 0 ? 46 : 20;
        return { x: 50 + Math.cos(a) * r, y: 50 + Math.sin(a) * r };
      }),
    ],
  },
  // 거미: 몸 원 + 다리 8
  {
    stampId: "spider",
    strokes: [
      circle(50, 52, 18),
      line(32, 46, 8, 34),
      line(32, 52, 6, 54),
      line(32, 58, 10, 74),
      line(34, 64, 22, 88),
      line(68, 46, 92, 34),
      line(68, 52, 94, 54),
      line(68, 58, 90, 74),
      line(66, 64, 78, 88),
    ],
  },
  // 말: 몸통 + 목 + 머리 + 다리
  {
    stampId: "horse",
    strokes: [
      [
        ...poly([[16, 90], [16, 55], [30, 45]]),
        ...arc(40, 40, 16, 16, Math.PI, TAU * 0.7, 10),
        ...poly([[54, 30], [60, 12], [70, 20], [64, 40], [82, 48]]),
        ...poly([[82, 48], [82, 90]]),
      ],
      poly([[40, 62], [40, 90]]),
      poly([[60, 62], [60, 90]]),
    ],
  },
  // 자전거: 바퀴 두 원 + 프레임
  {
    stampId: "bicycle",
    strokes: [
      circle(24, 66, 20),
      circle(76, 66, 20),
      poly([[24, 66], [42, 30], [66, 30], [76, 66], [42, 30]]),
      line(60, 30, 68, 20),
    ],
  },
  // 트럭: 큰 박스 + 앞 캡 + 바퀴 2
  {
    stampId: "truck",
    strokes: [
      poly([[6, 30], [60, 30], [60, 72], [6, 72]], true),
      poly([[60, 44], [78, 44], [92, 58], [92, 72], [60, 72]], true),
      circle(26, 78, 10, 14),
      circle(76, 78, 10, 14),
    ],
  },
  // 소방차: 긴 박스 + 사다리 + 바퀴
  {
    stampId: "firetruck",
    strokes: [
      poly([[6, 40], [72, 40], [88, 52], [88, 74], [6, 74]], true),
      line(10, 34, 60, 48),
      circle(28, 80, 9, 14),
      circle(72, 80, 9, 14),
    ],
  },
  // 헬리콥터: 몸통 타원 + 로터 + 꼬리
  {
    stampId: "helicopter",
    strokes: [
      arc(40, 55, 26, 18, 0, TAU, 20),
      poly([[62, 52], [92, 46], [92, 60], [66, 60]]),
      line(12, 38, 68, 38),
      line(40, 38, 40, 40),
      poly([[30, 73], [50, 73]]),
    ],
  },
  // 잠수함: 타원 몸통 + 위 탑 + 창문
  {
    stampId: "submarine",
    strokes: [
      arc(50, 55, 40, 22, 0, TAU, 26),
      poly([[42, 33], [42, 20], [58, 20], [58, 33]]),
      circle(38, 55, 7, 12),
      circle(62, 55, 7, 12),
    ],
  },
  // 열기구: 큰 풍선 원 + 바구니 + 줄
  {
    stampId: "hotairballoon",
    strokes: [
      arc(50, 40, 34, 38, 0, TAU, 26),
      poly([[38, 82], [62, 82], [58, 96], [42, 96]], true),
      line(40, 74, 42, 82),
      line(60, 74, 58, 82),
    ],
  },
  // 경찰차: 차 실루엣 + 사이렌
  {
    stampId: "police",
    strokes: [
      [...poly([[6, 70], [6, 56], [24, 52], [34, 38], [66, 38], [76, 52], [94, 56], [94, 70]], true)],
      poly([[44, 38], [44, 26], [56, 26], [56, 38]]),
      circle(28, 72, 9, 14),
      circle(72, 72, 9, 14),
    ],
  },
  // 킥보드: 바퀴 2 + 발판 + T손잡이
  {
    stampId: "scooter",
    strokes: [
      circle(20, 78, 12, 16),
      circle(80, 78, 12, 16),
      poly([[20, 78], [72, 22]]),
      line(56, 22, 84, 22),
    ],
  },
  // 택시: 차 실루엣 + 표시등
  {
    stampId: "taxi",
    strokes: [
      [...poly([[6, 70], [6, 56], [26, 52], [36, 38], [64, 38], [74, 52], [94, 56], [94, 70]], true)],
      poly([[42, 38], [42, 30], [58, 30], [58, 38]]),
      circle(28, 72, 9, 14),
      circle(72, 72, 9, 14),
    ],
  },
  // 햄버거: 위 반원 빵 + 층 + 아래 빵
  {
    stampId: "hamburger",
    strokes: [
      arc(50, 34, 40, 22, Math.PI, TAU, 16),
      poly([[10, 44], [90, 44]]),
      poly([[12, 56], [88, 56]]),
      [...arc(50, 66, 38, 14, 0, Math.PI, 14), ...poly([[88, 66], [12, 66]])],
    ],
  },
  // 핫도그: 긴 타원 빵 + 안 소시지
  {
    stampId: "hotdog",
    strokes: [arc(50, 55, 42, 16, 0, TAU, 26), arc(50, 55, 34, 9, 0, TAU, 22)],
  },
  // 감자튀김: 봉지(사다리꼴) + 튀김 선들
  {
    stampId: "fries",
    strokes: [
      poly([[26, 42], [74, 42], [68, 92], [32, 92]], true),
      line(34, 42, 30, 12),
      line(46, 42, 46, 8),
      line(58, 42, 62, 10),
      line(68, 42, 74, 14),
    ],
  },
  // 샌드위치: 삼각 두 개
  {
    stampId: "sandwich",
    strokes: [poly([[10, 82], [50, 14], [50, 82]], true), poly([[50, 82], [50, 14], [90, 82]], true)],
  },
  // 초밥: 타원 밥 + 위 생선 띠
  {
    stampId: "sushi",
    strokes: [arc(50, 62, 40, 20, 0, TAU, 24), [...arc(50, 46, 40, 12, Math.PI, TAU, 16), ...poly([[90, 46], [10, 46]])]],
  },
  // 계란후라이: 흰자 울퉁 + 노른자 원
  {
    stampId: "egg",
    strokes: [
      Array.from({ length: 22 }, (_, i) => {
        const a = (i / 21) * TAU;
        const r = 38 + Math.sin(a * 3) * 8;
        return { x: 50 + Math.cos(a) * r, y: 52 + Math.sin(a) * r * 0.8 };
      }),
      circle(50, 52, 15),
    ],
  },
  // 쿠키: 원 + 점 몇 개
  {
    stampId: "cookie",
    strokes: [circle(50, 50, 40), circle(36, 38, 4, 8), circle(64, 42, 4, 8), circle(44, 64, 4, 8), circle(66, 64, 4, 8)],
  },
  // 팝콘: 통(사다리꼴) + 위 팝콘 뭉치
  {
    stampId: "popcorn",
    strokes: [
      poly([[28, 42], [72, 42], [66, 92], [34, 92]], true),
      circle(38, 30, 11, 14),
      circle(54, 24, 12, 14),
      circle(68, 32, 10, 14),
    ],
  },
  // 오렌지: 원 + 방사 세그먼트
  {
    stampId: "orange",
    strokes: [
      circle(50, 52, 38),
      line(50, 52, 50, 14),
      line(50, 52, 84, 34),
      line(50, 52, 84, 72),
      line(50, 52, 50, 90),
      line(50, 52, 16, 72),
      line(50, 52, 16, 34),
    ],
  },
  // 파인애플: 타원 몸통 + 격자 + 잎
  {
    stampId: "pineapple",
    strokes: [
      arc(50, 60, 26, 34, 0, TAU, 22),
      line(30, 45, 70, 70),
      line(30, 70, 70, 45),
      poly([[50, 26], [40, 6], [50, 14], [60, 6], [50, 26]]),
    ],
  },
  // 옥수수: 긴 타원 + 격자 + 잎
  {
    stampId: "corn",
    strokes: [
      arc(50, 50, 20, 42, 0, TAU, 22),
      line(35, 30, 65, 45),
      line(35, 50, 65, 65),
      line(65, 30, 35, 45),
      line(65, 50, 35, 65),
    ],
  },
  // 야자수: 기둥 + 잎 부채
  {
    stampId: "palmtree",
    strokes: [
      poly([[46, 40], [46, 95], [54, 95], [54, 40]]),
      arc(50, 38, 40, 16, Math.PI, TAU * 0.85, 12),
      arc(50, 38, 40, 16, TAU * 0.15, Math.PI, 12),
      poly([[50, 38], [30, 12]]),
      poly([[50, 38], [70, 12]]),
    ],
  },
  // 해바라기: 꽃잎 톱니 + 중앙 원 + 줄기
  {
    stampId: "sunflower",
    strokes: [
      Array.from({ length: 25 }, (_, i) => {
        const a = (i / 24) * TAU;
        const r = i % 2 === 0 ? 42 : 22;
        return { x: 50 + Math.cos(a) * r, y: 40 + Math.sin(a) * r };
      }),
      circle(50, 40, 16),
      line(50, 56, 50, 96),
    ],
  },
  // 네잎클로버: 하트 4개 방사
  {
    stampId: "clover",
    strokes: [
      circle(38, 38, 13, 14),
      circle(62, 38, 13, 14),
      circle(38, 62, 13, 14),
      circle(62, 62, 13, 14),
      line(50, 62, 54, 96),
    ],
  },
  // 지구: 원 + 대륙 곡선
  {
    stampId: "earth",
    strokes: [
      circle(50, 50, 40),
      [...arc(34, 36, 14, 12, 0, Math.PI * 1.3, 10)],
      [...arc(62, 60, 16, 14, Math.PI, TAU * 0.9, 10)],
    ],
  },
  // 유에프오: 타원 접시 + 돔 + 빛
  {
    stampId: "ufo",
    strokes: [
      arc(50, 52, 42, 16, 0, TAU, 22),
      [...arc(50, 46, 22, 18, Math.PI, TAU, 12)],
      poly([[35, 66], [28, 84]]),
      poly([[50, 68], [50, 88]]),
      poly([[65, 66], [72, 84]]),
    ],
  },
  // 텐트: 삼각 + 입구 세모
  {
    stampId: "tent",
    strokes: [poly([[50, 12], [12, 88], [88, 88]], true), poly([[50, 40], [38, 88], [62, 88]], true)],
  },
  // 성: 성벽 + 톱니 + 문
  {
    stampId: "castle",
    strokes: [
      poly([[14, 40], [14, 30], [26, 30], [26, 40], [38, 40], [38, 30], [50, 30], [50, 40], [62, 40], [62, 30], [74, 30], [74, 40], [86, 40], [86, 90], [14, 90]], true),
      [...poly([[42, 90], [42, 66]]), ...arc(50, 66, 8, 8, Math.PI, TAU, 8), ...poly([[58, 66], [58, 90]])],
    ],
  },
  // 등대: 탑(사다리꼴) + 등불 + 빛
  {
    stampId: "lighthouse",
    strokes: [
      poly([[36, 34], [64, 34], [70, 92], [30, 92]], true),
      poly([[40, 20], [60, 20], [64, 34], [36, 34]], true),
      poly([[40, 20], [60, 20], [56, 10], [44, 10]], true),
      line(30, 55, 70, 55),
    ],
  },
  // 가위: 원 두 개 + X 날
  {
    stampId: "scissors",
    strokes: [circle(24, 26, 15, 16), circle(24, 74, 15, 16), line(38, 32, 92, 68), line(38, 68, 92, 32)],
  },
  // 카메라: 박스 + 렌즈 원 + 뷰파인더
  {
    stampId: "camera",
    strokes: [
      poly([[10, 32], [30, 32], [36, 22], [64, 22], [70, 32], [90, 32], [90, 82], [10, 82]], true),
      circle(50, 56, 18),
    ],
  },
  // 전구: 전구 원 + 나사 밑동
  {
    stampId: "lightbulb",
    strokes: [
      [...arc(50, 40, 28, 30, Math.PI, TAU, 18), ...poly([[78, 40], [64, 66], [36, 66], [22, 40]])],
      line(38, 74, 62, 74),
      line(42, 84, 58, 84),
    ],
  },
  // 기타: 몸통(8자) + 목 + 헤드
  {
    stampId: "guitar",
    strokes: [
      [
        ...arc(38, 68, 22, 24, Math.PI * 1.6, Math.PI * 0.4, 16),
        ...arc(38, 40, 16, 18, Math.PI * 0.4, Math.PI * 1.6, 14),
      ],
      poly([[48, 32], [78, 10]]),
      poly([[74, 6], [86, 18]]),
    ],
  },
];
