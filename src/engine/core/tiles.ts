/*
 * 더티 타일 스냅샷 유틸 — History의 메모리 예산을 지키는 핵심.
 * 스트로크가 닿은 256px 타일만 before/after 비트맵으로 떠서 커맨드에 담는다.
 */
import type { Command } from "./History";

export const TILE = 256;

export interface TileRect {
  tx: number; // 타일 좌표
  ty: number;
  x: number; // 픽셀 좌표
  y: number;
  w: number;
  h: number;
}

/** 픽셀 영역(x,y,w,h)을 덮는 타일 목록 */
export function tilesForRect(
  x: number,
  y: number,
  w: number,
  h: number,
  canvasW: number,
  canvasH: number,
): TileRect[] {
  const x0 = Math.max(0, Math.floor(x / TILE));
  const y0 = Math.max(0, Math.floor(y / TILE));
  const x1 = Math.min(Math.ceil(canvasW / TILE) - 1, Math.floor((x + w - 1) / TILE));
  const y1 = Math.min(Math.ceil(canvasH / TILE) - 1, Math.floor((y + h - 1) / TILE));
  const rects: TileRect[] = [];
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const px = tx * TILE;
      const py = ty * TILE;
      rects.push({
        tx,
        ty,
        x: px,
        y: py,
        w: Math.min(TILE, canvasW - px),
        h: Math.min(TILE, canvasH - py),
      });
    }
  }
  return rects;
}

/** 타일 스냅샷을 레이어에 되쓰는 함수(엔진이 주입 — putImageData) */
export type TileBlitter = (tiles: TileRect[], snaps: Uint8ClampedArray[]) => void;

/**
 * 레이어 픽셀 버퍼에 대한 더티-타일 커맨드.
 * before/after는 타일 단위 Uint8ClampedArray 스냅샷. revert/apply가 해당 타일만 복원.
 */
export class TileSnapshotCommand implements Command {
  cost: number;
  constructor(
    private readonly tiles: TileRect[],
    private readonly before: Uint8ClampedArray[],
    private readonly after: Uint8ClampedArray[],
    private readonly blit: TileBlitter,
  ) {
    this.cost =
      before.reduce((a, b) => a + b.byteLength, 0) + after.reduce((a, b) => a + b.byteLength, 0);
  }

  apply(): void {
    this.blit(this.tiles, this.after);
  }
  revert(): void {
    this.blit(this.tiles, this.before);
  }
}

/** 버퍼에서 타일 픽셀을 떠낸다 */
export function copyTiles(
  data: Uint8ClampedArray,
  width: number,
  tiles: TileRect[],
): Uint8ClampedArray[] {
  return tiles.map((t) => {
    const out = new Uint8ClampedArray(t.w * t.h * 4);
    for (let row = 0; row < t.h; row++) {
      const src = ((t.y + row) * width + t.x) * 4;
      out.set(data.subarray(src, src + t.w * 4), row * t.w * 4);
    }
    return out;
  });
}
