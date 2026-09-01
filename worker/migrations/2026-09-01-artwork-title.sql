-- 작품 제목(2026-09-01) — 학생이 자기 그림에 이름을 붙인다.
-- 배포된 D1에 1회 적용:
--   pnpm wrangler d1 execute arton --remote --file worker/migrations/2026-09-01-artwork-title.sql
-- 재실행 안전: 이미 있으면 "duplicate column name: title" 로 실패하고 데이터는 그대로다.
ALTER TABLE artworks ADD COLUMN title TEXT;
