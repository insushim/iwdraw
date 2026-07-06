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
      // 플래토를 0.9까지 유지 — 0.82는 가장자리 페이드가 넓어 획이 번져 보인다(사용자 실측).
      // 플래토 알파 0.8: 0.68은 washOpacity와 곱해져 진하기 100%에서도 너무 연함(실측)
      const g = ctx.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, "rgba(255,255,255,0.94)");
      g.addColorStop(0.9, "rgba(255,255,255,0.94)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(r, r, r, 0, Math.PI * 2);
      ctx.fill();
      // granulation: 미세 구멍(고정 시드 — 랜덤이면 로드마다 질감 밀도 요동)
      let wetSeed = 97;
      const wrand = () => {
        wetSeed = (wetSeed * 1103515245 + 12345) & 0x7fffffff;
        return wetSeed / 0x7fffffff;
      };
      ctx.globalCompositeOperation = "destination-out";
      for (let i = 0; i < 240; i++) {
        const a = wrand() * Math.PI * 2;
        const rad = Math.sqrt(wrand()) * r * 0.92;
        ctx.fillStyle = `rgba(0,0,0,${0.08 + wrand() * 0.2})`;
        const s = 1 + wrand() * 2.2;
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
      // 작은 획용 붓결 LOD(20~40px dab): 큰 bristle과 같은 "solid 중립 몸통 + 셰이드 붓결"
      // 구조. 붓결은 알파 구멍이 아니라 불투명 셰이드 줄로만 — destination-out 홈은
      // wash(MAX) 누적에서 획 전체에 이어지는 반투명 줄이 돼 종이가 흰 줄로 비친다(실측).
      // 행 전체를 어둡게(v=185~) 칠하는 것도 금지: multiply 틴트로 획이 통째로 회색빛(실측).
      ctx.clearRect(0, 0, size, size);
      ctx.lineCap = "round";
      // 고정 시드 LCG — Math.random()이면 행 배치·딥 개수가 로드마다 달라져
      // 평균 셰이드가 요동(굵기별 색 게이트 flaky 실측). 질감은 유지, 배치만 고정.
      let boldSeed = 73;
      const brand = () => {
        boldSeed = (boldSeed * 1103515245 + 12345) & 0x7fffffff;
        return boldSeed / 0x7fffffff;
      };
      const boldRows = 8;
      for (let i = 0; i < boldRows; i++) {
        const y = ((i + 0.5) / boldRows) * size + (brand() - 0.5) * 3;
        const half = Math.sqrt(Math.max(0, r * r - (y - r) * (y - r)));
        const jl = brand() * half * 0.35;
        const jr = brand() * half * 0.35;
        // 셰이드 채널(v<255 = 물감 명암). 딥 행은 고정 인덱스(3/8) — fine 팁 밴드와 정합.
        const deepRow = i === 1 || i === 4 || i === 6;
        const v = deepRow ? 190 + Math.floor(brand() * 16) : 246 + Math.floor(brand() * 10);
        ctx.strokeStyle = `rgba(${v},${v},${v},1)`;
        // 행 피치(size/8)보다 넓게 → 행 사이 알파 틈 없음(틈=종이 비침 흰 줄)
        ctx.lineWidth = size * 0.13 + brand() * size * 0.05;
        ctx.beginPath();
        ctx.moveTo(r - half + jl, y);
        ctx.lineTo(r + half - jr, y);
        ctx.stroke();
      }
      // 몸통 채움 — 큰 bristle의 solid 타원과 동일 역할(알파 구멍 방지). 좌우 끝은
      // 행의 jl/jr 지터가 너덜한 마른 붓끝을 만든다. 셰이드는 순백(255)이 아니라
      // fine 팁(바이모달 밴드) 중앙값과 같은 248(≈0.97) — wash MAX에서 튜브 중심은 이 타원이 항상
      // 이기므로, 255면 얇은 획만 순색이 돼 굵은 획과 색이 어긋난다(프로브 실측).
      ctx.fillStyle = "rgba(240,240,240,1)";
      ctx.beginPath();
      ctx.ellipse(r, r, r * 0.4, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // 붓결 줄 4개: 불투명 셰이드(색이 살짝 어두워질 뿐 종이는 안 비침) — fine 팁의
      // 깊은 밴드(4줄, 0.60~0.72)와 면적·깊이를 맞춰 굵기 전환 시 평균 색이 같게 유지
      for (const gy of [0.26, 0.44, 0.6, 0.76]) {
        const y = size * gy;
        const half = Math.sqrt(Math.max(0, r * r - (y - r) * (y - r)));
        ctx.strokeStyle = "rgba(168,168,168,1)";
        ctx.lineWidth = size * 0.06;
        ctx.beginPath();
        ctx.moveTo(r - half * 0.9, y);
        ctx.lineTo(r + half * 0.9, y);
        ctx.stroke();
      }
      break;
    }
    case "glow": {
      // 네온 단면: 중심 플래토(솔리드 코어) + 넓게 퍼지는 할로.
      // wash(MAX)에서 이 프로필이 그대로 튜브 단면이 된다 — 획 내부 균일이 전제.
      const g = ctx.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.3, "rgba(255,255,255,1)");
      g.addColorStop(0.42, "rgba(255,255,255,0.5)");
      g.addColorStop(0.7, "rgba(255,255,255,0.18)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
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
        // 셰이드 바이모달: 깊은 골 행은 고정 인덱스(3/8) — Math.random() 확률 선택은
        // 페이지 로드마다 딥 행 개수가 달라져 평균 셰이드가 요동(색 게이트 flaky 실측)
        const deepRow = i === 1 || i === 4 || i === 6;
        const fv = deepRow ? 166 + Math.floor(Math.random() * 17) : 246 + Math.floor(Math.random() * 10);
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
