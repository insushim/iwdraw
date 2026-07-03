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

  // 1) 그레이스케일 + 약한 블러(노이즈 억제)
  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = (px[p] * 0.299 + px[p + 1] * 0.587 + px[p + 2] * 0.114) / 255;
  }
  const blurred = boxBlur(gray, w, h, 1);

  // 2) Sobel 엣지 강도
  const edge = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -blurred[i - w - 1] - 2 * blurred[i - 1] - blurred[i + w - 1] +
        blurred[i - w + 1] + 2 * blurred[i + 1] + blurred[i + w + 1];
      const gy =
        -blurred[i - w - 1] - 2 * blurred[i - w] - blurred[i - w + 1] +
        blurred[i + w - 1] + 2 * blurred[i + w] + blurred[i + w + 1];
      edge[i] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  // 3) 적응형 임계값(전역 평균+표준편차 기반)
  let mean = 0;
  for (let i = 0; i < edge.length; i++) mean += edge[i];
  mean /= edge.length;
  let variance = 0;
  for (let i = 0; i < edge.length; i++) variance += (edge[i] - mean) ** 2;
  const std = Math.sqrt(variance / edge.length);
  const threshold = mean + std * 0.5;

  // 4) 검은 선/흰 배경 출력 (안티앨리어싱: 임계 부근 부드럽게)
  const out = sctx.createImageData(w, h);
  const o = out.data;
  const soft = Math.max(0.02, std * 0.4);
  for (let i = 0, p = 0; i < edge.length; i++, p += 4) {
    const t = (edge[i] - threshold) / soft;
    const ink = Math.max(0, Math.min(1, t)); // 0=배경 1=선
    const v = Math.round(255 * (1 - ink));
    o[p] = v;
    o[p + 1] = v;
    o[p + 2] = v;
    o[p + 3] = 255;
  }
  sctx.putImageData(out, 0, 0);

  return new Promise((resolve, reject) => {
    src.toBlob((b) => (b ? resolve(b) : reject(new Error("변환 실패"))), "image/webp", 0.9);
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
