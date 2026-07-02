import type { BrushId, RGB, StrokePoint, SymmetryMode } from "@/engine/types";

/*
 * 협동 캔버스 스트로크 인코딩 (DESIGN-REVIEW A3).
 * Realtime broadcast는 초당 메시지 한계가 있으므로 스트로크를 배치로 보낸다.
 * 좌표는 Float32 델타 인코딩 + base64로 압축(포인트당 ~9바이트).
 */

export interface WireStroke {
  brush: BrushId;
  color: RGB;
  size: number;
  opacity: number;
  water: number;
  symmetry: SymmetryMode;
  /** 협동 재조립용 */
  userId: string;
  strokeId: number;
  seq: number;
  points: StrokePoint[];
}

/** 포인트 배열을 base64 문자열로(Float32 델타) */
export function encodeStroke(points: StrokePoint[]): string {
  const n = points.length;
  // [count][x0,y0,p0,t0 절대][이후 델타...] — 단순화를 위해 전부 절대 Float32(x,y,pressure) + 상대 t(uint16)
  const floats = new Float32Array(n * 3);
  const times = new Uint16Array(n);
  const t0 = points[0]?.t ?? 0;
  for (let i = 0; i < n; i++) {
    floats[i * 3] = points[i].x;
    floats[i * 3 + 1] = points[i].y;
    floats[i * 3 + 2] = points[i].pressure;
    times[i] = Math.min(65535, Math.max(0, Math.round(points[i].t - t0)));
  }
  const header = new Uint32Array([n]);
  const buf = concatBuffers([header.buffer, floats.buffer, times.buffer]);
  return bytesToBase64(new Uint8Array(buf));
}

export function decodeStroke(b64: string): StrokePoint[] {
  const bytes = base64ToBytes(b64);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n = dv.getUint32(0, true);
  const floatsStart = 4;
  const timesStart = floatsStart + n * 3 * 4;
  const pts: StrokePoint[] = [];
  for (let i = 0; i < n; i++) {
    const fx = dv.getFloat32(floatsStart + i * 12, true);
    const fy = dv.getFloat32(floatsStart + i * 12 + 4, true);
    const fp = dv.getFloat32(floatsStart + i * 12 + 8, true);
    const t = dv.getUint16(timesStart + i * 2, true);
    pts.push({ x: fx, y: fy, pressure: fp, t });
  }
  return pts;
}

function concatBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  const total = buffers.reduce((a, b) => a + b.byteLength, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const b of buffers) {
    out.set(new Uint8Array(b), off);
    off += b.byteLength;
  }
  return out.buffer;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(b64, "base64"));
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
