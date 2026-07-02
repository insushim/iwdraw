/* 닉네임 자동 추천(동물+색깔) — 개인정보 유도 방지 + 금칙어 필터(DESIGN-REVIEW A6) */
const COLORS = [
  "빨강",
  "주황",
  "노랑",
  "초록",
  "파랑",
  "보라",
  "분홍",
  "하늘",
  "연두",
  "금빛",
  "은빛",
  "무지개",
];
const ANIMALS = [
  "토끼",
  "고양이",
  "강아지",
  "펭귄",
  "여우",
  "판다",
  "곰",
  "다람쥐",
  "고래",
  "부엉이",
  "거북이",
  "사자",
  "호랑이",
  "코알라",
  "돌고래",
];

export function suggestNickname(rng: () => number = Math.random): string {
  const c = COLORS[Math.floor(rng() * COLORS.length)];
  const a = ANIMALS[Math.floor(rng() * ANIMALS.length)];
  const n = Math.floor(rng() * 99) + 1;
  return `${c}${a}${n}`;
}

// 아동 안전: 부적절어 최소 차단(서버 submit에서 2차 검증). 확장 가능한 기본셋.
const BANNED = [
  "바보",
  "멍청",
  "죽어",
  "시발",
  "씨발",
  "병신",
  "새끼",
  "존나",
  "지랄",
  "닥쳐",
  "꺼져",
  "fuck",
  "shit",
  "sex",
  "bitch",
];

export function isNicknameClean(nick: string): boolean {
  const lower = nick.toLowerCase().replace(/\s/g, "");
  return !BANNED.some((b) => lower.includes(b));
}

export function validateNickname(nick: string): { ok: boolean; reason?: string } {
  const trimmed = nick.trim();
  if (trimmed.length < 1) return { ok: false, reason: "닉네임을 입력해 주세요" };
  if (trimmed.length > 12) return { ok: false, reason: "닉네임은 12자까지 쓸 수 있어요" };
  if (!isNicknameClean(trimmed)) return { ok: false, reason: "다른 닉네임을 써 주세요" };
  // 숫자만/특수문자 과다 방지
  if (/^\d+$/.test(trimmed)) return { ok: false, reason: "글자를 넣어 주세요" };
  return { ok: true };
}
