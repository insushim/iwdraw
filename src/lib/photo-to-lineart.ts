/*
 * 사진 → 색칠 도안(라인아트) 변환 — 클라이언트(Canvas)에서 처리. 백엔드 불필요.
 * 그레이스케일 → Sobel 엣지 → 적응형 임계값 → 검은 윤곽선/흰 배경.
 * (설계도 Phase 6.3의 sharp adaptive threshold를 브라우저에서 재현)
 */
export async function photoToLineart(
  file: File | Blob,
  maxSize = 1200,
): Promise<Blob> {
  const img = await blobToImage(file);
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

  // 0) 그레이스케일 + "이미 도안"(선 작업물) 감지
  const gray = new Float32Array(w * h);
  let whiteish = 0;
  let darkLine = 0;
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    const r = px[p], g = px[p + 1], b = px[p + 2];
    gray[i] = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
    const mx = Math.max(r, g, b);
    const sat = mx === 0 ? 0 : (mx - Math.min(r, g, b)) / mx;
    if (gray[i] > 0.88 && sat < 0.12) whiteish++;
    if (gray[i] < 0.45 && sat < 0.3) darkLine++;
  }
  const whiteFrac = whiteish / gray.length;
  const darkFrac = darkLine / gray.length;

  const out = sctx.createImageData(w, h);
  const o = out.data;

  if (whiteFrac > 0.5 && darkFrac > 0.003 && darkFrac < 0.25) {
    // ── 이미 도안(흰 배경+검은 선, 색칠 포함 가능) → 엣지 검출 대신 어두운 무채색만 유지.
    // Sobel을 다시 돌리면 선 양쪽에 이중 윤곽이 생겨 선이 진해지고 두꺼워진다
    // ("다시 선따기 하니 더 진해짐" 2026-07-07 사용자 실측) — 이 경로는 멱등.
    // 유채색(색칠)은 흰색으로 → 깨끗한 새 도안이 된다.
    for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
      const mx = Math.max(px[p], px[p + 1], px[p + 2]);
      const sat = mx === 0 ? 0 : (mx - Math.min(px[p], px[p + 1], px[p + 2])) / mx;
      // 어둡고(≤0.62) 채도 낮은(선) 픽셀만 잉크로 — 임계 부근은 부드럽게
      const t = (0.62 - gray[i]) / 0.14;
      const ink = sat < 0.3 ? Math.max(0, Math.min(1, t)) : 0;
      const v = Math.round(255 * (1 - ink));
      o[p] = v;
      o[p + 1] = v;
      o[p + 2] = v;
      o[p + 3] = 255;
    }
    sctx.putImageData(out, 0, 0);
    return canvasToBlob(src);
  }

  // 1) 약한 블러(노이즈 억제) — 사진 경로
  const blurred = boxBlur(gray, w, h, 1);
  const coarse = boxBlur(gray, w, h, 3); // 굵은 윤곽용(2스케일)

  // 2) Sobel 엣지 강도 — 미세(r1) + 굵은 윤곽(r3) 2스케일 결합(선따기 강화)
  const edge = new Float32Array(w * h);
  const sobel = (f: Float32Array, i: number) => {
    const gx =
      -f[i - w - 1] - 2 * f[i - 1] - f[i + w - 1] + f[i - w + 1] + 2 * f[i + 1] + f[i + w + 1];
    const gy =
      -f[i - w - 1] - 2 * f[i - w] - f[i - w + 1] + f[i + w - 1] + 2 * f[i + w] + f[i + w + 1];
    return Math.sqrt(gx * gx + gy * gy);
  };
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      edge[i] = Math.max(sobel(blurred, i), sobel(coarse, i) * 1.15);
    }
  }

  // 3) 적응형 임계값(전역 평균+표준편차 기반) — 0.5→0.35: 약한 윤곽까지 살림(선따기 강화)
  let mean = 0;
  for (let i = 0; i < edge.length; i++) mean += edge[i];
  mean /= edge.length;
  let variance = 0;
  for (let i = 0; i < edge.length; i++) variance += (edge[i] - mean) ** 2;
  const std = Math.sqrt(variance / edge.length);
  const threshold = mean + std * 0.35;

  // 4) 검은 선/흰 배경 (임계 부근 부드럽게) + 3×3 반강도 팽창으로 선을 또렷하게
  const soft = Math.max(0.02, std * 0.4);
  const ink = new Float32Array(w * h);
  for (let i = 0; i < edge.length; i++) {
    ink[i] = Math.max(0, Math.min(1, (edge[i] - threshold) / soft));
  }
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      let mx = 0;
      for (const d of [-w - 1, -w, -w + 1, -1, 1, w - 1, w, w + 1]) {
        if (ink[i + d] > mx) mx = ink[i + d];
      }
      const v = Math.round(255 * (1 - Math.max(ink[i], mx * 0.55)));
      const p = i * 4;
      o[p] = v;
      o[p + 1] = v;
      o[p + 2] = v;
      o[p + 3] = 255;
    }
  }
  // 가장자리 1px는 흰색으로
  for (let i = 0, p = 3; i < gray.length; i++, p += 4) if (o[p] === 0) { o[p] = 255; o[p - 1] = o[p - 2] = o[p - 3] = 255; }
  sctx.putImageData(out, 0, 0);

  return canvasToBlob(src);
}

function canvasToBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("변환 실패"))), "image/webp", 0.9);
  });
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
