import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/engine/**", "src/lib/**"],
      thresholds: { lines: 80, functions: 80, branches: 70 },
    },
  },
});
