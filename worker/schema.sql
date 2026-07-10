-- ArtON D1(SQLite) 스키마 — Supabase Postgres(0001_init.sql) 포팅.
-- 변경점: uuid→text(Worker crypto.randomUUID), timestamptz→integer(unix ms),
--         boolean→integer(0/1), RLS/정책/트리거/pgcrypto 제거(권한은 Worker가 강제),
--         teachers는 auth.users FK 대신 password_hash/salt 자체 인증, templates 테이블 생략(정적 매니페스트 사용).
-- created_at 기본값 = unixepoch()*1000 (ms). 앱 코드(Date.now())와 단위 일치.

PRAGMA foreign_keys = ON;

-- ── 교사 (이메일+비밀번호 자체 인증) ──
CREATE TABLE IF NOT EXISTS teachers (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL DEFAULT '선생님',
  plan          TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro')),
  password_hash TEXT NOT NULL,           -- PBKDF2 파생키(base64)
  password_salt TEXT NOT NULL,           -- 랜덤 salt(base64)
  agreed_at     INTEGER,                 -- 개인정보 수집·이용 동의 시각(ms). PIPA 동의 입증용.
  created_at    INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
-- 이미 배포된 DB: `wrangler d1 execute arton --remote --command "ALTER TABLE teachers ADD COLUMN agreed_at INTEGER"` — 2026-07-10 원격 적용 완료.

-- ── 학급 ──
CREATE TABLE IF NOT EXISTS classes (
  id         TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT '우리 반',
  code       TEXT NOT NULL UNIQUE,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS classes_teacher_idx ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS classes_code_idx ON classes(code) WHERE is_active = 1;

-- ── 학생(개인정보 없음: 닉네임/아바타 시드만) ──
CREATE TABLE IF NOT EXISTS students (
  id          TEXT PRIMARY KEY,
  class_id    TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  nickname    TEXT NOT NULL,
  avatar_seed TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS students_class_idx ON students(class_id);

-- ── 작품 ──
CREATE TABLE IF NOT EXISTS artworks (
  id             TEXT PRIMARY KEY,
  class_id       TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id     TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  mode           TEXT NOT NULL DEFAULT 'sketch',
  image_path     TEXT NOT NULL,
  thumb_path     TEXT NOT NULL,
  timelapse_path TEXT,
  -- 승인 게이트 비활성(2026-07-09): 제출 즉시 전시라 DEFAULT 1. 게이트를 되살리면 0으로.
  -- ⚠️ 이미 배포된 DB에 is_approved=0 행이 있다면 `UPDATE artworks SET is_approved=1` 1회 필요
  --    (학생 갤러리 WHERE is_approved=1 필터에 영구 은닉되고 승인 UI도 제거됨 — 교차검증 발견)
  is_approved    INTEGER NOT NULL DEFAULT 1,
  like_count     INTEGER NOT NULL DEFAULT 0,   -- 캐시(원천은 artwork_likes)
  created_at     INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS artworks_class_idx ON artworks(class_id);
CREATE INDEX IF NOT EXISTS artworks_approved_idx ON artworks(class_id, is_approved);
-- 만료 정리 cron(WHERE created_at < ?)·삭제 임박 집계 스캔용
CREATE INDEX IF NOT EXISTS artworks_created_idx ON artworks(created_at);

-- ── 좋아요(중복 방지) ──
CREATE TABLE IF NOT EXISTS artwork_likes (
  artwork_id TEXT NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  voter_key  TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  PRIMARY KEY (artwork_id, voter_key)
);

-- ── 협동 방(unique code + host + 만료) ──
CREATE TABLE IF NOT EXISTS collab_rooms (
  id              TEXT PRIMARY KEY,
  class_id        TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  host_teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  code            TEXT NOT NULL UNIQUE,
  max_users       INTEGER NOT NULL DEFAULT 6,
  is_locked       INTEGER NOT NULL DEFAULT 0,
  expires_at      INTEGER NOT NULL DEFAULT ((unixepoch() + 21600) * 1000),  -- +6h
  closed_at       INTEGER,
  created_at      INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS collab_rooms_code_idx ON collab_rooms(code) WHERE closed_at IS NULL;

-- ── 도안 배포(과제): 학급당 활성 1건 — 새 배포 시 이전 것을 비활성화 ──
CREATE TABLE IF NOT EXISTS assignments (
  id          TEXT PRIMARY KEY,
  class_id    TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  image       TEXT NOT NULL,               -- /templates/... 정적 도안 경로(Worker가 검증)
  note        TEXT NOT NULL DEFAULT '',
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS assignments_class_idx ON assignments(class_id, is_active);

-- ── 학급코드 브루트포스 방어: join 시도 기록 ──
CREATE TABLE IF NOT EXISTS join_attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash    TEXT NOT NULL,
  code_tried TEXT NOT NULL,
  success    INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS join_attempts_ip_idx ON join_attempts(ip_hash, created_at DESC);

-- ── 구독/결제(빌링키 자동결제 골격, 기본 비활성) ──
CREATE TABLE IF NOT EXISTS subscriptions (
  id                 TEXT PRIMARY KEY,
  teacher_id         TEXT NOT NULL UNIQUE REFERENCES teachers(id) ON DELETE CASCADE,
  status             TEXT NOT NULL DEFAULT 'none' CHECK (status IN ('none','active','past_due','canceled')),
  billing_key        TEXT,
  current_period_end INTEGER,
  created_at         INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at         INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS payments (
  id              TEXT PRIMARY KEY,
  teacher_id      TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  order_id        TEXT NOT NULL UNIQUE,        -- 멱등성
  payment_key     TEXT UNIQUE,
  amount          INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','failed','canceled')),
  idempotency_key TEXT UNIQUE,
  created_at      INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS payments_teacher_idx ON payments(teacher_id);
