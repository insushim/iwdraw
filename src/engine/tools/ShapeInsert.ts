/*
 * 도형 삽입 도구 — 도형 버튼을 고르고 캔버스를 드래그하면 그 자리·그 크기로 그려진다.
 * (기존 "그리면 자동 스냅"(QuickShape)은 사각형→별 오인식 등으로 2026-07-09 폐기,
 * 명시적 드래그 삽입으로 교체 — 사용자 결정. QuickShape 코드는 휴면 보존.)
 * 커밋은 ArtEngine이 이 폴리라인을 실제 브러시 스트로크로 그린다 —
 * undo/무비/협동/대칭이 일반 획과 동일.
 */

export type ShapeInsertKind = "line" | "rect" | "ellipse" | "triangle" | "star" | "heart";

interface P {
  x: number;
  y: number;
}

/** 직선의 수평/수직 스냅 허용각(도) — 아이 손떨림 보정 */
const LINE_SNAP_DEG = 7;
/** 이보다 작은 드래그는 톡 친 것으로 보고 무시 — 화면 px 기준(줌 무관) */
export const SHAPE_MIN_DRAG = 8;

/**
 * 드래그가 "톡 친 것"인지 — 화면 px로 판정한다.
 * 캔버스 px로 고정하면 확대할수록(viewScale↑) 같은 화면 거리가 더 적은 캔버스 px가 돼
 * 확대 상태에서 작은 도형이 통째로 무시된다(2026-07-13 사용자 실측:
 * "확대한 다음 작게 하면 안 그려진다"). 하한 2 캔버스 px — 8배 확대에서도 실수 탭은 거른다.
 */
export function isShapeDragTooSmall(dx: number, dy: number, viewScale = 1): boolean {
  const minDrag = Math.max(2, SHAPE_MIN_DRAG / Math.max(viewScale, 0.01));
  return Math.max(Math.abs(dx), Math.abs(dy)) < minDrag;
}

/** 드래그 시작→현재 좌표로 도형 폴리라인 생성(꼭짓점/호 수준 — densify로 촘촘히) */
export function shapeInsertPoints(
  kind: ShapeInsertKind,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): P[] {
  if (kind === "line") {
    // 수평/수직에 가까우면 스냅 — "직선이 안 그어져요"의 대부분은 미세한 기울어짐
    const dx = x1 - x0;
    const dy = y1 - y0;
    const t = Math.tan((LINE_SNAP_DEG * Math.PI) / 180);
    if (Math.abs(dy) <= Math.abs(dx) * t) y1 = y0;
    else if (Math.abs(dx) <= Math.abs(dy) * t) x1 = x0;
    return [
      { x: x0, y: y0 },
      { x: x1, y: y1 },
    ];
  }
  const minX = Math.min(x0, x1);
  const minY = Math.min(y0, y1);
  const maxX = Math.max(x0, x1);
  const maxY = Math.max(y0, y1);
  if (kind === "rect") {
    return [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
      { x: minX, y: minY },
    ];
  }
  // 나머지는 단위 도형을 만들어 드래그 bbox에 꼭 맞게 사상
  let unit: P[];
  if (kind === "ellipse") {
    unit = Array.from({ length: 49 }, (_, i) => {
      const a = (i / 48) * Math.PI * 2;
      return { x: Math.cos(a), y: Math.sin(a) };
    });
  } else if (kind === "triangle") {
    unit = [
      { x: 0, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: 1 },
      { x: 0, y: -1 },
    ];
  } else if (kind === "star") {
    unit = Array.from({ length: 11 }, (_, i) => {
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      const r = i % 2 === 0 ? 1 : 0.45;
      return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    });
  } else {
    // heart — 파라메트릭(위 볼록 2, 아래 뾰족)
    unit = Array.from({ length: 41 }, (_, i) => {
      const t = (i / 40) * Math.PI * 2;
      return {
        x: 16 * Math.sin(t) ** 3,
        y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
      };
    });
  }
  return fitToBBox(unit, minX, minY, maxX, maxY);
}

/** 점들의 자체 bbox를 목표 bbox로 사상(도형이 드래그 영역에 정확히 꼭 맞게) */
function fitToBBox(pts: P[], minX: number, minY: number, maxX: number, maxY: number): P[] {
  let a = Infinity,
    b = Infinity,
    c = -Infinity,
    d = -Infinity;
  for (const p of pts) {
    if (p.x < a) a = p.x;
    if (p.y < b) b = p.y;
    if (p.x > c) c = p.x;
    if (p.y > d) d = p.y;
  }
  const sx = (maxX - minX) / Math.max(c - a, 1e-6);
  const sy = (maxY - minY) / Math.max(d - b, 1e-6);
  return pts.map((p) => ({ x: minX + (p.x - a) * sx, y: minY + (p.y - b) * sy }));
}

/** 폴리라인을 ~step px 간격으로 보간 — 브러시 dab이 매끈하게 이어지도록 */
export function densifyShape(pts: P[], step = 3): P[] {
  if (pts.length < 2) return pts.slice();
  const out: P[] = [{ ...pts[0] }];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.ceil(d / step));
    for (let k = 1; k <= n; k++) {
      out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
    }
  }
  return out;
}
