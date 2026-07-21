/*
 * 사진 → 색칠 도안(라인아트) 변환 — 클라이언트(Canvas)에서 처리. 백엔드 불필요.
 * 그레이스케일 → Sobel 엣지 → 적응형 임계값 → 검은 윤곽선/흰 배경.
 * (설계도 Phase 6.3의 sharp adaptive threshold를 브라우저에서 재현)
 */
export async function photoToLineart(
  file: File | Blob,
  maxSize = 1536, // 표시 캔버스(1536)와 1:1 — 1200이면 업스케일되며 선이 지글거렸다(2026-07-21)
): Promise<Blob> {
  const img = await blobToImage(file);
  /* 검출 해상도 — 작은 입력은 업스케일(캡 3배)해서 검출한다. 네이티브 검출은 작은 글씨의
   * 획 간격(2~3px)이 이중 능선 병합(dilate1, 3px)에 통째로 합쳐져 글자가 뭉개졌다
   * (2026-07-21 사용자 실측: '쁨'의 ㅃ이 한 덩어리). 업스케일하면 간격이 벌어져 획이
   * 분리된다. 부작용(JPEG 노이즈 블록도 같이 커져 잔점 폭증 — 업스케일 무보정 시 성분
   * 5→129 실측)은 아래 노이즈 임계값들을 up(배율)에 비례 스케일해 상쇄한다(노이즈 면적은
   * up²로 커지므로 MIN_KEEP은 up², 거리·길이류는 up 비례). */
  const scale = Math.min(3, maxSize / Math.max(img.width, img.height));
  const up = Math.max(1, scale); // 검출 업스케일 배율(임계값 스케일링용)
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const src = document.createElement("canvas");
  src.width = w;
  src.height = h;
  const sctx = src.getContext("2d", { willReadFrequently: true })!;
  sctx.drawImage(img, 0, 0, w, h);
  const data = sctx.getImageData(0, 0, w, h);
  const px = data.data;

  // 0) 그레이스케일 + 채도 + "이미 도안"(선 작업물) 감지
  const gray = new Float32Array(w * h);
  const satArr = new Float32Array(w * h);
  const whiteMask = new Uint8Array(w * h);
  let whiteish = 0;
  let darkLine = 0;
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    const r = px[p], g = px[p + 1], b = px[p + 2];
    gray[i] = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
    const mx = Math.max(r, g, b);
    const sat = mx === 0 ? 0 : (mx - Math.min(r, g, b)) / mx;
    satArr[i] = sat;
    if (gray[i] > 0.88 && sat < 0.12) {
      whiteish++;
      whiteMask[i] = 1;
    }
    if (gray[i] < 0.45 && sat < 0.3) darkLine++;
  }
  const whiteFrac = whiteish / gray.length;
  const darkFrac = darkLine / gray.length;

  // 흰 배경 근처(반경 2)의 유채색 픽셀 = "컬러 선" 구조 증거(로고·클립아트).
  // 색칠된 도안의 색 영역은 검은 선에 갇혀 있어 흰 배경과 거의 안 닿는다 — 이 차이로 구분.
  // 반경 1이면 안티앨리어싱 밴드(1px 중간톤)에 가려 인접 판정이 절반쯤 새서 경계값이 된다(실측).
  let coloredEdge = 0;
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const i = y * w + x;
      if (satArr[i] < 0.3 || gray[i] >= 0.92) continue;
      let nearWhite = 0;
      for (let dy = -2; dy <= 2 && !nearWhite; dy++) {
        const row = i + dy * w;
        for (let dx = -2; dx <= 2; dx++) {
          if (whiteMask[row + dx]) {
            nearWhite = 1;
            break;
          }
        }
      }
      coloredEdge += nearWhite;
    }
  }
  const coloredEdgeFrac = coloredEdge / gray.length;

  // "이미 도안" 경로는 어두운 무채색 선이 컬러 선 구조를 지배할 때만 —
  // 컬러 선 로고(레알마드리드 등)를 '색칠된 도안'으로 오판해 유채색 선을
  // 통째로 지우고 점선만 남기던 버그(2026-07-07 실사용 보고) 방지.
  if (whiteFrac > 0.5 && darkFrac > 0.003 && darkFrac < 0.25 && darkFrac > coloredEdgeFrac * 1.2) {
    // ── 이미 도안(흰 배경+검은 선, 색칠 포함 가능) → 엣지 검출 대신 어두운 무채색만 유지.
    // Sobel을 다시 돌리면 선 양쪽에 이중 윤곽이 생겨 선이 진해지고 두꺼워진다
    // ("다시 선따기 하니 더 진해짐" 2026-07-07 사용자 실측) — 이 경로는 멱등.
    // 유채색(색칠)은 흰색으로 → 깨끗한 새 도안이 된다.
    // 작은 입력은 업스케일(캡 4배)해 표시 캔버스(1536)의 비트맵 확대 자글거림을 막는다 —
    // drawImage 보간이 만든 부드러운 경계에 아래 연속 램프가 그대로 먹어 AA가 유지된다.
    const us = Math.min(4, maxSize / Math.max(img.width, img.height));
    const uw = us > 1 ? Math.max(1, Math.round(img.width * us)) : w;
    const uh = us > 1 ? Math.max(1, Math.round(img.height * us)) : h;
    const uc = document.createElement("canvas");
    uc.width = uw;
    uc.height = uh;
    const uctx = uc.getContext("2d", { willReadFrequently: true })!;
    uctx.drawImage(img, 0, 0, uw, uh);
    const uData = uctx.getImageData(0, 0, uw, uh);
    const ud = uData.data; // (외부 스코프의 검출 배율 up과 혼동 금지)
    for (let i = 0, p = 0; i < uw * uh; i++, p += 4) {
      const r = ud[p], g = ud[p + 1], b = ud[p + 2];
      const luma = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      const mx = Math.max(r, g, b);
      const sat = mx === 0 ? 0 : (mx - Math.min(r, g, b)) / mx;
      // 어둡고(≤0.62) 채도 낮은(선) 픽셀만 잉크로 — 임계 부근은 부드럽게
      const t = (0.62 - luma) / 0.14;
      const ink = sat < 0.3 ? Math.max(0, Math.min(1, t)) : 0;
      const v = Math.round(255 * (1 - ink));
      ud[p] = v;
      ud[p + 1] = v;
      ud[p + 2] = v;
      ud[p + 3] = 255;
    }
    uctx.putImageData(uData, 0, 0);
    return canvasToBlob(uc);
  }

  /* 0.5) 그래픽(플랫 컬러) 경로 — 카드·로고·굵은 글씨(2026-07-21 사용자 "글씨는 글씨대로
   * 따주면 안되나"). 색이 몇 가지 평면으로 이뤄진 이미지는 엣지 검출(Sobel→골격) 대신
   * 색 영역의 경계(실제 색이 바뀌는 금)를 그대로 따라 긋는다 — 글자·로고가 원형 그대로
   * 보존된다(엣지+골격 경로는 작은 글씨의 획을 뭉갬: '쁨'의 ㅃ 실측). 사진(그라데이션·
   * 질감)은 게이트를 통과하지 못해 아래 Sobel 경로로 간다. */
  // 그래픽 판정·추적도 업스케일(캡3) 캔버스에서 — 보간 AA 램프(업스케일 시 6~9px)는
  // tryGraphicContours의 팔레트 전이색 제거가 흡수한다(램프 픽셀이 인접 순색으로 갈라져
  // 경계가 램프 중앙에 매끈하게 선다). 네이티브 검출은 격자가 거칠어 DP·스무딩(×K)에서
  // 글자가 뒤틀렸다(2026-07-21 실측).
  const graphicPolys = tryGraphicContours(px, w, h);
  if (graphicPolys) {
    const K = maxSize / Math.max(img.width, img.height) / scale;
    const outW = Math.max(1, Math.round(w * K));
    const outH = Math.max(1, Math.round(h * K));
    const dst = document.createElement("canvas");
    dst.width = outW;
    dst.height = outH;
    const dctx = dst.getContext("2d")!;
    dctx.fillStyle = "#ffffff";
    dctx.fillRect(0, 0, outW, outH);
    dctx.strokeStyle = "#1a1a1a";
    dctx.lineWidth = 4.5;
    dctx.lineCap = "round";
    dctx.lineJoin = "round";
    for (const poly of graphicPolys) {
      // 잔부스러기 필터 — 단 양끝이 교차점에 붙은 이음새 체인은 짧아도 지우면 구멍이 난다
      if (poly.endJunctions < 2 && polyLength(poly.pts) < 8 * up) continue;
      // 작은 닫힌 고리(글자 속 구멍: ㅁ·ㅂ의 속, ㅐ의 틈)는 기본 굵기(4.5px)가 안쪽 흰
      // 공간을 삼켜 뭉개 보인다('쁨'의 ㅁ 실측) — 가는 선(3px)으로 긋고 스무딩도 1패스만
      // 해서 모양·구멍을 지킨다. 큰 윤곽은 기존 그대로.
      let bw = 0, bh = 0;
      if (poly.closed) {
        let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
        for (let k = 0; k < poly.pts.length; k += 2) {
          if (poly.pts[k] < minx) minx = poly.pts[k];
          if (poly.pts[k] > maxx) maxx = poly.pts[k];
          if (poly.pts[k + 1] < miny) miny = poly.pts[k + 1];
          if (poly.pts[k + 1] > maxy) maxy = poly.pts[k + 1];
        }
        bw = (maxx - minx) * K;
        bh = (maxy - miny) * K;
      }
      const smallLoop = poly.closed && Math.max(bw, bh) < 36; // 출력px 기준(ㅁ 속·ㅐ 틈 포켓까지, 글자 획 윤곽 60px+는 미해당)
      const pre = smallLoop
        ? smoothPts(poly.pts, true)
        : smoothPts(smoothPts(poly.pts, poly.closed), poly.closed);
      const simp = simplifyDP(pre, (smallLoop ? 0.8 : 1.1) * Math.max(1, Math.min(2, K * 0.6)));
      dctx.lineWidth = smallLoop ? 3 : 4.5;
      dctx.beginPath();
      drawSmoothPath(dctx, simp, poly.closed, K);
      dctx.stroke();
    }
    return canvasToBlob(dst);
  }

  // 1) 약한 블러(노이즈 억제) — 사진 경로
  const blurred = boxBlur(gray, w, h, 1);
  const coarse = boxBlur(gray, w, h, 3); // 굵은 윤곽용(2스케일)
  const satBlur = boxBlur(satArr, w, h, 1); // 채도 채널 — 노랑/금색은 luma 대비가 거의 없다

  /* 2) Sobel 엣지 — 미세(r1) + 굵은 윤곽(r3) + 채도 3채널 결합(선따기 강화).
   * 흰 배경 위 노랑(luma Δ≈0.11)은 밝기 엣지가 안 잡혀 점선이 되던 것을 채도 엣지로 보완.
   * 강도뿐 아니라 방향(gx,gy)도 남긴다 — 다음 단계의 비최대 억제(선 가늘게)에 필요. */
  const edge = new Float32Array(w * h);
  const dirX = new Float32Array(w * h);
  const dirY = new Float32Array(w * h);
  const sobelXY = (f: Float32Array, i: number): [number, number] => [
    -f[i - w - 1] - 2 * f[i - 1] - f[i + w - 1] + f[i - w + 1] + 2 * f[i + 1] + f[i + w + 1],
    -f[i - w - 1] - 2 * f[i - w] - f[i - w + 1] + f[i + w - 1] + 2 * f[i + w] + f[i + w + 1],
  ];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const chans: [number, number, number][] = [];
      for (const [f, k] of [
        [blurred, 1],
        [coarse, 1.15],
        [satBlur, 0.9],
      ] as [Float32Array, number][]) {
        const [gx, gy] = sobelXY(f, i);
        chans.push([Math.hypot(gx, gy) * k, gx, gy]);
      }
      let best = chans[0];
      for (const c of chans) if (c[0] > best[0]) best = c;
      edge[i] = best[0];
      dirX[i] = best[1];
      dirY[i] = best[2];
    }
  }

  /* 3) 비최대 억제(NMS) — 엣지 강도의 "산등성이"만 남긴다.
   * 블러(r3) Sobel은 폭 10px가 넘는 그라데이션 띠를 만든다: 그대로 임계값을 씌우면
   * 선이 통째로 굵어진다(2026-07-14 실측: 선 폭 중앙값 16px). 기울기 방향으로 이웃 두
   * 픽셀보다 강한 픽셀만 남기면 선이 1px 능선으로 가늘어진다. */
  const thin = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const m = edge[i];
      if (m <= 0) continue;
      const ax = Math.abs(dirX[i]);
      const ay = Math.abs(dirY[i]);
      let a: number, b: number;
      if (ax >= ay * 2.414) {
        a = edge[i - 1];
        b = edge[i + 1]; // 수평 기울기 → 세로선
      } else if (ay >= ax * 2.414) {
        a = edge[i - w];
        b = edge[i + w]; // 수직 기울기 → 가로선
      } else if (dirX[i] * dirY[i] > 0) {
        a = edge[i - w - 1];
        b = edge[i + w + 1];
      } else {
        a = edge[i - w + 1];
        b = edge[i + w - 1];
      }
      if (m >= a && m >= b) thin[i] = m;
    }
  }

  /* 4) 이력(히스테리시스) 임계값 — 강한 선은 무조건 살리고, 약한 선은 강한 선에 이어져
   * 있을 때만 살린다. 단일 임계값이면 얇게 만들수록 선이 끊긴다("끊기면 안 돼" 요청). */
  let mean = 0;
  for (let i = 0; i < edge.length; i++) mean += edge[i];
  mean /= edge.length;
  let variance = 0;
  for (let i = 0; i < edge.length; i++) variance += (edge[i] - mean) ** 2;
  const std = Math.sqrt(variance / edge.length);
  const hi = mean + std * 0.9;
  const lo = mean + std * 0.2;

  const keep = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let i = 0; i < thin.length; i++) {
    if (thin[i] >= hi) {
      keep[i] = 1;
      stack.push(i);
    }
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w;
    const y = (i / w) | 0;
    if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue;
    for (const d of [-w - 1, -w, -w + 1, -1, 1, w - 1, w, w + 1]) {
      const j = i + d;
      if (!keep[j] && thin[j] >= lo) {
        keep[j] = 1;
        stack.push(j);
      }
    }
  }

  /* 4.5) 위성 능선 제거(2026-07-21) — JPEG 링잉·2스케일 혼합이 주 엣지와 8~12px
   * 나란히 달리는 유령 능선(주 엣지의 10~30% 강도)을 만든다(원 재현: 호 안쪽 평행선).
   * 각 능선 픽셀에서 기울기 방향(선의 수직) ±12px 안에 자기보다 3배+ 강한 능선이 있으면
   * 위성으로 보고 지운다 — 진짜 인접 이중 구조(가는 획의 양쪽 엣지 등)는 강도가 비슷해
   * 살아남는다. */
  {
    const SAT_R = Math.round(12 * up); // 링잉 거리도 업스케일에 비례
    const SAT_RATIO = 3;
    const kill: number[] = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (!keep[i]) continue;
        const m = thin[i];
        const L = Math.hypot(dirX[i], dirY[i]) || 1;
        const ux = dirX[i] / L;
        const uy = dirY[i] / L;
        for (let s = -SAT_R; s <= SAT_R; s++) {
          if (s >= -2 && s <= 2) continue; // 자기 자신·바로 옆(NMS가 이미 처리)
          const nx = Math.round(x + ux * s);
          const ny = Math.round(y + uy * s);
          if (nx < 1 || ny < 1 || nx >= w - 1 || ny >= h - 1) continue;
          const j = ny * w + nx;
          if (keep[j] && thin[j] > m * SAT_RATIO) {
            kill.push(i);
            break;
          }
        }
      }
    }
    for (const i of kill) keep[i] = 0;
  }

  /* 5) 미세 노이즈 제거(정교화, 2026-07-21) — 그라데이션·질감에서 새는 고립된 짧은
   * 조각(8이웃 연결 성분 < MIN_KEEP px)을 지운다. 실제 윤곽선은 수백 px 성분이라 안전하고,
   * 잔점·티끌이 사라져 도안이 깔끔해진다. size가 임계에 닿으면 추적 종료(메모리·속도 가드). */
  const MIN_KEEP = Math.round(10 * up * up); // 노이즈 블록 면적은 up²로 커진다
  const compSeen = new Uint8Array(w * h);
  const cstack: number[] = [];
  for (let s = 0; s < keep.length; s++) {
    if (!keep[s] || compSeen[s]) continue;
    cstack.length = 0;
    cstack.push(s);
    compSeen[s] = 1;
    const small: number[] = [s];
    let size = 1;
    while (cstack.length) {
      const i = cstack.pop()!;
      const x = i % w;
      const y = (i / w) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx;
          if (keep[j] && !compSeen[j]) {
            compSeen[j] = 1;
            cstack.push(j);
            size++;
            if (size < MIN_KEEP) small.push(j);
          }
        }
      }
    }
    if (size < MIN_KEEP) for (const m of small) keep[m] = 0;
  }

  /* 5.5) 이중 능선 병합 + 골격화(2026-07-21) — NMS가 블러 스케일 차이로 3px 안짝의
   * 평행 이중 능선을 만들면(완만한 각도 엣지에서 실측) 그대로 골격화 시 두 줄이 남아
   * 선이 덩어리진다. 한 겹 팽창으로 근접 능선을 한 띠로 합친 뒤 Zhang-Suen으로 1px
   * 중심선을 깎는다. */
  dilate1(keep, w, h);
  thinZhangSuen(keep, w, h);

  /* 6) 벡터 재획화(2026-07-21 근본 개선) — 골격(1px)을 폴리라인으로 추출해 출력
   * 캔버스(입력 크기와 무관하게 항상 ≈maxSize)에 고정 굵기·둥근 캡으로 다시 긋는다.
   * 왜 래스터 bake(팽창+블러+재임계)를 버렸나(자글자글 5회 재발의 결론):
   *  ① 방향 의존 — 8이웃 팽창은 대각선 획의 수직 두께가 3/√2≈2.1px로 얇아져
   *     같은 그림에서 굵기가 ±30% 출렁였다(원 테스트 각도별 2.83~4px 실측).
   *  ② 완만한 각도의 계단(주기 수px)은 블러 r1로 녹지 않는다.
   *  ③ 작은 입력이 업스케일 없이 그대로 나가 표시에서 비트맵 확대됐다.
   * 벡터 스트로크는 굵기가 정의상 어디서나 동일하고, 캔버스 래스터라이저의 AA가
   * 모든 각도에서 매끈하다. Douglas-Peucker + 2차 곡선 스무딩이 골격의 계단을 편다. */
  const polys = traceSkeleton(keep, w, h);
  // K = 출력px/검출px. 검출이 3배 캡에 걸린 극소 입력(최대변 <512px)만 K>1
  // (예: 300px 입력 → 검출 900, K≈1.7), 그 외엔 검출 해상도 = 출력 해상도(K=1).
  // 폴리라인 좌표만 K배 하고 스트로크 굵기는 출력 기준 고정이라 K가 커도 선은 균일
  // (지터 증폭은 아래 smoothPts+DP eps 확대가 상쇄, eps 배율은 2배 캡으로 자체 포화).
  const K = maxSize / Math.max(img.width, img.height) / scale;
  const outW = Math.max(1, Math.round(w * K));
  const outH = Math.max(1, Math.round(h * K));
  const dst = document.createElement("canvas");
  dst.width = outW;
  dst.height = outH;
  const dctx = dst.getContext("2d")!;
  dctx.fillStyle = "#ffffff";
  dctx.fillRect(0, 0, outW, outH);
  dctx.strokeStyle = "#1a1a1a";
  dctx.lineWidth = 4.5; // 출력(1536) 기준 고정 굵기 — 입력 크기와 무관하게 균일
  dctx.lineCap = "round";
  dctx.lineJoin = "round";
  const MIN_ISOLATED = Math.round(12 * up); // px(검출) — 양끝이 자유단인 고립 조각(잔점) 버림
  const MIN_SPUR = Math.round(7 * up); // px(검출) — 접합부에서 삐져나온 짧은 수염 버림

  /* 유령 조각 필터 — JPEG 링잉·이중 엣지 잔재는 "진짜 선 곁(≤6px)을 따라 붙은 짧은
   * 조각"으로 나타난다(원 재현: 원둘레에 붙은 8~30px 틱들). 긴 선(≥48px)의 점을 격자에
   * 넣고, 짧은 조각의 점 70%+가 긴 선 6px 안이면 버린다 — 외따로 있는 작은 디테일
   * (눈동자·점 등)은 긴 선과 안 붙어 있어 살아남는다. */
  const GHOST_LEN = Math.round(64 * up);
  const GHOST_DIST = 6 * up;
  const CELL = Math.max(8, Math.ceil(GHOST_DIST) + 2); // 3×3 셀 탐색이 GHOST_DIST 반경을 덮으려면 CELL ≥ GHOST_DIST
  const anchor = new Map<number, number[]>();
  for (const poly of polys) {
    if (polyLength(poly.pts) < GHOST_LEN) continue;
    for (let k = 0; k < poly.pts.length; k += 2) {
      const key = ((poly.pts[k + 1] / CELL) | 0) * 8192 + ((poly.pts[k] / CELL) | 0);
      let arr = anchor.get(key);
      if (!arr) anchor.set(key, (arr = []));
      arr.push(poly.pts[k], poly.pts[k + 1]);
    }
  }
  const nearAnchor = (x: number, y: number): boolean => {
    const cx = (x / CELL) | 0;
    const cy = (y / CELL) | 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const arr = anchor.get((cy + dy) * 8192 + (cx + dx));
        if (!arr) continue;
        for (let k = 0; k < arr.length; k += 2) {
          const ddx = arr[k] - x;
          const ddy = arr[k + 1] - y;
          if (ddx * ddx + ddy * ddy <= GHOST_DIST * GHOST_DIST) return true;
        }
      }
    }
    return false;
  };

  for (const poly of polys) {
    const len = polyLength(poly.pts);
    if (poly.closed) {
      if (len < 16 * up) continue; // 노이즈 고리
    } else if (poly.endJunctions === 0) {
      if (len < MIN_ISOLATED) continue;
    } else if (poly.endJunctions === 1) {
      if (len < MIN_SPUR) continue;
    }
    // 양끝이 접합부인 조각은 두 선을 잇는 구조 연결선 — 유령 판정 제외(지우면 선이 끊긴다)
    if (len < GHOST_LEN && poly.endJunctions <= 1 && !poly.closed) {
      // 접합부/끝점 부근(양끝 2점)은 어차피 본선과 가깝므로 판정에서 제외
      const n = poly.pts.length / 2;
      const from = n > 6 ? 2 : 0;
      const to = n > 6 ? n - 2 : n;
      let near = 0;
      for (let k = from; k < to; k++) if (nearAnchor(poly.pts[k * 2], poly.pts[k * 2 + 1])) near++;
      if (to > from && near / (to - from) >= 0.7) continue; // 긴 선의 유령 — 버림
    } else if (len < GHOST_LEN && poly.closed) {
      let near = 0;
      const n = poly.pts.length / 2;
      for (let k = 0; k < poly.pts.length; k += 2) if (nearAnchor(poly.pts[k], poly.pts[k + 1])) near++;
      if (near / n >= 0.7) continue; // 긴 선에 붙은 작은 유령 고리
    }
    // 업스케일 렌더(K>1.5)는 검출 골격의 ±1px 지터가 K배 증폭돼 보인다 —
    // 이동평균 1패스로 지터를 반감하고 DP 허용오차도 K에 비례해 키운다(캡 2배).
    const pre = K > 1.5 ? smoothPts(poly.pts, poly.closed) : poly.pts;
    const simp = simplifyDP(pre, 1.25 * Math.max(1, Math.min(2, K * 0.6)));
    dctx.beginPath();
    drawSmoothPath(dctx, simp, poly.closed, K);
    dctx.stroke();
  }
  return canvasToBlob(dst);
}

function canvasToBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("변환 실패"))), "image/webp", 0.9);
  });
}

/* Zhang-Suen 세선화 — 이진 선 마스크(1=선)를 8연결 1px 중심선으로 깎는다(in-place).
 * 이후 고정 폭 확장이 균일한 선을 만든다. 반복은 변화 없을 때까지(가드 60회). */
function thinZhangSuen(m: Uint8Array, w: number, h: number): void {
  let changed = true;
  let guard = 0;
  const rm: number[] = [];
  while (changed && guard++ < 60) {
    changed = false;
    for (let step = 0; step < 2; step++) {
      rm.length = 0;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          if (!m[i]) continue;
          const p2 = m[i - w], p3 = m[i - w + 1], p4 = m[i + 1], p5 = m[i + w + 1];
          const p6 = m[i + w], p7 = m[i + w - 1], p8 = m[i - 1], p9 = m[i - w - 1];
          const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (b < 2 || b > 6) continue;
          const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
          let a = 0;
          for (let k = 0; k < 8; k++) if (seq[k] === 0 && seq[k + 1] === 1) a++;
          if (a !== 1) continue;
          if (step === 0) {
            if (p2 * p4 * p6 !== 0 || p4 * p6 * p8 !== 0) continue;
          } else {
            if (p2 * p4 * p8 !== 0 || p2 * p6 * p8 !== 0) continue;
          }
          rm.push(i);
        }
      }
      if (rm.length) {
        changed = true;
        for (const i of rm) m[i] = 0;
      }
    }
  }
}

/* 8이웃 한 겹 팽창(in-place) — 3px 안짝 평행 이중 능선을 한 띠로 병합해
 * 골격화가 단일 중심선을 내게 한다. */
function dilate1(m: Uint8Array, w: number, h: number): void {
  const src = m.slice();
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (src[i]) continue;
      if (
        src[i - w - 1] || src[i - w] || src[i - w + 1] || src[i - 1] ||
        src[i + 1] || src[i + w - 1] || src[i + w] || src[i + w + 1]
      )
        m[i] = 1;
    }
  }
}

interface SkeletonPoly {
  pts: number[]; // [x0,y0,x1,y1,…] 검출 좌표
  closed: boolean;
  endJunctions: number; // 열린 체인의 양끝 중 접합부(차수≥3)에 붙은 끝 수(0~2)
}

/* 1px 골격 → 폴리라인 추출. 노드(차수≠2)에서 출발해 차수-2 체인을 걷고,
 * 남은 차수-2 픽셀은 순수 고리(원 등)로 추적한다.
 * ⚠️ 전제조건(불변식): m의 최외곽 1px 테두리는 항상 0이어야 한다 — N8 오프셋이 1차원
 * 배열이라 테두리에 값이 있으면 행 래핑으로 반대쪽 끝을 이웃으로 오인한다. 현재 파이프라인
 * (NMS·히스테리시스·dilate1·thinZhangSuen)은 전부 [1,h-2]×[1,w-2] 내부만 쓰므로 성립.
 * 업스트림 단계를 고칠 때 이 불변식을 깨지 말 것. */
function traceSkeleton(m: Uint8Array, w: number, h: number): SkeletonPoly[] {
  const N8 = [-w - 1, -w, -w + 1, -1, 1, w - 1, w, w + 1];
  const deg = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!m[i]) continue;
      let d = 0;
      for (const o of N8) if (m[i + o]) d++;
      deg[i] = d;
    }
  }
  const used = new Uint8Array(w * h); // 차수-2 체인 픽셀 소비 표시
  const polys: SkeletonPoly[] = [];
  const pushPt = (pts: number[], i: number) => {
    pts.push(i % w, (i / w) | 0);
  };

  // 노드에서 출발하는 체인
  for (let i = 0; i < m.length; i++) {
    if (!m[i] || deg[i] === 2) continue;
    for (const o of N8) {
      const nb = i + o;
      if (!m[nb]) continue;
      if (deg[nb] !== 2) {
        // 노드-노드 직결 세그먼트(중복 방지: 작은 인덱스에서만)
        if (i < nb) {
          const pts: number[] = [];
          pushPt(pts, i);
          pushPt(pts, nb);
          polys.push({ pts, closed: false, endJunctions: (deg[i] >= 3 ? 1 : 0) + (deg[nb] >= 3 ? 1 : 0) });
        }
        continue;
      }
      if (used[nb]) continue;
      const pts: number[] = [];
      pushPt(pts, i);
      let prev = i;
      let cur = nb;
      used[cur] = 1;
      pushPt(pts, cur);
      for (;;) {
        let next = -1;
        for (const o2 of N8) {
          const c = cur + o2;
          if (!m[c] || c === prev) continue;
          if (deg[c] === 2 && used[c]) continue;
          next = c;
          break;
        }
        if (next < 0) break; // 막다른 끝(끊긴 체인)
        pushPt(pts, next);
        if (deg[next] !== 2) break; // 반대쪽 노드 도달
        used[next] = 1;
        prev = cur;
        cur = next;
      }
      const lastI = pts[pts.length - 2] + pts[pts.length - 1] * w;
      polys.push({
        pts,
        closed: false,
        endJunctions: (deg[i] >= 3 ? 1 : 0) + (deg[lastI] >= 3 ? 1 : 0),
      });
    }
  }

  // 남은 차수-2 픽셀 = 순수 고리(닫힌 곡선)
  for (let s = 0; s < m.length; s++) {
    if (!m[s] || deg[s] !== 2 || used[s]) continue;
    const pts: number[] = [];
    pushPt(pts, s);
    used[s] = 1;
    let prev = s;
    let cur = -1;
    for (const o of N8) {
      if (m[s + o] && deg[s + o] === 2) {
        cur = s + o;
        break;
      }
    }
    if (cur < 0) continue;
    while (cur !== s && cur >= 0) {
      used[cur] = 1;
      pushPt(pts, cur);
      let next = -1;
      for (const o of N8) {
        const c = cur + o;
        if (!m[c] || c === prev || deg[c] !== 2) continue;
        if (used[c] && c !== s) continue;
        if (c === s && pts.length < 6) continue; // 3픽셀 미만 되돌이 방지
        next = c;
        break;
      }
      prev = cur;
      cur = next;
    }
    if (cur === s && pts.length >= 6) polys.push({ pts, closed: true, endJunctions: 0 });
    // 막다른 길(8연결 모호점)로 고리가 안 닫히면 곡선을 버리지 말고 열린 체인으로 살린다.
    // (둘 다 못 미치는 3~7점짜리 초소형 조각은 여기서 조용히 버려지는데, 어차피 아래
    //  노이즈 필터 임계(닫힌 고리 <16px·고립 <12px)보다 작아 시각적 손실은 없다 — 의도적 허용.)
    else if (cur < 0 && pts.length >= 8) polys.push({ pts, closed: false, endJunctions: 0 });
  }
  return polys;
}

/* ── 그래픽(플랫 컬러) 경로 ─────────────────────────────────────────────────
 * ① 게이트: 3비트/채널(512칸) 히스토그램의 상위 ≤8칸이 전체의 92%+를 덮으면 "플랫
 *    컬러 그래픽"(카드·로고·글씨). 사진·그라데이션은 색이 수백 칸에 흩어져 탈락.
 * ② 상위 칸 평균색을 팔레트로 병합(RGB 거리 <40) → 픽셀별 최근접 라벨 + 3×3 다수결
 *    필터 1회(JPEG 잔노이즈 정리).
 * ③ 라벨이 다른 이웃 픽셀 사이의 "금"(픽셀 경계 격자 세그먼트) 중, 원본 색 대비가
 *    실제로 큰(RGB 거리 ≥45) 것만 채택 — 양자화 밴딩(완만한 그라데이션이 칸을 넘는
 *    가짜 경계)은 대비가 작아 자동 배제된다.
 * ④ 금들을 격자점에서 이어 체인/고리로 연결(교차점=끝) → 스무딩·스트로크는 골격
 *    경로와 같은 인프라 공유. 글자 모양이 영역 경계 그대로라 뭉개지지 않는다. */
function tryGraphicContours(
  px: Uint8ClampedArray,
  w: number,
  h: number,
): SkeletonPoly[] | null {
  const n = w * h;
  // ① 히스토그램(3비트/채널)
  const counts = new Map<number, { c: number; r: number; g: number; b: number }>();
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const key = ((px[p] >> 5) << 6) | ((px[p + 1] >> 5) << 3) | (px[p + 2] >> 5);
    let e = counts.get(key);
    if (!e) counts.set(key, (e = { c: 0, r: 0, g: 0, b: 0 }));
    e.c++;
    e.r += px[p];
    e.g += px[p + 1];
    e.b += px[p + 2];
  }
  const bins = [...counts.values()].sort((a, b) => b.c - a.c).slice(0, 8);
  let covered = 0;
  for (const b of bins) covered += b.c;
  if (covered / n < 0.92) return null; // 사진 → Sobel 경로

  // ② 팔레트(가까운 칸 병합) + 라벨링
  const pal: { r: number; g: number; b: number; share: number }[] = [];
  for (const b of bins) {
    const r = b.r / b.c, g = b.g / b.c, bb = b.b / b.c;
    let merged = false;
    for (const q of pal) {
      if ((q.r - r) ** 2 + (q.g - g) ** 2 + (q.b - bb) ** 2 < 40 * 40) {
        q.share += b.c / n;
        merged = true;
        break;
      }
    }
    if (!merged) pal.push({ r, g, b: bb, share: b.c / n });
  }
  // AA 중간색 제거 — 경계 안티앨리어싱이 만든 "두 색의 중간" 팔레트(점유율 낮음)는
  // 경계 양쪽에 얇은 띠 영역을 만들어 윤곽이 이중선이 된다. 두 팔레트를 잇는 선분에서
  // 거리 30 미만 + 점유율 8% 미만이면 전이색으로 보고 제거(픽셀은 인접 순색으로 흡수).
  for (let k = pal.length - 1; k >= 0; k--) {
    if (pal[k].share >= 0.12) continue; // 업스케일 캔버스는 램프 점유율이 커진다(3배 시 ~6-9%)
    let transitional = false;
    for (let a = 0; a < pal.length && !transitional; a++) {
      if (a === k) continue;
      for (let b2 = a + 1; b2 < pal.length; b2++) {
        if (b2 === k) continue;
        const vx0 = pal[b2].r - pal[a].r, vy0 = pal[b2].g - pal[a].g, vz0 = pal[b2].b - pal[a].b;
        const L2 = vx0 * vx0 + vy0 * vy0 + vz0 * vz0 || 1;
        let t = ((pal[k].r - pal[a].r) * vx0 + (pal[k].g - pal[a].g) * vy0 + (pal[k].b - pal[a].b) * vz0) / L2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const dr = pal[k].r - (pal[a].r + vx0 * t);
        const dg = pal[k].g - (pal[a].g + vy0 * t);
        const db = pal[k].b - (pal[a].b + vz0 * t);
        if (dr * dr + dg * dg + db * db < 30 * 30) {
          transitional = true;
          break;
        }
      }
    }
    if (transitional) pal.splice(k, 1);
  }
  if (pal.length < 2) return null; // 단색 — 그릴 경계가 없다
  const label = new Uint8Array(n);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    let bi = 0;
    let bd = Infinity;
    for (let k = 0; k < pal.length; k++) {
      const d =
        (pal[k].r - px[p]) ** 2 + (pal[k].g - px[p + 1]) ** 2 + (pal[k].b - px[p + 2]) ** 2;
      if (d < bd) {
        bd = d;
        bi = k;
      }
    }
    label[i] = bi;
  }
  // 3×3 다수결 필터 1회 — JPEG 링잉 낱알 정리. (5×5는 네이티브 해상도의 가는 획(3px)을
  // 침식해 글자가 뒤틀렸다 — AA 띠 이중선의 주 방어는 위 팔레트 전이색 제거가 담당.)
  const lab2 = label.slice();
  const cnt = new Uint8Array(8);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      cnt.fill(0);
      let best = label[i];
      let bc = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const l = label[i + dy * w + dx];
          if (++cnt[l] > bc) {
            bc = cnt[l];
            best = l;
          }
        }
      }
      lab2[i] = best;
    }
  }

  // ③ 라벨 경계의 금 수집 — 격자점 정점 키 = y*(w+1)+x.
  // ⚠️ 대비 판정은 금 단위가 아니라 "체인 전체 평균"으로 한다(아래 ④). 금 단위로 자르면
  // 모서리(AA가 두꺼워 국소 대비 약함)마다 체인이 끊겨 도안이 대시 조각이 됐다(실측).
  // 라벨 경계는 본질적으로 닫힌 고리라, 전부 이은 뒤 저대비 체인(그라데이션 밴딩)만
  // 통째로 버리면 닫힘이 보존된다.
  const dist2 = (i: number, j: number): number => {
    const p = i * 4, q = j * 4;
    return (px[p] - px[q]) ** 2 + (px[p + 1] - px[q + 1]) ** 2 + (px[p + 2] - px[q + 2]) ** 2;
  };
  // 인접 리스트: 정점 → 상대 정점 목록(금 = 무방향 세그먼트) + 세그먼트별 대비
  const adj = new Map<number, number[]>();
  const segContrast = new Map<number, number>();
  const W1 = w + 1;
  const segKeyOf = (a: number, b: number): number => (a < b ? a * 4194304 + b : b * 4194304 + a);
  const addEdge = (a: number, b: number, c: number): void => {
    let la = adj.get(a);
    if (!la) adj.set(a, (la = []));
    la.push(b);
    let lb = adj.get(b);
    if (!lb) adj.set(b, (lb = []));
    lb.push(a);
    segContrast.set(segKeyOf(a, b), c);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      // 오른쪽 이웃과 다른 라벨 → 세로 금 (x+1,y)-(x+1,y+1)
      if (x + 1 < w && lab2[i] !== lab2[i + 1]) {
        const a = x > 0 ? i - 1 : i;
        const b = x + 2 < w ? i + 2 : i + 1;
        // 바로 옆(1칸)과 한 칸 바깥(AA 램프 건너뛰기)의 최대 대비
        const c = Math.sqrt(Math.max(dist2(i, i + 1), dist2(a, b)));
        addEdge(y * W1 + (x + 1), (y + 1) * W1 + (x + 1), c);
      }
      // 아래 이웃과 다른 라벨 → 가로 금 (x,y+1)-(x+1,y+1)
      if (y + 1 < h && lab2[i] !== lab2[i + w]) {
        const a = y > 0 ? i - w : i;
        const b = y + 2 < h ? i + 2 * w : i + w;
        const c = Math.sqrt(Math.max(dist2(i, i + w), dist2(a, b)));
        addEdge((y + 1) * W1 + x, (y + 1) * W1 + (x + 1), c);
      }
    }
  }
  if (adj.size === 0) return null; // 경계 자체가 없음 — Sobel로

  // ④ 금 → 체인/고리 연결(정점 차수 ≠2 = 끝점, 소비는 세그먼트 단위) + 평균 대비 필터
  const usedSeg = new Set<number>();
  // (w,h ≤ 1536 → 정점 최대 (1537)² ≈ 2.36e6 < 4194304 — segKey 인코딩 안전)
  const MIN_MEAN_CONTRAST = 40; // 체인 평균 RGB 거리 — 미만이면 그라데이션 밴딩으로 판정
  const polys: SkeletonPoly[] = [];
  const vx = (v: number): number => v % W1;
  const vy = (v: number): number => (v / W1) | 0;
  const walk = (start: number, next0: number): { pts: number[]; mean: number } => {
    const pts = [vx(start), vy(start)];
    let prev = start;
    let cur = next0;
    let sum = segContrast.get(segKeyOf(prev, cur)) ?? 0;
    let cnt = 1;
    usedSeg.add(segKeyOf(prev, cur));
    for (;;) {
      pts.push(vx(cur), vy(cur));
      const nbrs = adj.get(cur)!;
      if (nbrs.length !== 2) break; // 교차점/끝점
      const nxt = nbrs[0] === prev ? nbrs[1] : nbrs[0];
      const k = segKeyOf(cur, nxt);
      if (usedSeg.has(k)) break; // 고리 완주
      usedSeg.add(k);
      sum += segContrast.get(k) ?? 0;
      cnt++;
      prev = cur;
      cur = nxt;
    }
    return { pts, mean: sum / cnt };
  };
  const degOf = (v: number): number => adj.get(v)?.length ?? 0;
  const pushChain = (r: { pts: number[]; mean: number }, mayClose: boolean): void => {
    if (r.mean < MIN_MEAN_CONTRAST) return; // 저대비 밴딩 체인 통째 버림
    const pts = r.pts;
    const closed =
      mayClose &&
      pts.length >= 6 &&
      pts[0] === pts[pts.length - 2] &&
      pts[1] === pts[pts.length - 1];
    if (closed) {
      pts.length -= 2; // 마지막 중복점 제거
      polys.push({ pts, closed: true, endJunctions: 0 });
    } else if (pts.length >= 4) {
      // 양끝이 교차점(차수≥3)에 붙은 짧은 체인은 코너 이음새 — 길이 필터에서 지키도록
      // endJunctions를 기록한다(코너의 X-교차 군집이 만든 2~6칸 체인을 지우면 구멍이 뚫렸다).
      const a = pts[1] * W1 + pts[0];
      const b = pts[pts.length - 1] * W1 + pts[pts.length - 2];
      const ej = (degOf(a) >= 3 ? 1 : 0) + (degOf(b) >= 3 ? 1 : 0);
      polys.push({ pts, closed: false, endJunctions: ej });
    }
  };
  // 끝점·교차점(차수≠2)에서 출발
  for (const [v, nbrs] of adj) {
    if (nbrs.length === 2) continue;
    for (const nb of nbrs) {
      if (usedSeg.has(segKeyOf(v, nb))) continue;
      pushChain(walk(v, nb), false);
    }
  }
  // 남은 세그먼트 = 순수 고리
  for (const [v, nbrs] of adj) {
    if (nbrs.length !== 2) continue;
    for (const nb of nbrs) {
      if (usedSeg.has(segKeyOf(v, nb))) continue;
      pushChain(walk(v, nb), true);
    }
  }
  return polys;
}

/* 폴리라인 이동평균(1-2-1 가중) — 골격 계단 지터를 반감. 열린 체인은 양 끝점 고정. */
function smoothPts(pts: number[], closed: boolean): number[] {
  const n = pts.length / 2;
  if (n < 3) return pts;
  const out = new Array(pts.length);
  for (let i = 0; i < n; i++) {
    if (!closed && (i === 0 || i === n - 1)) {
      out[i * 2] = pts[i * 2];
      out[i * 2 + 1] = pts[i * 2 + 1];
      continue;
    }
    const p = (i - 1 + n) % n;
    const q = (i + 1) % n;
    out[i * 2] = (pts[p * 2] + 2 * pts[i * 2] + pts[q * 2]) / 4;
    out[i * 2 + 1] = (pts[p * 2 + 1] + 2 * pts[i * 2 + 1] + pts[q * 2 + 1]) / 4;
  }
  return out;
}

function polyLength(pts: number[]): number {
  let L = 0;
  for (let k = 2; k < pts.length; k += 2) L += Math.hypot(pts[k] - pts[k - 2], pts[k + 1] - pts[k - 1]);
  return L;
}

/* Douglas-Peucker 단순화 — 골격의 1px 계단(지그재그)을 직선·완만한 꺾임으로 정리.
 * eps≈1.25px: 계단 진폭(±0.5~1px)은 지우고 실제 곡률은 보존. */
function simplifyDP(pts: number[], eps: number): number[] {
  const n = pts.length / 2;
  if (n <= 2) return pts;
  const keep = new Uint8Array(n);
  keep[0] = keep[n - 1] = 1;
  const stack: [number, number][] = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    if (b - a < 2) continue;
    const ax = pts[a * 2], ay = pts[a * 2 + 1];
    const bx = pts[b * 2], by = pts[b * 2 + 1];
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    let maxD = -1;
    let maxI = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i * 2] - ax) * dy - (pts[i * 2 + 1] - ay) * dx) / len;
      if (d > maxD) {
        maxD = d;
        maxI = i;
      }
    }
    if (maxD > eps) {
      keep[maxI] = 1;
      stack.push([a, maxI], [maxI, b]);
    }
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(pts[i * 2], pts[i * 2 + 1]);
  return out;
}

/* 단순화된 꼭짓점을 2차 곡선(중점 통과)으로 이어 그린다 — 꺾임이 둥글게 펴진다.
 * K = 검출→출력 좌표 배율(픽셀 중심 +0.5 보정). */
function drawSmoothPath(
  ctx: CanvasRenderingContext2D,
  pts: number[],
  closed: boolean,
  K: number,
): void {
  const n = pts.length / 2;
  const X = (i: number) => (pts[i * 2] + 0.5) * K;
  const Y = (i: number) => (pts[i * 2 + 1] + 0.5) * K;
  if (n === 1) {
    ctx.moveTo(X(0), Y(0));
    ctx.lineTo(X(0), Y(0));
    return;
  }
  if (n === 2) {
    ctx.moveTo(X(0), Y(0));
    ctx.lineTo(X(1), Y(1));
    return;
  }
  if (closed) {
    ctx.moveTo((X(0) + X(1)) / 2, (Y(0) + Y(1)) / 2);
    for (let i = 1; i <= n; i++) {
      const c = i % n;
      const nx = (i + 1) % n;
      ctx.quadraticCurveTo(X(c), Y(c), (X(c) + X(nx)) / 2, (Y(c) + Y(nx)) / 2);
    }
    ctx.closePath();
    return;
  }
  ctx.moveTo(X(0), Y(0));
  for (let i = 1; i < n - 1; i++) {
    ctx.quadraticCurveTo(X(i), Y(i), (X(i) + X(i + 1)) / 2, (Y(i) + Y(i + 1)) / 2);
  }
  ctx.lineTo(X(n - 1), Y(n - 1));
}

function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
            sum += src[ny * w + nx];
            n++;
          }
        }
      }
      out[y * w + x] = sum / n;
    }
  }
  return out;
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지 로드 실패"));
    };
    img.src = url;
  });
}

/*
 * 사진 → 옅은 밑그림(따라 그리기용) — 원본을 흰색과 섞어 20%만 남긴다.
 * 도안 레이어(최상단 multiply)로 깔리면 트레이싱지처럼 비쳐 학생이 직접 선을 딴다.
 * 명화 팩 '따라 그리기'와 동일 원리(gen-masters.py TRACE_ALPHA=0.20).
 */
export async function photoToUnderlay(
  file: File | Blob,
  maxSize = 1536,
  alpha = 0.2,
): Promise<Blob> {
  const img = await blobToImage(file);
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, 0, 0, w, h);
  ctx.globalAlpha = 1;
  return new Promise((resolve, reject) => {
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("변환 실패"))), "image/webp", 0.9);
  });
}
