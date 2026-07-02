// join-class: 학급 코드 검증 → 학생 row 생성 → 커스텀 JWT 발급 (DESIGN-REVIEW A1·A2)
// 브루트포스 방어: IP 해시 기준 슬라이딩 윈도우 rate limit + 실패 기록.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { corsHeaders, json } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const JWT_SECRET = Deno.env.get("SUPABASE_JWT_SECRET")!; // 프로젝트 JWT secret

const CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;
const RATE_WINDOW_MIN = 5;
const RATE_MAX = 8;

const BANNED = ["바보", "멍청", "시발", "씨발", "병신", "새끼", "존나", "지랄", "닥쳐", "꺼져", "fuck", "shit", "sex", "bitch"];

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + "arton-salt");
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function signStudentJwt(claims: Record<string, unknown>): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return await create(
    { alg: "HS256", typ: "JWT" },
    {
      ...claims,
      role: "authenticated", // Supabase RLS가 인식하는 role
      aud: "authenticated",
      iss: "arton-join",
      exp: getNumericDate(60 * 60 * 6), // 6시간
    },
    key,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    "unknown";
  const ipHash = await hashIp(ip);

  let body: { code?: string; nickname?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const code = (body.code ?? "").toUpperCase().trim();
  const nickname = (body.nickname ?? "").trim();

  if (!CODE_RE.test(code)) return json({ error: "invalid_code" }, 400);
  if (nickname.length < 1 || nickname.length > 12) return json({ error: "bad_nickname" }, 400);
  if (BANNED.some((b) => nickname.toLowerCase().includes(b))) return json({ error: "bad_nickname" }, 400);

  // rate limit
  const since = new Date(Date.now() - RATE_WINDOW_MIN * 60_000).toISOString();
  const { count } = await admin
    .from("join_attempts")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if ((count ?? 0) >= RATE_MAX) {
    await admin.from("join_attempts").insert({ ip_hash: ipHash, code_tried: code, success: false });
    return json({ error: "rate_limited" }, 429);
  }

  // 코드 검증
  const { data: cls } = await admin
    .from("classes")
    .select("id, name, is_active, teacher_id")
    .eq("code", code)
    .maybeSingle();

  if (!cls || !cls.is_active) {
    await admin.from("join_attempts").insert({ ip_hash: ipHash, code_tried: code, success: false });
    return json({ error: cls ? "inactive" : "invalid_code" }, 404);
  }

  // 정원 체크(Free 30, Pro 무제한에 가까움)
  const { data: teacher } = await admin.from("teachers").select("plan").eq("id", cls.teacher_id).maybeSingle();
  const cap = teacher?.plan === "pro" ? 200 : 30;
  const { count: studentCount } = await admin
    .from("students")
    .select("*", { count: "exact", head: true })
    .eq("class_id", cls.id);
  if ((studentCount ?? 0) >= cap) return json({ error: "full" }, 409);

  // 학생 생성
  const { data: student, error: insErr } = await admin
    .from("students")
    .insert({ class_id: cls.id, nickname, avatar_seed: crypto.randomUUID().slice(0, 8) })
    .select("id")
    .single();
  if (insErr || !student) return json({ error: "server" }, 500);

  await admin.from("join_attempts").insert({ ip_hash: ipHash, code_tried: code, success: true });

  const token = await signStudentJwt({
    sub: student.id,
    student_id: student.id,
    class_id: cls.id,
  });

  return json({
    token,
    studentId: student.id,
    classId: cls.id,
    className: cls.name,
    nickname,
  });
});
