/*
 * 종이/캔버스 결 텍스처 — 프로시저럴 타일러블(256px).
 * 1) grainTile: 알파맵 — 결의 골짜기(안료가 덜 앉는 곳). endStroke에서
 *    스트로크 버퍼에 destination-out으로 찍어 "물감이 캔버스 결 위에 앉은" 질감을 만든다.
 * 2) tintTile: 표시용 은은한 린넨 — compositeNow에서 흰 종이 위에 깔린다(내보내기엔 미포함).
 */

const TILE = 256;

let grainTile: HTMLCanvasElement | null = null;
let tintTile: HTMLCanvasElement | null = null;
let fiberField: Float32Array | null = null;

/** 타일 경계에서 이어지는(wrap) 밸류 노이즈 */
function latticeNoise(size: number, cells: number, rand: () => number): Float32Array {
  const lat = new Float32Array(cells * cells);
  for (let i = 0; i < lat.length; i++) lat[i] = rand();
  const out = new Float32Array(size * size);
  const k = cells / size;
  for (let y = 0; y < size; y++) {
    const fy = y * k;
    const y0 = Math.floor(fy) % cells;
    const y1 = (y0 + 1) % cells;
    const ty = fy - Math.floor(fy);
    for (let x = 0; x < size; x++) {
      const fx = x * k;
      const x0 = Math.floor(fx) % cells;
      const x1 = (x0 + 1) % cells;
      const tx = fx - Math.floor(fx);
      const a = lat[y0 * cells + x0];
      const b = lat[y0 * cells + x1];
      const c = lat[y1 * cells + x0];
      const d = lat[y1 * cells + x1];
      out[y * size + x] = (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
    }
  }
  return out;
}

/** 가로/세로 씨실·날실 스트라이프(린넨 위브) — wrap 스무딩 */
function weaveLine(size: number, rand: () => number): Float32Array {
  const raw = new Float32Array(size);
  for (let i = 0; i < size; i++) raw[i] = rand();
  const out = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    out[i] =
      (raw[(i - 1 + size) % size] + raw[i] * 2 + raw[(i + 1) % size]) / 4;
  }
  return out;
}

function field(): Float32Array {
  if (fiberField) return fiberField;
  const rand = Math.random;
  // 고주파 위주 — 저주파가 크면 "얼룩"처럼 보인다(2026-07-03 실측)
  const n1 = latticeNoise(TILE, 28, rand);
  const n2 = latticeNoise(TILE, 96, rand);
  const rows = weaveLine(TILE, rand);
  const cols = weaveLine(TILE, rand);
  const f = new Float32Array(TILE * TILE);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const i = y * TILE + x;
      f[i] = 0.25 * n1[i] + 0.33 * n2[i] + 0.21 * rows[y] + 0.21 * cols[x];
    }
  }
  fiberField = f;
  return f;
}

function smoothstep(lo: number, hi: number, v: number): number {
  const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
}

/** 안료 침식용 알파 타일(흰색, alpha=골짜기 깊이) */
export function paperGrainTile(): HTMLCanvasElement {
  if (grainTile) return grainTile;
  const f = field();
  const c = document.createElement("canvas");
  c.width = c.height = TILE;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(TILE, TILE);
  for (let i = 0; i < f.length; i++) {
    const a = smoothstep(0.58, 0.88, f[i]);
    const p = i * 4;
    img.data[p] = 255;
    img.data[p + 1] = 255;
    img.data[p + 2] = 255;
    img.data[p + 3] = Math.round(a * 255);
  }
  ctx.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

/** 표시용 은은한 린넨 타일(어두운 섬유, 매우 옅게) */
export function paperTintTile(): HTMLCanvasElement {
  if (tintTile) return tintTile;
  const f = field();
  const c = document.createElement("canvas");
  c.width = c.height = TILE;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(TILE, TILE);
  for (let i = 0; i < f.length; i++) {
    const d = smoothstep(0.55, 0.95, f[i]);
    const p = i * 4;
    img.data[p] = 92;
    img.data[p + 1] = 84;
    img.data[p + 2] = 72;
    img.data[p + 3] = Math.round(d * 15); // 최대 ~6% — 린넨 위브가 보이되 티끌처럼 지저분하지 않게
  }
  ctx.putImageData(img, 0, 0);
  tintTile = c;
  return c;
}

/**
 * 스트로크 버퍼에 종이 결 침식 적용(destination-out).
 * strength 0~1 — 결 골짜기에서 안료가 빠져 "캔버스에 앉은" 질감.
 */
export function applyPaperGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strength: number,
): void {
  if (strength <= 0) return;
  const pat = ctx.createPattern(paperGrainTile(), "repeat");
  if (!pat) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "destination-out";
  ctx.globalAlpha = Math.min(1, strength);
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

let tintPattern: CanvasPattern | null = null;

/** 표시 캔버스에 린넨 결 깔기(내보내기 비포함, compositeNow 전용 — 매 프레임 호출이라 패턴 캐시) */
export function drawPaperTint(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  if (!tintPattern) tintPattern = ctx.createPattern(paperTintTile(), "repeat");
  if (!tintPattern) return;
  ctx.fillStyle = tintPattern;
  ctx.fillRect(0, 0, width, height);
}

/* wet edge 작업용 스크래치 캔버스(스트로크마다 재할당 방지).
 * ⚠️ 모듈 싱글턴 — "페이지당 활성 엔진 1개" 가정(CanvasStage 단일 마운트).
 * 멀티 캔버스 동시 렌더가 생기면 백엔드 인스턴스 필드로 옮길 것. */
let wetTmp: CanvasRenderingContext2D | null = null;
let wetBand: CanvasRenderingContext2D | null = null;

function scratch(
  ref: CanvasRenderingContext2D | null,
  width: number,
  height: number,
): CanvasRenderingContext2D {
  if (!ref || ref.canvas.width !== width || ref.canvas.height !== height) {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    ref = c.getContext("2d")!;
  }
  return ref;
}

/**
 * 수채 wet edge: 획이 마르며 안료가 실루엣 가장자리에 몰리는 효과.
 * 밴드 = 스트로크 − blur(스트로크): 실루엣 안쪽 경계에서만 알파가 남는다.
 * 밴드를 source-atop으로 다시 얹어 가장자리 알파(=진하기)를 올린다 —
 * dab 단위 rim 베이크와 달리 획 전체 실루엣 기준이라 겹침 고리가 없다.
 */
export function applyWetEdge(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strength: number,
): void {
  wetTmp = scratch(wetTmp, width, height);
  wetBand = scratch(wetBand, width, height);

  wetTmp.clearRect(0, 0, width, height);
  wetTmp.filter = "blur(7px)";
  wetTmp.drawImage(ctx.canvas, 0, 0);
  wetTmp.filter = "none";

  wetBand.clearRect(0, 0, width, height);
  wetBand.drawImage(ctx.canvas, 0, 0);
  wetBand.globalCompositeOperation = "destination-out";
  wetBand.drawImage(wetTmp.canvas, 0, 0);
  wetBand.globalCompositeOperation = "source-over";

  ctx.save();
  ctx.globalCompositeOperation = "source-atop"; // 실루엣 밖으로 번지지 않게
  ctx.globalAlpha = Math.min(1, strength);
  ctx.drawImage(wetBand.canvas, 0, 0);
  ctx.drawImage(wetBand.canvas, 0, 0);
  ctx.drawImage(wetBand.canvas, 0, 0);
  ctx.restore();
}
