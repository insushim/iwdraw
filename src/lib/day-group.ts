/* 갤러리 날짜별 그룹 — created_at(ms)을 하루 단위로 묶고 아이 눈높이 라벨을 붙인다 */

export interface DayGroup<T> {
  /** YYYY-MM-DD (로컬) — React key용 */
  key: string;
  /** "오늘" / "어제" / "7월 7일 (화)" — 다른 해면 "2025년 12월 24일 (수)" */
  label: string;
  items: T[];
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dayLabel(ts: number, now = new Date()): string {
  const d = new Date(ts);
  const key = dayKey(d);
  if (key === dayKey(now)) return "오늘";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (key === dayKey(yesterday)) return "어제";
  const md = `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
  return d.getFullYear() === now.getFullYear() ? md : `${d.getFullYear()}년 ${md}`;
}

/** 최신순 입력을 유지한 채 하루 단위 그룹으로 — 입력이 created_at DESC 정렬이라는 전제 */
export function groupByDay<T>(items: T[], getTs: (item: T) => number): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const item of items) {
    const key = dayKey(new Date(getTs(item)));
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, label: dayLabel(getTs(item)), items: [item] });
  }
  return groups;
}
