# ArtON 구현 플랜 (EPCT)

체크리스트 — 각 Phase 완료 시 체크. 중대 영역(인증·DB·결제)은 7way 교차검증(수정 전/후).

- [x] Phase 0: EXPLORE — docs/RESEARCH.md, docs/ARCHITECTURE.md
- [ ] 7way 설계 검수(수정 전 전수조사) → docs/DESIGN-REVIEW.md 반영
- [ ] Phase 1: 골격+디자인 시스템 — Next.js 15/TS strict/Tailwind 4, 토큰, 라우트 스켈레톤, 폰트
- [ ] Phase 2: 브러시 엔진 — core/input/brushes/tools/export 전체, 백엔드 독립 dab 설계
- [ ] Phase 3: 캔버스 UI — 도구막대/모드탭/팔레트/레이어/반응형/저학년 모드
- [ ] Phase 4: 백엔드 — 스키마+RLS, join-class EF, 대시보드, QR, 갤러리 승인, PDF, 요금제(토스 flag)
- [ ] Phase 5: 에셋 — **도안은 iwart(Coloria) 재활용**(1101장 완성본, scripts/iwart-category-map.json 매핑 → templates seed + Storage 업로드, 자체 생성 불필요). 붓돌이/도구아이콘/스탬프/히어로는 iwart에 없음 → 인라인 SVG·이모지 우선, 마스코트만 소량 생성 여지
- [ ] Phase 6: 특화 — 무비모드, 협동 캔버스, 도안 업로드 라인아트화, 도형스냅/대칭 UI, PWA(Serwist), 접근성
- [ ] Phase 7: TEST — Vitest 80%+, Playwright E2E 5, 시각 QA 2회+, Lighthouse 90+, build/tsc 클린
- [ ] 7way 수정 후 재검증(코드 전체) + preflight-gate 통과
- [ ] Phase 8: 배포 — supabase push, vercel --prod, README, .env.example, 최종 보고

## 설계도 편차 기록 (승인된 근거 있는 변경만)
1. `next-pwa` → `@serwist/next` (원조 미유지보수, Next 15 App Router 표준 후계 — RESEARCH.md §5)
2. 디렉토리 `~/projects/arton` → `/Users/iw-lab/Documents/dev/iwdraw` (세션 작업 디렉토리)
3. (7way 검수 결과 반영분은 DESIGN-REVIEW.md에 추가)
4. Phase 5 도안 자체 생성 → **iwart(Coloria) 1101장 재활용**(사용자 지시 2026-07-02). png=색칠 캔버스 라인아트, webp=썸네일, svg=인쇄용. 매핑 scripts/iwart-category-map.json
