/*
 * 번짐(스머지): 레이어의 기존 픽셀을 손가락으로 문질러 끌고 가는 도구.
 * dab 브러시가 아니라 "레이어 직접 편집"(지우개의 Canvas2D 경로와 같은 부류) —
 * 이전 위치의 원형 패치를 떠서 진행 방향으로 낮은 알파로 겹쳐 찍으면
 * 색이 끌려가며 섞인다(고전 스머지 알고리즘). 백엔드(GL/2D) 무관, 레이어는 항상 2D.
 * ArtEngine과 무비 재생(MovieModal)이 같은 함수를 쓴다 — 재생 정합.
 */

let patchCtx: CanvasRenderingContext2D | null = null;

function patch(d: number): CanvasRenderingContext2D {
  if (!patchCtx || patchCtx.canvas.width < d) {
    const c = document.createElement("canvas");
    c.width = c.height = Math.ceil(d);
    patchCtx = c.getContext("2d")!;
  }
  return patchCtx;
}

/**
 * from→to 구간을 문지른다. 반환값 = 마지막으로 패치를 뜬 위치(다음 세그먼트의 from).
 * @param strength 0~1 — 끌려가는 정도(진하기 슬라이더 연동)
 * @param onStamp 더티 트래킹 콜백(선택)
 */
export function smearSegment(
  layerCtx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  size: number,
  strength: number,
  onStamp?: (x: number, y: number, d: number) => void,
): { x: number; y: number } {
  const d = Math.max(8, size);
  const step = Math.max(1.5, d * 0.14);
  const segLen = Math.hypot(to.x - from.x, to.y - from.y);
  if (segLen < 0.5) return from;
  const px = patch(d);
  const alpha = Math.min(0.85, 0.3 + strength * 0.5);
  let prev = from;
  for (let off = step; off <= segLen; off += step) {
    const k = off / segLen;
    const cur = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
    // 이전 위치의 패치를 원형 소프트 마스크로 떠서
    px.clearRect(0, 0, px.canvas.width, px.canvas.height);
    px.drawImage(layerCtx.canvas, prev.x - d / 2, prev.y - d / 2, d, d, 0, 0, d, d);
    const g = px.createRadialGradient(d / 2, d / 2, 0, d / 2, d / 2, d / 2);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(0.6, "rgba(0,0,0,0.85)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    px.globalCompositeOperation = "destination-in";
    px.fillStyle = g;
    px.fillRect(0, 0, d, d);
    px.globalCompositeOperation = "source-over";
    // 현재 위치에 낮은 알파로 겹쳐 찍는다 — 픽셀이 진행 방향으로 끌려간다
    layerCtx.save();
    layerCtx.globalAlpha = alpha;
    layerCtx.drawImage(px.canvas, cur.x - d / 2, cur.y - d / 2);
    layerCtx.restore();
    onStamp?.(cur.x, cur.y, d);
    prev = cur;
  }
  return prev;
}
