/*
 * 게스트(학급 미입장)에게 "학급 코드로 들어오면 우리 반 갤러리에 전시할 수 있다"는 걸
 * 알려 주는 안내의 세션 상태.
 *
 * ⚠️ 진입 안내와 저장 뒤 안내는 **키가 달라야 한다** — 같은 키를 쓰면 진입 때 한 번 뜬 것으로
 * 저장 뒤 안내가 영영 잠든다(2026-09-02 교차검증 Grok). 세션 저장소라 탭을 닫으면 사라지고,
 * 학급 입장에 성공하면 둘 다 지운다(공유 기기에서 다음 아이에게 다시 보이도록).
 */
const ENTRY_KEY = "arton.classHint.entry";
const SAVE_KEY = "arton.classHint.save";

function once(key: string): boolean {
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
    return true;
  } catch {
    // 사생활 보호 모드 등 — 안내를 포기할 뿐 그리기는 정상
    return false;
  }
}

/** 진입 안내를 이번 세션에 아직 안 보여 줬으면 true(그리고 보여 준 것으로 기록) */
export function takeEntryHint(): boolean {
  return once(ENTRY_KEY);
}

/** "내 기기에 저장" 뒤 안내를 이번 세션에 아직 안 보여 줬으면 true */
export function takeSaveHint(): boolean {
  return once(SAVE_KEY);
}

export function clearClassHints(): void {
  try {
    sessionStorage.removeItem(ENTRY_KEY);
    sessionStorage.removeItem(SAVE_KEY);
  } catch {
    /* 무시 */
  }
}
