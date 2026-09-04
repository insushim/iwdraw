-- join_attempts 정리(cron)가 created_at 단독 범위로 지운다.
-- 기존 인덱스는 (ip_hash, created_at DESC) 라 선행 컬럼이 없는 이 조건에는 못 쓰인다
-- → 매일 풀스캔. 테이블이 커질수록 cron 이 느려지고 D1 읽기 과금이 늘어난다.
CREATE INDEX IF NOT EXISTS join_attempts_created_idx ON join_attempts(created_at);
