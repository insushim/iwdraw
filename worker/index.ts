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
  const { results } = await c.env.DB.prepare(
    `SELECT c.id, c.name, c.code, c.is_active, c.created_at, COUNT(s.id) AS student_count
     FROM classes c LEFT JOIN students s ON s.class_id = c.id
     WHERE c.teacher_id = ?
     GROUP BY c.id ORDER BY c.created_at DESC`,
  )
    .bind(teacherId)
    .all<{ id: string; name: string; code: string; is_active: number; created_at: number; student_count: number }>();
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
    .all<{ is_approved: number; [k: string]: unknown }>();
  return c.json((results ?? []).map((r) => ({ ...r, is_approved: !!r.is_approved })));
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

  // 정원(Free 30 / Pro 200)
  const teacher = await c.env.DB.prepare("SELECT plan FROM teachers WHERE id = ?")
    .bind(cls.teacher_id)
    .first<{ plan: string }>();
  const cap = teacher?.plan === "pro" ? 200 : 30;
  const cnt = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM students WHERE class_id = ?")
    .bind(cls.id)
    .first<{ n: number }>();
  if ((cnt?.n ?? 0) >= cap) return c.json({ error: "full" }, 409);

  // 학생 생성
  const studentId = genId();
  await c.env.DB.prepare("INSERT INTO students (id, class_id, nickname, avatar_seed) VALUES (?, ?, ?, ?)")
    .bind(studentId, cls.id, nickname, genId().slice(0, 8))
    .run();
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

  // 토큰 위조 이중 방어: 학생이 실제 이 학급 소속인지 재확인
  const student = await c.env.DB.prepare("SELECT id FROM students WHERE id = ? AND class_id = ?")
    .bind(claims.student_id, claims.class_id)
    .first();
  if (!student) return c.json({ error: "unauthorized" }, 401);

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
    await c.env.DB.prepare(
      `INSERT INTO artworks (id, class_id, student_id, mode, image_path, thumb_path, timelapse_path, is_approved)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
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

export default app;
