import type { BrushId } from "../types";
import { BrushBase, MIN_DAB_PX } from "./BrushBase";
import { Pencil } from "./Pencil";
import { ColorPencil } from "./ColorPencil";
import { SignPen } from "./SignPen";
import { AcrylicPen } from "./AcrylicPen";
import { Crayon } from "./Crayon";
import { Marker } from "./Marker";
import { WatercolorBrush } from "./WatercolorBrush";
import { OilBrush } from "./OilBrush";
import { InkBrush } from "./InkBrush";
import { Airbrush } from "./Airbrush";
import { OilPastel } from "./OilPastel";
import { GlowBrush } from "./GlowBrush";
import { RainbowBrush } from "./RainbowBrush";
import { GlitterBrush } from "./GlitterBrush";
import { Eraser } from "./Eraser";

/** 스트로크형 브러시 팩토리(fill/stamp/text는 도구라 별도) */
export function createBrush(id: BrushId, rng?: () => number): BrushBase {
  switch (id) {
    case "pencil":
      return new Pencil(rng);
    case "colorpencil":
      return new ColorPencil(rng);
    case "signpen":
      return new SignPen(rng);
    case "acrylic":
      return new AcrylicPen(rng);
    case "crayon":
      return new Crayon(rng);
    case "marker":
      return new Marker(rng);
    case "watercolor":
      return new WatercolorBrush(rng);
    case "oil":
      return new OilBrush(rng);
    case "inkbrush":
      return new InkBrush(rng);
    case "airbrush":
      return new Airbrush(rng);
    case "oilpastel":
      return new OilPastel(rng);
    case "glow":
      return new GlowBrush(rng);
    case "rainbow":
      return new RainbowBrush(rng);
    case "glitter":
      return new GlitterBrush(rng);
    case "eraser":
      return new Eraser(rng);
    default:
      return new Pencil(rng);
  }
}

export const STROKE_BRUSHES: BrushId[] = [
  "pencil",
  "colorpencil",
  "crayon",
  "signpen",
  "acrylic",
  "marker",
  "watercolor",
  "oil",
  "inkbrush",
  "airbrush",
  "oilpastel",
  "glow",
  "rainbow",
  "glitter",
  "eraser",
];

export interface BrushMeta {
  id: BrushId;
  label: string;
  /** 저학년 모드 기본 6종에 포함 */
  junior: boolean;
}

export const BRUSH_META: BrushMeta[] = [
  { id: "pencil", label: "연필", junior: true },
  { id: "colorpencil", label: "색연필", junior: true },
  { id: "crayon", label: "크레용", junior: true },
  { id: "signpen", label: "사인펜", junior: true },
  { id: "acrylic", label: "아크릴펜", junior: false },
  { id: "marker", label: "마커", junior: true },
  { id: "watercolor", label: "수채붓", junior: true },
  { id: "oil", label: "유화붓", junior: false },
  { id: "inkbrush", label: "붓펜", junior: false },
  { id: "airbrush", label: "에어브러시", junior: false },
  { id: "oilpastel", label: "오일파스텔", junior: false },
  { id: "glow", label: "글로우", junior: false },
  { id: "rainbow", label: "무지개", junior: true },
  { id: "glitter", label: "반짝이", junior: true },
  // 번짐: dab 브러시가 아니라 레이어 직접 편집 도구(SmudgeTool) — createBrush 미등록 의도
  { id: "smudge", label: "번짐", junior: false },
  { id: "eraser", label: "지우개", junior: true },
];

/** 브러시별 실제 픽셀 배율 — UI(굵기 미리보기 등)가 엔진 클래스를 직접 만들지 않게 여기서 1회 산출 */
export const BRUSH_SIZE_SCALE: Partial<Record<BrushId, number>> = Object.fromEntries(
  STROKE_BRUSHES.map((id) => [id, createBrush(id).cfg.sizeScale]),
);

export { BrushBase, MIN_DAB_PX };
