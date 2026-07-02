import type { RGB } from "../types";

/*
 * 페인트통: scanline flood fill (순수 로직 — ImageData 버퍼 위에서 동작)
 * 색칠 모드에서는 라인아트 레이어에서 만든 barrier 마스크를 벽으로 취급해
 * 선 밖으로 삐져나가지 않는다. AA 경계 틈은 마지막 1px 팽창으로 메운다.
 */

export interface FillOptions {
  /** 시드 색과의 채널별 최대 허용 차 (기본 32) */
  tolerance?: number;
  /** width*height 크기. 0이 아닌 값 = 벽(라인아트) */
  barrier?: Uint8Array | null;
}

export interface FillResult {
  changed: boolean;
  /** 변경 영역 (히스토리 스냅샷용) */
  dirty: { x: number; y: number; w: number; h: number } | null;
}

/**
 * 라인아트 레이어 픽셀 → 벽 마스크.
 * 불투명하고 어두운 픽셀(알파×어두움)이 임계 이상이면 벽.
 */
export function buildBarrierFromLineart(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  threshold = 96,
): Uint8Array {
  const barrier = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < barrier.length; i++, p += 4) {
    const a = pixels[p + 3];
    if (a === 0) continue;
    const lum = (pixels[p] * 299 + pixels[p + 1] * 587 + pixels[p + 2] * 114) / 1000;
    const darkness = ((255 - lum) * a) / 255;
    if (darkness >= threshold) barrier[i] = 1;
  }
  return barrier;
}

export function floodFill(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  seedX: number,
  seedY: number,
  color: RGB,
  opts: FillOptions = {},
): FillResult {
  const tolerance = opts.tolerance ?? 32;
  const barrier = opts.barrier ?? null;

  const sx = Math.floor(seedX);
  const sy = Math.floor(seedY);
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) {
    return { changed: false, dirty: null };
  }
  const seedIdx = sy * width + sx;
  if (barrier && barrier[seedIdx]) return { changed: false, dirty: null };

  const sp = seedIdx * 4;
  const seed = [pixels[sp], pixels[sp + 1], pixels[sp + 2], pixels[sp + 3]] as const;

  // 시드가 이미 목표색(불투명)이면 no-op
  if (
    seed[0] === color.r &&
    seed[1] === color.g &&
    seed[2] === color.b &&
    seed[3] === 255
  ) {
    return { changed: false, dirty: null };
  }

  const matches = (i: number): boolean => {
    if (barrier && barrier[i]) return false;
    const p = i * 4;
    return (
      Math.abs(pixels[p] - seed[0]) <= tolerance &&
      Math.abs(pixels[p + 1] - seed[1]) <= tolerance &&
      Math.abs(pixels[p + 2] - seed[2]) <= tolerance &&
      Math.abs(pixels[p + 3] - seed[3]) <= tolerance
    );
  };

  const filled = new Uint8Array(width * height);
  const stack: number[] = [seedIdx];
  let minX = sx,
    maxX = sx,
    minY = sy,
    maxY = sy;

  // scanline: 스택에서 하나 꺼내 좌우로 확장하며 한 줄을 채우고, 위/아래 줄의 새 구간 시작점만 push
  while (stack.length) {
    const idx = stack.pop() as number;
    if (filled[idx] || !matches(idx)) continue;
    const y = Math.floor(idx / width);
    let x = idx % width;

    // 왼쪽 끝까지
    while (x > 0 && !filled[y * width + x - 1] && matches(y * width + x - 1)) x--;

    let spanUp = false;
    let spanDown = false;
    while (x < width) {
      const i = y * width + x;
      if (filled[i] || !matches(i)) break;
      filled[i] = 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      if (y > 0) {
        const up = i - width;
        const m = !filled[up] && matches(up);
        if (m && !spanUp) {
          stack.push(up);
          spanUp = true;
        } else if (!m) {
          spanUp = false;
        }
      }
      if (y < height - 1) {
        const down = i + width;
        const m = !filled[down] && matches(down);
        if (m && !spanDown) {
          stack.push(down);
          spanDown = true;
        } else if (!m) {
          spanDown = false;
        }
      }
      x++;
    }
  }

  // AA 경계 틈 메우기: 채운 영역을 1px 팽창(벽 제외)
  const grown: number[] = [];
  for (let y = minY === 0 ? 0 : minY - 1; y <= Math.min(height - 1, maxY + 1); y++) {
    for (let x = minX === 0 ? 0 : minX - 1; x <= Math.min(width - 1, maxX + 1); x++) {
      const i = y * width + x;
      if (filled[i] || (barrier && barrier[i])) continue;
      const near =
        (x > 0 && filled[i - 1]) ||
        (x < width - 1 && filled[i + 1]) ||
        (y > 0 && filled[i - width]) ||
        (y < height - 1 && filled[i + width]);
      if (near) grown.push(i);
    }
  }
  for (const i of grown) {
    filled[i] = 1;
    const x = i % width;
    const y = Math.floor(i / width);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  let changed = false;
  for (let i = 0; i < filled.length; i++) {
    if (!filled[i]) continue;
    const p = i * 4;
    pixels[p] = color.r;
    pixels[p + 1] = color.g;
    pixels[p + 2] = color.b;
    pixels[p + 3] = 255;
    changed = true;
  }

  return changed
    ? { changed, dirty: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } }
    : { changed: false, dirty: null };
}
