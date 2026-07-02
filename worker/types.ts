// Worker 바인딩 타입. wrangler.jsonc의 바인딩과 1:1 대응.
export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  COLLAB: DurableObjectNamespace;
  // 시크릿(로컬은 .dev.vars, 원격은 `wrangler secret put`)
  SESSION_SECRET: string;       // 교사 세션 쿠키 서명
  STUDENT_JWT_SECRET: string;   // 학생 토큰 서명
}
