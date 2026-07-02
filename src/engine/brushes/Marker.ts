import { BrushBase } from "./BrushBase";

/** 마커: 반투명 multiply 겹침 — 겹칠수록 진해지는 형광펜 느낌 */
export class Marker extends BrushBase {
  constructor(rng?: () => number) {
    super(
      {
        id: "marker",
        tip: "hard",
        spacing: 0.08,
        flow: 0.35,
        jitter: 0,
        sizePressure: 0.15,
        alphaPressure: 0.1,
        minSizeRatio: 0.85,
        composite: "multiply",
      },
      rng,
    );
  }
}
