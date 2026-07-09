/*
 * 스탬프 도구: 미리 준비된 벡터 스탬프 40종을 클릭 위치에 찍는다.
 * 스탬프는 인라인 SVG path(자체 제작) — 백엔드가 지정 크기/색으로 래스터화.
 */
export interface StampDef {
  id: string;
  label: string;
  /** 24x24 뷰박스 기준 SVG path(들) */
  paths: { d: string; fill?: string }[];
}

export interface StampPlacement {
  stampId: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: { r: number; g: number; b: number };
}

// 40종 — 별/하트/왕관/말풍선/이모지풍. 색 없는 path는 브러시 색을 따름.
export const STAMPS: StampDef[] = [
  { id: "star", label: "별", paths: [{ d: "M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 18l-6 3.4 1.4-6.8L2.3 9.9l6.9-.8z" }] },
  { id: "heart", label: "하트", paths: [{ d: "M12 21s-7.5-4.9-10-9.6C.7 8.3 2.2 5 5.5 5c2 0 3.4 1.1 4.5 2.7C11.1 6.1 12.5 5 14.5 5 17.8 5 19.3 8.3 22 11.4 19.5 16.1 12 21 12 21z", fill: "#FF7A59" }] },
  { id: "crown", label: "왕관", paths: [{ d: "M3 8l3.5 3L12 5l5.5 6L21 8l-1.5 10h-15z", fill: "#FFC84A" }] },
  { id: "bubble", label: "말풍선", paths: [{ d: "M4 4h16a2 2 0 012 2v9a2 2 0 01-2 2H9l-5 4v-4H4a2 2 0 01-2-2V6a2 2 0 012-2z", fill: "#5BB8F5" }] },
  { id: "smile", label: "웃음", paths: [{ d: "M12 2a10 10 0 100 20 10 10 0 000-20zm-3.5 7a1.3 1.3 0 110 2.6 1.3 1.3 0 010-2.6zm7 0a1.3 1.3 0 110 2.6 1.3 1.3 0 010-2.6zM7 14a5.5 5.5 0 0010 0z", fill: "#FFC84A" }] },
  { id: "flower", label: "꽃", paths: [{ d: "M12 8a4 4 0 100 8 4 4 0 000-8zm0-6c1.5 0 2.5 1.8 2 3.5C15.7 4.4 17.6 4 18.5 5.3s.1 3.2-1.5 3.9c1.7.1 2.9 1.7 2.3 3.3s-2.5 1.9-3.8.9c.7 1.6-.3 3.4-2 3.6s-3-1.4-2.7-3.1c-1 1.4-3.1 1.3-3.9-.2s0-3.4 1.6-3.6C6.3 9.9 5.6 8 6.6 6.7S9.5 5.4 10.5 6.4C10 4.5 10.6 2 12 2z", fill: "#B878E0" }] },
  { id: "sun", label: "해", paths: [{ d: "M12 6a6 6 0 100 12 6 6 0 000-12zM12 1v3M12 20v3M4 12H1M23 12h-3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2", fill: "#FFC84A" }] },
  { id: "cloud", label: "구름", paths: [{ d: "M7 18a4 4 0 010-8 5 5 0 019.6-1.4A3.5 3.5 0 1117.5 18z", fill: "#5BB8F5" }] },
  { id: "rainbow", label: "무지개", paths: [{ d: "M3 18a9 9 0 0118 0h-3a6 6 0 00-12 0z", fill: "#FF7A59" }] },
  { id: "balloon", label: "풍선", paths: [{ d: "M12 2a6 7 0 016 7c0 4-3 6.5-6 7.5C9 15.5 6 13 6 9a6 7 0 016-7zM12 16.5V21", fill: "#FF7A59" }] },
  { id: "gift", label: "선물", paths: [{ d: "M3 9h18v3H3zM4 12h16v9H4zM12 4a2 2 0 012 2c0 1-1 3-2 3s-2-2-2-3a2 2 0 012-2z", fill: "#7BC96F" }] },
  { id: "cake", label: "케이크", paths: [{ d: "M4 13h16v8H4zM6 13v-3M12 13v-3M18 13v-3M12 4v3", fill: "#FFC84A" }] },
  { id: "music", label: "음표", paths: [{ d: "M9 18a3 3 0 100-6 3 3 0 000 6zM9 15V4l9-2v11", fill: "#B878E0" }] },
  { id: "leaf", label: "잎", paths: [{ d: "M4 20C4 10 12 4 20 4c0 10-8 16-16 16zM4 20L12 12", fill: "#7BC96F" }] },
  { id: "butterfly", label: "나비", paths: [{ d: "M12 12c0-4-3-7-6-7-2 0-3 2-3 4s2 5 6 5c0 3-1 5 3 5s3-2 3-5c4 0 6-3 6-5s-1-4-3-4c-3 0-6 3-6 7z", fill: "#FF7A59" }] },
  { id: "fish", label: "물고기", paths: [{ d: "M2 12c4-5 12-5 16 0-4 5-12 5-16 0zM18 12l4-3v6zM7 11a1 1 0 110 2 1 1 0 010-2z", fill: "#5BB8F5" }] },
  { id: "car", label: "자동차", paths: [{ d: "M3 14l2-5h14l2 5v4h-2a2 2 0 11-4 0H9a2 2 0 11-4 0H3z", fill: "#FF7A59" }] },
  { id: "rocket", label: "로켓", paths: [{ d: "M12 2c3 2 5 6 5 10l-2 4H9l-2-4c0-4 2-8 5-10zM12 8a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM9 16l-3 4M15 16l3 4", fill: "#5BB8F5" }] },
  { id: "star4", label: "반짝", paths: [{ d: "M12 2c1 5 4 8 9 9-5 1-8 4-9 9-1-5-4-8-9-9 5-1 8-4 9-9z", fill: "#FFC84A" }] },
  { id: "moon", label: "달", paths: [{ d: "M15 3a9 9 0 106 15A7 7 0 0115 3z", fill: "#FFC84A" }] },
  { id: "apple", label: "사과", paths: [{ d: "M12 7c-2-2-6-1-6 4 0 4 3 8 6 8s6-4 6-8c0-5-4-6-6-4zM12 7V3l3-1", fill: "#E5484D" }] },
  { id: "tree", label: "나무", paths: [{ d: "M12 2l6 8h-4l4 6H6l4-6H6z M11 16h2v6h-2z", fill: "#7BC96F" }] },
  { id: "house", label: "집", paths: [{ d: "M4 11l8-7 8 7v9H4zM10 20v-6h4v6", fill: "#FF7A59" }] },
  { id: "umbrella", label: "우산", paths: [{ d: "M12 2c5 0 9 4 9 9H3c0-5 4-9 9-9zM12 11v9a2 2 0 01-4 0", fill: "#5BB8F5" }] },
  { id: "snowflake", label: "눈송이", paths: [{ d: "M12 2v20M4 7l16 10M20 7L4 17M12 6l3 2M12 6l-3 2M12 18l3-2M12 18l-3-2", fill: "#5BB8F5" }] },
  { id: "diamond", label: "보석", paths: [{ d: "M6 3h12l3 5-9 13L3 8z", fill: "#B878E0" }] },
  { id: "paw", label: "발바닥", paths: [{ d: "M7 9a2 2 0 110-4 2 2 0 010 4zm10 0a2 2 0 110-4 2 2 0 010 4zM4 14a2 2 0 110-4 2 2 0 010 4zm16 0a2 2 0 110-4 2 2 0 010 4zm-8 8c-3 0-5-2-5-4s2-3 5-3 5 1 5 3-2 4-5 4z", fill: "#2D2A26" }] },
  { id: "bird", label: "새", paths: [{ d: "M4 14c4 0 6-3 8-3s2 2 6 2c-2 3-5 5-8 5s-6-1-6-4zM12 11l2-4 2 2", fill: "#5BB8F5" }] },
  { id: "ghost", label: "유령", paths: [{ d: "M6 20V10a6 6 0 0112 0v10l-2-2-2 2-2-2-2 2-2-2zM9 9a1 1 0 110 2 1 1 0 010-2zm6 0a1 1 0 110 2 1 1 0 010-2z", fill: "#B878E0" }] },
  { id: "crown2", label: "리본", paths: [{ d: "M12 9l4-5 2 2-3 4zM12 9L8 4 6 6l3 4zM9 10h6l1 10-4-3-4 3z", fill: "#FF7A59" }] },
  { id: "lightning", label: "번개", paths: [{ d: "M13 2L4 14h6l-1 8 9-12h-6z", fill: "#FFC84A" }] },
  { id: "candy", label: "사탕", paths: [{ d: "M9 9a3 3 0 116 0 3 3 0 01-6 0zM6 6L3 4l1 4-2 2 4-1zM18 18l3 2-1-4 2-2-4 1z", fill: "#FF7A59" }] },
  { id: "flag", label: "깃발", paths: [{ d: "M6 3v18M6 4h12l-3 3 3 3H6", fill: "#E5484D" }] },
  { id: "key", label: "열쇠", paths: [{ d: "M14 4a5 5 0 013.5 8.5L21 16v3h-3l-1-1h-2v-2l-1.5-1.5A5 5 0 1114 4zm-4 4a1.5 1.5 0 100 3 1.5 1.5 0 000-3z", fill: "#FFC84A" }] },
  { id: "planet", label: "행성", paths: [{ d: "M12 5a7 7 0 100 14 7 7 0 000-14zM3 12c6 4 12 4 18 0", fill: "#B878E0" }] },
  { id: "shell", label: "조개", paths: [{ d: "M12 3c5 0 9 6 9 12H3c0-6 4-12 9-12zM12 3v12M8 6l1 9M16 6l-1 9", fill: "#FF7A59" }] },
  { id: "mushroom", label: "버섯", paths: [{ d: "M4 11a8 5 0 0116 0zM9 11v7a3 2 0 006 0v-7", fill: "#E5484D" }] },
  { id: "cherry", label: "체리", paths: [{ d: "M8 15a3 3 0 110 6 3 3 0 010-6zm8 0a3 3 0 110 6 3 3 0 010-6zM8 18C8 8 12 6 18 4M16 18C16 10 14 7 12 5", fill: "#E5484D" }] },
  { id: "kite", label: "연", paths: [{ d: "M12 2l7 7-7 7-7-7zM12 16v6M11 22l1-2 1 2", fill: "#5BB8F5" }] },
  { id: "medal", label: "메달", paths: [{ d: "M8 2l2 8H7zM16 2l-2 8h3zM12 9a6 6 0 100 12 6 6 0 000-12zm0 3l1.2 2.4 2.6.4-1.9 1.8.4 2.6L12 18l-2.3 1.2.4-2.6L8.2 15l2.6-.4z", fill: "#FFC84A" }] },
];

export function getStamp(id: string): StampDef | undefined {
  return STAMPS.find((s) => s.id === id);
}

/**
 * 스탬프를 캔버스에 그린다(뚝딱그림 수락·무비 재생 공용).
 * evenodd 채우기 = 웃는 얼굴 눈처럼 안쪽 서브패스가 구멍으로 뚫린다.
 * fill 없는 path는 잉크(브러시 색)로 채우고, 윤곽은 항상 잉크 선.
 */
export function drawStampOnCtx(
  ctx: CanvasRenderingContext2D,
  def: StampDef,
  cx: number,
  cy: number,
  sizePx: number,
  ink: { r: number; g: number; b: number },
): void {
  const s = sizePx / 24; // 뷰박스 24 기준
  ctx.save();
  ctx.globalCompositeOperation = "source-over"; // 호출부의 지우개/블렌드 상태 오염 방지
  ctx.translate(cx - sizePx / 2, cy - sizePx / 2);
  ctx.scale(s, s);
  ctx.lineWidth = 1.1;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "#2D2A26";
  ctx.globalAlpha = 1;
  for (const p of def.paths) {
    const path = new Path2D(p.d);
    ctx.fillStyle = p.fill ?? `rgb(${ink.r},${ink.g},${ink.b})`;
    ctx.fill(path, "evenodd");
    ctx.stroke(path);
  }
  ctx.restore();
}
