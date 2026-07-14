import { Jua, Gaegu, Nanum_Pen_Script, Do_Hyeon, Gowun_Batang, Black_Han_Sans } from "next/font/google";

/*
 * 글씨 넣기용 글꼴 — 전부 SIL Open Font License(상업·교육 무료, 저작권 걱정 없음).
 * 한글 + 기본 라틴(영문) 글리프를 모두 포함하는 것만 골랐다.
 * preload:false — 글씨 도구를 열 때만 내려받는다(한글 웹폰트는 무겁다).
 */
const jua = Jua({ weight: "400", subsets: ["latin"], preload: false, display: "swap" });
const gaegu = Gaegu({ weight: "400", subsets: ["latin"], preload: false, display: "swap" });
const pen = Nanum_Pen_Script({ weight: "400", subsets: ["latin"], preload: false, display: "swap" });
const dohyeon = Do_Hyeon({ weight: "400", subsets: ["latin"], preload: false, display: "swap" });
const batang = Gowun_Batang({ weight: "400", subsets: ["latin"], preload: false, display: "swap" });
const blackhan = Black_Han_Sans({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});

export interface TextFont {
  id: string;
  label: string;
  /** CSS font-family 문자열 — 캔버스 ctx.font에 그대로 넣는다 */
  family: string;
  /** 미리보기용 className(next/font) */
  className: string;
}

export const TEXT_FONTS: TextFont[] = [
  { id: "jua", label: "동글", family: jua.style.fontFamily, className: jua.className },
  { id: "gaegu", label: "연필", family: gaegu.style.fontFamily, className: gaegu.className },
  { id: "pen", label: "펜글씨", family: pen.style.fontFamily, className: pen.className },
  { id: "dohyeon", label: "굵은", family: dohyeon.style.fontFamily, className: dohyeon.className },
  { id: "batang", label: "명조", family: batang.style.fontFamily, className: batang.className },
  {
    id: "blackhan",
    label: "제목",
    family: blackhan.style.fontFamily,
    className: blackhan.className,
  },
];

export function fontById(id: string): TextFont {
  return TEXT_FONTS.find((f) => f.id === id) ?? TEXT_FONTS[0];
}
