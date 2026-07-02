# 🎨 아트온 (ArtON)

**학교 수업에 딱 맞춘 디지털 스케치 & 색칠 웹앱** — EasyEdu 제품군(수업ON의 형제 브랜드).

설치도 로그인도 없이 **누구나 바로** 그리고 색칠할 수 있습니다. 진짜 물감처럼 번지는 수채화,
두께가 느껴지는 유화, 저작권 걱정 없는 자체 제작 도안 1,000여 장, 학생 개인정보 제로 수집.

---

## ✨ 핵심 기능

| 영역 | 내용 |
|---|---|
| **게스트 우선** | 로그인·설치 없이 그리기·색칠·무비·사진→도안 전부 사용 |
| **브러시 엔진** | WebGL2 + Canvas2D 폴백. 연필·크레용·마커·수채·유화·에어브러시·오일파스텔·글로우·무지개·지우개·페인트통 12종 |
| **수채/유화** | wetMap 셀 오토마타 확산(수채), heightmap 임파스토(유화). 저사양 기기는 자연 다운그레이드 |
| **색칠 모드** | 도안 1,100장(카테고리·난이도 필터). 페인트통이 선 밖으로 안 나가는 경계 잠금 |
| **적응형 캔버스** | 도안 비율에 맞춰 캔버스 방향 자동(세로 도안=세로 캔버스). 폰·크롬북 모두 자연스럽게 |
| **무비 모드** | 그려지는 과정 재생 + WebM 다운로드 |
| **협동 캔버스** | 최대 6명 실시간 함께 그리기(닉네임 커서, 방장 강퇴/잠금) |
| **사진→도안** | 내 사진을 Sobel 엣지 라인아트로 변환해 색칠(클라이언트 처리, 백엔드 불필요) |
| **교사 대시보드** | 매직링크 로그인, 학급 코드/QR, 작품 승인, A4 작품집 인쇄 |
| **PWA** | Serwist 서비스 워커, 오프라인 캔버스, IndexedDB 자동저장·복구 |
| **접근성** | 키보드 단축키(B/E/Z…), aria-label, 색약 친화 팔레트, 저학년 모드 |

## 🧱 기술 스택

Next.js 15 (App Router) · TypeScript strict · Tailwind CSS 4 · Zustand · perfect-freehand ·
Supabase(Postgres+Auth+Storage+Realtime) · Serwist(PWA) · Vitest · Playwright · Vercel

## 🚀 로컬 실행

```bash
pnpm install
pnpm dev            # http://localhost:3000 (게스트 모드로 바로 동작)
```

환경변수 없이도 그리기·색칠·무비·사진→도안이 전부 동작합니다.
교사 로그인·협동·작품 제출을 켜려면 `.env.example`을 `.env.local`로 복사해 Supabase 값을 채우세요.

```bash
pnpm build          # 프로덕션 빌드(SW 생성)
pnpm test           # 단위 테스트 (Vitest)
pnpm test:e2e       # E2E (Playwright)
pnpm typecheck      # tsc --noEmit
```

## 🔑 환경변수

| 변수 | 필요 시점 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | 교사 기능·협동·제출 |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function(서버 전용) |
| `SUPABASE_JWT_SECRET` | 학생 커스텀 JWT 서명(Edge Function secret) |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` / `TOSS_SECRET_KEY` | Pro 결제(없으면 "결제 준비 중") |

전부 비어 있어도 **게스트 모드로 완전히 동작**합니다.

## 🗄️ 백엔드 설정 (선택 — 교사 기능용)

```bash
supabase link --project-ref <ref>
supabase db push                                  # 0001_init.sql + 0002_storage.sql
supabase functions deploy join-class submit-artwork
supabase secrets set SUPABASE_JWT_SECRET=<프로젝트 JWT Secret>
```

- 학생 인증: `join-class` Edge Function이 학급 코드 검증 후 **커스텀 JWT** 발급. 브루트포스 방어(IP 해시 rate limit).
- 작품 제출: `submit-artwork`가 JWT claim의 `class_id`/`student_id`로 직접 삽입(클라이언트 값 미신뢰) → 위조 차단.
- RLS: 교사는 자기 학급만, 학생은 자기 학급의 승인작·본인작만. artworks 직접 쓰기는 전면 차단.

## 🎨 도안 에셋

색칠 도안은 자매 프로젝트 **iwart(Coloria)**의 자체 제작 라인아트 1,100장을 정적 이관해 제공합니다
(저작권 100% 자유). 갱신:

```bash
node scripts/import-iwart-templates.mjs   # public/templates/ + manifest.json 생성
node scripts/gen-icons.mjs                # 파비콘/PWA/OG 아이콘
```

## 📦 배포 (Vercel)

```bash
vercel --prod
```

`public/templates`(약 107MB webp)가 정적 자산으로 함께 배포됩니다. 트래픽·용량이 커지면
Supabase Storage `templates` 버킷으로 이전할 수 있습니다(0002_storage.sql).

## 👩‍🏫 교사용 1분 사용법

1. **교사 시작하기** → 이메일로 로그인 링크 받기
2. **학급 만들기** → 6자리 코드 + QR 자동 생성
3. **📺 큰 화면으로 보여주기** → 전자칠판에 코드/QR 띄우기
4. 학생은 코드 입력(또는 QR) → 닉네임 → 바로 그리기
5. **🖼️ 갤러리**에서 작품 **전시 승인** → **🖨️ 작품집 인쇄**(A4)

## 📄 문서

- `docs/BLUEPRINT.md` — 원본 설계
- `docs/RESEARCH.md` · `docs/ARCHITECTURE.md` — Phase 0 산출물
- `docs/DESIGN-REVIEW.md` — 7way 교차검수 종합
- `docs/PLAN.md` — 진행 체크리스트

---

© 2026 EasyEdu · 아트온 ArtON — 모든 도안은 자체 제작
