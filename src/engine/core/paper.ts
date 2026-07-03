/*
 * 종이/캔버스 결 텍스처 — 프로시저럴 타일러블(256px), 종이 종류별.
 * i-scream류 상용앱처럼 모드가 캔버스를 결정한다:
 *   linen(유화)  = 씨실·날실 위브가 뚜렷한 캔버스천
 *   cotton(수채) = 위브 없는 셀룰로스 요철 수채용지
 *   smooth(스케치·색칠) = 매끈한 도화지(아주 은은)
 * 1) grainTile: 알파맵 — 결의 골짜기(안료가 덜 앉는 곳). dab 셰이더/endStroke에서
 *    스트로크에 "물감이 종이 결 위에 앉은" 질감을 만든다.
 * 2) tintTile: 표시용 종이 결 — compositeNow에서 흰 종이 위에 깔린다(내보내기엔 미포함).
 */

const TILE = 256;

export type PaperKind = "linen" | "cotton" | "smooth";

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
    out[i] = (raw[(i - 1 + size) % size] + raw[i] * 2 + raw[(i + 1) % size]) / 4;
  }
  return out;
}

interface PaperRecipe {
  /** 필드 배합 — 고주파 위주(저주파가 크면 "얼룩"처럼 보인다, 2026-07-03 실측) */
  make(): Float32Array;
  /** 침식 알파 곡선 */
  grainLo: number;
  grainHi: number;
  /** 표시 틴트 곡선·최대 알파 */
  tintLo: number;
  tintHi: number;
  tintAlpha: number;
}

const RECIPES: Record<PaperKind, PaperRecipe> = {
  linen: {
    make() {
      const rand = Math.random;
      const n1 = latticeNoise(TILE, 28, rand);
      const n2 = latticeNoise(TILE, 96, rand);
      const rows = weaveLine(TILE, rand);
      const cols = weaveLine(TILE, rand);
      const f = new Float32Array(TILE * TILE);
      for (let y = 0; y < TILE; y++)
        for (let x = 0; x < TILE; x++) {
          const i = y * TILE + x;
          // 위브 비중을 높여 씨실·날실이 방향성 있게 보인다(캔버스천)
          f[i] = 0.2 * n1[i] + 0.24 * n2[i] + 0.28 * rows[y] + 0.28 * cols[x];
        }
      return f;
    },
    grainLo: 0.55,
    grainHi: 0.85,
    tintLo: 0.52,
    tintHi: 0.92,
    tintAlpha: 22,
  },
  cotton: {
    make() {
      const rand = Math.random;
      // 위브 없는 셀룰로스 요철 — 굵은 덩어리 + 미세 입자
      const n1 = latticeNoise(TILE, 20, rand);
      const n2 = latticeNoise(TILE, 72, rand);
      const f = new Float32Array(TILE * TILE);
      for (let i = 0; i < f.length; i++) f[i] = 0.45 * n1[i] + 0.55 * n2[i];
      return f;
    },
    grainLo: 0.5,
    grainHi: 0.85,
    tintLo: 0.55,
    tintHi: 0.95,
    tintAlpha: 16,
  },
  smooth: {
    make() {
      const rand = Math.random;
      const n1 = latticeNoise(TILE, 40, rand);
      const n2 = latticeNoise(TILE, 120, rand);
      const f = new Float32Array(TILE * TILE);
      for (let i = 0; i < f.length; i++) f[i] = 0.35 * n1[i] + 0.65 * n2[i];
      return f;
    },
    grainLo: 0.62,
    grainHi: 0.9,
    tintLo: 0.6,
    tintHi: 0.96,
    tintAlpha: 9,
  },
};

const fields = new Map<PaperKind, Float32Array>();
const grainTiles = new Map<PaperKind, HTMLCanvasElement>();
const tintTiles = new Map<PaperKind, HTMLCanvasElement>();
const tintPatterns = new Map<PaperKind, CanvasPattern>();

function field(kind: PaperKind): Float32Array {
  let f = fields.get(kind);
  if (!f) {
    f = RECIPES[kind].make();
    fields.set(kind, f);
  }
  return f;
}

function smoothstep(lo: number, hi: number, v: number): number {
  const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
}

/** 안료 침식용 알파 타일(흰색, alpha=골짜기 깊이) */
export function paperGrainTile(kind: PaperKind = "linen"): HTMLCanvasElement {
  let tile = grainTiles.get(kind);
  if (tile) return tile;
  const r = RECIPES[kind];
  const f = field(kind);
  tile = document.createElement("canvas");
  tile.width = tile.height = TILE;
  const ctx = tile.getContext("2d")!;
  const img = ctx.createImageData(TILE, TILE);
  for (let i = 0; i < f.length; i++) {
    const a = smoothstep(r.grainLo, r.grainHi, f[i]);
    const p = i * 4;
    img.data[p] = 255;
    img.data[p + 1] = 255;
    img.data[p + 2] = 255;
    img.data[p + 3] = Math.round(a * 255);
  }
  ctx.putImageData(img, 0, 0);
  grainTiles.set(kind, tile);
  return tile;
}

/** 표시용 종이 결 타일(어두운 섬유, 옅게) */
export function paperTintTile(kind: PaperKind = "linen"): HTMLCanvasElement {
  let tile = tintTiles.get(kind);
  if (tile) return tile;
  const r = RECIPES[kind];
  const f = field(kind);
  tile = document.createElement("canvas");
  tile.width = tile.height = TILE;
  const ctx = tile.getContext("2d")!;
  const img = ctx.createImageData(TILE, TILE);
  for (let i = 0; i < f.length; i++) {
    const d = smoothstep(r.tintLo, r.tintHi, f[i]);
    const p = i * 4;
    img.data[p] = 92;
    img.data[p + 1] = 84;
    img.data[p + 2] = 72;
    img.data[p + 3] = Math.round(d * r.tintAlpha);
  }
  ctx.putImageData(img, 0, 0);
  tintTiles.set(kind, tile);
  return tile;
}

/**
 * 스트로크 버퍼에 종이 결 침식 적용(destination-out).
 * strength 0~1 — 결 골짜기에서 안료가 빠져 "종이에 앉은" 질감.
 * (WebGL 경로는 dab 셰이더에서 실시간 처리 — 이 함수는 Canvas2D 폴백용)
 */
export function applyPaperGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strength: number,
  kind: PaperKind = "linen",
): void {
  const pat = ctx.createPattern(paperGrainTile(kind), "repeat");
  if (!pat) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "destination-out";
  ctx.globalAlpha = Math.min(1, strength);
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** 표시 캔버스에 종이 결 깔기(내보내기 비포함, compositeNow 전용 — 매 프레임 호출이라 패턴 캐시) */
export function drawPaperTint(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  kind: PaperKind = "linen",
): void {
  let pat = tintPatterns.get(kind);
  if (!pat) {
    const p = ctx.createPattern(paperTintTile(kind), "repeat");
    if (!p) return;
    tintPatterns.set(kind, p);
    pat = p;
  }
  ctx.fillStyle = pat;
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
