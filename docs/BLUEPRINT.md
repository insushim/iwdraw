# 🎨 아트온 (ArtON) — 초등 교실용 디지털 스케치 & 색칠 웹앱 설계도 v1.0

> 이 문서는 사용자가 제시한 원본 설계도(프롬프트)를 그대로 고정한 것이다.
> 7way 교차 검수의 대상이며, 검수 결과는 docs/DESIGN-REVIEW.md 에 기록한다.
> 구현 디렉토리: /Users/iw-lab/Documents/dev/iwdraw (원문 ~/projects/arton 은 세션 작업 디렉토리로 대체)

**절대 규칙:**
1. 목업/플레이스홀더/더미/TODO 주석 절대 금지. 모든 기능은 실제로 동작해야 한다.
2. 모든 파일은 끝까지 완성한다. "// 나머지는 비슷하게" 같은 생략 금지.
3. 각 Phase 완료 시 실제로 실행/테스트해서 통과를 확인한 후 다음 Phase로 넘어간다.
4. 에러가 나면 즉시 수정하고, 3회 이상 같은 에러 반복 시 접근 방식을 바꾼다.
5. 전체 진행은 EPCT(Explore→Plan→Code→Test), 각 Phase 내부도 EPCT로 진행한다.
6. 필요한 CLI/패키지는 물어보지 말고 자동 설치한다.

## 0. 프로젝트 정체성

- **앱 이름:** 아트온 (ArtON) — 영문 로고 `ArtON`, 한글 병기 `아트온`
- **태그라인:** "학교 수업에 딱 맞춘 디지털 미술 놀이터"
- **브랜드:** EasyEdu (선행 심선생) 제품군. 수업ON과 형제 브랜드.
- **타깃:** 초등 교사(관리자) + 초등학생(사용자, 태블릿/크롬북/PC)
- **핵심 가치:** ① 설치·로그인 없이 학급 코드로 즉시 참여 ② 진짜 물감처럼 번지는 수채/유화 ③ 저작권 100% 자체 제작 도안 ④ 학생 개인정보 제로 수집

### 벤치마킹 반영 기능 (13개 앱 교차 검증)
| 출처 | 반영 기능 |
|---|---|
| Kleki | WebGL2 렌더링, 레이어 8장+블렌드모드, 스트로크 안정화(stabilizer), 대칭 그리기, 브라우저 자동저장(IndexedDB), 필압 |
| Adobe Fresco / Rebelle | 수채화 wet-on-wet 번짐, 유화 임파스토(두께감) 시뮬레이션 |
| Tayasui Sketches | 연필·크레용·마커·수채붓·유화붓·에어브러시·오일파스텔 등 12종 도구, 아이 친화 UI |
| Procreate | QuickShape(1초 홀드 시 도형 보정), 타임랩스 자동 녹화, 두 손가락 탭=undo, 세 손가락 탭=redo |
| AutoDraw | 손그림 도형 스냅 (원/사각/직선/별/하트) |
| Kids Doodle | 무비 모드(내 그림 그려지는 과정 재생), 글로우/네온/무지개 브러시 |
| Kakadoo | 색칠 모드에서 윤곽선 경계 잠금(선 밖으로 안 삐져나감) |
| Aggie.io | 모둠 협동 캔버스(실시간, 최대 6명) |
| Sketchpad | 크롬북/태블릿 최적화, 스탬프(클립아트) |
| 아트봉봉스쿨(구조만) | 수채/유화/색칠 3모드, 3단계 흐름, 도안 업로드, 학급 코드, 갤러리 |

## 1. 기술 스택 (고정)

```
Frontend   : Next.js 15 (App Router) + TypeScript strict + Tailwind CSS 4
Canvas     : WebGL2 커스텀 브러시 엔진 + Canvas2D 폴백 + perfect-freehand(스트로크 보정)
State      : Zustand
Backend    : Supabase (Postgres + Auth + Storage + Realtime)
결제       : 토스페이먼츠 (교사 Pro 플랜) — 환경변수 없으면 자동 비활성(무료모드)
PWA        : next-pwa (오프라인 캔버스 지원)
배포       : Vercel
테스트     : Vitest(단위) + Playwright(E2E)
이미지생성 : codex-imagegen-bridge 스킬 → gpt-image-2 (도안/에셋 전량 자체 생성)
```

## 2. Phase 0 — EXPLORE
1. 리서치를 `docs/RESEARCH.md`에 정리: perfect-freehand 최신 API, Supabase Realtime broadcast 최신 문법, Pointer Events pressure/tilt 지원 현황, WebGL2 blend equation 물감 혼색(Kleki/klecks 아키텍처만 학습, 코드 복사 금지)
2. 크롬북 저사양 GPU에서 WebGL2 실패 시 Canvas2D 폴백 전략 수립
3. `docs/ARCHITECTURE.md`에 mermaid 다이어그램과 함께 기록

## 3. Phase 0.5 — PLAN
`docs/PLAN.md`에 Phase 1~8 체크리스트, 매 Phase 완료 시 체크

## 4. Phase 1 — 프로젝트 골격 + 디자인 시스템
- pnpm create next-app (TS, Tailwind, App Router, src-dir) + zustand perfect-freehand @supabase/supabase-js @supabase/ssr nanoid + vitest playwright
- 디자인: "따뜻한 미술실" — 크림 `#FBF7F0`, 코랄 `#FF7A59`, 하늘 `#5BB8F5`, 잎사귀 `#7BC96F`, 잉크 `#2D2A26`
- 폰트: 제목 Jua(구글폰트), 본문 Pretendard Variable(CDN)
- 둥근 모서리 20px, 부드러운 그림자, 눌림 scale 0.96, 최소 터치 타깃 48px, 아이콘에 한글 레이블 병기, 다크모드 불필요
- 라우트: `/`(랜딩) `/join`(코드 6자리→닉네임 자동추천 동물+색깔) `/draw`(sketch|watercolor|oil|coloring) `/draw?room=XXXXXX`(협동) `/gallery/[classCode]` `/teacher`(대시보드) `/teacher/class`(코드/QR) `/teacher/templates` `/teacher/gallery`(승인/PDF) `/pricing`

## 5. Phase 2 — 브러시 엔진 (핵심, src/engine/ 프레임워크 독립 TS 모듈)
```
engine/
├── core/     CanvasManager(WebGL2+Canvas2D 폴백 자동감지), LayerStack(8장, normal|multiply|screen|overlay),
│             History(Command 패턴 undo/redo 50단계 스트로크 단위), StrokeRecorder(타임랩스용 좌표+시간+도구),
│             AutoSave(IndexedDB 5초 디바운스+복구)
├── input/    PointerHandler(pressure, coalesced events), Gestures(핀치줌/팬, 2손가락탭=undo, 3손가락탭=redo),
│             Stabilizer(perfect-freehand, 강도 0~10)
├── brushes/  BrushBase{size,opacity,color,spacing,jitter}, Pencil(종이결 노이즈+필압), Crayon(입자 스탬프),
│             Marker(반투명 multiply), ★WatercolorBrush(wet-map 오프스크린, 프레임당 2회 셀 오토마타 확산,
│             edge darkening, 물양 슬라이더), ★OilBrush(heightmap 임파스토, bristle 스트릭, smudge pickup 30%),
│             Airbrush(가우시안), OilPastel(뭉개짐+혼색), GlowBrush(additive), RainbowBrush(hue 회전),
│             Eraser(레이어별), FillTool(scanline flood fill, tolerance 32, 색칠모드 라인아트 경계 잠금)
├── tools/    QuickShape(800ms 홀드→원/직선/사각/삼각/별/하트), Symmetry(세로/가로/4방), StampTool(40종), TextTool(Jua)
└── export/   PngExporter(투명/배경, 1x/2x), TimelapseExporter(WebM MediaRecorder), PrintSheet(A4 이름표 포함)
```
수채화 세부: wetMap(R=물양,G=안료농도) 해상도/2, rAF마다 3x3 커널 확산(물 많을수록↑), 5초 wet→dry, 물뿌리개(재확산),
WebGL2 미지원 시 확산 생략 multiply 다운그레이드(UI에 표시 없이 자연스럽게).
성능 기준: 크롬북(4GB) 60fps, 스트로크 지연 <40ms, performance.now() 계측 포함.

## 6. Phase 3 — 캔버스 UI
- 좌측 세로 도구 막대(실물 그림 아이콘), 상단 모드 탭(스케치✏️/수채화💧/유화🎨/색칠하기🖍️)+색칠 3단계 표시
- 우측 플로팅: undo/redo/전체지우기(2단계 확인)/대칭/레이어 패널(접이식)
- 색상: 기본 24색+HSV 피커+스포이드+최근 8색. 브러시 크기 슬라이더+실시간 미리보기 원
- 768px 이하 도구막대 하단 이동. 저학년 모드 토글(도구 6개, 아이콘 1.5배)

## 7. Phase 4 — 백엔드 (Supabase)
스키마(0001_init.sql, RLS 전부):
```sql
teachers(id=auth.uid, email, name, plan default 'free', created_at)
classes(id, teacher_id FK, name, code char(6) unique, is_active, created_at)
students(id, class_id FK, nickname, avatar_seed, created_at)  -- 개인정보 없음
artworks(id, class_id, student_id, mode, image_path, thumb_path, timelapse_path,
         is_approved default false, likes, created_at)
templates(id, owner_id nullable, category, title, image_path, is_builtin)
collab_rooms(id, class_id, code char(6), max_users default 6, created_at)
```
- RLS: 교사 자기 학급만, 학생은 anon key+class code 검증 RPC로만 쓰기
- Storage: artworks(비공개 signed URL), templates(공개 읽기)
- Realtime: `collab:{room_code}` broadcast 스트로크 중계(Float32 delta encoding 압축)
- Edge Function `join-class`: 코드 검증+학생 row 생성+세션 토큰 발급
- 교사 대시보드: 매직링크 로그인, 학급 생성→6자리 코드+QR(전자칠판 대형 모드), 갤러리 승인/반려, 작품집 A4 격자 PDF, 협동 방 개설
- 요금제: Free(학급1, 학생30, 도안30) / Pro 월 4,900원(학급5, 도안100, 타임랩스, 협동). 토스페이먼츠 결제위젯, `NEXT_PUBLIC_TOSS_CLIENT_KEY` 없으면 "출시 준비 중" 배지+버튼 비활성(feature flag)

## 8. Phase 5 — 콘텐츠 에셋 전량 자체 생성 (외부 다운로드 금지)
1. 마스코트 "붓돌이"(붓 캐릭터): character-bible-keeper 바이블 → 기본/웃음/그리는중/축하 4포즈
2. 색칠 도안 100장: "clean black lineart coloring page for children, white background, thick outlines, no text"
   - 동물20, 계절·행사20, 교과연계20(태극기/한반도/한옥/한복/태양계/식물한살이/물의순환/안전표지판/교통수단/직업10), 판타지20, 만다라·패턴20(3단계)
   - sharp 1600px 리사이즈+흑백 임계값 정리+썸네일 400px → templates seed
   - Codex 한도 초과 시 assets/progress.json 저장+사용자 알림 후 정지(폴백 금지)
3. 도구 아이콘 14종 + 스탬프 40종 + 랜딩 히어로 3장
4. 파비콘/OG/PWA 아이콘(512/192/apple-touch)

## 9. Phase 6 — 특화 기능
1. 무비 모드(StrokeRecorder 재생 1x/2x/4x + WebM 다운로드)
2. 협동 캔버스(방 코드→닉네임 커서→실시간 동기화→방장이 갤러리 저장)
3. 도안 업로드(교사 이미지→sharp 그레이스케일→adaptive threshold 라인아트화)
4. AutoDraw식 도형 스냅+대칭 UI 연결
5. PWA: 오프라인 스케치, 온라인 복귀 시 업로드 큐
6. 접근성: 키보드 단축키(B/E/Z...), aria-label, 색약 친화 팔레트

## 10. Phase 7 — TEST
1. Vitest: flood fill 경계, History undo/redo, delta encoding, wetMap 확산 — 커버리지 80%+
2. Playwright E2E 5개: 학생 입장→수채→저장→갤러리 / 교사 가입→학급→QR→승인→PDF / 색칠 경계 잠금 픽셀 검증 / 협동 2 컨텍스트 상호 표시 / 오프라인→복귀 업로드
3. 시각 QA: 스크린샷(랜딩/캔버스 4모드/대시보드/갤러리, 데스크톱+태블릿) Read로 보고 수정, 최소 2회
4. Lighthouse 90+ (Performance/A11y), 스트로크 지연 계측
5. pnpm build 무경고 + tsc --noEmit 통과

## 11. Phase 8 — 배포
1. supabase link + db push(프로젝트 없으면 생성 안내 후 대기)
2. vercel --prod + 환경변수
3. README.md: 스크린샷, 로컬 실행법, 환경변수 표, 교사용 설명 1페이지
4. 최종 보고: 체크리스트+URL+남은 수동 작업(도메인, 토스 심사)

## 12. 환경변수
```env
NEXT_PUBLIC_SUPABASE_URL=          # 필수
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # 필수
SUPABASE_SERVICE_ROLE_KEY=         # 필수(서버 전용)
VERCEL_TOKEN=                      # 선택
NEXT_PUBLIC_TOSS_CLIENT_KEY=       # 선택(없으면 무료모드)
TOSS_SECRET_KEY=                   # 선택
# 이미지 생성: codex CLI 세션 사용, API 키 불필요
```
