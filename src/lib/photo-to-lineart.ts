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
  /* 검출은 네이티브 해상도에서(업스케일 금지) — 업스케일 캔버스에서 검출하면 JPEG 노이즈
   * 블록도 같이 커져 잔점이 폭증한다(2026-07-21 실측: 노이즈 사진 성분 5→129). 작은 입력의
   * 화질은 아래 벡터 재획화가 해결: 골격 좌표를 K배 키워 출력 캔버스(≈maxSize)에 다시
   * 긋기 때문에 검출이 작아도 최종 선은 또렷하고 균일하다. */
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
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
    const up = uData.data;
    for (let i = 0, p = 0; i < uw * uh; i++, p += 4) {
      const r = up[p], g = up[p + 1], b = up[p + 2];
      const luma = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      const mx = Math.max(r, g, b);
      const sat = mx === 0 ? 0 : (mx - Math.min(r, g, b)) / mx;
      // 어둡고(≤0.62) 채도 낮은(선) 픽셀만 잉크로 — 임계 부근은 부드럽게
      const t = (0.62 - luma) / 0.14;
      const ink = sat < 0.3 ? Math.max(0, Math.min(1, t)) : 0;
      const v = Math.round(255 * (1 - ink));
      up[p] = v;
      up[p + 1] = v;
      up[p + 2] = v;
      up[p + 3] = 255;
    }
    uctx.putImageData(uData, 0, 0);
    return canvasToBlob(uc);
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
    const SAT_R = 12;
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
  const MIN_KEEP = 10;
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
  // K = 출력px/검출px. 입력이 maxSize 이상이면 검출=출력(K=1), 미만이면 K = maxSize/입력
  // 최대변(캡 없음 — 200px 입력이면 K≈7.7). 폴리라인 좌표만 K배 하고 스트로크 굵기는 출력
  // 기준 고정이라 K가 커도 선은 균일·매끈하다(지터 증폭은 아래 smoothPts+DP eps 확대가 상쇄,
  // eps 배율은 2배 캡으로 자체 포화).
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
  const MIN_ISOLATED = 12; // px — 양끝이 자유단인 고립 조각(잔점) 버림
  const MIN_SPUR = 7; // px — 접합부에서 삐져나온 짧은 수염 버림

  /* 유령 조각 필터 — JPEG 링잉·이중 엣지 잔재는 "진짜 선 곁(≤6px)을 따라 붙은 짧은
   * 조각"으로 나타난다(원 재현: 원둘레에 붙은 8~30px 틱들). 긴 선(≥48px)의 점을 격자에
   * 넣고, 짧은 조각의 점 70%+가 긴 선 6px 안이면 버린다 — 외따로 있는 작은 디테일
   * (눈동자·점 등)은 긴 선과 안 붙어 있어 살아남는다. */
  const GHOST_LEN = 64;
  const GHOST_DIST = 6;
  const CELL = 8;
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
      if (len < 16) continue; // 노이즈 고리
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
