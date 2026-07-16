import { describe, it, expect } from "vitest";
import {
  ROOM_CODE_LEN,
  randomRoomCode,
  normalizeRoomCode,
  isValidRoomCode,
  roomNameFor,
  shortCodeFromRoom,
  classRoomName,
} from "@/lib/collab-room";

describe("협동 방 코드", () => {
  it("자동 생성 코드는 정해진 길이·유효 글자만", () => {
    for (let i = 0; i < 200; i++) {
      const c = randomRoomCode();
      expect(c).toHaveLength(ROOM_CODE_LEN);
      expect(isValidRoomCode(c)).toBe(true);
    }
  });

  it("입력 정규화 — 소문자·헷갈리는 글자·길이 컷", () => {
    expect(normalizeRoomCode("k7mn")).toBe("K7MN");
    expect(normalizeRoomCode("k7-m n")).toBe("K7MN");
    expect(normalizeRoomCode("K7MNXY")).toHaveLength(ROOM_CODE_LEN); // 넘치면 자른다
    // 알파벳에 없는 0/O/1/I/L 은 걸러진다
    expect(normalizeRoomCode("0O1I")).toBe("");
  });

  it("서버 방 이름은 학급코드로 접두어를 붙여 반별로 격리한다", () => {
    const a = roomNameFor("ABCD23", "K7MN");
    const b = roomNameFor("WXYZ99", "K7MN"); // 다른 반, 같은 짧은 코드
    expect(a).not.toBe(b); // 섞이면 안 된다
    expect(shortCodeFromRoom(a)).toBe("K7MN"); // 아이에게 보여줄 코드는 동일
    expect(shortCodeFromRoom(b)).toBe("K7MN");
  });

  it("같은 반·같은 코드는 같은 방(친구끼리 만난다)", () => {
    expect(roomNameFor("ABCD23", "K7MN")).toBe(roomNameFor("abcd23", "k7mn"));
  });

  it("학급 고정 방 — 교사와 그 반 학생이 같은 방으로 수렴한다", () => {
    // 교사: 대시보드에서 c.code로 방을 연다 / 학생: 자기 학급코드로 '우리 반 다 같이'
    const teacherRoom = classRoomName("H3EXN2");
    const studentRoom = classRoomName("H3EXN2"); // 학생 세션의 classCode도 같은 반이면 동일
    expect(teacherRoom).toBe(studentRoom);
    // 다른 반은 다른 방
    expect(classRoomName("H3EXN2")).not.toBe(classRoomName("ABCD23"));
    // 코드 재입력 없이 결정론적 — 같은 학급코드면 항상 같은 방
    expect(classRoomName("h3exn2")).toBe(classRoomName("H3EXN2"));
  });

  it("학급 없는 게스트도 방을 만들 수 있다", () => {
    const g = roomNameFor(undefined, "K7MN");
    expect(shortCodeFromRoom(g)).toBe("K7MN");
    expect(g).not.toBe(roomNameFor("ABCD23", "K7MN")); // 게스트 방과 학급 방은 분리
  });
});
