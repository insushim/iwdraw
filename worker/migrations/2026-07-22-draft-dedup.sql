-- 2026-07-22 · dedup(draft_id upsert) + 제출 rate limit 카운터
--
-- ⚠️ 이 마이그레이션을 적용하지 않고 배포하면 /api/artwork 제출이 전부 실패한다
--    (schema.sql의 CREATE TABLE IF NOT EXISTS는 기존 테이블에 열을 추가하지 않고,
--     package.json의 cf:deploy도 마이그레이션을 실행하지 않는다).
--
-- 적용:
--   wrangler d1 execute arton --remote --file worker/migrations/2026-07-22-draft-dedup.sql
-- 로컬 확인:
--   wrangler d1 execute arton --local --file worker/migrations/2026-07-22-draft-dedup.sql
--
-- 순서 주의: 워커 배포 *전에* 적용해야 한다(새 코드가 이 열을 즉시 읽는다).
-- 구 워커는 이 열들을 모르지만 NULL 허용이라 그대로 동작한다 → 무중단 순서는 DB 먼저.

-- 같은 그림 재저장을 식별하는 익명 토큰(작품 id 아님). NULL = 구버전 클라/단발 제출.
ALTER TABLE artworks ADD COLUMN draft_id TEXT;

-- 동시 요청(더블탭·재시도)에도 행이 둘로 갈라지지 않도록 UNIQUE.
-- SQLite는 NULL을 서로 다른 값으로 취급하므로 draft_id NULL인 기존 행들은 영향 없음.
CREATE UNIQUE INDEX IF NOT EXISTS artworks_student_draft_idx ON artworks(student_id, draft_id);

-- 제출 rate limit(60초 슬라이딩 윈도) 카운터. 덮어쓰기까지 포함해 총 쓰기 시도를 센다.
ALTER TABLE students ADD COLUMN write_window_start INTEGER;
ALTER TABLE students ADD COLUMN write_count INTEGER;
