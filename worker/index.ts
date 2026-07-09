// ArtON Cloudflare Worker — 정적 자산(out/) 서빙 + /api/* 백엔드.
// Supabase(Postgres+Auth+Storage+Realtime+Edge Functions) 전면 대체.
import { Hono } from "hono";
import type { Context, Next } from "hono";
import type { Env } from "./types";
import { hashPassword, verifyPassword, signJwt, verifyJwt } from "./lib/auth";
import {
  genId,
  genClassCode,
  CODE_RE,
  isBannedNickname,
  hashIp,
  parseCookies,
  serializeCookie,
  SESSION_COOKIE,
} from "./lib/util";

export { CollabRoom } from "./collab";

type Vars = { teacherId: string; studentId: string; studentClassId: string };
type AppContext = Context<{ Bindings: Env; Variables: Vars }>;
const app = new Hono<{ Bindings: Env; Variables: Vars }>();

// ── 상수(Supabase Edge Function 포팅) ──
const RATE_WINDOW_MS = 5 * 60_000;
const RATE_MAX = 8; // 학생 join 시도 상한/윈도우
const AUTH_RATE_MAX = 10; // 교사 로그인·가입 시도 상한/윈도우(크리덴셜 스터핑 방어)
const AUTH_MARKER = "__AUTH__"; // join_attempts 재사용 시 교사 인증 시도 표식
const MODES = ["sketch", "watercolor", "oil", "coloring"];
const MAX_BYTES = 8 * 1024 * 1024;
const DAY_MS = 86_400_000;
const RETENTION_MS = 180 * DAY_MS; // 작품 보관 기간(6개월). 이후 매일 cron이 영구 삭제.
const WARN_MS = 30 * DAY_MS; // 삭제 30일 전부터 선생님께 임박 안내(대시보드/갤러리 배지).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SESSION_TTL_SEC = 60 * 60 * 24 * 30; // 30일
const STUDENT_TTL_SEC = 60 * 60 * 6; // 6시간
// 미가입 이메일 로그인 시 타이밍 균일화용 더미(존재하는 계정과 동일한 PBKDF2 비용 지불).
const DUMMY_HASH = "A".repeat(43);
const DUMMY_SALT = "A".repeat(22);

// FormData 파일 추출(instanceof File은 workers-types에서 문자열 유니온과 충돌 → 덕타이핑)
function fileOrNull(v: File | string | null): File | null {
  return v && typeof v !== "string" ? v : null;
}

function clientIp(c: AppContext): string {
  return (
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

// join_attempts 재사용 IP rate limit(교사 인증·학생 join 공용). marker로 카운트 분리.
async function ipAttemptCount(c: AppContext, ipHash: string, marker: string): Promise<number> {
  const since = Date.now() - RATE_WINDOW_MS;
  const r = await c.env.DB.prepare(
    "SELECT COUNT(*) AS n FROM join_attempts WHERE ip_hash = ? AND code_tried = ? AND created_at >= ?",
  )
    .bind(ipHash, marker, since)
    .first<{ n: number }>();
  return r?.n ?? 0;
}
async function recordAttempt(c: AppContext, ipHash: string, marker: string, success: boolean): Promise<void> {
  await c.env.DB.prepare("INSERT INTO join_attempts (ip_hash, code_tried, success) VALUES (?, ?, ?)")
    .bind(ipHash, marker, success ? 1 : 0)
    .run();
}

// ── 교사 세션 쿠키 ──
async function setSession(
  c: AppContext,
  teacher: { id: string; email: string; name: string; plan: string },
) {
  const token = await signJwt(
    { sub: teacher.id, email: teacher.email, name: teacher.name, plan: teacher.plan },
    c.env.SESSION_SECRET,
    SESSION_TTL_SEC,
  );
  // http(비-https)로 뜬 환경(로컬 LAN/터널)에서 Secure 쿠키 미저장 방지 — 요청 스킴 기반.
  const secure = new URL(c.req.url).protocol === "https:";
  c.header(
    "Set-Cookie",
    serializeCookie(SESSION_COOKIE, token, {
      maxAge: SESSION_TTL_SEC,
      httpOnly: true,
      secure,
      sameSite: "Lax",
      path: "/",
    }),
  );
}

async function currentTeacherId(c: AppContext): Promise<string | null> {
  const cookies = parseCookies(c.req.header("Cookie") ?? null);
  const tok = cookies[SESSION_COOKIE];
  if (!tok) return null;
  const payload = await verifyJwt<{ sub: string }>(tok, c.env.SESSION_SECRET);
  return payload?.sub ?? null;
}

// 교사 인증 미들웨어
async function requireTeacher(c: AppContext, next: Next) {
  const id = await currentTeacherId(c);
  if (!id) return c.json({ error: "unauthorized" }, 401);
  c.set("teacherId", id);
  await next();
}

// 학생 인증 미들웨어(Bearer JWT) — 토큰 위조 이중 방어로 학급 소속 재확인
async function requireStudent(c: AppContext, next: Next) {
  const auth = c.req.header("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const claims = await verifyJwt<{ student_id: string; class_id: string }>(auth, c.env.STUDENT_JWT_SECRET);
  if (!claims?.student_id || !claims?.class_id) return c.json({ error: "unauthorized" }, 401);
  const student = await c.env.DB.prepare("SELECT id FROM students WHERE id = ? AND class_id = ?")
    .bind(claims.student_id, claims.class_id)
    .first();
  if (!student) return c.json({ error: "unauthorized" }, 401);
  c.set("studentId", claims.student_id);
  c.set("studentClassId", claims.class_id);
  await next();
}

// 도안 배포 image 경로 화이트리스트 — 정적 /templates/ 안의 이미지 파일만(외부 URL/트래버설 차단)
const TEMPLATE_IMAGE_RE = /^\/templates\/[a-z0-9_\-/]+\.(webp|png|jpg|jpeg)$/i;

// ══════════════════════ 교사 인증 ══════════════════════
app.post("/api/teacher/signup", async (c) => {
  let body: { email?: string; password?: string; name?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "bad_request" }, 400);
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const name = (body.name ?? "선생님").trim().slice(0, 20) || "선생님";
  if (!EMAIL_RE.test(email)) return c.json({ error: "invalid_email" }, 400);
  if (password.length < 8) return c.json({ error: "weak_password" }, 400);

  // 크리덴셜 스터핑/무차별 대입 방어(IP rate limit) — login과 예산 공유
  const ipHash = await hashIp(clientIp(c));
  if ((await ipAttemptCount(c, ipHash, AUTH_MARKER)) >= AUTH_RATE_MAX) {
    await recordAttempt(c, ipHash, AUTH_MARKER, false);
    return c.json({ error: "rate_limited" }, 429);
  }

  const existing = await c.env.DB.prepare("SELECT id FROM teachers WHERE email = ?").bind(email).first();
  if (existing) {
    await recordAttempt(c, ipHash, AUTH_MARKER, false);
    return c.json({ error: "email_taken" }, 409);
  }

  const { hash, salt } = await hashPassword(password);
  const id = genId();
  try {
    await c.env.DB.prepare(
      "INSERT INTO teachers (id, email, name, password_hash, password_salt) VALUES (?, ?, ?, ?, ?)",
    )
      .bind(id, email, name, hash, salt)
      .run();
  } catch (e) {
    // 동시 중복 가입 레이스: UNIQUE(email) 충돌 → email_taken으로 정규화
    if (String(e).includes("UNIQUE")) return c.json({ error: "email_taken" }, 409);
    return c.json({ error: "server" }, 500);
  }
  // 구독 row는 휴면 결제 스캐폴딩 — 실패해도 교사 계정은 정상 동작하므로 non-fatal.
  try {
    await c.env.DB.prepare("INSERT INTO subscriptions (id, teacher_id) VALUES (?, ?)").bind(genId(), id).run();
  } catch {
    /* 구독 생성 실패 무시(가입 자체는 성공 처리) */
  }
  await recordAttempt(c, ipHash, AUTH_MARKER, true);

  const teacher = { id, email, name, plan: "free" };
  await setSession(c, teacher);
  return c.json(teacher);
});

app.post("/api/teacher/login", async (c) => {
  let body: { email?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "bad_request" }, 400);
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!EMAIL_RE.test(email) || !password) return c.json({ error: "invalid" }, 400);

  // 크리덴셜 스터핑/무차별 대입 방어(IP rate limit)
  const ipHash = await hashIp(clientIp(c));
  if ((await ipAttemptCount(c, ipHash, AUTH_MARKER)) >= AUTH_RATE_MAX) {
    await recordAttempt(c, ipHash, AUTH_MARKER, false);
    return c.json({ error: "rate_limited" }, 429);
  }

  const t = await c.env.DB.prepare(
    "SELECT id, email, name, plan, password_hash, password_salt FROM teachers WHERE email = ?",
  )
    .bind(email)
    .first<{ id: string; email: string; name: string; plan: string; password_hash: string; password_salt: string }>();
  // 미가입 이메일도 더미 검증으로 타이밍 균일화(이메일 열거 방어)
  let ok = false;
  if (t) ok = await verifyPassword(password, t.password_hash, t.password_salt);
  else await verifyPassword(password, DUMMY_HASH, DUMMY_SALT);
  if (!t || !ok) {
    await recordAttempt(c, ipHash, AUTH_MARKER, false);
    return c.json({ error: "invalid_credentials" }, 401);
  }
  await recordAttempt(c, ipHash, AUTH_MARKER, true);
  const teacher = { id: t.id, email: t.email, name: t.name, plan: t.plan };
  await setSession(c, teacher);
  return c.json(teacher);
});

app.post("/api/teacher/logout", (c) => {
  const secure = new URL(c.req.url).protocol === "https:";
  c.header(
    "Set-Cookie",
    serializeCookie(SESSION_COOKIE, "", { maxAge: 0, httpOnly: true, secure, sameSite: "Lax", path: "/" }),
  );
  return c.json({ ok: true });
});

app.get("/api/teacher/me", async (c) => {
  const id = await currentTeacherId(c);
  if (!id) return c.json({ error: "unauthorized" }, 401);
  const t = await c.env.DB.prepare("SELECT id, email, name, plan FROM teachers WHERE id = ?")
    .bind(id)
    .first();
  if (!t) return c.json({ error: "unauthorized" }, 401);
  return c.json(t);
});

// ══════════════════════ 교사: 학급 ══════════════════════
app.get("/api/classes", requireTeacher, async (c) => {
  const teacherId = c.get("teacherId");
  // expiring_soon = 삭제 30일 이내 작품 수(created_at ≤ now−150일). 대시보드 임박 배너용.
  const warnBefore = Date.now() - (RETENTION_MS - WARN_MS);
  const { results } = await c.env.DB.prepare(
    `SELECT c.id, c.name, c.code, c.is_active, c.created_at, COUNT(s.id) AS student_count,
       (SELECT COUNT(*) FROM artworks a WHERE a.class_id = c.id AND a.created_at <= ?) AS expiring_soon
     FROM classes c LEFT JOIN students s ON s.class_id = c.id
     WHERE c.teacher_id = ?
     GROUP BY c.id ORDER BY c.created_at DESC`,
  )
    .bind(warnBefore, teacherId)
    .all<{ id: string; name: string; code: string; is_active: number; created_at: number; student_count: number; expiring_soon: number }>();
  return c.json(
    (results ?? []).map((r) => ({ ...r, is_active: !!r.is_active })),
  );
});

app.post("/api/classes", requireTeacher, async (c) => {
  const teacherId = c.get("teacherId");
  let body: { name?: string };
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }
  const name = (body.name ?? "우리 반").trim().slice(0, 30) || "우리 반";
  // 코드 충돌 재시도(최대 5)
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = genId();
    const code = genClassCode();
    try {
      await c.env.DB.prepare("INSERT INTO classes (id, teacher_id, name, code) VALUES (?, ?, ?, ?)")
        .bind(id, teacherId, name, code)
        .run();
      return c.json({ id, name, code, is_active: true, created_at: Date.now(), student_count: 0 });
    } catch (e) {
      if (String(e).includes("UNIQUE") && attempt < 4) continue;
      return c.json({ error: "server" }, 500);
    }
  }
  return c.json({ error: "server" }, 500);
});

app.patch("/api/classes/:id", requireTeacher, async (c) => {
  const teacherId = c.get("teacherId");
  const id = c.req.param("id");
  let body: { is_active?: boolean };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "bad_request" }, 400);
  }
  if (typeof body.is_active !== "boolean") return c.json({ error: "bad_request" }, 400);
  const res = await c.env.DB.prepare("UPDATE classes SET is_active = ? WHERE id = ? AND teacher_id = ?")
    .bind(body.is_active ? 1 : 0, id, teacherId)
    .run();
  if (!res.meta.changes) return c.json({ error: "not_found" }, 404);
  return c.json({ ok: true });
});

app.post("/api/classes/:id/code", requireTeacher, async (c) => {
  const teacherId = c.get("teacherId");
  const id = c.req.param("id");
  // 소유 확인
  const owned = await c.env.DB.prepare("SELECT id FROM classes WHERE id = ? AND teacher_id = ?")
    .bind(id, teacherId)
    .first();
  if (!owned) return c.json({ error: "not_found" }, 404);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genClassCode();
    try {
      // 소유권 조건을 UPDATE에 직접 포함(단일 원자 쿼리 — 다른 핸들러와 패턴 통일)
      await c.env.DB.prepare("UPDATE classes SET code = ? WHERE id = ? AND teacher_id = ?")
        .bind(code, id, teacherId)
        .run();
      return c.json({ code });
    } catch (e) {
      if (String(e).includes("UNIQUE") && attempt < 4) continue;
      return c.json({ error: "server" }, 500);
    }
  }
  return c.json({ error: "server" }, 500);
});

// ══════════════════════ 교사: 작품 ══════════════════════
app.get("/api/classes/:id/artworks", requireTeacher, async (c) => {
  const teacherId = c.get("teacherId");
  const id = c.req.param("id");
  const owned = await c.env.DB.prepare("SELECT id FROM classes WHERE id = ? AND teacher_id = ?")
    .bind(id, teacherId)
    .first();
  if (!owned) return c.json({ error: "not_found" }, 404);
  const { results } = await c.env.DB.prepare(
    `SELECT a.id, a.student_id, a.mode, a.thumb_path, a.image_path, a.is_approved, a.like_count, a.created_at, s.nickname
     FROM artworks a JOIN students s ON s.id = a.student_id
     WHERE a.class_id = ? ORDER BY a.created_at DESC`,
  )
    .bind(id)
    .all<{ is_approved: number; created_at: number; [k: string]: unknown }>();
  return c.json(
    (results ?? []).map((r) => ({
      ...r,
      is_approved: !!r.is_approved,
      expires_at: r.created_at + RETENTION_MS, // 이 시각 이후 cron이 영구 삭제
    })),
  );
});

/* 학급 학생(별명) 명단 — 아이가 별명을 까먹으면 선생님이 여기서 찾아 알려준다.
 * 작품 수·마지막 활동을 함께 줘 재입장 실수로 생긴 "빈 학생"도 구분 가능. */
app.get("/api/classes/:id/students", requireTeacher, async (c) => {
  const teacherId = c.get("teacherId");
  const id = c.req.param("id");
  const owned = await c.env.DB.prepare("SELECT id FROM classes WHERE id = ? AND teacher_id = ?")
    .bind(id, teacherId)
    .first();
  if (!owned) return c.json({ error: "not_found" }, 404);
  const { results } = await c.env.DB.prepare(
    `SELECT s.id, s.nickname, s.created_at,
            COUNT(a.id) AS artwork_count, MAX(a.created_at) AS last_artwork_at
     FROM students s LEFT JOIN artworks a ON a.student_id = s.id
     WHERE s.class_id = ?
     GROUP BY s.id ORDER BY s.created_at ASC`,
  )
    .bind(id)
    .all();
  return c.json(results ?? []);
});

app.patch("/api/artworks/:id", requireTeacher, async (c) => {
  const teacherId = c.get("teacherId");
  const id = c.req.param("id");
  let body: { is_approved?: boolean };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "bad_request" }, 400);
  }
  if (typeof body.is_approved !== "boolean") return c.json({ error: "bad_request" }, 400);
  const res = await c.env.DB.prepare(
    `UPDATE artworks SET is_approved = ?
     WHERE id = ? AND class_id IN (SELECT id FROM classes WHERE teacher_id = ?)`,
  )
    .bind(body.is_approved ? 1 : 0, id, teacherId)
    .run();
  if (!res.meta.changes) return c.json({ error: "not_found" }, 404);
  return c.json({ ok: true });
});

// 작품 영구 삭제(교사 큐레이션) — 소유 학급의 작품만. 승인 게이트 대신 사후 정리 수단.
// 원칙은 만료 purge와 동일: R2 객체 삭제가 성공해야 D1 행을 지운다(깨진 썸네일 orphan 방지),
// D1은 likes+artworks를 batch로 원자 삭제.
app.delete("/api/artworks/:id", requireTeacher, async (c) => {
  const teacherId = c.get("teacherId");
  const id = c.req.param("id");
  const row = await c.env.DB.prepare(
    `SELECT a.image_path, a.thumb_path, a.timelapse_path
     FROM artworks a JOIN classes cl ON cl.id = a.class_id
     WHERE a.id = ? AND cl.teacher_id = ?`,
  )
    .bind(id, teacherId)
    .first<{ image_path: string; thumb_path: string; timelapse_path: string | null }>();
  if (!row) return c.json({ error: "not_found" }, 404);
  const paths = [row.image_path, row.thumb_path, ...(row.timelapse_path ? [row.timelapse_path] : [])];
  try {
    await Promise.all(paths.map((p) => c.env.BUCKET.delete(p)));
  } catch {
    // R2 삭제 실패 — D1을 지우지 않고 그대로 둔다(교사가 다시 시도 가능)
    return c.json({ error: "storage" }, 500);
  }
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM artwork_likes WHERE artwork_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM artworks WHERE id = ?").bind(id),
  ]);
  return c.json({ ok: true });
});

// 작품 이미지 스트리밍(Supabase signed URL 대체). 교사가 해당 학급 소유 시에만.
app.get("/api/artwork/file", requireTeacher, async (c) => {
  const teacherId = c.get("teacherId");
  const path = c.req.query("path") ?? "";
  // path = classId/studentId/artId.ext — 경로 주입 방어
  if (!/^[a-f0-9-]+\/[a-f0-9-]+\/[a-f0-9-]+(\.[a-z]+)+$/i.test(path)) {
    return c.json({ error: "bad_path" }, 400);
  }
  const classId = path.split("/")[0];
  const owned = await c.env.DB.prepare("SELECT id FROM classes WHERE id = ? AND teacher_id = ?")
    .bind(classId, teacherId)
    .first();
  if (!owned) return c.json({ error: "forbidden" }, 403);
  // 해당 path가 실제 artworks row에 등록된 파일인지 재확인(orphan/미등록 객체 UUID 추측 접근 차단)
  const known = await c.env.DB.prepare(
    "SELECT 1 FROM artworks WHERE class_id = ? AND (image_path = ? OR thumb_path = ? OR timelapse_path = ?) LIMIT 1",
  )
    .bind(classId, path, path, path)
    .first();
  if (!known) return c.json({ error: "not_found" }, 404);
  const obj = await c.env.BUCKET.get(path);
  if (!obj) return c.json({ error: "not_found" }, 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("Cache-Control", "private, max-age=600");
  return new Response(obj.body, { headers });
});

// ══════════════════════ 교사: 도안 배포 ══════════════════════
app.get("/api/classes/:id/assignment", requireTeacher, async (c) => {
  const teacherId = c.get("teacherId");
  const id = c.req.param("id");
  const owned = await c.env.DB.prepare("SELECT id FROM classes WHERE id = ? AND teacher_id = ?")
    .bind(id, teacherId)
    .first();
  if (!owned) return c.json({ error: "not_found" }, 404);
  const a = await c.env.DB.prepare(
    "SELECT id, template_id, title, image, note, created_at FROM assignments WHERE class_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1",
  )
    .bind(id)
    .first();
  return c.json({ assignment: a ?? null });
});

app.put("/api/classes/:id/assignment", requireTeacher, async (c) => {
  const teacherId = c.get("teacherId");
  const id = c.req.param("id");
  const owned = await c.env.DB.prepare("SELECT id FROM classes WHERE id = ? AND teacher_id = ?")
    .bind(id, teacherId)
    .first();
  if (!owned) return c.json({ error: "not_found" }, 404);
  let body: { template_id?: string; title?: string; image?: string; note?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "bad_request" }, 400);
  }
  // 런타임 타입 검증 — 문자열 아닌 값은 .trim()에서 500이 나지 않게 400으로
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const templateId = str(body.template_id).trim().slice(0, 80);
  const title = str(body.title).trim().slice(0, 60);
  const image = str(body.image).trim();
  const note = str(body.note).trim().slice(0, 200);
  if (!templateId || !TEMPLATE_IMAGE_RE.test(image)) return c.json({ error: "bad_request" }, 400);
  const aid = genId();
  // batch = 단일 트랜잭션 — 비활성화와 삽입 사이에 실패해도 "활성 0건" 상태로 남지 않는다
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE assignments SET is_active = 0 WHERE class_id = ?").bind(id),
    c.env.DB.prepare(
      "INSERT INTO assignments (id, class_id, template_id, title, image, note) VALUES (?, ?, ?, ?, ?, ?)",
    ).bind(aid, id, templateId, title, image, note),
  ]);
  return c.json({ id: aid });
});

app.delete("/api/classes/:id/assignment", requireTeacher, async (c) => {
  const teacherId = c.get("teacherId");
  const id = c.req.param("id");
  // 소유권을 UPDATE 조건에 직접 포함(단일 원자 쿼리)
  await c.env.DB.prepare(
    "UPDATE assignments SET is_active = 0 WHERE class_id = ? AND class_id IN (SELECT id FROM classes WHERE teacher_id = ?)",
  )
    .bind(id, teacherId)
    .run();
  return c.json({ ok: true });
});

// ══════════════════════ 학생: 배포된 도안 조회 ══════════════════════
app.get("/api/student/assignment", requireStudent, async (c) => {
  const a = await c.env.DB.prepare(
    "SELECT id, template_id, title, image, note, created_at FROM assignments WHERE class_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1",
  )
    .bind(c.get("studentClassId"))
    .first();
  return c.json({ assignment: a ?? null });
});

// ══════════════════════ 학생: 학급 갤러리(승인작만) ══════════════════════
app.get("/api/student/gallery", requireStudent, async (c) => {
  const classId = c.get("studentClassId");
  const studentId = c.get("studentId");
  // 승인작 전체 + 본인 미승인작(승인 대기 표시용) — /api/student/file의 접근 규칙과 동일 정책
  const { results } = await c.env.DB.prepare(
    `SELECT a.id, a.mode, a.thumb_path, a.image_path, a.like_count, a.created_at, a.is_approved, s.nickname,
            EXISTS(SELECT 1 FROM artwork_likes al WHERE al.artwork_id = a.id AND al.voter_key = ?) AS liked,
            (a.student_id = ?) AS mine
     FROM artworks a JOIN students s ON s.id = a.student_id
     WHERE a.class_id = ? AND (a.is_approved = 1 OR a.student_id = ?)
     ORDER BY a.created_at DESC LIMIT 200`,
  )
    .bind(studentId, studentId, classId, studentId)
    .all<{ liked: number; mine: number; is_approved: number; [k: string]: unknown }>();
  return c.json(
    (results ?? []).map((r) => ({ ...r, liked: !!r.liked, mine: !!r.mine, is_approved: !!r.is_approved })),
  );
});

// 좋아요 토글 — voter_key = studentId(PK 중복 방지), like_count는 원천 재집계로 갱신
app.post("/api/student/artworks/:id/like", requireStudent, async (c) => {
  const classId = c.get("studentClassId");
  const studentId = c.get("studentId");
  const artId = c.req.param("id");
  const art = await c.env.DB.prepare(
    "SELECT id FROM artworks WHERE id = ? AND class_id = ? AND is_approved = 1",
  )
    .bind(artId, classId)
    .first();
  if (!art) return c.json({ error: "not_found" }, 404);
  const existing = await c.env.DB.prepare(
    "SELECT 1 FROM artwork_likes WHERE artwork_id = ? AND voter_key = ?",
  )
    .bind(artId, studentId)
    .first();
  // 쓰기+재집계를 batch(단일 트랜잭션)로 — like_count가 원천과 어긋난 순간이 없게.
  // 동시 더블탭 레이스: 둘 다 INSERT를 타면 한쪽이 PK 충돌 → "이미 좋아요" 상태로 정규화
  // (count는 원천 재집계라 항상 정합, 토글이 좋아요 쪽으로 수렴하는 것은 의도된 완화)
  const recount = c.env.DB.prepare(
    "UPDATE artworks SET like_count = (SELECT COUNT(*) FROM artwork_likes WHERE artwork_id = ?) WHERE id = ?",
  ).bind(artId, artId);
  if (existing) {
    await c.env.DB.batch([
      c.env.DB.prepare("DELETE FROM artwork_likes WHERE artwork_id = ? AND voter_key = ?").bind(artId, studentId),
      recount,
    ]);
  } else {
    try {
      await c.env.DB.batch([
        c.env.DB.prepare("INSERT INTO artwork_likes (artwork_id, voter_key) VALUES (?, ?)").bind(artId, studentId),
        recount,
      ]);
    } catch (e) {
      if (!String(e).includes("UNIQUE")) return c.json({ error: "server" }, 500);
      await recount.run(); // 충돌 시 batch 전체가 롤백되므로 재집계만 별도 수행
    }
  }
  const row = await c.env.DB.prepare("SELECT like_count FROM artworks WHERE id = ?")
    .bind(artId)
    .first<{ like_count: number }>();
  return c.json({ liked: !existing, like_count: row?.like_count ?? 0 });
});

// 학생용 작품 이미지 — 자기 학급 + (승인작 또는 본인 작품)만 스트리밍
app.get("/api/student/file", requireStudent, async (c) => {
  const classId = c.get("studentClassId");
  const studentId = c.get("studentId");
  const path = c.req.query("path") ?? "";
  if (!/^[a-f0-9-]+\/[a-f0-9-]+\/[a-f0-9-]+(\.[a-z]+)+$/i.test(path)) {
    return c.json({ error: "bad_path" }, 400);
  }
  if (path.split("/")[0] !== classId) return c.json({ error: "forbidden" }, 403);
  const known = await c.env.DB.prepare(
    `SELECT 1 FROM artworks
     WHERE class_id = ? AND (image_path = ? OR thumb_path = ? OR timelapse_path = ?)
       AND (is_approved = 1 OR student_id = ?) LIMIT 1`,
  )
    .bind(classId, path, path, path, studentId)
    .first();
  if (!known) return c.json({ error: "not_found" }, 404);
  const obj = await c.env.BUCKET.get(path);
  if (!obj) return c.json({ error: "not_found" }, 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("Cache-Control", "private, max-age=600");
  return new Response(obj.body, { headers });
});

// ══════════════════════ 학생: 학급 입장(join-class 포팅) ══════════════════════
app.post("/api/join", async (c) => {
  const ipHash = await hashIp(clientIp(c));

  let body: { code?: string; nickname?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "bad_request" }, 400);
  }
  const code = (body.code ?? "").toUpperCase().trim();
  const nickname = (body.nickname ?? "").trim();
  if (!CODE_RE.test(code)) return c.json({ error: "invalid_code" }, 400);
  if (nickname.length < 1 || nickname.length > 12) return c.json({ error: "bad_nickname" }, 400);
  if (isBannedNickname(nickname)) return c.json({ error: "bad_nickname" }, 400);

  // rate limit(슬라이딩 윈도우) — 실패 시도(success=0)만 카운트.
  // 교실은 한 공용 IP(NAT) 뒤에서 다수 학생이 정상 입장하므로 성공 join은 제외해야
  // 30명 학급의 9번째부터 차단되는 오작동을 막는다. 브루트포스=코드 오답(success=0)만 제한.
  // 교사 인증 표식(__AUTH__)도 제외해 카운트 분리.
  const since = Date.now() - RATE_WINDOW_MS;
  const rl = await c.env.DB.prepare(
    "SELECT COUNT(*) AS n FROM join_attempts WHERE ip_hash = ? AND code_tried != ? AND success = 0 AND created_at >= ?",
  )
    .bind(ipHash, AUTH_MARKER, since)
    .first<{ n: number }>();
  if ((rl?.n ?? 0) >= RATE_MAX) {
    await c.env.DB.prepare("INSERT INTO join_attempts (ip_hash, code_tried, success) VALUES (?, ?, 0)")
      .bind(ipHash, code)
      .run();
    return c.json({ error: "rate_limited" }, 429);
  }

  // 코드 검증
  const cls = await c.env.DB.prepare("SELECT id, name, is_active, teacher_id FROM classes WHERE code = ?")
    .bind(code)
    .first<{ id: string; name: string; is_active: number; teacher_id: string }>();
  if (!cls || !cls.is_active) {
    await c.env.DB.prepare("INSERT INTO join_attempts (ip_hash, code_tried, success) VALUES (?, ?, 0)")
      .bind(ipHash, code)
      .run();
    return c.json({ error: cls ? "inactive" : "invalid_code" }, 404);
  }

  // 같은 별명 재입장 = 기존 학생 재사용 — 매 입장마다 새 행이 쌓여 "20명 반이 정원 초과"가
  // 나던 버그(2026-07-09 실사용 보고)의 정공법. 토큰(6h) 만료 후 재입장해도 내 작품·좋아요 유지.
  const existing = await c.env.DB.prepare(
    "SELECT id FROM students WHERE class_id = ? AND nickname = ?",
  )
    .bind(cls.id, nickname)
    .first<{ id: string }>();
  let studentId: string;
  if (existing) {
    studentId = existing.id; // 재입장은 정원 검사 없이 항상 허용
  } else {
    // 정원 100 고정 — 요금제 보류(2026-07-09)로 plan 구분 제거. 유료화 부활 시 plan별 cap 복원.
    const cnt = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM students WHERE class_id = ?")
      .bind(cls.id)
      .first<{ n: number }>();
    if ((cnt?.n ?? 0) >= 100) return c.json({ error: "full" }, 409);
    studentId = genId();
    await c.env.DB.prepare("INSERT INTO students (id, class_id, nickname, avatar_seed) VALUES (?, ?, ?, ?)")
      .bind(studentId, cls.id, nickname, genId().slice(0, 8))
      .run();
  }
  await c.env.DB.prepare("INSERT INTO join_attempts (ip_hash, code_tried, success) VALUES (?, ?, 1)")
    .bind(ipHash, code)
    .run();

  const token = await signJwt(
    { sub: studentId, student_id: studentId, class_id: cls.id },
    c.env.STUDENT_JWT_SECRET,
    STUDENT_TTL_SEC,
  );
  return c.json({ token, studentId, classId: cls.id, className: cls.name, nickname });
});

// ══════════════════════ 학생: 작품 제출(submit-artwork 포팅) ══════════════════════
app.post("/api/artwork", async (c) => {
  const auth = c.req.header("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const claims = await verifyJwt<{ student_id: string; class_id: string }>(auth, c.env.STUDENT_JWT_SECRET);
  if (!claims?.student_id || !claims?.class_id) return c.json({ error: "unauthorized" }, 401);

  const form = await c.req.formData();
  const mode = String(form.get("mode") ?? "sketch");
  if (!MODES.includes(mode)) return c.json({ error: "bad_mode" }, 400);
  const image = fileOrNull(form.get("image"));
  const thumb = fileOrNull(form.get("thumb"));
  const timelapse = fileOrNull(form.get("timelapse"));
  if (!image || !thumb) return c.json({ error: "missing_files" }, 400);
  if (image.size > MAX_BYTES || thumb.size > MAX_BYTES) return c.json({ error: "too_large" }, 413);

  // 토큰 위조 이중 방어: 학생이 실제 이 학급 소속인지 + 학급이 열려 있는지 재확인.
  // 승인 게이트 제거(즉시 전시) 후엔 업로드가 곧 공개라, 잠긴 학급으로의 제출을 서버에서 차단
  const student = await c.env.DB.prepare(
    `SELECT s.id, cl.is_active FROM students s JOIN classes cl ON cl.id = s.class_id
     WHERE s.id = ? AND s.class_id = ?`,
  )
    .bind(claims.student_id, claims.class_id)
    .first<{ id: string; is_active: number }>();
  if (!student) return c.json({ error: "unauthorized" }, 401);
  if (!student.is_active) return c.json({ error: "inactive" }, 403);

  // 제출 rate limit(학생당 분당 5점) — 즉시 전시라 스팸이 갤러리를 그대로 덮는다(교차검증 발견).
  // 정상 사용(작품 저장)은 분당 1~2회 수준이라 여유가 크다.
  const recent = await c.env.DB.prepare(
    "SELECT COUNT(*) AS n FROM artworks WHERE student_id = ? AND created_at >= ?",
  )
    .bind(claims.student_id, Date.now() - 60_000)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= 5) return c.json({ error: "rate_limited" }, 429);

  const artId = genId();
  const base = `${claims.class_id}/${claims.student_id}/${artId}`;
  const imagePath = `${base}.png`;
  const thumbPath = `${base}.thumb.webp`;
  let timelapsePath: string | null = null;

  await c.env.BUCKET.put(imagePath, await image.arrayBuffer(), { httpMetadata: { contentType: "image/png" } });
  await c.env.BUCKET.put(thumbPath, await thumb.arrayBuffer(), { httpMetadata: { contentType: "image/webp" } });
  if (timelapse && timelapse.size > 0 && timelapse.size <= MAX_BYTES * 4) {
    timelapsePath = `${base}.webm`;
    await c.env.BUCKET.put(timelapsePath, await timelapse.arrayBuffer(), {
      httpMetadata: { contentType: "video/webm" },
    });
  }

  try {
    // 승인 게이트 비활성(2026-07-09 사용자 결정): 제출 즉시 전시(is_approved=1).
    // 되살리려면 아래 1을 0으로 — 조회(is_approved=1 필터)·PATCH 승인 엔드포인트·교사 UI는 보존됨.
    await c.env.DB.prepare(
      `INSERT INTO artworks (id, class_id, student_id, mode, image_path, thumb_path, timelapse_path, is_approved)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    )
      .bind(artId, claims.class_id, claims.student_id, mode, imagePath, thumbPath, timelapsePath)
      .run();
  } catch (e) {
    // D1 insert 실패 시 방금 올린 R2 객체를 best-effort 정리(orphan 방지)
    const paths = [imagePath, thumbPath, ...(timelapsePath ? [timelapsePath] : [])];
    await Promise.allSettled(paths.map((p) => c.env.BUCKET.delete(p)));
    return c.json({ error: "db" }, 500);
  }

  return c.json({ id: artId });
});

// ══════════════════════ 협동: WebSocket → Durable Object ══════════════════════
app.get("/api/collab/:room", (c) => {
  if (c.req.header("Upgrade")?.toLowerCase() !== "websocket") {
    return c.text("expected websocket", 426);
  }
  const room = c.req.param("room");
  const id = c.env.COLLAB.idFromName(room);
  const stub = c.env.COLLAB.get(id);
  return stub.fetch(c.req.raw);
});

app.all("/api/*", (c) => c.json({ error: "not_found" }, 404));

// ══════════════════════ 만료 작품 정리(Cron Trigger) ══════════════════════
// 매일 실행: created_at 이 보관기간(180일)을 넘긴 작품을 R2·D1에서 영구 삭제.
// 안전 원칙:
//  · cutoff = now − RETENTION_MS 보다 오래된 것만. 더 최신 작품은 절대 건드리지 않는다.
//  · R2 객체 삭제가 성공한 배치만 D1 행을 지운다(깨진 이미지=D1 있는데 R2 없음 방지).
//  · BATCH=90(D1 바인딩 파라미터 상한 100 이내) · 무료 플랜 subrequest(50) 대비 배치당 3개·상한 10.
async function purgeExpiredArtworks(env: Env): Promise<{ deleted: number }> {
  const cutoff = Date.now() - RETENTION_MS;
  const MAX_BATCHES = 10;
  // ⚠️ BATCH는 D1 바인딩 파라미터 상한(쿼리당 100)보다 작아야 한다. DELETE … IN (?×BATCH)가
  // 100을 넘으면 R2는 이미 지운 뒤 D1 삭제가 throw → 깨진 썸네일 orphan + purge 영구정지.
  const BATCH = 90;
  let deleted = 0;

  for (let i = 0; i < MAX_BATCHES; i++) {
    const { results } = await env.DB.prepare(
      "SELECT id, image_path, thumb_path, timelapse_path FROM artworks WHERE created_at < ? LIMIT ?",
    )
      .bind(cutoff, BATCH)
      .all<{ id: string; image_path: string; thumb_path: string; timelapse_path: string | null }>();
    const rows = results ?? [];
    if (rows.length === 0) break;

    // R2 키 수집 + 빈 값 방어(손상 행 하나가 배치 전체를 막는 poison pill 방지)
    const keys = rows
      .flatMap((r) => [r.image_path, r.thumb_path, r.timelapse_path])
      .filter((k): k is string => typeof k === "string" && k.length > 0);
    try {
      await env.BUCKET.delete(keys); // 존재하지 않는 키는 무시(멱등). 실패 시 throw.
    } catch {
      break; // R2 삭제 실패 → 이 배치 D1 삭제 보류(다음 실행 재시도, R2없는데 D1남는 orphan 방지)
    }

    // likes→artworks를 batch()로 원자 삭제(한쪽만 실패해 부분상태 남는 것 방지).
    // FK CASCADE는 D1에서 기본 미보장 → likes 명시 삭제 필수.
    const ids = rows.map((r) => r.id);
    const ph = ids.map(() => "?").join(",");
    const res = await env.DB.batch([
      env.DB.prepare(`DELETE FROM artwork_likes WHERE artwork_id IN (${ph})`).bind(...ids),
      env.DB.prepare(`DELETE FROM artworks WHERE id IN (${ph})`).bind(...ids),
    ]);
    deleted += res[1]?.meta.changes ?? rows.length;
    if (rows.length < BATCH) break;
  }
  return { deleted };
}

export default {
  fetch: app.fetch,
  scheduled: (_controller: ScheduledController, env: Env, ctx: ExecutionContext) => {
    ctx.waitUntil(
      purgeExpiredArtworks(env).then(
        (r) => console.log(`[cron] purged ${r.deleted} expired artworks`),
        (e) => console.error("[cron] purge failed", e),
      ),
    );
  },
} satisfies ExportedHandler<Env>;
