# ArtON 설계 7way 교차검수 종합 (2026-07-02)

검증자: Tier-0 없음(설계 문서라 코드 게이트 비대상) · Qwen+DeepSeek(local) · codex gpt-5.5 · Gemini(agy) · code-reviewer(Claude 구조). 종합·오탐 필터 = 메인(Opus 4.8).
4계열 전원 판정 **REQUEST_CHANGES**. 아래는 메인이 원문 대조로 확정한 결과.

## A. 채택 — 설계 재작성 필요 (CRITICAL, 다계열 수렴)

### A1. 학생 익명 인증 모델 재작성 (codex 3·4, local 2, gemini RLS)
"anon key + 학급코드 RPC로만 학생 쓰기"는 문장만으론 성립 불가. **확정 설계:**
- 학생 테이블 직접 INSERT 권한을 anon/authenticated 모두 revoke.
- Edge Function `join-class`(SECURITY DEFINER 성격): 코드 검증 → students row → **커스텀 JWT 발급**(claim: `role=student, class_id, student_id, room?`). Supabase가 검증 가능한 JWT(프로젝트 JWT secret 서명).
- 이후 모든 학생 쓰기(작품 제출)는 `submit-artwork` Edge Function 경유(서버가 JWT claim의 class_id/student_id를 직접 삽입 — 클라이언트 값 신뢰 안 함). artworks 테이블 직접 INSERT는 RLS로 차단.
- artworks SELECT RLS: `class_id`가 (교사 소유 OR 요청 JWT의 class_id)일 때만. `WITH CHECK`로 위조 차단.

### A2. 학급코드 브루트포스 방어 (codex 1, local 1, gemini)
- 코드 문자셋 = 혼동문자 제외 31자 × 6 = ~8.9억(이미 `class-code.ts` 반영).
- `join-class` EF에 rate limit: IP+deviceId 기준 슬라이딩 윈도우(예 분당 8회, 초과 시 지수 백오프). 실패 카운터는 Postgres `join_attempts` 테이블.
- 코드 회전: 교사가 언제든 재발급(is_active=false → 신규 코드). 수업 종료 후 코드 비활성 권장 UX.

### A3. Realtime 협동 채널 권한 (codex 5·WARNING, gemini Realtime)
- Broadcast는 DB RLS 우회 → **Supabase Realtime Authorization(RLS on `realtime.messages`)** 사용: `collab:{room}` 토픽 접근을 학생 JWT의 `room` claim과 일치할 때만 허용.
- 처리량: Free 100msg/s·Pro 500msg/s 한계 → **스트로크 배치 전송**(80~120ms 플러시, Float32 delta+base64, RESEARCH §2 반영). 6명×배치면 방당 ~50msg/s 이내.
- 악성 스트림 방어: 수신측이 좌표 범위·초당 이벤트 상한 검증 후 렌더, 초과 시 해당 sender 드롭.

### A4. 성능 목표 현실화 (codex 6·7, local 5)
- 60fps는 **적응형**: rAF 예산 초과 감지 시 자동으로 (a) 수채 확산 2회→1회, (b) wetMap 해상도 1/2→1/3, (c) 프레임 스킵으로 강등. 목표는 "저사양에서 30fps 이상 + 지연<40ms 유지".
- undo 메모리: **픽셀 전체 스냅샷 아님**. Command 패턴 + 레이어별 256px **더티 타일** 스냅샷만 보관(ARCHITECTURE 반영). 8레이어 50단계라도 실제 변경 타일만 → 수백MB 이내.

### A5. 결제: 구독 흐름 재작성 (codex 8·9, gemini 시장)
- 원 설계의 "환경변수 없으면 무료모드"(feature flag)는 유지 — 기본 배포는 결제 OFF.
- 결제 ON일 때 **올바른 흐름 준비**(코드/스키마 골격만, 실제 승인은 사업자 심사 후):
  - 월 구독 = 토스 **빌링키(자동결제)** 흐름(단건 위젯 아님). `subscriptions` 테이블 + `payments`(orderId UNIQUE, status 전이).
  - **웹훅** 엔드포인트에서 서버 검증 후에만 plan='pro' 승격(리다이렉트 성공만으로 승격 금지).
  - **멱등성**: 토스 Idempotency-Key + orderId UNIQUE + runTransaction check-and-set(financial-saas 룰 준수).
- 한국 시장(gemini): 교사 개인카드 자동결제 행정 부담 → 랜딩/요금제에 "학교 예산(S2B) 문의" 경로 안내. **결제는 기본 비활성**이라 파일럿·무료 채택엔 영향 없음.

### A6. 아동 안전 강화 (gemini 아동 3건)
- 닉네임: 자동 추천(동물+색깔) 기본 + **금칙어 필터**(입력 시 클라 1차 + submit EF 2차). 실명/개인정보 자동추천으로 유도해 최소화.
- 협동 캔버스: **방장(교사) 제어** — 학생 강퇴(kick), 캔버스 전체 지우기, 방 잠금. presence로 참여자 목록 노출.
- 갤러리 승인제 유지(교사 승인 전 비공개). 협동 결과물도 방장이 저장 시점에 검토.

## B. 채택 — 스키마/구조 보강 (HIGH, code-reviewer)

- **collab_rooms**(cr 4): `code` UNIQUE 추가, `host_teacher_id` 추가, `expires_at` + `closed_at` 추가(만료 정리). 클린업은 만료 조회로.
- **artwork_likes junction**(cr 7): `artworks.likes` int 단독 → `artwork_likes(artwork_id, voter_key, created_at)` UNIQUE(artwork_id, voter_key)로 중복 방지 + `artworks.like_count` 캐시(트리거 or 앱 increment).
- **templates CHECK**(cr 6): `CHECK ((is_builtin AND owner_id IS NULL) OR (NOT is_builtin AND owner_id IS NOT NULL))`.
- **엔진↔React 브리지**(cr 5, local 3): `ArtEngine`이 이벤트 이미터(`on/emit`) 노출 → Zustand 스토어가 구독해 리렌더. History는 엔진 소유, UI/제스처/단축키는 `engine.undo()/redo()` 호출. 협동 undo = **자기 스트로크만**(원격 스트로크는 로컬 History에 안 쌓임 — ARCHITECTURE 반영).
- **BrushBase 확장**(cr 2): 5필드로 부족 → `BrushConfig`(tip/spacing/flow/jitter/sizePressure/alphaPressure/composite/carriesWater/dynamicHue…)로 확장 완료(구현됨). 이질 파라미터(물양·heightmap)는 dab의 `water` 필드 + 백엔드 시뮬이 처리.
- **additive 블렌드 불일치**(cr 2): LayerStack 블렌드는 normal/multiply/screen/overlay 유지. Glow의 additive는 **레이어 블렌드가 아니라 dab composite(`lighter`)** — 스펙 명확화(별개 레이어).
- **Phase 순서 모순**(cr 1): Phase 3 UI가 Phase 5 아이콘 의존 → **도구/스탬프 아이콘은 이모지·인라인 SVG로 선(先) 구현**(구현됨), Phase 5의 생성 에셋(도안·붓돌이·히어로)은 UI 블로커 아님. 절대규칙 위반 해소.

## C. 폴백/기술 스택 확정

- **PWA**: next-pwa → `@serwist/next`(RESEARCH §5, codex WARNING 일치).
- **폰트 self-host**(gemini): 교육청 방화벽 CDN 차단 대비 → Jua/Pretendard를 `next/font`(Jua) + Pretendard **로컬 self-host 폴백** 병행. (현재 CDN 우선 + 시스템 폰트 폴백 체인 확보됨.)
- **Tailwind 4**(codex WARNING): `@import "tailwindcss"` + `@tailwindcss/postcss`(v4 방식) — 이미 준수.
- **WebGL2 폴백 명세화**(cr 3, local, gemini): 백엔드 독립 dab + `BackendCaps` 플래그로 처리(ARCHITECTURE 반영). Canvas2D는 caps.wetSim=false/heightmap=false → 확산·라이팅 생략, 나머지 동일.

## D. 오탐/기각 (원문 대조)

- **"undo 스냅샷 메모리 폭증"을 CRITICAL로**(local Qwen): BLUEPRINT는 "Command 패턴"(:70) 명시 — 순수 픽셀 스냅샷 전제는 오독. 단 명세 강화는 채택(A4).
- **"perfect-freehand 필압 미지원"**(local Qwen): 오탐. `[x,y,pressure]` + `simulatePressure:false`로 지원 확인(codex CONFIRMED, RESEARCH §1).
- **"Free 도안30 vs 생성100장 모순"을 CRITICAL로**(local): 모순 아님 — "총 생성량 100" vs "플랜별 접근권 30/100". HIGH→해소(요금제 문구로 명시).
- **DeepSeek의 "Firestore/금융 SaaS rules 파일" 인용**: 환각(이 프로젝트에 없음). 취약점 자체(브루트포스)는 실재라 A2로 채택, 인용 출처만 폐기.
- **"개인정보 제로"가 과장**(codex NIT, gemini): 교사 이메일·닉네임·작품·접속로그는 관리 대상. → 문구를 "학생 **개인정보** 최소 수집(이름·이메일 등 미수집)"으로 정정. 채택(문구).

## E. PLAN.md 편차 추가 반영
1. next-pwa→@serwist/next (기존)
2. 작업 디렉토리 (기존)
3. 학생 인증 = 커스텀 JWT + Edge Function 경유 쓰기(A1)
4. 성능 = 적응형 30~60fps + 더티타일 undo(A4)
5. 결제 = 빌링키 자동결제 + 웹훅 + 멱등성, 기본 비활성(A5)
6. 아동 안전 = 금칙어 필터 + 방장 제어(A6)
7. 스키마 보강 = collab_rooms/artwork_likes/templates CHECK(B)
