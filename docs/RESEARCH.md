# ArtON Phase 0 리서치 (2026-07-02)

## 1. perfect-freehand (스트로크 보정)
- `getStroke(points, options)` — points는 `[x,y,pressure]` 튜플 또는 `{x,y,pressure}` 객체. pressure 0~1.
- 반환값 = 스트로크 외곽 폴리곤 점 배열(`[x,y][]`) → Path2D/폴리곤 fill로 렌더.
- 핵심 옵션:
  - `size`(기본 스트로크 지름), `thinning`(-1~1, 필압→굵기 반영도), `smoothing`(0~1), `streamline`(0~1, 손떨림 보정 — **우리 Stabilizer 강도 0~10을 streamline 0~1로 매핑**)
  - `simulatePressure`: true면 속도 기반 필압 시뮬레이션. **실제 펜(pointerType==='pen')이면 false + 실측 pressure, 마우스/터치면 true.**
  - `last`: 스트로크 완결 여부 — 진행 중 스트로크는 false로 호출해 실시간 미리보기.
  - `start/end.taper`: 붓 끝 가늘어짐 — 연필/마커류에 활용.
- 결론: Stabilizer는 자체 구현 불필요. perfect-freehand의 streamline+자체 이동평균(강도 상위 구간)으로 충분.

## 2. Supabase Realtime broadcast (협동 캔버스)
- 최신 문법:
  ```ts
  const ch = supabase.channel(`collab:${roomCode}`, { config: { broadcast: { self: false, ack: false } } })
  ch.on('broadcast', { event: 'stroke' }, ({ payload }) => {...})
    .subscribe(status => { if (status === 'SUBSCRIBED') {...} })
  ch.send({ type: 'broadcast', event: 'stroke', payload })
  ```
- Presence 동봉(같은 채널) → 닉네임 커서 표시에 사용.
- v2.37+ REST broadcast 지원(구독 없이 send) — 서버 사이드 알림에 활용 가능.
- 처리량 주의: 기본 rate limit(초당 메시지 수, 프로젝트 설정 quota) 존재 → **스트로크를 포인트 단위가 아니라 배치(80~120ms 플러시 or 스트로크 종료)로 전송**, Float32Array delta encoding + base64. 6명 방 × 30학급 동시 사용을 견디는 유일한 방법.
- 유실/순서: broadcast는 at-most-once — 스트로크에 `(userId, strokeId, seq)` 붙여 수신측 재조립, 신규 입장자는 최신 스냅샷 PNG(방장 업로드) + 이후 스트로크만 적용.

## 3. Pointer Events (필압/기울기/코얼레스드)
- `pressure`/`tiltX`/`tiltY`: 모던 브라우저 전반 지원(마우스는 pressure 0.5 고정).
- `getCoalescedEvents()`: Chrome/Edge/Firefox 지원, **Safari는 TP 202(2024-08)부터 추가** → 구형 iPad Safari 폴백 필요: 함수 존재 체크 후 없으면 단일 이벤트 사용.
- `pointerrawupdate`: Safari 미지원 → 사용하지 않음(코얼레스드로 충분).
- 크롬북 = Chrome이므로 코얼레스드+필압 완전 지원. `touch-action: none` + `setPointerCapture` 필수.

## 4. WebGL2 물감 혼색 / Kleki(klecks) 아키텍처 학습 (코드 복사 없음)
- klecks: TypeScript, **주 드로잉은 Canvas2D 계열 + WebGL은 필터(blur/curves/distort)에 활용**하는 하이브리드. 브러시 = pen/blend/sketchy/pixel/chemy/smudge/eraser, 필압+stabilizer.
- 시사점: "모든 브러시를 WebGL로" 강제할 필요 없음. **브러시 = 백엔드 독립적인 dab(스탬프) 스트림 생성기**로 설계하고, 렌더 백엔드(WebGL2/Canvas2D)가 dab을 각자 방식으로 래스터화하면 이중 구현 조합 폭발을 피할 수 있음.
- WebGL2 혼색: 확산 시뮬레이션은 blend equation이 아니라 **ping-pong 프레임버퍼 + fragment shader(3x3 이웃 샘플)**가 정석. wetMap을 half-float 텍스처 2장으로 ping-pong.

## 5. PWA: next-pwa → Serwist로 대체 (설계도 편차 #1)
- 원조 `next-pwa`는 유지보수 중단. Next.js 15 App Router 권장 조합 = **`@serwist/next`**(next-pwa 후계) 또는 Next 공식 가이드(수동 SW).
- 결정: `@serwist/next` 채택 — precache manifest 주입/sw 빌드 자동화, App Router 완전 호환. 기능(오프라인 캔버스)은 설계도 그대로.
- 출처: [Serwist 공식](https://serwist.pages.dev/docs/next/getting-started), [Next.js PWA 가이드](https://nextjs.org/docs/app/guides/progressive-web-apps), [비교 글](https://javascript.plainenglish.io/building-a-progressive-web-app-pwa-in-next-js-with-serwist-next-pwa-successor-94e05cb418d7)

## 6. 크롬북 저사양 폴백 전략
- 감지: `canvas.getContext('webgl2')` null / `WEBGL_debug_renderer_info`의 SwiftShader(소프트웨어 렌더러) 문자열 → Canvas2D 백엔드 선택.
- 런타임 강등: WebGL 컨텍스트 로스트 2회 → Canvas2D로 핫스왑(레이어 비트맵은 ImageBitmap으로 이관).
- Canvas2D 모드 기능 차이: 수채 확산 생략(multiply 반투명), 유화 heightmap 라이팅 생략(스트릭 텍스처만), 글로우는 shadowBlur로 근사. UI 표기는 하지 않고 자연스럽게 동작.
- wetMap 해상도 = 캔버스 1/2(설계도 준수), 확산은 rAF당 2회 → 60fps 예산 내(1024×768 캔버스 기준 wetMap 512×384, 셀 오토마타 shader 1패스 ≈ 0.2ms급).

## 7. iwart(Coloria) 프로젝트 이관 교훈 (도안 100장 양산에 직결)
- codex $imagegen: `-m gpt-5.5 -c 'model_reasoning_effort="low"'`(minimal은 API 400), spawn 풀 conc 3 + stagger, 8분 SIGKILL + killed 재시도 1회 캡, `--skip-existing` 재개 멱등성, 한도(5h 윈도우 ~260~310장) 시 exit 감지 → progress 저장.
- 라인아트 품질: 프롬프트에 "MEDIUM-THICK outlines, no dashed lines(motion trail·lane marker 포함), 눈동자 필수, smooth anti-aliased, no posterize" — 점선·빈눈동자는 소스 결함이라 후처리로 못 고침.
- 후처리: sharp 리사이즈 + 임계값 정리(설계도) + **동시성 혼입 대비 md5/dhash 중복 검출** 필수.
- 게이트: `~/.claude/bin/img_gate.py --coloring`(검은선 과소/과다·솔리드채움·유채색 검출) 재활용.
