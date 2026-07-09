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
];
