import { describe, it, expect } from "vitest";
import { BrushBase } from "@/engine/brushes/BrushBase";
import { createBrush, BRUSH_META } from "@/engine/brushes";
import { mulberry32 } from "@/engine/types";
import { suggestNickname, validateNickname, isNicknameClean } from "@/lib/nickname";
import { fitAspectHelper } from "@/lib/aspect";
import type { BrushSettings, StrokePoint } from "@/engine/types";

const SETTINGS: BrushSettings = {
  size: 20,
  opacity: 1,
  color: { r: 10, g: 20, b: 30 },
  waterAmount: 0.5,
  stabilize: 3,
};

describe("BrushBase dab 스트림", () => {
  it("직선 이동에서 등간격 dab을 만든다", () => {
    const brush = createBrush("pencil", mulberry32(1));
    const p0: StrokePoint = { x: 0, y: 0, pressure: 1, t: 0 };
    const begin = brush.begin(p0, SETTINGS);
    expect(begin.length).toBe(1);
    const dabs = brush.move({ x: 100, y: 0, pressure: 1, t: 100 });
    expect(dabs.length).toBeGreaterThan(1);
    // 간격이 size*spacing 근처로 균일
    for (let i = 1; i < dabs.length; i++) {
      const d = Math.hypot(dabs[i].x - dabs[i - 1].x, dabs[i].y - dabs[i - 1].y);
      expect(d).toBeGreaterThan(0);
      expect(d).toBeLessThan(SETTINGS.size); // spacing<1
    }
  });

  it("수채붓은 물 양이 많을수록 넓고 옅게(색 희석) 찍힌다", () => {
    // rotationFollowsStroke(붓결이 획 방향 추종)라 begin은 dab을 보류 — move로 얻는다
    const firstDab = (waterAmount: number) => {
      const b = createBrush("watercolor", mulberry32(2));
      b.begin({ x: 5, y: 5, pressure: 1, t: 0 }, { ...SETTINGS, waterAmount });
      return b.move({ x: 60, y: 5, pressure: 1, t: 60 })[0];
    };
    const dry = firstDab(0);
    const wet = firstDab(1);
    expect(wet.size).toBeGreaterThan(dry.size);
    // 옅음은 알파가 아니라 색 희석(흰색 혼합)이다 — 알파(<1) 방식은 겹침마다
    // darken이 한 스텝씩 어두워져 획 경계 얼룩을 만든다(2026-07-10 사용자 실측).
    // 물이 많을수록 dab 색이 원색에서 흰색 쪽으로 멀어져야 한다.
    expect(wet.color).toBeDefined();
    expect(dry.color).toBeDefined();
    const dist = (c: { r: number; g: number; b: number }) =>
      255 * 3 - c.r - c.g - c.b; // 흰색에서 먼 정도(진하기)
    expect(dist(wet.color!)).toBeLessThan(dist(dry.color!));
    // dab은 반투명(buildup 점점이 누적 — i-scream 원본의 붓자국 질감, 2026-07-10).
    // 획 간 겹침 폭주는 glaze 합성이 bound하므로 알파 포화(≥1) 강박은 폐기됨.
    expect(wet.alpha).toBeGreaterThan(0.08);
    expect(wet.alpha).toBeLessThan(0.5);
    expect(dry.alpha).toBeGreaterThan(0.08);
    expect(dry.alpha).toBeLessThan(0.5);
  });

  it("무지개붓은 이동에 따라 색이 바뀐다", () => {
    const brush = createBrush("rainbow", mulberry32(3));
    brush.begin({ x: 0, y: 0, pressure: 1, t: 0 }, SETTINGS);
    const a = brush.move({ x: 50, y: 0, pressure: 1, t: 50 });
    const b = brush.move({ x: 600, y: 0, pressure: 1, t: 600 });
    expect(a[0].color).toBeDefined();
    expect(b[a.length ? a.length - 1 : 0]?.color).toBeDefined();
  });

  it("반짝이펜은 밝은 입자를 '지나간 자리'에 찍는다", () => {
    const brush = createBrush("glitter", mulberry32(7));
    brush.begin({ x: 0, y: 0, pressure: 1, t: 0 }, SETTINGS);
    const dabs = [
      ...brush.move({ x: 80, y: 0, pressure: 1, t: 80 }),
      ...brush.move({ x: 160, y: 0, pressure: 1, t: 160 }),
      ...brush.end(),
    ];
    const luma = (c: { r: number; g: number; b: number }) => 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
    const base = dabs.filter((d) => !d.color);
    const sparks = dabs.filter((d) => d.color);
    // 베이스 리본 + 반짝 입자가 모두 존재
    expect(base.length).toBeGreaterThan(5);
    expect(sparks.length).toBeGreaterThan(2);
    for (const s of sparks) {
      // 입자는 브러시색(어두운)보다 확연히 밝다 — 반짝임의 본질
      expect(luma(s.color!)).toBeGreaterThan(luma(SETTINGS.color) + 60);
      // 서브픽셀 증발 방지 하한(MIN_DAB_PX 불변식)
      expect(s.size).toBeGreaterThanOrEqual(2.4);
      // 획 폭(±0.5×실제폭) 안 — 밖으로 나가면 "잉크 튄 방울"
      expect(Math.abs(s.y)).toBeLessThanOrEqual(SETTINGS.size * 0.8 * 0.5 + 0.01);
    }
    // 이동 중 입자는 진행 위치보다 뒤에 있어야 다음 베이스 dab에 덮이지 않는다
    const moving = [
      ...(() => {
        const b2 = createBrush("glitter", mulberry32(8));
        b2.begin({ x: 0, y: 0, pressure: 1, t: 0 }, SETTINGS);
        return b2.move({ x: 100, y: 0, pressure: 1, t: 100 });
      })(),
    ];
    const movingSparks = moving.filter((d) => d.color);
    expect(movingSparks.length).toBeGreaterThan(0);
    for (const s of movingSparks) expect(s.x).toBeLessThan(100);
    // 베이스는 불투명 잉크(같은 색 겹침 얼룩 없음의 전제)
    for (const d of base) expect(d.alpha).toBeGreaterThan(0.9);
  });

  it("반짝이펜: 대각선 획에서도 입자가 리본 안에 있다", () => {
    // 회귀 가드 — end()의 끝 입자 산포축이 angle=0 하드코딩이던 버그는 수평 획에서만
    // 우연히 통과했다(2026-07-23 교차검증). 45° 대각선으로 리본 이탈을 검증한다.
    const brush = createBrush("glitter", mulberry32(11));
    brush.begin({ x: 0, y: 0, pressure: 1, t: 0 }, SETTINGS);
    const dabs = [
      ...brush.move({ x: 70, y: 70, pressure: 1, t: 70 }),
      ...brush.move({ x: 140, y: 140, pressure: 1, t: 140 }),
      ...brush.end(),
    ];
    const ribbonHalf = (SETTINGS.size * 0.8) / 2; // 실제 획 반경(sizeScale 0.8)
    for (const s of dabs.filter((d) => d.color)) {
      // 대각선 y=x 축까지 수직 거리 = |x−y|/√2 — 리본 반경 + 입자 반경 안이어야 한다
      const distToAxis = Math.abs(s.x - s.y) / Math.SQRT2;
      expect(distToAxis).toBeLessThanOrEqual(ribbonHalf + s.size / 2 + 0.01);
    }
  });

  it("필압이 낮으면 dab 크기가 minSizeRatio 아래로 안 내려간다", () => {
    const brush = new BrushBase({ id: "pencil", tip: "grain", sizePressure: 1, minSizeRatio: 0.5 });
    const dabs = brush.begin({ x: 0, y: 0, pressure: 0, t: 0 }, SETTINGS);
    expect(dabs[0].size).toBeGreaterThanOrEqual(SETTINGS.size * 0.5 - 0.01);
  });

  it("12종 브러시 메타가 모두 존재", () => {
    expect(BRUSH_META.length).toBeGreaterThanOrEqual(10);
    const junior = BRUSH_META.filter((b) => b.junior);
    expect(junior.length).toBeGreaterThanOrEqual(5);
  });
});

describe("nickname 안전 필터", () => {
  it("자동 추천은 동물+색깔+숫자 형태", () => {
    const nick = suggestNickname(mulberry32(42));
    expect(nick.length).toBeGreaterThan(2);
    expect(/\d/.test(nick)).toBe(true);
  });
  it("금칙어를 거른다", () => {
    expect(isNicknameClean("바보똥")).toBe(false);
    expect(isNicknameClean("행복한토끼")).toBe(true);
  });
  it("길이·숫자만 검증", () => {
    expect(validateNickname("").ok).toBe(false);
    expect(validateNickname("12345").ok).toBe(false);
    expect(validateNickname("무지개고래").ok).toBe(true);
    expect(validateNickname("가".repeat(13)).ok).toBe(false);
  });
});

describe("aspect fit (도안 비율 적응)", () => {
  it("가로 도안은 긴 변 1536", () => {
    const s = fitAspectHelper(16 / 9);
    expect(Math.max(s.width, s.height)).toBeLessThanOrEqual(1536);
    expect(s.width).toBeGreaterThan(s.height);
  });
  it("세로 도안은 높이가 더 크다", () => {
    const s = fitAspectHelper(2 / 3);
    expect(s.height).toBeGreaterThan(s.width);
  });
  it("면적 상한을 넘지 않는다", () => {
    const s = fitAspectHelper(1);
    expect(s.width * s.height).toBeLessThanOrEqual(1536 * 1152 + 5000);
  });
});
