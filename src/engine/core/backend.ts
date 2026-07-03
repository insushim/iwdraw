import type { BackendCaps, BlendMode, Dab, RGB } from "../types";
import type { TipKind, DabComposite } from "../brushes/BrushBase";
import type { PaperKind } from "./paper";

/*
 * RendererBackend: 브러시가 만든 백엔드 독립 Dab 스트림을 래스터화하는 추상.
 * WebGL2Backend와 Canvas2DBackend가 이 인터페이스를 구현 → 브러시는 백엔드를 모른다.
 * (DESIGN-REVIEW C: WebGL2/Canvas2D 이중 렌더패스 추상화)
 */

export interface StrokeContext {
  layerCanvas: HTMLCanvasElement | OffscreenCanvas;
  tip: TipKind;
  composite: DabComposite;
  color: RGB;
  /** 종이 결 침식 강도 0~1 — endStroke에서 스트로크 버퍼에 적용(0이면 생략) */
  paperGrain: number;
  /** 종이 종류(모드가 결정: 유화=linen, 수채=cotton, 그 외=smooth) */
  paperKind: PaperKind;
  /**
   * wash 누적: 스트로크 버퍼에 픽셀별 최대 알파만 유지(GL blendEquation MAX).
   * 겹침 포화로 팁 질감이 뭉개지는 것을 막는다 — 유화 붓결·수채 워시의 핵심.
   */
  wash: boolean;
  /** 스트로크 전체 불투명도(wash용, 합성 시 1회 적용) — buildup 브러시는 1 */
  strokeOpacity: number;
  /** 획 실루엣 가장자리 안료 몰림 강도 0~1(수채) — endStroke에서 applyWetEdge */
  wetEdge: number;
}

/*
 * 팁 오버라이드: AI 생성 알파맵(public/brush-tips/*)이 로드되면 프로시저럴 팁을 대체.
 * epoch로 백엔드 캐시(2D 캔버스/GL 텍스처)를 무효화한다.
 */
const tipOverrides = new Map<TipKind, HTMLCanvasElement>();
let tipEpoch = 0;

export function setTipOverride(kind: TipKind, canvas: HTMLCanvasElement): void {
  tipOverrides.set(kind, canvas);
  tipEpoch++;
}

export function getTipEpoch(): number {
  return tipEpoch;
}

/** 백엔드 공용 팁 소스 — 오버라이드 우선, 없으면 프로시저럴 */
export function getTipCanvas(kind: TipKind): HTMLCanvasElement {
  return tipOverrides.get(kind) ?? makeTipCanvas(kind);
}

export interface RendererBackend {
  readonly caps: BackendCaps;
  /** 스트로크 시작 — 백엔드가 임시 버퍼/셰이더 준비 */
  beginStroke(ctx: StrokeContext): void;
  /** Dab 배치 렌더 */
  drawDabs(dabs: Dab[]): void;
  /**
   * 진행 중 스트로크를 표시 캔버스에 라이브 프리뷰로 그린다(매 composite 프레임).
   * 스트로크가 없으면 no-op. endStroke 전에도 획이 즉시 보이게 하는 핵심.
   * ⚠️ wetEdge·paperGrain 후처리는 의도적으로 endStroke에만 적용 —
   * "펜을 떼면 물감이 마르며 가장자리·종이 결이 배어나는" 연출이자 프레임당 비용 절감.
   * 지우개(destination-out) 처리는 구현체별로 다르다 —
   * Canvas2DBackend는 레이어에 직접 지워 이미 반영되므로 no-op,
   * WebGL2Backend는 스트로크 버퍼를 매 프레임 destination-out으로 합성한다.
   */
  presentStroke(target: CanvasRenderingContext2D): void;
  /** 스트로크 종료 — 임시 버퍼를 (종이 결 침식 후) 레이어에 합성 */
  endStroke(): void;
  /**
   * 스트로크 폐기 — 임시 버퍼를 레이어에 합성하지 않고 버린다(QuickShape 스냅 시
   * 프리핸드 획 대체). 스트로크가 없으면 no-op(멱등). ⚠️ Canvas2D 지우개는 레이어에
   * 직접 그려 취소 불가 — 호출측이 destination-out 브러시에서 QuickShape를 막아야 한다.
   */
  cancelStroke(): void;
  /** rAF마다 호출되는 시간 진행 훅 — 현재 두 구현 모두 미사용(false). 향후 시뮬 확장용 */
  tick(dtMs: number): boolean;
  dispose(): void;
}

/** 팁 종류 → 방사형 그라디언트 스탬프(공용, Canvas2D/WebGL 텍스처 소스) */
export function makeTipCanvas(tip: TipKind, size = 128): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const r = size / 2;

  switch (tip) {
    case "soft": {
      const g = ctx.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.7, "rgba(255,255,255,0.6)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      break;
    }
    case "wet": {
      // 수채: 균일한 워시 플래토 + granulation. rim(가장자리 안료 몰림)은 dab이 아니라
      // 획 실루엣 기준이어야 하므로 endStroke의 applyWetEdge 후처리가 담당한다.
      // (dab에 rim을 베이크하면 wash(MAX) 누적에서 dab별 고리가 사슬로 남는다 — 실측)
      const g = ctx.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, "rgba(255,255,255,0.68)");
      g.addColorStop(0.82, "rgba(255,255,255,0.68)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(r, r, r, 0, Math.PI * 2);
      ctx.fill();
      // granulation: 미세 구멍
      ctx.globalCompositeOperation = "destination-out";
      for (let i = 0; i < 170; i++) {
        const a = Math.random() * Math.PI * 2;
        const rad = Math.sqrt(Math.random()) * r * 0.92;
        ctx.fillStyle = `rgba(0,0,0,${0.06 + Math.random() * 0.16})`;
        const s = 1 + Math.random() * 1.8;
        ctx.fillRect(r + Math.cos(a) * rad, r + Math.sin(a) * rad, s, s);
      }
      ctx.globalCompositeOperation = "source-over";
      break;
    }
    case "hard": {
      const g = ctx.createRadialGradient(r, r, r * 0.8, r, r, r);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(r, r, r, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "grain": {
      // 연필 흑연결: 아주 작은 입자를 촘촘히 — 가장자리로 갈수록 희박
      ctx.clearRect(0, 0, size, size);
      const dots = Math.floor(size * size * 0.09);
      for (let i = 0; i < dots; i++) {
        const a = Math.random() * Math.PI * 2;
        const rad = Math.sqrt(Math.random()) * r;
        const x = r + Math.cos(a) * rad;
        const y = r + Math.sin(a) * rad;
        const fall = Math.pow(1 - rad / r, 0.6);
        ctx.fillStyle = `rgba(255,255,255,${fall * (0.5 + Math.random() * 0.5)})`;
        ctx.fillRect(x, y, 1.1, 1.1);
      }
      break;
    }
    case "rough": {
      // 크레용 왁스: 굵고 성긴 덩어리 입자 — 종이 요철에 왁스가 묻는 느낌
      ctx.clearRect(0, 0, size, size);
      const clumps = Math.floor(size * size * 0.018);
      for (let i = 0; i < clumps; i++) {
        const a = Math.random() * Math.PI * 2;
        const rad = Math.sqrt(Math.random()) * r * 0.95;
        const x = r + Math.cos(a) * rad;
        const y = r + Math.sin(a) * rad;
        const fall = 1 - rad / r;
        const s = 2 + Math.random() * 4;
        ctx.fillStyle = `rgba(255,255,255,${fall * (0.35 + Math.random() * 0.65)})`;
        ctx.beginPath();
        ctx.arc(x, y, s / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "chunk": {
      // 오일파스텔: 거의 꽉 찬 중심 + 부슬거리는 가장자리 — 진하고 크리미
      ctx.clearRect(0, 0, size, size);
      const g = ctx.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, "rgba(255,255,255,0.95)");
      g.addColorStop(0.65, "rgba(255,255,255,0.9)");
      g.addColorStop(0.85, "rgba(255,255,255,0.35)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(r, r, r, 0, Math.PI * 2);
      ctx.fill();
      // 가장자리 입자
      for (let i = 0; i < 140; i++) {
        const a = Math.random() * Math.PI * 2;
        const rad = r * (0.7 + Math.random() * 0.3);
        ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.5})`;
        ctx.fillRect(r + Math.cos(a) * rad, r + Math.sin(a) * rad, 2.2, 2.2);
      }
      break;
    }
    case "bristle-bold": {
      // 작은 획용 붓결 LOD(20~40px dab): 몸통은 거의 solid, 골은 "부분 투명 홈"으로.
      // 골을 완전히 비우면 작은 획이 2~3가닥으로 쪼개진다(실측) — i-scream 소형 붓과
      // 같은 "solid 리본 + 옅은 붓결 홈 + 너덜한 양끝" 구조.
      ctx.clearRect(0, 0, size, size);
      ctx.lineCap = "round";
      const boldRows = 7;
      for (let i = 0; i < boldRows; i++) {
        const y = ((i + 0.5) / boldRows) * size + (Math.random() - 0.5) * 4;
        const half = Math.sqrt(Math.max(0, r * r - (y - r) * (y - r)));
        const jl = Math.random() * half * 0.35;
        const jr = Math.random() * half * 0.35;
        // 밝기 변화 = 물감 명암 줄무늬(셰이드 채널) — 알파가 아니라 색이 어두워진다.
        // 밝은 하이라이트 밴드를 팁에 섞지 말 것: 모든 색이 회색빛이 된다(검정 실측).
        // 어두운 색 처리는 렌더러가 색 밝기로 방향(어둡게/밝게)만 선택한다.
        const v = 185 + Math.floor(Math.random() * 71);
        ctx.strokeStyle = `rgba(${v},${v},${v},1)`;
        ctx.lineWidth = size * 0.1 + Math.random() * size * 0.05;
        ctx.beginPath();
        ctx.moveTo(r - half + jl, y);
        ctx.lineTo(r + half - jr, y);
        ctx.stroke();
      }
      // 붓결 홈 2줄: 은은한 부분 투명(0.28) — 강하면 작은 획이 가닥으로 쪼개진다(실측)
      ctx.globalCompositeOperation = "destination-out";
      for (const gy of [0.34, 0.62]) {
        const y = size * gy;
        ctx.strokeStyle = "rgba(0,0,0,0.34)";
        ctx.lineWidth = size * 0.04;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
      break;
    }
    case "flat": {
      // 마커 납작촉: 가로로 긴 라운드 사각 — 스트로크 방향으로 회전해 챠콜펜 느낌
      ctx.clearRect(0, 0, size, size);
      const w = size * 0.92;
      const h = size * 0.46;
      const x = (size - w) / 2;
      const y = (size - h) / 2;
      const rr = h / 2;
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.lineTo(x + w - rr, y);
      ctx.arc(x + w - rr, y + rr, rr, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(x + rr, y + h);
      ctx.arc(x + rr, y + rr, rr, Math.PI / 2, (Math.PI * 3) / 2);
      ctx.fill();
      break;
    }
    case "bristle": {
      // 유화 붓결(near-binary): wash 누적에서 알파 패턴이 그대로 획이 되므로
      // 스트릭은 거의 불투명, 골은 완전히 빈다. 좌우 길이 차이 → 획 시작·끝의 마른 붓자국.
      ctx.clearRect(0, 0, size, size);
      ctx.lineCap = "round";
      const rows = 16;
      for (let i = 0; i < rows; i++) {
        const y = ((i + 0.5) / rows) * size + (Math.random() - 0.5) * 2.5;
        if (Math.random() < 0.12) continue; // 붓털 사이 빈 골(획 전체에 이어지는 줄)
        const half = Math.sqrt(Math.max(0, r * r - (y - r) * (y - r)));
        const jl = Math.random() * half * 0.5;
        const jr = Math.random() * half * 0.5;
        const fv = 195 + Math.floor(Math.random() * 61); // 붓털별 물감 명암(셰이드 채널)
        ctx.strokeStyle = `rgba(${fv},${fv},${fv},${0.82 + Math.random() * 0.18})`;
        ctx.lineWidth = 2.2 + Math.random() * 4.2;
        ctx.beginPath();
        ctx.moveTo(r - half + jl, y);
        ctx.lineTo(r + half - jr, y);
        ctx.stroke();
      }
      // 몸통은 꽉 차게 — 가장자리(위아래 행·좌우 끝)만 결이 갈라진다
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.beginPath();
      ctx.ellipse(r, r, r * 0.5, r * 0.68, 0, 0, Math.PI * 2);
      ctx.fill();
      // 흩날리는 얇은 털
      for (let i = 0; i < 6; i++) {
        const y = size * (0.08 + Math.random() * 0.84);
        const half = Math.sqrt(Math.max(0, r * r - (y - r) * (y - r)));
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        const from = Math.random() < 0.5 ? r - half : r + half - 12;
        ctx.moveTo(from, y);
        ctx.lineTo(from + 12, y + (Math.random() - 0.5) * 3);
        ctx.stroke();
      }
      break;
    }
  }
  return c;
}

export function blendToComposite(blend: BlendMode): GlobalCompositeOperation {
  switch (blend) {
    case "multiply":
      return "multiply";
    case "screen":
      return "screen";
    case "overlay":
      return "overlay";
    default:
      return "source-over";
  }
}
