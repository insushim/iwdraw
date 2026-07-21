// 배포마다 고유 빌드ID를 public/version.json에 기록한다.
// layout.tsx 인라인 스크립트가 이 값을 네트워크로 읽어(no-store) 현재 로드된 앱의
// 빌드ID(NEXT_PUBLIC_BUILD_ID로 주입)와 비교 → 다르면 옛 코드가 서빙된 것이므로
// SW·캐시를 비우고 자동 새로고침해 새 코드를 강제로 받는다("고쳤는데 그대로" 근절).
import { writeFileSync } from "node:fs";

const v = process.env.NEXT_PUBLIC_BUILD_ID || String(Date.now());
writeFileSync("public/version.json", JSON.stringify({ v }) + "\n");
console.log("[gen-version] public/version.json v=" + v);
