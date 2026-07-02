// submit-artwork: 학생 JWT로 작품 제출 (DESIGN-REVIEW A1)
// 서버가 JWT claim의 class_id/student_id로 삽입 — 클라이언트가 보낸 값은 신뢰하지 않는다.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { corsHeaders, json } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const JWT_SECRET = Deno.env.get("SUPABASE_JWT_SECRET")!;

const MODES = ["sketch", "watercolor", "oil", "coloring"];
const MAX_BYTES = 8 * 1024 * 1024;

async function verifyStudent(token: string): Promise<{ classId: string; studentId: string } | null> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const payload = await verify(token, key);
    const classId = payload.class_id as string;
    const studentId = payload.student_id as string;
    if (!classId || !studentId) return null;
    return { classId, studentId };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const claims = await verifyStudent(auth);
  if (!claims) return json({ error: "unauthorized" }, 401);

  const form = await req.formData();
  const mode = String(form.get("mode") ?? "sketch");
  if (!MODES.includes(mode)) return json({ error: "bad_mode" }, 400);
  const image = form.get("image");
  const thumb = form.get("thumb");
  const timelapse = form.get("timelapse");
  if (!(image instanceof File) || !(thumb instanceof File)) return json({ error: "missing_files" }, 400);
  if (image.size > MAX_BYTES || thumb.size > MAX_BYTES) return json({ error: "too_large" }, 413);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // 학생이 실제 이 학급 소속인지 재확인(토큰 위조 방어 이중화)
  const { data: student } = await admin
    .from("students")
    .select("id, class_id")
    .eq("id", claims.studentId)
    .eq("class_id", claims.classId)
    .maybeSingle();
  if (!student) return json({ error: "unauthorized" }, 401);

  const artId = crypto.randomUUID();
  const base = `${claims.classId}/${claims.studentId}/${artId}`;
  const imagePath = `${base}.png`;
  const thumbPath = `${base}.thumb.webp`;
  let timelapsePath: string | null = null;

  const up1 = await admin.storage.from("artworks").upload(imagePath, image, {
    contentType: "image/png",
    upsert: false,
  });
  const up2 = await admin.storage.from("artworks").upload(thumbPath, thumb, {
    contentType: "image/webp",
    upsert: false,
  });
  if (up1.error || up2.error) return json({ error: "storage" }, 500);

  if (timelapse instanceof File && timelapse.size > 0 && timelapse.size <= MAX_BYTES * 4) {
    timelapsePath = `${base}.webm`;
    await admin.storage.from("artworks").upload(timelapsePath, timelapse, {
      contentType: "video/webm",
      upsert: false,
    });
  }

  const { data: art, error } = await admin
    .from("artworks")
    .insert({
      id: artId,
      class_id: claims.classId, // 서버가 claim에서 — 클라이언트 값 무시
      student_id: claims.studentId,
      mode,
      image_path: imagePath,
      thumb_path: thumbPath,
      timelapse_path: timelapsePath,
      is_approved: false,
    })
    .select("id")
    .single();
  if (error || !art) return json({ error: "db" }, 500);

  return json({ id: art.id });
});
