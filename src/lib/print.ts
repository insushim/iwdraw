/*
 * 단일 이미지를 A4 한 장에 꽉 차게(비율 유지) 인쇄한다.
 * 색칠 도안(빈 라인아트)·학생 작품을 바로 인쇄하는 공용 헬퍼.
 * 새 창을 열어 인쇄 전용 HTML을 쓰고, 이미지 로드 후 자동으로 인쇄 대화상자를 띄운다.
 *
 * ⚠️ 반드시 1쪽에 들어가야 한다(2026-07-08 실측: 세로 flex + 제목 h1 + img max-height:100%가
 * 제목 높이만큼 이미지를 밀어내 2쪽 오버플로우). 정공법 = 제목 텍스트를 페이지에 그리지 않고
 * (브라우저 인쇄 헤더가 이미 제목·날짜 표시), 이미지 높이를 A4 인쇄영역(297-2×margin)보다
 * 확실히 작은 mm 값으로 캡. 세로 중앙정렬(flex/height:100%)은 프린트에서 페이지박스 해석이
 * 불안정하므로 쓰지 않는다.
 */
export function printImageA4(src: string, title?: string): void {
  if (typeof window === "undefined") return;

  // window.open("")은 about:blank 기준이라 상대 경로가 깨진다 → 절대 URL로 변환
  let abs: string;
  try {
    abs = new URL(src, window.location.href).href;
  } catch {
    abs = src;
  }

  const win = window.open("", "_blank");
  if (!win) {
    alert("팝업이 차단되어 인쇄 창을 열 수 없어요. 브라우저에서 팝업을 허용한 뒤 다시 눌러 주세요.");
    return;
  }

  const safeTitle = (title ?? "").replace(/[<>&"']/g, "");

  // margin 8mm → 인쇄영역 세로 297-16 = 281mm. 이미지 max-height는 그보다 작은 275mm로 캡
  // (가로 max-width 100%와 함께 비율 유지, 둘 중 먼저 닿는 쪽에 맞춰 축소 → 항상 1쪽).
  win.document.write(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8">` +
      `<title>${safeTitle || "인쇄"}</title><style>` +
      `@page { size: A4; margin: 8mm; }` +
      `html, body { margin: 0; padding: 0; }` +
      `body { text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }` +
      `img { display: inline-block; width: auto; height: auto; max-width: 100%; max-height: 275mm; }` +
      `</style></head><body>` +
      `<img src="${abs}" alt="${safeTitle}" onload="window.focus();setTimeout(function(){window.print();},120);"` +
      ` onerror="document.body.innerHTML='이미지를 불러오지 못했어요.';" />` +
      `</body></html>`,
  );
  win.document.close();
}
