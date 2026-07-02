// Worker 공통 유틸 — ID/학급코드 생성, 쿠키, IP 해시, 금칙어.

// 혼동문자(I,L,O,0,1) 제외 31자 — join-class CODE_RE와 동일 알파벳.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

export function genId(): string {
  return crypto.randomUUID();
}

export function genClassCode(): string {
  const buf = crypto.getRandomValues(new Uint8Array(6));
  let out = "";
  for (let i = 0; i < 6; i++) out += CODE_ALPHABET[buf[i] % CODE_ALPHABET.length];
  return out;
}

// 닉네임 금칙어(join-class 포팅)
export const BANNED = [
  "바보", "멍청", "시발", "씨발", "병신", "새끼", "존나", "지랄", "닥쳐", "꺼져",
  "fuck", "shit", "sex", "bitch",
];

export function isBannedNickname(nickname: string): boolean {
  const low = nickname.toLowerCase();
  return BANNED.some((b) => low.includes(b));
}

export async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + "arton-salt");
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── 쿠키 ──
export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v; // malformed percent-encoding → 원문 유지(500 방지)
    }
  }
  return out;
}

export interface CookieOpts {
  maxAge?: number;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export function serializeCookie(name: string, value: string, opts: CookieOpts = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${opts.path ?? "/"}`);
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  parts.push(`SameSite=${opts.sameSite ?? "Lax"}`);
  return parts.join("; ");
}

export const SESSION_COOKIE = "arton_session";
